import type { ColliderHandle, EventQueue, RigidBody, World } from '@dimforge/rapier2d-compat';
import { buildBoundaryPaths, getGapArcs, isInsideArena, pointAtBoundaryDistance } from '../arena';
import { createRandom } from '../random';
import {
  ARENA_HALF_EXTENT,
  MAX_POPULATION,
  type BallSnapshot,
  type Point,
  type SimulationConfig,
  type SimulationSnapshot,
  type SpawnSeed,
} from '../types';
import { PairCooldown } from './PairCooldown';
import { shareBirthMomentum, type PhysicsAdapter, type SolverTuning } from './PhysicsAdapter';
import { SpatialHash } from './SpatialHash';

type RapierRuntime = typeof import('@dimforge/rapier2d-compat');

interface BallUserData {
  kind: 'ball';
  id: number;
}

interface RapierBall {
  id: number;
  body: RigidBody;
  hasEntered: boolean;
}

const BALL_COLORS = [0xf06b56, 0x3886c8, 0x54ae86, 0xeabf3a, 0x8975c6, 0xe07ca4];

export const DEFAULT_RAPIER_TUNING: SolverTuning = {
  velocityIterations: 4,
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
  private readonly pairCooldown = new PairCooldown();
  private readonly balls = new Map<number, RapierBall>();
  private readonly bodyIdByCollider = new Map<ColliderHandle, number>();
  private readonly pendingPairs: Array<[number, number]> = [];
  private readonly occupancy: SpatialHash;
  private nextId = 1;
  private elapsedSeconds = 0;
  private births = 0;
  private exits = 0;
  private missedBirths = 0;
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
    this.radius = ARENA_HALF_EXTENT * config.ballDiameterRatio;
    this.occupancy = new SpatialHash(this.radius * 2.05);
    this.world = new this.rapier.World({ x: 0, y: config.gravity });
    this.world.lengthUnit = 1;
    this.world.numSolverIterations = tuning.velocityIterations;
    this.world.numInternalPgsIterations = tuning.positionIterations;
    this.world.integrationParameters.normalizedAllowedLinearError = tuning.allowedLinearError ?? 0.001;
    this.world.timestep = 1 / 60;
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
    this.elapsedSeconds += deltaSeconds;
    this.world.timestep = deltaSeconds;
    this.pendingPairs.length = 0;
    this.world.step(this.events);
    this.events.drainCollisionEvents((firstCollider, secondCollider, started) => {
      if (!started || this.config.birthProbability <= 0) return;
      const firstId = this.bodyIdByCollider.get(firstCollider);
      const secondId = this.bodyIdByCollider.get(secondCollider);
      if (firstId === undefined || secondId === undefined) return;
      if (!this.pairCooldown.shouldAccept(firstId, secondId, this.elapsedSeconds, this.config.pairCooldown)) return;
      if (this.random() < this.config.birthProbability) this.pendingPairs.push([firstId, secondId]);
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

  getSnapshot(): SimulationSnapshot {
    const balls: BallSnapshot[] = [];
    for (const record of this.balls.values()) {
      const position = record.body.translation();
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
        exits: this.exits,
        missedBirths: this.missedBirths,
      },
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
        .setRestitution(this.config.restitution);
      this.world.createCollider(descriptor);
    }
  }

  private createInitialSeeds(count: number): SpawnSeed[] {
    const seeds: SpawnSeed[] = [];
    if (this.config.gapCount > 0) {
      const gap = getGapArcs(this.config)[0];
      const center = pointAtBoundaryDistance(this.config.shape, gap.center);
      const laneCount = Math.max(1, Math.floor(gap.width / (this.radius * 2)));
      const rowSpacing = this.radius * 2 + this.radius * 0.08;
      for (let index = 0; index < count; index += 1) {
        const row = Math.floor(index / laneCount);
        const lane = (index % laneCount - (laneCount - 1) / 2) * this.radius * 2;
        seeds.push({
          position: { x: center.x + lane, y: center.y - this.radius - row * rowSpacing },
          velocity: { x: 0, y: 0 },
        });
      }
      return seeds;
    }

    const occupancy = new SpatialHash(this.radius * 2.05);
    for (let index = 0; index < count; index += 1) {
      let position: Point | null = null;
      for (let attempt = 0; attempt < 3000; attempt += 1) {
        const candidate = this.randomInteriorPoint();
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

  private randomInteriorPoint(): Point {
    const edgeLimit = ARENA_HALF_EXTENT - this.radius;
    if (this.config.shape === 'square') {
      return { x: (this.random() * 2 - 1) * edgeLimit, y: (this.random() * 2 - 1) * edgeLimit };
    }
    const angle = this.random() * Math.PI * 2;
    const distance = Math.sqrt(this.random()) * edgeLimit;
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  }

  private randomVelocity(): Point {
    return { x: (this.random() - 0.5) * 1.2, y: (this.random() - 0.5) * 0.7 };
  }

  private addBall(position: Point, velocity: Point): RapierBall {
    const id = this.nextId++;
    const body = this.world.createRigidBody(
      this.rapier.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y)
        .setLinvel(velocity.x, velocity.y)
        .setLinearDamping(0)
        .setAngularDamping(0)
        .setCanSleep(true)
        .lockRotations(),
    );
    body.userData = { kind: 'ball', id } satisfies BallUserData;
    const collider = this.world.createCollider(
      this.rapier.ColliderDesc.ball(this.radius)
        .setDensity(1)
        .setFriction(0)
        .setRestitution(this.config.restitution)
        .setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    const record = { id, body, hasEntered: isInsideArena(this.config.shape, position, this.radius) };
    this.balls.set(id, record);
    this.bodyIdByCollider.set(collider.handle, id);
    this.occupancy.insert(id, position);
    return record;
  }

  private removeExitedBalls(): void {
    for (const [id, record] of this.balls) {
      const position = record.body.translation();
      const point = { x: position.x, y: position.y };
      if (isInsideArena(this.config.shape, point, this.radius)) record.hasEntered = true;
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
    const threshold = ARENA_HALF_EXTENT + this.radius * 1.25;
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
      if (this.balls.size >= Math.min(this.config.maxPopulation, MAX_POPULATION)) {
        this.missedBirths += 1;
        continue;
      }
      const firstPosition = first.body.translation();
      const secondPosition = second.body.translation();
      const midpoint = { x: (firstPosition.x + secondPosition.x) / 2, y: (firstPosition.y + secondPosition.y) / 2 };
      const birthPosition = this.findBirthPosition(midpoint);
      if (!birthPosition) {
        this.missedBirths += 1;
        continue;
      }
      const firstVelocity = first.body.linvel();
      const secondVelocity = second.body.linvel();
      const momentum = shareBirthMomentum(firstVelocity, secondVelocity);
      first.body.setLinvel(momentum.first, true);
      second.body.setLinvel(momentum.second, true);
      this.addBall(birthPosition, momentum.child);
      this.births += 1;
    }
    this.pendingPairs.length = 0;
  }

  private findBirthPosition(midpoint: Point): Point | null {
    const startAngle = this.random() * Math.PI * 2;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const angle = startAngle + (Math.PI * 2 * attempt) / 24;
      const candidate = {
        x: midpoint.x + Math.cos(angle) * this.radius * 2.15,
        y: midpoint.y + Math.sin(angle) * this.radius * 2.15,
      };
      if (!isInsideArena(this.config.shape, candidate, this.radius)) continue;
      if (!this.occupancy.overlaps(candidate, this.radius)) return candidate;
    }
    return null;
  }
}
