import {
  GAME_REPLAY_CHECKPOINT_INTERVAL,
  GAME_REPLAY_FORMAT_VERSION,
  GAME_REPLAY_MAX_FRAMES,
  GAME_RULES_VERSION,
  GameReplayError,
  gameValueDigest,
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
  NumericParameterValue,
  PreparedSetup,
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
  NumericParameterValue,
  PreparedSetup,
} from './replay';

export type GameOpenErrorCode =
  | 'scenario-unavailable'
  | 'content-version-unavailable'
  | 'difficulty-unavailable'
  | 'rules-version-unsupported'
  | 'prepared-setup-invalid'
  | 'prepared-setup-mismatch';

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
  /** Original map-object activity: 4 is sleeping, 5 is active. */
  activity?: 4 | 5;
  type: string;
  /** Price for activating this existing activity-4 map object. */
  hirePrice?: number;
  /** Sprite atlas used after this existing map object is hired. */
  awakeAsset?: string;
  awakeFrame?: Rectangle;
  awakeRender?: Rectangle;
  awakeHitArea?: Rectangle;
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

export type GameDifficulty = 'easy' | 'medium' | 'hard';

export const GAME_DIFFICULTY_SCORE_PERCENT: Readonly<Record<GameDifficulty, number>> = Object.freeze({
  easy: 75,
  medium: 100,
  hard: 150,
});

export function isGameDifficulty(value: unknown): value is GameDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

export interface UnitWeaponDefinition {
  damage: number;
  damageType: DamageType;
  rangeFine: number;
  reloadTimeMs: number;
  projectileSpeed: number;
  damageStyle: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Original GameDesignData AOE radius in fine units; absent or zero means single-target damage. */
  areaDamageFine?: number;
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
  /** Original level-specific enemy HP multipliers indexed by selected difficulty. */
  enemyHitPointMultiplierPercentByDifficulty?: Readonly<Record<GameDifficulty, number>>;
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

export interface CampaignSpawnPoolDefinition {
  spawnPointId: number;
  intervalMs: number;
  /** Remaining request counts for original pool types 2 through 11, in order. */
  requests: readonly number[];
}

export interface CampaignWaveDefinition {
  number: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly CampaignSpawnPoolDefinition[];
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
  /** Available original campaign waves; the total may exceed this partial implementation. */
  campaignWaveCount?: number;
  campaignWaves?: readonly CampaignWaveDefinition[];
  /** Base type-1 settler data before level, wave, and dynamic-difficulty multipliers. */
  campaignEnemy?: PreviewEnemyDefinition;
}

export type GameIntent =
  | { type: 'select-at'; x: number; y: number }
  | { type: 'move-unit'; targetX: number; targetY: number }
  | { type: 'stop-moving' }
  | { type: 'clear-selection' }
  | { type: 'start-wave' }
  | { type: 'recruit-unit'; unitType: string; commandId: string }
  | { type: 'hire-map-unit'; unitId: string; commandId: string }
  | { type: 'upgrade-unit'; unitId: string; commandId: string };

export interface UnitView extends ScenarioUnit {
  sleepingAnimationFrame?: number;
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
  shootingAnimation?: {
    asset: 'player_gunslinger_shot' | 'player_mexican_shot';
    frame: number;
    row: number;
    mirrored: boolean;
  };
}

export interface EnemyView {
  id: string;
  type: 1 | 2;
  asset: 'pioneer_male' | 'pioneer_female';
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
  damageStyle: UnitWeaponDefinition['damageStyle'];
  imageAsset?: 'sfx_mexican_dynamite';
  animationFrame: number;
  explosionRemainingMs?: number;
}

export type GameEvent =
  | { type: 'enemy-group-spawned'; enemyIds: readonly string[]; waveNumber: number; spawnPointId: number; requestType: number; groupSize: number }
  | { type: 'enemy-hit'; enemyId: string; damage: number; hitPoints: number }
  | { type: 'enemy-defeated'; enemyId: string; cashReward: number }
  | { type: 'unit-fired'; unitId: string; targetId: string; specialReload: boolean }
  | { type: 'sound-requested'; sound: 'sound_revolver' | 'sound_dynamite' | 'sound_desperado_yihaa' | 'sound_mexican_arriba' }
  | { type: 'shot-exploded'; shotId: string; targetId: string; affectedEnemyIds: readonly string[] }
  | { type: 'wave-cleared'; waveNumber: number; escapedEnemies: number; defeatedEnemies: number }
  | { type: 'unit-recruited'; unitType: string; price: number; count: number }
  | { type: 'unit-recruitment-rejected'; unitType: string; reason: 'insufficient-funds'; price: number; availableCash: number }
  | { type: 'map-unit-hired'; unitId: string; unitType: string; price: number }
  | { type: 'map-unit-hire-rejected'; unitId: string; unitType: string; reason: 'insufficient-funds'; price: number; availableCash: number }
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
  totalWaves?: number;
  phase: 'not-started' | 'active' | 'complete';
  lives: number;
  escapedEnemies: number;
  defeatedEnemies: number;
  cash: number;
  activeEnemies: number;
  pendingSpawnRequests?: number;
  dynamicDifficulty?: number;
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
  prepare(options: { scenarioId: string; overrides?: readonly NumericParameterValue[] }): Promise<PreparedSetup>;
  open(options: {
    scenarioId: string;
    /** Exact requested scenario content version. An unavailable version never falls back. */
    contentVersion?: string;
    randomSeed?: number;
    difficulty?: GameDifficulty;
    mode?: GameMode;
    preparedSetup?: PreparedSetup;
  }): Promise<GameSession>;
  replay(serialized: string): Promise<GameReplayResult>;
}

interface PendingIntent {
  sequence: number;
  intent: GameIntent;
}

interface MutableEnemy {
  id: string;
  type: 1 | 2;
  asset: 'pioneer_male' | 'pioneer_female';
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
  animationDistance: number;
  animationFrame: number;
  despawnOnNextFieldCounter: number;
}

interface MutableShot {
  id: string;
  shooterId: string;
  targetId: string;
  damage: number;
  damageType: DamageType;
  damageStyle: UnitWeaponDefinition['damageStyle'];
  areaDamageFine: number;
  imageAsset: ShotView['imageAsset'];
  animationFrame: number;
  startFine: { x: number; y: number };
  positionFine: { x: number; y: number };
  totalTravelTimeMs: number;
  remainingMs: number;
  impactResolved: boolean;
  explosionRemainingMs: number;
}

interface MutableCampaignSpawnPool {
  spawnPointId: number;
  intervalMs: number;
  delayMs: number;
  requests: number[];
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
  shotsUntilSpecialReload: number;
  shootingAnimationElapsedMs?: number;
  shootingDirection?: { x: -1 | 0 | 1; y: -1 | 0 | 1 };
}

