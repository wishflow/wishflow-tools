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

test('a paused single step that crosses into wave two opens its introduction once', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  const intro = page.getByTestId('campaign-wave-intro');
  await expect(intro).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
  await page.getByRole('button', { name: 'Pause battle' }).click();
  await page.getByTestId('inspection-panel').locator('summary').click();

  const singleStep = page.getByTestId('single-step');
  await expect(singleStep).toBeEnabled();
  const transition = await page.evaluate(() => {
    const dialog = document.querySelector<HTMLDialogElement>('[data-testid="campaign-wave-intro"]');
    const step = document.querySelector<HTMLButtonElement>('[data-testid="single-step"]');
    if (!dialog || !step) throw new Error('Wave introduction controls are missing');
    let count = 0;
    while (!dialog.open && count < 10_000 && !step.disabled) {
      step.click();
      count += 1;
    }
    return {
      count,
      open: dialog.open,
      wave: dialog.dataset.waveNumber,
      frame: document.querySelector('[data-testid="inspection-frame"]')?.textContent,
    };
  });

  expect(transition.open).toBe(true);
  expect(transition.wave).toBe('2');
  expect(transition.count).toBeLessThan(10_000);
  const introFrame = await page.getByTestId('inspection-frame').textContent();
  await page.waitForTimeout(100);
  expect(await page.getByTestId('inspection-frame').textContent()).toBe(introFrame);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(intro).toBeHidden();
});

test('keeps a reusable bilingual controls guide inside the game window without advancing simulation', async ({ page }) => {
  await page.goto('/');
  const intro = page.getByTestId('campaign-wave-intro');
  await expect(intro).toBeVisible();
  await expect.poll(() => intro.evaluate((dialog) => dialog.parentElement?.classList.contains('game-frame'))).toBe(true);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(intro).toBeHidden();
  await page.getByRole('button', { name: 'Pause battle' }).click();
  const guide = page.getByTestId('controls-help');
  const summary = guide.locator('summary');
  const frame = page.getByTestId('inspection-frame');
  const readFrame = async () => (await frame.textContent())?.match(/\d+/g)?.map(Number);
  const beforeFrame = await readFrame();

  await summary.click();
  await expect(guide).toHaveAttribute('open', '');
  await expect(guide).toContainText('Click or tap a unit to select it');
  await expect(guide).toContainText('Pinch with two fingers to zoom');
  expect(await readFrame()).toEqual(beforeFrame);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(guide).toContainText('点击或轻触单位进行选择');
  await expect(guide).toContainText('双指捏合可缩放地图');
  expect(await readFrame()).toEqual(beforeFrame);

  await summary.click();
  await expect(guide).not.toHaveAttribute('open', '');
  await summary.click();
  await expect(guide).toHaveAttribute('open', '');
});

test('keeps campaign dialogue and its touch target inside the game frame without scrolling on phones', async ({ browser }) => {
  for (const viewport of [{ width: 320, height: 844 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const context = await browser.newContext({
      viewport,
      hasTouch: true,
      isMobile: viewport.width < viewport.height,
    });
    const page = await context.newPage();
    await page.goto('/');

    const intro = page.getByTestId('campaign-wave-intro');
    const frame = page.locator('.game-frame');
    await expect(intro).toBeVisible();

    const assertFits = async (buttonName: string) => {
      const continueButton = intro.getByRole('button', { name: buttonName, exact: true });
      const frameBounds = await frame.boundingBox();
      const introBounds = await intro.boundingBox();
      const continueBounds = await continueButton.boundingBox();
      if (!frameBounds || !introBounds || !continueBounds) {
        throw new Error('Campaign dialogue, game frame, or Continue control has no visible layout box');
      }

      expect(introBounds.x).toBeGreaterThanOrEqual(frameBounds.x);
      expect(introBounds.y).toBeGreaterThanOrEqual(frameBounds.y);
      expect(introBounds.x + introBounds.width).toBeLessThanOrEqual(frameBounds.x + frameBounds.width);
      expect(introBounds.y + introBounds.height).toBeLessThanOrEqual(frameBounds.y + frameBounds.height);
      expect(continueBounds.x).toBeGreaterThanOrEqual(frameBounds.x);
      expect(continueBounds.y).toBeGreaterThanOrEqual(frameBounds.y);
      expect(continueBounds.x + continueBounds.width).toBeLessThanOrEqual(frameBounds.x + frameBounds.width);
      expect(continueBounds.y + continueBounds.height).toBeLessThanOrEqual(frameBounds.y + frameBounds.height);

      const overflow = await intro.evaluate((dialog) => ({
        scrollHeight: dialog.scrollHeight,
        clientHeight: dialog.clientHeight,
      }));
      expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);
      return continueButton;
    };

    let continueButton = await assertFits('Continue');
    if (viewport.width < viewport.height) {
      await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
      await expect(intro.getByRole('button', { name: '继续' })).toBeVisible();
      continueButton = await assertFits('继续');
    }

    await continueButton.tap();
    await expect(intro).toBeHidden();
    await context.close();
  }
});

test('respects the saved mute setting when the campaign intro is reopened', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { __soundPlayCount: 0 });
    HTMLMediaElement.prototype.play = function () {
      if (!new URL((this as HTMLAudioElement).src).pathname.includes('/assets/sounds/')) return Promise.resolve();
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
      if (!new URL((this as HTMLAudioElement).src).pathname.includes('/assets/sounds/')) return Promise.resolve();
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
