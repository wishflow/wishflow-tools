import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchContent, cowGulchP1aSampleContent } from '../src/content/cow-gulch';
import { cowGulchDefeatContent } from '../src/content/cow-gulch-defeat';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
import { createGame, type GameSession, type ScenarioContent, type UnitView } from '../src/game';
import { serializeReplay, type GameReplayPayload } from '../src/game/replay';

const scenario: ScenarioContent = {
  id: 'fixture',
  title: { en: 'Test map', zh: '测试地图' },
  map: {
    width: 17,
    height: 17,
    tileSize: 32,
    background: [],
    streets: [],
  },
  units: [{
    id: 'gunslinger-1',
    type: 'gunslinger',
    cell: { x: 8, y: 8 },
    movementSpeedFinePer100Ms: 1500,
    asset: 'player_gunslinger',
    frame: { x: 0, y: 0, width: 32, height: 44 },
    render: { x: 8, y: 7.625, width: 1, height: 1.375 },
    hitArea: { x: 8, y: 7.625, width: 1, height: 1.375 },
  }],
};

const combatScenario: ScenarioContent = {
  ...scenario,
  id: 'combat-fixture',
  units: [{
    ...scenario.units[0]!,
    weapon: {
      damage: 140,
      damageType: 'light',
      rangeFine: 38400,
      reloadTimeMs: 500,
      projectileSpeed: 600,
      damageStyle: 0,
    },
  }],
  previewWave: {
    ...cowGulchPreviewWave,
    initialCash: 65,
    spawn: { cell: { x: 14, y: 8 }, direction: 'east' },
    baseEnemySpeed: 0,
    speedMultiplierMin: 100,
    speedMultiplierCount: 1,
    redirects: [],
    enemy: {
      hitPoints: 126,
      cashReward: 1,
      penetration: { light: 100, fire: 50, heavy: 25, poison: 75 },
    },
  },
};
const recruitmentScenario: ScenarioContent = {
  ...combatScenario,
  id: 'recruitment-fixture',
  previewWave: { ...combatScenario.previewWave!, initialCash: 75 },
  recruitableUnits: [{
    id: 'gunslinger',
    name: { en: 'Gunslinger', zh: '枪手' },
    price: 75,
    spawnLocationType: 1,
  }],
};
const gunslingerUpgradeLevelOne = {
  price: 25,
  movementSpeedFinePer100Ms: 1750,
  weapon: {
    ...combatScenario.units[0]!.weapon!,
    reloadTimeMs: 400,
    specialReloadTimeMs: 1250,
    specialReloadFrequency: 6,
  },
};
const upgradeScenario: ScenarioContent = {
  ...combatScenario,
  id: 'upgrade-fixture',
  maxUpgrades: 1,
  previewWave: {
    ...combatScenario.previewWave!,
    initialCash: 25,
    spawn: { cell: { x: 12, y: 8 }, direction: 'east' },
    enemy: { ...combatScenario.previewWave!.enemy!, hitPoints: 1000 },
  },
  units: combatScenario.units.map((unit) => ({ ...unit, upgradeLevels: [gunslingerUpgradeLevelOne] })),
};
const noCombatCowGulch: ScenarioContent = {
  ...cowGulchContent,
  units: [],
  campaignWaveCount: undefined,
  campaignWaves: undefined,
};
const noCombatCowGulchCampaign: ScenarioContent = { ...cowGulchContent, units: [] };
const formalPreviewCowGulch: ScenarioContent = {
  ...cowGulchContent,
  campaignWaveCount: undefined,
  campaignWaves: undefined,
};

function advanceFor(session: GameSession, durationMs: number) {
  let view = session.observe();
  let remainingMs = durationMs;
  while (remainingMs > 0) {
    const deltaMs = Math.min(100, remainingMs);
    view = session.advance({ deltaMs });
    remainingMs -= deltaMs;
  }
  return view;
}

test('starts an original campaign automatically without a start-wave intent', async () => {
  const session = await createGame({ scenarios: { [cowGulchContent.id]: cowGulchContent } }).open({
    scenarioId: cowGulchContent.id,
    mode: 'formal',
    randomSeed: 1234,
  });

  assert.equal(session.observe().wave?.phase, 'active');
  assert.equal(session.submitIntent({ type: 'start-wave' }), false);
});

test('opens a controlled scene with one unselected unit and isolates observations', async () => {
  const session = await createGame({ scenarios: { fixture: scenario } }).open({ scenarioId: 'fixture' });
  const initial = session.observe();

  assert.equal(initial.frame, 0);
  assert.equal(initial.units.length, 1);
  assert.equal(initial.units[0]?.selected, false);
  assert.throws(() => {
    (initial.units[0] as { selected: boolean }).selected = true;
  }, TypeError);
  assert.equal(session.observe().units[0]?.selected, false);
});

test('Cow Gulch exposes the unscaled APK requests for the first two campaign waves', () => {
  assert.equal(cowGulchContent.campaignWaveCount, 8);
  assert.deepEqual(cowGulchContent.campaignWaves?.map((wave) => ({
    number: wave.number,
    hitPointMultiplierPercent: wave.hitPointMultiplierPercent,
    speedMultiplierPercent: wave.speedMultiplierPercent,
    spawnPools: wave.spawnPools.map((pool) => ({
      spawnPointId: pool.spawnPointId,
      intervalMs: pool.intervalMs,
      requests: [...pool.requests],
    })),
  })), [
    {
      number: 1,
      hitPointMultiplierPercent: 70,
      speedMultiplierPercent: 100,
      spawnPools: [{ spawnPointId: 0, intervalMs: 1500, requests: [6, 2, 2, 0, 0, 0, 0, 0, 0, 0] }],
    },
    {
      number: 2,
      hitPointMultiplierPercent: 75,
      speedMultiplierPercent: 100,
      spawnPools: [{ spawnPointId: 0, intervalMs: 2000, requests: [0, 2, 2, 3, 0, 0, 0, 0, 0, 0] }],
    },
  ]);
});

test('runs the first two original Cow Gulch waves without settling a partial campaign', async () => {
  const session = await createGame({ scenarios: { 'cow-gulch': noCombatCowGulchCampaign } }).open({
    scenarioId: 'cow-gulch',
    mode: 'formal',
    randomSeed: 42,
  });
  const runWave = async (number: number) => {
    const groups: Array<{ requestType: number; groupSize: number }> = [];
    let view = session.observe();
    assert.equal(view.wave?.phase, 'active');
    let steps = 0;
    while (view.wave?.phase === 'active' && view.wave.number === number && steps < 4000) {
      view = session.advance({ deltaMs: 100 });
      groups.push(...view.events.flatMap((event) => event.type === 'enemy-group-spawned'
        ? [{ requestType: event.requestType, groupSize: event.groupSize }]
        : []));
      steps += 1;
    }
    assert.ok(steps < 4000, `wave ${number} should drain its original spawn pool and route`);
    return { view, groups };
  };

  const waveOne = await runWave(1);
  assert.equal(waveOne.view.wave?.number, 2);
  assert.equal(waveOne.view.wave?.phase, 'active', 'the following original wave starts automatically');
  assert.equal(waveOne.view.wave?.lives, 34);
  assert.equal(waveOne.view.wave?.dynamicDifficulty, 507);
  assert.equal(waveOne.view.wave?.pendingSpawnRequests, 4);
  assert.equal(waveOne.groups.length, 10);
  assert.equal(waveOne.groups.reduce((sum, group) => sum + group.groupSize, 0), 16);

  const waveTwo = await runWave(2);
  assert.equal(waveTwo.view.wave?.number, 2);
  assert.equal(waveTwo.view.wave?.phase, 'complete');
  assert.equal(waveTwo.view.wave?.lives, 21);
  assert.equal(waveTwo.view.wave?.pendingSpawnRequests, 0);
  assert.equal(waveTwo.groups.length, 4);
  assert.equal(waveTwo.groups.reduce((sum, group) => sum + group.groupSize, 0), 13);
  assert.equal(waveTwo.view.wave?.settlement, undefined, 'two of eight waves are not a level victory');
  assert.equal(session.terminalRecord(), undefined);
});

test('a retried recruitment command charges once and adds one unit to the spawn pool', async () => {
  const game = createGame({ scenarios: { [recruitmentScenario.id]: recruitmentScenario } });
  const session = await game.open({
    scenarioId: recruitmentScenario.id,
  });
  const command = { type: 'recruit-unit', unitType: 'gunslinger', commandId: 'hire-gunslinger-1' } as const;

  assert.equal(session.submitIntent(command), true);
  assert.equal(session.submitIntent(command), true, 'a duplicate retry is acknowledged without another queued purchase');
  const hired = session.advance({ deltaMs: 0 });

  assert.equal(hired.wave?.cash, 0);
  assert.deepEqual(hired.recruitPool, [{
    unitType: 'gunslinger', name: { en: 'Gunslinger', zh: '枪手' }, price: 75, spawnLocationType: 1, count: 1,
  }]);
  assert.equal(hired.events.filter((event) => event.type === 'unit-recruited').length, 1);
  assert.equal(hired.units.length, 1, 'a purchase remains in the pool until a matching original spawn site deploys it');

  assert.equal(session.submitIntent(command), true, 'retry after processing is acknowledged');
  const retried = session.advance({ deltaMs: 0 });
  assert.equal(retried.wave?.cash, 0);
  assert.equal(retried.recruitPool[0]?.count, 1);
  assert.equal(retried.events.length, 0);

  session.close();
  const restarted = await game.open({ scenarioId: recruitmentScenario.id });
  assert.equal(restarted.observe().wave?.cash, 75);
  assert.equal(restarted.observe().recruitPool[0]?.count, 0, 'an unfinished scene restarts without saving purchases');
});

