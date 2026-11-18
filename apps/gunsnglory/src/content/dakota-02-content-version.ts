import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const dakota02ContentVersionPrefix = 'gng-free-1.8.6-dakota-02-formal-v1';

export interface Dakota02CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
}

function contentVersionForSnapshot(snapshot: Dakota02CampaignUnlockSnapshot): string {
  return `${dakota02ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`;
}

export function dakota02CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Dakota02CampaignUnlockSnapshot {
  return { unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds) };
}

export function dakota02CampaignContentVersionForSnapshot(snapshot: Dakota02CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function dakota02CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(dakota02CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Dakota02ReplayContentVersion {
  snapshot: Dakota02CampaignUnlockSnapshot;
}

/** Parses only canonical content versions; replay restoration ignores the importing profile. */
export function parseDakota02ReplayContentVersion(
  contentVersion: string | undefined,
): Dakota02ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${dakota02ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const unitUnlocks = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  if (!unitUnlocks) return undefined;
  const snapshot = { unitUnlocks };
  return contentVersionForSnapshot(snapshot) === contentVersion ? { snapshot } : undefined;
}
