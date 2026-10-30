import { expect, test } from '@playwright/test';

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
  await page.goto('/');

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

  await page.getByTestId('sound-toggle').click();
  await expect(page.getByTestId('sound-toggle')).toHaveText('Sound: Off');
  await expect.poll(async () => (await musicCalls()).some(({ action, file }) =>
    action === 'pause' && file === 'music_loop1.ogg')).toBe(true);
  await page.getByTestId('sound-toggle').click();
  await expect(page.getByTestId('sound-toggle')).toHaveText('Sound: On');
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
