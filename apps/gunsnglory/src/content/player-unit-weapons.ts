/** Shared level-one-to-four base weapon rows recovered from GameDesignData. */
export const gunslingerWeapon = Object.freeze({
  damage: 140,
  damageType: 'light',
  rangeFine: 38400,
  reloadTimeMs: 500,
  projectileSpeed: 600,
  damageStyle: 0,
  specialReloadTimeMs: 1500,
  specialReloadFrequency: 6,
} as const);

export const mexicanWeapon = Object.freeze({
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
