import map from './new-mexico-02.json';
import { cowGulchDecorationCodes, createSleepingMapUnitsFromGrid } from './cow-gulch';
import { apacheValleyCampaignWaves } from './apache-valley-waves';
import type { Direction, MapDecoration, ScenarioContent, ScenarioUnit, WaveRouteDefinition } from '../game';

const gunslingerWeapon = Object.freeze({
  damage: 140,
  damageType: 'light',
  rangeFine: 38400,
  reloadTimeMs: 500,
  projectileSpeed: 600,
  damageStyle: 0,
  specialReloadTimeMs: 1500,
  specialReloadFrequency: 6,
} as const);

const mexicanWeapon = Object.freeze({
  damage: 500,
  damageType: 'heavy',
  rangeFine: 30720,
  reloadTimeMs: 2500,
  projectileSpeed: 1500,
  damageStyle: 3,
  areaDamageFine: 7680,
  specialReloadTimeMs: 0,
  specialReloadFrequency: 1,
} as const);

const directionsByRedirectCode: Readonly<Record<number, Direction>> = Object.freeze({ 53: 'south', 54: 'west', 55: 'east' });
const apacheValleyDecorationCodes: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  ...cowGulchDecorationCodes,
  72: {
    asset: 'b_1x1_stake',
    collisionBoxFine: { x: 1920, y: 2612, width: 3840, height: 2534 },
  },
  117: {
    asset: 'b_1x1_tipi_small',
    collisionBoxFine: { x: 1920, y: 2612, width: 3840, height: 2534 },
  },
});

function createApacheValleyDecorations(): MapDecoration[] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const decoration = apacheValleyDecorationCodes[code];
    return decoration ? [{ ...decoration, cell: { x, y } }] : [];
  }));
}

function createApacheValleyUnits(): ScenarioUnit[] {
  const units: ScenarioUnit[] = [];
  for (const [y, row] of map.originalTileGrid.entries()) {
    for (const [x, code] of row.entries()) {
      if (code !== 104 && code !== 105) continue;
      const gunslinger = code === 104;
      const id = gunslinger ? `gunslinger-${units.filter((unit) => unit.type === 'gunslinger').length + 1}` : 'mexican-1';
      const render = { x, y: y - 0.375, width: 1, height: 1.375 };
      units.push({
        id,
        type: gunslinger ? 'gunslinger' : 'mexican',
        activity: 5,
        cell: { x, y },
        movementSpeedFinePer100Ms: 1500,
        asset: gunslinger ? 'player_gunslinger' : 'player_mexican',
        frame: { x: 0, y: 0, width: 32, height: 44 },
        render,
        hitArea: { ...render },
        weapon: gunslinger ? gunslingerWeapon : mexicanWeapon,
      });
    }
  }
  return units;
}

const routeDefinitions: readonly WaveRouteDefinition[] = Object.freeze([
  {
    spawn: { cell: { x: 3, y: 0 }, direction: 'south' },
    redirects: [
      { cell: { x: 3, y: 4 }, directions: ['east'] },
      { cell: { x: 5, y: 4 }, directions: ['south'] },
      { cell: { x: 5, y: 10 }, directions: ['east'] },
      { cell: { x: 8, y: 10 }, directions: ['south'] },
      { cell: { x: 8, y: 15 }, directions: ['west'] },
      { cell: { x: 5, y: 15 }, directions: ['south'] },
    ],
    exit: { x: 5, y: 17 },
  },
  {
    spawn: { cell: { x: 4, y: 0 }, direction: 'south' },
    redirects: [
      { cell: { x: 4, y: 3 }, directions: ['east'] },
      { cell: { x: 6, y: 3 }, directions: ['south'] },
      { cell: { x: 6, y: 9 }, directions: ['east'] },
      { cell: { x: 9, y: 9 }, directions: ['south'] },
      { cell: { x: 9, y: 16 }, directions: ['west'] },
      { cell: { x: 6, y: 16 }, directions: ['south'] },
    ],
    exit: { x: 6, y: 17 },
  },
  {
    spawn: { cell: { x: 17, y: 0 }, direction: 'south' },
    redirects: [
      { cell: { x: 17, y: 3 }, directions: ['west'] },
      { cell: { x: 16, y: 3 }, directions: ['south'] },
      { cell: { x: 16, y: 5 }, directions: ['west'] },
      { cell: { x: 12, y: 5 }, directions: ['south'] },
      { cell: { x: 12, y: 11 }, directions: ['east'] },
      { cell: { x: 13, y: 11 }, directions: ['south'] },
      { cell: { x: 13, y: 14 }, directions: ['east'] },
      { cell: { x: 15, y: 14 }, directions: ['south'] },
    ],
    exit: { x: 15, y: 17 },
  },
]);

const redirects = routeDefinitions.flatMap(({ redirects: routeRedirects }) => routeRedirects);

const apacheValleyPreviewWave = Object.freeze({
  number: 1,
  initialLives: 50,
  initialCash: 100,
  enemyHitPointMultiplierPercentByDifficulty: { easy: 75, medium: 140, hard: 170 },
  enemy: {
    hitPoints: 18,
    cashReward: 1,
    penetration: { light: 100, fire: 50, heavy: 25, poison: 75 },
  },
  spawn: routeDefinitions[0]!.spawn,
  additionalSpawns: routeDefinitions.slice(1).map(({ spawn }) => spawn),
  routes: routeDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects,
  exit: routeDefinitions[0]!.exit,
  additionalExits: routeDefinitions.slice(1).map(({ exit }) => exit),
} as const);

export const apacheValleyContent: ScenarioContent = {
  ...map,
  id: 'campaign-new-mexico-02',
  contentVersion: 'gng-free-1.8.6-new-mexico-02-v1',
  title: { en: 'Apache Valley · Level 2', zh: '阿帕奇山谷 · 第 2 关' },
  formalSettlementSupported: true,
  maxUpgrades: 0,
  map: {
    ...map.map,
    decorations: createApacheValleyDecorations(),
  },
  units: [
    ...createApacheValleyUnits(),
    ...createSleepingMapUnitsFromGrid(map.originalTileGrid),
  ]
    .sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x)
    .map((unit) => ({
      ...unit,
      ...(unit.type === 'gunslinger' ? { weapon: gunslingerWeapon } : { weapon: mexicanWeapon }),
    })),
  campaignWaveCount: 6,
  campaignWaves: apacheValleyCampaignWaves,
  campaignEnemy: apacheValleyPreviewWave.enemy,
  campaignEnemyByType: {
    3: { hitPoints: 60, cashReward: 2, penetration: { light: 100, fire: 50, heavy: 25, poison: 75 }, turningDurationMs: 100 },
    4: { hitPoints: 200, cashReward: 10, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 200 },
    8: { hitPoints: 200, cashReward: 0, penetration: { light: 100, fire: 100, heavy: 100, poison: 100 }, turningDurationMs: 100 },
  },
  previewWave: apacheValleyPreviewWave,
};

export const apacheValleyWaveRoutes = routeDefinitions;
