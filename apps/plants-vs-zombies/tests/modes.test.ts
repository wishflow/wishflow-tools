import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultRegistry } from '../src/core/registry';
import { createDefaultGameModeRegistry, createGameModeRegistry, registerGameMode } from '../src/modes/registry';
import { createSurvivalLevel } from '../src/modes/survival';
import { VasebreakerRuntime } from '../src/modes/vasebreaker';
import { WallNutBowlingRuntime } from '../src/modes/wallNutBowling';
import { IZombieRuntime } from '../src/modes/iZombie';
import { ZenGardenRuntime } from '../src/modes/zenGarden';
import { WhackAZombieRuntime } from '../src/modes/whackAZombie';

test('survival scenarios cover each terrain with registered zombie types and stable wave order', () => {
  const modes = createDefaultGameModeRegistry();
  const game = createDefaultRegistry();
  assert.deepEqual([...modes.modes.keys()].sort(), [
    'ace-of-vase', 'adventure', 'all-your-brainz-r-belong-to-us', 'another-chain-reaction', 'beghouled', 'beghouled-twist', 'big-trouble-little-zombie', 'bobsled-bonanza', 'can-you-dig-it', 'chain-reaction', 'column-like-you-see-em', 'dead-zeppelin', 'dr-zomboss-revenge', 'hokey-pokey', 'i-zombie', 'i-zombie-endless', 'i-zombie-too', 'invisi-ghoul', 'its-raining-seeds', 'last-stand', 'm-is-for-metal', 'me-smash', 'pogo-party', 'portal-combat', 'scary-potter', 'seeing-stars', 'slot-machine', 'survival-day', 'survival-day-hard', 'survival-fog', 'survival-fog-hard', 'survival-night', 'survival-night-hard', 'survival-pool', 'survival-pool-endless', 'survival-pool-hard', 'survival-roof', 'survival-roof-hard', 'third-vase', 'three-hit-wonder', 'to-the-left', 'totally-nuts', 'vasebreaker', 'vasebreaker-endless', 'wall-nut-bowling', 'wall-nut-bowling-2', 'whack-a-zombie', 'zen-garden', 'zombie-nimble-zombie-quick', 'zombiquarium', 'zomboogie', 'zombotany', 'zombotany-2',
  ]);
  assert.equal(modes.modes.get('wall-nut-bowling')?.unlockAfterLevelId, '3-2');
  assert.equal(modes.modes.get('vasebreaker')?.unlockAfterLevelId, '4-6');
  assert.equal(modes.modes.get('zen-garden')?.unlockAfterLevelId, '5-4');
  assert.equal(modes.modes.get('survival-day')?.unlockAfterLevelId, '5-10');
  assert.equal(modes.modes.get('survival-day-hard')?.createSession('fixed-seed').kind, 'battle');
  const miniGames = [...modes.modes.values()].filter((mode) => mode.category === 'mini-game');
  assert.equal(miniGames.length, 20);
  assert.deepEqual(miniGames.slice(0, 3).map((mode) => mode.unlockAfterLevelId), ['3-2', '3-2', '3-2']);
  assert.ok(miniGames.slice(3).every((mode) => mode.unlockAfterLevelId === '5-10'));
  for (const mode of miniGames) {
    const session = mode.createSession('fixed-seed');
    if (session.kind === 'battle') {
      assert.ok(session.level.waves.every((wave) => wave.zombies.every((spawn) => game.zombies.has(spawn.typeId))));
    } else {
      assert.equal(session.modeId, mode.id);
    }
  }
  for (const mode of modes.modes.values()) {
    if (mode.category !== 'survival' || mode.id.endsWith('-hard') || mode.id.endsWith('-endless')) continue;
    const session = mode.createSession('fixed-seed');
    assert.equal(session.kind, 'battle');
    if (session.kind !== 'battle') continue;
    assert.equal(session.progression, 'none');
    assert.equal(session.level.waves.length, 5);
    const hardMode = modes.modes.get('survival-' + session.level.terrain + '-hard');
    assert.ok(hardMode);
    const hardSession = hardMode.createSession('fixed-seed');
    assert.equal(hardSession.kind, 'battle');
    if (hardSession.kind === 'battle') assert.ok(hardSession.level.waves[1]!.atTick < session.level.waves[1]!.atTick);
    assert.ok(session.level.waves.every((wave) => wave.zombies.every((spawn) => game.zombies.has(spawn.typeId))));
    assert.ok(session.level.waves.every((wave, index) => index === 0 || wave.atTick > session.level.waves[index - 1]!.atTick));
  }
  const hardPool = modes.modes.get('survival-pool-hard')?.createSession('fixed-seed');
  assert.equal(hardPool?.kind, 'battle');
  if (hardPool?.kind === 'battle') assert.equal(hardPool.level.waves.length, 10);
  const endlessPool = modes.modes.get('survival-pool-endless')?.createSession('fixed-seed');
  assert.equal(endlessPool?.kind, 'battle');
  if (endlessPool?.kind === 'battle') {
    assert.equal(endlessPool.level.waves.length, 5);
    assert.ok(endlessPool.level.endlessWaveRule);
  }
  assert.deepEqual(createSurvivalLevel('fog').waterRows, [2, 3]);
});

