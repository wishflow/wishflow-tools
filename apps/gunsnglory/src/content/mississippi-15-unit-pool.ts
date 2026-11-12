import type { CampaignUnitPoolDefinition } from '../game';
import map from './mississippi-15.json';

const saloons = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
  code === 112 ? [{ x, y }] : []
)));

if (saloons.length !== 1) throw new Error('Railroad Canyon must contain one Saloon spawn marker');

const saloonCell = saloons[0]!;

/** APK wave-two Gunslinger/Mexican pool; both types spawn from map18's sole Saloon. */
export const mississippi15CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({ poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 }),
    Object.freeze({ poolType: 2, unitType: 'mexican', spawnLocationType: 1 }),
  ]),
  spawnLocations: Object.freeze([Object.freeze({
    id: 'saloon',
    spawnLocationType: 1,
    cell: Object.freeze({ ...saloonCell }),
  })]),
  actions: Object.freeze([
    Object.freeze({ waveNumber: 2, action: 'set' as const, values: Object.freeze([
      Object.freeze({ poolType: 1, count: 1 }),
      Object.freeze({ poolType: 2, count: 1 }),
    ]) }),
    Object.freeze({ waveNumber: 2, action: 'set-max' as const, values: Object.freeze([
      Object.freeze({ poolType: 1, count: 4 }),
      Object.freeze({ poolType: 2, count: 4 }),
    ]) }),
  ]),
});
