import type { DynamiteScenarioDefinition } from '../game';
import { pairDynamiteObjects } from '../game/dynamite';
import map from './nevada-01.json';

const dynamite = pairDynamiteObjects(map.originalTileGrid, true);
if (dynamite.pairs.length !== 1) {
  throw new Error(`Labyrinth Gulch must contain one Dynamite pair; found ${dynamite.pairs.length}`);
}

/** Level 41 is beyond the original level-21 Dynamite unlock threshold. */
export const nevada01Dynamite: DynamiteScenarioDefinition = Object.freeze({
  unlocked: dynamite.unlocked,
  pairs: Object.freeze(dynamite.pairs.map((pair) => Object.freeze({
    ...pair,
    triggerCell: Object.freeze({ ...pair.triggerCell }),
    boxCell: Object.freeze({ ...pair.boxCell }),
  }))),
});
