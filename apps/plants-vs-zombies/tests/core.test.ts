import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, dispatchCommand, getMetrics, getSnapshot, step } from '../src/core/game';
import { createDefaultRegistry, createRegistry, registerEventHook, registerPlant, registerPlantCostRule } from '../src/core/registry';
import { ADVENTURE_LEVELS, PLANTS, ZOMBIES } from '../src/content/base';
import type { LevelDefinition } from '../src/core/types';

const shortLevel: LevelDefinition = {
  id: 'test-short',
  title: 'Test Lawn',
  rows: 5,
  columns: 9,
  startingSun: 200,
  skySunEveryTicks: 0,
  waves: [{ atTick: 30, zombies: [{ typeId: 'basic', row: 2 }] }],
};

test('invalid planting commands preserve sun and board state', () => {
  const game = createGame({ level: shortLevel, seed: 'rules-1' });
  dispatchCommand(game, { type: 'START' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'peashooter' });

  const outside = dispatchCommand(game, { type: 'PLANT', row: 5, column: 0 });
  assert.equal(outside.accepted, false);
  assert.equal(outside.reason, 'invalid-cell');
  assert.equal(getSnapshot(game).sun, 200);

  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 2, column: 1 }).accepted, true);
  const duplicate = dispatchCommand(game, { type: 'PLANT', row: 2, column: 1 });
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, 'occupied');
  assert.equal(getSnapshot(game).sun, 100);
});

test('a seed and command sequence produce the same simulation snapshot', () => {
  const run = () => {
    const game = createGame({ level: shortLevel, seed: 'replay-42' });
    dispatchCommand(game, { type: 'START' });
    dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'peashooter' });
    dispatchCommand(game, { type: 'PLANT', row: 2, column: 1 });
    for (let index = 0; index < 900; index += 1) step(game);
    return getSnapshot(game);
  };

  assert.deepEqual(run(), run());
});

test('plant and zombie registries reject duplicate ids and invalid numeric data', () => {
  const registry = createRegistry();
  registerPlant(registry, { id: 'test', title: 'Test Plant', cost: 50, maxHealth: 100, cooldownTicks: 10, behavior: 'blocker' });
  assert.throws(() => registerPlant(registry, {
    id: 'test', title: 'Duplicate', cost: 50, maxHealth: 100, cooldownTicks: 10, behavior: 'blocker',
  }), /already registered/);
  assert.throws(() => registerPlant(registry, {
    id: 'invalid', title: 'Invalid', cost: -1, maxHealth: 100, cooldownTicks: 10, behavior: 'blocker',
  }), /cost/);
});

test('the default game registry supplies simulation-safe baseline definitions', () => {
  const registry = createDefaultRegistry();
  const game = createGame({ level: shortLevel, registry, seed: 'metrics' });
  dispatchCommand(game, { type: 'START' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'sunflower' });
  dispatchCommand(game, { type: 'PLANT', row: 0, column: 0 });
  for (let index = 0; index < 400; index += 1) step(game);

  const metrics = getMetrics(game);
  assert.equal(metrics.seed, 'metrics');
  assert.ok(metrics.ticks >= 400);
  assert.equal(metrics.plantsPlanted, 1);
});

