import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';
import { expectInteractiveGameOverlay, openSingleWaveSample } from './helpers';

async function clickMapCenter(page: import('@playwright/test').Page): Promise<void> {
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

test('keeps the original level locked and upgrades the selected Gunslinger in the debug rules sample', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?testBattle=1');
  await openSingleWaveSample(page);

  await expect(page.getByTestId('upgrade-sample-status')).toContainText('upgrade limit of 0');
  await expect(page.getByTestId('campaign-stage-button-2')).toBeDisabled();
  await expect(page.getByTestId('upgrade-unit')).toBeHidden();
  await page.getByRole('button', { name: 'Open upgrade rules sample' }).click();
  await expect(page.getByTestId('scene-context')).toHaveText('DEBUG RULE TEST');
  await expect(page.getByTestId('upgrade-sample-status')).toContainText('no profile writes');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $25');

  await clickMapCenter(page);
  await expect(page.getByTestId('selection-status')).toContainText('Gunslinger selected');
  const upgrade = page.getByRole('button', { name: 'Upgrade Gunslinger · $25' });
  await expect(upgrade).toBeVisible();
  await upgrade.click();

  const confirmation = page.getByTestId('upgrade-confirmation');
  const details = page.getByTestId('upgrade-confirmation-details');
  await expect(confirmation).toBeVisible();
  await expectInteractiveGameOverlay(page, 'upgrade', 'upgrade-confirmation', '[data-action="cancel-upgrade"]');
  await expect(details).toContainText('Level 0 → 1');
  await expect(details).toContainText('Speed 1.95 cells/s (1500 fine/100ms) → 2.28 cells/s (1750 fine/100ms)');
  await expect(details).toContainText('Damage 140 → 140 base damage/shot');
  await expect(details).toContainText('HP loss = trunc(base × target-type modifier / 100)');
  await expect(details).toContainText('Range 5.00 cells (38400 fine units) → 5.00 cells (38400 fine units)');
  await expect(details).toContainText('Reload 500 → 400 ms');
  await expect(details).toContainText('Special reload 1500 → 1250 ms');
  await expect(details).toContainText('Price $25 · Cash $25');

  await page.keyboard.press('Escape');
  await expect(confirmation).toBeHidden();
  await upgrade.click();
  await expect(confirmation).toBeVisible();

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(details).toContainText('移动速度 1.95 格/秒（原始 1500 fine/100ms） → 2.28 格/秒（原始 1750 fine/100ms）');
  await expect(details).toContainText('基础伤害');
  await expect(details).toContainText('实际扣血');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  await page.getByRole('button', { name: 'Cancel upgrade' }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByTestId('wave-status')).toContainText('Cash $25');
  await upgrade.click();
  await page.getByRole('button', { name: 'Confirm upgrade' }).click();
  await expect(page.getByTestId('wave-status')).toContainText('Cash $0');
  await expect(page.getByTestId('upgrade-status')).toContainText('upgraded to level 1 for $25');
  await expect(page.getByTestId('upgrade-unit')).toBeHidden();

  await page.getByRole('button', { name: 'Return to Cow Gulch sample' }).click();
  await expect(page.getByTestId('scene-context')).toHaveText('PROGRESS SAMPLE');
  await expect(page.getByTestId('upgrade-sample-status')).toContainText('upgrade limit of 0');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
});

test('upgrades a selected unit with touch on a phone-sized viewport', async ({ browser }) => {
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
    await openSingleWaveSample(page, 'tap');
    await page.getByRole('button', { name: 'Open upgrade rules sample' }).tap();
    const canvas = page.getByTestId('game-canvas');
    await canvas.scrollIntoViewIfNeeded();
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Game canvas has no layout box');
    await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const upgrade = page.getByRole('button', { name: 'Upgrade Gunslinger · $25' });
    await expect(upgrade).toBeVisible();
    await upgrade.tap();
    const confirmation = page.getByTestId('upgrade-confirmation');
    await expect(confirmation).toBeVisible();
    await expectInteractiveGameOverlay(page, 'upgrade', 'upgrade-confirmation', '[data-action="cancel-upgrade"]');
    const detailsMetrics = await page.getByTestId('upgrade-confirmation-details').evaluate((element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return {
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        clientWidth: element.clientWidth,
        bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        overflow: style.overflow,
        text: element.textContent,
      };
    });
    expect(detailsMetrics.scrollHeight, JSON.stringify(detailsMetrics)).toBeLessThanOrEqual(detailsMetrics.clientHeight);
    await page.getByRole('button', { name: 'Confirm upgrade' }).tap();
    await expect(page.getByTestId('wave-status')).toContainText('Cash $0');
    await expect(page.getByTestId('upgrade-status')).toContainText('upgraded to level 1 for $25');
  } finally {
    await context.close();
  }
});
