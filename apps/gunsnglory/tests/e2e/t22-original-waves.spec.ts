import { expect, test } from '@playwright/test';
import { clickCanvasPoint, cowGulchMarkerPoint } from './helpers';

test('completes official Cow Gulch level one and restores only settled campaign progress', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install({ time: new Date('2026-10-29T00:00:00Z') });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.locator('.scene-caption')).toHaveText('The Cow Gulch battle has eight playable waves and settles after wave eight.');
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');

  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await expect(page.getByTestId('campaign-stage-button-1')).toBeEnabled();
  await expect(page.getByTestId('campaign-next-level-status')).toContainText(/locked/i);
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

  await clickCanvasPoint(page, cowGulchMarkerPoint(5, 4));
  const mapHire = page.getByTestId('hire-map-unit');
  await expect(mapHire).toHaveText('Hire map Gunslinger · $75');
  await expect(mapHire).toBeEnabled();
  await mapHire.click();
  await expect(page.getByTestId('map-hire-status')).toHaveText('Gunslinger hired from the map for $75.');
  await clickCanvasPoint(page, cowGulchMarkerPoint(5, 4));
  await expect(page.getByTestId('selection-status')).toContainText('Gunslinger selected');

  await page.clock.runFor(8 * 60_000);
  await expect(waveStatus).toContainText('Wave 8/8 complete');
  await expect(page.getByTestId('settlement')).toBeVisible();
  await expect(page.getByTestId('settlement-outcome')).toHaveText('Victory');
  await expect(page.getByTestId('settlement-summary')).toContainText('Wave 8');
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Result saved to this browser.');
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('1/1 stages complete');
  await expect(page.getByTestId('campaign-stage-button-1')).toBeEnabled();
  await expect(page.getByTestId('campaign-stage-button-2')).toBeDisabled();
  await expect(page.getByTestId('campaign-next-level-status')).toContainText(/unlocked/i);

  const profile = await page.evaluate(async () => new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readonly');
      const read = transaction.objectStore('profiles').get('default');
      read.onsuccess = () => resolve(read.result as Record<string, unknown>);
      read.onerror = () => reject(read.error);
      transaction.oncomplete = () => database.close();
    };
  }));
  expect(profile.schemaVersion).toBe(2);
  expect(profile.completedScenarios).toEqual(['campaign-new-mexico-01']);
  expect(profile.highScores).toHaveProperty('campaign-new-mexico-01');
  expect((profile.appliedSettlementIds as string[])).toHaveLength(1);

  await page.reload();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50 ·');
  await expect(page.getByTestId('wave-status')).not.toContainText('ready');
  await expect(page.getByTestId('settlement')).toBeHidden();
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('1/1 stages complete');
  await expect(page.getByTestId('campaign-stage-list')).toContainText('Completed');
  await expect(page.getByTestId('campaign-next-level-status')).toContainText(/unlocked/i);
});
