import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createGame, type ScenarioContent } from '../src/game';
import { captureReplayState } from '../src/game/replay';
import {
  advanceCampaignBonusCratePool,
  beginCampaignBonusCrateDespawn,
  campaignBonusLivesAfterPickup,
  chooseCampaignBonusReward,
  collisionBoundsOverlap,
  createCampaignBonusCratePool,
  findBonusCrateCell,
  isCampaignBonusCrateFieldBlocked,
  isBonusCrateCandidateAllowed,
  type CampaignBonusCrateDefinition,
  type CampaignBonusCrateRandom,
} from '../src/game/campaign-bonus-crates';

const definition: CampaignBonusCrateDefinition = {
  totalCount: 10,
  intervalMs: 10,
  simultaneousLimit: 22,
  rewardTypeCount: 4,
};

class RecordingRandom implements CampaignBonusCrateRandom {
  readonly bounds: number[] = [];

  constructor(private readonly values: number[]) {}

  nextInt(bound: number): number {
    this.bounds.push(bound);
    const value = this.values.shift();
    assert.notEqual(value, undefined, 'test random sequence is exhausted');
    assert.ok(value! >= 0 && value! < bound, `random value ${value} is below bound ${bound}`);
    return value!;
  }
}

function createBonusCrateScenario(
  id: string,
  spawnCell: { x: number; y: number },
  withWeapon = false,
): ScenarioContent {
  return {
    id,
    contentVersion: 'bonus-crate-session-v1',
    title: { en: 'Bonus crate fixture', zh: '补给箱测试' },
    map: { width: 17, height: 17, tileSize: 32, background: [], streets: [] },
    originalTileGrid: Array.from({ length: 17 }, () => Array.from({ length: 17 }, () => 0)),
    units: [{
      id: 'bonus-player',
      type: 'gunslinger',
      cell: { x: 8, y: 8 },
      movementSpeedFinePer100Ms: 6_000,
      asset: 'player_gunslinger',
      frame: { x: 0, y: 0, width: 32, height: 44 },
      render: { x: 8, y: 7.625, width: 1, height: 1.375 },
      hitArea: { x: 8, y: 7.625, width: 1, height: 1.375 },
      ...(withWeapon ? {
        weapon: {
          damage: 140,
          damageType: 'light' as const,
          rangeFine: 38_400,
          reloadTimeMs: 500,
          projectileSpeed: 600,
          damageStyle: 0 as const,
        },
      } : {}),
    }],
    previewWave: {
      number: 1,
      initialLives: 50,
      initialCash: 65,
      spawn: { cell: spawnCell, direction: 'west' },
      baseEnemySpeed: 0,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      escapePenalty: 5,
      redirects: [],
      exit: { x: 0, y: 8 },
      enemy: {
        hitPoints: 100_000,
        cashReward: 0,
        penetration: { light: 100, fire: 100, heavy: 100, poison: 100 },
      },
    },
    campaignBonusCratePool: {
      totalCount: 1,
      intervalMs: 10,
      simultaneousLimit: 22,
      rewardTypeCount: 4,
    },
  };
}

test('Fort Kaboom crates tick only below zero and choose a reward before the candidate cell', () => {
  const pool = createCampaignBonusCratePool(definition)!;
  const random = new RecordingRandom([1, 19, 13]);

  assert.deepEqual(advanceCampaignBonusCratePool(pool, definition, 22, 17, 10, 50, 50, random, () => true), []);
  assert.equal(pool.remainingMs, 0, 'timer equal to zero does not spawn');
  assert.deepEqual(random.bounds, []);

  const [crate] = advanceCampaignBonusCratePool(pool, definition, 22, 17, 1, 50, 50, random, () => true);
  assert.ok(crate);
  assert.equal(crate.rewardType, 2);
  assert.deepEqual(crate.cell, { x: 20, y: 15 });
  assert.deepEqual(crate.positionFine, { x: 157_440, y: 120_960 });
  assert.equal(crate.animationRemainingMs, 498, 'new crates start at the APK timer value 499 before this frame update');
  assert.equal(pool.remainingCount, 9);
  assert.equal(pool.remainingMs, 10, 'timer overshoot is discarded');
  assert.deepEqual(random.bounds, [4, 20, 14]);
});

