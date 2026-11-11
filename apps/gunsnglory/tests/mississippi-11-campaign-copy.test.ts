import assert from 'node:assert/strict';
import test from 'node:test';
import { createMississippi11CampaignContent } from '../src/content/mississippi-11-campaign';
import { mississippi11CampaignCopy } from '../src/content/mississippi-11-campaign-copy';

test('Traveller’s Town menu and victory copy match APK English resources and provide Chinese translations', () => {
  assert.equal(mississippi11CampaignCopy.title.en, "Traveller's Town");
  assert.equal(mississippi11CampaignCopy.overview.en,
    "Traveler's Town is a popular travel destination on the edge of the Mississippi River.");
  assert.equal(mississippi11CampaignCopy.victoryTitle.en, "The Rogue of Traveller's Town");
  assert.ok(mississippi11CampaignCopy.title.zh.length > 0);
  assert.ok(mississippi11CampaignCopy.overview.zh.length > 0);
  assert.ok(mississippi11CampaignCopy.victoryTitle.zh.length > 0);
  assert.deepEqual(createMississippi11CampaignContent().title, mississippi11CampaignCopy.title);
});
