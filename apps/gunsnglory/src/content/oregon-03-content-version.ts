import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const oregon03ContentVersionPrefix = 'gng-free-1.8.6-oregon-03-formal-v1';

function contentVersionFor(completedScenarioIds: readonly string[]): string {
  return `${oregon03ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
  )}`;
}

/** Records all four global unit milestones that alter Chinook Woods map units. */
export function oregon03CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionFor(completedScenarioIds);
}

export interface Oregon03ReplayContentVersion {
  completedScenarioIds: string[];
}

/** Accepts only canonical versions, so replay import cannot silently use the current profile. */
export function parseOregon03ReplayContentVersion(
  contentVersion: string | undefined,
): Oregon03ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${oregon03ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  if (!snapshot) return undefined;
  const completedScenarioIds = completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot);
  if (contentVersionFor(completedScenarioIds) !== contentVersion) return undefined;
  return { completedScenarioIds };
}

export function oregon03CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  return parseOregon03ReplayContentVersion(contentVersion)?.completedScenarioIds;
}
