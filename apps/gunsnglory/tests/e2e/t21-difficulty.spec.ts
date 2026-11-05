import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';

test('persists the next-battle difficulty, applies it to a scene, and keeps Hard locked', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await page.getByTestId('campaign-level-01').click();
  await page.getByTestId('campaign-stage-play').click();

  await expect(page.getByRole('dialog')).toContainText('Choose difficulty:');
  await expect(page.getByTestId('campaign-difficulty-easy')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('campaign-difficulty-hard')).toBeDisabled();
  await expect(page.getByTestId('campaign-menu-notice')).toContainText('Complete a tenth level to unlock Hard.');
  await page.getByTestId('campaign-difficulty-medium').click();
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
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await page.getByTestId('campaign-level-01').click();
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByTestId('campaign-difficulty-medium')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('campaign-difficulty-hard')).toBeDisabled();
  await page.getByTestId('campaign-difficulty-medium').click();
  await expect(page.getByTestId('scene-difficulty')).toHaveText('DIFFICULTY · MEDIUM');
});

test('difficulty selection and lock feedback fit the mobile campaign screen', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installAutoContinueCampaignWaveIntro(page);
  await page.goto('/');
  await page.getByTestId('menu-start').tap();
  await page.getByTestId('campaign-region-new-mexico').tap();
  await page.getByTestId('campaign-level-01').tap();
  await page.getByTestId('campaign-stage-play').tap();
  await expect(page.getByTestId('campaign-difficulty-hard')).toBeDisabled();
  await expect(page.getByTestId('campaign-menu-notice')).toContainText('Complete a tenth level to unlock Hard.');
  await page.getByTestId('campaign-difficulty-medium').tap();
  await expect(page.getByTestId('scene-difficulty')).toHaveText('DIFFICULTY · MEDIUM');
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(horizontalOverflow).toBe(false);
  await context.close();
});
