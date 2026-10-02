import type { ColliderHandle, EventQueue, RigidBody, World } from '@dimforge/rapier2d-compat';
import { buildBoundaryPaths, getArenaHalfExtent, getGapArcs, isInsideArena, pointAtBoundaryDistance } from '../arena';
import { createRandom } from '../random';
import {
  FIXED_STEP_SECONDS,
  MAX_POPULATION,
  type BallSnapshot,
  type Point,
  type SimulationConfig,
  type SimulationSnapshot,
  type SpawnSeed,
} from '../types';
import { PairCooldown } from './PairCooldown';
import { distributeBirthEnergy, type PhysicsAdapter, type SolverTuning } from './PhysicsAdapter';
import { SpatialHash } from './SpatialHash';

type RapierRuntime = typeof import('@dimforge/rapier2d-compat');

interface BallUserData {
  kind: 'ball';
  id: number;
}

interface RapierBall {
  id: number;
  body: RigidBody;
  mass: number;
  hasEntered: boolean;
}

const BALL_COLORS = [0xf06b56, 0x3886c8, 0x54ae86, 0xeabf3a, 0x8975c6, 0xe07ca4];
export const MAX_ADAPTIVE_SUBSTEPS = 32;
export const MAX_TRAVEL_PER_SUBSTEP = 0.75;

export const DEFAULT_RAPIER_TUNING: SolverTuning = {
  velocityIterations: 6,
  positionIterations: 2,
  allowedLinearError: 0.001,
};

export async function initializeRapier(rapier: unknown): Promise<void> {
  const initialize = (rapier as { init?: () => Promise<unknown> }).init;
  if (initialize) await initialize.call(rapier);
}

export class RapierSimulation implements PhysicsAdapter {
  private readonly rapier: RapierRuntime;
  private readonly world: World;
  private readonly events: EventQueue;
  private readonly random: () => number;
  private readonly radius: number;
  private readonly halfExtent: number;
  private readonly pairCooldown = new PairCooldown();
  private readonly balls = new Map<number, RapierBall>();
  private readonly bodyIdByCollider = new Map<ColliderHandle, number>();
  private readonly pendingPairs: Array<[number, number]> = [];
  private readonly occupancy: SpatialHash;
  private energyScratch = new Float64Array(0);
  private nextId = 1;
  private elapsedSeconds = 0;
  private births = 0;
  private birthAttempts = 0;
  private exits = 0;
  private missedBirths = 0;
  private missedSpaceBirths = 0;
  private missedEnergyBirths = 0;
  private ended = false;
  private lastCooldownPrune = 0;
  private disposed = false;

  constructor(
    rapier: unknown,
    private readonly config: SimulationConfig,
    initialSeeds?: SpawnSeed[],
    private readonly tuning: SolverTuning = DEFAULT_RAPIER_TUNING,
  ) {
    // The standard and compatibility builds share the 0.21 runtime API but have separate private TS declarations.
    this.rapier = rapier as RapierRuntime;
    this.random = createRandom(config.seed);
    this.halfExtent = getArenaHalfExtent(config);
    this.radius = this.halfExtent * config.ballDiameterRatio;
    this.occupancy = new SpatialHash(this.radius * 2.05);
    this.world = new this.rapier.World({ x: 0, y: this.activeGravity });
    this.world.lengthUnit = 1;
    this.world.numSolverIterations = tuning.velocityIterations;
    this.world.numInternalPgsIterations = tuning.positionIterations;
    this.world.integrationParameters.normalizedAllowedLinearError = tuning.allowedLinearError ?? 0.001;
    this.world.timestep = FIXED_STEP_SECONDS;
    this.events = new this.rapier.EventQueue(true);
    this.createArena();

    const seeds = initialSeeds ?? this.createInitialSeeds(config.initialCount);
    if (seeds.length > Math.min(config.maxPopulation, MAX_POPULATION)) {
      throw new Error('初始球数不能超过人口上限。');
    }
    for (const seed of seeds) this.addBall(seed.position, seed.velocity ?? this.randomVelocity());
  }

