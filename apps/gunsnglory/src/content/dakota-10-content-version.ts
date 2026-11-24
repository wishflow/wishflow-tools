import { isDynamiteUnlocked } from './dynamite';
import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const dakota10ContentVersionPrefix = 'gng-free-1.8.6-dakota-10-formal-v1';

export interface Dakota10CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
  dynamiteUnlocked: boolean;
}

function contentVersionForSnapshot(snapshot: Dakota10CampaignUnlockSnapshot): string {
  return `${dakota10ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`
    + `-dynamite${Number(snapshot.dynamiteUnlocked)}`;
}

export function dakota10CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Dakota10CampaignUnlockSnapshot {
  return {
    unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds),
    dynamiteUnlocked: isDynamiteUnlocked(completedScenarioIds),
  };
}

export function dakota10CampaignContentVersionForSnapshot(snapshot: Dakota10CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function dakota10CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(dakota10CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Dakota10ReplayContentVersion {
  snapshot: Dakota10CampaignUnlockSnapshot;
}

/** Parses canonical level-40 snapshots so imported replays keep their original map-unit gates. */
export function parseDakota10ReplayContentVersion(
  contentVersion: string | undefined,
): Dakota10ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${dakota10ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;

  const suffix = contentVersion.slice(prefix.length);
  const dynamiteSeparator = suffix.lastIndexOf('-dynamite');
  if (dynamiteSeparator < 0) return undefined;
  const unitUnlocks = mississippiUnitUnlockSnapshotFromVersionSuffix(suffix.slice(0, dynamiteSeparator));
  const dynamiteFlag = suffix.slice(dynamiteSeparator + '-dynamite'.length);
  if (!unitUnlocks || (dynamiteFlag !== '0' && dynamiteFlag !== '1')) return undefined;

  const snapshot: Dakota10CampaignUnlockSnapshot = {
    unitUnlocks,
    dynamiteUnlocked: dynamiteFlag === '1',
  };
  return contentVersionForSnapshot(snapshot) === contentVersion ? { snapshot } : undefined;
}
