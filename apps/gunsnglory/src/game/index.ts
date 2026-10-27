export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderTile {
  asset: string;
  source: Rectangle;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScenarioUnit {
  id: string;
  type: string;
  cell: { x: number; y: number };
  asset: string;
  frame: Rectangle;
  render: Rectangle;
  hitArea: Rectangle;
  weapon?: UnitWeaponDefinition;
}

export type DamageType = 'light' | 'fire' | 'heavy' | 'poison';

export interface UnitWeaponDefinition {
  damage: number;
  damageType: DamageType;
  rangeFine: number;
  reloadTimeMs: number;
  projectileSpeed: number;
  damageStyle: 0;
}

export interface PreviewEnemyDefinition {
  hitPoints: number;
  cashReward: number;
  penetration: Readonly<Record<DamageType, number>>;
}

export interface WaveSpawn {
  cell: { x: number; y: number };
  direction: Direction;
}

export type Direction = 'east' | 'south' | 'west' | 'north';

export interface WaveRedirect {
  cell: { x: number; y: number };
  directions: readonly Direction[];
}

export interface PreviewWaveDefinition {
  number: number;
  initialLives: number;
  initialCash?: number;
  difficultyScorePercent?: number;
  spawn: WaveSpawn;
  additionalSpawns?: readonly WaveSpawn[];
  enemy?: PreviewEnemyDefinition;
  baseEnemySpeed: number;
  speedMultiplierMin: number;
  speedMultiplierCount: number;
  escapePenalty: number;
  redirects: readonly WaveRedirect[];
  exit: { x: number; y: number };
}

export interface ScenarioContent {
  id: string;
  contentVersion?: string;
  formalSettlementSupported?: boolean;
  title: { en: string; zh: string };
  map: {
    width: number;
    height: number;
    tileSize: number;
    background: readonly RenderTile[];
    streets: readonly RenderTile[];
  };
  units: readonly ScenarioUnit[];
  previewWave?: PreviewWaveDefinition;
}

export type GameIntent =
  | { type: 'select-at'; x: number; y: number }
  | { type: 'clear-selection' }
  | { type: 'start-wave' };

export interface UnitView extends ScenarioUnit {
  selected: boolean;
}

export interface EnemyView {
  id: string;
  type: 1;
  asset: 'pioneer_male';
  speed: number;
  direction: Direction;
  positionFine: { x: number; y: number };
  hitPoints: number;
  maxHitPoints: number;
  alive: boolean;
  deathRemainingMs: number;
  hitFlashMs: number;
  animationFrame: number;
}

export interface ShotView {
  id: string;
  shooterId: string;
  targetId: string;
  positionFine: { x: number; y: number };
  remainingMs: number;
}

export type GameEvent =
  | { type: 'enemy-hit'; enemyId: string; damage: number; hitPoints: number }
  | { type: 'enemy-defeated'; enemyId: string; cashReward: number }
  | { type: 'wave-settled'; settlement: WaveSettlement };

export interface WaveSettlement {
  outcome: 'victory' | 'defeat';
  scoreBase: number;
  displayScore: number;
  highScoreCandidate: number;
}

export type GameMode = 'formal' | 'debug' | 'experiment' | 'replay';

export interface GameSettlementRecord extends WaveSettlement {
  settlementId: string;
  sessionId: string;
  scenarioId: string;
  mode: GameMode;
  waveNumber: number;
}

export interface WaveView {
  number: number;
  phase: 'not-started' | 'active' | 'complete';
  lives: number;
  escapedEnemies: number;
  defeatedEnemies: number;
  cash: number;
  activeEnemies: number;
  settlement?: WaveSettlement;
}

export interface GameView {
  frame: number;
  elapsedMs: number;
  scenarioId: string;
  map: ScenarioContent['map'];
  units: readonly UnitView[];
  enemies: readonly EnemyView[];
  shots: readonly ShotView[];
  events: readonly GameEvent[];
  wave?: WaveView;
}

export interface GameSession {
  readonly id: string;
  readonly startRecord: Readonly<{
    sessionId: string;
    scenarioId: string;
    contentVersion: string;
    randomAlgorithm: 'java.util.Random';
    randomSeed: number;
    mode: GameMode;
  }>;
  submitIntent(intent: GameIntent): boolean;
  advance(input?: { deltaMs?: number }): GameView;
  observe(): GameView;
  terminalRecord(): GameSettlementRecord | undefined;
  close(): void;
}

export interface Game {
  open(options: { scenarioId: string; randomSeed?: number; mode?: GameMode }): Promise<GameSession>;
}

interface PendingIntent {
  sequence: number;
  intent: GameIntent;
}

interface MutableEnemy {
  id: string;
  type: 1;
  asset: 'pioneer_male';
  speed: number;
  direction: Direction;
  positionFine: { x: number; y: number };
  hitPoints: number;
  maxHitPoints: number;
  cashReward: number;
  penetration: Readonly<Record<DamageType, number>>;
  alive: boolean;
  deathRemainingMs: number;
  hitFlashMs: number;
}

interface MutableShot {
  id: string;
  shooterId: string;
  targetId: string;
  damage: number;
  damageType: DamageType;
  startFine: { x: number; y: number };
  positionFine: { x: number; y: number };
  totalTravelTimeMs: number;
  remainingMs: number;
}

interface MutableUnit {
  definition: ScenarioUnit;
  selected: boolean;
  weaponCooldownMs: number;
}

interface MutableWave {
  phase: WaveView['phase'];
  lives: number;
  escapedEnemies: number;
  defeatedEnemies: number;
  cash: number;
  cashMade: number;
  settlement?: WaveSettlement;
  enemies: MutableEnemy[];
  shots: MutableShot[];
  events: GameEvent[];
}

const FINE_UNITS_PER_CELL = 7680;
const FIELD_CENTER_OFFSET = 15360;
const FIELD_CENTER_HALF = 3840;
const MAX_DELTA_MS = 100;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function freezeDeep<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(object)) freezeDeep(child, seen);
  return Object.freeze(object) as T;
}

