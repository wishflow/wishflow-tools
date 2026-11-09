import { expect, test } from './auto-continue-fixtures';

test('keeps experiments and data tools in the external lab with site navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const shell = page.locator('wishflow-site-shell');
  const localLinks = await shell.evaluate((element) => [...(element.shadowRoot?.querySelectorAll<HTMLAnchorElement>('.local-nav-link') ?? [])]
    .map((link) => ({ href: link.getAttribute('href'), text: link.childNodes[1]?.textContent?.trim() })));
  expect(localLinks).toEqual([
    { href: '#game', text: 'Game' },
    { href: '#lab', text: 'Lab' },
  ]);

  const lab = page.getByTestId('lab-workbench');
  await expect(lab).toBeVisible();
  expect(await lab.evaluate((element) => element.closest('.game-frame') === null)).toBe(true);
  for (const testId of [
    'simulation-speed', 'compare-schemes', 'saved-comparison-select', 'export-profile-archive',
    'import-profile-archive', 'export-experiment-archive', 'import-experiment-archive', 'export-replay', 'import-replay',
  ]) await expect(lab.getByTestId(testId)).toBeVisible();

  await page.getByTestId('menu-options').click();
  const options = page.getByTestId('game-options');
  await expect(options.getByTestId('options-help')).toBeVisible();
  await expect(options.getByTestId('options-sound-toggle')).toBeVisible();
  await expect(options.locator('button[data-action]')).toHaveCount(3);
  for (const testId of [
    'simulation-speed', 'compare-schemes', 'export-profile-archive', 'export-experiment-archive', 'export-replay',
  ]) await expect(options.getByTestId(testId)).toHaveCount(0);
  await options.getByTestId('campaign-menu-back').click();

  await shell.evaluate((element) => element.shadowRoot?.querySelector<HTMLAnchorElement>('a[href="#lab"]')?.click());
  await expect(page).toHaveURL(/#lab$/);
  await expect(lab).toBeInViewport();
});

test('uses parchment and wood materials with readable desktop and narrow-screen lab layouts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const lab = page.getByTestId('lab-workbench');
  const cards = lab.locator('.lab-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toHaveCSS('background-image', /gng_hud_2_textbox_large\.png/);
  await expect(lab.getByTestId('compare-schemes')).toHaveCSS('background-image', /gng_startmenu_2_menu_1_button\.png/);
  await expect(lab.getByTestId('import-profile-archive')).toHaveCSS('color', 'rgb(255, 248, 230)');

  const desktopGeometry = await cards.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
  }));
  expect(desktopGeometry[0]!.x + desktopGeometry[0]!.width).toBeLessThanOrEqual(desktopGeometry[1]!.x + 1);

  await page.setViewportSize({ width: 360, height: 800 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const narrowGeometry = await cards.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
  }));
  expect(narrowGeometry[1]!.y).toBeGreaterThanOrEqual(narrowGeometry[0]!.y + narrowGeometry[0]!.height);
  expect(narrowGeometry.every((bounds) => bounds.x >= 0 && bounds.x + bounds.width <= 360)).toBe(true);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(lab.getByRole('heading', { name: '实验室' })).toBeVisible();
  await expect(lab.getByTestId('compare-schemes')).toContainText('开始比较');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
