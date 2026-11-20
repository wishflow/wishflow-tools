import { isDynamiteUnlocked } from './dynamite';
import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const dakota06ContentVersionPrefix = 'gng-free-1.8.6-dakota-06-formal-v1';

export interface Dakota06CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
  dynamiteUnlocked: boolean;
}

function contentVersionForSnapshot(snapshot: Dakota06CampaignUnlockSnapshot): string {
  return `${dakota06ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`
    + `-dynamite${Number(snapshot.dynamiteUnlocked)}`;
}

export function dakota06CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Dakota06CampaignUnlockSnapshot {
  return {
    unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds),
    dynamiteUnlocked: isDynamiteUnlocked(completedScenarioIds),
  };
}

export function dakota06CampaignContentVersionForSnapshot(snapshot: Dakota06CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function dakota06CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(dakota06CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Dakota06ReplayContentVersion {
  snapshot: Dakota06CampaignUnlockSnapshot;
}

/** Parses only canonical versions so replay reconstruction uses the recorded unlock state. */
export function parseDakota06ReplayContentVersion(
  contentVersion: string | undefined,
): Dakota06ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${dakota06ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;

  const suffix = contentVersion.slice(prefix.length);
  const dynamiteSeparator = suffix.lastIndexOf('-dynamite');
  if (dynamiteSeparator < 0) return undefined;
  const unitUnlocks = mississippiUnitUnlockSnapshotFromVersionSuffix(suffix.slice(0, dynamiteSeparator));
  const dynamiteFlag = suffix.slice(dynamiteSeparator + '-dynamite'.length);
  if (!unitUnlocks || (dynamiteFlag !== '0' && dynamiteFlag !== '1')) return undefined;

  const snapshot: Dakota06CampaignUnlockSnapshot = {
    unitUnlocks,
    dynamiteUnlocked: dynamiteFlag === '1',
  };
  return contentVersionForSnapshot(snapshot) === contentVersion ? { snapshot } : undefined;
}
