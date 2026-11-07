import assert from 'node:assert/strict';
import test from 'node:test';
import {
  apacheValleyLevelTwoContent,
  cowGulchLevelOneContent,
  fortKaboomLevelThreeContent,
  techTownLevelFourCampaignContent,
} from '../src/content/official-campaign';
import { createBrowserGame } from '../src/bootstrap/browser';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

const officialContents = [
  cowGulchLevelOneContent,
  apacheValleyLevelTwoContent,
  fortKaboomLevelThreeContent,
  techTownLevelFourCampaignContent,
] as const;

test('free mode opens all four official stages at every difficulty with complete campaign waves', async () => {
  const game = createGame({
    scenarios: Object.fromEntries(officialContents.map((content) => [content.id, content])),
  });
  const difficulties = ['easy', 'medium', 'hard'] as const;

  for (const content of officialContents) {
    for (const difficulty of difficulties) {
      const session = await game.open({
        scenarioId: content.id,
        mode: 'free',
        difficulty,
        randomSeed: 73,
      });
      const wave = session.observe().wave;

      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(wave?.phase, 'active');
      assert.equal(wave?.totalWaves, content.campaignWaveCount ?? content.campaignWaves?.length);
      assert.ok((wave?.pendingSpawnRequests ?? 0) > 0, `${content.id} should use its official initial spawn pool`);
      session.close();
    }
  }
});

test('Tech Town free play supplies the mandatory map-access units without changing saved unlocks', async () => {
  const game = createBrowserGame(['campaign-new-mexico-03']);
  const session = await game.open({
    scenarioId: techTownLevelFourCampaignContent.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 73,
  });

  assert.equal(session.observe().wave?.totalWaves, 8);
  assert.ok(['gunslinger', 'mexican', 'cannon', 'indian'].every((type) =>
    session.observe().units.some((unit) => unit.type === type)));
  session.close();
});

test('free mode replay round trip preserves its source mode, difficulty, and terminal result', async () => {
  const source = cowGulchLevelOneContent;
  const scenario: ScenarioContent = {
    ...source,
    id: 'free-play-replay-fixture',
    contentVersion: 'free-play-replay-fixture-v1',
    units: [],
    campaignWaveCount: 1,
    campaignWaves: [source.campaignWaves![0]!].map((wave): CampaignWaveDefinition => ({
      ...wave,
      spawnPools: wave.spawnPools.map((pool) => ({
        ...pool,
        requests: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      })),
    })),
  };
  const game = createGame({
    scenarios: { [scenario.id]: scenario },
    sessionIdSource: (() => {
      let nextId = 0;
      return () => `free-replay-session-${++nextId}`;
    })(),
  });
  const session = await game.open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 19,
  });
  const result = session.advance({ deltaMs: 0 });
  assert.equal(result.wave?.settlement?.outcome, 'victory');
  assert.equal(session.terminalRecord()?.mode, 'free');

  const serialized = await session.exportReplay();
  const payload = JSON.parse(serialized) as { startRecord: { mode: string; difficulty: string } };
  assert.equal(payload.startRecord.mode, 'free');
  assert.equal(payload.startRecord.difficulty, 'hard');

  const replay = await game.replay(serialized);
  assert.equal(replay.sourceStartRecord.mode, 'free');
  assert.equal(replay.session.startRecord.mode, 'replay');
  assert.equal(replay.session.startRecord.difficulty, 'hard');
  assert.equal(replay.session.terminalRecord()?.outcome, 'victory');
  session.close();
  replay.session.close();
});