test('Cow Gulch uses the researched first-level Gunslinger offer and keeps it in reserve without a spawn site', async () => {
  const offer = cowGulchContent.recruitableUnits?.[0];
  assert.deepEqual(offer, {
    id: 'gunslinger',
    name: { en: 'Gunslinger', zh: '枪手' },
    price: 75,
    spawnLocationType: 1,
  });
  assert.equal(cowGulchContent.previewWave?.initialCash, 65);
  assert.equal(cowGulchContent.originalTileGrid?.flat().some((tile) => tile >= 112 && tile <= 114), false);
});

test('separate valid recruitment commands each charge the listed unit price', async () => {
  const fundedScenario: ScenarioContent = {
    ...recruitmentScenario,
    id: 'funded-recruitment-fixture',
    previewWave: { ...recruitmentScenario.previewWave!, initialCash: 200 },
  };
  const session = await createGame({ scenarios: { [fundedScenario.id]: fundedScenario } }).open({
    scenarioId: fundedScenario.id,
  });

  assert.equal(session.submitIntent({ type: 'recruit-unit', unitType: 'gunslinger', commandId: 'hire-1' }), true);
  assert.equal(session.submitIntent({ type: 'recruit-unit', unitType: 'gunslinger', commandId: 'hire-2' }), true);
  const view = session.advance({ deltaMs: 0 });

  assert.equal(view.wave?.cash, 50);
  assert.equal(view.recruitPool[0]?.count, 2);
  assert.equal(view.events.filter((event) => event.type === 'unit-recruited').length, 2);
});

test('rejects reuse of a recruitment command ID with a different unit payload', async () => {
  const scenarioWithTwoOffers: ScenarioContent = {
    ...recruitmentScenario,
    id: 'conflicting-recruitment-fixture',
    recruitableUnits: [
      ...recruitmentScenario.recruitableUnits!,
      { id: 'mexican', name: { en: 'Mexican', zh: '墨西哥人' }, price: 100, spawnLocationType: 1 },
    ],
  };
  const session = await createGame({ scenarios: { [scenarioWithTwoOffers.id]: scenarioWithTwoOffers } }).open({
    scenarioId: scenarioWithTwoOffers.id,
  });

  assert.equal(session.submitIntent({ type: 'recruit-unit', unitType: 'gunslinger', commandId: 'same-command' }), true);
  assert.equal(session.submitIntent({ type: 'recruit-unit', unitType: 'mexican', commandId: 'same-command' }), false);
  const view = session.advance({ deltaMs: 0 });
  assert.equal(view.wave?.cash, 0);
  assert.equal(view.recruitPool.find((unit) => unit.unitType === 'gunslinger')?.count, 1);
  assert.equal(view.recruitPool.find((unit) => unit.unitType === 'mexican')?.count, 0);
});

test('insufficient cash rejects recruitment without changing cash or the pool', async () => {
  const poorScenario: ScenarioContent = {
    ...recruitmentScenario,
    id: 'poor-recruitment-fixture',
    previewWave: { ...recruitmentScenario.previewWave!, initialCash: 74 },
  };
  const session = await createGame({ scenarios: { [poorScenario.id]: poorScenario } }).open({
    scenarioId: poorScenario.id,
  });

  assert.equal(session.submitIntent({ type: 'recruit-unit', unitType: 'gunslinger', commandId: 'too-poor' }), true);
  const rejected = session.advance({ deltaMs: 0 });
  assert.equal(rejected.wave?.cash, 74);
  assert.equal(rejected.recruitPool[0]?.count, 0);
  assert.deepEqual(rejected.events, [{
    type: 'unit-recruitment-rejected',
    unitType: 'gunslinger',
    reason: 'insufficient-funds',
    price: 75,
    availableCash: 74,
  }]);

  assert.equal(session.submitIntent({ type: 'recruit-unit', unitType: 'gunslinger', commandId: 'too-poor' }), true);
  const retried = session.advance({ deltaMs: 0 });
  assert.equal(retried.wave?.cash, 74);
  assert.equal(retried.recruitPool[0]?.count, 0);
});

test('hires the selected sleeping map unit in place and acknowledges a duplicate command without another charge', async () => {
  const sleepingGunslinger = {
    ...combatScenario.units[0]!,
    id: 'sleeping-gunslinger-1',
    type: 'gunslinger',
    activity: 4 as const,
    asset: 'player_gunslinger_sleep',
    awakeAsset: 'player_gunslinger',
    hirePrice: 75,
  };
  const mapHireScenario: ScenarioContent = {
    ...combatScenario,
    id: 'map-hire-fixture',
    previewWave: { ...combatScenario.previewWave!, initialCash: 75 },
    units: [sleepingGunslinger],
  };
  const session = await createGame({ scenarios: { [mapHireScenario.id]: mapHireScenario } }).open({
    scenarioId: mapHireScenario.id,
  });

  session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  session.advance({ deltaMs: 0 });
  const hire = { type: 'hire-map-unit', unitId: sleepingGunslinger.id, commandId: 'hire-slot-1' } as never;
  assert.equal(session.submitIntent(hire), true);
  assert.equal(session.submitIntent(hire), true, 'retrying the same command is acknowledged');
  const view = session.advance({ deltaMs: 0 });

  assert.equal(view.wave?.cash, 0);
  assert.equal(view.units.length, 1, 'hiring activates the original map object instead of creating a pool entry');
  assert.equal(view.units[0]?.id, sleepingGunslinger.id);
  assert.equal(view.units[0]?.activity, 5);
  assert.equal(view.units[0]?.asset, 'player_gunslinger');
  assert.equal(view.units[0]?.selected, true);
  assert.equal(view.recruitPool.every((entry) => entry.count === 0), true);
  assert.equal(view.events.filter((event) => event.type === 'map-unit-hired').length, 1);
  assert.equal(view.events.filter((event) => event.type === 'map-unit-hire-rejected').length, 0);
});

test('rejects an unaffordable map-slot hire without waking or charging the same unit', async () => {
  const sleepingMexican = {
    ...combatScenario.units[0]!,
    id: 'sleeping-mexican-1',
    type: 'mexican',
    activity: 4 as const,
    asset: 'player_mexican_sleep',
    awakeAsset: 'player_mexican',
    hirePrice: 100,
  };
  const poorScenario: ScenarioContent = {
    ...combatScenario,
    id: 'poor-map-hire-fixture',
    previewWave: { ...combatScenario.previewWave!, initialCash: 99 },
    units: [sleepingMexican],
  };
  const session = await createGame({ scenarios: { [poorScenario.id]: poorScenario } }).open({ scenarioId: poorScenario.id });
  session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'hire-map-unit', unitId: sleepingMexican.id, commandId: 'hire-mexican-poor' } as never);
  const rejected = session.advance({ deltaMs: 0 });

  assert.equal(rejected.wave?.cash, 99);
  assert.equal(rejected.units[0]?.activity, 4);
  assert.equal(rejected.units[0]?.asset, 'player_mexican_sleep');
  assert.deepEqual(rejected.events, [{
    type: 'map-unit-hire-rejected',
    unitId: sleepingMexican.id,
    unitType: 'mexican',
    reason: 'insufficient-funds',
    price: 100,
    availableCash: 99,
  }]);
});

test('the original Mexican hire slot wakes in place but remains immobile at its researched speed of zero', async () => {
  const originalMexican = cowGulchContent.units.find((unit) => unit.type === 'mexican' && unit.activity === 4);
  assert.ok(originalMexican);
  assert.equal(originalMexican.hirePrice, 100);
  assert.equal(originalMexican.movementSpeedFinePer100Ms, 0);
  assert.equal(originalMexican.awakeAsset, 'player_mexican');
  assert.equal(originalMexican.weapon?.damage, 500);
  assert.equal(originalMexican.weapon?.damageType, 'heavy');
  assert.equal(originalMexican.weapon?.areaDamageFine, 7680);

  const fundedScenario: ScenarioContent = {
    ...cowGulchContent,
    id: 'mexican-immobile-fixture',
    formalSettlementSupported: false,
    previewWave: { ...cowGulchContent.previewWave!, initialCash: 100 },
    units: [originalMexican],
  };
  const session = await createGame({ scenarios: { [fundedScenario.id]: fundedScenario } }).open({
    scenarioId: fundedScenario.id,
    mode: 'debug',
  });
  session.submitIntent({ type: 'select-at', x: originalMexican.cell.x + 0.5, y: originalMexican.cell.y + 0.25 });
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: originalMexican.id, commandId: 'hire-original-mexican' }), true);
  const hired = session.advance({ deltaMs: 0 });

  assert.equal(hired.wave?.cash, 0);
  assert.equal(hired.units[0]?.activity, 5);
  assert.equal(hired.units[0]?.movementSpeedFinePer100Ms, 0);
  assert.equal(hired.units[0]?.asset, 'player_mexican');
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 12, targetY: 8 }), false);
});

test('applies the Gunslinger special reload after the sixth actual shot', async () => {
  const specialScenario: ScenarioContent = {
    ...combatScenario,
    id: 'gunslinger-special-reload-fixture',
    units: [{
      ...combatScenario.units[0]!,
      weapon: {
        ...combatScenario.units[0]!.weapon!,
        specialReloadTimeMs: 1500,
        specialReloadFrequency: 6,
      },
    }],
    previewWave: {
      ...combatScenario.previewWave!,
      enemy: { ...combatScenario.previewWave!.enemy!, hitPoints: 100000 },
    },
  };
  const session = await createGame({ scenarios: { [specialScenario.id]: specialScenario } }).open({
    scenarioId: specialScenario.id,
  });
  session.submitIntent({ type: 'start-wave' });
  session.advance({ deltaMs: 0 });

  const shots: Array<{ elapsedMs: number; specialReload: boolean }> = [];
  for (let frame = 0; frame < 48; frame += 1) {
    const view = session.advance({ deltaMs: 100 });
    for (const event of view.events) {
      if (event.type === 'unit-fired') shots.push({ elapsedMs: view.elapsedMs, specialReload: event.specialReload });
    }
  }

  assert.deepEqual(shots.map(({ elapsedMs }) => elapsedMs), [300, 800, 1300, 1800, 2300, 2800, 4800]);
  assert.deepEqual(shots.map(({ specialReload }) => specialReload), [false, false, false, false, false, true, false]);
});