  step(deltaSeconds: number): void {
    if (this.disposed) throw new Error('Cannot step a disposed simulation.');
    if (this.ended) return;
    this.elapsedSeconds += deltaSeconds;
    this.pendingPairs.length = 0;
    const substepCount = this.getAdaptiveSubstepCount(deltaSeconds);
    const energyBefore = this.getMechanicalEnergy();
    this.world.timestep = deltaSeconds / substepCount;
    for (let index = 0; index < substepCount; index += 1) {
      if (this.config.motionField === 'curvature') this.curveBallVelocities(this.world.timestep);
      this.world.step(this.events);
    }
    this.restoreMechanicalEnergy(energyBefore);
    this.events.drainCollisionEvents((firstCollider, secondCollider, started) => {
      if (!started || this.config.birthProbability <= 0) return;
      const firstId = this.bodyIdByCollider.get(firstCollider);
      const secondId = this.bodyIdByCollider.get(secondCollider);
      if (firstId === undefined || secondId === undefined) return;
      if (!this.pairCooldown.shouldAccept(firstId, secondId, this.elapsedSeconds, this.config.pairCooldown)) return;
      if (this.random() < this.config.birthProbability) {
        this.birthAttempts += 1;
        this.pendingPairs.push([firstId, secondId]);
      }
    });

    this.removeExitedBalls();
    if (this.balls.size > 500 && this.elapsedSeconds - this.lastCooldownPrune >= 5) {
      this.pairCooldown.prune(this.elapsedSeconds, Math.max(this.config.pairCooldown * 4, 5));
      this.lastCooldownPrune = this.elapsedSeconds;
    }
    if (this.pendingPairs.length > 0) {
      this.rebuildOccupancy();
      this.resolveBirths();
    }
  }

  get isEnded(): boolean {
    return this.ended;
  }

  getSnapshot(): SimulationSnapshot {
    const balls: BallSnapshot[] = [];
    let maxSpeed = 0;
    for (const record of this.balls.values()) {
      const position = record.body.translation();
      const velocity = record.body.linvel();
      maxSpeed = Math.max(maxSpeed, Math.hypot(velocity.x, velocity.y));
      balls.push({
        id: record.id,
        x: position.x,
        y: position.y,
        radius: this.radius,
        color: BALL_COLORS[(record.id - 1) % BALL_COLORS.length],
        shape: 'circle',
      });
    }
    return {
      balls,
      stats: {
        elapsedSeconds: this.elapsedSeconds,
        currentCount: this.balls.size,
        births: this.births,
        birthAttempts: this.birthAttempts,
        exits: this.exits,
        missedBirths: this.missedBirths,
        missedSpaceBirths: this.missedSpaceBirths,
        missedEnergyBirths: this.missedEnergyBirths,
        maxSpeed,
      },
      ended: this.ended,
    };
  }

  dispose(): void {
    this.events.free();
    this.world.free();
    this.balls.clear();
    this.bodyIdByCollider.clear();
    this.pairCooldown.clear();
    this.occupancy.clear();
    this.pendingPairs.length = 0;
    this.disposed = true;
  }

  private createArena(): void {
    for (const path of buildBoundaryPaths(this.config)) {
      const points = path.loop ? [...path.points, path.points[0]] : path.points;
      const vertices = new Float32Array(points.length * 2);
      points.forEach((point, index) => {
        vertices[index * 2] = point.x;
        vertices[index * 2 + 1] = point.y;
      });
      const descriptor = this.rapier.ColliderDesc.polyline(vertices)
        .setFriction(0)
        .setRestitution(1);
      this.world.createCollider(descriptor);
    }
  }