test('survival intermissions wait for the next flag and accept a replacement loadout', () => {
  const level: LevelDefinition = {
    ...shortLevel,
    id: 'intermission-test',
    intermissionAfterWaves: true,
    waveStartDelayTicks: 2,
    waves: [
      { atTick: 1, zombies: [] },
      { atTick: 2, zombies: [] },
      { atTick: 5, zombies: [] },
    ],
  };
  const game = createGame({ level, seed: 'intermission', allowedPlantIds: ['peashooter', 'sunflower'], maxLoadoutSize: 2 });
  dispatchCommand(game, { type: 'START' });
  step(game);
  assert.equal(getSnapshot(game).phase, 'intermission');
  assert.equal(getSnapshot(game).spawnedWaveCount, 1);
  assert.equal(dispatchCommand(game, { type: 'SET_LOADOUT', plantIds: ['unknown'] }).accepted, false);
  assert.equal(dispatchCommand(game, { type: 'SET_LOADOUT', plantIds: ['peashooter', 'peashooter'] }).accepted, false);
  assert.equal(dispatchCommand(game, { type: 'SET_LOADOUT', plantIds: ['cherry-bomb', 'wall-nut'] }).accepted, true);
  assert.equal(dispatchCommand(game, { type: 'CONTINUE' }).accepted, true);
  step(game);
  assert.equal(getSnapshot(game).phase, 'playing');
  step(game);
  assert.equal(getSnapshot(game).phase, 'intermission');
  assert.equal(getSnapshot(game).spawnedWaveCount, 2);
  assert.deepEqual(getSnapshot(game).allowedPlantIds, ['cherry-bomb', 'wall-nut']);
  assert.equal(dispatchCommand(game, { type: 'SET_LOADOUT', plantIds: ['peashooter'] }).accepted, true);
  assert.equal(dispatchCommand(game, { type: 'CONTINUE' }).accepted, true);
  step(game, 2);
  assert.equal(getSnapshot(game).phase, 'won');
  assert.deepEqual(getSnapshot(game).allowedPlantIds, ['peashooter']);
});

test('endless survival appends seeded waves and returns to intermission after each flag', () => {
  const level: LevelDefinition = {
    ...shortLevel,
    id: 'endless-test',
    intermissionAfterWaves: true,
    endlessWaveRule: { zombiePool: ['basic'], baseCount: 1, countEveryWaves: 2, startDelayTicks: 2 },
    waves: [{ atTick: 1, zombies: [] }],
  };
  const game = createGame({ level, seed: 'endless' });
  dispatchCommand(game, { type: 'START' });
  step(game);
  assert.equal(getSnapshot(game).phase, 'intermission');
  assert.equal(getSnapshot(game).waveCount, 2);
  dispatchCommand(game, { type: 'CONTINUE' });
  step(game, 2_000);
  assert.equal(getSnapshot(game).phase, 'intermission');
  assert.equal(getSnapshot(game).spawnedWaveCount, 2);
  assert.equal(getSnapshot(game).waveCount, 3);
});

test('GOTY Endless Survival adds the next twenty-wave stage after intermission', () => {
  const registry = createDefaultRegistry();
  registry.zombies.clear();
  const level: LevelDefinition = {
    id: 'endless-survival-contract',
    title: 'Endless Survival Contract',
    terrain: 'day',
    rows: 5,
    columns: 9,
    startingSun: 50,
    skySunEveryTicks: 0,
    intermissionAfterWaves: true,
    intermissionEveryWaves: 20,
    waveStartDelayTicks: 1,
    survivalWavePlan: { terrain: 'day', difficulty: 'endless', wavesPerStage: 20 },
    waves: Array.from({ length: 20 }, (_, index) => ({ atTick: index + 1, zombies: [] })),
  };
  const game = createGame({ level, registry, seed: 'survival-contract' });
  dispatchCommand(game, { type: 'START' });
  step(game, 20);
  assert.equal(getSnapshot(game).phase, 'intermission');
  assert.equal(getSnapshot(game).spawnedWaveCount, 20);
  assert.equal(getSnapshot(game).waveCount, 20);

  assert.equal(dispatchCommand(game, { type: 'CONTINUE' }).accepted, true);
  assert.equal(getSnapshot(game).waveCount, 40);
  step(game, 20_000);
  assert.equal(getSnapshot(game).phase, 'intermission');
  assert.equal(getSnapshot(game).spawnedWaveCount, 40);
});