interface MutableWave {
  number: number;
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
  campaignSpawnPools?: MutableCampaignSpawnPool[];
  dynamicDifficulty?: number;
  difficultyValue?: number;
  difficultyValueCounter?: number;
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

interface NumericParameterBinding {
  read(): number;
  write(value: number): void;
}

const WEAPON_NUMERIC_PARAMETERS = [
  'damage',
  'rangeFine',
  'reloadTimeMs',
  'projectileSpeed',
  'areaDamageFine',
  'specialReloadTimeMs',
  'specialReloadFrequency',
] as const;

function numericParameterBindings(scenario: ScenarioContent): Map<string, NumericParameterBinding> {
  const bindings = new Map<string, NumericParameterBinding>();
  const add = (path: string, read: () => number, write: (value: number) => void): void => {
    if (bindings.has(path)) throw new TypeError('Duplicate numeric parameter path: ' + path);
    bindings.set(path, { read, write });
  };
  const addWeapon = (path: string, weapon: UnitWeaponDefinition): void => {
    for (const key of WEAPON_NUMERIC_PARAMETERS) {
      if (weapon[key] === undefined) continue;
      add(path + '/' + key, () => weapon[key]!, (value) => { weapon[key] = value; });
    }
  };

  add('maxUpgrades', () => scenario.maxUpgrades ?? 0, (value) => { scenario.maxUpgrades = value; });
  for (const unit of scenario.units) {
    const path = 'units/' + encodeURIComponent(unit.id);
    add(path + '/movementSpeedFinePer100Ms',
      () => unit.movementSpeedFinePer100Ms,
      (value) => { unit.movementSpeedFinePer100Ms = value; });
    if (unit.weapon) addWeapon(path + '/weapon', unit.weapon);
    for (const [index, upgrade] of (unit.upgradeLevels ?? []).entries()) {
      const upgradePath = path + '/upgradeLevels/' + index;
      add(upgradePath + '/price', () => upgrade.price, (value) => { upgrade.price = value; });
      add(upgradePath + '/movementSpeedFinePer100Ms',
        () => upgrade.movementSpeedFinePer100Ms,
        (value) => { upgrade.movementSpeedFinePer100Ms = value; });
      addWeapon(upgradePath + '/weapon', upgrade.weapon);
    }
  }
  for (const recruitable of scenario.recruitableUnits ?? []) {
    const path = 'recruitableUnits/' + encodeURIComponent(recruitable.id);
    add(path + '/price', () => recruitable.price, (value) => { recruitable.price = value; });
  }
  const wave = scenario.previewWave;
  if (wave) {
    add('previewWave/initialLives', () => wave.initialLives, (value) => { wave.initialLives = value; });
    add('previewWave/initialCash', () => wave.initialCash ?? 0, (value) => { wave.initialCash = value; });
    add('previewWave/difficultyScorePercent',
      () => wave.difficultyScorePercent ?? 100,
      (value) => { wave.difficultyScorePercent = value; });
    if (wave.enemy) {
      add('previewWave/enemy/hitPoints', () => wave.enemy!.hitPoints, (value) => { wave.enemy!.hitPoints = value; });
      add('previewWave/enemy/cashReward', () => wave.enemy!.cashReward, (value) => { wave.enemy!.cashReward = value; });
      for (const type of ['light', 'fire', 'heavy', 'poison'] as const) {
        add('previewWave/enemy/penetration/' + type,
          () => wave.enemy!.penetration[type],
          (value) => { (wave.enemy!.penetration as Record<DamageType, number>)[type] = value; });
      }
    }
    add('previewWave/baseEnemySpeed', () => wave.baseEnemySpeed, (value) => { wave.baseEnemySpeed = value; });
    add('previewWave/speedMultiplierMin', () => wave.speedMultiplierMin, (value) => { wave.speedMultiplierMin = value; });
    add('previewWave/speedMultiplierCount', () => wave.speedMultiplierCount, (value) => { wave.speedMultiplierCount = value; });
    add('previewWave/escapePenalty', () => wave.escapePenalty, (value) => { wave.escapePenalty = value; });
  }
  return bindings;
}

const MAX_NUMERIC_PARAMETER_VALUE = 1_000_000_000;

function validNumericParameter(path: string, value: unknown): value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > MAX_NUMERIC_PARAMETER_VALUE) {
    return false;
  }
  return ![
    'previewWave/initialLives',
    'previewWave/enemy/hitPoints',
    'previewWave/speedMultiplierCount',
  ].includes(path) || (value as number) >= 1;
}

function sortedParameters(bindings: Map<string, NumericParameterBinding>): NumericParameterValue[] {
  return [...bindings.entries()]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([path, binding]) => ({ path, value: binding.read() }));
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

function unitRenderOffsetAt(definition: ScenarioUnit, positionFine: { x: number; y: number }): { x: number; y: number } {
  const initialPosition = initialUnitPosition(definition);
  return {
    x: (positionFine.x - initialPosition.x) / FINE_UNITS_PER_CELL,
    y: (positionFine.y - initialPosition.y) / FINE_UNITS_PER_CELL,
  };
}

function nextUpgrade(unit: MutableUnit, maxUpgrades: number): UnitUpgradeDefinition | undefined {
  if (unit.upgradeLevel >= maxUpgrades) return undefined;
  return unit.definition.upgradeLevels?.[unit.upgradeLevel];
}

function unitView(unit: MutableUnit, maxUpgrades: number, elapsedMs: number): UnitView {
  const { definition, positionFine } = unit;
  const upgrade = nextUpgrade(unit, maxUpgrades);
  const shootingAnimation = shootingAnimationView(unit);
  const { x: offsetX, y: offsetY } = unitRenderOffsetAt(definition, positionFine);
  const render = { ...definition.render, x: definition.render.x + offsetX, y: definition.render.y + offsetY };
  const hitArea = { ...definition.hitArea, x: definition.hitArea.x + offsetX, y: definition.hitArea.y + offsetY };

  return {
    ...clone(definition),
    ...(definition.activity === 4 ? { sleepingAnimationFrame: Math.floor(elapsedMs / 200) % 3 } : {}),
    movementSpeedFinePer100Ms: unit.movementSpeedFinePer100Ms,
    ...(unit.weapon ? { weapon: clone(unit.weapon) } : {}),
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
    ...(shootingAnimation ? { shootingAnimation } : {}),
    ...(upgrade ? { nextUpgrade: clone(upgrade) } : {}),
  };
}

