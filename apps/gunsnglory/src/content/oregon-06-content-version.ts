import { isDynamiteUnlocked } from './dynamite';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const oregon06ContentVersionPrefix = 'gng-free-1.8.6-oregon-06-formal-v1';
const dynamiteSnapshotScenarioId = 'campaign-mississippi-10';

function contentVersionFor(completedScenarioIds: readonly string[]): string {
  const unitSnapshot = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  return `${oregon06ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(unitSnapshot)}`
    + `-dynamite${Number(isDynamiteUnlocked(completedScenarioIds))}`;
}

/** Encodes every global unlock that changes Columbia River's initial scenario. */
export function oregon06CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionFor(completedScenarioIds);
}

export interface Oregon06ReplayContentVersion {
  completedScenarioIds: string[];
}

/** Accepts only canonical snapshots so replay reconstruction never reads the importing profile. */
export function parseOregon06ReplayContentVersion(
  contentVersion: string | undefined,
): Oregon06ReplayContentVersion | undefined {
  if (contentVersion === undefined) return undefined;
  const prefix = `${oregon06ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const suffixMatch = /^(grandpa[01]-sniper[01]-pyro[01]-salesman[01])-dynamite([01])$/.exec(
    contentVersion.slice(prefix.length),
  );
  if (!suffixMatch) return undefined;
  const unitSnapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(suffixMatch[1]!);
  if (!unitSnapshot) return undefined;
  const completedScenarioIds = [
    ...completedScenarioIdsForMississippiUnitUnlockSnapshot(unitSnapshot),
    ...(suffixMatch[2] === '1' ? [dynamiteSnapshotScenarioId] : []),
  ];
  return contentVersionFor(completedScenarioIds) === contentVersion
    ? { completedScenarioIds }
    : undefined;
}

export function oregon06CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  return parseOregon06ReplayContentVersion(contentVersion)?.completedScenarioIds;
}
