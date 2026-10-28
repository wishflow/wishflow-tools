import {
  compareNewestFirst,
  encodeComparisonCursor,
  ExperimentRepositoryError,
  isAfterComparisonCursor,
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
import { canonicalSha256Digest } from '../value-digest';

interface StoredScheme {
  digest: string;
  value: import('./index').NumericSchemeVersion;
}

interface StoredComparisonIndex {
  digest: string;
  value: Omit<NewSavedComparison, 'report'>;
}

interface StoredComparisonArtifact {
  digest: string;
  value: import('./index').ExperimentComparisonReport;
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

function invalidWrite(message: string): ExperimentRepositoryError {
  return new ExperimentRepositoryError('invalid-input', message, 'not-committed');
}

export function createMemoryExperimentRepository(): ExperimentRepository {
  const schemes = new Map<string, StoredScheme>();
  const comparisons = new Map<string, StoredComparisonIndex>();
  const artifacts = new Map<string, StoredComparisonArtifact>();
  let writeTail = Promise.resolve();
  const exclusive = <T>(operation: () => T | Promise<T>): Promise<T> => {
    const current = writeTail.then(operation, operation);
    writeTail = current.then(() => undefined, () => undefined);
    return current;
  };

  const repository: ExperimentRepository = {
    async saveScheme(scheme) {
      if (!isNumericSchemeVersion(scheme)) throw invalidWrite('Numeric scheme record is invalid');
      const value = copy(scheme);
      const key = schemeStorageKey(value);
      const digest = await canonicalSha256Digest(value);
      return exclusive(() => {
        const existing = schemes.get(key);
        if (existing) {
          if (existing.digest !== digest) {
            throw new ExperimentRepositoryError('conflict', 'Numeric scheme version is immutable', 'not-committed');
          }
          return copy(existing.value);
        }
        schemes.set(key, { digest, value });
        return copy(value);
      });
    },

    async readScheme(reference) {
      if (!validSchemeReference(reference)) {
        throw new ExperimentRepositoryError('invalid-input', 'Numeric scheme reference is invalid');
      }
      const stored = schemes.get(schemeStorageKey(reference));
      return stored ? copy(stored.value) : null;
    },

    async saveComparison(input: NewSavedComparison) {
      if (!isNewSavedComparison(input)) throw invalidWrite('Saved comparison record is invalid');
      const value = copy(input);
      const digest = await savedComparisonDigest(value);
      const reportSchemes = [value.report.baseline.scheme, value.report.candidate.scheme];
      const reportSchemeDigests = await Promise.all(reportSchemes.map((scheme) => canonicalSha256Digest(scheme)));
      return exclusive(() => {
        const index = comparisons.get(value.id);
        const artifact = artifacts.get(value.id);
        if (index || artifact) {
          if (!index || !artifact || index.digest !== artifact.digest) {
            throw new ExperimentRepositoryError('corrupt-data', 'Saved comparison is missing its committed artifact', 'not-committed');
          }
          if (index.digest !== digest) {
            throw new ExperimentRepositoryError('conflict', 'Saved comparison ID already refers to different content', 'not-committed');
          }
          return copy({ ...value, digest });
        }
        const references = [value.request.baseline, value.request.candidate];
        references.forEach((reference, index) => {
          const storedScheme = schemes.get(schemeStorageKey(reference));
          if (!storedScheme) {
            throw new ExperimentRepositoryError('not-found', 'A referenced immutable numeric scheme is missing', 'not-committed');
          }
          if (storedScheme.digest !== reportSchemeDigests[index]) {
            throw new ExperimentRepositoryError('conflict', 'Saved comparison does not match its immutable scheme', 'not-committed');
          }
        });
        comparisons.set(value.id, {
          digest,
          value: {
            id: value.id,
            savedAt: value.savedAt,
            request: copy(value.request),
            summary: copy(value.summary),
          },
        });
        artifacts.set(value.id, { digest, value: copy(value.report) });
        return copy({ ...value, digest });
      });
    },

    async openComparison(id) {
      if (!validRepositoryId(id)) {
        throw new ExperimentRepositoryError('invalid-input', 'Comparison ID is invalid');
      }
      const index = comparisons.get(id);
      if (!index) return null;
      const artifact = artifacts.get(id);
      if (!artifact || artifact.digest !== index.digest) {
        throw new ExperimentRepositoryError('corrupt-data', 'Saved comparison artifact is missing or inconsistent');
      }
      const saved: NewSavedComparison = {
        id,
        savedAt: index.value.savedAt,
        request: copy(index.value.request),
        summary: copy(index.value.summary),
        report: copy(artifact.value),
      };
      if (await savedComparisonDigest(saved) !== index.digest) {
        throw new ExperimentRepositoryError('corrupt-data', 'Saved comparison digest does not match its contents');
      }
      return copy({ ...saved, digest: index.digest });
    },

    async listComparisons(input) {
      const request = normalizeComparisonPageRequest(input);
      const sorted = [...comparisons.values()]
        .map(({ value }) => ({
          id: value.id,
          savedAt: value.savedAt,
          ...value.summary,
          candidateScheme: copy(value.summary.candidateScheme),
        }))
        .sort(compareNewestFirst);
      const afterCursor = request.cursor
        ? sorted.filter((item) => isAfterComparisonCursor(item, request.cursor!))
        : sorted;
      const items = afterCursor.slice(0, request.limit) as SavedComparisonSummary[];
      const hasMore = afterCursor.length > request.limit;
      const last = items.at(-1);
      return {
        items: copy(items),
        ...(hasMore && last ? {
          nextCursor: encodeComparisonCursor({ savedAt: last.savedAt, id: last.id }),
        } : {}),
      } satisfies SavedComparisonPage;
    },
  };
  return Object.freeze(repository);
}