function shootingAnimationView(unit: MutableUnit): UnitView['shootingAnimation'] {
  const elapsedMs = unit.shootingAnimationElapsedMs;
  const direction = unit.shootingDirection;
  if (elapsedMs === undefined || !direction) return undefined;

  const animation = unit.definition.type === 'gunslinger'
    ? { asset: 'player_gunslinger_shot' as const, frames: [[0, 100], [1, 200], [0, 1000]] as const }
    : unit.definition.type === 'mexican'
      ? { asset: 'player_mexican_shot' as const, frames: [[0, 200], [1, 400]] as const }
      : undefined;
  if (!animation) return undefined;

  const frame = animation.frames.find(([, endMs]) => elapsedMs <= endMs)?.[0];
  if (frame === undefined) return undefined;

  let row: number;
  if (direction.y < 0 && direction.x === 0) row = 4;
  else if (direction.y > 0 && direction.x === 0) row = 3;
  else if (direction.y < 0) row = 2;
  else if (direction.y > 0) row = 0;
  else row = 1;

  return { asset: animation.asset, frame, row, mirrored: direction.x > 0 };
}

function advanceShootingAnimation(unit: MutableUnit, deltaMs: number): void {
  if (unit.shootingAnimationElapsedMs === undefined) return;
  if (unit.movementTargetFine) {
    unit.shootingAnimationElapsedMs = undefined;
    unit.shootingDirection = undefined;
    return;
  }
  unit.shootingAnimationElapsedMs = Math.trunc(unit.shootingAnimationElapsedMs + deltaMs);
  const maximumDuration = unit.definition.type === 'gunslinger' ? 1000 : 400;
  if (unit.shootingAnimationElapsedMs > maximumDuration) {
    unit.shootingAnimationElapsedMs = undefined;
    unit.shootingDirection = undefined;
  }
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

function unitSpriteWithinMap(unit: MutableUnit, scenario: ScenarioContent, fineX: number, fineY: number): boolean {
  const { x: renderOffsetX, y: renderOffsetY } = unitRenderOffsetAt(unit.definition, { x: fineX, y: fineY });
  const render = unit.definition.render;
  const left = render.x + renderOffsetX;
  const top = render.y + renderOffsetY;

  return left >= 0
    && top >= 0
    && left + render.width <= scenario.map.width
    && top + render.height <= scenario.map.height;
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

  if (moveX !== 0
    && unitSpriteWithinMap(unit, scenario, nextX, unit.positionFine.y)
    && !terrainBlocksUnit(scenario, nextX, unit.positionFine.y)) {
    unit.positionFine.x = nextX;
  }
  if (moveY !== 0
    && unitSpriteWithinMap(unit, scenario, unit.positionFine.x, nextY)
    && !terrainBlocksUnit(scenario, unit.positionFine.x, nextY)) {
    unit.positionFine.y = nextY;
  }
}

function validSeed(seed: number): boolean {
  return Number.isInteger(seed) && seed >= 0 && seed <= 0xffff_ffff;
}

function calculateSettlement(
  wave: MutableWave,
  difficultyScorePercent: number,
  outcome: WaveSettlement['outcome'] = wave.lives <= 0 ? 'defeat' : 'victory',
): WaveSettlement {
  // The original game keeps both the score base and saved high score in Java int arithmetic.
  const scoreBase = Math.imul(1, wave.cashMade + wave.cash);
  const displayMultiplier = Math.fround(difficultyScorePercent / 100);
  const displayScore = Math.round(Math.fround(Math.fround(scoreBase) * displayMultiplier));
  const highScoreCandidate = Math.trunc(Math.imul(scoreBase, difficultyScorePercent) / 100);

  return {
    outcome,
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
    animationDistance: 0,
    animationFrame: 0,
    despawnOnNextFieldCounter: 0,
  };
}

function campaignSpawnPools(definition: CampaignWaveDefinition, dynamicDifficulty: number, scale: boolean): MutableCampaignSpawnPool[] {
  return definition.spawnPools.map((pool) => ({
    spawnPointId: pool.spawnPointId,
    intervalMs: pool.intervalMs,
    delayMs: 0,
    requests: pool.requests.map((count) => {
      if (!scale || count <= 0) return count;
      return Math.max(1, Math.floor(((count * dynamicDifficulty) / 1000) + 0.5));
    }),
  }));
}

function campaignPendingRequests(pools: readonly MutableCampaignSpawnPool[] | undefined): number {
  return pools?.reduce((total, pool) => total + pool.requests.reduce((sum, count) => sum + count, 0), 0) ?? 0;
}

function campaignEnemyHitPoints(
  scenario: ScenarioContent,
  wave: CampaignWaveDefinition,
  dynamicDifficulty: number,
  difficulty: GameDifficulty,
): number {
  const baseHitPoints = scenario.campaignEnemy?.hitPoints ?? 1;
  const levelMultiplier = scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty?.[difficulty] ?? 100;
  const scaledWaveHitPoints = Math.trunc((levelMultiplier * wave.hitPointMultiplierPercent) / 100);
  const hpFactor = Math.trunc((dynamicDifficulty * scaledWaveHitPoints * 2) / 10);
  return Math.max(1, Math.trunc((baseHitPoints * hpFactor) / 2000));
}

function createCampaignEnemy(
  id: string,
  type: 1 | 2,
  spawn: WaveSpawn,
  offset: { x: number; y: number },
  speed: number,
  hitPoints: number,
  definition: PreviewEnemyDefinition,
): MutableEnemy {
  const direction = directionVector(spawn.direction);
  const spawnX = (spawn.cell.x * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF - (direction.x * 2 * FINE_UNITS_PER_CELL);
  const spawnY = (spawn.cell.y * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF - (direction.y * 2 * FINE_UNITS_PER_CELL);
  return {
    id,
    type,
    asset: type === 1 ? 'pioneer_male' : 'pioneer_female',
    speed,
    direction: spawn.direction,
    positionFine: { x: spawnX + offset.x, y: spawnY + offset.y },
    hitPoints,
    maxHitPoints: hitPoints,
    cashReward: definition.cashReward,
    penetration: definition.penetration,
    alive: true,
    deathRemainingMs: 0,
    hitFlashMs: 0,
    animationDistance: 0,
    animationFrame: 0,
    despawnOnNextFieldCounter: 0,
  };
}

const SETTLER_SPAWN_OFFSETS = Object.freeze([
  Object.freeze({ x: -2560, y: -2080 }),
  Object.freeze({ x: 2560, y: -2080 }),
  Object.freeze({ x: -2560, y: 4000 }),
  Object.freeze({ x: 2560, y: 4000 }),
]);

function spawnSettlerGroup(
  scenario: ScenarioContent,
  pool: MutableCampaignSpawnPool,
  requestType: number,
  waveNumber: number,
  dynamicDifficulty: number,
  waveDefinition: CampaignWaveDefinition,
  difficulty: GameDifficulty,
  random: JavaRandom,
  nextEnemyId: () => string,
): MutableEnemy[] | undefined {
  const spawnPoints = [scenario.previewWave?.spawn, ...(scenario.previewWave?.additionalSpawns ?? [])]
    .filter((spawn): spawn is WaveSpawn => spawn !== undefined);
  if (pool.spawnPointId < 0 || pool.spawnPointId >= spawnPoints.length) return undefined;

  // The original chooses a matching action-1 field before applying the two-cell backstep.
  const spawn = spawnPoints[pool.spawnPointId]!;
  random.nextInt(1);
  const speedPercent = 90 + random.nextInt(20);
  const waveSpeed = Math.trunc((waveDefinition.speedMultiplierPercent * speedPercent) / 100);
  const speed = Math.trunc(((scenario.previewWave?.baseEnemySpeed ?? 0) * waveSpeed) / 100);
  const groupSize = requestType - 1;
  const hp = campaignEnemyHitPoints(scenario, waveDefinition, dynamicDifficulty, difficulty);
  const enemyDefinition = scenario.campaignEnemy ?? {
    hitPoints: 1,
    cashReward: 0,
    penetration: { light: 0, fire: 0, heavy: 0, poison: 0 },
  };
  const availableSlots = [0, 1, 2, 3];
  const enemies: MutableEnemy[] = [];

  while (enemies.length < groupSize && availableSlots.length > 0) {
    const slotPosition = random.nextInt(availableSlots.length);
    const slot = availableSlots.splice(slotPosition, 1)[0]!;
    const type = (random.nextInt(2) + 1) as 1 | 2;
    // GameObjectEnemy consumes this value for mIsWhite, including for settlers.
    random.nextInt(2);
    enemies.push(createCampaignEnemy(
      nextEnemyId(), type, spawn, SETTLER_SPAWN_OFFSETS[slot]!, speed, hp, enemyDefinition,
    ));
  }

  return enemies.length === groupSize ? enemies : undefined;
}

function recordCampaignEscape(wave: MutableWave, livesMax: number, penalty: number): void {
  if (wave.dynamicDifficulty === undefined || wave.difficultyValue === undefined
    || wave.difficultyValueCounter === undefined) return;
  const weight = Math.trunc(200 / livesMax) * penalty;
  wave.difficultyValueCounter += weight;
}

function cowGulchPriority(scenario: ScenarioContent, positionFine: { x: number; y: number }): number {
  const definition = scenario.previewWave;
  if (!definition) return 0;
  const waypoints = [definition.spawn.cell, ...definition.redirects.map(({ cell }) => cell), definition.exit];
  const cells: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const start = waypoints[index]!;
    const end = waypoints[index + 1]!;
    const dx = Math.sign(end.x - start.x);
    const dy = Math.sign(end.y - start.y);
    const steps = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
    for (let step = 0; step < steps; step += 1) {
      const cell = { x: start.x + (dx * step), y: start.y + (dy * step) };
      if (cells.at(-1)?.x !== cell.x || cells.at(-1)?.y !== cell.y) cells.push(cell);
    }
  }
  const last = waypoints.at(-1)!;
  if (cells.at(-1)?.x !== last.x || cells.at(-1)?.y !== last.y) cells.push({ x: last.x, y: last.y });
  const priority = new Map(cells.map((cell, index) => [
    `${cell.x},${cell.y}`,
    255 - (cells.length - 1 - index),
  ]));
  const redirectPriorities = definition.redirects
    .map(({ cell }) => priority.get(`${cell.x},${cell.y}`))
    .filter((value): value is number => value !== undefined);
  const minimum = Math.min(255, ...redirectPriorities);
  const cellX = fullCell(positionFine.x);
  const cellY = fullCell(positionFine.y);
  const mapPriority = priority.get(`${cellX},${cellY}`) ?? 0;
  return Math.trunc(((mapPriority - minimum) * 1000) / (255 - minimum));
}

function recordCampaignKill(wave: MutableWave, scenario: ScenarioContent, enemy: MutableEnemy): void {
  if (wave.dynamicDifficulty === undefined || wave.difficultyValue === undefined
    || wave.difficultyValueCounter === undefined) return;
  const routeValue = cowGulchPriority(scenario, enemy.positionFine);
  wave.difficultyValue += (1500 - routeValue);
  wave.difficultyValueCounter += 1;
}

function unitEnemyDistanceSquare(unit: MutableUnit, enemy: MutableEnemy): number {
  const unitCenter = unitAttackCenterTenthTiles(unit);
  const enemyX = tenthTileCoordinate(enemy.positionFine.x);
  const enemyY = tenthTileCoordinate(enemy.positionFine.y);
  const dx = unitCenter.x - enemyX;
  const dy = unitCenter.y - enemyY;
  return (dx * dx) + (dy * dy);
}

function enemyDistanceSquare(first: MutableEnemy, second: MutableEnemy): number {
  const dx = tenthTileCoordinate(first.positionFine.x) - tenthTileCoordinate(second.positionFine.x);
  const dy = tenthTileCoordinate(first.positionFine.y) - tenthTileCoordinate(second.positionFine.y);
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

function moveEnemy(enemy: MutableEnemy, deltaMs: number, scenario: ScenarioContent, random: JavaRandom): boolean {
  if (deltaMs === 0) return false;
  const definition = scenario.previewWave;
  if (!definition) return false;

  const previous = { ...enemy.positionFine };
  const vector = directionVector(enemy.direction);
  const distance = Math.fround((enemy.speed * deltaMs) / 100);
  enemy.positionFine = {
    x: Math.trunc(Math.fround(previous.x + vector.x * distance)),
    y: Math.trunc(Math.fround(previous.y + vector.y * distance)),
  };
  const movedFine = Math.abs(enemy.positionFine.x - previous.x) + Math.abs(enemy.positionFine.y - previous.y);
  if (movedFine > 0) {
    enemy.animationDistance = (enemy.animationDistance + movedFine) % 3072;
    if (enemy.animationDistance <= 768) enemy.animationFrame = 0;
    else if (enemy.animationDistance <= 1536) enemy.animationFrame = 1;
    else if (enemy.animationDistance <= 2304) enemy.animationFrame = 0;
    else enemy.animationFrame = 2;
  }

  const passedCenter = vector.x !== 0
    ? passesFieldCenter(previous.x, enemy.positionFine.x)
    : passesFieldCenter(previous.y, enemy.positionFine.y);
  if (!passedCenter) return false;

  if (passedCenter) {
    if (enemy.despawnOnNextFieldCounter > 0) {
      enemy.despawnOnNextFieldCounter -= 1;
      if (enemy.despawnOnNextFieldCounter === 0) return true;
    } else {
      const cell = { x: fullCell(enemy.positionFine.x), y: fullCell(enemy.positionFine.y) };
      if (cell.x === definition.exit.x && cell.y === definition.exit.y) {
        enemy.despawnOnNextFieldCounter = 2;
      } else {
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
      }
    }
  }

  const cellX = fullCell(enemy.positionFine.x);
  const cellY = fullCell(enemy.positionFine.y);
  return cellX >= scenario.map.width + 3 || cellY >= scenario.map.height + 3
    || cellX <= -3 || cellY <= -3;
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

  const prepare: Game['prepare'] = async ({ scenarioId, overrides = [] }) => {
    const source = scenarios.get(scenarioId);
    if (!source) throw new GameOpenError('scenario-unavailable', 'Unknown scenario: ' + scenarioId);
    const scenario = clone(source);
    const bindings = numericParameterBindings(scenario);
    const seenOverrides = new Set<string>();
    for (const override of overrides) {
      if (!override || typeof override.path !== 'string' || seenOverrides.has(override.path)
        || !validNumericParameter(override.path, override.value)) {
        throw new GameOpenError('prepared-setup-invalid', 'Numeric parameter override is invalid');
      }
      const binding = bindings.get(override.path);
      if (!binding) throw new GameOpenError('prepared-setup-invalid', 'Unknown numeric parameter: ' + override.path);
      seenOverrides.add(override.path);
      binding.write(override.value);
    }
    const body = {
      scenarioId: source.id,
      contentVersion: source.contentVersion ?? 'unversioned',
      rulesVersion: GAME_RULES_VERSION,
      parameters: sortedParameters(bindings),
    };
    const digest = await gameValueDigest(body);
    return freezeDeep({ ...body, digest });
  };

  const resolvePreparedSetup = async (
    source: ScenarioContent,
    input: PreparedSetup,
  ): Promise<{ scenario: ScenarioContent; setup: PreparedSetup }> => {
    if (!input || input.scenarioId !== source.id) {
      throw new GameOpenError('prepared-setup-mismatch', 'Prepared setup does not match the requested scenario');
    }
    if (input.contentVersion !== (source.contentVersion ?? 'unversioned')) {
      throw new GameOpenError('content-version-unavailable', 'Prepared setup content version is unavailable');
    }
    if (input.rulesVersion !== GAME_RULES_VERSION) {
      throw new GameOpenError('rules-version-unsupported', 'Prepared setup rules version is not supported');
    }
    const scenario = clone(source);
    const bindings = numericParameterBindings(scenario);
    if (!Array.isArray(input.parameters) || input.parameters.length !== bindings.size) {
      throw new GameOpenError('prepared-setup-invalid', 'Prepared setup does not contain the complete numeric parameter set');
    }
    const seenParameters = new Set<string>();
    for (const parameter of input.parameters) {
      if (!parameter || typeof parameter.path !== 'string' || seenParameters.has(parameter.path)
        || !validNumericParameter(parameter.path, parameter.value)) {
        throw new GameOpenError('prepared-setup-invalid', 'Prepared setup contains an invalid numeric parameter');
      }
      const binding = bindings.get(parameter.path);
      if (!binding) throw new GameOpenError('prepared-setup-invalid', 'Prepared setup contains an unknown numeric parameter');
      seenParameters.add(parameter.path);
      binding.write(parameter.value);
    }
    if (seenParameters.size !== bindings.size) {
      throw new GameOpenError('prepared-setup-invalid', 'Prepared setup is missing numeric parameters');
    }
    const body = {
      scenarioId: source.id,
      contentVersion: source.contentVersion ?? 'unversioned',
      rulesVersion: GAME_RULES_VERSION,
      parameters: sortedParameters(bindings),
    };
    const digest = await gameValueDigest(body);
    if (input.digest !== digest) {
      throw new GameOpenError('prepared-setup-invalid', 'Prepared setup digest does not match its numeric parameters');
    }
    const setup = freezeDeep({ ...body, digest });
    return { scenario, setup };
  };

  const openSession = async ({
    scenarioId,
    contentVersion,
    randomSeed,
    difficulty: requestedDifficulty,
    mode = 'debug',
    preparedSetup,
    replaySourceMode,
  }: Parameters<Game['open']>[0] & { replaySourceMode?: GameMode }): Promise<GameSession> => {
      const sourceScenario = scenarios.get(scenarioId);
      if (!sourceScenario) throw new GameOpenError('scenario-unavailable', 'Unknown scenario: ' + scenarioId);
      if (contentVersion !== undefined && contentVersion !== (sourceScenario.contentVersion ?? 'unversioned')) {
        throw new GameOpenError('content-version-unavailable', 'Requested scenario content version is unavailable');
      }
      const setup = preparedSetup ?? await prepare({ scenarioId });
      const resolved = await resolvePreparedSetup(sourceScenario, setup);
      const scenario = resolved.scenario;
      const difficulty = requestedDifficulty ?? 'easy';
      if (!isGameDifficulty(difficulty)) {
        throw new GameOpenError('difficulty-unavailable', 'Requested game difficulty is invalid');
      }
      const difficultyMultipliers = scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty;
      if (difficultyMultipliers) {
        const values = [difficultyMultipliers.easy, difficultyMultipliers.medium, difficultyMultipliers.hard];
        if (values.some((value) => !Number.isSafeInteger(value) || value < 1)) {
          throw new GameOpenError('difficulty-unavailable', 'Scenario difficulty multipliers are invalid');
        }
      }
      if (scenario.previewWave?.enemy) {
        if (difficulty !== 'easy' && !difficultyMultipliers) {
          throw new GameOpenError('difficulty-unavailable', 'This scenario does not define the selected difficulty');
        }
        if (difficultyMultipliers) {
          const easyMultiplier = difficultyMultipliers.easy;
          const selectedMultiplier = difficultyMultipliers[difficulty];
          scenario.previewWave.enemy.hitPoints = Math.max(1, Math.trunc(
            (scenario.previewWave.enemy.hitPoints * selectedMultiplier) / easyMultiplier,
          ));
        }
      }
      const campaignWaves = scenario.campaignWaves;
      const campaignWaveCount = scenario.campaignWaveCount ?? campaignWaves?.length ?? 0;
      const campaignMode = (mode === 'formal' || (mode === 'replay' && replaySourceMode === 'formal'))
        && Boolean(campaignWaves?.length);
      if (campaignWaves) {
        if (!Number.isSafeInteger(campaignWaveCount) || campaignWaveCount < campaignWaves.length
          || campaignWaves.some((campaignWave, index) => campaignWave.number !== index + 1
            || !Number.isSafeInteger(campaignWave.hitPointMultiplierPercent)
            || campaignWave.hitPointMultiplierPercent < 1
            || !Number.isSafeInteger(campaignWave.speedMultiplierPercent)
            || campaignWave.speedMultiplierPercent < 1
            || campaignWave.spawnPools.some((pool) => !Number.isSafeInteger(pool.spawnPointId)
              || pool.spawnPointId < 0 || !Number.isSafeInteger(pool.intervalMs) || pool.intervalMs < 0
              || pool.requests.length !== 10
              || pool.requests.some((count) => !Number.isSafeInteger(count) || count < 0)))) {
          throw new GameOpenError('scenario-unavailable', 'Campaign wave data is invalid');
        }
      }
      if (mode === 'formal' && preparedSetup) {
        const baseline = await prepare({ scenarioId });
        if (baseline.digest !== resolved.setup.digest) {
          throw new GameOpenError('prepared-setup-mismatch', 'Formal games cannot use modified numeric parameters');
        }
      }
      if (mode === 'formal' && scenario.formalSettlementSupported !== true) {
        throw new Error('Formal mode is not supported for scenario: ' + scenarioId);
      }
      if (mode === 'formal' && !scenario.previewWave && !campaignWaves?.length) {
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
        shotsUntilSpecialReload: definition.weapon?.specialReloadFrequency ?? 0,
      }));
      const recruitableUnits = new Map((scenario.recruitableUnits ?? []).map((definition) => [definition.id, definition]));
      const recruitmentCommands = new Map<string, string>();
      const mapHireCommands = new Map<string, string>();
      const upgradeCommands = new Map<string, string>();
      const recordedFrames: GameReplayFrame[] = [];
      const replayStates = new Map<number, ReplayState>();
      const pending: PendingIntent[] = [];
      let nextIntentSequence = 1;
      let nextShotNumber = 1;
      let nextCampaignEnemyNumber = 1;
      let frame = 0;
      let elapsedMs = 0;
      let closed = false;
      let paused = false;
      const firstCampaignWave = campaignWaves?.find(({ number }) => number === 1);
      let wave: MutableWave | undefined = scenario.previewWave
        ? {
          number: firstCampaignWave?.number ?? scenario.previewWave.number,
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
          ...(campaignMode && firstCampaignWave ? {
            campaignSpawnPools: campaignSpawnPools(firstCampaignWave, 1000, false),
            dynamicDifficulty: 1000,
            difficultyValue: 1000,
            difficultyValueCounter: 1,
          } : {}),
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
          units: units.map((unit) => unitView(unit, scenario.maxUpgrades ?? 0, elapsedMs)),
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
            animationFrame: enemy.animationFrame,
          })),
          shots: (wave?.shots ?? []).map((shot) => ({
            id: shot.id,
            shooterId: shot.shooterId,
            targetId: shot.targetId,
            positionFine: { ...shot.positionFine },
            remainingMs: shot.remainingMs,
            damageStyle: shot.damageStyle,
            ...(shot.imageAsset ? { imageAsset: shot.imageAsset } : {}),
            animationFrame: shot.animationFrame,
            ...(shot.explosionRemainingMs > 0 ? { explosionRemainingMs: shot.explosionRemainingMs } : {}),
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
              number: wave.number,
              ...(campaignMode ? { totalWaves: campaignWaveCount } : {}),
              phase: wave.phase,
              lives: wave.lives,
              escapedEnemies: wave.escapedEnemies,
              defeatedEnemies: wave.defeatedEnemies,
              cash: wave.cash,
              activeEnemies: wave.enemies.filter((enemy) => enemy.alive).length,
              ...(campaignMode ? {
                pendingSpawnRequests: campaignPendingRequests(wave.campaignSpawnPools),
                dynamicDifficulty: wave.dynamicDifficulty!,
              } : {}),
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
          difficulty,
          preparedSetup: resolved.setup,
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

          if (intent.type === 'hire-map-unit') {
            if (!wave || typeof intent.unitId !== 'string' || typeof intent.commandId !== 'string'
              || !intent.commandId.trim() || intent.commandId.length > 128) return false;
            const unit = units.find((candidate) => candidate.definition.id === intent.unitId);
            const price = unit?.definition.hirePrice;
            if (!unit?.selected || unit.definition.activity !== 4 || !Number.isSafeInteger(price)
              || (price as number) < 0) return false;
            const existingUnitId = mapHireCommands.get(intent.commandId);
            if (existingUnitId !== undefined) return existingUnitId === intent.unitId;
            mapHireCommands.set(intent.commandId, intent.unitId);
            pending.push({
              sequence: nextIntentSequence,
              intent: { type: 'hire-map-unit', unitId: intent.unitId, commandId: intent.commandId },
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
              || !units.some((unit) => unit.selected && (unit.definition.activity ?? 5) === 5
                && unit.movementSpeedFinePer100Ms > 0)) return false;
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
              if (!campaignMode) {
                const spawns = [scenario.previewWave.spawn, ...(scenario.previewWave.additionalSpawns ?? [])];
                for (const [index, spawn] of spawns.entries()) {
                  const speedMultiplier = scenario.previewWave.speedMultiplierMin
                    + random.nextInt(scenario.previewWave.speedMultiplierCount);
                  const speed = Math.trunc((scenario.previewWave.baseEnemySpeed * speedMultiplier) / 100);
                  wave.enemies.push(createPreviewEnemy('preview-pioneer-' + (index + 1), spawn, scenario.previewWave, speed));
                }
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

            if (command.intent.type === 'hire-map-unit') {
              const unitId = command.intent.unitId;
              const unit = units.find((candidate) => candidate.definition.id === unitId);
              const price = unit?.definition.hirePrice;
              if (!wave || !unit || unit.definition.activity !== 4 || !Number.isSafeInteger(price)) continue;
              const hirePrice = price as number;
              if (wave.cash < hirePrice) {
                wave.events.push({
                  type: 'map-unit-hire-rejected',
                  unitId: unit.definition.id,
                  unitType: unit.definition.type,
                  reason: 'insufficient-funds',
                  price: hirePrice,
                  availableCash: wave.cash,
                });
                continue;
              }
              wave.cash -= hirePrice;
              unit.definition.activity = 5;
              if (unit.definition.awakeAsset) unit.definition.asset = unit.definition.awakeAsset;
              if (unit.definition.awakeFrame) unit.definition.frame = clone(unit.definition.awakeFrame);
              if (unit.definition.awakeRender) unit.definition.render = clone(unit.definition.awakeRender);
              if (unit.definition.awakeHitArea) unit.definition.hitArea = clone(unit.definition.awakeHitArea);
              unit.weapon = unit.definition.weapon ? clone(unit.definition.weapon) : undefined;
              unit.weaponCooldownMs = unit.weapon ? Math.trunc(unit.weapon.reloadTimeMs / 2) : 0;
              unit.shotsUntilSpecialReload = unit.weapon?.specialReloadFrequency ?? 0;
              wave.events.push({
                type: 'map-unit-hired',
                unitId: unit.definition.id,
                unitType: unit.definition.type,
                price: hirePrice,
              });
              if (unit.definition.type === 'gunslinger' || unit.definition.type === 'mexican') {
                wave.events.push({
                  type: 'sound-requested',
                  sound: unit.definition.type === 'gunslinger' ? 'sound_desperado_yihaa' : 'sound_mexican_arriba',
                });
              }
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
              unit.shotsUntilSpecialReload = upgrade.weapon.specialReloadFrequency ?? 0;
              wave.events.push({
                type: 'unit-upgraded',
                unitId: unit.definition.id,
                level: unit.upgradeLevel,
                price: upgrade.price,
              });
              continue;
            }

            if (command.intent.type === 'move-unit') {
              const selectedUnit = units.find((unit) => unit.selected && (unit.definition.activity ?? 5) === 5);
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
              const current = unitView(unit, scenario.maxUpgrades ?? 0, elapsedMs);
              return contains(current.hitArea, selection.x, selection.y);
            });
            for (const unit of units) {
              unit.selected = unit === target;
              unit.movementTargetFine = undefined;
            }
          }

          for (const unit of units) {
            moveUnit(unit, scenario, deltaMs);
            advanceShootingAnimation(unit, deltaMs);
          }

          if (wave?.phase === 'active' && !waveStarted && scenario.previewWave) {
            if (campaignMode && wave.campaignSpawnPools) {
              const campaignDefinition = campaignWaves?.find(({ number }) => number === wave!.number);
              for (const pool of wave.campaignSpawnPools) {
                if (pool.delayMs > 0) {
                  pool.delayMs = Math.max(0, pool.delayMs - deltaMs);
                  continue;
                }
                const totalRequests = pool.requests.reduce((sum, count) => sum + count, 0);
                if (totalRequests <= 0) continue;
                let selection = random.nextInt(totalRequests);
                let selectedRequestIndex = -1;
                for (let index = 0; index < pool.requests.length; index += 1) {
                  selection -= pool.requests[index]!;
                  if (selection < 0) {
                    selectedRequestIndex = index;
                    break;
                  }
                }
                if (selectedRequestIndex < 0 || !campaignDefinition || wave.dynamicDifficulty === undefined) continue;
                const requestType = selectedRequestIndex + 2;
                const spawned = spawnSettlerGroup(
                  scenario,
                  pool,
                  requestType,
                  wave.number,
                  wave.dynamicDifficulty,
                  campaignDefinition,
                  difficulty,
                  random,
                  () => `campaign-${wave!.number}-enemy-${nextCampaignEnemyNumber++}`,
                );
                if (!spawned) {
                  pool.delayMs = Math.trunc(pool.intervalMs / 2);
                  continue;
                }
                wave.enemies.push(...spawned);
                pool.requests[selectedRequestIndex] = pool.requests[selectedRequestIndex]! - 1;
                pool.delayMs = pool.intervalMs;
                wave.events.push({
                  type: 'enemy-group-spawned',
                  enemyIds: spawned.map(({ id }) => id),
                  waveNumber: wave.number,
                  spawnPointId: pool.spawnPointId,
                  requestType,
                  groupSize: spawned.length,
                });
              }
            }
            for (const enemy of [...wave.enemies]) {
              if (!enemy.alive) {
                enemy.deathRemainingMs = Math.max(0, enemy.deathRemainingMs - deltaMs);
                enemy.hitFlashMs = Math.max(0, enemy.hitFlashMs - deltaMs);
                continue;
              }
              enemy.hitFlashMs = Math.max(0, enemy.hitFlashMs - deltaMs);
              if (!moveEnemy(enemy, deltaMs, scenario, random)) continue;
              wave.enemies = wave.enemies.filter((candidate) => candidate !== enemy);
              if (campaignMode) {
                recordCampaignEscape(wave, scenario.previewWave.initialLives, scenario.previewWave.escapePenalty);
              }
              wave.lives = Math.max(0, wave.lives - scenario.previewWave.escapePenalty);
              wave.escapedEnemies += 1;
            }

            for (const unit of units) {
              if ((unit.definition.activity ?? 5) !== 5) continue;
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
                damageStyle: weapon.damageStyle,
                areaDamageFine: weapon.areaDamageFine ?? 0,
                imageAsset: weapon.damageStyle === 3 ? 'sfx_mexican_dynamite' : undefined,
                animationFrame: 0,
                startFine,
                positionFine: { ...startFine },
                totalTravelTimeMs: travelMs,
                remainingMs: travelMs,
                impactResolved: false,
                explosionRemainingMs: 0,
              });
              nextShotNumber += 1;
              unit.shootingAnimationElapsedMs = 0;
              unit.shootingDirection = {
                x: Math.sign(target.positionFine.x - unit.positionFine.x) as -1 | 0 | 1,
                y: Math.sign(target.positionFine.y - (unit.positionFine.y - FIELD_CENTER_HALF)) as -1 | 0 | 1,
              };
              unit.weaponCooldownMs = weapon.reloadTimeMs;
              let specialReload = false;
              if (weapon.specialReloadFrequency !== undefined && weapon.specialReloadFrequency > 0) {
                unit.shotsUntilSpecialReload -= 1;
                if (unit.shotsUntilSpecialReload <= 0) {
                  unit.weaponCooldownMs += weapon.specialReloadTimeMs ?? 0;
                  unit.shotsUntilSpecialReload = weapon.specialReloadFrequency;
                  specialReload = true;
                }
              }
              wave.events.push({ type: 'unit-fired', unitId: unit.definition.id, targetId: target.id, specialReload });
              if (unit.definition.type === 'gunslinger' && weapon.damageStyle === 0) {
                wave.events.push({ type: 'sound-requested', sound: 'sound_revolver' });
              }
            }

            for (const shot of [...wave.shots]) {
              if (shot.impactResolved) {
                shot.explosionRemainingMs = Math.max(0, shot.explosionRemainingMs - deltaMs);
                shot.remainingMs = shot.explosionRemainingMs;
                shot.animationFrame = Math.min(7, Math.floor((799 - shot.explosionRemainingMs) / 100));
                if (shot.explosionRemainingMs === 0) {
                  wave.shots = wave.shots.filter((candidate) => candidate !== shot);
                }
                continue;
              }
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
              shot.animationFrame = Math.floor(elapsedShotMs / 100) % (shot.damageStyle === 3 ? 3 : 10);
              if (shot.remainingMs > 0) continue;

              const areaRadiusTenthTiles = Math.trunc((shot.areaDamageFine * 10) / FINE_UNITS_PER_CELL);
              const areaSquare = areaRadiusTenthTiles * areaRadiusTenthTiles;
              const affected = shot.areaDamageFine > 0
                ? wave.enemies.filter((enemy) => enemy.alive && (enemy.id === target.id
                  || enemyDistanceSquare(target, enemy) < areaSquare))
                : [target];
              const affectedEnemyIds: string[] = [];
              for (const hitEnemy of affected) {
                if (!hitEnemy.alive) continue;
                affectedEnemyIds.push(hitEnemy.id);
                const damage = Math.trunc((shot.damage * damagePenetration(hitEnemy, shot.damageType)) / 100);
                hitEnemy.hitPoints -= damage;
                hitEnemy.hitFlashMs = 120;
                wave.events.push({ type: 'enemy-hit', enemyId: hitEnemy.id, damage, hitPoints: hitEnemy.hitPoints });
                if (hitEnemy.hitPoints <= 0) {
                  hitEnemy.alive = false;
                  hitEnemy.deathRemainingMs = campaignMode ? 599 : 799;
                  if (campaignMode) recordCampaignKill(wave, scenario, hitEnemy);
                  wave.cash += hitEnemy.cashReward;
                  wave.cashMade += hitEnemy.cashReward;
                  wave.defeatedEnemies += 1;
                  wave.events.push({ type: 'enemy-defeated', enemyId: hitEnemy.id, cashReward: hitEnemy.cashReward });
                }
              }
              if (shot.damageStyle === 3 || shot.areaDamageFine > 0) {
                shot.impactResolved = true;
                shot.explosionRemainingMs = 799;
                shot.remainingMs = 799;
                shot.animationFrame = 0;
                shot.positionFine = { ...target.positionFine };
                wave.events.push({
                  type: 'shot-exploded',
                  shotId: shot.id,
                  targetId: target.id,
                  affectedEnemyIds,
                });
                if (shot.damageStyle === 3) wave.events.push({ type: 'sound-requested', sound: 'sound_dynamite' });
              } else {
                wave.shots = wave.shots.filter((candidate) => candidate !== shot);
              }
            }

            wave.enemies = wave.enemies.filter((enemy) => enemy.alive || enemy.deathRemainingMs > 0);
            const pendingCampaignRequests = campaignMode ? campaignPendingRequests(wave.campaignSpawnPools) : 0;
            const waveCleared = wave.enemies.length === 0
              && wave.shots.length === 0
              && pendingCampaignRequests === 0
              && (campaignMode || wave.escapedEnemies > 0 || wave.defeatedEnemies > 0);
            if (wave.lives <= 0) {
              for (const unit of units) unit.movementTargetFine = undefined;
              wave.phase = 'complete';
              const difficultyScorePercent = difficulty === 'easy'
                ? scenario.previewWave.difficultyScorePercent ?? GAME_DIFFICULTY_SCORE_PERCENT.easy
                : GAME_DIFFICULTY_SCORE_PERCENT[difficulty];
              wave.settlement = calculateSettlement(wave, difficultyScorePercent, 'defeat');
              wave.events.push({ type: 'wave-settled', settlement: clone(wave.settlement) });
            } else if (waveCleared && campaignMode) {
              for (const unit of units) unit.movementTargetFine = undefined;
              wave.events.push({
                type: 'wave-cleared',
                waveNumber: wave.number,
                escapedEnemies: wave.escapedEnemies,
                defeatedEnemies: wave.defeatedEnemies,
              });
              const averageDifficulty = Math.trunc((wave.difficultyValue ?? wave.dynamicDifficulty ?? 1000)
                / (wave.difficultyValueCounter ?? 1));
              const rawNextDifficulty = Math.trunc(((wave.dynamicDifficulty ?? 1000) + averageDifficulty) / 2);
              const minDifficulty = 500;
              const maxDifficulty = difficulty === 'easy' ? 1250 : 1500;
              const nextDifficulty = Math.max(minDifficulty, Math.min(maxDifficulty, rawNextDifficulty));
              const nextCampaignWave = campaignWaves?.find(({ number }) => number === wave!.number + 1);
              if (nextCampaignWave) {
                wave.number = nextCampaignWave.number;
                wave.dynamicDifficulty = nextDifficulty;
                wave.difficultyValue = nextDifficulty;
                wave.difficultyValueCounter = 1;
                wave.campaignSpawnPools = campaignSpawnPools(nextCampaignWave, nextDifficulty, true);
                wave.phase = 'not-started';
              } else if (wave.number >= campaignWaveCount && (campaignWaves?.length ?? 0) >= campaignWaveCount) {
                wave.phase = 'complete';
                const difficultyScorePercent = difficulty === 'easy'
                  ? scenario.previewWave.difficultyScorePercent ?? GAME_DIFFICULTY_SCORE_PERCENT.easy
                  : GAME_DIFFICULTY_SCORE_PERCENT[difficulty];
                wave.settlement = calculateSettlement(wave, difficultyScorePercent, 'victory');
                wave.events.push({ type: 'wave-settled', settlement: clone(wave.settlement) });
              } else {
                wave.phase = 'complete';
              }
            } else if (waveCleared) {
              for (const unit of units) unit.movementTargetFine = undefined;
              wave.phase = 'complete';
              const difficultyScorePercent = difficulty === 'easy'
                ? scenario.previewWave.difficultyScorePercent ?? GAME_DIFFICULTY_SCORE_PERCENT.easy
                : GAME_DIFFICULTY_SCORE_PERCENT[difficulty];
              wave.settlement = calculateSettlement(wave, difficultyScorePercent, 'victory');
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
            settlementId: `${sessionId}:${scenario.id}:${wave.number}`,
            sessionId,
            scenarioId: scenario.id,
            mode,
            waveNumber: wave.number,
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
    prepare,
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
        difficulty: record.startRecord.difficulty ?? 'easy',
        mode: 'replay',
        replaySourceMode: record.startRecord.mode,
        ...(record.startRecord.preparedSetup ? { preparedSetup: record.startRecord.preparedSetup } : {}),
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
