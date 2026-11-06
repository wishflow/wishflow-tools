import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
import { createTechTownMapContent, assertTechTownGamblerCasinoPair } from '../src/content/tech-town-map-entities';
import { techTownMapEntityAssets } from '../src/content/tech-town-map-entity-assets';
import { createTechTownMapScene } from '../src/content/tech-town-scene';
import { createGame, type ScenarioContent } from '../src/game';
import type { GamblerUnitType } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function dimensions(assetName: string): { width: number; height: number } {
  const png = readFileSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(assetName)));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

const GAMBLER_PRIZE_TYPES = [1, 2, 3, 4, 5, 6, 35, 36] as const satisfies readonly GamblerUnitType[];

function createGamblerScenario(options: {
  initialCash?: number;
  cooldownMs?: number;
  speedMultiplierCount?: number;
} = {}): ScenarioContent {
  const mapContent = createTechTownMapContent(() => true);
  const units = mapContent.units.map((unit) => (
    unit.type === 'gambler' ? unit : { ...unit, activity: 4 as const }
  ));
  return {
    id: 'tech-town-gambler-session-fixture',
    contentVersion: 'tech-town-gambler-session-fixture-v1',
    title: { en: 'Gambler session test', zh: '赌徒会话测试' },
    map: mapContent.scene,
    units,
    gambler: {
      unlockedPrizeUnitTypes: [...GAMBLER_PRIZE_TYPES],
      cooldownMs: options.cooldownMs ?? 299_000,
    },
    maxUpgrades: 3,
    previewWave: {
      ...cowGulchPreviewWave,
      initialLives: 1,
      initialCash: options.initialCash ?? 1_000,
      baseEnemySpeed: 5_000,
      speedMultiplierMin: 100,
      speedMultiplierCount: options.speedMultiplierCount ?? 1,
    },
  };
}

async function openSelectedGambler(scenario: ScenarioContent, randomSeed: number) {
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed,
  });
  const gambler = scenario.units.find(({ type }) => type === 'gambler');
  assert.ok(gambler);
  assert.equal(session.submitIntent({ type: 'select-at', x: 29.5, y: 3 }), true);
  assert.equal(session.advance({ deltaMs: 0 }).units.find(({ id }) => id === gambler.id)?.selected, true);
  return { session, gambler };
}

test('the locked Gambler and Casino are both absent from the Tech Town map content', () => {
  const content = createTechTownMapContent(() => false);

  assert.equal(content.units.some(({ type }) => type === 'gambler'), false);
  assert.equal(content.scene.decorations?.some(({ asset }) => asset === 'b_3x2_casino'), false);
});

test('the unlocked Gambler and Casino use the original map markers, frame and foot anchor', () => {
  let gamblerUnlockReads = 0;
  const content = createTechTownMapContent((unitTypeId) => {
    if (unitTypeId === 9) {
      gamblerUnlockReads += 1;
      return true;
    }
    return false;
  });
  const gamblers = content.units.filter(({ type }) => type === 'gambler');
  const casinos = content.scene.decorations?.filter(({ asset }) => asset === 'b_3x2_casino') ?? [];

  assert.equal(gamblerUnlockReads, 1, 'the same resolved unlock state gates both map entities');
  assert.equal(gamblers.length, 1);
  assert.deepEqual({
    id: gamblers[0]?.id,
    activity: gamblers[0]?.activity,
    cell: gamblers[0]?.cell,
    asset: gamblers[0]?.asset,
    frame: gamblers[0]?.frame,
    render: gamblers[0]?.render,
    hitArea: gamblers[0]?.hitArea,
    movementSpeedFinePer100Ms: gamblers[0]?.movementSpeedFinePer100Ms,
    hasWeapon: gamblers[0]?.weapon !== undefined,
    hirePrice: gamblers[0]?.hirePrice,
    upgradeLevels: gamblers[0]?.upgradeLevels,
  }, {
    id: 'gambler-01',
    activity: 5,
    cell: { x: 29, y: 3 },
    asset: 'player_gambler',
    frame: { x: 0, y: 0, width: 32, height: 44 },
    render: { x: 29, y: 2.375, width: 1, height: 1.375 },
    hitArea: { x: 29, y: 2.375, width: 1, height: 1.375 },
    movementSpeedFinePer100Ms: 0,
    hasWeapon: false,
    hirePrice: undefined,
    upgradeLevels: undefined,
  });
  assert.equal(casinos.length, 1);
  assert.deepEqual(casinos[0], {
    asset: 'b_3x2_casino',
    anchorOffsetY: -0.3,
    cell: { x: 30, y: 3 },
  });
});

