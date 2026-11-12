import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const mississippi14ContentVersionPrefix = 'gng-free-1.8.6-mississippi-14-formal-v2';
const mississippi14LegacyContentVersionPrefix = 'gng-free-1.8.6-mississippi-14-formal-v1';

function contentVersionForSnapshot(snapshot: ReturnType<typeof mississippiUnitUnlockSnapshotFor>): string {
  return `${mississippi14ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot)}`;
}

export function mississippi14CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(mississippiUnitUnlockSnapshotFor(completedScenarioIds));
}

/** Restores the global unit unlock snapshot recorded by a current or legacy replay. */
export function mississippi14CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const legacyMatch = /^gng-free-1\.8\.6-mississippi-14-formal-v1-pyro([01])-salesman([01])$/.exec(contentVersion);
  if (legacyMatch) {
    const snapshot = {
      grandpa: false,
      sniper: false,
      pyromaniac: legacyMatch[1] === '1',
      salesman: legacyMatch[2] === '1',
    };
    return `${mississippi14LegacyContentVersionPrefix}-pyro${Number(snapshot.pyromaniac)}`
      + `-salesman${Number(snapshot.salesman)}` === contentVersion
      ? completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot)
      : undefined;
  }

  const prefix = `${mississippi14ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  return snapshot && contentVersionForSnapshot(snapshot) === contentVersion
    ? completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot)
    : undefined;
}
