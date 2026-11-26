import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchP1cCampaignContent } from '../src/content/cow-gulch';
import { createGame, type CampaignWaveDefinition, type GameSession, type GameView, type ScenarioContent } from '../src/game';

const APK_COLLISION_BOX_SIZE_FINE = 7_678;
const APK_COLLISION_START_OFFSET_FINE = 3_840;
const APK_MAX_START_DELTA_X_FINE = 23_040;
const APK_MAX_START_DELTA_Y_FINE = 15_360;
const convoyRequests = [0, 0, 0, 0, 0, 1, 0, 0, 0, 0];
const emptyRequests = convoyRequests.map(() => 0);

interface ReferenceEnemy {
  type: number;
  groupId: string;
  positionFine: { x: number; y: number };
}

interface ReferenceCollisionBox extends ReferenceEnemy {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

function apkCollisionBox(enemy: ReferenceEnemy): ReferenceCollisionBox {
  const startX = enemy.positionFine.x - APK_COLLISION_START_OFFSET_FINE;
  const startY = enemy.positionFine.y - APK_COLLISION_START_OFFSET_FINE;
  return {
    ...enemy,
    startX,
    startY,
    endX: startX + APK_COLLISION_BOX_SIZE_FINE,
    endY: startY + APK_COLLISION_BOX_SIZE_FINE,
  };
}

/** Independent test model of CollisionManager.boxCheck() from APK 1.8.6. */
function apkBoxCheck(
  moving: ReferenceCollisionBox,
  stationary: ReferenceCollisionBox,
  deltaX: number,
  deltaY: number,
): boolean {
  const movedCorners = [
    { x: moving.startX + deltaX, y: moving.startY + deltaY },
    { x: moving.endX + deltaX, y: moving.startY + deltaY },
    { x: moving.startX + deltaX, y: moving.endY + deltaY },
    { x: moving.endX + deltaX, y: moving.endY + deltaY },
  ];
  return movedCorners.some(({ x, y }) => x >= stationary.startX && x <= stationary.endX
    && y >= stationary.startY && y <= stationary.endY);
}

/** Independent test model of EnemyDirector → testAdvancedCollisionEnemy → testCollisionEnemy. */
function apkCollisionBlocksMove(
  moving: ReferenceEnemy,
  others: readonly ReferenceEnemy[],
  deltaX: number,
  deltaY: number,
  ignoreSameUnitGroup = false,
): boolean {
  if (moving.type < 3 || moving.type > 8) return false;
  const movingBox = apkCollisionBox(moving);
  const candidates = others.map(apkCollisionBox).filter((other) => (
    other.groupId !== moving.groupId || ignoreSameUnitGroup
  ) && (other.type >= 3 && other.type <= 8)
    && Math.abs(other.startX - movingBox.startX) < APK_MAX_START_DELTA_X_FINE
    && Math.abs(other.startY - movingBox.startY) < APK_MAX_START_DELTA_Y_FINE);

  // testCollisionEnemy first checks each other box moved backward by the
  // candidate vector, then checks this box moved forward by that vector.
  if (candidates.some((other) => apkBoxCheck(other, movingBox, -deltaX, -deltaY))) return true;
  return candidates.some((other) => apkBoxCheck(movingBox, other, deltaX, deltaY));
}

function makeCoincidentConvoyFixture(): ScenarioContent {
  const sourceWaves = cowGulchP1cCampaignContent.campaignWaves!;
  const campaignWaves: CampaignWaveDefinition[] = [
    ...sourceWaves.slice(0, 2).map((wave) => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({
        ...pool,
        intervalMs: 0,
        requests: emptyRequests,
      })),
    })),
    {
      ...sourceWaves[2]!,
      spawnPools: [0, 1].map((spawnPointId) => ({
        spawnPointId,
        intervalMs: 0,
        requests: convoyRequests,
      })),
    },
  ];

  return {
    ...cowGulchP1cCampaignContent,
    id: 'apk-collision-coincident-convoy-fixture',
    campaignWaveCount: 3,
    campaignWaves,
    previewWave: {
      ...cowGulchP1cCampaignContent.previewWave!,
      spawn: { cell: { x: 8, y: 8 }, direction: 'east' },
      additionalSpawns: [{ cell: { x: 8, y: 8 }, direction: 'east' }],
      baseEnemySpeed: 1_000,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      redirects: [],
      exit: { x: 16, y: 16 },
    },
    units: [],
  };
}

async function advanceToWave(session: GameSession, number: number): Promise<GameView> {
  let view = session.observe();
  for (let step = 0; step < 20 && view.wave?.number !== number; step += 1) {
    view = session.advance({ deltaMs: 0 });
  }
  assert.equal(view.wave?.number, number);
  return view;
}

