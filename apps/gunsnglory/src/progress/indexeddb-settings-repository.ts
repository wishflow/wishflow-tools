import type { GameSettings, SettingsRepository } from './index';
import { isSimulationSpeed } from '../game/time-scaling';

const DATABASE_NAME = 'gunsnglory-profile';
const DATABASE_VERSION = 1;
const PROFILE_STORE = 'profiles';
const DEFAULT_PROFILE_ID = 'default';

interface StoredProfile {
  id: string;
  schemaVersion: number;
  settings?: Record<string, unknown>;
}

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable'));
  if (databasePromise) return databasePromise;

  const opened = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROFILE_STORE)) {
        database.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open the settings database'));
    request.onblocked = () => reject(new Error('Settings database upgrade is blocked'));
  }).catch((error: unknown) => {
    databasePromise = undefined;
    throw error;
  });
  databasePromise = opened;
  return opened;
}

function isStoredProfile(value: unknown): value is StoredProfile {
  return typeof value === 'object' && value !== null
    && (value as { id?: unknown }).id === DEFAULT_PROFILE_ID
    && (value as { schemaVersion?: unknown }).schemaVersion === DATABASE_VERSION;
}

function readProfile(
  transaction: IDBTransaction,
  onProfile: (profile: StoredProfile | undefined) => void,
  onError: (error: Error) => void,
): void {
  const request = transaction.objectStore(PROFILE_STORE).get(DEFAULT_PROFILE_ID);
  request.onsuccess = () => {
    const value: unknown = request.result;
    if (value === undefined) {
      onProfile(undefined);
      return;
    }
    if (!isStoredProfile(value)) {
      onError(new Error('Saved profile is corrupt or uses an unsupported format'));
      return;
    }
    onProfile(value);
  };
  request.onerror = () => onError(request.error ?? new Error('Unable to read saved settings'));
}

function savedSettings(profile: StoredProfile | undefined): Record<string, unknown> | undefined {
  const settings = profile?.settings;
  if (settings === undefined) return undefined;
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
    throw new Error('Saved profile settings are corrupt');
  }
  const simulationSpeed = settings.simulationSpeed;
  if (simulationSpeed !== undefined && !isSimulationSpeed(simulationSpeed)) {
    throw new Error('Saved simulation speed is corrupt');
  }
  return settings;
}

function withProfileTransaction<T>(
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction, complete: (value: T) => void, fail: (error: Error) => void) => void,
): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    let value: T;
    let failure: Error | undefined;
    const transaction = database.transaction(PROFILE_STORE, mode);
    const complete = (result: T) => { value = result; };
    const fail = (error: Error) => {
      failure = error;
      try { transaction.abort(); } catch { reject(error); }
    };
    transaction.oncomplete = () => resolve(value!);
    transaction.onerror = () => reject(failure ?? transaction.error ?? new Error('Settings transaction failed'));
    transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Settings transaction was aborted'));
    try {
      run(transaction, complete, fail);
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  }));
}

export function createIndexedDbSettingsRepository(): SettingsRepository {
  return {
    readSettings(): Promise<unknown | null> {
      return withProfileTransaction('readonly', (transaction, complete, fail) => {
        readProfile(transaction, (profile) => {
          try {
            complete(savedSettings(profile) ?? null);
          } catch (error) {
            fail(error instanceof Error ? error : new Error(String(error)));
          }
        }, fail);
      });
    },

    writeSettings(settings: GameSettings): Promise<void> {
      return withProfileTransaction('readwrite', (transaction, complete, fail) => {
        readProfile(transaction, (profile) => {
          let priorSettings: Record<string, unknown> | undefined;
          try {
            priorSettings = savedSettings(profile);
          } catch (error) {
            fail(error instanceof Error ? error : new Error(String(error)));
            return;
          }
          try {
            transaction.objectStore(PROFILE_STORE).put({
              ...profile,
              id: DEFAULT_PROFILE_ID,
              schemaVersion: DATABASE_VERSION,
              settings: { ...priorSettings, ...settings },
            });
            complete(undefined);
          } catch (error) {
            fail(error instanceof Error ? error : new Error(String(error)));
          }
        }, fail);
      });
    },
  };
}
