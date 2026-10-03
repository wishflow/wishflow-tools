import { buildBoundarySegments, getArenaHalfExtent, getGapArcs, getPerimeter, isInsideArena, pointAtBoundaryDistance } from '../arena';
import { createRandom } from '../random';
import {
  MAX_POPULATION,
  type BallSnapshot,
  type EndReason,
  type Point,
  type SimulationConfig,
  type SimulationRenderSnapshot,
  type SimulationSnapshot,
  type SpawnSeed,
} from '../types';
import { PairCooldown } from './PairCooldown';
import { shareBirthMomentum, type PhysicsAdapter, type SolverTuning } from './PhysicsAdapter';
import { SpatialHash } from './SpatialHash';

const BALL_COLORS = [0xf06b56, 0x3886c8, 0x54ae86, 0xeabf3a, 0x8975c6, 0xe07ca4];
const POSITION_SLOP = 0.002;
const POSITION_CORRECTION = 0.85;
const BIRTH_SEARCH_RING_RADII = [2.15, 2.75, 3.45, 4.25, 5.2, 6.3, 7.6];
const BIRTH_SEARCH_DIRECTIONS = Array.from({ length: 24 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 24;
  return { x: Math.cos(angle), y: Math.sin(angle) };
});
export const MAX_BATCH_SUBSTEPS = 32;
export const MAX_BATCH_TRAVEL_PER_SUBSTEP = 0.25;
export const DEFAULT_CIRCLE_BATCH_TUNING: SolverTuning = {
  velocityIterations: 4,
  positionIterations: 2,
  maxTravelPerSubstep: MAX_BATCH_TRAVEL_PER_SUBSTEP,
};

function wrappedDistance(first: number, second: number, perimeter: number): number {
  const half = perimeter / 2;
  return ((first - second + half) % perimeter + perimeter) % perimeter - half;
}

/**
 * Equal-radius circle solver for the production circular arena.
 * Stores ball state in typed arrays and uses a rebuilt uniform grid for each solver pass.
 */
export class CircleBatchSimulation implements PhysicsAdapter {
  private readonly random: () => number;
  private readonly radius: number;
  private readonly diameter: number;
  private readonly halfExtent: number;
  private readonly populationLimit: number;
  private readonly capacity: number;
  private readonly x: Float64Array;
  private readonly y: Float64Array;
  private readonly vx: Float64Array;
  private readonly vy: Float64Array;
  private readonly ids: Uint32Array;
  private readonly hasEntered: Uint8Array;
  private readonly wallSegments;
  private readonly gapArcs;
  private readonly boundaryPoints: Point[];
  private readonly perimeter: number;
  private readonly cellSize: number;
  private readonly gridColumns: number;
  private readonly gridMin: number;
  private readonly gridHeads: Int32Array;
  private readonly gridNext: Int32Array;
  private readonly pairCooldown = new PairCooldown();
  private readonly indexById = new Map<number, number>();
  private touchingPairs = new Set<string>();
  private previousTouchingPairs = new Set<string>();
  private readonly pendingPairs: Array<[number, number]> = [];
  private readonly queuedBirthPairs = new Set<string>();
  private count = 0;
  private nextId = 1;
  private elapsedSeconds = 0;
  private births = 0;
  private birthAttempts = 0;
  private exits = 0;
  private missedBirths = 0;
  private missedSpaceBirths = 0;
  private ended = false;
  private endReason: EndReason | null = null;
  private disposed = false;
  private lastCooldownPrune = 0;