function contains(rectangle: Rectangle, x: number, y: number): boolean {
  return x >= rectangle.x
    && y >= rectangle.y
    && x < rectangle.x + rectangle.width
    && y < rectangle.y + rectangle.height;
}

function validSeed(seed: number): boolean {
  return Number.isInteger(seed) && seed >= 0 && seed <= 0xffff_ffff;
}

function calculateSettlement(wave: MutableWave, difficultyScorePercent: number): WaveSettlement {
  // The original game keeps both the score base and saved high score in Java int arithmetic.
  const scoreBase = Math.imul(1, wave.cashMade + wave.cash);
  const displayMultiplier = Math.fround(difficultyScorePercent / 100);
  const displayScore = Math.round(Math.fround(Math.fround(scoreBase) * displayMultiplier));
  const highScoreCandidate = Math.trunc(Math.imul(scoreBase, difficultyScorePercent) / 100);

  return {
    outcome: wave.lives <= 0 ? 'defeat' : 'victory',
    scoreBase,
    displayScore,
    highScoreCandidate,
  };
}

/** Java's 48-bit LCG and bounded nextInt, used by the recovered game. */
class JavaRandom {
  private seed: bigint;

  constructor(seed: number) {
    this.seed = (BigInt(seed) ^ 0x5deece66dn) & ((1n << 48n) - 1n);
  }

  private next(bits: number): number {
    this.seed = (this.seed * 0x5deece66dn + 0xbn) & ((1n << 48n) - 1n);
    return Number(this.seed >> BigInt(48 - bits));
  }

  nextInt(bound: number): number {
    if (!Number.isInteger(bound) || bound <= 0) throw new RangeError('Random bound must be a positive integer');
    if ((bound & (bound - 1)) === 0) return Math.floor((bound * this.next(31)) / 0x8000_0000);

    let bits: number;
    let value: number;
    do {
      bits = this.next(31);
      value = bits % bound;
    } while (bits - value + (bound - 1) >= 0x8000_0000);
    return value;
  }
}

function directionVector(direction: Direction): { x: -1 | 0 | 1; y: -1 | 0 | 1 } {
  switch (direction) {
    case 'east': return { x: 1, y: 0 };
    case 'south': return { x: 0, y: 1 };
    case 'west': return { x: -1, y: 0 };
    case 'north': return { x: 0, y: -1 };
  }
}

