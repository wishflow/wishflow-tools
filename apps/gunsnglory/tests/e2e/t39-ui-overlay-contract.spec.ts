import { expect, test } from './auto-continue-fixtures';
import { expectInteractiveGameOverlay } from './helpers';

test('recruit confirmation uses original artwork and confirms the purchase without click-through', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?testBattle=1&testRecruit=1');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $100');

  const recruitButton = page.locator('[data-action="recruit-unit"]');
  await expect(recruitButton).toBeVisible();
  await recruitButton.click();

  const confirmation = page.getByTestId('recruit-confirmation');
  await expect(confirmation).toBeVisible();
  await expect(page.locator('#recruit-confirmation-title')).toHaveText('Recruit Gunslinger for $75?');
  await expectInteractiveGameOverlay(page, 'recruit', 'recruit-confirmation', '[data-action="cancel-recruit"]');
  await expect(page.getByTestId('recruit-confirmation-art')).toHaveJSProperty('naturalWidth', 384);
  await expect(page.getByTestId('confirm-recruit-icon')).toHaveJSProperty('naturalWidth', 32);
  await expect(page.getByTestId('cancel-recruit-icon')).toHaveJSProperty('naturalWidth', 32);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.locator('#recruit-confirmation-title')).toHaveText('花费 $75 招募枪手？');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByTestId('wave-status')).toContainText('Cash $100');

  await recruitButton.click();
  await page.getByRole('button', { name: 'Recruit' }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByTestId('wave-status')).toContainText('Cash $25');
  await expect(page.getByTestId('recruit-status')).toHaveText('Gunslinger recruited for $75; held in the spawn pool.');
  await expect(page.getByTestId('overlay-host')).toBeHidden();
});

test('recruit confirmation fits the phone game frame in both interface languages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?testBattle=1&testRecruit=1');
  await page.locator('[data-action="recruit-unit"]').click();

  const confirmation = page.getByTestId('recruit-confirmation');
  await expect(confirmation).toBeVisible();
  await expectInteractiveGameOverlay(page, 'recruit', 'recruit-confirmation', '[data-action="cancel-recruit"]');
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.locator('#recruit-confirmation-title')).toHaveText('花费 $75 招募枪手？');
  const contentFits = await confirmation.evaluate((dialog) => {
    const content = dialog.querySelector<HTMLElement>('.game-confirmation-content');
    if (!content) return false;
    const contentBounds = content.getBoundingClientRect();
    return [...dialog.querySelectorAll('button')].every((button) => {
      const bounds = button.getBoundingClientRect();
      return bounds.left >= contentBounds.left && bounds.right <= contentBounds.right
        && bounds.top >= contentBounds.top && bounds.bottom <= contentBounds.bottom;
    });
  });
  expect(contentFits).toBe(true);
  await confirmation.getByRole('button', { name: '取消' }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByTestId('wave-status')).toContainText('现金 $100');
});

test('keeps the settlement parchment and wood actions inside a phone-sized game frame', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?testBattle=1');
  await page.getByTestId('open-single-wave-sample').click();
  const speed = page.getByRole('slider', { name: 'Simulation speed' });
  await speed.focus();
  await speed.press('End');
  await page.getByTestId('start-wave').click();

  const settlement = page.getByTestId('settlement');
  await expect(settlement).toBeVisible();
  await expectInteractiveGameOverlay(page, 'settlement', 'settlement', '[data-action="restart-sample"]');
  await expect(page.getByTestId('settlement-art')).toHaveJSProperty('naturalWidth', 384);
  await expect(page.getByTestId('settlement-campaign-menu')).toHaveClass(/campaign-wood-button/);
  await expect(page.locator('.settlement-panel .campaign-wood-button')).toHaveCount(3);
  expect(await page.getByTestId('settlement-campaign-menu').evaluate((button) => getComputedStyle(button).backgroundImage))
    .toContain('gng_startmenu_2_menu_1_button.png');
  const settlementLabelsStayOnOneLine = await page.locator('.settlement-panel .campaign-wood-button:not([hidden])')
    .evaluateAll((buttons) => buttons.every((button) => {
      const label = document.createRange();
      label.selectNodeContents(button);
      return label.getClientRects().length === 1;
    }));
  expect(settlementLabelsStayOnOneLine).toBe(true);
  const resultTextFits = await settlement.evaluate((element) => {
    const content = element.querySelector<HTMLElement>('.settlement-panel-content');
    if (!content) return false;
    return content.scrollWidth <= content.clientWidth && content.scrollHeight <= content.clientHeight;
  });
  expect(resultTextFits).toBe(true);

  await page.getByRole('button', { name: /Restart/ }).click();
  await expect(settlement).toBeHidden();
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1 ready');
});
