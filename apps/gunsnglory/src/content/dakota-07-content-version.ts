import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const dakota07ContentVersionPrefix = 'gng-free-1.8.6-dakota-07-formal-v1';

export interface Dakota07CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
}

function contentVersionForSnapshot(snapshot: Dakota07CampaignUnlockSnapshot): string {
  return `${dakota07ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`;
}

export function dakota07CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Dakota07CampaignUnlockSnapshot {
  return { unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds) };
}

export function dakota07CampaignContentVersionForSnapshot(snapshot: Dakota07CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function dakota07CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(dakota07CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Dakota07ReplayContentVersion {
  snapshot: Dakota07CampaignUnlockSnapshot;
}

/** Parses only canonical versions so replay reconstruction uses the recorded unlock state. */
export function parseDakota07ReplayContentVersion(
  contentVersion: string | undefined,
): Dakota07ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${dakota07ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;

  const unitUnlocks = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  if (!unitUnlocks) return undefined;

  const snapshot: Dakota07CampaignUnlockSnapshot = { unitUnlocks };
  return contentVersionForSnapshot(snapshot) === contentVersion ? { snapshot } : undefined;
}
