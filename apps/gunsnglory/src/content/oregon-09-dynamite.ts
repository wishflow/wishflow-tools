import { pairDynamiteObjects } from '../game/dynamite';
import { isDynamiteUnlocked } from './dynamite';
import map from './oregon-09.json';

/** Builds Snake River's TDM trigger/box pairs under the shared progression gate. */
export function createOregon09Dynamite(completedScenarioIds: readonly string[]) {
  return createOregon09DynamiteFromUnlock(isDynamiteUnlocked(completedScenarioIds));
}

/** Rebuilds the recorded unlock flag exactly for replay snapshots. */
export function createOregon09DynamiteFromUnlock(unlocked: boolean) {
  return pairDynamiteObjects(map.originalTileGrid, unlocked);
}
