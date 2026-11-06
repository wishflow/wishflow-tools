import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { cowGulchP1dCampaignContent } from '../src/content/cow-gulch';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
import { createAnchoredMapRender } from '../src/content/fort-kaboom-unit-designs';
import map from '../src/content/new-mexico-04.json';
import { createTechTownBaseUnits } from '../src/content/tech-town-units';
import { GAME_RULES_VERSION, createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function dimensions(assetName: string): { width: number; height: number } {
  const png = readFileSync(path.join(appRoot, 'public/assets', `${assetName}.png`));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function activeSalesmanAt(unit: ScenarioUnit, cell: { x: number; y: number }): ScenarioUnit {
  const frame = unit.awakeFrame!;
  const render = createAnchoredMapRender(cell, frame);
  return {
    ...unit,
    activity: 5,
    cell,
    asset: unit.awakeAsset!,
    frame,
    render,
    hitArea: { ...render },
    awakeRender: { ...render },
    awakeHitArea: { ...render },
  };
}

function salesmanScenario(): ScenarioContent {
  const unit = createTechTownBaseUnits((unitTypeId) => unitTypeId === 36)
    .find(({ type }) => type === 'salesman');
  assert.ok(unit, 'map04 factory contains the unlocked Salesman marker');

  return {
    id: 'tech-town-salesman-poison-fixture',
    title: { en: 'Salesman test', zh: '药剂推销员测试' },
    map: { width: 17, height: 17, tileSize: 32, background: [], streets: [] },
    units: [activeSalesmanAt(unit, { x: 8, y: 8 })],
    maxUpgrades: 0,
    previewWave: {
      ...cowGulchPreviewWave,
      initialCash: 0,
      spawn: { cell: { x: 12, y: 8 }, direction: 'west' },
      additionalSpawns: [
        { cell: { x: 13, y: 8 }, direction: 'west' },
        { cell: { x: 14, y: 8 }, direction: 'west' },
      ],
      routes: undefined,
      baseEnemySpeed: 0,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      redirects: [],
      exit: { x: 0, y: 8 },
      enemy: {
        hitPoints: 100_000,
        cashReward: 0,
        penetration: { light: 100, fire: 50, heavy: 25, poison: 50 },
      },
    },
  };
}

test('creates the unlocked map04 Salesman from code 131 with APK level-zero data', () => {
  const placement = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 131 ? [{ code, cell: { x, y } }] : []
  )));
  assert.deepEqual(placement, [{ code: 131, cell: { x: 30, y: 14 } }]);

  const locked = createTechTownBaseUnits((unitTypeId) => unitTypeId !== 36);
  assert.equal(locked.some(({ type }) => type === 'salesman'), false);

  const unlocked = createTechTownBaseUnits((unitTypeId) => unitTypeId === 36);
  const salesman = unlocked.find(({ type }) => type === 'salesman');
  assert.ok(salesman);
  assert.equal(salesman.activity, 4);
  assert.deepEqual(salesman.cell, { x: 30, y: 14 });
  assert.equal(salesman.hirePrice, 110);
  assert.equal(salesman.movementSpeedFinePer100Ms, 1500);
  assert.equal(salesman.asset, 'player_salesman_sleep');
  assert.deepEqual(salesman.frame, { x: 0, y: 0, width: 32, height: 44 });
  assert.deepEqual(salesman.render, { x: 30, y: 13.375, width: 1, height: 1.375 });
  assert.equal(salesman.awakeAsset, 'player_salesman');
  assert.deepEqual(salesman.awakeFrame, { x: 0, y: 0, width: 32, height: 44 });
  assert.equal(salesman.hireSound, 'sound_snakeoilsalesman');
  assert.deepEqual(salesman.weapon, {
    damage: 75,
    damageType: 'poison',
    poisonDamage: 40,
    poisonDurationMs: 3000,
    rangeFine: 30720,
    reloadTimeMs: 5000,
    projectileSpeed: 1500,
    damageStyle: 5,
    areaDamageFine: 15360,
  });
});

