import { expect, test, type FrameLocator, type Page } from '@playwright/test';

test.setTimeout(90_000);

async function openRuntime(page: Page): Promise<FrameLocator> {
  await page.goto('/');
  await expect(page).toHaveTitle(/Plants vs\. Zombies GOTY/);
  await expect(page.locator('#pvz-portable-runtime')).toBeVisible();

  const runtime = page.frameLocator('#pvz-portable-runtime');
  await expect(runtime.locator('#upload-screen')).toBeVisible();
  await expect(runtime.locator('#drop-zone')).toBeVisible();
  await expect(runtime.locator('#canvas')).toHaveAttribute('width', '800');
  return runtime;
}

test('desktop loads the pinned WASM runtime and accepts local resource archives', async ({ page, baseURL }) => {
  const requestOrigins = new Set<string>();
  page.on('request', (request) => requestOrigins.add(new URL(request.url()).origin));

  const runtime = await openRuntime(page);
  const frame = page.frame({ url: /portable\/pvz-portable\.html/ });
  expect(frame).not.toBeNull();
  await frame!.evaluate(async () => await (window as any).moduleReadyPromise);
  expect(await frame!.evaluate(() => typeof (window as any).Module?.callMain)).toBe('function');
  expect(await frame!.evaluate(() => Boolean((window as any).Module?.FS?.filesystems?.IDBFS))).toBe(true);

  const archive = await frame!.evaluate(async () => {
    const zip = new (window as any).JSZip();
    zip.file('main.pak', new Uint8Array([0, 1, 2]));
    zip.file('properties/LawnStrings.txt', '[LAWNSTRINGS]');
    return zip.generateAsync({ type: 'base64' });
  });
  await runtime.locator('#resource-zip-input').setInputFiles({
    name: 'local-game-resources.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(archive, 'base64'),
  });
  await expect(runtime.locator('#drop-zone')).toHaveClass(/ready/);
  await expect(runtime.locator('#file-list .ok')).toHaveCount(2);

  const expectedOrigin = new URL(baseURL!).origin;
  expect([...requestOrigins].every((origin) => origin === expectedOrigin)).toBe(true);
});

test('landscape touch viewport keeps the original aspect-ratio runtime inside the page', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  const runtime = await openRuntime(page);
  const frame = page.frame({ url: /portable\/pvz-portable\.html/ });
  expect(frame).not.toBeNull();
  await frame!.evaluate(async () => await (window as any).moduleReadyPromise);

  const viewport = await frame!.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    bodyClass: document.body.className,
  }));
  expect(viewport.width).toBe(844);
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
  expect(viewport.bodyClass).toContain('upload-mode');
  await expect(runtime.locator('#browse-zip-btn')).toBeVisible();
  await expect(runtime.locator('#browse-folder-btn')).toBeVisible();

  await context.close();
});
