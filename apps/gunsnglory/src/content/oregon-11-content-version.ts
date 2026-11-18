import { isDynamiteUnlocked } from './dynamite';
import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const oregon11ContentVersionPrefix = 'gng-free-1.8.6-oregon-11-formal-v1';

export interface Oregon11CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
  dynamiteUnlocked: boolean;
}

function contentVersionForSnapshot(snapshot: Oregon11CampaignUnlockSnapshot): string {
  return `${oregon11ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`
    + `-dynamite${Number(snapshot.dynamiteUnlocked)}`;
}

export function oregon11CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Oregon11CampaignUnlockSnapshot {
  return {
    unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds),
    dynamiteUnlocked: isDynamiteUnlocked(completedScenarioIds),
  };
}

export function oregon11CampaignContentVersionForSnapshot(snapshot: Oregon11CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function oregon11CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(oregon11CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Oregon11ReplayContentVersion {
  snapshot: Oregon11CampaignUnlockSnapshot;
}

/** Parses only canonical content versions; replay restoration does not consult the importer profile. */
export function parseOregon11ReplayContentVersion(
  contentVersion: string | undefined,
): Oregon11ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${oregon11ContentVersionPrefix}-`;
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
