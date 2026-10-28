import { canonicalJsonValue, canonicalSha256Digest } from '../value-digest';
import {
  encodeComparisonCursor,
  ExperimentRepositoryError,
  isNewSavedComparison,
  isNumericSchemeVersion,
  normalizeComparisonPageRequest,
  savedComparisonDigest,
  schemeStorageKey,
  validRepositoryId,
  validSchemeReference,
  type ExperimentRepository,
  type NewSavedComparison,
  type SavedComparison,
  type SavedComparisonPage,
  type SavedComparisonSummary,
} from './experiment-repository';
import type { ExperimentComparisonReport, NumericSchemeVersion } from './index';

export const EXPERIMENTS_DATABASE_NAME = 'gunsnglory-experiments';
export const EXPERIMENTS_DATABASE_VERSION = 1;
const SCHEMES_STORE = 'schemes';
const COMPARISONS_STORE = 'comparisons';
const ARTIFACTS_STORE = 'artifacts';
const COMPARISON_ORDER_INDEX = 'savedAtId';

interface StoredScheme {
  key: string;
  digest: string;
  value: NumericSchemeVersion;
}

interface StoredComparisonIndex {
  id: string;
  savedAt: number;
  digest: string;
  request: NewSavedComparison['request'];
  summary: NewSavedComparison['summary'];
}

interface StoredComparisonArtifact {
  id: string;
  digest: string;
  report: ExperimentComparisonReport;
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

function invalidWrite(message: string): ExperimentRepositoryError {
  return new ExperimentRepositoryError('invalid-input', message, 'not-committed');
}

function asRepositoryError(error: unknown, writing = false): ExperimentRepositoryError {
  if (error instanceof ExperimentRepositoryError) return error;
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'QuotaExceededError') {
    return new ExperimentRepositoryError('quota-exceeded', 'Browser storage quota was exceeded', writing ? 'not-committed' : undefined);
  }
  if (name === 'VersionError') {
    return new ExperimentRepositoryError('unsupported-version', 'Stored experiment data uses a newer database version');
  }
  if (typeof indexedDB === 'undefined' || name === 'SecurityError' || name === 'InvalidStateError') {
    return new ExperimentRepositoryError('unavailable', 'IndexedDB is unavailable in this browser', writing ? 'unknown' : undefined, true);
  }
  return new ExperimentRepositoryError('unavailable', 'IndexedDB operation failed', writing ? 'unknown' : undefined, true);
}

function openDatabase(onVersionChange: () => void): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new ExperimentRepositoryError('unavailable', 'IndexedDB is unavailable in this browser', undefined, true));
  }
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    let settled = false;
    try {
      request = indexedDB.open(EXPERIMENTS_DATABASE_NAME, EXPERIMENTS_DATABASE_VERSION);
    } catch (error) {
      reject(asRepositoryError(error));
      return;
    }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SCHEMES_STORE)) {
        database.createObjectStore(SCHEMES_STORE, { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains(COMPARISONS_STORE)) {
        const comparisons = database.createObjectStore(COMPARISONS_STORE, { keyPath: 'id' });
        comparisons.createIndex(COMPARISON_ORDER_INDEX, ['savedAt', 'id'], { unique: true });
      } else {
        const comparisons = request.transaction?.objectStore(COMPARISONS_STORE);
        if (comparisons && !comparisons.indexNames.contains(COMPARISON_ORDER_INDEX)) {
          comparisons.createIndex(COMPARISON_ORDER_INDEX, ['savedAt', 'id'], { unique: true });
        }
      }
      if (!database.objectStoreNames.contains(ARTIFACTS_STORE)) {
        database.createObjectStore(ARTIFACTS_STORE, { keyPath: 'id' });
      }
    };
    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(asRepositoryError(request.error));
    };
    request.onblocked = () => {
      if (settled) return;
      settled = true;
      reject(new ExperimentRepositoryError('unavailable', 'IndexedDB upgrade is blocked by another open tab', undefined, true));
    };
    request.onsuccess = () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      settled = true;
      database.onversionchange = () => {
        database.close();
        onVersionChange();
      };
      resolve(database);
    };
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new DOMException('Transaction aborted', 'AbortError'));
    transaction.onerror = () => reject(transaction.error ?? new DOMException('Transaction failed', 'AbortError'));
  });
}

function isStoredScheme(value: unknown): value is StoredScheme {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const row = value as Partial<StoredScheme>;
  return typeof row.key === 'string' && typeof row.digest === 'string'
    && /^sha256:[a-f0-9]{64}$/.test(row.digest) && isNumericSchemeVersion(row.value);
}

