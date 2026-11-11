import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createMississippi11MapScene } from '../src/content/mississippi-11-scene';
import { createMississippi11SteamerUnits } from '../src/content/mississippi-11-steamer';
import map from '../src/content/mississippi-11.json';
import { createGame, type ScenarioContent } from '../src/game';
import { drawGame, getMapViewport } from '../src/render/canvas-renderer';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cannonId = 'mississippi-11-steamer-32';

const expectedWeaponRows = [
  { damage: 650, rangeFine: 76_800, areaDamageFine: 1_920, specialReloadTimeMs: 3_500 },
  { damage: 700, rangeFine: 76_800, areaDamageFine: 1_920, specialReloadTimeMs: 3_500 },
  { damage: 750, rangeFine: 92_160, areaDamageFine: 1_920, specialReloadTimeMs: 3_000 },
  { damage: 800, rangeFine: 92_160, areaDamageFine: 7_680, specialReloadTimeMs: 3_000 },
] as const;

function expectedWeapon(row: typeof expectedWeaponRows[number]) {
  return {
    damage: row.damage,
    damageType: 'heavy' as const,
    postDamage: 0,
    postDamageDurationMs: 0,
    poisonDamage: 0,
    poisonDurationMs: 0,
    rangeFine: row.rangeFine,
    reloadTimeMs: 100,
    projectileSpeed: 1_600,
    damageStyle: 4 as const,
    areaDamageFine: row.areaDamageFine,
    specialReloadTimeMs: row.specialReloadTimeMs,
    specialReloadFrequency: 2,
  };
}

function cannonScenario(initialCash = 365, spawnX = 12, direction: 'east' | 'west' = 'west'): ScenarioContent {
  const spawn = { cell: { x: spawnX, y: 22 }, direction };
  const route = { spawn, redirects: [], exit: { x: direction === 'east' ? 31 : 0, y: 22 } };
  return {
    id: `mississippi-11-cannon-check-${initialCash}`,
    contentVersion: 'gng-free-1.8.6-map14-cannon-check-v1',
    title: { en: 'Traveller’s Town cannon check', zh: '旅行者小镇炮位检查' },
    map: createMississippi11MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createMississippi11SteamerUnits(),
    maxUpgrades: 3,
    recruitableUnits: [],
    previewWave: {
      number: 1,
      initialLives: 25,
      initialCash,
      spawn,
      routes: [route],
      baseEnemySpeed: 1_200,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      escapePenalty: 1,
      redirects: route.redirects,
      exit: route.exit,
      enemy: {
        hitPoints: 10_000,
        cashReward: 0,
        penetration: { light: 100, fire: 100, heavy: 100, poison: 100 },
      },
    },
  };
}

async function startScenario(initialCash = 365, spawnX = 12, direction: 'east' | 'west' = 'west') {
  const scenario = cannonScenario(initialCash, spawnX, direction);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  return { scenario, session };
}

function hireCannon(session: Awaited<ReturnType<typeof startScenario>>['session']) {
  const cannon = session.observe().units.find(({ id }) => id === cannonId)!;
  assert.equal(session.submitIntent({
    type: 'select-at',
    x: cannon.hitArea.x + 0.5,
    y: cannon.hitArea.y + 0.5,
  }), true);
  assert.equal(session.advance({ deltaMs: 0 }).units.find(({ id }) => id === cannonId)?.selected, true);
  assert.equal(session.submitIntent({
    type: 'hire-map-unit',
    unitId: cannonId,
    commandId: `${cannonId}:hire`,
  }), true);
  return session.advance({ deltaMs: 0 });
}

async function startWaveAndHire(initialCash = 365, spawnX = 12, direction: 'east' | 'west' = 'west') {
  const { scenario, session } = await startScenario(initialCash, spawnX, direction);
  assert.equal(session.submitIntent({ type: 'start-wave' }), true);
  session.advance({ deltaMs: 0 });
  const hiredView = hireCannon(session);
  return { scenario, session, cannon: hiredView.units.find(({ id }) => id === cannonId)! };
}

function testImages(extra: Record<string, HTMLImageElement> = {}): Record<string, HTMLImageElement> {
  const fallback = { naturalWidth: 48, naturalHeight: 48, width: 48, height: 48 } as HTMLImageElement;
  return new Proxy(extra, {
    get(target, property) {
      return typeof property === 'string' ? target[property] ?? fallback : undefined;
    },
  });
}

function recordingContext(drawCalls: unknown[][]): CanvasRenderingContext2D {
  return new Proxy({
    drawImage(...args: unknown[]) { drawCalls.push(args); },
    measureText(text: string) { return { width: text.length * 6 } as TextMetrics; },
  } as unknown as CanvasRenderingContext2D, {
    get(target, property) {
      const value = Reflect.get(target, property);
      return value ?? (() => undefined);
    },
    set(target, property, value) {
      return Reflect.set(target, property, value);
    },
  });
}

