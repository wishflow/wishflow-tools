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
