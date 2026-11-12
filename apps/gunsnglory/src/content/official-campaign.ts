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
import { createCactusvilleCampaignContent } from './cactusville-campaign';
import {
  createRailroadRanchCampaignContent,
  railroadRanchCampaignContentVersion,
  railroadRanchCampaignId,
} from './railroad-ranch-campaign';
import {
  createLostCityCampaignContent,
  lostCityCampaignContentVersion,
  lostCityCampaignId,
} from './lost-city-campaign';
import {
  createMississippi11CampaignContent,
  mississippi11CampaignContentVersion,
  mississippi11CampaignId,
} from './mississippi-11-campaign';
import {
  createMississippi12CampaignContent,
  mississippi12CampaignContentVersionFor,
} from './mississippi-12-campaign';
import { mississippi12CampaignId } from './mississippi-12-identity';
import { mississippi12CampaignCopy } from './mississippi-12-campaign-copy';
import { createMississippi13CampaignContent } from './mississippi-13-campaign';
import { mississippi13CampaignCopy } from './mississippi-13-campaign-copy';
import { mississippi13CampaignId } from './mississippi-13-identity';
import { createMississippi14CampaignContent } from './mississippi-14-campaign';
import { mississippi14CampaignCopy } from './mississippi-14-campaign-copy';
import { mississippi14CampaignId } from './mississippi-14-identity';
import { createMississippi15CampaignContent } from './mississippi-15-campaign';
import { mississippi15CampaignCopy } from './mississippi-15-campaign-copy';
import { mississippi15CampaignId } from './mississippi-15-identity';
import { createMississippi16CampaignContent } from './mississippi-16-campaign';
import { mississippi16CampaignCopy } from './mississippi-16-campaign-copy';
import { mississippi16CampaignId } from './mississippi-16-identity';
import { createMississippi17CampaignContent } from './mississippi-17-campaign';
import { mississippi17CampaignCopy } from './mississippi-17-campaign-copy';
import { mississippi17CampaignId } from './mississippi-17-identity';
import { createMississippi18CampaignContent } from './mississippi-18-campaign';
import { mississippi18CampaignCopy } from './mississippi-18-campaign-copy';
import { mississippi18CampaignId } from './mississippi-18-identity';

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

/** Formal New Mexico level eight assembled from the researched Cactusville content. */
export const cactusvilleLevelEightCampaignContent = createCactusvilleCampaignContent([
  cowGulchLevelOneContent.id,
  apacheValleyLevelTwoContent.id,
  fortKaboomLevelThreeContent.id,
  techTownLevelFourCampaignContent.id,
  billyHillsLevelFiveCampaignContent.id,
  murdockMountainsLevelSixCampaignContent.id,
  luckyLakeLevelSevenCampaignContent.id,
]);

/** Formal New Mexico level nine assembled from the researched Railroad Ranch content. */
export const railroadRanchLevelNineCampaignContent = createRailroadRanchCampaignContent();

/** Formal New Mexico level ten assembled from the researched Lost City content. */
export const lostCityLevelTenCampaignContent = createLostCityCampaignContent();

/** Formal Mississippi level eleven assembled from the researched Traveller's Town content. */
export const mississippi11LevelElevenCampaignContent = createMississippi11CampaignContent();

/** Formal Mississippi level twelve assembled from the researched Steam Valley content. */
export const mississippi12LevelTwelveCampaignContent = createMississippi12CampaignContent();

/** Formal Mississippi level thirteen assembled from the researched Golden River content. */
export const mississippi13LevelThirteenCampaignContent = createMississippi13CampaignContent();

/** Formal Mississippi level fourteen assembled from the researched Riverside Mountains content. */
export const mississippi14LevelFourteenCampaignContent = createMississippi14CampaignContent();

/** Formal Mississippi level fifteen assembled from the researched Railroad Canyon content. */
export const mississippi15LevelFifteenCampaignContent = createMississippi15CampaignContent();

/** Formal Mississippi level sixteen assembled from the researched Highpoint Terrace content. */
export const mississippi16LevelSixteenCampaignContent = createMississippi16CampaignContent();

/** Formal Mississippi level seventeen assembled from the researched Dead Rocks content. */
export const mississippi17LevelSeventeenCampaignContent = createMississippi17CampaignContent();

