import { expect, test } from '@playwright/test';
import { continueFromPauseBoard, pauseFromHud } from './helpers';

type ViewportCase = {
  name: string;
  width: number;
  height: number;
  touch: boolean;
};

const viewports: ViewportCase[] = [
  { name: 'desktop', width: 1280, height: 720, touch: false },
  { name: 'phone portrait', width: 390, height: 844, touch: true },
  { name: 'phone landscape', width: 844, height: 390, touch: true },
];

async function enterCowGulch(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') === 'true') await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await page.getByTestId('campaign-level-01').click();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-easy').click();
  await expect(page.getByTestId('campaign-wave-intro')).toBeVisible();
}

async function expectFullscreenCorner(page: import('@playwright/test').Page): Promise<void> {
  const frame = await page.locator('.game-frame').boundingBox();
  const fullscreen = await page.getByTestId('fullscreen-toggle').boundingBox();
  expect(frame).not.toBeNull();
  expect(fullscreen).not.toBeNull();
  expect(fullscreen!.x + fullscreen!.width).toBeLessThanOrEqual(frame!.x + frame!.width);
  expect(fullscreen!.y).toBeGreaterThanOrEqual(frame!.y);
  expect(frame!.x + frame!.width - (fullscreen!.x + fullscreen!.width)).toBeLessThan(14);
  expect(fullscreen!.y - frame!.y).toBeLessThan(14);
}

async function expectCornerControls(page: import('@playwright/test').Page): Promise<void> {
  await expectFullscreenCorner(page);
  const frame = await page.locator('.game-frame').boundingBox();
  const zoom = await page.getByTestId('map-zoom-controls').boundingBox();
  const fullscreen = await page.getByTestId('fullscreen-toggle').boundingBox();
  expect(frame).not.toBeNull();
  expect(zoom).not.toBeNull();
  expect(fullscreen).not.toBeNull();
  expect(zoom!.x).toBeGreaterThanOrEqual(frame!.x);
  expect(zoom!.y).toBeGreaterThanOrEqual(frame!.y);
  expect(zoom!.x + zoom!.width).toBeLessThanOrEqual(frame!.x + frame!.width);
  expect(zoom!.y + zoom!.height).toBeLessThanOrEqual(frame!.y + frame!.height);
  expect(zoom!.x - frame!.x).toBeLessThan(14);
  expect(zoom!.y - frame!.y).toBeLessThan(14);
  const overlaps = zoom!.x < fullscreen!.x + fullscreen!.width
    && zoom!.x + zoom!.width > fullscreen!.x
    && zoom!.y < fullscreen!.y + fullscreen!.height
    && zoom!.y + zoom!.height > fullscreen!.y;
  expect(overlaps).toBe(false);

  const zoomButton = page.getByTestId('map-zoom-in');
  const isTopmost = await zoomButton.evaluate((button: HTMLButtonElement) => {
    const bounds = button.getBoundingClientRect();
    return document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
      ?.closest('button') === button;
  });
  expect(isTopmost).toBe(true);
}

