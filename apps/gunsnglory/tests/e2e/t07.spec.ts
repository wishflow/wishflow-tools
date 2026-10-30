import { expect, installAutoContinueCampaignWaveIntro, test } from './auto-continue-fixtures';

test('shows the original price and refuses a Gunslinger hire without charging Cow Gulch cash', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
  const recruit = page.getByRole('button', { name: 'Hire Gunslinger · $75' });
  await expect(recruit).toBeEnabled();
  await recruit.click();

  await expect(page.getByTestId('recruit-status')).toContainText('need $75, have $65');
  await expect(page.getByTestId('recruit-pool-status')).toHaveText('Recruit pool: empty');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
  await expect(page.getByTestId('recruit-confirmation')).not.toBeVisible();

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('button', { name: '招募枪手 · $75' })).toBeVisible();
  await expect(page.getByTestId('recruit-status')).toContainText('需要 $75，当前 $65');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
});

test('the recruitment control can be operated by touch on a phone-sized viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await installAutoContinueCampaignWaveIntro(page);
  try {
    await page.goto('/');
    const recruit = page.getByRole('button', { name: 'Hire Gunslinger · $75' });
    await expect(recruit).toBeEnabled();
    await recruit.tap();
    await expect(page.getByTestId('recruit-status')).toContainText('need $75, have $65');
    await expect(page.getByTestId('wave-status')).toContainText('Cash $65');
  } finally {
    await context.close();
  }
});
