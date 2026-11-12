import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const mississippi13ContentVersionPrefix = 'gng-free-1.8.6-mississippi-13-formal-v2';
const pyromaniacUnlockScenarioId = 'campaign-nevada-10';
const salesmanUnlockScenarioId = 'campaign-alaska-10';

/** Replay identity includes all global milestones that change map16's unit list. */
export function mississippi13CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return `${mississippi13ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
  )}`;
}

/** Restores the global milestones represented by a current or legacy M13 content version. */
export function mississippi13CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const legacyMatch = /^gng-free-1\.8\.6-mississippi-13-formal-v1-pyro([01])-salesman([01])$/.exec(contentVersion);
  if (legacyMatch) {
    const completedScenarioIds = [
      ...(legacyMatch[1] === '1' ? [pyromaniacUnlockScenarioId] : []),
      ...(legacyMatch[2] === '1' ? [salesmanUnlockScenarioId] : []),
    ];
    return completedScenarioIds;
  }

  const prefix = `${mississippi13ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  return snapshot && `${prefix}${mississippiUnitUnlockVersionSuffix(snapshot)}` === contentVersion
    ? completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot)
    : undefined;
}
