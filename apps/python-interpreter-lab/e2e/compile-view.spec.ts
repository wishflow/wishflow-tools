import { expect, test } from '@playwright/test';

const appPath = '/python-interpreter-lab/';

test('compiles source with real CPython and displays nested code object bytecode', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(appPath);
  await expect(page.getByRole('heading', { name: 'Python Interpreter Lab' })).toBeVisible();
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();

  const sourceInput = page.getByRole('textbox', { name: 'Python source' });
  await sourceInput.focus();
  await sourceInput.press('Tab');
  await expect(page.getByRole('button', { name: 'Restore example' })).toBeFocused();
  await sourceInput.fill('x = 1 + 2\ndef add(a, b):\n    return a + b\n');
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await expect(page.locator('.tree-scroll')).toContainText('Module');
  const assignmentType = page.locator('.ast-node > summary .ast-type').filter({ hasText: 'Assign' }).first();
  await assignmentType.click();
  await expect(page.locator('.tree-scroll')).toContainText('Name');
  await expect(page.locator('.instruction-table')).toContainText('LOAD_SMALL_INT');
  await expect(page.locator('.instruction-table tr').filter({ hasText: 'LOAD_SMALL_INT' }).first()).toContainText('3');

  await page.getByLabel('Code object').selectOption('code-1');
  await expect(page.locator('.instruction-table')).toContainText('BINARY_OP');
  expect(pageErrors).toEqual([]);

  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth, `page should not scroll horizontally at ${width}px`).toBeLessThanOrEqual(width);
  }
  await expect(page.getByRole('textbox', { name: 'Python source' })).toBeVisible();
});

test('shows real tokens and links Unicode source, AST, and bytecode ranges', async ({ page }) => {
  await page.goto(appPath);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill('变量 = "🐍"\nleft = 1\nright = 2\nanswer = left + right\n# note\ndef add(a, b):\n    return a + b\n');
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await expect(page.locator('.tokens-summary')).toBeVisible();

  await page.getByText('Tokens', { exact: true }).click();
  const tokens = page.locator('.token-table');
  await expect(tokens).toContainText('OP · PLUS');
  await expect(tokens).toContainText('INDENT');
  await expect(tokens).toContainText('DEDENT');
  await expect(tokens).toContainText('ENDMARKER');

  const selectedText = () => source.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
  });
  const stringToken = page.locator('.token-table tbody tr').filter({ hasText: 'STRING' }).first();
  await stringToken.getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect.poll(selectedText, { timeout: 10_000 }).toBe('"🐍"');
  expect(await source.evaluate((element) => (element as HTMLTextAreaElement).selectionEnd - (element as HTMLTextAreaElement).selectionStart)).toBe(4);
  await expect(page.locator('.ast-node.is-source-match')).not.toHaveCount(0);

  await page.locator('.ast-node > summary').filter({ hasText: 'Assign' }).nth(3).click();
  const binOp = page.locator('.ast-node > summary').filter({ hasText: 'BinOp' }).first();
  await binOp.focus();
  await page.keyboard.press('Enter');
  await expect.poll(selectedText, { timeout: 10_000 }).toBe('left + right');
  await expect(page.locator('.instruction-table tr.is-source-match').filter({ hasText: 'BINARY_OP' })).not.toHaveCount(0);

  const binaryInstruction = page.locator('.instruction-table tr').filter({ hasText: 'BINARY_OP' }).first();
  await binaryInstruction.getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect.poll(selectedText, { timeout: 10_000 }).toBe('left + right');

  await page.getByLabel('Code object').selectOption('code-1');
  await expect.poll(selectedText, { timeout: 10_000 }).toBe('left + right');
  const nestedBinaryInstruction = page.locator('.instruction-table tr').filter({ hasText: 'BINARY_OP' }).last();
  await nestedBinaryInstruction.getByRole('button').click();
  await expect.poll(selectedText, { timeout: 10_000 }).toBe('a + b');
  await page.getByLabel('Code object').selectOption('code-0');
  await expect.poll(selectedText, { timeout: 10_000 }).toBe('a + b');

  await source.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    const start = textarea.value.indexOf('left + right');
    textarea.focus();
    textarea.setSelectionRange(start, start);
  });
  for (let index = 0; index < 'left + right'.length; index += 1) {
    await source.press('Shift+ArrowRight');
  }
  await expect.poll(selectedText, { timeout: 10_000 }).toBe('left + right');
  await expect(page.locator('.token-table tr.is-source-match')).not.toHaveCount(0);
  await expect(page.locator('.ast-node.is-source-match')).not.toHaveCount(0);
  await expect(page.locator('.instruction-table tr.is-source-match').filter({ hasText: 'BINARY_OP' })).not.toHaveCount(0);

  const commentToken = page.locator('.token-table tbody tr').filter({ hasText: 'COMMENT' });
  await commentToken.getByRole('button').click();
  await expect.poll(selectedText, { timeout: 10_000 }).toBe('# note');
  await expect(page.locator('.ast-node.is-source-match')).toHaveCount(0);
  await expect(page.locator('.instruction-table tr.is-source-match')).toHaveCount(0);

  const endMarker = page.locator('.token-table tbody tr').filter({ hasText: 'ENDMARKER' }).last().getByRole('button');
  await endMarker.click();
  await expect(page.locator('.link-status')).toContainText('no reliable source range');
  await expect(endMarker).toBeFocused();
  expect(await source.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    return textarea.selectionStart === textarea.selectionEnd;
  })).toBe(true);

  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth, `page should not scroll horizontally at ${width}px`).toBeLessThanOrEqual(width);
  }
});

