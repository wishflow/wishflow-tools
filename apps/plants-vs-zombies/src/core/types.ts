export type PlantBehavior =
  | 'sunflower'
  | 'shooter'
  | 'slow-shooter'
  | 'multi-shooter'
  | 'multi-lane-shooter'
  | 'area-shooter'
  | 'blocker'
  | 'bomb'
  | 'mine'
  | 'eater'
  | 'catapult'
  | 'spike'
  | 'support'
  | 'utility'
  | 'upgrade';

export type PlantAbility =
  | 'anti-air'
  | 'clear-air'
  | 'explode-lane'
  | 'freeze-all'
  | 'hypnotize'
  | 'ignite-projectiles'
  | 'piercing'
  | 'reveal-fog'
  | 'redirect'
  | 'strip-armor'
  | 'destroy-grave'
  | 'wake';

export type LevelTerrain = 'day' | 'night' | 'pool' | 'fog' | 'roof' | 'boss';

export type GamePhase = 'ready' | 'playing' | 'paused' | 'intermission' | 'won' | 'lost';

export interface PlantDefinition {
  id: string;
  title: string;
  titleZh?: string;
  cost: number;
  maxHealth: number;
  cooldownTicks: number;
  behavior: PlantBehavior;
  damage?: number;
  attackIntervalTicks?: number;
  projectileSpeed?: number;
  sunIntervalTicks?: number;
  slowTicks?: number;
  blastRadius?: number;
  sunValue?: number;
  projectilesPerAttack?: number;
  attackRows?: number[];
  armTicks?: number;
  attackRange?: number;
  consumesOnAttack?: boolean;
  slot?: 'platform' | 'base' | 'overlay';
  plantableOn?: 'land' | 'water' | 'roof' | 'any';
  ability?: PlantAbility;
  requiredPlantId?: string;
  consumesRequiredPlant?: boolean;
  shootsBackwards?: boolean;
}

export interface ZombieDefinition {
  id: string;
  title: string;
  titleZh?: string;
  maxHealth: number;
  waveCost: number;
  startingLevel: number;
  firstAllowedWave: number;
  pickWeight: number;
  speedPerTick: number;
  biteDamage: number;
  biteIntervalTicks: number;
  armorHealth?: number;
  jumpIntervalTicks?: number;
  behavior?: 'walker' | 'pole-vault' | 'balloon' | 'burrow' | 'jumper' | 'boss' | 'carrier' | 'dancer';
}

export interface WaveSpawn {
  typeId: string;
  row?: number;
  count?: number;
  rowRange?: [number, number];
}

export interface WaveDefinition {
  atTick: number;
  zombies: WaveSpawn[];
}

export interface LevelDefinition {
  id: string;
  title: string;
  titleZh?: string;
  terrain?: LevelTerrain;
  waterRows?: number[];
  rewardPlantId?: string;
  rows: number;
  columns: number;
  startingSun: number;
  skySunEveryTicks: number;
  mowerRows?: number[];
  graves?: GraveLocation[];
  intermissionAfterWaves?: boolean;
  intermissionEveryWaves?: number;
  waveStartDelayTicks?: number;
  endlessWaveRule?: EndlessWaveRule;
  adventureWavePlan?: AdventureWavePlan;
  survivalWavePlan?: SurvivalWavePlan;
  waves: WaveDefinition[];
}

export interface AdventureWavePlan {
  levelNumber: number;
  waveCount: number;
  eligibleZombieIds: string[];
  introZombieId?: string;
  afterAdventureZombieId?: string;
  bossEncounterId?: string;
  rewardPlantId?: string;
  specialModeId?: 'wall-nut-bowling' | 'whack-a-zombie' | 'little-trouble' | 'scary-potter' | 'stormy-night' | 'bungee-blitz' | 'final-boss';
  wavePointMultiplier?: number;
}

export interface SurvivalWavePlan {
  terrain: Exclude<LevelTerrain, 'boss'>;
  difficulty: 'normal' | 'hard' | 'endless';
  wavesPerStage: 10 | 20;
  totalStages?: 5;
}

