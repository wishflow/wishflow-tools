import { expect, test } from '@playwright/test';

const appPath = '/python-interpreter-lab/';

async function chooseCpython(page: import('@playwright/test').Page) {
  await page.goto(appPath);
  await page.getByRole('combobox', { name: 'Execution view' }).selectOption('cpython');
}

test('runs source in CPython and records real call, line, and return events', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();

  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill('base = 10\ndef add(value):\n    total = value + base\n    return total\nprint(add(2))');

  const runButton = page.getByRole('button', { name: 'Run Python' });
  await expect(runButton).toBeVisible({ timeout: 1_000 });
  await runButton.click();
  await expect(page.getByRole('heading', { name: 'Execution trace' })).toBeVisible();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('#execution-output')).toHaveText('12\n');
  await expect(page.locator('#trace-event-count')).not.toHaveText('0');

  const position = page.getByRole('slider', { name: 'Event position' });
  await position.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.trace-event-card')).toContainText('Call · entering frame');
  await expect(page.locator('#execution-output')).toBeEmpty();

  const maxEvent = Number(await position.getAttribute('max'));
  let foundAddFrame = false;
  for (let index = 0; index <= maxEvent; index += 1) {
    if ((await page.locator('.call-stack-list').innerText()).includes('add')) {
      foundAddFrame = true;
      break;
    }
    await page.keyboard.press('ArrowRight');
  }
  expect(foundAddFrame).toBe(true);
  await page.getByRole('button', { name: 'Locate event source line' }).click();
  await expect.poll(() => source.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
  })).toContain('def add');

  await page.getByRole('button', { name: 'Last event' }).click();
  await expect(page.locator('#execution-output')).toHaveText('12\n');
  await page.getByLabel('Playback speed').selectOption('4');
  await page.getByRole('button', { name: 'Play playback' }).click();
  await expect(page.getByRole('button', { name: 'Play playback' })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#execution-output')).toHaveText('12\n');
});

test('keeps caught exceptions in the trace and reports uncaught exceptions with prior output', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  const runButton = page.getByRole('button', { name: 'Run Python' });

  await source.fill('try:\n    1 / 0\nexcept ZeroDivisionError:\n    print("caught")');
  await runButton.click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('#execution-output')).toHaveText('caught\n');

  const position = page.getByRole('slider', { name: 'Event position' });
  await position.focus();
  await page.keyboard.press('Home');
  let foundException = false;
  const maxEvent = Number(await position.getAttribute('max'));
  for (let index = 0; index <= maxEvent; index += 1) {
    if ((await page.locator('.trace-event-card').innerText()).includes('Exception · may be caught')) {
      foundException = true;
      break;
    }
    await page.keyboard.press('ArrowRight');
  }
  expect(foundException).toBe(true);

  await source.fill('print("before")\nraise ValueError("boom")');
  await runButton.click();
  await expect(page.locator('#execution-status')).toContainText('ended with an exception', { timeout: 20_000 });
  await expect(page.locator('#execution-output')).toHaveText('before\n');
  await expect(page.locator('#execution-exception')).toContainText('ValueError');
  await expect(page.locator('#execution-exception')).toContainText('boom');
  await expect(page.locator('#execution-exception')).toContainText('2');
});

test('stops a running loop, keeps partial events, and runs fresh source after retry', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill('i = 0\nwhile True:\n    i += 1');
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#trace-event-count')).not.toHaveText('0', { timeout: 10_000 });
  await page.getByRole('button', { name: 'Stop execution' }).click();
  await expect(page.locator('#execution-status')).toContainText('stopped');
  await expect(page.locator('.execution-panel .limit-notice')).toContainText('This run did not finish');
  const stoppedCount = await page.locator('#trace-event-count').innerText();

  await page.getByRole('button', { name: 'Retry runtime' }).click();
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  await expect(page.locator('#execution-status')).toContainText('stopped');
  await source.fill('print("fresh")');
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('#execution-output')).toHaveText('fresh\n');
  expect(await page.locator('#trace-event-count').innerText()).not.toBe(stoppedCount);
});

