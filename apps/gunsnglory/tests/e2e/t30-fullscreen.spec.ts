import { expect, test } from './auto-continue-fixtures';
import { readFile } from 'node:fs/promises';

const sharedWidgetStyles = await readFile(new URL('../../../../site/usagi-widget.css', import.meta.url), 'utf8');

type FullscreenTestWindow = Window & {
  __gngFullscreenElement?: Element | null;
  __gngOrientationLockCalls?: string[];
};

async function installFullscreenMock(
  page: import('@playwright/test').Page,
  options: { request?: 'resolve' | 'reject' | 'missing'; orientation?: 'resolve' | 'reject' | 'missing' } = {},
): Promise<void> {
  await page.addInitScript(({ request, orientation }) => {
    const testWindow = window as FullscreenTestWindow;
    testWindow.__gngFullscreenElement = null;
    testWindow.__gngOrientationLockCalls = [];
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => testWindow.__gngFullscreenElement ?? null,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: async () => {
        testWindow.__gngFullscreenElement = null;
        document.dispatchEvent(new Event('fullscreenchange'));
      },
    });

    if (request === 'missing') {
      Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: undefined });
    } else {
      Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
        configurable: true,
        value: async function (this: HTMLElement) {
          if (request === 'reject') throw new DOMException('Fullscreen is denied', 'NotAllowedError');
          testWindow.__gngFullscreenElement = this;
          document.dispatchEvent(new Event('fullscreenchange'));
        },
      });
    }

    if (orientation === 'missing') {
      Object.defineProperty(screen, 'orientation', { configurable: true, value: undefined });
    } else {
      Object.defineProperty(screen, 'orientation', {
        configurable: true,
        value: {
          lock: async (value: string) => {
            testWindow.__gngOrientationLockCalls?.push(value);
            if (orientation === 'reject') throw new DOMException('Orientation lock is denied', 'NotAllowedError');
          },
          unlock: () => undefined,
          addEventListener: () => undefined,
        },
      });
    }
  }, options);
}

test('enters and exits fullscreen, requests landscape on touch, and keeps the control state synchronized', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installFullscreenMock(page);
  try {
    await page.goto('/');
    const toggle = page.getByTestId('fullscreen-toggle');
    await expect(toggle).toHaveAccessibleName('Enter fullscreen');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    await expect(toggle).toHaveAccessibleName('Exit fullscreen');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('fullscreen-status')).toHaveText('Landscape orientation is enabled.');
    await expect(page.getByTestId('portrait-orientation-overlay')).toBeHidden();
    expect(await page.evaluate(() => document.fullscreenElement === document.querySelector('.game-frame'))).toBe(true);
    expect(await page.evaluate(() => (window as FullscreenTestWindow).__gngOrientationLockCalls)).toEqual(['landscape']);

    await toggle.click();
    await expect(toggle).toHaveAccessibleName('Enter fullscreen');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('fullscreen-status')).toBeHidden();
    expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  } finally {
    await context.close();
  }
});

