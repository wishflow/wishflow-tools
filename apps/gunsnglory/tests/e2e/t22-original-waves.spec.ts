import { expect, test } from './auto-continue-fixtures';

test('official Cow Gulch defeat saves a result without unlocking the next stage', async ({ page }) => {
  test.setTimeout(180_000);
  await page.clock.install({ time: new Date('2026-10-29T00:00:00Z') });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    Object.assign(window, { __musicTracks: [] as string[] });
    HTMLMediaElement.prototype.play = function () {
      const path = new URL((this as HTMLAudioElement).src).pathname;
      if (path.includes('/assets/music/')) {
        (window as unknown as Window & { __musicTracks: string[] }).__musicTracks.push(path.split('/').pop() ?? '');
      }
      return Promise.resolve();
    };

    const originalGetRandomValues = crypto.getRandomValues.bind(crypto);
    let provideCampaignSeed = true;
    crypto.getRandomValues = ((array: Uint32Array<ArrayBuffer>) => {
      if (provideCampaignSeed && array instanceof Uint32Array && array.length === 1) {
        array[0] = 42;
        provideCampaignSeed = false;
        return array;
      }
      return originalGetRandomValues(array) as typeof array;
    }) as typeof crypto.getRandomValues;
  });
  await page.goto('/');

  const playedMusic = () => page.evaluate(() =>
    (window as unknown as Window & { __musicTracks: string[] }).__musicTracks);
  await expect.poll(playedMusic).toContain('music_loop1.ogg');
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');
  await expect(page.getByTestId('campaign-stage-button-1')).toBeEnabled();
  await expect(page.getByTestId('campaign-stage-button-2')).toBeDisabled();
  await expect(page.getByTestId('campaign-next-level-status')).toContainText(/locked/i);
  const waveStatus = page.getByTestId('wave-status');
  await expect(waveStatus).toContainText('Wave 1/8');
  await expect(waveStatus).toContainText('Cash $65');

  // Emulate the engine's 100 ms frame ceiling while using the production 4× accumulator.
  await page.evaluate(() => {
    let timestamp = 0;
    window.requestAnimationFrame = (callback) => window.setTimeout(() => {
      timestamp += 100;
      callback(timestamp);
    }, 100);
    window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);
  });
  // The source-faithful run now removes each enemy at its actual map boundary.
  // At 4× the fixed-seed no-input campaign needs just over four minutes of
  // simulated time to settle, so advance 100 seconds of browser time.
  await page.clock.runFor(100_000);

  await expect(page.getByTestId('settlement')).toBeVisible();
  await expect(page.getByTestId('settlement-outcome')).toHaveText('Defeat');
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Result saved to this browser.');
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('0/1 stages complete');
  await expect(page.getByTestId('campaign-stage-button-1')).toBeEnabled();
  await expect(page.getByTestId('campaign-stage-button-2')).toBeDisabled();
  await expect(page.getByTestId('campaign-next-level-status')).toContainText(/locked/i);

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
  expect(profile.completedScenarios).toEqual([]);
  expect(profile.highScores).toHaveProperty('campaign-new-mexico-01');
  expect((profile.appliedSettlementIds as string[])).toHaveLength(1);

  await page.reload();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50 ·');
  await expect(page.getByTestId('settlement')).toBeHidden();
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('0/1 stages complete');
  await expect(page.getByTestId('campaign-next-level-status')).toContainText(/locked/i);
});
