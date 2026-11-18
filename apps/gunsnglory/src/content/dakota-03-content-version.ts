import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const dakota03ContentVersionPrefix = 'gng-free-1.8.6-dakota-03-formal-v1';

export interface Dakota03CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
}

function contentVersionForSnapshot(snapshot: Dakota03CampaignUnlockSnapshot): string {
  return `${dakota03ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`;
}

export function dakota03CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Dakota03CampaignUnlockSnapshot {
  return { unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds) };
}

export function dakota03CampaignContentVersionForSnapshot(snapshot: Dakota03CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function dakota03CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(dakota03CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Dakota03ReplayContentVersion {
  snapshot: Dakota03CampaignUnlockSnapshot;
}

/** Parses only canonical versions so replay restoration never borrows the importing profile's unlocks. */
export function parseDakota03ReplayContentVersion(
  contentVersion: string | undefined,
): Dakota03ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${dakota03ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const unitUnlocks = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  if (!unitUnlocks) return undefined;
  const snapshot = { unitUnlocks };
  return contentVersionForSnapshot(snapshot) === contentVersion ? { snapshot } : undefined;
}
