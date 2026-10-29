import { expect, test } from '@playwright/test';

const appPath = '/python-interpreter-lab/';

async function chooseTeachingVm(page: import('@playwright/test').Page) {
  await page.goto(appPath);
  await page.getByRole('combobox', { name: 'Execution view' }).selectOption('teaching');
  await expect(page.getByText('Ready to compile teaching program')).toBeVisible();
}

test('compiles teaching instructions, steps the value stack, prints, and browses history', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await chooseTeachingVm(page);

  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill('x = 1 + 2 * 3\nprint(x)');
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  const instructions = page.locator('.teaching-instruction-table');
  await expect(instructions.locator('tbody tr')).toHaveCount(9);
  await expect(instructions).toContainText('BINARY_MULTIPLY');
  await expect(instructions).toContainText('BINARY_ADD');
  await expect(page.getByRole('heading', { name: 'Teaching AST' })).toBeVisible();

  await page.getByRole('button', { name: 'Step one instruction' }).click();
  await expect(page.locator('.teaching-value-list li code')).toHaveText(['1']);
  await expect(instructions.locator('tbody tr').nth(0)).toHaveClass(/is-vm-current/);
  await expect(instructions.locator('tbody tr').nth(1)).toHaveClass(/is-vm-next/);
  await page.getByRole('button', { name: 'Step one instruction' }).click();
  await page.getByRole('button', { name: 'Step one instruction' }).click();
  await page.getByRole('button', { name: 'Step one instruction' }).click();
  await expect(page.locator('.teaching-value-list li code')).toHaveText(['1', '6']);

  const history = page.getByRole('slider', { name: 'Instruction history' });
  await history.focus();
  await history.press('Home');
  await expect(page.getByRole('status')).toContainText('Viewing history. Return to the head before continuing.');
  await expect(page.getByRole('button', { name: 'Step one instruction' })).toBeDisabled();
  await page.getByRole('button', { name: 'Return to execution head' }).click();
  await page.getByRole('button', { name: 'Run teaching program' }).click();
  await expect(page.getByText('Teaching program finished').first()).toBeVisible();
  await expect(page.locator('.teaching-output')).toHaveText('7');
  await expect(page.locator('.teaching-variable-list')).toContainText('x');
  expect(pageErrors).toEqual([]);

  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      elements: Array.from(document.querySelectorAll<HTMLElement>('body *'))
        .map((element) => ({ name: `${element.tagName.toLowerCase()}.${element.className}`, right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) }))
        .filter((element) => element.right > window.innerWidth + 1)
        .slice(0, 8),
    }));
    expect(overflow.width, `page should not scroll horizontally at ${width}px: ${JSON.stringify(overflow.elements)}`).toBeLessThanOrEqual(width);
  }

  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('combobox', { name: '执行视图' })).toHaveValue('teaching');
  await expect(page.getByRole('heading', { name: '教学 VM' })).toBeVisible();
  await expect(page.locator('.teaching-output')).toHaveText('7');
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await expect(page.getByRole('combobox', { name: 'Execution view' })).toHaveValue('teaching');
});

test('shows localized teaching syntax and runtime errors with source locations', async ({ page }) => {
  await chooseTeachingVm(page);
  const source = page.getByRole('textbox', { name: 'Python source' });

  await source.fill('if');
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await expect(page.getByRole('alert')).toContainText('Unsupported syntax');
  await expect(page.getByRole('alert')).toContainText('line 1, column 3');
  await expect(page.getByRole('alert')).not.toContainText('Expected');

  await source.fill('print(missing)');
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await page.getByRole('button', { name: 'Run teaching program' }).click();
  await expect(page.getByRole('alert')).toContainText('Name error');
  await expect(page.getByRole('alert')).toContainText('line 1, column 7');
  await expect(page.locator('.teaching-instruction-table tr.is-vm-fault')).toContainText('LOAD_NAME');

  await source.fill('print("x" - 1)');
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await page.getByRole('button', { name: 'Run teaching program' }).click();
  await expect(page.getByRole('alert')).toContainText('Type error');
  await expect(page.locator('.teaching-instruction-table tr.is-vm-fault')).toContainText('BINARY_SUBTRACT');
});

test('runs short-circuit expressions, nested branches, and lazy range loops in the Worker', async ({ page }) => {
  await chooseTeachingVm(page);
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill([
    'print(False and missing, True or missing)',
    'if "":',
    '  print("not selected")',
    'elif 1:',
    '  if True:',
    '    print("branch")',
    'else:',
    '  print(missing)',
    'for i in range(2, -1, -1):',
    '  print(i)',
  ].join('\n'));
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await expect(page.getByText('mini-vm-v2').first()).toBeVisible();
  const instructions = page.locator('.teaching-instruction-table');
  await expect(instructions).toContainText('JUMP_IF_FALSE_OR_POP');
  await expect(instructions).toContainText('POP_JUMP_IF_FALSE');
  await expect(instructions).toContainText('FOR_ITER');

  await page.getByRole('button', { name: 'Run teaching program' }).click();
  await expect(page.getByText('Teaching program finished').first()).toBeVisible();
  await expect(page.locator('.teaching-output')).toHaveText('False True\nbranch\n2\n1\n0');
  await expect(page.locator('.teaching-control-flow')).toContainText('iterator is exhausted');
});

