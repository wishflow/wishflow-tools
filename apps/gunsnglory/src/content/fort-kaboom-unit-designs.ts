import type { ScenarioUnit, UnitWeaponDefinition } from '../game';

export type FortKaboomUnitType = 'cannon' | 'indian' | 'sniper' | 'grandpa';

export interface FortKaboomUnitDesign {
  type: FortKaboomUnitType;
  name: { en: string; zh: string };
  hirePrice: number;
  movementSpeedFinePer100Ms: number;
  asset: string;
  sleepFrame: { x: number; y: number; width: number; height: number };
  awakeAsset: string;
  awakeFrame: { x: number; y: number; width: number; height: number };
  hireSound: NonNullable<ScenarioUnit['hireSound']>;
  shotSound: NonNullable<ScenarioUnit['shotSound']>;
  weapon: UnitWeaponDefinition;
}

/** Base unit rows from APK GameDesignData; frame and sound mappings use GameObjectUnit, GameDesignOptics, and SfxManager. */
export const fortKaboomUnitDesigns: Readonly<Record<FortKaboomUnitType, FortKaboomUnitDesign>> = Object.freeze({
  cannon: Object.freeze({
    type: 'cannon',
    name: { en: 'Cannon', zh: '加农炮手' },
    hirePrice: 150,
    movementSpeedFinePer100Ms: 1000,
    asset: 'player_cannon_sleep',
    sleepFrame: { x: 0, y: 0, width: 32, height: 32 },
    awakeAsset: 'player_cannon',
    awakeFrame: { x: 0, y: 0, width: 32, height: 32 },
    hireSound: 'sound_deserter_yes_sir',
    shotSound: 'sound_cannon',
    weapon: Object.freeze({
      damage: 1250,
      damageType: 'heavy',
      rangeFine: 46080,
      reloadTimeMs: 2500,
      projectileSpeed: 1600,
      damageStyle: 4,
      areaDamageFine: 1920,
      specialReloadTimeMs: 0,
      specialReloadFrequency: 1,
    }),
  }),
  indian: Object.freeze({
    type: 'indian',
    name: { en: 'Native', zh: '原住民' },
    hirePrice: 125,
    movementSpeedFinePer100Ms: 1500,
    asset: 'player_indian_sleep',
    sleepFrame: { x: 0, y: 0, width: 32, height: 36 },
    awakeAsset: 'player_indian',
    awakeFrame: { x: 0, y: 0, width: 32, height: 44 },
    hireSound: 'sound_indian_hugh',
    shotSound: 'sound_fire_arrow',
    weapon: Object.freeze({
      damage: 400,
      damageType: 'fire',
      rangeFine: 38400,
      reloadTimeMs: 1500,
      projectileSpeed: 800,
      damageStyle: 2,
      postDamage: 12,
      postDamageDurationMs: 5000,
      specialReloadTimeMs: 0,
      specialReloadFrequency: 1,
    }),
  }),
  sniper: Object.freeze({
    type: 'sniper',
    name: { en: 'Markswoman', zh: '女神枪手' },
    hirePrice: 90,
    movementSpeedFinePer100Ms: 1500,
    asset: 'player_scout_sleep',
    sleepFrame: { x: 0, y: 0, width: 32, height: 44 },
    awakeAsset: 'player_scout',
    awakeFrame: { x: 0, y: 0, width: 32, height: 44 },
    hireSound: 'sound_sniper_laughing',
    shotSound: 'sound_rifle',
    weapon: Object.freeze({
      damage: 1000,
      damageType: 'light',
      rangeFine: 69120,
      reloadTimeMs: 2250,
      projectileSpeed: 1000,
      damageStyle: 0,
      specialReloadTimeMs: 0,
      specialReloadFrequency: 1,
    }),
  }),
  grandpa: Object.freeze({
    type: 'grandpa',
    name: { en: 'Scattergun Grandpa', zh: '散弹枪爷爷' },
    hirePrice: 130,
    movementSpeedFinePer100Ms: 2000,
    asset: 'player_geezer_sleep',
    sleepFrame: { x: 0, y: 0, width: 32, height: 44 },
    awakeAsset: 'player_geezer',
    awakeFrame: { x: 0, y: 0, width: 32, height: 44 },
    hireSound: 'sound_grandpa_coughing',
    shotSound: 'sound_rocket_explosion',
    weapon: Object.freeze({
      damage: 300,
      damageType: 'heavy',
      rangeFine: 46080,
      reloadTimeMs: 4000,
      projectileSpeed: 1000,
      damageStyle: 6,
      areaDamageFine: 7680,
      postDamage: 12,
      postDamageDurationMs: 500,
      specialReloadTimeMs: 0,
      specialReloadFrequency: 1,
    }),
  }),
});
