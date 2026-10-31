import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchP1cCampaignContent } from '../src/content/cow-gulch';
import { createGame, type CampaignWaveDefinition, type GameSession, type GameView, type ScenarioContent } from '../src/game';

const emptyRequests = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const sourceWaves = cowGulchP1cCampaignContent.campaignWaves!;
const animationScenario: ScenarioContent = {
  ...cowGulchP1cCampaignContent,
  id: 'enemy-walk-animation-fixture',
  units: [],
  previewWave: {
    ...cowGulchP1cCampaignContent.previewWave!,
    baseEnemySpeed: 768,
    spawn: { cell: { x: 6, y: 8 }, direction: 'east' },
    redirects: [],
    exit: { x: 16, y: 8 },
  },
  campaignWaveCount: 3,
  campaignWaves: [
    { ...sourceWaves[0]!, spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests: emptyRequests }] },
    { ...sourceWaves[1]!, spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests: emptyRequests }] },
    {
      ...sourceWaves[2]!,
      spawnPools: [{ spawnPointId: 0, intervalMs: 3000, intervalMultiplier: 2, requests: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0] }],
    },
  ] satisfies CampaignWaveDefinition[],
};

const turningScenario: ScenarioContent = {
  ...cowGulchP1cCampaignContent,
  id: 'enemy-turn-animation-fixture',
  units: [],
  previewWave: {
    ...cowGulchP1cCampaignContent.previewWave!,
    baseEnemySpeed: 768,
  },
  campaignWaveCount: 3,
  campaignWaves: [
    { ...sourceWaves[0]!, spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests: emptyRequests }] },
    { ...sourceWaves[1]!, spawnPools: [{ spawnPointId: 0, intervalMs: 0, requests: emptyRequests }] },
    {
      ...sourceWaves[2]!,
      spawnPools: [{ spawnPointId: 0, intervalMs: 3000, intervalMultiplier: 2, requests: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0] }],
    },
  ] satisfies CampaignWaveDefinition[],
};

async function startCoveredWagonWave(): Promise<{ session: GameSession; view: GameView }> {
  const session = await createGame({ scenarios: { [animationScenario.id]: animationScenario } }).open({
    scenarioId: animationScenario.id,
    mode: 'formal',
    randomSeed: 1,
  });

  let view = session.observe();
  for (let step = 0; step < 20 && view.wave?.number !== 3; step += 1) {
    view = session.advance({ deltaMs: 0 });
  }
  assert.equal(view.wave?.number, 3);

  view = session.advance({ deltaMs: 0 });
  assert.deepEqual(view.enemies.map(({ type }) => type), [8, 4]);
  return { session, view };
}

async function startCoveredWagonTurnWave(): Promise<{ session: GameSession; view: GameView }> {
  const session = await createGame({ scenarios: { [turningScenario.id]: turningScenario } }).open({
    scenarioId: turningScenario.id,
    mode: 'formal',
    randomSeed: 1,
  });

  let view = session.observe();
  for (let step = 0; step < 20 && view.wave?.number !== 3; step += 1) {
    view = session.advance({ deltaMs: 0 });
  }
  assert.equal(view.wave?.number, 3);

  view = session.advance({ deltaMs: 0 });
  assert.deepEqual(view.enemies.map(({ type }) => type), [8, 4]);
  return { session, view };
}

function vehicle(view: GameView, type: 4 | 8): NonNullable<GameView['enemies'][number]> {
  const enemy = view.enemies.find((candidate) => candidate.type === type);
  assert.ok(enemy, `type ${type} should remain on the first route segment`);
  return enemy;
}

function framesByType(view: GameView): Record<4 | 8, number> {
  const wagon = view.enemies.find(({ type }) => type === 4);
  const tow = view.enemies.find(({ type }) => type === 8);
  assert.ok(wagon);
  assert.ok(tow);
  return { 4: wagon.animationFrame, 8: tow.animationFrame };
}

