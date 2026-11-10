import type { CampaignWaveDefinition } from '../game';

export type BillyHillsDialogueResource =
  | 'T_CAMPAIGN_05_01_POINTER'
  | 'T_CAMPAIGN_05_02'
  | 'T_CAMPAIGN_05_03'
  | 'T_CAMPAIGN_05_04'
  | 'T_CAMPAIGN_05_05'
  | 'T_CAMPAIGN_05_06'
  | 'T_CAMPAIGN_03_07'
  | 'T_CAMPAIGN_05_07';

export type BillyHillsPortraitAsset = 'portrait_pedro' | 'portrait_settlers';

export interface BillyHillsCampaignWave extends CampaignWaveDefinition {
  dialogueResource: BillyHillsDialogueResource;
  portraitAsset: BillyHillsPortraitAsset;
}

function createWave(wave: BillyHillsCampaignWave): BillyHillsCampaignWave {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze({
      ...pool,
      requests: Object.freeze([...pool.requests]),
    }))),
  });
}

/** Eight original Billy Hills wave records transcribed from GameDesignWaves. */
export const billyHillsCampaignWaves: readonly BillyHillsCampaignWave[] = Object.freeze([
  createWave({
    number: 1,
    dialogueResource: 'T_CAMPAIGN_05_01_POINTER',
    portraitAsset: 'portrait_pedro',
    delayMs: 15_000,
    hitPointMultiplierPercent: 100,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 2_000, requests: [3, 4, 5, 5, 4, 2, 2, 1, 0, 0] }],
  }),
  createWave({
    number: 2,
    dialogueResource: 'T_CAMPAIGN_05_02',
    portraitAsset: 'portrait_settlers',
    delayMs: 5_000,
    hitPointMultiplierPercent: 125,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 2_000, requests: [2, 2, 3, 4, 3, 2, 3, 1, 0, 0] }],
  }),
  createWave({
    number: 3,
    dialogueResource: 'T_CAMPAIGN_05_03',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 150,
    speedMultiplierPercent: 105,
    spawnPools: [{ spawnPointId: 0, intervalMs: 2_000, requests: [1, 2, 3, 4, 5, 3, 4, 2, 0, 0] }],
  }),
  createWave({
    number: 4,
    dialogueResource: 'T_CAMPAIGN_05_04',
    portraitAsset: 'portrait_settlers',
    delayMs: 5_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 95,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [1, 2, 3, 2, 3, 2, 2, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_000, requests: [1, 2, 3, 2, 3, 1, 1, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 5,
    dialogueResource: 'T_CAMPAIGN_05_05',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 225,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 1, 2, 1, 3, 1, 2, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 1, 1, 2, 3, 1, 1, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 6,
    dialogueResource: 'T_CAMPAIGN_05_06',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 600,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [0, 0, 0, 0, 10, 0, 0, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [0, 0, 0, 0, 8, 0, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 7,
    dialogueResource: 'T_CAMPAIGN_03_07',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 300,
    speedMultiplierPercent: 115,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [2, 2, 1, 1, 0, 4, 4, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [3, 1, 2, 1, 0, 4, 3, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 8,
    dialogueResource: 'T_CAMPAIGN_05_07',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 350,
    speedMultiplierPercent: 120,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [1, 2, 0, 1, 2, 4, 5, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [1, 1, 0, 0, 1, 4, 5, 2, 0, 0] },
    ],
  }),
]);
