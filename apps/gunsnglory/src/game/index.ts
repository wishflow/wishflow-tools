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
import { deriveSessionRandomSeed, JavaRandom, JavaUtilRandom } from './java-random';
import {
  dealGamblerHand,
  getGamblerStake,
  resolveGamblerRound,
  type GamblerCardView,
  type GamblerOutcome,
  type GamblerUnitType,
} from './gambler-rules';
import {
  DrawOrderQueue,
  GAME_DRAW_ORDER_ROAD_CUTOFF,
  synchronizeDrawOrder,
  type DrawOrderEntry,
} from './draw-order';
import {
  advanceCampaignUnitPool,
  applyCampaignUnitPoolActions,
  createCampaignUnitPoolRuntime,
  queueCampaignUnitForSpawn,
  type SpawnedCampaignUnit,
} from './campaign-unit-pool';
import {
  advanceCampaignBonusCratePool,
  beginCampaignBonusCrateDespawn,
  campaignBonusLivesAfterPickup,
  campaignBonusCrateAnimationFrame,
  chooseCampaignBonusReward,
  collisionBoundsOverlap,
  createCampaignBonusCratePool,
  isCampaignBonusCrateFieldBlocked,
  isBonusCrateCandidateAllowed,
  type CampaignBonusCrate,
  type CampaignBonusCrateDefinition,
  type CampaignBonusCratePool,
  type CampaignBonusRewardType,
} from './campaign-bonus-crates';
import { createRoutePriorityMap, normalizedRoutePriority, type RoutePriorityMap } from './route-priority';
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
export type { CampaignBonusCrateDefinition, CampaignBonusRewardType } from './campaign-bonus-crates';
export type {
  GamblerCardView,
  GamblerHand,
  GamblerHandDeal,
  GamblerOutcome,
  GamblerSuitCode,
  GamblerUnitType,
} from './gambler-rules';

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

export interface MapDecoration {
  asset: string;
  cell: { x: number; y: number };
  /** Horizontal sprite-anchor offset from the cell center, in map cells. */
  anchorOffsetX?: number;
  /** Vertical sprite foot-anchor offset from the cell bottom, in map cells. */
  anchorOffsetY?: number;
  /** Original static-object collision bounds relative to the cell origin, in fine units. */
  collisionBoxFine?: Rectangle;
  /** Inclusive tile offsets blocked by GameObjectManager.fieldIsBlocked; defaults to this cell only. */
  fieldBlockBounds?: { left: number; right: number; top: number; bottom: number };
}

export interface ScenarioUnit {
  id: string;
  /** Original map-object activity: 2 is pool-spawned, 4 is sleeping, and 5 is hired. */
  activity?: 2 | 4 | 5;
  /** Units with the same group ID share one drag target and move as a rigid row. */
  movementGroupId?: string;
  /** Restricts a movement group to its original horizontal rail axis. */
  movementAxis?: 'horizontal';
  /** Original collision bounds relative to this unit's fine position. */
  collisionBoxFine?: Rectangle;
  /** Hides the default sleeping bubble for map objects that use activity 4 for another purpose. */
  showSleepingEffect?: boolean;
  /** Original LokSteam emitter, present only on Tech Town's lead locomotive. */
  steamEmitter?: true;
  /** Original greeting sound played when selecting this map unit. */
  selectionSound?: UnitSelectionSound;
  type: string;
  /** Price for activating this existing activity-4 map object. */
  hirePrice?: number;
  /** Sprite atlas used after this existing map object is hired. */
  awakeAsset?: string;
  awakeFrame?: Rectangle;
  awakeRender?: Rectangle;
  awakeHitArea?: Rectangle;
  /** Original SfxManager.playTypicalSound cue for hiring this unit. */
  hireSound?: UnitHireSound;
  /** Original positional SfxManager cue emitted when this unit fires. */
  shotSound?: UnitShotSound;
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

export type SpawnLocationType = 1 | 2 | 3;

export interface RecruitableUnitDefinition {
  id: string;
  name: { en: string; zh: string };
  price: number;
  /** Original spawn-building kind: saloon, fort, or tipi. */
  spawnLocationType: SpawnLocationType;
}

export type DamageType = 'light' | 'fire' | 'heavy' | 'poison';

export type UnitHireSound =
  | 'sound_desperado_yihaa'
  | 'sound_mexican_arriba'
  | 'sound_deserter_yes_sir'
  | 'sound_indian_hugh'
  | 'sound_sniper_laughing'
  | 'sound_grandpa_coughing'
  | 'sound_pyromaniac'
  | 'sound_snakeoilsalesman'
  | 'sound_train';

export type UnitSelectionSound = 'sound_train';

export type UnitShotSound =
  | 'sound_cannon'
  | 'sound_fire_arrow'
  | 'sound_gattling_gun'
  | 'sound_shotgun'
  | 'sound_rifle'
  | 'sound_rocket_explosion'
  | 'sound_rocket_launch'
  | 'sound_poison_splash';

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
  /** APK GameDesignData UNIT_DATA_POST_DAMAGE and UNIT_DATA_POST_DAMAGE_DURATION. */
  postDamage?: number;
  postDamageDurationMs?: number;
  /** APK GameDesignData UNIT_DATA_POISON_DAMAGE and UNIT_DATA_POISON_DURATION. */
  poisonDamage?: number;
  poisonDurationMs?: number;
  rangeFine: number;
  reloadTimeMs: number;
  projectileSpeed: number;
  damageStyle: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Original GameDesignData AOE radius in fine units; absent or zero means single-target damage. */
  areaDamageFine?: number;
  specialReloadTimeMs?: number;
  specialReloadFrequency?: number;
}

export type CampaignEnemyType = 1 | 2 | 3 | 4 | 5 | 6 | 8;

export interface PreviewEnemyDefinition {
  hitPoints: number;
  cashReward: number;
  penetration: Readonly<Record<DamageType, number>>;
  turningDurationMs?: number;
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

export interface WaveRouteDefinition {
  spawn: WaveSpawn;
  redirects: readonly WaveRedirect[];
  exit: { x: number; y: number };
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
  /** Separate route chains for maps whose action-1 fields do not share one path. */
  routes?: readonly WaveRouteDefinition[];
  enemy?: PreviewEnemyDefinition;
  baseEnemySpeed: number;
  speedMultiplierMin: number;
  speedMultiplierCount: number;
  escapePenalty: number;
  redirects: readonly WaveRedirect[];
  exit: { x: number; y: number };
  additionalExits?: readonly { x: number; y: number }[];
}

export interface CampaignSpawnPoolDefinition {
  spawnPointId: number;
  /** Base retry interval before the generated enemy type multiplier is applied. */
  intervalMs: number;
  intervalMultiplier?: number;
  /** Remaining request counts for original pool types 2 through 11, in order. */
  requests: readonly number[];
}

export interface CampaignWaveDefinition {
  number: number;
  /** Original delay before this wave's first spawn; applied to every pool in the wave. */
  delayMs?: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly CampaignSpawnPoolDefinition[];
}

export interface CampaignUnitPoolUnitDefinition {
  /** Original SpawnPoolManager.units[] index, from 0 through 36. */
  poolType: number;
  unitType: string;
  /** Original GameObjectSpawnLocation.unit kind that accepts this pool type. */
  spawnLocationType: SpawnLocationType;
}

export interface CampaignUnitSpawnLocationDefinition {
  id: string;
  /** Original GameObjectSpawnLocation.unit kind; -1 accepts any pool type. */
  spawnLocationType: SpawnLocationType | -1;
  cell: { x: number; y: number };
}

export interface CampaignUnitPoolActionDefinition {
  waveNumber: number;
  poolType: number;
  action: 'add' | 'set' | 'add-max' | 'set-max';
  count: number;
}

export interface CampaignUnitPoolDefinition {
  /** Global SpawnPoolManager interval; it starts when the scene is created. */
  intervalMs: number;
  units: readonly CampaignUnitPoolUnitDefinition[];
  spawnLocations: readonly CampaignUnitSpawnLocationDefinition[];
  actions: readonly CampaignUnitPoolActionDefinition[];
}

export interface GamblerScenarioDefinition {
  /** Prize unit types unlocked in this level/profile snapshot. */
  unlockedPrizeUnitTypes: readonly GamblerUnitType[];
  /** GameDesignData.LEVEL_DATA_GAMBLER_TIME, in simulation milliseconds. */
  cooldownMs: number;
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
    decorations?: readonly MapDecoration[];
    /** Original TDM terrain values for source-faithful HUD minimap rendering. */
    originalTileGrid?: readonly (readonly number[])[];
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
  /** Optional original player-unit spawn pool, separate from enemy wave request pools. */
  campaignUnitPool?: CampaignUnitPoolDefinition;
  /** Optional scene-level pool of the original moving-unit bonus crates. */
  campaignBonusCratePool?: CampaignBonusCrateDefinition;
  gambler?: GamblerScenarioDefinition;
  /** Base type-1/type-2 settler data before level, wave, and dynamic-difficulty multipliers. */
  campaignEnemy?: PreviewEnemyDefinition;
  /** Type-specific campaign enemy designs; unset entries use the settler design. */
  campaignEnemyByType?: Partial<Readonly<Record<CampaignEnemyType, PreviewEnemyDefinition>>>;
}

export type GameIntent =
  | { type: 'select-at'; x: number; y: number }
  | { type: 'move-unit'; targetX: number; targetY: number }
  | { type: 'stop-moving' }
  | { type: 'clear-selection' }
  | { type: 'start-wave' }
  | { type: 'recruit-unit'; unitType: string; commandId: string }
  | { type: 'hire-map-unit'; unitId: string; commandId: string }
  | { type: 'upgrade-unit'; unitId: string; commandId: string }
  | { type: 'play-gambler'; unitId: string; commandId: string };

export interface GamblerRoundView {
  id: string;
  stake: number;
  outcome: GamblerOutcome;
  templateIndex: number;
  cards: readonly GamblerCardView[];
}

export interface GamblerStateView {
  completedGames: number;
  nextStake: number;
  cooldownRemainingMs: number;
  lastRound?: GamblerRoundView;
  pendingPrize?: { unitType: GamblerUnitType; remainingMs: number };
}

export interface UnitView extends ScenarioUnit {
  sleepingAnimationFrame?: number;
  selected: boolean;
  bonus?: { type: 3 | 4; remainingMs: number };
  moving: boolean;
  positionFine: { x: number; y: number };
  walkingAnimation?: {
    frame: 0 | 1 | 2;
    row: 0 | 1 | 2 | 3 | 4;
    mirrored: boolean;
  };
  /** Effective target radius and origin used by Game's strict outer-range check. */
  attackRange?: {
    centerTenthTiles: { x: number; y: number };
    maximumTenthTiles: number;
    boundary: 'exclusive' | 'inclusive';
  };
  upgradeLevel: number;
  nextUpgrade?: UnitUpgradeDefinition;
  gambler?: GamblerStateView;
  shootingAnimation?: {
    asset: string;
    frame: number;
    row: number;
    mirrored: boolean;
  };
  /** Persistent facing used by the Tech Town Gatling overlay between shots. */
  weaponFacing?: { row: number; mirrored: boolean };
  steamClouds?: readonly SteamCloudView[];
}

export interface SteamCloudView {
  id: string;
  positionFine: { x: number; y: number };
  remainingMs: number;
  animationFrame: number;
}

export interface EnemyView {
  id: string;
  type: CampaignEnemyType;
  asset: 'pioneer_male' | 'pioneer_female' | 'horseman' | 'wagon' | 'stagecoach' | 'goldtransport' | 'horse_wagon' | 'horse_wagon_white';
  speed: number;
  direction: Direction;
  /** APK mirror state persists through vertical movement until a horizontal leg or turn changes it. */
  mirrored?: boolean;
  positionFine: { x: number; y: number };
  drawingOffsetFine?: { x: number; y: number };
  groupId?: string;
  damageable?: boolean;
  turningAnimation?: { asset: 'horseman_turn' | 'wagon_turn' | 'stagecoach_turn' | 'goldtransport_turn' | 'horse_wagon_turn' | 'horse_wagon_turn_white'; frame: 0 | 1; mirrored: boolean };
  hitPoints: number;
  maxHitPoints: number;
  /** Present while the original EnemyDirector poison flag is set. */
  poisoned?: true;
  /** Strongest active UNIT_DATA_POISON_DAMAGE value. */
  poisonDamage?: number;
  alive: boolean;
  deathRemainingMs: number;
  animationFrame: number;
}

export interface WagonDebrisView {
  id: string;
  positionFine: { x: number; y: number };
  /** Original GameObjectWagonParts fineY; fragments move independently but keep their parent draw depth. */
  depthFineY: number;
  heightFine: number;
  frame: number;
}

export interface BonusCrateView {
  id: string;
  cell: { x: number; y: number };
  positionFine: { x: number; y: number };
  rewardType: CampaignBonusRewardType;
  phase: CampaignBonusCrate['phase'];
  animationFrame: number;
}

export interface BonusNoticeView {
  rewardType: CampaignBonusRewardType;
  remainingMs: number;
}

export interface BonusCratePoolView {
  remainingMs: number;
  remainingCount: number;
  nextNumber: number;
}

export interface ShotView {
  id: string;
  shooterId: string;
  targetId: string;
  positionFine: { x: number; y: number };
  remainingMs: number;
  damageStyle: UnitWeaponDefinition['damageStyle'];
  /** Original fineZ draw-order bucket: 0 is behind roads, 7680 is in front. */
  fineZ: 0 | 7680;
  /** Original vertical arc offset, in fine coordinates above the ground anchor. */
  heightFine: number;
  imageAsset?: 'sfx_mexican_dynamite' | 'sfx_pyromaniac_rocket' | 'sfx_salesman_bottle' | 'sfx_poison' | 'sfx_rocket_explosion';
  animationFrame: number;
  explosionRemainingMs?: number;
}

export interface RocketSparkleView {
  id: string;
  positionFine: { x: number; y: number };
  remainingMs: number;
  animationFrame: number;
  fineZ: 0 | 7680;
}

export type GameEvent =
  | { type: 'enemy-group-spawned'; enemyIds: readonly string[]; waveNumber: number; spawnPointId: number; requestType: number; groupSize: number }
  | { type: 'enemy-hit'; enemyId: string; damage: number; hitPoints: number }
  | { type: 'enemy-defeated'; enemyId: string; enemyType?: CampaignEnemyType; cashReward: number }
  | { type: 'unit-fired'; unitId: string; targetId: string; specialReload: boolean }
  | {
    type: 'sound-requested';
    sound: 'sound_revolver' | 'sound_dynamite' | 'sound_wagon_explode' | UnitShotSound;
    positionFine: { x: number; y: number };
  }
  | { type: 'sound-requested'; sound: UnitHireSound | UnitSelectionSound | 'sound_level_up' }
  | { type: 'bonus-crate-collected'; crateId: string; unitId: string; rewardType: CampaignBonusRewardType }
  | { type: 'shot-exploded'; shotId: string; targetId: string; affectedEnemyIds: readonly string[] }
  | { type: 'wave-cleared'; waveNumber: number; escapedEnemies: number; defeatedEnemies: number }
  | { type: 'unit-recruited'; unitType: string; price: number; count: number }
  | { type: 'unit-recruitment-rejected'; unitType: string; reason: 'insufficient-funds'; price: number; availableCash: number }
  | { type: 'map-unit-hired'; unitId: string; unitType: string; price: number }
  | { type: 'map-unit-hire-rejected'; unitId: string; unitType: string; reason: 'insufficient-funds'; price: number; availableCash: number }
  | { type: 'gambler-round-played'; unitId: string; round: GamblerRoundView; cashAfterRound: number }
  | {
    type: 'gambler-round-rejected';
    unitId: string;
    reason: 'insufficient-funds' | 'cooldown';
    stake: number;
    availableCash: number;
    cooldownRemainingMs: number;
  }
  | { type: 'gambler-prize-spawned'; gamblerId: string; unitId: string; unitType: GamblerUnitType; cell: { x: number; y: number } }
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
  /** Initial lives for this level, used to render the original sheriff-star meter. */
  maxLives?: number;
  escapedEnemies: number;
  defeatedEnemies: number;
  cash: number;
  activeEnemies: number;
  pendingSpawnRequests?: number;
  /** Active campaign spawn entrances, projected for original wave-direction indicators. */
  spawnIndicators?: readonly WaveSpawnIndicatorView[];
  dynamicDifficulty?: number;
  settlement?: WaveSettlement;
}

export interface WaveSpawnIndicatorView {
  spawnPointId: number;
  cell: { x: number; y: number };
  direction: Direction;
  boss: boolean;
}

export interface GameView {
  frame: number;
  elapsedMs: number;
  paused: boolean;
  scenarioId: string;
  map: ScenarioContent['map'];
  /** Read-only route centerline for learning and rendering overlays. */
  route?: readonly RoutePoint[];
  /** Route centerlines for maps with independent attack lanes. */
  routes?: readonly (readonly RoutePoint[])[];
  units: readonly UnitView[];
  enemies: readonly EnemyView[];
  /** Live enemy chosen by the player as the preferred attack target. */
  priorityTargetId?: string;
  wagonDebris?: readonly WagonDebrisView[];
  bonusCrates?: readonly BonusCrateView[];
  bonusCratePool?: BonusCratePoolView;
  bonusNotice?: BonusNoticeView;
  shots: readonly ShotView[];
  rocketSparkles?: readonly RocketSparkleView[];
  /** Stable object keys in the original shared depth queue order. */
  drawOrder: readonly string[];
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
  singleStep(input?: { deltaMs?: number; tileSizePixels?: number }): GameView;
  advance(input?: { deltaMs?: number; tileSizePixels?: number }): GameView;
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
  type: CampaignEnemyType;
  asset: EnemyView['asset'];
  speed: number;
  direction: Direction;
  mirrored: boolean;
  positionFine: { x: number; y: number };
  collisionStartOffsetFine?: number;
  drawingOffsetFine: { x: number; y: number };
  groupId: string;
  damageable: boolean;
  turningDurationMs: number;
  turningRemainingMs: number;
  turningImageActive: boolean;
  turningFrame: 0 | 1;
  turningMirrored: boolean;
  wagonPartsCreated: boolean;
  hitPoints: number;
  maxHitPoints: number;
  damageOverTime: number;
  damageOverTimeRemainingMs: number;
  poisoned: boolean;
  poisonDamage: number;
  cashReward: number;
  penetration: Readonly<Record<DamageType, number>>;
  alive: boolean;
  deathRemainingMs: number;
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
  postDamage: number;
  postDamageDurationMs: number;
  poisonDamage: number;
  poisonDurationMs: number;
  poisonRemainingMs: number;
  damageStyle: UnitWeaponDefinition['damageStyle'];
  areaDamageFine: number;
  imageAsset: ShotView['imageAsset'];
  animationFrame: number;
  startFine: { x: number; y: number };
  /** Last target draw position; the APK keeps its target reference after enemy-list cleanup. */
  targetPositionFine: { x: number; y: number };
  positionFine: { x: number; y: number };
  /** Cow Gulch player units inherit the original above-road fineZ at projectile creation. */
  fineZ: 0 | 7680;
  /** Applied at the next simulation frame, after the current frame was drawn. */
  fineZTransitionPending: boolean;
  totalTravelTimeMs: number;
  remainingMs: number;
  impactResolved: boolean;
  explosionRemainingMs: number;
  rocket?: MutableRocketFlight;
}

