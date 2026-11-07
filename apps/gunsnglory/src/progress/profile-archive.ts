import { isGameDifficulty } from '../game';
import { isSimulationSpeed } from '../game/time-scaling';
import {
  cloneProfileData,
  isProfileData,
  type ProfileData,
} from './profile-repository';

export const PROFILE_ARCHIVE_FORMAT = 'gunsnglory-profile';
export const PROFILE_ARCHIVE_VERSION = 1;

export class ProfileArchiveError extends Error {
  constructor(readonly code: 'invalid-json' | 'unsupported-format' | 'unsupported-version' | 'invalid-data', message: string) {
    super(message);
    this.name = 'ProfileArchiveError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null)
    && Object.values(value).every(isJsonValue);
}

function validProfileData(value: unknown): value is ProfileData {
  if (!isProfileData(value)) return false;
  const profile = value as ProfileData;
  const settings = profile.settings;
  return Object.keys(profile).sort().join(',') === 'appliedSettlementIds,completedScenarios,highScores,settings'
    && isJsonValue(settings)
    && (settings.simulationSpeed === undefined || isSimulationSpeed(settings.simulationSpeed))
    && (settings.difficulty === undefined || isGameDifficulty(settings.difficulty))
    && (settings.soundEnabled === undefined || typeof settings.soundEnabled === 'boolean')
    && profile.completedScenarios.every((id) => id.length > 0 && id.trim() === id)
    && new Set(profile.completedScenarios).size === profile.completedScenarios.length
    && Object.keys(profile.highScores).every((id) => id.length > 0 && id.trim() === id)
    && profile.appliedSettlementIds.every((id) => id.length > 0 && id.trim() === id)
    && new Set(profile.appliedSettlementIds).size === profile.appliedSettlementIds.length;
}

export function serializeProfileArchive(profile: ProfileData): string {
  if (!validProfileData(profile)) throw new ProfileArchiveError('invalid-data', 'Profile data is not valid for export');
  return JSON.stringify({
    format: PROFILE_ARCHIVE_FORMAT,
    formatVersion: PROFILE_ARCHIVE_VERSION,
    profile: cloneProfileData(profile),
  }, null, 2);
}

export function parseProfileArchive(source: string): ProfileData {
  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch {
    throw new ProfileArchiveError('invalid-json', 'Profile archive is not valid JSON');
  }
  if (!isRecord(value)) throw new ProfileArchiveError('invalid-data', 'Profile archive must be a JSON object');
  if (value.format !== PROFILE_ARCHIVE_FORMAT) {
    throw new ProfileArchiveError('unsupported-format', 'Profile archive format is not supported');
  }
  if (value.formatVersion !== PROFILE_ARCHIVE_VERSION) {
    throw new ProfileArchiveError('unsupported-version', 'Profile archive version is not supported');
  }
  if (Object.keys(value).sort().join(',') !== 'format,formatVersion,profile'
    || !validProfileData(value.profile)) {
    throw new ProfileArchiveError('invalid-data', 'Profile archive contents are invalid');
  }
  return cloneProfileData(value.profile);
}
