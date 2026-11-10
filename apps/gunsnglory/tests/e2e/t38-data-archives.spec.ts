import { readFile } from 'node:fs/promises';
import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';

async function readStoredProfile(page: import('@playwright/test').Page): Promise<unknown> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('gunsnglory-profile', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('profiles', 'readonly');
    const result = await new Promise<unknown>((resolve, reject) => {
      const request = transaction.objectStore('profiles').get('default');
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
    return result;
  });
}

async function readExperimentCounts(page: import('@playwright/test').Page): Promise<Record<string, number>> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('gunsnglory-experiments', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction(['schemes', 'comparisons', 'artifacts'], 'readonly');
    const counts: Record<string, number> = {};
    await Promise.all(['schemes', 'comparisons', 'artifacts'].map(async (name) => {
      counts[name] = await new Promise<number>((resolve, reject) => {
        const request = transaction.objectStore(name).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }));
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
    return counts;
  });
}

async function installSilence(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  });
}

test('profile archive export, confirmed replacement, cancellation, and invalid version handling', async ({ page }) => {
  await page.goto('/');
  const options = page.getByTestId('game-options');
  await page.getByTestId('menu-options').click();
  await expect(options).toBeVisible();
  await expect(options.getByTestId('export-profile-archive')).toHaveCount(0);
  await options.getByTestId('campaign-menu-back').click();
  const exportButton = page.getByTestId('export-profile-archive');
  await expect(exportButton).toBeVisible();
  expect(await exportButton.evaluate((button) => button.closest('.game-frame') !== null)).toBe(false);
  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('gunsnglory-profile.json');
  const archiveText = await readFile((await download.path())!, 'utf8');
  const archive = JSON.parse(archiveText) as Record<string, unknown>;
  expect(archive.format).toBe('gunsnglory-profile');
  expect(archive.formatVersion).toBe(1);
  expect(archive).not.toHaveProperty('revision');

  const profile = {
    settings: { simulationSpeed: 1.5, difficulty: 'medium', soundEnabled: false },
    completedScenarios: ['campaign-new-mexico-01'],
    highScores: { 'campaign-new-mexico-01': 145 },
    appliedSettlementIds: ['import-session:campaign-new-mexico-01:8'],
  };
  await page.getByTestId('import-profile-archive').setInputFiles({
    name: 'profile.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'gunsnglory-profile', formatVersion: 1, profile })),
  });
  const profileConfirmation = page.getByTestId('profile-import-confirmation');
  await expect(profileConfirmation).toBeVisible();
  expect(await profileConfirmation.evaluate((panel) => panel.closest('.game-frame') !== null)).toBe(false);
  await expect(profileConfirmation).toHaveCSS('background-image', /gng_hud_2_textbox_large\.png/);
  await expect(profileConfirmation).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.getByTestId('confirm-profile-import').click();
  await expect(page.getByTestId('profile-archive-status')).toHaveText('Profile archive imported and campaign progress refreshed.');
  const importedRecord = await readStoredProfile(page) as {
    revision: number;
    settings: unknown;
    completedScenarios: unknown;
    highScores: unknown;
    appliedSettlementIds: unknown;
  };
  expect(importedRecord.settings).toEqual(profile.settings);
  expect(importedRecord.completedScenarios).toEqual(profile.completedScenarios);
  expect(importedRecord.highScores).toEqual(profile.highScores);
  expect(importedRecord.appliedSettlementIds).toEqual(profile.appliedSettlementIds);
  const snapshot = importedRecord;

  await page.getByTestId('import-profile-archive').setInputFiles({
    name: 'cancelled.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      format: 'gunsnglory-profile', formatVersion: 1,
      profile: { ...profile, completedScenarios: [], highScores: {} },
    })),
  });
  await expect(profileConfirmation).toBeVisible();
  await page.getByTestId('cancel-profile-import').click();
  await expect(page.getByTestId('profile-archive-status')).toHaveText('Profile import cancelled.');
  expect(await readStoredProfile(page)).toEqual(snapshot);

  await page.getByTestId('import-profile-archive').setInputFiles({
    name: 'future.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'gunsnglory-profile', formatVersion: 2, profile })),
  });
  await expect(page.getByTestId('profile-archive-status')).toHaveText('Profile file format or version is not supported.');
  expect(await readStoredProfile(page)).toEqual(snapshot);

  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey): IDBRequest<IDBValidKey> {
      if (this.name === 'profiles') throw new DOMException('Injected profile transaction failure', 'QuotaExceededError');
      return originalPut.call(this, value, key);
    };
  });
  await page.getByTestId('import-profile-archive').setInputFiles({
    name: 'write-failure.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'gunsnglory-profile', formatVersion: 1, profile: { ...profile, highScores: {} } })),
  });
  await expect(profileConfirmation).toBeVisible();
  await page.getByTestId('confirm-profile-import').click();
  await expect(page.getByTestId('profile-archive-status')).toHaveText('Profile could not be imported or exported.');
  expect(await readStoredProfile(page)).toEqual(snapshot);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByTestId('profile-archive-status')).toHaveText('档案文件导入或导出失败。');
});

