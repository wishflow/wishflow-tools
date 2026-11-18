import type { CampaignUnitPoolDefinition } from '../game';
import { createActiveGunslinger, createActiveMexicanUnit } from './new-mexico-unit-entities';

/** Loot Lakes' only pool building is the Saloon at TDM cell (9,15). */
export const oregon11CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  // The APK's per-level global pool cadence is not confirmed; retain the shared web cadence.
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({
      poolType: 1,
      unitType: 'gunslinger',
      spawnLocationType: 1,
      template: createActiveGunslinger({ x: 0, y: 0 }),
    }),
    Object.freeze({
      poolType: 2,
      unitType: 'mexican',
      spawnLocationType: 1,
      template: createActiveMexicanUnit({ x: 0, y: 0 }),
    }),
  ]),
  spawnLocations: Object.freeze([
    Object.freeze({ id: 'saloon-9-15', spawnLocationType: 1, cell: Object.freeze({ x: 9, y: 15 }) }),
  ]),
  actions: Object.freeze([
    Object.freeze({
      action: 'set' as const,
      waveNumber: 1,
      values: Object.freeze([
        Object.freeze({ poolType: 1, count: 0 }),
        Object.freeze({ poolType: 2, count: 0 }),
      ]),
    }),
    Object.freeze({
      action: 'set-max' as const,
      waveNumber: 1,
      values: Object.freeze([
        Object.freeze({ poolType: 1, count: 2 }),
        Object.freeze({ poolType: 2, count: 2 }),
      ]),
    }),
  ]),
});
