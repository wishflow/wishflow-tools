import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function waitForRunState(page: Page, state: string): Promise<void> {
  await expect(page.locator('.run-status')).toContainText(state, { timeout: 10_000 });
}

async function installWorkerConfigPatch(page: Page, patch: Record<string, unknown>): Promise<void> {
  await page.addInitScript((configPatch) => {
    const originalPostMessage = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function postMessage(
      this: Worker,
      message: unknown,
      transferOrOptions?: Transferable[] | StructuredSerializeOptions,
    ) {
      if (message && typeof message === 'object' && 'type' in message && message.type === 'start' && 'config' in message) {
        const startMessage = message as { config: Record<string, unknown> };
        startMessage.config = { ...startMessage.config, ...configPatch };
      }
      return (originalPostMessage as unknown as (
        this: Worker,
        message: unknown,
        options?: Transferable[] | StructuredSerializeOptions,
      ) => void).call(this, message, transferOrOptions);
    } as typeof Worker.prototype.postMessage;
  }, patch);
}

test('设置分组可切换，开始后参数离开编辑态，暂停和继续保持同一轮', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '每次碰撞，都是下一步。' })).toBeVisible();
  await page.getByRole('tab', { name: /发射/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('初速度大小');
  await page.getByRole('tab', { name: /规则/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('恢复系数');
  await page.getByRole('tab', { name: /场地/ }).click();

  await page.getByRole('button', { name: '开始实验' }).click();
  await waitForRunState(page, '运行中');
  await expect(page.getByRole('button', { name: '暂停' })).toBeVisible();
  await expect(page.getByRole('button', { name: '结束实验' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /发射/ })).toHaveCount(0);

  const exportPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出本轮复现参数' }).click();
  const exportFile = await exportPromise;
  const runExport = JSON.parse(await readFile((await exportFile.path())!, 'utf8')) as { config: { seed: string }; observation: { runState: string } };
  expect(runExport.config.seed).toBe('BALL-0426');
  expect(runExport.observation.runState).toBe('running');

  await page.getByRole('button', { name: '暂停' }).click();
  await waitForRunState(page, '已暂停');
  await expect(page.getByRole('button', { name: '继续' })).toBeVisible();
  await expect(page.getByRole('button', { name: '同条件重开' })).toHaveCount(0);
  await page.getByRole('button', { name: '继续' }).click();
  await waitForRunState(page, '运行中');
});

test('结束确认可取消或确认，结束结果可保留并同条件重跑', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始实验' }).click();
  await waitForRunState(page, '运行中');
  await page.getByRole('button', { name: '暂停' }).click();
  await waitForRunState(page, '已暂停');

  await page.getByRole('button', { name: '结束实验' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await waitForRunState(page, '已暂停');

  await page.getByRole('button', { name: '结束实验' }).click();
  await dialog.getByRole('button', { name: '结束并保留结果' }).click();
  await expect(page.getByText('实验已结束', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '同条件重跑' })).toBeVisible();
  await page.getByRole('button', { name: '同条件重跑' }).click();
  await waitForRunState(page, '运行中');
});

test('修改设置会保留上一轮结果，当前参数可以导出为 JSON', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始实验' }).click();
  await waitForRunState(page, '运行中');
  await page.getByRole('button', { name: '结束实验' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '结束并保留结果' }).click();
  await expect(page.getByText('实验已结束', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '修改设置' }).click();

  await expect(page.getByRole('complementary', { name: '上一轮结果' })).toContainText('2');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出参数' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^ball-growth-.*\.json$/);
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8')) as { config: { seed: string }; formatVersion: number };
  expect(exported.formatVersion).toBe(4);
  expect(exported.config.seed).toBe('BALL-0426');
});

test('达到人口目标时自动结束并显示原因', async ({ page }) => {
  await installWorkerConfigPatch(page, { maxPopulation: 2 });
  await page.goto('/');
  await page.getByRole('button', { name: '开始实验' }).click();
  await expect(page.getByText('达到人口目标', { exact: true })).toBeVisible();
});

test('只剩一球时自动结束并显示原因', async ({ page }) => {
  await installWorkerConfigPatch(page, {
    maxPopulation: 100,
    gapCount: 1,
    gapWidthRatio: 1.05,
    initialSpeed: 24,
    speedSpread: 0,
    initialDirection: 270,
    directionSpread: 0,
    birthProbability: 0,
  });
  await page.goto('/');
  await page.getByRole('button', { name: '开始实验' }).click();
  await expect(page.getByText('只剩 1 颗球', { exact: true })).toBeVisible({ timeout: 10_000 });
});

test('没有球时自动结束并显示原因', async ({ page }) => {
  await installWorkerConfigPatch(page, { initialCount: 0 });
  await page.goto('/');
  await page.getByRole('button', { name: '开始实验' }).click();
  await expect(page.getByText('场内没有球', { exact: true })).toBeVisible();
});

for (const viewport of [
  { name: 'desktop', width: 1365, height: 768 },
  { name: 'phone', width: 390, height: 844 },
]) {
  test(`${viewport.name} 设置界面一屏容纳且不横向溢出`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    const dimensions = await page.evaluate(() => {
      const screen = document.querySelector<HTMLElement>('.setup-screen');
      const panel = document.querySelector<HTMLElement>('.settings-panel');
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        screenHeight: screen?.scrollHeight ?? 0,
        viewportHeight: screen?.clientHeight ?? 0,
        panelHeight: panel?.scrollHeight ?? 0,
        panelClientHeight: panel?.clientHeight ?? 0,
      };
    });
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    expect(dimensions.screenHeight).toBeLessThanOrEqual(dimensions.viewportHeight);
    expect(dimensions.panelHeight).toBeLessThanOrEqual(dimensions.panelClientHeight);

    await page.getByRole('button', { name: '开始实验' }).click();
    await waitForRunState(page, '运行中');
    const runningDimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      screenHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    }));
    expect(runningDimensions.documentWidth).toBeLessThanOrEqual(runningDimensions.viewportWidth);
    expect(runningDimensions.screenHeight).toBeLessThanOrEqual(runningDimensions.viewportHeight);
  });
}
