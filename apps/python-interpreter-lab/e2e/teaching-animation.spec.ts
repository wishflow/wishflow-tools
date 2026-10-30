import { expect, test } from '@playwright/test';

const appPath = '/python-interpreter-lab/';
const expectQuickly = expect.configure({ timeout: 10_000 });

async function compileTeachingSource(page: import('@playwright/test').Page, source: string) {
  await page.goto(appPath);
  await page.getByRole('combobox', { name: 'Execution view' }).selectOption('teaching');
  await expectQuickly(page.getByText('Ready to compile teaching program')).toBeVisible();
  await page.getByRole('textbox', { name: 'Python source' }).fill(source);
  await page.getByRole('button', { name: 'Compile teaching program' }).click();
  await expectQuickly(page.getByRole('button', { name: 'Play explanation' })).toBeEnabled();
}

test('plays alias, in-place mutation, and rebinding from recorded snapshots', async ({ page }) => {
  await compileTeachingSource(page, [
    'a = [1]',
    'b = a',
    'b[0] = 9',
    'b = [2]',
  ].join('\n'));

  await page.locator('.teaching-runtime-panel').evaluate((panel) => {
    const windowWithRecorder = window as Window & { __teachingAnimationMessages?: string[] };
    const messages = windowWithRecorder.__teachingAnimationMessages ?? [];
    windowWithRecorder.__teachingAnimationMessages = messages;
    const capture = () => {
      const card = panel.querySelector('.teaching-animation-panel');
      if (card) messages.push(card.textContent ?? '');
    };
    new MutationObserver(capture).observe(panel, { childList: true, characterData: true, subtree: true });
  });

  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expectQuickly(page.getByText('Teaching program finished').first()).toBeVisible({ timeout: 30_000 });
  const animationMessages = await page.evaluate(() => (window as Window & { __teachingAnimationMessages?: string[] }).__teachingAnimationMessages ?? []);
  const allAnimationMessages = animationMessages.join('\n');
  expect(allAnimationMessages).toContain('Create List object #1');
  expect(allAnimationMessages).toContain('Bind b to list #1');
  expect(allAnimationMessages).toContain('Update list object #1 at index [0] with 9');
  expect(allAnimationMessages).toContain('Create List object #2');

  const activeVariables = page.locator('.teaching-active-frame .teaching-variable-list');
  await expectQuickly(activeVariables).toContainText('a');
  await expectQuickly(activeVariables).toContainText('b');
  await expectQuickly(activeVariables).toContainText('list #1');
  await expectQuickly(activeVariables).toContainText('list #2');
  await expectQuickly(page.locator('#teaching-heap-object-1')).toContainText('9');
  await expectQuickly(page.locator('#teaching-heap-object-2')).toContainText('2');
  await expectQuickly(page.getByRole('button', { name: 'Play explanation' })).toBeDisabled();
});

test('animates parameter binding, preserves an aliased object, and returns a value to the caller', async ({ page }) => {
  await compileTeachingSource(page, [
    'def bump(items):',
    '  return items[0] + 1',
    'items = [8]',
    'result = bump(items)',
  ].join('\n'));
  await page.setViewportSize({ width: 320, height: 900 });
  await page.locator('.teaching-runtime-panel').evaluate((panel) => {
    const windowWithRecorder = window as Window & {
      __teachingCallAnimationMessages?: string[];
      __teachingCallAnimationOverflow?: number;
    };
    const messages = windowWithRecorder.__teachingCallAnimationMessages ?? [];
    windowWithRecorder.__teachingCallAnimationMessages = messages;
    const capture = () => {
      const card = panel.querySelector('.teaching-animation-panel');
      if (card) {
        const text = card.textContent ?? '';
        messages.push(text);
        if (text.includes('calls bump') || text.includes('(bump) returns')) {
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          windowWithRecorder.__teachingCallAnimationOverflow = Math.max(windowWithRecorder.__teachingCallAnimationOverflow ?? 0, overflow);
        }
      }
    };
    new MutationObserver(capture).observe(panel, { childList: true, characterData: true, subtree: true });
  });

  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expectQuickly(page.getByText('Teaching program finished').first()).toBeVisible({ timeout: 30_000 });
  const messages = await page.evaluate(() => (window as Window & { __teachingCallAnimationMessages?: string[] }).__teachingCallAnimationMessages ?? []);
  const callAnimationOverflow = await page.evaluate(() => (window as Window & { __teachingCallAnimationOverflow?: number }).__teachingCallAnimationOverflow ?? 0);
  const callMessages = messages.join('\n');
  expect(callMessages).toContain('calls bump and creates frame');
  expect(callMessages).toContain('Argument 1');
  expect(callMessages).toContain('L4:10');
  expect(callMessages).toContain('Return address');
  expect(callMessages).toContain('items');
  expect(callMessages).toContain('list #1');
  expect(callMessages).toContain('returns 9 to caller frame');
  expect(callMessages).toContain('(bump) returns 9');
  expect(callAnimationOverflow).toBeLessThanOrEqual(0);

  const activeVariables = page.locator('.teaching-active-frame .teaching-variable-list');
  await expectQuickly(activeVariables).toContainText('items');
  await expectQuickly(activeVariables).toContainText('list #1');
  await expectQuickly(activeVariables).toContainText('result');
  await expectQuickly(activeVariables).toContainText('9');
});

