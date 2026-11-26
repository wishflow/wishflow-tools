import assert from 'node:assert/strict';
import test from 'node:test';
import { fortKaboomLevelThreeContent } from '../src/content/official-campaign';
import { createGame, type GameView, type ScenarioContent } from '../src/game';
import { drawGame, getMapViewport, type GameImages } from '../src/render/canvas-renderer';

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

interface ProductionDrawCall {
  asset: string;
  args: unknown[];
}

function productionDrawCalls(view: GameView): ProductionDrawCall[] {
  const imageNames = new WeakMap<object, string>();
  const imageCache = new Map<string, HTMLImageElement>();
  const images = new Proxy({} as GameImages, {
    get(_target, key) {
      if (typeof key !== 'string') return undefined;
      const cached = imageCache.get(key);
      if (cached) return cached;
      const image = { naturalWidth: 2_048, naturalHeight: 2_048 } as HTMLImageElement;
      imageNames.set(image, key);
      imageCache.set(key, image);
      return image;
    },
  });
  const drawCalls: ProductionDrawCall[] = [];
  const noOp = () => undefined;
  const context = new Proxy({} as CanvasRenderingContext2D, {
    get(_target, key) {
      if (key === 'drawImage') {
        return (image: object, ...args: unknown[]) => {
          drawCalls.push({ asset: imageNames.get(image) ?? '<unknown>', args });
        };
      }
      if (key === 'measureText') return (text: string) => ({ width: text.length * 6 });
      if (key === 'canvas') return { width: 1_024, height: 576 };
      if (key === 'globalAlpha') return 1;
      return noOp;
    },
    set() {
      return true;
    },
  });

  drawGame(context, view, images);
  return drawCalls;
}

function assertProductionWagonPairDrawn(view: GameView, expectedFrame: number): void {
  assert.equal(view.frame, expectedFrame);
  const pair = groupedWagonPair(view).find(({ horse }) => horse.groupId === 'campaign-1-group-14');
  assert.ok(pair, `the official convoy is present in production frame ${expectedFrame}`);
  assert.equal(pair.horse.type, 8);
  assert.equal(pair.wagon.type, 4);
  assert.equal(pair.horse.asset, 'horse_wagon_white');
  assert.equal(pair.wagon.asset, 'wagon');

  const calls = productionDrawCalls(view);
  const horseAsset = pair.horse.turningAnimation?.asset ?? pair.horse.asset;
  const wagonAsset = pair.wagon.turningAnimation?.asset ?? pair.wagon.asset;
  const viewport = getMapViewport(view);
  const targets = [
    { enemy: pair.horse, asset: horseAsset },
    { enemy: pair.wagon, asset: wagonAsset },
  ].map(({ enemy, asset }) => {
    const offsetY = enemy.drawingOffsetFine?.y ?? 0;
    const expectedFeetY = Math.trunc(
      viewport.origin.y + ((enemy.positionFine.y + offsetY) / 240) * viewport.scaleFactor,
    );
    const offsetX = enemy.drawingOffsetFine?.x ?? 0;
    const expectedCenterX = viewport.origin.x
      + ((enemy.positionFine.x + offsetX) / 240) * viewport.scaleFactor;
    const matchingCalls = calls.flatMap((call, index) => {
      if (call.asset !== asset) return [];
      const [left, top, width, height] = call.args.slice(4, 8) as number[];
      return top + height === expectedFeetY && Math.abs((left + (width / 2)) - expectedCenterX) < 1
        ? [{ call, index }]
        : [];
    });
    assert.equal(matchingCalls.length, 1,
      `${asset} for ${enemy.id} is drawn once at its fine-position foot in frame ${expectedFrame}`);
    return { id: enemy.id, asset, ...matchingCalls[0]! };
  });

  const expectedOrder = view.drawOrder
    .filter((entry) => targets.some(({ id }) => entry === `enemy:${id}`))
    .map((entry) => targets.find(({ id }) => entry === `enemy:${id}`)!.asset);
  assert.equal(expectedOrder.length, 2, `both convoy members are in draw order in frame ${expectedFrame}`);
  const actualOrder = [...targets].sort((left, right) => left.index - right.index).map(({ asset }) => asset);
  assert.deepEqual(actualOrder, expectedOrder,
    `vehicle draw order follows the official GameView in frame ${expectedFrame}`);
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
    const productionFrames = new Map<number, GameView>();

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
        productionFrames.set(view.frame, view);
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
      if (view.frame === 651 || view.frame === 658) productionFrames.set(view.frame, view);
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

    assert.deepEqual([...productionFrames.keys()].sort((left, right) => left - right), [643, 651, 658],
      'the complete official seed-6 trajectory preserves the three previously inspected production frames');
    for (const frame of [643, 651, 658]) {
      assertProductionWagonPairDrawn(productionFrames.get(frame)!, frame);
    }
  } finally {
    session.close();
  }
});