function pngDimensions(assetName: string): { width: number; height: number } {
  const bytes = readFileSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(assetName)));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${assetName} is a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test('maps the map14 double cannon to its APK base row and three exact upgrades', () => {
  const cannon = createMississippi11SteamerUnits().find(({ id }) => id === cannonId);
  assert.ok(cannon);
  assert.equal(cannon.activity, 4);
  assert.equal(cannon.hirePrice, 150);
  assert.equal(cannon.movementSpeedFinePer100Ms, 1_000);
  assert.equal(cannon.weaponDrawOffsetYFine, 7_680);
  assert.equal(cannon.shotSound, 'sound_cannon');
  assert.deepEqual(cannon.weapon, expectedWeapon(expectedWeaponRows[0]));
  assert.deepEqual(cannon.upgradeLevels?.map(({ price, movementSpeedFinePer100Ms, weapon }) => ({
    price,
    movementSpeedFinePer100Ms,
    weapon,
  })), expectedWeaponRows.slice(1).map((row) => ({
    price: 100,
    movementSpeedFinePer100Ms: 1_000,
    weapon: expectedWeapon(row),
  })));
});

test('hires the cannon on the real map14 scene, keeps it inactive before hire, and moves it on water', async () => {
  const { session } = await startScenario();
  assert.equal(session.submitIntent({ type: 'start-wave' }), true);
  session.advance({ deltaMs: 0 });
  const sleeping = session.observe().units.find(({ id }) => id === cannonId)!;
  assert.equal(sleeping.activity, 4);
  assert.equal(sleeping.weaponAnimation, undefined);
  let view = session.advance({ deltaMs: 500 });
  assert.equal(view.events.some((event) => event.type === 'unit-fired' && event.unitId === cannonId), false);

  view = hireCannon(session);
  assert.equal(view.units.find(({ id }) => id === cannonId)?.activity, 5);
  assert.equal(view.wave?.cash, 215);
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 10.5, targetY: 22.5 }), true);
  session.advance({ deltaMs: 0 });
  const beforeMove = session.observe().units.find(({ id }) => id === cannonId)!;
  view = session.advance({ deltaMs: 100 });
  const moved = view.units.find(({ id }) => id === cannonId)!;
  assert.equal(moved.positionFine.x - beforeMove.positionFine.x, 1_000);
  assert.equal(moved.positionFine.y, beforeMove.positionFine.y);
});

test('applies all APK cannon upgrades, prices, cash changes, damage, range, and AOE', async () => {
  const { session, cannon } = await startWaveAndHire(465);
  assert.equal(cannon.weapon?.damage, 650);
  let view = session.observe();
  for (const [index, row] of expectedWeaponRows.slice(1).entries()) {
    assert.equal(session.submitIntent({
      type: 'upgrade-unit',
      unitId: cannonId,
      commandId: `${cannonId}:upgrade-${index + 1}`,
    }), true);
    view = session.advance({ deltaMs: 0 });
    const upgraded = view.units.find(({ id }) => id === cannonId)!;
    assert.equal(upgraded.upgradeLevel, index + 1);
    assert.deepEqual(upgraded.weapon, expectedWeapon(row));
    assert.equal(view.wave?.cash, 465 - 150 - (100 * (index + 1)));
  }
  assert.equal(view.units.find(({ id }) => id === cannonId)?.nextUpgrade, undefined);
  assert.equal(session.submitIntent({
    type: 'upgrade-unit', unitId: cannonId, commandId: `${cannonId}:upgrade-limit`,
  }), false, 'the public intent rejects an upgrade once the three APK rows are exhausted');
});

