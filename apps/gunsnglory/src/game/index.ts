import {
  GAME_REPLAY_CHECKPOINT_INTERVAL,
  GAME_REPLAY_FORMAT_VERSION,
  GAME_REPLAY_MAX_FRAMES,
  GAME_RULES_VERSION,
  GameReplayError,
  captureReplayState,
  checkpointFrames,
  parseReplay,
  replayStateDigest,
  serializeReplay,
} from './replay';
import type {
  GameReplayFrame,
  GameReplayPayload,
  GameStartRecord,
  ReplayState,
} from './replay';

export { GameReplayError, GAME_RULES_VERSION } from './replay';
export type {
  GameReplayCheckpoint,
  GameReplayDocument,
  GameReplayErrorCode,
  GameReplayFrame,
  GameReplayPayload,
  GameReplayTerminal,
  GameStartRecord,
} from './replay';

export type GameOpenErrorCode = 'scenario-unavailable';

export class GameOpenError extends Error {
  constructor(readonly code: GameOpenErrorCode, message: string) {
    super(message);
    this.name = 'GameOpenError';
  }
}

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
  /** Recovered GameDesignData speed value, applied as fine units per 100 ms. */
  movementSpeedFinePer100Ms: number;
  asset: string;
  frame: Rectangle;
  render: Rectangle;
  hitArea: Rectangle;
  weapon?: UnitWeaponDefinition;
  /** Upgrade rows are indexed by resulting level: entry 0 is level 1. */
  upgradeLevels?: readonly UnitUpgradeDefinition[];
}

export interface UnitUpgradeDefinition {
  price: number;
  movementSpeedFinePer100Ms: number;
  weapon: UnitWeaponDefinition;
}

export interface RecruitableUnitDefinition {
  id: string;
  name: { en: string; zh: string };
  price: number;
  /** Original spawn-building kind: saloon, fort, or tipi. */
  spawnLocationType: 1 | 2 | 3;
}

export type DamageType = 'light' | 'fire' | 'heavy' | 'poison';

export interface UnitWeaponDefinition {
  damage: number;
  damageType: DamageType;
  rangeFine: number;
  reloadTimeMs: number;
  projectileSpeed: number;
  damageStyle: 0;
  specialReloadTimeMs?: number;
  specialReloadFrequency?: number;
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
  /** Original TDM terrain codes, indexed as [row][column]. */
  originalTileGrid?: readonly (readonly number[])[];
  units: readonly ScenarioUnit[];
  /** Maximum upgrade level available in this scene; matches original level data. */
  maxUpgrades?: number;
  recruitableUnits?: readonly RecruitableUnitDefinition[];
  previewWave?: PreviewWaveDefinition;
}

export type GameIntent =
  | { type: 'select-at'; x: number; y: number }
  | { type: 'move-unit'; targetX: number; targetY: number }
  | { type: 'stop-moving' }
  | { type: 'clear-selection' }
  | { type: 'start-wave' }
  | { type: 'recruit-unit'; unitType: string; commandId: string }
  | { type: 'upgrade-unit'; unitId: string; commandId: string };

