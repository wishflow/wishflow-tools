import { cowGulchP1aSampleContent } from './cow-gulch';
import type { ScenarioContent } from '../game';
import type { CampaignStageDefinition } from '../progress';

/** T20-only acceptance content. Both stages reuse the researched Cow Gulch map. */
export const campaignProgressSampleOne: ScenarioContent = {
  ...cowGulchP1aSampleContent,
  id: 'campaign-cow-gulch-sample-1',
  contentVersion: 'web-campaign-sample-1',
  title: { en: 'Cow Gulch · Progress sample 1', zh: '牛溪谷 · 进度样本 1' },
};

export const campaignProgressSampleTwo: ScenarioContent = {
  ...cowGulchP1aSampleContent,
  id: 'campaign-cow-gulch-sample-2',
  contentVersion: 'web-campaign-sample-2',
  title: { en: 'Cow Gulch · Progress sample 2', zh: '牛溪谷 · 进度样本 2' },
  previewWave: {
    ...cowGulchP1aSampleContent.previewWave!,
    initialLives: 40,
    initialCash: 75,
  },
};

export const campaignProgressSampleStages: readonly CampaignStageDefinition[] = [
  {
    scenarioId: campaignProgressSampleOne.id,
    contentVersion: campaignProgressSampleOne.contentVersion!,
    title: campaignProgressSampleOne.title,
    globalLevel: 1,
    requiresCompletedScenarioIds: [],
  },
  {
    scenarioId: campaignProgressSampleTwo.id,
    contentVersion: campaignProgressSampleTwo.contentVersion!,
    title: campaignProgressSampleTwo.title,
    globalLevel: 2,
    requiresCompletedScenarioIds: [campaignProgressSampleOne.id],
  },
];
