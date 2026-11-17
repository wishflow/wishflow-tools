import { pairDynamiteObjects } from '../game/dynamite';
import map from './oregon-10.json';

/** Rebuilds Lumber Mill Hills' APK trigger/box pairs for a captured unlock snapshot. */
export function createOregon10DynamiteFromUnlock(unlocked: boolean) {
  return pairDynamiteObjects(map.originalTileGrid, unlocked);
}