test('maps tokenizer ranges after the textarea normalizes CRLF line endings', async ({ page }) => {
  await page.goto(appPath);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill('first = 1\r\n值 = first + 2');
  await expect(source).toHaveValue('first = 1\n值 = first + 2');
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await page.getByText('Tokens', { exact: true }).click();

  const selectedText = () => source.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
  });
  const newline = page.locator('.token-table tbody tr').filter({ hasText: 'NEWLINE' }).first();
  await newline.getByRole('button').click();
  await expect.poll(selectedText, { timeout: 10_000 }).toBe('\n');

  const firstTokens = page.locator('.token-table tbody tr').filter({ hasText: '"first"' });
  await expect(firstTokens).toHaveCount(2);
  await firstTokens.nth(1).getByRole('button').click();
  await expect.poll(selectedText, { timeout: 10_000 }).toBe('first');
  expect(await source.evaluate((element) => (element as HTMLTextAreaElement).selectionStart)).toBe(14);
});

test('caps token text and token count while keeping analysis available', async ({ page }) => {
  await page.goto(appPath);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });

  await source.fill(`value = "${'a'.repeat(300)}"`);
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await page.getByText('Tokens', { exact: true }).click();
  await expect(page.locator('.token-table')).toContainText('text shortened');

  await source.fill('x = 1\n'.repeat(1251));
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await expect(page.locator('.tokens-summary')).toContainText('5000');
  await page.getByText('Tokens', { exact: true }).click();
  await expect(page.getByRole('status')).toContainText('5,000-item safety limit');
});

test('clears stale results after a syntax error and accepts corrected source', async ({ page }) => {
  await page.goto(appPath);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });

  await source.fill('x = 1 + 2');
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await expect(page.locator('.instruction-table')).toContainText('LOAD_CONST');
  await page.getByText('Tokens', { exact: true }).click();
  await page.locator('.token-table tbody tr').filter({ hasText: 'OP · PLUS' }).getByRole('button').click();
  await expect(page.locator('.link-status')).toBeVisible();

  await source.fill('if :\n    pass');
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await expect(page.getByRole('alert')).toContainText('SyntaxError');
  await expect(page.locator('.instruction-table')).toHaveCount(0);
  await expect(page.locator('.token-table')).toHaveCount(0);
  await expect(page.locator('.link-status')).toHaveCount(0);

  await source.fill('x = 1 + 2');
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await expect(page.locator('.instruction-table')).toContainText('LOAD_CONST');
  await expect(page.getByRole('alert')).toHaveCount(0);

  await source.fill('return 1');
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await expect(page.getByRole('alert')).toContainText('Compile error');
  await expect(page.getByRole('alert')).toContainText('outside function');
  await expect(page.locator('.instruction-table')).toHaveCount(0);

  await source.fill('raise RuntimeError("this source must not execute")');
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await expect(page.locator('.instruction-table')).toContainText('RAISE_VARARGS');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('cancels runtime loading and can start a fresh worker', async ({ page }) => {
  await page.goto(appPath);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Runtime stopped')).toBeVisible();
  await page.getByRole('button', { name: 'Retry runtime' }).click();
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
});

test('marks AST and code-object output that reaches its safety limit', async ({ page }) => {
  await page.goto(appPath);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });

  await source.fill(Array.from({ length: 1400 }, (_, index) => `x${index} = ${index}`).join('\n'));
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await expect(page.getByText('The AST display was truncated at the safety limit.')).toBeVisible();

  await source.fill(Array.from({ length: 205 }, (_, index) => `def f${index}():\n    pass`).join('\n'));
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await expect(page.getByText('Additional code objects were omitted at the safety limit.')).toBeVisible();
});

test('reports a runtime download failure and succeeds after retry', async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/pyodide/**', (route) => route.abort());
  await page.goto(appPath);
  await expect(page.getByText('Runtime unavailable')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Python runtime error');

  await page.unroute('https://cdn.jsdelivr.net/pyodide/**');
  await page.getByRole('button', { name: 'Retry runtime' }).click();
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
});
