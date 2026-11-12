import { isDynamiteUnlocked } from './dynamite';
import { mississippi13UnlockSnapshotFor } from './mississippi-13-content-version';

const mississippi16ContentVersionPrefix = 'gng-free-1.8.6-mississippi-16-formal-v1';
const dynamiteSnapshotScenarioId = 'campaign-mississippi-10';

export function mississippi16CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  const unlocks = mississippi13UnlockSnapshotFor(completedScenarioIds);
  const dynamite = isDynamiteUnlocked(completedScenarioIds);
  return `${mississippi16ContentVersionPrefix}-pyro${Number(unlocks.pyromaniac)}-salesman${Number(unlocks.salesman)}-dynamite${Number(dynamite)}`;
}

/** Restores the special-unit and dynamite visibility captured by a Highpoint Terrace replay. */
export function mississippi16CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const match = /^gng-free-1\.8\.6-mississippi-16-formal-v1-pyro([01])-salesman([01])-dynamite([01])$/.exec(contentVersion);
  if (!match) return undefined;

  const completedScenarioIds = [
    ...(match[1] === '1' ? ['campaign-nevada-10'] : []),
    ...(match[2] === '1' ? ['campaign-alaska-10'] : []),
    ...(match[3] === '1' ? [dynamiteSnapshotScenarioId] : []),
  ];
  return mississippi16CampaignContentVersionFor(completedScenarioIds) === contentVersion
    ? completedScenarioIds
    : undefined;
}