test('renders operands for comparison and logical expressions in the teaching AST', async ({ page }) => {
  await chooseTeachingVm(page);
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill('if 1 < 2 and not False:\n  print("selected")');
  await page.getByRole('button', { name: 'Compile teaching program' }).click();

  const ast = page.locator('.teaching-ast-scroll');
  await expect(ast).toContainText('Compare');
  await expect(ast).toContainText('<');
  await expect(ast).toContainText('Logical');
  await expect(ast).toContainText('and');
  await expect(ast).toContainText('Unary');
  await expect(ast).toContainText('not');
  await expect(ast).toContainText('IntegerLiteral');
  await expect(ast).toContainText('BooleanLiteral');
});

test('shows the dynamic instruction budget in the browser for an infinite while loop', async ({ page }) => {
  await chooseTeachingVm(page);
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill('while True:\n  x = 1');
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await page.getByRole('button', { name: 'Run teaching program' }).click();
  await expect(page.getByRole('alert')).toContainText('5,000-instruction execution limit', { timeout: 30_000 });
  await expect(page.locator('.small-meta').filter({ hasText: '5,000 teaching instructions executed' })).toBeVisible();
  await expect(page.locator('.teaching-instruction-table tr.is-vm-fault')).toHaveCount(1);
});

test('matches the P6 common subset with real CPython output and range-step error category', async ({ page }) => {
  await page.goto(appPath);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill([
    'i = 0',
    'while i < 3:',
    '  print(i)',
    '  i = i + 1',
    'for j in range(2, -1, -1):',
    '  print(j)',
  ].join('\n'));
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('#execution-output')).toHaveText('0\n1\n2\n2\n1\n0\n');

  await source.fill('for i in range(0, 1, 0):\n  print(i)');
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-exception')).toContainText('ValueError', { timeout: 20_000 });

  await page.getByRole('combobox', { name: 'Execution view' }).selectOption('teaching');
  await expect(page.getByText('Ready to compile teaching program')).toBeVisible();
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await page.getByRole('button', { name: 'Run teaching program' }).click();
  await expect(page.getByRole('alert')).toContainText('range() step cannot be zero');
});

test('pauses and resets a long teaching run and invalidates stale mode/source state', async ({ page }) => {
  await chooseTeachingVm(page);
  const source = page.getByRole('textbox', { name: 'Python source' });
  // Exercise pause near the instruction budget while keeping the rendered state small.
  await source.fill(Array.from({ length: 999 }, (_, index) => `x = ${index}`).join('\n'));
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await page.getByRole('button', { name: 'Run teaching program' }).click();
  const pauseButton = page.getByRole('button', { name: 'Pause teaching program' });
  await expect(pauseButton).toBeVisible();
  await pauseButton.click();
  await expect(page.getByText('Teaching VM paused').first()).toBeVisible();

  await page.getByRole('button', { name: 'Reset teaching VM' }).click();
  await expect(page.getByText('Step 0 of 0')).toBeVisible();
  await expect(page.locator('.teaching-value-list li')).toHaveCount(0);

  await source.fill('x = 42');
  await expect(page.getByText('Compile source to create a teaching program.')).toBeVisible();
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await expect(page.locator('.teaching-instruction-table')).toContainText('STORE_NAME');
  await page.getByRole('combobox', { name: 'Execution view' }).selectOption('cpython');
  await page.getByRole('combobox', { name: 'Execution view' }).selectOption('teaching');
  await expect(page.getByText('Compile source to create a teaching program.')).toBeVisible();
});

test('streams long-run history incrementally and retains the complete bounded window', async ({ page }) => {
  await chooseTeachingVm(page);
  const payload = 'a'.repeat(58);
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill(`x = "${payload}"\n${'print(x)\n'.repeat(500)}`);
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await page.getByRole('button', { name: 'Run teaching program' }).click();

  await expect(page.getByText('Teaching program finished').first()).toBeVisible();
  const history = page.getByRole('slider', { name: 'Instruction history' });
  await expect(history).toHaveAttribute('min', '504');
  await expect(history).toHaveAttribute('max', '1003');
  await expect(page.getByText('Only the latest 500 snapshots are kept; earlier history was dropped.')).toBeVisible();
  await expect.poll(async () => (await page.locator('.teaching-output').textContent() ?? '').split('\n').length).toBe(500);
  await expect(page.locator('.teaching-output')).toContainText(payload);
});
