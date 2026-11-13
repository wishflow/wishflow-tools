import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const oregon04ContentVersionPrefix = 'gng-free-1.8.6-oregon-04-formal-v1';

function contentVersionFor(completedScenarioIds: readonly string[]): string {
  return `${oregon04ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
  )}`;
}

/** Records all four global unit milestones that alter Fort Echo map units. */
export function oregon04CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionFor(completedScenarioIds);
}

export interface Oregon04ReplayContentVersion {
  completedScenarioIds: string[];
}

/** Accepts only canonical versions, so replay import cannot silently use the current profile. */
export function parseOregon04ReplayContentVersion(
  contentVersion: string | undefined,
): Oregon04ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${oregon04ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  if (!snapshot) return undefined;
  const completedScenarioIds = completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot);
  if (contentVersionFor(completedScenarioIds) !== contentVersion) return undefined;
  return { completedScenarioIds };
}

export function oregon04CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  return parseOregon04ReplayContentVersion(contentVersion)?.completedScenarioIds;
}
