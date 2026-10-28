import { isSimulationSpeed } from '../game/time-scaling';
import {
  cloneProfileData,
  isProfileData,
  isValidExpectedRevision,
  ProfileRepositoryError,
  profileRequestDigest,
  type ProfileData,
  type ProfileRepository,
  type VersionedProfile,
  type WriteProfileRequest,
} from './profile-repository';

const DATABASE_NAME = 'gunsnglory-profile';
const DATABASE_VERSION = 1;
const PROFILE_SCHEMA_VERSION = 2;
const PROFILE_STORE = 'profiles';
const DEFAULT_PROFILE_ID = 'default';

interface DecodedProfile extends VersionedProfile {
  lastOperationId: string;
  lastRequestDigest: string;
}

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new ProfileRepositoryError('unavailable', 'IndexedDB is unavailable'));
  }
  if (databasePromise) return databasePromise;

  const opened = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROFILE_STORE)) {
        database.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = undefined;
      };
      resolve(database);
    };
    request.onerror = () => reject(toRepositoryError(request.error ?? new Error('Unable to open the profile database')));
    request.onblocked = () => reject(new ProfileRepositoryError('unavailable', 'Profile database open is blocked'));
  }).catch((error: unknown) => {
    databasePromise = undefined;
    throw toRepositoryError(error);
  });
  databasePromise = opened;
  return opened;
}

function toRepositoryError(error: unknown): ProfileRepositoryError {
  if (error instanceof ProfileRepositoryError) return error;
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return new ProfileRepositoryError('quota-exceeded', 'Browser storage is full');
  }
  const message = error instanceof Error ? error.message : String(error);
  return new ProfileRepositoryError('unavailable', message || 'Profile storage is unavailable');
}

function validSettings(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const speed = (value as Record<string, unknown>).simulationSpeed;
  return speed === undefined || isSimulationSpeed(speed);
}

function decodeProfile(value: unknown): DecodedProfile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ProfileRepositoryError('corrupt-data', 'Saved profile record is not an object');
  }
  const record = value as Record<string, unknown>;
  if (record.id !== DEFAULT_PROFILE_ID) {
    throw new ProfileRepositoryError('corrupt-data', 'Saved profile has an unexpected identity');
  }
  if (record.schemaVersion !== 1 && record.schemaVersion !== PROFILE_SCHEMA_VERSION) {
    throw new ProfileRepositoryError('unsupported-version', 'Saved profile uses an unsupported format');
  }
  if (!validSettings(record.settings === undefined ? {} : record.settings)) {
    throw new ProfileRepositoryError('corrupt-data', 'Saved profile settings are corrupt');
  }

  if (record.schemaVersion === 1) {
    return {
      data: {
        settings: { ...(record.settings as Record<string, unknown> | undefined) },
        completedScenarios: [],
        highScores: {},
        appliedSettlementIds: [],
      },
      revision: 0,
      lastOperationId: '',
      lastRequestDigest: '',
    };
  }

  const data: ProfileData = {
    settings: record.settings as Record<string, unknown>,
    completedScenarios: record.completedScenarios as string[],
    highScores: record.highScores as Record<string, number>,
    appliedSettlementIds: record.appliedSettlementIds as string[],
  };
  if (!isProfileData(data)
    || !Number.isSafeInteger(record.revision) || (record.revision as number) < 1
    || typeof record.lastOperationId !== 'string' || !record.lastOperationId
    || typeof record.lastRequestDigest !== 'string' || !record.lastRequestDigest) {
    throw new ProfileRepositoryError('corrupt-data', 'Saved profile data is corrupt');
  }
  return {
    data: cloneProfileData(data),
    revision: record.revision as number,
    lastOperationId: record.lastOperationId,
    lastRequestDigest: record.lastRequestDigest,
  };
}

function profileSnapshot(value: unknown): string {
  try {
    const snapshot = JSON.stringify(value);
    if (snapshot === undefined) throw new Error('Profile record cannot be represented as JSON');
    return snapshot;
  } catch {
    throw new ProfileRepositoryError('corrupt-data', 'Saved profile cannot be exported as JSON');
  }
}

function withProfileTransaction<T>(
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction, complete: (value: T) => void, fail: (error: Error) => void) => void,
): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    let value: T;
    let hasValue = false;
    let failure: Error | undefined;
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(PROFILE_STORE, mode);
    } catch (error) {
      reject(toRepositoryError(error));
      return;
    }
    const complete = (result: T) => {
      value = result;
      hasValue = true;
    };
    const fail = (error: Error) => {
      failure = error;
      try {
        transaction.abort();
      } catch {
        reject(toRepositoryError(error));
      }
    };
    transaction.oncomplete = () => {
      if (failure) reject(toRepositoryError(failure));
      else if (hasValue) resolve(value!);
      else reject(new ProfileRepositoryError('unavailable', 'Profile transaction completed without a result'));
    };
    transaction.onerror = () => reject(toRepositoryError(failure ?? transaction.error ?? new Error('Profile transaction failed')));
    transaction.onabort = () => reject(toRepositoryError(failure ?? transaction.error ?? new Error('Profile transaction was aborted')));
    try {
      run(transaction, complete, fail);
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  }));
}

