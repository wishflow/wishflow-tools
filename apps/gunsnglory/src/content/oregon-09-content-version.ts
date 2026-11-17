import { isDynamiteUnlocked } from './dynamite';
import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const oregon09ContentVersionPrefix = 'gng-free-1.8.6-oregon-09-formal-v1';

export interface Oregon09CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
  dynamiteUnlocked: boolean;
}

function contentVersionForSnapshot(snapshot: Oregon09CampaignUnlockSnapshot): string {
  return `${oregon09ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`
    + `-dynamite${Number(snapshot.dynamiteUnlocked)}`;
}

/** Captures each profile unlock that changes Snake River's initial map content. */
export function oregon09CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Oregon09CampaignUnlockSnapshot {
  return {
    unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds),
    dynamiteUnlocked: isDynamiteUnlocked(completedScenarioIds),
  };
}

/** Encodes a complete, deterministic unlock snapshot in the replay content version. */
export function oregon09CampaignContentVersionForSnapshot(snapshot: Oregon09CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function oregon09CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(oregon09CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Oregon09ReplayContentVersion {
  snapshot: Oregon09CampaignUnlockSnapshot;
}

/** Parses only canonical versions; replay restoration never reads the current profile. */
export function parseOregon09ReplayContentVersion(
  contentVersion: string | undefined,
): Oregon09ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${oregon09ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const suffixMatch = /^(grandpa[01]-sniper[01]-pyro[01]-salesman[01])-dynamite([01])$/.exec(
    contentVersion.slice(prefix.length),
  );
  if (!suffixMatch) return undefined;
  const unitUnlocks = mississippiUnitUnlockSnapshotFromVersionSuffix(suffixMatch[1]!);
  if (!unitUnlocks) return undefined;
  const snapshot = { unitUnlocks, dynamiteUnlocked: suffixMatch[2] === '1' };
  return contentVersionForSnapshot(snapshot) === contentVersion ? { snapshot } : undefined;
}
