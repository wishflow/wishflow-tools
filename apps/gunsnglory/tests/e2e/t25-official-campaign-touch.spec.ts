import { expect, test } from './auto-continue-fixtures';
import { cowGulchMarkerPoint, tapCanvasPoint } from './helpers';

async function screenPointForCanvasPoint(
  page: import('@playwright/test').Page,
  point: { x: number; y: number },
): Promise<{ x: number; y: number }> {
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  return {
    x: bounds.x + (point.x / 1024) * bounds.width,
    y: bounds.y + (point.y / 576) * bounds.height,
  };
}

function readCash(text: string): number {
  const cash = Number(text.match(/Cash \$(\d+)/)?.[1]);
  if (!Number.isSafeInteger(cash)) throw new Error(`Cash is not visible in wave status: ${text}`);
  return cash;
}

function readLives(text: string): number {
  const lives = Number(text.match(/Lives (\d+)/)?.[1]);
  if (!Number.isSafeInteger(lives)) throw new Error(`Life count is not visible in wave status: ${text}`);
  return lives;
}

async function readProfile(page: import('@playwright/test').Page): Promise<Record<string, unknown>> {
  return page.evaluate(async () => new Promise<Record<string, unknown>>((resolve, reject) => {
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
}

async function installSeed42(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
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
}

test('touch completes the official Cow Gulch level through real movement and naturally earned recruitment', async ({ browser }) => {
  test.setTimeout(180_000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-10-29T00:00:00Z') });
  await installSeed42(page);
  try {
    await page.goto('/?testBattle=1');
    await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
    const intro = page.getByTestId('campaign-wave-intro');
    await expect(intro).toHaveAttribute('data-wave-number', '1');
    await intro.getByRole('button', { name: 'Continue', exact: true }).click();

    const speed = page.getByRole('slider', { name: 'Simulation speed' });
    await speed.focus();
    await speed.press('End');
    await expect(speed).toHaveValue('4');

    await page.evaluate(() => {
      let timestamp = 0;
      window.requestAnimationFrame = (callback) => window.setTimeout(() => {
        timestamp += 100;
        callback(timestamp);
      }, 100);
      window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);
    });
    const waveStatus = page.getByTestId('wave-status');
    await expect(waveStatus).toContainText('Wave 1/8');
    await expect(waveStatus).toContainText('Cash $65');

    const canvas = page.getByTestId('game-canvas');
    await canvas.scrollIntoViewIfNeeded();
    const cdp = await context.newCDPSession(page);
    const start = await screenPointForCanvasPoint(page, cowGulchMarkerPoint(8, 8));
    const target = await screenPointForCanvasPoint(page, cowGulchMarkerPoint(8, 10));
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: start.x, y: start.y, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: target.x, y: target.y, id: 1 }],
    });
    // Keep the finger down while the selected unit walks to its commanded cell.
    await page.clock.runFor(2_000);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByTestId('selection-status')).toContainText('Gunslinger selected · Cell (9, 10)');
    await cdp.detach();

    await tapCanvasPoint(page, cowGulchMarkerPoint(3, 6));
    const hireDialog = page.getByTestId('map-hire-confirmation');
    const confirmHire = page.getByTestId('confirm-map-hire');
    await expect(hireDialog).toBeVisible();
    await expect(confirmHire).toBeHidden();
    await expect(page.getByTestId('map-hire-confirmation-details')).toContainText('Not enough cash');
    await expect(page.getByTestId('selection-status')).toContainText('Gunslinger is waiting to be hired · Cell (4, 7)');

    let lastIntroWave = 1;
    for (let step = 0; step < 80 && readCash(await waveStatus.innerText()) < 75; step += 1) {
      await page.clock.runFor(500);
      if (await intro.isVisible()) {
        const introWave = Number(await intro.getAttribute('data-wave-number'));
        expect(introWave).toBe(lastIntroWave + 1);
        lastIntroWave = introWave;
        await intro.getByRole('button', { name: 'Continue', exact: true }).click();
      }
    }
    await expect(confirmHire).toBeVisible();
    await expect(confirmHire).toBeEnabled();
    const cashBeforeHire = readCash(await waveStatus.innerText());
    expect(cashBeforeHire).toBeGreaterThanOrEqual(75);
    await confirmHire.click();
    await expect(page.getByTestId('map-hire-status')).toHaveText('Gunslinger hired from the map for $75.');
    // Combat can award a $1 bounty while the click is committed; the game test
    // checks the exact $75 debit without concurrent simulation steps.
    expect(readCash(await waveStatus.innerText())).toBeLessThan(cashBeforeHire);

    const settlement = page.getByTestId('settlement');
    for (let attempt = 0; attempt < 20 && !(await settlement.isVisible()); attempt += 1) {
      await page.clock.runFor(45_000);
      if (await intro.isVisible()) {
        const introWave = Number(await intro.getAttribute('data-wave-number'));
        expect(introWave).toBe(lastIntroWave + 1);
        lastIntroWave = introWave;
        await expect(waveStatus).toContainText(`Wave ${introWave}/8`);
        await intro.getByRole('button', { name: 'Continue', exact: true }).click();
      }
    }

    await expect(settlement).toBeVisible();
    expect(lastIntroWave).toBe(8);
    await expect(page.getByTestId('settlement-outcome')).toHaveText('Victory');
    await expect(waveStatus).toContainText('Wave 8/8');
    expect(readLives(await waveStatus.innerText())).toBeGreaterThan(0);
    await expect(page.getByTestId('campaign-progress-summary')).toHaveText('1/9 stages complete');
    await expect(page.getByTestId('campaign-stage-button-2')).toBeEnabled();
    await expect(page.getByTestId('settlement-save-status')).toHaveText('Result saved to this browser.');

    const profile = await readProfile(page);
    expect(profile.completedScenarios).toEqual(['campaign-new-mexico-01']);
    expect(profile.appliedSettlementIds).toHaveLength(1);
    expect((profile.highScores as Record<string, number>)['campaign-new-mexico-01']).toBeGreaterThan(0);

    await page.reload();
    await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
    await expect(page.getByTestId('campaign-progress-summary')).toHaveText('1/9 stages complete');
    await expect(page.getByTestId('campaign-stage-button-2')).toBeEnabled();
    await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');
    await expect(page.getByTestId('settlement')).toBeHidden();
    expect(await readProfile(page)).toEqual(profile);
  } finally {
    await context.close();
  }
});

test('reloads an unfinished official Cow Gulch battle from wave one without saving progress', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-29T00:00:00Z') });
  await installSeed42(page);
  await page.goto('/?testBattle=1');

  const intro = page.getByTestId('campaign-wave-intro');
  await expect(intro).toBeHidden();
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');
  await expect(page.getByTestId('settings-status')).toContainText('saved');

  const waveStatus = page.getByTestId('wave-status');
  await page.clock.runFor(5_000);
  await expect(waveStatus).toContainText('Wave 1/8');
  await expect(waveStatus).not.toContainText('ready');
  expect(readCash(await waveStatus.innerText())).toBeGreaterThan(65);
  await expect(page.getByTestId('settlement')).toBeHidden();

  const profileBeforeReload = await readProfile(page);
  expect(profileBeforeReload.completedScenarios).toEqual([]);
  expect(profileBeforeReload.appliedSettlementIds).toEqual([]);

  await page.reload();
  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('0/9 stages complete');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8 · Lives 50');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
  await expect(page.getByTestId('settlement')).toBeHidden();
  expect(await readProfile(page)).toEqual(profileBeforeReload);
});
