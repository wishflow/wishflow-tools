import { canonicalJsonValue, canonicalSha256Digest } from '../value-digest';
import type {
  ExperimentComparisonReport,
  ExperimentComparisonRequest,
  NumericSchemeReference,
  NumericSchemeVersion,
} from './index';

export type ExperimentRepositoryErrorCode =
  | 'invalid-input'
  | 'not-found'
  | 'conflict'
  | 'corrupt-data'
  | 'unsupported-version'
  | 'quota-exceeded'
  | 'unavailable';

export type ExperimentCommitState = 'not-committed' | 'unknown';

export class ExperimentRepositoryError extends Error {
  constructor(
    readonly code: ExperimentRepositoryErrorCode,
    message: string,
    readonly commitState?: ExperimentCommitState,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'ExperimentRepositoryError';
  }
}

export interface SavedComparisonSummaryFields {
  status: 'completed' | 'cancelled';
  scenarioId: string;
  scenarioVersion: string;
  candidateScheme: NumericSchemeReference;
  plannedSampleCount: number;
  completedRunCount: number;
}

export interface SavedComparisonSummary extends SavedComparisonSummaryFields {
  id: string;
  savedAt: number;
}

export interface NewSavedComparison {
  id: string;
  savedAt: number;
  request: ExperimentComparisonRequest;
  summary: SavedComparisonSummaryFields;
  report: ExperimentComparisonReport;
}

export interface SavedComparison extends NewSavedComparison {
  digest: string;
}

export interface SavedComparisonPage {
  items: readonly SavedComparisonSummary[];
  nextCursor?: string;
}

export interface ExperimentArchiveData {
  schemes: NumericSchemeVersion[];
  comparisons: NewSavedComparison[];
}

export interface ExperimentArchiveMergeResult {
  addedSchemes: number;
  skippedSchemes: number;
  addedComparisons: number;
  skippedComparisons: number;
  conflicts: {
    schemes: NumericSchemeReference[];
    comparisons: string[];
  };
}

export interface ListSavedComparisonsRequest {
  /** Defaults to 20 and is capped at 50. */
  limit?: number;
  /** Opaque cursor returned by the preceding page. */
  cursor?: string;
}

export interface ExperimentRepository {
  saveScheme(scheme: NumericSchemeVersion): Promise<NumericSchemeVersion>;
  readScheme(reference: NumericSchemeReference): Promise<NumericSchemeVersion | null>;
  saveComparison(comparison: NewSavedComparison): Promise<SavedComparison>;
  openComparison(id: string): Promise<SavedComparison | null>;
  listComparisons(request?: ListSavedComparisonsRequest): Promise<SavedComparisonPage>;
  exportArchive(): Promise<ExperimentArchiveData>;
  mergeArchive(data: ExperimentArchiveData): Promise<ExperimentArchiveMergeResult>;
}

export const EXPERIMENT_REPOSITORY_SCHEMA_VERSION = 1;
export const DEFAULT_COMPARISON_PAGE_SIZE = 20;
export const MAX_COMPARISON_PAGE_SIZE = 50;

export interface ComparisonCursor {
  savedAt: number;
  id: string;
}

export function validRepositoryId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128
    && value.trim() === value && value !== 'latest';
}

export function validSchemeReference(value: unknown): value is NumericSchemeReference {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const reference = value as Partial<NumericSchemeReference>;
  return validRepositoryId(reference.id) && validRepositoryId(reference.version);
}

export function schemeStorageKey(reference: NumericSchemeReference): string {
  return JSON.stringify([reference.id, reference.version]);
}

