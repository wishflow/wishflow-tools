import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mississippi11LevelElevenCampaignContent,
  railroadRanchLevelNineCampaignContent,
} from '../src/content/official-campaign';
import { createGame, type GameView, type UnitView } from '../src/game';
import { getMapViewport } from '../src/render/canvas-renderer';
import { recordProductionDrawCalls, type ProductionDrawCall } from './helpers/record-production-draws';

function assertStaticUnitsDrawn(view: GameView, units: readonly UnitView[], groupName: string): void {
  assert.ok(units.length > 0, `${groupName} has official scene units`);
  const viewport = getMapViewport(view);
  const calls = recordProductionDrawCalls(view);
  const matchedUnits = units.map((unit) => {
    const expected = [
      Math.trunc(viewport.origin.x + unit.render.x * viewport.tileSize),
      Math.trunc(viewport.origin.y + unit.render.y * viewport.tileSize),
      Math.trunc(unit.render.width * viewport.tileSize),
      Math.trunc(unit.render.height * viewport.tileSize),
    ];
    const matchingCalls = calls.flatMap((call, index) => (
      call.asset === unit.asset && sameRect(call, expected) ? [{ call, index }] : []
    ));
    assert.equal(matchingCalls.length, 1,
      `${unit.id} uses ${unit.asset} at its official render rectangle`);
    return { id: unit.id, index: matchingCalls[0]!.index };
  });

  const expectedOrder = view.drawOrder
    .filter((entry) => units.some(({ id }) => entry === `unit:${id}`))
    .map((entry) => entry.slice('unit:'.length));
  const actualOrder = [...matchedUnits].sort((left, right) => left.index - right.index).map(({ id }) => id);
  assert.deepEqual(actualOrder, expectedOrder,
    `${groupName} components follow their GameView draw order`);
}

function sameRect(call: ProductionDrawCall, expected: readonly number[]): boolean {
  return JSON.stringify(call.args.slice(4, 8)) === JSON.stringify(expected);
}

test('official Railroad Ranch train parts draw their original sprites at map coordinates', async () => {
  const scenario = railroadRanchLevelNineCampaignContent;
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: 9,
  });

  try {
    const view = session.observe();
    assert.equal(view.scenarioId, scenario.id);
    const trainUnits = view.units.filter(({ type }) => type.startsWith('train-'));
    assert.equal(new Set(trainUnits.map(({ movementGroupId }) => movementGroupId)).size, 6,
      'the official scene contains its three horizontal and three vertical train groups');
    assert.deepEqual([...new Set(trainUnits.map(({ asset }) => asset))].sort(), [
      'lok_hori_1of2',
      'lok_hori_2of2',
      'lok_verti_1of2',
      'lok_verti_2of2',
      'lok_wagon_hori',
      'lok_wagon_verti',
    ]);
    assertStaticUnitsDrawn(view, trainUnits, 'Railroad Ranch trains');
  } finally {
    session.close();
  }
});

test('official Mississippi 11 steamer parts draw their original sprites at map coordinates', async () => {
  const scenario = mississippi11LevelElevenCampaignContent;
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: 11,
  });

  try {
    const view = session.observe();
    assert.equal(view.scenarioId, scenario.id);
    const steamerUnits = view.units.filter(({ type }) => type.startsWith('steamer-'));
    assert.equal(new Set(steamerUnits.map(({ movementGroupId }) => movementGroupId)).size, 1);
    assert.deepEqual([...new Set(steamerUnits.map(({ asset }) => asset))].sort(), [
      'steamboat_1',
      'steamboat_2',
      'steamboat_3',
      'steamboat_4c',
    ], 'the official map tail uses the image selected by its initial fine-X position');
    assertStaticUnitsDrawn(view, steamerUnits, 'Mississippi 11 steamer');
  } finally {
    session.close();
  }
});
