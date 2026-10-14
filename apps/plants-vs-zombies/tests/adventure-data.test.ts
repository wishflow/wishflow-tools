import assert from 'node:assert/strict';
import test from 'node:test';
import { ADVENTURE_LEVELS } from '../src/content/base';
import { createAdventureWaves } from '../src/core/adventureWaves';
import { createDefaultRegistry } from '../src/core/registry';
import { createGame, getSnapshot } from '../src/core/game';
import { GOTY_ADVENTURE_WAVE_COUNTS } from '../src/content/adventureData';

test('Adventure uses the 50 GOTY wave-count entries and five official world terrains', () => {
  assert.deepEqual(ADVENTURE_LEVELS.map((level) => level.adventureWavePlan?.waveCount), GOTY_ADVENTURE_WAVE_COUNTS);
  assert.deepEqual(ADVENTURE_LEVELS.map((level) => level.terrain), [
    ...Array.from({ length: 10 }, () => 'day'),
    ...Array.from({ length: 10 }, () => 'night'),
    ...Array.from({ length: 10 }, () => 'pool'),
    ...Array.from({ length: 4 }, () => 'fog'),
    'night',
    ...Array.from({ length: 5 }, () => 'fog'),
    ...Array.from({ length: 9 }, () => 'roof'),
    'boss',
  ]);
  assert.equal(ADVENTURE_LEVELS.find((level) => level.id === '3-1')?.rows, 6);
  assert.deepEqual(ADVENTURE_LEVELS.find((level) => level.id === '3-1')?.waterRows, [2, 3]);
  assert.equal(ADVENTURE_LEVELS.find((level) => level.id === '4-1')?.rows, 6);
  assert.deepEqual(ADVENTURE_LEVELS.find((level) => level.id === '4-1')?.waterRows, [2, 3]);
  assert.equal(ADVENTURE_LEVELS.find((level) => level.id === '4-6')?.rows, 6);
  assert.deepEqual(ADVENTURE_LEVELS.find((level) => level.id === '4-6')?.waterRows, [2, 3]);
  assert.equal(ADVENTURE_LEVELS.find((level) => level.id === '4-5')?.terrain, 'night');
  assert.equal(ADVENTURE_LEVELS.find((level) => level.id === '1-1')?.startingSun, 150);
  assert.equal(ADVENTURE_LEVELS.find((level) => level.id === '1-2')?.startingSun, 50);
  assert.equal(ADVENTURE_LEVELS.find((level) => level.id === '5-10')?.terrain, 'boss');
});

test('Adventure special stages and wave multipliers map to the reverse-engineered rules', () => {
  const at = (id: string) => ADVENTURE_LEVELS.find((level) => level.id === id)!.adventureWavePlan!;
  assert.equal(at('1-5').specialModeId, 'wall-nut-bowling');
  assert.equal(at('2-5').specialModeId, 'whack-a-zombie');
  assert.equal(at('3-5').specialModeId, 'little-trouble');
  assert.equal(at('4-5').specialModeId, 'scary-potter');
  assert.equal(at('4-10').specialModeId, 'stormy-night');
  assert.equal(at('5-5').specialModeId, 'bungee-blitz');
  assert.equal(at('5-10').specialModeId, 'final-boss');
  assert.equal(at('1-10').wavePointMultiplier, 3);
  assert.equal(at('3-10').wavePointMultiplier, 3);
  assert.equal(at('4-5').wavePointMultiplier, 1);
  assert.equal(at('4-10').wavePointMultiplier, 3);
  assert.equal(at('5-5').wavePointMultiplier, 2);
});

test('Adventure stage definitions use per-level zombie eligibility from the GOTY data', () => {
  const at = (id: string) => ADVENTURE_LEVELS.find((level) => level.id === id)!;
  assert.deepEqual(at('1-1').adventureWavePlan?.eligibleZombieIds, ['basic']);
  assert.ok(at('1-3').adventureWavePlan?.eligibleZombieIds.includes('conehead'));
  assert.ok(!at('2-1').adventureWavePlan?.eligibleZombieIds.includes('conehead'));
  assert.ok(at('2-1').adventureWavePlan?.eligibleZombieIds.includes('newspaper'));
  assert.ok(at('3-6').adventureWavePlan?.eligibleZombieIds.includes('zamboni'));
  assert.ok(at('5-10').adventureWavePlan?.eligibleZombieIds.includes('gargantuar'));
  assert.equal(at('5-10').adventureWavePlan?.bossEncounterId, 'dr-zomboss');
  assert.ok(!at('3-1').adventureWavePlan?.eligibleZombieIds.includes('duckytube'));
});

test('Adventure queues are seeded, preserve GOTY wave totals, and mark flag waves', () => {
  const level = ADVENTURE_LEVELS.find((candidate) => candidate.id === '1-2')!;
  const plan = level.adventureWavePlan!;
  const registry = createDefaultRegistry();
  const first = createAdventureWaves(plan, level.rows, 'same-seed', true, registry.zombies);
  const replay = createAdventureWaves(plan, level.rows, 'same-seed', true, registry.zombies);
  assert.deepEqual(first, replay);
  assert.equal(first.length, 6);
  assert.ok(first.at(-1)!.zombies.some((spawn) => spawn.typeId === 'flag'));
  assert.ok(first.every((wave) => wave.zombies.every((spawn) => spawn.count && spawn.count > 0)));
});

