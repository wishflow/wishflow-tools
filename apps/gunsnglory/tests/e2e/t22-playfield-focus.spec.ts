import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', viewport: { width: 1280, height: 720 }, hasTouch: false, isMobile: false },
  { name: 'phone portrait', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  { name: 'phone landscape', viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true },
] as const;

for (const profile of viewports) {
  test(`keeps the Cow Gulch playfield visible through the opening dialogue on ${profile.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: profile.viewport,
      ...(profile.hasTouch ? { hasTouch: true, isMobile: true } : {}),
    });
    const page = await context.newPage();
    await page.goto('/?testBattle=1');

    const elementIsFullyVisible = async (selector: string) => {
      const box = await page.locator(selector).boundingBox();
      const viewport = page.viewportSize();
      return Boolean(box && viewport
        && box.x >= 0 && box.y >= 0
        && box.x + box.width <= viewport.width
        && box.y + box.height <= viewport.height);
    };
    const elementIsInsideGameFrame = async (selector: string) => page.evaluate((targetSelector) => {
      const frame = document.querySelector<HTMLElement>('.game-frame');
      const target = frame?.querySelector<HTMLElement>(targetSelector);
      if (!frame || !target) return false;
      const frameBox = frame.getBoundingClientRect();
      const targetBox = target.getBoundingClientRect();
      return targetBox.left >= frameBox.left
        && targetBox.top >= frameBox.top
        && targetBox.right <= frameBox.right
        && targetBox.bottom <= frameBox.bottom;
    }, selector);

    await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
    await expect.poll(() => elementIsFullyVisible('[data-testid="campaign-wave-intro"]')).toBe(true);
    await expect.poll(() => elementIsInsideGameFrame('[data-testid="campaign-wave-intro"]')).toBe(true);

    const continueButton = page.getByRole('button', { name: 'Continue' });
    if (profile.hasTouch) await continueButton.tap();
    else await continueButton.click();
    await expect(page.getByRole('button', { name: 'Pause battle' })).toBeVisible();
    await expect.poll(() => elementIsFullyVisible('[data-testid="game-canvas"]')).toBe(true);
    await expect.poll(() => elementIsInsideGameFrame('[data-testid="game-toolbar"]')).toBe(true);
    await expect.poll(() => elementIsInsideGameFrame('[data-testid="pause-toggle"]')).toBe(true);
    await expect.poll(() => elementIsInsideGameFrame('[data-testid="simulation-speed"]')).toBe(true);
    await expect.poll(() => elementIsInsideGameFrame('[data-testid="sound-toggle"]')).toBe(true);
    if (profile.viewport.width <= 520) {
      const readToolbarLayout = () => page.evaluate(() => {
        const summary = document.querySelector<HTMLElement>('[data-testid="game-toolbar-toggle"]')?.getBoundingClientRect();
        const actionsElement = document.querySelector<HTMLElement>('.game-toolbar-actions');
        const actions = actionsElement?.getBoundingClientRect();
        if (!summary || !actions || !actionsElement) return { overlaps: true, primaryControlsFit: false, canScroll: false };
        const primaryControls = [
          document.querySelector<HTMLElement>('[data-testid="pause-toggle"]'),
          document.querySelector<HTMLElement>('[data-testid="campaign-menu-toggle"]'),
          document.querySelector<HTMLElement>('[data-action="clear-selection"]'),
        ];
        return {
          overlaps: actions.left < summary.right && actions.right > summary.left
            && actions.top < summary.bottom && actions.bottom > summary.top,
          primaryControlsFit: primaryControls.every((button) => {
            if (!button) return false;
            const rect = button.getBoundingClientRect();
            return rect.width > 0 && rect.left >= actions.left && rect.right <= actions.right;
          }),
          canScroll: actionsElement.scrollWidth > actionsElement.clientWidth,
        };
      });
      await expect.poll(readToolbarLayout).toEqual({
        overlaps: false,
        primaryControlsFit: true,
        canScroll: true,
      });

      const toolbarToggle = page.getByTestId('game-toolbar-toggle');
      await toolbarToggle.tap();
      await expect(page.getByRole('button', { name: 'Pause battle' })).toBeHidden();
      await toolbarToggle.tap();
      await expect(page.getByRole('button', { name: 'Pause battle' })).toBeVisible();
    }
    const pauseButton = page.getByRole('button', { name: 'Pause battle' });
    if (profile.hasTouch) await pauseButton.tap();
    else await pauseButton.click();
    await expect(page.getByRole('button', { name: 'Resume battle' })).toBeVisible();

    await context.close();
  });
}
