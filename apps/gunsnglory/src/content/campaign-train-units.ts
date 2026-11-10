import type { ScenarioUnit } from '../game';
import type { CampaignTrainPlacement } from './campaign-map-unit-placements';

const gatlingWeapon = (damage: number, reloadTimeMs: number) => Object.freeze({
  damage,
  damageType: 'light' as const,
  rangeFine: 38_400,
  reloadTimeMs,
  projectileSpeed: 750,
  damageStyle: 0,
  areaDamageFine: 0,
  postDamage: 0,
  postDamageDurationMs: 0,
  poisonDamage: 0,
  poisonDurationMs: 0,
  specialReloadTimeMs: 0,
  specialReloadFrequency: 1,
});

const gatlingUpgradeLevels = Object.freeze([
  Object.freeze({ price: 75, movementSpeedFinePer100Ms: 3000, weapon: gatlingWeapon(150, 250) }),
  Object.freeze({ price: 75, movementSpeedFinePer100Ms: 3000, weapon: gatlingWeapon(175, 200) }),
  Object.freeze({ price: 75, movementSpeedFinePer100Ms: 3000, weapon: gatlingWeapon(200, 150) }),
]);

const frameHeightByAsset = {
  lok_hori_1of2: 72,
  lok_hori_2of2: 72,
  lok_wagon_hori: 48,
  lok_verti_1of2: 48,
  lok_verti_2of2: 60,
  lok_wagon_verti: 60,
} as const;

/** Creates the shared movement group used by each original horizontal TDM train. */
export function createCampaignTrainUnits(
  placements: readonly CampaignTrainPlacement[],
  movementGroupId: string,
): ScenarioUnit[] {
  return placements.map(({ unitTypeId, activity, movementAxis, asset, cell }) => {
    const frameHeight = frameHeightByAsset[asset];
    const renderHeight = frameHeight / 48;
    const render = {
      x: cell.x,
      y: cell.y + (movementAxis === 'vertical' ? 1.25 : 1) - renderHeight,
      width: 1,
      height: renderHeight,
    };
    const isTrainWagon = unitTypeId === 12 || unitTypeId === 22;
    const isSteamLocomotive = unitTypeId === 10 || unitTypeId === 21;
    return {
      id: movementAxis === 'horizontal'
        ? `${movementGroupId}-${unitTypeId}-${cell.x}`
        : `${movementGroupId}-${unitTypeId}-${cell.x}-${cell.y}`,
      type: `train-${unitTypeId}`,
      activity,
      movementGroupId,
      movementAxis,
      collisionBoxFine: movementAxis === 'horizontal'
        ? { x: -3840, y: -4608, width: 7680, height: 4608 }
        : { x: -2534, y: -3840, width: 4608, height: 7680 },
      showSleepingEffect: false,
      ...(isSteamLocomotive ? { steamEmitter: true as const } : {}),
      selectionSound: 'sound_train',
      ...(isTrainWagon ? {
        hirePrice: 125,
        hireSound: 'sound_train' as const,
        shotSound: 'sound_gattling_gun' as const,
        weapon: gatlingWeapon(125, 300),
        upgradeLevels: gatlingUpgradeLevels,
        ...(movementAxis === 'vertical' ? { weaponDrawOffsetYFine: 4992 } : {}),
      } : {}),
      cell,
      movementSpeedFinePer100Ms: 3000,
      asset,
      frame: { x: 0, y: 0, width: 48, height: frameHeight },
      render,
      hitArea: { ...render },
    };
  });
}
