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
import { techTownLevelFourContent } from './tech-town-campaign';
import { billyHillsLevelFiveContent } from './billy-hills-campaign';
import { createMurdockMountainsCampaignContent } from './murdock-mountains-campaign';
import { createLuckyLakeCampaignContent } from './lucky-lake-campaign';

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

/** Formal New Mexico level four assembled from the researched Tech Town content. */
export const techTownLevelFourCampaignContent = techTownLevelFourContent;

/** Formal New Mexico level five assembled from the researched Billy Hills content. */
export const billyHillsLevelFiveCampaignContent = billyHillsLevelFiveContent;

/** Formal New Mexico level six assembled from the researched Murdock Mountains content. */
export const murdockMountainsLevelSixCampaignContent = createMurdockMountainsCampaignContent([
  billyHillsLevelFiveCampaignContent.id,
]);

/** Formal New Mexico level seven assembled from the researched Lucky Lake content. */
export const luckyLakeLevelSevenCampaignContent = createLuckyLakeCampaignContent([
  cowGulchLevelOneContent.id,
  apacheValleyLevelTwoContent.id,
  fortKaboomLevelThreeContent.id,
  techTownLevelFourCampaignContent.id,
  billyHillsLevelFiveCampaignContent.id,
  murdockMountainsLevelSixCampaignContent.id,
]);

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
}, {
  scenarioId: techTownLevelFourCampaignContent.id,
  contentVersion: techTownLevelFourCampaignContent.contentVersion!,
  title: techTownLevelFourCampaignContent.title,
  globalLevel: 4,
  requiresCompletedScenarioIds: [fortKaboomLevelThreeContent.id],
}, {
  scenarioId: billyHillsLevelFiveCampaignContent.id,
  contentVersion: billyHillsLevelFiveCampaignContent.contentVersion!,
  title: billyHillsLevelFiveCampaignContent.title,
  globalLevel: 5,
  requiresCompletedScenarioIds: [techTownLevelFourCampaignContent.id],
}, {
  scenarioId: murdockMountainsLevelSixCampaignContent.id,
  contentVersion: murdockMountainsLevelSixCampaignContent.contentVersion!,
  title: murdockMountainsLevelSixCampaignContent.title,
  globalLevel: 6,
  requiresCompletedScenarioIds: [billyHillsLevelFiveCampaignContent.id],
}, {
  scenarioId: luckyLakeLevelSevenCampaignContent.id,
  contentVersion: luckyLakeLevelSevenCampaignContent.contentVersion!,
  title: luckyLakeLevelSevenCampaignContent.title,
  globalLevel: 7,
  requiresCompletedScenarioIds: [murdockMountainsLevelSixCampaignContent.id],
}]);
