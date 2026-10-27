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
  };
}