export function createIndexedDbProfileRepository(): ProfileRepository {
  return {
    readProfile(): Promise<VersionedProfile | null> {
      return withProfileTransaction('readonly', (transaction, complete, fail) => {
        const request = transaction.objectStore(PROFILE_STORE).get(DEFAULT_PROFILE_ID);
        request.onsuccess = () => {
          if (request.result === undefined) {
            complete(null);
            return;
          }
          try {
            const decoded = decodeProfile(request.result);
            complete({ data: decoded.data, revision: decoded.revision });
          } catch (error) {
            fail(error instanceof Error ? error : new Error(String(error)));
          }
        };
        request.onerror = () => fail(toRepositoryError(request.error ?? new Error('Unable to read the saved profile')));
      });
    },

    writeProfile(request: WriteProfileRequest): Promise<{ revision: number }> {
      if (!request.operationId || !isValidExpectedRevision(request.expectedRevision) || !isProfileData(request.data)) {
        return Promise.reject(new ProfileRepositoryError('invalid-input', 'Profile save request is invalid'));
      }
      const digest = profileRequestDigest(request);
      return withProfileTransaction('readwrite', (transaction, complete, fail) => {
        const store = transaction.objectStore(PROFILE_STORE);
        const read = store.get(DEFAULT_PROFILE_ID);
        read.onsuccess = () => {
          let current: DecodedProfile | null;
          try {
            current = read.result === undefined ? null : decodeProfile(read.result);
          } catch (error) {
            fail(error instanceof Error ? error : new Error(String(error)));
            return;
          }

          if (current?.lastOperationId === request.operationId) {
            if (current.lastRequestDigest !== digest) {
              fail(new ProfileRepositoryError('invalid-input', 'Operation ID was reused with different profile data'));
              return;
            }
            complete({ revision: current.revision });
            return;
          }

          if ((current?.revision ?? null) !== request.expectedRevision) {
            fail(new ProfileRepositoryError('conflict', 'Profile revision has changed'));
            return;
          }

          const revision = (current?.revision ?? 0) + 1;
          try {
            store.put({
              id: DEFAULT_PROFILE_ID,
              schemaVersion: PROFILE_SCHEMA_VERSION,
              settings: { ...request.data.settings },
              completedScenarios: [...request.data.completedScenarios],
              highScores: { ...request.data.highScores },
              appliedSettlementIds: [...request.data.appliedSettlementIds],
              revision,
              lastOperationId: request.operationId,
              lastRequestDigest: digest,
            });
            complete({ revision });
          } catch (error) {
            fail(error instanceof Error ? error : new Error(String(error)));
          }
        };
        read.onerror = () => fail(toRepositoryError(read.error ?? new Error('Unable to read the saved profile')));
      });
    },

    exportRawProfileRecord(): Promise<string | null> {
      return withProfileTransaction('readonly', (transaction, complete, fail) => {
        const request = transaction.objectStore(PROFILE_STORE).get(DEFAULT_PROFILE_ID);
        request.onsuccess = () => {
          try {
            complete(request.result === undefined ? null : profileSnapshot(request.result));
          } catch (error) {
            fail(error instanceof Error ? error : new Error(String(error)));
          }
        };
        request.onerror = () => fail(toRepositoryError(request.error ?? new Error('Unable to export the saved profile')));
      });
    },

    resetCorruptProfile(snapshot: string): Promise<void> {
      return withProfileTransaction('readwrite', (transaction, complete, fail) => {
        const store = transaction.objectStore(PROFILE_STORE);
        const request = store.get(DEFAULT_PROFILE_ID);
        request.onsuccess = () => {
          if (request.result === undefined) {
            fail(new ProfileRepositoryError('invalid-input', 'No saved profile is available to reset'));
            return;
          }
          let currentSnapshot: string;
          try {
            currentSnapshot = profileSnapshot(request.result);
          } catch (error) {
            fail(error instanceof Error ? error : new Error(String(error)));
            return;
          }
          if (currentSnapshot !== snapshot) {
            fail(new ProfileRepositoryError('conflict', 'Saved profile changed after the backup was exported'));
            return;
          }
          try {
            decodeProfile(request.result);
          } catch (error) {
            if (!(error instanceof ProfileRepositoryError) || error.code !== 'corrupt-data') {
              fail(error instanceof Error ? error : new Error(String(error)));
              return;
            }
            try {
              store.delete(DEFAULT_PROFILE_ID);
              complete(undefined);
            } catch (deleteError) {
              fail(deleteError instanceof Error ? deleteError : new Error(String(deleteError)));
            }
            return;
          }
          fail(new ProfileRepositoryError('invalid-input', 'A valid profile cannot be reset as corrupt data'));
        };
        request.onerror = () => fail(toRepositoryError(request.error ?? new Error('Unable to read the saved profile')));
      });
    },
  };
}
