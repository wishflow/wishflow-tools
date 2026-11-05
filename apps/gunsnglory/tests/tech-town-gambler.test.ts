import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
import { createTechTownMapContent, assertTechTownGamblerCasinoPair } from '../src/content/tech-town-map-entities';
import { techTownMapEntityAssets } from '../src/content/tech-town-map-entity-assets';
import { createTechTownMapScene } from '../src/content/tech-town-scene';
import { createGame, type ScenarioContent } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function dimensions(assetName: string): { width: number; height: number } {
  const png = readFileSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(assetName)));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
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
