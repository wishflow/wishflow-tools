import { Chain, Circle, Settings, Vec2, World, type Body, type Contact } from 'planck';
import { buildBoundaryPaths, getGapArcs, isInsideArena, pointAtBoundaryDistance } from '../../src/arena';
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
import { SpatialHash } from '../../src/physics/SpatialHash';
import { PairCooldown } from '../../src/physics/PairCooldown';
import { DEFAULT_SOLVER_TUNING, shareBirthMomentum, type PhysicsAdapter, type SolverTuning } from '../../src/physics/PhysicsAdapter';

interface BallUserData {
  kind: 'ball';
  id: number;
}

interface BallRecord {
  id: number;
  body: Body;
  radius: number;
  color: number;
  hasEntered: boolean;
}

const BALL_COLORS = [0xf06b56, 0x3886c8, 0x54ae86, 0xeabf3a, 0x8975c6, 0xe07ca4];

Settings.velocityThreshold = 0.8;

export class PlanckSimulation implements PhysicsAdapter {
  private readonly world: World;
  private readonly random: () => number;
  private readonly radius: number;
  private readonly pairCooldown = new PairCooldown();
  private readonly pendingPairs: Array<[number, number]> = [];
  private readonly balls = new Map<number, BallRecord>();
  private readonly occupancy: SpatialHash;
  private readonly collisionListener: (contact: Contact) => void;
  private nextBallId = 1;
  private time = 0;
  private births = 0;
  private exits = 0;
  private missedBirths = 0;
  private disposed = false;
  private lastCooldownPrune = 0;

  constructor(
    private readonly config: SimulationConfig,
    initialSeeds?: SpawnSeed[],
    private readonly solverTuning: SolverTuning = DEFAULT_SOLVER_TUNING,
  ) {
    this.random = createRandom(config.seed);
    this.radius = ARENA_HALF_EXTENT * config.ballDiameterRatio;
    this.occupancy = new SpatialHash(this.radius * 2.05);
    this.world = new World(new Vec2(0, config.gravity));
    this.createArena();

    this.collisionListener = (contact) => this.onContact(contact);
    this.world.on('begin-contact', this.collisionListener);

    const seeds = initialSeeds ?? this.createInitialSeeds(config.initialCount);
    for (const seed of seeds) this.addBall(seed.position, seed.velocity ?? this.randomVelocity());
  }

  step(deltaSeconds: number): void {
    if (this.disposed) throw new Error('Cannot step a disposed simulation.');
    this.time += deltaSeconds;
    this.world.step(deltaSeconds, this.solverTuning.velocityIterations, this.solverTuning.positionIterations);
    this.removeExitedBalls();
    if (this.balls.size > 500 && this.time - this.lastCooldownPrune >= 5) {
      this.pairCooldown.prune(this.time, Math.max(this.config.pairCooldown * 4, 5));
      this.lastCooldownPrune = this.time;
    }
    if (this.pendingPairs.length > 0) {
      this.rebuildOccupancy();
      this.resolveBirths();
    }
  }

  getSnapshot(): SimulationSnapshot {
    return {
      balls: this.getBallSnapshots(),
      stats: {
        elapsedSeconds: this.time,
        currentCount: this.balls.size,
        births: this.births,
        exits: this.exits,
        missedBirths: this.missedBirths,
      },
    };
  }

  dispose(): void {
    this.world.off('begin-contact', this.collisionListener);
    this.balls.clear();
    this.pendingPairs.length = 0;
    this.pairCooldown.clear();
    this.occupancy.clear();
    this.disposed = true;
  }

  private createArena(): void {
    const wall = this.world.createBody();
    const options = { friction: 0, restitution: this.config.restitution };
    for (const path of buildBoundaryPaths(this.config)) {
      const vertices = path.points.map((point) => new Vec2(point.x, point.y));
      wall.createFixture(new Chain(vertices, path.loop), options);
    }
  }

  private createInitialSeeds(count: number): SpawnSeed[] {
    const seeds: SpawnSeed[] = [];
    if (this.config.gapCount > 0) {
      const gap = getGapArcs(this.config)[0];
      const center = pointAtBoundaryDistance(this.config.shape, gap.center);
      const tangentStep = this.radius * 2;
      const laneCount = Math.max(1, Math.floor(gap.width / (this.radius * 2)));
      const lanes = Array.from({ length: laneCount }, (_, index) => (index - (laneCount - 1) / 2) * tangentStep);
      const tangentX = 1;
      const tangentY = 0;
      const rowSpacing = this.radius * 2 + this.radius * 0.08;

      for (let index = 0; index < count; index += 1) {
        const row = Math.floor(index / laneCount);
        const lane = lanes[index % laneCount];
        seeds.push({
          position: {
            x: center.x + tangentX * lane,
            y: center.y - this.radius - row * rowSpacing,
          },
          velocity: { x: 0, y: 0 },
        });
      }
      return seeds;
    }

    const startId = this.nextBallId;
    for (let index = 0; index < count; index += 1) {
      let position: Point | null = null;
      for (let attempt = 0; attempt < 3000; attempt += 1) {
        const candidate = this.randomInteriorPoint();
        if (!this.occupancy.overlaps(candidate, this.radius)) {
          position = candidate;
          break;
        }
      }
      if (!position) {
        throw new Error(`Unable to place initial ball ${index + 1}; reduce the count or ball diameter.`);
      }
      seeds.push({ position, velocity: this.randomVelocity() });
      this.occupancy.insert(startId + index, position);
    }
    this.occupancy.clear();
    return seeds;
  }