  constructor(
    private readonly config: SimulationConfig,
    initialSeeds?: SpawnSeed[],
    private readonly tuning: SolverTuning = DEFAULT_CIRCLE_BATCH_TUNING,
    private readonly stopOnTerminalState = true,
  ) {
    this.random = createRandom(config.seed);
    this.halfExtent = getArenaHalfExtent(config);
    this.radius = this.halfExtent * config.ballDiameterRatio;
    this.diameter = this.radius * 2;
    this.populationLimit = Math.max(1, Math.min(config.maxPopulation, MAX_POPULATION));
    this.capacity = this.populationLimit;
    this.x = new Float64Array(this.capacity);
    this.y = new Float64Array(this.capacity);
    this.vx = new Float64Array(this.capacity);
    this.vy = new Float64Array(this.capacity);
    this.ids = new Uint32Array(this.capacity);
    this.hasEntered = new Uint8Array(this.capacity);
    this.wallSegments = config.shape === 'circle' ? [] : buildBoundarySegments(config);
    this.gapArcs = getGapArcs(config);
    this.perimeter = getPerimeter(config.shape, this.halfExtent);
    this.boundaryPoints = this.gapArcs.flatMap(({ center, width }) => [
      pointAtBoundaryDistance(config.shape, center - width / 2, this.halfExtent),
      pointAtBoundaryDistance(config.shape, center + width / 2, this.halfExtent),
    ]);
    this.cellSize = this.diameter;
    let seedPadding = 4;
    for (const seed of initialSeeds ?? []) {
      seedPadding = Math.max(seedPadding, Math.max(Math.abs(seed.position.x), Math.abs(seed.position.y)) - this.halfExtent + this.diameter);
    }
    const gridPadding = Math.max(seedPadding, this.radius * 4);
    this.gridMin = -this.halfExtent - gridPadding;
    this.gridColumns = Math.ceil((this.halfExtent * 2 + gridPadding * 2) / this.cellSize) + 1;
    this.gridHeads = new Int32Array(this.gridColumns * this.gridColumns);
    this.gridNext = new Int32Array(this.capacity);

    const seeds = initialSeeds ?? this.createInitialSeeds(config.initialCount);
    if (seeds.length > this.capacity) throw new Error('初始球数不能超过人口上限。');
    for (const seed of seeds) this.addBall(seed.position, seed.velocity ?? this.randomVelocity());
    this.endForPopulationState();
  }

  step(deltaSeconds: number): void {
    if (this.disposed) throw new Error('Cannot step a disposed simulation.');
    if (this.ended) return;
    this.elapsedSeconds += deltaSeconds;
    this.pendingPairs.length = 0;
    this.queuedBirthPairs.clear();
    const substepCount = this.getAdaptiveSubstepCount(deltaSeconds);
    const substepSeconds = deltaSeconds / substepCount;
    for (let substep = 0; substep < substepCount; substep += 1) {
      this.beginContactSubstep();
      this.integrate(substepSeconds);

      for (let iteration = 0; iteration < this.tuning.positionIterations; iteration += 1) {
        this.rebuildGrid();
        this.solveBallPositions();
        this.solveWallPositions();
      }

      for (let iteration = 0; iteration < this.tuning.velocityIterations; iteration += 1) {
        this.rebuildGrid();
        this.solveBallVelocities();
        this.solveWallVelocities();
      }

      this.removeExitedBalls();
      this.endForPopulationState();
      if (this.ended) break;
    }

    if (this.count > 500 && this.elapsedSeconds - this.lastCooldownPrune >= 5) {
      this.pairCooldown.prune(this.elapsedSeconds, Math.max(this.config.pairCooldown * 4, 5));
      this.lastCooldownPrune = this.elapsedSeconds;
    }
    if (!this.ended && this.pendingPairs.length > 0) {
      this.rebuildGrid();
      this.resolveBirths();
      this.endForPopulationState();
    }
  }

  getSnapshot(): SimulationSnapshot {
    const balls: BallSnapshot[] = [];
    let maxSpeed = 0;
    for (let index = 0; index < this.count; index += 1) {
      const id = this.ids[index];
      maxSpeed = Math.max(maxSpeed, Math.hypot(this.vx[index], this.vy[index]));
      balls.push({
        id,
        x: this.x[index],
        y: this.y[index],
        radius: this.radius,
        color: BALL_COLORS[(id - 1) % BALL_COLORS.length],
        shape: 'circle',
      });
    }
    return {
      balls,
      stats: {
        elapsedSeconds: this.elapsedSeconds,
        currentCount: this.count,
        births: this.births,
        birthAttempts: this.birthAttempts,
        exits: this.exits,
        missedBirths: this.missedBirths,
        missedSpaceBirths: this.missedSpaceBirths,
        missedEnergyBirths: 0,
        maxSpeed,
      },
      ended: this.ended,
      endReason: this.endReason,
    };
  }