export interface EndlessWaveRule {
  zombiePool: string[];
  baseCount: number;
  countEveryWaves: number;
  startDelayTicks: number;
}

export interface GraveLocation {
  row: number;
  column: number;
}

export type GameEvent =
  | { type: 'game-started'; tick: number }
  | { type: 'plant-placed'; tick: number; plantId: string; row: number; column: number }
  | { type: 'plant-removed'; tick: number; plantId: string; row: number; column: number }
  | { type: 'sun-created'; tick: number; sunId: string; value: number }
  | { type: 'sun-collected'; tick: number; sunId: string; value: number }
  | { type: 'zombie-spawned'; tick: number; zombieId: string; typeId: string; row: number }
  | { type: 'zombie-killed'; tick: number; zombieId: string; typeId: string }
  | { type: 'wave-started'; tick: number; waveNumber: number }
  | { type: 'wave-intermission'; tick: number; nextWaveNumber: number }
  | { type: 'mower-activated'; tick: number; row: number }
  | { type: 'game-ended'; tick: number; outcome: 'won' | 'lost' };

export interface PlantEntity {
  id: string;
  typeId: string;
  row: number;
  column: number;
  health: number;
  nextActionTick: number;
  slot: 'platform' | 'base' | 'overlay';
  isAsleep: boolean;
}

export interface ZombieEntity {
  id: string;
  typeId: string;
  row: number;
  x: number;
  health: number;
  maxHealth: number;
  armorHealth: number;
  maxArmorHealth: number;
  nextBiteTick: number;
  slowUntilTick: number;
  hasJumped: boolean;
  team: 'plants' | 'zombies';
  frozenUntilTick: number;
  stunnedUntilTick: number;
  isBurrowed: boolean;
  movingRight: boolean;
  didThrowImp: boolean;
  nextJumpTick: number;
  nextSummonTick: number;
  hasSummonedBackup: boolean;
}

export interface ProjectileEntity {
  id: string;
  row: number;
  x: number;
  damage: number;
  slowTicks: number;
  speedPerTick: number;
  areaRadius: number;
  piercing: boolean;
  canHitAir: boolean;
  stunTicks: number;
  isIgnited: boolean;
}

export interface SunEntity {
  id: string;
  value: number;
  expiresAtTick: number;
}

export interface MowerEntity {
  row: number;
  x: number;
  active: boolean;
  used: boolean;
}

export interface GameSnapshot {
  levelId: string;
  terrain: LevelTerrain;
  waterRows: number[];
  rows: number;
  columns: number;
  phase: GamePhase;
  tick: number;
  sun: number;
  selectedPlantId: string | null;
  allowedPlantIds: string[];
  plants: PlantEntity[];
  zombies: ZombieEntity[];
  projectiles: ProjectileEntity[];
  suns: SunEntity[];
  mowers: MowerEntity[];
  graves: GraveLocation[];
  fogRevealedCells: GraveLocation[];
  spawnedWaveCount: number;
  waveCount: number;
}

export interface GameMetrics {
  seed: string;
  ticks: number;
  sunSpent: number;
  sunCollected: number;
  plantsPlanted: number;
  zombiesSpawned: number;
  zombiesKilled: number;
  mowersUsed: number;
  phase: GamePhase;
}

export type GameCommand =
  | { type: 'START' }
  | { type: 'SELECT_PLANT'; plantId: string }
  | { type: 'PLANT'; row: number; column: number }
  | { type: 'SHOVEL'; row: number; column: number }
  | { type: 'COLLECT_SUN'; sunId: string }
  | { type: 'SET_LOADOUT'; plantIds: string[] }
  | { type: 'CONTINUE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' };

export interface CommandResult {
  accepted: boolean;
  reason?: string;
}

export interface GameOptions {
  seed?: string;
  levelId?: string;
  level?: LevelDefinition;
  registry?: import('./registry').GameRegistry;
  allowedPlantIds?: string[];
  maxLoadoutSize?: number;
  adventureFirstPlaythrough?: boolean;
}
