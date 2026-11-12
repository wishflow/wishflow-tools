import { createDynamiteScenarioDefinition } from './dynamite';
import type { DynamiteScenarioDefinition } from '../game';
import map from './mississippi-18.json';

/** Uses the shared level-20-or-30 unlock gate for Shadow Town's APK dynamite pair. */
export function createMississippi18DynamiteDefinition(
  completedScenarioIds: readonly string[],
): DynamiteScenarioDefinition {
  return createDynamiteScenarioDefinition(map.originalTileGrid, completedScenarioIds);
}