test('reports a Gambler/Casino count mismatch as invalid map content', () => {
  const gambler = createTechTownMapContent((unitTypeId) => unitTypeId === 9)
    .units.find(({ type }) => type === 'gambler');
  assert.ok(gambler);

  assert.throws(
    () => assertTechTownGamblerCasinoPair([gambler], []),
    /Tech Town Gambler\/Casino count mismatch/,
  );
});

test('GameSession rejects Gambler maps without explicit rules or an unlocked prize template', async () => {
  const scenario = createGamblerScenario();
  const { gambler: _rules, ...withoutRules } = scenario;
  await assert.rejects(
    createGame({ scenarios: { [scenario.id]: withoutRules } }).open({ scenarioId: scenario.id, randomSeed: 0 }),
    /requires explicit wager rules/,
  );

  const missingPrizeTemplate: ScenarioContent = {
    ...scenario,
    units: scenario.units.filter(({ type }) => type !== 'gunslinger'),
    gambler: { unlockedPrizeUnitTypes: [1], cooldownMs: 299_000 },
  };
  await assert.rejects(
    createGame({ scenarios: { [scenario.id]: missingPrizeTemplate } }).open({ scenarioId: scenario.id, randomSeed: 0 }),
    /prize, cooldown, or Casino pair data is invalid/,
  );
});

test('loads the APK Gambler and Casino images from the declared asset manifest', () => {
  assert.deepEqual(techTownMapEntityAssets, ['player_gambler', 'portrait_gambler', 'b_3x2_casino']);
  assert.deepEqual(dimensions('player_gambler'), { width: 32, height: 44 });
  assert.deepEqual(dimensions('portrait_gambler'), { width: 96, height: 96 });
  for (const asset of techTownMapEntityAssets) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true, asset);
  }
  assert.equal(gameAssetRelativePath('b_3x2_casino'), 'hdpi/b_3x2_casino.png');
});

test('the Gambler cannot enter ordinary hire, move, attack or upgrade behavior', async () => {
  const gambler = createTechTownMapContent((unitTypeId) => unitTypeId === 9)
    .units.find(({ type }) => type === 'gambler');
  assert.ok(gambler);
  const scenario: ScenarioContent = {
    id: 'tech-town-gambler-control-fixture',
    title: { en: 'Gambler control test', zh: '赌徒操作测试' },
    map: createTechTownMapScene({ gamblerUnlocked: true }),
    units: [gambler],
    gambler: { unlockedPrizeUnitTypes: [], cooldownMs: 299_000 },
    maxUpgrades: 3,
    previewWave: {
      ...cowGulchPreviewWave,
      spawn: { cell: { x: 24, y: 3 }, direction: 'west' },
      routes: undefined,
      baseEnemySpeed: 0,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      redirects: [],
      exit: { x: 0, y: 3 },
      enemy: {
        hitPoints: 100_000,
        cashReward: 0,
        penetration: { light: 100, fire: 100, heavy: 100, poison: 100 },
      },
    },
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 41,
  });

  try {
    assert.equal(session.submitIntent({ type: 'start-wave' }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'select-at', x: 29.5, y: 3 }), true);
    const selected = session.advance({ deltaMs: 0 });
    assert.equal(selected.units.find(({ id }) => id === gambler.id)?.selected, true);
    assert.equal(session.submitIntent({
      type: 'hire-map-unit',
      unitId: gambler.id,
      commandId: 'gambler-hire',
    }), false);
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 25, targetY: 3 }), false);
    assert.equal(session.submitIntent({
      type: 'upgrade-unit',
      unitId: gambler.id,
      commandId: 'gambler-upgrade',
    }), false);

    const events = [];
    for (let index = 0; index < 50; index += 1) {
      events.push(...session.advance({ deltaMs: 100 }).events);
    }
    assert.equal(events.some((event) => event.type === 'unit-fired' && event.unitId === gambler.id), false);
  } finally {
    session.close();
  }
});