test('the registered GOTY content catalog contains stable ids and 50 adventure stages', () => {
  assert.equal(PLANTS.length, 49);
  assert.equal(ZOMBIES.length, 27);
  assert.equal(ADVENTURE_LEVELS.length, 50);
  assert.equal(new Set(PLANTS.map((plant) => plant.id)).size, PLANTS.length);
  assert.equal(new Set(ZOMBIES.map((zombie) => zombie.id)).size, ZOMBIES.length);
  assert.equal(new Set(ADVENTURE_LEVELS.map((level) => level.id)).size, ADVENTURE_LEVELS.length);
  assert.deepEqual(new Set(ADVENTURE_LEVELS.map((level) => level.terrain)), new Set(['day', 'night', 'pool', 'fog', 'roof', 'boss']));
  const rewardedPlants = new Set(ADVENTURE_LEVELS.flatMap((level) => level.rewardPlantId ? [level.rewardPlantId] : []));
  const shopUpgrades = new Set(['gatling-pea', 'twin-sunflower', 'gloom-shroom', 'cattail', 'winter-melon', 'gold-magnet', 'spikerock', 'cob-cannon', 'imitater']);
  assert.deepEqual(rewardedPlants, new Set(PLANTS.filter((plant) => plant.id !== 'peashooter' && !shopUpgrades.has(plant.id)).map((plant) => plant.id)));
});

test('internal rules and event hooks are composable and receive detached snapshots', () => {
  const registry = createDefaultRegistry();
  let observedPlantCount = 0;
  registerPlantCostRule(registry, 'test-sun-discount', ({ baseCost }) => baseCost / 2);
  registerEventHook(registry, 'plant-placed', 'test-plant-counter', (_event, snapshot) => {
    observedPlantCount = snapshot.plants.length;
    snapshot.plants.length = 0;
  });
  const game = createGame({ level: shortLevel, registry, seed: 'extension-contract' });
  dispatchCommand(game, { type: 'START' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'sunflower' });

  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 1, column: 1 }).accepted, true);
  assert.equal(getSnapshot(game).sun, 175);
  assert.equal(getSnapshot(game).plants.length, 1);
  assert.equal(observedPlantCount, 1);
});

test('invalid extension costs fail before they can corrupt simulation state', () => {
  const registry = createDefaultRegistry();
  registerPlantCostRule(registry, 'invalid-cost', () => Number.NaN);
  const game = createGame({ level: shortLevel, registry, seed: 'invalid-extension' });
  dispatchCommand(game, { type: 'START' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'sunflower' });
  assert.throws(() => dispatchCommand(game, { type: 'PLANT', row: 1, column: 1 }), /invalid cost/);
  assert.equal(getSnapshot(game).sun, 200);
  assert.equal(getSnapshot(game).plants.length, 0);
});


test('sun pickups can be collected once and contribute to balance metrics', () => {
  const level: LevelDefinition = {
    ...shortLevel,
    skySunEveryTicks: 2,
    waves: [{ atTick: 10_000, zombies: [{ typeId: 'basic', row: 2 }] }],
  };
  const game = createGame({ level, seed: 'sun-collect' });
  dispatchCommand(game, { type: 'START' });
  step(game, 2);
  const sun = getSnapshot(game).suns[0];
  assert.ok(sun);
  assert.equal(dispatchCommand(game, { type: 'COLLECT_SUN', sunId: sun.id }).accepted, true);
  assert.equal(getSnapshot(game).sun, 225);
  assert.equal(dispatchCommand(game, { type: 'COLLECT_SUN', sunId: sun.id }).accepted, false);
  assert.equal(getMetrics(game).sunCollected, 25);
});

test('a lane mower triggers once, clears its lane, and permits a win', () => {
  const level: LevelDefinition = {
    ...shortLevel,
    mowerRows: [2],
    waves: [{ atTick: 1, zombies: [{ typeId: 'basic', row: 2 }] }],
  };
  const game = createGame({ level, seed: 'mower-lane' });
  dispatchCommand(game, { type: 'START' });
  step(game, 2_000);

  assert.equal(getSnapshot(game).phase, 'won');
  assert.equal(getMetrics(game).mowersUsed, 1);
  assert.equal(getMetrics(game).zombiesKilled, 1);
  assert.ok(game.drainEvents().some((event) => event.type === 'mower-activated' && event.row === 2));
});