  /**
   * A uniform perpendicular field curves every free-flight path without doing
   * work: rotating a velocity vector preserves its magnitude exactly.
   * This avoids a preferred "down" direction while keeping the motion lively.
   */
  private curveBallVelocities(deltaSeconds: number): void {
    const angle = this.config.curvatureRate * deltaSeconds;
    if (Math.abs(angle) < 1e-12) return;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    for (const { body } of this.balls.values()) {
      const velocity = body.linvel();
      body.setLinvel({
        x: cosine * velocity.x - sine * velocity.y,
        y: sine * velocity.x + cosine * velocity.y,
      }, true);
    }
  }

  private getMechanicalEnergy(): number {
    let energy = 0;
    const gravity = this.activeGravity;
    for (const { body, mass } of this.balls.values()) {
      const position = body.translation();
      const velocity = body.linvel();
      energy += mass * ((velocity.x ** 2 + velocity.y ** 2) / 2 - gravity * position.y);
    }
    return energy;
  }

  /**
   * Dense simultaneous contacts can make a sequential rigid-body solver lose
   * or gain aggregate energy even with restitution 1 and zero friction. Scale
   * motion relative to the center of mass when possible to retain solver
   * momentum; use a total-kinetic fallback if a boundary impulse makes that
   * decomposition unable to meet the energy target.
   */
  private restoreMechanicalEnergy(targetEnergy: number): void {
    if (this.balls.size < 2) return;
    const count = this.balls.size;
    const requiredScratchLength = count * 3;
    if (this.energyScratch.length < requiredScratchLength) this.energyScratch = new Float64Array(requiredScratchLength);
    const gravity = this.activeGravity;
    let totalMass = 0;
    let momentumX = 0;
    let momentumY = 0;
    let weightedY = 0;

    let index = 0;
    for (const { body, mass } of this.balls.values()) {
      const position = body.translation();
      const velocity = body.linvel();
      this.energyScratch[index] = mass;
      this.energyScratch[index + 1] = velocity.x;
      this.energyScratch[index + 2] = velocity.y;
      index += 3;
      totalMass += mass;
      momentumX += mass * velocity.x;
      momentumY += mass * velocity.y;
      weightedY += mass * position.y;
    }

    if (totalMass <= 0) return;
    const centerVelocity = { x: momentumX / totalMass, y: momentumY / totalMass };
    let relativeEnergy = 0;
    for (let offset = 0; offset < requiredScratchLength; offset += 3) {
      const mass = this.energyScratch[offset];
      const relativeX = this.energyScratch[offset + 1] - centerVelocity.x;
      const relativeY = this.energyScratch[offset + 2] - centerVelocity.y;
      relativeEnergy += mass * (relativeX ** 2 + relativeY ** 2) / 2;
    }

    const targetKineticEnergy = targetEnergy + gravity * weightedY;
    const centerEnergy = totalMass * (centerVelocity.x ** 2 + centerVelocity.y ** 2) / 2;
    const targetRelativeEnergy = targetKineticEnergy - centerEnergy;
    if (targetKineticEnergy < -1e-9) return;

    if (relativeEnergy > 1e-12 && targetRelativeEnergy >= 0) {
      const scale = Math.sqrt(targetRelativeEnergy / relativeEnergy);
      if (!Number.isFinite(scale) || Math.abs(scale - 1) < 1e-10) return;

      index = 0;
      for (const { body } of this.balls.values()) {
        const velocityX = this.energyScratch[index + 1];
        const velocityY = this.energyScratch[index + 2];
        body.setLinvel({
          x: centerVelocity.x + (velocityX - centerVelocity.x) * scale,
          y: centerVelocity.y + (velocityY - centerVelocity.y) * scale,
        }, true);
        index += 3;
      }
      return;
    }

    // A wall impulse can make the solver's center-of-mass kinetic energy alone
    // exceed the target. There is then no relative-energy scale that satisfies
    // both constraints, so fall back to the exact total-energy constraint.
    const currentKineticEnergy = relativeEnergy + centerEnergy;
    if (currentKineticEnergy <= 1e-12) return;
    const scale = Math.sqrt(Math.max(0, targetKineticEnergy) / currentKineticEnergy);
    if (!Number.isFinite(scale) || Math.abs(scale - 1) < 1e-10) return;

    for (const { body } of this.balls.values()) {
      const velocity = body.linvel();
      body.setLinvel({ x: velocity.x * scale, y: velocity.y * scale }, true);
    }
  }

