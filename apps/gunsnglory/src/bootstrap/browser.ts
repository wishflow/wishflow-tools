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
  apacheValleyLevelTwoContent,
  cowGulchLevelOneContent,
  fortKaboomLevelThreeContent,
  officialCampaignStages,
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
  [cowGulchDefeatContent.id]: cowGulchDefeatContent,
  [cowGulchUpgradeSampleContent.id]: cowGulchUpgradeSampleContent,
  [gamblerUiSampleContent.id]: gamblerUiSampleContent,
  [gamblerUiLowCashSampleContent.id]: gamblerUiLowCashSampleContent,
  ...(import.meta.env?.DEV ? { [recruitConfirmationUiSampleContent.id]: recruitConfirmationUiSampleContent } : {}),
  [techTownTrainTestContent.id]: techTownTrainTestContent,
  [campaignProgressSampleOne.id]: campaignProgressSampleOne,
  [campaignProgressSampleTwo.id]: campaignProgressSampleTwo,
};

export function getBrowserScenarioContentVersion(scenarioId: string): string | undefined {
  const scenario = browserScenarios[scenarioId];
  return scenario ? scenario.contentVersion ?? 'unversioned' : undefined;
}

export function createBrowserGame(completedScenarioIds: readonly string[] = ['campaign-new-mexico-03']) {
  const scenarios = {
    ...browserScenarios,
    [techTownCampaignId]: createTechTownCampaignContent(completedScenarioIds),
    [billyHillsCampaignId]: createBillyHillsCampaignContent(completedScenarioIds),
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

export function createBrowserProgress() {
  return createProgress(createIndexedDbProfileRepository(), officialCampaignStages);
}

export function createBrowserExperimentRepository() {
  return createIndexedDbExperimentRepository();
}
