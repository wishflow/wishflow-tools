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

test('uses original parchment cards without nested boxes across screen sizes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const lab = page.getByTestId('lab-workbench');
  const cards = lab.locator('.lab-card');
  await expect(cards).toHaveCount(3);
  await expect(lab).toHaveCSS('background-image', 'none');
  await expect(lab).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(lab).toHaveCSS('border-width', '0px');
  await expect(lab).toHaveCSS('border-radius', '0px');
  await expect(lab).toHaveCSS('box-shadow', 'none');
  for (const card of await cards.all()) {
    await expect(card).toHaveCSS('background-image', /gng_hud_2_textbox_large\.png/);
  }
  const parchment = await cards.first().evaluate(async (card) => {
    const imageUrl = getComputedStyle(card).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if (!imageUrl) return null;
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    return { path: new URL(imageUrl, document.baseURI).pathname, width: image.naturalWidth, height: image.naturalHeight };
  });
  expect(parchment).toEqual({ path: '/assets/gng_hud_2_textbox_large.png', width: 384, height: 192 });
  await expect(lab).toHaveCSS('color', 'rgb(57, 40, 23)');
  const nestedPanels = lab.locator([
    '.experiment-panel', '.experiment-empty-state', '.experiment-report', '.lab-speed-card',
    '.lab-saved-comparisons', '.campaign-profile-archive', '.lab-experiment-archive', '.replay-panel',
  ].join(','));
  for (const panel of await nestedPanels.all()) {
    await expect(panel).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(panel).toHaveCSS('border-width', '0px');
    await expect(panel).toHaveCSS('box-shadow', 'none');
  }
  await expect(lab.locator('.experiment-table-scroll')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(lab.locator('.experiment-table-scroll')).toHaveCSS('border-width', '0px');
  await expect(lab.locator('.lab-card > h3').first()).toHaveCSS('background-image', /gng_startmenu_2_menu_1_button\.png/);
  await expect(lab.getByTestId('compare-schemes')).toHaveCSS('background-image', /gng_startmenu_2_menu_1_button\.png/);
  await expect(lab.getByTestId('import-profile-archive')).toHaveCSS('color', 'rgb(255, 248, 230)');

  const desktopGeometry = await cards.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    const heading = element.querySelector<HTMLElement>(':scope > h3')?.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, headingTop: heading?.top };
  }));
  expect(desktopGeometry[0]!.x + desktopGeometry[0]!.width).toBeLessThanOrEqual(desktopGeometry[1]!.x + 1);
  expect(desktopGeometry[1]!.x + desktopGeometry[1]!.width).toBeLessThanOrEqual(desktopGeometry[2]!.x + 1);
  expect(desktopGeometry.every((bounds) => Math.abs(bounds.y - desktopGeometry[0]!.y) <= 1)).toBe(true);
  expect(desktopGeometry.every((bounds) => bounds.headingTop !== undefined && bounds.headingTop - bounds.y >= 48)).toBe(true);

  await page.setViewportSize({ width: 900, height: 900 });
  const tabletGeometry = await cards.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
  }));
  expect(Math.abs(tabletGeometry[0]!.y - tabletGeometry[1]!.y)).toBeLessThanOrEqual(1);
  expect(tabletGeometry[2]!.y).toBeGreaterThanOrEqual(tabletGeometry[0]!.y + tabletGeometry[0]!.height);
  expect(tabletGeometry[2]!.width).toBeGreaterThan(tabletGeometry[0]!.width * 1.8);
  const archiveGeometry = await lab.locator('.lab-archive-grid > section').evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, width: bounds.width };
  }));
  expect(archiveGeometry).toHaveLength(3);
  expect(archiveGeometry.every((bounds) => Math.abs(bounds.y - archiveGeometry[0]!.y) <= 1)).toBe(true);
  expect(archiveGeometry[0]!.x).toBeLessThan(archiveGeometry[1]!.x);
  expect(archiveGeometry[1]!.x).toBeLessThan(archiveGeometry[2]!.x);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const labLayer = await lab.evaluate((element) => ({
    position: getComputedStyle(element).position,
    zIndex: Number(getComputedStyle(element).zIndex),
  }));
  expect(labLayer).toEqual({ position: 'relative', zIndex: 81 });

  const sitePet = page.locator('.usagi-widget');
  if (await sitePet.count()) {
    const petZIndex = Number(await sitePet.evaluate((element) => getComputedStyle(element).zIndex));
    expect(labLayer.zIndex).toBeGreaterThan(petZIndex);
    const petBounds = await sitePet.boundingBox();
    const titleBounds = await lab.getByRole('heading', { name: 'Experiment laboratory' }).boundingBox();
    if (petBounds && titleBounds) {
      const left = Math.max(petBounds.x, titleBounds.x);
      const top = Math.max(petBounds.y, titleBounds.y);
      const right = Math.min(petBounds.x + petBounds.width, titleBounds.x + titleBounds.width);
      const bottom = Math.min(petBounds.y + petBounds.height, titleBounds.y + titleBounds.height);
      if (left < right && top < bottom) {
        const targetIsWorkbench = await page.evaluate(({ x, y }) => {
          return Boolean(document.elementFromPoint(x, y)?.closest('.lab-workbench'));
        }, { x: (left + right) / 2, y: (top + bottom) / 2 });
        expect(targetIsWorkbench).toBe(true);
      }
    }
  }

  const narrowGeometry = await cards.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    const heading = element.querySelector<HTMLElement>(':scope > h3')?.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, headingTop: heading?.top };
  }));
  expect(narrowGeometry[1]!.y).toBeGreaterThanOrEqual(narrowGeometry[0]!.y + narrowGeometry[0]!.height);
  expect(narrowGeometry[2]!.y).toBeGreaterThanOrEqual(narrowGeometry[1]!.y + narrowGeometry[1]!.height);
  expect(narrowGeometry.every((bounds) => bounds.x >= 0 && bounds.x + bounds.width <= 390)).toBe(true);
  expect(narrowGeometry.every((bounds) => bounds.headingTop !== undefined && bounds.headingTop - bounds.y >= 48)).toBe(true);
  const archiveStack = await lab.locator('.lab-archive-grid > section').evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
  }));
  expect(archiveStack[1]!.y).toBeGreaterThanOrEqual(archiveStack[0]!.y + archiveStack[0]!.height);
  expect(archiveStack[2]!.y).toBeGreaterThanOrEqual(archiveStack[1]!.y + archiveStack[1]!.height);
  expect(archiveStack.every((bounds) => bounds.x >= 0 && bounds.x + bounds.width <= 390)).toBe(true);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(lab.getByRole('heading', { name: '实验室' })).toBeVisible();
  await expect(lab.getByTestId('compare-schemes')).toContainText('开始比较');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('keeps comparison inputs, live results, saved reports, and archives in separate sections', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const lab = page.getByTestId('lab-workbench');
  const setup = lab.locator('.lab-setup-card');
  const results = lab.locator('.lab-results-card');
  const archive = lab.locator('.lab-data-card');
  const emptyState = lab.getByTestId('experiment-empty-state');
  const report = lab.getByTestId('experiment-report');

  await expect(setup.getByTestId('experiment-cash-reward')).toBeVisible();
  await expect(setup.getByTestId('experiment-sample-count')).toBeVisible();
  await expect(setup.getByTestId('compare-schemes')).toBeVisible();
  await expect(emptyState).toBeVisible();
  await expect(report).toBeHidden();
  await expect(results.getByTestId('simulation-speed')).toBeVisible();
  await expect(archive.getByTestId('saved-comparison-select')).toBeVisible();
  await expect(archive.getByTestId('export-profile-archive')).toBeVisible();
  await expect(archive.getByTestId('export-experiment-archive')).toBeVisible();
  await expect(archive.getByTestId('import-replay')).toBeAttached();

  await setup.getByTestId('experiment-sample-count').selectOption('1');
  await setup.getByTestId('compare-schemes').click();
  await expect(report).toBeVisible({ timeout: 20_000 });
  await expect(emptyState).toBeHidden();
  const desktopTableMetrics = await lab.locator('.experiment-table-scroll').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(desktopTableMetrics.scrollWidth).toBeLessThanOrEqual(desktopTableMetrics.clientWidth);
  const summary = await report.getByTestId('experiment-report-summary').textContent();
  await expect(report.getByTestId('save-comparison')).toBeEnabled();

  await report.getByTestId('save-comparison').click();
  await expect(archive.getByTestId('saved-comparison-status')).toContainText('saved');
  await expect(archive.getByTestId('saved-comparison-select')).not.toHaveValue('');
  await archive.getByTestId('open-comparison').click();
  await expect(archive.getByTestId('saved-comparison-status')).toContainText('opened');
  await expect(report.getByTestId('experiment-report-summary')).toHaveText(summary ?? '');

  await page.setViewportSize({ width: 390, height: 844 });
  const tableViewport = lab.locator('.experiment-table-scroll');
  const tableScrollMetrics = await tableViewport.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX,
  }));
  expect(tableScrollMetrics.overflowX).toBe('auto');
  expect(tableScrollMetrics.scrollWidth).toBeGreaterThan(tableScrollMetrics.clientWidth);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
