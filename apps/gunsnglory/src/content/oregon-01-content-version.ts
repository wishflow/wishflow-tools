import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const oregon01ContentVersionPrefix = 'gng-free-1.8.6-oregon-01-formal-v1';

/** Records the global unit-unlock milestones that change Eastwood's Gambler and prize templates. */
export function oregon01CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return `${oregon01ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
  )}`;
}

/** Reconstructs the unit-unlock milestones saved in an Eastwood replay version. */
export function oregon01CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const prefix = `${oregon01ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  if (!snapshot) return undefined;
  const completedScenarioIds = completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot);
  return oregon01CampaignContentVersionFor(completedScenarioIds) === contentVersion
    ? completedScenarioIds
    : undefined;
}
