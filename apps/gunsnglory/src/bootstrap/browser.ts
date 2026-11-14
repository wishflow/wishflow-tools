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
import { createMississippi18CampaignContent } from '../content/mississippi-18-campaign';
import {
  mississippi18CampaignContentVersionFor,
  mississippi18CompletedScenarioIdsForContentVersion,
} from '../content/mississippi-18-content-version';
import { mississippi18CampaignId } from '../content/mississippi-18-identity';
import { createMississippi19CampaignContent } from '../content/mississippi-19-campaign';
import {
  mississippi19CampaignContentVersionFor,
  mississippi19CompletedScenarioIdsForContentVersion,
} from '../content/mississippi-19-content-version';
import { mississippi19CampaignId } from '../content/mississippi-19-identity';
import { createMississippi20CampaignContent } from '../content/mississippi-20-campaign';
import {
  mississippi20CampaignContentVersionFor,
  mississippi20CompletedScenarioIdsForContentVersion,
} from '../content/mississippi-20-content-version';
import { mississippi20CampaignId } from '../content/mississippi-20-identity';
import { createOregon01CampaignContent } from '../content/oregon-01-campaign';
import {
  oregon01CampaignContentVersionFor,
  parseOregon01ReplayContentVersion,
} from '../content/oregon-01-content-version';
import { oregon01CampaignId } from '../content/oregon-01-identity';
import { createOregon02CampaignContent } from '../content/oregon-02-campaign';
import {
  oregon02CampaignContentVersionFor,
  parseOregon02ReplayContentVersion,
} from '../content/oregon-02-content-version';
import { oregon02CampaignId } from '../content/oregon-02-identity';
import { createOregon03CampaignContent } from '../content/oregon-03-campaign';
import {
  oregon03CampaignContentVersionFor,
  parseOregon03ReplayContentVersion,
} from '../content/oregon-03-content-version';
import { oregon03CampaignId } from '../content/oregon-03-identity';
import { createOregon04CampaignContent } from '../content/oregon-04-campaign';
import {
  oregon04CampaignContentVersionFor,
  parseOregon04ReplayContentVersion,
} from '../content/oregon-04-content-version';
import { oregon04CampaignId } from '../content/oregon-04-identity';
import { createOregon05CampaignContent } from '../content/oregon-05-campaign';
import {
  oregon05CampaignContentVersionFor,
  parseOregon05ReplayContentVersion,
} from '../content/oregon-05-content-version';
import { oregon05CampaignId } from '../content/oregon-05-identity';
import { createOregon06CampaignContent } from '../content/oregon-06-campaign';
import {
  oregon06CampaignContentVersionFor,
  parseOregon06ReplayContentVersion,
} from '../content/oregon-06-content-version';
import { oregon06CampaignId } from '../content/oregon-06-identity';
import { createOregon07CampaignContent, createOregon07CampaignContentFromSnapshot } from '../content/oregon-07-campaign';
import {
  oregon07CampaignContentVersionFor,
  parseOregon07ReplayContentVersion,
} from '../content/oregon-07-content-version';
import { oregon07CampaignId } from '../content/oregon-07-identity';
import {
  newMexicoCampaignContentVersionFor,
  parseNewMexicoReplayContentVersion,
} from '../content/new-mexico-replay-content-version';
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
  [mississippi18CampaignId]: createMississippi18CampaignContent(),
  [mississippi19CampaignId]: createMississippi19CampaignContent(),
  [mississippi20CampaignId]: createMississippi20CampaignContent(),
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

interface LegacyReplayContentOverride {
  scenarioId: string;
  contentVersion: string;
  activity4HireBehavior?: 'keep' | 'filter-known-base-types' | 'filter-all';
}