function positions(view: GameView) {
  return view.enemies.map(({ id, positionFine }) => [id, positionFine.x, positionFine.y]);
}

function spawnGroup(view: GameView, spawnPointId: number): string {
  const event = view.events.find((candidate) => candidate.type === 'enemy-group-spawned'
    && candidate.spawnPointId === spawnPointId);
  assert.ok(event && event.type === 'enemy-group-spawned');
  const enemy = view.enemies.find(({ id }) => event.enemyIds.includes(id));
  assert.ok(enemy?.groupId);
  return enemy.groupId;
}

test('APK collision reference rejects both moves from the Apache/Fort overlap sample', () => {
  const stagecoach: ReferenceEnemy = {
    type: 5,
    groupId: 'stagecoach-group',
    positionFine: { x: -6_200, y: 72_960 },
  };
  const horseman: ReferenceEnemy = {
    type: 3,
    groupId: 'horseman-group',
    positionFine: { x: -11_520, y: 72_960 },
  };
  const stagecoachBox = apkCollisionBox(stagecoach);
  const horsemanBox = apkCollisionBox(horseman);

  assert.equal(stagecoachBox.startY, horsemanBox.startY);
  assert.equal(stagecoachBox.startX - horsemanBox.startX, 5_320);
  assert.equal(APK_COLLISION_BOX_SIZE_FINE - 5_320, 2_358,
    'the source collision boxes overlap horizontally by 2,358 fine units');
  assert.equal(apkCollisionBlocksMove(stagecoach, [horseman], 1, 0), true);
  assert.equal(apkCollisionBlocksMove(horseman, [stagecoach], 1, 0), true);
  assert.equal(apkCollisionBlocksMove(stagecoach, [horseman], -1, 0), true,
    'the first backward-move pass blocks even when the candidate would move away');

  const separatedHorizontally = { ...horseman, positionFine: { x: 2_000, y: 72_960 } };
  const separatedVertically = { ...horseman, positionFine: { x: -6_200, y: 80_960 } };
  assert.equal(apkCollisionBlocksMove(stagecoach, [separatedHorizontally], 1, 0), false,
    'a one-axis gap leaves all predicted box corners outside the other box');
  assert.equal(apkCollisionBlocksMove(stagecoach, [separatedVertically], 1, 0), false);
});

test('GameSession matches the APK model for overlapping same-direction enemy groups', async () => {
  const scenario = makeCoincidentConvoyFixture();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'formal',
    randomSeed: 42,
    difficulty: 'easy',
  });

  try {
    await advanceToWave(session, 3);
    let view = session.advance({ deltaMs: 0 });
    const groupIds = [spawnGroup(view, 0), spawnGroup(view, 1)];
    const firstGroup = view.enemies.filter(({ groupId }) => groupId === groupIds[0]);
    const secondGroup = view.enemies.filter(({ groupId }) => groupId === groupIds[1]);
    assert.equal(firstGroup.length, 2);
    assert.equal(secondGroup.length, 2);

    const moving = firstGroup.find(({ type }) => type === 8)!;
    const other = secondGroup.find(({ type }) => type === moving.type)!;
    assert.ok(moving.groupId && other.groupId);
    assert.equal(moving.direction, 'east');
    assert.deepEqual(moving.positionFine, other.positionFine);
    const movingReference: ReferenceEnemy = { ...moving, groupId: moving.groupId };
    const otherReference: ReferenceEnemy = { ...other, groupId: other.groupId };
    const afterOrdinaryMove: ReferenceEnemy = {
      ...movingReference,
      positionFine: { x: moving.positionFine.x + moving.speed, y: moving.positionFine.y },
    };
    assert.equal(apkCollisionBlocksMove(afterOrdinaryMove, [otherReference], moving.speed, 0), true,
      'the source checks collision after the ordinary movement and before accepting the move');

    const initialPositions = positions(view);
    for (let frame = 0; frame < 5; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      assert.deepEqual(positions(view), initialPositions,
        `APK model predicts every convoy member stays blocked on frame ${frame + 1}`);
    }
  } finally {
    session.close();
  }
});

test('APK collision reference keeps same-group followers out of collision candidates', () => {
  const leader: ReferenceEnemy = {
    type: 8,
    groupId: 'same-convoy',
    positionFine: { x: 0, y: 0 },
  };
  const follower: ReferenceEnemy = {
    type: 4,
    groupId: 'same-convoy',
    positionFine: { x: 0, y: 0 },
  };

  assert.equal(apkCollisionBlocksMove(leader, [follower], 1, 0), false);
  assert.equal(apkCollisionBlocksMove(leader, [follower], 1, 0, true), true,
    'the APK manager flag controls whether a shared unitGroup is ignored');
});
