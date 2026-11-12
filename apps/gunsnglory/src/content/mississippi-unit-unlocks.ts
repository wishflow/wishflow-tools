import { campaignCatalog } from './campaign-catalog';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

export interface MississippiUnitUnlockSnapshot {
  grandpa: boolean;
  sniper: boolean;
  pyromaniac: boolean;
  salesman: boolean;
}

function campaignScenarioIdForLevel(globalLevel: number): string {
  const entry = campaignCatalog.find(({ level }) => level === globalLevel);
  if (!entry) throw new Error(`Campaign level ${globalLevel} is missing from the catalog`);
  const localLevel = ((globalLevel - 1) % 10) + 1;
  return `campaign-${entry.regionId}-${String(localLevel).padStart(2, '0')}`;
}

export function mississippiUnitUnlockSnapshotFor(
  completedScenarioIds: readonly string[],
): MississippiUnitUnlockSnapshot {
  const completed = new Set(completedScenarioIds);
  const completedLevel = (level: number) => completed.has(campaignScenarioIdForLevel(level));
  return {
    grandpa: completedLevel(30),
    sniper: completedLevel(40),
    pyromaniac: completedLevel(50),
    salesman: completedLevel(60),
  };
}

export function mississippiUnitUnlocked(
  unitTypeId: CampaignMapUnitTypeId,
  snapshot: MississippiUnitUnlockSnapshot,
): boolean {
  if (unitTypeId >= 1 && unitTypeId <= 4) return true;
  if (unitTypeId === 5) return snapshot.sniper;
  if (unitTypeId === 6) return snapshot.grandpa;
  if (unitTypeId === 35) return snapshot.pyromaniac;
  if (unitTypeId === 36) return snapshot.salesman;
  return false;
}

export function completedScenarioIdsForMississippiUnitUnlockSnapshot(
  snapshot: MississippiUnitUnlockSnapshot,
): string[] {
  return [
    ...(snapshot.grandpa ? [campaignScenarioIdForLevel(30)] : []),
    ...(snapshot.sniper ? [campaignScenarioIdForLevel(40)] : []),
    ...(snapshot.pyromaniac ? [campaignScenarioIdForLevel(50)] : []),
    ...(snapshot.salesman ? [campaignScenarioIdForLevel(60)] : []),
  ];
}

export function mississippiUnitUnlockVersionSuffix(snapshot: MississippiUnitUnlockSnapshot): string {
  return `grandpa${Number(snapshot.grandpa)}-sniper${Number(snapshot.sniper)}`
    + `-pyro${Number(snapshot.pyromaniac)}-salesman${Number(snapshot.salesman)}`;
}

export function mississippiUnitUnlockSnapshotFromVersionSuffix(
  suffix: string,
): MississippiUnitUnlockSnapshot | undefined {
  const match = /^grandpa([01])-sniper([01])-pyro([01])-salesman([01])$/.exec(suffix);
  if (!match) return undefined;
  return {
    grandpa: match[1] === '1',
    sniper: match[2] === '1',
    pyromaniac: match[3] === '1',
    salesman: match[4] === '1',
  };
}