test('map03 reward 1–4 is sampled at spawn and full lives rerolls life to 2–4', () => {
  assert.equal(chooseCampaignBonusReward(4, 45, 50, new RecordingRandom([0])), 1);
  assert.equal(chooseCampaignBonusReward(4, 46, 50, new RecordingRandom([0, 0])), 2);
  assert.equal(chooseCampaignBonusReward(4, 50, 50, new RecordingRandom([0, 2])), 4);
  assert.equal(chooseCampaignBonusReward(4, 50, 50, new RecordingRandom([3])), 4);
});

test('type 1 life reward is capped at the level maximum', () => {
  assert.equal(campaignBonusLivesAfterPickup(40, 50), 45);
  assert.equal(campaignBonusLivesAfterPickup(48, 50), 50);
});

test('candidate checks reject map edges, blocked background, streets, object 78, and field blockers', () => {
  const valid = {
    x: 1, y: 2, width: 22, height: 17,
    backgroundWalkable: true, hasStreet: false, objectCode: 0, fieldBlocked: false,
  };
  assert.equal(isBonusCrateCandidateAllowed(valid), true);
  assert.equal(isBonusCrateCandidateAllowed({ ...valid, x: 0 }), false);
  assert.equal(isBonusCrateCandidateAllowed({ ...valid, x: 21 }), false);
  assert.equal(isBonusCrateCandidateAllowed({ ...valid, y: 1 }), false);
  assert.equal(isBonusCrateCandidateAllowed({ ...valid, y: 16 }), false);
  assert.equal(isBonusCrateCandidateAllowed({ ...valid, backgroundWalkable: false }), false);
  assert.equal(isBonusCrateCandidateAllowed({ ...valid, hasStreet: true }), false);
  assert.equal(isBonusCrateCandidateAllowed({ ...valid, objectCode: 78 }), false);
  assert.equal(isBonusCrateCandidateAllowed({ ...valid, fieldBlocked: true }), false);
});

test('invalid random candidate is rerolled in the same timer tick', () => {
  const random = new RecordingRandom([0, 0, 19, 13]);
  const candidates: { x: number; y: number }[] = [];
  const cell = findBonusCrateCell(22, 17, random, (candidate) => {
    candidates.push(candidate);
    return candidates.length === 2;
  });
  assert.deepEqual(candidates, [{ x: 1, y: 2 }, { x: 20, y: 15 }]);
  assert.deepEqual(cell, { x: 20, y: 15 });
  assert.deepEqual(random.bounds, [20, 14, 20, 14]);
});

test('total and simultaneous limits reset the timer without drawing more randomness', () => {
  const pool = createCampaignBonusCratePool({ ...definition, totalCount: 0 })!;
  const random = new RecordingRandom([]);
  advanceCampaignBonusCratePool(pool, { ...definition, totalCount: 0 }, 22, 17, 11, 50, 50, random, () => true);
  assert.equal(pool.remainingMs, 10);
  assert.deepEqual(random.bounds, []);

  const capped = createCampaignBonusCratePool(definition)!;
  capped.remainingMs = 0;
  capped.crates = Array.from({ length: definition.simultaneousLimit }, (_, index) => ({
    id: `crate-${index}`,
    cell: { x: 1, y: 2 },
    positionFine: { x: 0, y: 0 },
    rewardType: 1 as const,
    phase: 'active' as const,
    animationRemainingMs: 0,
  }));
  advanceCampaignBonusCratePool(capped, definition, 22, 17, 1, 50, 50, random, () => true);
  assert.equal(capped.remainingMs, 10);
  assert.equal(capped.remainingCount, 10);
  assert.deepEqual(random.bounds, []);
});

test('crate cannot be collected while spawning or despawning and remains during its exit animation', () => {
  const pool = createCampaignBonusCratePool(definition)!;
  const random = new RecordingRandom([1, 0, 0]);
  const [crate] = advanceCampaignBonusCratePool(pool, definition, 22, 17, 11, 50, 50, random, () => true);
  assert.ok(crate);
  pool.remainingCount = 0;
  assert.equal(beginCampaignBonusCrateDespawn(crate), false, 'spawn animation blocks collection');
  advanceCampaignBonusCratePool(pool, definition, 22, 17, 100, 50, 50, random, () => true);
  assert.equal(crate.phase, 'spawning');
  advanceCampaignBonusCratePool(pool, definition, 22, 17, 100, 50, 50, random, () => true);
  advanceCampaignBonusCratePool(pool, definition, 22, 17, 100, 50, 50, random, () => true);
  advanceCampaignBonusCratePool(pool, definition, 22, 17, 100, 50, 50, random, () => true);
  advanceCampaignBonusCratePool(pool, definition, 22, 17, 100, 50, 50, random, () => true);
  assert.equal(crate.phase, 'active');
  assert.equal(beginCampaignBonusCrateDespawn(crate), true);
  assert.equal(pool.crates.length, 1, 'despawning crate still occupies the simultaneous cap');
  for (let index = 0; index < 4; index += 1) {
    advanceCampaignBonusCratePool(pool, definition, 22, 17, 100, 50, 50, random, () => true);
    assert.equal(pool.crates.length, 1);
  }
  advanceCampaignBonusCratePool(pool, definition, 22, 17, 100, 50, 50, random, () => true);
  assert.equal(pool.crates.length, 0);
});