test('the original Cow Gulch first wave reaches the Gunslinger special reload through real campaign content', async () => {
  const session = await createGame({ scenarios: { [cowGulchContent.id]: cowGulchContent } }).open({
    scenarioId: cowGulchContent.id,
    mode: 'formal',
    randomSeed: 42,
  });
  assert.equal(session.observe().wave?.phase, 'active');

  let view = session.observe();
  const shots: Array<{ specialReload: boolean }> = [];
  let steps = 0;
  while (view.wave?.number === 1 && view.wave.phase === 'active' && steps < 2000) {
    view = session.advance({ deltaMs: 100 });
    for (const event of view.events) {
      if (event.type === 'unit-fired' && event.unitId === 'gunslinger-1') {
        shots.push({ specialReload: event.specialReload });
      }
    }
    steps += 1;
  }

  assert.equal(view.wave?.number, 2, 'the first real wave clears and advances to wave two');
  assert.ok(shots.length >= 6, 'the active original Gunslinger fires at least six real shots');
  assert.deepEqual(shots.slice(0, 6).map(({ specialReload }) => specialReload), [false, false, false, false, false, true]);
});

test('upgrades a selected Gunslinger once, charges the next-level price, and applies its researched stats', async () => {
  const session = await createGame({ scenarios: { [upgradeScenario.id]: upgradeScenario } }).open({
    scenarioId: upgradeScenario.id,
  });
  assert.equal(session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 }), true);
  session.advance({ deltaMs: 0 });
  const command = { type: 'upgrade-unit', unitId: 'gunslinger-1', commandId: 'upgrade-gunslinger-1' } as const;

  assert.equal(session.submitIntent(command), true);
  assert.equal(session.submitIntent(command), true, 'a duplicate retry is acknowledged without queuing another upgrade');
  const upgraded = session.advance({ deltaMs: 0 });

  assert.equal(upgraded.wave?.cash, 0);
  assert.equal(upgraded.units[0]?.upgradeLevel, 1);
  assert.equal(upgraded.units[0]?.movementSpeedFinePer100Ms, 1750);
  assert.deepEqual(upgraded.units[0]?.weapon, gunslingerUpgradeLevelOne.weapon);
  assert.equal(upgraded.units[0]?.nextUpgrade, undefined, 'the scenario upgrade cap hides later levels');
  assert.deepEqual(upgraded.events, [{
    type: 'unit-upgraded',
    unitId: 'gunslinger-1',
    level: 1,
    price: 25,
  }]);

  assert.equal(session.submitIntent(command), true, 'a retry after processing remains idempotent');
  assert.equal(session.submitIntent({ ...command, commandId: 'upgrade-gunslinger-2' }), false, 'a unit cannot pass the scenario cap');
  const retried = session.advance({ deltaMs: 0 });
  assert.equal(retried.wave?.cash, 0);
  assert.equal(retried.units[0]?.upgradeLevel, 1);
  assert.equal(retried.events.length, 0);

  const positionBeforeMove = retried.units[0]!.positionFine;
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 10, targetY: 8.75 }), true);
  const moved = session.advance({ deltaMs: 100 });
  assert.equal(moved.units[0]?.positionFine.x, positionBeforeMove.x + 1750);
});

test('insufficient upgrade funds leave the unit level, stats, and cash unchanged', async () => {
  const poorScenario: ScenarioContent = {
    ...upgradeScenario,
    id: 'poor-upgrade-fixture',
    previewWave: { ...upgradeScenario.previewWave!, initialCash: 24 },
  };
  const session = await createGame({ scenarios: { [poorScenario.id]: poorScenario } }).open({
    scenarioId: poorScenario.id,
  });
  session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  session.advance({ deltaMs: 0 });

  assert.equal(session.submitIntent({ type: 'upgrade-unit', unitId: 'gunslinger-1', commandId: 'too-poor' }), true);
  const rejected = session.advance({ deltaMs: 0 });

  assert.equal(rejected.wave?.cash, 24);
  assert.equal(rejected.units[0]?.upgradeLevel, 0);
  assert.equal(rejected.units[0]?.movementSpeedFinePer100Ms, 1500);
  assert.equal(rejected.units[0]?.weapon?.reloadTimeMs, 500);
  assert.deepEqual(rejected.events, [{
    type: 'unit-upgrade-rejected',
    unitId: 'gunslinger-1',
    reason: 'insufficient-funds',
    price: 25,
    availableCash: 24,
  }]);
});

test('the original Cow Gulch cap prevents upgrades even though the Gunslinger has later level data', async () => {
  const session = await createGame({ scenarios: { [cowGulchContent.id]: cowGulchContent } }).open({
    scenarioId: cowGulchContent.id,
  });
  session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  const selected = session.advance({ deltaMs: 0 });

  assert.equal(cowGulchContent.maxUpgrades, 0);
  assert.equal(selected.units[0]?.upgradeLevel, 0);
  assert.equal(selected.units[0]?.nextUpgrade, undefined);
  assert.equal(session.submitIntent({ type: 'upgrade-unit', unitId: 'gunslinger-1', commandId: 'blocked-by-level-cap' }), false);
});

test('the upgraded Gunslinger fires on the researched faster reload while the base level is still cooling down', async () => {
  const upgraded = await createGame({ scenarios: { [upgradeScenario.id]: upgradeScenario } }).open({
    scenarioId: upgradeScenario.id,
  });
  upgraded.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  upgraded.advance({ deltaMs: 0 });
  upgraded.submitIntent({ type: 'upgrade-unit', unitId: 'gunslinger-1', commandId: 'reload-upgrade' });
  upgraded.advance({ deltaMs: 0 });
  upgraded.submitIntent({ type: 'start-wave' });
  upgraded.advance({ deltaMs: 0 });
  upgraded.advance({ deltaMs: 100 });
  assert.equal(upgraded.observe().events.some((event) => event.type === 'enemy-hit'), false);
  const upgradedShot = upgraded.advance({ deltaMs: 100 });
  assert.equal(upgradedShot.shots.length, 1, 'the upgraded cooldown expires at 200 ms and creates a shot');

  const baseScenario: ScenarioContent = { ...upgradeScenario, id: 'base-reload-fixture', maxUpgrades: 0 };
  const base = await createGame({ scenarios: { [baseScenario.id]: baseScenario } }).open({ scenarioId: baseScenario.id });
  base.submitIntent({ type: 'start-wave' });
  base.advance({ deltaMs: 0 });
  base.advance({ deltaMs: 100 });
  const baseCooling = base.advance({ deltaMs: 100 });
  assert.equal(baseCooling.shots.length, 0, 'the base cooldown still has 50 ms remaining at 200 ms');
});

test('publishes the exact read-only attack origin and exclusive radius used by targeting', async () => {
  const session = await createGame({ scenarios: { fixture: combatScenario } }).open({ scenarioId: 'fixture' });
  const attackRange = session.observe().units[0]?.attackRange;

  assert.deepEqual(attackRange, {
    centerTenthTiles: { x: 85, y: 82 },
    maximumTenthTiles: 50,
    boundary: 'exclusive',
  });
  assert.equal(Object.isFrozen(attackRange), true);
  assert.equal(Object.isFrozen(attackRange?.centerTenthTiles), true);
});

test('selects a unit only inside its hit area and clears selection on empty ground', async () => {
  const session = await createGame({ scenarios: { fixture: scenario } }).open({ scenarioId: 'fixture' });

  assert.equal(session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 }), true);
  const selected = session.advance();
  assert.equal(selected.units[0]?.selected, true);
  assert.equal(selected.frame, 1);

  assert.equal(session.submitIntent({ type: 'select-at', x: 1.5, y: 1.5 }), true);
  const cleared = session.advance();
  assert.equal(cleared.units[0]?.selected, false);
  assert.equal(cleared.frame, 2);
});

test('moves the selected unit at its configured speed and stops on release', async () => {
  const session = await createGame({ scenarios: { fixture: scenario } }).open({ scenarioId: 'fixture' });
  session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  session.advance({ deltaMs: 0 });

  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 12, targetY: 8.75 }), true);
  const moved = session.advance({ deltaMs: 100 });
  assert.deepEqual(moved.units[0]?.positionFine, { x: (8 * 7680) + 3840 + 1500, y: (8 * 7680) + 3840 + 1920 });
  assert.equal(moved.units[0]?.moving, true);
  assert.equal(moved.units[0]?.cell.x, 8);
  assert.equal(moved.units[0]?.render.x, 8 + (1500 / 7680));

  assert.equal(session.submitIntent({ type: 'stop-moving' }), true);
  const stopped = session.advance({ deltaMs: 100 });
  assert.deepEqual(stopped.units[0]?.positionFine, moved.units[0]?.positionFine);
  assert.equal(stopped.units[0]?.moving, false);
});

test('rejects movement unless its target unit is selected and the coordinates are finite', async () => {
  const session = await createGame({ scenarios: { fixture: scenario } }).open({ scenarioId: 'fixture' });
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 9, targetY: 9 }), false);
  session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  session.advance({ deltaMs: 0 });

  assert.equal(session.submitIntent({ type: 'move-unit', targetX: Number.POSITIVE_INFINITY, targetY: 9 }), false);
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 9, targetY: 9 }), true);
  session.submitIntent({ type: 'clear-selection' });
  const cleared = session.advance({ deltaMs: 100 });
  assert.equal(cleared.units[0]?.selected, false);
  assert.equal(cleared.units[0]?.moving, false);
  assert.deepEqual(cleared.units[0]?.positionFine, { x: (8 * 7680) + 3840, y: (8 * 7680) + 3840 + 1920 });
});

