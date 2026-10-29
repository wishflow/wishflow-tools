import type { CampaignStageDefinition } from '../progress';
import { cowGulchP1dCampaignContent } from './cow-gulch';

/** Stable production identity for the fully implemented original Cow Gulch level. */
export const cowGulchLevelOneContent = {
  ...cowGulchP1dCampaignContent,
  id: 'campaign-new-mexico-01',
  contentVersion: 'gng-free-1.8.6-new-mexico-01-p1e-v2',
  title: { en: 'Cow Gulch · Level 1', zh: '牛溪谷 · 第 1 关' },
  formalSettlementSupported: true,
};

export const officialCampaignStages: readonly CampaignStageDefinition[] = Object.freeze([{
  scenarioId: cowGulchLevelOneContent.id,
  contentVersion: cowGulchLevelOneContent.contentVersion,
  title: cowGulchLevelOneContent.title,
  globalLevel: 1,
  requiresCompletedScenarioIds: [],
}]);
