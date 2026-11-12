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
import { createMississippi13CampaignContent } from '../content/mississippi-13-campaign';
import {
  mississippi13CampaignContentVersionFor,
  mississippi13CompletedScenarioIdsForContentVersion,
} from '../content/mississippi-13-content-version';
import { mississippi13CampaignId } from '../content/mississippi-13-identity';
import { createMississippi14CampaignContent } from '../content/mississippi-14-campaign';
import {
  mississippi14CampaignContentVersionFor,
  mississippi14CompletedScenarioIdsForContentVersion,
} from '../content/mississippi-14-content-version';
import { mississippi14CampaignId } from '../content/mississippi-14-identity';
import { createMississippi15CampaignContent } from '../content/mississippi-15-campaign';
import {
  mississippi15CampaignContentVersionFor,
  mississippi15CompletedScenarioIdsForContentVersion,
} from '../content/mississippi-15-content-version';
import { mississippi15CampaignId } from '../content/mississippi-15-identity';
import { createMississippi16CampaignContent } from '../content/mississippi-16-campaign';
import {
  mississippi16CampaignContentVersionFor,
  mississippi16CompletedScenarioIdsForContentVersion,
} from '../content/mississippi-16-content-version';
import { mississippi16CampaignId } from '../content/mississippi-16-identity';
import { createMississippi17CampaignContent } from '../content/mississippi-17-campaign';
import {
  mississippi17CampaignContentVersionFor,
  mississippi17CompletedScenarioIdsForContentVersion,
} from '../content/mississippi-17-content-version';
import { mississippi17CampaignId } from '../content/mississippi-17-identity';
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
  [mississippi13CampaignId]: createMississippi13CampaignContent(),
  [mississippi14CampaignId]: createMississippi14CampaignContent(),
  [mississippi15CampaignId]: createMississippi15CampaignContent(),
  [mississippi16CampaignId]: createMississippi16CampaignContent(),
  [mississippi17CampaignId]: createMississippi17CampaignContent(),
  [cowGulchDefeatContent.id]: cowGulchDefeatContent,
  [cowGulchUpgradeSampleContent.id]: cowGulchUpgradeSampleContent,
  [gamblerUiSampleContent.id]: gamblerUiSampleContent,
  [gamblerUiLowCashSampleContent.id]: gamblerUiLowCashSampleContent,
  ...(import.meta.env?.DEV ? { [recruitConfirmationUiSampleContent.id]: recruitConfirmationUiSampleContent } : {}),
  [techTownTrainTestContent.id]: techTownTrainTestContent,
  [campaignProgressSampleOne.id]: campaignProgressSampleOne,
  [campaignProgressSampleTwo.id]: campaignProgressSampleTwo,
};

const mississippiLegacyBaseHireTypes = new Set([
  'gunslinger', 'mexican', 'cannon', 'indian', 'sniper', 'grandpa',
]);

interface LegacyMississippiReplayContent {
  scenarioId: string;
  contentVersion: string;
}

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
  if (scenarioId === mississippi13CampaignId) {
    return mississippi13CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === mississippi14CampaignId) {
    return mississippi14CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === mississippi15CampaignId) {
    return mississippi15CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === mississippi16CampaignId) {
    return mississippi16CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === mississippi17CampaignId) {
    return mississippi17CampaignContentVersionFor(completedScenarioIds);
  }
  const scenario = browserScenarios[scenarioId];
  return scenario ? scenario.contentVersion ?? 'unversioned' : undefined;
}

export function createBrowserGame(
  completedScenarioIds: readonly string[] = ['campaign-new-mexico-03'],
  legacyMississippiReplay?: LegacyMississippiReplayContent,
) {
  const scenarios: Record<string, ScenarioContent> = {
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
    [mississippi13CampaignId]: createMississippi13CampaignContent(completedScenarioIds),
    [mississippi14CampaignId]: createMississippi14CampaignContent(completedScenarioIds),
    [mississippi15CampaignId]: createMississippi15CampaignContent(completedScenarioIds),
    [mississippi16CampaignId]: createMississippi16CampaignContent(completedScenarioIds),
    [mississippi17CampaignId]: createMississippi17CampaignContent(completedScenarioIds),
  };
  if (legacyMississippiReplay) {
    const scenario = scenarios[legacyMississippiReplay.scenarioId];
    if (scenario) {
      scenarios[legacyMississippiReplay.scenarioId] = {
        ...scenario,
        contentVersion: legacyMississippiReplay.contentVersion,
        units: scenario.units.filter(({ activity, type }) => (
          activity !== 4 || !mississippiLegacyBaseHireTypes.has(type)
        )),
      };
    }
  }
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
  const legacyReplay = completedScenarioIds && contentVersion?.includes('-formal-v1-')
    ? { scenarioId: mississippi11CampaignId, contentVersion }
    : undefined;
  return createBrowserGame(completedScenarioIds ?? [], legacyReplay);
}

/** Replay import restores the Pyromaniac visibility recorded for Steam Valley, not today's profile. */
export function createBrowserGameForMississippi12Replay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? mississippi12CompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  const legacyReplay = completedScenarioIds && contentVersion?.includes('-formal-v1-')
    ? { scenarioId: mississippi12CampaignId, contentVersion }
    : undefined;
  return createBrowserGame(completedScenarioIds ?? [], legacyReplay);
}

/** Replay import restores both Golden River special-unit unlocks recorded in its content version. */
export function createBrowserGameForMississippi13Replay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? mississippi13CompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  const legacyReplay = completedScenarioIds && contentVersion?.includes('-formal-v1-')
    ? { scenarioId: mississippi13CampaignId, contentVersion }
    : undefined;
  return createBrowserGame(completedScenarioIds ?? [], legacyReplay);
}

/** Replay import restores both Riverside Mountains special-unit unlocks from the recording. */
export function createBrowserGameForMississippi14Replay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? mississippi14CompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  const legacyReplay = completedScenarioIds && contentVersion?.includes('-formal-v1-')
    ? { scenarioId: mississippi14CampaignId, contentVersion }
    : undefined;
  return createBrowserGame(completedScenarioIds ?? [], legacyReplay);
}

/** Replay import restores both Railroad Canyon special-unit unlocks from the recorded snapshot. */
export function createBrowserGameForMississippi15Replay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? mississippi15CompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  const legacyReplay = completedScenarioIds && contentVersion?.includes('-formal-v1-')
    ? { scenarioId: mississippi15CampaignId, contentVersion }
    : undefined;
  return createBrowserGame(completedScenarioIds ?? [], legacyReplay);
}

/** Replay import restores Highpoint Terrace's special-unit and Dynamite snapshot, not today's profile. */
export function createBrowserGameForMississippi16Replay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? mississippi16CompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  const legacyReplay = completedScenarioIds && contentVersion?.includes('-formal-v1-')
    ? { scenarioId: mississippi16CampaignId, contentVersion }
    : undefined;
  return createBrowserGame(completedScenarioIds ?? [], legacyReplay);
}

/** Replay import restores Dead Rocks' recorded global map-unit unlock snapshot. */
export function createBrowserGameForMississippi17Replay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? mississippi17CompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  return createBrowserGame(completedScenarioIds ?? []);
}

export function createBrowserProgress() {
  return createProgress(createIndexedDbProfileRepository(), officialCampaignStages);
}

export function createBrowserExperimentRepository() {
  return createIndexedDbExperimentRepository();
}
