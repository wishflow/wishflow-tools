import { campaignCatalog } from './campaign-catalog';
import { pairDynamiteObjects, type DynamiteScenarioDefinition } from '../game/dynamite';

function campaignScenarioIdForLevel(globalLevel: number): string | undefined {
  const entry = campaignCatalog.find(({ level }) => level === globalLevel);
  if (!entry) return undefined;
  const levelWithinRegion = ((globalLevel - 1) % 10) + 1;
  return `campaign-${entry.regionId}-${String(levelWithinRegion).padStart(2, '0')}`;
}

/** Level 21 is available after completing level 20; completing level 30 is the alternate unlock. */
export function isDynamiteUnlocked(completedScenarioIds: readonly string[]): boolean {
  const completed = new Set(completedScenarioIds);
  return [20, 30].some((level) => {
    const scenarioId = campaignScenarioIdForLevel(level);
    return scenarioId !== undefined && completed.has(scenarioId);
  });
}

export function createDynamiteScenarioDefinition(
  grid: readonly (readonly number[])[],
  completedScenarioIds: readonly string[],
): DynamiteScenarioDefinition {
  return pairDynamiteObjects(grid, isDynamiteUnlocked(completedScenarioIds));
}