test('animates recursive frames with distinct IDs and returns in LIFO order', async ({ page }) => {
  await compileTeachingSource(page, [
    'def fact(n):',
    '  if n <= 1:',
    '    return 1',
    '  return n * fact(n - 1)',
    'result = fact(3)',
  ].join('\n'));
  await page.locator('.teaching-runtime-panel').evaluate((panel) => {
    const windowWithRecorder = window as Window & { __teachingRecursiveMessages?: string[] };
    const messages = windowWithRecorder.__teachingRecursiveMessages ?? [];
    windowWithRecorder.__teachingRecursiveMessages = messages;
    const capture = () => {
      const card = panel.querySelector('.teaching-animation-panel');
      if (card) messages.push(card.textContent ?? '');
    };
    new MutationObserver(capture).observe(panel, { childList: true, characterData: true, subtree: true });
  });
  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expectQuickly(page.getByText('Teaching program finished').first()).toBeVisible({ timeout: 30_000 });
  const messages = await page.evaluate(() => (window as Window & { __teachingRecursiveMessages?: string[] }).__teachingRecursiveMessages ?? []);
  const recursiveCalls = [...new Set(messages.join('\n').match(/Frame #(\d+) calls fact and creates frame #(\d+)/g) ?? [])];
  expect(recursiveCalls).toHaveLength(3);
  expect(new Set(recursiveCalls.map((call) => call.match(/creates frame #(\d+)/)?.[1])).size).toBe(3);
  const recursiveReturns = [...new Set(messages.join('\n').match(/Frame #(\d+) \(fact\) returns \d+ to caller frame #\d+\./g) ?? [])];
  expect(recursiveReturns).toHaveLength(3);
  expect(recursiveReturns.map((entry) => entry.match(/^Frame #(\d+)/)?.[1])).toEqual(['3', '2', '1']);
  expect(messages.join('\n')).toContain('returns 6 to caller frame');
  await expectQuickly(page.locator('.teaching-active-frame .teaching-variable-list')).toContainText('6');
});

test('animates bare and natural None returns from real Worker snapshots', async ({ page }) => {
  await compileTeachingSource(page, [
    'def bare_return():',
    '  return',
    'def natural_return():',
    '  value = 1',
    'first = bare_return()',
    'second = natural_return()',
  ].join('\n'));
  await page.locator('.teaching-runtime-panel').evaluate((panel) => {
    const windowWithRecorder = window as Window & { __teachingNoneMessages?: string[] };
    const messages = windowWithRecorder.__teachingNoneMessages ?? [];
    windowWithRecorder.__teachingNoneMessages = messages;
    const capture = () => {
      const card = panel.querySelector('.teaching-animation-panel');
      if (card) messages.push(card.textContent ?? '');
    };
    new MutationObserver(capture).observe(panel, { childList: true, characterData: true, subtree: true });
  });
  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expectQuickly(page.getByText('Teaching program finished').first()).toBeVisible({ timeout: 30_000 });
  const messages = await page.evaluate(() => (window as Window & { __teachingNoneMessages?: string[] }).__teachingNoneMessages ?? []);
  const allMessages = messages.join('\n');
  expect(allMessages).toContain('(bare_return) returns None');
  expect(allMessages).toContain('(natural_return) returns None');
  expect(allMessages).toContain('RETURN_NONE');
});

test('reports a failed call without a callee frame', async ({ page }) => {
  await compileTeachingSource(page, 'result = missing(1)');
  await page.locator('.teaching-runtime-panel').evaluate((panel) => {
    const windowWithRecorder = window as Window & { __teachingRejectedCallMessages?: string[] };
    const messages = windowWithRecorder.__teachingRejectedCallMessages ?? [];
    windowWithRecorder.__teachingRejectedCallMessages = messages;
    const capture = () => {
      const card = panel.querySelector('.teaching-animation-panel');
      if (card) messages.push(card.textContent ?? '');
    };
    new MutationObserver(capture).observe(panel, { childList: true, characterData: true, subtree: true });
  });
  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expectQuickly(page.getByRole('alert')).toContainText('Name error');
  await expectQuickly(page.locator('.teaching-animation-panel')).toContainText('no callee frame was created');
  await expectQuickly(page.locator('.teaching-animation-details')).toContainText('Not created');
  await expect(page.locator('.teaching-frame-list > li')).toHaveCount(1);
});

test('localizes call and return explanations in Chinese', async ({ page }) => {
  await compileTeachingSource(page, 'def identity(value):\n  return value\nresult = identity(7)');
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await page.locator('.teaching-runtime-panel').evaluate((panel) => {
    const windowWithRecorder = window as Window & { __teachingChineseMessages?: string[] };
    const messages = windowWithRecorder.__teachingChineseMessages ?? [];
    windowWithRecorder.__teachingChineseMessages = messages;
    const capture = () => {
      const card = panel.querySelector('.teaching-animation-panel');
      if (card) messages.push(card.textContent ?? '');
    };
    new MutationObserver(capture).observe(panel, { childList: true, characterData: true, subtree: true });
  });
  await page.getByRole('button', { name: '讲解播放' }).click();
  await expectQuickly(page.getByText('教学程序已完成').first()).toBeVisible({ timeout: 30_000 });
  const messages = await page.evaluate(() => (window as Window & { __teachingChineseMessages?: string[] }).__teachingChineseMessages ?? []);
  expect(messages.join('\n')).toContain('调用 identity');
  expect(messages.join('\n')).toContain('返回给调用帧');
});

test('continues explanation from a selected snapshot at the execution head', async ({ page }) => {
  await compileTeachingSource(page, 'first = 1 + 2\nsecond = first + 4');
  await page.getByRole('button', { name: 'Step one instruction' }).click();
  await expect(page.locator('.teaching-instruction-count')).toContainText('1 of');

  const history = page.getByRole('slider', { name: 'Source-step history' });
  await history.focus();
  await history.press('End');
  await expect(page.locator('.teaching-history-state')).toContainText('Viewing the current execution head.');
  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expectQuickly(page.getByText('Teaching program finished').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.teaching-instruction-count')).toContainText('of');
  await expect(page.getByRole('button', { name: 'Play explanation' })).toBeDisabled();
});

test('stops explanation before a source breakpoint without running past it', async ({ page }) => {
  await compileTeachingSource(page, 'first = 1 + 2\nsecond = first + 4');
  const instructionDetails = page.locator('.teaching-instruction-disclosure');
  await instructionDetails.locator('summary').click();
  await page.getByRole('button', { name: 'Set source breakpoint at line 2' }).click();

  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expectQuickly(page.locator('.teaching-breakpoint-status')).toContainText('Paused before source line 2');
  await expect(page.locator('.execution-status.status-text-paused')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play explanation' })).toBeEnabled();
  await expectQuickly(page.locator('.teaching-output-panel')).toContainText('No output yet.');

  const instructionCount = await page.locator('.teaching-instruction-count').innerText();
  await page.waitForTimeout(300);
  await expect(page.locator('.teaching-instruction-count')).toHaveText(instructionCount);
});

test('stops explanation on a runtime error and keeps the Worker error snapshot', async ({ page }) => {
  await compileTeachingSource(page, 'value = missing');
  await page.getByRole('button', { name: 'Play explanation' }).click();

  await expectQuickly(page.getByRole('alert')).toContainText('Name error');
  await expectQuickly(page.locator('.teaching-runtime-panel')).toContainText('Execution failed');
  await expect(page.locator('.execution-status.status-text-error')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play explanation' })).toBeDisabled();
  const instructionCount = await page.locator('.teaching-instruction-count').innerText();
  await page.waitForTimeout(300);
  await expect(page.locator('.teaching-instruction-count')).toHaveText(instructionCount);
});

test('waits for a real Worker pause during a long Step Over and does not advance afterward', async ({ page }) => {
  const body = Array.from({ length: 80 }, () => '  total = total + 1').join('\n');
  await compileTeachingSource(page, `def work():\n  total = 0\n${body}\n  return total\nanswer = work()`);

  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expect(page.locator('.teaching-frame-list > li.is-active-frame')).toContainText('work', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Pause explanation' }).click();
  await expect(page.locator('.execution-status.status-text-paused')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Play explanation' })).toBeEnabled();

  const instructionCount = await page.locator('.teaching-instruction-count').innerText();
  await page.waitForTimeout(120);
  await expect(page.locator('.teaching-instruction-count')).toHaveText(instructionCount);
});

test('pause during presentation cancels the pending timer and keeps the confirmed snapshot', async ({ page }) => {
  await compileTeachingSource(page, 'first = 1 + 2\nsecond = first + 4');
  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expectQuickly(page.getByText('Presenting recorded instruction changes.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause explanation' })).toBeEnabled();

  await page.getByRole('button', { name: 'Pause explanation' }).click();
  await expectQuickly(page.getByRole('button', { name: 'Play explanation' })).toBeEnabled();
  await expect(page.locator('.teaching-animation-panel')).toHaveCount(0);
  await expect(page.locator('.execution-status.status-text-paused')).toBeVisible();

  const instructionCount = await page.locator('.teaching-instruction-count').innerText();
  await page.waitForTimeout(300);
  await expect(page.locator('.teaching-instruction-count')).toHaveText(instructionCount);
});

test('reset cancels the current presentation and reduced motion keeps its action text', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await compileTeachingSource(page, 'value = 1 + 2');
  await page.getByRole('button', { name: 'Play explanation' }).click();
  const animation = page.locator('.teaching-animation-panel');
  await expect(animation).toBeVisible();
  await expect(animation).toContainText('Read constant');
  const reducedMotionDuration = await animation.evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));
  expect(reducedMotionDuration).toBeLessThanOrEqual(0.01);

  await page.getByRole('button', { name: 'Reset teaching VM' }).click();
  await expect(animation).toHaveCount(0);
  await expect(page.locator('.teaching-instruction-count')).toContainText('0 of');
  await expect(page.getByRole('button', { name: 'Play explanation' })).toBeEnabled();
});

test('editing source while presenting invalidates the old animation generation', async ({ page }) => {
  await compileTeachingSource(page, 'first = 1 + 2\nsecond = first + 4');
  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expectQuickly(page.locator('.teaching-animation-panel')).toBeVisible();

  await page.getByRole('textbox', { name: 'Python source' }).fill('replacement = 9');
  await expect(page.locator('.teaching-animation-panel')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Play explanation' })).toBeDisabled();
  await page.waitForTimeout(300);
  await expect(page.locator('.teaching-animation-panel')).toHaveCount(0);
});

test('switching engines cancels the current explanation generation', async ({ page }) => {
  await compileTeachingSource(page, 'first = 1 + 2\nsecond = first + 4');
  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expectQuickly(page.locator('.teaching-animation-panel')).toBeVisible();

  const engine = page.getByRole('combobox', { name: 'Execution view' });
  await engine.selectOption('cpython');
  await expect(engine).toHaveValue('cpython');
  await expect(page.locator('.teaching-animation-panel')).toHaveCount(0);
  await page.waitForTimeout(300);

  await engine.selectOption('teaching');
  await expect(engine).toHaveValue('teaching');
  await expect(page.getByRole('button', { name: 'Play explanation' })).toBeDisabled();
  await expect(page.locator('.teaching-animation-panel')).toHaveCount(0);
});

test('plays and pauses from the keyboard without horizontal overflow at supported widths', async ({ page }) => {
  await compileTeachingSource(page, 'value = 1 + 2\nprint(value)');
  const playButton = page.getByRole('button', { name: 'Play explanation' });
  await playButton.focus();
  await page.keyboard.press('Enter');
  await expectQuickly(page.getByRole('button', { name: 'Pause explanation' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expectQuickly(page.getByRole('button', { name: 'Play explanation' })).toBeEnabled();

  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth, `page overflow at ${width}px`).toBeLessThanOrEqual(viewportWidth);
  }
});

test('explains branch, loop, short-circuit, and range decisions from real Worker snapshots', async ({ page }) => {
  await compileTeachingSource(page, [
    'value = 0',
    'if value:',
    '  value = 1',
    'else:',
    '  value = 2',
    'if value == 2:',
    '  marker = 1',
    'else:',
    '  marker = 2',
    'while value < 3:',
    '  value = value + 1',
    'logical_false = 0 and missing',
    'logical_right = 1 and 5',
    'logical = value or missing',
    'for item in range(1):',
    '  value = item',
  ].join('\n'));
  await page.locator('.teaching-runtime-panel').evaluate((panel) => {
    const windowWithRecorder = window as Window & { __teachingControlFlowMessages?: string[] };
    const messages = windowWithRecorder.__teachingControlFlowMessages ?? [];
    windowWithRecorder.__teachingControlFlowMessages = messages;
    const capture = () => {
      const card = panel.querySelector('.teaching-animation-panel');
      if (card) messages.push(card.textContent ?? '');
    };
    new MutationObserver(capture).observe(panel, { childList: true, characterData: true, subtree: true });
  });

  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expectQuickly(page.getByText('Teaching program finished').first()).toBeVisible({ timeout: 30_000 });
  const messages = await page.evaluate(() => (window as Window & { __teachingControlFlowMessages?: string[] }).__teachingControlFlowMessages ?? []);
  const text = messages.join('\n');
  expect(text).toContain('The Python truth value of 0 is false, so this branch is skipped.');
  expect(text).toContain('Execution skips ahead to a later instruction.');
  expect(text).toContain('Execution returns to an earlier loop position.');
  expect(text).toContain('The left operand 3 determines the expression result; the right side is skipped.');
  expect(text).toContain('The left operand 0 determines the expression result; the right side is skipped.');
  expect(text).toContain('The left operand 1 does not short-circuit; execution continues into the right side.');
  expect(text).toContain('The iterator yields 0; the loop variable is bound by the next instruction.');
  expect(text).toContain('The iterator is exhausted; execution leaves the loop.');
  expect(text).toContain('Next instruction');
  expect(text).toContain('L5:');
  await expect(page.locator('.teaching-active-frame .teaching-variable-list')).toContainText('logical');
});

test('localizes branch and next-instruction explanations in Chinese', async ({ page }) => {
  await compileTeachingSource(page, [
    'count = 0',
    'if True:',
    '  selected = 7',
    'else:',
    '  selected = 0',
    'while count < 1:',
    '  count = count + 1',
  ].join('\n'));
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await page.locator('.teaching-runtime-panel').evaluate((panel) => {
    const windowWithRecorder = window as Window & { __teachingChineseBranchMessages?: string[] };
    const messages = windowWithRecorder.__teachingChineseBranchMessages ?? [];
    windowWithRecorder.__teachingChineseBranchMessages = messages;
    const capture = () => {
      const card = panel.querySelector('.teaching-animation-panel');
      if (card) messages.push(card.textContent ?? '');
    };
    new MutationObserver(capture).observe(panel, { childList: true, characterData: true, subtree: true });
  });

  await page.getByRole('button', { name: '讲解播放' }).click();
  await expectQuickly(page.getByText('教学程序已完成').first()).toBeVisible({ timeout: 30_000 });
  const messages = await page.evaluate(() => (window as Window & { __teachingChineseBranchMessages?: string[] }).__teachingChineseBranchMessages ?? []);
  const text = messages.join('\n');
  expect(text).toContain('的 Python 真值为真');
  expect(text).toContain('执行跳至后续指令。');
  expect(text).toContain('执行回到较早的循环位置。');
  expect(text).toContain('下一条指令');
});

test('explains a failed subscript write without presenting a successful mutation', async ({ page }) => {
  await compileTeachingSource(page, 'items = [1]\nitems[2] = 9');
  await page.locator('.teaching-runtime-panel').evaluate((panel) => {
    const windowWithRecorder = window as Window & { __teachingRuntimeErrorMessages?: string[] };
    const messages = windowWithRecorder.__teachingRuntimeErrorMessages ?? [];
    windowWithRecorder.__teachingRuntimeErrorMessages = messages;
    const capture = () => {
      const card = panel.querySelector('.teaching-animation-panel');
      if (card) messages.push(card.textContent ?? '');
    };
    new MutationObserver(capture).observe(panel, { childList: true, characterData: true, subtree: true });
  });

  await page.getByRole('button', { name: 'Play explanation' }).click();
  await expectQuickly(page.getByRole('alert')).toContainText('Index out of range');
  await page.waitForFunction(() => (window as Window & { __teachingRuntimeErrorMessages?: string[] })
    .__teachingRuntimeErrorMessages?.some((message) => message.includes('Instruction STORE_SUBSCR failed (index-out-of-range)')) ?? false,
  undefined, { timeout: 10_000 });
  const messages = await page.evaluate(() => (window as Window & { __teachingRuntimeErrorMessages?: string[] }).__teachingRuntimeErrorMessages ?? []);
  const text = messages.join('\n');
  expect(text).toContain('Instruction STORE_SUBSCR failed (index-out-of-range)');
  expect(text).toContain('Operands before failure');
  expect(text).toContain('9, list #1, 2');
  expect(text).toContain('This failed instruction did not change variables, objects, or output.');
  expect(text).not.toContain('Update list object #1 at index [2] with 9');
  await expect(page.locator('#teaching-heap-object-1')).toContainText('1');
  await expect(page.locator('#teaching-heap-object-1')).not.toContainText('9');
});

test('localizes runtime failure explanations in Chinese', async ({ page }) => {
  await compileTeachingSource(page, 'items = [1]\nitems[2] = 9');
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await page.locator('.teaching-runtime-panel').evaluate((panel) => {
    const windowWithRecorder = window as Window & { __teachingChineseRuntimeErrorMessages?: string[] };
    const messages = windowWithRecorder.__teachingChineseRuntimeErrorMessages ?? [];
    windowWithRecorder.__teachingChineseRuntimeErrorMessages = messages;
    const capture = () => {
      const card = panel.querySelector('.teaching-animation-panel');
      if (card) messages.push(card.textContent ?? '');
    };
    new MutationObserver(capture).observe(panel, { childList: true, characterData: true, subtree: true });
  });

  await page.getByRole('button', { name: '讲解播放' }).click();
  await expectQuickly(page.getByRole('alert')).toContainText('索引超出范围');
  await page.waitForFunction(() => (window as Window & { __teachingChineseRuntimeErrorMessages?: string[] })
    .__teachingChineseRuntimeErrorMessages?.some((message) => message.includes('指令 STORE_SUBSCR 执行失败')) ?? false,
  undefined, { timeout: 10_000 });
  const messages = await page.evaluate(() => (window as Window & { __teachingChineseRuntimeErrorMessages?: string[] }).__teachingChineseRuntimeErrorMessages ?? []);
  const text = messages.join('\n');
  expect(text).toContain('失败前的操作数');
  expect(text).toContain('这条失败指令没有改变变量、对象或输出');
});

test('keeps failure details within supported viewport widths', async ({ page }) => {
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await compileTeachingSource(page, 'items = [1]\nitems[2] = 9');
    await page.locator('.teaching-runtime-panel').evaluate((panel) => {
      const windowWithRecorder = window as Window & { __teachingFailureDetailOverflow?: number; __teachingFailureDetailSeen?: boolean };
      windowWithRecorder.__teachingFailureDetailOverflow = 0;
      windowWithRecorder.__teachingFailureDetailSeen = false;
      const capture = () => {
        const card = panel.querySelector('.teaching-animation-panel');
        if (!card) return;
        if (card.textContent?.includes('Instruction STORE_SUBSCR failed (index-out-of-range)')) {
          windowWithRecorder.__teachingFailureDetailSeen = true;
        }
        const pageOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const cardOverflow = card.scrollWidth - card.clientWidth;
        const overflow = Math.max(0, pageOverflow, cardOverflow);
        windowWithRecorder.__teachingFailureDetailOverflow = Math.max(
          windowWithRecorder.__teachingFailureDetailOverflow ?? 0,
          overflow,
        );
      };
      new MutationObserver(capture).observe(panel, { childList: true, characterData: true, subtree: true });
    });

    await page.getByRole('button', { name: 'Play explanation' }).click();
    await page.waitForFunction(() => (window as Window & { __teachingFailureDetailSeen?: boolean }).__teachingFailureDetailSeen ?? false,
    undefined, { timeout: 10_000 });
    const overflow = await page.evaluate(() => (window as Window & { __teachingFailureDetailOverflow?: number }).__teachingFailureDetailOverflow ?? 0);
    expect(overflow, `failure details overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test('keeps the branch reason and target visible with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await compileTeachingSource(page, 'if False:\n  selected = 1\nelse:\n  selected = 2');
  await page.getByRole('button', { name: 'Play explanation' }).click();
  const panel = page.locator('.teaching-animation-panel');
  await expectQuickly(panel).toContainText('The Python truth value of False is false');
  await expectQuickly(panel.locator('.teaching-animation-details')).toContainText('Next instruction');
  const reducedMotionDuration = await panel.evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));
  expect(reducedMotionDuration).toBeLessThanOrEqual(0.01);
});
