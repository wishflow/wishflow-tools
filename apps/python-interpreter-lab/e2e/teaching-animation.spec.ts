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
