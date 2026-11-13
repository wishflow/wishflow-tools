import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGameForNewMexicoReplay } from '../src/bootstrap/browser';
import {
  billyHillsCampaignContentVersion,
  billyHillsCampaignId,
  createBillyHillsCampaignContent,
} from '../src/content/billy-hills-campaign';
import {
  createLuckyLakeCampaignContent,
  luckyLakeCampaignContentVersion,
  luckyLakeCampaignId,
} from '../src/content/lucky-lake-campaign';
import {
  createMurdockMountainsCampaignContent,
  murdockMountainsCampaignContentVersion,
  murdockMountainsCampaignId,
} from '../src/content/murdock-mountains-campaign';
import {
  createTechTownCampaignContent,
  techTownCampaignContentVersion,
  techTownCampaignId,
} from '../src/content/tech-town-campaign';
import {
  newMexicoCampaignContentVersionFor,
  parseNewMexicoReplayContentVersion,
} from '../src/content/new-mexico-replay-content-version';
import { GAME_REPLAY_FORMAT_VERSION, GAME_RULES_VERSION, serializeReplay } from '../src/game/replay';
import type { ScenarioContent } from '../src/game';

const milestoneScenarioIds = [
  'campaign-oregon-10',
  'campaign-dakota-10',
  'campaign-nevada-10',
  'campaign-alaska-10',
] as const;
const specialUnitTypes = new Set(['grandpa', 'sniper', 'pyromaniac', 'salesman']);
const stages = [
  {
    id: techTownCampaignId,
    legacyVersion: techTownCampaignContentVersion,
    build: createTechTownCampaignContent,
    mapAccess: true,
  },
  {
    id: billyHillsCampaignId,
    legacyVersion: billyHillsCampaignContentVersion,
    build: createBillyHillsCampaignContent,
    mapAccess: false,
  },
  {
    id: murdockMountainsCampaignId,
    legacyVersion: murdockMountainsCampaignContentVersion,
    build: createMurdockMountainsCampaignContent,
    mapAccess: false,
  },
  {
    id: luckyLakeCampaignId,
    legacyVersion: luckyLakeCampaignContentVersion,
    build: createLuckyLakeCampaignContent,
    mapAccess: false,
  },
] as const satisfies readonly {
  id: string;
  legacyVersion: string;
  build: (completedScenarioIds: readonly string[]) => ScenarioContent;
  mapAccess: boolean;
}[];

function completedForMask(mask: number): string[] {
  return milestoneScenarioIds.flatMap((scenarioId, bit) => (mask & (1 << bit)) ? [scenarioId] : []);
}

function specialTypes(units: readonly { type: string }[]): string[] {
  return [...new Set(units.filter(({ type }) => specialUnitTypes.has(type)).map(({ type }) => type))].sort();
}

test('M4–M7 v2 replay factories restore recorded units when the importing profile differs', async () => {
  for (const stage of stages) {
    for (let mask = 0; mask < 16; mask += 1) {
      const recordedProfile = [
        ...completedForMask(mask),
        ...(stage.mapAccess ? ['campaign-new-mexico-03'] : []),
      ];
      const importingProfile = completedForMask(15 - mask);
      const contentVersion = newMexicoCampaignContentVersionFor(stage.id, recordedProfile);
      const game = createBrowserGameForNewMexicoReplay(stage.id, contentVersion, importingProfile);
      const session = await game.open({
        scenarioId: stage.id,
        contentVersion,
        mode: 'free',
        difficulty: 'easy',
        randomSeed: mask + 1,
      });
      try {
        assert.equal(session.startRecord.contentVersion, contentVersion);
        assert.deepEqual(
          specialTypes(session.observe().units),
          specialTypes(stage.build(recordedProfile).units),
          `${stage.id} unlock mask ${mask}`,
        );
      } finally {
        session.close();
      }
    }
  }
});

