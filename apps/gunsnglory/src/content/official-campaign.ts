import type { CampaignStageDefinition } from '../progress';
import { cowGulchP1dCampaignContent } from './cow-gulch';
import { apacheValleyContent } from './apache-valley';
import {
  fortKaboomCampaignEnemy,
  fortKaboomCampaignEnemyByType,
  fortKaboomCampaignWaves,
  fortKaboomContent,
  fortKaboomPreviewWave,
} from './fort-kaboom';

/** Stable production identity for the fully implemented original Cow Gulch level. */
export const cowGulchLevelOneContent = {
  ...cowGulchP1dCampaignContent,
  id: 'campaign-new-mexico-01',
  contentVersion: 'gng-free-1.8.6-new-mexico-01-p1e-v2',
  title: { en: 'Cow Gulch · Level 1', zh: '牛溪谷 · 第 1 关' },
  formalSettlementSupported: true,
};

/** Stable production identity for the fully implemented original Apache Valley level. */
export const apacheValleyLevelTwoContent = apacheValleyContent;

/** Formal New Mexico level three assembled from the researched Fort Kaboom content. */
export const fortKaboomLevelThreeContent = {
  ...fortKaboomContent,
  contentVersion: 'gng-free-1.8.6-new-mexico-03-formal-v1',
  formalSettlementSupported: true,
  previewWave: fortKaboomPreviewWave,
  campaignWaveCount: fortKaboomCampaignWaves.length,
  campaignWaves: fortKaboomCampaignWaves,
  campaignEnemy: fortKaboomCampaignEnemy,
  campaignEnemyByType: fortKaboomCampaignEnemyByType,
};

export const officialCampaignStages: readonly CampaignStageDefinition[] = Object.freeze([{
  scenarioId: cowGulchLevelOneContent.id,
  contentVersion: cowGulchLevelOneContent.contentVersion,
  title: cowGulchLevelOneContent.title,
  globalLevel: 1,
  requiresCompletedScenarioIds: [],
}, {
  scenarioId: apacheValleyLevelTwoContent.id,
  contentVersion: apacheValleyLevelTwoContent.contentVersion!,
  title: apacheValleyLevelTwoContent.title,
  globalLevel: 2,
  requiresCompletedScenarioIds: [cowGulchLevelOneContent.id],
}, {
  scenarioId: fortKaboomLevelThreeContent.id,
  contentVersion: fortKaboomLevelThreeContent.contentVersion,
  title: fortKaboomLevelThreeContent.title,
  globalLevel: 3,
  requiresCompletedScenarioIds: [apacheValleyLevelTwoContent.id],
}]);
