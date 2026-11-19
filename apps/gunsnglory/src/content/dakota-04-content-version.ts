import {
  isDynamiteUnlocked,
} from './dynamite';
import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const dakota04ContentVersionPrefix = 'gng-free-1.8.6-dakota-04-formal-v1';

export interface Dakota04CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
  dynamiteUnlocked: boolean;
}

function contentVersionForSnapshot(snapshot: Dakota04CampaignUnlockSnapshot): string {
  return `${dakota04ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`
    + `-dynamite${Number(snapshot.dynamiteUnlocked)}`;
}

export function dakota04CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Dakota04CampaignUnlockSnapshot {
  return {
    unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds),
    dynamiteUnlocked: isDynamiteUnlocked(completedScenarioIds),
  };
}

export function dakota04CampaignContentVersionForSnapshot(snapshot: Dakota04CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function dakota04CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(dakota04CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Dakota04ReplayContentVersion {
  snapshot: Dakota04CampaignUnlockSnapshot;
}

/** Parses only canonical versions so replay restoration never borrows the importing profile's unlocks. */
export function parseDakota04ReplayContentVersion(
  contentVersion: string | undefined,
): Dakota04ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${dakota04ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;

  const suffix = contentVersion.slice(prefix.length);
  const dynamiteSeparator = suffix.lastIndexOf('-dynamite');
  if (dynamiteSeparator < 0) return undefined;
  const unitUnlocks = mississippiUnitUnlockSnapshotFromVersionSuffix(suffix.slice(0, dynamiteSeparator));
  const dynamiteFlag = suffix.slice(dynamiteSeparator + '-dynamite'.length);
  if (!unitUnlocks || (dynamiteFlag !== '0' && dynamiteFlag !== '1')) return undefined;

  const snapshot: Dakota04CampaignUnlockSnapshot = {
    unitUnlocks,
    dynamiteUnlocked: dynamiteFlag === '1',
  };
  return contentVersionForSnapshot(snapshot) === contentVersion ? { snapshot } : undefined;
}
