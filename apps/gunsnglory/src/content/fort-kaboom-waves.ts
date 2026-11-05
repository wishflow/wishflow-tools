import type { CampaignWaveDefinition } from '../game';

export type FortKaboomDialogueResource =
  | 'T_CAMPAIGN_03_01'
  | 'T_IA_CAMPAIGN_03_02'
  | 'T_CAMPAIGN_03_03'
  | 'T_IA_CAMPAIGN_03_04'
  | 'T_CAMPAIGN_03_05'
  | 'T_IA_CAMPAIGN_03_06'
  | 'T_CAMPAIGN_03_07'
  | 'T_CAMPAIGN_03_08'
  | 'T_IA_CAMPAIGN_03_09'
  | 'T_CAMPAIGN_03_10';

export type FortKaboomPortraitAsset = 'portrait_pedro' | 'portrait_settlers' | 'portrait_deserter';

export interface FortKaboomCampaignWave extends CampaignWaveDefinition {
  /** Original APK string resource selected by GameDesignWaves for this wave. */
  dialogueResource: FortKaboomDialogueResource;
  /** Original APK R.drawable portrait used by the wave introduction. */
  portraitAsset: FortKaboomPortraitAsset;
}

function createWave(wave: FortKaboomCampaignWave): FortKaboomCampaignWave {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze({
      ...pool,
      requests: Object.freeze([...pool.requests]),
    }))),
  });
}

/** Ten Fort Kaboom wave records transcribed from the APK GameDesignWaves branch for level 3. */
export const fortKaboomCampaignWaves: readonly FortKaboomCampaignWave[] = Object.freeze([
  createWave({
    number: 1,
    dialogueResource: 'T_CAMPAIGN_03_01',
    portraitAsset: 'portrait_pedro',
    delayMs: 15_000,
    hitPointMultiplierPercent: 75,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 2_000, requests: [2, 2, 2, 2, 3, 5, 1, 0, 0, 0] }],
  }),
  createWave({
    number: 2,
    dialogueResource: 'T_IA_CAMPAIGN_03_02',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 125,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 1_750, requests: [4, 4, 5, 7, 4, 2, 2, 0, 0, 0] }],
  }),
  createWave({
    number: 3,
    dialogueResource: 'T_CAMPAIGN_03_03',
    portraitAsset: 'portrait_settlers',
    delayMs: 25_000,
    hitPointMultiplierPercent: 135,
    speedMultiplierPercent: 100,
    spawnPools: [1, 2].map((spawnPointId) => ({
      spawnPointId,
      intervalMs: 2_500,
      requests: [2, 2, 2, 2, 3, 1, 1, 0, 0, 0],
    })),
  }),
  createWave({
    number: 4,
    dialogueResource: 'T_IA_CAMPAIGN_03_04',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 150,
    speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 2, 1, 2, 2, 1, 2, 0, 0, 0] },
      ...[1, 2].map((spawnPointId) => ({
        spawnPointId,
        intervalMs: 4_000,
        requests: [1, 2, 1, 2, 2, 1, 1, 0, 0, 0],
      })),
    ],
  }),
  createWave({
    number: 5,
    dialogueResource: 'T_CAMPAIGN_03_05',
    portraitAsset: 'portrait_settlers',
    delayMs: 10_000,
    hitPointMultiplierPercent: 175,
    speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 1, 2, 1, 2, 2, 3, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 4_000, requests: [0, 2, 1, 1, 3, 2, 2, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 4_000, requests: [0, 1, 2, 0, 2, 2, 3, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 6,
    dialogueResource: 'T_IA_CAMPAIGN_03_06',
    portraitAsset: 'portrait_deserter',
    delayMs: 25_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 105,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 2, 1, 1, 2, 2, 3, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 4_000, requests: [0, 1, 1, 1, 2, 2, 2, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 4_000, requests: [0, 2, 1, 1, 2, 2, 3, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 5_000, requests: [0, 1, 1, 1, 3, 3, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 7,
    dialogueResource: 'T_CAMPAIGN_03_07',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 240,
    speedMultiplierPercent: 105,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 1, 1, 0, 2, 2, 3, 0, 0, 0] },
      ...[1, 2].map((spawnPointId) => ({
        spawnPointId,
        intervalMs: 3_000,
        requests: [0, 1, 1, 0, 2, 2, 3, 0, 0, 0],
      })),
      { spawnPointId: 3, intervalMs: 4_000, requests: [0, 1, 1, 0, 3, 3, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 8,
    dialogueResource: 'T_CAMPAIGN_03_08',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 260,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [1, 0, 0, 0, 4, 2, 3, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 4_000, requests: [0, 1, 0, 0, 4, 2, 3, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 4_000, requests: [0, 0, 1, 0, 4, 2, 3, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 5_000, requests: [0, 0, 0, 1, 5, 3, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 9,
    dialogueResource: 'T_IA_CAMPAIGN_03_09',
    portraitAsset: 'portrait_deserter',
    delayMs: 5_000,
    hitPointMultiplierPercent: 315,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 0, 0, 10, 0, 0, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_000, requests: [0, 0, 0, 0, 8, 0, 0, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 3_000, requests: [0, 0, 0, 0, 8, 0, 0, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 3_000, requests: [0, 0, 0, 0, 6, 0, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 10,
    dialogueResource: 'T_CAMPAIGN_03_10',
    portraitAsset: 'portrait_pedro',
    delayMs: 5_000,
    hitPointMultiplierPercent: 350,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 1, 1, 0, 3, 4, 4, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 4_000, requests: [1, 0, 1, 0, 3, 2, 3, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 4_000, requests: [0, 1, 0, 0, 3, 2, 3, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 5_000, requests: [0, 0, 1, 0, 3, 3, 2, 0, 0, 0] },
    ],
  }),
]);
