import type { CampaignUnitPoolDefinition } from './index';

export interface CampaignUnitPoolLocationState {
  readonly id: string;
  readonly spawnLocationType: number;
  readonly cell: { readonly x: number; readonly y: number };
  spawning: boolean;
  remainingMs: number;
  poolType?: number;
  ordinal: number;
}

export interface CampaignUnitPoolRuntime {
  remainingMs: number;
  pending: number[];
  dispatched: number[];
  maximum: number[];
  locations: CampaignUnitPoolLocationState[];
}

export interface SpawnedCampaignUnit {
  poolType: number;
  unitType: string;
  id: string;
  cell: { x: number; y: number };
  positionFine: { x: number; y: number };
}

export interface CampaignUnitPoolRandom {
  nextInt(bound: number): number;
}

const POOL_TYPE_COUNT = 37;
const SPAWN_LOCATION_RESPAWN_MS = 1_500;
const SPAWN_LOCATION_ATTEMPT_THRESHOLD_MS = 500;
const FINE_UNITS_PER_CELL = 7_680;

export function createCampaignUnitPoolRuntime(
  definition: CampaignUnitPoolDefinition | undefined,
): CampaignUnitPoolRuntime | undefined {
  if (!definition) return undefined;
  return {
    remainingMs: definition.intervalMs,
    pending: Array<number>(POOL_TYPE_COUNT).fill(0),
    dispatched: Array<number>(POOL_TYPE_COUNT).fill(0),
    maximum: Array<number>(POOL_TYPE_COUNT).fill(0),
    locations: definition.spawnLocations.map((location) => ({
      ...location,
      cell: { ...location.cell },
      spawning: false,
      remainingMs: 0,
      ordinal: 0,
    })),
  };
}

/** Applies the original wave actions in order; SET replaces the full 37-entry byte pool. */
export function applyCampaignUnitPoolActions(
  runtime: CampaignUnitPoolRuntime | undefined,
  definition: CampaignUnitPoolDefinition | undefined,
  waveNumber: number,
): void {
  if (!runtime || !definition) return;
  for (const action of definition.actions) {
    if (action.waveNumber !== waveNumber) continue;
    switch (action.action) {
      case 'add':
        runtime.pending[action.poolType] = runtime.pending[action.poolType]! + action.count;
        break;
      case 'set':
        runtime.pending.fill(0);
        for (const value of action.values) runtime.pending[value.poolType] = value.count;
        break;
      case 'add-max':
        runtime.maximum[action.poolType] = runtime.maximum[action.poolType]! + action.count;
        break;
      case 'set-max':
        runtime.maximum.fill(0);
        for (const value of action.values) runtime.maximum[value.poolType] = value.count;
        break;
    }
  }
}

/** Native GameObjectUnit.hire() adds to the pending count without checking the lifetime cap. */
export function queueCampaignUnitForSpawn(
  runtime: CampaignUnitPoolRuntime | undefined,
  definition: CampaignUnitPoolDefinition | undefined,
  unitType: string,
): void {
  if (!runtime || !definition) return;
  const entry = definition.units.find((candidate) => candidate.unitType === unitType);
  if (!entry) return;
  runtime.pending[entry.poolType] = runtime.pending[entry.poolType]! + 1;
}

export function advanceCampaignUnitPool(
  runtime: CampaignUnitPoolRuntime | undefined,
  definition: CampaignUnitPoolDefinition | undefined,
  deltaMs: number,
  random: CampaignUnitPoolRandom,
  isBlocked: (spawn: SpawnedCampaignUnit) => boolean,
): SpawnedCampaignUnit[] {
  if (!runtime || !definition) return [];
  const spawned: SpawnedCampaignUnit[] = [];

  // GameObjectManager updates locations before SpawnPoolManager picks the next request.
  for (const location of runtime.locations) {
    if (!location.spawning) continue;
    location.remainingMs -= deltaMs;
    if (location.remainingMs < SPAWN_LOCATION_ATTEMPT_THRESHOLD_MS && location.poolType !== undefined) {
      const entry = definition.units.find(({ poolType }) => poolType === location.poolType);
      if (!entry) throw new Error('Spawn location references an unknown unit pool type');
      const spawn: SpawnedCampaignUnit = {
        poolType: entry.poolType,
        unitType: entry.unitType,
        id: `${entry.unitType}-spawn-${String(location.ordinal).padStart(2, '0')}`,
        cell: { ...location.cell },
        positionFine: {
          x: (location.cell.x * FINE_UNITS_PER_CELL) + 3_840,
          y: (location.cell.y * FINE_UNITS_PER_CELL) + 5_760,
        },
      };
      if (isBlocked(spawn)) {
        // The pool request and lifetime counter were consumed at initSpawn(); a blocked
        // Fort keeps retrying this same type every 1,500 ms until the space clears.
        location.remainingMs = SPAWN_LOCATION_RESPAWN_MS;
      } else {
        spawned.push(spawn);
        location.poolType = undefined;
      }
    }
    if (location.remainingMs <= 0) location.spawning = false;
  }

  runtime.remainingMs -= deltaMs;
  if (runtime.remainingMs >= 0) return spawned;

  // The APK samples a starting index in all 37 pool slots, then scans forward with wrap.
  let poolType = random.nextInt(POOL_TYPE_COUNT);
  let selectedEntry: CampaignUnitPoolDefinition['units'][number] | undefined;
  for (let scanned = 0; scanned < POOL_TYPE_COUNT; scanned += 1) {
    selectedEntry = definition.units.find((entry) => entry.poolType === poolType
      && runtime.pending[poolType]! > 0
      && runtime.dispatched[poolType]! < runtime.maximum[poolType]!);
    if (selectedEntry) break;
    poolType = (poolType + 1) % POOL_TYPE_COUNT;
  }

  if (selectedEntry) {
    const eligible = runtime.locations.filter((location) => !location.spawning
      && (location.spawnLocationType === selectedEntry!.spawnLocationType
        || location.spawnLocationType === -1));
    if (eligible.length > 0) {
      const location = eligible[random.nextInt(eligible.length)]!;
      runtime.pending[poolType] = runtime.pending[poolType]! - 1;
      runtime.dispatched[poolType] = runtime.dispatched[poolType]! + 1;
      location.spawning = true;
      location.poolType = poolType;
      location.ordinal = runtime.dispatched[poolType]!;
      location.remainingMs = SPAWN_LOCATION_RESPAWN_MS;
    }
  }

  // The APK discards timer overshoot and restarts one full global interval.
  runtime.remainingMs = definition.intervalMs;
  return spawned;
}
