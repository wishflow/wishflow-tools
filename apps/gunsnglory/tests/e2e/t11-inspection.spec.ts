import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';
import { openSingleWaveSample } from './helpers';

test('single-step advances one frame and inspection overlays leave the paused battle unchanged', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await openSingleWaveSample(page);
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('wave-status')).toContainText('Enemies 1');
  await page.getByRole('button', { name: 'Pause battle' }).click();
  await expect(page.getByTestId('pause-status')).toHaveText('Battle paused.');

  await page.getByTestId('inspection-panel').locator('summary').click();
  const frame = page.getByTestId('inspection-frame');
  const beforeText = await frame.textContent();
  const beforeMatch = beforeText?.match(/(\d+)\D+(\d+)/);
  expect(beforeMatch).not.toBeNull();
  const beforeFrame = Number(beforeMatch?.[1]);
  const beforeElapsed = Number(beforeMatch?.[2]);

  await expect(page.getByTestId('inspection-units')).toContainText('gunslinger-1');
  await expect(page.getByTestId('inspection-enemies')).toContainText('preview-pioneer-1');
  await expect(page.getByTestId('inspection-route')).toContainText('(4.5, 10.5)');
  await expect(page.getByTestId('inspection-units')).toContainText('range < 5.0 cells');

  const singleStep = page.getByTestId('single-step');
  await expect(singleStep).toBeEnabled();
  await singleStep.click();
  const afterText = await frame.textContent();
  const afterMatch = afterText?.match(/(\d+)\D+(\d+)/);
  expect(afterMatch).not.toBeNull();
  expect(Number(afterMatch?.[1])).toBe(beforeFrame + 1);
  expect(Number(afterMatch?.[2])).toBe(beforeElapsed + 16);
  await expect(page.getByTestId('pause-status')).toHaveText('Battle paused.');

  const canvas = page.getByTestId('game-canvas');
  const canvasHash = () => canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data;
    let hash = 2166136261;
    for (const channel of pixels) hash = Math.imul(hash ^ channel, 16777619);
    return hash >>> 0;
  });
  const beforeOverlayHash = await canvasHash();
  const waveBeforeOverlay = await page.getByTestId('wave-status').textContent();
  const frameBeforeOverlay = await frame.textContent();
  await page.getByTestId('inspection-overlay').check();
  await expect.poll(canvasHash).not.toBe(beforeOverlayHash);
  await expect(frame).toHaveText(frameBeforeOverlay ?? '');
  await expect(page.getByTestId('wave-status')).toHaveText(waveBeforeOverlay ?? '');
  const visibleOverlayHash = await canvasHash();

  await page.waitForTimeout(200);
  expect(await canvasHash()).toBe(visibleOverlayHash);
  await page.getByTestId('inspection-overlay').uncheck();
  await expect.poll(canvasHash).toBe(beforeOverlayHash);
  await expect(frame).toHaveText(frameBeforeOverlay ?? '');
});

test('inspection and single-step controls remain usable on a phone-sized touch viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installAutoContinueCampaignWaveIntro(page);
  try {
    await page.goto('/');
    await openSingleWaveSample(page, 'tap');
    await page.getByRole('button', { name: 'Start one pioneer sample' }).tap();
    await expect(page.getByTestId('wave-status')).toContainText('Enemies 1');
    await page.getByRole('button', { name: 'Pause battle' }).tap();
    await page.getByTestId('inspection-panel').locator('summary').tap();

    const frame = page.getByTestId('inspection-frame');
    const before = (await frame.textContent())?.match(/(\d+)\D+(\d+)/);
    expect(before).not.toBeNull();
    await expect(page.getByTestId('single-step')).toBeEnabled();
    await page.getByTestId('single-step').tap();
    const after = (await frame.textContent())?.match(/(\d+)\D+(\d+)/);
    expect(after).not.toBeNull();
    expect(Number(after?.[1])).toBe(Number(before?.[1]) + 1);
    expect(Number(after?.[2])).toBe(Number(before?.[2]) + 16);
    await page.getByTestId('inspection-overlay').tap();
    await expect(page.getByTestId('inspection-overlay')).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await context.close();
  }
});
