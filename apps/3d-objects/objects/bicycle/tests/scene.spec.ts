import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('wishflow-tools-language', 'zh'));
});

test('自行车模块自动发现并提供检视、拆解、选中和操作模式', async ({ page }) => {
  test.setTimeout(60_000);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('.catalog-count strong')).toHaveText('02');
  await page.getByRole('link', { name: /城市通勤自行车/ }).click();
  await expect(page).toHaveURL(/#\/objects\/bicycle$/);
  await expect(page.getByRole('heading', { name: '城市通勤自行车', exact: true })).toBeVisible();
  const viewer = page.locator('#viewer');
  await expect(viewer).toHaveAttribute('data-state', 'loaded', { timeout: 15000 });
  const clearanceFor = async (attribute: string) => {
    const value = await viewer.getAttribute(attribute);
    return value === null ? Number.POSITIVE_INFINITY : Number(value);
  };
  for (const attribute of ['data-front-tire-clearance-mm', 'data-rear-tire-clearance-mm']) {
    await expect.poll(() => clearanceFor(attribute)).toBeLessThanOrEqual(2);
    await expect.poll(() => clearanceFor(attribute)).toBeGreaterThanOrEqual(-2);
  }
  const canvas = page.locator('#viewer canvas');
  await expect(canvas).toBeVisible();
  const canvasBounds = await canvas.boundingBox();
  expect(canvasBounds).not.toBeNull();
  await page.mouse.click(canvasBounds!.x + canvasBounds!.width * 0.52, canvasBounds!.y + canvasBounds!.height * 0.35);
  await expect(page.locator('#component-title')).toHaveText('上管');

  await page.getByRole('button', { name: '拆解全部' }).click();
  await expect(page.locator('#explode-value')).toHaveText('100%');
  await page.getByRole('button', { name: '完整装配' }).click();
  await expect(page.locator('#explode-value')).toHaveText('0%');

  await page.getByRole('button', { name: '操作' }).click();
  await expect(page.locator('#ride-state')).toContainText('已停车');
  const speedRange = page.locator('#speed-range');
  await expect(speedRange).toBeEnabled();
  await expect(page.locator('#mode-guide')).toContainText('0 km/h 立即停止');
  await expect(page.locator('#ride-toggle')).toHaveCount(0);
  const speedValue = page.locator('#speed-value');
  await speedRange.focus();
  await page.keyboard.press('Home');
  for (let step = 0; step < 13; step += 1) await page.keyboard.press('ArrowRight');
  await expect(speedValue).toHaveText('6.5 km/h');
  await expect(page.locator('#ride-state')).toContainText('骑行中');
  const startingPhase = Number(await viewer.getAttribute('data-route-phase'));
  await expect.poll(async () => Number(await viewer.getAttribute('data-route-phase')), { timeout: 3000 }).not.toBe(startingPhase);
  await page.keyboard.press('Home');
  await expect(speedValue).toHaveText('0.0 km/h');
  await expect(page.locator('#ride-state')).toContainText('已停车');

  await page.keyboard.press('End');
  await expect(speedValue).toHaveText('12.0 km/h');
  await page.locator('#front-brake-control').click();
  await expect(speedValue).toHaveText('0.0 km/h');
  await speedRange.focus();
  await page.keyboard.press('End');
  await expect(speedValue).toHaveText('12.0 km/h');
  await page.locator('#front-brake-control').click();
  await expect(speedValue).toHaveText('0.0 km/h');

  await page.getByRole('button', { name: '升挡' }).click();
  await expect(page.locator('#gear-value')).toContainText('7 / 8');
  const steering = page.locator('#steering-range');
  await steering.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.steering-section output')).toHaveText('1°');
  await page.getByRole('button', { name: '车把回正' }).click();
  await expect(page.locator('.steering-section output')).toHaveText('0°');

  await page.getByRole('button', { name: '展开侧撑' }).click();
  await expect(page.getByRole('button', { name: '收起侧撑' })).toBeVisible();
  await expect.poll(() => clearanceFor('data-stand-clearance-mm'), { timeout: 10000 }).toBeLessThanOrEqual(5);
  await expect.poll(() => clearanceFor('data-stand-clearance-mm'), { timeout: 10000 }).toBeGreaterThanOrEqual(-5);
  await expect.poll(() => clearanceFor('data-stand-foot-contact-error-mm'), { timeout: 10000 }).toBeLessThanOrEqual(2);
  await page.getByRole('button', { name: '收起侧撑' }).click();
  await page.getByRole('button', { name: '放倒自行车' }).click();
  await expect(page.locator('#ride-state')).toContainText('已放倒');
  await expect(page.getByRole('button', { name: '扶起自行车' })).toBeEnabled();
  await page.getByRole('button', { name: '扶起自行车' }).click();
  await expect(page.locator('#ride-state')).toContainText('已停车');

  await speedRange.focus();
  await page.keyboard.press('End');
  await expect(page.locator('#ride-state')).toContainText('骑行中');
  await page.keyboard.press('Home');
  await expect(page.locator('#ride-state')).toContainText('已停车');
  await expect(page.locator('#speed-value')).toHaveText('0.0 km/h');
  await page.getByRole('button', { name: '检视' }).click();
  await expect(page.locator('#explode-range')).toBeEnabled({ timeout: 15000 });
  expect(pageErrors).toEqual([]);
});

test('360px 窄屏下模型不横向溢出，操作控制可折叠', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#/objects/bicycle');
  await expect(page.locator('#viewer')).toHaveAttribute('data-state', 'loaded', { timeout: 15000 });

  const layout = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    canvasWidth: document.querySelector('#viewer canvas')?.getBoundingClientRect().width ?? 0,
  }));
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.canvasWidth).toBeGreaterThan(0);
  await expect(page.locator('#control-panel')).toBeVisible();
});

test('本地 GLB 加载失败会显示错误并可重试', async ({ page }) => {
  let failed = false;
  await page.route('**/scene-*.glb', (route) => {
    if (!failed) {
      failed = true;
      return route.abort();
    }
    return route.continue();
  });
  await page.goto('/#/objects/bicycle');
  await expect(page.locator('#viewer')).toHaveAttribute('data-state', 'error', { timeout: 15000 });
  await expect(page.locator('#error-message')).toBeVisible();
  await page.getByRole('button', { name: '重新加载' }).click();
  await expect(page.locator('#viewer')).toHaveAttribute('data-state', 'loaded', { timeout: 15000 });
});
