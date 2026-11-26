import assert from 'node:assert/strict';
import test from 'node:test';
import { billyHillsLevelFiveCampaignContent } from '../src/content/official-campaign';
import { createGame, type EnemyView, type GameView } from '../src/game';
import { getMapViewport } from '../src/render/canvas-renderer';
import { recordProductionDrawCalls, type ProductionDrawCall } from './helpers/record-production-draws';

const expectedAssets = new Map<number, string>([
  [4, 'wagon'],
  [5, 'stagecoach'],
  [6, 'goldtransport'],
]);

function drawMatchesEnemy(
  view: GameView,
  enemy: EnemyView,
  asset: string,
  drawCalls: readonly ProductionDrawCall[],
) {
  const viewport = getMapViewport(view);
  const expectedCenterX = viewport.origin.x
    + ((enemy.positionFine.x + (enemy.drawingOffsetFine?.x ?? 0)) / 240) * viewport.scaleFactor;
  const expectedFeetY = Math.trunc(viewport.origin.y
    + ((enemy.positionFine.y + (enemy.drawingOffsetFine?.y ?? 0)) / 240) * viewport.scaleFactor);

  return drawCalls.flatMap((call, index) => {
    if (call.asset !== asset) return [];
    const [left, top, width, height] = call.args.slice(4, 8) as number[];
    return top + height === expectedFeetY && Math.abs(left + width / 2 - expectedCenterX) < 1
      ? [{ call, index }]
      : [];
  });
}

test('formal Billy Hills Wave 1 vehicles use their APK assets and fine-position anchors', async () => {
  const scenario = billyHillsLevelFiveCampaignContent;
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: 1,
  });

  try {
    let view = session.observe();
    let renderedVehicles: EnemyView[] | undefined;
    let targetDraws: { id: string; asset: string; index: number }[] = [];

    for (let step = 0; step < 800 && !renderedVehicles; step += 1) {
      view = session.advance({ deltaMs: 100 });
      if (view.wave?.number !== 1) continue;
      const vehicles = view.enemies.filter((enemy) => enemy.alive && expectedAssets.has(enemy.type));
      const vehicleTypes = new Set(vehicles.map(({ type }) => type));
      if (!([4, 5, 6] as const).every((type) => vehicleTypes.has(type))) continue;

      const drawCalls = recordProductionDrawCalls(view);
      const drawMatches = vehicles.map((enemy) => {
        const asset = enemy.turningAnimation?.asset ?? enemy.asset;
        const matchingDraws = drawMatchesEnemy(view, enemy, asset, drawCalls);
        return { enemy, asset, matchingDraws };
      });
      if (drawMatches.some(({ matchingDraws }) => matchingDraws.length !== 1)) continue;
      renderedVehicles = vehicles;
      targetDraws = drawMatches.map(({ enemy, asset, matchingDraws }) => ({
        id: enemy.id,
        asset,
        index: matchingDraws[0]!.index,
      }));
    }

    assert.ok(renderedVehicles, 'the formal Wave 1 creates visible covered wagons, stagecoaches, and gold transports');
    assert.equal(view.scenarioId, scenario.id);
    assert.equal(view.frame, 732, 'seed 1 reaches the recorded all-vehicle production frame');
    assert.deepEqual(renderedVehicles.map(({ type }) => type).sort((a, b) => a - b), [4, 5, 5, 6]);

    for (const enemy of renderedVehicles) {
      const expectedAsset = expectedAssets.get(enemy.type);
      assert.ok(expectedAsset);
      assert.equal(enemy.asset, expectedAsset, `type ${enemy.type} selects its APK vehicle atlas`);
    }

    const actualOrder = [...targetDraws].sort((left, right) => left.index - right.index).map(({ id }) => id);
    const expectedOrder = view.drawOrder
      .filter((entry) => renderedVehicles.some(({ id }) => entry === `enemy:${id}`))
      .map((entry) => entry.slice('enemy:'.length));
    assert.deepEqual(actualOrder, expectedOrder,
      'the production renderer keeps these official vehicles in GameView draw order');
  } finally {
    session.close();
  }
});