function isStoredIndex(value: unknown): value is StoredComparisonIndex {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const row = value as Partial<StoredComparisonIndex>;
  return validRepositoryId(row.id) && Number.isSafeInteger(row.savedAt) && (row.savedAt as number) >= 0
    && typeof row.digest === 'string' && /^sha256:[a-f0-9]{64}$/.test(row.digest)
    && validSchemeReference(row.request?.baseline) && validSchemeReference(row.request?.candidate)
    && row.request?.comparisonId === row.id
    && !!row.summary && (row.summary.status === 'completed' || row.summary.status === 'cancelled')
    && validRepositoryId(row.summary.scenarioId) && validRepositoryId(row.summary.scenarioVersion)
    && validSchemeReference(row.summary.candidateScheme)
    && Number.isSafeInteger(row.summary.plannedSampleCount) && row.summary.plannedSampleCount > 0
    && Number.isSafeInteger(row.summary.completedRunCount) && row.summary.completedRunCount >= 0;
}

function isStoredArtifact(value: unknown): value is StoredComparisonArtifact {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const row = value as Partial<StoredComparisonArtifact>;
  return validRepositoryId(row.id) && typeof row.digest === 'string'
    && /^sha256:[a-f0-9]{64}$/.test(row.digest)
    && typeof row.report === 'object' && row.report !== null && row.report.comparisonId === row.id;
}

function sameJson(left: unknown, right: unknown): boolean {
  return canonicalJsonValue(left) === canonicalJsonValue(right);
}

function summaryFromIndex(index: StoredComparisonIndex): SavedComparisonSummary {
  return {
    id: index.id,
    savedAt: index.savedAt,
    ...copy(index.summary),
    candidateScheme: copy(index.summary.candidateScheme),
  };
}

async function readStoredScheme(
  store: IDBObjectStore,
  reference: { id: string; version: string },
): Promise<StoredScheme | undefined> {
  const value: unknown = await requestResult(store.get(schemeStorageKey(reference)));
  if (value === undefined) return undefined;
  if (!isStoredScheme(value) || value.key !== schemeStorageKey(reference)) {
    throw new ExperimentRepositoryError('corrupt-data', 'Stored numeric scheme is malformed');
  }
  const digest = await canonicalSha256Digest(value.value);
  if (digest !== value.digest) throw new ExperimentRepositoryError('corrupt-data', 'Stored numeric scheme digest does not match its contents');
  return value;
}