  getRenderSnapshot(): SimulationRenderSnapshot {
    const valuesPerBall = 5;
    const ballData = new Float32Array(this.count * valuesPerBall);
    let maxSpeed = 0;
    for (let index = 0; index < this.count; index += 1) {
      const offset = index * valuesPerBall;
      const id = this.ids[index];
      ballData[offset] = id;
      ballData[offset + 1] = this.x[index];
      ballData[offset + 2] = this.y[index];
      ballData[offset + 3] = this.radius;
      ballData[offset + 4] = BALL_COLORS[(id - 1) % BALL_COLORS.length];
      maxSpeed = Math.max(maxSpeed, Math.hypot(this.vx[index], this.vy[index]));
    }
    return {
      ballData,
      stats: {
        elapsedSeconds: this.elapsedSeconds,
        currentCount: this.count,
        births: this.births,
        birthAttempts: this.birthAttempts,
        exits: this.exits,
        missedBirths: this.missedBirths,
        missedSpaceBirths: this.missedSpaceBirths,
        missedEnergyBirths: 0,
        maxSpeed,
      },
      ended: this.ended,
      endReason: this.endReason,
    };
  }

  get isEnded(): boolean {
    return this.ended;
  }

  finishManually(): void {
    if (!this.ended) this.finish('manual');
  }

  dispose(): void {
    this.pairCooldown.clear();
    this.indexById.clear();
    this.touchingPairs.clear();
    this.previousTouchingPairs.clear();
    this.pendingPairs.length = 0;
    this.queuedBirthPairs.clear();
    this.count = 0;
    this.disposed = true;
  }

  private createInitialSeeds(count: number): SpawnSeed[] {
    const seeds: SpawnSeed[] = [];
    if (this.config.gapCount > 0) {
      const gap = this.gapArcs[0];
      const center = pointAtBoundaryDistance(this.config.shape, gap.center, this.halfExtent);
      const outwardX = center.x / this.halfExtent;
      const outwardY = center.y / this.halfExtent;
      const tangentX = -outwardY;
      const tangentY = outwardX;
      const maximumLaneOffset = Math.max(0, gap.width / 2 - this.radius - POSITION_SLOP);
      const laneCount = Math.max(1, Math.floor((maximumLaneOffset * 2) / this.diameter) + 1);
      const rowSpacing = this.diameter + this.radius * 0.08;
      for (let index = 0; index < count; index += 1) {
        const row = Math.floor(index / laneCount);
        const lane = (index % laneCount - (laneCount - 1) / 2) * this.diameter;
        const radialRoom = Math.sqrt(Math.max(0, (this.halfExtent - this.radius) ** 2 - lane ** 2));
        const inwardDistance = this.halfExtent - radialRoom + POSITION_SLOP + row * rowSpacing;
        seeds.push({
          position: {
            x: center.x - outwardX * inwardDistance + tangentX * lane,
            y: center.y - outwardY * inwardDistance + tangentY * lane,
          },
          velocity: this.randomVelocity(),
        });
      }
      return seeds;
    }

    const occupancy = new SpatialHash(this.diameter * 1.05);
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
    for (let attempt = 0; attempt < 128; attempt += 1) {
      const candidate = {
        x: (this.random() * 2 - 1) * edgeLimit,
        y: -edgeLimit * (0.25 + this.random() * 0.65),
      };
      if (isInsideArena(this.config.shape, candidate, this.radius, this.halfExtent)) return candidate;
    }
    throw new Error('无法在场地上半部找到可用的初始位置。');
  }

  private randomVelocity(): Point {
    const direction = this.config.initialDirection + (this.random() * 2 - 1) * this.config.directionSpread;
    const angle = (direction * Math.PI) / 180;
    const speed = Math.max(0, this.config.initialSpeed * (1 + (this.random() * 2 - 1) * this.config.speedSpread));
    return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
  }

  private addBall(position: Point, velocity: Point): number {
    if (this.count >= this.capacity) return -1;
    const index = this.count++;
    const id = this.nextId++;
    this.indexById.set(id, index);
    this.ids[index] = id;
    this.x[index] = position.x;
    this.y[index] = position.y;
    this.vx[index] = velocity.x;
    this.vy[index] = velocity.y;
    this.hasEntered[index] = isInsideArena(this.config.shape, position, this.radius, this.halfExtent) ? 1 : 0;
    return id;
  }

