import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('wishflow-tools-language', 'zh'));
});

test('小屋静态页面加载本地模型并支持拆解、显隐与复位', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '3D Objects' })).toBeVisible();
  await expect(page.locator('.catalog-count strong')).toHaveText('01');
  await expect(page.getByRole('link', { name: /木结构小屋/ })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  const sidebarToggle = page.getByRole('button', { name: '展开应用内导航' });
  await expect(sidebarToggle).toBeVisible();
  await expect(page.getByRole('navigation', { name: '应用内导航' })).toBeHidden();
  const initialLayout = await page.locator('wishflow-site-shell').evaluate((shell) => {
    const root = shell.shadowRoot;
    const workspace = root?.querySelector('.workspace');
    const content = root?.querySelector('.page-content');
    return {
      sidebarExpanded: workspace?.classList.contains('sidebar-expanded'),
      contentWidth: content?.getBoundingClientRect().width ?? 0,
      shellWidth: shell.getBoundingClientRect().width,
    };
  });
  expect(initialLayout.sidebarExpanded).toBe(false);
  expect(initialLayout.contentWidth).toBeGreaterThan(initialLayout.shellWidth * 0.9);
  await page.getByRole('link', { name: /木结构小屋/ }).click();
  await expect(page).toHaveURL(/#\/objects\/house$/);
  await expect(page.getByRole('heading', { name: '木结构小屋' })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('navigation', { name: '应用内导航' })).toBeHidden();
  await expect(page.getByRole('link', { name: 'Poly Haven · CC0' })).toHaveAttribute('href', 'https://polyhaven.com/');
  await expect(page.getByRole('link', { name: 'Poly Haven · CC0' })).toBeVisible();
  await sidebarToggle.click();
  const localNavigation = page.getByRole('navigation', { name: '应用内导航' });
  await expect(localNavigation).toBeVisible();
  await expect(localNavigation.getByRole('link', { name: '物体目录' })).toHaveAttribute('href', '#/');
  await expect(page.getByRole('button', { name: '收起应用内导航' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: '收起应用内导航' }).click();
  await expect(localNavigation).toBeHidden();
  const footerPosition = await page.locator('wishflow-site-shell').evaluate((shell) => {
    const footer = shell.shadowRoot?.querySelector('.footer');
    return footer ? getComputedStyle(footer).position : null;
  });
  expect(footerPosition).toBe('static');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'loaded', { timeout: 15000 });
  await expect(page.locator('#viewer canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: '复位视角、拆解进度和构件显隐' })).toBeEnabled();

  const explodeRange = page.locator('#explode-range');
  await expect(explodeRange).toBeEnabled();
  await explodeRange.focus();
  await page.keyboard.press('End');
  await expect(page.locator('#explode-value')).toHaveText('100%');
  await page.keyboard.press('Home');
  await expect(page.locator('#explode-value')).toHaveText('0%');
  const canvas = page.locator('#viewer canvas');
  const assembledImage = await canvas.screenshot();
  await explodeRange.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '100';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#explode-value')).toHaveText('100%');
  await page.waitForTimeout(150);
  const explodedImage = await canvas.screenshot();
  expect(explodedImage.equals(assembledImage)).toBe(false);

  const wallToggle = page.getByLabel('四面墙体');
  await expect(wallToggle).toBeChecked();
  await wallToggle.uncheck();
  await expect(wallToggle).not.toBeChecked();
  await page.waitForTimeout(150);
  const wallsHiddenImage = await canvas.screenshot();
  expect(wallsHiddenImage.equals(explodedImage)).toBe(false);
  await page.getByRole('button', { name: '显示全部' }).click();
  await page.waitForTimeout(150);
  const allVisibleImage = await canvas.screenshot();
  expect(allVisibleImage.equals(wallsHiddenImage)).toBe(false);

  await page.getByRole('button', { name: '复位视角、拆解进度和构件显隐' }).click();
  await expect(page.locator('#explode-value')).toHaveText('0%');
  await expect(wallToggle).toBeChecked();

  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('3D 画布没有可交互区域。');
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  await page.mouse.click(centerX, centerY + bounds.height * 0.12);
  await expect(page.locator('#component-title')).not.toHaveText('一座紧凑的小屋');
  await page.getByRole('button', { name: '复位视角、拆解进度和构件显隐' }).click();
  await expect(page.locator('#component-title')).toHaveText('一座紧凑的小屋');
  const resetImage = await canvas.screenshot();

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 70, centerY + 32, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const rotatedImage = await canvas.screenshot();
  expect(rotatedImage.equals(resetImage)).toBe(false);

  await page.mouse.move(centerX, centerY);
  await page.mouse.wheel(0, -320);
  await page.waitForTimeout(250);
  const zoomedImage = await canvas.screenshot();
  expect(zoomedImage.equals(rotatedImage)).toBe(false);

  await page.mouse.move(centerX, centerY);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(centerX + 45, centerY + 20, { steps: 5 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(250);
  const pannedImage = await canvas.screenshot();
  expect(pannedImage.equals(zoomedImage)).toBe(false);

  expect(pageErrors).toEqual([]);
});

test('360px 窄屏仍可查看模型并操作控件', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#/objects/house');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'loaded', { timeout: 15000 });
  await expect(page.locator('#viewer canvas')).toBeVisible();

  const layout = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    canvasWidth: document.querySelector('#viewer canvas')?.getBoundingClientRect().width ?? 0,
  }));
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.canvasWidth).toBeGreaterThan(0);

  await page.getByRole('button', { name: '完全拆解' }).click();
  await expect(page.locator('#explode-value')).toHaveText('100%');
});

test('模型加载失败时显示原因并提供重试入口', async ({ page }) => {
  let failFirstRequest = true;
  await page.route('**/*.glb', (route) => {
    if (failFirstRequest) {
      failFirstRequest = false;
      return route.abort();
    }
    return route.continue();
  });
  await page.goto('/#/objects/house');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'error', { timeout: 15000 });
  await expect(page.locator('#error-message')).toBeVisible();
  await page.getByRole('button', { name: '重新加载' }).click();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'loaded', { timeout: 15000 });
  await expect(page.locator('#error-message')).toBeHidden();
});

test('未知对象路由返回目录页', async ({ page }) => {
  await page.goto('/#/objects/not-found');
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole('heading', { name: '3D Objects' })).toBeVisible();
});