  private randomInteriorPoint(): Point {
    const edgeLimit = ARENA_HALF_EXTENT - this.radius;
    if (this.config.shape === 'square') {
      return {
        x: (this.random() * 2 - 1) * edgeLimit,
        y: (this.random() * 2 - 1) * edgeLimit,
      };
    }
    const angle = this.random() * Math.PI * 2;
    const distance = Math.sqrt(this.random()) * edgeLimit;
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  }

  private randomVelocity(): Point {
    return { x: (this.random() - 0.5) * 1.2, y: (this.random() - 0.5) * 0.7 };
  }

  private addBall(position: Point, velocity: Point): BallRecord {
    const id = this.nextBallId++;
    const body = this.world.createBody({
      type: 'dynamic',
      position: new Vec2(position.x, position.y),
      linearVelocity: new Vec2(velocity.x, velocity.y),
      allowSleep: true,
      bullet: false,
    });
    body.createFixture(new Circle(this.radius), {
      density: 1,
      friction: 0,
      restitution: this.config.restitution,
    });
    body.setUserData({ kind: 'ball', id } satisfies BallUserData);

    const record: BallRecord = {
      id,
      body,
      radius: this.radius,
      color: BALL_COLORS[(id - 1) % BALL_COLORS.length],
      hasEntered: isInsideArena(this.config.shape, position, this.radius),
    };
    this.balls.set(id, record);
    this.occupancy.insert(id, position);
    return record;
  }

  private onContact(contact: Contact): void {
    const first = contact.getFixtureA().getBody().getUserData() as BallUserData | undefined;
    const second = contact.getFixtureB().getBody().getUserData() as BallUserData | undefined;
    if (!first || !second || first.kind !== 'ball' || second.kind !== 'ball') return;

    if (!this.pairCooldown.shouldAccept(first.id, second.id, this.time, this.config.pairCooldown)) return;
    const pair = first.id < second.id ? [first.id, second.id] as const : [second.id, first.id] as const;
    if (this.random() < this.config.birthProbability) this.pendingPairs.push([pair[0], pair[1]]);
  }

  private removeExitedBalls(): void {
    for (const [id, record] of this.balls) {
      const position = record.body.getPosition();
      const point = { x: position.x, y: position.y };
      if (isInsideArena(this.config.shape, point, this.radius)) record.hasEntered = true;
      if (!record.hasEntered || !this.isOutsideArena(point)) continue;

      this.world.destroyBody(record.body);
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
    for (const record of this.balls.values()) {
      const position = record.body.getPosition();
      this.occupancy.insert(record.id, { x: position.x, y: position.y });
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

      const firstPosition = first.body.getPosition();
      const secondPosition = second.body.getPosition();
      const midpoint = { x: (firstPosition.x + secondPosition.x) / 2, y: (firstPosition.y + secondPosition.y) / 2 };
      const birthPosition = this.findBirthPosition(midpoint);
      if (!birthPosition) {
        this.missedBirths += 1;
        continue;
      }

      const firstVelocity = first.body.getLinearVelocity();
      const secondVelocity = second.body.getLinearVelocity();
      const momentum = shareBirthMomentum(firstVelocity, secondVelocity);
      first.body.setLinearVelocity(new Vec2(momentum.first.x, momentum.first.y));
      second.body.setLinearVelocity(new Vec2(momentum.second.x, momentum.second.y));
      this.addBall(birthPosition, momentum.child);
      this.births += 1;
    }
    this.pendingPairs.length = 0;
  }

  private findBirthPosition(midpoint: Point): Point | null {
    const startAngle = this.random() * Math.PI * 2;
    const offset = this.radius * 2.15;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const angle = startAngle + (Math.PI * 2 * attempt) / 24;
      const candidate = {
        x: midpoint.x + Math.cos(angle) * offset,
        y: midpoint.y + Math.sin(angle) * offset,
      };
      if (!isInsideArena(this.config.shape, candidate, this.radius)) continue;
      if (!this.occupancy.overlaps(candidate, this.radius)) return candidate;
    }
    return null;
  }

  private getBallSnapshots(): BallSnapshot[] {
    const result: BallSnapshot[] = [];
    for (const record of this.balls.values()) {
      const position = record.body.getPosition();
      result.push({
        id: record.id,
        x: position.x,
        y: position.y,
        radius: record.radius,
        color: record.color,
        shape: 'circle',
      });
    }
    return result;
  }
}