interface MutableRocketFlight {
  hasJumped: boolean;
  speedMs: number;
  endFine: { x: number; y: number };
  maxRangeTenthTiles: number;
  normal: { x: number; y: number };
  zigZagFactor: number;
  lastBurstFine: { x: number; y: number };
  damageDone: boolean;
}

interface MutableRocketSparkle extends RocketSparkleView {
  id: string;
}

interface MutableCampaignSpawnPool {
  spawnPointId: number;
  intervalMs: number;
  intervalMultiplier?: number;
  delayMs: number;
  requests: number[];
}

interface MutableSpawnField {
  cell: { x: number; y: number };
  positionFine: { x: number; y: number };
  direction: Direction;
}

interface MutableWagonPart {
  id: string;
  positionFine: { x: number; y: number };
  depthFineY: number;
  heightFine: number;
  xDirection: number;
  yDirection: number;
  zDirection: number;
  frame: number;
}

interface MutableUnit {
  definition: ScenarioUnit;
  selected: boolean;
  positionFine: { x: number; y: number };
  movementTargetFine?: { x: number; y: number };
  upgradeLevel: number;
  movementSpeedFinePer100Ms: number;
  bonusAttribute?: 3 | 4;
  bonusRemainingMs?: number;
  weapon?: UnitWeaponDefinition;
  weaponCooldownMs: number;
  shotsUntilSpecialReload: number;
  shootingAnimationElapsedMs?: number;
  shootingAnimationFrame?: number;
  shootingDirection?: { x: -1 | 0 | 1; y: -1 | 0 | 1 };
  weaponFacingDirection?: { x: -1 | 0 | 1; y: -1 | 0 | 1 };
  walkingAnimationStep: number;
  walkingAnimation?: NonNullable<UnitView['walkingAnimation']>;
  steamEmitter?: MutableSteamEmitter;
  gambler?: MutableGamblerState;
}

interface MutableSteamEmitter {
  nextCloudCounterMs: number;
  nextCloudNumber: number;
  clouds: SteamCloudView[];
}

interface MutableGamblerState {
  completedGames: number;
  cooldownRemainingMs: number;
  casinoCell: { x: number; y: number };
  lastRound?: GamblerRoundView;
  pendingPrize?: {
    unitType: GamblerUnitType;
    remainingMs: number;
    unitId: string;
  };
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
  /** UnitDirector and EnemyDirector keep independent original poison clocks. */
  poisonApplicationTimerMs: number;
  poisonDamageTimerMs: number;
  rocketSparkles: MutableRocketSparkle[];
  recruitPool: Record<string, number>;
  events: GameEvent[];
  campaignSpawnPools?: MutableCampaignSpawnPool[];
  wagonDebris: MutableWagonPart[];
  dynamicDifficulty?: number;
  difficultyValue?: number;
  difficultyValueCounter?: number;
}

interface MutableBonusNotice {
  rewardType: CampaignBonusRewardType;
  remainingMs: number;
}

function drawOrderEntries(
  scenario: ScenarioContent,
  units: readonly MutableUnit[],
  wave: MutableWave | undefined,
  bonusCrates: readonly CampaignBonusCrate[],
): DrawOrderEntry[] {
  const decorations = (scenario.map.decorations ?? []).map((decoration, index): DrawOrderEntry => ({
    id: `decoration:${index}`,
    kind: 'decoration',
    cell: decoration.cell,
    depth: ((decoration.cell.y + 1 + (decoration.anchorOffsetY ?? 0)) * FINE_UNITS_PER_CELL)
      + GAME_DRAW_ORDER_ROAD_CUTOFF,
  }));
  const unitEntries = units.map((unit): DrawOrderEntry => ({
    id: `unit:${unit.definition.id}`,
    kind: 'unit',
    cell: {
      x: Math.floor(unit.positionFine.x / FINE_UNITS_PER_CELL),
      y: Math.floor((unit.positionFine.y - FIELD_CENTER_HALF) / FINE_UNITS_PER_CELL),
    },
    depth: unit.positionFine.y + GAME_DRAW_ORDER_ROAD_CUTOFF,
  }));
  const mapObjects = [...decorations, ...unitEntries].sort((left, right) => (
    left.cell!.y - right.cell!.y || left.cell!.x - right.cell!.x
  ));
  const enemies = (wave?.enemies ?? []).map((enemy): DrawOrderEntry => ({
    id: `enemy:${enemy.id}`,
    kind: 'enemy',
    depth: enemy.positionFine.y + enemy.drawingOffsetFine.y,
  }));
  const shots = (wave?.shots ?? []).map((shot): DrawOrderEntry => ({
    id: `shot:${shot.id}`,
    kind: 'shot',
    depth: shot.positionFine.y + (shot.fineZ * 100),
  }));
  const rocketSparkles = (wave?.rocketSparkles ?? []).map((sparkle): DrawOrderEntry => ({
    id: `rocket-sparkle:${sparkle.id}`,
    kind: 'shot',
    depth: sparkle.positionFine.y + (sparkle.fineZ * 100),
  }));
  const wagonDebris = (wave?.wagonDebris ?? []).map((part): DrawOrderEntry => ({
    id: `wagon-debris:${part.id}`,
    kind: 'wagon-debris',
    depth: part.depthFineY + GAME_DRAW_ORDER_ROAD_CUTOFF,
  }));
  const collectables = bonusCrates.map((crate): DrawOrderEntry => ({
    id: `bonus-crate:${crate.id}`,
    kind: 'collectable',
    depth: crate.positionFine.y + (7_680 * 100),
  }));

  return [...mapObjects, ...enemies, ...shots, ...rocketSparkles, ...wagonDebris, ...collectables];
}

const FINE_UNITS_PER_CELL = 7680;
const FIELD_CENTER_OFFSET = 15360;
const FIELD_CENTER_HALF = 3840;
const UNIT_PLACEMENT_OFFSET_Y = 1920;
const TRAIN_STEAM_CLOUD_OFFSET_X_FINE = 103;
const TRAIN_STEAM_CLOUD_OFFSET_Y_FINE = -7584;
const TRAIN_STEAM_CLOUD_SPEED_FINE_PER_100_MS = 600;
const TRAIN_STEAM_CLOUD_LIFETIME_MS = 1499;
const GAMBLER_UNIT_TYPE_NAMES: Readonly<Record<GamblerUnitType, string>> = Object.freeze({
  1: 'gunslinger',
  2: 'mexican',
  3: 'cannon',
  4: 'indian',
  5: 'sniper',
  6: 'grandpa',
  35: 'pyromaniac',
  36: 'salesman',
});
const UNIT_COLLIDER_START_X = -2534;
const UNIT_COLLIDER_START_Y = -5376;
const UNIT_COLLIDER_WIDTH = 5068;
const UNIT_COLLIDER_HEIGHT = 4608;
const BONUS_CRATE_COLLIDER_START_X = -2534;
const BONUS_CRATE_COLLIDER_START_Y = -4608;
const BONUS_CRATE_COLLIDER_WIDTH = 5068;
const BONUS_CRATE_COLLIDER_HEIGHT = 4224;
const UNIT_STOP_TOLERANCE_FINE = 2400;
const MAX_DELTA_MS = 100;
const REFERENCE_VIEWPORT_WIDTH = 1024;
// APK GameDesignOptics.animationWalkDefault, with inclusive distance thresholds selected using strict >.
const PLAYER_WALK_ANIMATION_CYCLE_FINE = 6144;
const PLAYER_WALK_ANIMATION_FRAME_THRESHOLDS = [1536, 3072, 4608] as const;
const PLAYER_WALK_ANIMATION_FRAMES = [0, 1, 0, 2] as const;
type ShootingAnimationFrame = readonly [frame: number, endMs: number];
const PLAYER_SHOOTING_ANIMATIONS: Readonly<Record<string, {
  asset: string;
  frames: readonly ShootingAnimationFrame[];
}>> = {
  gunslinger: { asset: 'player_gunslinger_shot', frames: [[0, 100], [1, 200], [0, 1000]] },
  mexican: { asset: 'player_mexican_shot', frames: [[0, 200], [1, 400]] },
  cannon: { asset: 'player_cannon_shot', frames: [[0, 100], [1, 200]] },
  indian: { asset: 'player_indian_shot', frames: [[0, 100], [1, 300], [0, 1500]] },
  sniper: { asset: 'player_scout_shot', frames: [[0, 100], [1, 300], [0, 1500]] },
  grandpa: { asset: 'player_geezer_shot', frames: [[0, 100], [1, 300], [0, 1500]] },
  pyromaniac: { asset: 'player_pyromaniac_shot', frames: [[0, 100], [1, 300], [0, 1500]] },
  salesman: { asset: 'player_salesman_shot', frames: [[0, 100], [1, 300], [0, 1500]] },
  'train-12': { asset: 'player_gatling_shot', frames: [[0, 50], [1, 100]] },
};
const ENEMY_WALK_ANIMATION_CYCLE_FINE = 3072;
const ENEMY_WALK_ANIMATION_FRAMES: Readonly<Record<CampaignEnemyType, readonly (readonly [frame: number, inclusiveDistanceFine: number])[]>> = {
  1: [[0, 768], [1, 1536], [0, 2304], [2, 3072]],
  2: [[0, 768], [1, 1536], [0, 2304], [2, 3072]],
  3: [[0, 768], [1, 1536], [2, 2304], [3, 3072]],
  4: [[0, 768], [1, 1536], [0, 2304], [2, 3072]],
  5: [[0, 768], [1, 1536], [0, 2304], [2, 3072]],
  6: [[0, 768], [1, 1536], [0, 2304], [2, 3072]],
  8: [[0, 768], [1, 1536], [2, 2304], [3, 3072]],
};

function enemyWalkAnimationFrame(type: CampaignEnemyType, distanceFine: number): number {
  const frame = ENEMY_WALK_ANIMATION_FRAMES[type].find(([, endFine]) => distanceFine <= endFine);
  return frame?.[0] ?? 0;
}

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
  'postDamage',
  'postDamageDurationMs',
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

function resolveGamblerCasinoCells(scenario: ScenarioContent): Map<string, { x: number; y: number }> {
  const gamblers = scenario.units.filter(({ type }) => type === 'gambler')
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
  const casinos = (scenario.map.decorations ?? []).filter(({ asset }) => asset === 'b_3x2_casino')
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);

  if (!scenario.gambler) {
    if (gamblers.length > 0 || casinos.length > 0) {
      throw new GameOpenError('scenario-unavailable', 'Gambler and Casino content requires explicit wager rules');
    }
    return new Map();
  }

  const { unlockedPrizeUnitTypes, cooldownMs } = scenario.gambler;
  const validPrizeTypes = new Set<number>(Object.keys(GAMBLER_UNIT_TYPE_NAMES).map(Number));
  const isValidPrizeType = (value: unknown): value is GamblerUnitType => (
    typeof value === 'number' && validPrizeTypes.has(value)
  );
  const prizeTypes: readonly unknown[] = unlockedPrizeUnitTypes;
  if (!Array.isArray(unlockedPrizeUnitTypes)
    || !Number.isSafeInteger(cooldownMs) || cooldownMs < 0
    || prizeTypes.some((unitType, index) => (
      !isValidPrizeType(unitType)
      || prizeTypes.indexOf(unitType) !== index
      || !scenario.units.some((unit) => unit.type === GAMBLER_UNIT_TYPE_NAMES[unitType])
    ))
    || gamblers.length === 0
    || casinos.length !== gamblers.length
    || gamblers.some(({ activity }) => activity !== 5)
    || casinos.some(({ cell }) => (
      !Number.isSafeInteger(cell.x) || !Number.isSafeInteger(cell.y)
      || cell.x < 0 || cell.x >= scenario.map.width
      || cell.y < 0 || cell.y >= scenario.map.height
    ))) {
    throw new GameOpenError('scenario-unavailable', 'Gambler prize, cooldown, or Casino pair data is invalid');
  }

  return new Map(gamblers.map((unit, index) => [unit.id, { ...casinos[index]!.cell }]));
}

function isActivePlayerUnit(unit: MutableUnit): boolean {
  return unit.definition.activity !== 4;
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

function updateSteamEmitter(unit: MutableUnit, deltaMs: number, utilRandom: JavaUtilRandom): void {
  const emitter = unit.steamEmitter;
  if (!emitter || deltaMs <= 0) return;

  emitter.nextCloudCounterMs = Math.trunc(
    emitter.nextCloudCounterMs - (deltaMs * (unit.movementTargetFine ? 2 : 1)),
  );
  if (emitter.nextCloudCounterMs <= 0) {
    emitter.clouds.push({
      id: `${unit.definition.id}-steam-${emitter.nextCloudNumber}`,
      positionFine: {
        x: unit.positionFine.x + TRAIN_STEAM_CLOUD_OFFSET_X_FINE,
        y: unit.positionFine.y + TRAIN_STEAM_CLOUD_OFFSET_Y_FINE,
      },
      remainingMs: TRAIN_STEAM_CLOUD_LIFETIME_MS,
      animationFrame: 0,
    });
    emitter.nextCloudNumber += 1;
    emitter.nextCloudCounterMs = 500 + utilRandom.nextInt(250);
  }

  for (const cloud of emitter.clouds) {
    cloud.remainingMs = Math.trunc(cloud.remainingMs - deltaMs);
    cloud.positionFine.y = Math.trunc(
      cloud.positionFine.y - ((deltaMs * TRAIN_STEAM_CLOUD_SPEED_FINE_PER_100_MS) / 100),
    );
    cloud.animationFrame = Math.max(0, Math.min(4, 4 - Math.trunc(cloud.remainingMs / 300)));
  }
  emitter.clouds = emitter.clouds.filter(({ remainingMs }) => remainingMs > 0);
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
    ...(definition.activity === 4 && definition.showSleepingEffect !== false
      ? { sleepingAnimationFrame: Math.floor(elapsedMs / 200) % 3 }
      : {}),
    movementSpeedFinePer100Ms: unit.movementSpeedFinePer100Ms,
    ...(unit.weapon ? { weapon: clone(unit.weapon) } : {}),
    ...(unit.bonusAttribute !== undefined ? {
      bonus: {
        type: unit.bonusAttribute,
        remainingMs: Math.max(0, unit.bonusRemainingMs ?? 0),
      },
    } : {}),
    cell: {
      x: Math.floor(positionFine.x / FINE_UNITS_PER_CELL),
      y: Math.floor((positionFine.y - FIELD_CENTER_HALF) / FINE_UNITS_PER_CELL),
    },
    render,
    hitArea,
    selected: unit.selected,
    moving: unit.movementTargetFine !== undefined,
    positionFine: { ...positionFine },
    ...(unit.steamEmitter ? {
      steamClouds: unit.steamEmitter.clouds.map(({ id, positionFine: cloudPosition, remainingMs, animationFrame }) => ({
        id,
        positionFine: { ...cloudPosition },
        remainingMs,
        animationFrame,
      })),
    } : {}),
    ...(unit.walkingAnimation ? { walkingAnimation: { ...unit.walkingAnimation } } : {}),
    ...(unit.weapon ? {
      attackRange: {
        centerTenthTiles: unitAttackCenterTenthTiles(unit),
        maximumTenthTiles: unitMaximumRangeTenthTiles(unit),
        boundary: 'exclusive' as const,
      },
    } : {}),
    upgradeLevel: unit.upgradeLevel,
    ...(unit.gambler ? {
      gambler: {
        completedGames: unit.gambler.completedGames,
        nextStake: getGamblerStake(unit.gambler.completedGames),
        cooldownRemainingMs: Math.max(0, unit.gambler.cooldownRemainingMs),
        ...(unit.gambler.lastRound ? { lastRound: clone(unit.gambler.lastRound) } : {}),
        ...(unit.gambler.pendingPrize ? {
          pendingPrize: {
            unitType: unit.gambler.pendingPrize.unitType,
            remainingMs: Math.max(0, unit.gambler.pendingPrize.remainingMs),
          },
        } : {}),
      },
    } : {}),
    ...(shootingAnimation ? { shootingAnimation } : {}),
    ...(definition.type === 'train-12' ? {
      weaponFacing: unit.weaponFacingDirection
        ? weaponFacingView(unit.weaponFacingDirection)
        : { row: 1, mirrored: false },
    } : {}),
    ...(upgrade ? { nextUpgrade: clone(upgrade) } : {}),
  };
}

function campaignSpawnedUnit(template: ScenarioUnit, spawn: SpawnedCampaignUnit): MutableUnit {
  const offsetX = spawn.cell.x - template.cell.x;
  const offsetY = spawn.cell.y - template.cell.y;
  const relocate = (rectangle: Rectangle): Rectangle => ({
    ...rectangle,
    x: rectangle.x + offsetX,
    y: rectangle.y + offsetY,
  });
  const render = relocate(template.awakeRender ?? template.render);
  const hitArea = relocate(template.awakeHitArea ?? template.hitArea);
  const definition: ScenarioUnit = {
    ...clone(template),
    id: spawn.id,
    activity: 2,
    cell: { ...spawn.cell },
    asset: template.awakeAsset ?? template.asset,
    frame: clone(template.awakeFrame ?? template.frame),
    render,
    hitArea,
    ...(template.awakeRender ? { awakeRender: relocate(template.awakeRender) } : {}),
    ...(template.awakeHitArea ? { awakeHitArea: relocate(template.awakeHitArea) } : {}),
  };
  const weapon = definition.weapon ? clone(definition.weapon) : undefined;
  return {
    definition,
    selected: false,
    positionFine: { ...spawn.positionFine },
    upgradeLevel: 0,
    movementSpeedFinePer100Ms: definition.movementSpeedFinePer100Ms,
    walkingAnimationStep: 0,
    ...(weapon ? { weapon } : {}),
    weaponCooldownMs: weapon ? Math.trunc(weapon.reloadTimeMs / 2) : 0,
    shotsUntilSpecialReload: weapon?.specialReloadFrequency ?? 0,
  };
}

function gamblerPrizeUnit(
  template: ScenarioUnit,
  unitType: GamblerUnitType,
  unitId: string,
  cell: { x: number; y: number },
): MutableUnit {
  const spawned = campaignSpawnedUnit(template, {
    poolType: unitType,
    unitType: GAMBLER_UNIT_TYPE_NAMES[unitType],
    id: unitId,
    cell,
    positionFine: initialUnitPosition({ ...template, cell }),
  });
  spawned.definition.activity = 5;
  delete spawned.definition.hirePrice;
  return spawned;
}

