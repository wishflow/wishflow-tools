import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const mississippi17ContentVersionPrefix = 'gng-free-1.8.6-mississippi-17-formal-v1';

export function mississippi17CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return `${mississippi17ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
  )}`;
}

/** Restores the four global unit-unlock flags recorded when a Dead Rocks replay was created. */
export function mississippi17CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const prefix = `${mississippi17ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  return snapshot && mississippi17CampaignContentVersionFor(
    completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot),
  ) === contentVersion
    ? completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot)
    : undefined;
}
