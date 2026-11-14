import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/new-mexico-02.json';
import { apacheValleyCampaignWaves } from '../src/content/apache-valley-waves';
import { apacheValleyContent } from '../src/content/apache-valley';
import {
  apacheValleyLevelTwoContent,
  cowGulchLevelOneContent,
  fortKaboomLevelThreeContent,
  officialCampaignStages,
} from '../src/content/official-campaign';
import { apacheValleyWaveIntros } from '../src/content/cow-gulch-wave-intros';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createRoutePriorityMap } from '../src/game/route-priority';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const spawnCodes = [40, 41, 42];
const redirectDirections: Readonly<Record<number, string>> = { 53: 'south', 54: 'west', 55: 'east' };

test('Apache Valley map content exactly matches the 20×18 raw TDM grid and three route controls', () => {
  const tdm = readFileSync(path.join(appRoot, 'public/content/maps/td_map_02.tdm'));
  assert.deepEqual([...tdm.subarray(0, 2)], [20, 18]);
  assert.equal(tdm.length, 2 + 20 * 18);
  assert.equal(map.map.width, 20);
  assert.equal(map.map.height, 18);
  assert.equal(apacheValleyContent.map.background.length, 360);
  for (let y = 0; y < 18; y += 1) {
    assert.equal(map.originalTileGrid[y]?.length, 20);
    for (let x = 0; x < 20; x += 1) {
      assert.equal(tdm[2 + (y * 20) + x], map.originalTileGrid[y]?.[x], `TDM cell (${x}, ${y})`);
    }
  }

  const routes = apacheValleyContent.previewWave!.routes!;
  assert.equal(routes.length, 3);
  const backgroundByCell = new Map(apacheValleyContent.map.background.map((tile) => [`${tile.x},${tile.y}`, tile.asset]));
  for (const [routeIndex, route] of routes.entries()) {
    assert.equal(
      tdm[2 + (route.spawn.cell.y * 20) + route.spawn.cell.x],
      spawnCodes[routeIndex],
      `route ${routeIndex + 1} begins at its original action-1 field`,
    );
    assert.equal(tdm[2 + (route.exit.y * 20) + route.exit.x], 48, `route ${routeIndex + 1} uses an action-3 exit`);
    const waypoints = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
    for (const [index, from] of waypoints.slice(0, -1).entries()) {
      const to = waypoints[index + 1]!;
      assert.ok(from.x === to.x || from.y === to.y, `route ${routeIndex + 1} segment ${index + 1} is axis aligned`);
      const stepX = Math.sign(to.x - from.x);
      const stepY = Math.sign(to.y - from.y);
      for (let x = from.x, y = from.y; ; x += stepX, y += stepY) {
        const rawCode = tdm[2 + (y * 20) + x]!;
        assert.ok([16, 32, 36, 40, 41, 42, 48, 53, 54, 55, 80].includes(rawCode), `route tile (${x}, ${y}) uses a route terrain code`);
        assert.ok(['tiles_shadow', 'tiles_shadow_var', 'tiles_canyon_floor', 'tiles_canyon_floor_var'].includes(
          backgroundByCell.get(`${x},${y}`) ?? '',
        ), `route tile (${x}, ${y}) remains visible in the original map layer`);
        if (x === to.x && y === to.y) break;
      }
    }
    for (const redirect of route.redirects) {
      const rawCode = tdm[2 + (redirect.cell.y * 20) + redirect.cell.x]!;
      assert.equal(redirectDirections[rawCode], redirect.directions[0], `redirect (${redirect.cell.x}, ${redirect.cell.y}) follows its TDM code`);
    }
  }
  assert.deepEqual(routes.map(({ spawn, exit }) => [spawn.cell, exit]), [
    [{ x: 3, y: 0 }, { x: 5, y: 17 }],
    [{ x: 4, y: 0 }, { x: 6, y: 17 }],
    [{ x: 17, y: 0 }, { x: 15, y: 17 }],
  ]);
});

