import { expect, test } from '@playwright/test';
import { openSingleWaveSample } from './helpers';

test('scales the map by width and clips drawing at map and playfield edges', async ({ page }) => {
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

  const playfieldHash = () => canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    const pixels = context.getImageData(0, 0, canvasElement.width, canvasElement.height).data;
    let hash = 2166136261;
    for (let index = 0; index < pixels.length; index += 16) hash = Math.imul(hash ^ pixels[index]!, 16777619);
    return hash >>> 0;
  });

  await page.waitForTimeout(500);
  const mapEdgePixels = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    const pixelScale = canvasElement.width / 1024;
    const sample = (x: number) => [...context.getImageData(Math.round(x * pixelScale), Math.round(300 * pixelScale), 1, 1).data];
    return { outsideLeft: sample(0), insideLeft: sample(10), insideRight: sample(1018), outsideRight: sample(1023) };
  });
  expect(mapEdgePixels.outsideLeft).toEqual([26, 23, 18, 255]);
  expect(mapEdgePixels.insideLeft).not.toEqual([26, 23, 18, 255]);
  expect(mapEdgePixels.insideRight).not.toEqual([26, 23, 18, 255]);
  expect(mapEdgePixels.outsideRight).toEqual([26, 23, 18, 255]);
  const beforePioneerMoves = await playfieldHash();
  await page.waitForTimeout(800);
  const afterPioneerMoves = await playfieldHash();
  expect(afterPioneerMoves).not.toBe(beforePioneerMoves);
});

test('loads legacy profile settings, saves the selected speed to IndexedDB, and restores it after reload', async ({ page }) => {
  await page.goto('/');
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  const soundToggle = page.getByTestId('sound-toggle');
  const settingsStatus = page.getByTestId('settings-status');
  await expect(speed).toBeEnabled();
  await expect(speed).toHaveValue('1');
  await expect(soundToggle).toHaveText('Sound: On');

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
  await expect(soundToggle).toHaveText('Sound: Off');
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
  expect(savedProfile.lastOperationId as string).toMatch(/^settings:\d+:2\.25:easy:false$/);
  expect(typeof savedProfile.lastRequestDigest).toBe('string');
  expect((savedProfile.lastRequestDigest as string).length).toBeGreaterThan(0);

  await soundToggle.click();
  await expect(soundToggle).toHaveText('Sound: On');
  await expect(soundToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(settingsStatus).toContainText('saved');
  await page.reload();
  await expect(page.getByRole('slider', { name: 'Simulation speed' })).toHaveValue('2.25');
  await expect(page.getByTestId('sound-toggle')).toHaveText('Sound: On');
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
  await page.addInitScript(() => {
    Object.assign(window, { __soundPlayCount: 0 });
    HTMLMediaElement.prototype.play = function () {
      const testWindow = window as unknown as Window & { __soundPlayCount: number };
      testWindow.__soundPlayCount += 1;
      return Promise.resolve();
    };
  });
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
  const soundPlayCount = await page.evaluate(() =>
    (window as unknown as Window & { __soundPlayCount: number }).__soundPlayCount);
  expect(soundPlayCount).toBeGreaterThan(0);
});

test('reports blocked audio and retries from an accessible bilingual recovery action', async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as Window & {
      __allowSoundPlayback?: boolean;
      __soundPlayAttempts?: number;
      __soundElements?: HTMLAudioElement[];
    };
    testWindow.__allowSoundPlayback = false;
    testWindow.__soundPlayAttempts = 0;
    testWindow.__soundElements = [];
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      constructor(source?: string) {
        super(source);
        testWindow.__soundElements?.push(this);
      }
    };
    HTMLMediaElement.prototype.play = function () {
      testWindow.__soundPlayAttempts = (testWindow.__soundPlayAttempts ?? 0) + 1;
      return testWindow.__allowSoundPlayback
        ? Promise.resolve()
        : Promise.reject(new DOMException('Playback requires a user gesture', 'NotAllowedError'));
    };
  });
  await page.goto('/');
  await openSingleWaveSample(page);
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();

  const playbackStatus = page.getByTestId('sound-playback-status');
  await expect(playbackStatus).toHaveText('Sound could not be played. You can continue silently or retry playback.');
  const retrySound = page.getByTestId('retry-sound-playback');
  await expect(retrySound).toBeVisible();
  const attemptsBeforeRetry = await page.evaluate(() =>
    (window as Window & { __soundPlayAttempts?: number }).__soundPlayAttempts ?? 0);
  expect(attemptsBeforeRetry).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(playbackStatus).toHaveText('音效无法播放。你可以继续静音游玩，或重试播放。');
  await expect(retrySound).toHaveText('重试播放音效');

  await page.evaluate(() => {
    (window as Window & { __allowSoundPlayback?: boolean }).__allowSoundPlayback = true;
  });
  await retrySound.click();
  await expect(playbackStatus).toBeHidden();
  const attemptsAfterRetry = await page.evaluate(() =>
    (window as Window & { __soundPlayAttempts?: number }).__soundPlayAttempts ?? 0);
  expect(attemptsAfterRetry).toBeGreaterThan(attemptsBeforeRetry);

  await page.evaluate(() => {
    const state = window as Window & { __soundElements?: HTMLAudioElement[] };
    state.__soundElements?.[0]?.dispatchEvent(new Event('error'));
  });
  await expect(playbackStatus).toHaveText('音效无法播放。你可以继续静音游玩，或重试播放。');
  await retrySound.click();
  await expect(playbackStatus).toBeHidden();
});

test('does not play real combat sound events while the saved sound setting is muted', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { __soundPlayCount: 0 });
    HTMLMediaElement.prototype.play = function () {
      const testWindow = window as unknown as Window & { __soundPlayCount: number };
      testWindow.__soundPlayCount += 1;
      return Promise.resolve();
    };
  });
  await page.goto('/');
  await openSingleWaveSample(page);
  const soundToggle = page.getByTestId('sound-toggle');
  await soundToggle.click();
  await expect(soundToggle).toHaveText('Sound: Off');
  await expect(page.getByTestId('settings-status')).toContainText('saved');

  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1 complete · Lives 50 · Escaped 0 · Defeated 1 · Cash $66', { timeout: 15000 });
  const soundPlayCount = await page.evaluate(() =>
    (window as unknown as Window & { __soundPlayCount: number }).__soundPlayCount);
  expect(soundPlayCount).toBe(0);
});
