export const nevada01LevelParametersRaw = Object.freeze([
  150,
  25,
  999,
  25_000,
  3,
  30_000,
  5,
  15,
  75,
  100,
  140,
  119_000,
] as const);

/** APK level-data row 40 for global campaign level 41, with confirmed fields named. */
export const nevada01LevelParameters = Object.freeze({
  initialCash: nevada01LevelParametersRaw[0],
  initialLives: nevada01LevelParametersRaw[1],
  maxChests: nevada01LevelParametersRaw[2],
  chestIntervalMs: nevada01LevelParametersRaw[3],
  maxUpgrades: nevada01LevelParametersRaw[4],
  awesomeMessageMin: nevada01LevelParametersRaw[5],
  awesomeMessageUnit: nevada01LevelParametersRaw[6],
  maxChestsPlayfield: nevada01LevelParametersRaw[7],
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({
    easy: nevada01LevelParametersRaw[8],
    medium: nevada01LevelParametersRaw[9],
    hard: nevada01LevelParametersRaw[10],
  }),
  gamblerCooldownMs: nevada01LevelParametersRaw[11],
});
