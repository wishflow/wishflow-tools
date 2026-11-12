const mississippi13ContentVersionPrefix = 'gng-free-1.8.6-mississippi-13-formal-v1';
const pyromaniacUnlockScenarioId = 'campaign-nevada-10';
const salesmanUnlockScenarioId = 'campaign-alaska-10';

export interface Mississippi13UnlockSnapshot {
  pyromaniac: boolean;
  salesman: boolean;
}

export function mississippi13UnlockSnapshotFor(completedScenarioIds: readonly string[]): Mississippi13UnlockSnapshot {
  const completed = new Set(completedScenarioIds);
  return {
    pyromaniac: completed.has(pyromaniacUnlockScenarioId),
    salesman: completed.has(salesmanUnlockScenarioId),
  };
}

export function mississippi13ContentVersionForSnapshot(snapshot: Mississippi13UnlockSnapshot): string {
  return `${mississippi13ContentVersionPrefix}-pyro${Number(snapshot.pyromaniac)}-salesman${Number(snapshot.salesman)}`;
}

/** Replay identity includes both global milestones that change map16's unit list. */
export function mississippi13CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return mississippi13ContentVersionForSnapshot(mississippi13UnlockSnapshotFor(completedScenarioIds));
}

/** Restores only the two completed global milestones represented by an M13 content version. */
export function mississippi13CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const match = /^gng-free-1\.8\.6-mississippi-13-formal-v1-pyro([01])-salesman([01])$/.exec(contentVersion);
  if (!match) return undefined;

  const completedScenarioIds = [
    ...(match[1] === '1' ? [pyromaniacUnlockScenarioId] : []),
    ...(match[2] === '1' ? [salesmanUnlockScenarioId] : []),
  ];
  return mississippi13CampaignContentVersionFor(completedScenarioIds) === contentVersion
    ? completedScenarioIds
    : undefined;
}
