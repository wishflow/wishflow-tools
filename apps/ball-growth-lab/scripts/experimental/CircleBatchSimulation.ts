import { buildBoundarySegments, getGapArcs, getPerimeter, isInsideArena, pointAtBoundaryDistance } from '../../src/arena';
import { createRandom } from '../../src/random';
import {
  ARENA_HALF_EXTENT,
  MAX_POPULATION,
  type BallSnapshot,
  type Point,
  type SimulationConfig,
  type SimulationSnapshot,
  type SpawnSeed,
} from '../../src/types';
import { PairCooldown } from '../../src/physics/PairCooldown';
import { shareBirthMomentum, type PhysicsAdapter, type SolverTuning } from '../../src/physics/PhysicsAdapter';
import { SpatialHash } from '../../src/physics/SpatialHash';

const BALL_COLORS = [0xf06b56, 0x3886c8, 0x54ae86, 0xeabf3a, 0x8975c6, 0xe07ca4];
const POSITION_SLOP = 0.002;
const POSITION_CORRECTION = 0.85;

function wrappedDistance(first: number, second: number, perimeter: number): number {
  const half = perimeter / 2;
  return ((first - second + half) % perimeter + perimeter) % perimeter - half;
}

/**
 * Experimental equal-radius circle solver.
 * Stores ball state in typed arrays and uses a rebuilt uniform grid for each solver pass.
 */
export class CircleBatchSimulation implements PhysicsAdapter {
  private readonly random: () => number;
  private readonly radius: number;
  private readonly diameter: number;
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
  private count = 0;
  private nextId = 1;
  private elapsedSeconds = 0;
  private births = 0;
  private exits = 0;
  private missedBirths = 0;
  private disposed = false;
  private lastCooldownPrune = 0;

  constructor(
    private readonly config: SimulationConfig,
    initialSeeds?: SpawnSeed[],
    private readonly tuning: SolverTuning = { velocityIterations: 4, positionIterations: 2 },
  ) {
    this.random = createRandom(config.seed);
    this.radius = ARENA_HALF_EXTENT * config.ballDiameterRatio;
    this.diameter = this.radius * 2;
    this.capacity = Math.max(1, Math.min(config.maxPopulation, MAX_POPULATION));
    this.x = new Float64Array(this.capacity);
    this.y = new Float64Array(this.capacity);
    this.vx = new Float64Array(this.capacity);
    this.vy = new Float64Array(this.capacity);
    this.ids = new Uint32Array(this.capacity);
    this.hasEntered = new Uint8Array(this.capacity);
    this.wallSegments = buildBoundarySegments(config);
    this.gapArcs = getGapArcs(config);
    this.perimeter = getPerimeter(config.shape);
    this.boundaryPoints = this.gapArcs.flatMap(({ center, width }) => [
      pointAtBoundaryDistance(config.shape, center - width / 2),
      pointAtBoundaryDistance(config.shape, center + width / 2),
    ]);
    this.cellSize = this.diameter;
    let seedPadding = 4;
    for (const seed of initialSeeds ?? []) {
      seedPadding = Math.max(seedPadding, Math.max(Math.abs(seed.position.x), Math.abs(seed.position.y)) - ARENA_HALF_EXTENT + this.diameter);
    }
    const gridPadding = Math.max(seedPadding, this.radius * 4);
    this.gridMin = -ARENA_HALF_EXTENT - gridPadding;
    this.gridColumns = Math.ceil((ARENA_HALF_EXTENT * 2 + gridPadding * 2) / this.cellSize) + 1;
    this.gridHeads = new Int32Array(this.gridColumns * this.gridColumns);
    this.gridNext = new Int32Array(this.capacity);

    const seeds = initialSeeds ?? this.createInitialSeeds(config.initialCount);
    if (seeds.length > this.capacity) throw new Error('初始球数不能超过人口上限。');
    for (const seed of seeds) this.addBall(seed.position, seed.velocity ?? this.randomVelocity());
  }

