import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseProfileArchive,
  ProfileArchiveError,
  serializeProfileArchive,
} from '../src/progress/profile-archive';
import type { ProfileData } from '../src/progress/profile-repository';

const profile: ProfileData = {
  settings: { simulationSpeed: 2.5, difficulty: 'medium', soundEnabled: false },
  completedScenarios: ['campaign-new-mexico-01'],
  highScores: { 'campaign-new-mexico-01': 160 },
  appliedSettlementIds: ['session-one:campaign-new-mexico-01:8'],
};

test('profile archive round-trips ProfileData without IndexedDB revision fields', () => {
  const source = serializeProfileArchive(profile);
  assert.deepEqual(parseProfileArchive(source), profile);
  assert.equal(source.includes('revision'), false);
  assert.equal(source.includes('operationId'), false);
  assert.equal(source.includes('formatVersion'), true);
});

test('profile archive parser rejects malformed, unsupported, and invalid content before storage is called', () => {
  assert.throws(() => parseProfileArchive('{'), (error: unknown) =>
    error instanceof ProfileArchiveError && error.code === 'invalid-json');
  assert.throws(() => parseProfileArchive(JSON.stringify({ format: 'other', formatVersion: 1, profile })), (error: unknown) =>
    error instanceof ProfileArchiveError && error.code === 'unsupported-format');
  assert.throws(() => parseProfileArchive(JSON.stringify({ format: 'gunsnglory-profile', formatVersion: 2, profile })), (error: unknown) =>
    error instanceof ProfileArchiveError && error.code === 'unsupported-version');
  assert.throws(() => parseProfileArchive(JSON.stringify({
    format: 'gunsnglory-profile',
    formatVersion: 1,
    profile: { ...profile, settings: { simulationSpeed: 20 } },
  })), (error: unknown) => error instanceof ProfileArchiveError && error.code === 'invalid-data');
  assert.throws(() => parseProfileArchive(JSON.stringify({
    format: 'gunsnglory-profile',
    formatVersion: 1,
    profile: { ...profile, revision: 9 },
  })), (error: unknown) => error instanceof ProfileArchiveError && error.code === 'invalid-data');
});
