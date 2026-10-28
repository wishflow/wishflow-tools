import { createGame } from '../game';
import { cowGulchContent, cowGulchUpgradeSampleContent } from '../content/cow-gulch';
import { cowGulchDefeatContent } from '../content/cow-gulch-defeat';
import type { ScenarioContent } from '../game';
import { createProgress } from '../progress';
import { createIndexedDbProfileRepository } from '../progress/indexeddb-profile-repository';
import { createIndexedDbExperimentRepository } from '../experiments/indexeddb-experiment-repository';

function createSessionId(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const browserScenarios: Readonly<Record<string, ScenarioContent>> = {
  [cowGulchContent.id]: cowGulchContent,
  [cowGulchDefeatContent.id]: cowGulchDefeatContent,
  [cowGulchUpgradeSampleContent.id]: cowGulchUpgradeSampleContent,
};

export function getBrowserScenarioContentVersion(scenarioId: string): string | undefined {
  const scenario = browserScenarios[scenarioId];
  return scenario ? scenario.contentVersion ?? 'unversioned' : undefined;
}

export function createBrowserGame() {
  return createGame({
    scenarios: browserScenarios,
    randomSeedSource: () => {
      const seed = new Uint32Array(1);
      globalThis.crypto.getRandomValues(seed);
      return seed[0]!;
    },
    sessionIdSource: createSessionId,
  });
}

export function createBrowserProgress() {
  return createProgress(createIndexedDbProfileRepository());
}

export function createBrowserExperimentRepository() {
  return createIndexedDbExperimentRepository();
}