test('blocks the original collision terrain and slides along it one axis at a time', async () => {
  const originalTileGrid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0));
  originalTileGrid[1]![2] = 32;
  const wallScenario: ScenarioContent = {
    id: 'wall-fixture',
    title: { en: 'Wall', zh: '墙体' },
    map: { width: 4, height: 4, tileSize: 32, background: [], streets: [] },
    originalTileGrid,
    units: [{
      ...scenario.units[0]!,
      cell: { x: 1, y: 1 },
      render: { x: 1, y: 0.625, width: 1, height: 1.375 },
      hitArea: { x: 1, y: 0.625, width: 1, height: 1.375 },
    }],
  };
  const session = await createGame({ scenarios: { [wallScenario.id]: wallScenario } }).open({ scenarioId: wallScenario.id });
  session.submitIntent({ type: 'select-at', x: 1.5, y: 1 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'move-unit', targetX: 3.5, targetY: 3.5 });

  let view = session.advance({ deltaMs: 100 });
  view = session.advance({ deltaMs: 100 });
  assert.ok(view.units[0]!.positionFine.x / 7680 < 1.67, 'the collider cannot enter raw wall tile 32');
  assert.ok(view.units[0]!.positionFine.y > (1.75 * 7680), 'vertical motion slides while horizontal motion is blocked');
});

test('blocks movement against the original static decoration collision boxes', async () => {
  const cases = [
    {
      id: 'decoration-collision-fixture',
      code: 76,
      unitCell: { x: 1, y: 1 },
      decoration: {
        asset: 'e_1x1_bush',
        cell: { x: 2, y: 1 },
        collisionBoxFine: { x: 1920, y: -1228, width: 3840, height: 2534 },
      },
    },
    {
      id: 'skeleton-collision-fixture',
      code: 77,
      unitCell: { x: 1, y: 1 },
      decoration: {
        asset: 'e_1x2_bones',
        cell: { x: 2, y: 1 },
        collisionBoxFine: { x: 0, y: -9600, width: 7680, height: 11520 },
      },
    },
    {
      id: 'shack-collision-fixture',
      code: 116,
      unitCell: { x: 0, y: 1 },
      decoration: {
        asset: 'b_2x1_shack',
        cell: { x: 2, y: 1 },
        collisionBoxFine: { x: -3840, y: -1228, width: 15360, height: 3840 },
      },
    },
  ];

  for (const collisionCase of cases) {
    const originalTileGrid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0));
    originalTileGrid[collisionCase.decoration.cell.y]![collisionCase.decoration.cell.x] = collisionCase.code;
    const cell = collisionCase.unitCell;
    const objectScenario: ScenarioContent = {
      id: collisionCase.id,
      title: { en: collisionCase.id, zh: collisionCase.id },
      map: {
        width: 4,
        height: 4,
        tileSize: 32,
        background: [],
        streets: [],
        decorations: [collisionCase.decoration],
      },
      originalTileGrid,
      units: [{
        ...scenario.units[0]!,
        cell,
        render: { x: cell.x, y: cell.y - 0.375, width: 1, height: 1.375 },
        hitArea: { x: cell.x, y: cell.y - 0.375, width: 1, height: 1.375 },
      }],
    };
    const session = await createGame({ scenarios: { [objectScenario.id]: objectScenario } })
      .open({ scenarioId: objectScenario.id });
    session.submitIntent({ type: 'select-at', x: cell.x + 0.5, y: cell.y + 0.5 });
    session.advance({ deltaMs: 0 });
    session.submitIntent({ type: 'move-unit', targetX: 3.5, targetY: 1.5 });

    let view = session.advance({ deltaMs: 100 });
    for (let frame = 0; frame < 19; frame += 1) view = session.advance({ deltaMs: 100 });

    const unitRight = view.units[0]!.positionFine.x + 2534;
    const decorationLeft = (collisionCase.decoration.cell.x * 7680) + collisionCase.decoration.collisionBoxFine.x;
    assert.ok(
      unitRight <= decorationLeft,
      `${collisionCase.id}: the unit stops before overlapping the original static-object collider`,
    );
    if (collisionCase.id === 'shack-collision-fixture') {
      assert.ok(view.units[0]!.positionFine.x > (cell.x * 7680) + 3840,
        'the shack collider blocks the unit at its original edge while allowing approach');
    }
  }
});

test('keeps the full Gunslinger sprite inside the map texture at its outer edges', async () => {
  const edgeTargets = [
    { name: 'left', x: 0, y: 8.75 },
    { name: 'right', x: 17, y: 8.75 },
    { name: 'top', x: 8.5, y: 0 },
    { name: 'bottom', x: 8.5, y: 17 },
  ];

  for (const target of edgeTargets) {
    const session = await createGame({ scenarios: { fixture: scenario } }).open({ scenarioId: 'fixture' });
    session.submitIntent({ type: 'select-at', x: 8.5, y: 8.75 });
    session.advance({ deltaMs: 0 });
    session.submitIntent({ type: 'move-unit', targetX: target.x, targetY: target.y });

    let view = session.advance({ deltaMs: 0 });
    let stableFrames = 0;
    let previousPosition = view.units[0]!.positionFine;
    for (let index = 0; index < 600 && stableFrames < 5; index += 1) {
      view = session.advance({ deltaMs: 100 });
      const position = view.units[0]!.positionFine;
      stableFrames = position.x === previousPosition.x && position.y === previousPosition.y
        ? stableFrames + 1
        : 0;
      previousPosition = position;
    }

    const unit = view.units[0]!;
    assert.ok(unit.render.x >= 0, `${target.name}: sprite must not cross the left map edge`);
    assert.ok(unit.render.y >= 0, `${target.name}: sprite must not cross the top map edge`);
    assert.ok(unit.render.x + unit.render.width <= view.map.width,
      `${target.name}: sprite must not cross the right map edge`);
    assert.ok(unit.render.y + unit.render.height <= view.map.height,
      `${target.name}: sprite must not cross the bottom map edge`);
  }
});

test('treats a researched street overlay as walkable over blocking canyon terrain', async () => {
  const originalTileGrid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0));
  originalTileGrid[1]![2] = 80;
  const bridgeScenario: ScenarioContent = {
    id: 'bridge-fixture',
    title: { en: 'Bridge', zh: '桥' },
    map: { width: 4, height: 4, tileSize: 32, background: [], streets: [] },
    originalTileGrid,
    units: [{
      ...scenario.units[0]!,
      cell: { x: 1, y: 1 },
      render: { x: 1, y: 0.625, width: 1, height: 1.375 },
      hitArea: { x: 1, y: 0.625, width: 1, height: 1.375 },
    }],
  };
  const session = await createGame({ scenarios: { [bridgeScenario.id]: bridgeScenario } }).open({ scenarioId: bridgeScenario.id });
  session.submitIntent({ type: 'select-at', x: 1.5, y: 1 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'move-unit', targetX: 3.5, targetY: 1.75 });

  let view = session.advance({ deltaMs: 100 });
  for (let index = 0; index < 12; index += 1) view = session.advance({ deltaMs: 100 });
  assert.ok(view.units[0]!.positionFine.x / 7680 > 2, 'street tile 80 is not blocked by its background collision code');
});

test('keeps the same movement result for the same intents and frame sequence', async () => {
  const run = async () => {
    const session = await createGame({ scenarios: { fixture: scenario } }).open({ scenarioId: 'fixture', randomSeed: 7 });
    session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
    session.advance({ deltaMs: 0 });
    session.submitIntent({ type: 'move-unit', targetX: 12, targetY: 9.75 });
    return Array.from({ length: 8 }, () => session.advance({ deltaMs: 100 }).units[0]?.positionFine);
  };
  const first = await run();
  assert.ok(first.at(-1)!.x !== (8 * 7680) + 3840, 'the deterministic run actually moves the unit');
  assert.deepEqual(first, await run());
});

test('rejects malformed coordinates without enqueuing a command', async () => {
  const session = await createGame({ scenarios: { fixture: scenario } }).open({ scenarioId: 'fixture' });

  assert.equal(session.submitIntent({ type: 'select-at', x: Number.NaN, y: 0 }), false);
  assert.equal(session.observe().frame, 0);
  assert.equal(session.advance().frame, 1);
});

test('keeps sessions independent and rejects unknown scenarios', async () => {
  const game = createGame({ scenarios: { fixture: scenario } });
  const first = await game.open({ scenarioId: 'fixture' });
  const second = await game.open({ scenarioId: 'fixture' });

  first.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  first.advance();
  assert.equal(first.observe().units[0]?.selected, true);
  assert.equal(second.observe().units[0]?.selected, false);
  await assert.rejects(() => game.open({ scenarioId: 'missing' }), /unknown scenario/i);
});

test('does not create the controlled wave until the start intent advances', async () => {
  const session = await createGame({ scenarios: { 'cow-gulch': cowGulchP1aSampleContent } }).open({
    scenarioId: 'cow-gulch',
    randomSeed: 1234,
  });
  const before = session.observe();

  assert.equal(before.wave?.phase, 'not-started');
  assert.equal(before.enemies.length, 0);
  assert.equal(before.wave?.lives, 50);
  assert.equal(session.submitIntent({ type: 'start-wave' }), true);
  assert.equal(session.observe().enemies.length, 0);

  const started = session.advance({ deltaMs: 1000 });
  assert.equal(started.wave?.phase, 'active');
  assert.equal(started.enemies.length, 1);
  assert.deepEqual(started.enemies[0]?.positionFine, { x: -11520, y: 80640 });
  assert.equal(started.enemies[0]?.speed, 490, 'seed 1234 uses Java Random nextInt(20) = 8');
  assert.equal(started.wave?.lives, 50);
  assert.equal(session.startRecord.randomSeed, 1234);

  const moved = session.advance({ deltaMs: 1000 });
  assert.equal(moved.enemies[0]?.positionFine.x, -11520 + started.enemies[0]!.speed);
  assert.equal(moved.elapsedMs, 200);
});