export function isNumericSchemeVersion(value: unknown): value is NumericSchemeVersion {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const scheme = value as Partial<NumericSchemeVersion>;
  const setup = scheme.preparedSetup;
  if (!validRepositoryId(scheme.id) || !validRepositoryId(scheme.version)
    || !validRepositoryId(scheme.scenarioId) || !validRepositoryId(scheme.contentVersion)
    || !validRepositoryId(scheme.rulesVersion) || typeof setup !== 'object' || setup === null
    || Array.isArray(setup)) return false;
  const prepared = setup as unknown as Record<string, unknown>;
  return prepared.scenarioId === scheme.scenarioId
    && prepared.contentVersion === scheme.contentVersion
    && prepared.rulesVersion === scheme.rulesVersion
    && typeof prepared.digest === 'string'
    && /^sha256:[a-f0-9]{64}$/.test(prepared.digest)
    && Array.isArray(prepared.parameters)
    && prepared.parameters.every((parameter) => typeof parameter === 'object' && parameter !== null
      && !Array.isArray(parameter)
      && typeof (parameter as Record<string, unknown>).path === 'string'
      && Number.isSafeInteger((parameter as Record<string, unknown>).value));
}

export function isNewSavedComparison(value: unknown): value is NewSavedComparison {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const comparison = value as Partial<NewSavedComparison>;
  const summary = comparison.summary as Partial<SavedComparisonSummaryFields> | undefined;
  const request = comparison.request as Partial<ExperimentComparisonRequest> | undefined;
  const report = comparison.report as Partial<ExperimentComparisonReport> | undefined;
  if (!validRepositoryId(comparison.id) || !Number.isSafeInteger(comparison.savedAt)
    || (comparison.savedAt as number) < 0 || !request || request.comparisonId !== comparison.id
    || !request.scenario || !validSchemeReference(request.baseline)
    || !validSchemeReference(request.candidate) || !Array.isArray(request.samples)
    || !request.policy || !report || report.comparisonId !== comparison.id
    || !summary || (summary.status !== 'completed' && summary.status !== 'cancelled')
    || !validRepositoryId(summary.scenarioId) || !validRepositoryId(summary.scenarioVersion)
    || !validSchemeReference(summary.candidateScheme)
    || !Number.isSafeInteger(summary.plannedSampleCount) || (summary.plannedSampleCount as number) < 1
    || !Number.isSafeInteger(summary.completedRunCount) || (summary.completedRunCount as number) < 0) {
    return false;
  }
  const reportBaseline = report.baseline?.scheme;
  const reportCandidate = report.candidate?.scheme;
  return canonicalJsonValue(report.request) === canonicalJsonValue(request)
    && reportBaseline?.id === request.baseline.id
    && reportBaseline.version === request.baseline.version
    && reportCandidate?.id === request.candidate.id
    && reportCandidate.version === request.candidate.version
    && report.scenarioId === request.scenario.id
    && report.scenarioVersion === request.scenario.version
    && report.gameScenarioId === request.scenario.gameScenarioId
    && report.contentVersion === request.scenario.contentVersion
    && report.rulesVersion === request.scenario.rulesVersion
    && report.policyId === request.policy.id
    && report.policyVersion === request.policy.version
    && summary.status === report.status
    && summary.scenarioId === report.scenarioId
    && summary.scenarioVersion === report.scenarioVersion
    && summary.candidateScheme.id === request.candidate.id
    && summary.candidateScheme.version === request.candidate.version
    && summary.plannedSampleCount === report.plannedSampleCount
    && summary.completedRunCount === report.completedRunCount;
}

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join(',') === [...expected].sort().join(',');
}

function validArchiveScheme(value: unknown): value is NumericSchemeVersion {
  if (!isNumericSchemeVersion(value) || !hasExactKeys(value, [
    'id', 'version', 'scenarioId', 'contentVersion', 'rulesVersion', 'preparedSetup',
  ])) return false;
  const scheme = value as NumericSchemeVersion;
  return hasExactKeys(scheme.preparedSetup, ['scenarioId', 'contentVersion', 'rulesVersion', 'parameters', 'digest'])
    && scheme.preparedSetup.parameters.every((parameter) => hasExactKeys(parameter, ['path', 'value']));
}

function validArchiveComparison(value: unknown): value is NewSavedComparison {
  return isNewSavedComparison(value)
    && hasExactKeys(value, ['id', 'savedAt', 'request', 'summary', 'report']);
}

