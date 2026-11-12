import { isDynamiteUnlocked } from './dynamite';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const mississippi18LegacyContentVersionPrefix = 'gng-free-1.8.6-mississippi-18-formal-v1';
const mississippi18ContentVersionPrefix = 'gng-free-1.8.6-mississippi-18-formal-v2';
const dynamiteSnapshotScenarioId = 'campaign-mississippi-10';

function contentVersionForSnapshot(
  prefix: string,
  snapshot: ReturnType<typeof mississippiUnitUnlockSnapshotFor>,
  dynamite: boolean,
): string {
  return `${prefix}-${mississippiUnitUnlockVersionSuffix(snapshot)}`
    + `-dynamite${Number(dynamite)}`;
}

export function mississippi18CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(
    mississippi18ContentVersionPrefix,
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
    isDynamiteUnlocked(completedScenarioIds),
  );
}

/** Restores Shadow Town's global unit and Dynamite unlocks from either recorded content version. */
export function mississippi18CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const versionPrefix = [mississippi18ContentVersionPrefix, mississippi18LegacyContentVersionPrefix]
    .find((candidate) => contentVersion.startsWith(`${candidate}-`));
  if (!versionPrefix) return undefined;
  const suffixMatch = /^(grandpa[01]-sniper[01]-pyro[01]-salesman[01])-dynamite([01])$/.exec(
    contentVersion.slice(versionPrefix.length + 1),
  );
  if (!suffixMatch) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(suffixMatch[1]!);
  const dynamite = suffixMatch[2] === '1';
  return snapshot && contentVersionForSnapshot(versionPrefix, snapshot, dynamite) === contentVersion
    ? [
      ...completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot),
      ...(dynamite ? [dynamiteSnapshotScenarioId] : []),
    ]
    : undefined;
}
