import assert from 'node:assert/strict';
import test from 'node:test';
import { fortKaboomContent } from '../src/content/fort-kaboom';
import { fortKaboomCampaignWaves } from '../src/content/fort-kaboom-waves';

test('Fort Kaboom records the ten APK wave headers and spawn-pool tables without campaign integration', () => {
  assert.deepEqual(fortKaboomCampaignWaves.map((wave) => ({
    number: wave.number,
    dialogueResource: wave.dialogueResource,
    portraitAsset: wave.portraitAsset,
    delayMs: wave.delayMs,
    hitPointMultiplierPercent: wave.hitPointMultiplierPercent,
    speedMultiplierPercent: wave.speedMultiplierPercent,
    spawnPools: wave.spawnPools.map((pool) => ({
      spawnPointId: pool.spawnPointId,
      intervalMs: pool.intervalMs,
      requests: [...pool.requests],
    })),
  })), [
    {
      number: 1, dialogueResource: 'T_CAMPAIGN_03_01', portraitAsset: 'portrait_pedro',
      delayMs: 15_000, hitPointMultiplierPercent: 75, speedMultiplierPercent: 100,
      spawnPools: [{ spawnPointId: 0, intervalMs: 2_000, requests: [2, 2, 2, 2, 3, 5, 1, 0, 0, 0] }],
    },
    {
      number: 2, dialogueResource: 'T_IA_CAMPAIGN_03_02', portraitAsset: 'portrait_pedro',
      delayMs: 5_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 100,
      spawnPools: [{ spawnPointId: 0, intervalMs: 1_750, requests: [4, 4, 5, 7, 4, 2, 2, 0, 0, 0] }],
    },
    {
      number: 3, dialogueResource: 'T_CAMPAIGN_03_03', portraitAsset: 'portrait_settlers',
      delayMs: 25_000, hitPointMultiplierPercent: 135, speedMultiplierPercent: 100,
      spawnPools: [1, 2].map((spawnPointId) => ({
        spawnPointId, intervalMs: 2_500, requests: [2, 2, 2, 2, 3, 1, 1, 0, 0, 0],
      })),
    },
    {
      number: 4, dialogueResource: 'T_IA_CAMPAIGN_03_04', portraitAsset: 'portrait_pedro',
      delayMs: 5_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 100,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 3_500, requests: [0, 2, 1, 2, 2, 1, 2, 0, 0, 0] },
        ...[1, 2].map((spawnPointId) => ({
          spawnPointId, intervalMs: 4_000, requests: [1, 2, 1, 2, 2, 1, 1, 0, 0, 0],
        })),
      ],
    },
    {
      number: 5, dialogueResource: 'T_CAMPAIGN_03_05', portraitAsset: 'portrait_settlers',
      delayMs: 10_000, hitPointMultiplierPercent: 175, speedMultiplierPercent: 100,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 3_500, requests: [0, 1, 2, 1, 2, 2, 3, 0, 0, 0] },
        { spawnPointId: 1, intervalMs: 4_000, requests: [0, 2, 1, 1, 3, 2, 2, 0, 0, 0] },
        { spawnPointId: 2, intervalMs: 4_000, requests: [0, 1, 2, 0, 2, 2, 3, 0, 0, 0] },
      ],
    },
    {
      number: 6, dialogueResource: 'T_IA_CAMPAIGN_03_06', portraitAsset: 'portrait_deserter',
      delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 105,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 3_500, requests: [0, 2, 1, 1, 2, 2, 3, 0, 0, 0] },
        { spawnPointId: 1, intervalMs: 4_000, requests: [0, 1, 1, 1, 2, 2, 2, 0, 0, 0] },
        { spawnPointId: 2, intervalMs: 4_000, requests: [0, 2, 1, 1, 2, 2, 3, 0, 0, 0] },
        { spawnPointId: 3, intervalMs: 5_000, requests: [0, 1, 1, 1, 3, 3, 1, 0, 0, 0] },
      ],
    },
    {
      number: 7, dialogueResource: 'T_CAMPAIGN_03_07', portraitAsset: 'portrait_pedro',
      delayMs: 5_000, hitPointMultiplierPercent: 240, speedMultiplierPercent: 105,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 2_500, requests: [0, 1, 1, 0, 2, 2, 3, 0, 0, 0] },
        ...[1, 2].map((spawnPointId) => ({
          spawnPointId, intervalMs: 3_000, requests: [0, 1, 1, 0, 2, 2, 3, 0, 0, 0],
        })),
        { spawnPointId: 3, intervalMs: 4_000, requests: [0, 1, 1, 0, 3, 3, 1, 0, 0, 0] },
      ],
    },
    {
      number: 8, dialogueResource: 'T_CAMPAIGN_03_08', portraitAsset: 'portrait_pedro',
      delayMs: 5_000, hitPointMultiplierPercent: 260, speedMultiplierPercent: 110,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 3_500, requests: [1, 0, 0, 0, 4, 2, 3, 0, 0, 0] },
        { spawnPointId: 1, intervalMs: 4_000, requests: [0, 1, 0, 0, 4, 2, 3, 0, 0, 0] },
        { spawnPointId: 2, intervalMs: 4_000, requests: [0, 0, 1, 0, 4, 2, 3, 0, 0, 0] },
        { spawnPointId: 3, intervalMs: 5_000, requests: [0, 0, 0, 1, 5, 3, 1, 0, 0, 0] },
      ],
    },
    {
      number: 9, dialogueResource: 'T_IA_CAMPAIGN_03_09', portraitAsset: 'portrait_deserter',
      delayMs: 5_000, hitPointMultiplierPercent: 315, speedMultiplierPercent: 110,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 0, 0, 10, 0, 0, 0, 0, 0] },
        { spawnPointId: 1, intervalMs: 3_000, requests: [0, 0, 0, 0, 8, 0, 0, 0, 0, 0] },
        { spawnPointId: 2, intervalMs: 3_000, requests: [0, 0, 0, 0, 8, 0, 0, 0, 0, 0] },
        { spawnPointId: 3, intervalMs: 3_000, requests: [0, 0, 0, 0, 6, 0, 0, 0, 0, 0] },
      ],
    },
    {
      number: 10, dialogueResource: 'T_CAMPAIGN_03_10', portraitAsset: 'portrait_pedro',
      delayMs: 5_000, hitPointMultiplierPercent: 350, speedMultiplierPercent: 110,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 3_500, requests: [0, 1, 1, 0, 3, 4, 4, 0, 0, 0] },
        { spawnPointId: 1, intervalMs: 4_000, requests: [1, 0, 1, 0, 3, 2, 3, 0, 0, 0] },
        { spawnPointId: 2, intervalMs: 4_000, requests: [0, 1, 0, 0, 3, 2, 3, 0, 0, 0] },
        { spawnPointId: 3, intervalMs: 5_000, requests: [0, 0, 1, 0, 3, 3, 2, 0, 0, 0] },
      ],
    },
  ]);
});

test('wave records and request vectors are immutable', () => {
  assert.ok(Object.isFrozen(fortKaboomCampaignWaves));
  for (const wave of fortKaboomCampaignWaves) {
    assert.ok(Object.isFrozen(wave));
    assert.ok(Object.isFrozen(wave.spawnPools));
    for (const pool of wave.spawnPools) {
      assert.ok(Object.isFrozen(pool));
      assert.ok(Object.isFrozen(pool.requests));
    }
  }
});

test('Post Coach requests occupy the pool type 8 slot in the ten-type vector', () => {
  const postCoachCountsByWave = fortKaboomCampaignWaves.map((wave) =>
    wave.spawnPools.reduce((total, pool) => total + pool.requests[6]!, 0));
  assert.deepEqual(postCoachCountsByWave, [1, 2, 2, 4, 8, 9, 10, 10, 0, 12]);
});

test('Fort Kaboom keeps its static wave table out of the scenario until formal integration', () => {
  assert.equal(fortKaboomContent.campaignWaves, undefined);
});