test('M4–M7 v1 replay factories preserve import-time profile content', async () => {
  const currentProfiles = [[], [...milestoneScenarioIds]];
  for (const stage of stages) {
    for (const currentProfile of currentProfiles) {
      const effectiveProfile = stage.id === techTownCampaignId
        ? [...new Set([...currentProfile, 'campaign-new-mexico-03'])]
        : currentProfile;
      const game = createBrowserGameForNewMexicoReplay(stage.id, stage.legacyVersion, currentProfile);
      const session = await game.open({
        scenarioId: stage.id,
        contentVersion: stage.legacyVersion,
        mode: 'free',
        difficulty: 'easy',
        randomSeed: 1_800,
      });
      try {
        assert.equal(session.startRecord.contentVersion, stage.legacyVersion);
        assert.deepEqual(
          specialTypes(session.observe().units),
          specialTypes(stage.build(effectiveProfile).units),
          `${stage.id} current profile ${currentProfile.length ? 'unlocked' : 'empty'}`,
        );
      } finally {
        session.close();
      }
    }
  }
});

test('Tech Town replay factory keeps map-access false from v2 even when the import profile unlocked M3', async () => {
  const inaccessibleVersion = newMexicoCampaignContentVersionFor(techTownCampaignId, []);
  const parsed = parseNewMexicoReplayContentVersion(techTownCampaignId, inaccessibleVersion);
  assert.equal(parsed?.kind, 'snapshot-v2');
  if (parsed?.kind !== 'snapshot-v2') return;
  assert.equal(parsed.map04Accessible, false);

  const replayGame = createBrowserGameForNewMexicoReplay(
    techTownCampaignId,
    inaccessibleVersion,
    ['campaign-new-mexico-03', ...milestoneScenarioIds],
  );
  const prepared = await replayGame.prepare({ scenarioId: techTownCampaignId });
  assert.equal(prepared.contentVersion, inaccessibleVersion);
  assert.equal(
    prepared.contentVersion,
    newMexicoCampaignContentVersionFor(techTownCampaignId, parsed.completedScenarioIds),
  );

  const accessibleVersion = newMexicoCampaignContentVersionFor(techTownCampaignId, ['campaign-new-mexico-03']);
  const accessibleSetup = await createBrowserGameForNewMexicoReplay(
    techTownCampaignId,
    accessibleVersion,
    ['campaign-new-mexico-03', ...milestoneScenarioIds],
  ).prepare({ scenarioId: techTownCampaignId });
  const unitParameterCount = (parameters: readonly { path: string }[]) => (
    parameters.filter(({ path }) => path.startsWith('units/')).length
  );
  assert.ok(
    unitParameterCount(prepared.parameters) < unitParameterCount(accessibleSetup.parameters),
    'map-access false must omit the M3-gated map units even when the importing profile unlocked M3',
  );
});

test('M4–M7 replay factories reject unknown and malformed content versions', async () => {
  const stateDigest = `sha256:${'0'.repeat(64)}`;
  for (const stage of stages) {
    for (const contentVersion of ['future-version', `${newMexicoCampaignContentVersionFor(stage.id, [])}-extra`]) {
      const serialized = await serializeReplay({
        formatVersion: GAME_REPLAY_FORMAT_VERSION,
        rulesVersion: GAME_RULES_VERSION,
        startRecord: {
          sessionId: 'unsupported-new-mexico-replay',
          scenarioId: stage.id,
          contentVersion,
          rulesVersion: GAME_RULES_VERSION,
          randomAlgorithm: 'java.util.Random',
          randomSeed: 1,
          mode: 'free',
        },
        frames: [{ frame: 1, deltaMs: 0, tileSizePixels: 32, intents: [] }],
        checkpoints: [
          { frame: 0, stateDigest },
          { frame: 1, stateDigest },
        ],
        terminal: {
          frame: 1,
          settlement: { outcome: 'victory', scoreBase: 0, displayScore: 0, highScoreCandidate: 0 },
          stateDigest,
        },
      });

      await assert.rejects(
        createBrowserGameForNewMexicoReplay(stage.id, contentVersion).replay(serialized),
        (error: unknown) => (error as { code?: string }).code === 'content-unavailable',
        `${stage.id} should reject ${contentVersion}`,
      );
    }
  }
});
