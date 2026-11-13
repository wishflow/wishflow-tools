import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const oregon01LegacyContentVersionPrefix = 'gng-free-1.8.6-oregon-01-formal-v1';
const oregon01ContentVersionPrefix = 'gng-free-1.8.6-oregon-01-formal-v2';

export type Oregon01ReplayContentVersion =
  | { kind: 'legacy-v1'; completedScenarioIds: string[] }
  | { kind: 'snapshot-v2'; completedScenarioIds: string[] };

function contentVersionForPrefix(prefix: string, completedScenarioIds: readonly string[]): string {
  return `${prefix}-${mississippiUnitUnlockVersionSuffix(
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
  )}`;
}

/** Records the global unit-unlock milestones that change Eastwood's map and prize templates. */
export function oregon01CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForPrefix(oregon01ContentVersionPrefix, completedScenarioIds);
}

/** Recreates the exact M21 v1 version emitted before fresh activity-4 hires were restored. */
export function oregon01LegacyCampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForPrefix(oregon01LegacyContentVersionPrefix, completedScenarioIds);
}

/** Parses both the published M21 v1 versions and current snapshot-aware v2 versions. */
export function parseOregon01ReplayContentVersion(
  contentVersion: string | undefined,
): Oregon01ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;

  const versions = [
    { prefix: oregon01LegacyContentVersionPrefix, kind: 'legacy-v1' as const },
    { prefix: oregon01ContentVersionPrefix, kind: 'snapshot-v2' as const },
  ];
  for (const { prefix, kind } of versions) {
    const versionPrefix = `${prefix}-`;
    if (!contentVersion.startsWith(versionPrefix)) continue;
    const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(versionPrefix.length));
    if (!snapshot) return undefined;
    const completedScenarioIds = completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot);
    const canonicalVersion = contentVersionForPrefix(prefix, completedScenarioIds);
    return canonicalVersion === contentVersion ? { kind, completedScenarioIds } : undefined;
  }
  return undefined;
}

/** Reconstructs the global unit-unlock milestones saved in an Eastwood replay version. */
export function oregon01CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  return parseOregon01ReplayContentVersion(contentVersion)?.completedScenarioIds;
}
