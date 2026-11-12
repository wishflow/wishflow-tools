import type { CampaignUnitPoolDefinition } from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import map from './mississippi-14.json';

const fort = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
  code === 113 ? [{ x, y }] : []
)));

if (fort.length !== 1) throw new Error('Riverside Mountains must contain one Fort spawn marker');

const fortCell = fort[0]!;
const cannonTemplate = createActiveFortKaboomUnit('cannon', fortCell, 1);

/** APK wave-2 Cannon inventory at the map's sole Fort, without a phantom placed Cannon. */
export const mississippi14CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  intervalMs: 15_000,
  units: Object.freeze([Object.freeze({
    poolType: 3,
    unitType: 'cannon',
    spawnLocationType: 2,
    template: cannonTemplate,
  })]),
  spawnLocations: Object.freeze([Object.freeze({
    id: 'fort',
    spawnLocationType: 2,
    cell: Object.freeze({ ...fortCell }),
  })]),
  actions: Object.freeze([
    Object.freeze({ waveNumber: 2, action: 'set' as const, values: Object.freeze([{ poolType: 3, count: 2 }]) }),
    Object.freeze({ waveNumber: 2, action: 'set-max' as const, values: Object.freeze([{ poolType: 3, count: 4 }]) }),
  ]),
});
