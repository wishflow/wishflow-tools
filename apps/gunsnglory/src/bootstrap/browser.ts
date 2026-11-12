import { createGame } from '../game';
import {
  cowGulchP1aSampleContent,
  cowGulchP1bCampaignContent,
  cowGulchP1cCampaignContent,
  cowGulchP1dCampaignContent,
  cowGulchUpgradeSampleContent,
} from '../content/cow-gulch';
import { cowGulchDefeatContent } from '../content/cow-gulch-defeat';
import { gamblerUiLowCashSampleContent, gamblerUiSampleContent } from '../content/gambler-ui-sample';
import { recruitConfirmationUiSampleContent } from '../content/recruit-confirmation-ui-sample';
import { techTownTrainTestContent } from '../content/tech-town-train-sample';
import { createTechTownCampaignContent, techTownCampaignId, techTownLevelFourContent } from '../content/tech-town-campaign';
import { billyHillsCampaignId, billyHillsLevelFiveContent, createBillyHillsCampaignContent } from '../content/billy-hills-campaign';
import {
  createMurdockMountainsCampaignContent,
  murdockMountainsCampaignId,
} from '../content/murdock-mountains-campaign';
import { createLuckyLakeCampaignContent, luckyLakeCampaignId } from '../content/lucky-lake-campaign';
import {
  cactusvilleCampaignId,
  cactusvilleCampaignContentVersionFor,
  cactusvilleCompletedScenarioIdsForContentVersion,
  createCactusvilleCampaignContent,
} from '../content/cactusville-campaign';
import {
  createRailroadRanchCampaignContent,
  railroadRanchCampaignContentVersionFor,
  railroadRanchCampaignId,
  railroadRanchCompletedScenarioIdsForContentVersion,
} from '../content/railroad-ranch-campaign';
import {
  createLostCityCampaignContent,
  lostCityCampaignContentVersionFor,
  lostCityCampaignId,
  lostCityCompletedScenarioIdsForContentVersion,
} from '../content/lost-city-campaign';
import {
  createMississippi11CampaignContent,
  mississippi11CampaignContentVersionFor,
  mississippi11CampaignId,
  mississippi11CompletedScenarioIdsForContentVersion,
} from '../content/mississippi-11-campaign';
import {
  createMississippi12CampaignContent,
  mississippi12CompletedScenarioIdsForContentVersion,
  mississippi12CampaignContentVersionFor,
} from '../content/mississippi-12-campaign';
import { mississippi12CampaignId } from '../content/mississippi-12-identity';
import {
  apacheValleyLevelTwoContent,
  cowGulchLevelOneContent,
  fortKaboomLevelThreeContent,
  officialCampaignStages,
  luckyLakeLevelSevenCampaignContent,
  cactusvilleLevelEightCampaignContent,
  railroadRanchLevelNineCampaignContent,
  murdockMountainsLevelSixCampaignContent,
} from '../content/official-campaign';
import {
  campaignProgressSampleOne,
  campaignProgressSampleTwo,
} from '../content/campaign-progress-samples';
import { createProgress } from '../progress';
import type { ScenarioContent } from '../game';
import { createIndexedDbProfileRepository } from '../progress/indexeddb-profile-repository';
import { createIndexedDbExperimentRepository } from '../experiments/indexeddb-experiment-repository';

