import { mississippi13UnlockSnapshotFor } from './mississippi-13-content-version';

const mississippi15ContentVersionPrefix = 'gng-free-1.8.6-mississippi-15-formal-v1';

export function mississippi15CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  const unlocks = mississippi13UnlockSnapshotFor(completedScenarioIds);
  return `${mississippi15ContentVersionPrefix}-pyro${Number(unlocks.pyromaniac)}-salesman${Number(unlocks.salesman)}`;
}

/** Restores the map18 special-unit unlock snapshot recorded in a Railroad Canyon replay. */
export function mississippi15CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const match = /^gng-free-1\.8\.6-mississippi-15-formal-v1-pyro([01])-salesman([01])$/.exec(contentVersion);
  if (!match) return undefined;

  const completedScenarioIds = [
    ...(match[1] === '1' ? ['campaign-nevada-10'] : []),
    ...(match[2] === '1' ? ['campaign-alaska-10'] : []),
  ];
  return mississippi15CampaignContentVersionFor(completedScenarioIds) === contentVersion
    ? completedScenarioIds
    : undefined;
}