test('collision boxes use strict overlap, so edge touch is not a pickup', () => {
  const unit = { x: 100, y: 100, width: 40, height: 40 };
  assert.equal(collisionBoundsOverlap(unit, { x: 139, y: 110, width: 20, height: 20 }), true);
  assert.equal(collisionBoundsOverlap(unit, { x: 140, y: 110, width: 20, height: 20 }), false);
  assert.equal(collisionBoundsOverlap(unit, { x: 110, y: 140, width: 20, height: 20 }), false);
});

test('field blockers match the APK occupied-cell footprints rather than render collision rectangles', () => {
  const blockers = {
    decorations: [
      { cell: { x: 4, y: 4 } },
      { cell: { x: 8, y: 8 }, fieldBlockBounds: { left: -1, right: 1, top: 0, bottom: 0 } },
      { cell: { x: 12, y: 12 }, fieldBlockBounds: { left: 0, right: 0, top: -1, bottom: 0 } },
    ],
    spawnLocations: [
      { cell: { x: 16, y: 8 }, spawnLocationType: 2 },
      { cell: { x: 20, y: 12 }, spawnLocationType: 3 },
    ],
    units: [{ x: 6, y: 5 }],
    crates: [{ cell: { x: 7, y: 5 } }],
  };

  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 4, y: 4 }, blockers), true);
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 5, y: 4 }, blockers), false,
    'ordinary static objects block their source fullX/fullY cell even if their sprite collision box overhangs');
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 7, y: 8 }, blockers), true);
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 9, y: 8 }, blockers), true);
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 10, y: 8 }, blockers), false);
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 12, y: 11 }, blockers), true);
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 12, y: 10 }, blockers), false);
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 15, y: 7 }, blockers), true);
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 17, y: 8 }, blockers), true);
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 18, y: 8 }, blockers), false);
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 19, y: 11 }, blockers), true,
    'tipi spawn footprints extend one row upward as in fieldIsBlocked');
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 20, y: 12 }, blockers), true);
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 21, y: 12 }, blockers), false);
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 6, y: 5 }, blockers), true);
  assert.equal(isCampaignBonusCrateFieldBlocked({ x: 7, y: 5 }, blockers), true);
});

test('APK assets are present at their recovered dimensions', async () => {
  const pngs = [
    ['bonus_box.png', 32, 32],
    ['sfx_bonus_box.png', 160, 44],
    ['hud_bonus_sheriff.png', 48, 16],
    ['hud_bonus_cash.png', 48, 16],
    ['hud_bonus_speed.png', 48, 16],
    ['hud_bonus_damage.png', 48, 16],
    ['gng_speechbubble.png', 209, 90],
  ] as const;
  for (const [filename, width, height] of pngs) {
    const bytes = await readFile(new URL('../public/assets/' + filename, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG', filename + ' is a PNG');
    assert.equal(bytes.readUInt32BE(16), width, filename + ' width');
    assert.equal(bytes.readUInt32BE(20), height, filename + ' height');
  }

  const sound = await readFile(new URL('../public/assets/sounds/sound_level_up.ogg', import.meta.url));
  assert.equal(sound.subarray(0, 4).toString(), 'OggS');
});

test('GameSession adds the original $25 cash reward when collecting type 2', async () => {
  const scenario = createBonusCrateScenario('bonus-crate-cash-fixture', { x: 14, y: 8 });
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 2,
  });
  session.submitIntent({ type: 'start-wave' });
  session.advance({ deltaMs: 0 });
  let view = session.advance({ deltaMs: 11 });
  const crate = view.bonusCrates![0]!;
  assert.equal(crate.rewardType, 2);
  for (let index = 0; index < 5; index += 1) view = session.advance({ deltaMs: 100 });
  session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'move-unit', targetX: crate.positionFine.x / 7_680, targetY: crate.positionFine.y / 7_680 });
  let collected = false;
  for (let index = 0; index < 200 && !collected; index += 1) {
    view = session.advance({ deltaMs: 100 });
    collected = view.events.some((event) => event.type === 'bonus-crate-collected');
  }
  assert.equal(collected, true);
  assert.ok(view.events.some((event) => event.type === 'bonus-crate-collected'
    && event.rewardType === 2));
  assert.equal(view.wave?.cash, 90);
  assert.equal(view.units[0]?.bonus, undefined);
  session.close();
});

