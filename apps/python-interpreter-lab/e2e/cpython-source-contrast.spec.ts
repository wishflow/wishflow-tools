import { expect, test } from '@playwright/test';

const appPath = '/python-interpreter-lab/';

async function selectSourceRange(source: import('@playwright/test').Locator, text: string) {
  const start = await source.evaluate((element, selectedText) => {
    const textarea = element as HTMLTextAreaElement;
    const startOffset = textarea.value.indexOf(selectedText);
    if (startOffset < 0) throw new Error(`Source range not found: ${selectedText}`);
    textarea.focus();
    textarea.setSelectionRange(startOffset, startOffset);
    return startOffset;
  }, text);
  expect(start).toBeGreaterThanOrEqual(0);
  for (let index = 0; index < text.length; index += 1) {
    await source.press('Shift+ArrowRight');
  }
}

test('opens real CPython for the selected teaching source range without running it', async ({ page }) => {
  await page.goto(appPath);
  const sourceText = [
    '# 🐍 prefix before the selected source',
    'match 2:',
    '    case 2:',
    '        value = 1 + 2',
    'print(value)',
  ].join('\n');
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill(sourceText);

  const inspectButton = page.getByRole('button', { name: 'Inspect selection in real CPython' });
  await expect(inspectButton).toBeVisible();
  await expect(inspectButton).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Execution view' })).toHaveValue('teaching');
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toHaveCount(0);

  await selectSourceRange(source, 'value = 1 + 2');
  await expect(inspectButton).toBeEnabled();
  await inspectButton.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('combobox', { name: 'Execution view' })).toHaveValue('cpython');
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  await expect(source).toHaveValue(sourceText);
  await expect.poll(() => source.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
  })).toBe('value = 1 + 2');

  await expect(page.locator('.ast-tree')).toContainText('Match');
  await expect(page.locator('.ast-node.is-source-match')).not.toHaveCount(0);
  await expect(page.locator('.instruction-table tr.is-source-match')).not.toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Matching tokens, AST nodes, or bytecode instructions');
  await expect(page.locator('#execution-heading')).toHaveCount(0);
  await expect(page.locator('#execution-output')).toHaveCount(0);
});

test('keeps selected ranges linked to nested real code objects', async ({ page }) => {
  await page.goto(appPath);
  const sourceText = [
    '# 🐍 prefix',
    'def outer():',
    '    def inner():',
    '        return 1 + 2',
    '    return inner()',
  ].join('\n');
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill(sourceText);
  await selectSourceRange(source, 'return 1 + 2');
  await page.getByRole('button', { name: 'Inspect selection in real CPython' }).click();

  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const codeObject = page.getByLabel('Code object');
  await expect(codeObject.locator('option')).toHaveCount(3);
  await expect(codeObject).toHaveValue('code-0');
  await codeObject.selectOption('code-2');
  await expect(codeObject.locator('option:checked')).toContainText('inner');
  await expect(page.locator('.instruction-table tr.is-source-match')).not.toHaveCount(0);
  await expect.poll(() => source.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
  })).toBe('return 1 + 2');
});

test('explains CPython compilation boundaries and records real output only after Run', async ({ page }) => {
  await page.goto(appPath);
  await expect(page.getByRole('combobox', { name: 'Execution view' })).toHaveValue('teaching');
  await page.getByRole('combobox', { name: 'Execution view' }).selectOption('cpython');
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reading real CPython results' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/not CPU machine code/i)).toBeVisible();
  await expect(page.getByText(/not an opcode-by-opcode trace/i)).toBeVisible();
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '读懂真实 CPython 结果' })).toBeVisible();
  await expect(page.getByText(/Python 字节码不是 CPU 机器码/)).toBeVisible();
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();

  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill('value = 1 + 2\nprint(value)');
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await page.locator('.ast-node > summary').filter({ hasText: 'Assign' }).first().click();
  await expect(page.locator('.ast-tree')).toContainText('BinOp');
  await expect(page.locator('.instruction-table')).toContainText('LOAD_SMALL_INT');
  await expect(page.locator('.instruction-table')).toContainText('3');
  await expect(page.locator('.instruction-table')).not.toContainText('BINARY_OP');
  await expect(page.locator('#execution-heading')).toHaveCount(0);

  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('#execution-output')).toHaveText('3\n');
  const eventCount = await page.locator('#trace-event-count').innerText();
  const eventPosition = page.getByRole('slider', { name: 'Event position' });
  await eventPosition.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.trace-event-card')).toContainText('Event 1 of', { timeout: 10_000 });
  await expect(page.locator('#execution-output')).toBeEmpty();
  await page.getByRole('button', { name: 'Play playback' }).click();
  await expect(page.getByRole('button', { name: 'Play playback' })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#trace-event-count')).toHaveText(eventCount);
  await expect(page.locator('#execution-output')).toHaveText('3\n');

  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth, `page should not scroll horizontally at ${width}px`).toBeLessThanOrEqual(width);
  }
});
