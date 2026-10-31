import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchP1cCampaignContent } from '../src/content/cow-gulch';
import { createGame, type CampaignWaveDefinition, type GameSession, type ScenarioContent } from '../src/game';

const transportRequests = [0, 0, 0, 0, 0, 1, 0, 0, 0, 0];
const settlerRequests = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const emptyRequests = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

async function advanceToWave(session: GameSession, number: number) {
  let view = session.observe();
  for (let step = 0; step < 20 && view.wave?.number !== number; step += 1) {
    view = session.advance({ deltaMs: 0 });
  }
  assert.equal(view.wave?.number, number);
  return view;
}

function makeOpposingEnemyFixture(requests: readonly number[], id: string): ScenarioContent {
  const sourceWaves = cowGulchP1cCampaignContent.campaignWaves!;
  const campaignWaves: CampaignWaveDefinition[] = [
    { ...sourceWaves[0]!, spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests: emptyRequests }] },
    { ...sourceWaves[1]!, spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests: emptyRequests }] },
    {
      ...sourceWaves[2]!,
      spawnPools: [0, 1].map((spawnPointId) => ({
        spawnPointId,
        intervalMs: 0,
        requests,
      })),
    },
  ];
  return {
    ...cowGulchP1cCampaignContent,
    id,
    campaignWaveCount: 3,
    campaignWaves,
    previewWave: {
      ...cowGulchP1cCampaignContent.previewWave!,
      spawn: { cell: { x: 2, y: 8 }, direction: 'east' },
      additionalSpawns: [{ cell: { x: 6, y: 8 }, direction: 'west' }],
      baseEnemySpeed: 1000,
      redirects: [],
      exit: { x: 16, y: 16 },
    },
    units: [],
  };
}

test('transport collision filters same-group objects and blocks opposing enemy groups', async () => {
  const scenario = makeOpposingEnemyFixture(transportRequests, 'p1f-opposing-transport-collision-fixture');
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 7,
  });
  await advanceToWave(session, 3);
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.events.filter((event) => event.type === 'enemy-group-spawned').length, 2);
  assert.equal(view.enemies.length, 4);

  const startingGroups = [...new Set(view.enemies.map(({ groupId }) => groupId))];
  assert.equal(startingGroups.length, 2);
  const initialPairGaps = new Map(startingGroups.map((groupId) => {
    const group = view.enemies.filter((enemy) => enemy.groupId === groupId);
    return [groupId, Math.abs(group[0]!.positionFine.x - group[1]!.positionFine.x)];
  }));
  assert.ok([...initialPairGaps.values()].every((gap) => gap === 7680));

  for (let frame = 0; frame < 50; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    const activeEnemies = view.enemies.filter(({ alive, type }) => alive && (type === 4 || type === 8));
    const firstGroup = activeEnemies.filter(({ groupId }) => groupId === startingGroups[0]);
    const secondGroup = activeEnemies.filter(({ groupId }) => groupId === startingGroups[1]);
    assert.equal(firstGroup.length, 2);
    assert.equal(secondGroup.length, 2);

    for (const left of firstGroup) {
      for (const right of secondGroup) {
        const xDistance = Math.abs(left.positionFine.x - right.positionFine.x);
        const yDistance = Math.abs(left.positionFine.y - right.positionFine.y);
        assert.ok(
          xDistance > 7678 || yDistance > 7678,
          `${left.id} and ${right.id} overlap at frame ${frame + 1}: ${xDistance}, ${yDistance}`,
        );
      }
    }

    for (const group of [firstGroup, secondGroup]) {
      const tow = group.find(({ type }) => type === 8)!;
      const wagon = group.find(({ type }) => type === 4)!;
      assert.equal(tow.positionFine.y, wagon.positionFine.y);
      assert.equal(Math.abs(tow.positionFine.x - wagon.positionFine.x), initialPairGaps.get(tow.groupId),
        'ignoreSameUnitGroup=false excludes the same-group wagon from collision candidates');
    }
  }

  const stopped = view.enemies.map(({ id, positionFine }) => [id, positionFine.x, positionFine.y]);
  for (let frame = 0; frame < 5; frame += 1) view = session.advance({ deltaMs: 100 });
  assert.deepEqual(
    view.enemies.map(({ id, positionFine }) => [id, positionFine.x, positionFine.y]),
    stopped,
    'both groups stay stopped at the collision and their same-group members keep following behind',
  );
});

test('settler units are not registered with the APK enemy collision manager', async () => {
  const scenario = makeOpposingEnemyFixture(settlerRequests, 'p1f-opposing-settler-collision-fixture');
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 7,
  });
  await advanceToWave(session, 3);
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.enemies.length, 2);
  assert.ok(view.enemies.every(({ type }) => type === 1 || type === 2));

  const groups = [...new Set(view.enemies.map(({ groupId }) => groupId))];
  let overlapped = false;
  for (let frame = 0; frame < 50; frame += 1) {
    view = session.advance({ deltaMs: 100 });
    const first = view.enemies.find(({ groupId }) => groupId === groups[0]);
    const second = view.enemies.find(({ groupId }) => groupId === groups[1]);
    if (first && second && Math.abs(first.positionFine.x - second.positionFine.x) <= 7678) overlapped = true;
  }

  const first = view.enemies.find(({ groupId }) => groupId === groups[0]);
  const second = view.enemies.find(({ groupId }) => groupId === groups[1]);
  assert.equal(overlapped, true);
  assert.ok(first && second && first.positionFine.x > second.positionFine.x, 'settlers continue past each other');
});
