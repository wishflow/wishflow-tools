import { expect, test } from '@playwright/test';

test('pauses the official campaign for first and next-wave introductions until continuing', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-29T00:00:00Z') });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  const intro = page.getByTestId('campaign-wave-intro');
  const introText = page.getByTestId('campaign-wave-intro-text');
  const continueButton = page.getByRole('button', { name: 'Continue' });
  await expect(intro).toBeVisible();
  await expect(intro).toHaveAttribute('data-wave-number', '1');
  await expect(introText).toHaveText(
    "Hey, Boss! I'm Pedro, your faithful compañero! Grab this Desperado and move him to the canyon! Then, he can ambush the settlers and take their gold! Hee hee hee!",
  );
  await expect(page.getByTestId('campaign-wave-intro-portrait')).toHaveJSProperty('naturalWidth', 96);
  const frameBeforeContinue = await page.getByTestId('inspection-frame').textContent();
  await page.clock.runFor(2_000);
  expect(await page.getByTestId('inspection-frame').textContent()).toBe(frameBeforeContinue);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(introText).toHaveText('老板！我是你忠实的伙伴佩德罗！选中这个枪手，把他移动到峡谷边缘！这样他就能伏击拓荒者，抢走他们的黄金！嘿嘿嘿！');
  await expect(intro.getByRole('button', { name: '继续' })).toBeVisible();
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  await page.evaluate(() => {
    let timestamp = 0;
    window.requestAnimationFrame = (callback) => window.setTimeout(() => {
      timestamp += 100;
      callback(timestamp);
    }, 100);
    window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);
  });
  await continueButton.click();
  await expect(intro).toBeHidden();
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await page.clock.runFor(60_000);
  await expect(intro).toBeVisible();
  await expect(intro).toHaveAttribute('data-wave-number', '2');
  await expect(introText).toContainText('the settlers have handed over some gold');
  const frameAtWaveTwoIntro = await page.getByTestId('inspection-frame').textContent();
  await page.clock.runFor(2_000);
  expect(await page.getByTestId('inspection-frame').textContent()).toBe(frameAtWaveTwoIntro);
});

test('fits the campaign introduction and touch target on a phone viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('/');

  const intro = page.getByTestId('campaign-wave-intro');
  await expect(intro).toBeVisible();
  const bounds = await intro.boundingBox();
  if (!bounds) throw new Error('Campaign introduction has no visible layout box');
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  await page.getByRole('button', { name: 'Continue' }).tap();
  await expect(intro).toBeHidden();
  await context.close();
});

test('respects the saved mute setting when the campaign intro is reopened', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { __soundPlayCount: 0 });
    HTMLMediaElement.prototype.play = function () {
      const state = window as unknown as Window & { __soundPlayCount: number };
      state.__soundPlayCount += 1;
      return Promise.resolve();
    };
  });
  await page.goto('/');
  const intro = page.getByTestId('campaign-wave-intro');
  await expect(intro).toBeVisible();
  await expect.poll(() => page.evaluate(() =>
    (window as unknown as Window & { __soundPlayCount: number }).__soundPlayCount)).toBe(1);

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByTestId('sound-toggle').click();
  await expect(page.getByTestId('sound-toggle')).toHaveText('Sound: Off');
  await expect(page.getByTestId('settings-status')).toHaveText('Settings saved.');
  await page.reload();

  await expect(intro).toBeVisible();
  expect(await page.evaluate(() =>
    (window as unknown as Window & { __soundPlayCount: number }).__soundPlayCount)).toBe(0);
});

test('offers an in-dialog retry when the browser blocks Pedro’s voice autoplay', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const state = window as unknown as Window & { __allowSoundPlayback: boolean; __soundPlayCount: number };
    state.__allowSoundPlayback = false;
    state.__soundPlayCount = 0;
    HTMLMediaElement.prototype.play = function () {
      state.__soundPlayCount += 1;
      return state.__allowSoundPlayback
        ? Promise.resolve()
        : Promise.reject(new Error('autoplay blocked'));
    };
  });
  await page.goto('/');
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
  const retryVoice = page.getByRole('button', { name: 'Retry Pedro’s voice' });
  await expect(retryVoice).toBeVisible();
  const retryBounds = await retryVoice.boundingBox();
  if (!retryBounds) throw new Error('Voice retry control has no layout box');
  expect(retryBounds.x).toBeGreaterThanOrEqual(0);
  expect(retryBounds.x + retryBounds.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.evaluate(() => {
    (window as unknown as Window & { __allowSoundPlayback: boolean }).__allowSoundPlayback = true;
  });
  await retryVoice.click();
  await expect(retryVoice).toBeHidden();
  expect(await page.evaluate(() =>
    (window as unknown as Window & { __soundPlayCount: number }).__soundPlayCount)).toBe(2);
});
