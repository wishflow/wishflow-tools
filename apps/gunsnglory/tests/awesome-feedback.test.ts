import assert from 'node:assert/strict';
import test from 'node:test';
import { createCactusvilleCampaignContent } from '../src/content/cactusville-campaign';
import { createGame, type ScenarioContent } from '../src/game';
import { selectAwesomeFeedbackMessageIndex } from '../src/ui/awesome-feedback';

test('Awesome feedback requires enemy type 5+, average difficulty above 800, and an empty message queue', () => {
  let randomCalls = 0;
  const getRandomOffset = () => {
    randomCalls += 1;
    return 1;
  };

  assert.equal(selectAwesomeFeedbackMessageIndex(4, 801, true, getRandomOffset), undefined);
  assert.equal(selectAwesomeFeedbackMessageIndex(5, 800, true, getRandomOffset), undefined);
  assert.equal(selectAwesomeFeedbackMessageIndex(5, 801, false, getRandomOffset), undefined);
  assert.equal(randomCalls, 0, 'ineligible messages do not consume presentation randomness');
  assert.equal(selectAwesomeFeedbackMessageIndex(5, 801, true, getRandomOffset), 0);
  assert.equal(randomCalls, 1);
});

test('Awesome feedback applies Java integer truncation and clamps all five APK message indexes', () => {
  const cases = [
    { averageDifficulty: 801, randomOffset: 0, expectedIndex: 0 },
    { averageDifficulty: 900, randomOffset: 2, expectedIndex: 1 },
    { averageDifficulty: 1_000, randomOffset: 2, expectedIndex: 2 },
    { averageDifficulty: 1_100, randomOffset: 2, expectedIndex: 3 },
    { averageDifficulty: 1_300, randomOffset: 2, expectedIndex: 4 },
  ];
  for (const { averageDifficulty, randomOffset, expectedIndex } of cases) {
    assert.equal(
      selectAwesomeFeedbackMessageIndex(5, averageDifficulty, true, () => randomOffset),
      expectedIndex,
      `average ${averageDifficulty} maps to clamped message index ${expectedIndex}`,
    );
  }
});

test('Cactusville defeat events snapshot the post-kill difficulty average without changing combat results', async () => {
  const source = createCactusvilleCampaignContent([]);
  const makeScenario = (includeAwesomeThreshold: boolean): ScenarioContent => ({
    ...source,
    id: `cactusville-awesome-feedback-${includeAwesomeThreshold ? 'enabled' : 'disabled'}`,
    units: [],
    campaignUnitPool: undefined,
    campaignBonusCratePool: undefined,
    campaignAwesomeEnemyTypeThreshold: includeAwesomeThreshold ? 5 : undefined,
    previewWave: {
      ...source.previewWave!,
      spawn: { cell: { x: 6, y: 8 }, direction: 'east' },
      additionalSpawns: [],
      routes: undefined,
      redirects: [],
      exit: { x: 12, y: 8 },
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
    },
    campaignWaveCount: 1,
    campaignWaves: [{
      number: 1,
      delayMs: 0,
      hitPointMultiplierPercent: 100,
      speedMultiplierPercent: 100,
      spawnPools: [{ spawnPointId: 0, intervalMs: 1, requests: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0] }],
    }],
    campaignEnemyByType: {
      ...source.campaignEnemyByType,
      5: {
        hitPoints: 1,
        cashReward: 1,
        penetration: { light: 100, fire: 100, heavy: 100, poison: 100 },
        turningDurationMs: 100,
      },
    },
    dynamite: {
      unlocked: true,
      pairs: [{ id: 'test-dynamite', triggerCell: { x: 2, y: 8 }, boxCell: { x: 4, y: 8 } }],
    },
  });

  async function killPostCoach(includeAwesomeThreshold: boolean) {
    const scenario = makeScenario(includeAwesomeThreshold);
    const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
      scenarioId: scenario.id,
      mode: 'formal',
      randomSeed: 13,
    });
    try {
      let view = session.observe();
      for (let frame = 0; frame < 10 && !view.enemies.some(({ type }) => type === 5); frame += 1) {
        view = session.advance({ deltaMs: 100 });
      }
      assert.ok(view.enemies.some(({ type }) => type === 5), 'the real campaign pool type 8 creates a Post Coach');
      session.submitIntent({ type: 'select-at', x: 2.5, y: 8.5 });
      view = session.advance({ deltaMs: 0 });
      const defeat = view.events.find((event) => event.type === 'enemy-defeated' && event.enemyType === 5);
      assert.ok(defeat && defeat.type === 'enemy-defeated');
      return { event: defeat, view };
    } finally {
      session.close();
    }
  }

  const withFeedback = await killPostCoach(true);
  const withoutFeedback = await killPostCoach(false);
  assert.equal(withFeedback.event.campaignAverageDifficulty, 1_444);
  assert.equal(withoutFeedback.event.campaignAverageDifficulty, undefined);
  assert.deepEqual(withFeedback.view.enemies, withoutFeedback.view.enemies);
  assert.deepEqual(withFeedback.view.wave, withoutFeedback.view.wave);
  assert.deepEqual(withFeedback.view.dynamites, withoutFeedback.view.dynamites);
});
