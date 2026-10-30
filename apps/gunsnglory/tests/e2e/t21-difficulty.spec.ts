import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';

test('persists the next-battle difficulty, applies it to a scene, and keeps Hard locked', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  const difficulty = page.getByTestId('difficulty-select');
  await expect(difficulty).toHaveValue('easy');
  await expect(difficulty.locator('option[value="hard"]')).toHaveAttribute('disabled', '');
  await expect(page.getByTestId('difficulty-status')).toContainText('Hard unlocks after completing the 10th level');

  await difficulty.evaluate((select: HTMLSelectElement) => {
    select.value = 'hard';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(difficulty).toHaveValue('easy');
  await expect(page.getByTestId('campaign-status')).toContainText('Hard unlocks after completing the 10th level');

  await difficulty.selectOption('medium');
  await expect(page.getByTestId('settings-status')).toHaveText('Settings saved.');
  await expect(page.getByTestId('scene-difficulty')).toHaveText('DIFFICULTY · EASY');
  await page.getByTestId('campaign-stage-button-1').click();
  await expect(page.getByTestId('scene-difficulty')).toHaveText('DIFFICULTY · MEDIUM');
  const storedDifficulty = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('gunsnglory-profile');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const record = await new Promise<{ settings?: { difficulty?: string } }>((resolve, reject) => {
      const request = database.transaction('profiles', 'readonly').objectStore('profiles').get('default');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return record.settings?.difficulty;
  });
  expect(storedDifficulty).toBe('medium');

  await page.reload();
  await expect(page.getByTestId('difficulty-select')).toHaveValue('medium');
  await expect(page.getByTestId('scene-difficulty')).toHaveText('DIFFICULTY · MEDIUM');
  await expect(page.getByTestId('difficulty-select').locator('option[value="hard"]')).toHaveAttribute('disabled', '');
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(page.getByTestId('settings-status')).toHaveText('Settings saved.');
  await page.getByTestId('campaign-stage-button-1').click();
  await expect(page.getByTestId('scene-difficulty')).toHaveText('DIFFICULTY · MEDIUM');
  await page.getByTestId('open-single-wave-sample').click();
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('settlement-outcome')).toHaveText('Victory', { timeout: 10_000 });
  await expect(page.getByTestId('settlement-score')).toHaveText('Displayed score: $67');
  await expect(page.getByTestId('settlement-high-score')).toHaveText('High-score saved: $67');
  await expect(page.getByTestId('difficulty-select').locator('option[value="hard"]')).toHaveAttribute('disabled', '');
  await difficulty.selectOption('easy');
  await expect(page.getByTestId('settings-status')).toHaveText('Settings saved.');
  await expect(page.getByTestId('scene-difficulty')).toHaveText('DIFFICULTY · MEDIUM');
  await page.getByRole('button', { name: 'Restart this sample' }).click();
  await expect(page.getByTestId('scene-difficulty')).toHaveText('DIFFICULTY · EASY');
  await expect(page.getByTestId('difficulty-select')).toHaveValue('easy');
});

test('difficulty selection and lock feedback fit the mobile campaign panel', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installAutoContinueCampaignWaveIntro(page);
  await page.goto('/');
  await expect(page.getByTestId('difficulty-select')).toBeEnabled();
  await expect(page.getByTestId('difficulty-select').locator('option[value="hard"]')).toHaveAttribute('disabled', '');
  await page.getByTestId('difficulty-select').selectOption('medium');
  await expect(page.getByTestId('settings-status')).toHaveText('Settings saved.');
  await expect(page.getByTestId('scene-difficulty')).toHaveText('DIFFICULTY · EASY');
  await page.getByTestId('campaign-stage-button-1').tap();
  await expect(page.getByTestId('scene-difficulty')).toHaveText('DIFFICULTY · MEDIUM');
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(horizontalOverflow).toBe(false);
  await context.close();
});