test('GameSession applies the speed bonus and follows the APK timer boundary at 60 seconds', async () => {
  const scenario = createBonusCrateScenario('bonus-crate-speed-fixture', { x: 14, y: 8 });
  const open = async () => createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 1,
  });
  const session = await open();
  const duplicate = await open();
  session.submitIntent({ type: 'start-wave' });
  duplicate.submitIntent({ type: 'start-wave' });
  session.advance({ deltaMs: 0 });
  duplicate.advance({ deltaMs: 0 });

  let view = session.advance({ deltaMs: 11 });
  const duplicateSpawn = duplicate.advance({ deltaMs: 11 });
  assert.equal(view.bonusCrates?.length, 1);
  assert.deepEqual(view.bonusCrates, duplicateSpawn.bonusCrates);
  assert.deepEqual(view.bonusCratePool, { remainingMs: 10, remainingCount: 0, nextNumber: 2 });
  assert.deepEqual(captureReplayState(view), captureReplayState(duplicateSpawn));
  const crate = view.bonusCrates![0]!;
  assert.equal(crate.rewardType, 3);
  assert.deepEqual(crate.cell, { x: 4, y: 8 });
  assert.equal(crate.phase, 'spawning');
  for (let index = 0; index < 5; index += 1) view = session.advance({ deltaMs: 100 });
  assert.equal(view.bonusCrates?.[0]?.phase, 'active');

  session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  view = session.advance({ deltaMs: 0 });
  session.submitIntent({
    type: 'move-unit',
    targetX: crate.positionFine.x / 7_680,
    targetY: crate.positionFine.y / 7_680,
  });
  let collected = false;
  for (let index = 0; index < 200 && !collected; index += 1) {
    view = session.advance({ deltaMs: 100 });
    collected = view.events.some((event) => event.type === 'bonus-crate-collected');
  }
  assert.equal(collected, true, 'a moving active unit reaches the crate using original collision bounds');
  const collectEvent = view.events.find((event) => event.type === 'bonus-crate-collected');
  assert.equal(collectEvent?.type, 'bonus-crate-collected');
  assert.equal(collectEvent?.rewardType, 3);
  assert.equal(view.events.filter((event) => event.type === 'bonus-crate-collected').length, 1);
  assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_level_up'));
  assert.equal(view.bonusNotice?.remainingMs, 1_200);
  assert.equal(view.bonusCrates?.[0]?.phase, 'despawning');

  assert.deepEqual(view.units[0]?.bonus, { type: 3, remainingMs: 60_000 });

  const afterCollection = session.advance({ deltaMs: 0 });
  assert.equal(afterCollection.events.some((event) => event.type === 'bonus-crate-collected'), false,
    'the same crate cannot grant the reward twice');
  const movementStart = afterCollection.units[0]!.positionFine;
  session.submitIntent({
    type: 'move-unit',
    targetX: 12,
    targetY: movementStart.y / 7_680,
  });
  session.advance({ deltaMs: 0 });
  view = session.advance({ deltaMs: 100 });
  assert.equal(view.units[0]!.positionFine.x - movementStart.x, 9_000,
    'the speed reward multiplies movement by 1.5');
  session.submitIntent({ type: 'stop-moving' });
  view = session.advance({ deltaMs: 0 });
  for (let index = 0; index < 598; index += 1) view = session.advance({ deltaMs: 100 });
  assert.deepEqual(view.units[0]?.bonus, { type: 3, remainingMs: 100 });

  const expiryMovementStart = view.units[0]!.positionFine;
  session.submitIntent({
    type: 'move-unit',
    targetX: (expiryMovementStart.x / 7_680) + 4,
    targetY: expiryMovementStart.y / 7_680,
  });
  session.advance({ deltaMs: 0 });
  view = session.advance({ deltaMs: 100 });
  assert.equal(view.units[0]!.positionFine.x - expiryMovementStart.x, 9_000,
    'the APK keeps the bonus for the frame that decrements its counter to zero');
  assert.deepEqual(view.units[0]?.bonus, { type: 3, remainingMs: 0 });
  const clearMovementStart = view.units[0]!.positionFine;
  view = session.advance({ deltaMs: 100 });
  assert.equal(view.units[0]!.positionFine.x - clearMovementStart.x, 6_000,
    'the APK clears the bonus on the following unit update');
  assert.equal(view.units[0]?.bonus, undefined);
  session.close();
  duplicate.close();
});

