import cowGulchMap from './cow-gulch.json';
import { cowGulchCampaignWaves, cowGulchCampaignWavesP1c, cowGulchCampaignWavesP1d } from './cow-gulch-campaign-waves';
import { cowGulchPreviewWave } from './cow-gulch-preview-wave';
import type { MapDecoration, ScenarioContent, ScenarioUnit } from '../game';

const firstMapGunslingerWeapon = Object.freeze({
  damage: 140,
  damageType: 'light',
  rangeFine: 38400,
  reloadTimeMs: 500,
  projectileSpeed: 600,
  damageStyle: 0,
  specialReloadTimeMs: 1500,
  specialReloadFrequency: 6,
} as const);

const firstMapMexicanWeapon = Object.freeze({
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

const firstMapGunslingerMovementSpeedFinePer100Ms = 1500;

const sleepingUnitMarkers = {
  96: {
    prefix: 'gunslinger-hire', type: 'gunslinger', asset: 'player_gunslinger_sleep', awakeAsset: 'player_gunslinger',
    awakeFrame: { x: 0, y: 0, width: 32, height: 44 },
    hirePrice: 75, speed: firstMapGunslingerMovementSpeedFinePer100Ms, weapon: firstMapGunslingerWeapon,
  },
  97: {
    prefix: 'mexican-hire', type: 'mexican', asset: 'player_mexican_sleep', awakeAsset: 'player_mexican',
    awakeFrame: { x: 0, y: 0, width: 32, height: 44 },
    hirePrice: 100, speed: 0, weapon: firstMapMexicanWeapon,
  },
} as const;

// TDM object codes emitted by GameObjectManager.createGameObjectsFromBasicMap for Cow Gulch.
const cowGulchDecorationCodes: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  68: { asset: 'e_1x1_cactus_a' },
  69: { asset: 'e_1x1_rocks_a' },
  70: { asset: 'e_1x1_rocks_b' },
  71: { asset: 'e_1x1_tree' },
  73: { asset: 'e_1x1_cactus_b' },
  74: { asset: 'b_1x1_windmill' },
  76: { asset: 'e_1x1_bush' },
  77: { asset: 'e_1x2_bones' },
  116: { asset: 'b_2x1_shack', anchorOffsetX: -0.5 },
  126: { asset: 'e_1x1_rocks_water' },
});

function createCowGulchMapDecorations(): MapDecoration[] {
  const decorations: MapDecoration[] = [];
  for (const [y, row] of (cowGulchMap.originalTileGrid ?? []).entries()) {
    for (const [x, code] of row.entries()) {
      const decoration = cowGulchDecorationCodes[code];
      if (decoration) decorations.push({ ...decoration, cell: { x, y } });
    }
  }
  return decorations;
}

function createSleepingMapUnits(): ScenarioUnit[] {
  const counters = new Map<number, number>();
  const units: ScenarioUnit[] = [];
  for (const [y, row] of (cowGulchMap.originalTileGrid ?? []).entries()) {
    for (const [x, tile] of row.entries()) {
      if (tile !== 96 && tile !== 97) continue;
      const marker = sleepingUnitMarkers[tile];
      const index = (counters.get(tile) ?? 0) + 1;
      counters.set(tile, index);
      const render = { x, y: y - 0.25, width: 1, height: 1 };
      units.push({
        id: `${marker.prefix}-${String(index).padStart(2, '0')}`,
        type: marker.type,
        activity: 4,
        hirePrice: marker.hirePrice,
        awakeAsset: marker.awakeAsset,
        awakeFrame: marker.awakeFrame,
        cell: { x, y },
        movementSpeedFinePer100Ms: marker.speed,
        asset: marker.asset,
        frame: { x: 0, y: 0, width: 32, height: 32 },
        render,
        hitArea: { ...render },
        awakeRender: { x, y: y - 0.375, width: 1, height: 1.375 },
        awakeHitArea: { x, y: y - 0.375, width: 1, height: 1.375 },
        weapon: marker.weapon,
      });
    }
  }
  return units;
}
const firstMapGunslingerUpgradeLevelOne = Object.freeze({
  price: 25,
  movementSpeedFinePer100Ms: 1750,
  weapon: Object.freeze({
    damage: 140,
    damageType: 'light',
    rangeFine: 38400,
    reloadTimeMs: 400,
    projectileSpeed: 600,
    damageStyle: 0,
    specialReloadTimeMs: 1250,
    specialReloadFrequency: 6,
  }),
});

