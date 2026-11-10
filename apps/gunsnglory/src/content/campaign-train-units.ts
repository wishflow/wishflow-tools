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

/** Creates the shared movement group used by each original horizontal TDM train. */
export function createCampaignTrainUnits(
  placements: readonly CampaignTrainPlacement[],
  movementGroupId: string,
): ScenarioUnit[] {
  return placements.map(({ unitTypeId, activity, asset, cell }) => {
    const renderHeight = asset === 'lok_wagon_hori' ? 1 : 1.5;
    const frame = { x: 0, y: 0, width: 48, height: renderHeight === 1 ? 48 : 72 };
    const render = {
      x: cell.x,
      y: cell.y + 1 - renderHeight,
      width: 1,
      height: renderHeight,
    };
    return {
      id: `${movementGroupId}-${unitTypeId}-${cell.x}`,
      type: `train-${unitTypeId}`,
      activity,
      movementGroupId,
      movementAxis: 'horizontal' as const,
      collisionBoxFine: { x: -3840, y: -4608, width: 7680, height: 4608 },
      showSleepingEffect: false,
      ...(unitTypeId === 10 ? { steamEmitter: true as const } : {}),
      selectionSound: 'sound_train',
      ...(unitTypeId === 12 ? {
        hirePrice: 125,
        hireSound: 'sound_train' as const,
        shotSound: 'sound_gattling_gun' as const,
        weapon: gatlingWeapon(125, 300),
        upgradeLevels: gatlingUpgradeLevels,
      } : {}),
      cell,
      movementSpeedFinePer100Ms: 3000,
      asset,
      frame,
      render,
      hitArea: { ...render },
    };
  });
}
