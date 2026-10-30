import { expect, test } from '@playwright/test';

const appPath = '/python-interpreter-lab/';

test('opens the static bilingual guide in a new tab without changing the teaching session', async ({ page }) => {
  await page.goto(appPath);
  await page.getByRole('combobox', { name: 'Execution view' }).selectOption('teaching');
  await expect(page.getByText('Ready to compile teaching program')).toBeVisible();
  await page.getByRole('button', { name: 'Expand project navigation' }).click();
  await expect(page.getByRole('link', { name: 'User guide', exact: true })).toHaveAttribute('href', './help.html');
  await page.getByRole('button', { name: 'Collapse project navigation' }).click();

  const source = page.locator('.source-editor');
  await source.fill('answer = 6\nprint(answer)');
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await expect(page.getByRole('heading', { name: 'Teaching AST' })).toBeVisible();
  await page.getByRole('button', { name: 'Step one instruction' }).click();
  await expect(page.locator('.teaching-instruction-count')).toContainText('1 of 5,000');
  const before = {
    source: await source.inputValue(),
    instructionCount: await page.locator('.teaching-instruction-count').innerText(),
    mode: await page.locator('.mode-picker select').inputValue(),
  };

  const popupPromise = page.waitForEvent('popup');
  const helpLink = page.getByRole('link', { name: 'User guide opens in a new tab' });
  await expect(helpLink).toHaveAttribute('href', './help.html');
  await expect(helpLink).toHaveAttribute('target', '_blank');
  await expect(helpLink).toHaveAttribute('rel', 'noopener noreferrer');
  await helpLink.click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');

  await expect(popup).toHaveURL(/\/python-interpreter-lab\/help\.html$/);
  await expect(popup.getByRole('heading', { name: 'User guide' })).toBeVisible();
  await expect(popup.getByRole('heading', { name: 'Quick start' })).toBeVisible();
  await expect(popup.getByRole('link', { name: 'Open the lab' })).toHaveAttribute('href', './');
  await expect(popup.locator('a[href$=".md"]')).toHaveCount(0);
  await expect(popup.locator('wishflow-site-shell')).toBeVisible();
  await popup.getByRole('button', { name: 'Expand project navigation' }).click();
  await expect(popup.getByRole('link', { name: 'Lab', exact: true })).toHaveAttribute('href', './');
  await expect(popup.getByRole('link', { name: 'User guide', exact: true })).toHaveAttribute('href', '#/');
  await popup.getByRole('button', { name: 'Collapse project navigation' }).click();

  const resourceUrls = await popup.evaluate(() => performance.getEntriesByType('resource').map(({ name }) => name));
  expect(resourceUrls.some((url) => /pyodide|teaching-vm\.worker|pyodide\.worker/i.test(url))).toBe(false);

  await expect(source).toHaveValue(before.source);
  await expect(page.locator('.teaching-instruction-count')).toHaveText(before.instructionCount);
  await expect(page.locator('.mode-picker select')).toHaveValue(before.mode);
  await expect(page.locator('.teaching-step-controls button').first()).toBeEnabled();

  await popup.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(popup.getByRole('heading', { name: '使用说明' })).toBeVisible();
  await expect(popup.getByRole('heading', { name: '快速开始' })).toBeVisible();
  await expect(popup.getByRole('link', { name: '打开实验室' })).toHaveAttribute('href', './');

  for (const width of [320, 768, 1024]) {
    await popup.setViewportSize({ width, height: 800 });
    const pageWidth = await popup.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth, `help page should not scroll horizontally at ${width}px`).toBeLessThanOrEqual(width);
  }
  await popup.setViewportSize({ width: 320, height: 800 });
  const tableOverflow = await popup.locator('article[data-locale="zh"] .guide-table-scroll').first().evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(tableOverflow).toBe(true);
});
