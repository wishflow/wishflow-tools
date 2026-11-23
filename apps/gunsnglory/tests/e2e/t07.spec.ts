import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';
import { clickCanvasPoint, cowGulchMarkerPoint, expectInteractiveGameOverlay, tapCanvasPoint } from './helpers';

async function expectMapHireDesignGeometry(page: import('@playwright/test').Page): Promise<void> {
  const geometry = await page.getByTestId('map-hire-confirmation').evaluate((dialog) => {
    const panel = dialog.getBoundingClientRect();
    const rect = (selector: string) => {
      const element = dialog.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing hire dialog element: ${selector}`);
      const bounds = element.getBoundingClientRect();
      return {
        left: (bounds.left - panel.left) / panel.width,
        top: (bounds.top - panel.top) / panel.height,
        width: bounds.width / panel.width,
        height: bounds.height / panel.height,
        right: (bounds.right - panel.left) / panel.width,
        bottom: (bounds.bottom - panel.top) / panel.height,
      };
    };
    const details = dialog.querySelector<HTMLElement>('[data-testid="map-hire-confirmation-details"]');
    const content = dialog.querySelector<HTMLElement>('.game-confirmation-content');
    const portrait = dialog.querySelector<HTMLImageElement>('[data-testid="map-hire-confirmation-portrait"]');
    const confirmButton = dialog.querySelector<HTMLButtonElement>('[data-testid="confirm-map-hire"]');
    const title = rect('[data-testid="map-hire-confirmation-title"]');
    const detail = rect('[data-testid="map-hire-confirmation-details"]');
    const price = rect('.map-hire-price');
    const art = rect('.game-confirmation-art');
    const actions = rect('.game-original-confirmation-actions');
    const portraitBounds = rect('.map-hire-portrait');
    const confirm = rect('[data-testid="confirm-map-hire"]');
    const cancel = rect('[data-testid="cancel-map-hire"]');
    return {
      ratio: panel.width / panel.height,
      title,
      detail,
      price,
      art,
      actions,
      portrait: portraitBounds,
      portraitNaturalWidth: portrait?.naturalWidth ?? 0,
      contentOverflowY: content ? getComputedStyle(content).overflowY : '',
      detailLineClamp: details ? getComputedStyle(details).webkitLineClamp : '',
      confirm,
      cancel,
      confirmHidden: confirmButton?.hidden ?? false,
    };
  });

  expect(geometry.ratio).toBeCloseTo(384 / 272, 2);
  expect(geometry.portraitNaturalWidth).toBeGreaterThan(0);
  expect(geometry.portrait.left).toBeCloseTo(230 / 384, 2);
  expect(geometry.portrait.top).toBeCloseTo(0, 2);
  expect(geometry.portrait.width).toBeCloseTo(96 / 384, 2);
  expect(geometry.art.left).toBeCloseTo(0, 2);
  expect(geometry.art.width).toBeCloseTo(1, 2);
  expect(geometry.art.height).toBeCloseTo(192 / 272, 2);
  expect(geometry.art.bottom).toBeCloseTo(1, 2);
  expect(geometry.title.top).toBeGreaterThan(geometry.portrait.bottom);
  expect(geometry.detail.bottom).toBeLessThan(geometry.actions.top);
  expect(geometry.price.bottom).toBeLessThan(geometry.actions.top);
  expect(geometry.actions.left).toBeCloseTo(20 / 384, 2);
  expect(geometry.actions.right).toBeCloseTo(1 - 20 / 384, 2);
  expect(geometry.confirm.left).toBeLessThan(geometry.cancel.left);
  expect(geometry.cancel.right).toBeCloseTo(1 - 20 / 384, 2);
  expect(geometry.contentOverflowY).toBe('auto');
  expect(geometry.detailLineClamp).toBe('none');
  expect(geometry.price.top - geometry.detail.bottom).toBeLessThan(0.06);
}

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
  await expect(page.getByTestId('map-hire-confirmation-title')).toHaveText('Desperado');
  await expect(page.getByTestId('map-hire-confirmation-details')).toHaveText('First, go and ambush a few more gringos, so you can pay me, too!');
  await expect(page.getByTestId('map-hire-confirmation-price-label')).toHaveText('Price:');
  await expect(page.getByTestId('map-hire-confirmation-price')).toHaveText('$ 75');
  await expectMapHireDesignGeometry(page);
  await expect(page.getByTestId('confirm-map-hire')).toBeHidden();
  await expectInteractiveGameOverlay(page, 'map-hire', 'map-hire-confirmation', '[data-testid="cancel-map-hire"]');
  await expect(page.getByTestId('map-hire-status')).toBeEmpty();
  await expect(page.getByTestId('recruit-pool-status')).toHaveText('Recruit pool: empty');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
  await page.getByTestId('cancel-map-hire').click();

  await clickCanvasPoint(page, cowGulchMarkerPoint(6, 5));
  await expect(hireDialog).toBeVisible();
  await expect(page.getByTestId('map-hire-confirmation-title')).toHaveText('Bandito');
  await expectMapHireDesignGeometry(page);
  await expect(page.getByTestId('confirm-map-hire')).toBeHidden();
  await page.getByTestId('cancel-map-hire').click();
  await clickCanvasPoint(page, { x: 272, y: 80 });
  await expect(hireDialog).toBeHidden();

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.locator('[data-action="recruit-unit"]')).toBeHidden();
  await expect(page.locator('[data-action="upgrade-unit"]')).toBeHidden();
  await clickCanvasPoint(page, cowGulchMarkerPoint(3, 6));
  await expect(page.getByTestId('map-hire-confirmation-title')).toHaveText('亡命枪手');
  await expectMapHireDesignGeometry(page);
  await page.getByTestId('cancel-map-hire').click();
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
    await expect(page.getByTestId('map-hire-confirmation-title')).toHaveText('Desperado');
    await expectMapHireDesignGeometry(page);
    await expect(page.getByTestId('confirm-map-hire')).toBeHidden();
    await page.getByTestId('cancel-map-hire').click();
    await tapCanvasPoint(page, { x: 272, y: 80 });
    await expect(hireDialog).toBeHidden();
    await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
  } finally {
    await context.close();
  }
});
