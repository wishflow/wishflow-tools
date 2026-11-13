import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const oregon02ContentVersionPrefix = 'gng-free-1.8.6-oregon-02-formal-v1';

function contentVersionFor(completedScenarioIds: readonly string[]): string {
  return `${oregon02ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
  )}`;
}

/** Stores the shared unlock snapshot that controls Cashcow's two special hire markers. */
export function oregon02CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionFor(completedScenarioIds);
}

export interface Oregon02ReplayContentVersion {
  completedScenarioIds: string[];
}

/** Parses only canonical M23 versions so replay construction cannot fall back to the current profile. */
export function parseOregon02ReplayContentVersion(
  contentVersion: string | undefined,
): Oregon02ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${oregon02ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  if (!snapshot) return undefined;
  const completedScenarioIds = completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot);
  if (contentVersionFor(completedScenarioIds) !== contentVersion) return undefined;
  return { completedScenarioIds };
}

export function oregon02CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  return parseOregon02ReplayContentVersion(contentVersion)?.completedScenarioIds;
}
