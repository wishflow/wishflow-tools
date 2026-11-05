import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';
import { clickCanvasPoint, cowGulchMarkerPoint, tapCanvasPoint } from './helpers';

test('formal Cow Gulch only offers map hires for selected sleeping units', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?testBattle=1');

  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('Home');
  await expect(speed).toHaveValue('0.25');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
  await expect(page.locator('[data-action="recruit-unit"]')).toBeHidden();
  await expect(page.locator('[data-action="upgrade-unit"]')).toBeHidden();
  const hire = page.getByTestId('hire-map-unit');
  await expect(hire).toBeHidden();

  await clickCanvasPoint(page, cowGulchMarkerPoint(3, 6));
  await expect(page.getByTestId('selection-status')).toContainText('Gunslinger is waiting to be hired');
  await expect(hire).toHaveText('Hire map Gunslinger · $75');
  await expect(hire).toBeDisabled();
  await expect(page.getByTestId('map-hire-status')).toBeEmpty();
  await expect(page.getByTestId('recruit-pool-status')).toHaveText('Recruit pool: empty');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $65');

  await clickCanvasPoint(page, cowGulchMarkerPoint(6, 5));
  await expect(hire).toHaveText('Hire map Mexican · $100');
  await expect(hire).toBeDisabled();
  await clickCanvasPoint(page, { x: 272, y: 80 });
  await expect(hire).toBeHidden();

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.locator('[data-action="recruit-unit"]')).toBeHidden();
  await expect(page.locator('[data-action="upgrade-unit"]')).toBeHidden();
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
});

test('formal map-hire state is available through touch on a phone-sized viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installAutoContinueCampaignWaveIntro(page);
  try {
    await page.goto('/?testBattle=1');
    const speed = page.getByRole('slider', { name: 'Simulation speed' });
    await speed.focus();
    await speed.press('Home');
    await expect(speed).toHaveValue('0.25');
    await expect(page.locator('[data-action="recruit-unit"]')).toBeHidden();
    await expect(page.locator('[data-action="upgrade-unit"]')).toBeHidden();
    const hire = page.getByTestId('hire-map-unit');
    await expect(hire).toBeHidden();
    await tapCanvasPoint(page, cowGulchMarkerPoint(3, 6));
    await expect(page.getByTestId('selection-status')).toContainText('Gunslinger is waiting to be hired');
    await expect(hire).toHaveText('Hire map Gunslinger · $75');
    await expect(hire).toBeDisabled();
    await tapCanvasPoint(page, { x: 272, y: 80 });
    await expect(hire).toBeHidden();
    await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
  } finally {
    await context.close();
  }
});
