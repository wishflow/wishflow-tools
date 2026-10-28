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

test('clears stale results after a syntax error and accepts corrected source', async ({ page }) => {
  await page.goto(appPath);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });

  await source.fill('x = 1 + 2');
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await expect(page.locator('.instruction-table')).toContainText('LOAD_CONST');

  await source.fill('if :\n    pass');
  await page.getByRole('button', { name: 'Analyze source' }).click();
  await expect(page.getByRole('alert')).toContainText('SyntaxError');
  await expect(page.locator('.instruction-table')).toHaveCount(0);

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
