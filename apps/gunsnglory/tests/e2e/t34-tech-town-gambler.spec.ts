import { expect, test, type Page } from '@playwright/test';
import { calculateMapViewport } from '../../src/render/map-viewport';

const gamblerCell = { x: 6, y: 6 };
const mapViewport = calculateMapViewport(17, 17, 1024, 576);

async function startTestBattle(page: Page): Promise<void> {
  await page.goto('/?testBattle=1');
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.locator('[data-action="start-gambler-sample"]')).toBeVisible();
}

async function startGamblerSample(page: Page, lowCash = false): Promise<void> {
  await page.locator(`[data-action="${lowCash ? 'start-gambler-low-cash-sample' : 'start-gambler-sample'}"]`).click();
  await expect(page.getByTestId('scene-open-error')).toBeHidden();
}

async function canvasPoint(page: Page, mapX: number, mapY: number): Promise<{ x: number; y: number }> {
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  const logicalX = mapViewport.origin.x + mapX * mapViewport.tileSize;
  const logicalY = mapViewport.origin.y + mapY * mapViewport.tileSize;
  return { x: bounds.x + logicalX / 1024 * bounds.width, y: bounds.y + logicalY / 576 * bounds.height };
}

async function tapGambler(page: Page): Promise<void> {
  const point = await canvasPoint(page, gamblerCell.x + 0.5, gamblerCell.y + 0.3125);
  await page.mouse.click(point.x, point.y);
}

async function expectDialogInsideGameFrame(page: Page): Promise<void> {
  const frame = await page.locator('.game-frame').boundingBox();
  const dialog = await page.getByTestId('gambler-dialog').boundingBox();
  expect(frame).not.toBeNull();
  expect(dialog).not.toBeNull();
  expect(dialog!.x).toBeGreaterThanOrEqual(frame!.x);
  expect(dialog!.y).toBeGreaterThanOrEqual(frame!.y);
  expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(frame!.x + frame!.width + 1);
  expect(dialog!.y + dialog!.height).toBeLessThanOrEqual(frame!.y + frame!.height + 1);
}

test('Gambler click opens an in-frame dialog; cancel, drag and other units do not place a wager', async ({ page }) => {
  await page.addInitScript(() => {
    const attempts: string[] = [];
    (window as Window & { __gamblerAudioAttempts?: string[] }).__gamblerAudioAttempts = attempts;
    HTMLMediaElement.prototype.play = function play() {
      attempts.push(this.currentSrc || this.src);
      return Promise.resolve();
    };
  });
  await startTestBattle(page);
  await startGamblerSample(page);

  const canvas = page.getByTestId('game-canvas');
  const dialog = page.getByTestId('gambler-dialog');
  const initialCash = page.getByTestId('gambler-cash');
  await tapGambler(page);
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('fullscreen-toggle')).toBeVisible();
  await expectDialogInsideGameFrame(page);
  await expect(initialCash).toHaveText('Cash: $50 · Wager: $50');
  await expect(page.getByTestId('gambler-message')).toHaveText('Show what you’ve got!');

  await page.getByTestId('close-gambler').click();
  await expect(dialog).toBeHidden();
  await expect(initialCash).toHaveText('Cash: $50 · Wager: $50');

  const otherUnit = await canvasPoint(page, 8.5, 8.0);
  await page.mouse.click(otherUnit.x, otherUnit.y);
  await expect(dialog).toBeHidden();

  const gamblerPoint = await canvasPoint(page, gamblerCell.x + 0.5, gamblerCell.y + 0.3125);
  await page.mouse.move(gamblerPoint.x, gamblerPoint.y);
  await page.mouse.down();
  await page.mouse.move(gamblerPoint.x + 42, gamblerPoint.y + 4, { steps: 3 });
  await page.mouse.up();
  await expect(dialog).toBeHidden();

  await tapGambler(page);
  await expect(dialog).toBeVisible();
  const play = page.getByTestId('play-gambler');
  await expect(play).toBeEnabled();
  await play.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByTestId('gambler-cards').locator('li')).toHaveCount(5);
  await expect(page.getByTestId('gambler-message')).not.toHaveText('Show what you’ve got!', { timeout: 2_000 });
  await expect(page.getByTestId('close-gambler')).toHaveText('Done', { timeout: 2_000 });
  await expect(initialCash).not.toHaveText('Cash: $50 · Wager: $50');

  const playedAudio = await page.evaluate(() => (window as Window & { __gamblerAudioAttempts?: string[] }).__gamblerAudioAttempts ?? []);
  expect(playedAudio.some((source) => source.endsWith('/sound_cards_collect.ogg'))).toBe(true);
  expect(playedAudio.some((source) => source.endsWith('/sound_cards_deal.ogg'))).toBe(true);

  await page.getByTestId('close-gambler').click();
  await tapGambler(page);
  await expect(page.getByTestId('gambler-message')).toContainText('4:59');
  await expect(page.getByTestId('play-gambler')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect.poll(() => canvas.evaluate((element) => document.activeElement === element)).toBe(true);

  await startGamblerSample(page, true);
  await tapGambler(page);
  await expect(page.getByTestId('gambler-cash')).toHaveText('Cash: $49 · Wager: $50');
  await expect(page.getByTestId('gambler-message')).toContainText('need $50, but have $49');
  await expect(page.getByTestId('play-gambler')).toBeDisabled();
});

test('touch input opens the Gambler dialog without escaping the 390px game frame', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  try {
    await startTestBattle(page);
    await startGamblerSample(page);
    const point = await canvasPoint(page, gamblerCell.x + 0.5, gamblerCell.y + 0.3125);
    await page.touchscreen.tap(point.x, point.y);
    const dialog = page.getByTestId('gambler-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('fullscreen-toggle')).toBeVisible();
    await expectDialogInsideGameFrame(page);
    await expect(page.getByTestId('play-gambler')).toBeEnabled();
    await expect(page.getByTestId('close-gambler')).toBeVisible();

    await page.getByLabel('Switch interface language to Chinese').click();
    await expect(page.getByTestId('gambler-dialog-title')).toHaveText('纸牌赌徒');
    await expect(page.getByTestId('gambler-message')).toHaveText('亮出你的牌吧！');
    await expect(page.getByTestId('play-gambler')).toHaveText('下注 · $50');
    await page.getByLabel('切换界面语言为英文').click();
    await expect(page.getByTestId('gambler-dialog-title')).toHaveText('Card Gambler');

    await page.getByTestId('play-gambler').click();
    await expect(page.getByTestId('close-gambler')).toHaveText('Done', { timeout: 3_000 });
    await expect(dialog).toBeVisible();
    await expectDialogInsideGameFrame(page);
    const dialogContent = await dialog.evaluate((element: HTMLDialogElement) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    expect(dialogContent.scrollHeight).toBeLessThanOrEqual(dialogContent.clientHeight);
  } finally {
    await context.close();
  }
});