export function isExperimentArchiveData(value: unknown): value is ExperimentArchiveData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || !hasExactKeys(value, ['schemes', 'comparisons'])) return false;
  const archive = value as Partial<ExperimentArchiveData>;
  if (!Array.isArray(archive.schemes) || !Array.isArray(archive.comparisons)
    || !archive.schemes.every(validArchiveScheme) || !archive.comparisons.every(validArchiveComparison)) return false;

  const schemes = archive.schemes as NumericSchemeVersion[];
  const comparisons = archive.comparisons as NewSavedComparison[];
  const schemesByKey = new Map(schemes.map((scheme) => [schemeStorageKey(scheme), scheme]));
  if (schemesByKey.size !== schemes.length || new Set(comparisons.map(({ id }) => id)).size !== comparisons.length) return false;
  return comparisons.every((comparison) => {
    const baseline = schemesByKey.get(schemeStorageKey(comparison.request.baseline));
    const candidate = schemesByKey.get(schemeStorageKey(comparison.request.candidate));
    return baseline !== undefined && candidate !== undefined
      && canonicalJsonValue(baseline) === canonicalJsonValue(comparison.report.baseline.scheme)
      && canonicalJsonValue(candidate) === canonicalJsonValue(comparison.report.candidate.scheme);
  });
}

export async function savedComparisonDigest(value: NewSavedComparison): Promise<string> {
  return canonicalSha256Digest({
    id: value.id,
    savedAt: value.savedAt,
    request: value.request,
    summary: value.summary,
    report: value.report,
  });
}

export function comparisonSummary(value: NewSavedComparison): SavedComparisonSummary {
  return {
    id: value.id,
    savedAt: value.savedAt,
    ...value.summary,
    candidateScheme: { ...value.summary.candidateScheme },
  };
}

export function normalizeComparisonPageRequest(
  value: ListSavedComparisonsRequest | undefined,
): { limit: number; cursor?: ComparisonCursor } {
  if (value !== undefined && (typeof value !== 'object' || value === null || Array.isArray(value))) {
    throw new ExperimentRepositoryError('invalid-input', 'Comparison page request is invalid');
  }
  const requestedLimit = value?.limit ?? DEFAULT_COMPARISON_PAGE_SIZE;
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
    throw new ExperimentRepositoryError('invalid-input', 'Comparison page size must be a positive integer');
  }
  const cursor = value?.cursor === undefined ? undefined : decodeComparisonCursor(value.cursor);
  return {
    limit: Math.min(requestedLimit, MAX_COMPARISON_PAGE_SIZE),
    ...(cursor ? { cursor } : {}),
  };
}

export function encodeComparisonCursor(cursor: ComparisonCursor): string {
  const bytes = new TextEncoder().encode(JSON.stringify(cursor));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

export function decodeComparisonCursor(value: unknown): ComparisonCursor {
  if (typeof value !== 'string' || value.length < 8 || value.length > 512
    || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new ExperimentRepositoryError('invalid-input', 'Comparison cursor is invalid');
  }
  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
    const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const decoded: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) throw new Error('invalid');
    const cursor = decoded as Partial<ComparisonCursor>;
    if (!Number.isSafeInteger(cursor.savedAt) || (cursor.savedAt as number) < 0
      || !validRepositoryId(cursor.id)) throw new Error('invalid');
    return { savedAt: cursor.savedAt as number, id: cursor.id };
  } catch {
    throw new ExperimentRepositoryError('invalid-input', 'Comparison cursor is invalid');
  }
}

export function compareNewestFirst(a: Pick<ComparisonCursor, 'id' | 'savedAt'>, b: Pick<ComparisonCursor, 'id' | 'savedAt'>): number {
  if (a.savedAt !== b.savedAt) return b.savedAt - a.savedAt;
  return b.id < a.id ? -1 : b.id > a.id ? 1 : 0;
}

export function isAfterComparisonCursor(
  item: Pick<ComparisonCursor, 'id' | 'savedAt'>,
  cursor: ComparisonCursor,
): boolean {
  return compareNewestFirst(item, cursor) > 0;
}