  private rebuildGrid(): void {
    this.gridHeads.fill(-1);
    for (let index = 0; index < this.count; index += 1) {
      const cellX = this.toGridCell(this.x[index]);
      const cellY = this.toGridCell(this.y[index]);
      const key = cellY * this.gridColumns + cellX;
      this.gridNext[index] = this.gridHeads[key];
      this.gridHeads[key] = index;
    }
  }

  private toGridCell(coordinate: number): number {
    return Math.max(0, Math.min(this.gridColumns - 1, Math.floor((coordinate - this.gridMin) / this.cellSize)));
  }

  private beginContactSubstep(): void {
    const priorPairs = this.previousTouchingPairs;
    this.previousTouchingPairs = this.touchingPairs;
    this.touchingPairs = priorPairs;
    this.touchingPairs.clear();
  }

  private integrate(deltaSeconds: number): void {
    for (let index = 0; index < this.count; index += 1) {
      this.vy[index] += this.config.gravity * deltaSeconds;
      this.x[index] += this.vx[index] * deltaSeconds;
      this.y[index] += this.vy[index] * deltaSeconds;
    }
  }

  private getAdaptiveSubstepCount(deltaSeconds: number): number {
    let maximumSpeed = 0;
    for (let index = 0; index < this.count; index += 1) {
      maximumSpeed = Math.max(maximumSpeed, Math.hypot(this.vx[index], this.vy[index]));
    }
    const estimatedTravel = maximumSpeed * deltaSeconds + Math.abs(this.config.gravity) * deltaSeconds ** 2 / 2;
    const allowedTravel = this.radius * (this.tuning.maxTravelPerSubstep ?? MAX_BATCH_TRAVEL_PER_SUBSTEP);
    return Math.max(1, Math.min(MAX_BATCH_SUBSTEPS, Math.ceil(estimatedTravel / Math.max(allowedTravel, 1e-9))));
  }

