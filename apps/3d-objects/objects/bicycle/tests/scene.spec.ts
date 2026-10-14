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
  await expect(page.locator('#viewer')).toHaveAttribute('data-state', 'loaded', { timeout: 15000 });
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
  await expect(page.getByRole('button', { name: '开始骑行' })).toBeEnabled({ timeout: 15000 });

  await page.locator('#accelerate-control').click();
  await expect(page.locator('#speed-value')).not.toHaveText('0.0 km/h', { timeout: 5000 });
  await page.locator('#front-brake-control').click();
  await expect(page.locator('#speed-value')).toHaveText('0.0 km/h', { timeout: 5000 });
  await page.locator('#ride-toggle').click();
  const speedValue = page.locator('#speed-value');
  await expect.poll(async () => Number((await speedValue.innerText()).split(' ')[0]), { timeout: 10000 }).toBeGreaterThan(1);
  await page.locator('#front-brake-control').click();
  await expect(speedValue).toHaveText('0.0 km/h', { timeout: 15000 });

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
  await page.getByRole('button', { name: '收起侧撑' }).click();
  await page.getByRole('button', { name: '放倒自行车' }).click();
  await expect(page.locator('#ride-state')).toContainText('已放倒');
  await expect(page.getByRole('button', { name: '扶起自行车' })).toBeEnabled();
  await page.getByRole('button', { name: '扶起自行车' }).click();
  await expect(page.locator('#ride-state')).toContainText('已停车');

  await page.getByRole('button', { name: '开始骑行' }).click();
  await expect(page.locator('#ride-state')).toContainText('骑行中');
  await page.getByRole('button', { name: '停车' }).click();
  await expect(page.locator('#ride-state')).toContainText('已停车');
  await expect(page.locator('#speed-value')).toHaveText('0.0 km/h', { timeout: 15000 });
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

test('本地纹理加载失败会显示错误并可重试', async ({ page }) => {
  let failed = false;
  await page.route('**/*Metal012_1K-JPG_NormalGL*.jpg', (route) => {
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