test('mode registry rejects invalid identifiers and duplicate registrations', () => {
  const registry = createGameModeRegistry();
  const mode = {
    id: 'test-mode',
    category: 'mini-game' as const,
    title: 'Test Mode',
    description: 'A test mode.',
    createSession: () => ({ kind: 'custom' as const, modeId: 'test-mode', progression: 'none' as const }),
  };
  registerGameMode(registry, mode);
  assert.throws(() => registerGameMode(registry, mode), /already registered/);
  assert.throws(() => registerGameMode(registry, { ...mode, id: 'Invalid ID' }), /stable id/);
});

test('Vasebreaker uses seeded vase layouts, awards sun, and resolves completed boards', () => {
  const first = new VasebreakerRuntime({ seed: 'vase-seed' });
  const second = new VasebreakerRuntime({ seed: 'vase-seed' });
  assert.deepEqual(first.getSnapshot(), second.getSnapshot());
  assert.equal(first.breakVase('unknown'), false);
  const sunVase = first.getSnapshot().vases.find((vase) => vase.payload?.kind === 'sun');
  assert.ok(sunVase);
  assert.equal(first.breakVase(sunVase.id), true);
  assert.equal(first.breakVase(sunVase.id), false);
  assert.equal(first.getSnapshot().sun, 25);

  const finalVase = new VasebreakerRuntime({ seed: 'one-cell', rows: 1, columns: 1 });
  assert.equal(finalVase.breakVase('vase-0'), true);
  assert.equal(finalVase.getSnapshot().phase, 'won');

  const metal = new VasebreakerRuntime({ seed: 'metal-seed', levelId: 'm-is-for-metal' });
  assert.equal(metal.getSnapshot().id, 'm-is-for-metal');
  assert.equal(metal.getSnapshot().vases.length, 42);
  const endless = new VasebreakerRuntime({ seed: 'endless-vases', levelId: 'vasebreaker-endless', rows: 1, columns: 1 });
  assert.equal(endless.breakVase('vase-0'), true);
  assert.equal(endless.getSnapshot().phase, 'playing');
  assert.equal(endless.getSnapshot().boardsCleared, 1);
  assert.equal(endless.getSnapshot().closedVaseCount, 1);
});

test('Wall-nut Bowling accepts lane commands and replays its seeded zombie spawns', () => {
  const first = new WallNutBowlingRuntime('bowling-seed');
  const second = new WallNutBowlingRuntime('bowling-seed');
  assert.deepEqual(first.getSnapshot(), second.getSnapshot());
  assert.equal(first.throwNut(-1), false);
  assert.equal(first.throwNut(2), true);
  assert.equal(first.throwNut(1), false);
  first.step(60);
  second.throwNut(2);
  second.step(60);
  assert.deepEqual(first.getSnapshot(), second.getSnapshot());
  assert.equal(first.getSnapshot().zombies.length, 1);
});

test('I, Zombie consumes brains on lane deployment and Zen Garden care mutates session state', () => {
  const first = new IZombieRuntime('i-zombie-seed');
  const second = new IZombieRuntime('i-zombie-seed');
  assert.equal(first.spawnZombie('basic', 2), true);
  assert.equal(second.spawnZombie('basic', 2), true);
  assert.equal(first.spawnZombie('basic', 5), false);
  assert.deepEqual(first.getSnapshot(), second.getSnapshot());
  assert.equal(first.getSnapshot().brains, 200);

  const garden = new ZenGardenRuntime('garden-seed');
  const plant = garden.getSnapshot().plants[1]!;
  assert.equal(garden.care(plant.id, 'water'), true);
  assert.equal(garden.getSnapshot().plants[1]!.hydration, 83);
  garden.step(600);
  assert.equal(garden.getSnapshot().plants[1]!.hydration, 79);
  assert.equal(garden.getSnapshot().plants[1]!.growth, plant.growth + 1);

  const digger = new IZombieRuntime('digger-level', 'can-you-dig-it');
  assert.deepEqual(digger.getSnapshot().availableZombieIds, ['digger', 'basic']);
  assert.equal(digger.getSnapshot().id, 'can-you-dig-it');
  assert.equal(digger.spawnZombie('conehead', 2), false);
  assert.equal(digger.spawnZombie('digger', 2), true);
});

test('Whack a Zombie uses a seeded target schedule and resolves hits, misses, and completion', () => {
  const first = new WhackAZombieRuntime('whack-seed', { targetCount: 2, targetLifetimeTicks: 5 });
  const second = new WhackAZombieRuntime('whack-seed', { targetCount: 2, targetLifetimeTicks: 5 });
  first.step();
  second.step();
  assert.deepEqual(first.getSnapshot(), second.getSnapshot());
  const target = first.getSnapshot().activeTarget;
  assert.ok(target);
  assert.equal(first.whack(-1, target.column), false);
  assert.equal(first.whack(target.row, (target.column + 1) % first.columns), false);
  assert.equal(first.whack(target.row, target.column), true);
  first.step(45);
  const finalTarget = first.getSnapshot().activeTarget;
  assert.ok(finalTarget);
  assert.equal(first.whack(finalTarget.row, finalTarget.column), true);
  assert.equal(first.getSnapshot().phase, 'won');

  const missed = new WhackAZombieRuntime('whack-miss', { targetCount: 1, targetLifetimeTicks: 2 });
  missed.step(3);
  assert.equal(missed.getSnapshot().phase, 'lost');
  assert.equal(missed.getSnapshot().lives, 2);
});