test('a lane without an available mower ends the game when breached', () => {
  const level: LevelDefinition = {
    ...shortLevel,
    mowerRows: [],
    waves: [{ atTick: 1, zombies: [{ typeId: 'basic', row: 2 }] }],
  };
  const game = createGame({ level, seed: 'no-mower' });
  dispatchCommand(game, { type: 'START' });
  step(game, 2_000);

  assert.equal(getSnapshot(game).phase, 'lost');
  assert.equal(getMetrics(game).mowersUsed, 0);
});

test('pool and roof planting use platform slots while support overlays stay removable', () => {
  const registry = createDefaultRegistry();
  const poolGame = createGame({ registry, level: { ...registry.levels.get('3-1')!, startingSun: 500 }, seed: 'pool-slots' });
  dispatchCommand(poolGame, { type: 'START' });
  dispatchCommand(poolGame, { type: 'SELECT_PLANT', plantId: 'peashooter' });
  assert.deepEqual(dispatchCommand(poolGame, { type: 'PLANT', row: 2, column: 1 }), { accepted: false, reason: 'needs-platform' });
  dispatchCommand(poolGame, { type: 'SELECT_PLANT', plantId: 'lily-pad' });
  assert.equal(dispatchCommand(poolGame, { type: 'PLANT', row: 2, column: 1 }).accepted, true);
  dispatchCommand(poolGame, { type: 'SELECT_PLANT', plantId: 'peashooter' });
  assert.equal(dispatchCommand(poolGame, { type: 'PLANT', row: 2, column: 1 }).accepted, true);
  assert.deepEqual(getSnapshot(poolGame).plants.map((plant) => plant.slot), ['platform', 'base']);

  const roofGame = createGame({ registry, level: { ...registry.levels.get('5-1')!, startingSun: 500 }, seed: 'roof-slots' });
  dispatchCommand(roofGame, { type: 'START' });
  dispatchCommand(roofGame, { type: 'SELECT_PLANT', plantId: 'cabbage-pult' });
  assert.deepEqual(dispatchCommand(roofGame, { type: 'PLANT', row: 0, column: 1 }), { accepted: false, reason: 'needs-platform' });
  dispatchCommand(roofGame, { type: 'SELECT_PLANT', plantId: 'flower-pot' });
  assert.equal(dispatchCommand(roofGame, { type: 'PLANT', row: 0, column: 1 }).accepted, true);
  dispatchCommand(roofGame, { type: 'SELECT_PLANT', plantId: 'cabbage-pult' });
  assert.equal(dispatchCommand(roofGame, { type: 'PLANT', row: 0, column: 1 }).accepted, true);
});

test('pumpkin overlays protect the base plant and shovel removes one layer at a time', () => {
  const level: LevelDefinition = { ...shortLevel, startingSun: 500, waves: [] };
  const game = createGame({ level, seed: 'plant-layers' });
  dispatchCommand(game, { type: 'START' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'wall-nut' });
  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 1, column: 1 }).accepted, true);
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'pumpkin' });
  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 1, column: 1 }).accepted, true);
  assert.deepEqual(getSnapshot(game).plants.map((plant) => plant.slot), ['base', 'overlay']);
  assert.equal(dispatchCommand(game, { type: 'SHOVEL', row: 1, column: 1 }).accepted, true);
  assert.deepEqual(getSnapshot(game).plants.map((plant) => plant.typeId), ['wall-nut']);
});