export function createIndexedDbExperimentRepository(): ExperimentRepository {
  let databasePromise: Promise<IDBDatabase> | undefined;
  const database = () => databasePromise ??= openDatabase(() => { databasePromise = undefined; });

  const repository: ExperimentRepository = {
    async saveScheme(scheme) {
      if (!isNumericSchemeVersion(scheme)) throw invalidWrite('Numeric scheme record is invalid');
      const value = copy(scheme);
      const key = schemeStorageKey(value);
      const digest = await canonicalSha256Digest(value);
      try {
        const db = await database();
        const transaction = db.transaction(SCHEMES_STORE, 'readwrite');
        const done = transactionDone(transaction);
        done.catch(() => undefined);
        const store = transaction.objectStore(SCHEMES_STORE);
        const existing = await new Promise<StoredScheme | undefined>((resolve, reject) => {
          const request = store.get(key);
          request.onerror = () => reject(request.error ?? new Error('IndexedDB scheme read failed'));
          request.onsuccess = () => {
            const raw: unknown = request.result;
            if (raw === undefined) {
              store.add({ key, digest, value } satisfies StoredScheme);
              resolve(undefined);
              return;
            }
            if (!isStoredScheme(raw) || raw.key !== key) {
              transaction.abort();
              reject(new ExperimentRepositoryError('corrupt-data', 'Stored numeric scheme is malformed', 'not-committed'));
              return;
            }
            if (!sameJson(raw.value, value)) {
              transaction.abort();
              reject(new ExperimentRepositoryError('conflict', 'Numeric scheme version is immutable', 'not-committed'));
              return;
            }
            if (raw.digest !== digest) {
              transaction.abort();
              reject(new ExperimentRepositoryError('corrupt-data', 'Stored numeric scheme digest does not match its contents', 'not-committed'));
              return;
            }
            resolve(raw);
          };
        });
        await done;
        if (existing) {
          if (await canonicalSha256Digest(existing.value) !== existing.digest) {
            throw new ExperimentRepositoryError('corrupt-data', 'Stored numeric scheme digest does not match its contents');
          }
          return copy(existing.value);
        }
        return copy(value);
      } catch (error) {
        throw asRepositoryError(error, true);
      }
    },

    async readScheme(reference) {
      if (!validSchemeReference(reference)) {
        throw new ExperimentRepositoryError('invalid-input', 'Numeric scheme reference is invalid');
      }
      try {
        const db = await database();
        const transaction = db.transaction(SCHEMES_STORE, 'readonly');
        const done = transactionDone(transaction);
        const row = await readStoredScheme(transaction.objectStore(SCHEMES_STORE), reference);
        await done;
        return row ? copy(row.value) : null;
      } catch (error) {
        throw asRepositoryError(error);
      }
    },

    async saveComparison(input: NewSavedComparison): Promise<SavedComparison> {
      if (!isNewSavedComparison(input)) throw invalidWrite('Saved comparison record is invalid');
      const value = copy(input);
      const digest = await savedComparisonDigest(value);
      const references = [value.request.baseline, value.request.candidate];
      const expectedSchemes = [value.report.baseline.scheme, value.report.candidate.scheme];
      const schemeDigests = await Promise.all(expectedSchemes.map((scheme) => canonicalSha256Digest(scheme)));
      try {
        const db = await database();
        const transaction = db.transaction([SCHEMES_STORE, COMPARISONS_STORE, ARTIFACTS_STORE], 'readwrite');
        const done = transactionDone(transaction);
        done.catch(() => undefined);
        const schemesStore = transaction.objectStore(SCHEMES_STORE);
        const comparisonsStore = transaction.objectStore(COMPARISONS_STORE);
        const artifactsStore = transaction.objectStore(ARTIFACTS_STORE);
        const [rawIndex, rawArtifact, rawBaseline, rawCandidate] = await Promise.all([
          requestResult(comparisonsStore.get(value.id)),
          requestResult(artifactsStore.get(value.id)),
          requestResult(schemesStore.get(schemeStorageKey(references[0]!))),
          requestResult(schemesStore.get(schemeStorageKey(references[1]!))),
        ]);
        if (rawIndex !== undefined || rawArtifact !== undefined) {
          if (!isStoredIndex(rawIndex) || !isStoredArtifact(rawArtifact)
            || rawIndex.id !== value.id || rawArtifact.id !== value.id
            || rawIndex.digest !== rawArtifact.digest) {
            transaction.abort();
            throw new ExperimentRepositoryError('corrupt-data', 'Saved comparison is missing its committed artifact', 'not-committed');
          }
          const existing: NewSavedComparison = {
            id: rawIndex.id,
            savedAt: rawIndex.savedAt,
            request: rawIndex.request,
            summary: rawIndex.summary,
            report: rawArtifact.report,
          };
          if (!isNewSavedComparison(existing)) {
            transaction.abort();
            throw new ExperimentRepositoryError('corrupt-data', 'Saved comparison record is malformed', 'not-committed');
          }
          await done;
          const existingDigest = await savedComparisonDigest(existing);
          if (existingDigest !== rawIndex.digest) {
            throw new ExperimentRepositoryError('corrupt-data', 'Saved comparison digest does not match its contents');
          }
          if (rawIndex.digest !== digest) {
            throw new ExperimentRepositoryError('conflict', 'Saved comparison ID already refers to different content');
          }
          const [baseline, candidate] = await Promise.all([
            this.readScheme(existing.request.baseline),
            this.readScheme(existing.request.candidate),
          ]);
          if (!baseline || !candidate
            || !sameJson(baseline, existing.report.baseline.scheme)
            || !sameJson(candidate, existing.report.candidate.scheme)) {
            throw new ExperimentRepositoryError('corrupt-data', 'Saved comparison references a missing or changed numeric scheme');
          }
          return { ...copy(existing), digest };
        }

        const storedSchemes = [rawBaseline, rawCandidate];
        for (let index = 0; index < references.length; index += 1) {
          const rawScheme: unknown = storedSchemes[index];
          const expectedScheme = expectedSchemes[index]!;
          const reference = references[index]!;
          if (rawScheme === undefined) {
            transaction.abort();
            throw new ExperimentRepositoryError('not-found', 'A referenced immutable numeric scheme is missing', 'not-committed');
          }
          if (!isStoredScheme(rawScheme) || rawScheme.key !== schemeStorageKey(reference)
            || rawScheme.digest !== schemeDigests[index] || !sameJson(rawScheme.value, expectedScheme)) {
            transaction.abort();
            throw new ExperimentRepositoryError('conflict', 'Saved comparison does not match its immutable scheme', 'not-committed');
          }
        }
        comparisonsStore.add({
          id: value.id,
          savedAt: value.savedAt,
          digest,
          request: value.request,
          summary: value.summary,
        } satisfies StoredComparisonIndex);
        artifactsStore.add({ id: value.id, digest, report: value.report } satisfies StoredComparisonArtifact);
        await done;
        return { ...copy(value), digest };
      } catch (error) {
        throw asRepositoryError(error, true);
      }
    },

    async openComparison(id) {
      if (!validRepositoryId(id)) {
        throw new ExperimentRepositoryError('invalid-input', 'Comparison ID is invalid');
      }
      try {
        const db = await database();
        const transaction = db.transaction([COMPARISONS_STORE, ARTIFACTS_STORE], 'readonly');
        const done = transactionDone(transaction);
        const [rawIndex, rawArtifact] = await Promise.all([
          requestResult(transaction.objectStore(COMPARISONS_STORE).get(id)),
          requestResult(transaction.objectStore(ARTIFACTS_STORE).get(id)),
        ]);
        await done;
        if (rawIndex === undefined && rawArtifact === undefined) return null;
        if (!isStoredIndex(rawIndex) || !isStoredArtifact(rawArtifact)
          || rawIndex.id !== id || rawArtifact.id !== id || rawIndex.digest !== rawArtifact.digest) {
          throw new ExperimentRepositoryError('corrupt-data', 'Saved comparison is missing its committed artifact');
        }
        const saved: NewSavedComparison = {
          id,
          savedAt: rawIndex.savedAt,
          request: rawIndex.request,
          summary: rawIndex.summary,
          report: rawArtifact.report,
        };
        if (!isNewSavedComparison(saved) || await savedComparisonDigest(saved) !== rawIndex.digest) {
          throw new ExperimentRepositoryError('corrupt-data', 'Saved comparison digest does not match its contents');
        }
        const [baseline, candidate] = await Promise.all([
          this.readScheme(saved.request.baseline),
          this.readScheme(saved.request.candidate),
        ]);
        if (!baseline || !candidate
          || !sameJson(baseline, saved.report.baseline.scheme)
          || !sameJson(candidate, saved.report.candidate.scheme)) {
          throw new ExperimentRepositoryError('corrupt-data', 'Saved comparison references a missing or changed numeric scheme');
        }
        return { ...copy(saved), digest: rawIndex.digest };
      } catch (error) {
        throw asRepositoryError(error);
      }
    },

    async listComparisons(input): Promise<SavedComparisonPage> {
      const page = normalizeComparisonPageRequest(input);
      try {
        const db = await database();
        const transaction = db.transaction(COMPARISONS_STORE, 'readonly');
        const done = transactionDone(transaction);
        done.catch(() => undefined);
        const store = transaction.objectStore(COMPARISONS_STORE);
        if (!store.indexNames.contains(COMPARISON_ORDER_INDEX)) {
          transaction.abort();
          throw new ExperimentRepositoryError('corrupt-data', 'Experiment database index is missing');
        }
        const index = store.index(COMPARISON_ORDER_INDEX);
        const range = page.cursor
          ? IDBKeyRange.upperBound([page.cursor.savedAt, page.cursor.id], true)
          : undefined;
        const request = index.openCursor(range, 'prev');
        const found: StoredComparisonIndex[] = [];
        const cursorPromise = new Promise<void>((resolve, reject) => {
          request.onerror = () => reject(request.error ?? new Error('IndexedDB cursor failed'));
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor || found.length > page.limit) {
              resolve();
              return;
            }
            if (!isStoredIndex(cursor.value)) {
              reject(new ExperimentRepositoryError('corrupt-data', 'Experiment list index is malformed'));
              return;
            }
            found.push(cursor.value);
            cursor.continue();
          };
        });
        await cursorPromise;
        await done;
        const hasMore = found.length > page.limit;
        const rows = found.slice(0, page.limit);
        const last = rows.at(-1);
        return {
          items: rows.map(summaryFromIndex),
          ...(hasMore && last ? {
            nextCursor: encodeComparisonCursor({ savedAt: last.savedAt, id: last.id }),
          } : {}),
        };
      } catch (error) {
        throw asRepositoryError(error);
      }
    },
  };
  return Object.freeze(repository);
}
