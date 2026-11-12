import { isDynamiteUnlocked } from './dynamite';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const mississippi18ContentVersionPrefix = 'gng-free-1.8.6-mississippi-18-formal-v1';
const dynamiteSnapshotScenarioId = 'campaign-mississippi-10';

function contentVersionForSnapshot(
  snapshot: ReturnType<typeof mississippiUnitUnlockSnapshotFor>,
  dynamite: boolean,
): string {
  return `${mississippi18ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot)}`
    + `-dynamite${Number(dynamite)}`;
}

export function mississippi18CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
    isDynamiteUnlocked(completedScenarioIds),
  );
}

/** Restores the global special-unit and Dynamite unlocks recorded with a Shadow Town replay. */
export function mississippi18CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const prefix = `${mississippi18ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const suffixMatch = /^(grandpa[01]-sniper[01]-pyro[01]-salesman[01])-dynamite([01])$/.exec(
    contentVersion.slice(prefix.length),
  );
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