test('the first in-range Desperado shot follows its target, deals damage, kills once, and awards its cash once', async () => {
  const session = await createGame({ scenarios: { [combatScenario.id]: combatScenario } }).open({
    scenarioId: combatScenario.id,
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });

  assert.equal(view.wave?.cash, 65);
  assert.equal(view.enemies[0]?.hitPoints, 126);
  view = advanceFor(session, 249);
  assert.equal(view.shots.length, 0, 'the first shot waits for the initial half-reload cooldown');
  assert.equal(view.enemies[0]?.hitPoints, 126);

  view = session.advance({ deltaMs: 1 });
  assert.equal(view.shots.length, 1);
  assert.equal(view.shots[0]?.targetId, 'preview-pioneer-1');
  assert.equal(view.shots[0]?.remainingMs, 399, 'the projectile advances in its firing frame');

  view = advanceFor(session, 398);
  assert.equal(view.enemies[0]?.hitPoints, 126);
  assert.equal(view.wave?.cash, 65);
  view = session.advance({ deltaMs: 1 });
  assert.equal(view.shots.length, 0);
  assert.equal(view.enemies[0]?.hitPoints, -14, 'the recovered damage rule subtracts the full integer damage');
  assert.equal(view.enemies[0]?.alive, false);
  assert.equal(view.wave?.cash, 66);
  assert.equal(view.wave?.defeatedEnemies, 1);
  assert.deepEqual(view.events, [
    { type: 'enemy-hit', enemyId: 'preview-pioneer-1', damage: 140, hitPoints: -14 },
    { type: 'enemy-defeated', enemyId: 'preview-pioneer-1', cashReward: 1 },
  ]);

  for (let index = 0; index < 10; index += 1) view = session.advance({ deltaMs: 100 });
  assert.equal(view.wave?.cash, 66, 'a dead enemy cannot pay twice');
  assert.equal(view.wave?.defeatedEnemies, 1);
  assert.equal(view.wave?.phase, 'complete');
});