export interface UnitView extends ScenarioUnit {
  selected: boolean;
  moving: boolean;
  positionFine: { x: number; y: number };
  /** Effective target radius and origin used by Game's strict outer-range check. */
  attackRange?: {
    centerTenthTiles: { x: number; y: number };
    maximumTenthTiles: number;
    boundary: 'exclusive' | 'inclusive';
  };
  upgradeLevel: number;
  nextUpgrade?: UnitUpgradeDefinition;
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
  | { type: 'unit-recruited'; unitType: string; price: number; count: number }
  | { type: 'unit-recruitment-rejected'; unitType: string; reason: 'insufficient-funds'; price: number; availableCash: number }
  | { type: 'unit-upgraded'; unitId: string; level: number; price: number }
  | { type: 'unit-upgrade-rejected'; unitId: string; reason: 'insufficient-funds' | 'upgrade-limit'; price: number; availableCash: number }
  | { type: 'wave-settled'; settlement: WaveSettlement };

export interface RecruitPoolEntry {
  unitType: string;
  name: RecruitableUnitDefinition['name'];
  price: number;
  spawnLocationType: RecruitableUnitDefinition['spawnLocationType'];
  count: number;
}

export interface WaveSettlement {
  outcome: 'victory' | 'defeat';
  scoreBase: number;
  displayScore: number;
  highScoreCandidate: number;
}

export interface RoutePoint {
  x: number;
  y: number;
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
  paused: boolean;
  scenarioId: string;
  map: ScenarioContent['map'];
  /** Read-only route centerline for learning and rendering overlays. */
  route?: readonly RoutePoint[];
  units: readonly UnitView[];
  enemies: readonly EnemyView[];
  shots: readonly ShotView[];
  recruitPool: readonly RecruitPoolEntry[];
  events: readonly GameEvent[];
  wave?: WaveView;
}

export interface GameSession {
  readonly id: string;
  readonly startRecord: Readonly<GameStartRecord>;
  submitIntent(intent: GameIntent): boolean;
  pause(): GameView;
  resume(): GameView;
  /** Advances exactly one ordinary frame while paused, then remains paused. */
  singleStep(input?: { deltaMs?: number }): GameView;
  advance(input?: { deltaMs?: number }): GameView;
  observe(): GameView;
  terminalRecord(): GameSettlementRecord | undefined;
  exportReplay(): Promise<string>;
  close(): void;
}

export interface GameReplayResult {
  session: GameSession;
  sourceStartRecord: Readonly<GameStartRecord>;
  verifiedCheckpointFrames: readonly number[];
}

export interface Game {
  open(options: { scenarioId: string; randomSeed?: number; mode?: GameMode }): Promise<GameSession>;
  replay(serialized: string): Promise<GameReplayResult>;
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
  positionFine: { x: number; y: number };
  movementTargetFine?: { x: number; y: number };
  upgradeLevel: number;
  movementSpeedFinePer100Ms: number;
  weapon?: UnitWeaponDefinition;
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
  recruitPool: Record<string, number>;
  events: GameEvent[];
}

const FINE_UNITS_PER_CELL = 7680;
const FIELD_CENTER_OFFSET = 15360;
const FIELD_CENTER_HALF = 3840;
const UNIT_PLACEMENT_OFFSET_Y = 1920;
const UNIT_COLLIDER_START_X = -2534;
const UNIT_COLLIDER_START_Y = -5376;
const UNIT_COLLIDER_WIDTH = 5068;
const UNIT_COLLIDER_HEIGHT = 4608;
const UNIT_STOP_TOLERANCE_FINE = 2400;
const MAX_DELTA_MS = 100;

const BACKGROUND_BLOCKING_TILES = new Set([
  32, 40, 41, 42, 43, 44, 45, 46, 48,
  52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66,
  80, 81, 110,
]);

const STREET_LAYER_TILES = new Set([
  16, 80, 81, 82, 83, 84, 85, 88, 89, 90, 91, 92, 93, 112, 113, 114, 150,
]);

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

function initialUnitPosition(definition: ScenarioUnit): { x: number; y: number } {
  return {
    x: (definition.cell.x * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF,
    y: (definition.cell.y * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF + UNIT_PLACEMENT_OFFSET_Y,
  };
}

function nextUpgrade(unit: MutableUnit, maxUpgrades: number): UnitUpgradeDefinition | undefined {
  if (unit.upgradeLevel >= maxUpgrades) return undefined;
  return unit.definition.upgradeLevels?.[unit.upgradeLevel];
}

function unitView(unit: MutableUnit, maxUpgrades: number): UnitView {
  const { definition, positionFine } = unit;
  const upgrade = nextUpgrade(unit, maxUpgrades);
  const offsetX = (positionFine.x - initialUnitPosition(definition).x) / FINE_UNITS_PER_CELL;
  const offsetY = (positionFine.y - initialUnitPosition(definition).y) / FINE_UNITS_PER_CELL;
  const render = { ...definition.render, x: definition.render.x + offsetX, y: definition.render.y + offsetY };
  const hitArea = { ...definition.hitArea, x: definition.hitArea.x + offsetX, y: definition.hitArea.y + offsetY };

  return {
    ...clone(definition),
    movementSpeedFinePer100Ms: unit.movementSpeedFinePer100Ms,
    ...(unit.weapon ? { weapon: clone(unit.weapon) } : { weapon: undefined }),
    cell: {
      x: Math.floor(positionFine.x / FINE_UNITS_PER_CELL),
      y: Math.floor((positionFine.y - FIELD_CENTER_HALF) / FINE_UNITS_PER_CELL),
    },
    render,
    hitArea,
    selected: unit.selected,
    moving: unit.movementTargetFine !== undefined,
    positionFine: { ...positionFine },
    ...(unit.weapon ? {
      attackRange: {
        centerTenthTiles: unitAttackCenterTenthTiles(unit),
        maximumTenthTiles: weaponRangeTenthTiles(unit.weapon),
        boundary: 'exclusive' as const,
      },
    } : {}),
    upgradeLevel: unit.upgradeLevel,
    ...(upgrade ? { nextUpgrade: clone(upgrade) } : {}),
  };
}

function isBackgroundCollisionCode(code: number): boolean {
  return (code >= 12 && code <= 14)
    || (code >= 20 && code <= 23)
    || (code >= 48 && code <= 75)
    || code === 96;
}

function backgroundCollisionCode(rawTile: number, grid: ScenarioContent['originalTileGrid'], x: number, y: number): number {
  if (rawTile >= 120 && rawTile <= 126) return 96;
  if (BACKGROUND_BLOCKING_TILES.has(rawTile)) return 48;
  if (rawTile === 88 || rawTile === 89) {
    const above = y > 0 ? grid?.[y - 1]?.[x] : undefined;
    return above === 88 || above === 89 ? 48 : 0;
  }
  return rawTile === 160 ? 160 : 0;
}

function terrainBlocksUnit(scenario: ScenarioContent, fineX: number, fineY: number): boolean {
  const grid = scenario.originalTileGrid;
  const width = scenario.map.width;
  const height = scenario.map.height;
  const corners = [
    { x: fineX + UNIT_COLLIDER_START_X, y: fineY + UNIT_COLLIDER_START_Y },
    { x: fineX + UNIT_COLLIDER_START_X + UNIT_COLLIDER_WIDTH, y: fineY + UNIT_COLLIDER_START_Y + UNIT_COLLIDER_HEIGHT },
    { x: fineX + UNIT_COLLIDER_START_X, y: fineY + UNIT_COLLIDER_START_Y + UNIT_COLLIDER_HEIGHT },
    { x: fineX + UNIT_COLLIDER_START_X + UNIT_COLLIDER_WIDTH, y: fineY + UNIT_COLLIDER_START_Y },
  ];

  for (const corner of corners) {
    if (corner.x < 0 || corner.y < 0) return true;
    const x = Math.floor(corner.x / FINE_UNITS_PER_CELL);
    const y = Math.floor(corner.y / FINE_UNITS_PER_CELL);
    if (x >= width || y >= height) return true;
    if (!grid) continue;
    const rawTile = grid[y]?.[x];
    if (rawTile === undefined) return true;
    const streetLayerCode = STREET_LAYER_TILES.has(rawTile) ? 16 : 0;
    if (isBackgroundCollisionCode(backgroundCollisionCode(rawTile, grid, x, y)) && streetLayerCode === 0) return true;
  }

  return false;
}

function moveUnit(unit: MutableUnit, scenario: ScenarioContent, deltaMs: number): void {
  const target = unit.movementTargetFine;
  if (!target || deltaMs === 0) return;

  const dx = target.x - unit.positionFine.x;
  const dy = target.y - unit.positionFine.y;
  if (Math.abs(dx) < UNIT_STOP_TOLERANCE_FINE && Math.abs(dy) < UNIT_STOP_TOLERANCE_FINE) {
    unit.movementTargetFine = undefined;
    return;
  }

  const distance = Math.hypot(dx, dy);
  const speed = unit.movementSpeedFinePer100Ms;
  const directionX = Math.round((dx / distance) * speed);
  const directionY = Math.round((dy / distance) * speed);
  const moveX = Math.trunc((directionX * deltaMs) / 100);
  const moveY = Math.trunc((directionY * deltaMs) / 100);
  const nextX = unit.positionFine.x + moveX;
  const nextY = unit.positionFine.y + moveY;

  if (moveX !== 0 && !terrainBlocksUnit(scenario, nextX, unit.positionFine.y)) {
    unit.positionFine.x = nextX;
  }
  if (moveY !== 0 && !terrainBlocksUnit(scenario, unit.positionFine.x, nextY)) {
    unit.positionFine.y = nextY;
  }
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

function unitEnemyDistanceSquare(unit: MutableUnit, enemy: MutableEnemy): number {
  const unitCenter = unitAttackCenterTenthTiles(unit);
  const enemyX = tenthTileCoordinate(enemy.positionFine.x);
  const enemyY = tenthTileCoordinate(enemy.positionFine.y);
  const dx = unitCenter.x - enemyX;
  const dy = unitCenter.y - enemyY;
  return (dx * dx) + (dy * dy);
}

function unitAttackCenterTenthTiles(unit: MutableUnit): { x: number; y: number } {
  return {
    x: tenthTileCoordinate(unit.positionFine.x),
    y: tenthTileCoordinate(unit.positionFine.y - FIELD_CENTER_HALF),
  };
}

function weaponRangeTenthTiles(weapon: UnitWeaponDefinition): number {
  return Math.trunc((weapon.rangeFine * 10) / FINE_UNITS_PER_CELL);
}

function maxWeaponSquareRange(weapon: UnitWeaponDefinition): number {
  const rangeInTenthTiles = weaponRangeTenthTiles(weapon);
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

function selectTarget(unit: MutableUnit, enemies: readonly MutableEnemy[]): MutableEnemy | undefined {
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

  const openSession: Game['open'] = async ({ scenarioId, randomSeed, mode = 'debug' }) => {
      const scenario = scenarios.get(scenarioId);
      if (!scenario) throw new GameOpenError('scenario-unavailable', 'Unknown scenario: ' + scenarioId);
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
        positionFine: initialUnitPosition(definition),
        upgradeLevel: 0,
        movementSpeedFinePer100Ms: definition.movementSpeedFinePer100Ms,
        ...(definition.weapon ? { weapon: clone(definition.weapon) } : {}),
        weaponCooldownMs: definition.weapon ? Math.trunc(definition.weapon.reloadTimeMs / 2) : 0,
      }));
      const recruitableUnits = new Map((scenario.recruitableUnits ?? []).map((definition) => [definition.id, definition]));
      const recruitmentCommands = new Map<string, string>();
      const upgradeCommands = new Map<string, string>();
      const recordedFrames: GameReplayFrame[] = [];
      const replayStates = new Map<number, ReplayState>();
      const pending: PendingIntent[] = [];
      let nextIntentSequence = 1;
      let nextShotNumber = 1;
      let frame = 0;
      let elapsedMs = 0;
      let closed = false;
      let paused = false;
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
          recruitPool: {},
          events: [],
        }
        : undefined;

      const assertOpen = () => {
        if (closed) throw new Error('Game session is closed');
      };

      const route: RoutePoint[] | undefined = scenario.previewWave ? [
        {
          x: scenario.previewWave.spawn.cell.x - 1.5,
          y: scenario.previewWave.spawn.cell.y + 0.5,
        },
        ...scenario.previewWave.redirects.map(({ cell }) => ({ x: cell.x + 0.5, y: cell.y + 0.5 })),
        { x: scenario.previewWave.exit.x + 0.5, y: scenario.previewWave.exit.y + 0.5 },
      ] : undefined;

      const observe = (): GameView => {
        assertOpen();
        return freezeDeep({
          frame,
          elapsedMs,
          paused,
          scenarioId: scenario.id,
          map: scenario.map,
          ...(route ? { route } : {}),
          units: units.map((unit) => unitView(unit, scenario.maxUpgrades ?? 0)),
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
          recruitPool: (scenario.recruitableUnits ?? []).map((definition) => ({
            unitType: definition.id,
            name: clone(definition.name),
            price: definition.price,
            spawnLocationType: definition.spawnLocationType,
            count: wave?.recruitPool[definition.id] ?? 0,
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
          rulesVersion: GAME_RULES_VERSION,
          randomAlgorithm: 'java.util.Random',
          randomSeed: resolvedSeed,
          mode,
        }),
        pause(): GameView {
          assertOpen();
          paused = true;
          return observe();
        },
        resume(): GameView {
          assertOpen();
          paused = false;
          return observe();
        },
        singleStep(input: { deltaMs?: number } = {}): GameView {
          assertOpen();
          if (!paused) throw new Error('Game session must be paused before single-stepping');
          if (wave?.settlement) throw new Error('A settled game session cannot be single-stepped');
          paused = false;
          try {
            session.advance(input);
          } finally {
            paused = true;
          }
          return observe();
        },
        submitIntent(intent: GameIntent): boolean {
          assertOpen();
          if (paused || !intent || typeof intent !== 'object') return false;
          if (wave?.settlement) return false;

          if (intent.type === 'clear-selection') {
            pending.push({ sequence: nextIntentSequence, intent: { type: 'clear-selection' } });
            nextIntentSequence += 1;
            return true;
          }

          if (intent.type === 'stop-moving') {
            pending.push({ sequence: nextIntentSequence, intent: { type: 'stop-moving' } });
            nextIntentSequence += 1;
            return true;
          }

          if (intent.type === 'start-wave') {
            if (!wave || !scenario.previewWave || wave.phase !== 'not-started') return false;
            pending.push({ sequence: nextIntentSequence, intent: { type: 'start-wave' } });
            nextIntentSequence += 1;
            return true;
          }

          if (intent.type === 'recruit-unit') {
            if (!wave || typeof intent.unitType !== 'string' || typeof intent.commandId !== 'string'
              || !intent.commandId.trim() || intent.commandId.length > 128) return false;
            const definition = recruitableUnits.get(intent.unitType);
            if (!definition || !Number.isSafeInteger(definition.price) || definition.price < 0) return false;
            const existingUnitType = recruitmentCommands.get(intent.commandId);
            if (existingUnitType !== undefined) return existingUnitType === intent.unitType;
            recruitmentCommands.set(intent.commandId, intent.unitType);
            pending.push({
              sequence: nextIntentSequence,
              intent: { type: 'recruit-unit', unitType: intent.unitType, commandId: intent.commandId },
            });
            nextIntentSequence += 1;
            return true;
          }

          if (intent.type === 'upgrade-unit') {
            if (!wave || typeof intent.unitId !== 'string' || typeof intent.commandId !== 'string'
              || !intent.commandId.trim() || intent.commandId.length > 128) return false;
            const unit = units.find((candidate) => candidate.definition.id === intent.unitId);
            if (!unit) return false;
            const existingUnitId = upgradeCommands.get(intent.commandId);
            if (existingUnitId !== undefined) return existingUnitId === intent.unitId;
            const upgrade = nextUpgrade(unit, scenario.maxUpgrades ?? 0);
            if (!unit.selected || !upgrade || !Number.isSafeInteger(upgrade.price) || upgrade.price < 0) return false;
            upgradeCommands.set(intent.commandId, intent.unitId);
            pending.push({
              sequence: nextIntentSequence,
              intent: { type: 'upgrade-unit', unitId: intent.unitId, commandId: intent.commandId },
            });
            nextIntentSequence += 1;
            return true;
          }

          if (intent.type === 'move-unit') {
            if (!Number.isFinite(intent.targetX) || !Number.isFinite(intent.targetY)
              || !units.some((unit) => unit.selected && unit.movementSpeedFinePer100Ms > 0)) return false;
            pending.push({
              sequence: nextIntentSequence,
              intent: { type: 'move-unit', targetX: intent.targetX, targetY: intent.targetY },
            });
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
          if (paused) return observe();
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
          const frameCommands = pending.splice(0);
          for (const command of frameCommands) {
            if (command.intent.type === 'clear-selection') {
              for (const unit of units) {
                unit.selected = false;
                unit.movementTargetFine = undefined;
              }
              continue;
            }

            if (command.intent.type === 'stop-moving') {
              for (const unit of units) unit.movementTargetFine = undefined;
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

            if (command.intent.type === 'recruit-unit') {
              const recruitable = recruitableUnits.get(command.intent.unitType);
              if (!wave || !recruitable) continue;
              if (wave.cash < recruitable.price) {
                wave.events.push({
                  type: 'unit-recruitment-rejected',
                  unitType: recruitable.id,
                  reason: 'insufficient-funds',
                  price: recruitable.price,
                  availableCash: wave.cash,
                });
                continue;
              }
              wave.cash -= recruitable.price;
              wave.recruitPool[recruitable.id] = (wave.recruitPool[recruitable.id] ?? 0) + 1;
              wave.events.push({
                type: 'unit-recruited',
                unitType: recruitable.id,
                price: recruitable.price,
                count: wave.recruitPool[recruitable.id],
              });
              continue;
            }

            if (command.intent.type === 'upgrade-unit') {
              const unitId = command.intent.unitId;
              const unit = units.find((candidate) => candidate.definition.id === unitId);
              if (!wave || !unit || !unit.selected) continue;
              const upgrade = nextUpgrade(unit, scenario.maxUpgrades ?? 0);
              if (!upgrade) {
                wave.events.push({
                  type: 'unit-upgrade-rejected',
                  unitId: unit.definition.id,
                  reason: 'upgrade-limit',
                  price: 0,
                  availableCash: wave.cash,
                });
                continue;
              }
              if (wave.cash < upgrade.price) {
                wave.events.push({
                  type: 'unit-upgrade-rejected',
                  unitId: unit.definition.id,
                  reason: 'insufficient-funds',
                  price: upgrade.price,
                  availableCash: wave.cash,
                });
                continue;
              }
              wave.cash -= upgrade.price;
              unit.upgradeLevel += 1;
              unit.movementSpeedFinePer100Ms = upgrade.movementSpeedFinePer100Ms;
              unit.weapon = clone(upgrade.weapon);
              unit.weaponCooldownMs = Math.trunc(upgrade.weapon.reloadTimeMs / 2);
              wave.events.push({
                type: 'unit-upgraded',
                unitId: unit.definition.id,
                level: unit.upgradeLevel,
                price: upgrade.price,
              });
              continue;
            }

            if (command.intent.type === 'move-unit') {
              const selectedUnit = units.find((unit) => unit.selected);
              if (selectedUnit) {
                selectedUnit.movementTargetFine = {
                  x: Math.round(Math.max(-0.5, Math.min(scenario.map.width + 0.5, command.intent.targetX)) * FINE_UNITS_PER_CELL),
                  y: Math.round(Math.max(-0.5, Math.min(scenario.map.height + 0.5, command.intent.targetY)) * FINE_UNITS_PER_CELL),
                };
              }
              continue;
            }

            const selection = command.intent;
            if (selection.type !== 'select-at') continue;
            const target = [...units].reverse().find((unit) => {
              const current = unitView(unit, scenario.maxUpgrades ?? 0);
              return contains(current.hitArea, selection.x, selection.y);
            });
            for (const unit of units) {
              unit.selected = unit === target;
              unit.movementTargetFine = undefined;
            }
          }

          for (const unit of units) moveUnit(unit, scenario, deltaMs);

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
              const weapon = unit.weapon;
              if (!weapon) continue;
              if (unit.weaponCooldownMs > 0) unit.weaponCooldownMs = Math.trunc(unit.weaponCooldownMs - deltaMs);
              if (unit.weaponCooldownMs > 0) continue;

              const target = selectTarget(unit, wave.enemies);
              if (!target) continue;
              const distanceSquare = unitEnemyDistanceSquare(unit, target);
              const maxSquareRange = maxWeaponSquareRange(weapon);
              const startFine = {
                x: unit.positionFine.x,
                y: unit.positionFine.y - FIELD_CENTER_HALF,
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
              for (const unit of units) unit.movementTargetFine = undefined;
              wave.phase = 'complete';
              const difficultyScorePercent = scenario.previewWave.difficultyScorePercent ?? 100;
              wave.settlement = calculateSettlement(wave, difficultyScorePercent);
              wave.events.push({ type: 'wave-settled', settlement: clone(wave.settlement) });
            }
          }
          const nextView = observe();
          recordedFrames.push({
            frame,
            deltaMs,
            intents: frameCommands.map(({ intent }) => clone(intent)),
          });
          if (frame % GAME_REPLAY_CHECKPOINT_INTERVAL === 0 || nextView.wave?.settlement) {
            replayStates.set(frame, captureReplayState(nextView));
          }
          return nextView;
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
        async exportReplay(): Promise<string> {
          assertOpen();
          if (mode === 'replay') {
            throw new GameReplayError('unsupported-mode', 'A replay session cannot be exported as a source recording');
          }
          if (scenario.contentVersion === undefined || !scenario.contentVersion.trim()
            || scenario.contentVersion === 'unversioned' || !session.terminalRecord()) {
            throw new GameReplayError('incomplete-recording', 'A versioned, settled session is required to export a replay');
          }
          const view = observe();
          const settlement = view.wave?.settlement;
          if (!settlement || recordedFrames.length === 0 || recordedFrames.at(-1)?.frame !== view.frame) {
            throw new GameReplayError('incomplete-recording', 'Replay recording does not contain a terminal frame');
          }
          if (recordedFrames.length > GAME_REPLAY_MAX_FRAMES) {
            throw new GameReplayError('recording-too-large', 'Replay frame count exceeds the supported limit');
          }
          const checkpoints = [];
          for (const checkpointFrame of checkpointFrames(recordedFrames.length)) {
            const state = replayStates.get(checkpointFrame);
            if (!state) throw new GameReplayError('incomplete-recording', `Replay checkpoint ${checkpointFrame} is missing`);
            checkpoints.push({ frame: checkpointFrame, stateDigest: await replayStateDigest(state) });
          }
          const terminalCheckpoint = checkpoints.at(-1);
          if (!terminalCheckpoint) throw new GameReplayError('incomplete-recording', 'Replay terminal checkpoint is missing');
          const payload: GameReplayPayload = {
            formatVersion: GAME_REPLAY_FORMAT_VERSION,
            rulesVersion: GAME_RULES_VERSION,
            startRecord: session.startRecord,
            frames: recordedFrames,
            checkpoints,
            terminal: {
              frame: view.frame,
              settlement,
              stateDigest: terminalCheckpoint.stateDigest,
            },
          };
          return serializeReplay(payload);
        },
      };

      replayStates.set(0, captureReplayState(observe()));
      return Object.freeze(session);
  };

  return Object.freeze({
    open: openSession,
    async replay(serialized: string): Promise<GameReplayResult> {
      const record = await parseReplay(serialized);
      const scenario = scenarios.get(record.startRecord.scenarioId);
      if (!scenario || scenario.contentVersion !== record.startRecord.contentVersion) {
        throw new GameReplayError('content-unavailable', 'The exact replay content version is not available');
      }

      const session = await openSession({
        scenarioId: record.startRecord.scenarioId,
        randomSeed: record.startRecord.randomSeed,
        mode: 'replay',
      });
      const verifiedCheckpointFrames: number[] = [];
      try {
        const expectedCheckpoints = new Map(record.checkpoints.map((checkpoint) => [checkpoint.frame, checkpoint.stateDigest]));
        const verifyCheckpoint = async (view: GameView): Promise<void> => {
          const expectedDigest = expectedCheckpoints.get(view.frame);
          if (expectedDigest === undefined) return;
          const actualDigest = await replayStateDigest(captureReplayState(view));
          if (actualDigest !== expectedDigest) {
            throw new GameReplayError('result-mismatch', `Replay state differs at frame ${view.frame}`, view.frame);
          }
          verifiedCheckpointFrames.push(view.frame);
        };

        await verifyCheckpoint(session.observe());
        for (const frame of record.frames) {
          for (const intent of frame.intents) {
            if (!session.submitIntent(intent)) {
              throw new GameReplayError('corrupt-input', `Replay command is not accepted at frame ${frame.frame}`, frame.frame);
            }
          }
          const view = session.advance({ deltaMs: frame.deltaMs });
          if (view.frame !== frame.frame) {
            throw new GameReplayError('result-mismatch', `Replay frame sequence differs at frame ${frame.frame}`, frame.frame);
          }
          await verifyCheckpoint(view);
        }

        const finalView = session.observe();
        const settlement = finalView.wave?.settlement;
        if (!settlement
          || settlement.outcome !== record.terminal.settlement.outcome
          || settlement.scoreBase !== record.terminal.settlement.scoreBase
          || settlement.displayScore !== record.terminal.settlement.displayScore
          || settlement.highScoreCandidate !== record.terminal.settlement.highScoreCandidate) {
          throw new GameReplayError('result-mismatch', 'Replay terminal settlement does not match the recording', finalView.frame);
        }
        return {
          session,
          sourceStartRecord: freezeDeep(clone(record.startRecord)),
          verifiedCheckpointFrames: freezeDeep(verifiedCheckpointFrames),
        };
      } catch (error) {
        session.close();
        throw error;
      }
    },
  });
}
