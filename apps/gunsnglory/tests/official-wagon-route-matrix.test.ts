import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, type GameView, type ScenarioContent } from '../src/game';
import { runtimeWaveRedirects } from '../src/game/wave-routes';
import {
  inspectOfficialWagonRouteCoverage,
  type OfficialWagonRouteCase,
} from './helpers/official-wagon-route-coverage';

const FINE_UNITS_PER_CELL = 7_680;
const FIELD_CENTER_OFFSET = 15_360;
const FIELD_CENTER_HALF = 3_840;
const ROUTE_STEP_MS = 100;
const MAX_ROUTE_FRAMES = 2_200;
const MAX_VERIFIED_TURNS_PER_SCENARIO = 4;

type RouteRedirect = NonNullable<ScenarioContent['previewWave']>['redirects'][number];

const officialRouteCases: readonly OfficialWagonRouteCase[] = inspectOfficialWagonRouteCoverage()
  .branchCases.filter(({ region }) => region === 'new-mexico'
    || region === 'mississippi'
    || region === 'oregon');

/**
 * Retain the official map, turn data, and selected official request pool.
 * Other waves and spawn pools are cleared to focus the route rule; the result
 * must not be treated as a full-campaign replay of the same seed.
 */
function isolateOfficialRouteCase(routeCase: OfficialWagonRouteCase): ScenarioContent {
  const source = structuredClone(routeCase.scenario);
  const { waveNumber, spawnPointId, requestIndex } = routeCase;
  // The route assertion is about enemy vehicle movement. Official defense
  // units can destroy the isolated request before it reaches its branch.
  source.units = [];
  source.campaignUnitPool = undefined;
  return {
    ...source,
    id: `${source.id}-route-matrix-w${waveNumber}-spawn${spawnPointId}-type${requestIndex}`,
    campaignWaves: source.campaignWaves!.map((wave) => {
      if (wave.number !== waveNumber) {
        return {
          ...wave,
          delayMs: 0,
          spawnPools: wave.spawnPools.map((pool) => ({
            ...pool,
            intervalMs: 0,
            requests: pool.requests.map(() => 0),
          })),
        };
      }
      return {
        ...wave,
        delayMs: 0,
        spawnPools: wave.spawnPools
          .filter((pool) => pool.spawnPointId === spawnPointId)
          .map((pool) => ({
            ...pool,
            intervalMs: 0,
            requests: pool.requests.map((count, index) => index === requestIndex ? count : 0),
          })),
      };
    }),
    campaignBonusCratePool: undefined,
  };
}

function cell(fine: number): number {
  return Math.trunc(Math.fround(fine / FINE_UNITS_PER_CELL));
}

function crossedFieldCenter(previousFine: number, currentFine: number): boolean {
  const previousPhase = (previousFine + FIELD_CENTER_OFFSET) % FINE_UNITS_PER_CELL;
  const currentPhase = (currentFine + FIELD_CENTER_OFFSET) % FINE_UNITS_PER_CELL;
  return (previousPhase < FIELD_CENTER_HALF
      && currentPhase >= FIELD_CENTER_HALF
      && currentFine > previousFine)
    || (previousPhase > FIELD_CENTER_HALF
      && currentPhase <= FIELD_CENTER_HALF
      && currentFine < previousFine);
}

function fineCellDifference(
  predecessor: GameView['enemies'][number],
  follower: GameView['enemies'][number],
): { x: number; y: number } {
  return {
    x: cell(predecessor.positionFine.x) - cell(follower.positionFine.x),
    y: cell(predecessor.positionFine.y) - cell(follower.positionFine.y),
  };
}

