import { expect, test } from '@playwright/test';

test('static page loads the local Blender scene and exposes viewer controls', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '你的 3D 场景' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveAttribute('data-state', 'loaded', { timeout: 15000 });
  await expect(page.locator('#viewer canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: '重置模型视角' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