function passesFieldCenter(oldFine: number, nextFine: number): boolean {
  const oldPhase = (oldFine + FIELD_CENTER_OFFSET) % FINE_UNITS_PER_CELL;
  const nextPhase = (nextFine + FIELD_CENTER_OFFSET) % FINE_UNITS_PER_CELL;
  return (oldPhase < FIELD_CENTER_HALF && nextPhase >= FIELD_CENTER_HALF && nextFine > oldFine)
    || (oldPhase > FIELD_CENTER_HALF && nextPhase <= FIELD_CENTER_HALF && nextFine < oldFine);
}

function fullCell(fine: number): number {
  return Math.trunc(Math.fround(fine / FINE_UNITS_PER_CELL));
}

function normalizedDelta(deltaMs: number | undefined): number {
  if (deltaMs === undefined || !Number.isFinite(deltaMs)) return 0;
  return Math.trunc(Math.max(0, Math.min(MAX_DELTA_MS, deltaMs)));
}

function tenthTileCoordinate(fine: number): number {
  return Math.trunc((fine * 10) / FINE_UNITS_PER_CELL);
}

function damagePenetration(enemy: MutableEnemy, damageType: DamageType): number {
  return enemy.penetration[damageType];
}

function createPreviewEnemy(
  id: string,
  spawn: WaveSpawn,
  definition: PreviewWaveDefinition,
  speed: number,
): MutableEnemy {
  const enemyDefinition = definition.enemy;
  const hitPoints = enemyDefinition?.hitPoints ?? 1;
  return {
    id,
    type: 1,
    asset: 'pioneer_male',
    speed,
    direction: spawn.direction,
    positionFine: {
      x: ((spawn.cell.x - 2) * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF,
      y: (spawn.cell.y * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF,
    },
    hitPoints,
    maxHitPoints: hitPoints,
    cashReward: enemyDefinition?.cashReward ?? 0,
    penetration: enemyDefinition?.penetration ?? { light: 0, fire: 0, heavy: 0, poison: 0 },
    alive: true,
    deathRemainingMs: 0,
    hitFlashMs: 0,
  };
}

function unitEnemyDistanceSquare(unit: ScenarioUnit, enemy: MutableEnemy): number {
  const unitX = tenthTileCoordinate((unit.cell.x * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF);
  const unitY = tenthTileCoordinate((unit.cell.y * FINE_UNITS_PER_CELL) + 1920);
  const enemyX = tenthTileCoordinate(enemy.positionFine.x);
  const enemyY = tenthTileCoordinate(enemy.positionFine.y);
  const dx = unitX - enemyX;
  const dy = unitY - enemyY;
  return (dx * dx) + (dy * dy);
}

function maxWeaponSquareRange(weapon: UnitWeaponDefinition): number {
  const rangeInTenthTiles = Math.trunc((weapon.rangeFine * 10) / FINE_UNITS_PER_CELL);
  return rangeInTenthTiles * rangeInTenthTiles;
}

function projectileTravelTime(
  distanceSquare: number,
  maxSquareRange: number,
  weapon: UnitWeaponDefinition,
): number {
  const baseTimePercent = 10;
  const baseSteps = Math.trunc(weapon.projectileSpeed / 10);
  const distanceSteps = Math.trunc(((100 - baseTimePercent) * baseSteps * distanceSquare) / maxSquareRange);
  return Math.trunc(((baseTimePercent * baseSteps) + distanceSteps) / 100) * 10;
}

function selectTarget(unit: ScenarioUnit, enemies: readonly MutableEnemy[]): MutableEnemy | undefined {
  const weapon = unit.weapon;
  if (!weapon) return undefined;
  const maxSquareRange = maxWeaponSquareRange(weapon);
  let bestTarget: MutableEnemy | undefined;
  let bestScore = -1;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const distanceSquare = unitEnemyDistanceSquare(unit, enemy);
    if (distanceSquare <= 50 || distanceSquare >= maxSquareRange) continue;

    // This sample has one enemy type and no per-enemy priority-map variation.
    // Strict greater-than preserves the recovered Vector order for equal scores.
    const score = damagePenetration(enemy, weapon.damageType) + 1400;
    if (score > bestScore) {
      bestTarget = enemy;
      bestScore = score;
    }
  }
  return bestTarget;
}

function moveEnemy(enemy: MutableEnemy, deltaMs: number, definition: PreviewWaveDefinition, random: JavaRandom): boolean {
  if (deltaMs === 0) return false;

  const previous = { ...enemy.positionFine };
  const vector = directionVector(enemy.direction);
  const distance = Math.fround((enemy.speed * deltaMs) / 100);
  enemy.positionFine = {
    x: Math.trunc(Math.fround(previous.x + vector.x * distance)),
    y: Math.trunc(Math.fround(previous.y + vector.y * distance)),
  };

  const passedCenter = vector.x !== 0
    ? passesFieldCenter(previous.x, enemy.positionFine.x)
    : passesFieldCenter(previous.y, enemy.positionFine.y);
  if (!passedCenter) return false;

  const cell = { x: fullCell(enemy.positionFine.x), y: fullCell(enemy.positionFine.y) };
  if (cell.x === definition.exit.x && cell.y === definition.exit.y) return true;

  const redirect = definition.redirects.find((candidate) =>
    candidate.cell.x === cell.x && candidate.cell.y === cell.y);
  if (redirect) {
    const nextDirection = redirect.directions[random.nextInt(redirect.directions.length)]!;
    if (nextDirection !== enemy.direction) {
      enemy.direction = nextDirection;
      const nextVector = directionVector(enemy.direction);
      enemy.positionFine = {
        x: (cell.x * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF + (nextVector.x * 2),
        y: (cell.y * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF + (nextVector.y * 2),
      };
    }
  }
  return false;
}

export function createGame(options: {
  scenarios: Readonly<Record<string, ScenarioContent>>;
  randomSeedSource?: () => number;
  sessionIdSource?: () => string;
}): Game {
  const scenarios = new Map<string, ScenarioContent>();
  for (const [key, scenario] of Object.entries(options.scenarios)) {
    scenarios.set(key, freezeDeep(clone(scenario)));
  }

  let nextSessionNumber = 1;

  return Object.freeze({
    async open({ scenarioId, randomSeed, mode = 'debug' }: {
      scenarioId: string;
      randomSeed?: number;
      mode?: GameMode;
    }): Promise<GameSession> {
      const scenario = scenarios.get(scenarioId);
      if (!scenario) throw new Error('Unknown scenario: ' + scenarioId);
      if (mode === 'formal' && scenario.formalSettlementSupported !== true) {
        throw new Error('Formal mode is not supported for scenario: ' + scenarioId);
      }
      if (mode === 'formal' && !scenario.previewWave) {
        throw new Error('Formal mode requires a settleable scenario: ' + scenarioId);
      }

      const resolvedSeed = randomSeed ?? options.randomSeedSource?.() ?? 1;
      if (!validSeed(resolvedSeed)) throw new RangeError('Random seed must be an unsigned 32-bit integer');
      const random = new JavaRandom(resolvedSeed);
      const sessionId = options.sessionIdSource?.() ?? 'game-session-' + nextSessionNumber;
      if (!sessionId || typeof sessionId !== 'string') throw new Error('Game session ID is invalid');
      nextSessionNumber += 1;
      const units: MutableUnit[] = scenario.units.map((definition) => ({
        definition,
        selected: false,
        weaponCooldownMs: definition.weapon ? Math.trunc(definition.weapon.reloadTimeMs / 2) : 0,
      }));
      const pending: PendingIntent[] = [];
      let nextIntentSequence = 1;
      let nextShotNumber = 1;
      let frame = 0;
      let elapsedMs = 0;
      let closed = false;
      let wave: MutableWave | undefined = scenario.previewWave
        ? {
          phase: 'not-started',
          lives: scenario.previewWave.initialLives,
          escapedEnemies: 0,
          defeatedEnemies: 0,
          cash: scenario.previewWave.initialCash ?? 0,
          cashMade: 0,
          enemies: [],
          shots: [],
          events: [],
        }
        : undefined;

      const assertOpen = () => {
        if (closed) throw new Error('Game session is closed');
      };

      const observe = (): GameView => {
        assertOpen();
        return freezeDeep({
          frame,
          elapsedMs,
          scenarioId: scenario.id,
          map: scenario.map,
          units: units.map(({ definition, selected }) => ({ ...clone(definition), selected })),
          enemies: (wave?.enemies ?? []).map((enemy) => ({
            id: enemy.id,
            type: enemy.type,
            asset: enemy.asset,
            speed: enemy.speed,
            direction: enemy.direction,
            positionFine: { ...enemy.positionFine },
            hitPoints: enemy.hitPoints,
            maxHitPoints: enemy.maxHitPoints,
            alive: enemy.alive,
            deathRemainingMs: enemy.deathRemainingMs,
            hitFlashMs: enemy.hitFlashMs,
            animationFrame: Math.floor(elapsedMs / 128) % 3,
          })),
          shots: (wave?.shots ?? []).map((shot) => ({
            id: shot.id,
            shooterId: shot.shooterId,
            targetId: shot.targetId,
            positionFine: { ...shot.positionFine },
            remainingMs: shot.remainingMs,
          })),
          events: clone(wave?.events ?? []),
          ...(wave && scenario.previewWave ? {
            wave: {
              number: scenario.previewWave.number,
              phase: wave.phase,
              lives: wave.lives,
              escapedEnemies: wave.escapedEnemies,
              defeatedEnemies: wave.defeatedEnemies,
              cash: wave.cash,
              activeEnemies: wave.enemies.filter((enemy) => enemy.alive).length,
              ...(wave.settlement ? { settlement: clone(wave.settlement) } : {}),
            },
          } : {}),
        });
      };

      const session: GameSession = {
        id: sessionId,
        startRecord: freezeDeep({
          sessionId,
          scenarioId: scenario.id,
          contentVersion: scenario.contentVersion ?? 'unversioned',
          randomAlgorithm: 'java.util.Random',
          randomSeed: resolvedSeed,
          mode,
        }),
        submitIntent(intent: GameIntent): boolean {
          assertOpen();
          if (!intent || typeof intent !== 'object') return false;
          if (wave?.settlement) return false;

          if (intent.type === 'clear-selection') {
            pending.push({ sequence: nextIntentSequence, intent: { type: 'clear-selection' } });
            nextIntentSequence += 1;
            return true;
          }

          if (intent.type === 'start-wave') {
            if (!wave || !scenario.previewWave || wave.phase !== 'not-started') return false;
            pending.push({ sequence: nextIntentSequence, intent: { type: 'start-wave' } });
            nextIntentSequence += 1;
            return true;
          }

          if (intent.type !== 'select-at' || !Number.isFinite(intent.x) || !Number.isFinite(intent.y)) {
            return false;
          }

          pending.push({
            sequence: nextIntentSequence,
            intent: { type: 'select-at', x: intent.x, y: intent.y },
          });
          nextIntentSequence += 1;
          return true;
        },
        advance(input: { deltaMs?: number } = {}): GameView {
          assertOpen();
          if (wave?.settlement) {
            wave.events = [];
            return observe();
          }
          frame += 1;
          const deltaMs = normalizedDelta(input.deltaMs);
          elapsedMs += deltaMs;
          if (wave) wave.events = [];
          let waveStarted = false;
          pending.sort((left, right) => left.sequence - right.sequence);
          for (const command of pending.splice(0)) {
            if (command.intent.type === 'clear-selection') {
              for (const unit of units) unit.selected = false;
              continue;
            }

            if (command.intent.type === 'start-wave') {
              if (wave?.phase !== 'not-started' || !scenario.previewWave) continue;
              const spawns = [scenario.previewWave.spawn, ...(scenario.previewWave.additionalSpawns ?? [])];
              for (const [index, spawn] of spawns.entries()) {
                const speedMultiplier = scenario.previewWave.speedMultiplierMin
                  + random.nextInt(scenario.previewWave.speedMultiplierCount);
                const speed = Math.trunc((scenario.previewWave.baseEnemySpeed * speedMultiplier) / 100);
                wave.enemies.push(createPreviewEnemy('preview-pioneer-' + (index + 1), spawn, scenario.previewWave, speed));
              }
              wave.phase = 'active';
              waveStarted = true;
              continue;
            }

            const selection = command.intent;
            if (selection.type !== 'select-at') continue;
            const target = [...units].reverse().find(({ definition }) =>
              contains(definition.hitArea, selection.x, selection.y));
            for (const unit of units) unit.selected = unit === target;
          }

          if (wave?.phase === 'active' && !waveStarted && scenario.previewWave) {
            for (const enemy of [...wave.enemies]) {
              if (!enemy.alive) {
                enemy.deathRemainingMs = Math.max(0, enemy.deathRemainingMs - deltaMs);
                enemy.hitFlashMs = Math.max(0, enemy.hitFlashMs - deltaMs);
                continue;
              }
              enemy.hitFlashMs = Math.max(0, enemy.hitFlashMs - deltaMs);
              if (!moveEnemy(enemy, deltaMs, scenario.previewWave, random)) continue;
              wave.enemies = wave.enemies.filter((candidate) => candidate !== enemy);
              wave.lives = Math.max(0, wave.lives - scenario.previewWave.escapePenalty);
              wave.escapedEnemies += 1;
            }

            for (const unit of units) {
              const weapon = unit.definition.weapon;
              if (!weapon) continue;
              if (unit.weaponCooldownMs > 0) unit.weaponCooldownMs = Math.trunc(unit.weaponCooldownMs - deltaMs);
              if (unit.weaponCooldownMs > 0) continue;

              const target = selectTarget(unit.definition, wave.enemies);
              if (!target) continue;
              const distanceSquare = unitEnemyDistanceSquare(unit.definition, target);
              const maxSquareRange = maxWeaponSquareRange(weapon);
              const startFine = {
                x: (unit.definition.cell.x * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF,
                y: (unit.definition.cell.y * FINE_UNITS_PER_CELL) + 1920,
              };
              const travelMs = projectileTravelTime(distanceSquare, maxSquareRange, weapon);
              wave.shots.push({
                id: 'preview-shot-' + nextShotNumber,
                shooterId: unit.definition.id,
                targetId: target.id,
                damage: weapon.damage,
                damageType: weapon.damageType,
                startFine,
                positionFine: { ...startFine },
                totalTravelTimeMs: travelMs,
                remainingMs: travelMs,
              });
              nextShotNumber += 1;
              unit.weaponCooldownMs = weapon.reloadTimeMs;
            }

            for (const shot of [...wave.shots]) {
              const target = wave.enemies.find((enemy) => enemy.id === shot.targetId);
              if (!target || !target.alive) {
                wave.shots = wave.shots.filter((candidate) => candidate !== shot);
                continue;
              }
              shot.remainingMs = Math.max(0, shot.remainingMs - deltaMs);
              const elapsedShotMs = shot.totalTravelTimeMs - shot.remainingMs;
              shot.positionFine = {
                x: Math.trunc(((shot.startFine.x * shot.remainingMs) + (target.positionFine.x * elapsedShotMs)) / shot.totalTravelTimeMs),
                y: Math.trunc(((shot.startFine.y * shot.remainingMs) + (target.positionFine.y * elapsedShotMs)) / shot.totalTravelTimeMs),
              };
              if (shot.remainingMs > 0) continue;

              const damage = Math.trunc((shot.damage * damagePenetration(target, shot.damageType)) / 100);
              target.hitPoints -= damage;
              target.hitFlashMs = 120;
              wave.events.push({ type: 'enemy-hit', enemyId: target.id, damage, hitPoints: target.hitPoints });
              if (target.hitPoints <= 0 && target.alive) {
                target.alive = false;
                target.deathRemainingMs = 799;
                wave.cash += target.cashReward;
                wave.cashMade += target.cashReward;
                wave.defeatedEnemies += 1;
                wave.events.push({ type: 'enemy-defeated', enemyId: target.id, cashReward: target.cashReward });
              }
              wave.shots = wave.shots.filter((candidate) => candidate !== shot);
            }

            wave.enemies = wave.enemies.filter((enemy) => enemy.alive || enemy.deathRemainingMs > 0);
            const waveCleared = wave.enemies.length === 0
              && wave.shots.length === 0
              && (wave.escapedEnemies > 0 || wave.defeatedEnemies > 0);
            if (wave.lives <= 0 || waveCleared) {
              wave.phase = 'complete';
              const difficultyScorePercent = scenario.previewWave.difficultyScorePercent ?? 100;
              wave.settlement = calculateSettlement(wave, difficultyScorePercent);
              wave.events.push({ type: 'wave-settled', settlement: clone(wave.settlement) });
            }
          }
          return observe();
        },
        observe,
        terminalRecord(): GameSettlementRecord | undefined {
          assertOpen();
          if (!wave?.settlement || !scenario.previewWave) return undefined;
          return freezeDeep({
            ...clone(wave.settlement),
            settlementId: `${sessionId}:${scenario.id}:${scenario.previewWave.number}`,
            sessionId,
            scenarioId: scenario.id,
            mode,
            waveNumber: scenario.previewWave.number,
          });
        },
        close(): void {
          if (closed) return;
          closed = true;
          pending.length = 0;
        },
      };

      return Object.freeze(session);
    },
  });
}
