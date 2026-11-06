import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createTechTownTrainTestContent } from '../src/content/tech-town-train-sample';
import { createTechTownTrainUnits } from '../src/content/tech-town-units';
import { techTownRouteDefinitions } from '../src/content/tech-town-routes';
import { createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { drawGame } from '../src/render/canvas-renderer';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const gatlingUpgrades = [
  { damage: 150, reloadTimeMs: 250 },
  { damage: 175, reloadTimeMs: 200 },
  { damage: 200, reloadTimeMs: 150 },
] as const;

function testScenario(initialCash = 350): ScenarioContent {
  const base = createTechTownTrainTestContent();
  return {
    ...base,
    previewWave: { ...base.previewWave!, initialCash },
  };
}

async function openScenario(scenario = testScenario()) {
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 42,
  });
  return { scenario, session };
}

function gatlingWagons(units: readonly ScenarioUnit[]): ScenarioUnit[] {
  return units.filter(({ type }) => type === 'train-12');
}

async function startWaveAndHire(session: Awaited<ReturnType<typeof openScenario>>['session'], unitId?: string) {
  assert.equal(session.submitIntent({ type: 'start-wave' }), true);
  session.advance({ deltaMs: 0 });
  const unit = session.observe().units.find(({ id }) => id === unitId)
    ?? session.observe().units.find(({ type, activity }) => type === 'train-12' && activity === 4);
  assert.ok(unit);
  session.submitIntent({ type: 'select-at', x: unit.hitArea.x + 0.5, y: unit.hitArea.y + 0.5 });
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({
    type: 'hire-map-unit',
    unitId: unit.id,
    commandId: `${unit.id}:hire`,
  }), true);
  const hired = session.advance({ deltaMs: 0 });
  return { unitId: unit.id, view: hired };
}

test('models the three Tech Town Gatling wagons with APK base and upgrade rows', () => {
  const wagons = gatlingWagons(createTechTownTrainUnits());
  assert.equal(wagons.length, 3);
  for (const wagon of wagons) {
    assert.equal(wagon.activity, 4);
    assert.equal(wagon.hirePrice, 125);
    assert.equal(wagon.asset, 'lok_wagon_hori');
    assert.equal(wagon.awakeAsset, undefined);
    assert.equal(wagon.hireSound, 'sound_train');
    assert.equal(wagon.shotSound, 'sound_gattling_gun');
    assert.deepEqual(wagon.weapon, {
      damage: 125,
      damageType: 'light',
      rangeFine: 38_400,
      reloadTimeMs: 300,
      projectileSpeed: 750,
      damageStyle: 0,
      areaDamageFine: 0,
      postDamage: 0,
      postDamageDurationMs: 0,
      poisonDamage: 0,
      poisonDurationMs: 0,
      specialReloadTimeMs: 0,
      specialReloadFrequency: 1,
    });
    assert.deepEqual(wagon.upgradeLevels?.map(({ price, movementSpeedFinePer100Ms, weapon }) => ({
      price,
      movementSpeedFinePer100Ms,
      damage: weapon.damage,
      reloadTimeMs: weapon.reloadTimeMs,
      rangeFine: weapon.rangeFine,
      projectileSpeed: weapon.projectileSpeed,
      damageStyle: weapon.damageStyle,
    })), gatlingUpgrades.map(({ damage, reloadTimeMs }) => ({
      price: 75,
      movementSpeedFinePer100Ms: 3000,
      damage,
      reloadTimeMs,
      rangeFine: 38_400,
      projectileSpeed: 750,
      damageStyle: 0,
    })));
  }
});

test('keeps the Gatling combat fixture separate from the original map04 campaign data', () => {
  const fixture = createTechTownTrainTestContent();
  assert.equal(fixture.previewWave?.initialCash, 350);
  assert.equal(fixture.previewWave?.routes?.length, 1);
  assert.deepEqual(fixture.previewWave?.routes?.[0], techTownRouteDefinitions[2]);
  assert.equal(fixture.maxUpgrades, 3);
  assert.equal(fixture.formalSettlementSupported, undefined);
});

