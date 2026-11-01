import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchP1dCampaignContent } from '../src/content/cow-gulch';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

const emptyRequests = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

test('Cow Gulch transport wagon escape applies the type-specific penalty and exempts its tow', async () => {
  const original = cowGulchP1dCampaignContent;
  const scenario: ScenarioContent = {
    ...original,
    id: 'p1f-campaign-wagon-escape-penalty',
    units: [],
    previewWave: {
      ...original.previewWave!,
      spawn: { cell: { x: 0, y: 10 }, direction: 'west' },
      baseEnemySpeed: 500_000,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      redirects: [],
      exit: { x: 0, y: 0 },
    },
    campaignWaveCount: 4,
    campaignWaves: original.campaignWaves!.slice(0, 4).map((wave, index): CampaignWaveDefinition => ({
      ...wave,
      spawnPools: wave.spawnPools.map((pool) => ({
        ...pool,
        requests: index === 2 ? [0, 0, 0, 0, 0, 1, 0, 0, 0, 0] : emptyRequests,
      })),
    })),
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 7,
  });

  let view = session.observe();
  for (let step = 0; step < 5 && view.wave?.number !== 3; step += 1) {
    view = session.advance({ deltaMs: 0 });
  }
  assert.equal(view.wave?.number, 3);

  for (let step = 0; step < 10 && view.wave?.number !== 4; step += 1) {
    view = session.advance({ deltaMs: 100 });
  }

  assert.equal(view.wave?.number, 4, 'the following empty wave exposes the escape feedback seed');
  assert.equal(view.wave?.escapedEnemies, 2, 'the wagon and tow both leave the field');
  assert.equal(view.wave?.lives, 48, 'type 4 costs two lives; type 8 costs none');
  assert.equal(view.wave?.dynamicDifficulty, 555, 'type 4 contributes its penalty weight; type 8 contributes none');
});

test('raw campaign difficulty scales the next pool while bounded difficulty sets enemy HP', async () => {
  const original = cowGulchP1dCampaignContent;
  const scenario: ScenarioContent = { ...original, id: 'p1f-campaign-raw-difficulty', units: [] };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 42,
  });

  let view = session.observe();
  for (let step = 0; step < 4000 && view.wave?.number !== 3; step += 1) {
    view = session.advance({ deltaMs: 100 });
  }

  assert.equal(view.wave?.number, 3, 'the authentic first two wave pools drain into Wave 03');
  assert.equal(view.wave?.dynamicDifficulty, 258, 'the global difficulty remains raw below the HP floor');
  assert.equal(view.wave?.pendingSpawnRequests, 1, 'Wave 03 requests scale from raw 258, then round with a minimum of one');

  for (let step = 0; step < 100 && !view.enemies.some(({ type }) => type === 4); step += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  const wagon = view.enemies.find(({ type }) => type === 4);
  assert.ok(wagon, 'the scaled Wave 03 request produces its covered wagon');
  assert.equal(wagon.hitPoints, 600, 'Easy HP uses the bounded difficulty 500, not raw 258');
});

test('raw difficulty may exceed the easy HP ceiling without raising enemy HP above that ceiling', async () => {
  const original = cowGulchP1dCampaignContent;
  const gunslinger = original.units.find(({ type }) => type === 'gunslinger')!;
  const scenario: ScenarioContent = {
    ...original,
    id: 'p1f-campaign-upper-difficulty-bound',
    units: [{
      ...gunslinger,
      id: 'difficulty-bound-gunslinger',
      cell: { x: 1, y: 10 },
      weapon: {
        ...gunslinger.weapon!,
        damage: 1_000_000,
        rangeFine: 153_600,
        projectileSpeed: 600,
        reloadTimeMs: 1,
        specialReloadTimeMs: 0,
        specialReloadFrequency: 1000,
      },
    }],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: 42,
  });

  let view = session.observe();
  for (let step = 0; step < 4000 && view.wave?.number === 1; step += 1) {
    view = session.advance({ deltaMs: 100 });
  }

  assert.equal(view.wave?.number, 2, 'the high-damage unit clears the authentic first wave');
  assert.ok((view.wave.dynamicDifficulty ?? 0) > 1250,
    `the raw global difficulty is not capped at the Easy HP ceiling (actual ${view.wave.dynamicDifficulty})`);
  assert.equal(view.wave.pendingSpawnRequests, 10, 'Wave 02 pool scaling consumes the raw global difficulty');

  for (let step = 0; step < 100 && !view.events.some((event) => event.type === 'enemy-group-spawned'); step += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  const firstWaveTwoEnemy = view.enemies[0];
  assert.ok(firstWaveTwoEnemy, 'Wave 02 spawns an enemy after scaling its pool');
  assert.equal(firstWaveTwoEnemy.hitPoints, 168, 'Easy HP remains capped at 1250 despite a higher raw difficulty');
});