test('mushrooms sleep in daylight and Coffee Bean wakes the same board layer', () => {
  const level: LevelDefinition = { ...shortLevel, startingSun: 200, waves: [] };
  const game = createGame({ level, seed: 'coffee-bean' });
  dispatchCommand(game, { type: 'START' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'sun-shroom' });
  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 1, column: 1 }).accepted, true);
  assert.equal(getSnapshot(game).plants[0]?.isAsleep, true);
  assert.deepEqual(dispatchCommand(game, { type: 'PLANT', row: 1, column: 1 }), { accepted: false, reason: 'occupied' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'coffee-bean' });
  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 1, column: 1 }).accepted, true);
  assert.equal(getSnapshot(game).plants.find((plant) => plant.typeId === 'sun-shroom')?.isAsleep, false);
  assert.equal(getSnapshot(game).plants.some((plant) => plant.typeId === 'coffee-bean'), false);
});

test('upgrade plants replace their required base plant and reject invalid upgrade targets', () => {
  const level: LevelDefinition = { ...shortLevel, startingSun: 600 };
  const game = createGame({ level, seed: 'plant-upgrades' });
  dispatchCommand(game, { type: 'START' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'gatling-pea' });
  assert.deepEqual(dispatchCommand(game, { type: 'PLANT', row: 2, column: 2 }), { accepted: false, reason: 'needs-upgrade-target' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'repeater' });
  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 2, column: 2 }).accepted, true);
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'gatling-pea' });
  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 2, column: 2 }).accepted, true);
  assert.deepEqual(getSnapshot(game).plants.map((plant) => plant.typeId), ['gatling-pea']);
  assert.equal(getSnapshot(game).sun, 150);
});

test('Grave Buster only plants on a grave and removes it after its consume delay', () => {
  const level: LevelDefinition = {
    ...shortLevel,
    terrain: 'night',
    startingSun: 200,
    graves: [{ row: 2, column: 2 }],
    waves: [{ atTick: 1_000, zombies: [{ typeId: 'basic', row: 4 }] }],
  };
  const game = createGame({ level, seed: 'grave-buster' });
  dispatchCommand(game, { type: 'START' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'peashooter' });
  assert.deepEqual(dispatchCommand(game, { type: 'PLANT', row: 2, column: 2 }), { accepted: false, reason: 'grave-blocks' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'grave-buster' });
  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 2, column: 2 }).accepted, true);
  assert.deepEqual(getSnapshot(game).graves, [{ row: 2, column: 2 }]);
  step(game, 180);
  assert.deepEqual(getSnapshot(game).graves, []);
  assert.equal(getSnapshot(game).plants.some((plant) => plant.typeId === 'grave-buster'), false);
});

test('Plantern reveals a bounded area of fog and Cattail requires a lily pad on water', () => {
  const fogLevel: LevelDefinition = {
    ...shortLevel,
    terrain: 'fog',
    rows: 6,
    startingSun: 500,
    waterRows: [2, 3],
    waves: [{ atTick: 1_000, zombies: [{ typeId: 'basic', row: 5 }] }],
  };
  const game = createGame({ level: fogLevel, seed: 'fog-and-cattail' });
  dispatchCommand(game, { type: 'START' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'plantern' });
  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 1, column: 5 }).accepted, true);
  assert.ok(getSnapshot(game).fogRevealedCells.some((cell) => cell.row === 1 && cell.column === 8));
  assert.ok(!getSnapshot(game).fogRevealedCells.some((cell) => cell.row === 4 && cell.column === 8));
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'cattail' });
  assert.deepEqual(dispatchCommand(game, { type: 'PLANT', row: 2, column: 3 }), { accepted: false, reason: 'needs-upgrade-target' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'lily-pad' });
  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 2, column: 3 }).accepted, true);
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'cattail' });
  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 2, column: 3 }).accepted, true);
});