test('speed bonus shortens the actual firing interval by one third', async () => {
  const scenario = createBonusCrateScenario('bonus-crate-cooldown-fixture', { x: 10, y: 8 }, true);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 1,
  });
  session.submitIntent({ type: 'start-wave' });
  session.advance({ deltaMs: 0 });
  let view = session.advance({ deltaMs: 11 });
  const crate = view.bonusCrates![0]!;
  assert.equal(crate.rewardType, 3);
  for (let index = 0; index < 5; index += 1) view = session.advance({ deltaMs: 100 });
  session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'move-unit', targetX: crate.positionFine.x / 7_680, targetY: crate.positionFine.y / 7_680 });
  let collected = false;
  for (let index = 0; index < 200 && !collected; index += 1) {
    view = session.advance({ deltaMs: 100 });
    collected = view.events.some((event) => event.type === 'bonus-crate-collected');
  }
  assert.equal(collected, true);
  if (!view.events.some((event) => event.type === 'unit-fired')) {
    session.submitIntent({ type: 'stop-moving' });
    view = session.advance({ deltaMs: 0 });
  }
  assert.ok(view.events.some((event) => event.type === 'unit-fired'), 'the first shot starts the cooldown');

  for (let index = 1; index <= 3; index += 1) {
    view = session.advance({ deltaMs: 100 });
    assert.equal(view.events.some((event) => event.type === 'unit-fired'), false,
      `the bonus cooldown has not expired after ${index * 100} ms`);
  }
  view = session.advance({ deltaMs: 100 });
  assert.ok(view.events.some((event) => event.type === 'unit-fired'),
    '500 ms base reload becomes 333 ms and is observed at the fourth 100 ms simulation step');
  session.close();
});

test('damage bonus extends actual attack range and increases the resulting hit', async () => {
  const scenario = createBonusCrateScenario('bonus-crate-damage-fixture', { x: 12, y: 4 }, true);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 4,
  });
  session.submitIntent({ type: 'start-wave' });
  session.advance({ deltaMs: 0 });
  let view = session.advance({ deltaMs: 11 });
  const crate = view.bonusCrates![0]!;
  assert.equal(crate.rewardType, 4);
  for (let index = 0; index < 5; index += 1) view = session.advance({ deltaMs: 100 });
  session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'move-unit', targetX: crate.positionFine.x / 7_680, targetY: crate.positionFine.y / 7_680 });
  let collected = false;
  for (let index = 0; index < 200 && !collected; index += 1) {
    view = session.advance({ deltaMs: 100 });
    collected = view.events.some((event) => event.type === 'bonus-crate-collected');
  }
  assert.equal(collected, true);
  assert.deepEqual(view.units[0]?.bonus, { type: 4, remainingMs: 60_000 });
  assert.equal(view.units[0]?.attackRange?.maximumTenthTiles, 61,
    'the square radius is multiplied by 1.5 before taking its displayed square root');
  session.submitIntent({ type: 'stop-moving' });
  view = session.advance({ deltaMs: 0 });
  assert.ok(view.events.some((event) => event.type === 'unit-fired'),
    'the enemy at 5.9 tiles is outside base range 5 but inside boosted range 6.1');

  let hit = view.events.find((event) => event.type === 'enemy-hit');
  for (let index = 0; index < 50 && !hit; index += 1) {
    view = session.advance({ deltaMs: 100 });
    hit = view.events.find((event) => event.type === 'enemy-hit');
  }
  assert.equal(hit?.type, 'enemy-hit');
  if (hit?.type === 'enemy-hit') assert.equal(hit.damage, 210);
  session.close();
});
