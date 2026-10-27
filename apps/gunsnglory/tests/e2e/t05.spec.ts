import { expect, test } from '@playwright/test';

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
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: no Cow Gulch result yet.');
  await setFourTimesSpeed(page);

  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('wave-status')).toContainText('Enemies 1');
  await page.reload();
  await expect(page.getByTestId('wave-status')).toHaveText('Wave 1 ready · Lives 50 · Cash $65');
  await expect(page.getByTestId('settlement')).toBeHidden();
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: no Cow Gulch result yet.');

  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Result saved to this browser.', { timeout: 10000 });
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: Cow Gulch sample complete · Best $50.');

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
  await expect(page.getByTestId('wave-status')).toHaveText('Wave 1 ready · Lives 50 · Cash $65');
  await expect(page.getByTestId('settlement')).toBeHidden();
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: Cow Gulch sample complete · Best $50.');
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
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: no Cow Gulch result yet.');

  await page.getByRole('button', { name: 'Retry saving result' }).click();
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Result saved to this browser.');
  await expect(page.getByTestId('profile-status')).toHaveText('Saved profile: Cow Gulch sample complete · Best $50.');
});
