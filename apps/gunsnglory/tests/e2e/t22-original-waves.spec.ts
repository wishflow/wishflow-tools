import { expect, test } from '@playwright/test';

test('plays the first three original waves, earns cash, and hires a map Gunslinger', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');

  await page.getByTestId('open-original-waves').click();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Original waves 1–3');
  const waveStatus = page.getByTestId('wave-status');
  await expect(waveStatus).toContainText('Wave 1/8 ready · Lives 50 · Cash $65');
  const revolverAudioRequest = page.waitForRequest(
    (request) => new URL(request.url()).pathname.endsWith('/assets/sounds/sound_revolver.ogg'),
    { timeout: 15_000 },
  );
  await page.getByRole('button', { name: 'Start wave 1 of 8' }).click();
  await revolverAudioRequest;
  await expect(waveStatus).toContainText('Wave 1/8 · Lives 50');
  await expect.poll(async () => {
    const value = (await waveStatus.innerText()).match(/Cash \$(\d+)/)?.[1];
    return Number(value ?? 0);
  }, { timeout: 20_000 }).toBeGreaterThanOrEqual(75);

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

  await expect(waveStatus).toContainText('Wave 2/8 ready', { timeout: 30_000 });
  await expect(waveStatus).toContainText(/Cash \$6$/);
  await page.getByRole('button', { name: 'Start wave 2 of 8' }).click();
  await expect(waveStatus).toContainText('Wave 2/8 · Lives');
  await expect(waveStatus).toContainText('Wave 3/8 ready', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Start wave 3 of 8' }).click();
  await expect(waveStatus).toContainText(/Wave 3\/8 · Lives \d+ · Enemies [1-9]\d*/, { timeout: 15_000 });
});
