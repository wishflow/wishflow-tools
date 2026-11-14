import { isDynamiteUnlocked } from './dynamite';
import { pairDynamiteObjects } from '../game/dynamite';
import map from './oregon-07.json';

/** Builds Mount Hood's original trigger/box pairs and the shared progression gate. */
export function createOregon07Dynamite(completedScenarioIds: readonly string[]) {
  return createOregon07DynamiteFromUnlock(isDynamiteUnlocked(completedScenarioIds));
}

/** Rebuilds the recorded unlock flag exactly for replay snapshots. */
export function createOregon07DynamiteFromUnlock(unlocked: boolean) {
  return pairDynamiteObjects(map.originalTileGrid, unlocked);
}