test('Digger Zombies cross underground, emerge behind the defense, and Gargantuars throw an Imp once', () => {
  const diggerLevel: LevelDefinition = {
    ...shortLevel,
    mowerRows: [],
    waves: [{ atTick: 1, zombies: [{ typeId: 'digger', row: 2 }] }],
  };
  const diggerGame = createGame({ level: diggerLevel, seed: 'digger-behavior' });
  dispatchCommand(diggerGame, { type: 'START' });
  step(diggerGame, 1);
  assert.equal(getSnapshot(diggerGame).zombies[0]?.isBurrowed, true);
  step(diggerGame, 1_200);
  const emergedDigger = getSnapshot(diggerGame).zombies[0];
  assert.equal(emergedDigger?.isBurrowed, false);
  assert.equal(emergedDigger?.movingRight, true);

  const bossLevel: LevelDefinition = {
    ...shortLevel,
    startingSun: 200,
    mowerRows: [],
    waves: [{ atTick: 1, zombies: [{ typeId: 'gargantuar', row: 2 }] }],
  };
  const bossGame = createGame({ level: bossLevel, seed: 'gargantuar-imp' });
  dispatchCommand(bossGame, { type: 'START' });
  dispatchCommand(bossGame, { type: 'SELECT_PLANT', plantId: 'cherry-bomb' });
  assert.equal(dispatchCommand(bossGame, { type: 'PLANT', row: 2, column: 8 }).accepted, true);
  step(bossGame, 30);
  assert.equal(getSnapshot(bossGame).zombies.filter((zombie) => zombie.typeId === 'imp').length, 1);
  assert.equal(getMetrics(bossGame).zombiesSpawned, 2);
  assert.equal(getSnapshot(bossGame).zombies.find((zombie) => zombie.typeId === 'gargantuar')?.didThrowImp, true);
});

test('Split Peas can fire behind their row and Pogo Zombies jump over multiple blockers', () => {
  const diggerLevel: LevelDefinition = {
    ...shortLevel,
    startingSun: 200,
    mowerRows: [],
    waves: [{ atTick: 1, zombies: [{ typeId: 'digger', row: 2 }] }],
  };
  const splitPeaRegistry = createDefaultRegistry();
  const splitPeaDefinition = splitPeaRegistry.plants.get('split-pea')!;
  splitPeaRegistry.plants.set('split-pea', { ...splitPeaDefinition, damage: 500, attackIntervalTicks: 30 });
  const splitPeaGame = createGame({ level: diggerLevel, registry: splitPeaRegistry, seed: 'split-pea-backward' });
  dispatchCommand(splitPeaGame, { type: 'START' });
  dispatchCommand(splitPeaGame, { type: 'SELECT_PLANT', plantId: 'split-pea' });
  assert.equal(dispatchCommand(splitPeaGame, { type: 'PLANT', row: 2, column: 2 }).accepted, true);
  step(splitPeaGame, 2_500);
  assert.equal(getSnapshot(splitPeaGame).zombies.some((zombie) => zombie.typeId === 'digger'), false);
  assert.ok(getMetrics(splitPeaGame).zombiesKilled >= 1);

  const pogoLevel: LevelDefinition = {
    ...shortLevel,
    startingSun: 200,
    mowerRows: [],
    waves: [{ atTick: 1, zombies: [{ typeId: 'pogo', row: 2 }] }],
  };
  const pogoGame = createGame({ level: pogoLevel, seed: 'pogo-jumps' });
  dispatchCommand(pogoGame, { type: 'START' });
  dispatchCommand(pogoGame, { type: 'SELECT_PLANT', plantId: 'wall-nut' });
  assert.equal(dispatchCommand(pogoGame, { type: 'PLANT', row: 2, column: 7 }).accepted, true);
  dispatchCommand(pogoGame, { type: 'SELECT_PLANT', plantId: 'tall-nut' });
  assert.equal(dispatchCommand(pogoGame, { type: 'PLANT', row: 2, column: 5 }).accepted, true);
  step(pogoGame, 400);
  const pogo = getSnapshot(pogoGame).zombies.find((zombie) => zombie.typeId === 'pogo');
  assert.ok(pogo?.hasJumped);
  assert.ok((pogo?.nextJumpTick ?? 0) > getSnapshot(pogoGame).tick);
  assert.ok((pogo?.x ?? 9) < 5);
});

