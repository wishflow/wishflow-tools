import { expect, test } from '@playwright/test';
import { openSingleWaveSample } from './helpers';

async function clickMapCenter(page: import('@playwright/test').Page): Promise<void> {
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

test('keeps the original level locked and upgrades the selected Gunslinger in the debug rules sample', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
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
  await expect(details).toContainText('Level 0 → 1');
  await expect(details).toContainText('Speed 1500 → 1750');
  await expect(details).toContainText('Damage 140 → 140');
  await expect(details).toContainText('Range 38400 → 38400 fine units');
  await expect(details).toContainText('Reload 500 → 400 ms');
  await expect(details).toContainText('Special reload 1500 → 1250 ms');
  await expect(details).toContainText('Price $25 · Cash $25');

  await page.getByRole('button', { name: 'Cancel upgrade' }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByTestId('wave-status')).toContainText('Cash $25');
  await upgrade.click();
  await page.getByRole('button', { name: 'Confirm upgrade' }).click();
  await expect(page.getByTestId('wave-status')).toContainText('Cash $0');
  await expect(page.getByTestId('upgrade-status')).toContainText('upgraded to level 1 for $25');
  await expect(page.getByTestId('upgrade-unit')).toBeHidden();

  await page.getByRole('button', { name: 'Return to Cow Gulch sample' }).click();
  await expect(page.getByTestId('scene-context')).toHaveText('NEW MEXICO · 01');
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
  try {
    await page.goto('/');
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
    await expect(page.getByTestId('upgrade-confirmation')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm upgrade' }).tap();
    await expect(page.getByTestId('wave-status')).toContainText('Cash $0');
    await expect(page.getByTestId('upgrade-status')).toContainText('upgraded to level 1 for $25');
  } finally {
    await context.close();
  }
});
