export interface ProfileData {
  settings: Record<string, unknown>;
  completedScenarios: string[];
  highScores: Record<string, number>;
  appliedSettlementIds: string[];
}

export interface VersionedProfile {
  data: ProfileData;
  /** Opaque to Progress; only ProfileRepository compares and advances it. */
  revision: number;
}

export interface WriteProfileRequest {
  data: ProfileData;
  expectedRevision: number | null;
  operationId: string;
}

export interface ProfileRepository {
  readProfile(): Promise<VersionedProfile | null>;
  writeProfile(request: WriteProfileRequest): Promise<{ revision: number }>;
  exportRawProfileRecord(): Promise<string | null>;
  resetCorruptProfile(snapshot: string): Promise<void>;
}

export type ProfileRepositoryErrorCode =
  | 'conflict'
  | 'invalid-input'
  | 'corrupt-data'
  | 'unsupported-version'
  | 'quota-exceeded'
  | 'unavailable';

export class ProfileRepositoryError extends Error {
  constructor(readonly code: ProfileRepositoryErrorCode, message: string) {
    super(message);
    this.name = 'ProfileRepositoryError';
  }
}

export function cloneProfileData(data: ProfileData): ProfileData {
  return {
    settings: { ...data.settings },
    completedScenarios: [...data.completedScenarios],
    highScores: { ...data.highScores },
    appliedSettlementIds: [...data.appliedSettlementIds],
  };
}

export function profileRequestDigest(request: WriteProfileRequest): string {
  return JSON.stringify({
    expectedRevision: request.expectedRevision,
    data: request.data,
  });
}

export function isProfileData(value: unknown): value is ProfileData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const profile = value as Partial<ProfileData>;
  return typeof profile.settings === 'object'
    && profile.settings !== null
    && !Array.isArray(profile.settings)
    && Array.isArray(profile.completedScenarios)
    && profile.completedScenarios.every((scenarioId) => typeof scenarioId === 'string')
    && typeof profile.highScores === 'object'
    && profile.highScores !== null
    && !Array.isArray(profile.highScores)
    && Object.values(profile.highScores).every((score) => Number.isSafeInteger(score) && score >= 0)
    && Array.isArray(profile.appliedSettlementIds)
    && profile.appliedSettlementIds.every((settlementId) => typeof settlementId === 'string');
}

export function isValidExpectedRevision(value: unknown): value is number | null {
  return value === null || (Number.isSafeInteger(value) && (value as number) >= 0);
}
