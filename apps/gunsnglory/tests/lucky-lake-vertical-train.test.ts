import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createTechTownTrainTestContent } from '../src/content/tech-town-train-sample';
import { createCampaignTrainUnits } from '../src/content/campaign-train-units';
import { createVerticalTrainPlacements } from '../src/content/campaign-map-unit-placements';
import { createGame, type GameView, type ScenarioContent } from '../src/game';
import { drawGame, getMapViewport, type GameImages } from '../src/render/canvas-renderer';

const verticalTrainGroupId = 'lucky-lake-train';
const appRoot = path.resolve(import.meta.dirname, '..');

function createLuckyLakeTrainGrid(blocker?: { x: number; y: number }): number[][] {
  const grid = Array.from({ length: 24 }, () => Array<number>(32).fill(0));
  for (let y = 10; y <= 14; y += 1) grid[y]![7] = 92;
  for (let y = 15; y <= 16; y += 1) grid[y]![7] = 91;
  if (blocker) grid[blocker.y]![blocker.x] = 48;
  return grid;
}

function createLuckyLakeTrainScenario(blocker?: { x: number; y: number }): ScenarioContent {
  const base = createTechTownTrainTestContent();
  const originalTileGrid = createLuckyLakeTrainGrid(blocker);
  const placements = createVerticalTrainPlacements(originalTileGrid);
  return {
    ...base,
    id: 'lucky-lake-vertical-train-test',
    title: { en: 'Lucky Lake vertical train test', zh: 'Lucky Lake 垂直列车测试' },
    map: {
      width: 32,
      height: 24,
      tileSize: 32,
      background: [],
      streets: [],
      decorations: [],
      originalTileGrid,
    },
    originalTileGrid,
    units: createCampaignTrainUnits(placements, verticalTrainGroupId),
  };
}

async function openLuckyLakeTrain(blocker?: { x: number; y: number }) {
  const scenario = createLuckyLakeTrainScenario(blocker);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  return { scenario, session };
}

function trainUnits(view: GameView) {
  return view.units.filter(({ movementGroupId }) => movementGroupId === verticalTrainGroupId);
}

test('decodes the original seven vertical train cells in APK construction order', () => {
  const placements = createVerticalTrainPlacements(createLuckyLakeTrainGrid());

  assert.deepEqual(placements.map(({ sourceCode, unitTypeId, activity, asset, cell }) => ({
    sourceCode, unitTypeId, activity, asset, cell,
  })), [
    ...[10, 11, 12, 13, 14].map((y) => ({
      sourceCode: 92,
      unitTypeId: 22,
      activity: 4,
      asset: 'lok_wagon_verti',
      cell: { x: 7, y },
    })),
    {
      sourceCode: 91,
      unitTypeId: 20,
      activity: 5,
      asset: 'lok_verti_2of2',
      cell: { x: 7, y: 15 },
    },
    {
      sourceCode: 91,
      unitTypeId: 21,
      activity: 5,
      asset: 'lok_verti_1of2',
      cell: { x: 7, y: 16 },
    },
  ]);
});

test('rejects missing or interrupted vertical train marker groups', () => {
  assert.throws(
    () => createVerticalTrainPlacements(createLuckyLakeTrainGrid().map((row, y) => (
      y === 15 ? row.map((code, x) => x === 7 ? 0 : code) : row
    ))),
    /vertical train/i,
  );
  assert.throws(
    () => createVerticalTrainPlacements(createLuckyLakeTrainGrid().map((row, y) => (
      y === 12 ? row.map((code, x) => x === 7 ? 0 : code) : row
    ))),
    /vertical train/i,
  );
});