async function verifyOfficialRouteCase(routeCase: OfficialWagonRouteCase): Promise<void> {
  const scenario = isolateOfficialRouteCase(routeCase);
  const sourceGrid = scenario.originalTileGrid ?? scenario.map.originalTileGrid;
  const redirects = new Map<string, RouteRedirect>(runtimeWaveRedirects(scenario.previewWave, sourceGrid).map((redirect) => (
    [`${redirect.cell.x},${redirect.cell.y}`, redirect] as const
  )));

  for (const required of routeCase.branchCells) {
    const redirect = redirects.get(`${required.x},${required.y}`);
    assert.ok(redirect && redirect.directions.length > 1,
      `${scenario.id} must retain the official multi-direction redirect at (${required.x},${required.y})`);
    const requestCount = scenario.campaignWaves?.find(({ number }) => number === routeCase.waveNumber)
      ?.spawnPools.some((pool) => pool.spawnPointId === routeCase.spawnPointId
        && (pool.requests[routeCase.requestIndex] ?? 0) > 0);
    assert.ok(requestCount,
      `${scenario.id} Wave ${routeCase.waveNumber} spawn ${routeCase.spawnPointId} must request ${routeCase.wagonType}`);
  }

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 1,
    difficulty: 'easy',
  });

  try {
    let view = session.observe();
    for (let frame = 0; frame < 100 && view.wave?.number !== routeCase.waveNumber; frame += 1) {
      view = session.advance({ deltaMs: 0 });
    }
    assert.equal(view.wave?.number, routeCase.waveNumber,
      `${scenario.id} isolated route session must reach Wave ${routeCase.waveNumber}`);

    const observedRedirects = new Set<string>();
    let verifiedTurns = 0;
    for (let frame = 0; frame < MAX_ROUTE_FRAMES && verifiedTurns < MAX_VERIFIED_TURNS_PER_SCENARIO; frame += 1) {
      const previousView = view;
      view = session.advance({ deltaMs: ROUTE_STEP_MS });
      const previousById = new Map(previousView.enemies.map((enemy) => [enemy.id, enemy] as const));

      for (let index = 1; index < view.enemies.length; index += 1) {
        const follower = view.enemies[index]!;
        const predecessor = view.enemies[index - 1]!;
        const previousFollower = previousById.get(follower.id);
        if (!previousFollower || !follower.alive || !predecessor.alive
          || follower.type !== (routeCase.wagonType === 'covered-wagon' ? 4 : 5)
          || predecessor.type !== 8
          || predecessor.groupId !== follower.groupId) continue;

        if (!crossedFieldCenter(previousFollower.positionFine.x, follower.positionFine.x)
          && !crossedFieldCenter(previousFollower.positionFine.y, follower.positionFine.y)) continue;

        const redirectCell = { x: cell(follower.positionFine.x), y: cell(follower.positionFine.y) };
        const redirectKey = `${redirectCell.x},${redirectCell.y}`;
        const redirect = redirects.get(redirectKey);
        if (!redirect || redirect.directions.length < 2
          || observedRedirects.has(`${follower.groupId}@${redirectKey}`)) continue;

        const movementVector = fineCellDifference(predecessor, follower);
        if (movementVector.x === 0 && movementVector.y === 0) continue;

        observedRedirects.add(`${follower.groupId}@${redirectKey}`);
        const nextView = session.advance({ deltaMs: ROUTE_STEP_MS });
        const nextFollower = nextView.enemies.find(({ id }) => id === follower.id);
        assert.ok(nextFollower, `${follower.id} must remain available for the next route step`);
        const actualMovement = {
          x: nextFollower.positionFine.x - follower.positionFine.x,
          y: nextFollower.positionFine.y - follower.positionFine.y,
        };

        // A collision may hold the vehicle in place. That is a separate
        // expected condition; do not mislabel a blocked step as a route error.
        if (actualMovement.x !== 0 || actualMovement.y !== 0) {
          assert.deepEqual(actualMovement, {
            x: movementVector.x * follower.speed,
            y: movementVector.y * follower.speed,
          }, `${scenario.id} ${follower.groupId} at ${redirectKey} must follow the APK fullX/fullY delta`);
          verifiedTurns += 1;
        }
        view = nextView;
        if (verifiedTurns >= MAX_VERIFIED_TURNS_PER_SCENARIO) break;
      }
    }

    assert.ok(verifiedTurns > 0,
      `${scenario.id} must produce an unblocked same-group vehicle transition at an official fork`);
  } finally {
    session.close();
  }
}

for (const routeCase of officialRouteCases) {
  test(`Level ${routeCase.globalLevel} ${routeCase.wagonType} spawn ${routeCase.spawnPointId} follows the official route`, async () => {
    await verifyOfficialRouteCase(routeCase);
  });
}
