import { isDynamiteUnlocked } from './dynamite';
import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const oregon10ContentVersionPrefix = 'gng-free-1.8.6-oregon-10-formal-v1';

export interface Oregon10CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
  dynamiteUnlocked: boolean;
}

function contentVersionForSnapshot(snapshot: Oregon10CampaignUnlockSnapshot): string {
  return `${oregon10ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`
    + `-dynamite${Number(snapshot.dynamiteUnlocked)}`;
}

/** Captures each profile unlock that changes Lumber Mill Hills' initial map content. */
export function oregon10CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Oregon10CampaignUnlockSnapshot {
  return {
    unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds),
    dynamiteUnlocked: isDynamiteUnlocked(completedScenarioIds),
  };
}

/** Encodes a complete, deterministic unlock snapshot in the replay content version. */
export function oregon10CampaignContentVersionForSnapshot(snapshot: Oregon10CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function oregon10CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(oregon10CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Oregon10ReplayContentVersion {
  snapshot: Oregon10CampaignUnlockSnapshot;
}

/** Parses only canonical versions; replay restoration never reads the current profile. */
export function parseOregon10ReplayContentVersion(
  contentVersion: string | undefined,
): Oregon10ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${oregon10ContentVersionPrefix}-`;
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
