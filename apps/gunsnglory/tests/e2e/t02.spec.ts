import { expect, test } from '@playwright/test';
import { openSingleWaveSample } from './helpers';

test('keeps the full map visible and clips the pioneer until it enters the map bounds', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await openSingleWaveSample(page);
  const canvas = page.getByTestId('game-canvas');
  const waveStatus = page.getByTestId('wave-status');
  await expect(canvas).toBeVisible();
  await expect(waveStatus).toContainText('Wave 1 ready · Lives 50');

  const simulationSpeed = page.getByRole('slider', { name: 'Simulation speed' });
  await simulationSpeed.focus();
  await simulationSpeed.press('End');
  await expect(simulationSpeed).toHaveValue('4');
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(waveStatus).toContainText('Wave 1 · Lives 50 · Enemies 1');

  const leftViewportPixels = () => canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    const pixels = context.getImageData(200, 300, 150, 100).data;
    let hash = 2166136261;
    for (const channel of pixels) hash = Math.imul(hash ^ channel, 16777619);
    return hash >>> 0;
  });

  await page.waitForTimeout(500);
  const offMapSpawnPixels = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    const pixels = context.getImageData(210, 324, 20, 32).data;
    let nonBackgroundPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] !== 26 || pixels[index + 1] !== 23 || pixels[index + 2] !== 18) {
        nonBackgroundPixels += 1;
      }
    }
    return nonBackgroundPixels;
  });
  expect(offMapSpawnPixels).toBe(0);
  const beforePioneerEnters = await leftViewportPixels();
  await page.waitForTimeout(800);
  const afterPioneerEnters = await leftViewportPixels();
  expect(afterPioneerEnters).not.toBe(beforePioneerEnters);
});

test('loads legacy profile settings, saves the selected speed to IndexedDB, and restores it after reload', async ({ page }) => {
  await page.goto('/');
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  const settingsStatus = page.getByTestId('settings-status');
  await expect(speed).toBeEnabled();
  await expect(speed).toHaveValue('1');

  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('gunsnglory-profile', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('profiles', 'readwrite');
        transaction.objectStore('profiles').put({
          id: 'default',
          schemaVersion: 1,
          settings: { soundEnabled: false },
        });
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      };
    });
  });

  await page.reload();
  await expect(speed).toBeEnabled();
  await expect(speed).toHaveValue('1');
  await speed.focus();
  for (let index = 0; index < 5; index += 1) await speed.press('ArrowRight');
  await expect(speed).toHaveValue('2.25');
  await expect(page.getByTestId('simulation-speed-value')).toHaveText('2.25×');
  await expect(settingsStatus).toContainText('saved');

  const savedProfile = await page.evaluate(async () => new Promise<Record<string, unknown>>((resolve, reject) => {
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
  expect(savedProfile).toMatchObject({
    id: 'default',
    schemaVersion: 2,
    settings: { soundEnabled: false, simulationSpeed: 2.25, difficulty: 'easy' },
    completedScenarios: [],
    highScores: {},
    appliedSettlementIds: [],
  });
  expect(savedProfile.revision as number).toBeGreaterThan(0);
  expect(savedProfile.lastOperationId as string).toMatch(/^settings:\d+:2\.25:easy$/);
  expect(typeof savedProfile.lastRequestDigest).toBe('string');
  expect((savedProfile.lastRequestDigest as string).length).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByRole('slider', { name: 'Simulation speed' })).toHaveValue('2.25');
});

test('does not let a previous settings save overwrite a newer slider choice', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { __delayedSettingsWriteCompletions: 0 });
    const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete');
    if (!descriptor?.get || !descriptor.set) throw new Error('IndexedDB transaction event hooks are unavailable');
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get() { return descriptor.get!.call(this); },
      set(handler: ((event: Event) => void) | null) {
        const delayed = this.mode === 'readwrite' && typeof handler === 'function'
          ? (event: Event) => window.setTimeout(() => {
            const state = window as Window & { __delayedSettingsWriteCompletions?: number };
            state.__delayedSettingsWriteCompletions = (state.__delayedSettingsWriteCompletions ?? 0) + 1;
            handler.call(this, event);
          }, 700)
          : handler;
        descriptor.set!.call(this, delayed);
      },
    });
  });
  await page.goto('/');
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await expect(speed).toBeEnabled();

  await speed.focus();
  await speed.press('ArrowRight');
  await speed.evaluate((input) => {
    (input as HTMLInputElement).value = '2.25';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() =>
    (window as Window & { __delayedSettingsWriteCompletions?: number }).__delayedSettingsWriteCompletions === 1);
  await expect(speed).toHaveValue('2.25');
  await expect(page.getByTestId('simulation-speed-value')).toHaveText('2.25×');
  await speed.evaluate((input) => input.dispatchEvent(new Event('change', { bubbles: true })));
  await expect(page.getByTestId('settings-status')).toContainText('saved', { timeout: 3000 });

  const storedSpeed = await page.evaluate(async () => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readonly');
      const read = transaction.objectStore('profiles').get('default');
      read.onsuccess = () => resolve(read.result.settings.simulationSpeed as number);
      read.onerror = () => reject(read.error);
      transaction.oncomplete = () => database.close();
    };
  }));
  expect(storedSpeed).toBe(2.25);
});