test('builds vertical sprites with APK anchors and only wagon hire/weapon capability', () => {
  const units = createLuckyLakeTrainScenario().units;
  const train = units.filter(({ movementGroupId }) => movementGroupId === verticalTrainGroupId);

  assert.deepEqual(train.map(({ type, activity, asset, cell, frame, render, hitArea }) => ({
    type, activity, asset, cell, frame, render, hitArea,
  })), [
    ...[10, 11, 12, 13, 14].map((y) => ({
      type: 'train-22', activity: 4, asset: 'lok_wagon_verti',
      cell: { x: 7, y }, frame: { x: 0, y: 0, width: 48, height: 60 },
      render: { x: 7, y, width: 1, height: 1.25 },
      hitArea: { x: 7, y, width: 1, height: 1.25 },
    })),
    {
      type: 'train-20', activity: 5, asset: 'lok_verti_2of2',
      cell: { x: 7, y: 15 }, frame: { x: 0, y: 0, width: 48, height: 60 },
      render: { x: 7, y: 15, width: 1, height: 1.25 },
      hitArea: { x: 7, y: 15, width: 1, height: 1.25 },
    },
    {
      type: 'train-21', activity: 5, asset: 'lok_verti_1of2',
      cell: { x: 7, y: 16 }, frame: { x: 0, y: 0, width: 48, height: 48 },
      render: { x: 7, y: 16.25, width: 1, height: 1 },
      hitArea: { x: 7, y: 16.25, width: 1, height: 1 },
    },
  ]);
  assert.ok(train.every(({ movementGroupId, movementAxis }) => (
    movementGroupId === verticalTrainGroupId && movementAxis === 'vertical'
  )));
  assert.ok(train.every(({ collisionBoxFine }) => (
    JSON.stringify(collisionBoxFine) === JSON.stringify({ x: -2534, y: -3840, width: 4608, height: 7680 })
  )));
  assert.deepEqual(train.filter(({ steamEmitter }) => steamEmitter).map(({ type }) => type), ['train-21']);
  assert.ok(train.filter(({ type }) => type !== 'train-22').every(({ hirePrice, weapon, upgradeLevels }) => (
    hirePrice === undefined && weapon === undefined && upgradeLevels === undefined
  )));
  assert.ok(train.filter(({ type }) => type === 'train-22').every(({ activity, hirePrice, weapon, upgradeLevels, weaponDrawOffsetYFine }) => (
    activity === 4 && hirePrice === 125 && weapon?.damage === 125
      && upgradeLevels?.length === 3 && weaponDrawOffsetYFine === 4992
  )));
});