test('a Gambler session records one round, rejects same-frame cooldown play, and spawns its prize at the Casino', async () => {
  const scenario = createGamblerScenario();
  const { session, gambler } = await openSelectedGambler(scenario, 0);

  try {
    const command = { type: 'play-gambler' as const, unitId: gambler.id, commandId: 'gambler-round-1' };
    assert.equal(session.submitIntent(command), true);
    assert.equal(session.submitIntent(command), true, 'the same command id is idempotently accepted');
    assert.equal(session.submitIntent({ ...command, commandId: 'gambler-round-race' }), true,
      'a distinct command submitted before the frame is resolved against the resulting cooldown');

    let view = session.advance({ deltaMs: 0 });
    const state = view.units.find(({ id }) => id === gambler.id)?.gambler;
    assert.equal(view.wave?.cash, 950);
    assert.equal(state?.completedGames, 1);
    assert.equal(state?.cooldownRemainingMs, 299_000);
    assert.equal(state?.lastRound?.outcome.type, 'unit');
    if (state?.lastRound?.outcome.type === 'unit') assert.equal(state.lastRound.outcome.unitType, 1);
    assert.equal(state?.lastRound?.cards.length, 5);
    assert.equal(state?.pendingPrize?.remainingMs, 500);
    assert.equal(view.events.filter((event) => event.type === 'gambler-round-played').length, 1);
    assert.deepEqual(view.events.filter((event) => event.type === 'gambler-round-rejected').map(({ type, reason }) => ({ type, reason })), [
      { type: 'gambler-round-rejected', reason: 'cooldown' },
    ]);
    assert.equal(session.submitIntent({
      type: 'play-gambler', unitId: gambler.id, commandId: 'during-cooldown',
    }), false, 'later attempts cannot enter the queue while cooling down');

    view = session.advance({ deltaMs: 0 });
    assert.equal(view.units.filter(({ id }) => id === `${gambler.id}-prize-1`).length, 0,
      'zero simulation time does not advance Casino spawning');
    assert.equal(view.units.find(({ id }) => id === gambler.id)?.gambler?.cooldownRemainingMs, 299_000);

    view = session.advance({ deltaMs: 1 });
    const spawned = view.units.find(({ id }) => id === `${gambler.id}-prize-1`);
    assert.ok(spawned);
    assert.equal(spawned.type, 'gunslinger');
    assert.equal(spawned.activity, 5);
    assert.deepEqual(spawned.cell, { x: 30, y: 3 });
    assert.deepEqual(spawned.positionFine, { x: 30 * 7680 + 3840, y: 3 * 7680 + 3840 + 1920 });
    assert.equal(view.units.find(({ id }) => id === gambler.id)?.gambler?.pendingPrize, undefined);
    assert.equal(view.units.find(({ id }) => id === gambler.id)?.gambler?.cooldownRemainingMs, 298_999);
    assert.equal(view.events.filter((event) => event.type === 'gambler-prize-spawned').length, 1);

    view = session.advance({ deltaMs: 1 });
    assert.equal(view.units.filter(({ id }) => id === `${gambler.id}-prize-1`).length, 1,
      'a pending prize can only be created once');
    assert.equal(view.events.some((event) => event.type === 'gambler-prize-spawned'), false);
  } finally {
    session.close();
  }
});

