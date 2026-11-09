import { expect, test } from '@playwright/test';
import { pauseFromHud } from './helpers';

const viewports = [
  { name: 'desktop', viewport: { width: 1280, height: 720 }, hasTouch: false, isMobile: false },
  { name: 'phone portrait', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  { name: 'phone landscape', viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true },
] as const;

for (const profile of viewports) {
  test(`keeps the game HUD and pause board inside the playfield on ${profile.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: profile.viewport,
      ...(profile.hasTouch ? { hasTouch: true, isMobile: true } : {}),
    });
    const page = await context.newPage();
    try {
      await page.goto('/?testBattle=1');
      const frame = page.locator('.game-frame');
      const intro = page.getByTestId('campaign-wave-intro');
      await expect(intro).toBeVisible();
      await expect.poll(() => intro.evaluate((panel) => panel.closest('.game-frame') !== null)).toBe(true);

      const continueButton = intro.getByRole('button', { name: 'Continue' });
      if (profile.hasTouch) await continueButton.tap();
      else await continueButton.click();
      await expect(intro).toBeHidden();
      await expect(page.getByTestId('game-toolbar')).toBeVisible();
      await expect(page.getByTestId('simulation-speed')).toBeVisible();
      await expect(page.getByTestId('sound-toggle')).toBeVisible();
      await expect(page.getByTestId('pause-toggle')).toHaveCount(0);
      await expect(page.getByTestId('campaign-menu-toggle')).toHaveCount(0);

      await pauseFromHud(page, profile.hasTouch ? 'tap' : 'click');
      const board = page.getByTestId('pause-board');
      await expect(board).toBeVisible();
      await expect(frame).toHaveAttribute('data-active-overlay', 'pause-board');
      const geometry = await page.evaluate(() => {
        const frameElement = document.querySelector<HTMLElement>('.game-frame');
        const boardElement = document.querySelector<HTMLElement>('[data-testid="pause-board"]');
        if (!frameElement || !boardElement) throw new Error('Game frame or pause board is missing');
        const bounds = (element: Element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        };
        return {
          frame: bounds(frameElement),
          board: bounds(boardElement),
          actions: [...boardElement.querySelectorAll('.pause-board-actions button')].map(bounds),
        };
      });
      expect(geometry.board.left).toBeGreaterThanOrEqual(geometry.frame.left);
      expect(geometry.board.top).toBeGreaterThanOrEqual(geometry.frame.top);
      expect(geometry.board.right).toBeLessThanOrEqual(geometry.frame.right);
      expect(geometry.board.bottom).toBeLessThanOrEqual(geometry.frame.bottom);
      expect(geometry.actions).toHaveLength(4);
      for (const button of geometry.actions) {
        expect(button.left).toBeGreaterThanOrEqual(geometry.board.left);
        expect(button.top).toBeGreaterThanOrEqual(geometry.board.top);
        expect(button.right).toBeLessThanOrEqual(geometry.board.right);
        expect(button.bottom).toBeLessThanOrEqual(geometry.board.bottom);
      }
    } finally {
      await context.close();
    }
  });
}
