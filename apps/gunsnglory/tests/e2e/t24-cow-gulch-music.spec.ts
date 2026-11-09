import { expect, test } from '@playwright/test';
import { pauseFromHud, setPauseBoardSound } from './helpers';

test('plays Cow Gulch music, follows sound and visibility settings, and retries browser autoplay', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as Window & {
      __allowBackgroundMusic: boolean;
      __musicCalls: Array<{ action: 'play' | 'pause'; file: string; loop: boolean }>;
      __setDocumentHidden: (hidden: boolean) => void;
    };
    state.__allowBackgroundMusic = false;
    state.__musicCalls = [];
    state.__setDocumentHidden = (hidden) => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    };
    HTMLMediaElement.prototype.play = function () {
      const audio = this as HTMLAudioElement;
      const path = new URL(audio.src).pathname;
      if (!path.includes('/assets/music/')) return Promise.resolve();
      const state = window as unknown as Window & {
        __allowBackgroundMusic: boolean;
        __musicCalls: Array<{ action: 'play' | 'pause'; file: string; loop: boolean }>;
      };
      state.__musicCalls.push({ action: 'play', file: path.split('/').pop() ?? '', loop: audio.loop });
      return state.__allowBackgroundMusic
        ? Promise.resolve()
        : Promise.reject(new Error('background audio requires a user gesture'));
    };
    HTMLMediaElement.prototype.pause = function () {
      const audio = this as HTMLAudioElement;
      const path = new URL(audio.src).pathname;
      if (!path.includes('/assets/music/')) return;
      const state = window as unknown as Window & {
        __allowBackgroundMusic: boolean;
        __musicCalls: Array<{ action: 'play' | 'pause'; file: string; loop: boolean }>;
      };
      state.__musicCalls.push({ action: 'pause', file: path.split('/').pop() ?? '', loop: audio.loop });
    };
  });
  await page.goto('/?testBattle=1');

  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  const tracks = ['music_loop1', 'music_loop2', 'music_loop3', 'music_loop4', 'music_level_won'];
  const statuses = await page.evaluate(async (names) => Promise.all(names.map(async (name) => {
    const response = await fetch(`/assets/music/${name}.ogg`);
    return response.status;
  })), tracks);
  expect(statuses).toEqual([200, 200, 200, 200, 200]);

  const musicCalls = () => page.evaluate(() =>
    (window as unknown as Window & { __musicCalls: Array<{ action: string; file: string; loop: boolean }> }).__musicCalls);
  await expect.poll(async () => (await musicCalls()).some(({ action, file, loop }) =>
    action === 'play' && file === 'music_loop1.ogg' && loop)).toBe(true);
  await expect(page.getByTestId('sound-playback-status')).toBeVisible();

  await page.evaluate(() => {
    (window as unknown as Window & { __allowBackgroundMusic: boolean }).__allowBackgroundMusic = true;
  });
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('sound-playback-status')).toBeHidden();
  await expect(page.getByTestId('campaign-wave-intro')).toBeHidden();

  await setPauseBoardSound(page, false);
  await expect.poll(async () => (await musicCalls()).some(({ action, file }) =>
    action === 'pause' && file === 'music_loop1.ogg')).toBe(true);
  await setPauseBoardSound(page, true);
  await expect.poll(async () => (await musicCalls()).filter(({ action, file }) =>
    action === 'play' && file === 'music_loop1.ogg').length).toBeGreaterThanOrEqual(2);

  const callsBeforeBackgrounding = await musicCalls();
  const activeTrack = callsBeforeBackgrounding.slice().reverse().find(({ action }) => action === 'play')?.file;
  if (!activeTrack) throw new Error('Cow Gulch has no active background music track');
  const playCountBeforeBackgrounding = callsBeforeBackgrounding.filter(({ action, file }) =>
    action === 'play' && file === activeTrack).length;
  await page.evaluate(() => (window as unknown as Window & {
    __setDocumentHidden: (hidden: boolean) => void;
  }).__setDocumentHidden(true));
  await expect.poll(async () => (await musicCalls()).some(({ action, file }) =>
    action === 'pause' && file === activeTrack)).toBe(true);
  await page.evaluate(() => (window as unknown as Window & {
    __setDocumentHidden: (hidden: boolean) => void;
  }).__setDocumentHidden(false));
  await expect.poll(async () => (await musicCalls()).filter(({ action, file }) =>
    action === 'play' && file === activeTrack).length).toBeGreaterThan(playCountBeforeBackgrounding);
});

test('reloads a muted profile into active sound players after a settings conflict', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { __audioCalls: [] as Array<{ action: 'play' | 'pause'; path: string }> });
    HTMLMediaElement.prototype.play = function () {
      const calls = (window as unknown as Window & {
        __audioCalls: Array<{ action: 'play' | 'pause'; path: string }>;
      }).__audioCalls;
      calls.push({ action: 'play', path: new URL(this.src).pathname });
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      const calls = (window as unknown as Window & {
        __audioCalls: Array<{ action: 'play' | 'pause'; path: string }>;
      }).__audioCalls;
      calls.push({ action: 'pause', path: new URL(this.src).pathname });
    };
  });

  await page.goto('/?testBattle=1');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  const audioCalls = () => page.evaluate(() =>
    (window as unknown as Window & { __audioCalls: Array<{ action: string; path: string }> }).__audioCalls);
  await expect.poll(async () => (await audioCalls()).some(({ action, path }) =>
    action === 'play' && path.includes('/assets/sounds/sound_pedro.ogg'))).toBe(true);
  await expect.poll(async () => (await audioCalls()).some(({ action, path }) =>
    action === 'play' && path.includes('/assets/music/music_loop1.ogg'))).toBe(true);

  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('gunsnglory-profile', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('profiles', 'readwrite');
        transaction.objectStore('profiles').put({
          id: 'default',
          schemaVersion: 2,
          settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: false },
          completedScenarios: [],
          highScores: {},
          appliedSettlementIds: [],
          revision: 1,
          lastOperationId: 'external-settings-update',
          lastRequestDigest: 'external-settings-update',
        });
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      };
    });
  });

  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('ArrowRight');
  await expect(page.getByTestId('settings-status')).toContainText('newer profile exists');
  await page.getByRole('button', { name: 'Reload saved profile' }).click();
  await pauseFromHud(page);
  await expect(page.getByTestId('pause-sound-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await audioCalls()).some(({ action, path }) =>
    action === 'pause' && path.includes('/assets/sounds/sound_pedro.ogg'))).toBe(true);
  await expect.poll(async () => (await audioCalls()).some(({ action, path }) =>
    action === 'pause' && path.includes('/assets/music/music_loop1.ogg'))).toBe(true);
});