test('Gambler cash and loss outcomes settle the correct balance using the shared Randomizer', async () => {
  const scenario = createGamblerScenario();

  const cashSession = await openSelectedGambler(scenario, 4);
  try {
    assert.equal(cashSession.session.submitIntent({
      type: 'play-gambler', unitId: cashSession.gambler.id, commandId: 'cash-round',
    }), true);
    const view = cashSession.session.advance({ deltaMs: 0 });
    const round = view.units.find(({ id }) => id === cashSession.gambler.id)?.gambler?.lastRound;
    assert.equal(round?.outcome.type, 'cash');
    if (round?.outcome.type === 'cash') assert.equal(round.outcome.payout, 100);
    assert.equal(view.wave?.cash, 1_050, 'a 50 stake is returned as a 100 cash prize');
    assert.equal(view.units.find(({ id }) => id === cashSession.gambler.id)?.gambler?.completedGames, 1);
  } finally {
    cashSession.session.close();
  }

  const lossSession = await openSelectedGambler(scenario, 5);
  try {
    assert.equal(lossSession.session.submitIntent({ type: 'start-wave' }), true);
    lossSession.session.advance({ deltaMs: 0 });
    assert.equal(lossSession.session.submitIntent({
      type: 'play-gambler', unitId: lossSession.gambler.id, commandId: 'loss-round',
    }), true);
    const view = lossSession.session.advance({ deltaMs: 0 });
    const round = view.units.find(({ id }) => id === lossSession.gambler.id)?.gambler?.lastRound;
    assert.equal(round?.outcome.type, 'loss', 'the first start-wave draw makes loss eligible');
    assert.equal(view.wave?.cash, 950);
    assert.equal(view.units.find(({ id }) => id === lossSession.gambler.id)?.gambler?.completedGames, 1);
  } finally {
    lossSession.session.close();
  }
});

test('every unlocked unit card creates the matching active unit at the Casino', async () => {
  const fixtures = [
    { randomSeed: 0, unitType: 1, type: 'gunslinger' },
    { randomSeed: 21, unitType: 2, type: 'mexican' },
    { randomSeed: 16, unitType: 3, type: 'cannon' },
    { randomSeed: 18, unitType: 4, type: 'indian' },
    { randomSeed: 48, unitType: 5, type: 'sniper' },
    { randomSeed: 12, unitType: 6, type: 'grandpa' },
    { randomSeed: 14, unitType: 35, type: 'pyromaniac' },
    { randomSeed: 8, unitType: 36, type: 'salesman' },
  ] as const;

  for (const fixture of fixtures) {
    const scenario = createGamblerScenario();
    const { session, gambler } = await openSelectedGambler(scenario, fixture.randomSeed);
    try {
      assert.equal(session.submitIntent({
        type: 'play-gambler', unitId: gambler.id, commandId: `prize-${fixture.unitType}`,
      }), true);
      let view = session.advance({ deltaMs: 0 });
      const round = view.units.find(({ id }) => id === gambler.id)?.gambler?.lastRound;
      assert.equal(round?.outcome.type, 'unit');
      if (round?.outcome.type === 'unit') assert.equal(round.outcome.unitType, fixture.unitType);
      assert.equal(view.wave?.cash, 950);
      assert.equal(view.units.find(({ id }) => id === gambler.id)?.gambler?.completedGames, 1);

      view = session.advance({ deltaMs: 1 });
      const prize = view.units.find(({ id }) => id === `${gambler.id}-prize-1`);
      assert.ok(prize);
      assert.equal(prize.type, fixture.type);
      assert.equal(prize.activity, 5);
      assert.deepEqual(prize.cell, { x: 30, y: 3 });
    } finally {
      session.close();
    }
  }
});