test('keeps battle controls frame-local and the pause Options path stable on desktop and phones', async ({ browser }) => {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
    });
    const page = await context.newPage();
    try {
      await enterCowGulch(page);
      const frame = page.locator('.game-frame');
      const toolbar = page.getByTestId('game-toolbar');
      const fullscreen = page.getByTestId('fullscreen-toggle');
      const mapZoom = page.getByTestId('map-zoom-controls');
      const waveIntro = page.getByTestId('campaign-wave-intro');

      await expect(toolbar).toBeHidden();
      await expect(mapZoom).toBeHidden();
      await expect(fullscreen).toBeVisible();
      const fullscreenBefore = await fullscreen.evaluate((button) => {
        const buttonBounds = button.getBoundingClientRect();
        const frameBounds = button.closest('.game-frame')?.getBoundingClientRect();
        if (!frameBounds) throw new Error('Fullscreen control is outside the game frame');
        return {
          x: buttonBounds.x - frameBounds.x,
          y: buttonBounds.y - frameBounds.y,
          width: buttonBounds.width,
          height: buttonBounds.height,
        };
      });
      expect(fullscreenBefore).not.toBeNull();
      expect(await waveIntro.evaluate((panel) => panel.closest('.game-frame') !== null)).toBe(true);
      const introBounds = await waveIntro.boundingBox();
      const frameBounds = await frame.boundingBox();
      expect(introBounds).not.toBeNull();
      expect(frameBounds).not.toBeNull();
      expect(introBounds!.x).toBeGreaterThanOrEqual(frameBounds!.x);
      expect(introBounds!.y).toBeGreaterThanOrEqual(frameBounds!.y);
      expect(introBounds!.x + introBounds!.width).toBeLessThanOrEqual(frameBounds!.x + frameBounds!.width + 1);
      expect(introBounds!.y + introBounds!.height).toBeLessThanOrEqual(frameBounds!.y + frameBounds!.height + 1);
      const portraitBounds = await page.getByTestId('campaign-wave-intro-portrait').boundingBox();
      const copyBounds = await page.getByTestId('campaign-wave-intro-text').boundingBox();
      expect(portraitBounds).not.toBeNull();
      expect(copyBounds).not.toBeNull();
      const portraitCoversCopy = portraitBounds!.x < copyBounds!.x + copyBounds!.width
        && portraitBounds!.x + portraitBounds!.width > copyBounds!.x
        && portraitBounds!.y < copyBounds!.y + copyBounds!.height
        && portraitBounds!.y + portraitBounds!.height > copyBounds!.y;
      expect(portraitCoversCopy, `${viewport.name} wave intro portrait overlaps its copy`).toBe(false);

      await page.locator('[data-action="continue-wave-intro"]').click();
      await expect(waveIntro).toBeHidden();
      await expectFullscreenCorner(page);
      if (viewport.touch) {
        await expect(mapZoom).toBeHidden();
      } else {
        await expect(mapZoom).toBeVisible();
        await expectCornerControls(page);
        await page.getByTestId('map-zoom-in').click();
        await expect(page.getByTestId('map-zoom-level')).toHaveText('1.25×');
        await page.getByTestId('map-zoom-reset').click();
        await expect(page.getByTestId('map-zoom-level')).toHaveText('1×');
      }

      await pauseFromHud(page, viewport.touch ? 'tap' : 'click');
      await expect(page.getByTestId('pause-board')).toBeVisible();
      await expect(frame).toHaveAttribute('data-simulation-state', 'paused');
      await expect(mapZoom).toBeHidden();
      await expect(toolbar).toBeHidden();
      await expect(fullscreen).toBeVisible();
      const fullscreenWhilePaused = await fullscreen.evaluate((button) => {
        const buttonBounds = button.getBoundingClientRect();
        const frameBounds = button.closest('.game-frame')?.getBoundingClientRect();
        if (!frameBounds) throw new Error('Fullscreen control is outside the game frame');
        return {
          x: buttonBounds.x - frameBounds.x,
          y: buttonBounds.y - frameBounds.y,
          width: buttonBounds.width,
          height: buttonBounds.height,
        };
      });
      expect(fullscreenWhilePaused).toEqual(fullscreenBefore);

      await page.getByTestId('pause-options').click();
      const optionsPanel = page.getByTestId('game-options');
      await expect(optionsPanel).toBeVisible();
      await expect(page.getByTestId('pause-board')).toBeVisible();
      await expect(page.getByTestId('pause-board')).toHaveAttribute('aria-hidden', 'true');
      await expect(page.getByTestId('campaign-menu-screen')).toBeHidden();
      await expect(optionsPanel.locator('.campaign-options-card')).toHaveCSS('background-image', /gng_hud_2_textbox_large\.png/);
      const optionsFits = await optionsPanel.locator('.campaign-options-card').evaluate((card) => {
        const frame = card.closest('.game-frame')?.getBoundingClientRect();
        const bounds = card.getBoundingClientRect();
        return {
          frame: frame ? { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom } : null,
          card: { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom },
          scrollHeight: card.scrollHeight,
          clientHeight: card.clientHeight,
        };
      });
      expect(
        optionsFits.frame !== null
          && optionsFits.card.left >= optionsFits.frame!.left
          && optionsFits.card.top >= optionsFits.frame!.top
          && optionsFits.card.right <= optionsFits.frame!.right
          && optionsFits.card.bottom <= optionsFits.frame!.bottom
          && optionsFits.scrollHeight <= optionsFits.clientHeight + 1,
        `${viewport.name} Options content fits the in-game parchment: ${JSON.stringify(optionsFits)}`,
      ).toBe(true);

      await page.getByTestId('options-help').click();
      const helpPanel = page.getByTestId('game-help');
      await expect(helpPanel).toBeVisible();
      await expect(optionsPanel).toBeHidden();
      await expect(page.getByTestId('pause-board')).toBeHidden();
      const helpFits = await helpPanel.locator('.campaign-help-card').evaluate((card) => {
        const frame = card.closest('.game-frame')?.getBoundingClientRect();
        const bounds = card.getBoundingClientRect();
        const list = card.querySelector('ol')?.getBoundingClientRect();
        const back = card.querySelector<HTMLElement>('.campaign-menu-back')?.getBoundingClientRect();
        const pagination = card.querySelector('.campaign-help-pagination')?.getBoundingClientRect();
        return {
          frame: frame ? { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom } : null,
          card: { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom },
          list: list ? { left: list.left, top: list.top, right: list.right, bottom: list.bottom } : null,
          back: back ? { left: back.left, top: back.top, right: back.right, bottom: back.bottom } : null,
          pagination: pagination ? { left: pagination.left, top: pagination.top, right: pagination.right, bottom: pagination.bottom } : null,
          scrollHeight: card.scrollHeight,
          clientHeight: card.clientHeight,
        };
      });
      expect(
        !!helpFits.frame && !!helpFits.list && !!helpFits.back && !!helpFits.pagination
          && helpFits.card.left >= helpFits.frame!.left
          && helpFits.card.top >= helpFits.frame!.top
          && helpFits.card.right <= helpFits.frame!.right
          && helpFits.card.bottom <= helpFits.frame!.bottom
          && helpFits.list.left >= helpFits.card.left
          && helpFits.list.right <= helpFits.card.right
          && helpFits.list.bottom <= helpFits.back.top
          && helpFits.list.bottom <= helpFits.pagination.top
          && helpFits.scrollHeight <= helpFits.clientHeight + 1,
        `${viewport.name} Help content fits without overlap: ${JSON.stringify(helpFits)}`,
      ).toBe(true);
      await helpPanel.getByTestId('campaign-menu-back').click();
      await expect(optionsPanel).toBeVisible();
      await expect(page.getByTestId('pause-board')).toBeVisible();

      await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
      await expect(optionsPanel).toContainText('选项');
      await expect(optionsPanel.getByTestId('simulation-speed')).toHaveCount(0);
      const chineseOptionsFit = await optionsPanel.locator('.campaign-options-card').evaluate((card) => {
        const frame = card.closest('.game-frame')?.getBoundingClientRect();
        const bounds = card.getBoundingClientRect();
        return !!frame
          && bounds.left >= frame.left
          && bounds.top >= frame.top
          && bounds.right <= frame.right
          && bounds.bottom <= frame.bottom
          && card.scrollHeight <= card.clientHeight + 1;
      });
      expect(chineseOptionsFit, `${viewport.name} Chinese Options content fits`).toBe(true);
      await page.getByTestId('options-help').click();
      const chineseHelp = page.getByTestId('game-help');
      await expect(chineseHelp).toContainText('游戏说明');
      const chineseHelpFits = await chineseHelp.locator('.campaign-help-card').evaluate((card) => {
        const frame = card.closest('.game-frame')?.getBoundingClientRect();
        const bounds = card.getBoundingClientRect();
        const list = card.querySelector('ol')?.getBoundingClientRect();
        const back = card.querySelector<HTMLElement>('.campaign-menu-back')?.getBoundingClientRect();
        const pagination = card.querySelector('.campaign-help-pagination')?.getBoundingClientRect();
        return !!frame && !!list && !!back && !!pagination
          && bounds.left >= frame.left
          && bounds.top >= frame.top
          && bounds.right <= frame.right
          && bounds.bottom <= frame.bottom
          && list.left >= bounds.left
          && list.right <= bounds.right
          && list.bottom <= back.top
          && list.bottom <= pagination.top
          && card.scrollHeight <= card.clientHeight + 1;
      });
      expect(chineseHelpFits, `${viewport.name} Chinese Help content fits`).toBe(true);
      await chineseHelp.getByTestId('campaign-menu-back').click();
      await page.getByRole('button', { name: '切换界面语言为英文' }).click();
      await expect(optionsPanel).toContainText('OPTIONS');

      const speed = page.getByTestId('simulation-speed');
      await expect(speed).toBeVisible();
      await speed.focus();
      await speed.press('End');
      await expect(page.getByTestId('simulation-speed-value')).toHaveText('4×');
      await expect(optionsPanel.getByTestId('options-help')).toBeVisible();
      await optionsPanel.getByTestId('campaign-menu-back').scrollIntoViewIfNeeded();
      await optionsPanel.getByTestId('campaign-menu-back').click();

      await expect(optionsPanel).toBeHidden();
      await expect(page.getByTestId('campaign-menu-screen')).toBeHidden();
      await expect(page.getByTestId('pause-board')).toBeVisible();
      await expect(frame).toHaveAttribute('data-simulation-state', 'paused');
      await expect(mapZoom).toBeHidden();
      const fullscreenAfterOptions = await fullscreen.evaluate((button) => {
        const buttonBounds = button.getBoundingClientRect();
        const frameBounds = button.closest('.game-frame')?.getBoundingClientRect();
        if (!frameBounds) throw new Error('Fullscreen control is outside the game frame');
        return {
          x: buttonBounds.x - frameBounds.x,
          y: buttonBounds.y - frameBounds.y,
          width: buttonBounds.width,
          height: buttonBounds.height,
        };
      });
      expect(fullscreenAfterOptions).toEqual(fullscreenBefore);
      await continueFromPauseBoard(page, viewport.touch ? 'tap' : 'click');
      await expect(page.getByTestId('pause-board')).toBeHidden();
      await expect(frame).not.toHaveAttribute('data-simulation-state', 'paused');
      await expect(toolbar).toBeHidden();
      if (viewport.touch) await expect(mapZoom).toBeHidden();
      else await expect(mapZoom).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    } catch (error) {
      throw new Error(`${viewport.name}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    } finally {
      await context.close();
    }
  }
});