test('enforces execution time, trace event, and output limits', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  const runButton = page.getByRole('button', { name: 'Run Python' });

  await source.fill('while True: pass');
  await runButton.click();
  await expect(page.locator('#execution-status')).toContainText('timed out', { timeout: 10_000 });
  await page.getByRole('button', { name: 'Retry runtime' }).click();
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();

  await source.fill('for i in range(3000):\n    value = i\nfor i in range(3000):\n    value = i\nprint("DONE")');
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('#trace-event-count')).toContainText('5,000');
  await expect(page.locator('.execution-panel .limit-notice')).toContainText('5,000-event limit');
  await expect(page.locator('#execution-final-output')).toHaveText('DONE\n');

  await source.fill('print("x" * 40000)');
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('.execution-panel .limit-notice')).toContainText('32,768-code-point limit');
  expect(await page.locator('#execution-output').evaluate((element) => Array.from(element.textContent ?? '').length)).toBe(32768);

  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth, `page should not scroll horizontally at ${width}px`).toBeLessThanOrEqual(width);
  }
});

test('does not execute a metaclass __name__ property while snapshotting a value', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Python source' }).fill([
    'class Trap(type):',
    '    @property',
    '    def __name__(cls):',
    '        raise RuntimeError("type name descriptor executed")',
    'class Custom(metaclass=Trap):',
    '    pass',
    'value = Custom()',
    'print("safe")',
  ].join('\n'));
  await page.getByRole('button', { name: 'Run Python' }).click();

  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('#execution-output')).toHaveText('safe\n');
});

test('summarizes large values without calling user repr methods or breaking trace capture', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  const longTypeName = `LongType${'T'.repeat(120)}`;
  const longFunctionName = `long_function_${'f'.repeat(120)}`;
  await source.fill([
    'class Loud:',
    '    def __repr__(self):',
    '        print("repr should not execute")',
    'large_text = "x" * 500000',
    'large_number = 10 ** 100000',
    'item = Loud()',
    `class ${longTypeName}: pass`,
    `long_item = ${longTypeName}()`,
    `def ${longFunctionName}(): return 1`,
    `${longFunctionName}()`,
    'print("done")',
  ].join('\n'));
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('#execution-output')).toHaveText('done\n');
  await expect(page.locator('#execution-output')).not.toContainText('repr should not execute');
  await expect(page.locator('#trace-event-count')).not.toContainText('0');
  const largeNumber = page.locator('.trace-values > div').filter({ hasText: 'large_number' });
  await expect(largeNumber).toContainText('bits');
  expect((await largeNumber.locator('code').textContent())?.length).toBeLessThanOrEqual(120);

  const longItem = page.locator('.trace-values > div').filter({ hasText: 'long_item' });
  const longTypeLabel = await longItem.locator('dd span').textContent();
  expect(longTypeLabel?.length).toBeLessThanOrEqual(100);
  expect(longTypeLabel?.endsWith('…')).toBe(true);

  const position = page.getByRole('slider', { name: 'Event position' });
  const maxEvent = Number(await position.getAttribute('max'));
  await position.focus();
  await page.keyboard.press('Home');
  let boundedFunctionName: string | undefined;
  for (let index = 0; index <= maxEvent; index += 1) {
    const names = await page.locator('.call-stack-list li').allTextContents();
    boundedFunctionName = names.find((name) => name.startsWith('long_function_'));
    if (boundedFunctionName) break;
    await page.keyboard.press('ArrowRight');
  }
  expect(boundedFunctionName?.length).toBeLessThanOrEqual(100);
  expect(boundedFunctionName?.endsWith('…')).toBe(true);
});

