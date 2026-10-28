import { expect, test } from '@playwright/test';

test('compares immutable numeric schemes on matched runs without changing Progress', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const profileStatus = page.getByTestId('profile-status');
  await expect(profileStatus).not.toBeEmpty();
  const savedProfileBefore = await profileStatus.textContent();

  await page.getByTestId('compare-schemes').click();
  const report = page.getByTestId('experiment-report');
  await expect(report).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('experiment-report-summary')).toContainText('3/3 paired samples');
  await expect(page.getByTestId('experiment-report-summary')).toContainText('6/6 runs completed');
  await expect(page.getByTestId('experiment-report-summary')).toContainText('0% incomplete');
  await expect(page.getByTestId('experiment-scheme-values')).toHaveText('Original reward $1 · Draft reward $5');
  await expect(page.getByTestId('experiment-baseline-completed')).toHaveText('3/3');
  await expect(page.getByTestId('experiment-candidate-completed')).toHaveText('3/3');
  await expect(page.getByTestId('experiment-baseline-outcomes')).toHaveText('3 / 0');
  await expect(page.getByTestId('experiment-candidate-outcomes')).toHaveText('3 / 0');
  await expect(page.getByTestId('experiment-baseline-cash')).toHaveText('$66');
  await expect(page.getByTestId('experiment-candidate-cash')).toHaveText('$70');
  await expect(page.getByTestId('experiment-baseline-incomplete')).toHaveText('0 (0%)');
  await expect(page.getByTestId('experiment-candidate-incomplete')).toHaveText('0 (0%)');
  await expect(profileStatus).toHaveText(savedProfileBefore ?? '');

  await page.getByTestId('experiment-cash-reward').fill('9');
  await expect(page.getByTestId('experiment-cash-reward')).toHaveValue('9');
  await expect(page.getByTestId('experiment-scheme-values')).toHaveText('Original reward $1 · Draft reward $5');
  await expect(page.getByTestId('experiment-candidate-cash')).toHaveText('$70');

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByTestId('experiment-scheme-values')).toHaveText('原版奖励 $1 · 草稿奖励 $5');
  await expect(page.getByTestId('experiment-report').locator('th', { hasText: '胜利 / 失败' })).toBeVisible();
  await expect(profileStatus).toContainText('已保存档案');
});

test('keeps the comparison controls and results usable in a narrow touch viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('/');

  const compareButton = page.getByTestId('compare-schemes');
  await compareButton.scrollIntoViewIfNeeded();
  await compareButton.tap();
  await expect(page.getByTestId('experiment-report-summary')).toContainText('3/3 paired samples', { timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await context.close();
});
