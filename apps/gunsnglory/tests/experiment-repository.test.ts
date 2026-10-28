import test from 'node:test';
import { createMemoryExperimentRepository } from '../src/experiments/memory-experiment-repository';
import { verifyExperimentRepositoryContract } from './experiment-repository-contract';

test('memory ExperimentRepository satisfies the shared storage contract', async () => {
  await verifyExperimentRepositoryContract(() => createMemoryExperimentRepository());
});
