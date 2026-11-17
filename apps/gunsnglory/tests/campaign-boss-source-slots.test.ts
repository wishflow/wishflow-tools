import assert from 'node:assert/strict';
import test from 'node:test';
import { oregon02CampaignWaves } from '../src/content/oregon-02-campaign-waves';
import { oregon03CampaignWaves } from '../src/content/oregon-03-campaign-waves';
import { oregon04CampaignWaves } from '../src/content/oregon-04-campaign-waves';
import { oregon05CampaignWaves } from '../src/content/oregon-05-campaign-waves';
import { oregon06CampaignWaves } from '../src/content/oregon-06-campaign-waves';
import { oregon07CampaignWaves } from '../src/content/oregon-07-campaign-waves';
import { oregon08CampaignWaves } from '../src/content/oregon-08-campaign-waves';
import { oregon09CampaignWaves } from '../src/content/oregon-09-campaign-waves';

const integratedBossCampaigns = [
  ['Cashcow Canyon', oregon02CampaignWaves],
  ['Billy Hills', oregon03CampaignWaves],
  ['Fort Echo', oregon04CampaignWaves],
  ['Apache Valley', oregon05CampaignWaves],
  ['Railroad Ranch', oregon06CampaignWaves],
  ['Mount Hood', oregon07CampaignWaves],
  ['Colt City', oregon08CampaignWaves],
  ['Snake River', oregon09CampaignWaves],
] as const;

test('APK Boss slot 10 maps to request index 8; Doc slot 11 stays empty through level 29', () => {
  const actual = integratedBossCampaigns.map(([stage, waves]) => {
    const requests = waves.flatMap((wave) => wave.spawnPools.map((pool) => pool.requests));
    const bossCounts = requests.map((pool) => pool[8] ?? 0).reduce((sum, count) => sum + count, 0);
    const docCounts = requests.map((pool) => pool[9] ?? 0).reduce((sum, count) => sum + count, 0);

    assert.ok(requests.every((pool) => pool.length === 10), `${stage} must retain the complete APK request vector`);
    return { stage, bossCounts, docCounts };
  });

  assert.deepEqual(actual, integratedBossCampaigns.map(([stage]) => ({ stage, bossCounts: 1, docCounts: 0 })));
});