test('records immutable structured global and frame snapshots for each CPython event', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill([
    'items = [1, {"x": 2}]',
    'def mutate():',
    '    local = [1, {"x": 2}]',
    '    local[1]["x"] = 9',
    '    print("done")',
    'mutate()',
  ].join('\n'));
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Variable snapshots' })).toBeVisible({ timeout: 2_000 });

  const position = page.getByRole('slider', { name: 'Event position' });
  const eventCard = page.locator('.trace-event-card');
  const maxEvent = Number(await position.getAttribute('max'));
  const readItems = () => page.locator('[data-snapshot-scope="globals"] [data-variable-name="items"]')
    .evaluate((element) => element.textContent ?? '');

  async function selectLine(line: number) {
    await position.focus();
    await page.keyboard.press('Home');
    for (let index = 0; index <= maxEvent; index += 1) {
      if (await eventCard.getAttribute('data-event') === 'line' && await eventCard.getAttribute('data-line') === String(line)) return;
      await page.keyboard.press('ArrowRight');
    }
    throw new Error(`No line event found for line ${line}`);
  }

  await selectLine(4);
  await expect(page.getByLabel('Frame').locator('option:checked')).toContainText('mutate');
  const locals = page.locator('[data-snapshot-scope="locals"] [data-variable-name="local"]');
  await expect(locals).toHaveCount(1);
  expect(await locals.evaluate((element) => element.textContent ?? '')).toContain('2');
  expect(await locals.evaluate((element) => element.textContent ?? '')).not.toContain('9');
  expect(await readItems()).toContain('2');

  await selectLine(5);
  expect(await locals.evaluate((element) => element.textContent ?? '')).toContain('9');
  expect(await readItems()).toContain('2');

  await selectLine(4);
  expect(await locals.evaluate((element) => element.textContent ?? '')).toContain('2');
  expect(await locals.evaluate((element) => element.textContent ?? '')).not.toContain('9');
});

test('keeps recursive CPython frames distinct while their trace segments are active', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill([
    'def descend(value):',
    '    current = value',
    '    if value:',
    '        return descend(value - 1)',
    '    return current',
    'result = descend(2)',
  ].join('\n'));
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });

  const position = page.getByRole('slider', { name: 'Event position' });
  const eventCard = page.locator('.trace-event-card');
  const maxEvent = Number(await position.getAttribute('max'));
  await position.focus();
  await page.keyboard.press('Home');
  let selectedLine = false;
  for (let index = 0; index <= maxEvent; index += 1) {
    if (await eventCard.getAttribute('data-event') === 'line' && await eventCard.getAttribute('data-line') === '5') {
      selectedLine = true;
      break;
    }
    await page.keyboard.press('ArrowRight');
  }
  expect(selectedLine).toBe(true);
  const frames = await page.getByLabel('Frame').locator('option').evaluateAll((options) =>
    options.map((option) => ({ value: (option as HTMLOptionElement).value, label: option.textContent ?? '' }))
      .filter((option) => option.label.includes('descend')));
  expect(frames).toHaveLength(3);
  expect(new Set(frames.map((frame) => frame.value)).size).toBe(3);
  await expect(page.getByLabel('Frame').locator('option:checked')).toContainText('descend');

  const framePicker = page.getByRole('combobox', { name: 'Observed frame' });
  const selectedValue = page.locator('[data-snapshot-scope="locals"] > div[data-variable-name="value"]');
  await expect(selectedValue).toContainText('0');
  await framePicker.selectOption(frames[1].value);
  await expect(selectedValue).toContainText('1', { timeout: 3_000 });
  await framePicker.selectOption(frames[0].value);
  await expect(selectedValue).toContainText('2', { timeout: 3_000 });
});

