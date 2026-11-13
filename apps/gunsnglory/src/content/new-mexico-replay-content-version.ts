import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const techTownId = 'campaign-new-mexico-04';
const newMexicoCampaignPrefixes: Readonly<Record<string, { legacy: string; snapshot: string; mapAccess: boolean }>> = {
  [techTownId]: {
    legacy: 'gng-free-1.8.6-new-mexico-04-formal-v1',
    snapshot: 'gng-free-1.8.6-new-mexico-04-formal-v2',
    mapAccess: true,
  },
  'campaign-new-mexico-05': {
    legacy: 'gng-free-1.8.6-new-mexico-05-formal-v1',
    snapshot: 'gng-free-1.8.6-new-mexico-05-formal-v2',
    mapAccess: false,
  },
  'campaign-new-mexico-06': {
    legacy: 'gng-free-1.8.6-new-mexico-06-formal-v1',
    snapshot: 'gng-free-1.8.6-new-mexico-06-formal-v2',
    mapAccess: false,
  },
  'campaign-new-mexico-07': {
    legacy: 'gng-free-1.8.6-new-mexico-07-formal-v1',
    snapshot: 'gng-free-1.8.6-new-mexico-07-formal-v2',
    mapAccess: false,
  },
};

export type NewMexicoReplayContentVersion =
  | { kind: 'legacy-v1' }
  | { kind: 'snapshot-v2'; completedScenarioIds: string[]; map04Accessible?: boolean };

/** Builds the version recorded for map04-map07 content that depends on global milestone hires. */
export function newMexicoCampaignContentVersionFor(
  scenarioId: string,
  completedScenarioIds: readonly string[],
): string {
  const definition = newMexicoCampaignPrefixes[scenarioId];
  if (!definition) throw new Error(`Unsupported New Mexico campaign stage: ${scenarioId}`);

  const unlockSuffix = mississippiUnitUnlockVersionSuffix(
    mississippiUnitUnlockSnapshotFor(completedScenarioIds),
  );
  const mapAccessSuffix = definition.mapAccess
    ? `-map-access-${Number(completedScenarioIds.includes('campaign-new-mexico-03'))}`
    : '';
  return `${definition.snapshot}-${unlockSuffix}${mapAccessSuffix}`;
}

/** Parses a snapshot version, while distinguishing exact v1 identifiers with no saved snapshot. */
export function parseNewMexicoReplayContentVersion(
  scenarioId: string,
  contentVersion: string | undefined,
): NewMexicoReplayContentVersion | undefined {
  const definition = newMexicoCampaignPrefixes[scenarioId];
  if (!definition || contentVersion === undefined) return undefined;
  if (contentVersion === definition.legacy) return { kind: 'legacy-v1' };

  const versionPrefix = `${definition.snapshot}-`;
  if (!contentVersion.startsWith(versionPrefix)) return undefined;
  let suffix = contentVersion.slice(versionPrefix.length);
  let map04Accessible: boolean | undefined;

  if (definition.mapAccess) {
    const match = /^(.*)-map-access-([01])$/.exec(suffix);
    if (!match) return undefined;
    suffix = match[1]!;
    map04Accessible = match[2] === '1';
  }

  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(suffix);
  if (!snapshot) return undefined;
  const completedScenarioIds = completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot);
  if (map04Accessible) completedScenarioIds.push('campaign-new-mexico-03');
  const canonicalCompletedScenarioIds = completedScenarioIds.slice().sort();

  if (newMexicoCampaignContentVersionFor(scenarioId, canonicalCompletedScenarioIds) !== contentVersion) {
    return undefined;
  }

  return {
    kind: 'snapshot-v2',
    completedScenarioIds: canonicalCompletedScenarioIds,
    ...(map04Accessible === undefined ? {} : { map04Accessible }),
  };
}
