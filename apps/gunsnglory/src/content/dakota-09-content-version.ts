import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const dakota09ContentVersionPrefix = 'gng-free-1.8.6-dakota-09-formal-v1';

export interface Dakota09CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
}

function contentVersionForSnapshot(snapshot: Dakota09CampaignUnlockSnapshot): string {
  return `${dakota09ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`;
}

export function dakota09CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Dakota09CampaignUnlockSnapshot {
  return { unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds) };
}

export function dakota09CampaignContentVersionForSnapshot(snapshot: Dakota09CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function dakota09CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(dakota09CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Dakota09ReplayContentVersion {
  snapshot: Dakota09CampaignUnlockSnapshot;
}

/** Parses only canonical versions so Snow Town replay snapshots keep their recorded hires. */
export function parseDakota09ReplayContentVersion(
  contentVersion: string | undefined,
): Dakota09ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${dakota09ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;

  const unitUnlocks = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  if (!unitUnlocks) return undefined;

  const snapshot: Dakota09CampaignUnlockSnapshot = { unitUnlocks };
  return contentVersionForSnapshot(snapshot) === contentVersion ? { snapshot } : undefined;
}