test('experiment archive merges IndexedDB records idempotently and reports conflicts without overwriting', async ({ browser }) => {
  const sourceContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const sourcePage = await sourceContext.newPage();
  await installSilence(sourcePage);
  await installAutoContinueCampaignWaveIntro(sourcePage);
  await sourcePage.goto('/?testBattle=1');
  await expect(sourcePage.getByTestId('archive-panel')).toBeVisible();
  await sourcePage.getByTestId('compare-schemes').click();
  await expect(sourcePage.getByTestId('experiment-report-summary')).toContainText('3/3 paired samples', { timeout: 30_000 });
  await sourcePage.getByTestId('save-comparison').click();
  await expect(sourcePage.getByTestId('saved-comparison-status')).toHaveText('Comparison saved in this browser.');
  const profileBefore = await readStoredProfile(sourcePage);
  const downloadPromise = sourcePage.waitForEvent('download');
  await sourcePage.getByTestId('export-experiment-archive').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('gunsnglory-experiments.json');
  const archive = JSON.parse(await readFile((await download.path())!, 'utf8')) as {
    format: string;
    formatVersion: number;
    schemes: unknown[];
    comparisons: Array<Record<string, unknown>>;
  };
  expect(archive.format).toBe('gunsnglory-experiments');
  expect(archive.formatVersion).toBe(1);
  expect(archive.schemes).toHaveLength(2);
  expect(archive.comparisons).toHaveLength(1);
  expect(archive.comparisons[0]).not.toHaveProperty('digest');

  const targetContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const targetPage = await targetContext.newPage();
  await installSilence(targetPage);
  await installAutoContinueCampaignWaveIntro(targetPage);
  await targetPage.goto('/?testBattle=1');
  const profileInTargetBefore = await readStoredProfile(targetPage);
  const file = {
    name: 'experiments.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(archive)),
  };
  await targetPage.evaluate(() => {
    const originalAdd = IDBObjectStore.prototype.add;
    Object.defineProperty(window, '__archiveOriginalAdd', { value: originalAdd, configurable: true });
    let calls = 0;
    IDBObjectStore.prototype.add = function (value: unknown, key?: IDBValidKey): IDBRequest<IDBValidKey> {
      calls += 1;
      if (calls === 4) throw new DOMException('Injected archive transaction failure', 'QuotaExceededError');
      return originalAdd.call(this, value, key);
    };
  });
  await targetPage.getByTestId('import-experiment-archive').setInputFiles(file);
  await expect(targetPage.getByTestId('experiment-archive-status')).toHaveText('Experiment data could not be imported or exported.');
  expect(await readExperimentCounts(targetPage)).toEqual({ schemes: 0, comparisons: 0, artifacts: 0 });
  await targetPage.evaluate(() => {
    const pageWindow = window as Window & { __archiveOriginalAdd?: typeof IDBObjectStore.prototype.add };
    if (pageWindow.__archiveOriginalAdd) IDBObjectStore.prototype.add = pageWindow.__archiveOriginalAdd;
    delete pageWindow.__archiveOriginalAdd;
  });
  await targetPage.getByTestId('import-experiment-archive').setInputFiles(file);
  await expect(targetPage.getByTestId('experiment-archive-status')).toHaveText(
    'Added 2 schemes and 1 comparison; skipped 0 schemes and 0 comparisons; conflicts 0.',
  );
  const selection = targetPage.getByTestId('saved-comparison-select');
  await expect(selection.locator('option')).toHaveCount(2);
  const comparisonId = await selection.locator('option').nth(1).getAttribute('value');
  expect(comparisonId).toBeTruthy();
  await selection.selectOption(comparisonId!);
  await targetPage.getByTestId('open-comparison').click();
  await expect(targetPage.getByTestId('experiment-report-summary')).toContainText('3/3 paired samples');

  await targetPage.getByTestId('import-experiment-archive').setInputFiles(file);
  await expect(targetPage.getByTestId('experiment-archive-status')).toHaveText(
    'Added 0 schemes and 0 comparisons; skipped 2 schemes and 1 comparison; conflicts 0.',
  );

  const conflictingArchive = structuredClone(archive);
  conflictingArchive.comparisons[0]!.savedAt = Number(conflictingArchive.comparisons[0]!.savedAt) + 1;
  await targetPage.getByTestId('import-experiment-archive').setInputFiles({
    name: 'conflict.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(conflictingArchive)),
  });
  await expect(targetPage.getByTestId('experiment-archive-status')).toContainText('conflicts 1:');
  await expect(selection.locator('option')).toHaveCount(2);

  const invalidArchive = { ...archive, schemes: [] };
  await targetPage.getByTestId('import-experiment-archive').setInputFiles({
    name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalidArchive)),
  });
  await expect(targetPage.getByTestId('experiment-archive-status')).toHaveText('Experiment file is invalid or damaged.');
  await expect(selection.locator('option')).toHaveCount(2);
  expect(await readStoredProfile(sourcePage)).toEqual(profileBefore);
  expect(await readStoredProfile(targetPage)).toEqual(profileInTargetBefore);
  await sourceContext.close();
  await targetContext.close();
});
