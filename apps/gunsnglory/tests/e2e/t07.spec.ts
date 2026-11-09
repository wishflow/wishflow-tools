import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';
import { clickCanvasPoint, cowGulchMarkerPoint, expectInteractiveGameOverlay, tapCanvasPoint } from './helpers';

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
  const hireDialog = page.getByTestId('map-hire-confirmation');
  await expect(hireDialog).toBeHidden();

  await clickCanvasPoint(page, cowGulchMarkerPoint(3, 6));
  await expect(page.getByTestId('selection-status')).toContainText('Gunslinger is waiting to be hired');
  await expect(hireDialog).toBeVisible();
  await expect(page.getByTestId('map-hire-confirmation-title')).toHaveText('Hire Gunslinger for $75?');
  await expect(page.getByTestId('map-hire-confirmation-details')).toHaveText('Not enough cash: need $75, have $65.');
  await expect(page.getByTestId('confirm-map-hire')).toBeHidden();
  await expectInteractiveGameOverlay(page, 'map-hire', 'map-hire-confirmation', '[data-testid="cancel-map-hire"]');
  await expect(page.getByTestId('map-hire-status')).toBeEmpty();
  await expect(page.getByTestId('recruit-pool-status')).toHaveText('Recruit pool: empty');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
  await page.getByTestId('cancel-map-hire').click();

  await clickCanvasPoint(page, cowGulchMarkerPoint(6, 5));
  await expect(hireDialog).toBeVisible();
  await expect(page.getByTestId('map-hire-confirmation-title')).toHaveText('Hire Mexican for $100?');
  await expect(page.getByTestId('confirm-map-hire')).toBeHidden();
  await page.getByTestId('cancel-map-hire').click();
  await clickCanvasPoint(page, { x: 272, y: 80 });
  await expect(hireDialog).toBeHidden();

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
    const hireDialog = page.getByTestId('map-hire-confirmation');
    await expect(hireDialog).toBeHidden();
    await tapCanvasPoint(page, cowGulchMarkerPoint(3, 6));
    await expect(page.getByTestId('selection-status')).toContainText('Gunslinger is waiting to be hired');
    await expect(hireDialog).toBeVisible();
    await expectInteractiveGameOverlay(page, 'map-hire', 'map-hire-confirmation', '[data-testid="cancel-map-hire"]');
    await expect(page.getByTestId('map-hire-confirmation-title')).toHaveText('Hire Gunslinger for $75?');
    await expect(page.getByTestId('confirm-map-hire')).toBeHidden();
    await page.getByTestId('cancel-map-hire').click();
    await tapCanvasPoint(page, { x: 272, y: 80 });
    await expect(hireDialog).toBeHidden();
    await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
  } finally {
    await context.close();
  }
});
