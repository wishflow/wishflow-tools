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
    viewport: { width: 390, height: 844 },
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

test('fills the fullscreen viewport and keeps the shared Usagi widget above the game only in window mode', async ({ browser }) => {
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
    expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width / canvas.height))
      .toBeCloseTo(844 / 390, 2);

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
      'Fullscreen is active. Rotate your device to landscape for the best view.',
    );
    expect(await page.evaluate(() => document.fullscreenElement === document.querySelector('.game-frame'))).toBe(true);
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