export function getBrowserScenarioContentVersion(
  scenarioId: string,
  completedScenarioIds: readonly string[] = [],
): string | undefined {
  if (
    scenarioId === techTownCampaignId
    || scenarioId === billyHillsCampaignId
    || scenarioId === murdockMountainsCampaignId
    || scenarioId === luckyLakeCampaignId
  ) {
    return newMexicoCampaignContentVersionFor(scenarioId, completedScenarioIds);
  }
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
  if (scenarioId === mississippi18CampaignId) {
    return mississippi18CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === mississippi19CampaignId) {
    return mississippi19CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === mississippi20CampaignId) {
    return mississippi20CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === oregon01CampaignId) {
    return oregon01CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === oregon02CampaignId) {
    return oregon02CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === oregon03CampaignId) {
    return oregon03CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === oregon04CampaignId) {
    return oregon04CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === oregon05CampaignId) {
    return oregon05CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === oregon06CampaignId) {
    return oregon06CampaignContentVersionFor(completedScenarioIds);
  }
  if (scenarioId === oregon07CampaignId) {
    return oregon07CampaignContentVersionFor(completedScenarioIds);
  }
  const scenario = browserScenarios[scenarioId];
  return scenario ? scenario.contentVersion ?? 'unversioned' : undefined;
}

export function createBrowserGame(
  completedScenarioIds: readonly string[] = ['campaign-new-mexico-03'],
  legacyReplayContentOverride?: LegacyReplayContentOverride,
  unavailableReplayScenarioId?: string,
  scenarioContentOverrides: Readonly<Record<string, ScenarioContent>> = {},
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
    [mississippi18CampaignId]: createMississippi18CampaignContent(completedScenarioIds),
    [mississippi19CampaignId]: createMississippi19CampaignContent(completedScenarioIds),
    [mississippi20CampaignId]: createMississippi20CampaignContent(completedScenarioIds),
    [oregon01CampaignId]: createOregon01CampaignContent(completedScenarioIds),
    [oregon02CampaignId]: createOregon02CampaignContent(completedScenarioIds),
    [oregon03CampaignId]: createOregon03CampaignContent(completedScenarioIds),
    [oregon04CampaignId]: createOregon04CampaignContent(completedScenarioIds),
    [oregon05CampaignId]: createOregon05CampaignContent(completedScenarioIds),
    [oregon06CampaignId]: createOregon06CampaignContent(completedScenarioIds),
    [oregon07CampaignId]: createOregon07CampaignContent(completedScenarioIds),
    ...scenarioContentOverrides,
  };
  if (legacyReplayContentOverride) {
    const scenario = scenarios[legacyReplayContentOverride.scenarioId];
    if (scenario) {
      scenarios[legacyReplayContentOverride.scenarioId] = {
        ...scenario,
        contentVersion: legacyReplayContentOverride.contentVersion,
        ...(legacyReplayContentOverride.activity4HireBehavior === 'keep' ? {} : {
          units: scenario.units.filter(({ activity, type }) => (
            activity !== 4
            || (legacyReplayContentOverride.activity4HireBehavior !== 'filter-all'
              && !mississippiLegacyBaseHireTypes.has(type))
          )),
        }),
      };
    }
  }
  if (unavailableReplayScenarioId) delete scenarios[unavailableReplayScenarioId];
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

/**
 * Rebuilds M4–M7 replay content from the recorded profile snapshot. Fixed v1
 * recordings predate snapshots and intentionally use the importing profile.
 */
