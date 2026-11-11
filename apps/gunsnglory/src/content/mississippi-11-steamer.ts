import type { ScenarioUnit, UnitWeaponDefinition } from '../game';
import map from './mississippi-11.json';

const STEAMER_GROUP_ID = 'mississippi-11-steamer';
const STEAMER_FRAME = Object.freeze({ x: 0, y: 0, width: 48, height: 60 });
const STEAMER_COLLISION = Object.freeze({ x: -3840, y: -4608, width: 7680, height: 4608 });
const TAIL_ASSETS = Object.freeze(['steamboat_4a', 'steamboat_4b', 'steamboat_4c']);

function doubleCannonWeapon(
  damage: number,
  rangeFine: number,
  areaDamageFine: number,
  specialReloadTimeMs: number,
): UnitWeaponDefinition {
  return {
    damage,
    damageType: 'heavy',
    postDamage: 0,
    postDamageDurationMs: 0,
    poisonDamage: 0,
    poisonDurationMs: 0,
    rangeFine,
    reloadTimeMs: 100,
    projectileSpeed: 1600,
    damageStyle: 4,
    areaDamageFine,
    specialReloadTimeMs,
    specialReloadFrequency: 2,
  };
}

const DOUBLE_CANNON_UPGRADES = Object.freeze([
  { price: 100, movementSpeedFinePer100Ms: 1000, weapon: doubleCannonWeapon(700, 76_800, 1_920, 3_500) },
  { price: 100, movementSpeedFinePer100Ms: 1000, weapon: doubleCannonWeapon(750, 92_160, 1_920, 3_000) },
  { price: 100, movementSpeedFinePer100Ms: 1000, weapon: doubleCannonWeapon(800, 92_160, 7_680, 3_000) },
]);

const steamerParts = {
  30: { asset: 'steamboat_1' },
  31: { asset: 'steamboat_2' },
  32: { asset: 'steamboat_3' },
  33: { asset: 'steamboat_4a' },
} as const;

function createSteamerPart(
  typeId: 30 | 31 | 32 | 33,
  cell: { x: number; y: number },
  activity: 4 | 5,
): ScenarioUnit {
  const part = steamerParts[typeId];
  const render = { x: cell.x, y: cell.y - 0.5, width: 1, height: 1.25 };
  return {
    id: `mississippi-11-steamer-${typeId}`,
    type: `steamer-${typeId}`,
    activity,
    movementGroupId: STEAMER_GROUP_ID,
    movementAxis: 'horizontal',
    movementSurface: 'water',
    collisionBoxFine: { ...STEAMER_COLLISION },
    ...(typeId === 31 ? {
      steamEmitter: true as const,
      steamEmitterOffsetFine: { x: 823, y: -10_752 },
    } : {}),
    ...(typeId === 33 ? {
      positionAssetSequence: { xStepFine: 1000, assets: TAIL_ASSETS },
    } : {}),
    ...(typeId === 32 ? {
      hirePrice: 150,
      shotSound: 'sound_cannon' as const,
      weapon: doubleCannonWeapon(650, 76_800, 1_920, 3_500),
      weaponDrawOffsetYFine: 7_680,
      upgradeLevels: DOUBLE_CANNON_UPGRADES,
    } : {}),
    ...(activity === 4 ? { showSleepingEffect: true } : {}),
    cell,
    movementSpeedFinePer100Ms: 1000,
    asset: part.asset,
    frame: { ...STEAMER_FRAME },
    render,
    hitArea: { ...render },
  };
}

/** Creates the Steamer parts emitted by the map14 marker-120 scan. */
export function createMississippi11SteamerUnits(): ScenarioUnit[] {
  const markers = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 120 ? [{ x, y }] : []
  )));
  if (markers.length !== 1) return [];

  const start = markers[0]!;
  const row = map.originalTileGrid[start.y];
  if (!row) return [];
  const parts: ScenarioUnit[] = [];

  for (let x = start.x; x < row.length; x += 1) {
    const code = row[x];
    if (code === 120) {
      parts.push(createSteamerPart(30, { x, y: start.y }, 5));
      parts.push(createSteamerPart(31, { x: x + 1, y: start.y }, 5));
    } else if (code === 121) {
      parts.push(createSteamerPart(32, { x, y: start.y }, 4));
    } else if (code === 122) {
      parts.push(createSteamerPart(32, { x, y: start.y }, 5));
    } else if (code === 123) {
      parts.push(createSteamerPart(33, { x, y: start.y }, 5));
      break;
    }
  }

  return parts.sort((left, right) => left.cell.x - right.cell.x);
}