test('fires, animates the separate cannon overlay, and damages a target on the real map14 scene', async () => {
  const { session } = await startWaveAndHire();
  let view = session.observe();
  for (let tick = 0; tick < 10 && !view.events.some((event) => event.type === 'unit-fired' && event.unitId === cannonId); tick += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  assert.ok(view.events.some((event) => event.type === 'unit-fired' && event.unitId === cannonId));
  const cannon = view.units.find(({ id }) => id === cannonId)!;
  assert.equal(cannon.shootingAnimation, undefined, 'the cannon firing sprite must not replace the ship body');
  assert.equal(cannon.weaponAnimation?.asset, 'player_double_cannon_shot');
  assert.equal(cannon.weaponAnimation?.frame, 0);
  assert.deepEqual(cannon.weaponAnimation && {
    row: cannon.weaponAnimation.row,
    mirrored: cannon.weaponAnimation.mirrored,
  }, { row: 0, mirrored: true }, 'the cannon frame follows the target direction using the APK facing row and mirror');
  assert.deepEqual(cannon.weaponFacing, { row: 0, mirrored: true });
  assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_cannon'));

  for (let tick = 0; tick < 80 && !view.events.some((event) => event.type === 'enemy-hit' && event.damage === 650); tick += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  assert.ok(view.events.some((event) => event.type === 'enemy-hit' && event.damage === 650));
});

test('keeps an outward-moving target beyond the exclusive ten-tile cannon range and honors both reloads', async () => {
  const boundary = await startWaveAndHire(365, 21, 'east');
  assert.deepEqual(boundary.cannon.attackRange, {
    centerTenthTiles: { x: 95, y: 227 },
    maximumTenthTiles: 100,
    boundary: 'exclusive',
  });
  let view = boundary.session.observe();
  for (let tick = 0; tick < 8; tick += 1) {
    view = boundary.session.advance({ deltaMs: 100 });
    assert.equal(view.events.some((event) => event.type === 'unit-fired' && event.unitId === cannonId), false,
      'a target exactly ten tiles away and moving outward remains outside the strict range');
  }

  const inside = await startWaveAndHire(365, 20, 'west');
  const shotTimes: number[] = [];
  for (let tick = 1; tick <= 38; tick += 1) {
    const next = inside.session.advance({ deltaMs: 100 });
    if (next.events.some((event) => event.type === 'unit-fired' && event.unitId === cannonId)) shotTimes.push(tick * 100);
  }
  assert.deepEqual(shotTimes, [100, 200, 3_800],
    'the first reload is 100 ms; every second shot then adds the APK 3500 ms special reload');
});

test('draws the APK cannon idle/firing frame and upgrade arrows at the hull anchor', async () => {
  const { session } = await startScenario();
  const cannonImage = { naturalWidth: 48, naturalHeight: 240, width: 48, height: 240 } as HTMLImageElement;
  const firingImage = { naturalWidth: 48, naturalHeight: 240, width: 48, height: 240 } as HTMLImageElement;
  const arrowImage = { naturalWidth: 54, naturalHeight: 30, width: 54, height: 30 } as HTMLImageElement;
  const images = testImages({
    player_double_cannon: cannonImage,
    player_double_cannon_shot: firingImage,
    hud_upgrade_arrow_1: arrowImage,
  });
  const drawCalls: unknown[][] = [];
  const context = recordingContext(drawCalls);

  drawGame(context, session.observe(), images);
  assert.equal(drawCalls.some(([image]) => image === cannonImage || image === firingImage), false,
    'an un-hired type32 map marker has no weapon overlay');

  assert.equal(session.submitIntent({ type: 'start-wave' }), true);
  session.advance({ deltaMs: 0 });
  const sleeping = session.observe().units.find(({ id }) => id === cannonId)!;
  session.submitIntent({ type: 'select-at', x: sleeping.hitArea.x + 0.5, y: sleeping.hitArea.y + 0.5 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'hire-map-unit', unitId: cannonId, commandId: `${cannonId}:draw-hire` });
  let view = session.advance({ deltaMs: 0 });
  drawCalls.length = 0;
  drawGame(context, view, images);
  const idleDraw = drawCalls.find((args) => args[0] === cannonImage && args.length === 9);
  assert.ok(idleDraw);
  assert.deepEqual(idleDraw.slice(1, 5), [0, 3 * 48, 48, 48], 'hire starts with the APK row-3 cannon direction');
  const viewport = getMapViewport(view);
  const hired = view.units.find(({ id }) => id === cannonId)!;
  const centerX = viewport.origin.x + (hired.render.x + (hired.render.width / 2)) * viewport.tileSize;
  const centerY = viewport.origin.y + (hired.render.y + hired.render.height) * viewport.tileSize - viewport.tileSize;
  assert.deepEqual(idleDraw.slice(5), [
    Math.trunc(centerX - (viewport.tileSize / 2)),
    Math.trunc(centerY - (viewport.tileSize / 2)),
    Math.trunc(viewport.tileSize),
    Math.trunc(viewport.tileSize),
  ], 'the overlay is centered one tile above the ship foot anchor');

  session.submitIntent({ type: 'upgrade-unit', unitId: cannonId, commandId: `${cannonId}:draw-upgrade` });
  view = session.advance({ deltaMs: 0 });
  drawCalls.length = 0;
  drawGame(context, view, images);
  const arrowDraw = drawCalls.find((args) => args[0] === arrowImage && args.length === 9);
  assert.ok(arrowDraw);
  assert.deepEqual(arrowDraw.slice(1, 5), [0, 0, 18, 30], 'upgrade arrow uses the first 18×30 hdpi animation frame');
});

test('bundles original APK hdpi cannon and all three upgrade-arrow sprites', () => {
  assert.deepEqual(pngDimensions('player_double_cannon'), { width: 48, height: 240 });
  assert.deepEqual(pngDimensions('player_double_cannon_shot'), { width: 48, height: 240 });
  for (const asset of ['hud_upgrade_arrow_1', 'hud_upgrade_arrow_2', 'hud_upgrade_arrow_3']) {
    assert.equal(gameAssetRelativePath(asset), `hdpi/${asset}.png`);
    assert.deepEqual(pngDimensions(asset), { width: 54, height: 30 });
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true);
  }
});