export function createBrowserGameForNewMexicoReplay(
  scenarioId: string,
  contentVersion: string | undefined,
  currentCompletedScenarioIds: readonly string[] = [],
) {
  const parsed = parseNewMexicoReplayContentVersion(scenarioId, contentVersion);
  if (typeof contentVersion !== 'string' || !parsed) {
    // An unsupported replay version must not run against today's scenario content.
    return createBrowserGame([], undefined, scenarioId);
  }

  if (parsed.kind === 'snapshot-v2') {
    return createBrowserGame(parsed.completedScenarioIds);
  }

  const legacyCompletedScenarioIds = scenarioId === techTownCampaignId
    ? [...new Set([...currentCompletedScenarioIds, 'campaign-new-mexico-03'])]
    : currentCompletedScenarioIds;
  return createBrowserGame(legacyCompletedScenarioIds, {
    scenarioId,
    contentVersion,
    activity4HireBehavior: 'keep',
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

/** Replay import restores Shadow Town's recorded unlock snapshot and preserves v1 base-unit state. */
export function createBrowserGameForMississippi18Replay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? mississippi18CompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  const legacyReplay = completedScenarioIds && contentVersion?.includes('-formal-v1-')
    ? { scenarioId: mississippi18CampaignId, contentVersion }
    : undefined;
  return createBrowserGame(completedScenarioIds ?? [], legacyReplay);
}

/** Replay import restores Dust Falls' four recorded global hire unlocks. */
export function createBrowserGameForMississippi19Replay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? mississippi19CompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  return createBrowserGame(completedScenarioIds ?? []);
}

/** Replay import restores Horse Hills' four recorded global hire unlocks. */
export function createBrowserGameForMississippi20Replay(contentVersion: string | undefined) {
  const completedScenarioIds = contentVersion
    ? mississippi20CompletedScenarioIdsForContentVersion(contentVersion)
    : undefined;
  return createBrowserGame(completedScenarioIds ?? []);
}

/** Replay import restores Eastwood's recorded global unlocks, including its Gambler prize set. */
export function createBrowserGameForOregon01Replay(contentVersion: string | undefined) {
  const parsed = parseOregon01ReplayContentVersion(contentVersion);
  if (!parsed) return createBrowserGame([], undefined, oregon01CampaignId);
  const legacyReplay = parsed.kind === 'legacy-v1'
    ? {
      scenarioId: oregon01CampaignId,
      contentVersion: contentVersion!,
      activity4HireBehavior: 'filter-all' as const,
    }
    : undefined;
  return createBrowserGame(parsed.completedScenarioIds, legacyReplay);
}

/** Replay import restores Cashcow's recorded global hire unlocks. */
export function createBrowserGameForOregon02Replay(contentVersion: string | undefined) {
  const parsed = parseOregon02ReplayContentVersion(contentVersion);
  if (!parsed) return createBrowserGame([], undefined, oregon02CampaignId);
  return createBrowserGame(parsed.completedScenarioIds);
}

/** Replay import restores Chinook Woods' recorded global hire unlocks. */
export function createBrowserGameForOregon03Replay(contentVersion: string | undefined) {
  const parsed = parseOregon03ReplayContentVersion(contentVersion);
  if (!parsed) return createBrowserGame([], undefined, oregon03CampaignId);
  return createBrowserGame(parsed.completedScenarioIds);
}

/** Replay import restores Fort Echo's recorded global hire unlock snapshot. */
export function createBrowserGameForOregon04Replay(contentVersion: string | undefined) {
  const parsed = parseOregon04ReplayContentVersion(contentVersion);
  if (!parsed) return createBrowserGame([], undefined, oregon04CampaignId);
  return createBrowserGame(parsed.completedScenarioIds);
}

/** Replay import restores Dynamite Plains' recorded unit and Dynamite unlock snapshots. */
export function createBrowserGameForOregon05Replay(contentVersion: string | undefined) {
  const parsed = parseOregon05ReplayContentVersion(contentVersion);
  if (!parsed) return createBrowserGame([], undefined, oregon05CampaignId);
  return createBrowserGame(parsed.completedScenarioIds);
}

/** Replay import restores Columbia River's recorded unit and Dynamite unlock snapshots. */
export function createBrowserGameForOregon06Replay(contentVersion: string | undefined) {
  const parsed = parseOregon06ReplayContentVersion(contentVersion);
  if (!parsed) return createBrowserGame([], undefined, oregon06CampaignId);
  return createBrowserGame(parsed.completedScenarioIds);
}

/** Replay import rebuilds Mount Hood from its recorded unlock snapshot, not the current profile. */
export function createBrowserGameForOregon07Replay(contentVersion: string | undefined) {
  const parsed = parseOregon07ReplayContentVersion(contentVersion);
  if (!parsed) return createBrowserGame([], undefined, oregon07CampaignId);
  return createBrowserGame([], undefined, undefined, {
    [oregon07CampaignId]: createOregon07CampaignContentFromSnapshot(parsed.snapshot),
  });
}

export function createBrowserProgress() {
  return createProgress(createIndexedDbProfileRepository(), officialCampaignStages);
}

export function createBrowserExperimentRepository() {
  return createIndexedDbExperimentRepository();
}
