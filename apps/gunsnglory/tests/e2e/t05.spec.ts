import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openSingleWaveSample } from './helpers';

async function setFourTimesSpeed(page: import('@playwright/test').Page): Promise<void> {
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await expect(speed).toBeEnabled();
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');
  await expect(page.getByTestId('settings-status')).toContainText('saved');
}

test('saves a formal result across reload and discards an unfinished wave', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: no official Cow Gulch level 1 result yet.');
  await setFourTimesSpeed(page);

  await openSingleWaveSample(page);
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('wave-status')).toContainText('Enemies 1');
  await page.reload();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');
  await openSingleWaveSample(page);
  await expect(page.getByTestId('wave-status')).toHaveText('Wave 1 ready · Lives 50 · Cash $65');
  await expect(page.getByTestId('settlement')).toBeHidden();
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: no official Cow Gulch level 1 result yet.');

  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Result saved to this browser.', { timeout: 10000 });
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: no official Cow Gulch level 1 result yet.');

  const stored = await page.evaluate(async () => new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readonly');
      const read = transaction.objectStore('profiles').get('default');
      read.onsuccess = () => resolve(read.result as Record<string, unknown>);
      read.onerror = () => reject(read.error);
      transaction.oncomplete = () => database.close();
    };
  }));
  expect(stored.schemaVersion).toBe(2);
  expect(stored.completedScenarios).toEqual(['cow-gulch']);
  expect(stored.highScores).toEqual({ 'cow-gulch': 50 });
  expect((stored.appliedSettlementIds as string[]).length).toBe(1);

  await page.reload();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');
  await expect(page.getByTestId('settlement')).toBeHidden();
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: no official Cow Gulch level 1 result yet.');
});

test('IndexedDB profile adapter enforces conditional writes and idempotent operation IDs', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const adapterModulePath: string = '/src/progress/indexeddb-profile-repository.ts';
    const { createIndexedDbProfileRepository } = await import(/* @vite-ignore */ adapterModulePath);
    const contractModulePath: string = '/tests/profile-repository-contract.ts';
    const { verifyProfileRepositoryContract } = await import(/* @vite-ignore */ contractModulePath);
    const repository = createIndexedDbProfileRepository();
    await verifyProfileRepositoryContract(() => repository);
    const current = await repository.readProfile();
    return {
      revision: current?.revision,
      settlementIds: current?.data.appliedSettlementIds,
    };
  });

  expect(result.revision).toBe(2);
  expect(result.settlementIds).toEqual(['settlement-one']);
});

test('reports a real IndexedDB transaction abort and retries the pending settlement', async ({ page }) => {
  await page.goto('/');
  await setFourTimesSpeed(page);
  await openSingleWaveSample(page);
  await page.evaluate(() => {
    const state = window as Window & { __abortNextProfilePut?: boolean };
    state.__abortNextProfilePut = true;
    const original = IDBObjectStore.prototype.put;
    Object.defineProperty(IDBObjectStore.prototype, 'put', {
      configurable: true,
      value: function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
        const request = original.apply(this, args);
        const currentState = window as Window & { __abortNextProfilePut?: boolean };
        if (currentState.__abortNextProfilePut && this.transaction.mode === 'readwrite') {
          currentState.__abortNextProfilePut = false;
          this.transaction.abort();
        }
        return request;
      },
    });
  });

  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Result is not saved. Retry to save it.', { timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Retry saving result' })).toBeVisible();
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: no official Cow Gulch level 1 result yet.');

  await page.getByRole('button', { name: 'Retry saving result' }).click();
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Result saved to this browser.');
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: no official Cow Gulch level 1 result yet.');
});

test('a stale tab sees a settings conflict and can reload the newer saved value', async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await Promise.all([first.goto('/'), second.goto('/')]);
  await expect(first.getByTestId('profile-status')).toHaveText('Saved profile: no official Cow Gulch level 1 result yet.');
  await expect(second.getByTestId('profile-status')).toHaveText('Saved profile: no official Cow Gulch level 1 result yet.');

  const firstSpeed = first.getByRole('slider', { name: 'Simulation speed' });
  await firstSpeed.focus();
  await firstSpeed.press('End');
  await expect(first.getByTestId('settings-status')).toHaveText('Settings saved.');

  const staleSpeed = second.getByRole('slider', { name: 'Simulation speed' });
  await staleSpeed.focus();
  await staleSpeed.press('Home');
  await expect(second.getByTestId('settings-status'))
    .toHaveText('A newer profile exists. Reload it before saving another setting.');
  await expect(second.getByRole('button', { name: 'Reload saved profile' })).toBeVisible();
  await expect(staleSpeed).toHaveValue('0.25');

  await second.getByRole('button', { name: 'Reload saved profile' }).click();
  await expect(staleSpeed).toHaveValue('4');
  await expect(second.getByTestId('settings-status')).toHaveText('Settings saved.');
});

