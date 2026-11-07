import {
  isExperimentArchiveData,
  type ExperimentArchiveData,
} from './experiment-repository';

export const EXPERIMENT_ARCHIVE_FORMAT = 'gunsnglory-experiments';
export const EXPERIMENT_ARCHIVE_VERSION = 1;

export class ExperimentArchiveError extends Error {
  constructor(readonly code: 'invalid-json' | 'unsupported-format' | 'unsupported-version' | 'invalid-data', message: string) {
    super(message);
    this.name = 'ExperimentArchiveError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join(',') === [...expected].sort().join(',');
}

export function serializeExperimentArchive(data: ExperimentArchiveData): string {
  if (!isExperimentArchiveData(data)) {
    throw new ExperimentArchiveError('invalid-data', 'Experiment archive contents are invalid');
  }
  return JSON.stringify({
    format: EXPERIMENT_ARCHIVE_FORMAT,
    formatVersion: EXPERIMENT_ARCHIVE_VERSION,
    schemes: data.schemes,
    comparisons: data.comparisons,
  }, null, 2);
}

export function parseExperimentArchive(source: string): ExperimentArchiveData {
  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch {
    throw new ExperimentArchiveError('invalid-json', 'Experiment archive is not valid JSON');
  }
  if (!isRecord(value)) throw new ExperimentArchiveError('invalid-data', 'Experiment archive must be a JSON object');
  if (value.format !== EXPERIMENT_ARCHIVE_FORMAT) {
    throw new ExperimentArchiveError('unsupported-format', 'Experiment archive format is not supported');
  }
  if (value.formatVersion !== EXPERIMENT_ARCHIVE_VERSION) {
    throw new ExperimentArchiveError('unsupported-version', 'Experiment archive version is not supported');
  }
  if (!hasExactKeys(value, ['format', 'formatVersion', 'schemes', 'comparisons'])) {
    throw new ExperimentArchiveError('invalid-data', 'Experiment archive has unexpected fields');
  }
  const data: unknown = { schemes: value.schemes, comparisons: value.comparisons };
  if (!isExperimentArchiveData(data)) {
    throw new ExperimentArchiveError('invalid-data', 'Experiment archive contents or scheme references are invalid');
  }
  return structuredClone(data);
}
