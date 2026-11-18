import type { DynamiteScenarioDefinition } from '../game';
import { createDynamiteScenarioDefinition } from './dynamite';
import map from './dakota-03.json';

/** Pairs Fort Knockout's APK TDM trigger and box, applying the shared level 20/30 unlock. */
export function createDakota03DynamiteDefinition(
  completedScenarioIds: readonly string[],
): DynamiteScenarioDefinition {
  return createDynamiteScenarioDefinition(map.originalTileGrid, completedScenarioIds);
}