test('retries a failed settings transaction with the original operation', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const state = window as Window & { __abortSettingsWrite?: boolean };
    state.__abortSettingsWrite = true;
    const original = IDBObjectStore.prototype.put;
    Object.defineProperty(IDBObjectStore.prototype, 'put', {
      configurable: true,
      value: function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
        const request = original.apply(this, args);
        const currentState = window as Window & { __abortSettingsWrite?: boolean };
        if (currentState.__abortSettingsWrite && this.transaction.mode === 'readwrite') {
          currentState.__abortSettingsWrite = false;
          this.transaction.abort();
        }
        return request;
      },
    });
  });

  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(page.getByTestId('settings-status'))
    .toHaveText('The selected settings are active for this session, but could not be saved.');
  await expect(page.getByRole('button', { name: 'Retry saving settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry saving settings' }).click();
  await expect(page.getByTestId('settings-status')).toHaveText('Settings saved.');
  await expect(speed).toHaveValue('4');
});

test('exports a damaged profile before allowing its replacement', async ({ page }) => {
  const damagedRecord = {
    id: 'default',
    schemaVersion: 2,
    settings: { simulationSpeed: 1.1 },
    completedScenarios: [],
    highScores: {},
    appliedSettlementIds: [],
    revision: 1,
    lastOperationId: 'damaged-record',
    lastRequestDigest: 'damaged-record',
  };
  await page.goto('/');
  await page.evaluate(async (record) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put(record);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    };
  }), damagedRecord);
  await page.reload();

  await expect(page.getByTestId('profile-status'))
    .toHaveText('Saved profile is damaged. Download a backup before replacing it.');
  await expect(page.getByRole('button', { name: 'Replace damaged profile' })).toBeHidden();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download profile backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('gunsnglory-profile-backup.json');
  const path = await download.path();
  expect(path).not.toBeNull();
  expect(JSON.parse(await readFile(path!, 'utf8'))).toEqual(damagedRecord);
  await expect(page.getByTestId('profile-recovery-status'))
    .toHaveText('Backup downloaded. You can now replace the damaged profile.');

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Replace damaged profile' }).click();
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: no official Cow Gulch level 1 result yet.');
  await expect(page.getByTestId('profile-recovery-status'))
    .toHaveText('Damaged profile replaced. The downloaded backup keeps the original record.');
});

test('preserves a profile from a newer schema and offers backup without reset', async ({ page }) => {
  const newerRecord = { id: 'default', schemaVersion: 99, note: 'keep-me' };
  await page.goto('/');
  await page.evaluate(async (record) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put(record);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    };
  }), newerRecord);
  await page.reload();

  await expect(page.getByTestId('profile-status'))
    .toHaveText('Saved profile uses a newer format. Download a backup and open it with a compatible version.');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download profile backup' }).click();
  await downloadPromise;
  await expect(page.getByRole('button', { name: 'Replace damaged profile' })).toBeHidden();
  const stored = await page.evaluate(async () => new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readonly');
      const read = transaction.objectStore('profiles').get('default');
      read.onsuccess = () => resolve(read.result as Record<string, unknown>);
      read.onerror = () => reject(read.error);
      transaction.oncomplete = () => database.close();
    };
  }));
  expect(stored).toEqual(newerRecord);
});

test('the IndexedDB adapter refuses to reset a damaged record changed after backup', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const damagedRecord = {
      id: 'default',
      schemaVersion: 2,
      settings: { simulationSpeed: 1.1 },
      completedScenarios: [],
      highScores: {},
      appliedSettlementIds: [],
      revision: 1,
      lastOperationId: 'damaged-record',
      lastRequestDigest: 'damaged-record',
    };
    const open = (record: Record<string, unknown>) => new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('gunsnglory-profile', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('profiles', 'readwrite');
        transaction.objectStore('profiles').put(record);
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
    await open(damagedRecord);
    const adapterModulePath: string = '/src/progress/indexeddb-profile-repository.ts';
    const { createIndexedDbProfileRepository } = await import(/* @vite-ignore */ adapterModulePath);
    const repository = createIndexedDbProfileRepository();
    const snapshot = await repository.exportRawProfileRecord();
    await open({ ...damagedRecord, settings: { simulationSpeed: 1.25 } });
    let resetCode: string | undefined;
    try {
      await repository.resetCorruptProfile(snapshot!);
    } catch (error) {
      resetCode = (error as { code?: string }).code;
    }
    const current = await repository.exportRawProfileRecord();
    return { resetCode, current: JSON.parse(current!) as Record<string, unknown> };
  });

  expect(result.resetCode).toBe('conflict');
  expect((result.current.settings as Record<string, number>).simulationSpeed).toBe(1.25);
});
