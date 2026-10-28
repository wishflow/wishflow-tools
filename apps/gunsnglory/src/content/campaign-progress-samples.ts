import { cowGulchContent } from './cow-gulch';
import type { ScenarioContent } from '../game';
import type { CampaignStageDefinition } from '../progress';

/** T20-only acceptance content. Both stages reuse the researched Cow Gulch map. */
export const campaignProgressSampleOne: ScenarioContent = {
  ...cowGulchContent,
  id: 'campaign-cow-gulch-sample-1',
  contentVersion: 'web-campaign-sample-1',
  title: { en: 'Cow Gulch · Progress sample 1', zh: '牛溪谷 · 进度样本 1' },
};

export const campaignProgressSampleTwo: ScenarioContent = {
  ...cowGulchContent,
  id: 'campaign-cow-gulch-sample-2',
  contentVersion: 'web-campaign-sample-2',
  title: { en: 'Cow Gulch · Progress sample 2', zh: '牛溪谷 · 进度样本 2' },
  previewWave: {
    ...cowGulchContent.previewWave!,
    initialLives: 40,
    initialCash: 75,
  },
};

export const campaignProgressSampleStages: readonly CampaignStageDefinition[] = [
  {
    scenarioId: campaignProgressSampleOne.id,
    contentVersion: campaignProgressSampleOne.contentVersion!,
    title: campaignProgressSampleOne.title,
    requiresCompletedScenarioIds: [],
  },
  {
    scenarioId: campaignProgressSampleTwo.id,
    contentVersion: campaignProgressSampleTwo.contentVersion!,
    title: campaignProgressSampleTwo.title,
    requiresCompletedScenarioIds: [campaignProgressSampleOne.id],
  },
];
