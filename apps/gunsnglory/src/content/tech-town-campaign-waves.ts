import type { CampaignWaveDefinition } from '../game';

export type TechTownDialogueResource =
  | 'T_IA_CAMPAIGN_04_01'
  | 'T_CAMPAIGN_04_02'
  | 'T_CAMPAIGN_04_03'
  | 'T_CAMPAIGN_04_04'
  | 'T_CAMPAIGN_04_05'
  | 'T_CAMPAIGN_04_06'
  | 'T_CAMPAIGN_04_07'
  | 'T_CAMPAIGN_04_08';

export type TechTownPortraitAsset = 'portrait_pedro' | 'portrait_engineer' | 'portrait_settlers';

export interface TechTownCampaignWave extends CampaignWaveDefinition {
  dialogueResource: TechTownDialogueResource;
  portraitAsset: TechTownPortraitAsset;
}

function createWave(wave: TechTownCampaignWave): TechTownCampaignWave {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze({
      ...pool,
      requests: Object.freeze([...pool.requests]),
    }))),
  });
}

/** The eight original map04 wave records transcribed from GameDesignWaves. */
export const techTownCampaignWaves: readonly TechTownCampaignWave[] = Object.freeze([
  createWave({
    number: 1,
    dialogueResource: 'T_IA_CAMPAIGN_04_01',
    portraitAsset: 'portrait_pedro',
    delayMs: 15_000,
    hitPointMultiplierPercent: 100,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 2_500, requests: [1, 3, 3, 3, 2, 1, 1, 0, 0, 0] }],
  }),
  createWave({
    number: 2,
    dialogueResource: 'T_CAMPAIGN_04_02',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 100,
    speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 2, 1, 2, 2, 1, 1, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_500, requests: [0, 0, 2, 3, 3, 2, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 3,
    dialogueResource: 'T_CAMPAIGN_04_03',
    portraitAsset: 'portrait_engineer',
    delayMs: 5_000,
    hitPointMultiplierPercent: 125,
    speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_000, requests: [0, 0, 1, 2, 3, 3, 3, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 0, 1, 2, 3, 4, 3, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 4,
    dialogueResource: 'T_CAMPAIGN_04_04',
    portraitAsset: 'portrait_settlers',
    delayMs: 5_000,
    hitPointMultiplierPercent: 150,
    speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_000, requests: [0, 2, 0, 0, 3, 3, 2, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 0, 2, 0, 4, 2, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 5,
    dialogueResource: 'T_CAMPAIGN_04_05',
    portraitAsset: 'portrait_pedro',
    delayMs: 25_000,
    hitPointMultiplierPercent: 175,
    speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_000, requests: [1, 2, 0, 0, 3, 3, 2, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [0, 1, 1, 0, 3, 2, 1, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 2_500, requests: [1, 2, 0, 0, 3, 3, 2, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 2_500, requests: [1, 2, 2, 0, 3, 2, 2, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 6,
    dialogueResource: 'T_CAMPAIGN_04_06',
    portraitAsset: 'portrait_settlers',
    delayMs: 25_000,
    hitPointMultiplierPercent: 275,
    speedMultiplierPercent: 105,
    spawnPools: [
      { spawnPointId: 1, intervalMs: 4_500, requests: [0, 0, 0, 0, 0, 0, 0, 2, 0, 0] },
      { spawnPointId: 3, intervalMs: 2_500, requests: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 7,
    dialogueResource: 'T_CAMPAIGN_04_07',
    portraitAsset: 'portrait_pedro',
    delayMs: 25_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_000, requests: [1, 2, 0, 0, 3, 1, 2, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [0, 1, 0, 2, 3, 3, 1, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 2_500, requests: [1, 2, 0, 1, 4, 3, 2, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 2_500, requests: [0, 3, 1, 0, 2, 2, 1, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 8,
    dialogueResource: 'T_CAMPAIGN_04_08',
    portraitAsset: 'portrait_pedro',
    delayMs: 25_000,
    hitPointMultiplierPercent: 275,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_000, requests: [1, 0, 0, 0, 3, 1, 2, 2, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [2, 0, 1, 0, 3, 3, 1, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 2_500, requests: [0, 1, 0, 0, 2, 3, 1, 2, 0, 0] },
      { spawnPointId: 3, intervalMs: 2_500, requests: [3, 2, 0, 1, 1, 2, 1, 1, 0, 0] },
    ],
  }),
]);
