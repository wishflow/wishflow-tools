import type { CampaignWaveDefinition } from '../game';

export type MurdockMountainsDialogueResource =
  | 'T_CAMPAIGN_06_01'
  | 'T_CAMPAIGN_06_02'
  | 'T_CAMPAIGN_06_03'
  | 'T_CAMPAIGN_06_04'
  | 'T_CAMPAIGN_06_05'
  | 'T_CAMPAIGN_06_06'
  | 'T_CAMPAIGN_06_07'
  | 'T_CAMPAIGN_06_08'
  | 'T_CAMPAIGN_01_07'
  | 'T_CAMPAIGN_06_09';

export type MurdockMountainsPortraitAsset =
  | 'portrait_pedro'
  | 'portrait_settlers'
  | 'portrait_indian'
  | 'portrait_deserter';

export interface MurdockMountainsCampaignWave extends CampaignWaveDefinition {
  dialogueResource: MurdockMountainsDialogueResource;
  portraitAsset: MurdockMountainsPortraitAsset;
}

function createWave(wave: MurdockMountainsCampaignWave): MurdockMountainsCampaignWave {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze({
      ...pool,
      requests: Object.freeze([...pool.requests]),
    }))),
  });
}

/** Ten original Murdock Mountains wave records transcribed from GameDesignWaves. */
export const murdockMountainsCampaignWaves: readonly MurdockMountainsCampaignWave[] = Object.freeze([
  createWave({
    number: 1,
    dialogueResource: 'T_CAMPAIGN_06_01',
    portraitAsset: 'portrait_pedro',
    delayMs: 15_000,
    hitPointMultiplierPercent: 140,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 1_800, requests: [4, 4, 4, 4, 3, 1, 0, 0, 0, 0] }],
  }),
  createWave({
    number: 2,
    dialogueResource: 'T_CAMPAIGN_06_02',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 160,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 1_500, requests: [0, 1, 2, 3, 3, 2, 0, 0, 0, 0] }],
  }),
  createWave({
    number: 3,
    dialogueResource: 'T_CAMPAIGN_06_03',
    portraitAsset: 'portrait_settlers',
    delayMs: 5_000,
    hitPointMultiplierPercent: 180,
    speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [1, 0, 5, 0, 1, 3, 0, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 2, 5, 0, 2, 2, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 4,
    dialogueResource: 'T_CAMPAIGN_06_04',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 105,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 1, 1, 2, 1, 3, 1, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 1, 1, 1, 2, 3, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 5,
    dialogueResource: 'T_CAMPAIGN_06_05',
    portraitAsset: 'portrait_indian',
    delayMs: 5_000,
    hitPointMultiplierPercent: 225,
    speedMultiplierPercent: 105,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 1, 2, 1, 3, 1, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [2, 1, 1, 0, 2, 3, 0, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 6,
    dialogueResource: 'T_CAMPAIGN_06_06',
    portraitAsset: 'portrait_deserter',
    delayMs: 5_000,
    hitPointMultiplierPercent: 250,
    speedMultiplierPercent: 105,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 1, 2, 1, 3, 1, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [2, 1, 1, 0, 2, 3, 0, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 7,
    dialogueResource: 'T_CAMPAIGN_06_07',
    portraitAsset: 'portrait_settlers',
    delayMs: 5_000,
    hitPointMultiplierPercent: 275,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 1, 0, 1, 3, 2, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 1, 1, 0, 2, 3, 2, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 8,
    dialogueResource: 'T_CAMPAIGN_06_08',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 300,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 1, 1, 0, 2, 3, 2, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 1, 1, 0, 2, 3, 2, 2, 0, 0] },
    ],
  }),
  createWave({
    number: 9,
    dialogueResource: 'T_CAMPAIGN_01_07',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 350,
    speedMultiplierPercent: 115,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 1, 2, 6, 2, 2, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 1, 1, 3, 6, 2, 2, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 10,
    dialogueResource: 'T_CAMPAIGN_06_09',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 360,
    speedMultiplierPercent: 120,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 1, 2, 3, 4, 3, 2, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [1, 1, 2, 2, 3, 2, 2, 1, 0, 0] },
    ],
  }),
]);