  private createInitialSeeds(count: number): SpawnSeed[] {
    const seeds: SpawnSeed[] = [];
    if (this.config.gapCount > 0) {
      const gap = getGapArcs(this.config)[0];
      const center = pointAtBoundaryDistance(this.config.shape, gap.center, this.halfExtent);
      const laneCount = this.config.shape === 'circle'
        ? 1
        : Math.max(1, Math.floor(gap.width / (this.radius * 2)));
      const rowSpacing = this.radius * 2.08;
      for (let index = 0; index < count; index += 1) {
        const row = Math.floor(index / laneCount);
        const lane = (index % laneCount - (laneCount - 1) / 2) * this.radius * 2;
        seeds.push({
          position: { x: center.x + lane, y: center.y + this.radius + row * rowSpacing },
          velocity: this.randomVelocity(),
        });
      }
      return seeds;
    }

    const occupancy = new SpatialHash(this.radius * 2.05);
    for (let index = 0; index < count; index += 1) {
      let position: Point | null = null;
      for (let attempt = 0; attempt < 3000; attempt += 1) {
        const candidate = this.randomHighPoint();
        if (!occupancy.overlaps(candidate, this.radius)) {
          position = candidate;
          break;
        }
      }
      if (!position) throw new Error(`无法放置第 ${index + 1} 个球，请降低球数或球径。`);
      seeds.push({ position, velocity: this.randomVelocity() });
      occupancy.insert(index + 1, position);
    }
    return seeds;
  }

  private randomHighPoint(): Point {
    const edgeLimit = this.halfExtent - this.radius;
    if (this.config.shape === 'square') {
      return {
        x: (this.random() * 2 - 1) * edgeLimit,
        y: -edgeLimit * (0.42 + this.random() * 0.5),
      };
    }
    const x = (this.random() * 2 - 1) * edgeLimit;
    const y = -edgeLimit * (0.42 + this.random() * 0.5);
    const candidate = { x, y };
    return isInsideArena(this.config.shape, candidate, this.radius, this.halfExtent) ? candidate : this.randomHighPoint();
  }

  private randomVelocity(): Point {
    const angleDegrees = this.config.initialDirection
      + (this.random() * 2 - 1) * this.config.directionSpread;
    const angle = (angleDegrees * Math.PI) / 180;
    const speed = this.config.initialSpeed * (1 + (this.random() * 2 - 1) * this.config.speedSpread);
    return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
  }

  private getAdaptiveSubstepCount(deltaSeconds: number): number {
    let maximumSpeed = 0;
    for (const { body } of this.balls.values()) {
      const velocity = body.linvel();
      maximumSpeed = Math.max(maximumSpeed, Math.hypot(velocity.x, velocity.y));
    }
    const maximumTravel = this.radius * MAX_TRAVEL_PER_SUBSTEP;
    return Math.max(1, Math.min(MAX_ADAPTIVE_SUBSTEPS, Math.ceil((maximumSpeed * deltaSeconds) / maximumTravel)));
  }

  private addBall(position: Point, velocity: Point): RapierBall {
    const id = this.nextId++;
    const body = this.world.createRigidBody(
      this.rapier.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y)
        .setLinvel(velocity.x, velocity.y)
        .setLinearDamping(0)
        .setAngularDamping(0)
        .setCanSleep(false)
        .lockRotations(),
    );
    body.userData = { kind: 'ball', id } satisfies BallUserData;
    const collider = this.world.createCollider(
      this.rapier.ColliderDesc.ball(this.radius)
        .setDensity(1)
        .setFriction(0)
        .setRestitution(1)
        .setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    const record = { id, body, mass: body.mass(), hasEntered: isInsideArena(this.config.shape, position, this.radius, this.halfExtent) };
    this.balls.set(id, record);
    this.bodyIdByCollider.set(collider.handle, id);
    this.occupancy.insert(id, position);
    return record;
  }