test('Dancing Zombies summon a deterministic four-lane backup group', () => {
  const level: LevelDefinition = {
    ...shortLevel,
    waves: [{ atTick: 1, zombies: [{ typeId: 'dancer', row: 2 }] }],
  };
  const first = createGame({ level, seed: 'dance-group' });
  const second = createGame({ level, seed: 'dance-group' });
  dispatchCommand(first, { type: 'START' });
  dispatchCommand(second, { type: 'START' });
  step(first, 91);
  step(second, 91);
  assert.deepEqual(first.getSnapshot(), second.getSnapshot());
  assert.equal(first.getSnapshot().zombies.filter((zombie) => zombie.typeId === 'backup-dancer').length, 4);
  assert.equal(getMetrics(first).zombiesSpawned, 5);
  assert.equal(first.getSnapshot().zombies.find((zombie) => zombie.typeId === 'dancer')?.hasSummonedBackup, true);
});

test('Ice-shroom freezes the whole wave without dealing bomb damage', () => {
  const level: LevelDefinition = {
    ...shortLevel,
    terrain: 'night',
    waves: [{ atTick: 1, zombies: [{ typeId: 'basic', row: 0 }, { typeId: 'conehead', row: 4 }] }],
  };
  const game = createGame({ level, seed: 'freeze-all' });
  dispatchCommand(game, { type: 'START' });
  dispatchCommand(game, { type: 'SELECT_PLANT', plantId: 'ice-shroom' });
  assert.equal(dispatchCommand(game, { type: 'PLANT', row: 2, column: 1 }).accepted, true);
  step(game);
  const snapshot = getSnapshot(game);
  const zombies = snapshot.zombies;
  assert.equal(zombies.length, 2);
  assert.ok(zombies.every((zombie) => zombie.frozenUntilTick > snapshot.tick));
  assert.equal(zombies[0]?.health, 270);
  assert.equal(getSnapshot(game).plants.length, 0);
});

test('Blover clears balloon zombies and Torchwood doubles passing pea damage', () => {
  const balloonLevel: LevelDefinition = {
    ...shortLevel,
    waves: [{ atTick: 1, zombies: [{ typeId: 'balloon', row: 2 }] }],
  };
  const balloonGame = createGame({ level: balloonLevel, seed: 'blover' });
  dispatchCommand(balloonGame, { type: 'START' });
  dispatchCommand(balloonGame, { type: 'SELECT_PLANT', plantId: 'blover' });
  dispatchCommand(balloonGame, { type: 'PLANT', row: 2, column: 1 });
  step(balloonGame);
  assert.equal(getSnapshot(balloonGame).phase, 'won');
  assert.equal(getMetrics(balloonGame).zombiesKilled, 1);

  const firingLevel: LevelDefinition = {
    ...shortLevel,
    startingSun: 500,
    waves: [{ atTick: 1, zombies: [{ typeId: 'basic', row: 2 }] }],
  };
  const firingGame = createGame({ level: firingLevel, seed: 'torchwood' });
  dispatchCommand(firingGame, { type: 'START' });
  dispatchCommand(firingGame, { type: 'SELECT_PLANT', plantId: 'peashooter' });
  dispatchCommand(firingGame, { type: 'PLANT', row: 2, column: 0 });
  dispatchCommand(firingGame, { type: 'SELECT_PLANT', plantId: 'torchwood' });
  dispatchCommand(firingGame, { type: 'PLANT', row: 2, column: 1 });
  step(firingGame, 200);
  assert.ok(getSnapshot(firingGame).zombies[0]!.health < 250);
});
