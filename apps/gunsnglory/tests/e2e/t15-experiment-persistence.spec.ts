import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';

async function readProfileRecord(page: import('@playwright/test').Page): Promise<unknown> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('gunsnglory-profile', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!db.objectStoreNames.contains('profiles')) {
      db.close();
      return null;
    }
    const transaction = db.transaction('profiles', 'readonly');
    const record = await new Promise<unknown>((resolve, reject) => {
      const request = transaction.objectStore('profiles').get('default');
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
    return record;
  });
}

test('saves a comparison to IndexedDB and reopens the same report after reload without touching Progress', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const consoleIssues: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') consoleIssues.push(message.text());
  });
  page.on('pageerror', (error) => consoleIssues.push(error.message));
  await page.goto('/');
  await expect(page.getByTestId('profile-status')).not.toBeEmpty();
  const profileBefore = await readProfileRecord(page);

  await page.getByTestId('compare-schemes').click();
  await expect(page.getByTestId('experiment-report-summary')).toContainText('3/3 paired samples', { timeout: 30_000 });
  await page.getByTestId('save-comparison').click();
  const savedStatus = page.getByTestId('saved-comparison-status');
  await expect(savedStatus).toHaveText('Comparison saved in this browser.');
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(savedStatus).toHaveText('比较已保存到此浏览器。');
  const summaryBefore = await page.getByTestId('experiment-report-summary').textContent();
  const schemeValuesBefore = await page.getByTestId('experiment-scheme-values').textContent();
  const cashBefore = await page.getByTestId('experiment-candidate-cash').textContent();
  const selection = page.getByTestId('saved-comparison-select');
  await expect(selection).not.toHaveValue('');
  const comparisonId = await selection.inputValue();

  await page.reload();
  await expect(selection.locator('option').filter({ hasText: comparisonId })).toHaveCount(1, { timeout: 10_000 });
  await selection.selectOption(comparisonId);
  await page.getByTestId('open-comparison').click();
  await expect(page.getByTestId('saved-comparison-status')).toHaveText('已打开已保存的比较。');
  await expect(page.getByTestId('experiment-report-summary')).toHaveText(summaryBefore ?? '');
  await expect(page.getByTestId('experiment-scheme-values')).toHaveText(schemeValuesBefore ?? '');
  await expect(page.getByTestId('experiment-candidate-cash')).toHaveText(cashBefore ?? '');
  await expect(page.getByTestId('save-comparison')).toBeDisabled();
  expect(await readProfileRecord(page)).toEqual(profileBefore);
  expect(consoleIssues).toEqual([]);
});


test('keeps experiment save and reopen controls usable on a narrow touch viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installAutoContinueCampaignWaveIntro(page);
  const consoleIssues: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') consoleIssues.push(message.text());
  });
  page.on('pageerror', (error) => consoleIssues.push(error.message));
  await page.goto('/');
  await page.getByTestId('compare-schemes').tap();
  await expect(page.getByTestId('experiment-report-summary')).toContainText('3/3 paired samples', { timeout: 30_000 });
  await page.getByTestId('save-comparison').tap();
  await expect(page.getByTestId('saved-comparison-status')).toHaveText('Comparison saved in this browser.');
  const selection = page.getByTestId('saved-comparison-select');
  const id = await selection.inputValue();
  expect(id).not.toBe('');
  await selection.selectOption(id);
  await page.getByTestId('open-comparison').tap();
  await expect(page.getByTestId('saved-comparison-status')).toHaveText('Saved comparison opened.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(consoleIssues).toEqual([]);
  await context.close();
});
