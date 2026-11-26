import assert from 'node:assert/strict';
import test from 'node:test';
import * as officialCampaign from '../src/content/official-campaign';
import { createGame, type ScenarioContent } from '../src/game';

const FINE_UNITS_PER_CELL = 7_680;
const ENEMY_VEHICLE_TYPES = new Set([4, 5, 6, 8]);
const MAX_OBSERVATION_FRAMES = 1_500;

interface OfficialCrossingCase {
  level: number;
  scenarioId: string;
  waveNumber: number;
  spawnPointIds: readonly [number, number];
  cells: readonly { x: number; y: number }[];
  seed: number;
  horsemanSeed?: number;
  horsemanApproachSpawnPointIds?: readonly number[];
  expectSimultaneousApproach: boolean;
}

const crossingCases: readonly OfficialCrossingCase[] = [
  {
    level: 11,
    scenarioId: 'campaign-mississippi-11',
    waveNumber: 3,
    spawnPointIds: [0, 1],
    cells: [{ x: 5, y: 15 }],
    seed: 3,
    expectSimultaneousApproach: true,
  },
  {
    level: 14,
    scenarioId: 'campaign-mississippi-14',
    waveNumber: 3,
    spawnPointIds: [0, 1],
    cells: [{ x: 5, y: 8 }, { x: 5, y: 9 }],
    seed: 1,
    expectSimultaneousApproach: true,
  },
  {
    level: 14,
    scenarioId: 'campaign-mississippi-14',
    waveNumber: 7,
    spawnPointIds: [3, 5],
    cells: [{ x: 24, y: 19 }],
    seed: 1,
    expectSimultaneousApproach: true,
  },
  {
    level: 17,
    scenarioId: 'campaign-mississippi-17',
    waveNumber: 6,
    spawnPointIds: [3, 5],
    cells: [{ x: 14, y: 21 }],
    seed: 40,
    horsemanSeed: 1,
    horsemanApproachSpawnPointIds: [5],
    expectSimultaneousApproach: false,
  },
  {
    level: 17,
    scenarioId: 'campaign-mississippi-17',
    waveNumber: 6,
    spawnPointIds: [4, 5],
    cells: [{ x: 14, y: 21 }],
    seed: 1,
    expectSimultaneousApproach: true,
  },
  {
    level: 31,
    scenarioId: 'campaign-oregon-11',
    waveNumber: 3,
    spawnPointIds: [1, 2],
    cells: [{ x: 20, y: 9 }, { x: 20, y: 10 }],
    seed: 1,
    // The action-2 reservation now serializes this fixed-seed crossing.
    expectSimultaneousApproach: false,
  },
];

function findScenario(scenarioId: string): ScenarioContent {
  const scenario = Object.values(officialCampaign).find((value) => (
    typeof value === 'object'
    && value !== null
    && 'id' in value
    && value.id === scenarioId
  ));
  assert.ok(scenario && 'campaignWaves' in scenario, `${scenarioId} is an official campaign scenario`);
  return scenario;
}

/** Keep the official route, vehicle request counts and request intervals. */
function isolateCrossingWave(crossingCase: OfficialCrossingCase): ScenarioContent {
  const source = structuredClone(findScenario(crossingCase.scenarioId));
  source.units = [];
  source.campaignUnitPool = undefined;
  source.campaignBonusCratePool = undefined;
  source.campaignWaves = source.campaignWaves!.map((wave) => ({
    ...wave,
    delayMs: 0,
    spawnPools: wave.number === crossingCase.waveNumber
      ? wave.spawnPools
        .filter(({ spawnPointId }) => crossingCase.spawnPointIds.includes(spawnPointId))
        .map((pool) => ({
          ...pool,
          requests: pool.requests.map((count, index) => index >= 5 && index <= 7 ? count : 0),
        }))
      : wave.spawnPools.map((pool) => ({
        ...pool,
        requests: pool.requests.map(() => 0),
      })),
  }));
  return source;
}

