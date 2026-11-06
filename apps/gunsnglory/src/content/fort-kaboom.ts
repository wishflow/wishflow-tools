import map from './new-mexico-03.json';
import { cowGulchDecorationCodes, createSleepingMapUnitsFromGrid } from './cow-gulch';
import {
  createAnchoredMapRender,
  createSleepingFortKaboomUnit,
  type FortKaboomUnitType,
} from './fort-kaboom-unit-designs';
import { fortKaboomUnitPool } from './fort-kaboom-unit-pool';
import { fortKaboomCampaignWaves } from './fort-kaboom-waves';
import type {
  Direction,
  MapDecoration,
  PreviewEnemyDefinition,
  PreviewWaveDefinition,
  ScenarioContent,
  ScenarioUnit,
  WaveRedirect,
  WaveRouteDefinition,
} from '../game';

const decorationCollisionBox = Object.freeze({ x: 1920, y: 2612, width: 3840, height: 2534 });
const fortCollisionBox = Object.freeze({ x: -9408, y: -9600, width: 18048, height: 7680 });

const fortKaboomDecorationCodes: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  ...cowGulchDecorationCodes,
  72: { asset: 'b_1x1_stake', collisionBoxFine: decorationCollisionBox },
  113: {
    asset: 'b_3x2_fort',
    anchorOffsetY: -0.3,
    collisionBoxFine: fortCollisionBox,
  },
  117: { asset: 'b_1x1_tipi_small', collisionBoxFine: decorationCollisionBox },
});

function createFortKaboomDecorations(): MapDecoration[] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const decoration = fortKaboomDecorationCodes[code];
    return decoration ? [{ ...decoration, cell: { x, y } }] : [];
  }));
}

function keepOriginalMapAnchor(unit: ScenarioUnit): ScenarioUnit {
  const render = createAnchoredMapRender(unit.cell, unit.frame);
  const awakeRender = unit.awakeFrame ? createAnchoredMapRender(unit.cell, unit.awakeFrame) : undefined;
  return {
    ...unit,
    render,
    hitArea: { ...render },
    ...(awakeRender ? { awakeRender, awakeHitArea: { ...awakeRender } } : {}),
  };
}

function createFortKaboomUnits(): ScenarioUnit[] {
  const ordinaryUnits = createSleepingMapUnitsFromGrid(map.originalTileGrid).map(keepOriginalMapAnchor);
  const counters = new Map<FortKaboomUnitType, number>();
  const specialUnits = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const type: FortKaboomUnitType | undefined = code === 98
      ? 'cannon'
      : code === 99
        ? 'indian'
        : code === 100
          ? 'sniper'
          : code === 101
            ? 'grandpa'
            : undefined;
    if (!type) return [];

    const index = (counters.get(type) ?? 0) + 1;
    counters.set(type, index);
    const cell = { x, y };
    return [createSleepingFortKaboomUnit(type, cell, index)];
  }));

  return [...ordinaryUnits, ...specialUnits]
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}

type RouteStep = readonly [x: number, y: number, direction: Direction];

function route(
  spawn: RouteStep,
  redirects: readonly RouteStep[],
  exit: { x: number; y: number },
): WaveRouteDefinition {
  return {
    spawn: { cell: { x: spawn[0], y: spawn[1] }, direction: spawn[2] },
    redirects: redirects.map(([x, y, direction]) => ({ cell: { x, y }, directions: [direction] })),
    exit: { ...exit },
  };
}

/** Spawn order follows TDM codes 40–43, which define campaign spawnPointId order. */
export const fortKaboomSpawnPoints = Object.freeze([
  { cell: { x: 5, y: 16 }, direction: 'north' },
  { cell: { x: 0, y: 9 }, direction: 'east' },
  { cell: { x: 0, y: 8 }, direction: 'east' },
  { cell: { x: 11, y: 0 }, direction: 'south' },
] as const);

/** Every directed TDM branch from each entrance to both map exits. */
export const fortKaboomRouteDefinitions: readonly WaveRouteDefinition[] = Object.freeze([
  route([5, 16, 'north'], [
    [5, 14, 'west'], [4, 14, 'north'], [4, 9, 'north'], [4, 3, 'east'], [5, 3, 'east'],
    [9, 3, 'north'], [9, 2, 'east'], [11, 2, 'east'], [14, 2, 'south'], [14, 3, 'east'],
    [19, 3, 'south'], [19, 9, 'west'], [18, 9, 'south'], [18, 14, 'east'],
  ], { x: 21, y: 14 }),
  route([5, 16, 'north'], [
    [5, 14, 'west'], [4, 14, 'north'], [4, 9, 'north'], [4, 3, 'east'], [5, 3, 'east'],
    [9, 3, 'east'], [13, 3, 'south'], [13, 4, 'east'], [18, 4, 'south'], [18, 8, 'west'],
    [17, 8, 'south'], [17, 15, 'east'],
  ], { x: 21, y: 15 }),
  route([0, 9, 'east'], [
    [4, 9, 'north'], [4, 3, 'east'], [5, 3, 'east'], [9, 3, 'north'], [9, 2, 'east'],
    [11, 2, 'east'], [14, 2, 'south'], [14, 3, 'east'], [19, 3, 'south'], [19, 9, 'west'],
    [18, 9, 'south'], [18, 14, 'east'],
  ], { x: 21, y: 14 }),
  route([0, 9, 'east'], [
    [4, 9, 'north'], [4, 3, 'east'], [5, 3, 'east'], [9, 3, 'east'], [13, 3, 'south'],
    [13, 4, 'east'], [18, 4, 'south'], [18, 8, 'west'], [17, 8, 'south'], [17, 15, 'east'],
  ], { x: 21, y: 15 }),
  route([0, 8, 'east'], [
    [3, 8, 'north'], [3, 2, 'east'], [5, 2, 'south'], [5, 3, 'east'], [9, 3, 'north'],
    [9, 2, 'east'], [11, 2, 'east'], [14, 2, 'south'], [14, 3, 'east'], [19, 3, 'south'],
    [19, 9, 'west'], [18, 9, 'south'], [18, 14, 'east'],
  ], { x: 21, y: 14 }),
  route([0, 8, 'east'], [
    [3, 8, 'north'], [3, 2, 'east'], [5, 2, 'south'], [5, 3, 'east'], [9, 3, 'east'],
    [13, 3, 'south'], [13, 4, 'east'], [18, 4, 'south'], [18, 8, 'west'], [17, 8, 'south'],
    [17, 15, 'east'],
  ], { x: 21, y: 15 }),
  route([11, 0, 'south'], [
    [11, 2, 'east'], [14, 2, 'south'], [14, 3, 'east'], [19, 3, 'south'], [19, 9, 'west'],
    [18, 9, 'south'], [18, 14, 'east'],
  ], { x: 21, y: 14 }),
]);