test('preserves malformed IndexedDB settings when a user tries to save a new speed', async ({ page }) => {
  await page.goto('/');
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  const settingsStatus = page.getByTestId('settings-status');

  for (const settings of [null, { simulationSpeed: 1.1 }]) {
    await page.evaluate(async (savedSettings) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('gunsnglory-profile', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('profiles', 'readwrite');
          transaction.objectStore('profiles').put({
            id: 'default', schemaVersion: 1, settings: savedSettings,
          });
          transaction.oncomplete = () => { database.close(); resolve(); };
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        };
      });
    }, settings);
    await page.reload();
    await expect(speed).toBeEnabled();
    await expect(settingsStatus).toContainText('could not be loaded');
    await speed.focus();
    await speed.press('ArrowRight');
    await expect(settingsStatus).toContainText('could not be saved');

    const savedSettings = await page.evaluate(async () => new Promise<unknown>((resolve, reject) => {
      const request = indexedDB.open('gunsnglory-profile', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('profiles', 'readonly');
        const read = transaction.objectStore('profiles').get('default');
        read.onsuccess = () => resolve(read.result.settings);
        read.onerror = () => reject(read.error);
        transaction.oncomplete = () => database.close();
      };
    }));
    expect(savedSettings).toEqual(settings);
  }
});

test('applies the selected speed to an active combat wave', async ({ page }) => {
  const startedAt = Date.now();
  await page.goto('/');
  await openSingleWaveSample(page);
  const waveStatus = page.getByTestId('wave-status');
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await expect(speed).toBeEnabled();

  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(waveStatus).toContainText('Wave 1 · Lives 50 · Enemies 1');
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');
  await expect(waveStatus).toContainText('Wave 1 complete · Lives 50 · Escaped 0 · Defeated 1 · Cash $66', { timeout: 10000 });
  expect(Date.now() - startedAt).toBeLessThan(10000);
});

test('starts the preview wave from a mobile touch control', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await openSingleWaveSample(page, 'tap');
  const waveStatus = page.getByTestId('wave-status');
  await expect(page.getByRole('slider', { name: 'Simulation speed' })).toBeVisible();
  await expect(waveStatus).toContainText('Wave 1 ready · Lives 50');
  await page.getByRole('button', { name: 'Start one pioneer sample' }).tap();
  await expect(waveStatus).toContainText('Wave 1 · Lives 50 · Enemies 1');
  await context.close();
});

test('keeps defeat feedback when accelerated time is processed in multiple game steps', async ({ page }) => {
  await page.goto('/');
  await openSingleWaveSample(page);
  const waveStatus = page.getByTestId('wave-status');
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(waveStatus).toContainText('Wave 1 · Lives 50 · Enemies 1');

  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const deadline = performance.now() + 3000;
    while (performance.now() < deadline) { /* force one delayed animation frame */ }
  });

  await expect(waveStatus).toContainText('Wave 1 complete · Lives 50 · Escaped 0 · Defeated 1 · Cash $66');
  await expect(page.getByTestId('combat-status')).toContainText('Pioneer defeated · +$1');
});

test('the Cow Gulch gunslinger kills the pioneer and updates the cash display', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/');
  await openSingleWaveSample(page);
  const waveStatus = page.getByTestId('wave-status');
  const combatStatus = page.getByTestId('combat-status');
  await expect(waveStatus).toContainText('Cash $65');

  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(waveStatus).toContainText('Enemies 1');
  await expect(combatStatus).toContainText('Pioneer defeated · +$1', { timeout: 30000 });
  await expect(waveStatus).toContainText('Defeated 1');
  await expect(waveStatus).toContainText('Cash $66');
  await expect(waveStatus).toContainText('Wave 1 complete');
});
