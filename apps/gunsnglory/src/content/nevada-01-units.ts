import type { ScenarioUnit } from '../game';
import { createActivePyromaniac } from './new-mexico-unit-entities';
import map from './nevada-01.json';

/** Builds only fresh-game units created by GameObjectManager for the level-41 TDM. */
export function createNevada01MapUnits(): ScenarioUnit[] {
  const activePyromaniacCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 138 ? [{ x, y }] : []
  )));

  if (activePyromaniacCells.length !== 1) {
    throw new Error(`Labyrinth Gulch must contain one fresh-game Pyromaniac; found ${activePyromaniacCells.length}`);
  }

  // GameObjectUnit.isUnlocked(35) is true while the selected global level is 41.
  return activePyromaniacCells.map((cell, index) => createActivePyromaniac(cell, index + 1));
}