test('spawning a unit prize leaves recruitment stock, map decorations and existing units unchanged', async () => {
  const scenario = createGamblerScenario();
  scenario.recruitableUnits = [{
    id: 'test-gunslinger-stock',
    name: { en: 'Gunslinger', zh: '枪手' },
    price: 75,
    spawnLocationType: 1,
  }];
  const { session, gambler } = await openSelectedGambler(scenario, 21);

  try {
    assert.equal(session.submitIntent({
      type: 'recruit-unit', unitType: 'test-gunslinger-stock', commandId: 'stock-before-prize',
    }), true);
    const before = session.advance({ deltaMs: 0 });
    assert.equal(before.recruitPool[0]?.count, 1);
    const beforeRecruitPool = structuredClone(before.recruitPool);
    const beforeDecorations = structuredClone(before.map.decorations ?? []);
    const beforeTemplates = structuredClone(scenario.units);
    const beforeUnits = before.units.map(({ id, type, activity, selected, cell, asset, frame, render, hitArea, positionFine }) => ({
      id, type, activity, selected, cell, asset, frame, render, hitArea, positionFine,
    }));

    assert.equal(session.submitIntent({
      type: 'play-gambler', unitId: gambler.id, commandId: 'spawn-prize-with-stock',
    }), true);
    const roundView = session.advance({ deltaMs: 0 });
    const round = roundView.units.find(({ id }) => id === gambler.id)?.gambler?.lastRound;
    assert.deepEqual(round?.outcome, { type: 'unit', hand: 'two-pair', unitType: 2 });

    const after = session.advance({ deltaMs: 1 });
    const prize = after.units.find(({ id }) => id === `${gambler.id}-prize-1`);
    assert.ok(prize);
    assert.equal(prize.type, 'mexican');
    assert.equal(after.units.length, before.units.length + 1);
    assert.deepEqual(after.recruitPool, beforeRecruitPool);
    assert.deepEqual(after.map.decorations ?? [], beforeDecorations);
    assert.deepEqual(scenario.units, beforeTemplates);
    assert.deepEqual(after.units.map(({ id, type, activity, selected, cell, asset, frame, render, hitArea, positionFine }) => ({
      id, type, activity, selected, cell, asset, frame, render, hitArea, positionFine,
    })).filter(({ id }) => beforeUnits.some((unit) => unit.id === id)), beforeUnits);
  } finally {
    session.close();
  }
});

test('insufficient funds reject before state or shared random changes', async () => {
  const scenario = createGamblerScenario({ initialCash: 49, speedMultiplierCount: 20 });
  const rejected = await openSelectedGambler(scenario, 42);
  const control = await openSelectedGambler(scenario, 42);

  try {
    assert.equal(rejected.session.submitIntent({
      type: 'play-gambler', unitId: rejected.gambler.id, commandId: 'unaffordable',
    }), false);
    const rejectedView = rejected.session.advance({ deltaMs: 0 });
    const state = rejectedView.units.find(({ id }) => id === rejected.gambler.id)?.gambler;
    assert.equal(rejectedView.wave?.cash, 49);
    assert.equal(state?.completedGames, 0);
    assert.equal(state?.cooldownRemainingMs, 0);
    assert.equal(state?.lastRound, undefined);

    assert.equal(rejected.session.submitIntent({ type: 'start-wave' }), true);
    assert.equal(control.session.submitIntent({ type: 'start-wave' }), true);
    rejected.session.advance({ deltaMs: 0 });
    control.session.advance({ deltaMs: 0 });
    const afterRejectedAttempt = rejected.session.advance({ deltaMs: 100 });
    const withoutRejectedAttempt = control.session.advance({ deltaMs: 100 });
    assert.deepEqual(afterRejectedAttempt.enemies, withoutRejectedAttempt.enemies,
      'the later first Randomizer draw remains identical');
  } finally {
    rejected.session.close();
    control.session.close();
  }
});

