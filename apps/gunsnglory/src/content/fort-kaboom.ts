import map from './new-mexico-03.json';
import { cowGulchDecorationCodes, createSleepingMapUnitsFromGrid } from './cow-gulch';
import { fortKaboomUnitDesigns, type FortKaboomUnitType } from './fort-kaboom-unit-designs';
import { fortKaboomUnitPool } from './fort-kaboom-unit-pool';
import type { Direction, MapDecoration, ScenarioContent, ScenarioUnit, WaveRouteDefinition } from '../game';

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

function anchoredRender(cell: { x: number; y: number }, frame: { width: number; height: number }) {
  const width = frame.width / 32;
  const height = frame.height / 32;
  return { x: cell.x + 0.5 - (width / 2), y: cell.y + 0.75 - height, width, height };
}

function keepOriginalMapAnchor(unit: ScenarioUnit): ScenarioUnit {
  const render = anchoredRender(unit.cell, unit.frame);
  const awakeRender = unit.awakeFrame ? anchoredRender(unit.cell, unit.awakeFrame) : undefined;
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

    const design = fortKaboomUnitDesigns[type];
    const index = (counters.get(type) ?? 0) + 1;
    counters.set(type, index);
    const cell = { x, y };
    const render = anchoredRender(cell, design.sleepFrame);
    const awakeRender = anchoredRender(cell, design.awakeFrame);
    return [{
      id: `${type}-hire-${String(index).padStart(2, '0')}`,
      type,
      activity: 4 as const,
      hirePrice: design.hirePrice,
      awakeAsset: design.awakeAsset,
      awakeFrame: design.awakeFrame,
      awakeRender,
      awakeHitArea: { ...awakeRender },
      hireSound: design.hireSound,
      shotSound: design.shotSound,
      cell,
      movementSpeedFinePer100Ms: design.movementSpeedFinePer100Ms,
      asset: design.asset,
      frame: design.sleepFrame,
      render,
      hitArea: { ...render },
      weapon: { ...design.weapon },
    }];
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
