import { expect, test } from '@playwright/test';

async function setFourTimesSpeed(page: import('@playwright/test').Page): Promise<void> {
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await expect(speed).toBeEnabled();
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');
}

test('shows a victory settlement and restarts the same sample from clean state', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await setFourTimesSpeed(page);

  const canvas = page.getByTestId('game-canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect(page.getByTestId('selection-status')).toContainText('Gunslinger selected');

  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  const result = page.getByTestId('settlement');
  await expect(result).toBeVisible();
  await expect(page.getByTestId('settlement-outcome')).toHaveText('Victory');
  await expect(page.getByTestId('settlement-summary')).toContainText('Cash $66');
  await expect(page.getByTestId('settlement-score')).toHaveText('Displayed score: $50');
  await expect(page.getByTestId('settlement-high-score')).toHaveText('High-score file value (not saved yet): $50');
  await expect(page.getByTestId('combat-status')).toContainText('Pioneer defeated · +$1');
  await expect(page.getByRole('button', { name: 'Restart this sample' })).toBeFocused();
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.locator('#settlement-title')).toHaveText('战斗结算');
  await expect(page.getByTestId('settlement-outcome')).toHaveText('胜利');
  await expect(page.getByTestId('settlement-score')).toHaveText('画面分数：$50');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  await page.getByRole('button', { name: 'Restart this sample' }).click();
  await expect(result).toBeHidden();
  await expect(page.getByTestId('wave-status')).toHaveText('Wave 1 ready · Lives 50 · Cash $65');
  await expect(page.getByTestId('selection-status')).toHaveText('No unit selected');
  await expect(page.getByTestId('combat-status')).toBeEmpty();
  await expect(page.getByRole('button', { name: 'Start one pioneer sample' })).toBeEnabled();
  await page.waitForTimeout(150);
  await expect(page.getByTestId('wave-status')).toHaveText('Wave 1 ready · Lives 50 · Cash $65');
});

test('shows a defeat settlement when the last life is lost and restarts without stale state', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await setFourTimesSpeed(page);
  await page.getByRole('button', { name: 'Test defeat with one life' }).click();

  const result = page.getByTestId('settlement');
  await expect(result).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('settlement-outcome')).toHaveText('Defeat');
  await expect(page.getByTestId('settlement-summary')).toContainText('Lives 0 · Escaped 1 · Defeated 0 · Cash $65');
  await expect(page.getByTestId('settlement-score')).toHaveText('Displayed score: $49');
  await expect(page.getByTestId('settlement-high-score')).toHaveText('High-score file value (not saved yet): $48');

  await page.getByRole('button', { name: 'Restart this sample' }).click();
  await expect(result).toBeHidden();
  await expect(page.getByTestId('wave-status')).toHaveText('Wave 1 ready · Lives 1 · Cash $65');
  await expect(page.getByTestId('selection-status')).toHaveText('No unit selected');
  await page.waitForTimeout(150);
  await expect(page.getByTestId('wave-status')).toHaveText('Wave 1 ready · Lives 1 · Cash $65');
});

test('keeps the settlement and restart usable with mobile touch input', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await setFourTimesSpeed(page);
  await page.getByRole('button', { name: 'Start one pioneer sample' }).tap();
  await expect(page.getByTestId('settlement-outcome')).toHaveText('Victory');
  await page.getByRole('button', { name: 'Restart this sample' }).tap();
  await expect(page.getByTestId('settlement')).toBeHidden();
  await expect(page.getByTestId('wave-status')).toHaveText('Wave 1 ready · Lives 50 · Cash $65');
  await context.close();
});

test('stops the active session when the page is leaving', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1 · Lives 50 · Enemies 1');

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.waitForTimeout(100);
  expect(pageErrors).toEqual([]);

  await page.reload();
  await expect(page.getByTestId('wave-status')).toHaveText('Wave 1 ready · Lives 50 · Cash $65');
});