  private solveBallPositions(): void {
    const diameterSquared = this.diameter * this.diameter;
    for (let first = 0; first < this.count; first += 1) {
      const cellX = this.toGridCell(this.x[first]);
      const cellY = this.toGridCell(this.y[first]);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const neighborY = cellY + offsetY;
        if (neighborY < 0 || neighborY >= this.gridColumns) continue;
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const neighborX = cellX + offsetX;
          if (neighborX < 0 || neighborX >= this.gridColumns) continue;
          let second = this.gridHeads[neighborY * this.gridColumns + neighborX];
          while (second !== -1) {
            if (second > first) {
              const dx = this.x[second] - this.x[first];
              const dy = this.y[second] - this.y[first];
              const distanceSquared = dx * dx + dy * dy;
              if (distanceSquared < diameterSquared) {
                if (this.config.birthProbability > 0) this.recordContact(first, second);
                const distance = Math.sqrt(distanceSquared);
                const overlap = this.diameter - distance;
                const correction = Math.max(overlap - POSITION_SLOP, 0) * POSITION_CORRECTION / 2;
                const normalX = distance > 1e-9 ? dx / distance : 1;
                const normalY = distance > 1e-9 ? dy / distance : 0;
                this.x[first] -= normalX * correction;
                this.y[first] -= normalY * correction;
                this.x[second] += normalX * correction;
                this.y[second] += normalY * correction;
              }
            }
            second = this.gridNext[second];
          }
        }
      }
    }
  }

  private solveBallVelocities(): void {
    const diameterSquared = (this.diameter + POSITION_SLOP) ** 2;
    const restitution = Math.max(0, Math.min(1, this.config.restitution));
    for (let first = 0; first < this.count; first += 1) {
      const cellX = this.toGridCell(this.x[first]);
      const cellY = this.toGridCell(this.y[first]);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const neighborY = cellY + offsetY;
        if (neighborY < 0 || neighborY >= this.gridColumns) continue;
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const neighborX = cellX + offsetX;
          if (neighborX < 0 || neighborX >= this.gridColumns) continue;
          let second = this.gridHeads[neighborY * this.gridColumns + neighborX];
          while (second !== -1) {
            if (second > first) {
              const dx = this.x[second] - this.x[first];
              const dy = this.y[second] - this.y[first];
              const distanceSquared = dx * dx + dy * dy;
              if (distanceSquared <= diameterSquared) {
                if (this.config.birthProbability > 0) this.recordContact(first, second);
                const distance = Math.sqrt(distanceSquared);
                const normalX = distance > 1e-9 ? dx / distance : 1;
                const normalY = distance > 1e-9 ? dy / distance : 0;
                const relativeNormalVelocity = (this.vx[second] - this.vx[first]) * normalX + (this.vy[second] - this.vy[first]) * normalY;
                if (relativeNormalVelocity < 0) {
                  const impulse = -(1 + restitution) * relativeNormalVelocity / 2;
                  this.vx[first] -= impulse * normalX;
                  this.vy[first] -= impulse * normalY;
                  this.vx[second] += impulse * normalX;
                  this.vy[second] += impulse * normalY;
                }
              }
            }
            second = this.gridNext[second];
          }
        }
      }
    }
  }

  private solveWallPositions(): void {
    for (let index = 0; index < this.count; index += 1) {
      if (this.config.shape === 'circle') this.solveCircleWallPosition(index);
      else this.solveSegmentWallPosition(index);
    }
  }

  private solveCircleWallPosition(index: number): void {
    const distance = Math.hypot(this.x[index], this.y[index]);
    if (distance <= 0) return;
    const normalX = -this.x[index] / distance;
    const normalY = -this.y[index] / distance;
    if (distance > this.halfExtent - this.radius && !this.insideGapPortal(index)) {
      const correction = distance - (this.halfExtent - this.radius) + POSITION_SLOP;
      this.x[index] += normalX * correction;
      this.y[index] += normalY * correction;
    }
    for (const point of this.boundaryPoints) this.resolvePointPosition(index, point.x, point.y);
  }

  private insideGapPortal(index: number): boolean {
    if (this.gapArcs.length === 0) return false;
    const angle = Math.atan2(this.y[index], this.x[index]);
    const arcDistance = ((angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) * this.halfExtent;
    return this.gapArcs.some(({ center, width }) => Math.abs(wrappedDistance(arcDistance, center, this.perimeter)) < width / 2 - this.radius);
  }

  private solveSegmentWallPosition(index: number): void {
    for (const segment of this.wallSegments) {
      const segmentX = segment.to.x - segment.from.x;
      const segmentY = segment.to.y - segment.from.y;
      const lengthSquared = segmentX * segmentX + segmentY * segmentY;
      const projection = Math.max(0, Math.min(1,
        ((this.x[index] - segment.from.x) * segmentX + (this.y[index] - segment.from.y) * segmentY) / lengthSquared,
      ));
      const nearestX = segment.from.x + segmentX * projection;
      const nearestY = segment.from.y + segmentY * projection;
      this.resolveSegmentPointPosition(index, nearestX, nearestY, segmentX, segmentY, lengthSquared);
    }
  }

  private resolveSegmentPointPosition(index: number, pointX: number, pointY: number, segmentX: number, segmentY: number, lengthSquared: number): void {
    const dx = this.x[index] - pointX;
    const dy = this.y[index] - pointY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= this.radius * this.radius) return;
    const distance = Math.sqrt(distanceSquared) || 1e-9;
    let normalX = dx / distance;
    let normalY = dy / distance;
    const inwardX = -segmentY / Math.sqrt(lengthSquared);
    const inwardY = segmentX / Math.sqrt(lengthSquared);
    if (dx * inwardX + dy * inwardY < 0) {
      normalX = inwardX;
      normalY = inwardY;
    }
    const correction = this.radius - distance + POSITION_SLOP;
    this.x[index] += normalX * correction;
    this.y[index] += normalY * correction;
  }

  private resolvePointPosition(index: number, pointX: number, pointY: number): void {
    const dx = this.x[index] - pointX;
    const dy = this.y[index] - pointY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= this.radius * this.radius) return;
    const distance = Math.sqrt(distanceSquared) || 1e-9;
    const correction = this.radius - distance + POSITION_SLOP;
    this.x[index] += (dx / distance) * correction;
    this.y[index] += (dy / distance) * correction;
  }

  private solveWallVelocities(): void {
    for (let index = 0; index < this.count; index += 1) {
      if (this.config.shape === 'circle') this.solveCircleWallVelocity(index);
      else this.solveSegmentWallVelocity(index);
    }
  }

  private solveCircleWallVelocity(index: number): void {
    const distance = Math.hypot(this.x[index], this.y[index]);
    if (distance <= 0 || (distance < this.halfExtent - this.radius - POSITION_SLOP)) return;
    if (this.insideGapPortal(index)) {
      for (const point of this.boundaryPoints) this.resolvePointVelocity(index, point.x, point.y);
      return;
    }
    const normalX = -this.x[index] / distance;
    const normalY = -this.y[index] / distance;
    this.reflectFromWall(index, normalX, normalY);
    for (const point of this.boundaryPoints) this.resolvePointVelocity(index, point.x, point.y);
  }

  private solveSegmentWallVelocity(index: number): void {
    for (const segment of this.wallSegments) {
      const segmentX = segment.to.x - segment.from.x;
      const segmentY = segment.to.y - segment.from.y;
      const lengthSquared = segmentX * segmentX + segmentY * segmentY;
      const projection = Math.max(0, Math.min(1,
        ((this.x[index] - segment.from.x) * segmentX + (this.y[index] - segment.from.y) * segmentY) / lengthSquared,
      ));
      const nearestX = segment.from.x + segmentX * projection;
      const nearestY = segment.from.y + segmentY * projection;
      const dx = this.x[index] - nearestX;
      const dy = this.y[index] - nearestY;
      if (dx * dx + dy * dy > (this.radius + POSITION_SLOP) ** 2) continue;
      const distance = Math.hypot(dx, dy) || 1e-9;
      let normalX = dx / distance;
      let normalY = dy / distance;
      const inwardX = -segmentY / Math.sqrt(lengthSquared);
      const inwardY = segmentX / Math.sqrt(lengthSquared);
      if (dx * inwardX + dy * inwardY < 0) {
        normalX = inwardX;
        normalY = inwardY;
      }
      this.reflectFromWall(index, normalX, normalY);
    }
  }

  private reflectFromWall(index: number, normalX: number, normalY: number): void {
    const intoWall = this.vx[index] * normalX + this.vy[index] * normalY;
    if (intoWall >= 0) return;
    const restitution = Math.max(0, Math.min(1, this.config.restitution));
    const impulse = (1 + restitution) * intoWall;
    this.vx[index] -= impulse * normalX;
    this.vy[index] -= impulse * normalY;
  }

  private resolvePointVelocity(index: number, pointX: number, pointY: number): void {
    const dx = this.x[index] - pointX;
    const dy = this.y[index] - pointY;
    if (dx * dx + dy * dy > (this.radius + POSITION_SLOP) ** 2) return;
    const distance = Math.hypot(dx, dy) || 1e-9;
    this.reflectFromWall(index, dx / distance, dy / distance);
  }

  private recordContact(first: number, second: number): void {
    const firstId = this.ids[first];
    const secondId = this.ids[second];
    const key = firstId < secondId ? `${firstId}:${secondId}` : `${secondId}:${firstId}`;
    if (this.touchingPairs.has(key)) return;
    this.touchingPairs.add(key);
    if (this.previousTouchingPairs.has(key)) return;
    if (!this.pairCooldown.shouldAccept(firstId, secondId, this.elapsedSeconds, this.config.pairCooldown)) return;
    if (this.queuedBirthPairs.has(key)) return;
    this.queuedBirthPairs.add(key);
    this.birthAttempts += 1;
    if (this.random() < this.config.birthProbability) this.pendingPairs.push([firstId, secondId]);
  }

  private removeExitedBalls(): void {
    for (let index = this.count - 1; index >= 0; index -= 1) {
      const point = { x: this.x[index], y: this.y[index] };
      if (isInsideArena(this.config.shape, point, this.radius, this.halfExtent)) this.hasEntered[index] = 1;
      if (!this.hasEntered[index] || !this.isOutsideArena(point)) continue;
      const last = --this.count;
      this.indexById.delete(this.ids[index]);
      if (index !== last) {
        this.x[index] = this.x[last];
        this.y[index] = this.y[last];
        this.vx[index] = this.vx[last];
        this.vy[index] = this.vy[last];
        this.ids[index] = this.ids[last];
        this.hasEntered[index] = this.hasEntered[last];
        this.indexById.set(this.ids[index], index);
      }
      this.exits += 1;
    }
  }

  private isOutsideArena(point: Point): boolean {
    const threshold = this.halfExtent + this.radius * 1.25;
    return Math.hypot(point.x, point.y) > threshold;
  }

  private resolveBirths(): void {
    for (const [firstId, secondId] of this.pendingPairs) {
      const first = this.findIndexById(firstId);
      const second = this.findIndexById(secondId);
      if (first < 0 || second < 0) {
        this.missedBirths += 1;
        continue;
      }
      if (this.count >= this.populationLimit) {
        if (this.stopOnTerminalState) {
          this.finish('population-target');
          break;
        }
        this.missedBirths += 1;
        continue;
      }
      const midpoint = { x: (this.x[first] + this.x[second]) / 2, y: (this.y[first] + this.y[second]) / 2 };
      const position = this.findBirthPosition(midpoint);
      if (!position) {
        this.missedBirths += 1;
        this.missedSpaceBirths += 1;
        continue;
      }
      const momentum = shareBirthMomentum(
        { x: this.vx[first], y: this.vy[first] },
        { x: this.vx[second], y: this.vy[second] },
      );
      this.vx[first] = momentum.first.x;
      this.vy[first] = momentum.first.y;
      this.vx[second] = momentum.second.x;
      this.vy[second] = momentum.second.y;
      this.addBall(position, momentum.child);
      this.births += 1;
      this.insertGrid(this.count - 1);
      if (this.stopOnTerminalState && this.count >= this.populationLimit) {
        this.finish('population-target');
        break;
      }
    }
  }

  private findBirthPosition(midpoint: Point): Point | null {
    const rotation = this.random() * Math.PI * 2;
    const rotationX = Math.cos(rotation);
    const rotationY = Math.sin(rotation);
    for (const ringRadius of BIRTH_SEARCH_RING_RADII) {
      for (const direction of BIRTH_SEARCH_DIRECTIONS) {
        const directionX = direction.x * rotationX - direction.y * rotationY;
        const directionY = direction.x * rotationY + direction.y * rotationX;
        const point = {
          x: midpoint.x + directionX * this.radius * ringRadius,
          y: midpoint.y + directionY * this.radius * ringRadius,
        };
        if (!isInsideArena(this.config.shape, point, this.radius, this.halfExtent)) continue;
        if (this.gridOverlaps(point)) continue;
        let overlapsGapEndpoint = false;
        for (const boundary of this.boundaryPoints) {
          const dx = point.x - boundary.x;
          const dy = point.y - boundary.y;
          if (dx * dx + dy * dy < this.radius * this.radius) {
            overlapsGapEndpoint = true;
            break;
          }
        }
        if (!overlapsGapEndpoint) return point;
      }
    }
    return null;
  }

  private gridOverlaps(point: Point): boolean {
    const cellX = this.toGridCell(point.x);
    const cellY = this.toGridCell(point.y);
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      const y = cellY + offsetY;
      if (y < 0 || y >= this.gridColumns) continue;
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const x = cellX + offsetX;
        if (x < 0 || x >= this.gridColumns) continue;
        let index = this.gridHeads[y * this.gridColumns + x];
        while (index !== -1) {
          const dx = point.x - this.x[index];
          const dy = point.y - this.y[index];
          if (dx * dx + dy * dy < this.diameter * this.diameter - 1e-8) return true;
          index = this.gridNext[index];
        }
      }
    }
    return false;
  }

  private insertGrid(index: number): void {
    const cellX = this.toGridCell(this.x[index]);
    const cellY = this.toGridCell(this.y[index]);
    const key = cellY * this.gridColumns + cellX;
    this.gridNext[index] = this.gridHeads[key];
    this.gridHeads[key] = index;
  }

  private findIndexById(id: number): number {
    return this.indexById.get(id) ?? -1;
  }

  private endForPopulationState(): void {
    if (!this.stopOnTerminalState) return;
    if (this.count === 0) this.finish('no-balls');
    else if (this.count === 1) this.finish('single-ball');
    else if (this.count >= this.populationLimit) this.finish('population-target');
  }

  private finish(reason: EndReason): void {
    this.ended = true;
    this.endReason = reason;
    this.pendingPairs.length = 0;
  }
}
