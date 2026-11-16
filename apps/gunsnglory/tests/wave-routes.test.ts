import assert from 'node:assert/strict';
import test from 'node:test';
import {
  apacheValleyLevelTwoContent,
  billyHillsLevelFiveCampaignContent,
  cactusvilleLevelEightCampaignContent,
  cowGulchLevelOneContent,
  fortKaboomLevelThreeContent,
  lostCityLevelTenCampaignContent,
  luckyLakeLevelSevenCampaignContent,
  mississippi11LevelElevenCampaignContent,
  mississippi12LevelTwelveCampaignContent,
  mississippi13LevelThirteenCampaignContent,
  mississippi14LevelFourteenCampaignContent,
  mississippi15LevelFifteenCampaignContent,
  mississippi16LevelSixteenCampaignContent,
  mississippi17LevelSeventeenCampaignContent,
  mississippi18LevelEighteenCampaignContent,
  mississippi19LevelNineteenCampaignContent,
  mississippi20LevelTwentyCampaignContent,
  murdockMountainsLevelSixCampaignContent,
  oregon01LevelTwentyOneCampaignContent,
  oregon02LevelTwentyTwoCampaignContent,
  oregon03LevelTwentyThreeCampaignContent,
  oregon04LevelTwentyFourCampaignContent,
  oregon05LevelTwentyFiveCampaignContent,
  oregon06LevelTwentySixCampaignContent,
  oregon07LevelTwentySevenCampaignContent,
  railroadRanchLevelNineCampaignContent,
  techTownLevelFourCampaignContent,
} from '../src/content/official-campaign';
import { createGame, type Direction, type ScenarioContent, type WaveRedirect } from '../src/game';
import { runtimeWaveRedirects } from '../src/game/wave-routes';

const directionByAction: readonly (readonly Direction[])[] = [
  ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'],
  ['north', 'south'], ['west', 'east'], ['west', 'south'], ['east', 'south'],
  ['north', 'west', 'east'], ['west', 'east', 'south'], ['east', 'south', 'north'],
  ['south', 'north', 'west'],
];

const officialScenarios: readonly ScenarioContent[] = [
  cowGulchLevelOneContent,
  apacheValleyLevelTwoContent,
  fortKaboomLevelThreeContent,
  techTownLevelFourCampaignContent,
  billyHillsLevelFiveCampaignContent,
  murdockMountainsLevelSixCampaignContent,
  luckyLakeLevelSevenCampaignContent,
  cactusvilleLevelEightCampaignContent,
  railroadRanchLevelNineCampaignContent,
  lostCityLevelTenCampaignContent,
  mississippi11LevelElevenCampaignContent,
  mississippi12LevelTwelveCampaignContent,
  mississippi13LevelThirteenCampaignContent,
  mississippi14LevelFourteenCampaignContent,
  mississippi15LevelFifteenCampaignContent,
  mississippi16LevelSixteenCampaignContent,
  mississippi17LevelSeventeenCampaignContent,
  mississippi18LevelEighteenCampaignContent,
  mississippi19LevelNineteenCampaignContent,
  mississippi20LevelTwentyCampaignContent,
  oregon01LevelTwentyOneCampaignContent,
  oregon02LevelTwentyTwoCampaignContent,
  oregon03LevelTwentyThreeCampaignContent,
  oregon04LevelTwentyFourCampaignContent,
  oregon05LevelTwentyFiveCampaignContent,
  oregon06LevelTwentySixCampaignContent,
  oregon07LevelTwentySevenCampaignContent,
];

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function expectedRedirects(grid: readonly (readonly number[])[]) {
  const redirects: WaveRedirect[] = [];
  for (const [y, row] of grid.entries()) {
    for (const [x, code] of row.entries()) {
      if (code >= 52 && code <= 65) {
        redirects.push({ cell: { x, y }, directions: directionByAction[code - 52]! });
      }
    }
  }
  return redirects;
}