  step(deltaSeconds: number): void {
    if (this.disposed) throw new Error('Cannot step a disposed simulation.');
    this.elapsedSeconds += deltaSeconds;
    const oldContacts = this.touchingPairs;
    this.touchingPairs = this.previousTouchingPairs;
    this.previousTouchingPairs = oldContacts;
    this.touchingPairs.clear();
    this.pendingPairs.length = 0;

    for (let index = 0; index < this.count; index += 1) {
      this.vy[index] += this.config.gravity * deltaSeconds;
      this.x[index] += this.vx[index] * deltaSeconds;
      this.y[index] += this.vy[index] * deltaSeconds;
    }

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
    if (this.count > 500 && this.elapsedSeconds - this.lastCooldownPrune >= 5) {
      this.pairCooldown.prune(this.elapsedSeconds, Math.max(this.config.pairCooldown * 4, 5));
      this.lastCooldownPrune = this.elapsedSeconds;
    }
    if (this.pendingPairs.length > 0) {
      this.rebuildGrid();
      this.resolveBirths();
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
        birthAttempts: this.births + this.missedBirths,
        exits: this.exits,
        missedBirths: this.missedBirths,
        missedSpaceBirths: this.missedBirths,
        missedEnergyBirths: 0,
        maxSpeed,
      },
      ended: false,
    };
  }

  dispose(): void {
    this.pairCooldown.clear();
    this.indexById.clear();
    this.touchingPairs.clear();
    this.previousTouchingPairs.clear();
    this.pendingPairs.length = 0;
    this.count = 0;
    this.disposed = true;
  }

  private createInitialSeeds(count: number): SpawnSeed[] {
    const seeds: SpawnSeed[] = [];
    if (this.config.gapCount > 0) {
      const gap = this.gapArcs[0];
      const center = pointAtBoundaryDistance(this.config.shape, gap.center);
      const laneCount = Math.max(1, Math.floor(gap.width / this.diameter));
      const lanes = Array.from({ length: laneCount }, (_, index) => (index - (laneCount - 1) / 2) * this.diameter);
      const rowSpacing = this.diameter + this.radius * 0.08;
      for (let index = 0; index < count; index += 1) {
        const row = Math.floor(index / laneCount);
        const lane = lanes[index % laneCount];
        seeds.push({
          position: { x: center.x + lane, y: center.y - this.radius - row * rowSpacing },
          velocity: { x: 0, y: 0 },
        });
      }
      return seeds;
    }

    const occupancy = new SpatialHash(this.diameter * 1.05);
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
    this.hasEntered[index] = isInsideArena(this.config.shape, position, this.radius) ? 1 : 0;
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
                  const impactRestitution = -relativeNormalVelocity > 0.8 ? restitution : 0;
                  const impulse = -(1 + impactRestitution) * relativeNormalVelocity / 2;
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
    if (distance > ARENA_HALF_EXTENT - this.radius && !this.insideGapPortal(index)) {
      const correction = distance - (ARENA_HALF_EXTENT - this.radius) + POSITION_SLOP;
      this.x[index] += normalX * correction;
      this.y[index] += normalY * correction;
    }
    for (const point of this.boundaryPoints) this.resolvePointPosition(index, point.x, point.y);
  }

  private insideGapPortal(index: number): boolean {
    if (this.gapArcs.length === 0) return false;
    const angle = Math.atan2(this.y[index], this.x[index]);
    const arcDistance = ((angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) * ARENA_HALF_EXTENT;
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
    if (distance <= 0 || (distance < ARENA_HALF_EXTENT - this.radius - POSITION_SLOP)) return;
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
    const restitution = -intoWall > 0.8 ? this.config.restitution : 0;
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
    if (this.random() < this.config.birthProbability) this.pendingPairs.push([firstId, secondId]);
  }

  private removeExitedBalls(): void {
    for (let index = this.count - 1; index >= 0; index -= 1) {
      const point = { x: this.x[index], y: this.y[index] };
      if (isInsideArena(this.config.shape, point, this.radius)) this.hasEntered[index] = 1;
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
    const threshold = ARENA_HALF_EXTENT + this.radius * 1.25;
    if (this.config.shape === 'square') return Math.abs(point.x) > threshold || Math.abs(point.y) > threshold;
    return Math.hypot(point.x, point.y) > threshold;
  }

  private resolveBirths(): void {
    const maxPopulation = Math.min(this.capacity, this.config.maxPopulation, MAX_POPULATION);
    for (const [firstId, secondId] of this.pendingPairs) {
      const first = this.findIndexById(firstId);
      const second = this.findIndexById(secondId);
      if (first < 0 || second < 0) continue;
      if (this.count >= maxPopulation) {
        this.missedBirths += 1;
        continue;
      }
      const midpoint = { x: (this.x[first] + this.x[second]) / 2, y: (this.y[first] + this.y[second]) / 2 };
      const position = this.findBirthPosition(midpoint);
      if (!position) {
        this.missedBirths += 1;
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
    }
  }

  private findBirthPosition(midpoint: Point): Point | null {
    const startAngle = this.random() * Math.PI * 2;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const angle = startAngle + (Math.PI * 2 * attempt) / 24;
      const point = {
        x: midpoint.x + Math.cos(angle) * this.radius * 2.15,
        y: midpoint.y + Math.sin(angle) * this.radius * 2.15,
      };
      if (!isInsideArena(this.config.shape, point, this.radius)) continue;
      if (!this.gridOverlaps(point)) return point;
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
}
