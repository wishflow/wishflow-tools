import { cowGulchContent } from '../content/cow-gulch';
import { createExperiments, type Experiments, type RunRequest, type RunResult } from './index';
import { createGame, GAME_RULES_VERSION } from '../game';

interface BatchRunExecutor {
  run(request: RunRequest, options?: { signal?: AbortSignal }): Promise<RunResult>;
}

export function createCowGulchExperiments(
  batchExecutor?: BatchRunExecutor,
  sessionIdPrefix = 'cli-batch-session',
): Experiments {
  let nextSessionId = 0;
  const game = createGame({
    scenarios: { [cowGulchContent.id]: cowGulchContent },
    sessionIdSource: () => `${sessionIdPrefix}-${++nextSessionId}`,
  });
  return createExperiments({
    game,
    ...(batchExecutor ? { batchExecutor } : {}),
    policies: [{
      id: 'start-wave',
      version: '1',
      create: () => ({
        decide: (observation) => observation.wave?.phase === 'not-started'
          ? [{ type: 'start-wave' as const }]
          : [],
      }),
    }],
  });
}