test('bounds scalar snapshots and avoids user object methods while representing cycles', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill([
    'number = 2 ** 80',
    'huge = 10 ** 100000',
    'text = "🐍" + "x" * 500',
    'raw = b"\\x00\\xff" * 40',
    'cycle = []',
    'alias = cycle',
    'cycle.append(cycle)',
    'class Loud:',
    '    @property',
    '    def secret(self):',
    '        print("property-called")',
    '        raise RuntimeError("property should not run")',
    '    def __iter__(self):',
    '        print("iter-called")',
    '        raise RuntimeError("iterator should not run")',
    '    def __repr__(self):',
    '        print("repr-called")',
    '        raise RuntimeError("repr should not run")',
    'item = Loud()',
    'print("done")',
  ].join('\n'));
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('#execution-output')).toHaveText('done\n');
  await expect(page.getByText(/snapshot limits/)).toBeVisible();

  const globals = page.locator('[data-snapshot-scope="globals"]');
  const global = (name: string) => globals.locator(`> div[data-variable-name="${name}"]`);
  await expect(global('number')).toContainText('1208925819614629174706176', { timeout: 3_000 });
  await expect(global('huge')).toContainText('bits', { timeout: 3_000 });
  await expect(global('text')).toContainText('chars', { timeout: 3_000 });
  await expect(global('raw')).toContainText('bytes', { timeout: 3_000 });
  await expect(global('alias')).toHaveAttribute('data-snapshot-kind', 'container');
  await expect(global('alias').locator('[data-snapshot-kind="reference"]')).toHaveCount(1);
  const aliasDetails = global('alias').locator('details');
  const aliasSummary = aliasDetails.locator('summary');
  await aliasSummary.focus();
  await page.keyboard.press('Enter');
  await expect(aliasDetails).toHaveJSProperty('open', true);
  await expect(global('cycle')).toHaveAttribute('data-snapshot-kind', 'reference');
  await expect(global('item')).toContainText('<Loud>');
});

test('shows adjacent changes with event timing and variables removed from returned frames', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill([
    'items = [1]',
    'def update():',
    '    local = 1',
    '    items.append(2)',
    '    local = 3',
    'update()',
    'print("done")',
  ].join('\n'));
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });

  const position = page.getByRole('slider', { name: 'Event position' });
  const eventCard = page.locator('.trace-event-card');
  const maxEvent = Number(await position.getAttribute('max'));
  async function selectLine(line: number) {
    await position.focus();
    await page.keyboard.press('Home');
    for (let index = 0; index <= maxEvent; index += 1) {
      if (await eventCard.getAttribute('data-event') === 'line' && await eventCard.getAttribute('data-line') === String(line)) return;
      await page.keyboard.press('ArrowRight');
    }
    throw new Error(`No line event found for line ${line}`);
  }

  await selectLine(5);
  const adjacentChanges = page.getByRole('button', { name: 'Adjacent changes' });
  await adjacentChanges.focus();
  await page.keyboard.press('Enter');
  await expect(adjacentChanges).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#snapshot-diff-context')).toContainText('Comparing event');
  await expect(page.locator('.snapshot-diff-list li[data-change-status="changed"]')).toContainText('items');
  await expect(page.locator('.snapshot-diff-hint')).toContainText('before the selected line runs');

  await selectLine(7);
  const removedLocal = page.locator('.snapshot-diff-list li[data-change-status="removed"]');
  await expect(removedLocal).toContainText('local');
  await expect(removedLocal).toContainText('update');
});