function weaponFacingView(direction: { x: -1 | 0 | 1; y: -1 | 0 | 1 }): { row: number; mirrored: boolean } {
  let row: number;
  if (direction.y < 0 && direction.x === 0) row = 4;
  else if (direction.y > 0 && direction.x === 0) row = 3;
  else if (direction.y < 0) row = 2;
  else if (direction.y > 0) row = 0;
  else row = 1;
  return { row, mirrored: direction.x > 0 };
}

function shootingAnimationView(unit: MutableUnit): UnitView['shootingAnimation'] {
  const direction = unit.shootingDirection;
  if (unit.shootingAnimationElapsedMs === undefined || unit.shootingAnimationFrame === undefined || !direction) return undefined;

  const animation = PLAYER_SHOOTING_ANIMATIONS[unit.definition.type];
  if (!animation) return undefined;

  return {
    asset: animation.asset,
    frame: unit.shootingAnimationFrame,
    ...weaponFacingView(direction),
  };
}

function advanceShootingAnimation(unit: MutableUnit, deltaMs: number, didMove: boolean): void {
  if (unit.shootingAnimationElapsedMs === undefined) return;
  if (didMove) {
    unit.shootingAnimationElapsedMs = undefined;
    unit.shootingAnimationFrame = undefined;
    unit.shootingDirection = undefined;
    return;
  }

  const animation = PLAYER_SHOOTING_ANIMATIONS[unit.definition.type];
  if (!animation) {
    unit.shootingAnimationElapsedMs = undefined;
    unit.shootingAnimationFrame = undefined;
    unit.shootingDirection = undefined;
    return;
  }

  const frames = animation.frames;
  let frameIndex = 0;
  while (frameIndex < frames.length - 1 && unit.shootingAnimationElapsedMs > frames[frameIndex]![1]) {
    frameIndex += 1;
  }
  unit.shootingAnimationFrame = frames[frameIndex]![0];
  unit.shootingAnimationElapsedMs = Math.trunc(unit.shootingAnimationElapsedMs + deltaMs);
  const maximumDuration = frames[frames.length - 1]![1];
  if (unit.shootingAnimationElapsedMs > maximumDuration) {
    unit.shootingAnimationElapsedMs = undefined;
    unit.shootingAnimationFrame = undefined;
    unit.shootingDirection = undefined;
  }
}

