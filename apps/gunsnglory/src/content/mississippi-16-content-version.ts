import { isDynamiteUnlocked } from './dynamite';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const mississippi16ContentVersionPrefix = 'gng-free-1.8.6-mississippi-16-formal-v2';
const mississippi16LegacyContentVersionPrefix = 'gng-free-1.8.6-mississippi-16-formal-v1';
const dynamiteSnapshotScenarioId = 'campaign-mississippi-10';

function contentVersionForSnapshot(
  snapshot: ReturnType<typeof mississippiUnitUnlockSnapshotFor>,
  dynamite: boolean,
): string {
  return `${mississippi16ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot)}`
    + `-dynamite${Number(dynamite)}`;
}

export function mississippi16CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
    isDynamiteUnlocked(completedScenarioIds),
  );
}

/** Restores the global unit and Dynamite snapshots from a current or legacy replay. */
export function mississippi16CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const legacyMatch = /^gng-free-1\.8\.6-mississippi-16-formal-v1-pyro([01])-salesman([01])-dynamite([01])$/.exec(contentVersion);
  if (legacyMatch) {
    const snapshot = {
      grandpa: false,
      sniper: false,
      pyromaniac: legacyMatch[1] === '1',
      salesman: legacyMatch[2] === '1',
    };
    return `${mississippi16LegacyContentVersionPrefix}-pyro${Number(snapshot.pyromaniac)}`
      + `-salesman${Number(snapshot.salesman)}-dynamite${legacyMatch[3]}` === contentVersion
      ? [
        ...completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot),
        ...(legacyMatch[3] === '1' ? [dynamiteSnapshotScenarioId] : []),
      ]
      : undefined;
  }

  const prefix = `${mississippi16ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const suffixMatch = /^(grandpa[01]-sniper[01]-pyro[01]-salesman[01])-dynamite([01])$/.exec(contentVersion.slice(prefix.length));
  if (!suffixMatch) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(suffixMatch[1]!);
  const dynamite = suffixMatch[2] === '1';
  return snapshot && contentVersionForSnapshot(snapshot, dynamite) === contentVersion
    ? [
      ...completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot),
      ...(dynamite ? [dynamiteSnapshotScenarioId] : []),
    ]
    : undefined;
}