/** Keep only the official horseman request at each entrance to isolate type-3 route traffic. */
function isolateHorsemanCrossingWave(crossingCase: OfficialCrossingCase): ScenarioContent {
  const source = structuredClone(findScenario(crossingCase.scenarioId));
  source.units = [];
  source.campaignUnitPool = undefined;
  source.campaignBonusCratePool = undefined;
  source.campaignWaves = source.campaignWaves!.map((wave) => ({
    ...wave,
    delayMs: 0,
    spawnPools: wave.number === crossingCase.waveNumber
      ? wave.spawnPools
        .filter(({ spawnPointId }) => crossingCase.spawnPointIds.includes(spawnPointId))
        .map((pool) => ({
          ...pool,
          requests: pool.requests.map((count, index) => index === 4 ? count : 0),
        }))
      : wave.spawnPools.map((pool) => ({
        ...pool,
        requests: pool.requests.map(() => 0),
      })),
  }));
  return source;
}

function isNearCrossingArea(
  positionFine: { x: number; y: number },
  cells: OfficialCrossingCase['cells'],
  radiusCells: number,
): boolean {
  return cells.some((cell) => Math.abs(positionFine.x / FINE_UNITS_PER_CELL - (cell.x + 0.5)) <= radiusCells
    && Math.abs(positionFine.y / FINE_UNITS_PER_CELL - (cell.y + 0.5)) <= radiusCells);
}

async function verifyCrossingCase(crossingCase: OfficialCrossingCase): Promise<void> {
  const originalScenario = findScenario(crossingCase.scenarioId);
  const scenario = isolateCrossingWave(crossingCase);
  const originalTargetWave = originalScenario.campaignWaves!.find(({ number }) => number === crossingCase.waveNumber)!;
  const targetWave = scenario.campaignWaves!.find(({ number }) => number === crossingCase.waveNumber)!;
  const schedule = (wave: typeof targetWave) => wave.spawnPools
    .filter(({ spawnPointId }) => crossingCase.spawnPointIds.includes(spawnPointId))
    .map(({ spawnPointId, intervalMs, intervalMultiplier, requests }) => ({
      spawnPointId,
      intervalMs,
      intervalMultiplier,
      vehicleRequests: requests.slice(5, 8),
    }));
  assert.deepEqual(schedule(targetWave), schedule(originalTargetWave),
    `Level ${crossingCase.level} retains each selected pool's official vehicle counts and request interval`);
  const expectedSpawnIds = crossingCase.spawnPointIds.filter((spawnPointId) => (
    targetWave.spawnPools.some(({ spawnPointId: poolSpawnId, requests }) => poolSpawnId === spawnPointId
      && requests.slice(5, 8).some((count) => count > 0))
  ));
  assert.deepEqual(expectedSpawnIds, crossingCase.spawnPointIds,
    `Level ${crossingCase.level} retains official vehicle requests at both intersecting entrances`);

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: crossingCase.seed,
  });

  try {
    let view = session.observe();
    for (let frame = 0; frame < 100 && view.wave?.number !== crossingCase.waveNumber; frame += 1) {
      view = session.advance({ deltaMs: 0 });
    }
    assert.equal(view.wave?.number, crossingCase.waveNumber,
      `Level ${crossingCase.level} enters the isolated official wave`);

    const spawnByGroup = new Map<string, number>();
    let synchronizedApproachFrames = 0;
    let overlappingFrames = 0;
    const observedSpawnIds = new Set<number>();
    const observedApproachSpawnIds = new Set<number>();

    for (let frame = 0; frame < MAX_OBSERVATION_FRAMES; frame += 1) {
      view = session.advance({ deltaMs: 200 });
      for (const event of view.events) {
        if (event.type !== 'enemy-group-spawned') continue;
        const member = view.enemies.find(({ id }) => event.enemyIds.includes(id));
        if (!member?.groupId) continue;
        spawnByGroup.set(member.groupId, event.spawnPointId);
        observedSpawnIds.add(event.spawnPointId);
      }

      const vehicles = view.enemies.filter(({ alive, type }) => alive && ENEMY_VEHICLE_TYPES.has(type));
      const vehiclesBySpawn = new Map<number, typeof vehicles>();
      for (const vehicle of vehicles) {
        const spawnPointId = spawnByGroup.get(vehicle.groupId ?? '');
        if (spawnPointId === undefined || !crossingCase.spawnPointIds.includes(spawnPointId)) continue;
        const current = vehiclesBySpawn.get(spawnPointId) ?? [];
        current.push(vehicle);
        vehiclesBySpawn.set(spawnPointId, current);
      }

      const first = vehiclesBySpawn.get(crossingCase.spawnPointIds[0]) ?? [];
      const second = vehiclesBySpawn.get(crossingCase.spawnPointIds[1]) ?? [];
      const firstNear = first.filter(({ positionFine }) => isNearCrossingArea(positionFine, crossingCase.cells, 0.8));
      const secondNear = second.filter(({ positionFine }) => isNearCrossingArea(positionFine, crossingCase.cells, 0.8));
      if (firstNear.length > 0) observedApproachSpawnIds.add(crossingCase.spawnPointIds[0]);
      if (secondNear.length > 0) observedApproachSpawnIds.add(crossingCase.spawnPointIds[1]);
      const bothNear = firstNear.length > 0 && secondNear.length > 0;
      if (bothNear) synchronizedApproachFrames += 1;

      const firstAtCrossing = first.filter(({ positionFine }) => isNearCrossingArea(positionFine, crossingCase.cells, 1.5));
      const secondAtCrossing = second.filter(({ positionFine }) => isNearCrossingArea(positionFine, crossingCase.cells, 1.5));
      const overlap = firstAtCrossing.some((left) => secondAtCrossing.some((right) => (
        Math.abs(left.positionFine.x - right.positionFine.x) < 7_678
        && Math.abs(left.positionFine.y - right.positionFine.y) < 7_678
      )));
      if (overlap) overlappingFrames += 1;
    }

    assert.deepEqual([...observedSpawnIds].sort((left, right) => left - right), [...crossingCase.spawnPointIds].sort((left, right) => left - right),
      `Level ${crossingCase.level} spawns traffic from both official entrances`);
    assert.deepEqual([...observedApproachSpawnIds].sort((left, right) => left - right), [...crossingCase.spawnPointIds].sort((left, right) => left - right),
      `Level ${crossingCase.level} seed ${crossingCase.seed} sends vehicles from both entrances through the crossing area`);
    assert.equal(synchronizedApproachFrames > 0, crossingCase.expectSimultaneousApproach,
      `Level ${crossingCase.level} seed ${crossingCase.seed} ${crossingCase.expectSimultaneousApproach ? 'reaches' : 'does not reach'} the shared crossing area at the same time`);
    assert.equal(overlappingFrames, 0,
      `Level ${crossingCase.level} seed ${crossingCase.seed} keeps cross-entrance vehicle collision boxes from overlapping at the shared crossing`);
  } finally {
    session.close();
  }
}