test('the next-wave difficulty feedback accumulator starts at the HP-clamped raw value', async () => {
  const original = cowGulchP1dCampaignContent;
  const gunslinger = original.units.find(({ type }) => type === 'gunslinger')!;
  const campaignWaves = original.campaignWaves!.slice(0, 3).map((wave, index): CampaignWaveDefinition => ({
    ...wave,
    spawnPools: wave.spawnPools.map((pool) => ({
      ...pool,
      requests: index === 0 ? pool.requests : emptyRequests,
    })),
  }));
  const scenario: ScenarioContent = {
    ...original,
    id: 'p1f-campaign-clamped-feedback-seed',
    units: [{
      ...gunslinger,
      id: 'feedback-seed-gunslinger',
      cell: { x: 1, y: 10 },
      weapon: {
        ...gunslinger.weapon!,
        damage: 1_000_000,
        rangeFine: 153_600,
        projectileSpeed: 600,
        reloadTimeMs: 1,
        specialReloadTimeMs: 0,
        specialReloadFrequency: 1000,
      },
    }],
    campaignWaveCount: 3,
    campaignWaves,
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: 42,
  });

  let view = session.observe();
  for (let step = 0; step < 4000 && view.wave?.number === 1; step += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  assert.equal(view.wave?.number, 2);
  const rawDifficulty = view.wave.dynamicDifficulty!;
  assert.ok(rawDifficulty > 1250, 'the first wave leaves raw difficulty above the Easy HP ceiling');

  view = session.advance({ deltaMs: 0 });
  assert.equal(view.wave?.number, 3, 'the empty second wave advances without an input');
  assert.equal(view.wave.dynamicDifficulty, Math.trunc((rawDifficulty + 1250) / 2),
    'the new wave averages raw global difficulty with the bounded feedback seed');
});

test('covered-wagon passenger count is derived from raw campaign difficulty', async () => {
  const original = cowGulchP1dCampaignContent;
  const gunslinger = original.units.find(({ type }) => type === 'gunslinger')!;
  const campaignWaves = original.campaignWaves!.slice(0, 3).map((wave, index): CampaignWaveDefinition => ({
    ...wave,
    spawnPools: wave.spawnPools.map((pool) => ({
      ...pool,
      requests: index === 2 ? [0, 0, 0, 0, 0, 1, 0, 0, 0, 0] : pool.requests,
    })),
  }));
  const scenario: ScenarioContent = {
    ...original,
    id: 'p1f-raw-difficulty-passengers',
    units: [{
      ...gunslinger,
      id: 'late-passenger-gunslinger',
      activity: 4,
      hirePrice: 0,
      asset: 'player_gunslinger_sleep',
      awakeAsset: 'player_gunslinger',
      cell: { x: 8, y: 8 },
      weapon: {
        ...gunslinger.weapon!,
        damage: 1_000_000,
        rangeFine: 153_600,
        projectileSpeed: 600,
        reloadTimeMs: 1,
        specialReloadTimeMs: 0,
        specialReloadFrequency: 1000,
      },
    }],
    campaignWaveCount: 3,
    campaignWaves,
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 42,
  });

  let view = session.observe();
  for (let step = 0; step < 4000 && view.wave?.number !== 3; step += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  assert.equal(view.wave?.dynamicDifficulty, 258);
  assert.equal(view.wave?.pendingSpawnRequests, 1);

  for (let step = 0; step < 100 && !view.enemies.some(({ type }) => type === 4); step += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  assert.ok(view.enemies.some(({ type }) => type === 4), 'the covered wagon enters Wave 03');
  session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  view = session.advance({ deltaMs: 0 });
  assert.equal(view.units[0]?.selected, true);
  session.submitIntent({ type: 'hire-map-unit', unitId: 'late-passenger-gunslinger', commandId: 'hire-after-wave-two' });
  view = session.advance({ deltaMs: 0 });
  assert.equal(view.units[0]?.activity, 5);

  let passengers: typeof view.enemies = [];
  for (let step = 0; step < 30 && passengers.length === 0; step += 1) {
    view = session.advance({ deltaMs: 100 });
    passengers = view.enemies.filter(({ id }) => id.startsWith('wagon-passenger-'));
  }
  assert.equal(passengers.length, 2,
    'seed 42 and raw difficulty 258 produce two passenger slots; the clamped bound produces one');
});
