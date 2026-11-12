import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';
import map from './mississippi-20.json';
import { createMississippi20SteamerUnits } from './mississippi-20-steamer';

/** Creates Horse Hills fresh-game hires/active units and its moving Steamer from APK markers. */
export function createMississippi20MapUnits(completedScenarioIds: readonly string[] = []) {
  const unlocks = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  const mapUnits = createNewMexicoMapUnits(
    map.originalTileGrid,
    (unitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks),
  );
  return [...mapUnits, ...createMississippi20SteamerUnits()]
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
