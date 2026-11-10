import type { CampaignWaveDefinition } from '../game';

export type LuckyLakeDialogueResource =
  | 'T_CAMPAIGN_07_01'
  | 'T_CAMPAIGN_07_02'
  | 'T_CAMPAIGN_07_03'
  | 'T_CAMPAIGN_07_04'
  | 'T_CAMPAIGN_07_05'
  | 'T_CAMPAIGN_07_06'
  | 'T_CAMPAIGN_07_07'
  | 'T_CAMPAIGN_07_08'
  | 'T_CAMPAIGN_07_09'
  | 'T_CAMPAIGN_07_10';

export type LuckyLakePortraitAsset = 'portrait_pedro' | 'portrait_settlers' | 'portrait_deserter';

export interface LuckyLakeCampaignWave extends CampaignWaveDefinition {
  dialogueResource: LuckyLakeDialogueResource;
  portraitAsset: LuckyLakePortraitAsset;
}

function createWave(wave: LuckyLakeCampaignWave): LuckyLakeCampaignWave {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze({
      ...pool,
      requests: Object.freeze([...pool.requests]),
    }))),
  });
}

/** Ten level-seven wave definitions transcribed from the APK's GameDesignWaves data. */
export const luckyLakeCampaignWaves: readonly LuckyLakeCampaignWave[] = Object.freeze([
  createWave({
    number: 1,
    dialogueResource: 'T_CAMPAIGN_07_01',
    portraitAsset: 'portrait_pedro',
    delayMs: 15_000,
    hitPointMultiplierPercent: 100,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 1_800, requests: [5, 2, 5, 5, 4, 1, 0, 0, 0, 0] }],
  }),
  createWave({
    number: 2,
    dialogueResource: 'T_CAMPAIGN_07_02',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 125,
    speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [2, 3, 2, 5, 4, 1, 0, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [2, 1, 2, 2, 2, 1, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 3,
    dialogueResource: 'T_CAMPAIGN_07_03',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 150,
    speedMultiplierPercent: 105,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [5, 2, 3, 5, 3, 1, 0, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_000, requests: [1, 4, 5, 2, 2, 4, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 4,
    dialogueResource: 'T_CAMPAIGN_07_04',
    portraitAsset: 'portrait_settlers',
    delayMs: 10_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 105,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [2, 2, 3, 1, 4, 3, 0, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_000, requests: [3, 2, 1, 2, 2, 4, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 5,
    dialogueResource: 'T_CAMPAIGN_07_05',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 105,
    spawnPools: [{ spawnPointId: 2, intervalMs: 2_500, requests: [1, 2, 3, 4, 4, 3, 3, 0, 0, 0] }],
  }),
  createWave({
    number: 6,
    dialogueResource: 'T_CAMPAIGN_07_06',
    portraitAsset: 'portrait_settlers',
    delayMs: 5_000,
    hitPointMultiplierPercent: 215,
    speedMultiplierPercent: 105,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [1, 2, 0, 1, 4, 3, 2, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_000, requests: [1, 0, 1, 2, 2, 4, 1, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 2_500, requests: [1, 2, 0, 2, 4, 3, 2, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 7,
    dialogueResource: 'T_CAMPAIGN_07_07',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 225,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 2, 2, 1, 4, 3, 2, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_000, requests: [1, 2, 1, 0, 2, 4, 2, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 2_500, requests: [1, 2, 0, 1, 4, 3, 3, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 8,
    dialogueResource: 'T_CAMPAIGN_07_08',
    portraitAsset: 'portrait_settlers',
    delayMs: 5_000,
    hitPointMultiplierPercent: 250,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 5_500, requests: [0, 0, 0, 0, 0, 0, 0, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 5_000, requests: [0, 0, 0, 0, 0, 0, 0, 2, 0, 0] },
      { spawnPointId: 2, intervalMs: 5_500, requests: [0, 0, 0, 0, 0, 0, 0, 2, 0, 0] },
    ],
  }),
  createWave({
    number: 9,
    dialogueResource: 'T_CAMPAIGN_07_09',
    portraitAsset: 'portrait_settlers',
    delayMs: 5_000,
    hitPointMultiplierPercent: 260,
    speedMultiplierPercent: 115,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 1, 0, 0, 4, 3, 3, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_000, requests: [1, 0, 1, 0, 3, 4, 2, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 2_500, requests: [1, 1, 0, 1, 4, 3, 2, 2, 0, 0] },
    ],
  }),
  createWave({
    number: 10,
    dialogueResource: 'T_CAMPAIGN_07_10',
    portraitAsset: 'portrait_deserter',
    delayMs: 5_000,
    hitPointMultiplierPercent: 280,
    speedMultiplierPercent: 120,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 0, 1, 0, 2, 3, 3, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_000, requests: [0, 0, 1, 0, 2, 4, 2, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 2_500, requests: [0, 0, 0, 1, 2, 3, 2, 2, 0, 0] },
    ],
  }),
]);
