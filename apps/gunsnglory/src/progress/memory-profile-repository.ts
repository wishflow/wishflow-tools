import {
  cloneProfileData,
  isProfileData,
  isValidExpectedRevision,
  ProfileRepositoryError,
  profileRequestDigest,
  type ProfileData,
  type ProfileRepository,
  type VersionedProfile,
} from './profile-repository';
import { isSimulationSpeed } from '../game/time-scaling';
import { isGameDifficulty } from '../game';

function cloneVersionedProfile(profile: VersionedProfile): VersionedProfile {
  return { data: cloneProfileData(profile.data), revision: profile.revision };
}

export function createMemoryProfileRepository(initial?: Partial<ProfileData>): ProfileRepository {
  let stored: (VersionedProfile & { operationId: string; requestDigest: string }) | null = initial
    ? {
      data: {
        settings: { ...(initial.settings ?? {}) },
        completedScenarios: [...(initial.completedScenarios ?? [])],
        highScores: { ...(initial.highScores ?? {}) },
        appliedSettlementIds: [...(initial.appliedSettlementIds ?? [])],
      },
      revision: 0,
      operationId: '',
      requestDigest: '',
    }
    : null;

  return {
    async readProfile(): Promise<VersionedProfile | null> {
      if (stored) {
        const speed = stored.data.settings.simulationSpeed;
        if (speed !== undefined && !isSimulationSpeed(speed)) {
          throw new ProfileRepositoryError('corrupt-data', 'Invalid saved simulation speed');
        }
        const difficulty = stored.data.settings.difficulty;
        if (difficulty !== undefined && !isGameDifficulty(difficulty)) {
          throw new ProfileRepositoryError('corrupt-data', 'Invalid saved game difficulty');
        }
        if (!isProfileData(stored.data)) {
          throw new ProfileRepositoryError('corrupt-data', 'Saved profile data is corrupt');
        }
      }
      return stored ? cloneVersionedProfile(stored) : null;
    },

    async writeProfile(request) {
      if (!request.operationId || !isValidExpectedRevision(request.expectedRevision) || !isProfileData(request.data)) {
        throw new ProfileRepositoryError('invalid-input', 'Profile save request is invalid');
      }
      const digest = profileRequestDigest(request);
      if (stored?.operationId === request.operationId) {
        if (stored.requestDigest !== digest) {
          throw new ProfileRepositoryError('invalid-input', 'Operation ID was reused with different profile data');
        }
        return { revision: stored.revision };
      }
      if ((stored?.revision ?? null) !== request.expectedRevision) {
        throw new ProfileRepositoryError('conflict', 'Profile revision has changed');
      }
      const revision = (stored?.revision ?? 0) + 1;
      stored = {
        data: cloneProfileData(request.data),
        revision,
        operationId: request.operationId,
        requestDigest: digest,
      };
      return { revision };
    },

    async exportRawProfileRecord(): Promise<string | null> {
      if (!stored) return null;
      return JSON.stringify({
        id: 'default',
        schemaVersion: 2,
        settings: stored.data.settings,
        completedScenarios: stored.data.completedScenarios,
        highScores: stored.data.highScores,
        appliedSettlementIds: stored.data.appliedSettlementIds,
        revision: Math.max(1, stored.revision),
        lastOperationId: stored.operationId || 'memory-initial',
        lastRequestDigest: stored.requestDigest || 'memory-initial',
      });
    },

    async resetCorruptProfile(snapshot: string): Promise<void> {
      if (!stored) throw new ProfileRepositoryError('invalid-input', 'No saved profile is available to reset');
      const currentSnapshot = JSON.stringify({
        id: 'default',
        schemaVersion: 2,
        settings: stored.data.settings,
        completedScenarios: stored.data.completedScenarios,
        highScores: stored.data.highScores,
        appliedSettlementIds: stored.data.appliedSettlementIds,
        revision: Math.max(1, stored.revision),
        lastOperationId: stored.operationId || 'memory-initial',
        lastRequestDigest: stored.requestDigest || 'memory-initial',
      });
      if (snapshot !== currentSnapshot) {
        throw new ProfileRepositoryError('conflict', 'Saved profile changed after the backup was exported');
      }
      const speed = stored.data.settings.simulationSpeed;
      const difficulty = stored.data.settings.difficulty;
      if (isProfileData(stored.data)
        && (speed === undefined || isSimulationSpeed(speed))
        && (difficulty === undefined || isGameDifficulty(difficulty))) {
        throw new ProfileRepositoryError('invalid-input', 'A valid profile cannot be reset as corrupt data');
      }
      stored = null;
    },
  };
}
