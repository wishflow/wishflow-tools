import { campaignCatalog } from './campaign-catalog';
import { isDynamiteUnlocked } from './dynamite';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';
import { nevada02CampaignContentVersionPrefix } from './nevada-02-identity';

export interface BombingtonUnlockSnapshot extends MississippiUnitUnlockSnapshot {
  dynamiteUnlocked: boolean;
}

function campaignScenarioIdForLevel(globalLevel: number): string {
  const entry = campaignCatalog.find(({ level }) => level === globalLevel);
  if (!entry) throw new Error(`Campaign level ${globalLevel} is missing from the catalog`);
  const levelWithinRegion = ((globalLevel - 1) % 10) + 1;
  return `campaign-${entry.regionId}-${String(levelWithinRegion).padStart(2, '0')}`;
}

function isCanonicalSnapshot(snapshot: BombingtonUnlockSnapshot): boolean {
  // Completing global level 30 unlocks both Grandpa and Dynamite.
  return !snapshot.grandpa || snapshot.dynamiteUnlocked;
}

/** Encodes the global map-unit unlocks and the independently gated Dynamite state. */
export function bombingtonCampaignContentVersionFromSnapshot(snapshot: BombingtonUnlockSnapshot): string {
  if (!isCanonicalSnapshot(snapshot)) {
    throw new Error('Bombington content snapshot cannot unlock Grandpa while Dynamite remains locked');
  }
  return `${nevada02CampaignContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot)}`
    + `-dynamite${Number(snapshot.dynamiteUnlocked)}`;
}

export function bombingtonCampaignContentVersionForCompletedScenarioIds(
  completedScenarioIds: readonly string[],
): string {
  return bombingtonCampaignContentVersionFromSnapshot(bombingtonUnlockSnapshotFor(completedScenarioIds));
}

export function bombingtonUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): BombingtonUnlockSnapshot {
  return {
    ...mississippiUnitUnlockSnapshotFor(completedScenarioIds),
    dynamiteUnlocked: isDynamiteUnlocked(completedScenarioIds),
  };
}

/** Rejects unknown, malformed and impossible campaign snapshots in replay versions. */
export function bombingtonUnlockSnapshotFromContentVersion(
  contentVersion: string | undefined,
): BombingtonUnlockSnapshot | undefined {
  const prefix = `${nevada02CampaignContentVersionPrefix}-`;
  if (!contentVersion?.startsWith(prefix)) return undefined;
  const match = /^(grandpa[01]-sniper[01]-pyro[01]-salesman[01])-dynamite([01])$/.exec(
    contentVersion.slice(prefix.length),
  );
  if (!match) return undefined;
  const unitUnlocks = mississippiUnitUnlockSnapshotFromVersionSuffix(match[1]!);
  if (!unitUnlocks) return undefined;
  const snapshot = { ...unitUnlocks, dynamiteUnlocked: match[2] === '1' };
  return isCanonicalSnapshot(snapshot)
    && bombingtonCampaignContentVersionFromSnapshot(snapshot) === contentVersion
    ? snapshot
    : undefined;
}

/** Restores only milestone IDs needed to recreate the recorded unlock state. */
export function bombingtonCompletedScenarioIdsFromContentVersion(
  contentVersion: string | undefined,
): string[] | undefined {
  const snapshot = bombingtonUnlockSnapshotFromContentVersion(contentVersion);
  if (!snapshot) return undefined;
  const completed = completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot);
  if (snapshot.dynamiteUnlocked && !snapshot.grandpa) {
    completed.push(campaignScenarioIdForLevel(20));
  }
  return completed;
}