test('the Mexican dynamite hits inside the strict one-tile radius and leaves boundary targets unharmed', async () => {
  const mexicanScenario: ScenarioContent = {
    ...combatScenario,
    id: 'mexican-area-fixture',
    units: [{
      ...combatScenario.units[0]!,
      type: 'mexican',
      weapon: {
        ...combatScenario.units[0]!.weapon!,
        damage: 500,
        damageType: 'heavy',
        reloadTimeMs: 500,
        projectileSpeed: 1500,
        damageStyle: 3,
        areaDamageFine: 7680,
      },
    }],
    previewWave: {
      ...combatScenario.previewWave!,
      spawn: { cell: { x: 11, y: 8 }, direction: 'east' },
      additionalSpawns: [
        { cell: { x: 11.4, y: 8 }, direction: 'east' },
        { cell: { x: 12, y: 8 }, direction: 'east' },
        { cell: { x: 12.1, y: 8 }, direction: 'east' },
      ],
      enemy: { ...combatScenario.previewWave!.enemy!, hitPoints: 100, penetration: {
        ...combatScenario.previewWave!.enemy!.penetration,
        heavy: 100,
      } },
    },
  };
  const session = await createGame({ scenarios: { [mexicanScenario.id]: mexicanScenario } }).open({
    scenarioId: mexicanScenario.id,
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  session.advance({ deltaMs: 0 });
  advanceFor(session, 300);
  const view = session.advance({ deltaMs: 100 });

  assert.deepEqual(view.events.filter((event) => event.type === 'shot-exploded'), [{
    type: 'shot-exploded',
    shotId: 'preview-shot-1',
    targetId: 'preview-pioneer-1',
    affectedEnemyIds: ['preview-pioneer-1', 'preview-pioneer-2'],
  }]);
  assert.equal(view.enemies[0]?.alive, false);
  assert.equal(view.enemies[1]?.alive, false);
  assert.equal(view.enemies[2]?.alive, true, 'the target exactly one tile away is outside the strict radius');
  assert.equal(view.enemies[3]?.alive, true, 'the target beyond the radius remains unharmed');
  assert.equal(view.wave?.cash, 67, 'each killed enemy pays exactly once');
  assert.equal(view.shots[0]?.imageAsset, 'sfx_mexican_dynamite');
  assert.equal(view.shots[0]?.explosionRemainingMs, 799);
  assert.deepEqual(view.units[0]?.shootingAnimation, {
    asset: 'player_mexican_shot',
    frame: 0,
    row: 0,
    mirrored: true,
  });
  assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_dynamite'));
});

test('does not attack at or beyond the strict outer range boundary', async () => {
  const outOfRangeScenario: ScenarioContent = {
    ...combatScenario,
    id: 'out-of-range-fixture',
    previewWave: {
      ...combatScenario.previewWave!,
      spawn: { cell: { x: 15, y: 8 }, direction: 'east' },
    },
  };
  const session = await createGame({ scenarios: { [outOfRangeScenario.id]: outOfRangeScenario } }).open({
    scenarioId: outOfRangeScenario.id,
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  for (let index = 0; index < 10; index += 1) view = session.advance({ deltaMs: 100 });

  assert.equal(view.shots.length, 0);
  assert.equal(view.enemies[0]?.hitPoints, 126);
  assert.equal(view.wave?.cash, 65);
});

test('truncates damage percent multiplication toward zero and keeps equal-score targets in enemy order', async () => {
  const fractionalScenario: ScenarioContent = {
    ...combatScenario,
    id: 'fractional-damage-fixture',
    units: [{
      ...combatScenario.units[0]!,
      weapon: { ...combatScenario.units[0]!.weapon!, damage: 141 },
    }],
    previewWave: {
      ...combatScenario.previewWave!,
      additionalSpawns: [{ cell: { x: 14, y: 8 }, direction: 'east' }],
      enemy: { ...combatScenario.previewWave!.enemy!, hitPoints: 80, penetration: {
        ...combatScenario.previewWave!.enemy!.penetration,
        light: 50,
      } },
    },
  };
  const session = await createGame({ scenarios: { [fractionalScenario.id]: fractionalScenario } }).open({
    scenarioId: fractionalScenario.id,
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  session.advance({ deltaMs: 0 });
  advanceFor(session, 249);
  const fired = session.advance({ deltaMs: 1 });
  assert.equal(fired.shots[0]?.targetId, 'preview-pioneer-1', 'strict greater-than keeps the first equal-score enemy');

  advanceFor(session, 398);
  const hit = session.advance({ deltaMs: 1 });
  assert.equal(hit.enemies[0]?.hitPoints, 10, '141 × 50 / 100 truncates to 70 damage');
  assert.equal(hit.enemies[1]?.hitPoints, 80, 'the tied second enemy remains untouched');
  assert.equal(hit.wave?.cash, 65, 'nonlethal damage awards no money');
  assert.deepEqual(hit.events, [
    { type: 'enemy-hit', enemyId: 'preview-pioneer-1', damage: 70, hitPoints: 10 },
  ]);
});

test('the researched Cow Gulch sample is killed before escape and pays its configured reward', async () => {
  const run = async () => {
    const session = await createGame({ scenarios: { 'cow-gulch': formalPreviewCowGulch } }).open({
      scenarioId: 'cow-gulch',
      randomSeed: 1234,
    });
    session.submitIntent({ type: 'start-wave' });
    let view = session.advance({ deltaMs: 0 });
    let steps = 0;
    while (steps < 2000 && view.wave?.phase === 'active') {
      view = session.advance({ deltaMs: 100 });
      steps += 1;
    }
    return { view, steps };
  };
  const first = await run();
  const replay = await run();
  const { view } = first;

  assert.deepEqual(first, replay, 'the same start record and time inputs replay the same combat');
  assert.ok(first.steps < 2000, 'the controlled sample reaches a terminal state');

  assert.equal(view.wave?.phase, 'complete');
  assert.equal(view.wave?.lives, 50);
  assert.equal(view.wave?.escapedEnemies, 0);
  assert.equal(view.wave?.defeatedEnemies, 1);
  assert.equal(view.wave?.cash, 66);
});

test('replays the Cow Gulch preview and applies the escape penalty exactly once', async () => {
  const run = async () => {
    const session = await createGame({ scenarios: { 'cow-gulch': noCombatCowGulch } }).open({
      scenarioId: 'cow-gulch',
      randomSeed: 42,
    });
    session.submitIntent({ type: 'start-wave' });
    let view = session.advance({ deltaMs: 0 });
    let steps = 0;
    while (view.wave?.phase === 'active' && steps < 2000) {
      view = session.advance({ deltaMs: 100 });
      steps += 1;
    }
    return { view, steps };
  };

  const first = await run();
  const replay = await run();

  assert.ok(first.steps < 2000, 'the controlled enemy should reach the Cow Gulch exit');
  assert.deepEqual(first, replay);
  assert.equal(first.view.wave?.phase, 'complete');
  assert.equal(first.view.wave?.lives, 49);
  assert.equal(first.view.wave?.escapedEnemies, 1);
  assert.equal(first.view.enemies.length, 0);

  const session = await createGame({ scenarios: { 'cow-gulch': noCombatCowGulch } }).open({ scenarioId: 'cow-gulch', randomSeed: 42 });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  for (let index = 0; index < 2000 && view.wave?.phase !== 'complete'; index += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  const after = session.advance({ deltaMs: 100 });
  assert.equal(after.wave?.lives, 49);
  assert.equal(after.wave?.escapedEnemies, 1);
});

test('keeps the pioneer inside the TDM route cells from spawn through the exit', async () => {
  const definition = cowGulchPreviewWave;
  const waypoints = [definition.spawn.cell, ...definition.redirects.map(({ cell }) => cell), definition.exit];
  const routeCells = new Set<string>();

  for (let index = 1; index < waypoints.length; index += 1) {
    const from = waypoints[index - 1]!;
    const to = waypoints[index]!;
    const stepX = Math.sign(to.x - from.x);
    const stepY = Math.sign(to.y - from.y);
    let x = from.x;
    let y = from.y;
    while (true) {
      routeCells.add(`${x},${y}`);
      if (x === to.x && y === to.y) break;
      x += stepX;
      y += stepY;
    }
  }

  const session = await createGame({ scenarios: { 'cow-gulch': noCombatCowGulch } }).open({
    scenarioId: 'cow-gulch',
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });

  for (let step = 0; step < 2000 && view.wave?.phase === 'active'; step += 1) {
    const enemy = view.enemies[0];
    if (enemy) {
      const x = Math.floor(enemy.positionFine.x / 7680);
      const y = Math.floor(enemy.positionFine.y / 7680);
      if (x >= 0 && x < cowGulchContent.map.width && y >= 0 && y < cowGulchContent.map.height) {
        assert.ok(routeCells.has(`${x},${y}`), `enemy must stay on the TDM route at (${x}, ${y})`);
      }
    }
    view = session.advance({ deltaMs: 100 });
  }

  assert.equal(view.wave?.phase, 'complete', 'the sample should leave the map through its TDM exit');
});

test('observing a running wave does not advance time, position, or its random stream', async () => {
  const createSession = () => createGame({ scenarios: { 'cow-gulch': noCombatCowGulch } })
    .open({ scenarioId: 'cow-gulch', randomSeed: 9876 });
  const observed = await createSession();
  const control = await createSession();

  for (const session of [observed, control]) {
    session.submitIntent({ type: 'start-wave' });
    session.advance({ deltaMs: 0 });
  }
  for (let index = 0; index < 50; index += 1) observed.observe();

  assert.deepEqual(observed.advance({ deltaMs: 37 }), control.advance({ deltaMs: 37 }));
  assert.deepEqual(observed.advance({ deltaMs: 100 }), control.advance({ deltaMs: 100 }));
});

test('pausing freezes frames and rejects new intents until resume without catching up elapsed time', async () => {
  const createSession = () => createGame({ scenarios: { 'cow-gulch': noCombatCowGulch } })
    .open({ scenarioId: 'cow-gulch', randomSeed: 9876 });
  const paused = await createSession();
  const control = await createSession();

  for (const session of [paused, control]) {
    session.submitIntent({ type: 'start-wave' });
    session.advance({ deltaMs: 0 });
    session.advance({ deltaMs: 37 });
  }
  const beforePause = control.observe();

  const pausedView = paused.pause();
  assert.equal(pausedView.paused, true);
  assert.equal(pausedView.frame, beforePause.frame);
  assert.equal(pausedView.elapsedMs, beforePause.elapsedMs);
  assert.equal(paused.submitIntent({ type: 'select-at', x: 0, y: 0 }), false);
  assert.deepEqual(paused.advance({ deltaMs: 1000 }), pausedView);
  assert.deepEqual(paused.observe(), pausedView);
  assert.deepEqual(paused.pause(), pausedView, 'repeated pause requests are idempotent');

  const resumedView = paused.resume();
  assert.equal(resumedView.paused, false);
  assert.equal(resumedView.frame, beforePause.frame);
  assert.equal(resumedView.elapsedMs, beforePause.elapsedMs);
  assert.deepEqual(paused.advance({ deltaMs: 37 }), control.advance({ deltaMs: 37 }));
});

test('single-stepping advances exactly one ordinary frame and remains paused', async () => {
  const createSession = () => createGame({ scenarios: { 'cow-gulch': noCombatCowGulch } })
    .open({ scenarioId: 'cow-gulch', randomSeed: 9876 });
  const stepped = await createSession();
  const control = await createSession();

  for (const session of [stepped, control]) {
    session.submitIntent({ type: 'start-wave' });
    session.advance({ deltaMs: 0 });
    session.advance({ deltaMs: 37 });
    session.pause();
  }
  for (let index = 0; index < 20; index += 1) stepped.observe();
  const before = stepped.observe();

  const after = stepped.singleStep({ deltaMs: 37 });
  assert.equal(after.frame, before.frame + 1);
  assert.equal(after.elapsedMs, before.elapsedMs + 37);
  assert.equal(after.paused, true);

  control.resume();
  assert.throws(() => control.singleStep(), /paused/);
  control.advance({ deltaMs: 37 });
  control.pause();
  assert.deepEqual(after, control.observe(), 'single-step follows the same rule and random path as normal advance');
});

test('keeps preview waves and random streams isolated between sessions', async () => {
  const game = createGame({ scenarios: { 'cow-gulch': noCombatCowGulch } });
  const first = await game.open({ scenarioId: 'cow-gulch', randomSeed: 77 });
  const second = await game.open({ scenarioId: 'cow-gulch', randomSeed: 77 });

  first.submitIntent({ type: 'start-wave' });
  const firstStarted = first.advance({ deltaMs: 0 });
  assert.equal(second.observe().wave?.phase, 'not-started');
  assert.equal(second.observe().enemies.length, 0);

  second.submitIntent({ type: 'start-wave' });
  const secondStarted = second.advance({ deltaMs: 0 });
  assert.deepEqual(firstStarted, secondStarted);
  assert.deepEqual(first.advance({ deltaMs: 37 }), second.advance({ deltaMs: 37 }));
});

test('follows the first Cow Gulch redirect and clamps variable time to the original 100 ms bound', async () => {
  const session = await createGame({ scenarios: { 'cow-gulch': noCombatCowGulch } }).open({
    scenarioId: 'cow-gulch',
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  const startX = view.enemies[0]!.positionFine.x;

  view = session.advance({ deltaMs: 0.9 });
  assert.equal(view.enemies[0]!.positionFine.x, startX, 'sub-millisecond time truncates to zero');

  const variableSession = await createGame({ scenarios: { 'cow-gulch': noCombatCowGulch } }).open({
    scenarioId: 'cow-gulch',
    randomSeed: 1234,
  });
  variableSession.submitIntent({ type: 'start-wave' });
  const variableStart = variableSession.advance({ deltaMs: 0 });
  const variableSpeed = variableStart.enemies[0]!.speed;
  const variableStartX = variableStart.enemies[0]!.positionFine.x;
  const expectedAfter37 = Math.trunc(Math.fround(
    variableStartX + Math.fround((variableSpeed * 37) / 100),
  ));
  const after37 = variableSession.advance({ deltaMs: 37 });
  assert.equal(after37.enemies[0]!.positionFine.x, expectedAfter37);
  const expectedAfter100 = Math.trunc(Math.fround(
    expectedAfter37 + Math.fround((variableSpeed * 63) / 100),
  ));
  const after100 = variableSession.advance({ deltaMs: 63 });
  assert.equal(after100.enemies[0]!.positionFine.x, expectedAfter100);
  assert.equal(after100.enemies[0]!.positionFine.x - variableStartX, 491);

  let steps = 0;
  while (view.enemies[0]?.direction === 'east' && steps < 1000) {
    view = session.advance({ deltaMs: 100 });
    steps += 1;
  }
  assert.ok(steps < 1000, 'enemy should reach the first route redirect');
  assert.equal(view.enemies[0]?.direction, 'south');
  assert.equal(Math.trunc(view.enemies[0]!.positionFine.x / 7680), 4);
  assert.deepEqual(view.enemies[0]?.positionFine, {
    x: (4 * 7680) + 3840,
    y: (10 * 7680) + 3840 + 2,
  }, 'the redirect snaps to the native field center before continuing');

  const before = view.enemies[0]!.positionFine.y;
  view = session.advance({ deltaMs: 1000 });
  assert.equal(view.enemies[0]!.positionFine.y - before, view.enemies[0]!.speed);
});

test('does not snap an enemy back when a route marker keeps its current direction', async () => {
  const sameDirectionScenario: ScenarioContent = {
    ...noCombatCowGulch,
    id: 'same-direction-marker',
    previewWave: {
      ...cowGulchContent.previewWave!,
      redirects: [{ cell: { x: 4, y: 10 }, directions: ['east'] }],
    },
  };
  const session = await createGame({ scenarios: { [sameDirectionScenario.id]: sameDirectionScenario } }).open({
    scenarioId: sameDirectionScenario.id,
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  const center = (4 * 7680) + 3840;
  let crossed = false;

  for (let step = 0; step < 1000; step += 1) {
    const previousX = view.enemies[0]!.positionFine.x;
    view = session.advance({ deltaMs: 100 });
    const enemy = view.enemies[0]!;
    if (previousX < center && enemy.positionFine.x > center) {
      assert.equal(enemy.direction, 'east');
      assert.equal(enemy.positionFine.x, previousX + enemy.speed);
      assert.ok(enemy.positionFine.x > center + 2, 'same-direction markers do not reset the fine position');
      crossed = true;
      break;
    }
  }

  assert.equal(crossed, true, 'enemy reaches the same-direction route marker');
});

test('follows every Cow Gulch route turn at its native field center', async () => {
  const expectedTurns = [
    { direction: 'south', cell: { x: 4, y: 10 } },
    { direction: 'east', cell: { x: 4, y: 13 } },
    { direction: 'north', cell: { x: 12, y: 13 } },
    { direction: 'west', cell: { x: 12, y: 6 } },
    { direction: 'north', cell: { x: 9, y: 6 } },
    { direction: 'east', cell: { x: 9, y: 2 } },
    { direction: 'south', cell: { x: 12, y: 2 } },
    { direction: 'east', cell: { x: 12, y: 3 } },
  ] as const;
  const session = await createGame({ scenarios: { 'cow-gulch': noCombatCowGulch } }).open({
    scenarioId: 'cow-gulch',
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  let nextTurnIndex = 0;

  for (let step = 0; step < 2000 && view.wave?.phase === 'active'; step += 1) {
    view = session.advance({ deltaMs: 100 });
    const enemy = view.enemies[0];
    if (!enemy) continue;

    const expected = expectedTurns[nextTurnIndex];
    if (!expected) continue;
    const vector = {
      east: { x: 1, y: 0 },
      south: { x: 0, y: 1 },
      west: { x: -1, y: 0 },
      north: { x: 0, y: -1 },
    }[expected.direction];
    const expectedPosition = {
      x: (expected.cell.x * 7680) + 3840 + (vector.x * 2),
      y: (expected.cell.y * 7680) + 3840 + (vector.y * 2),
    };
    if (enemy.positionFine.x === expectedPosition.x && enemy.positionFine.y === expectedPosition.y) {
      assert.equal(enemy.direction, expected.direction);
      nextTurnIndex += 1;
    }
  }

  assert.equal(view.wave?.phase, 'complete');
  assert.equal(nextTurnIndex, expectedTurns.length);
});

test('settles a cleared wave as victory and scores displayed and saved values independently', async () => {
  const scoredWave = Object.assign({}, combatScenario.previewWave, { difficultyScorePercent: 75 });
  const scoredScenario: ScenarioContent = { ...combatScenario, previewWave: scoredWave };
  const session = await createGame({ scenarios: { [scoredScenario.id]: scoredScenario } }).open({
    scenarioId: scoredScenario.id,
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });

  for (let step = 0; step < 100 && view.wave?.phase === 'active'; step += 1) {
    view = session.advance({ deltaMs: 100 });
  }

  assert.equal(view.wave?.phase, 'complete');
  const settlement = (view.wave as unknown as {
    settlement?: {
      outcome: string;
      scoreBase: number;
      displayScore: number;
      highScoreCandidate: number;
    };
  }).settlement;
  assert.deepEqual(settlement, {
    outcome: 'victory',
    scoreBase: 67,
    displayScore: 50,
    highScoreCandidate: 50,
  });
  assert.equal(view.wave?.cash, 66);
  assert.equal(view.wave?.defeatedEnemies, 1);
  assert.equal((view.events as unknown as readonly { type: string }[]).filter((event) => event.type === 'wave-settled').length, 1);
});

test('settles zero lives as defeat before wave clear and does not advance or replay settlement afterward', async () => {
  const defeatWave = Object.assign({}, cowGulchPreviewWave, {
    initialLives: 1,
    difficultyScorePercent: 75,
  });
  const defeatScenario: ScenarioContent = {
    ...noCombatCowGulch,
    id: 'cow-gulch-defeat-fixture',
    previewWave: defeatWave,
  };
  const session = await createGame({ scenarios: { [defeatScenario.id]: defeatScenario } }).open({
    scenarioId: defeatScenario.id,
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });

  for (let step = 0; step < 2000 && view.wave?.phase === 'active'; step += 1) {
    view = session.advance({ deltaMs: 100 });
  }

  assert.equal(view.wave?.phase, 'complete');
  assert.equal(view.wave?.lives, 0);
  const settlement = (view.wave as unknown as {
    settlement?: {
      outcome: string;
      scoreBase: number;
      displayScore: number;
      highScoreCandidate: number;
    };
  }).settlement;
  assert.deepEqual(settlement, {
    outcome: 'defeat',
    scoreBase: 65,
    displayScore: 49,
    highScoreCandidate: 48,
  });
  assert.equal((view.events as unknown as readonly { type: string }[]).filter((event) => event.type === 'wave-settled').length, 1);

  const settledFrame = view.frame;
  assert.equal(session.submitIntent({ type: 'clear-selection' }), false);
  const afterSettlement = session.advance({ deltaMs: 100 });
  assert.equal(afterSettlement.frame, settledFrame);
  assert.equal(afterSettlement.elapsedMs, view.elapsedMs);
  assert.equal(afterSettlement.events.length, 0);
  assert.deepEqual(
    (afterSettlement.wave as unknown as { settlement?: unknown }).settlement,
    settlement,
  );
});

test('reopens a clean session from the same seed and leaves the previous session closed', async () => {
  const game = createGame({ scenarios: { [cowGulchP1aSampleContent.id]: cowGulchP1aSampleContent } });
  const previous = await game.open({ scenarioId: cowGulchP1aSampleContent.id, randomSeed: 42 });
  previous.submitIntent({ type: 'start-wave' });
  const firstStartedView = previous.advance({ deltaMs: 0 });
  const restartSeed = previous.startRecord.randomSeed;
  previous.close();
  previous.close();

  assert.throws(() => previous.advance({ deltaMs: 100 }), /session is closed/i);
  const restarted = await game.open({ scenarioId: cowGulchP1aSampleContent.id, randomSeed: restartSeed });
  assert.notEqual(restarted.id, previous.id);
  assert.equal(restarted.observe().frame, 0);
  assert.equal(restarted.observe().wave?.phase, 'not-started');
  assert.equal(restarted.observe().enemies.length, 0);

  restarted.submitIntent({ type: 'start-wave' });
  assert.deepEqual(restarted.advance({ deltaMs: 0 }), firstStartedView);
});

test('produces one stable formal terminal record only after a supported wave settles', async () => {
  const game = createGame({
    scenarios: { [cowGulchContent.id]: formalPreviewCowGulch },
    sessionIdSource: () => 'formal-session-1',
  });
  const session = await game.open({ scenarioId: cowGulchContent.id, mode: 'formal', randomSeed: 42 });
  assert.equal(session.startRecord.mode, 'formal');
  assert.equal(session.terminalRecord(), undefined);

  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  for (let step = 0; step < 100 && view.wave?.phase === 'active'; step += 1) {
    view = session.advance({ deltaMs: 100 });
  }

  const terminal = session.terminalRecord();
  assert.equal(terminal?.mode, 'formal');
  assert.equal(terminal?.sessionId, 'formal-session-1');
  assert.equal(terminal?.scenarioId, 'cow-gulch');
  assert.equal(terminal?.outcome, 'victory');
  assert.equal(terminal?.highScoreCandidate, 50);
  assert.equal(terminal?.settlementId, 'formal-session-1:cow-gulch:1');
  assert.deepEqual(session.terminalRecord(), terminal);
});

test('keeps the one-life defeat fixture in debug mode and rejects unsupported formal content', async () => {
  const game = createGame({
    scenarios: {
      [cowGulchDefeatContent.id]: cowGulchDefeatContent,
      [combatScenario.id]: combatScenario,
    },
    sessionIdSource: () => 'debug-session-1',
  });
  const debug = await game.open({ scenarioId: cowGulchDefeatContent.id, randomSeed: 42 });
  assert.equal(debug.startRecord.mode, 'debug');
  await assert.rejects(
    game.open({ scenarioId: cowGulchDefeatContent.id, mode: 'formal', randomSeed: 42 }),
    /formal mode is not supported/i,
  );
  await assert.rejects(
    game.open({ scenarioId: combatScenario.id, mode: 'formal', randomSeed: 42 }),
    /formal mode is not supported/i,
  );
});

test('records consumed frame inputs and replays checkpoints to the same terminal result', async () => {
  const game = createGame({
    scenarios: { [cowGulchContent.id]: formalPreviewCowGulch },
    sessionIdSource: (() => {
      let id = 0;
      return () => `replay-session-${++id}`;
    })(),
  });
  const session = await game.open({ scenarioId: cowGulchContent.id, mode: 'formal', randomSeed: 42 });

  for (let frame = 0; frame < 120; frame += 1) session.advance({ deltaMs: 0 });
  await assert.rejects(session.exportReplay(), (error: unknown) =>
    (error as { code?: string }).code === 'incomplete-recording');
  assert.equal(session.submitIntent({ type: 'start-wave' }), true);
  let view = session.advance({ deltaMs: 17 });
  for (let step = 0; step < 100 && view.wave?.phase === 'active'; step += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  assert.equal(view.wave?.phase, 'complete');

  const serialized = await session.exportReplay();
  const record = JSON.parse(serialized) as {
    formatVersion: number;
    rulesVersion: string;
    startRecord: { contentVersion: string; mode: string };
    frames: Array<{ frame: number; deltaMs: number; intents: unknown[] }>;
    checkpoints: Array<{ frame: number; stateDigest: string }>;
    terminal: { frame: number; settlement: unknown; stateDigest: string };
    digest: string;
  };
  assert.equal(record.formatVersion, 1);
  assert.ok(record.rulesVersion.length > 0);
  assert.equal(record.startRecord.contentVersion, cowGulchContent.contentVersion);
  assert.equal(record.startRecord.mode, 'formal');
  assert.deepEqual(record.frames[0], { frame: 1, deltaMs: 0, intents: [] });
  assert.deepEqual(record.frames[120]?.intents, [{ type: 'start-wave' }]);
  assert.ok(record.checkpoints.some((checkpoint) => checkpoint.frame === 120));
  assert.equal(record.checkpoints.at(-1)?.frame, view.frame);

  const replay = await game.replay(serialized);
  assert.notEqual(replay.session.id, session.id);
  assert.equal(replay.session.startRecord.mode, 'replay');
  assert.deepEqual(replay.verifiedCheckpointFrames, record.checkpoints.map(({ frame }) => frame));
  assert.deepEqual(replay.session.observe().wave?.settlement, view.wave?.settlement);
  assert.equal(replay.session.terminalRecord()?.mode, 'replay');
  await assert.rejects(replay.session.exportReplay(), (error: unknown) =>
    (error as { code?: string }).code === 'unsupported-mode');

  const missingVersion = structuredClone(record) as Record<string, unknown>;
  delete missingVersion.rulesVersion;
  await assert.rejects(game.replay(JSON.stringify(missingVersion)), (error: unknown) =>
    (error as { code?: string }).code === 'missing-version');

  const malformedVersion = structuredClone(record) as Record<string, unknown>;
  malformedVersion.formatVersion = '1';
  await assert.rejects(game.replay(JSON.stringify(malformedVersion)), (error: unknown) =>
    (error as { code?: string }).code === 'corrupt-input');

  const unsupportedFormatVersion = structuredClone(record);
  unsupportedFormatVersion.formatVersion = 2;
  await assert.rejects(game.replay(JSON.stringify(unsupportedFormatVersion)), (error: unknown) =>
    (error as { code?: string }).code === 'unsupported-version');

  const unsupportedRandomAlgorithm = structuredClone(record) as typeof record & {
    startRecord: { randomAlgorithm?: string };
  };
  unsupportedRandomAlgorithm.startRecord.randomAlgorithm = 'unknown.random';
  await assert.rejects(game.replay(JSON.stringify(unsupportedRandomAlgorithm)), (error: unknown) =>
    (error as { code?: string }).code === 'unsupported-version');

  const replayAsSource = structuredClone(record);
  replayAsSource.startRecord.mode = 'replay';
  await assert.rejects(game.replay(JSON.stringify(replayAsSource)), (error: unknown) =>
    (error as { code?: string }).code === 'unsupported-mode');

  const corruptFrame = structuredClone(record);
  corruptFrame.frames[0]!.deltaMs = 101;
  await assert.rejects(game.replay(JSON.stringify(corruptFrame)), (error: unknown) =>
    (error as { code?: string }).code === 'corrupt-input');

  const digestMismatch = structuredClone(record);
  digestMismatch.frames[0]!.deltaMs = 1;
  await assert.rejects(game.replay(JSON.stringify(digestMismatch)), (error: unknown) =>
    (error as { code?: string }).code === 'digest-mismatch');

  const resultMismatch = structuredClone(record) as Record<string, unknown> & {
    checkpoints: Array<{ frame: number; stateDigest: string }>;
    terminal: { frame: number; settlement: unknown; stateDigest: string };
  };
  const finalCheckpoint = resultMismatch.checkpoints.at(-1)!;
  finalCheckpoint.stateDigest = 'sha256:' + '0'.repeat(64);
  resultMismatch.terminal.stateDigest = finalCheckpoint.stateDigest;
  const { digest: _originalDigest, ...resultMismatchPayload } = resultMismatch;
  const rehashedResultMismatch = await serializeReplay(resultMismatchPayload as unknown as GameReplayPayload);
  await assert.rejects(game.replay(rehashedResultMismatch), (error: unknown) =>
    (error as { code?: string; frame?: number }).code === 'result-mismatch'
      && (error as { frame?: number }).frame === view.frame);

  const unavailableContentGame = createGame({
    scenarios: { [cowGulchContent.id]: { ...cowGulchContent, contentVersion: 'different-content-version' } },
  });
  await assert.rejects(unavailableContentGame.replay(serialized), (error: unknown) =>
    (error as { code?: string }).code === 'content-unavailable');
});

test('prepares a complete immutable numeric setup without allocating a session or reading randomness', async () => {
  let randomReads = 0;
  let sessionIds = 0;
  const game = createGame({
    scenarios: { [cowGulchContent.id]: cowGulchContent },
    randomSeedSource: () => { randomReads += 1; return 42; },
    sessionIdSource: () => { sessionIds += 1; return `session-${sessionIds}`; },
  });

  const prepared = await game.prepare({ scenarioId: cowGulchContent.id });

  assert.equal(prepared.scenarioId, cowGulchContent.id);
  assert.equal(prepared.contentVersion, cowGulchContent.contentVersion);
  assert.equal(prepared.rulesVersion, 'gng-rules-3');
  assert.ok(prepared.parameters.some(({ path, value }) =>
    path === 'units/gunslinger-1/weapon/damage' && value === 140));
  assert.ok(prepared.parameters.some(({ path, value }) => path === 'maxUpgrades' && value === 0));
  assert.ok(prepared.parameters.some(({ path, value }) => path === 'previewWave/initialCash' && value === 65));
  assert.ok(prepared.parameters.some(({ path, value }) =>
    path === 'previewWave/enemy/cashReward' && value === 1));
  assert.match(prepared.digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(prepared))), JSON.stringify(prepared));
  assert.ok(Object.isFrozen(prepared));
  assert.ok(Object.isFrozen(prepared.parameters));
  assert.equal(randomReads, 0);
  assert.equal(sessionIds, 0);
});

test('rejects unavailable content and rules versions before allocating a session or reading randomness', async () => {
  let randomReads = 0;
  let sessionIds = 0;
  const game = createGame({
    scenarios: { [cowGulchContent.id]: cowGulchContent },
    randomSeedSource: () => { randomReads += 1; return 42; },
    sessionIdSource: () => { sessionIds += 1; return `session-${sessionIds}`; },
  });
  const setup = await game.prepare({ scenarioId: cowGulchContent.id });

  await assert.rejects(game.open({
    scenarioId: cowGulchContent.id,
    contentVersion: 'older-content-version',
  }), (error: unknown) => (error as { code?: string }).code === 'content-version-unavailable');
  await assert.rejects(game.open({
    scenarioId: cowGulchContent.id,
    preparedSetup: { ...setup, contentVersion: 'older-content-version' },
  }), (error: unknown) => (error as { code?: string }).code === 'content-version-unavailable');
  await assert.rejects(game.open({
    scenarioId: cowGulchContent.id,
    preparedSetup: { ...setup, rulesVersion: 'future-rules-version' },
  }), (error: unknown) => (error as { code?: string }).code === 'rules-version-unsupported');
  await assert.rejects(game.open({
    scenarioId: cowGulchContent.id,
    preparedSetup: { ...setup, rulesVersion: 'gng-rules-2' },
  }), (error: unknown) => (error as { code?: string }).code === 'rules-version-unsupported');

  assert.equal(randomReads, 0);
  assert.equal(sessionIds, 0);
  const session = await game.open({
    scenarioId: cowGulchContent.id,
    contentVersion: cowGulchContent.contentVersion,
    randomSeed: 42,
  });
  assert.equal(session.startRecord.contentVersion, cowGulchContent.contentVersion);
  session.close();
  assert.equal(sessionIds, 1);
});

test('opens and replays the exact prepared numeric configuration', async () => {
  const game = createGame({ scenarios: { [cowGulchContent.id]: formalPreviewCowGulch } });
  const prepared = await game.prepare({
    scenarioId: cowGulchContent.id,
    overrides: [{ path: 'previewWave/enemy/cashReward', value: 5 }],
  });
  const session = await game.open({
    scenarioId: cowGulchContent.id,
    preparedSetup: prepared,
    randomSeed: 42,
    mode: 'experiment',
  });

  assert.equal(session.startRecord.preparedSetup?.digest, prepared.digest);
  assert.equal(session.observe().wave?.cash, 65);
  assert.equal(session.submitIntent({ type: 'start-wave' }), true);
  let view = session.observe();
  for (let frame = 0; frame < 2_000 && !session.terminalRecord(); frame += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  assert.equal(session.terminalRecord()?.outcome, 'victory');
  assert.equal(view.wave?.cash, 70);

  const replay = await game.replay(await session.exportReplay());
  assert.equal(replay.session.startRecord.preparedSetup?.digest, prepared.digest);
  assert.equal(replay.session.observe().wave?.cash, 70);
});

test('rejects a tampered setup and prevents custom setups from entering formal play', async () => {
  const game = createGame({ scenarios: { [cowGulchContent.id]: cowGulchContent } });
  const prepared = await game.prepare({
    scenarioId: cowGulchContent.id,
    overrides: [{ path: 'previewWave/enemy/cashReward', value: 5 }],
  });
  const changedParameters = prepared.parameters.map((parameter) => parameter.path === 'previewWave/enemy/cashReward'
    ? { ...parameter, value: 7 }
    : parameter);

  await assert.rejects(game.open({
    scenarioId: cowGulchContent.id,
    preparedSetup: { ...prepared, parameters: changedParameters },
  }), (error: unknown) => (error as { code?: string }).code === 'prepared-setup-invalid');
  await assert.rejects(game.open({
    scenarioId: cowGulchContent.id,
    mode: 'formal',
    preparedSetup: prepared,
  }), (error: unknown) => (error as { code?: string }).code === 'prepared-setup-mismatch');
});

test('selects a sleeping first-map unit without activating it, charging cash, or allowing movement', async () => {
  const session = await createGame({ scenarios: { [cowGulchContent.id]: cowGulchContent } }).open({
    scenarioId: cowGulchContent.id,
    mode: 'formal',
    difficulty: 'easy',
  });
  const initial = session.observe();
  const sleeping = initial.units.find((unit) => unit.id === 'gunslinger-hire-01');
  assert.ok(sleeping);
  assert.equal(initial.units.length, 16);
  assert.equal(initial.wave?.phase, 'active');
  assert.equal(initial.wave?.lives, 50);
  assert.equal(initial.wave?.cash, 65);
  assert.equal(sleeping.activity, 4);
  assert.equal(sleeping.selected, false);

  assert.equal(session.submitIntent({ type: 'select-at', x: 6.5, y: 1.5 }), true);
  const selected = session.advance({ deltaMs: 0 });
  const selectedSleeping = selected.units.find((unit) => unit.id === sleeping.id);
  assert.equal(selectedSleeping?.selected, true);
  assert.equal(selectedSleeping?.activity, 4);
  assert.equal(selected.wave?.cash, 65);
  assert.equal(selected.recruitPool.find((entry) => entry.unitType === 'gunslinger')?.count, 0);

  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 7.5, targetY: 2.5 }), false);
  const afterRejectedMove = session.advance({ deltaMs: 100 });
  assert.deepEqual(afterRejectedMove.units.find((unit) => unit.id === sleeping.id)?.positionFine, sleeping.positionFine);
  assert.equal(afterRejectedMove.wave?.cash, 65);

  session.submitIntent({ type: 'clear-selection' });
  assert.equal(session.advance({ deltaMs: 0 }).units.find((unit) => unit.id === sleeping.id)?.selected, false);
});

test('cycles the sleeping Zzz frames every 200 ms and freezes them while paused', async () => {
  const session = await createGame({ scenarios: { [cowGulchContent.id]: cowGulchContent } }).open({
    scenarioId: cowGulchContent.id,
    difficulty: 'easy',
  });
  const sleepingFrame = (units: readonly UnitView[]) =>
    units.find((unit) => unit.id === 'gunslinger-hire-01')?.sleepingAnimationFrame;
  const frames = [sleepingFrame(session.observe().units)];
  for (let index = 0; index < 6; index += 1) {
    frames.push(sleepingFrame(session.advance({ deltaMs: 100 }).units));
  }
  assert.deepEqual(frames, [0, 0, 1, 1, 2, 2, 0]);

  session.pause();
  const pausedFrame = sleepingFrame(session.observe().units);
  assert.equal(sleepingFrame(session.advance({ deltaMs: 100 }).units), pausedFrame);
});
