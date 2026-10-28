import { expect, test } from '@playwright/test';

async function setFourTimesSpeed(page: import('@playwright/test').Page): Promise<void> {
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await expect(speed).toBeEnabled();
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');
}

test('enforces stage unlocks and restores campaign progress after reload', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  const summary = page.getByTestId('campaign-progress-summary');
  const stageOne = page.getByTestId('campaign-stage-button-1');
  const stageTwo = page.getByTestId('campaign-stage-button-2');
  await expect(summary).toHaveText('0/2 stages complete');
  await expect(stageOne).toBeEnabled();
  await expect(stageTwo).toBeDisabled();

  await stageTwo.evaluate((button: HTMLButtonElement) => { button.disabled = false; });
  await stageTwo.click();
  await expect(page.getByTestId('campaign-status')).toContainText('locked');
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch');
  await expect(stageTwo).toBeDisabled();

  await setFourTimesSpeed(page);
  await stageOne.click();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Progress sample 1');
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('settlement-outcome')).toHaveText('Victory', { timeout: 10000 });
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Result saved to this browser.');
  await expect(summary).toHaveText('1/2 stages complete');
  await expect(stageTwo).toBeEnabled();

  await page.reload();
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('1/2 stages complete');
  await expect(page.getByTestId('campaign-stage-button-1')).toBeEnabled();
  await expect(page.getByTestId('campaign-stage-button-2')).toBeEnabled();
  await expect(page.getByTestId('campaign-stage-list')).toContainText('Completed · Best $50');

  await page.getByTestId('campaign-stage-button-2').click();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Progress sample 2');
  await expect(page.getByTestId('wave-status')).toHaveText('Wave 1 ready · Lives 40 · Cash $75');
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1 · Lives 40 · Enemies 1');

  await page.reload();
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('1/2 stages complete');
  await page.getByTestId('campaign-stage-button-2').click();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Progress sample 2');
  await expect(page.getByTestId('wave-status')).toHaveText('Wave 1 ready · Lives 40 · Cash $75');
  await expect(page.getByTestId('settlement')).toBeHidden();
});

test('opens an available stage by touch on a narrow viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByTestId('campaign-stage-button-1')).toBeEnabled();
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).tap();
  await expect(page.locator('#campaign-title')).toHaveText('战役进度');
  await page.getByTestId('campaign-stage-button-1').tap();
  await expect(page.locator('#scene-title')).toHaveText('牛溪谷 · 进度样本 1');
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('已完成 0/2 个关卡');
  await expect(page.getByTestId('campaign-stage-button-2')).toBeDisabled();
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(horizontalOverflow).toBe(false);
  await context.close();
});