test('hires one selected map wagon for $125 and leaves rejected hires asleep with cash unchanged', async () => {
  const { session } = await openScenario();
  const { unitId, view } = await startWaveAndHire(session);

  assert.equal(view.wave?.cash, 225);
  assert.equal(view.units.find(({ id }) => id === unitId)?.activity, 5);
  assert.deepEqual(view.events.filter(({ type }) => type === 'map-unit-hired').map(({ type, ...event }) => event), [
    { unitId, unitType: 'train-12', price: 125 },
  ]);
  assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_train'));

  const poor = await openScenario(testScenario(124));
  assert.equal(poor.session.submitIntent({ type: 'start-wave' }), true);
  poor.session.advance({ deltaMs: 0 });
  const sleeping = poor.session.observe().units.find(({ type, activity }) => type === 'train-12' && activity === 4)!;
  poor.session.submitIntent({ type: 'select-at', x: sleeping.hitArea.x + 0.5, y: sleeping.hitArea.y + 0.5 });
  poor.session.advance({ deltaMs: 0 });
  poor.session.submitIntent({ type: 'hire-map-unit', unitId: sleeping.id, commandId: 'poor-hire' });
  const rejected = poor.session.advance({ deltaMs: 0 });
  assert.equal(rejected.wave?.cash, 124);
  assert.equal(rejected.units.find(({ id }) => id === sleeping.id)?.activity, 4);
  assert.ok(rejected.events.some((event) => event.type === 'map-unit-hire-rejected' && event.reason === 'insufficient-funds'));
});

test('applies three $75 Gatling upgrades and stops at the third APK row', async () => {
  const { session } = await openScenario();
  const hired = await startWaveAndHire(session);
  let view = hired.view;
  for (const [index, expected] of gatlingUpgrades.entries()) {
    assert.equal(session.submitIntent({
      type: 'upgrade-unit',
      unitId: hired.unitId,
      commandId: `${hired.unitId}:upgrade-${index + 1}`,
    }), true);
    view = session.advance({ deltaMs: 0 });
    const unit = view.units.find(({ id }) => id === hired.unitId)!;
    assert.equal(unit.upgradeLevel, index + 1);
    assert.equal(unit.weapon?.damage, expected.damage);
    assert.equal(unit.weapon?.reloadTimeMs, expected.reloadTimeMs);
    assert.equal(view.wave?.cash, 225 - ((index + 1) * 75));
    assert.equal(view.events.some((event) => event.type === 'unit-upgraded' && event.level === index + 1), true);
  }
  const maxed = view.units.find(({ id }) => id === hired.unitId)!;
  assert.equal(maxed.nextUpgrade, undefined);
});

test('fires a stationary hired Gatling on Tech Town route three with style-zero ballistics', async () => {
  const { session } = await openScenario();
  const hired = await startWaveAndHire(session);
  let firingView = hired.view;
  for (let tick = 0; tick < 100; tick += 1) {
    firingView = session.advance({ deltaMs: 100 });
    if (firingView.events.some((event) => event.type === 'unit-fired' && event.unitId === hired.unitId)) break;
  }

  const unit = firingView.units.find(({ id }) => id === hired.unitId)!;
  const fired = firingView.events.find((event) => event.type === 'unit-fired' && event.unitId === hired.unitId);
  const shot = firingView.shots.find(({ shooterId }) => shooterId === hired.unitId);
  assert.ok(fired, 'the route passes inside the original five-cell range');
  assert.ok(shot);
  assert.equal(shot.damageStyle, 0);
  assert.equal(shot.imageAsset, undefined, 'style zero uses the ordinary point projectile');
  assert.ok(firingView.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_gattling_gun'));
  assert.equal(unit.shootingAnimation?.asset, 'player_gatling_shot');
  assert.equal(unit.attackRange?.maximumTenthTiles, 50);
  assert.equal(unit.moving, false);

  let impactView = firingView;
  for (let tick = 0; tick < 100; tick += 1) {
    if (impactView.events.some((event) => event.type === 'enemy-hit')) break;
    impactView = session.advance({ deltaMs: 100 });
  }
  assert.ok(impactView.events.some((event) => event.type === 'enemy-hit' && event.damage === 125));
});

test('does not fire a Gatling while its train group is moving, even when the target remains in range', async () => {
  const { session } = await openScenario();
  const hired = await startWaveAndHire(session);
  let view = hired.view;
  for (let tick = 0; tick < 100; tick += 1) {
    view = session.advance({ deltaMs: 100 });
    if (view.events.some((event) => event.type === 'unit-fired' && event.unitId === hired.unitId)) break;
  }
  const beforeMove = view.units.find(({ id }) => id === hired.unitId)!;
  const target = view.enemies.find(({ alive }) => alive)!;
  assert.ok(Math.hypot(
    (target.positionFine.x - beforeMove.positionFine.x) / 7680,
    (target.positionFine.y - beforeMove.positionFine.y) / 7680,
  ) < 5, 'the target is within the Gatling range before moving');
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: beforeMove.cell.x + 3.5, targetY: beforeMove.cell.y + 0.5 }), true);

  for (let tick = 0; tick < 4; tick += 1) {
    view = session.advance({ deltaMs: 100 });
    assert.equal(view.units.find(({ id }) => id === hired.unitId)?.moving, true);
    assert.equal(view.events.some((event) => event.type === 'unit-fired' && event.unitId === hired.unitId), false);
  }
});