test('uses original Salesman, bottle, poison-cloud and audio assets', () => {
  const sourceSizes = {
    player_salesman_sleep: { width: 32, height: 44 },
    player_salesman: { width: 96, height: 220 },
    player_salesman_shot: { width: 64, height: 220 },
    portrait_salesman: { width: 96, height: 110 },
    sfx_salesman_bottle: { width: 48, height: 16 },
    sfx_poison: { width: 192, height: 32 },
  };
  for (const [asset, size] of Object.entries(sourceSizes)) {
    assert.deepEqual(dimensions(asset), size);
    assert.equal(gameAssetRelativePath(asset), `${asset}.png`);
  }
  for (const sound of [
    'sound_snakeoilsalesman_1.ogg',
    'sound_snakeoilsalesman_2.ogg',
    'sound_poison_splash_1.ogg',
    'sound_poison_splash_2.ogg',
  ]) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets/sounds', sound)), true, `${sound} is available`);
  }
});

test('hiring the map04 Salesman emits the original randomized hire-sound request', async () => {
  const salesman = createTechTownBaseUnits((unitTypeId) => unitTypeId === 36)
    .find(({ type }) => type === 'salesman');
  assert.ok(salesman);
  const scenario: ScenarioContent = {
    id: 'tech-town-salesman-hire-sound-fixture',
    title: { en: 'Salesman hire sound', zh: '推销员雇佣音效' },
    map: { width: 64, height: 27, tileSize: 32, background: [], streets: [] },
    units: [salesman],
    previewWave: { ...cowGulchPreviewWave, initialCash: 110 },
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 31,
  });
  session.submitIntent({ type: 'start-wave' });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'select-at', x: 30.5, y: 14 });
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.units[0]?.selected, true);
  session.submitIntent({ type: 'hire-map-unit', unitId: salesman.id, commandId: 'hire-salesman' });
  view = session.advance({ deltaMs: 0 });
  assert.equal(view.wave?.cash, 0);
  assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_snakeoilsalesman'));
  session.close();
});