test('Apache Valley reconstructs fresh units, static objects, weapon stats and original sprite resources', () => {
  const activeUnits = apacheValleyContent.units.filter(({ activity }) => activity === 5);
  const sleepingUnits = apacheValleyContent.units.filter(({ activity }) => activity === 4);
  assert.deepEqual(activeUnits.map(({ type, cell, activity }) => ({ type, cell, activity })), [
    { type: 'gunslinger', cell: { x: 9, y: 7 }, activity: 5 },
    { type: 'mexican', cell: { x: 4, y: 9 }, activity: 5 },
    { type: 'gunslinger', cell: { x: 5, y: 11 }, activity: 5 },
  ]);
  assert.deepEqual(activeUnits.map(({ weapon }) => weapon?.damage), [140, 500, 140]);
  assert.equal(sleepingUnits.length, 18);
  assert.deepEqual(sleepingUnits.filter(({ type }) => type === 'gunslinger').map(({ cell }) => [cell.x, cell.y]), [
    [1, 3], [18, 5], [1, 9], [16, 9], [18, 9], [17, 11], [19, 12], [3, 13], [11, 14], [11, 17],
  ]);
  assert.deepEqual(sleepingUnits.filter(({ type }) => type === 'mexican').map(({ cell }) => [cell.x, cell.y]), [
    [1, 5], [3, 7], [17, 7], [14, 8], [2, 12], [18, 15], [12, 16], [13, 17],
  ]);
  assert.ok(sleepingUnits.filter(({ type }) => type === 'gunslinger').every((unit) =>
    unit.hirePrice === 75 && unit.asset === 'player_gunslinger_sleep' && unit.awakeAsset === 'player_gunslinger'));
  assert.ok(sleepingUnits.filter(({ type }) => type === 'mexican').every((unit) =>
    unit.hirePrice === 100 && unit.asset === 'player_mexican_sleep' && unit.awakeAsset === 'player_mexican'));
  assert.equal(apacheValleyContent.map.decorations?.find(({ cell }) => cell.x === 10 && cell.y === 4)?.asset, 'b_1x1_stake');
  assert.equal(apacheValleyContent.map.decorations?.find(({ cell }) => cell.x === 10 && cell.y === 1)?.asset, 'b_1x1_tipi_small');
  assert.equal(apacheValleyContent.maxUpgrades, 0);
  assert.equal(apacheValleyContent.previewWave?.initialCash, 100);
  assert.equal(apacheValleyContent.previewWave?.initialLives, 50);
  assert.deepEqual(apacheValleyContent.previewWave?.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75, medium: 140, hard: 170,
  });

  const assets = new Set([
    ...apacheValleyContent.map.background.map(({ asset }) => asset),
    ...apacheValleyContent.map.streets.map(({ asset }) => asset),
    ...(apacheValleyContent.map.decorations ?? []).map(({ asset }) => asset),
    ...apacheValleyContent.units.flatMap(({ asset, awakeAsset }) => [asset, ...(awakeAsset ? [awakeAsset] : [])]),
    'horseman', 'horseman_turn', 'portrait_indian', 'portrait_settlers',
  ]);
  for (const asset of assets) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} resolves to a bundled asset`);
  }
  assert.ok(existsSync(path.join(appRoot, 'public/assets/sounds/sound_indian_hugh.ogg')));
  assert.ok(existsSync(path.join(appRoot, 'public/assets/sounds/sound_siedler.ogg')));
});

test('Apache Valley route priority keeps independent paths and converges on each matching exit', () => {
  const priority = createRoutePriorityMap(apacheValleyContent);
  assert.equal(priority.minValue, 233);
  assert.deepEqual(apacheValleyContent.previewWave!.routes!.map(({ spawn, exit }) => ({
    spawn: priority.get(spawn.cell.x, spawn.cell.y),
    exit: priority.get(exit.x, exit.y),
  })), [
    { spawn: 231, exit: 255 },
    { spawn: 231, exit: 255 },
    { spawn: 231, exit: 255 },
  ]);
  assert.equal(priority.getTargetPriority(-1, 0), -1);
});

test('official Apache Valley content exposes its six source wave schedules and unlock prerequisite', () => {
  assert.equal(apacheValleyLevelTwoContent.id, 'campaign-new-mexico-02');
  assert.equal(apacheValleyContent.campaignWaveCount, 6);
  assert.deepEqual(apacheValleyCampaignWaves.map(({ number, delayMs, hitPointMultiplierPercent, speedMultiplierPercent }) =>
    [number, delayMs, hitPointMultiplierPercent, speedMultiplierPercent]), [
    [1, 15_000, 75, 100],
    [2, 10_000, 125, 100],
    [3, 25_000, 150, 100],
    [4, 25_000, 175, 90],
    [5, 10_000, 225, 100],
    [6, 10_000, 250, 105],
  ]);
  assert.deepEqual(apacheValleyCampaignWaves.map(({ spawnPools }) => spawnPools.map(({ spawnPointId }) => spawnPointId)), [
    [0, 1], [0, 1], [2], [0, 1, 2], [0, 1, 2], [0, 1, 2],
  ]);
  assert.deepEqual(officialCampaignStages.map(({ scenarioId, requiresCompletedScenarioIds }) => [scenarioId, requiresCompletedScenarioIds]), [
    [cowGulchLevelOneContent.id, []],
    [apacheValleyLevelTwoContent.id, [cowGulchLevelOneContent.id]],
    [fortKaboomLevelThreeContent.id, [apacheValleyLevelTwoContent.id]],
    ['campaign-new-mexico-04', ['campaign-new-mexico-03']],
    ['campaign-new-mexico-05', ['campaign-new-mexico-04']],
    ['campaign-new-mexico-06', ['campaign-new-mexico-05']],
    ['campaign-new-mexico-07', ['campaign-new-mexico-06']],
    ['campaign-new-mexico-08', ['campaign-new-mexico-07']],
    ['campaign-new-mexico-09', ['campaign-new-mexico-08']],
    ['campaign-new-mexico-10', ['campaign-new-mexico-09']],
    ['campaign-mississippi-11', ['campaign-new-mexico-10']],
    ['campaign-mississippi-12', ['campaign-mississippi-11']],
    ['campaign-mississippi-13', ['campaign-mississippi-12']],
    ['campaign-mississippi-14', ['campaign-mississippi-13']],
    ['campaign-mississippi-15', ['campaign-mississippi-14']],
    ['campaign-mississippi-16', ['campaign-mississippi-15']],
    ['campaign-mississippi-17', ['campaign-mississippi-16']],
    ['campaign-mississippi-18', ['campaign-mississippi-17']],
    ['campaign-mississippi-19', ['campaign-mississippi-18']],
    ['campaign-mississippi-20', ['campaign-mississippi-19']],
    ['campaign-oregon-01', ['campaign-mississippi-20']],
    ['campaign-oregon-02', ['campaign-oregon-01']],
    ['campaign-oregon-03', ['campaign-oregon-02']],
    ['campaign-oregon-04', ['campaign-oregon-03']],
    ['campaign-oregon-05', ['campaign-oregon-04']],
    ['campaign-oregon-06', ['campaign-oregon-05']],
    ['campaign-oregon-07', ['campaign-oregon-06']],
  ]);
});

test('Apache Valley dialogue keeps the APK text order and uses only bundled speaker resources', () => {
  assert.deepEqual(apacheValleyWaveIntros.map(({ waveNumber }) => waveNumber), [1, 2, 3, 4, 5, 6]);
  assert.match(apacheValleyWaveIntros[0]!.text.en, /^Apache Valley is a good hunting ground/);
  assert.match(apacheValleyWaveIntros[3]!.text.en, /both canyons at the same time/);
  assert.deepEqual(apacheValleyWaveIntros.map(({ portraitAsset, voiceSound }) => [portraitAsset, voiceSound]), [
    ['portrait_pedro', 'sound_pedro'],
    ['portrait_pedro', 'sound_pedro'],
    ['portrait_settlers', 'sound_siedler'],
    ['portrait_indian', 'sound_indian_hugh'],
    ['portrait_settlers', 'sound_siedler'],
    ['portrait_pedro', 'sound_pedro'],
  ]);
  assert.ok(apacheValleyWaveIntros.every(({ text }) => text.en.length > 0 && text.zh.length > 0));
});

test('official Apache Valley starts with three routes and delays the first spawn by 15 seconds', async () => {
  const session = await createGame({ scenarios: { [apacheValleyContent.id]: apacheValleyContent } }).open({
    scenarioId: apacheValleyContent.id,
    mode: 'formal',
    randomSeed: 42,
  });
  assert.equal(session.observe().wave?.number, 1);
  assert.equal(session.observe().wave?.totalWaves, 6);
  assert.equal(session.observe().wave?.cash, 100);
  assert.equal(session.observe().units.length, 21);
  assert.equal(session.observe().units.filter(({ activity }) => activity === 5).length, 3);
  assert.equal(session.observe().units.filter(({ activity }) => activity === 4).length, 18);
  assert.equal(session.observe().routes?.length, 3);

  let view = session.observe();
  for (let step = 0; step < 150; step += 1) view = session.advance({ deltaMs: 100 });
  assert.equal(view.elapsedMs, 15_000);
  assert.equal(view.enemies.length, 0);
  view = session.advance({ deltaMs: 100 });
  assert.ok(view.enemies.length > 0);
});

test('Apache Valley hires its original sleeping gunman from the $100 starting cash', async () => {
  const session = await createGame({ scenarios: { [apacheValleyContent.id]: apacheValleyContent } }).open({
    scenarioId: apacheValleyContent.id,
    mode: 'formal',
    randomSeed: 42,
  });
  const initial = session.observe();
  const sleepingGunman = initial.units.find(({ id }) => id === 'gunslinger-hire-01');
  assert.ok(sleepingGunman);
  assert.equal(initial.wave?.cash, 100);
  session.submitIntent({
    type: 'select-at',
    x: sleepingGunman.hitArea.x + sleepingGunman.hitArea.width / 2,
    y: sleepingGunman.hitArea.y + sleepingGunman.hitArea.height / 2,
  });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'hire-map-unit', unitId: sleepingGunman.id, commandId: 'apache-hire-gunman-1' });
  const hired = session.advance({ deltaMs: 0 });
  const unit = hired.units.find(({ id }) => id === sleepingGunman.id);
  assert.equal(hired.wave?.cash, 25);
  assert.equal(hired.units.length, 21, 'hiring activates the original map object in place');
  assert.equal(unit?.activity, 5);
  assert.equal(unit?.asset, 'player_gunslinger');
  assert.equal(hired.events.filter((event) => event.type === 'map-unit-hired').length, 1);
});

test('type-3 campaign requests spawn the four-frame horseman with its turn sheet', async () => {
  const campaignWaves: readonly CampaignWaveDefinition[] = [{
    number: 1,
    delayMs: 0,
    hitPointMultiplierPercent: 100,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0] }],
  }];
  const scenario: ScenarioContent = {
    ...apacheValleyContent,
    id: 'apache-valley-horseman-fixture',
    units: [],
    campaignWaveCount: 1,
    campaignWaves,
    previewWave: { ...apacheValleyContent.previewWave!, baseEnemySpeed: 500 },
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 1,
  });
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.enemies[0]?.type, 3);
  assert.equal(view.enemies[0]?.asset, 'horseman');
  assert.ok(view.enemies[0]!.hitPoints > 0);
  assert.ok(view.enemies[0]!.speed > 0);

  let observedTurn = false;
  for (let step = 0; step < 120 && !observedTurn; step += 1) {
    view = session.advance({ deltaMs: 100 });
    observedTurn ||= view.enemies.some(({ turningAnimation }) => turningAnimation?.asset === 'horseman_turn');
  }
  assert.equal(observedTurn, true);
});
