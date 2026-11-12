import { mississippi13UnlockSnapshotFor } from './mississippi-13-content-version';

const mississippi14ContentVersionPrefix = 'gng-free-1.8.6-mississippi-14-formal-v1';

export function mississippi14CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  const unlocks = mississippi13UnlockSnapshotFor(completedScenarioIds);
  return `${mississippi14ContentVersionPrefix}-pyro${Number(unlocks.pyromaniac)}-salesman${Number(unlocks.salesman)}`;
}

/** Restores the global unit unlock snapshot recorded by a Riverside Mountains replay. */
export function mississippi14CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const match = /^gng-free-1\.8\.6-mississippi-14-formal-v1-pyro([01])-salesman([01])$/.exec(contentVersion);
  if (!match) return undefined;

  return [
    ...(match[1] === '1' ? ['campaign-nevada-10'] : []),
    ...(match[2] === '1' ? ['campaign-alaska-10'] : []),
  ];
}