  private removeExitedBalls(): void {
    for (const [id, record] of this.balls) {
      const position = record.body.translation();
      const point = { x: position.x, y: position.y };
      if (isInsideArena(this.config.shape, point, this.radius, this.halfExtent)) record.hasEntered = true;
      if (!record.hasEntered || !this.isOutsideArena(point)) continue;
      for (let index = 0; index < record.body.numColliders(); index += 1) {
        this.bodyIdByCollider.delete(record.body.collider(index).handle);
      }
      this.world.removeRigidBody(record.body);
      this.balls.delete(id);
      this.exits += 1;
    }
  }

  private isOutsideArena(point: Point): boolean {
    const threshold = this.halfExtent + this.radius * 1.25;
    if (this.config.shape === 'square') return Math.abs(point.x) > threshold || Math.abs(point.y) > threshold;
    return Math.hypot(point.x, point.y) > threshold;
  }

  private rebuildOccupancy(): void {
    this.occupancy.clear();
    for (const [id, record] of this.balls) {
      const position = record.body.translation();
      this.occupancy.insert(id, { x: position.x, y: position.y });
    }
  }

  private resolveBirths(): void {
    for (const [firstId, secondId] of this.pendingPairs) {
      const first = this.balls.get(firstId);
      const second = this.balls.get(secondId);
      if (!first || !second) continue;
      if (this.balls.size >= this.populationLimit) {
        this.ended = true;
        break;
      }
      const firstPosition = first.body.translation();
      const secondPosition = second.body.translation();
      const midpoint = { x: (firstPosition.x + secondPosition.x) / 2, y: (firstPosition.y + secondPosition.y) / 2 };
      const birthPosition = this.findBirthPosition(midpoint);
      if (!birthPosition) {
        this.missedBirths += 1;
        this.missedSpaceBirths += 1;
        continue;
      }
      const firstVelocity = first.body.linvel();
      const secondVelocity = second.body.linvel();
      const birthVelocities = distributeBirthEnergy(
        firstVelocity,
        secondVelocity,
        this.activeGravity,
        birthPosition.y,
        this.random() * Math.PI * 2,
      );
      if (!birthVelocities) {
        this.missedBirths += 1;
        this.missedEnergyBirths += 1;
        continue;
      }
      first.body.setLinvel(birthVelocities.first, true);
      second.body.setLinvel(birthVelocities.second, true);
      this.addBall(birthPosition, birthVelocities.child);
      this.births += 1;
      if (this.balls.size >= this.populationLimit) {
        this.ended = true;
        break;
      }
    }
    this.pendingPairs.length = 0;
  }

  private findBirthPosition(midpoint: Point): Point | null {
    const startAngle = this.random() * Math.PI * 2;
    const ringRadii = [2.15, 2.75, 3.45, 4.25, 5.2, 6.3, 7.6];
    const directionsPerRing = 24;
    for (const ringRadius of ringRadii) {
      for (let attempt = 0; attempt < directionsPerRing; attempt += 1) {
        const angle = startAngle + (Math.PI * 2 * attempt) / directionsPerRing;
        const candidate = {
          x: midpoint.x + Math.cos(angle) * this.radius * ringRadius,
          y: midpoint.y + Math.sin(angle) * this.radius * ringRadius,
        };
        if (!isInsideArena(this.config.shape, candidate, this.radius, this.halfExtent)) continue;
        if (!this.occupancy.overlaps(candidate, this.radius)) return candidate;
      }
    }
    return null;
  }

  private get activeGravity(): number {
    return this.config.motionField === 'gravity' ? this.config.gravity : 0;
  }

  private get populationLimit(): number {
    return Math.min(this.config.maxPopulation, MAX_POPULATION);
  }
}