export const cowGulchContent: ScenarioContent = {
  ...cowGulchMap,
  map: {
    ...cowGulchMap.map,
    decorations: createCowGulchMapDecorations(),
  },
  contentVersion: 'gng-free-1.8.6-map1-cow-gulch-wave02-v3',
  formalSettlementSupported: true,
  maxUpgrades: 0,
  recruitableUnits: [{
    id: 'gunslinger',
    name: { en: 'Gunslinger', zh: '枪手' },
    price: 75,
    spawnLocationType: 1,
  }],
  units: [
    ...cowGulchMap.units.map((unit) => ({
      ...unit,
      movementSpeedFinePer100Ms: firstMapGunslingerMovementSpeedFinePer100Ms,
      ...(unit.id === 'gunslinger-1' ? {
        weapon: firstMapGunslingerWeapon,
        upgradeLevels: [firstMapGunslingerUpgradeLevelOne],
      } : {}),
    })),
    ...createSleepingMapUnits(),
  ],
  campaignWaveCount: 8,
  campaignWaves: cowGulchCampaignWaves,
  campaignEnemy: {
    hitPoints: 18,
    cashReward: 1,
    penetration: { light: 100, fire: 50, heavy: 25, poison: 75 },
  },
  previewWave: cowGulchPreviewWave,
};

/** One-wave formal sample retained for the P1-A progress and settlement checks. */
export const cowGulchP1aSampleContent: ScenarioContent = {
  ...cowGulchContent,
  contentVersion: 'gng-free-1.8.6-map1-p1a-sample-v1',
  campaignWaveCount: undefined,
  campaignWaves: undefined,
};

/** The original map and first two waves, exposed separately until P1-D completes all eight. */
export const cowGulchP1bCampaignContent: ScenarioContent = {
  ...cowGulchContent,
  id: 'cow-gulch-original-waves',
  contentVersion: 'gng-free-1.8.6-map1-p1b-waves-1-2-v1',
  title: { en: 'Cow Gulch · Original waves 1–2', zh: '牛溪谷 · 原版第 1–2 波' },
};

/** Original Cow Gulch waves 1–3, including the covered-wagon group. */
export const cowGulchP1cCampaignContent: ScenarioContent = {
  ...cowGulchContent,
  id: 'cow-gulch-original-waves-1-3',
  contentVersion: 'gng-free-1.8.6-map1-p1c-waves-1-3-v1',
  title: { en: 'Cow Gulch · Original waves 1–3', zh: '牛溪谷 · 原版第 1–3 波' },
  campaignWaves: cowGulchCampaignWavesP1c,
  campaignEnemyByType: {
    4: { hitPoints: 200, cashReward: 10, penetration: { light: 50, fire: 100, heavy: 66, poison: 100 }, turningDurationMs: 200 },
    8: { hitPoints: 200, cashReward: 0, penetration: { light: 100, fire: 100, heavy: 100, poison: 100 }, turningDurationMs: 100 },
  },
};

/** Full original Cow Gulch campaign, with automatic wave progression and terminal settlement. */
export const cowGulchP1dCampaignContent: ScenarioContent = {
  ...cowGulchP1cCampaignContent,
  id: 'cow-gulch-original-waves-1-8',
  contentVersion: 'gng-free-1.8.6-map1-p1d-waves-1-8-v1',
  title: { en: 'Cow Gulch · Original waves 1–8', zh: '牛溪谷 · 原版第 1–8 波' },
  campaignWaves: cowGulchCampaignWavesP1d,
};

/** Debug-only fixture for the otherwise locked Cow Gulch Gunslinger upgrade path. */
export const cowGulchUpgradeSampleContent: ScenarioContent = {
  ...cowGulchP1aSampleContent,
  id: 'cow-gulch-upgrade-sample',
  formalSettlementSupported: false,
  maxUpgrades: 1,
  previewWave: { ...cowGulchContent.previewWave!, initialCash: 25 },
};
