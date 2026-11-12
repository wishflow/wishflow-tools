import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const mississippi20ContentVersionPrefix = 'gng-free-1.8.6-mississippi-20-formal-v1';

export function mississippi20CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return `${mississippi20ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
  )}`;
}

/** Restores the four global hire unlocks recorded when a Horse Hills replay was created. */
export function mississippi20CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const prefix = `${mississippi20ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  return snapshot && mississippi20CampaignContentVersionFor(
    completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot),
  ) === contentVersion
    ? completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot)
    : undefined;
}
