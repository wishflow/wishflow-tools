import { expect as baseExpect, test } from '@playwright/test';

const appPath = '/python-interpreter-lab/';
const expect = baseExpect.configure({ timeout: 10_000 });

async function chooseTeachingVm(page: import('@playwright/test').Page) {
  await page.goto(appPath);
  await page.getByRole('combobox', { name: 'Execution view' }).selectOption('teaching');
  await expect(page.getByText('Ready to compile teaching program')).toBeVisible();
}

async function selectSourceLineGroup(
  page: import('@playwright/test').Page,
  line: number,
) {
  const history = page.getByRole('slider', { name: 'Source-step history' });
  await history.focus();
  await history.press('Home');
  for (let index = 0; index < 500; index += 1) {
    const valueText = await history.getAttribute('aria-valuetext');
    if (valueText?.includes(`line ${line}`)) return;
    await history.press('ArrowRight');
  }
  throw new Error(`Source line ${line} was not present in the observation history.`);
}

test('browses source-step groups and selects a recorded instruction snapshot', async ({ page }) => {
  await chooseTeachingVm(page);
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill('items = [1]\nalias = items\nitems[0] = 9\nprint(alias[0])');
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await page.getByRole('button', { name: 'Run teaching program' }).click();
  await expect(page.getByText('Teaching program finished').first()).toBeVisible();

  const history = page.getByRole('slider', { name: 'Source-step history' });
  await expect(history).toHaveAttribute('min', '0');
  await selectSourceLineGroup(page, 2);
  await expect(page.locator('.teaching-observation-summary')).toContainText('alias');
  await expect(page.locator('.teaching-observation-change-list')).toContainText('alias');
  await expect(page.locator('.teaching-observation-change-list')).not.toContainText('items');

  await selectSourceLineGroup(page, 3);
  const selectedSource = await source.evaluate((element) => {
    const editor = element as HTMLTextAreaElement;
    return editor.value.slice(editor.selectionStart, editor.selectionEnd);
  });
  expect(selectedSource).toBe('items[0] = 9');
  const recordedInstructions = page.locator('.teaching-observation-instructions');
  if (await recordedInstructions.getAttribute('open') === null) await recordedInstructions.locator('summary').click();
  const intermediate = page.getByRole('button', { name: /LOAD_CONST/ }).first();
  await expect(intermediate).toBeVisible();
  await intermediate.click();

  await expect(page.locator('.teaching-observation-status')).toContainText('Instruction snapshot within this source step');
  await expect(page.locator('.teaching-instruction-table tbody tr.is-vm-current')).toContainText('LOAD_CONST');

  const mutation = page.getByRole('button', { name: /STORE_SUBSCR/ });
  await expect(mutation).toBeVisible();
  await mutation.click();

  await expect(page.locator('.teaching-observation-status')).toContainText('Completed source step');
  await expect(page.locator('.teaching-current-action')).toContainText('LOAD_NAME alias');
  await expect(page.locator('.teaching-instruction-table tbody tr.is-vm-current')).toContainText('STORE_SUBSCR');
  await expect(page.locator('.teaching-observation-change-list')).toContainText('9');
  await expect(page.locator('#teaching-heap-object-1')).toContainText('9');
  await expect(page.locator('.teaching-observation-instructions button[aria-pressed="true"]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('slider', { name: '源码步进历史' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '源码步进说明' })).toBeVisible();
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await expect(page.getByRole('slider', { name: 'Source-step history' })).toBeVisible();
});

test('explains a breakpoint as a pause before the selected instruction', async ({ page }) => {
  await chooseTeachingVm(page);
  await page.getByRole('textbox', { name: 'Python source' }).fill('value = 1\nvalue = 2');
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  const instructionDetails = page.locator('.teaching-instruction-disclosure');
  await instructionDetails.locator('summary').click();
  await page.getByRole('button', { name: 'Set source breakpoint at line 2' }).click();
  await page.getByRole('button', { name: 'Run teaching program' }).click();

  await expect(page.getByText('Teaching VM paused').first()).toBeVisible();
  await expect(page.locator('.teaching-observation-status')).toContainText('Breakpoint');
  await expect(page.locator('.teaching-observation-summary')).toContainText('has not run');
  await expect(page.locator('.teaching-instruction-table tbody tr.is-vm-breakpoint')).toContainText('LOAD_CONST');
});

test('uses source-step history to return to the execution head before continuing', async ({ page }) => {
  await chooseTeachingVm(page);
  await page.getByRole('textbox', { name: 'Python source' }).fill('a = 1\nb = 2\nprint(a + b)');
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await page.getByRole('button', { name: 'Step one instruction' }).click();

  const history = page.getByRole('slider', { name: 'Source-step history' });
  await history.focus();
  await history.press('Home');
  await expect(page.locator('.teaching-history-state')).toContainText('Viewing history. Return to the head before continuing.');
  await page.getByRole('button', { name: 'Continue teaching program' }).click();
  await expect(page.locator('.teaching-history-state')).toContainText('Viewing the current execution head.');
  await expect(page.locator('.teaching-output')).toHaveText('3');
});
