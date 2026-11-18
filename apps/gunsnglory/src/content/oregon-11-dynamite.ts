import { pairDynamiteObjects } from '../game/dynamite';
import { isDynamiteUnlocked } from './dynamite';
import map from './oregon-11.json';

/** Builds Loot Lakes' TDM trigger/box pairs under the shared progression gate. */
export function createOregon11Dynamite(completedScenarioIds: readonly string[]) {
  return createOregon11DynamiteFromUnlock(isDynamiteUnlocked(completedScenarioIds));
}

/** Rebuilds the recorded unlock flag exactly for replay snapshots. */
export function createOregon11DynamiteFromUnlock(unlocked: boolean) {
  return pairDynamiteObjects(map.originalTileGrid, unlocked);
}