test('replayed GOTY levels apply the source-defined second-adventure wave totals', () => {
  const shortLevel = ADVENTURE_LEVELS.find((candidate) => candidate.id === '1-1')!;
  const longLevel = ADVENTURE_LEVELS.find((candidate) => candidate.id === '1-4')!;
  const registry = createDefaultRegistry();
  assert.equal(createAdventureWaves(shortLevel.adventureWavePlan!, shortLevel.rows, 'seed', false, registry.zombies).length, 20);
  assert.equal(createAdventureWaves(longLevel.adventureWavePlan!, longLevel.rows, 'seed', false, registry.zombies).length, 20);
  const whackLevel = ADVENTURE_LEVELS.find((candidate) => candidate.id === '2-5')!;
  assert.equal(createAdventureWaves(whackLevel.adventureWavePlan!, whackLevel.rows, 'seed', true, registry.zombies).length, 8);
  assert.equal(createAdventureWaves(whackLevel.adventureWavePlan!, whackLevel.rows, 'seed', false, registry.zombies).length, 8);
  const finalLevel = ADVENTURE_LEVELS.find((candidate) => candidate.id === '5-10')!;
  assert.equal(createAdventureWaves(finalLevel.adventureWavePlan!, finalLevel.rows, 'seed', false, registry.zombies).length, 40);
  for (const id of ['1-10', '2-10', '3-10']) {
    const level = ADVENTURE_LEVELS.find((candidate) => candidate.id === id)!;
    assert.equal(createAdventureWaves(level.adventureWavePlan!, level.rows, 'seed', false, registry.zombies).length, level.adventureWavePlan!.waveCount);
  }
  const finalWave = createAdventureWaves(finalLevel.adventureWavePlan!, finalLevel.rows, 'seed', true, registry.zombies).at(-1)!;
  assert.ok(finalWave.zombies.some((spawn) => spawn.typeId === 'gargantuar'));
  for (const typeId of finalLevel.adventureWavePlan!.eligibleZombieIds) {
    assert.ok(finalWave.zombies.some((spawn) => spawn.typeId === typeId), 'final wave should include eligible zombie ' + typeId);
  }
  assert.ok(!finalWave.zombies.some((spawn) => spawn.typeId === 'zomboss'));
});

test('Bungee Blitz uses five fixed bungees on each nonfinal flag wave', () => {
  const level = ADVENTURE_LEVELS.find((candidate) => candidate.id === '5-5')!;
  const waves = createAdventureWaves(level.adventureWavePlan!, level.rows, 'bungee', true, createDefaultRegistry().zombies);
  assert.deepEqual(waves[9]!.zombies, [{ typeId: 'bungee', count: 5, rowRange: [0, level.rows - 1] }]);
});

test('runtime materializes the source-backed wave plan for the selected Adventure stage', () => {
  const runtime = createGame({ levelId: '1-2', seed: 'runtime-wave-plan' });
  assert.equal(getSnapshot(runtime).waveCount, 6);
  assert.equal(runtime.level.waves[0]!.atTick, 450);
  assert.ok(runtime.level.waves.every((wave) => wave.zombies.length > 0));
});

test('all 50 source-backed stages materialize without unknown zombie references', () => {
  const registry = createDefaultRegistry();
  for (const level of ADVENTURE_LEVELS) {
    const runtime = createGame({ registry, level, seed: 'all-stage-fixture' });
    assert.ok(runtime.level.waves.length > 0, level.id + ' should have waves');
    assert.ok(runtime.level.waves.every((wave) => wave.zombies.every((spawn) => registry.zombies.has(spawn.typeId))), level.id + ' should only use registered zombies');
  }
});

test('the 1-1 board expands from the tutorial lane to five lanes on an Adventure replay', () => {
  const firstPlay = createGame({ levelId: '1-1', adventureFirstPlaythrough: true, seed: 'first-play' });
  const replay = createGame({ levelId: '1-1', adventureFirstPlaythrough: false, seed: 'replay' });
  assert.equal(firstPlay.level.rows, 1);
  assert.equal(replay.level.rows, 5);
  assert.equal(replay.level.waves.length, 20);
});

test('stage rewards follow the published original Adventure reward order', () => {
  const rewards = new Map(ADVENTURE_LEVELS.filter((level) => level.rewardPlantId).map((level) => [level.id, level.rewardPlantId]));
  assert.equal(rewards.size, 39);
  assert.equal(rewards.get('1-1'), 'sunflower');
  assert.equal(rewards.get('1-5'), 'potato-mine');
  assert.equal(rewards.get('3-2'), 'threepeater');
  assert.equal(rewards.get('4-10'), 'cabbage-pult');
  assert.equal(rewards.get('5-8'), 'melon-pult');
});
