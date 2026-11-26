import assert from 'node:assert/strict';
import test from 'node:test';
import { fortKaboomLevelThreeContent } from '../src/content/official-campaign';
import { createGame, type GameView, type ScenarioContent } from '../src/game';

const FINE_UNITS_PER_CELL = 7_680;

/**
 * Keep the full Fort Kaboom campaign and seed-6 random stream intact while
 * allowing the no-input probe to continue after its normal defeat threshold.
 */
const fortKaboomSeedSixLagProbe: ScenarioContent = {
  ...fortKaboomLevelThreeContent,
  id: 'fort-kaboom-seed-six-lag-probe',
  previewWave: {
    ...fortKaboomLevelThreeContent.previewWave!,
    initialLives: 500,
  },
};

function cell(enemy: GameView['enemies'][number]): { x: number; y: number } {
  return {
    x: Math.trunc(enemy.positionFine.x / FINE_UNITS_PER_CELL),
    y: Math.trunc(enemy.positionFine.y / FINE_UNITS_PER_CELL),
  };
}

function groupedWagonPair(view: GameView): {
  horse: GameView['enemies'][number];
  wagon: GameView['enemies'][number];
}[] {
  const groups = new Map<string, GameView['enemies'][number][]>();
  for (const enemy of view.enemies) {
    if (!enemy.groupId) continue;
    const group = groups.get(enemy.groupId) ?? [];
    group.push(enemy);
    groups.set(enemy.groupId, group);
  }

  return [...groups.values()].flatMap((group) => {
    const horse = group.find((enemy) => enemy.type === 8);
    const wagon = group.find((enemy) => enemy.type === 4);
    return horse && wagon ? [{ horse, wagon }] : [];
  });
}

test('Fort Kaboom seed 6 wagon takes the horse branch at its own redirect', async () => {
  const session = await createGame({
    scenarios: { [fortKaboomSeedSixLagProbe.id]: fortKaboomSeedSixLagProbe },
  }).open({
    scenarioId: fortKaboomSeedSixLagProbe.id,
    mode: 'formal',
    randomSeed: 6,
    difficulty: 'medium',
  });

  try {
    const previousHorseDirections = new Map<string, GameView['enemies'][number]['direction']>();
    let targetGroupId: string | undefined;
    let horseTurnFrame = -1;
    let view = session.observe();

    for (let frame = 0; frame < 1_000 && targetGroupId === undefined; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      for (const pair of groupedWagonPair(view)) {
        const groupId = pair.horse.groupId;
        if (!groupId) continue;
        const previousDirection = previousHorseDirections.get(groupId);
        previousHorseDirections.set(groupId, pair.horse.direction);
        const horseCell = cell(pair.horse);
        if (previousDirection !== 'east' || pair.horse.direction !== 'north'
          || horseCell.x !== 9 || horseCell.y !== 3
          || pair.horse.positionFine.x !== 9.5 * FINE_UNITS_PER_CELL) continue;

        targetGroupId = groupId;
        horseTurnFrame = frame;
        assert.equal(pair.wagon.direction, 'east', 'the wagon has not reached its own redirect center yet');
        assert.equal(pair.wagon.positionFine.y, 3.5 * FINE_UNITS_PER_CELL);
        break;
      }
    }

    assert.ok(targetGroupId, 'seed 6 produces a covered wagon at the north/east redirect');
    assert.equal(horseTurnFrame, 642, 'the deterministic probe reaches the north turn at the expected frame');

    let wagonTurnFrame = -1;
    for (let delay = 1; delay <= 20; delay += 1) {
      view = session.advance({ deltaMs: 100 });
      const pair: ReturnType<typeof groupedWagonPair>[number] | undefined = groupedWagonPair(view)
        .find(({ horse }) => horse.groupId === targetGroupId);
      assert.ok(pair, 'both convoy members remain present until the follower reaches the redirect');
      if (pair.wagon.direction === 'north') {
        wagonTurnFrame = horseTurnFrame + delay;
        assert.equal(pair.wagon.positionFine.x, 9.5 * FINE_UNITS_PER_CELL);
        assert.equal(pair.wagon.positionFine.y, 3.5 * FINE_UNITS_PER_CELL - 2);
        assert.equal(cell(pair.wagon).x, 9);
        assert.equal(cell(pair.wagon).y, 3);
        break;
      }

      assert.equal(pair.wagon.direction, 'east', 'the wagon follows the road until its own field center');
      assert.equal(cell(pair.wagon).y, 3);
      assert.ok(pair.wagon.positionFine.x < 9.5 * FINE_UNITS_PER_CELL,
        'the wagon turns before leaving the redirect cell along the east branch');
    }

    assert.equal(wagonTurnFrame - horseTurnFrame, 15,
      'the wagon turns north 1,500 ms after the horse, matching APK per-object redirect timing');
  } finally {
    session.close();
  }
});