function createSessionId(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const browserScenarios: Readonly<Record<string, ScenarioContent>> = {
  [cowGulchP1aSampleContent.id]: cowGulchP1aSampleContent,
  [cowGulchP1bCampaignContent.id]: cowGulchP1bCampaignContent,
  [cowGulchP1cCampaignContent.id]: cowGulchP1cCampaignContent,
  [cowGulchP1dCampaignContent.id]: cowGulchP1dCampaignContent,
  [cowGulchLevelOneContent.id]: cowGulchLevelOneContent,
  [apacheValleyLevelTwoContent.id]: apacheValleyLevelTwoContent,
  [fortKaboomLevelThreeContent.id]: fortKaboomLevelThreeContent,
  [techTownLevelFourContent.id]: techTownLevelFourContent,
  [billyHillsLevelFiveContent.id]: billyHillsLevelFiveContent,
  [murdockMountainsLevelSixCampaignContent.id]: murdockMountainsLevelSixCampaignContent,
  [luckyLakeLevelSevenCampaignContent.id]: luckyLakeLevelSevenCampaignContent,
  [cactusvilleLevelEightCampaignContent.id]: cactusvilleLevelEightCampaignContent,
  [railroadRanchCampaignId]: railroadRanchLevelNineCampaignContent,
  [lostCityCampaignId]: createLostCityCampaignContent(),
  [mississippi11CampaignId]: createMississippi11CampaignContent(),
  [mississippi12CampaignId]: createMississippi12CampaignContent(),
  [cowGulchDefeatContent.id]: cowGulchDefeatContent,
  [cowGulchUpgradeSampleContent.id]: cowGulchUpgradeSampleContent,
  [gamblerUiSampleContent.id]: gamblerUiSampleContent,
  [gamblerUiLowCashSampleContent.id]: gamblerUiLowCashSampleContent,
  ...(import.meta.env?.DEV ? { [recruitConfirmationUiSampleContent.id]: recruitConfirmationUiSampleContent } : {}),
  [techTownTrainTestContent.id]: techTownTrainTestContent,
  [campaignProgressSampleOne.id]: campaignProgressSampleOne,
  [campaignProgressSampleTwo.id]: campaignProgressSampleTwo,
};

export function getBrowserScenarioContentVersion(
  scenarioId: string,
  completedScenarioIds: readonly string[] = [],
): string | undefined {
  if (scenarioId === cactusvilleCampaignId) {
    return cactusvilleCampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === railroadRanchCampaignId) {
    return railroadRanchCampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === lostCityCampaignId) {
    return lostCityCampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === mississippi11CampaignId) {
    return mississippi11CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === mississippi12CampaignId) {
    return mississippi12CampaignContentVersionFor(completedScenarioIds);
  }
  const scenario = browserScenarios[scenarioId];
  return scenario ? scenario.contentVersion ?? 'unversioned' : undefined;
}

export function createBrowserGame(completedScenarioIds: readonly string[] = ['campaign-new-mexico-03']) {
  const scenarios = {
    ...browserScenarios,
    [techTownCampaignId]: createTechTownCampaignContent(completedScenarioIds),
    [billyHillsCampaignId]: createBillyHillsCampaignContent(completedScenarioIds),
    [murdockMountainsCampaignId]: createMurdockMountainsCampaignContent(completedScenarioIds),
    [luckyLakeCampaignId]: createLuckyLakeCampaignContent(completedScenarioIds),
    [cactusvilleCampaignId]: createCactusvilleCampaignContent(completedScenarioIds),
    [railroadRanchCampaignId]: createRailroadRanchCampaignContent(completedScenarioIds),
    [lostCityCampaignId]: createLostCityCampaignContent(completedScenarioIds),
    [mississippi11CampaignId]: createMississippi11CampaignContent(completedScenarioIds),
    [mississippi12CampaignId]: createMississippi12CampaignContent(completedScenarioIds),
  };
  return createGame({
    scenarios,
    randomSeedSource: () => {
      const seed = new Uint32Array(1);
      globalThis.crypto.getRandomValues(seed);
      return seed[0]!;
    },
    sessionIdSource: createSessionId,
  });
}

/** Replay import uses the recorded unlock snapshot, even if the current profile has changed. */
export function createBrowserGameForCactusvilleReplay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? cactusvilleCompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  return createBrowserGame(completedScenarioIds ?? []);
}

/** Replay import uses the recorded dynamite visibility snapshot, not today's profile. */
export function createBrowserGameForRailroadRanchReplay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? railroadRanchCompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  return createBrowserGame(completedScenarioIds ?? []);
}

/** Replay import uses the recorded Lost City special-unit visibility snapshot. */
export function createBrowserGameForLostCityReplay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? lostCityCompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  return createBrowserGame(completedScenarioIds ?? []);
}

/** Replay import uses Traveller's Town's recorded special-unit unlock snapshot. */
export function createBrowserGameForMississippi11Replay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? mississippi11CompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  return createBrowserGame(completedScenarioIds ?? []);
}

/** Replay import restores the Pyromaniac visibility recorded for Steam Valley, not today's profile. */
export function createBrowserGameForMississippi12Replay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? mississippi12CompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  return createBrowserGame(completedScenarioIds ?? []);
}

export function createBrowserProgress() {
  return createProgress(createIndexedDbProfileRepository(), officialCampaignStages);
}

export function createBrowserExperimentRepository() {
  return createIndexedDbExperimentRepository();
}