test('keeps fullscreen and dialog actions clickable while a modal covers the help guide', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await installFullscreenMock(page);
  try {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.resolve();
    });
    await page.goto('/?testBattle=1');
    await expect(page.getByTestId('game-toolbar')).toBeVisible();
    const fullscreen = page.getByTestId('fullscreen-toggle');
    const waveIntro = page.getByTestId('campaign-wave-intro');
    await expect(waveIntro).toBeVisible();
    await fullscreen.click();
    await expect(fullscreen).toHaveAttribute('aria-pressed', 'true');
    const continueWave = waveIntro.getByRole('button', { name: 'Continue' });
    expect(await continueWave.evaluate((button: HTMLButtonElement) => {
      const bounds = button.getBoundingClientRect();
      return document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)?.closest('button') === button;
    })).toBe(true);
    await fullscreen.click();
    await expect(fullscreen).toHaveAttribute('aria-pressed', 'false');
    await continueWave.click();
    await expect(waveIntro).toBeHidden();
    await page.getByTestId('sound-toggle').click();
    await expect(page.getByTestId('sound-toggle')).toHaveAttribute('aria-pressed', 'false');

    const help = page.getByTestId('controls-help');
    await help.locator('summary').click();
    await expect(help).toHaveAttribute('open', '');

    const dialog = page.getByTestId('campaign-exit-confirmation');
    await page.getByTestId('campaign-menu-toggle').click();
    await expect(dialog).toBeVisible();
    await expect(fullscreen).toBeVisible();
    await expect.poll(() => fullscreen.evaluate((button) => button.closest('dialog[open]') !== null)).toBe(true);

    await fullscreen.click();
    await expect(fullscreen).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog).toBeVisible();
    const keepPlaying = dialog.getByRole('button', { name: 'Keep playing' });
    expect(await keepPlaying.evaluate((button: HTMLButtonElement) => {
      const bounds = button.getBoundingClientRect();
      return document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)?.closest('button') === button;
    })).toBe(true);
    expect(await help.locator('ul').evaluate((list: HTMLElement) => {
      const bounds = list.getBoundingClientRect();
      return document.elementFromPoint(bounds.x + 4, bounds.y + 4)?.closest('[data-testid="controls-help"]') === list.parentElement;
    })).toBe(false);

    const canvas = page.getByTestId('game-canvas');
    await canvas.evaluate((element: HTMLCanvasElement) => {
      element.dataset.layerPointerCount = '0';
      element.addEventListener('pointerdown', () => {
        element.dataset.layerPointerCount = String(Number(element.dataset.layerPointerCount) + 1);
      });
    });
    const canvasBounds = await canvas.boundingBox();
    const dialogBounds = await dialog.boundingBox();
    expect(canvasBounds).toBeTruthy();
    expect(dialogBounds).toBeTruthy();
    const mapPoint = { x: canvasBounds!.x + 24, y: canvasBounds!.y + 24 };
    expect(mapPoint.x < dialogBounds!.x || mapPoint.x > dialogBounds!.x + dialogBounds!.width
      || mapPoint.y < dialogBounds!.y || mapPoint.y > dialogBounds!.y + dialogBounds!.height).toBe(true);
    await page.mouse.click(mapPoint.x, mapPoint.y);
    await expect(canvas).toHaveAttribute('data-layer-pointer-count', '0');

    await fullscreen.click();
    await expect(fullscreen).toHaveAttribute('aria-pressed', 'false');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Keep playing' }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => fullscreen.evaluate((button) => button.closest('.game-frame') !== null)).toBe(true);

    for (const [testId, cancelAction] of [
      ['recruit-confirmation', 'cancel-recruit'],
      ['map-hire-confirmation', 'cancel-map-hire'],
      ['upgrade-confirmation', 'cancel-upgrade'],
      ['gambler-dialog', 'close-gambler'],
    ]) {
      const confirmation = page.getByTestId(testId);
      await confirmation.evaluate((element: HTMLDialogElement) => element.show());
      const cancel = confirmation.locator(`[data-action="${cancelAction}"]`);
      await expect(confirmation).toBeVisible();
      await fullscreen.click();
      await expect(fullscreen).toHaveAttribute('aria-pressed', 'true');
      expect(await cancel.evaluate((button: HTMLButtonElement) => {
        const bounds = button.getBoundingClientRect();
        return document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)?.closest('button') === button;
      })).toBe(true);
      await fullscreen.click();
      await expect(fullscreen).toHaveAttribute('aria-pressed', 'false');
      await cancel.click();
      await expect(confirmation).toBeHidden();
    }

    const speed = page.getByRole('slider', { name: 'Simulation speed' });
    await speed.focus();
    await speed.press('End');
    await page.getByTestId('open-single-wave-sample').click();
    await page.getByTestId('start-wave').click();
    const settlement = page.getByTestId('settlement');
    await expect(page.getByTestId('settlement-outcome')).toHaveText('Victory', { timeout: 10000 });
    const campaignMap = page.getByTestId('settlement-campaign-menu');
    await fullscreen.click();
    await expect(fullscreen).toHaveAttribute('aria-pressed', 'true');
    const settlementButtonIsTopmost = await campaignMap.evaluate((button: HTMLButtonElement) => {
      const bounds = button.getBoundingClientRect();
      const target = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      return target?.closest('button') === button;
    });
    expect(settlementButtonIsTopmost).toBe(true);
    await fullscreen.click();
    await campaignMap.click();
    await expect(settlement).toBeHidden();
  } finally {
    await context.close();
  }
});

test('keeps a fullscreen failure message beside the campaign dialog instead of over its text', async ({ page }) => {
  await installFullscreenMock(page, { request: 'reject' });
  await page.goto('/?testBattle=1');

  const dialog = page.getByTestId('campaign-exit-confirmation');
  await page.getByTestId('campaign-menu-toggle').click();
  await expect(dialog).toBeVisible();

  const fullscreen = page.getByTestId('fullscreen-toggle');
  await fullscreen.click();
  await expect(page.getByTestId('fullscreen-status')).toBeVisible();

  const overlapsDialogHeading = await page.getByTestId('fullscreen-status').evaluate((status: HTMLElement) => {
    const heading = status.closest('dialog')?.querySelector('h2');
    if (!heading) return true;
    const statusBounds = status.getBoundingClientRect();
    const headingBounds = heading.getBoundingClientRect();
    return statusBounds.left < headingBounds.right
      && statusBounds.right > headingBounds.left
      && statusBounds.top < headingBounds.bottom
      && statusBounds.bottom > headingBounds.top;
  });
  expect(overlapsDialogHeading).toBe(false);

  const keepPlaying = dialog.getByRole('button', { name: 'Keep playing' });
  expect(await keepPlaying.evaluate((button: HTMLButtonElement) => {
    const bounds = button.getBoundingClientRect();
    return document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)?.closest('button') === button;
  })).toBe(true);
  await keepPlaying.click();
  await expect(dialog).toBeHidden();
});