test('throws the style-5 bottle, deals strict-area poison damage, and ticks poison separately from fire', async () => {
  const scenario = salesmanScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 17,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.enemies.length, 3);

  const primary = view.enemies[0]!;
  session.submitIntent({
    type: 'select-at',
    x: primary.positionFine.x / 7680,
    y: (primary.positionFine.y / 7680) - 0.25,
  });
  view = session.advance({ deltaMs: 0 });
  assert.equal(view.priorityTargetId, primary.id);

  let fired = false;
  for (let frame = 0; frame < 80; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    if (view.events.some((event) => event.type === 'unit-fired' && event.unitId === 'salesman-hire-01')) {
      fired = true;
      break;
    }
  }
  assert.equal(fired, true, 'the Salesman fires after the APK cooldown');
  const bottle = view.shots.find(({ damageStyle }) => damageStyle === 5);
  assert.ok(bottle);
  assert.equal(bottle.imageAsset, 'sfx_salesman_bottle');
  assert.equal(bottle.animationFrame, 1, 'the newly launched bottle advances during the firing frame');
  assert.equal(view.units[0]?.shootingAnimation?.asset, 'player_salesman_shot');

  const damageBefore = new Map(view.enemies.map(({ id, hitPoints }) => [id, hitPoints]));
  for (let frame = 0; frame < 100; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    if (view.shots.some(({ id, imageAsset }) => id === bottle.id && imageAsset === 'sfx_poison')) break;
  }
  const cloud = view.shots.find(({ id }) => id === bottle.id);
  assert.equal(cloud?.imageAsset, 'sfx_poison', 'the resolved bottle becomes the original six-frame poison cloud');
  assert.equal(cloud?.remainingMs, 2900, 'the impact frame consumes its 100 ms simulation step');
  const directHits = view.events.filter((event) => event.type === 'enemy-hit');
  const primaryHit = directHits.find((event) => event.type === 'enemy-hit' && event.enemyId === primary.id);
  assert.equal(primaryHit?.type, 'enemy-hit');
  if (primaryHit?.type === 'enemy-hit') assert.equal(primaryHit.damage, 37, '75 × 50% truncates toward zero');
  assert.equal(view.enemies.find(({ id }) => id === primary.id)?.hitPoints, damageBefore.get(primary.id)! - 37);
  const neighbors = view.enemies.filter(({ id }) => id !== primary.id);
  assert.equal(damageBefore.get(neighbors[0]!.id)! - neighbors[0]!.hitPoints, 37,
    'the neighboring enemy inside the strict 2-tile radius takes direct AOE damage');
  assert.equal(damageBefore.get(neighbors[1]!.id), neighbors[1]!.hitPoints,
    'an enemy exactly 2 tiles from the impact center is excluded by the strict boundary');
  assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_poison_splash'),
    'the impact requests the positional poison splash sound');
  assert.equal(GAME_RULES_VERSION, 'gng-rules-19');

  view = session.advance({ deltaMs: 100 });
  assert.equal(view.enemies.some(({ poisoned }) => poisoned), false, 'exactly 100 ms does not mark enemies');
  view = session.advance({ deltaMs: 1 });
  const markedPrimary = view.enemies.find(({ id }) => id === primary.id);
  assert.equal(markedPrimary?.poisoned, true, 'the shared poison application timer is strict >100 ms');
  assert.equal(markedPrimary?.poisonDamage, 40);
  assert.equal(view.enemies.find(({ id }) => id === neighbors[0]!.id)?.poisoned, true,
    'the poison cloud marks enemies inside the strict 2-tile radius');
  assert.notEqual(view.enemies.find(({ id }) => id === neighbors[1]!.id)?.poisoned, true,
    'the poison cloud excludes enemies exactly on the strict radius boundary');

  const poisonClockRemainder = view.elapsedMs % 250;
  const untilStrictPoisonTick = poisonClockRemainder === 0 ? 1 : 251 - poisonClockRemainder;
  let remainingBeforeTick = untilStrictPoisonTick - 1;
  while (remainingBeforeTick > 0) {
    const deltaMs = Math.min(100, remainingBeforeTick);
    view = session.advance({ deltaMs });
    assert.equal(view.events.some((event) => event.type === 'enemy-hit' && event.damage === 20), false,
      'the independent poison damage timer has not fired at exactly 250 ms');
    remainingBeforeTick -= deltaMs;
  }
  view = session.advance({ deltaMs: 1 });
  assert.ok(view.events.some((event) => event.type === 'enemy-hit' && event.enemyId === primary.id && event.damage === 20),
    `the strict >250 ms poison tick applies trunc(40 × 50%) = 20 (elapsed=${view.elapsedMs}, remainder=${poisonClockRemainder}, step=${untilStrictPoisonTick})`);
  assert.notEqual(view.enemies.find(({ id }) => id === primary.id)?.poisoned, true,
    'the enemy director clears poison after each damage tick');

  while (view.shots.some(({ id }) => id === bottle.id)) view = session.advance({ deltaMs: 100 });
  assert.equal(view.shots.some(({ id }) => id === bottle.id), false, 'poison cloud expires after 3000 ms');
  session.close();
});

test('poison splash leaves the type-8 tow immune to direct damage and poison status', async () => {
  const original = cowGulchP1dCampaignContent;
  const salesman = createTechTownBaseUnits((unitTypeId) => unitTypeId === 36)
    .find(({ type }) => type === 'salesman');
  assert.ok(salesman);
  const activeSalesman = activeSalesmanAt(salesman, { x: 12, y: 8 });
  const scenario: ScenarioContent = {
    ...original,
    id: 'tech-town-salesman-type-8-immunity',
    units: [activeSalesman],
    campaignWaveCount: 1,
    campaignWaves: [{
      ...original.campaignWaves![0]!,
      spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0] }],
    }],
    campaignUnitPool: undefined,
    campaignBonusCratePool: undefined,
    previewWave: {
      ...original.previewWave!,
      spawn: { cell: { x: 12, y: 8 }, direction: 'east' },
      additionalSpawns: [],
      baseEnemySpeed: 0,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      redirects: [],
      exit: { x: 16, y: 8 },
    },
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 3,
  });
  let view = session.advance({ deltaMs: 0 });
  assert.deepEqual(view.enemies.map(({ type }) => type), [8, 4]);
  const tow = view.enemies[0]!;
  const wagon = view.enemies[1]!;
  assert.equal(tow.damageable, false);
  assert.equal(wagon.damageable, true);

  let bottleId: string | undefined;
  for (let frame = 0; frame < 80; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    bottleId = view.shots.find(({ damageStyle }) => damageStyle === 5)?.id;
    if (bottleId) break;
  }
  assert.ok(bottleId, 'Salesman selects the damageable wagon while the tow shares its AOE');
  for (let frame = 0; frame < 60; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    if (view.shots.some(({ id, imageAsset }) => id === bottleId && imageAsset === 'sfx_poison')) break;
  }
  assert.equal(view.enemies.find(({ id }) => id === tow.id)?.hitPoints, tow.hitPoints,
    'the type-8 tow takes no direct poison damage inside the splash radius');
  for (let frame = 0; frame < 3; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    assert.notEqual(view.enemies.find(({ id }) => id === tow.id)?.poisoned, true,
      'the poison cloud cannot set status on the type-8 tow');
  }
  session.close();
});

