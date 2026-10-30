import { expect, test } from '@playwright/test';

const appPath = '/python-interpreter-lab/';

test('opens the teaching workbench by default without compiling or running', async ({ page }) => {
  await page.goto(appPath);

  const engine = page.getByRole('combobox', { name: 'Execution view' });
  await expect(engine).toHaveValue('teaching');
  await expect(page.getByText('Ready to compile teaching program')).toBeVisible();
  await expect(page.locator('.teaching-instruction-table')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Compile teaching program' })).toBeEnabled();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  const transitionDuration = await page.locator('.source-panel').evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.00001);

  await engine.selectOption('cpython');
  await expect(engine).toHaveValue('cpython');
  await expect(page.getByRole('heading', { name: 'Compilation output' })).toBeVisible();
});

test('keeps compile details folded until opened by keyboard without moving the execution point', async ({ page }) => {
  await page.goto(appPath);
  await expect(page.getByText('Ready to compile teaching program')).toBeVisible();
  await page.getByRole('textbox', { name: 'Python source' }).fill('answer = 1 + 2');
  await page.getByRole('button', { name: 'Compile teaching program' }).click();

  const ast = page.locator('.teaching-ast-disclosure');
  const instructions = page.locator('.teaching-instruction-disclosure');
  const history = page.getByRole('slider', { name: 'Source-step history' });
  const historyPosition = await history.inputValue();
  const action = await page.locator('.teaching-current-action').innerText();
  await expect(ast.locator('.teaching-ast-root')).toBeHidden();
  await expect(instructions.locator('.teaching-instruction-table')).toBeHidden();

  const summary = instructions.locator('summary');
  await summary.focus();
  await summary.press('Enter');
  await expect(instructions.locator('.teaching-instruction-table')).toBeVisible();
  await expect(history).toHaveValue(historyPosition);
  expect(await page.locator('.teaching-current-action').innerText()).toBe(action);
});

test('shows aliases and frame state in one static scene without changing execution while inspecting a caller', async ({ page }) => {
  await page.goto(appPath);
  await expect(page.getByText('Ready to compile teaching program')).toBeVisible();

  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill([
    'def bump(xs):',
    '  xs[0] = 9',
    '  return xs',
    '',
    'a = [1]',
    'b = a',
    'result = bump(a)',
  ].join('\n'));
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await expect(page.locator('.teaching-runtime-panel')).toBeVisible({ timeout: 10_000 });

  const sceneOrder = await page.locator('.teaching-content').evaluate((content) =>
    Array.from(content.children).map((child) => child.className),
  );
  expect(sceneOrder[0]).toContain('teaching-runtime-panel');
  await expect(page.locator('.teaching-ast-root')).toBeHidden({ timeout: 10_000 });
  await expect(page.locator('.teaching-instruction-table')).toBeHidden({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Step one instruction' }).click();
  await page.getByRole('button', { name: 'Step Over' }).click();
  await page.getByRole('button', { name: 'Step Over' }).click();
  await page.getByRole('button', { name: 'Step Into' }).click();
  const activeFrame = page.locator('.teaching-frame-list > .is-active-frame');
  await expect(activeFrame.locator('summary')).toContainText('bump');

  const moduleFrame = page.locator('.teaching-frame-list > li').first();
  const moduleSummary = moduleFrame.locator('summary');
  const history = page.getByRole('slider', { name: 'Source-step history' });
  const historyPosition = await history.inputValue();
  await moduleSummary.click();

  await expect(moduleFrame.locator('.teaching-variable-list')).toContainText('a');
  await expect(moduleFrame.locator('.teaching-variable-list')).toContainText('b');
  await expect(moduleFrame.locator('.teaching-variable-list')).toContainText('list #1');
  await expect(page.locator('.teaching-active-frame .teaching-variable-list')).toContainText('xs');
  await expect(page.locator('.teaching-active-frame .teaching-variable-list')).toContainText('list #1');
  await expect(page.locator('.teaching-heap-object h5')).toContainText('List #1');
  await expect(history).toHaveValue(historyPosition);
  await expect(activeFrame.locator('summary')).toContainText('bump', { timeout: 5_000 });

  await page.getByRole('button', { name: 'Step one instruction' }).click();
  await expect(page.locator('.teaching-active-frame .teaching-value-list .is-stack-top')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.teaching-current-action')).toContainText('LOAD_NAME xs', { timeout: 10_000 });
});
