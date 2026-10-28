import { expect, test } from '@playwright/test';

test('exports a settled battle and verifies its replay without saving the replay result', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await expect(speed).toHaveValue('4');

  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('settlement-outcome')).toHaveText('Victory');
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Result saved to this browser.');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-replay').click(),
  ]);
  const replayPath = await download.path();
  expect(replayPath).not.toBeNull();
  await page.getByTestId('import-replay').setInputFiles(replayPath!);

  await expect(page.getByTestId('replay-status')).toContainText('Replay verified');
  await expect(page.getByTestId('replay-status')).toContainText('Victory');
  await expect(page.getByTestId('export-replay')).toBeDisabled();
  await expect(page.getByTestId('settlement-outcome')).toHaveText('Victory');
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Replay result · not added to the saved profile.');
  await expect(page.getByTestId('profile-status')).toContainText('Cow Gulch sample complete · Best $50');

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByTestId('replay-status')).toContainText('重放验证通过');
  await expect(page.getByTestId('settlement-save-status')).toHaveText('重放结果 · 不会写入已保存档案。');
  await expect(page.getByText('导入重放文件', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  await page.getByTestId('import-replay').setInputFiles({
    name: 'missing-version.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await expect(page.getByTestId('replay-status')).toHaveText('Replay is missing a required version.');
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Replay result · not added to the saved profile.');
  await expect(page.getByTestId('profile-status')).toContainText('Cow Gulch sample complete · Best $50');

  await page.getByRole('button', { name: 'Restart this sample' }).click();
  await expect(page.getByTestId('settlement')).toBeHidden();
  await page.getByRole('button', { name: 'Start one pioneer sample' }).click();
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Result saved to this browser.');
});
