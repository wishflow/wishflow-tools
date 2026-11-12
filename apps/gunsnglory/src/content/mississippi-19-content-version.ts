import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const mississippi19ContentVersionPrefix = 'gng-free-1.8.6-mississippi-19-formal-v1';

export function mississippi19CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return `${mississippi19ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
  )}`;
}

/** Restores the four global hire unlocks recorded when a Dust Falls replay was created. */
export function mississippi19CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const prefix = `${mississippi19ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  return snapshot && mississippi19CampaignContentVersionFor(
    completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot),
  ) === contentVersion
    ? completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot)
    : undefined;
}
