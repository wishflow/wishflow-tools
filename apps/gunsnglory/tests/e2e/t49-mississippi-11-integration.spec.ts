import { expect, test } from '@playwright/test';

test('Free Play opens Traveller’s Town with its APK copy, first dialogue, and Mississippi region context', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  const soundToggle = page.getByTestId('menu-sound');
  if (await soundToggle.getAttribute('aria-pressed') !== 'false') await soundToggle.click();
  await expect(soundToggle).toHaveAttribute('aria-pressed', 'false');

  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-mississippi').click();
  await expect(page.getByTestId('campaign-menu-progress')).toContainText('4 implemented levels available in this region');
  await expect(page.getByTestId('campaign-level-11')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-12')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-13')).toBeEnabled();
  await page.getByTestId('campaign-level-11').click();

  await expect(page.getByRole('heading', { name: "Traveller's Town" })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText(
    "Traveler's Town is a popular travel destination on the edge of the Mississippi River.",
  );
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '旅行者小镇' })).toBeVisible();
  await expect(page.locator('.campaign-level-description')).toHaveText('旅行者小镇是密西西比河畔广受欢迎的旅游胜地。');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await page.getByTestId('campaign-stage-play').click();
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await expect(page.getByTestId(`campaign-difficulty-${difficulty}`)).toBeEnabled();
  }
  await page.getByTestId('campaign-difficulty-hard').click();

  await expect(page.locator('#scene-title')).toHaveText("Traveller's Town · Level 11");
  await expect(page.getByTestId('scene-context')).toHaveText('FREE PLAY · MISSISSIPPI · 11');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
  const intro = page.getByTestId('campaign-wave-intro');
  await expect(intro).toBeVisible();
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await expect(intro).toHaveAttribute('data-wave-number', '1');
  await expect(intro.locator('#campaign-wave-intro-title')).toHaveText('Settlers');
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(
    "Oh, honey, it's so beautiful here. We should take a rest soon and have a swim in the Mississippi!",
  );
  const portrait = page.getByTestId('campaign-wave-intro-portrait');
  await expect(portrait).toHaveAttribute('src', /portrait_settlers\.png/);
  await expect(portrait).toHaveJSProperty('naturalWidth', 96);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText('哦，亲爱的，这里真美。我们该早点休息，去密西西比河游泳！');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await page.evaluate(() => {
    const rect = (element: Element | null) => {
      if (!element) throw new Error('Traveller’s Town mobile layout element is missing');
      const bounds = element.getBoundingClientRect();
      return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom };
    };
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      frame: rect(document.querySelector('.game-frame')),
      canvas: rect(document.querySelector('[data-testid="game-canvas"]')),
      intro: rect(document.querySelector('[data-testid="campaign-wave-intro"]')),
      portrait: rect(document.querySelector('[data-testid="campaign-wave-intro-portrait"]')),
      copy: rect(document.querySelector('[data-testid="campaign-wave-intro-text"]')),
    };
  });
  expect(mobileLayout.documentWidth).toBeLessThanOrEqual(mobileLayout.viewportWidth);
  for (const bounds of [mobileLayout.canvas, mobileLayout.intro]) {
    expect(bounds.left).toBeGreaterThanOrEqual(mobileLayout.frame.left);
    expect(bounds.top).toBeGreaterThanOrEqual(mobileLayout.frame.top);
    expect(bounds.right).toBeLessThanOrEqual(mobileLayout.frame.right + 1);
    expect(bounds.bottom).toBeLessThanOrEqual(mobileLayout.frame.bottom + 1);
  }
  const portraitCoversCopy = mobileLayout.portrait.left < mobileLayout.copy.right
    && mobileLayout.portrait.right > mobileLayout.copy.left
    && mobileLayout.portrait.top < mobileLayout.copy.bottom
    && mobileLayout.portrait.bottom > mobileLayout.copy.top;
  expect(portraitCoversCopy).toBe(false);
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  await intro.getByRole('button', { name: 'Continue' }).click();
  await expect(intro).toBeHidden();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/8');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
});
