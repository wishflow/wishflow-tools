import { isDynamiteUnlocked } from './dynamite';
import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const dakota08ContentVersionPrefix = 'gng-free-1.8.6-dakota-08-formal-v1';

export interface Dakota08CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
  dynamiteUnlocked: boolean;
}

function contentVersionForSnapshot(snapshot: Dakota08CampaignUnlockSnapshot): string {
  return `${dakota08ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`
    + `-dynamite${Number(snapshot.dynamiteUnlocked)}`;
}

export function dakota08CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Dakota08CampaignUnlockSnapshot {
  return {
    unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds),
    dynamiteUnlocked: isDynamiteUnlocked(completedScenarioIds),
  };
}

export function dakota08CampaignContentVersionForSnapshot(snapshot: Dakota08CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function dakota08CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(dakota08CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Dakota08ReplayContentVersion {
  snapshot: Dakota08CampaignUnlockSnapshot;
}

/** Parses only canonical versions so replay reconstruction uses recorded unit and Dynamite gates. */
export function parseDakota08ReplayContentVersion(
  contentVersion: string | undefined,
): Dakota08ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${dakota08ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;

  const suffix = contentVersion.slice(prefix.length);
  const dynamiteSeparator = suffix.lastIndexOf('-dynamite');
  if (dynamiteSeparator < 0) return undefined;
  const unitUnlocks = mississippiUnitUnlockSnapshotFromVersionSuffix(suffix.slice(0, dynamiteSeparator));
  const dynamiteFlag = suffix.slice(dynamiteSeparator + '-dynamite'.length);
  if (!unitUnlocks || (dynamiteFlag !== '0' && dynamiteFlag !== '1')) return undefined;

  const snapshot: Dakota08CampaignUnlockSnapshot = {
    unitUnlocks,
    dynamiteUnlocked: dynamiteFlag === '1',
  };
  return contentVersionForSnapshot(snapshot) === contentVersion ? { snapshot } : undefined;
}