test('uses consistent game action styles across ordinary dialogs and settlement', async ({ page }) => {
  await page.goto('/?testBattle=1');
  await page.getByTestId('campaign-menu-toggle').click();
  const exitDialog = page.getByTestId('campaign-exit-confirmation');
  await expect(exitDialog).toBeVisible();
  const fullscreen = page.getByTestId('fullscreen-toggle');
  await expect(fullscreen).toHaveText('⛶');
  expect(await fullscreen.evaluate((button) => getComputedStyle(button, '::before').content)).toBe('none');

  const actionStyles = await page.evaluate(() => {
    const buttons = [
      ...document.querySelectorAll<HTMLElement>('[data-action="cancel-campaign-exit"], [data-action="confirm-campaign-exit"]'),
      ...document.querySelectorAll<HTMLElement>('.recruit-confirmation button'),
      ...document.querySelectorAll<HTMLElement>('.settlement-panel button'),
    ];
    return buttons.map((button) => {
      const style = getComputedStyle(button);
      return {
        color: style.color,
        background: style.backgroundColor,
        border: style.border,
        radius: style.borderRadius,
        font: style.font,
        minHeight: style.minHeight,
      };
    });
  });
  expect(actionStyles.length).toBeGreaterThan(8);
  expect(new Set(actionStyles.map((style) => JSON.stringify(style))).size).toBe(1);

  const campaignCancel = exitDialog.getByRole('button', { name: 'Keep playing' });
  await page.keyboard.press('Tab');
  await campaignCancel.focus();
  expect(await campaignCancel.evaluate((button) => button.matches(':focus-visible'))).toBe(true);
  expect(await campaignCancel.evaluate((button) => getComputedStyle(button).outlineWidth)).toBe('2px');

  const recruitConfirm = page.locator('[data-action="confirm-recruit"]');
  await recruitConfirm.evaluate((button: HTMLButtonElement) => { button.disabled = true; });
  expect(await recruitConfirm.evaluate((button) => getComputedStyle(button).cursor)).toBe('default');
  expect(await recruitConfirm.evaluate((button) => getComputedStyle(button).backgroundColor)).toBe('rgb(48, 39, 31)');
});

test('keeps the complete game composition 16:9 in fullscreen and keeps Usagi above the game only in window mode', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installFullscreenMock(page);
  try {
    await page.goto('/');
    await page.addStyleTag({ content: sharedWidgetStyles });
    await page.evaluate(() => {
      const widget = document.createElement('button');
      widget.id = 'usagi-layer-test';
      widget.className = 'usagi-widget';
      widget.setAttribute('aria-label', 'Usagi test widget');
      widget.style.left = '0';
      widget.style.top = '0';
      widget.textContent = 'Usagi';
      widget.addEventListener('click', () => { widget.dataset.clicked = 'true'; });
      document.body.append(widget);
    });

    const widget = page.locator('#usagi-layer-test');
    await expect(widget).toBeVisible();
    expect(await page.evaluate(() => {
      const pet = document.querySelector<HTMLElement>('#usagi-layer-test');
      if (!pet) return false;
      const bounds = pet.getBoundingClientRect();
      return document.elementFromPoint(bounds.x + 8, bounds.y + 8) === pet;
    })).toBe(true);
    await widget.click();
    await expect(widget).toHaveAttribute('data-clicked', 'true');

    await page.getByTestId('fullscreen-toggle').click();
    const frame = await page.locator('.game-frame').boundingBox();
    expect(frame).toBeTruthy();
    expect(Math.abs(frame!.x)).toBeLessThan(1);
    expect(Math.abs(frame!.y)).toBeLessThan(1);
    expect(Math.abs(frame!.width - 844)).toBeLessThan(1);
    expect(Math.abs(frame!.height - 390)).toBeLessThan(1);
    await expect(widget).toBeHidden();
    const stage = await page.getByTestId('game-stage').boundingBox();
    expect(stage).toBeTruthy();
    expect(stage!.width / stage!.height).toBeCloseTo(16 / 9, 5);
    expect(stage!.height).toBeCloseTo(390, 0);
    expect(stage!.width).toBeCloseTo(390 * 16 / 9, 0);
    expect(stage!.x).toBeCloseTo((844 - stage!.width) / 2, 0);
    expect(stage!.y).toBeCloseTo(0, 0);
    const canvas = page.locator('[data-testid="game-canvas"]');
    const canvasBounds = await canvas.boundingBox();
    expect(canvasBounds).toBeTruthy();
    expect(canvasBounds!.width / canvasBounds!.height).toBeCloseTo(16 / 9, 5);
    expect(await canvas.evaluate((element: HTMLCanvasElement) => element.width / element.height))
      .toBeCloseTo(16 / 9, 2);
    const menuBounds = await page.locator('[data-testid="campaign-menu-screen"]').boundingBox();
    expect(menuBounds).toBeTruthy();
    expect(menuBounds!.x).toBeCloseTo(stage!.x, 0);
    expect(menuBounds!.y).toBeCloseTo(stage!.y, 0);
    expect(menuBounds!.width).toBeCloseTo(stage!.width, 0);
    expect(menuBounds!.height).toBeCloseTo(stage!.height, 0);

    await page.evaluate(() => {
      const canvasElement = document.querySelector<HTMLCanvasElement>('[data-testid="game-canvas"]');
      if (!canvasElement) throw new Error('Missing game canvas');
      canvasElement.dataset.pointerCount = '0';
      canvasElement.addEventListener('pointerdown', () => {
        canvasElement.dataset.pointerCount = String(Number(canvasElement.dataset.pointerCount) + 1);
      });
    });
    await page.mouse.click(12, 195);
    await expect(canvas).toHaveAttribute('data-pointer-count', '0');
    await page.getByTestId('menu-start').click();
    await expect(page.getByTestId('campaign-region-new-mexico')).toBeVisible();

    await page.getByTestId('fullscreen-toggle').click();
    await expect(widget).toBeVisible();
    expect(await page.evaluate(() => {
      const pet = document.querySelector<HTMLElement>('#usagi-layer-test');
      if (!pet) return false;
      const bounds = pet.getBoundingClientRect();
      return document.elementFromPoint(bounds.x + 8, bounds.y + 8) === pet;
    })).toBe(true);
  } finally {
    await context.close();
  }
});