test('type 8 keeps each APK walk frame through its inclusive 768-fine-unit boundary', async () => {
  const { session, view: initial } = await startCoveredWagonWave();
  assert.equal(framesByType(initial)[8], 0);

  const at768 = session.advance({ deltaMs: 100 });
  assert.equal(framesByType(at768)[8], 0);

  const past768 = session.advance({ deltaMs: 1 });
  assert.equal(framesByType(past768)[8], 1);

  const at1535 = session.advance({ deltaMs: 99 });
  assert.equal(framesByType(at1535)[8], 1);

  const past1536 = session.advance({ deltaMs: 1 });
  assert.equal(framesByType(past1536)[8], 2);
});

test('type 4 follows the APK walk-frame sequence 0, 1, 0, 2 over one cycle', async () => {
  const { session } = await startCoveredWagonWave();
  const expected = [0, 1, 0];

  let view = session.observe();
  for (let index = 0; index < expected.length; index += 1) {
    view = session.advance({ deltaMs: 100 });
    assert.equal(framesByType(view)[4], expected[index], `frame after ${(index + 1) * 768} fine units`);
  }

  view = session.advance({ deltaMs: 1 });
  assert.equal(framesByType(view)[4], 2, 'frame changes only after 2,304 fine units');

  view = session.advance({ deltaMs: 99 });
  assert.equal(framesByType(view)[4], 2, 'final walk frame remains selected through 3,071 fine units');

  view = session.advance({ deltaMs: 1 });
  assert.equal(framesByType(view)[4], 0, 'animation distance wraps at 3,072 fine units');
});

test('type 8 uses its APK color-specific turn atlas for the first Cow Gulch turn and holds it for 100 ms', async () => {
  const { session } = await startCoveredWagonTurnWave();
  let view = session.observe();

  for (let step = 0; step < 80; step += 1) {
    view = session.advance({ deltaMs: 100 });
    if (vehicle(view, 8).turningAnimation) break;
  }

  const turningFrame = vehicle(view, 8);
  assert.equal(turningFrame.asset, 'horse_wagon_white');
  assert.equal(turningFrame.direction, 'south');
  assert.deepEqual(turningFrame.turningAnimation, {
    asset: 'horse_wagon_turn_white',
    frame: 0,
    mirrored: true,
  });
  const walkingFrame = turningFrame.animationFrame;

  view = session.advance({ deltaMs: 100 });
  assert.deepEqual(vehicle(view, 8).turningAnimation, turningFrame.turningAnimation);
  assert.equal(vehicle(view, 8).animationFrame, walkingFrame, 'walking frame is held during the turn');

  view = session.advance({ deltaMs: 1 });
  assert.equal(vehicle(view, 8).turningAnimation, undefined, 'walking atlas resumes after the 100 ms turn');
  assert.equal(vehicle(view, 8).direction, 'south');
});

test('type 4 uses the APK wagon turn atlas and holds it for 200 ms', async () => {
  const { session } = await startCoveredWagonTurnWave();
  let view = session.observe();

  for (let step = 0; step < 100; step += 1) {
    view = session.advance({ deltaMs: 100 });
    if (vehicle(view, 4).turningAnimation) break;
  }

  const turningFrame = vehicle(view, 4);
  assert.equal(turningFrame.direction, 'south');
  assert.deepEqual(turningFrame.turningAnimation, {
    asset: 'wagon_turn',
    frame: 0,
    mirrored: true,
  });
  const walkingFrame = turningFrame.animationFrame;

  view = session.advance({ deltaMs: 100 });
  assert.deepEqual(vehicle(view, 4).turningAnimation, turningFrame.turningAnimation);
  assert.equal(vehicle(view, 4).animationFrame, walkingFrame, 'walking frame is held during the turn');

  view = session.advance({ deltaMs: 100 });
  assert.deepEqual(vehicle(view, 4).turningAnimation, turningFrame.turningAnimation);
  assert.equal(vehicle(view, 4).animationFrame, walkingFrame, 'the turn frame remains through the 200 ms boundary');

  view = session.advance({ deltaMs: 1 });
  assert.equal(vehicle(view, 4).turningAnimation, undefined, 'walking atlas resumes after the 200 ms turn');
  assert.equal(vehicle(view, 4).direction, 'south');
});