test('keeps aliases unchanged and distinguishes long variable names with the same display label', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const namePrefix = `value_${'x'.repeat(100)}`;
  const changedName = `${namePrefix}a`;
  const unchangedName = `${namePrefix}b`;
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill([
    'items = [1]',
    'alias = items',
    `${changedName} = 1`,
    `${unchangedName} = 1`,
    `${changedName} = 2`,
    'print("done")',
  ].join('\n'));
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });

  const position = page.getByRole('slider', { name: 'Event position' });
  const eventCard = page.locator('.trace-event-card');
  const maxEvent = Number(await position.getAttribute('max'));
  async function selectLine(line: number) {
    await position.focus();
    await page.keyboard.press('Home');
    for (let index = 0; index <= maxEvent; index += 1) {
      if (await eventCard.getAttribute('data-event') === 'line' && await eventCard.getAttribute('data-line') === String(line)) return;
      await page.keyboard.press('ArrowRight');
    }
    throw new Error(`No line event found for line ${line}`);
  }

  await selectLine(3);
  const adjacentChanges = page.getByRole('button', { name: 'Adjacent changes' });
  await adjacentChanges.focus();
  await page.keyboard.press('Enter');
  await expect(adjacentChanges).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.snapshot-diff-list li[data-change-status="added"]')).toContainText('alias', { timeout: 5_000 });
  await expect(page.locator('.snapshot-diff-list li[data-change-status="changed"]')).toHaveCount(0);

  await selectLine(6);
  const changed = page.locator('.snapshot-diff-list li[data-change-status="changed"]');
  await expect(changed).toHaveCount(1, { timeout: 5_000 });
  await expect(changed).toContainText('value_');
});

test('keeps snapshots within per-event and per-run node budgets while recording trace events', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  const row = '[0, 1, 2, 3, 4, 5, 6, 7]';
  const nested = `[${Array.from({ length: 8 }, () => row).join(', ')}]`;
  const eventBudgetSource = [
    ...Array.from({ length: 20 }, (_, index) => `value_${String(index).padStart(2, '0')} = ${nested}`),
    'print("event-budget")',
  ].join('\n');
  await source.fill(eventBudgetSource);
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.getByText(/Some variable values are partial/)).toBeVisible({ timeout: 3_000 });
  const eventNodes = await page.locator('[data-snapshot-scope="globals"] [data-snapshot-kind]').count();
  expect(eventNodes).toBeLessThanOrEqual(200);

  const runBudgetSource = [
    ...Array.from({ length: 20 }, (_, index) => `value_${String(index).padStart(2, '0')} = list(range(8))`),
    'for index in range(300):',
    '    marker = index',
    'print("run-budget")',
  ].join('\n');
  await source.fill(runBudgetSource);
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.getByText(/50,000-node run budget/)).toBeVisible({ timeout: 3_000 });
  const eventCount = Number((await page.locator('#trace-event-count').innerText()).replace(/\D/g, ''));
  expect(eventCount).toBeGreaterThan(0);
  expect(eventCount).toBeLessThan(5_000);
  await expect(page.locator('#execution-output')).toHaveText('run-budget\n');
});

test('records repeated CPython line events for a loop without rerunning output during playback', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill('for i in range(3):\n    print(i)');
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('#execution-output')).toHaveText('0\n1\n2\n');

  const position = page.getByRole('slider', { name: 'Event position' });
  const maxEvent = Number(await position.getAttribute('max'));
  const repeatedLines: string[] = [];
  await position.focus();
  await page.keyboard.press('Home');
  for (let index = 0; index <= maxEvent; index += 1) {
    const eventCard = page.locator('.trace-event-card');
    if (await eventCard.getAttribute('data-event') === 'line' && await eventCard.getAttribute('data-line') === '2') {
      repeatedLines.push(await eventCard.getAttribute('data-line') ?? '');
    }
    await page.keyboard.press('ArrowRight');
  }
  expect(repeatedLines).toHaveLength(3);
});

test('editing source during execution removes old events before the new run', async ({ page }) => {
  await chooseCpython(page);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  await source.fill('i = 0\nwhile True:\n    i += 1');
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#trace-event-count')).not.toHaveText('0', { timeout: 10_000 });
  const oldCount = await page.locator('#trace-event-count').innerText();

  await source.fill('print("new source")');
  await expect(page.locator('#execution-status')).toHaveCount(0);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('#execution-output')).toHaveText('new source\n');
  expect(await page.locator('#trace-event-count').innerText()).not.toBe(oldCount);
});