const redirectDirectionsByCell = new Map<string, { cell: { x: number; y: number }; directions: Direction[] }>();
for (const routeDefinition of fortKaboomRouteDefinitions) {
  for (const redirect of routeDefinition.redirects) {
    const key = `${redirect.cell.x},${redirect.cell.y}`;
    const existing = redirectDirectionsByCell.get(key);
    if (existing) {
      for (const direction of redirect.directions) {
        if (!existing.directions.includes(direction)) existing.directions.push(direction);
      }
    } else {
      redirectDirectionsByCell.set(key, { cell: { ...redirect.cell }, directions: [...redirect.directions] });
    }
  }
}

/** Redirect choices merge every source route so a shared TDM cell retains all legal branches. */
export const fortKaboomPreviewRedirects: readonly WaveRedirect[] = Object.freeze(
  [...redirectDirectionsByCell.values()].map(({ cell, directions }) => Object.freeze({
    cell: Object.freeze(cell),
    directions: Object.freeze(directions),
  })),
);

const fortKaboomBaseEnemy: PreviewEnemyDefinition = Object.freeze({
  hitPoints: 18,
  cashReward: 1,
  penetration: Object.freeze({ light: 100, fire: 50, heavy: 25, poison: 75 }),
});

/** Type-specific values map to enemyDesignData rows 3, 4, 5, and 8 for map03 traffic. */
export const fortKaboomCampaignEnemyByType: Partial<Readonly<Record<1 | 2 | 3 | 4 | 5 | 8, PreviewEnemyDefinition>>> = Object.freeze({
  3: Object.freeze({
    hitPoints: 60,
    cashReward: 2,
    penetration: Object.freeze({ light: 100, fire: 50, heavy: 25, poison: 75 }),
    turningDurationMs: 100,
  }),
  4: Object.freeze({
    hitPoints: 200,
    cashReward: 10,
    penetration: Object.freeze({ light: 50, fire: 100, heavy: 66, poison: 100 }),
    turningDurationMs: 200,
  }),
  5: Object.freeze({
    hitPoints: 300,
    cashReward: 15,
    penetration: Object.freeze({ light: 50, fire: 100, heavy: 66, poison: 100 }),
    turningDurationMs: 100,
  }),
  8: Object.freeze({
    hitPoints: 200,
    cashReward: 0,
    penetration: Object.freeze({ light: 100, fire: 100, heavy: 100, poison: 100 }),
    turningDurationMs: 100,
  }),
});

const uniqueExits = [...new Map(fortKaboomRouteDefinitions.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()];

/** Formal map03 wave context built from the seven verified TDM branches and four source entrances. */
export const fortKaboomPreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 50,
  initialCash: 300,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 150, hard: 188 }),
  enemy: fortKaboomBaseEnemy,
  spawn: fortKaboomSpawnPoints[0],
  additionalSpawns: Object.freeze(fortKaboomSpawnPoints.slice(1)),
  routes: fortKaboomRouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: fortKaboomPreviewRedirects,
  exit: uniqueExits[0]!,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const fortKaboomCampaignEnemy: PreviewEnemyDefinition = fortKaboomBaseEnemy;
export { fortKaboomCampaignWaves };

export const fortKaboomContent: ScenarioContent = {
  ...map,
  id: 'campaign-new-mexico-03',
  contentVersion: 'gng-free-1.8.6-new-mexico-03-fort-crates-v1',
  title: { en: 'Fort Kaboom · Level 3', zh: 'Fort Kaboom · 第 3 关' },
  maxUpgrades: 0,
  campaignUnitPool: fortKaboomUnitPool,
  campaignBonusCratePool: {
    totalCount: 10,
    intervalMs: 10,
    simultaneousLimit: 22,
    rewardTypeCount: 4,
  },
  map: {
    ...map.map,
    decorations: createFortKaboomDecorations(),
  },
  units: createFortKaboomUnits(),
};