function advanceWalkingAnimation(unit: MutableUnit, deltaX: number, deltaY: number): void {
  if (!PLAYER_SHOOTING_ANIMATIONS[unit.definition.type] || (deltaX === 0 && deltaY === 0)) return;

  const horizontalDistance = Math.abs(deltaX);
  const verticalDistance = Math.abs(deltaY);
  unit.walkingAnimationStep = (unit.walkingAnimationStep
    + (horizontalDistance >= verticalDistance ? horizontalDistance : verticalDistance)) % PLAYER_WALK_ANIMATION_CYCLE_FINE;

  // Android's source uses integer division here; Math.trunc preserves its odd-distance boundaries.
  let frameIndex = 0;
  while (frameIndex < PLAYER_WALK_ANIMATION_FRAME_THRESHOLDS.length
    && unit.walkingAnimationStep > PLAYER_WALK_ANIMATION_FRAME_THRESHOLDS[frameIndex]!) {
    frameIndex += 1;
  }

  let row: 0 | 1 | 2 | 3 | 4;
  let mirrored = false;
  if (horizontalDistance > verticalDistance) {
    if (deltaX > 0) {
      row = 1;
      mirrored = true;
      if (deltaY < Math.trunc(-deltaX / 2)) row = 2;
      if (deltaY > Math.trunc(deltaX / 2)) row = 0;
    } else {
      row = 1;
      if (deltaY > Math.trunc(-deltaX / 2)) row = 0;
      if (deltaY < Math.trunc(deltaX / 2)) row = 2;
    }
  } else if (deltaY > 0) {
    row = 3;
    if (deltaX < Math.trunc(-deltaY / 2)) row = 0;
    if (deltaX > Math.trunc(deltaY / 2)) {
      row = 0;
      mirrored = true;
    }
  } else {
    row = 4;
    if (deltaX < Math.trunc(deltaY / 2)) row = 2;
    if (deltaX > Math.trunc(-deltaY / 2)) {
      row = 2;
      mirrored = true;
    }
  }

  unit.walkingAnimation = { frame: PLAYER_WALK_ANIMATION_FRAMES[frameIndex]!, row, mirrored };
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

function mapBlocksUnit(
  scenario: ScenarioContent,
  fineX: number,
  fineY: number,
  collisionBoxFine?: Rectangle,
): boolean {
  const grid = scenario.originalTileGrid;
  const width = scenario.map.width;
  const height = scenario.map.height;
  const collider = collisionBoxFine ?? {
    x: UNIT_COLLIDER_START_X,
    y: UNIT_COLLIDER_START_Y,
    width: UNIT_COLLIDER_WIDTH,
    height: UNIT_COLLIDER_HEIGHT,
  };
  const corners = [
    { x: fineX + collider.x, y: fineY + collider.y },
    { x: fineX + collider.x + collider.width, y: fineY + collider.y + collider.height },
    { x: fineX + collider.x, y: fineY + collider.y + collider.height },
    { x: fineX + collider.x + collider.width, y: fineY + collider.y },
  ];

  for (const corner of corners) {
    const x = Math.floor(corner.x / FINE_UNITS_PER_CELL);
    const y = Math.floor(corner.y / FINE_UNITS_PER_CELL);
    // BackgroundMap.getBackground() returns -1 outside the map; -1 is not a blocking tile.
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    if (!grid) continue;
    const rawTile = grid[y]?.[x];
    if (rawTile === undefined) return true;
    const streetLayerCode = STREET_LAYER_TILES.has(rawTile) ? 16 : 0;
    if (isBackgroundCollisionCode(backgroundCollisionCode(rawTile, grid, x, y)) && streetLayerCode === 0) return true;
  }

  const unitLeft = fineX + collider.x;
  const unitTop = fineY + collider.y;
  const unitRight = unitLeft + collider.width;
  const unitBottom = unitTop + collider.height;
  return (scenario.map.decorations ?? []).some(({ cell, collisionBoxFine }) => {
    if (!collisionBoxFine) return false;
    const decorationLeft = (cell.x * FINE_UNITS_PER_CELL) + collisionBoxFine.x;
    const decorationTop = (cell.y * FINE_UNITS_PER_CELL) + collisionBoxFine.y;
    const decorationRight = decorationLeft + collisionBoxFine.width;
    const decorationBottom = decorationTop + collisionBoxFine.height;
    return unitLeft < decorationRight
      && unitRight > decorationLeft
      && unitTop < decorationBottom
      && unitBottom > decorationTop;
  });
}

function campaignUnitSpawnBlocked(
  scenario: ScenarioContent,
  units: readonly MutableUnit[],
  spawn: { positionFine: { x: number; y: number }; cell: { x: number; y: number } },
): boolean {
  if (mapBlocksUnit(scenario, spawn.positionFine.x, spawn.positionFine.y)) return true;
  const left = spawn.positionFine.x + UNIT_COLLIDER_START_X;
  const top = spawn.positionFine.y + UNIT_COLLIDER_START_Y;
  const right = left + UNIT_COLLIDER_WIDTH;
  const bottom = top + UNIT_COLLIDER_HEIGHT;
  return units.some(({ positionFine }) => {
    const otherLeft = positionFine.x + UNIT_COLLIDER_START_X;
    const otherTop = positionFine.y + UNIT_COLLIDER_START_Y;
    const otherRight = otherLeft + UNIT_COLLIDER_WIDTH;
    const otherBottom = otherTop + UNIT_COLLIDER_HEIGHT;
    return left < otherRight && right > otherLeft && top < otherBottom && bottom > otherTop;
  });
}

function campaignBonusCrateFieldBlocked(
  scenario: ScenarioContent,
  units: readonly MutableUnit[],
  pool: CampaignBonusCratePool | undefined,
  cell: { x: number; y: number },
): boolean {
  return isCampaignBonusCrateFieldBlocked(cell, {
    decorations: scenario.map.decorations ?? [],
    spawnLocations: scenario.campaignUnitPool?.spawnLocations ?? [],
    units: units.map((unit) => ({
      x: Math.floor(unit.positionFine.x / FINE_UNITS_PER_CELL),
      y: Math.floor(unit.positionFine.y / FINE_UNITS_PER_CELL),
    })),
    crates: pool?.crates ?? [],
  });
}

function campaignBonusCrateCandidateAllowed(
  scenario: ScenarioContent,
  units: readonly MutableUnit[],
  pool: CampaignBonusCratePool | undefined,
  cell: { x: number; y: number },
): boolean {
  const grid = scenario.originalTileGrid ?? scenario.map.originalTileGrid;
  const objectCode = grid?.[cell.y]?.[cell.x];
  if (objectCode === undefined) return false;
  const backgroundCode = backgroundCollisionCode(objectCode, grid, cell.x, cell.y);
  return isBonusCrateCandidateAllowed({
    ...cell,
    width: scenario.map.width,
    height: scenario.map.height,
    backgroundWalkable: backgroundCode === 0 || (backgroundCode >= 16 && backgroundCode < 20),
    hasStreet: STREET_LAYER_TILES.has(objectCode),
    objectCode,
    fieldBlocked: campaignBonusCrateFieldBlocked(scenario, units, pool, cell),
  });
}

function unitMovementCrossesBonusCrate(
  previous: { x: number; y: number },
  current: { x: number; y: number },
  crate: CampaignBonusCrate,
): boolean {
  const crateBounds = {
    x: crate.positionFine.x + BONUS_CRATE_COLLIDER_START_X,
    y: crate.positionFine.y + BONUS_CRATE_COLLIDER_START_Y,
    width: BONUS_CRATE_COLLIDER_WIDTH,
    height: BONUS_CRATE_COLLIDER_HEIGHT,
  };
  const horizontalSweep = {
    x: Math.min(previous.x, current.x) + UNIT_COLLIDER_START_X,
    y: previous.y + UNIT_COLLIDER_START_Y,
    width: Math.abs(current.x - previous.x) + UNIT_COLLIDER_WIDTH,
    height: UNIT_COLLIDER_HEIGHT,
  };
  const verticalSweep = {
    x: current.x + UNIT_COLLIDER_START_X,
    y: Math.min(previous.y, current.y) + UNIT_COLLIDER_START_Y,
    width: UNIT_COLLIDER_WIDTH,
    height: Math.abs(current.y - previous.y) + UNIT_COLLIDER_HEIGHT,
  };
  return collisionBoundsOverlap(horizontalSweep, crateBounds)
    || collisionBoundsOverlap(verticalSweep, crateBounds);
}

function playerAxisWithinOriginalMapBounds(
  scenario: ScenarioContent,
  axis: 'x' | 'y',
  coordinateFine: number,
  tileSizePixels: number,
): boolean {
  const edgeMarginFine = Math.trunc(30720 / tileSizePixels);
  if (axis === 'x') {
    return coordinateFine >= 3840 - edgeMarginFine
      && coordinateFine <= (scenario.map.width * FINE_UNITS_PER_CELL) - 3840 + edgeMarginFine;
  }
  return coordinateFine >= FINE_UNITS_PER_CELL - edgeMarginFine
    && coordinateFine <= (scenario.map.height * FINE_UNITS_PER_CELL) + edgeMarginFine;
}

function moveUnit(unit: MutableUnit, scenario: ScenarioContent, deltaMs: number, tileSizePixels: number): void {
  const target = unit.movementTargetFine;
  if (!target || deltaMs === 0) return;

  const dx = target.x - unit.positionFine.x;
  const dy = target.y - unit.positionFine.y;
  if (Math.abs(dx) < UNIT_STOP_TOLERANCE_FINE && Math.abs(dy) < UNIT_STOP_TOLERANCE_FINE) {
    unit.movementTargetFine = undefined;
    return;
  }

  const distance = Math.hypot(dx, dy);
  const speedBonusActive = unit.bonusAttribute === 3 && (unit.bonusRemainingMs ?? 0) > 0;
  const speed = Math.trunc(unit.movementSpeedFinePer100Ms * (speedBonusActive ? 150 : 100) / 100);
  const directionX = Math.round((dx / distance) * speed);
  const directionY = Math.round((dy / distance) * speed);
  const moveX = Math.trunc((directionX * deltaMs) / 100);
  const moveY = Math.trunc((directionY * deltaMs) / 100);
  const nextX = unit.positionFine.x + moveX;
  const nextY = unit.positionFine.y + moveY;

  if (moveX !== 0
    && playerAxisWithinOriginalMapBounds(scenario, 'x', nextX, tileSizePixels)
    && !mapBlocksUnit(scenario, nextX, unit.positionFine.y)) {
    unit.positionFine.x = nextX;
  }
  if (moveY !== 0
    && playerAxisWithinOriginalMapBounds(scenario, 'y', nextY, tileSizePixels)
    && !mapBlocksUnit(scenario, unit.positionFine.x, nextY)) {
    unit.positionFine.y = nextY;
  }
}

function clearGroupMovementTarget(group: readonly MutableUnit[]): void {
  for (const unit of group) unit.movementTargetFine = undefined;
}

function moveUnitGroup(
  group: readonly MutableUnit[],
  leader: MutableUnit,
  scenario: ScenarioContent,
  deltaMs: number,
  tileSizePixels: number,
): void {
  const target = leader.movementTargetFine;
  if (!target || deltaMs === 0) return;
  if (group.some(({ definition }) => definition.movementAxis !== 'horizontal')) {
    clearGroupMovementTarget(group);
    return;
  }

  const dx = target.x - leader.positionFine.x;
  if (Math.abs(dx) < UNIT_STOP_TOLERANCE_FINE) {
    clearGroupMovementTarget(group);
    return;
  }

  const speedBonusActive = leader.bonusAttribute === 3 && (leader.bonusRemainingMs ?? 0) > 0;
  const speed = Math.trunc(leader.movementSpeedFinePer100Ms
    * (speedBonusActive ? 150 : 100) / 100);
  const requestedDelta = Math.trunc((Math.sign(dx) * speed * deltaMs) / 100);
  const deltaX = Math.sign(requestedDelta) * Math.min(Math.abs(dx), Math.abs(requestedDelta));
  if (deltaX === 0) return;

  const blocked = group.some((unit) => {
    const nextX = unit.positionFine.x + deltaX;
    return !playerAxisWithinOriginalMapBounds(scenario, 'x', nextX, tileSizePixels)
      || mapBlocksUnit(scenario, nextX, unit.positionFine.y, unit.definition.collisionBoxFine);
  });
  if (blocked) {
    clearGroupMovementTarget(group);
    return;
  }

  for (const unit of group) unit.positionFine.x += deltaX;
  if (Math.abs(target.x - leader.positionFine.x) < UNIT_STOP_TOLERANCE_FINE) {
    clearGroupMovementTarget(group);
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

function defaultTileSizePixels(scenario: ScenarioContent): number {
  const requestedScale = REFERENCE_VIEWPORT_WIDTH / (scenario.map.width * scenario.map.tileSize);
  const boundedScale = Math.max(0.85, Math.min(2, requestedScale));
  const roundedScale = Math.round(boundedScale * 100) / 100;
  return Math.max(1, Math.trunc(roundedScale * scenario.map.tileSize));
}

function normalizedTileSizePixels(value: number | undefined, scenario: ScenarioContent): number {
  if (value === undefined) return defaultTileSizePixels(scenario);
  if (!Number.isSafeInteger(value) || value < 1 || value > 65_536) {
    throw new RangeError('Tile size in display pixels must be a positive integer no greater than 65536');
  }
  return value;
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
    mirrored: false,
    positionFine: {
      x: ((spawn.cell.x - 2) * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF,
      y: (spawn.cell.y * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF,
    },
    drawingOffsetFine: { x: 0, y: 0 },
    groupId: id,
    damageable: true,
    turningDurationMs: 0,
    turningRemainingMs: 0,
    turningImageActive: false,
    turningFrame: 0,
    turningMirrored: false,
    wagonPartsCreated: false,
    hitPoints,
    maxHitPoints: hitPoints,
    damageOverTime: 0,
    damageOverTimeRemainingMs: 0,
    poisoned: false,
    poisonDamage: 0,
    cashReward: enemyDefinition?.cashReward ?? 0,
    penetration: enemyDefinition?.penetration ?? { light: 0, fire: 0, heavy: 0, poison: 0 },
    alive: true,
    deathRemainingMs: 0,
    animationDistance: 0,
    animationFrame: 0,
    despawnOnNextFieldCounter: 0,
  };
}

function campaignSpawnFields(scenario: ScenarioContent): MutableSpawnField[] {
  return [scenario.previewWave?.spawn, ...(scenario.previewWave?.additionalSpawns ?? [])]
    .filter((spawn): spawn is WaveSpawn => spawn !== undefined)
    .map((spawn) => ({
      cell: { ...spawn.cell },
      positionFine: {
        x: (spawn.cell.x * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF,
        y: (spawn.cell.y * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF,
      },
      direction: spawn.direction,
    }));
}

function campaignSpawnPools(definition: CampaignWaveDefinition, dynamicDifficulty: number, scale: boolean): MutableCampaignSpawnPool[] {
  return definition.spawnPools.map((pool) => ({
    spawnPointId: pool.spawnPointId,
    intervalMs: pool.intervalMs * (pool.intervalMultiplier ?? 1),
    ...(pool.intervalMultiplier !== undefined ? { intervalMultiplier: pool.intervalMultiplier } : {}),
    delayMs: definition.delayMs ?? 0,
    requests: pool.requests.map((count) => {
      if (!scale || count <= 0) return count;
      return Math.max(1, Math.floor(((count * dynamicDifficulty) / 1000) + 0.5));
    }),
  }));
}

function campaignPendingRequests(pools: readonly MutableCampaignSpawnPool[] | undefined): number {
  return pools?.reduce((total, pool) => total + pool.requests.reduce((sum, count) => sum + count, 0), 0) ?? 0;
}

function campaignSpawnIndicators(
  pools: readonly MutableCampaignSpawnPool[] | undefined,
  spawnFields: readonly MutableSpawnField[],
): WaveSpawnIndicatorView[] {
  const activePoints = new Map<number, { boss: boolean }>();
  for (const pool of pools ?? []) {
    if (!pool.requests.some((count) => count > 0)) continue;
    const previous = activePoints.get(pool.spawnPointId);
    activePoints.set(pool.spawnPointId, {
      boss: (previous?.boss ?? false) || (pool.requests[9] ?? 0) > 0,
    });
  }

  return spawnFields.flatMap((spawn, spawnPointId) => {
    const activePoint = activePoints.get(spawnPointId);
    return activePoint === undefined
      ? []
      : [{ spawnPointId, cell: { ...spawn.cell }, direction: spawn.direction, boss: activePoint.boss }];
  });
}

function campaignEnemyDefinition(scenario: ScenarioContent, type: CampaignEnemyType): PreviewEnemyDefinition {
  const typeSpecific = scenario.campaignEnemyByType?.[type];
  if (typeSpecific) return typeSpecific;
  if (type === 5) {
    return { hitPoints: 300, cashReward: 15, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 100 };
  }
  if (type === 6) {
    return { hitPoints: 500, cashReward: 25, penetration: { light: 33, fire: 25, heavy: 100, poison: 100 }, turningDurationMs: 200 };
  }
  if (scenario.campaignEnemy) return scenario.campaignEnemy;
  if (type === 4) {
    return { hitPoints: 200, cashReward: 10, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 200 };
  }
  if (type === 3) {
    return { hitPoints: 60, cashReward: 2, penetration: { light: 100, fire: 50, heavy: 25, poison: 75 }, turningDurationMs: 100 };
  }
  if (type === 8) {
    return { hitPoints: 200, cashReward: 0, penetration: { light: 100, fire: 100, heavy: 100, poison: 100 }, turningDurationMs: 100 };
  }
  return { hitPoints: 1, cashReward: 0, penetration: { light: 0, fire: 0, heavy: 0, poison: 0 } };
}

function campaignEnemyHitPoints(
  scenario: ScenarioContent,
  wave: CampaignWaveDefinition,
  dynamicDifficulty: number,
  difficulty: GameDifficulty,
  type: CampaignEnemyType,
): number {
  const baseHitPoints = campaignEnemyDefinition(scenario, type).hitPoints;
  const levelMultiplier = scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty?.[difficulty] ?? 100;
  const scaledWaveHitPoints = Math.trunc((levelMultiplier * wave.hitPointMultiplierPercent) / 100);
  const hpDifficulty = Math.max(500, Math.min(difficulty === 'easy' ? 1250 : 1500, dynamicDifficulty));
  const hpFactor = Math.trunc((hpDifficulty * scaledWaveHitPoints * 2) / 10);
  return Math.max(1, Math.trunc((baseHitPoints * hpFactor) / 2000));
}

function createCampaignEnemy(
  id: string,
  type: CampaignEnemyType,
  spawn: WaveSpawn,
  positionFine: { x: number; y: number },
  drawingOffsetFine: { x: number; y: number },
  speed: number,
  hitPoints: number,
  definition: PreviewEnemyDefinition,
  groupId: string,
  colorVariant: number,
): MutableEnemy {
  const asset: EnemyView['asset'] = type === 1
    ? 'pioneer_male'
    : type === 2
      ? 'pioneer_female'
      : type === 3
        ? 'horseman'
        : type === 4
          ? 'wagon'
          : type === 5
            ? 'stagecoach'
            : type === 6
              ? 'goldtransport'
              : colorVariant === 1 ? 'horse_wagon' : 'horse_wagon_white';
  return {
    id,
    type,
    asset,
    speed,
    direction: spawn.direction,
    mirrored: false,
    positionFine: { ...positionFine },
    collisionStartOffsetFine: type === 4 || type === 5 || type === 6 || type === 8 ? ENEMY_COLLISION_INITIAL_START_OFFSET_FINE : undefined,
    drawingOffsetFine: { ...drawingOffsetFine },
    groupId,
    damageable: type !== 8,
    turningDurationMs: definition.turningDurationMs ?? 0,
    turningRemainingMs: 0,
    turningImageActive: false,
    turningFrame: 0,
    turningMirrored: false,
    wagonPartsCreated: false,
    hitPoints,
    maxHitPoints: hitPoints,
    damageOverTime: 0,
    damageOverTimeRemainingMs: 0,
    poisoned: false,
    poisonDamage: 0,
    cashReward: definition.cashReward,
    penetration: definition.penetration,
    alive: true,
    deathRemainingMs: 0,
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

const WAGON_PASSENGER_DRAWING_OFFSETS = Object.freeze([
  Object.freeze({ x: -1280, y: -1760 }),
  Object.freeze({ x: 1280, y: -1760 }),
  Object.freeze({ x: -1280, y: 800 }),
  Object.freeze({ x: 1280, y: 800 }),
]);

function campaignEnemySpeedFromBase(baseSpeed: number, wave: CampaignWaveDefinition, speedPercent = 100): number {
  const waveSpeed = Math.trunc((wave.speedMultiplierPercent * speedPercent) / 100);
  return Math.trunc((baseSpeed * waveSpeed) / 100);
}

function campaignEnemySpeed(scenario: ScenarioContent, wave: CampaignWaveDefinition, speedPercent = 100): number {
  return campaignEnemySpeedFromBase(scenario.previewWave?.baseEnemySpeed ?? 0, wave, speedPercent);
}

function spawnSettlerGroup(
  scenario: ScenarioContent,
  spawn: WaveSpawn,
  spawnPositionFine: { x: number; y: number },
  requestType: number,
  nextGroupId: () => string,
  dynamicDifficulty: number,
  waveDefinition: CampaignWaveDefinition,
  difficulty: GameDifficulty,
  random: JavaUtilRandom,
  nextEnemyId: () => string,
): MutableEnemy[] | undefined {
  const groupSize = requestType - 1;
  if (groupSize < 1 || groupSize > SETTLER_SPAWN_OFFSETS.length) return undefined;
  const speedPercent = 90 + random.nextInt(20);
  const speed = campaignEnemySpeed(scenario, waveDefinition, speedPercent);
  const enemies: MutableEnemy[] = [];
  const usedSpawnOffsets = new Set<number>();

  while (enemies.length < groupSize) {
    const slot = random.nextInt(SETTLER_SPAWN_OFFSETS.length);
    if (usedSpawnOffsets.has(slot)) continue;
    usedSpawnOffsets.add(slot);
    const type = (random.nextInt(2) + 1) as 1 | 2;
    const colorVariant = random.nextInt(2);
    const enemyDefinition = campaignEnemyDefinition(scenario, type);
    enemies.push(createCampaignEnemy(
      nextEnemyId(),
      type,
      spawn,
      spawnPositionFine,
      SETTLER_SPAWN_OFFSETS[slot]!,
      speed,
      campaignEnemyHitPoints(scenario, waveDefinition, dynamicDifficulty, difficulty, type),
      enemyDefinition,
      nextGroupId(),
      colorVariant,
    ));
  }
  return enemies;
}

function spawnHorseman(
  scenario: ScenarioContent,
  spawn: WaveSpawn,
  spawnPositionFine: { x: number; y: number },
  groupId: string,
  dynamicDifficulty: number,
  waveDefinition: CampaignWaveDefinition,
  difficulty: GameDifficulty,
  random: JavaUtilRandom,
  nextEnemyId: () => string,
): MutableEnemy[] {
  const speedPercent = 90 + random.nextInt(20);
  const definition = campaignEnemyDefinition(scenario, 3);
  return [createCampaignEnemy(
    nextEnemyId(),
    3,
    spawn,
    spawnPositionFine,
    { x: 0, y: 0 },
    campaignEnemySpeed(scenario, waveDefinition, speedPercent),
    campaignEnemyHitPoints(scenario, waveDefinition, dynamicDifficulty, difficulty, 3),
    definition,
    groupId,
    random.nextInt(2),
  )];
}

function spawnCoveredWagonPair(
  scenario: ScenarioContent,
  spawn: WaveSpawn,
  spawnPositionFine: { x: number; y: number },
  groupId: string,
  dynamicDifficulty: number,
  waveDefinition: CampaignWaveDefinition,
  difficulty: GameDifficulty,
  random: JavaUtilRandom,
  nextEnemyId: () => string,
): MutableEnemy[] {
  const direction = directionVector(spawn.direction);
  const speed = campaignEnemySpeed(scenario, waveDefinition);
  const towDefinition = campaignEnemyDefinition(scenario, 8);
  const wagonDefinition = campaignEnemyDefinition(scenario, 4);
  const tow = createCampaignEnemy(
    nextEnemyId(), 8, spawn, spawnPositionFine, { x: 0, y: 2880 }, speed,
    campaignEnemyHitPoints(scenario, waveDefinition, dynamicDifficulty, difficulty, 8),
    towDefinition, groupId, random.nextInt(2),
  );
  const wagon = createCampaignEnemy(
    nextEnemyId(), 4, spawn,
    { x: spawnPositionFine.x - (direction.x * FINE_UNITS_PER_CELL), y: spawnPositionFine.y - (direction.y * FINE_UNITS_PER_CELL) },
    { x: 0, y: 2880 }, speed,
    campaignEnemyHitPoints(scenario, waveDefinition, dynamicDifficulty, difficulty, 4),
    wagonDefinition, groupId, random.nextInt(2),
  );
  return [tow, wagon];
}

function spawnPostCoachPair(
  scenario: ScenarioContent,
  spawn: WaveSpawn,
  spawnPositionFine: { x: number; y: number },
  groupId: string,
  dynamicDifficulty: number,
  waveDefinition: CampaignWaveDefinition,
  difficulty: GameDifficulty,
  random: JavaUtilRandom,
  nextEnemyId: () => string,
): MutableEnemy[] {
  const direction = directionVector(spawn.direction);
  const speed = campaignEnemySpeed(scenario, waveDefinition);
  const horseDefinition = campaignEnemyDefinition(scenario, 8);
  const coachDefinition = campaignEnemyDefinition(scenario, 5);
  const horse = createCampaignEnemy(
    nextEnemyId(), 8, spawn, spawnPositionFine, { x: 0, y: 2880 }, speed,
    campaignEnemyHitPoints(scenario, waveDefinition, dynamicDifficulty, difficulty, 8),
    horseDefinition, groupId, random.nextInt(2),
  );
  const coach = createCampaignEnemy(
    nextEnemyId(), 5, spawn,
    {
      x: spawnPositionFine.x - (direction.x * FINE_UNITS_PER_CELL),
      y: spawnPositionFine.y - (direction.y * FINE_UNITS_PER_CELL),
    },
    { x: 0, y: 2880 }, speed,
    campaignEnemyHitPoints(scenario, waveDefinition, dynamicDifficulty, difficulty, 5),
    coachDefinition, groupId, random.nextInt(2),
  );
  return [horse, coach];
}

function spawnGoldTransport(
  scenario: ScenarioContent,
  spawn: WaveSpawn,
  spawnPositionFine: { x: number; y: number },
  groupId: string,
  dynamicDifficulty: number,
  waveDefinition: CampaignWaveDefinition,
  difficulty: GameDifficulty,
  random: JavaUtilRandom,
  nextEnemyId: () => string,
): MutableEnemy[] {
  const type = 6;
  const definition = campaignEnemyDefinition(scenario, type);
  return [createCampaignEnemy(
    nextEnemyId(),
    type,
    spawn,
    spawnPositionFine,
    { x: 0, y: 0 },
    campaignEnemySpeedFromBase(500, waveDefinition),
    campaignEnemyHitPoints(scenario, waveDefinition, dynamicDifficulty, difficulty, type),
    definition,
    groupId,
    random.nextInt(2),
  )];
}

function campaignSpawnCollides(positionFine: { x: number; y: number }, enemies: readonly MutableEnemy[]): boolean {
  return enemies.some((enemy) => {
    if (!enemy.alive || (enemy.type !== 4 && enemy.type !== 5 && enemy.type !== 6 && enemy.type !== 8)) return false;
    // Original vehicle collision objects follow fineX/fineY, never drawingOffsetX/Y.
    return Math.abs(enemy.positionFine.x - positionFine.x) < FINE_UNITS_PER_CELL
      && Math.abs(enemy.positionFine.y - positionFine.y) < FINE_UNITS_PER_CELL;
  });
}

function createWagonDebris(
  enemy: MutableEnemy,
  random: JavaUtilRandom,
  nextPartId: () => string,
): MutableWagonPart[] {
  return Array.from({ length: 20 }, (_, index) => {
    const step = index - 10;
    return {
      id: nextPartId(),
      positionFine: {
        x: enemy.positionFine.x - Math.trunc((step * FINE_UNITS_PER_CELL) / 20),
        y: enemy.positionFine.y,
      },
      depthFineY: enemy.positionFine.y,
      heightFine: 3840,
      xDirection: random.nextInt(2000) - 1000,
      yDirection: random.nextInt(200) - 100,
      zDirection: random.nextInt(4000) + 2500,
      frame: random.nextInt(6),
    };
  });
}

function updateWagonDebris(parts: MutableWagonPart[], deltaMs: number): void {
  for (const part of parts) {
    part.zDirection = Math.trunc(part.zDirection - ((500 * deltaMs) / 100));
    part.positionFine.x += Math.trunc((part.xDirection * deltaMs) / 100);
    part.positionFine.y += Math.trunc((part.yDirection * deltaMs) / 100);
    part.heightFine += Math.trunc((part.zDirection * deltaMs) / 100);
    if (part.heightFine < 0) {
      part.heightFine = 0;
      part.xDirection = 0;
      part.yDirection = 0;
      part.zDirection = 0;
    }
  }
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index]!;
    if (part.zDirection <= 0 && part.heightFine < FINE_UNITS_PER_CELL) parts.splice(index, 1);
  }
}

function campaignEscapePenalty(type: number): number {
  if (type === 4) return 2;
  if (type === 5) return 3;
  if (type === 6) return 4;
  if (type === 7) return 10;
  return 1;
}

function recordCampaignEscape(wave: MutableWave, livesMax: number, penalty: number): void {
  if (wave.dynamicDifficulty === undefined || wave.difficultyValue === undefined
    || wave.difficultyValueCounter === undefined) return;
  const weight = Math.trunc(200 / livesMax) * penalty;
  wave.difficultyValueCounter += weight;
}

function recordCampaignKill(wave: MutableWave, priorityMap: RoutePriorityMap, enemy: MutableEnemy): void {
  if (wave.dynamicDifficulty === undefined || wave.difficultyValue === undefined
    || wave.difficultyValueCounter === undefined) return;
  const weight = enemy.type === 4 ? 6 : enemy.type === 5 ? 8 : enemy.type === 6 ? 10 : enemy.type === 8 ? 0 : 1;
  if (weight === 0) return;
  const routeValue = normalizedRoutePriority(
    priorityMap,
    fullCell(enemy.positionFine.x),
    fullCell(enemy.positionFine.y),
  );
  wave.difficultyValue += (1500 - routeValue) * weight;
  wave.difficultyValueCounter += weight;
}

function applyEnemyDamage(
  wave: MutableWave,
  enemy: MutableEnemy,
  damage: number,
  priorityMap: RoutePriorityMap,
  campaignMode: boolean,
): void {
  if (!enemy.alive || !enemy.damageable) return;
  enemy.hitPoints -= damage;
  wave.events.push({ type: 'enemy-hit', enemyId: enemy.id, damage, hitPoints: enemy.hitPoints });
  if (enemy.hitPoints > 0) return;

  enemy.alive = false;
  enemy.deathRemainingMs = enemy.type === 4 || enemy.type === 5 || enemy.type === 6 || enemy.type === 8
    ? 799
    : campaignMode ? 599 : 799;
  if (campaignMode) recordCampaignKill(wave, priorityMap, enemy);
  wave.cash += enemy.cashReward;
  wave.cashMade += enemy.cashReward;
  wave.defeatedEnemies += 1;
  wave.events.push({
    type: 'enemy-defeated',
    enemyId: enemy.id,
    enemyType: enemy.type,
    cashReward: enemy.cashReward,
  });
  if (enemy.type === 4) {
    for (const groupMember of wave.enemies) {
      if (groupMember !== enemy && groupMember.groupId === enemy.groupId && groupMember.alive) {
        groupMember.alive = false;
        groupMember.deathRemainingMs = 799;
      }
    }
  }
  if (enemy.type !== 4 && enemy.type !== 5 && enemy.type !== 6) return;
  wave.events.push({
    type: 'sound-requested',
    sound: 'sound_wagon_explode',
    positionFine: { ...enemy.positionFine },
  });
}

function unitEnemyDistanceSquare(unit: MutableUnit, enemy: MutableEnemy): number {
  const unitCenter = unitAttackCenterTenthTiles(unit);
  const enemyX = tenthTileCoordinate(enemy.positionFine.x);
  const enemyY = tenthTileCoordinate(enemy.positionFine.y);
  const dx = unitCenter.x - enemyX;
  const dy = unitCenter.y - enemyY;
  return (dx * dx) + (dy * dy);
}

function rocketLaunchPosition(unit: MutableUnit, target: MutableEnemy): { x: number; y: number } {
  const start = {
    x: unit.positionFine.x,
    y: unit.positionFine.y - FIELD_CENTER_HALF,
  };
  const deltaX = target.positionFine.x - unit.positionFine.x;
  const deltaY = target.positionFine.y - start.y;
  let directionX = 0;
  let directionY = 0;
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    directionX = Math.sign(deltaX);
    if (Math.abs(deltaY) > Math.trunc(Math.abs(deltaX) / 2)) directionY = Math.sign(deltaY);
  } else {
    directionY = Math.sign(deltaY);
    if (Math.abs(deltaX) > Math.trunc(Math.abs(deltaY) / 2)) directionX = Math.sign(deltaX);
  }

  const offsetPercent = directionX !== 0 && directionY !== 0 ? 40 : 56;
  const offsetX = Math.trunc((directionX * FINE_UNITS_PER_CELL * offsetPercent) / 100);
  const offsetY = Math.trunc((directionY * FINE_UNITS_PER_CELL * offsetPercent) / 100);
  return { x: start.x + offsetX, y: start.y + offsetY };
}

function rocketFirstLegDurationMs(
  distanceSquare: number,
  maxSquareRange: number,
  projectileSpeed: number,
): { durationMs: number; maxRangeTenthTiles: number; zigZagFactor: number } {
  const maxRangeTenthTiles = Math.trunc(Math.sqrt(Math.max(distanceSquare, maxSquareRange)));
  const baseSteps = Math.trunc(projectileSpeed / 10);
  const distanceSteps = maxRangeTenthTiles > 0
    ? Math.trunc((100 * baseSteps * Math.sqrt(distanceSquare)) / maxRangeTenthTiles)
    : 0;
  const durationMs = Math.trunc(distanceSteps / 100) * 10;
  const rangeStep = Math.trunc(maxRangeTenthTiles / 10);
  const stepsPerRangeStep = rangeStep > 0 ? Math.trunc(projectileSpeed / rangeStep) : 0;
  const zigZagProgress = stepsPerRangeStep > 0 ? Math.trunc(durationMs / stepsPerRangeStep) : 0;
  const zigZagFactor = zigZagProgress > 0
    ? Math.ceil(durationMs / (zigZagProgress * Math.PI))
    : 0;
  return { durationMs, maxRangeTenthTiles, zigZagFactor };
}

function rocketDistanceSquareFromStart(shot: MutableShot): number {
  const dx = Math.trunc(((shot.positionFine.x - shot.startFine.x) * 10) / FINE_UNITS_PER_CELL);
  const dy = Math.trunc(((shot.positionFine.y - shot.startFine.y) * 10) / FINE_UNITS_PER_CELL);
  return (dx * dx) + (dy * dy);
}

function rocketIsInCanyon(scenario: ScenarioContent, positionFine: { x: number; y: number }): boolean {
  const x = Math.trunc(positionFine.x / FINE_UNITS_PER_CELL);
  const y = Math.trunc(positionFine.y / FINE_UNITS_PER_CELL);
  const backgroundCode = scenario.originalTileGrid?.[y]?.[x] ?? 0;
  return backgroundCode >= 48 && backgroundCode < 96;
}

function rocketOrientationFrame(shot: MutableShot): number {
  const end = shot.rocket?.endFine ?? shot.targetPositionFine;
  const angle = Math.atan2(shot.positionFine.y - end.y, shot.positionFine.x - end.x);
  const normalizedAngle = angle < 0 ? angle + (Math.PI * 2) : angle;
  return Math.trunc((normalizedAngle * 8) / Math.PI) % 16;
}

function advanceRocketShot(
  shot: MutableShot,
  target: MutableEnemy | undefined,
  deltaMs: number,
  scenario: ScenarioContent,
  random: JavaRandom,
): { pathBurst: boolean; finished: boolean } {
  const rocket = shot.rocket;
  if (!rocket) throw new Error('Damage Style 6 shot is missing rocket state');

  if (!rocket.hasJumped && target) shot.targetPositionFine = enemyShotPosition(target);
  const endFine = rocket.hasJumped ? rocket.endFine : shot.targetPositionFine;
  shot.remainingMs = Math.max(0, shot.remainingMs - deltaMs);
  const elapsedMs = shot.totalTravelTimeMs - shot.remainingMs;
  const totalMs = Math.max(1, shot.totalTravelTimeMs);
  const baseX = Math.trunc(((shot.startFine.x * shot.remainingMs) + (endFine.x * elapsedMs)) / totalMs);
  const baseY = Math.trunc(((shot.startFine.y * shot.remainingMs) + (endFine.y * elapsedMs)) / totalMs);
  const curvePhase = rocket.zigZagFactor > 0 ? Math.sin(shot.remainingMs / rocket.zigZagFactor) : 0;
  const curveOffsetX = rocket.normal.x * curvePhase * FINE_UNITS_PER_CELL / 5;
  const curveOffsetY = rocket.normal.y * curvePhase * FINE_UNITS_PER_CELL / 5;
  shot.positionFine = {
    x: baseX + (Number.isFinite(curveOffsetX) ? Math.trunc(curveOffsetX) : 0),
    y: baseY + (Number.isFinite(curveOffsetY) ? Math.trunc(curveOffsetY) : 0),
  };

  if (rocket.hasJumped && !rocketIsInCanyon(scenario, shot.positionFine)) {
    rocket.endFine = { ...shot.positionFine };
    shot.targetPositionFine = { ...rocket.endFine };
    shot.remainingMs = 0;
  }

  let finished = false;
  if (shot.remainingMs <= 0) {
    const traveledSquare = rocketDistanceSquareFromStart(shot);
    const maxSquareRange = rocket.maxRangeTenthTiles * rocket.maxRangeTenthTiles;
    if (!rocket.hasJumped && traveledSquare < maxSquareRange && rocket.maxRangeTenthTiles > 0) {
      rocket.hasJumped = true;
      const distance = Math.sqrt(traveledSquare);
      const rangeFine = (rocket.maxRangeTenthTiles * FINE_UNITS_PER_CELL) / 10;
      if (traveledSquare < 10) {
        const angle = random.nextDouble() * Math.PI * 2;
        rocket.endFine = {
          x: Math.trunc(shot.startFine.x + (Math.cos(angle) * rangeFine)),
          y: Math.trunc(shot.startFine.y + (Math.sin(angle) * rangeFine)),
        };
      } else {
        const scale = rocket.maxRangeTenthTiles / distance;
        rocket.endFine = {
          x: shot.startFine.x + Math.trunc((shot.positionFine.x - shot.startFine.x) * scale),
          y: shot.startFine.y + Math.trunc((shot.positionFine.y - shot.startFine.y) * scale),
        };
      }
      shot.targetPositionFine = { ...rocket.endFine };
      shot.totalTravelTimeMs = rocket.speedMs;
      shot.remainingMs = Math.max(0, Math.trunc(rocket.speedMs * (1 - (distance / rocket.maxRangeTenthTiles))));
    } else {
      finished = true;
    }
  }

  const burstX = shot.positionFine.x - rocket.lastBurstFine.x;
  const burstY = shot.positionFine.y - rocket.lastBurstFine.y;
  let pathBurst = (burstX * burstX) + (burstY * burstY) > 0x3840000;
  if (pathBurst) rocket.lastBurstFine = { ...shot.positionFine };
  if (finished) pathBurst = true;
  shot.animationFrame = rocketOrientationFrame(shot);
  return { pathBurst, finished };
}

function enemyShotPosition(enemy: MutableEnemy): { x: number; y: number } {
  return {
    x: enemy.positionFine.x + enemy.drawingOffsetFine.x,
    y: enemy.positionFine.y + enemy.drawingOffsetFine.y,
  };
}

function shotTargetDistanceSquare(positionFine: { x: number; y: number }, enemy: MutableEnemy): number {
  const dx = tenthTileCoordinate(positionFine.x)
    - tenthTileCoordinate(enemy.positionFine.x);
  const dy = tenthTileCoordinate(positionFine.y)
    - tenthTileCoordinate(enemy.positionFine.y);
  return (dx * dx) + (dy * dy);
}

function poisonAreaRadiusSquare(shot: MutableShot): number {
  const radiusTenthTiles = Math.trunc((shot.areaDamageFine * 10) / FINE_UNITS_PER_CELL);
  return radiusTenthTiles * radiusTenthTiles;
}

function applyEnemyPoison(enemy: MutableEnemy, damage: number, durationMs: number): void {
  if (!enemy.alive || enemy.hitPoints <= 0 || !enemy.damageable || enemy.type === 8 || durationMs <= 0) return;
  enemy.poisoned = true;
  enemy.poisonDamage = Math.max(enemy.poisonDamage, damage);
}

function unitAttackCenterTenthTiles(unit: MutableUnit): { x: number; y: number } {
  return {
    x: tenthTileCoordinate(unit.positionFine.x),
    y: tenthTileCoordinate(unit.positionFine.y),
  };
}

function weaponRangeTenthTiles(weapon: UnitWeaponDefinition): number {
  return Math.trunc((weapon.rangeFine * 10) / FINE_UNITS_PER_CELL);
}

function maxWeaponSquareRange(weapon: UnitWeaponDefinition): number {
  const rangeInTenthTiles = weaponRangeTenthTiles(weapon);
  return rangeInTenthTiles * rangeInTenthTiles;
}

function maxUnitWeaponSquareRange(unit: MutableUnit): number {
  if (!unit.weapon) return 0;
  const baseRange = maxWeaponSquareRange(unit.weapon);
  return Math.trunc(baseRange * (unit.bonusAttribute === 4 ? 150 : 100) / 100);
}

function unitMaximumRangeTenthTiles(unit: MutableUnit): number {
  return Math.trunc(Math.sqrt(maxUnitWeaponSquareRange(unit)));
}

function projectileBaseTimePercent(damageStyle: UnitWeaponDefinition['damageStyle']): number {
  switch (damageStyle) {
    case 0: return 10;
    case 1:
    case 2: return 50;
    case 3:
    case 4:
    case 5: return 75;
    case 6:
      // Rocket style uses a separate two-leg algorithm in the APK, outside Cow Gulch R4.
      return 10;
  }
}

function projectileTravelTime(
  distanceSquare: number,
  maxSquareRange: number,
  weapon: UnitWeaponDefinition,
): number {
  // Styles 0-5 use this straight-line formula; style 6 keeps its existing fallback above.
  const baseTimePercent = projectileBaseTimePercent(weapon.damageStyle);
  const baseSteps = Math.trunc(weapon.projectileSpeed / 10);
  const distanceSteps = Math.trunc(((100 - baseTimePercent) * baseSteps * distanceSquare) / maxSquareRange);
  return Math.trunc(((baseTimePercent * baseSteps) + distanceSteps) / 100) * 10;
}

function shotArcHeightFine(
  damageStyle: UnitWeaponDefinition['damageStyle'],
  remainingMs: number,
  totalTravelTimeMs: number,
): number {
  if (damageStyle !== 3 && damageStyle !== 4 && damageStyle !== 5 && damageStyle !== 6) return 0;
  if (totalTravelTimeMs <= 0) return 0;
  // The recovered Java stores the normalized travel ratio in a float before
  // promoting it to double for Math.sin. Preserve that float32 rounding here.
  const progress = Math.fround(Math.max(0, Math.min(1, remainingMs / totalTravelTimeMs)));
  const placementOffset = Math.trunc(Math.fround(1920 * progress));
  const baseOffset = damageStyle === 3 || damageStyle === 5
    ? Math.trunc(placementOffset / 256)
    : placementOffset;
  const arcAmplitude = damageStyle === 4 ? 11520 : damageStyle === 6 ? 1536 : 15360;
  return baseOffset + Math.trunc(Math.sin(Math.PI * progress) * arcAmplitude);
}

function shouldTransitionShotFineZ(shot: MutableShot): boolean {
  if (shot.impactResolved || shot.fineZ !== 7680 || shot.totalTravelTimeMs <= 0) return false;
  if (shot.damageStyle !== 3 && shot.damageStyle !== 4 && shot.damageStyle !== 5 && shot.damageStyle !== 6) return false;
  const progress = Math.fround(shot.remainingMs / shot.totalTravelTimeMs);
  return progress < 0.5 && shotArcHeightFine(shot.damageStyle, shot.remainingMs, shot.totalTravelTimeMs) < 7680;
}

function selectTarget(
  unit: MutableUnit,
  enemies: readonly MutableEnemy[],
  priorityMap: RoutePriorityMap,
  priorityTargetId?: string,
): MutableEnemy | undefined {
  const weapon = unit.weapon;
  if (!weapon) return undefined;
  const maxSquareRange = maxUnitWeaponSquareRange(unit);
  let bestTarget: MutableEnemy | undefined;
  let bestScore = -1;

  for (const enemy of enemies) {
    if (!enemy.alive || !enemy.damageable) continue;
    const distanceSquare = unitEnemyDistanceSquare(unit, enemy);
    if (distanceSquare <= 50 || distanceSquare >= maxSquareRange) continue;

    // UnitDirector scores PriorityMap × (penetration + 1400), then applies the selected-target multiplier.
    // Strict greater-than preserves the APK Vector order for equal scores.
    const mapPriority = priorityMap.getTargetPriority(fullCell(enemy.positionFine.x), fullCell(enemy.positionFine.y));
    const score = mapPriority * (damagePenetration(enemy, weapon.damageType) + 1400)
      * (enemy.id === priorityTargetId ? 10 : 1);
    if (score > bestScore) {
      bestTarget = enemy;
      bestScore = score;
    }
  }
  return bestTarget;
}

function nearestPriorityTargetAt(
  x: number,
  y: number,
  enemies: readonly MutableEnemy[],
): MutableEnemy | undefined {
  const inputX = tenthTileCoordinate(Math.trunc(x * FINE_UNITS_PER_CELL));
  const inputY = tenthTileCoordinate(Math.trunc(y * FINE_UNITS_PER_CELL) + 1920);
  let nearestDistanceSquare = 64;
  let nearest: MutableEnemy | undefined;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const enemyX = tenthTileCoordinate(enemy.positionFine.x + enemy.drawingOffsetFine.x);
    const enemyY = tenthTileCoordinate(enemy.positionFine.y + enemy.drawingOffsetFine.y);
    const deltaX = enemyX - inputX;
    const deltaY = enemyY - inputY;
    const distanceSquare = (deltaX * deltaX) + (deltaY * deltaY);
    if (distanceSquare >= nearestDistanceSquare) continue;

    if (enemy.type === 8) {
      const wagon = enemies.find((candidate) => candidate.alive && candidate.type !== 8
        && candidate.groupId === enemy.groupId);
      if (!wagon) continue;
      nearest = wagon;
    } else {
      nearest = enemy;
    }
    nearestDistanceSquare = distanceSquare;
  }
  return nearest;
}

const ENEMY_COLLISION_BOX_SIZE_FINE = 7678;
const ENEMY_COLLISION_INITIAL_START_OFFSET_FINE = 3839;
const ENEMY_COLLISION_MOVED_START_OFFSET_FINE = 3840;
const ENEMY_COLLISION_MAX_START_DELTA_X_FINE = 23040;
const ENEMY_COLLISION_MAX_START_DELTA_Y_FINE = 15360;

function enemyCollisionBoxCheck(
  movingStartX: number,
  movingStartY: number,
  stationaryStartX: number,
  stationaryStartY: number,
  deltaX: number,
  deltaY: number,
): boolean {
  const movingEndX = movingStartX + ENEMY_COLLISION_BOX_SIZE_FINE;
  const movingEndY = movingStartY + ENEMY_COLLISION_BOX_SIZE_FINE;
  const stationaryEndX = stationaryStartX + ENEMY_COLLISION_BOX_SIZE_FINE;
  const stationaryEndY = stationaryStartY + ENEMY_COLLISION_BOX_SIZE_FINE;
  const movedStartX = movingStartX + deltaX;
  const movedStartY = movingStartY + deltaY;
  const movedEndX = movingEndX + deltaX;
  const movedEndY = movingEndY + deltaY;
  return (movedStartX >= stationaryStartX && movedStartX <= stationaryEndX
    && movedEndY >= stationaryStartY && movedEndY <= stationaryEndY)
    || (movedStartX >= stationaryStartX && movedStartX <= stationaryEndX
      && movedStartY >= stationaryStartY && movedStartY <= stationaryEndY)
    || (movedEndX >= stationaryStartX && movedEndX <= stationaryEndX
      && movedStartY >= stationaryStartY && movedStartY <= stationaryEndY)
    || (movedEndX >= stationaryStartX && movedEndX <= stationaryEndX
      && movedEndY >= stationaryStartY && movedEndY <= stationaryEndY);
}

function enemyCollisionBlocksMove(
  enemy: MutableEnemy,
  enemies: readonly MutableEnemy[],
  deltaX: number,
  deltaY: number,
): boolean {
  if (enemy.type !== 4 && enemy.type !== 5 && enemy.type !== 6 && enemy.type !== 8) return false;

  const movingOffset = enemy.collisionStartOffsetFine ?? ENEMY_COLLISION_MOVED_START_OFFSET_FINE;
  const movingStartX = enemy.positionFine.x - movingOffset;
  const movingStartY = enemy.positionFine.y - movingOffset;

  // The APK checks the other object moving backward by xDir/yDir first, then
  // checks this object's next 100 ms movement if no first-pass collision hit.
  for (let pass = 0; pass < 2; pass += 1) {
    const candidateDeltaX = pass === 0 ? -deltaX : deltaX;
    const candidateDeltaY = pass === 0 ? -deltaY : deltaY;
    for (const other of enemies) {
      // The APK enemy manager uses ignoreSameUnitGroup=false, which filters
      // candidates whose unitGroup matches the moving collision object.
      if (other === enemy || other.groupId === enemy.groupId
        || (other.type !== 4 && other.type !== 5 && other.type !== 6 && other.type !== 8)) continue;
      const otherOffset = other.collisionStartOffsetFine ?? ENEMY_COLLISION_MOVED_START_OFFSET_FINE;
      const otherStartX = other.positionFine.x - otherOffset;
      const otherStartY = other.positionFine.y - otherOffset;
      if (Math.abs(otherStartX - movingStartX) >= ENEMY_COLLISION_MAX_START_DELTA_X_FINE
        || Math.abs(otherStartY - movingStartY) >= ENEMY_COLLISION_MAX_START_DELTA_Y_FINE) continue;

      const blocked = pass === 0
        ? enemyCollisionBoxCheck(
          otherStartX, otherStartY, movingStartX, movingStartY, candidateDeltaX, candidateDeltaY,
        )
        : enemyCollisionBoxCheck(
          movingStartX, movingStartY, otherStartX, otherStartY, candidateDeltaX, candidateDeltaY,
        );
      if (blocked) return true;
    }
  }
  return false;
}

interface EnemyMoveResult {
  escaped: boolean;
  collisionBlocked: boolean;
}

function moveEnemy(
  enemy: MutableEnemy,
  deltaMs: number,
  scenario: ScenarioContent,
  random: JavaUtilRandom,
  enemies: readonly MutableEnemy[],
  movementBlocked = false,
): EnemyMoveResult {
  const definition = scenario.previewWave;
  if (!definition) return { escaped: false, collisionBlocked: false };

  const previous = { ...enemy.positionFine };
  const previousDirection = enemy.direction;
  const turningAtStart = enemy.turningRemainingMs > 0;
  const vector = directionVector(enemy.direction);
  if (!movementBlocked) {
    if (!turningAtStart) enemy.turningImageActive = false;
    const distance = Math.fround((enemy.speed * deltaMs) / 100);
    enemy.positionFine = {
      x: Math.trunc(Math.fround(previous.x + vector.x * distance)),
      y: Math.trunc(Math.fround(previous.y + vector.y * distance)),
    };
    if (enemy.type === 4 || enemy.type === 5 || enemy.type === 6 || enemy.type === 8) {
      enemy.collisionStartOffsetFine = ENEMY_COLLISION_MOVED_START_OFFSET_FINE;
    }
  }
  const movedFine = Math.abs(enemy.positionFine.x - previous.x) + Math.abs(enemy.positionFine.y - previous.y);
  if (movedFine > 0 && !turningAtStart
    && Math.abs(enemy.positionFine.x - previous.x) > Math.abs(enemy.positionFine.y - previous.y)) {
    enemy.mirrored = enemy.positionFine.x > previous.x;
  }
  if (movedFine > 0 && !turningAtStart) {
    enemy.animationDistance = (enemy.animationDistance + movedFine) % ENEMY_WALK_ANIMATION_CYCLE_FINE;
    enemy.animationFrame = enemyWalkAnimationFrame(enemy.type, enemy.animationDistance);
  }
  if (!movementBlocked && turningAtStart) enemy.turningRemainingMs = Math.max(0, enemy.turningRemainingMs - deltaMs);

  const passedCenter = !movementBlocked && (vector.x !== 0
    ? passesFieldCenter(previous.x, enemy.positionFine.x)
    : passesFieldCenter(previous.y, enemy.positionFine.y));

  if (passedCenter) {
    if (enemy.despawnOnNextFieldCounter > 0) {
      enemy.despawnOnNextFieldCounter -= 1;
      if (enemy.despawnOnNextFieldCounter === 0) return { escaped: true, collisionBlocked: false };
    } else {
      const cell = { x: fullCell(enemy.positionFine.x), y: fullCell(enemy.positionFine.y) };
      const exits = [definition.exit, ...(definition.additionalExits ?? [])];
      if (exits.some((exit) => cell.x === exit.x && cell.y === exit.y)) {
        enemy.despawnOnNextFieldCounter = 2;
      } else {
        const redirect = definition.redirects.find((candidate) =>
          candidate.cell.x === cell.x && candidate.cell.y === cell.y);
        if (redirect) {
          const nextDirection = redirect.directions[random.nextInt(redirect.directions.length)]!;
          if (nextDirection !== enemy.direction) {
            const previousVector = directionVector(enemy.direction);
            const nextVector = directionVector(nextDirection);
            let turnFrame: 0 | 1 | undefined;
            let turnMirrored: boolean | undefined;
            if ((previousVector.x === -1 && nextVector.y === 1)
              || (previousVector.y === 1 && nextVector.x === -1)) {
              turnFrame = 0;
              turnMirrored = false;
            } else if ((previousVector.x === 1 && nextVector.y === 1)
              || (previousVector.y === 1 && nextVector.x === 1)) {
              turnFrame = 0;
              turnMirrored = true;
            } else if ((previousVector.x === -1 && nextVector.y === -1)
              || (previousVector.y === -1 && nextVector.x === -1)) {
              turnFrame = 1;
              turnMirrored = false;
            } else if ((previousVector.x === 1 && nextVector.y === -1)
              || (previousVector.y === -1 && nextVector.x === 1)) {
              turnFrame = 1;
              turnMirrored = true;
            }
            if (turnMirrored !== undefined) enemy.mirrored = turnMirrored;
            if (enemy.turningDurationMs > 0 && turnFrame !== undefined && turnMirrored !== undefined) {
              enemy.turningImageActive = true;
              enemy.turningRemainingMs = enemy.turningDurationMs;
              enemy.turningFrame = turnFrame;
              enemy.turningMirrored = turnMirrored;
            }
            enemy.direction = nextDirection;
            enemy.positionFine = {
              x: (cell.x * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF + (nextVector.x * 2),
              y: (cell.y * FINE_UNITS_PER_CELL) + FIELD_CENTER_HALF + (nextVector.y * 2),
            };
          }
        }
      }
    }
  }

  const nextVector = directionVector(enemy.direction);
  const collisionBlocked = enemyCollisionBlocksMove(
    enemy,
    enemies,
    nextVector.x * enemy.speed,
    nextVector.y * enemy.speed,
  );
  if (collisionBlocked) {
    enemy.positionFine = previous;
    enemy.direction = previousDirection;
    enemy.animationDistance = 0;
    enemy.collisionStartOffsetFine = ENEMY_COLLISION_MOVED_START_OFFSET_FINE;
  }

  const cellX = fullCell(enemy.positionFine.x);
  const cellY = fullCell(enemy.positionFine.y);
  return {
    escaped: cellX >= scenario.map.width + 3 || cellY >= scenario.map.height + 3
      || cellX <= -3 || cellY <= -3,
    collisionBlocked,
  };
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
      const gamblerCasinoCells = resolveGamblerCasinoCells(scenario);
      const gamblerPrizeUnitTypes = new Set(scenario.gambler?.unlockedPrizeUnitTypes ?? []);
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
        const spawnCount = scenario.previewWave
          ? 1 + (scenario.previewWave.additionalSpawns?.length ?? 0)
          : 0;
        if (!Number.isSafeInteger(campaignWaveCount) || campaignWaveCount < campaignWaves.length
          || campaignWaves.some((campaignWave, index) => campaignWave.number !== index + 1
            || (campaignWave.delayMs !== undefined
              && (!Number.isSafeInteger(campaignWave.delayMs) || campaignWave.delayMs < 0))
            || !Number.isSafeInteger(campaignWave.hitPointMultiplierPercent)
            || campaignWave.hitPointMultiplierPercent < 1
            || !Number.isSafeInteger(campaignWave.speedMultiplierPercent)
            || campaignWave.speedMultiplierPercent < 1
            || campaignWave.spawnPools.some((pool) => !Number.isSafeInteger(pool.spawnPointId)
              || pool.spawnPointId < 0 || !Number.isSafeInteger(pool.intervalMs) || pool.intervalMs < 0
              || (pool.intervalMultiplier !== undefined && (!Number.isSafeInteger(pool.intervalMultiplier) || pool.intervalMultiplier < 1))
              || pool.spawnPointId >= spawnCount
              || pool.requests.length !== 10
              || pool.requests.some((count) => !Number.isSafeInteger(count) || count < 0)))) {
          throw new GameOpenError('scenario-unavailable', 'Campaign wave data is invalid');
        }
      }
      const campaignUnitPool = scenario.campaignUnitPool;
      if (campaignUnitPool) {
        const poolTypes = new Set<number>();
        const invalidPool = !Number.isSafeInteger(campaignUnitPool.intervalMs)
          || campaignUnitPool.intervalMs < 1
          || campaignUnitPool.units.some((entry) => {
            if (!Number.isSafeInteger(entry.poolType) || entry.poolType < 0 || entry.poolType >= 37
              || poolTypes.has(entry.poolType)
              || !scenario.units.some((unit) => unit.type === entry.unitType)
              || ![1, 2, 3].includes(entry.spawnLocationType)) return true;
            poolTypes.add(entry.poolType);
            return false;
          })
          || campaignUnitPool.spawnLocations.some((location, index) => (
            !location.id || campaignUnitPool.spawnLocations.some((other, otherIndex) => otherIndex !== index && other.id === location.id)
            || !Number.isSafeInteger(location.cell.x) || !Number.isSafeInteger(location.cell.y)
            || location.cell.x < 0 || location.cell.x >= scenario.map.width
            || location.cell.y < 0 || location.cell.y >= scenario.map.height
            || ![-1, 1, 2, 3].includes(location.spawnLocationType)
          ))
          || campaignUnitPool.units.some((entry) => !campaignUnitPool.spawnLocations.some((location) => (
            location.spawnLocationType === -1 || location.spawnLocationType === entry.spawnLocationType
          )))
          || campaignUnitPool.actions.some((action) => (
            !Number.isSafeInteger(action.waveNumber) || action.waveNumber < 1
            || (campaignWaveCount > 0 && action.waveNumber > campaignWaveCount)
            || !poolTypes.has(action.poolType)
            || !Number.isSafeInteger(action.count) || action.count < 0 || action.count > 127
            || !['add', 'set', 'add-max', 'set-max'].includes(action.action)
          ));
        if (invalidPool) {
          throw new GameOpenError('scenario-unavailable', 'Campaign unit pool data is invalid');
        }
      }
      const bonusCrateDefinition = scenario.campaignBonusCratePool;
      if (bonusCrateDefinition && (!Number.isSafeInteger(bonusCrateDefinition.totalCount)
        || bonusCrateDefinition.totalCount < 0
        || !Number.isSafeInteger(bonusCrateDefinition.intervalMs)
        || bonusCrateDefinition.intervalMs < 1
        || !Number.isSafeInteger(bonusCrateDefinition.simultaneousLimit)
        || bonusCrateDefinition.simultaneousLimit < 1
        || !Number.isSafeInteger(bonusCrateDefinition.rewardTypeCount)
        || bonusCrateDefinition.rewardTypeCount < 1
        || bonusCrateDefinition.rewardTypeCount > 4
        || !(scenario.originalTileGrid ?? scenario.map.originalTileGrid))) {
        throw new GameOpenError('scenario-unavailable', 'Campaign bonus-crate data is invalid');
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
      const rulesRandom = new JavaRandom(resolvedSeed);
      const utilRandom = new JavaUtilRandom(deriveSessionRandomSeed(resolvedSeed, 'game-util'));
      // APK Math.random() is separate from Game's Randomizer; keep its deterministic adapter isolated.
      const rocketAngleRandom = new JavaRandom(resolvedSeed);
      const sessionId = options.sessionIdSource?.() ?? 'game-session-' + nextSessionNumber;
      if (!sessionId || typeof sessionId !== 'string') throw new Error('Game session ID is invalid');
      nextSessionNumber += 1;
      const units: MutableUnit[] = scenario.units.map((definition) => ({
        definition,
        selected: false,
        positionFine: initialUnitPosition(definition),
        upgradeLevel: 0,
        movementSpeedFinePer100Ms: definition.movementSpeedFinePer100Ms,
        walkingAnimationStep: 0,
        ...(definition.steamEmitter ? {
          steamEmitter: {
            nextCloudCounterMs: 0,
            nextCloudNumber: 1,
            clouds: [],
          },
        } : {}),
        ...(definition.weapon ? { weapon: clone(definition.weapon) } : {}),
        weaponCooldownMs: definition.weapon ? Math.trunc(definition.weapon.reloadTimeMs / 2) : 0,
        shotsUntilSpecialReload: definition.weapon?.specialReloadFrequency ?? 0,
        ...(gamblerCasinoCells.has(definition.id) ? {
          gambler: {
            completedGames: 0,
            cooldownRemainingMs: 0,
            casinoCell: { ...gamblerCasinoCells.get(definition.id)! },
          },
        } : {}),
      }));
      const recruitableUnits = new Map((scenario.recruitableUnits ?? []).map((definition) => [definition.id, definition]));
      const recruitmentCommands = new Map<string, string>();
      const mapHireCommands = new Map<string, string>();
      const upgradeCommands = new Map<string, string>();
      const gamblerCommands = new Map<string, string>();
      const recordedFrames: GameReplayFrame[] = [];
      const replayStates = new Map<number, ReplayState>();
      const pending: PendingIntent[] = [];
      const sessionEvents: GameEvent[] = [];
      let nextIntentSequence = 1;
      let nextShotNumber = 1;
      let nextRocketSparkleNumber = 1;
      let nextCampaignEnemyNumber = 1;
      let nextCampaignGroupNumber = 1;
      let nextWagonPartNumber = 1;
      const spawnFields = campaignSpawnFields(scenario);
      const priorityMap = createRoutePriorityMap(scenario);
      const campaignUnitPoolRuntime = createCampaignUnitPoolRuntime(scenario.campaignUnitPool);
      const campaignBonusCratePool = createCampaignBonusCratePool(bonusCrateDefinition);
      let frame = 0;
      let elapsedMs = 0;
      let priorityTargetId: string | undefined;
      let bonusNotice: MutableBonusNotice | undefined;
      let closed = false;
      let paused = false;
      const firstCampaignWave = campaignWaves?.find(({ number }) => number === 1);
      let wave: MutableWave | undefined = scenario.previewWave
        ? {
          number: firstCampaignWave?.number ?? scenario.previewWave.number,
          phase: campaignMode ? 'active' : 'not-started',
          lives: scenario.previewWave.initialLives,
          escapedEnemies: 0,
          defeatedEnemies: 0,
          cash: scenario.previewWave.initialCash ?? 0,
          cashMade: 0,
          enemies: [],
          shots: [],
          poisonApplicationTimerMs: 0,
          poisonDamageTimerMs: 0,
          rocketSparkles: [],
          recruitPool: {},
          events: [],
          wagonDebris: [],
          ...(campaignMode && firstCampaignWave ? {
            campaignSpawnPools: campaignSpawnPools(firstCampaignWave, 1000, false),
            dynamicDifficulty: 1000,
            difficultyValue: 1000,
            difficultyValueCounter: 1,
          } : {}),
        }
        : undefined;
      if (campaignMode && firstCampaignWave) {
        applyCampaignUnitPoolActions(campaignUnitPoolRuntime, scenario.campaignUnitPool, firstCampaignWave.number);
      }
      const drawOrderQueue = new DrawOrderQueue();
      for (const entry of drawOrderEntries(scenario, units, wave, campaignBonusCratePool?.crates ?? [])) {
        drawOrderQueue.insert(entry.id, entry.depth);
      }

      const assertOpen = () => {
        if (closed) throw new Error('Game session is closed');
      };

      const routeDefinitions = scenario.previewWave?.routes?.length
        ? scenario.previewWave.routes
        : scenario.previewWave ? [{
          spawn: scenario.previewWave.spawn,
          redirects: scenario.previewWave.redirects,
          exit: scenario.previewWave.exit,
        }] : [];
      const routes: RoutePoint[][] = routeDefinitions.map((routeDefinition) => [
        {
          x: routeDefinition.spawn.cell.x - 1.5,
          y: routeDefinition.spawn.cell.y + 0.5,
        },
        ...routeDefinition.redirects.map(({ cell }) => ({ x: cell.x + 0.5, y: cell.y + 0.5 })),
        { x: routeDefinition.exit.x + 0.5, y: routeDefinition.exit.y + 0.5 },
      ]);
      const route = routes[0];

      const observe = (): GameView => {
        assertOpen();
        return freezeDeep({
          frame,
          elapsedMs,
          paused,
          scenarioId: scenario.id,
          map: {
            ...scenario.map,
            ...(scenario.originalTileGrid
              ? { originalTileGrid: scenario.originalTileGrid.map((row) => [...row]) }
              : {}),
          },
          ...(route ? { route } : {}),
          ...(routes.length > 1 ? { routes } : {}),
          units: units.map((unit) => unitView(unit, scenario.maxUpgrades ?? 0, elapsedMs)),
          enemies: (wave?.enemies ?? []).map((enemy) => ({
            id: enemy.id,
            type: enemy.type,
            asset: enemy.asset,
            speed: enemy.speed,
            direction: enemy.direction,
            ...(enemy.mirrored !== (enemy.direction === 'east') ? { mirrored: enemy.mirrored } : {}),
            positionFine: { ...enemy.positionFine },
            drawingOffsetFine: { ...enemy.drawingOffsetFine },
            groupId: enemy.groupId,
            damageable: enemy.damageable,
            ...(enemy.turningImageActive ? {
              turningAnimation: {
                asset: enemy.type === 3 ? 'horseman_turn' as const
                  : enemy.type === 4 ? 'wagon_turn' as const
                    : enemy.type === 5 ? 'stagecoach_turn' as const
                      : enemy.type === 6 ? 'goldtransport_turn' as const
                      : enemy.asset === 'horse_wagon' ? 'horse_wagon_turn' as const : 'horse_wagon_turn_white' as const,
                frame: enemy.turningFrame,
                mirrored: enemy.turningMirrored,
              },
            } : {}),
            hitPoints: enemy.hitPoints,
            maxHitPoints: enemy.maxHitPoints,
            ...(enemy.poisoned ? { poisoned: true as const, poisonDamage: enemy.poisonDamage } : {}),
            alive: enemy.alive,
            deathRemainingMs: enemy.deathRemainingMs,
            animationFrame: enemy.animationFrame,
          })),
          ...(priorityTargetId ? { priorityTargetId } : {}),
          wagonDebris: (wave?.wagonDebris ?? []).map(({ id, positionFine, depthFineY, heightFine, frame }) => ({
            id,
            positionFine: { ...positionFine },
            depthFineY,
            heightFine,
            frame,
          })),
          bonusCrates: (campaignBonusCratePool?.crates ?? []).map((crate) => ({
            id: crate.id,
            cell: { ...crate.cell },
            positionFine: { ...crate.positionFine },
            rewardType: crate.rewardType,
            phase: crate.phase,
            animationFrame: campaignBonusCrateAnimationFrame(crate),
          })),
          ...(campaignBonusCratePool ? {
            bonusCratePool: {
              remainingMs: campaignBonusCratePool.remainingMs,
              remainingCount: campaignBonusCratePool.remainingCount,
              nextNumber: campaignBonusCratePool.nextNumber,
            },
          } : {}),
          ...(bonusNotice ? { bonusNotice: clone(bonusNotice) } : {}),
          shots: (wave?.shots ?? []).map((shot) => ({
            id: shot.id,
            shooterId: shot.shooterId,
            targetId: shot.targetId,
            positionFine: { ...shot.positionFine },
            remainingMs: shot.remainingMs,
            damageStyle: shot.damageStyle,
            fineZ: shot.fineZ,
            heightFine: shot.impactResolved
              ? 0
              : shotArcHeightFine(shot.damageStyle, shot.remainingMs, shot.totalTravelTimeMs),
            ...(shot.imageAsset ? { imageAsset: shot.imageAsset } : {}),
            animationFrame: shot.animationFrame,
            ...(shot.explosionRemainingMs > 0 ? { explosionRemainingMs: shot.explosionRemainingMs } : {}),
          })),
          ...(wave?.rocketSparkles.length ? {
            rocketSparkles: wave.rocketSparkles.map(({ id, positionFine, remainingMs, animationFrame, fineZ }) => ({
              id,
              positionFine: { ...positionFine },
              remainingMs,
              animationFrame,
              fineZ,
            })),
          } : {}),
          drawOrder: drawOrderQueue.items(),
          recruitPool: (scenario.recruitableUnits ?? []).map((definition) => ({
            unitType: definition.id,
            name: clone(definition.name),
            price: definition.price,
            spawnLocationType: definition.spawnLocationType,
            count: wave?.recruitPool[definition.id] ?? 0,
          })),
          events: clone([...sessionEvents, ...(wave?.events ?? [])]),
          ...(wave && scenario.previewWave ? {
            wave: {
              number: wave.number,
              ...(campaignMode ? { totalWaves: campaignWaveCount } : {}),
              phase: wave.phase,
              lives: wave.lives,
              maxLives: scenario.previewWave.initialLives,
              escapedEnemies: wave.escapedEnemies,
              defeatedEnemies: wave.defeatedEnemies,
              cash: wave.cash,
              activeEnemies: wave.enemies.filter((enemy) => enemy.alive).length,
              ...(campaignMode ? {
                pendingSpawnRequests: campaignPendingRequests(wave.campaignSpawnPools),
                spawnIndicators: campaignSpawnIndicators(wave.campaignSpawnPools, spawnFields),
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
        singleStep(input: { deltaMs?: number; tileSizePixels?: number } = {}): GameView {
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

          if (intent.type === 'play-gambler') {
            if (!wave || !scenario.gambler || typeof intent.unitId !== 'string'
              || typeof intent.commandId !== 'string' || !intent.commandId.trim() || intent.commandId.length > 128) {
              return false;
            }
            const existingUnitId = gamblerCommands.get(intent.commandId);
            if (existingUnitId !== undefined) return existingUnitId === intent.unitId;
            const unit = units.find((candidate) => candidate.definition.id === intent.unitId);
            if (!unit?.selected || !unit.gambler || unit.definition.type !== 'gambler'
              || unit.gambler.cooldownRemainingMs > 0
              || wave.cash < getGamblerStake(unit.gambler.completedGames)) return false;
            gamblerCommands.set(intent.commandId, intent.unitId);
            pending.push({
              sequence: nextIntentSequence,
              intent: { type: 'play-gambler', unitId: intent.unitId, commandId: intent.commandId },
            });
            nextIntentSequence += 1;
            return true;
          }

          if (intent.type === 'move-unit') {
            if (!Number.isFinite(intent.targetX) || !Number.isFinite(intent.targetY)
              || !units.some((unit) => unit.selected && isActivePlayerUnit(unit)
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
        advance(input: { deltaMs?: number; tileSizePixels?: number } = {}): GameView {
          assertOpen();
          if (paused) return observe();
          if (wave?.settlement) {
            wave.events = [];
            sessionEvents.length = 0;
            return observe();
          }
          for (const shot of wave?.shots ?? []) {
            if (!shot.fineZTransitionPending) continue;
            shot.fineZ = 0;
            shot.fineZTransitionPending = false;
          }
          const deltaMs = normalizedDelta(input.deltaMs);
          const tileSizePixels = normalizedTileSizePixels(input.tileSizePixels, scenario);
          frame += 1;
          elapsedMs += deltaMs;
          for (const unit of units) {
            if (unit.gambler) {
              unit.gambler.cooldownRemainingMs = Math.max(0, unit.gambler.cooldownRemainingMs - deltaMs);
            }
          }
          if (wave) wave.events = [];
          sessionEvents.length = 0;
          if (bonusNotice) {
            bonusNotice.remainingMs -= deltaMs;
            if (bonusNotice.remainingMs <= 0) bonusNotice = undefined;
          }
          let waveStarted = false;
          const drawOrderCreationOrder: string[] = [];
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
                    + utilRandom.nextInt(scenario.previewWave.speedMultiplierCount);
                  const speed = Math.trunc((scenario.previewWave.baseEnemySpeed * speedMultiplier) / 100);
                  const enemy = createPreviewEnemy('preview-pioneer-' + (index + 1), spawn, scenario.previewWave, speed);
                  wave.enemies.push(enemy);
                  drawOrderCreationOrder.push('enemy:' + enemy.id);
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
              if (campaignMode) {
                queueCampaignUnitForSpawn(campaignUnitPoolRuntime, scenario.campaignUnitPool, unit.definition.type);
              }
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
              const hireSound = unit.definition.hireSound ?? (unit.definition.type === 'gunslinger'
                ? 'sound_desperado_yihaa'
                : unit.definition.type === 'mexican' ? 'sound_mexican_arriba' : undefined);
              if (hireSound) {
                wave.events.push({
                  type: 'sound-requested',
                  sound: hireSound,
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

            if (command.intent.type === 'play-gambler') {
              const intent = command.intent;
              const unit = units.find((candidate) => candidate.definition.id === intent.unitId);
              const gambler = unit?.gambler;
              if (!wave || !scenario.gambler || !unit?.selected || !gambler) continue;

              const stake = getGamblerStake(gambler.completedGames);
              if (gambler.cooldownRemainingMs > 0) {
                wave.events.push({
                  type: 'gambler-round-rejected',
                  unitId: unit.definition.id,
                  reason: 'cooldown',
                  stake,
                  availableCash: wave.cash,
                  cooldownRemainingMs: gambler.cooldownRemainingMs,
                });
                continue;
              }

              const result = resolveGamblerRound({
                cash: wave.cash,
                completedGames: gambler.completedGames,
                unlockedUnitTypes: gamblerPrizeUnitTypes,
                isFirstRandom: rulesRandom.isFirstRandom(),
                random: rulesRandom,
              });
              if (result.status === 'insufficient-funds') {
                wave.events.push({
                  type: 'gambler-round-rejected',
                  unitId: unit.definition.id,
                  reason: 'insufficient-funds',
                  stake: result.stake,
                  availableCash: result.availableCash,
                  cooldownRemainingMs: gambler.cooldownRemainingMs,
                });
                continue;
              }

              const handDeal = dealGamblerHand(result.outcome.hand, rulesRandom);
              const round: GamblerRoundView = {
                id: `${unit.definition.id}-round-${result.completedGamesAfter}`,
                stake: result.stake,
                outcome: clone(result.outcome),
                templateIndex: handDeal.templateIndex,
                cards: clone(handDeal.cards),
              };
              wave.cash = result.cashAfterRound;
              gambler.completedGames = result.completedGamesAfter;
              gambler.cooldownRemainingMs = scenario.gambler.cooldownMs;
              gambler.lastRound = round;
              if (result.outcome.type === 'unit') {
                gambler.pendingPrize = {
                  unitType: result.outcome.unitType,
                  remainingMs: 500,
                  unitId: `${unit.definition.id}-prize-${result.completedGamesAfter}`,
                };
              }
              wave.events.push({
                type: 'gambler-round-played',
                unitId: unit.definition.id,
                round: clone(round),
                cashAfterRound: wave.cash,
              });
              continue;
            }

            if (command.intent.type === 'move-unit') {
              const selectedUnit = units.find((unit) => unit.selected && isActivePlayerUnit(unit));
              if (selectedUnit) {
                const targetX = Math.round(Math.max(-0.5, Math.min(scenario.map.width + 0.5, command.intent.targetX)) * FINE_UNITS_PER_CELL);
                const targetY = Math.round(Math.max(-0.5, Math.min(scenario.map.height + 0.5, command.intent.targetY)) * FINE_UNITS_PER_CELL);
                if (selectedUnit.definition.movementGroupId) {
                  const group = units.filter(({ definition }) => (
                    definition.movementGroupId === selectedUnit.definition.movementGroupId
                  ));
                  const deltaX = targetX - selectedUnit.positionFine.x;
                  for (const member of group) {
                    member.movementTargetFine = {
                      x: member.positionFine.x + deltaX,
                      y: member.positionFine.y,
                    };
                  }
                } else {
                  selectedUnit.movementTargetFine = { x: targetX, y: targetY };
                }
              }
              continue;
            }

            const selection = command.intent;
            if (selection.type !== 'select-at') continue;
            const target = [...units].reverse().find((unit) => {
              const current = unitView(unit, scenario.maxUpgrades ?? 0, elapsedMs);
              return contains(current.hitArea, selection.x, selection.y);
            });
            if (target) {
              for (const unit of units) {
                unit.selected = unit === target;
                unit.movementTargetFine = undefined;
              }
              if (target.definition.selectionSound) {
                const event: GameEvent = { type: 'sound-requested', sound: target.definition.selectionSound };
                if (wave) wave.events.push(event);
                else sessionEvents.push(event);
              }
              continue;
            }
            const priorityTarget = nearestPriorityTargetAt(selection.x, selection.y, wave?.enemies ?? []);
            if (priorityTarget) {
              priorityTargetId = priorityTargetId === priorityTarget.id ? undefined : priorityTarget.id;
              continue;
            }
            for (const unit of units) {
              unit.selected = false;
              unit.movementTargetFine = undefined;
            }
          }

          const spawnedGamblerPrizes: MutableUnit[] = [];
          for (const unit of units) {
            const gambler = unit.gambler;
            const pendingPrize = gambler?.pendingPrize;
            if (!gambler || !pendingPrize || deltaMs <= 0) continue;
            pendingPrize.remainingMs = Math.trunc(pendingPrize.remainingMs - deltaMs);
            if (pendingPrize.remainingMs >= 500) continue;

            const template = scenario.units.find(({ type }) => type === GAMBLER_UNIT_TYPE_NAMES[pendingPrize.unitType]);
            if (!template) throw new Error(`Gambler prize template is missing for unit type ${pendingPrize.unitType}`);
            const spawned = gamblerPrizeUnit(template, pendingPrize.unitType, pendingPrize.unitId, gambler.casinoCell);
            spawnedGamblerPrizes.push(spawned);
            gambler.pendingPrize = undefined;
            wave?.events.push({
              type: 'gambler-prize-spawned',
              gamblerId: unit.definition.id,
              unitId: spawned.definition.id,
              unitType: pendingPrize.unitType,
              cell: { ...gambler.casinoCell },
            });
            drawOrderCreationOrder.push('unit:' + spawned.definition.id);
          }
          units.push(...spawnedGamblerPrizes);

          for (const unit of units) updateSteamEmitter(unit, deltaMs, utilRandom);

          const previousPositions = new Map(units.map((unit) => [unit, { ...unit.positionFine }]));
          const movedGroupIds = new Set<string>();
          for (const unit of units) {
            const groupId = unit.definition.movementGroupId;
            if (groupId) {
              if (movedGroupIds.has(groupId)) continue;
              movedGroupIds.add(groupId);
              const group = units.filter(({ definition }) => definition.movementGroupId === groupId);
              const leader = group.find((member) => member.selected && member.movementTargetFine)
                ?? group.find((member) => member.movementTargetFine);
              if (leader) moveUnitGroup(group, leader, scenario, deltaMs, tileSizePixels);
              continue;
            }
            moveUnit(unit, scenario, deltaMs, tileSizePixels);
          }

          for (const unit of units) {
            if (unit.bonusAttribute !== undefined) {
              if ((unit.bonusRemainingMs ?? 0) > 0) {
                unit.bonusRemainingMs = Math.trunc((unit.bonusRemainingMs ?? 0) - deltaMs);
              } else {
                unit.bonusAttribute = undefined;
                unit.bonusRemainingMs = undefined;
              }
            }
            const previousPosition = previousPositions.get(unit) ?? { ...unit.positionFine };
            const deltaX = unit.positionFine.x - previousPosition.x;
            const deltaY = unit.positionFine.y - previousPosition.y;
            const didMove = deltaX !== 0 || deltaY !== 0;
            if (didMove && !unit.definition.movementGroupId) advanceWalkingAnimation(unit, deltaX, deltaY);
            advanceShootingAnimation(unit, deltaMs, didMove);
            if (!didMove || !wave || !campaignBonusCratePool || !isActivePlayerUnit(unit)) continue;
            for (const crate of campaignBonusCratePool.crates) {
              if (crate.phase !== 'active' || !unitMovementCrossesBonusCrate(previousPosition, unit.positionFine, crate)) continue;
              if (!beginCampaignBonusCrateDespawn(crate)) continue;
              if (crate.rewardType === 1) {
                wave.lives = campaignBonusLivesAfterPickup(
                  wave.lives,
                  scenario.previewWave?.initialLives ?? wave.lives,
                );
              } else if (crate.rewardType === 2) {
                wave.cash += 25;
              } else {
                unit.bonusAttribute = crate.rewardType;
                unit.bonusRemainingMs = 60_000;
              }
              wave.events.push({
                type: 'bonus-crate-collected',
                crateId: crate.id,
                unitId: unit.definition.id,
                rewardType: crate.rewardType,
              });
              wave.events.push({ type: 'sound-requested', sound: 'sound_level_up' });
              bonusNotice = {
                rewardType: crate.rewardType,
                remainingMs: 1_200,
              };
              break;
            }
          }

          if (wave?.phase === 'active' && !waveStarted && scenario.previewWave) {
            const campaignDefinition = campaignWaves?.find(({ number }) => number === wave!.number);
            for (const sparkle of wave.rocketSparkles) {
              sparkle.remainingMs = Math.max(0, sparkle.remainingMs - deltaMs);
              sparkle.animationFrame = Math.min(2, Math.floor((299 - sparkle.remainingMs) / 100));
            }
            wave.rocketSparkles = wave.rocketSparkles.filter(({ remainingMs }) => remainingMs > 0);
            const movingEnemies = [...wave.enemies];
            wave.poisonDamageTimerMs += deltaMs;
            const poisonDamageTick = wave.poisonDamageTimerMs > 250;
            if (poisonDamageTick) wave.poisonDamageTimerMs -= 250;
            let movementBlockedEnemyId: string | undefined;
            for (let enemyIndex = 0; enemyIndex < movingEnemies.length; enemyIndex += 1) {
              const enemy = movingEnemies[enemyIndex]!;
              if (!enemy.alive) {
                enemy.deathRemainingMs -= deltaMs;
                if (campaignMode && (enemy.type === 4 || enemy.type === 5 || enemy.type === 6)
                  && enemy.deathRemainingMs < 500 && !enemy.wagonPartsCreated
                  && campaignDefinition && wave.dynamicDifficulty !== undefined) {
                  enemy.wagonPartsCreated = true;
                  const debris = createWagonDebris(
                    enemy, utilRandom, () => `wagon-part-${nextWagonPartNumber++}`,
                  );
                  wave.wagonDebris.push(...debris);
                  drawOrderCreationOrder.push(...debris.map(({ id }) => 'wagon-debris:' + id));
                  const averagePassengerCount = enemy.type === 4 ? 2 : enemy.type === 5 ? 4 : 0;
                  const passengerCount = Math.trunc(utilRandom.nextInt(
                    Math.trunc(wave.dynamicDifficulty / 50) + (averagePassengerCount * 10),
                  ) / 10);
                  const passengerSpeedPercent = 90 + utilRandom.nextInt(20);
                  const spawn: WaveSpawn = {
                    cell: { x: fullCell(enemy.positionFine.x), y: fullCell(enemy.positionFine.y) },
                    direction: enemy.direction,
                  };
                  for (let slot = 0; slot < Math.min(4, passengerCount); slot += 1) {
                    const type = (utilRandom.nextInt(2) + 1) as 1 | 2;
                    const colorVariant = utilRandom.nextInt(2);
                    const passengerGroupId = `wagon-passenger-group-${enemy.id}-${slot + 1}`;
                    const enemyDefinition = campaignEnemyDefinition(scenario, type);
                    const passenger = createCampaignEnemy(
                      `wagon-passenger-${enemy.id}-${slot + 1}`,
                      type,
                      spawn,
                      { ...enemy.positionFine },
                      WAGON_PASSENGER_DRAWING_OFFSETS[slot]!,
                      campaignEnemySpeed(scenario, campaignDefinition, passengerSpeedPercent),
                      campaignEnemyHitPoints(
                        scenario, campaignDefinition, wave.dynamicDifficulty, difficulty, type,
                      ),
                      enemyDefinition,
                      passengerGroupId,
                      colorVariant,
                    );
                    wave.enemies.push(passenger);
                    drawOrderCreationOrder.push('enemy:' + passenger.id);
                  }
                }
                continue;
              }
              if (poisonDamageTick && enemy.poisoned) {
                const poisonDamage = Math.trunc(
                  (enemy.poisonDamage * damagePenetration(enemy, 'poison')) / 100,
                );
                if (poisonDamage > 0) applyEnemyDamage(wave, enemy, poisonDamage, priorityMap, campaignMode);
                enemy.poisoned = false;
                enemy.poisonDamage = 0;
                if (!enemy.alive) continue;
              }
              const movementBlocked = movementBlockedEnemyId === enemy.id;
              movementBlockedEnemyId = undefined;
              const result = moveEnemy(enemy, deltaMs, scenario, utilRandom, wave.enemies, movementBlocked);
              if (result.collisionBlocked) {
                const nextEnemy = movingEnemies[enemyIndex + 1];
                if (nextEnemy?.groupId === enemy.groupId) movementBlockedEnemyId = nextEnemy.id;
              }
              if (!result.escaped && enemy.damageOverTime > 0) {
                // APK EnemyDirector.moveEnemys() applies post damage using fire penetration.
                const postDamage = Math.trunc((enemy.damageOverTime * deltaMs) / 100);
                const fireDamage = Math.trunc((postDamage * damagePenetration(enemy, 'fire')) / 100);
                if (fireDamage > 0) applyEnemyDamage(wave, enemy, fireDamage, priorityMap, campaignMode);
                enemy.damageOverTimeRemainingMs = Math.trunc(enemy.damageOverTimeRemainingMs - deltaMs);
                if (enemy.damageOverTimeRemainingMs <= 0) enemy.damageOverTime = 0;
              }
              if (!result.escaped) continue;
              for (const shot of wave.shots) {
                if (!shot.impactResolved && shot.targetId === enemy.id) {
                  shot.targetPositionFine = enemyShotPosition(enemy);
                }
              }
              wave.enemies = wave.enemies.filter((candidate) => candidate !== enemy);
              // APK removeEnemyWithPenalty() removes type-8 tow objects without charging a life.
              if (enemy.type !== 8) {
                const escapePenalty = campaignMode
                  ? campaignEscapePenalty(enemy.type)
                  : scenario.previewWave.escapePenalty;
                if (campaignMode) {
                  recordCampaignEscape(wave, scenario.previewWave.initialLives, escapePenalty);
                }
                wave.lives = Math.max(0, wave.lives - escapePenalty);
              }
              wave.escapedEnemies += 1;
            }
            updateWagonDebris(wave.wagonDebris, deltaMs);

            for (const unit of units) {
              if (!isActivePlayerUnit(unit)) continue;
              const weapon = unit.weapon;
              if (!weapon) continue;
              if (unit.weaponCooldownMs > 0) unit.weaponCooldownMs = Math.trunc(unit.weaponCooldownMs - deltaMs);
              if (unit.movementTargetFine) continue;
              if (unit.weaponCooldownMs > 0) continue;

              const target = selectTarget(unit, wave.enemies, priorityMap, priorityTargetId);
              if (!target) continue;
              const distanceSquare = unitEnemyDistanceSquare(unit, target);
              const maxSquareRange = maxUnitWeaponSquareRange(unit);
              const genericStartFine = {
                x: unit.positionFine.x,
                y: unit.positionFine.y - FIELD_CENTER_HALF,
              };
              const startFine = weapon.damageStyle === 6 ? rocketLaunchPosition(unit, target) : genericStartFine;
              const rocketTiming = weapon.damageStyle === 6
                ? rocketFirstLegDurationMs(distanceSquare, maxSquareRange, weapon.projectileSpeed)
                : undefined;
              const targetPositionFine = enemyShotPosition(target);
              const rocketDeltaX = targetPositionFine.x - startFine.x;
              const rocketDeltaY = targetPositionFine.y - startFine.y;
              const rocketDistanceFine = Math.hypot(rocketDeltaX, rocketDeltaY);
              const travelMs = rocketTiming?.durationMs ?? projectileTravelTime(distanceSquare, maxSquareRange, weapon);
              const shot: MutableShot = {
                id: 'preview-shot-' + nextShotNumber,
                shooterId: unit.definition.id,
                targetId: target.id,
                damage: Math.trunc(weapon.damage * (unit.bonusAttribute === 4 ? 150 : 100) / 100),
                damageType: weapon.damageType,
                postDamage: Math.trunc((weapon.postDamage ?? 0) * (unit.bonusAttribute === 4 ? 150 : 100) / 100),
                postDamageDurationMs: weapon.postDamageDurationMs ?? 0,
                poisonDamage: Math.trunc((weapon.poisonDamage ?? 0) * (unit.bonusAttribute === 4 ? 150 : 100) / 100),
                poisonDurationMs: weapon.poisonDurationMs ?? 0,
                poisonRemainingMs: 0,
                damageStyle: weapon.damageStyle,
                areaDamageFine: weapon.areaDamageFine ?? 0,
                imageAsset: weapon.damageStyle === 6 ? 'sfx_pyromaniac_rocket'
                  : weapon.damageStyle === 3 ? 'sfx_mexican_dynamite'
                    : weapon.damageStyle === 5 ? 'sfx_salesman_bottle' : undefined,
                animationFrame: 0,
                startFine,
                targetPositionFine,
                positionFine: { ...startFine },
                fineZ: 7680,
                fineZTransitionPending: false,
                totalTravelTimeMs: travelMs,
                remainingMs: travelMs,
                impactResolved: false,
                explosionRemainingMs: 0,
                ...(rocketTiming ? {
                  rocket: {
                    hasJumped: false,
                    speedMs: weapon.projectileSpeed,
                    endFine: { ...targetPositionFine },
                    maxRangeTenthTiles: rocketTiming.maxRangeTenthTiles,
                    normal: rocketDistanceFine > 0
                      ? { x: -rocketDeltaY / rocketDistanceFine, y: rocketDeltaX / rocketDistanceFine }
                      : { x: 0, y: 0 },
                    zigZagFactor: rocketTiming.zigZagFactor,
                    lastBurstFine: { ...startFine },
                    damageDone: false,
                  },
                } : {}),
              };
              wave.shots.push(shot);
              drawOrderCreationOrder.push('shot:' + shot.id);
              nextShotNumber += 1;
              unit.shootingAnimationElapsedMs = 0;
              unit.shootingAnimationFrame = 0;
              const firingDirection = {
                x: Math.sign(target.positionFine.x - unit.positionFine.x) as -1 | 0 | 1,
                y: Math.sign(target.positionFine.y - genericStartFine.y) as -1 | 0 | 1,
              };
              unit.shootingDirection = firingDirection;
              if (unit.definition.type === 'train-12') unit.weaponFacingDirection = firingDirection;
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
              if (unit.bonusAttribute === 3) {
                unit.weaponCooldownMs = Math.trunc(unit.weaponCooldownMs * 100 / 150);
              }
              wave.events.push({ type: 'unit-fired', unitId: unit.definition.id, targetId: target.id, specialReload });
              const shotSound = unit.definition.shotSound
                ?? (unit.definition.type === 'gunslinger' && weapon.damageStyle === 0 ? 'sound_revolver' : undefined);
              if (shotSound) {
                wave.events.push({ type: 'sound-requested', sound: shotSound, positionFine: { ...startFine } });
              }
            }

            for (const shot of [...wave.shots]) {
              if (shot.impactResolved) {
                if (shot.damageStyle === 5) {
                  if (shot.poisonRemainingMs > 0) {
                    wave.poisonApplicationTimerMs += deltaMs;
                    if (wave.poisonApplicationTimerMs > 100) {
                      wave.poisonApplicationTimerMs = 0;
                      const areaSquare = poisonAreaRadiusSquare(shot);
                      for (const enemy of wave.enemies) {
                        if (!enemy.alive || enemy.hitPoints <= 0 || !enemy.damageable || enemy.type === 8) continue;
                        if (enemy.id !== shot.targetId
                          && shotTargetDistanceSquare(shot.positionFine, enemy) >= areaSquare) continue;
                        applyEnemyPoison(enemy, shot.poisonDamage, shot.poisonDurationMs);
                      }
                    }
                  }
                  shot.poisonRemainingMs = Math.max(0, shot.poisonRemainingMs - deltaMs);
                  shot.remainingMs = shot.poisonRemainingMs;
                  shot.animationFrame = 5 - (Math.trunc(shot.poisonRemainingMs / 100) % 6);
                  if (shot.poisonRemainingMs === 0) {
                    wave.shots = wave.shots.filter((candidate) => candidate !== shot);
                  }
                  continue;
                }
                shot.explosionRemainingMs = Math.max(0, shot.explosionRemainingMs - deltaMs);
                shot.remainingMs = shot.explosionRemainingMs;
                shot.animationFrame = Math.min(7, Math.floor((799 - shot.explosionRemainingMs) / 100));
                if (shot.explosionRemainingMs === 0) {
                  wave.shots = wave.shots.filter((candidate) => candidate !== shot);
                }
                continue;
              }
              const target = wave.enemies.find((enemy) => enemy.id === shot.targetId);
              if (shot.rocket) {
                const rocket = shot.rocket;
                const motion = advanceRocketShot(shot, target, deltaMs, scenario, rocketAngleRandom);
                const areaRadiusTenthTiles = Math.trunc((shot.areaDamageFine * 10) / FINE_UNITS_PER_CELL);
                const areaSquare = areaRadiusTenthTiles * areaRadiusTenthTiles;
                if (motion.pathBurst) {
                  const sparkle: MutableRocketSparkle = {
                    id: 'rocket-sparkle-' + nextRocketSparkleNumber++,
                    positionFine: { ...shot.positionFine },
                    remainingMs: 299,
                    animationFrame: 0,
                    fineZ: shot.fineZ,
                  };
                  wave.rocketSparkles.push(sparkle);
                  drawOrderCreationOrder.push('rocket-sparkle:' + sparkle.id);
                  if (shot.areaDamageFine > 0 || rocket.hasJumped) {
                    for (const enemy of wave.enemies) {
                      if (!enemy.alive || !enemy.damageable
                        || shotTargetDistanceSquare(shot.positionFine, enemy) >= areaSquare) continue;
                      const damage = Math.trunc((shot.damage * damagePenetration(enemy, shot.damageType)) / 100);
                      applyEnemyDamage(wave, enemy, damage, priorityMap, campaignMode);
                      if (shot.postDamage > 0) {
                        enemy.damageOverTime = shot.postDamage;
                        enemy.damageOverTimeRemainingMs = Math.max(
                          enemy.damageOverTimeRemainingMs,
                          shot.postDamageDurationMs,
                        );
                      }
                    }
                  }
                }

                shot.animationFrame = rocketOrientationFrame(shot);
                if (!motion.finished || rocket.damageDone) continue;

                const affected = shot.areaDamageFine > 0
                  ? wave.enemies.filter((enemy) => enemy.alive && enemy.damageable && (
                    (!rocket.hasJumped && enemy.id === shot.targetId)
                    || shotTargetDistanceSquare(shot.positionFine, enemy) < areaSquare
                  ))
                  : (!rocket.hasJumped && target?.alive && target.damageable ? [target] : []);
                const affectedEnemyIds: string[] = [];
                rocket.damageDone = true;
                wave.poisonApplicationTimerMs = 0;
                for (const hitEnemy of affected) {
                  affectedEnemyIds.push(hitEnemy.id);
                  const damage = Math.trunc((shot.damage * damagePenetration(hitEnemy, shot.damageType)) / 100);
                  applyEnemyDamage(wave, hitEnemy, damage, priorityMap, campaignMode);
                  if (shot.postDamage > 0) {
                    hitEnemy.damageOverTime = shot.postDamage;
                    hitEnemy.damageOverTimeRemainingMs = Math.max(
                      hitEnemy.damageOverTimeRemainingMs,
                      shot.postDamageDurationMs,
                    );
                  }
                }
                wave.events.push({
                  type: 'sound-requested',
                  sound: 'sound_rocket_explosion',
                  positionFine: { ...shot.positionFine },
                });
                shot.impactResolved = true;
                shot.imageAsset = 'sfx_rocket_explosion';
                shot.explosionRemainingMs = 799;
                shot.remainingMs = 799;
                shot.animationFrame = 0;
                shot.targetPositionFine = { ...shot.positionFine };
                wave.events.push({
                  type: 'shot-exploded',
                  shotId: shot.id,
                  targetId: shot.targetId,
                  affectedEnemyIds,
                });
                continue;
              }
              if (target) shot.targetPositionFine = enemyShotPosition(target);
              const targetPositionFine = shot.targetPositionFine;
              shot.remainingMs = Math.max(0, shot.remainingMs - deltaMs);
              const elapsedShotMs = shot.totalTravelTimeMs - shot.remainingMs;
              shot.positionFine = {
                x: Math.trunc(((shot.startFine.x * shot.remainingMs) + (targetPositionFine.x * elapsedShotMs)) / shot.totalTravelTimeMs),
                y: Math.trunc(((shot.startFine.y * shot.remainingMs) + (targetPositionFine.y * elapsedShotMs)) / shot.totalTravelTimeMs),
              };
              shot.animationFrame = Math.floor(elapsedShotMs / 100) % (
                shot.damageStyle === 3 || shot.damageStyle === 5 ? 3 : 10
              );
              if (shot.remainingMs > 0) continue;

              const areaRadiusTenthTiles = Math.trunc((shot.areaDamageFine * 10) / FINE_UNITS_PER_CELL);
              const areaSquare = areaRadiusTenthTiles * areaRadiusTenthTiles;
              wave.poisonApplicationTimerMs = 0;
              const areaCenterFine = target?.positionFine ?? shot.positionFine;
              const affected = shot.areaDamageFine > 0
                ? wave.enemies.filter((enemy) => enemy.alive && enemy.damageable && (
                  enemy.id === shot.targetId
                  || shotTargetDistanceSquare(areaCenterFine, enemy) < areaSquare
                ))
                : target ? [target] : [];
              const affectedEnemyIds: string[] = [];
              for (const hitEnemy of affected) {
                if (!hitEnemy.alive || !hitEnemy.damageable) continue;
                affectedEnemyIds.push(hitEnemy.id);
                const damage = Math.trunc((shot.damage * damagePenetration(hitEnemy, shot.damageType)) / 100);
                applyEnemyDamage(wave, hitEnemy, damage, priorityMap, campaignMode);
                if (shot.postDamage > 0) {
                  hitEnemy.damageOverTime = shot.postDamage;
                  hitEnemy.damageOverTimeRemainingMs = Math.max(
                    hitEnemy.damageOverTimeRemainingMs,
                    shot.postDamageDurationMs,
                  );
                }
              }
              if (shot.damageStyle === 3) {
                wave.events.push({ type: 'sound-requested', sound: 'sound_dynamite', positionFine: { ...shot.positionFine } });
              } else if (shot.damageStyle === 4) {
                wave.events.push({ type: 'sound-requested', sound: 'sound_cannon', positionFine: { ...shot.positionFine } });
              } else if (shot.damageStyle === 5) {
                wave.events.push({ type: 'sound-requested', sound: 'sound_poison_splash', positionFine: { ...shot.positionFine } });
                shot.impactResolved = true;
                shot.imageAsset = 'sfx_poison';
                shot.poisonRemainingMs = Math.max(0, shot.poisonDurationMs - deltaMs);
                shot.remainingMs = shot.poisonRemainingMs;
                shot.animationFrame = 5 - (Math.trunc(shot.poisonRemainingMs / 100) % 6);
                shot.positionFine = { ...targetPositionFine };
                if (shot.poisonRemainingMs === 0) {
                  wave.shots = wave.shots.filter((candidate) => candidate !== shot);
                }
              }
              if (shot.damageStyle === 5) {
                continue;
              }
              if (shot.damageStyle === 3 || shot.areaDamageFine > 0) {
                shot.impactResolved = true;
                shot.explosionRemainingMs = 799;
                shot.remainingMs = 799;
                shot.animationFrame = 0;
                shot.positionFine = { ...targetPositionFine };
                wave.events.push({
                  type: 'shot-exploded',
                  shotId: shot.id,
                  targetId: shot.targetId,
                  affectedEnemyIds,
                });
              } else {
                wave.shots = wave.shots.filter((candidate) => candidate !== shot);
              }
            }

            // The APK calls WaveManager.updateWave() after moving enemies, units, and shots.
            // Spawn requests here so new enemies first move and become targetable next frame.
            if (campaignMode && wave.campaignSpawnPools) {
              for (const pool of wave.campaignSpawnPools) {
                if (pool.delayMs > 0) {
                  pool.delayMs = Math.max(0, pool.delayMs - deltaMs);
                  continue;
                }
                const totalRequests = pool.requests.reduce((sum, count) => sum + count, 0);
                if (totalRequests <= 0) continue;
                let selection = utilRandom.nextInt(totalRequests);
                let selectedRequestIndex = -1;
                for (let index = 0; index < pool.requests.length; index += 1) {
                  selection -= pool.requests[index]!;
                  if (selection < 0) {
                    selectedRequestIndex = index;
                    break;
                  }
                }
                const spawn = [scenario.previewWave.spawn, ...(scenario.previewWave.additionalSpawns ?? [])][pool.spawnPointId];
                const spawnField = spawnFields[pool.spawnPointId];
                if (selectedRequestIndex < 0 || !campaignDefinition || wave.dynamicDifficulty === undefined
                  || !spawn || !spawnField) continue;

                utilRandom.nextInt(1);
                const spawnVector = directionVector(spawnField.direction);
                const candidatePosition = {
                  x: spawnField.positionFine.x - (spawnVector.x * 2 * FINE_UNITS_PER_CELL),
                  y: spawnField.positionFine.y - (spawnVector.y * 2 * FINE_UNITS_PER_CELL),
                };
                const poolType = selectedRequestIndex + 2;
                const requestIntervalMs = pool.intervalMs
                  * (poolType === 7 && pool.intervalMultiplier === undefined ? 2 : 1);
                const collisionProbePosition = {
                  x: candidatePosition.x + (spawnVector.x * FINE_UNITS_PER_CELL),
                  y: candidatePosition.y + (spawnVector.y * FINE_UNITS_PER_CELL),
                };
                if ((poolType === 7 || poolType === 8 || poolType === 9)
                  && campaignSpawnCollides(collisionProbePosition, wave.enemies)) {
                  pool.delayMs = Math.trunc(requestIntervalMs / 2);
                  continue;
                }

                const requestType = poolType === 7 ? 4 : poolType === 8 ? 5 : poolType === 9 ? 6 : poolType;
                const nextGroupId = () => `campaign-${wave!.number}-group-${nextCampaignGroupNumber++}`;
                const nextEnemyId = () => `campaign-${wave!.number}-enemy-${nextCampaignEnemyNumber++}`;
                const spawned = poolType === 7
                  ? spawnCoveredWagonPair(
                    scenario, spawn, candidatePosition, nextGroupId(), wave.dynamicDifficulty,
                    campaignDefinition, difficulty, utilRandom, nextEnemyId,
                  )
                  : poolType === 8
                    ? spawnPostCoachPair(
                      scenario, spawn, candidatePosition, nextGroupId(), wave.dynamicDifficulty,
                      campaignDefinition, difficulty, utilRandom, nextEnemyId,
                    )
                    : poolType === 9
                      ? spawnGoldTransport(
                        scenario, spawn, candidatePosition, nextGroupId(), wave.dynamicDifficulty,
                        campaignDefinition, difficulty, utilRandom, nextEnemyId,
                      )
                    : poolType === 6
                    ? spawnHorseman(
                      scenario, spawn, candidatePosition, nextGroupId(), wave.dynamicDifficulty,
                      campaignDefinition, difficulty, utilRandom, nextEnemyId,
                    )
                  : poolType >= 2 && poolType <= 5
                    ? spawnSettlerGroup(
                      scenario, spawn, candidatePosition, requestType, nextGroupId, wave.dynamicDifficulty,
                      campaignDefinition, difficulty, utilRandom, nextEnemyId,
                    )
                    : undefined;
                if (!spawned) {
                  pool.delayMs = Math.trunc(requestIntervalMs / 2);
                  continue;
                }

                wave.enemies.push(...spawned);
                drawOrderCreationOrder.push(...spawned.map(({ id }) => 'enemy:' + id));
                pool.requests[selectedRequestIndex] = pool.requests[selectedRequestIndex]! - 1;
                pool.delayMs = requestIntervalMs;
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

            if (campaignMode && campaignUnitPoolRuntime && scenario.campaignUnitPool) {
              const spawnedUnits = advanceCampaignUnitPool(
                campaignUnitPoolRuntime,
                scenario.campaignUnitPool,
                deltaMs,
                utilRandom,
                (spawn) => campaignUnitSpawnBlocked(scenario, units, spawn),
              );
              for (const spawn of spawnedUnits) {
                const template = scenario.units.find((unit) => unit.type === spawn.unitType);
                if (!template) throw new Error('Campaign unit pool template disappeared: ' + spawn.unitType);
                const spawnedUnit = campaignSpawnedUnit(template, spawn);
                units.push(spawnedUnit);
                drawOrderCreationOrder.push('unit:' + spawnedUnit.definition.id);
              }
            }

            wave.enemies = wave.enemies.filter((enemy) => enemy.alive || enemy.deathRemainingMs >= 0);
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
              const nextHitPointDifficulty = Math.max(minDifficulty, Math.min(maxDifficulty, rawNextDifficulty));
              const nextCampaignWave = campaignWaves?.find(({ number }) => number === wave!.number + 1);
              if (nextCampaignWave) {
                wave.number = nextCampaignWave.number;
                wave.dynamicDifficulty = rawNextDifficulty;
                wave.difficultyValue = nextHitPointDifficulty;
                wave.difficultyValueCounter = 1;
                wave.campaignSpawnPools = campaignSpawnPools(nextCampaignWave, rawNextDifficulty, true);
                applyCampaignUnitPoolActions(
                  campaignUnitPoolRuntime,
                  scenario.campaignUnitPool,
                  nextCampaignWave.number,
                );
                wave.phase = 'active';
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
          const newlySpawnedBonusCrates = advanceCampaignBonusCratePool(
            campaignBonusCratePool,
            bonusCrateDefinition,
            scenario.map.width,
            scenario.map.height,
            deltaMs,
            wave?.lives ?? 0,
            scenario.previewWave?.initialLives ?? 0,
            utilRandom,
            (cell) => campaignBonusCrateCandidateAllowed(scenario, units, campaignBonusCratePool, cell),
          );
          drawOrderCreationOrder.push(...newlySpawnedBonusCrates.map(({ id }) => `bonus-crate:${id}`));
          if (priorityTargetId && !wave?.enemies.some((enemy) => enemy.id === priorityTargetId && enemy.alive)) {
            priorityTargetId = undefined;
          }
          synchronizeDrawOrder(
            drawOrderQueue,
            drawOrderEntries(scenario, units, wave, campaignBonusCratePool?.crates ?? []),
            drawOrderCreationOrder,
          );
          const nextView = observe();
          recordedFrames.push({
            frame,
            deltaMs,
            tileSizePixels,
            intents: frameCommands.map(({ intent }) => clone(intent)),
          });
          if (frame % GAME_REPLAY_CHECKPOINT_INTERVAL === 0 || nextView.wave?.settlement) {
            replayStates.set(frame, captureReplayState(nextView));
          }
          // The original draw() changes fineZ after drawing the projectile for this frame.
          // Defer the observable change until the next simulation frame so repeated observe()
          // calls and pause redraws keep returning the same view for this frame.
          for (const shot of wave?.shots ?? []) {
            if (shouldTransitionShotFineZ(shot)) shot.fineZTransitionPending = true;
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
          const view = session.advance({ deltaMs: frame.deltaMs, tileSizePixels: frame.tileSizePixels });
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