test('contains original mdpi Gatling sprite atlases and resolves them from the root asset directory', () => {
  for (const [asset, expected] of [
    ['player_gatling', { width: 32, height: 160 }],
    ['player_gatling_shot', { width: 64, height: 160 }],
  ] as const) {
    const png = readFileSync(path.join(appRoot, 'public/assets', `${asset}.png`));
    assert.equal(png.toString('ascii', 1, 4), 'PNG');
    assert.deepEqual({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) }, expected);
    assert.equal(gameAssetRelativePath(asset), `${asset}.png`);
  }
  for (const sound of ['sound_gattling_gun.ogg', 'sound_gattling_gun2.ogg']) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets/sounds', sound)), true);
  }
});

test('draws the Gatling atlas as an active-only overlay above the original wagon sprite', async () => {
  const baseWagon = createTechTownTrainUnits().find(({ type }) => type === 'train-12')!;
  const scenario: ScenarioContent = {
    id: 'tech-town-gatling-render',
    title: { en: 'Gatling render test', zh: '加特林绘制测试' },
    map: { width: 32, height: 24, tileSize: 32, background: [], streets: [] },
    units: [{ ...baseWagon, activity: 5 }],
    maxUpgrades: 3,
    recruitableUnits: [],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  const wagonImage = { naturalWidth: 48, naturalHeight: 48 } as HTMLImageElement;
  const idleGatlingImage = { naturalWidth: 32, naturalHeight: 160 } as HTMLImageElement;
  const fallbackImage = { naturalWidth: 96, naturalHeight: 96 } as HTMLImageElement;
  const images = new Proxy({
    lok_wagon_hori: wagonImage,
    player_gatling: idleGatlingImage,
    gng_frame: fallbackImage,
  } as Record<string, HTMLImageElement>, {
    get(target, property) {
      return typeof property === 'string' ? target[property] ?? fallbackImage : undefined;
    },
  });
  const drawCalls: unknown[][] = [];
  const context = new Proxy({
    drawImage(...args: unknown[]) { drawCalls.push(args); },
  } as unknown as CanvasRenderingContext2D, {
    get(target, property) {
      const value = Reflect.get(target, property);
      return value ?? (() => undefined);
    },
    set(target, property, value) {
      return Reflect.set(target, property, value);
    },
  });

  drawGame(context, session.observe(), images);
  const wagonDraw = drawCalls.find(([image]) => image === wagonImage);
  const weaponDraw = drawCalls.find(([image]) => image === idleGatlingImage);
  assert.ok(wagonDraw);
  assert.ok(weaponDraw);
  assert.deepEqual(weaponDraw.slice(1, 5), [0, 32, 32, 32]);
  assert.equal(weaponDraw[5], wagonDraw[5], 'weapon is centered over the wagon');
  assert.equal(Number(weaponDraw[7]), Number(wagonDraw[7]));

  const sleepingScenario = { ...scenario, id: 'tech-town-gatling-sleep-render', units: [{ ...baseWagon }] };
  const sleeping = await createGame({ scenarios: { [sleepingScenario.id]: sleepingScenario } }).open({ scenarioId: sleepingScenario.id });
  drawCalls.length = 0;
  drawGame(context, sleeping.observe(), images);
  assert.equal(drawCalls.some(([image]) => image === idleGatlingImage), false, 'sleeping cars do not draw their weapon slot');
});
