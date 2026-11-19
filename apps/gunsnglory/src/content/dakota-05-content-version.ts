import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const dakota05ContentVersionPrefix = 'gng-free-1.8.6-dakota-05-formal-v1';

export interface Dakota05CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
}

function contentVersionForSnapshot(snapshot: Dakota05CampaignUnlockSnapshot): string {
  return `${dakota05ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`;
}

export function dakota05CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Dakota05CampaignUnlockSnapshot {
  return { unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds) };
}

export function dakota05CampaignContentVersionForSnapshot(snapshot: Dakota05CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function dakota05CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(dakota05CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Dakota05ReplayContentVersion {
  snapshot: Dakota05CampaignUnlockSnapshot;
}

/** Parses only canonical versions so replay reconstruction uses the recording's unlock gates. */
export function parseDakota05ReplayContentVersion(
  contentVersion: string | undefined,
): Dakota05ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${dakota05ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;

  const unitUnlocks = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  if (!unitUnlocks) return undefined;
  const snapshot = { unitUnlocks };
  return contentVersionForSnapshot(snapshot) === contentVersion ? { snapshot } : undefined;
}
