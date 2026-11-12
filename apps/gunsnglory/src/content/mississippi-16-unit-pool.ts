import type { CampaignUnitPoolDefinition } from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import map from './mississippi-16.json';

const forts = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
  code === 113 ? [{ x, y }] : []
)));

if (forts.length !== 4) throw new Error('Highpoint Terrace must contain four Fort spawn locations');

const cannonTemplate = createActiveFortKaboomUnit('cannon', forts[0]!, 1);

/** APK first-wave Cannon inventory uses the four map Forts without adding phantom placed Cannons. */
export const mississippi16CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  intervalMs: 15_000,
  units: Object.freeze([Object.freeze({
    poolType: 3,
    unitType: 'cannon',
    spawnLocationType: 2,
    template: cannonTemplate,
  })]),
  spawnLocations: Object.freeze(forts.map((cell, index) => Object.freeze({
    id: `fort-${index + 1}`,
    spawnLocationType: 2,
    cell: Object.freeze({ ...cell }),
  }))),
  actions: Object.freeze([
    Object.freeze({ waveNumber: 1, action: 'set' as const, values: Object.freeze([{ poolType: 3, count: 4 }]) }),
    Object.freeze({ waveNumber: 1, action: 'set-max' as const, values: Object.freeze([{ poolType: 3, count: 12 }]) }),
  ]),
});