test('same-frame cooldown rejection consumes no shared random values', async () => {
  const scenario = createGamblerScenario({ cooldownMs: 2 });
  const actual = await openSelectedGambler(scenario, 0);
  const control = await openSelectedGambler(scenario, 0);

  try {
    const first = { type: 'play-gambler' as const, unitId: actual.gambler.id, commandId: 'first-round' };
    assert.equal(actual.session.submitIntent(first), true);
    assert.equal(actual.session.submitIntent({ ...first, commandId: 'cooldown-race' }), true);
    assert.equal(control.session.submitIntent({
      type: 'play-gambler', unitId: control.gambler.id, commandId: 'first-round',
    }), true);
    const actualFirst = actual.session.advance({ deltaMs: 0 });
    const controlFirst = control.session.advance({ deltaMs: 0 });
    assert.equal(actualFirst.events.some((event) => event.type === 'gambler-round-rejected' && event.reason === 'cooldown'), true);
    assert.deepEqual(
      actualFirst.units.find(({ id }) => id === actual.gambler.id)?.gambler?.lastRound,
      controlFirst.units.find(({ id }) => id === control.gambler.id)?.gambler?.lastRound,
    );

    for (let tick = 0; tick < 2; tick += 1) {
      actual.session.advance({ deltaMs: 1 });
      control.session.advance({ deltaMs: 1 });
    }
    assert.equal(actual.session.observe().units.find(({ id }) => id === actual.gambler.id)?.gambler?.cooldownRemainingMs, 0);
    assert.equal(control.session.observe().units.find(({ id }) => id === control.gambler.id)?.gambler?.cooldownRemainingMs, 0);

    assert.equal(actual.session.submitIntent({
      type: 'play-gambler', unitId: actual.gambler.id, commandId: 'second-round',
    }), true);
    assert.equal(control.session.submitIntent({
      type: 'play-gambler', unitId: control.gambler.id, commandId: 'second-round',
    }), true);
    const actualSecond = actual.session.advance({ deltaMs: 0 });
    const controlSecond = control.session.advance({ deltaMs: 0 });
    assert.deepEqual(
      actualSecond.units.find(({ id }) => id === actual.gambler.id)?.gambler?.lastRound,
      controlSecond.units.find(({ id }) => id === control.gambler.id)?.gambler?.lastRound,
    );
    assert.equal(actualSecond.wave?.cash, controlSecond.wave?.cash);
  } finally {
    actual.session.close();
    control.session.close();
  }
});

test('Gambler card and payout state survives deterministic replay', async () => {
  const scenario = createGamblerScenario({ cooldownMs: 2 });
  const game = createGame({ scenarios: { [scenario.id]: scenario } });
  const session = await game.open({ scenarioId: scenario.id, randomSeed: 4 });
  const gambler = scenario.units.find(({ type }) => type === 'gambler');
  assert.ok(gambler);

  assert.equal(session.submitIntent({ type: 'select-at', x: 29.5, y: 3 }), true);
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({
    type: 'play-gambler', unitId: gambler.id, commandId: 'replay-round',
  }), true);
  session.advance({ deltaMs: 0 });
  session.advance({ deltaMs: 1 });
  session.advance({ deltaMs: 1 });
  assert.equal(session.submitIntent({
    type: 'play-gambler', unitId: gambler.id, commandId: 'replay-second-round',
  }), true);
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({ type: 'start-wave' }), true);
  let view = session.advance({ deltaMs: 0 });
  for (let tick = 0; tick < 500 && !view.wave?.settlement; tick += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  assert.ok(view.wave?.settlement, 'the fixture settles so it can be exported as a replay');

  try {
    const replay = await game.replay(await session.exportReplay());
    assert.deepEqual(
      replay.session.observe().units.find(({ id }) => id === gambler.id)?.gambler,
      view.units.find(({ id }) => id === gambler.id)?.gambler,
    );
    assert.equal(replay.session.observe().units.find(({ id }) => id === gambler.id)?.gambler?.completedGames, 2);
    assert.equal(replay.session.observe().wave?.cash, view.wave?.cash);
  } finally {
    session.close();
  }
});