test('moves the whole train vertically, ignores horizontal drag, and stops at a blocked cell', async () => {
  const { session } = await openLuckyLakeTrain({ x: 7, y: 18 });
  const initial = trainUnits(session.observe());
  const lead = initial.find(({ type }) => type === 'train-20')!;

  session.submitIntent({ type: 'select-at', x: 7.5, y: 15.5 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({
    type: 'move-unit',
    targetX: lead.positionFine.x / 7680 + 3,
    targetY: lead.positionFine.y / 7680,
  });
  const horizontalAttempt = trainUnits(session.advance({ deltaMs: 100 }));
  assert.deepEqual(horizontalAttempt.map(({ positionFine }) => positionFine), initial.map(({ positionFine }) => positionFine));

  session.submitIntent({ type: 'move-unit', targetX: 7.5, targetY: 22 });
  const moved = trainUnits(session.advance({ deltaMs: 100 }));
  assert.ok(moved.some(({ positionFine }, index) => positionFine.y > initial[index]!.positionFine.y));
  assert.ok(moved.every(({ positionFine }, index) => (
    positionFine.x === initial[index]!.positionFine.x
      && positionFine.y - initial[index]!.positionFine.y === moved[0]!.positionFine.y - initial[0]!.positionFine.y
  )));

  const blocked = trainUnits(session.advance({ deltaMs: 100 }));
  assert.deepEqual(blocked.map(({ positionFine }) => positionFine), moved.map(({ positionFine }) => positionFine));
  assert.ok(blocked.every(({ moving }) => !moving));
});

test('stops the full train at the map boundary without changing segment spacing', async () => {
  const { session } = await openLuckyLakeTrain();
  const initial = trainUnits(session.observe());
  session.submitIntent({ type: 'select-at', x: 7.5, y: 15.5 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'move-unit', targetX: 7.5, targetY: 24.5 });

  let units = trainUnits(session.advance({ deltaMs: 100 }));
  for (let step = 0; step < 80 && units.some(({ moving }) => moving); step += 1) {
    units = trainUnits(session.advance({ deltaMs: 100 }));
  }
  assert.ok(units.every(({ moving }) => !moving));
  assert.ok(units.every(({ positionFine }, index) => (
    index === 0 || positionFine.y - units[index - 1]!.positionFine.y === 7680
  )));
  assert.ok(units.every(({ positionFine }) => positionFine.y < 24 * 7680));
  assert.notDeepEqual(units.map(({ positionFine }) => positionFine.y), initial.map(({ positionFine }) => positionFine.y));
});

test('hires the wagon as the only train unit with a weapon and draws its vertical gun offset', async () => {
  const { session } = await openLuckyLakeTrain();
  const wagonId = `${verticalTrainGroupId}-22-7-10`;
  session.submitIntent({ type: 'select-at', x: 7.5, y: 10.5 });
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: wagonId, commandId: 'hire-wagon' }), true);
  const view = session.advance({ deltaMs: 0 });
  const hired = view.units.find(({ id }) => id === wagonId)!;
  assert.equal(hired.activity, 5);
  assert.equal(hired.weapon?.damage, 125);

  const train = view.units.filter(({ movementGroupId }) => movementGroupId === verticalTrainGroupId);
  assert.ok(train.filter(({ type }) => type !== 'train-22').every(({ weapon }) => weapon === undefined));
  const ground = { naturalWidth: 32, naturalHeight: 32 } as HTMLImageElement;
  const wagonImage = { naturalWidth: 48, naturalHeight: 60 } as HTMLImageElement;
  const gatlingImage = { naturalWidth: 96, naturalHeight: 160 } as HTMLImageElement;
  const drawCalls: unknown[][] = [];
  const context = new Proxy({ drawImage(...args: unknown[]) { drawCalls.push(args); } }, {
    get(target, property) {
      if (property in target) return target[property as keyof typeof target];
      return () => undefined;
    },
  }) as unknown as CanvasRenderingContext2D;
  const images = new Proxy({
    ground,
    lok_wagon_verti: wagonImage,
    player_gatling: gatlingImage,
  }, { get(target, property) { return target[property as keyof typeof target] ?? ground; } }) as GameImages;
  const viewport = getMapViewport(view);

  drawGame(context, view, images);

  const wagonDraw = drawCalls.find(([image]) => image === wagonImage)!;
  assert.deepEqual(wagonDraw.slice(5), [
    Math.trunc(viewport.origin.x + hired.render.x * viewport.tileSize),
    Math.trunc(viewport.origin.y + hired.render.y * viewport.tileSize),
    Math.trunc(viewport.tileSize),
    Math.trunc(1.25 * viewport.tileSize),
  ]);
  const gatlingDraw = drawCalls.find(([image]) => image === gatlingImage)!;
  const left = viewport.origin.x + hired.render.x * viewport.tileSize;
  const top = viewport.origin.y + hired.render.y * viewport.tileSize;
  const centerX = left + (hired.render.width * viewport.tileSize / 2);
  const centerY = top + (hired.render.height * viewport.tileSize) - (4992 / 7680 * viewport.tileSize);
  assert.deepEqual(gatlingDraw.slice(5), [
    Math.trunc(centerX - viewport.tileSize / 2),
    Math.trunc(centerY - viewport.tileSize / 2),
    Math.trunc(viewport.tileSize),
    Math.trunc(viewport.tileSize),
  ]);
});

test('ships the three APK vertical train images with their original HDPI dimensions', () => {
  const dimensions: Record<string, readonly [number, number]> = {
    lok_verti_1of2: [48, 48],
    lok_verti_2of2: [48, 60],
    lok_wagon_verti: [48, 60],
  };
  for (const [asset, [width, height]] of Object.entries(dimensions)) {
    const png = readFileSync(path.join(appRoot, 'public/assets/hdpi', `${asset}.png`));
    assert.equal(png.toString('ascii', 1, 4), 'PNG');
    assert.equal(png.readUInt32BE(16), width, `${asset} width`);
    assert.equal(png.readUInt32BE(20), height, `${asset} height`);
  }
});