test('keeps fullscreen available when mobile orientation locking is rejected', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installFullscreenMock(page, { orientation: 'reject' });
  try {
    await page.goto('/');
    await page.getByTestId('fullscreen-toggle').click();
    await expect(page.getByTestId('fullscreen-toggle')).toHaveAccessibleName('Exit fullscreen');
    await expect(page.getByTestId('fullscreen-status')).toHaveText(
      'Fullscreen is active. Rotate your device to landscape to continue.',
    );
    expect(await page.evaluate(() => document.fullscreenElement === document.querySelector('.game-frame'))).toBe(true);
    await expect(page.getByTestId('portrait-orientation-overlay')).toBeVisible();
    await expect(page.getByTestId('portrait-orientation-overlay')).toContainText('Rotate your device to landscape to continue.');
    await page.evaluate(() => {
      const canvasElement = document.querySelector<HTMLCanvasElement>('[data-testid="game-canvas"]');
      if (!canvasElement) throw new Error('Missing game canvas');
      canvasElement.dataset.pointerCount = '0';
      canvasElement.addEventListener('pointerdown', () => {
        canvasElement.dataset.pointerCount = String(Number(canvasElement.dataset.pointerCount) + 1);
      });
    });
    const canvasBounds = await page.locator('[data-testid="game-canvas"]').boundingBox();
    expect(canvasBounds).toBeTruthy();
    await page.mouse.click(canvasBounds!.x + canvasBounds!.width / 2, canvasBounds!.y + canvasBounds!.height / 2);
    await expect(page.getByTestId('game-canvas')).toHaveAttribute('data-pointer-count', '0');
    await expect(page.getByTestId('fullscreen-toggle')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('reports a rejected fullscreen request and keeps the page usable', async ({ page }) => {
  await installFullscreenMock(page, { request: 'reject' });
  await page.goto('/');
  const toggle = page.getByTestId('fullscreen-toggle');
  await toggle.click();
  await expect(toggle).toHaveAccessibleName('Enter fullscreen');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('fullscreen-status')).toHaveText(
    'Could not enter fullscreen. Use your browser’s fullscreen control instead.',
  );

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(toggle).toHaveAccessibleName('进入全屏');
  await expect(page.getByTestId('fullscreen-status')).toHaveText('无法进入全屏，请使用浏览器的全屏控制。');
});

test('explains when fullscreen is unsupported', async ({ page }) => {
  await installFullscreenMock(page, { request: 'missing' });
  await page.goto('/');
  const toggle = page.getByTestId('fullscreen-toggle');
  await toggle.click();
  await expect(toggle).toHaveAccessibleName('Enter fullscreen');
  await expect(page.getByTestId('fullscreen-status')).toHaveText('Fullscreen is not supported by this browser.');
});
