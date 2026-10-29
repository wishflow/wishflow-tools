import { expect, test } from '@playwright/test';

const appPath = '/python-interpreter-lab/';

test('runs source in CPython and records real call, line, and return events', async ({ page }) => {
  await page.goto(appPath);
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
  await page.goto(appPath);
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
  await page.goto(appPath);
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
  await page.goto(appPath);
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();
  const source = page.getByRole('textbox', { name: 'Python source' });
  const runButton = page.getByRole('button', { name: 'Run Python' });

  await source.fill('while True: pass');
  await runButton.click();
  await expect(page.locator('#execution-status')).toContainText('timed out', { timeout: 10_000 });
  await page.getByRole('button', { name: 'Retry runtime' }).click();
  await expect(page.getByText(/Pyodide 314\.0\.7.*CPython/)).toBeVisible();

  await source.fill('for i in range(3000):\n    value = i\nfor i in range(3000):\n    value = i');
  await page.getByRole('button', { name: 'Run Python' }).click();
  await expect(page.locator('#execution-status')).toContainText('completed', { timeout: 20_000 });
  await expect(page.locator('#trace-event-count')).toContainText('5,000');
  await expect(page.locator('.execution-panel .limit-notice')).toContainText('5,000-event limit');

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

test('summarizes large values without calling user repr methods or breaking trace capture', async ({ page }) => {
  await page.goto(appPath);
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

test('records repeated CPython line events for a loop without rerunning output during playback', async ({ page }) => {
  await page.goto(appPath);
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
  await page.goto(appPath);
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