/** Formal Mississippi level eighteen assembled from the researched Shadow Town content. */
export const mississippi18LevelEighteenCampaignContent = createMississippi18CampaignContent();

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
}, {
  scenarioId: cactusvilleLevelEightCampaignContent.id,
  contentVersion: cactusvilleLevelEightCampaignContent.contentVersion!,
  title: cactusvilleLevelEightCampaignContent.title,
  globalLevel: 8,
  requiresCompletedScenarioIds: [luckyLakeLevelSevenCampaignContent.id],
}, {
  scenarioId: railroadRanchCampaignId,
  contentVersion: railroadRanchCampaignContentVersion,
  title: railroadRanchLevelNineCampaignContent.title,
  globalLevel: 9,
  requiresCompletedScenarioIds: [cactusvilleLevelEightCampaignContent.id],
}, {
  scenarioId: lostCityCampaignId,
  contentVersion: lostCityCampaignContentVersion,
  title: lostCityLevelTenCampaignContent.title,
  globalLevel: 10,
  requiresCompletedScenarioIds: [railroadRanchCampaignId],
}, {
  scenarioId: mississippi11CampaignId,
  contentVersion: mississippi11CampaignContentVersion,
  title: { en: "Traveller's Town · Level 11", zh: '旅行者小镇 · 第 11 关' },
  globalLevel: 11,
  requiresCompletedScenarioIds: [lostCityCampaignId],
}, {
  scenarioId: mississippi12CampaignId,
  contentVersion: mississippi12CampaignContentVersionFor([]),
  title: { en: `${mississippi12CampaignCopy.title.en} · Level 12`, zh: `${mississippi12CampaignCopy.title.zh} · 第 12 关` },
  globalLevel: 12,
  requiresCompletedScenarioIds: [mississippi11CampaignId],
}, {
  scenarioId: mississippi13CampaignId,
  contentVersion: mississippi13LevelThirteenCampaignContent.contentVersion!,
  title: { en: `${mississippi13CampaignCopy.title.en} · Level 13`, zh: `${mississippi13CampaignCopy.title.zh} · 第 13 关` },
  globalLevel: 13,
  requiresCompletedScenarioIds: [mississippi12CampaignId],
}, {
  scenarioId: mississippi14CampaignId,
  contentVersion: mississippi14LevelFourteenCampaignContent.contentVersion!,
  title: { en: `${mississippi14CampaignCopy.title.en} · Level 14`, zh: `${mississippi14CampaignCopy.title.zh} · 第 14 关` },
  globalLevel: 14,
  requiresCompletedScenarioIds: [mississippi13CampaignId],
}, {
  scenarioId: mississippi15CampaignId,
  contentVersion: mississippi15LevelFifteenCampaignContent.contentVersion!,
  title: { en: `${mississippi15CampaignCopy.title.en} · Level 15`, zh: `${mississippi15CampaignCopy.title.zh} · 第 15 关` },
  globalLevel: 15,
  requiresCompletedScenarioIds: [mississippi14CampaignId],
}, {
  scenarioId: mississippi16CampaignId,
  contentVersion: mississippi16LevelSixteenCampaignContent.contentVersion!,
  title: { en: `${mississippi16CampaignCopy.title.en} · Level 16`, zh: `${mississippi16CampaignCopy.title.zh} · 第 16 关` },
  globalLevel: 16,
  requiresCompletedScenarioIds: [mississippi15CampaignId],
}, {
  scenarioId: mississippi17CampaignId,
  contentVersion: mississippi17LevelSeventeenCampaignContent.contentVersion!,
  title: { en: `${mississippi17CampaignCopy.title.en} · Level 17`, zh: `${mississippi17CampaignCopy.title.zh} · 第 17 关` },
  globalLevel: 17,
  requiresCompletedScenarioIds: [mississippi16CampaignId],
}, {
  scenarioId: mississippi18CampaignId,
  contentVersion: mississippi18LevelEighteenCampaignContent.contentVersion!,
  title: { en: `${mississippi18CampaignCopy.title.en} · Level 18`, zh: `${mississippi18CampaignCopy.title.zh} · 第 18 关` },
  globalLevel: 18,
  requiresCompletedScenarioIds: [mississippi17CampaignId],
}]);
