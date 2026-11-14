import { isDynamiteUnlocked } from './dynamite';
import {
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';

const oregon07ContentVersionPrefix = 'gng-free-1.8.6-oregon-07-formal-v1';

export interface Oregon07CampaignUnlockSnapshot {
  unitUnlocks: MississippiUnitUnlockSnapshot;
  dynamiteUnlocked: boolean;
}

function contentVersionForSnapshot(snapshot: Oregon07CampaignUnlockSnapshot): string {
  return `${oregon07ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot.unitUnlocks)}`
    + `-dynamite${Number(snapshot.dynamiteUnlocked)}`;
}

/** Captures every profile unlock that changes Mount Hood's initial content. */
export function oregon07CampaignUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): Oregon07CampaignUnlockSnapshot {
  return {
    unitUnlocks: mississippiUnitUnlockSnapshotFor(completedScenarioIds),
    dynamiteUnlocked: isDynamiteUnlocked(completedScenarioIds),
  };
}

/** Encodes a complete Mount Hood snapshot, including independently recorded Dynamite state. */
export function oregon07CampaignContentVersionForSnapshot(snapshot: Oregon07CampaignUnlockSnapshot): string {
  return contentVersionForSnapshot(snapshot);
}

export function oregon07CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(oregon07CampaignUnlockSnapshotFor(completedScenarioIds));
}

export interface Oregon07ReplayContentVersion {
  snapshot: Oregon07CampaignUnlockSnapshot;
}

/** Accepts only canonical snapshots, without consulting the importing profile. */
export function parseOregon07ReplayContentVersion(
  contentVersion: string | undefined,
): Oregon07ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${oregon07ContentVersionPrefix}-`;
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
