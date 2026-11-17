import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const oregon08ContentVersionPrefix = 'gng-free-1.8.6-oregon-08-formal-v1';

export type Oregon08CampaignUnlockSnapshot = MississippiUnitUnlockSnapshot;

function contentVersionForSnapshot(snapshot: Oregon08CampaignUnlockSnapshot): string {
  return `${oregon08ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot)}`;
}

/** Captures every global unit milestone that changes Colt City's map or Gambler prizes. */
export function oregon08CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Oregon08CampaignUnlockSnapshot {
  return mississippiUnitUnlockSnapshotFor(completedScenarioIds);
}

export function oregon08CampaignContentVersionForSnapshot(snapshot: Oregon08CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function oregon08CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(oregon08CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Oregon08ReplayContentVersion {
  snapshot: Oregon08CampaignUnlockSnapshot;
}

/** Parses only canonical recorded unlock snapshots; replay rebuilding never reads the importer profile. */
export function parseOregon08ReplayContentVersion(
  contentVersion: string | undefined,
): Oregon08ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${oregon08ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  if (!snapshot || contentVersionForSnapshot(snapshot) !== contentVersion) return undefined;
  return { snapshot };
}