function sortedRedirects(redirects: readonly WaveRedirect[]) {
  return redirects.map(({ cell, directions }) => `${cellKey(cell)}:${directions.join('/')}`).sort();
}

test('all 27 campaign maps consume every APK action-2 marker and direction', () => {
  for (const scenario of officialScenarios) {
    const preview = scenario.previewWave;
    assert.ok(preview, `${scenario.id} has a preview wave`);
    const grid = scenario.originalTileGrid ?? scenario.map.originalTileGrid;
    assert.ok(grid, `${scenario.id} exposes its source TDM grid`);

    const actual = runtimeWaveRedirects(preview, grid);
    assert.deepEqual(
      sortedRedirects(actual),
      sortedRedirects(expectedRedirects(grid)),
      `${scenario.id} must retain every action-2 choice from the APK grid`,
    );
  }
});

test('Riverside Mountains preview paths and enemies start outside each edge in their actual travel direction', async () => {
  const base = mississippi14LevelFourteenCampaignContent;
  const previewWave = {
    ...base.previewWave!,
    baseEnemySpeed: 400,
    speedMultiplierMin: 100,
    speedMultiplierCount: 1,
  };
  const scenario = { ...base, id: 'route-test-riverside', units: [], previewWave };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'debug',
    randomSeed: 1401,
  });

  try {
    const routes = session.observe().routes!;
    for (const route of routes) {
      for (let index = 1; index < route.length; index += 1) {
        const previous = route[index - 1]!;
        const current = route[index]!;
        assert.ok(previous.x === current.x || previous.y === current.y, 'route rendering must not draw diagonal shortcuts');
      }
    }
    const verticalSpawnRoute = routes.find((route) => route[0]?.x === 9.5 && route[0]?.y === 25.5);
    assert.ok(verticalSpawnRoute, 'the bottom-edge northbound spawn begins two fields below its TDM marker');

    assert.equal(session.submitIntent({ type: 'start-wave' }), true);
    let view = session.advance({ deltaMs: 100 });
    const bottomEnemy = () => view.enemies.find(({ id }) => id === 'preview-pioneer-5');
    assert.equal(bottomEnemy()?.direction, 'north');
    assert.equal(bottomEnemy()?.positionFine.x, Math.trunc(9.5 * 7_680));
    assert.equal(bottomEnemy()?.positionFine.y, Math.trunc(25.5 * 7_680));

    for (let frame = 0; frame < 450 && bottomEnemy()?.direction !== 'south'; frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    assert.equal(bottomEnemy()?.direction, 'south', 'the bottom spawn turns south at APK marker (16,17)');
    assert.ok((bottomEnemy()?.positionFine.y ?? 0) > Math.trunc(17.5 * 7_680));
  } finally {
    session.close();
  }
});

test('legacy preview waves without route chains keep their explicit redirect table', () => {
  const redirects: WaveRedirect[] = [{ cell: { x: 4, y: 10 }, directions: ['east'] }];
  const preview = { ...mississippi14LevelFourteenCampaignContent.previewWave!, routes: undefined, redirects };
  assert.equal(runtimeWaveRedirects(preview), redirects);
});

test('scenario-specific redirect overrides take precedence over retained route metadata', () => {
  const redirects: WaveRedirect[] = [];
  const preview = { ...mississippi14LevelFourteenCampaignContent.previewWave!, redirects };
  assert.equal(runtimeWaveRedirects(preview, mississippi14LevelFourteenCampaignContent.originalTileGrid), redirects);
});

test('raw TDM directions only expand markers represented by the active route chain', () => {
  const spawn = { cell: { x: 0, y: 0 }, direction: 'east' as const };
  const exit = { x: 2, y: 0 };
  const preview = {
    ...mississippi14LevelFourteenCampaignContent.previewWave!,
    spawn,
    exit,
    redirects: [],
    routes: [{ spawn, redirects: [], exit }],
  };
  assert.deepEqual(runtimeWaveRedirects(preview, [[52, 0, 0]]), []);
});
