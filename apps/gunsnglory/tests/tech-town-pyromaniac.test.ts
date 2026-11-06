import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
import map from '../src/content/new-mexico-04.json';
import { createTechTownFreshGameUnitPlacements } from '../src/content/tech-town-map-units';
import { createTechTownBaseUnits } from '../src/content/tech-town-units';
import { GAME_RULES_VERSION, createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function dimensions(assetName: string): { width: number; height: number } {
  const png = readFileSync(path.join(appRoot, 'public/assets', `${assetName}.png`));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function unitAtCell(unit: ScenarioUnit, cell: { x: number; y: number }): ScenarioUnit {
  const render = { ...unit.render, x: cell.x, y: cell.y - 0.625 };
  const awakeRender = { ...unit.awakeRender!, x: cell.x, y: cell.y - 0.625 };
  return {
    ...unit,
    cell,
    render,
    hitArea: { ...render },
    awakeRender,
    awakeHitArea: { ...awakeRender },
  };
}

function pyromaniacFixture(unit: ScenarioUnit, initialCash: number): ScenarioContent {
  return {
    id: `tech-town-pyromaniac-${initialCash}`,
    title: { en: 'Pyromaniac test', zh: '纵火狂测试' },
    map: { width: 17, height: 17, tileSize: 32, background: [], streets: [] },
    units: [unitAtCell(unit, { x: 8, y: 8 })],
    maxUpgrades: 0,
    previewWave: {
      ...cowGulchPreviewWave,
      initialCash,
      spawn: { cell: { x: 12, y: 8 }, direction: 'west' },
      routes: undefined,
      baseEnemySpeed: 0,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      redirects: [],
      exit: { x: 0, y: 8 },
      enemy: {
        hitPoints: 1_000_000,
        cashReward: 0,
        penetration: { light: 100, fire: 100, heavy: 100, poison: 100 },
      },
    },
  };
}

test('creates only the unlocked original Pyromaniac marker with level-zero APK data', () => {
  const placement = createTechTownFreshGameUnitPlacements().find(({ sourceCode }) => sourceCode === 130);
  assert.deepEqual(placement, {
    sourceCode: 130,
    unitTypeId: 35,
    activity: 4,
    cell: { x: 0, y: 20 },
  });
  assert.equal(map.originalTileGrid[20]?.[0], 130);

  const locked = createTechTownBaseUnits((unitTypeId) => unitTypeId !== 35);
  assert.equal(locked.some(({ type }) => type === 'pyromaniac'), false);

  const unlocked = createTechTownBaseUnits((unitTypeId) => unitTypeId === 35);
  const pyromaniacs = unlocked.filter(({ type }) => type === 'pyromaniac');
  assert.equal(pyromaniacs.length, 1);

  const pyromaniac = pyromaniacs[0]!;
  assert.equal(pyromaniac.id, 'pyromaniac-hire-01');
  assert.equal(pyromaniac.activity, 4);
  assert.deepEqual(pyromaniac.cell, { x: 0, y: 20 });
  assert.equal(pyromaniac.hirePrice, 130);
  assert.equal(pyromaniac.movementSpeedFinePer100Ms, 2000);
  assert.equal(pyromaniac.asset, 'player_pyromaniac_sleep');
  assert.deepEqual(pyromaniac.frame, { x: 0, y: 0, width: 32, height: 44 });
  assert.deepEqual(pyromaniac.render, { x: 0, y: 19.375, width: 1, height: 1.375 });
  assert.deepEqual(pyromaniac.hitArea, pyromaniac.render);
  assert.equal(pyromaniac.awakeAsset, 'player_pyromaniac');
  assert.deepEqual(pyromaniac.awakeFrame, { x: 0, y: 0, width: 32, height: 44 });
  assert.deepEqual(pyromaniac.awakeRender, pyromaniac.render);
  assert.deepEqual(pyromaniac.awakeHitArea, pyromaniac.render);
  assert.equal(pyromaniac.hireSound, 'sound_pyromaniac');
  assert.equal(pyromaniac.shotSound, 'sound_rocket_launch');
  assert.deepEqual(pyromaniac.weapon, {
    damage: 300,
    damageType: 'heavy',
    postDamage: 12,
    postDamageDurationMs: 500,
    rangeFine: 46080,
    reloadTimeMs: 4000,
    projectileSpeed: 1000,
    damageStyle: 6,
    areaDamageFine: 7680,
    specialReloadTimeMs: 0,
    specialReloadFrequency: 1,
  });
});

test('uses the APK Pyromaniac sprites and root-density asset paths', () => {
  assert.deepEqual(dimensions('player_pyromaniac_sleep'), { width: 32, height: 44 });
  assert.deepEqual(dimensions('player_pyromaniac'), { width: 96, height: 220 });
  assert.deepEqual(dimensions('player_pyromaniac_shot'), { width: 64, height: 220 });
  assert.deepEqual(dimensions('portrait_pyromaniac'), { width: 112, height: 96 });
  for (const asset of ['player_pyromaniac_sleep', 'player_pyromaniac', 'player_pyromaniac_shot', 'portrait_pyromaniac']) {
    assert.equal(gameAssetRelativePath(asset), `${asset}.png`);
  }
  for (const sound of ['sound_pyromaniac_1.ogg', 'sound_pyromaniac_2.ogg']) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets/sounds', sound)), true);
  }
});

test('hires Pyromaniac for 130, keeps level zero non-upgradeable, and fires the Style 6 rocket', async () => {
  const pyromaniac = createTechTownBaseUnits((unitTypeId) => unitTypeId === 35)
    .find(({ type }) => type === 'pyromaniac');
  assert.ok(pyromaniac);
  const scenario = pyromaniacFixture(pyromaniac, 130);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 42,
  });

  session.submitIntent({ type: 'start-wave' });
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 }), true);
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.units[0]?.selected, true);
  assert.equal(session.submitIntent({ type: 'upgrade-unit', unitId: pyromaniac.id, commandId: 'pyro-upgrade' }), false);
  assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: pyromaniac.id, commandId: 'pyro-hire' }), true);
  view = session.advance({ deltaMs: 0 });

  assert.equal(view.wave?.cash, 0);
  assert.equal(view.units[0]?.activity, 5);
  assert.equal(view.units[0]?.asset, 'player_pyromaniac');
  assert.equal(view.units[0]?.movementSpeedFinePer100Ms, 2000);
  assert.deepEqual(view.units[0]?.weapon, pyromaniac.weapon);
  assert.ok(view.events.some((event) => event.type === 'map-unit-hired' && event.price === 130));
  assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_pyromaniac'));

  let shotView = view;
  for (let index = 0; index < 24; index += 1) {
    shotView = session.advance({ deltaMs: 100 });
    if (shotView.events.some((event) => event.type === 'unit-fired' && event.unitId === pyromaniac.id)) break;
  }
  assert.ok(shotView.events.some((event) => event.type === 'unit-fired' && event.unitId === pyromaniac.id),
    'Pyromaniac attacks the in-range preview enemy');
  assert.equal(shotView.shots[0]?.damageStyle, 6);
  assert.equal(shotView.shots[0]?.imageAsset, 'sfx_pyromaniac_rocket');
  assert.equal(shotView.units[0]?.shootingAnimation?.asset, 'player_pyromaniac_shot');
  assert.equal(shotView.units[0]?.shootingAnimation?.frame, 0);
  view = session.advance({ deltaMs: 100 });
  assert.equal(view.units[0]?.shootingAnimation?.frame, 0, 'frame 0 includes the 100 ms boundary');
  view = session.advance({ deltaMs: 1 });
  assert.equal(view.units[0]?.shootingAnimation?.frame, 0, 'the APK animation uses a strict elapsed-time boundary');
  view = session.advance({ deltaMs: 1 });
  assert.equal(view.units[0]?.shootingAnimation?.frame, 1, 'frame 1 follows once elapsed time is greater than 100 ms');
  view = session.advance({ deltaMs: 100 });
  assert.equal(view.units[0]?.shootingAnimation?.frame, 1, 'frame 1 remains active through the 300 ms boundary');
  view = session.advance({ deltaMs: 100 });
  assert.equal(view.units[0]?.shootingAnimation?.frame, 1);
  view = session.advance({ deltaMs: 1 });
  assert.equal(view.units[0]?.shootingAnimation?.frame, 0, 'the sequence returns to frame 0 past 300 ms');
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 9.5, targetY: 8.75 }), true);
  view = session.advance({ deltaMs: 100 });
  assert.equal(view.units[0]?.positionFine.x, 8.5 * 7680 + 2000);
  assert.deepEqual(view.units[0]?.walkingAnimation, { frame: 1, row: 1, mirrored: true });
  assert.equal(GAME_RULES_VERSION, 'gng-rules-19');
  session.close();
});
