import { expect, test } from '@playwright/test';

test('automatically plays the complete original eight-wave campaign at 4×', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install({ time: new Date('2026-10-29T00:00:00Z') });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.locator('.scene-caption')).toHaveText('The Cow Gulch battle has eight playable waves and settles after wave eight.');
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');

  await page.getByTestId('open-original-waves').click();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Original waves 1–8');
  const waveStatus = page.getByTestId('wave-status');
  await expect(waveStatus).toContainText('Wave 1/8');
  await expect(waveStatus).not.toContainText('ready');
  await expect(page.getByRole('button', { name: /^Start wave/ })).toBeHidden();

  // Emulate the engine's 100 ms frame ceiling; the selected 4× speed still uses the production accumulator.
  await page.evaluate(() => {
    let timestamp = 0;
    window.requestAnimationFrame = (callback) => window.setTimeout(() => {
      timestamp += 100;
      callback(timestamp);
    }, 100);
    window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);
  });
  await page.clock.runFor(60_000);
  await expect(waveStatus).toContainText(/Wave [2-8]\/8 · Lives/);
  const cash = Number((await waveStatus.innerText()).match(/Cash \$(\d+)/)?.[1] ?? 0);
  expect(cash).toBeGreaterThanOrEqual(75);

  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  await page.mouse.click(bounds.x + bounds.width * 446 / 1024, bounds.y + bounds.height * 49 / 576);
  const mapHire = page.getByTestId('hire-map-unit');
  await expect(mapHire).toHaveText('Hire map Gunslinger · $75');
  await expect(mapHire).toBeEnabled();
  await mapHire.click();
  await expect(page.getByTestId('map-hire-status')).toHaveText('Gunslinger hired from the map for $75.');
  await page.mouse.click(bounds.x + bounds.width * 446 / 1024, bounds.y + bounds.height * 49 / 576);
  await expect(page.getByTestId('selection-status')).toContainText('Gunslinger selected');

  await page.clock.runFor(8 * 60_000);
  await expect(waveStatus).toContainText('Wave 8/8 complete');
  await expect(page.getByTestId('settlement')).toBeVisible();
  await expect(page.getByTestId('settlement-outcome')).toHaveText('Victory');
  await expect(page.getByTestId('settlement-summary')).toContainText('Wave 8');
});
