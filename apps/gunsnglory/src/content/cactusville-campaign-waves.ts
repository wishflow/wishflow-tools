import type { CampaignWaveDefinition } from '../game';

export type CactusvilleDialogueResource =
  | 'T_CAMPAIGN_08_01'
  | 'T_CAMPAIGN_08_02'
  | 'T_CAMPAIGN_08_03'
  | 'T_CAMPAIGN_08_04'
  | 'T_CAMPAIGN_08_05'
  | 'T_CAMPAIGN_08_06'
  | 'T_CAMPAIGN_08_07'
  | 'T_CAMPAIGN_08_08'
  | 'T_CAMPAIGN_08_09'
  | 'T_CAMPAIGN_08_10';

export type CactusvillePortraitAsset =
  | 'portrait_sheriff'
  | 'portrait_pedro'
  | 'portrait_settlers'
  | 'portrait_engineer';

export interface CactusvilleCampaignWave extends CampaignWaveDefinition {
  dialogueResource: CactusvilleDialogueResource;
  portraitAsset: CactusvillePortraitAsset;
}

function createWave(wave: CactusvilleCampaignWave): CactusvilleCampaignWave {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze({
      ...pool,
      requests: Object.freeze([...pool.requests]),
    }))),
  });
}

/** Ten level-eight waves transcribed from APK GameDesignWaves; the last two web slots are zero-filled. */
export const cactusvilleCampaignWaves: readonly CactusvilleCampaignWave[] = Object.freeze([
  createWave({
    number: 1,
    dialogueResource: 'T_CAMPAIGN_08_01',
    portraitAsset: 'portrait_sheriff',
    delayMs: 15_000,
    hitPointMultiplierPercent: 125,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 1_800, requests: [2, 3, 4, 3, 4, 2, 1, 0, 0, 0] }],
  }),
  createWave({
    number: 2,
    dialogueResource: 'T_CAMPAIGN_08_02',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 150,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 1_800, requests: [1, 1, 2, 3, 4, 2, 1, 1, 0, 0] }],
  }),
  createWave({
    number: 3,
    dialogueResource: 'T_CAMPAIGN_08_03',
    portraitAsset: 'portrait_settlers',
    delayMs: 10_000,
    hitPointMultiplierPercent: 125,
    speedMultiplierPercent: 90,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [1, 3, 2, 4, 3, 3, 1, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [2, 3, 2, 3, 3, 3, 1, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 4,
    dialogueResource: 'T_CAMPAIGN_08_04',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 105,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_000, requests: [3, 3, 2, 2, 2, 4, 2, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_000, requests: [3, 3, 2, 2, 2, 3, 1, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 5,
    dialogueResource: 'T_CAMPAIGN_08_05',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 400,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [3, 3, 3, 4, 0, 0, 0, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [3, 3, 3, 4, 0, 0, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 6,
    dialogueResource: 'T_CAMPAIGN_08_06',
    portraitAsset: 'portrait_engineer',
    delayMs: 5_000,
    hitPointMultiplierPercent: 450,
    speedMultiplierPercent: 120,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [0, 0, 0, 0, 8, 0, 0, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [0, 0, 0, 0, 8, 0, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 7,
    dialogueResource: 'T_CAMPAIGN_08_07',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 300,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [2, 0, 1, 0, 3, 4, 2, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 2, 0, 0, 3, 4, 2, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 8,
    dialogueResource: 'T_CAMPAIGN_08_08',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 300,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 1, 0, 3, 3, 2, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [1, 0, 0, 1, 3, 3, 3, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 9,
    dialogueResource: 'T_CAMPAIGN_08_09',
    portraitAsset: 'portrait_settlers',
    delayMs: 5_000,
    hitPointMultiplierPercent: 450,
    speedMultiplierPercent: 115,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 4_500, requests: [0, 0, 0, 0, 0, 0, 0, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 6_500, requests: [0, 0, 0, 0, 0, 0, 0, 2, 0, 0] },
    ],
  }),
  createWave({
    number: 10,
    dialogueResource: 'T_CAMPAIGN_08_10',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 450,
    speedMultiplierPercent: 120,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [2, 2, 0, 2, 3, 4, 3, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 2, 3, 0, 3, 4, 2, 2, 0, 0] },
    ],
  }),
]);