async function verifyOfficialHorsemanCrossingCase(crossingCase: OfficialCrossingCase): Promise<void> {
  const seed = crossingCase.horsemanSeed ?? crossingCase.seed;
  const originalScenario = findScenario(crossingCase.scenarioId);
  const scenario = isolateHorsemanCrossingWave(crossingCase);
  const originalWave = originalScenario.campaignWaves!.find(({ number }) => number === crossingCase.waveNumber)!;
  const isolatedWave = scenario.campaignWaves!.find(({ number }) => number === crossingCase.waveNumber)!;
  const schedule = (wave: typeof originalWave) => wave.spawnPools
    .filter(({ spawnPointId }) => crossingCase.spawnPointIds.includes(spawnPointId))
    .map(({ spawnPointId, intervalMs, intervalMultiplier, requests }) => ({
      spawnPointId,
      intervalMs,
      intervalMultiplier,
      horsemanRequests: requests[4],
    }));
  assert.deepEqual(schedule(isolatedWave), schedule(originalWave),
    `Level ${crossingCase.level} preserves each official horseman request count and interval`);
  assert.ok(schedule(isolatedWave).every(({ horsemanRequests }) => (horsemanRequests ?? 0) > 0),
    `Level ${crossingCase.level} requests horsemen from both official entrances`);

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: seed,
  });

  try {
    let view = session.observe();
    for (let frame = 0; frame < 100 && view.wave?.number !== crossingCase.waveNumber; frame += 1) {
      view = session.advance({ deltaMs: 0 });
    }
    assert.equal(view.wave?.number, crossingCase.waveNumber,
      `Level ${crossingCase.level} enters the isolated official horseman wave`);

    const spawnByGroup = new Map<string, number>();
    const observedSpawnIds = new Set<number>();
    const observedApproachSpawnIds = new Set<number>();
    let overlappingFrames = 0;

    for (let frame = 0; frame < MAX_OBSERVATION_FRAMES; frame += 1) {
      view = session.advance({ deltaMs: 200 });
      for (const event of view.events) {
        if (event.type !== 'enemy-group-spawned') continue;
        const member = view.enemies.find(({ id }) => event.enemyIds.includes(id));
        if (!member?.groupId) continue;
        spawnByGroup.set(member.groupId, event.spawnPointId);
        observedSpawnIds.add(event.spawnPointId);
      }

      const horsemenBySpawn = new Map<number, Array<(typeof view.enemies)[number]>>();
      for (const enemy of view.enemies) {
        if (!enemy.alive || enemy.type !== 3) continue;
        const spawnPointId = spawnByGroup.get(enemy.groupId ?? '');
        if (spawnPointId === undefined || !crossingCase.spawnPointIds.includes(spawnPointId)) continue;
        const current = horsemenBySpawn.get(spawnPointId) ?? [];
        current.push(enemy);
        horsemenBySpawn.set(spawnPointId, current);
      }

      const first = horsemenBySpawn.get(crossingCase.spawnPointIds[0]) ?? [];
      const second = horsemenBySpawn.get(crossingCase.spawnPointIds[1]) ?? [];
      const firstNear = first.filter(({ positionFine }) => isNearCrossingArea(positionFine, crossingCase.cells, 0.8));
      const secondNear = second.filter(({ positionFine }) => isNearCrossingArea(positionFine, crossingCase.cells, 0.8));
      if (firstNear.length > 0) observedApproachSpawnIds.add(crossingCase.spawnPointIds[0]);
      if (secondNear.length > 0) observedApproachSpawnIds.add(crossingCase.spawnPointIds[1]);

      const firstAtCrossing = first.filter(({ positionFine }) => isNearCrossingArea(positionFine, crossingCase.cells, 1.5));
      const secondAtCrossing = second.filter(({ positionFine }) => isNearCrossingArea(positionFine, crossingCase.cells, 1.5));
      if (firstAtCrossing.some((left) => secondAtCrossing.some((right) => (
        Math.abs(left.positionFine.x - right.positionFine.x) < 7_678
        && Math.abs(left.positionFine.y - right.positionFine.y) < 7_678
      )))) overlappingFrames += 1;
    }

    assert.deepEqual([...observedSpawnIds].sort((left, right) => left - right), [...crossingCase.spawnPointIds].sort((left, right) => left - right),
      `Level ${crossingCase.level} spawns horsemen from both official entrances`);
    const expectedApproachSpawnIds = crossingCase.horsemanApproachSpawnPointIds ?? crossingCase.spawnPointIds;
    assert.deepEqual([...observedApproachSpawnIds].sort((left, right) => left - right), [...expectedApproachSpawnIds].sort((left, right) => left - right),
      `Level ${crossingCase.level} seed ${seed} sends horsemen from the expected official entrances through the action-2 crossing`);
    assert.equal(overlappingFrames, 0,
      `Level ${crossingCase.level} seed ${seed} keeps horseman collision boxes separated at the action-2 crossing`);
  } finally {
    session.close();
  }
}

for (const crossingCase of crossingCases) {
  test(`Level ${crossingCase.level} official transport crossing behavior: spawns ${crossingCase.spawnPointIds.join('/')}`, async () => {
    await verifyCrossingCase(crossingCase);
  });

  test(`Level ${crossingCase.level} official horseman crossing behavior: spawns ${crossingCase.spawnPointIds.join('/')}`, async () => {
    await verifyOfficialHorsemanCrossingCase(crossingCase);
  });
}