test('a later weaker poison mark does not replace a stronger active poison value', async () => {
  const source = createTechTownBaseUnits((unitTypeId) => unitTypeId === 36)
    .find(({ type }) => type === 'salesman');
  assert.ok(source?.weapon);
  const strong = activeSalesmanAt(source, { x: 10, y: 8 });
  strong.id = 'salesman-strong-poison';
  strong.weapon = { ...strong.weapon!, poisonDamage: 80, projectileSpeed: 1_500, rangeFine: 46_080 };
  const weak = activeSalesmanAt(source, { x: 8, y: 8 });
  weak.id = 'salesman-weak-poison';
  weak.weapon = { ...weak.weapon!, poisonDamage: 20, projectileSpeed: 1_700, rangeFine: 46_080 };
  const scenario: ScenarioContent = {
    ...salesmanScenario(),
    id: 'tech-town-salesman-poison-refresh-fixture',
    units: [strong, weak],
    previewWave: {
      ...salesmanScenario().previewWave!,
      spawn: { cell: { x: 14, y: 8 }, direction: 'west' },
      additionalSpawns: [],
      enemy: {
        hitPoints: 100_000,
        cashReward: 0,
        penetration: { light: 100, fire: 100, heavy: 100, poison: 50 },
      },
    },
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 29,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  let strongShotId: string | undefined;
  for (let frame = 0; frame < 80; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    strongShotId = view.shots.find(({ damageStyle, shooterId }) => (
      damageStyle === 5 && shooterId === strong.id
    ))?.id;
    if (strongShotId) break;
  }
  assert.ok(strongShotId, 'the stronger Salesman fires');
  const weakShotId = view.shots.find(({ damageStyle, shooterId }) => (
    damageStyle === 5 && shooterId === weak.id
  ))?.id;
  assert.ok(weakShotId, 'the weaker Salesman fires at the same target');

  for (let frame = 0; frame < 60; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    const strongCloud = view.shots.find(({ id, imageAsset }) => id === strongShotId && imageAsset === 'sfx_poison');
    if (strongCloud) break;
  }
  const primary = view.enemies[0]!;
  let poisonDamage = primary.poisonDamage;
  let strongMarkedAt = view.elapsedMs;
  for (let frame = 0; frame < 4 && poisonDamage !== 80; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    poisonDamage = view.enemies.find(({ id }) => id === primary.id)?.poisonDamage;
    if (poisonDamage === 80) strongMarkedAt = view.elapsedMs;
  }
  assert.equal(poisonDamage, 80, 'the stronger cloud marks with its 80-point poison value');

  let weakImpactAt = view.elapsedMs;
  for (let frame = 0; frame < 60; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    if (view.shots.some(({ id, imageAsset }) => id === weakShotId && imageAsset === 'sfx_poison')) {
      weakImpactAt = view.elapsedMs;
      break;
    }
  }
  view = session.advance({ deltaMs: 100 });
  assert.equal(view.enemies.find(({ id }) => id === primary.id)?.poisonDamage, 80,
    `a later weaker cloud cannot downgrade the active poison value (mark=${strongMarkedAt}, weak-impact=${weakImpactAt})`);
  session.close();
});
