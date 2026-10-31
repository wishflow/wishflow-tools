import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', viewport: { width: 1280, height: 720 }, hasTouch: false, isMobile: false },
  { name: 'phone', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
] as const;

for (const profile of viewports) {
  test(`keeps the Cow Gulch playfield visible through the opening dialogue on ${profile.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: profile.viewport,
      ...(profile.hasTouch ? { hasTouch: true, isMobile: true } : {}),
    });
    const page = await context.newPage();
    await page.goto('/');

    const elementIsFullyVisible = async (selector: string) => {
      const box = await page.locator(selector).boundingBox();
      const viewport = page.viewportSize();
      return Boolean(box && viewport
        && box.x >= 0 && box.y >= 0
        && box.x + box.width <= viewport.width
        && box.y + box.height <= viewport.height);
    };

    await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
    await expect.poll(() => elementIsFullyVisible('[data-testid="campaign-wave-intro"]')).toBe(true);

    const continueButton = page.getByRole('button', { name: 'Continue' });
    if (profile.hasTouch) await continueButton.tap();
    else await continueButton.click();
    await expect(page.getByRole('button', { name: 'Pause battle' })).toBeVisible();
    await expect.poll(() => elementIsFullyVisible('[data-testid="game-canvas"]')).toBe(true);
    const pauseButton = page.getByRole('button', { name: 'Pause battle' });
    if (profile.hasTouch) await pauseButton.tap();
    else await pauseButton.click();
    await expect(page.getByRole('button', { name: 'Resume battle' })).toBeVisible();

    await context.close();
  });
}
