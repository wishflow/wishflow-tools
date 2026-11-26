import { expect, test } from './auto-continue-fixtures';
import { pauseFromHud } from './helpers';

async function expectCampaignMenuImagesLoaded(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>(
    '[data-testid="campaign-menu-screen"] img',
  )].every((image) => image.complete && image.naturalWidth > 0));
}

async function expectCampaignOverviewAnchors(page: import('@playwright/test').Page): Promise<void> {
  const layout = await page.locator('.campaign-overview-card').evaluate((card) => {
    const bounds = card.getBoundingClientRect();
    const relative = (selector: string) => {
      const element = card.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing campaign overview element: ${selector}`);
      const rect = element.getBoundingClientRect();
      return { left: (rect.left - bounds.left) / bounds.width, top: (rect.top - bounds.top) / bounds.height };
    };
    return {
      aspect: bounds.width / bounds.height,
      title: relative('.campaign-overview-title'),
      images: relative('.campaign-overview-images'),
      description: relative('.campaign-level-description'),
      play: relative('.campaign-overview-play'),
      back: relative('.campaign-overview-cancel'),
      noScore: card.querySelector('.campaign-overview-no-score') ? relative('.campaign-overview-no-score') : undefined,
      freePlayNote: card.querySelector('.campaign-overview-free-play-note') ? relative('.campaign-overview-free-play-note') : undefined,
      poster: card.querySelector('.campaign-overview-wanted') ? relative('.campaign-overview-wanted') : undefined,
      titleFont: getComputedStyle(card.querySelector('.campaign-overview-title')!).fontFamily,
      descriptionFont: getComputedStyle(card.querySelector('.campaign-level-description')!).fontFamily,
      titleAlignment: getComputedStyle(card.querySelector('.campaign-overview-title')!).textAlign,
      descriptionScrollWidth: card.querySelector<HTMLElement>('.campaign-level-description')!.scrollWidth,
      descriptionClientWidth: card.querySelector<HTMLElement>('.campaign-level-description')!.clientWidth,
      playRight: (card.querySelector('.campaign-overview-play')!.getBoundingClientRect().right - bounds.left) / bounds.width,
      backBottom: (card.querySelector('.campaign-overview-cancel')!.getBoundingClientRect().bottom - bounds.top) / bounds.height,
    };
  });

  expect(layout.aspect).toBeCloseTo(1.5, 2);
  expect(layout.title.left).toBeCloseTo(52 / 480, 2);
  expect(layout.title.top).toBeCloseTo(47 / 320, 2);
  expect(layout.images.left).toBeCloseTo(52 / 480, 2);
  expect(layout.images.top).toBeCloseTo(67 / 320, 2);
  expect(layout.description.left).toBeCloseTo(52 / 480, 2);
  expect(layout.description.top).toBeCloseTo(142 / 320, 2);
  expect(layout.play.left).toBeCloseTo(306 / 480, 2);
  expect(layout.play.top).toBeCloseTo(221 / 320, 2);
  expect(layout.back.left).toBeCloseTo(23 / 480, 2);
  expect(layout.back.top).toBeCloseTo(275 / 320, 2);
  expect(layout.titleFont).toContain('serif');
  expect(layout.descriptionFont).toContain('serif');
  expect(layout.titleAlignment).toBe('center');
  expect(layout.descriptionScrollWidth).toBeLessThanOrEqual(layout.descriptionClientWidth + 1);
  expect(layout.playRight).toBeLessThanOrEqual(1.01);
  expect(layout.backBottom).toBeLessThanOrEqual(1.01);
  if (layout.noScore) {
    expect(layout.noScore.left).toBeCloseTo(layout.freePlayNote ? 64 / 100 : 314 / 480, 2);
    expect(layout.noScore.top).toBeCloseTo(49 / 320, 2);
  }
  if (layout.poster) {
    expect(layout.poster.left).toBeCloseTo(318 / 480, 2);
    expect(layout.poster.top).toBeCloseTo(49 / 320, 2);
  }
}

async function readSavedProfileCount(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('profiles')) {
        database.close();
        resolve(0);
        return;
      }
      const countRequest = database.transaction('profiles', 'readonly').objectStore('profiles').count();
      countRequest.onsuccess = () => {
        database.close();
        resolve(countRequest.result);
      };
      countRequest.onerror = () => reject(countRequest.error);
    };
  }));
}

async function writeSavedProfile(page: import('@playwright/test').Page, record: Record<string, unknown>): Promise<void> {
  await page.evaluate(async (savedRecord) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put(savedRecord);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), record);
}

async function logEscapeDiagnostics(page: import('@playwright/test').Page, label: string): Promise<void> {
  const snapshot = await page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>('.game-frame');
    const overlayHost = document.querySelector<HTMLElement>('[data-testid="overlay-host"]');
    const activeElement = document.activeElement;
    return {
      label: '',
      hidden: document.hidden,
      visibilityState: document.visibilityState,
      fullscreenElement: document.fullscreenElement instanceof HTMLElement
        ? document.fullscreenElement.id || document.fullscreenElement.dataset.testid || document.fullscreenElement.tagName
        : null,
      uiRoute: frame?.dataset.uiRoute,
      simulationState: frame?.dataset.simulationState,
      activeOverlay: frame?.dataset.activeOverlay,
      overlayHostHidden: overlayHost?.hidden,
      waveStatus: document.querySelector<HTMLElement>('[data-testid="wave-status"]')?.textContent,
      combatStatus: document.querySelector<HTMLElement>('[data-testid="combat-status"]')?.textContent,
      dialogs: [...document.querySelectorAll<HTMLDialogElement>('dialog')].map((dialog) => ({
        testId: dialog.dataset.testid,
        open: dialog.open,
        hidden: dialog.hidden,
      })),
      activeElement: activeElement instanceof HTMLElement ? {
        tagName: activeElement.tagName,
        id: activeElement.id,
        testId: activeElement.dataset.testid,
        text: activeElement.textContent?.trim().slice(0, 80),
      } : activeElement?.nodeName,
    };
  });
  console.log(`[gng-escape-diagnostic] ${JSON.stringify({ ...snapshot, label })}`);
}

async function installEscapeEventDiagnostics(page: import('@playwright/test').Page): Promise<void> {
  page.on('console', (message) => {
    if (message.text().startsWith('[gng-escape-key]')) console.log(message.text());
  });
  await page.evaluate(() => {
    const logEvent = (phase: string, event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const target = event.target;
      const targetSummary = target instanceof HTMLElement ? {
        tagName: target.tagName,
        id: target.id,
        testId: target.dataset.testid,
        text: target.textContent?.trim().slice(0, 80),
      } : target instanceof Node ? target.nodeName : null;
      console.info('[gng-escape-key]', JSON.stringify({
        phase,
        defaultPrevented: event.defaultPrevented,
        target: targetSummary,
        activeElement: document.activeElement instanceof HTMLElement
          ? {
            tagName: document.activeElement.tagName,
            id: document.activeElement.id,
            testId: document.activeElement.dataset.testid,
          }
          : document.activeElement?.nodeName,
      }));
    };
    window.addEventListener('keydown', (event) => logEvent('window-capture', event), true);
    document.addEventListener('keydown', (event) => logEvent('document-bubble-after-app', event));
  });
}

test('starts in the in-game menu and opens an implemented campaign level through the original navigation flow', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.getByTestId('campaign-menu-screen')).toBeVisible();
  await expect(page.locator('.scene-heading')).toBeHidden();
  await expect(page.getByTestId('game-toolbar')).toBeHidden();
  await expect(page.locator('.campaign-panel')).toBeHidden();
  await expect(page.getByTestId('archive-panel')).toBeHidden();
  await expectCampaignMenuImagesLoaded(page);
  expect(await readSavedProfileCount(page)).toBe(0);

  const start = page.getByTestId('menu-start');
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('campaign-menu-screen')).toContainText('Choose a region');
  await expect(page.locator('[data-testid^="campaign-region-"]')).toHaveCount(6);
  await expect(page.locator('[data-testid="campaign-region-new-mexico"] .campaign-region-number')).toHaveText('1');
  await expect(page.locator('[data-testid="campaign-region-mississippi"] .campaign-region-number')).toHaveText('2');
  await expectCampaignMenuImagesLoaded(page);
  await page.getByTestId('campaign-menu-back').click();
  await expect(page.getByTestId('menu-start')).toBeVisible();
  await page.getByTestId('menu-start').click();

  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.locator('[data-testid^="campaign-level-"]')).toHaveCount(10);
  await expect(page.getByTestId('campaign-level-01')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-02')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-03')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-03')).toHaveAttribute('aria-label', /locked/i);
  const campaignProgress = page.getByTestId('campaign-menu-progress');
  await expect(campaignProgress).toContainText('0/10 levels complete');
  await expect(campaignProgress).toContainText('Unimplemented levels are shown with a lock.');
  await expect(campaignProgress).not.toContainText('Levels 3–10 are not implemented yet.');
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(campaignProgress).toContainText('已完成 0/10 关');
  await expect(campaignProgress).toContainText('尚未实现的关卡会显示锁定标记。');
  await expect(campaignProgress).not.toContainText('第 3–10 关尚未实现。');
  await expect(page.getByTestId('campaign-level-03')).toHaveAttribute('aria-label', /未解锁/);
  await expect(page.getByTestId('campaign-level-04')).toHaveAttribute('aria-label', /未解锁/);
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await expectCampaignMenuImagesLoaded(page);
  await page.getByTestId('campaign-menu-back').click();
  await expect(page.getByTestId('campaign-region-new-mexico')).toBeVisible();
  await page.getByTestId('campaign-region-new-mexico').click();

  await page.getByTestId('campaign-level-01').click();
  await expect(page.getByRole('heading', { name: 'Cow Gulch' })).toBeVisible();
  await expect(page.locator('.campaign-overview-minimap')).toBeVisible();
  await expect(page.locator('.campaign-overview-wanted')).toHaveCount(0);
  await expect(page.locator('.campaign-overview-no-score')).toHaveText(
    'Your highscore for this level will be shown here as soon as you have played it for the first time.',
  );
  await expectCampaignMenuImagesLoaded(page);
  await expectCampaignOverviewAnchors(page);
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expectCampaignOverviewAnchors(page);
  await page.setViewportSize({ width: 640, height: 360 });
  await expectCampaignOverviewAnchors(page);
  await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  await page.setViewportSize({ width: 1280, height: 720 });
  const play = page.getByTestId('campaign-stage-play');
  await expect(play).toBeEnabled();
  await page.getByTestId('campaign-menu-back').first().click();
  await expect(page.getByTestId('campaign-level-01')).toBeVisible();
  await page.getByTestId('campaign-level-01').click();
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByRole('dialog')).toContainText('Choose difficulty:');
  await page.getByTestId('campaign-menu-back').click();
  await expect(page.getByRole('heading', { name: 'Cow Gulch' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByRole('dialog')).toContainText('Choose difficulty:');
  await expect(page.getByTestId('campaign-difficulty-hard')).toBeDisabled();
  await page.getByTestId('campaign-difficulty-medium').click();

  await expect(page.locator('#scene-title')).toHaveText('Cow Gulch · Level 1');
  await expect(page.getByTestId('scene-difficulty')).toContainText('MEDIUM');
  await expect(page.getByTestId('campaign-menu-screen')).toBeHidden();
  await expect(page.locator('.scene-heading')).toBeVisible();
  await expect(page.getByTestId('game-toolbar')).toBeHidden();
  await expect(page.getByTestId('map-zoom-controls')).toBeVisible();
  await expect(page.getByTestId('archive-panel')).toBeHidden();
  expect(pageErrors).toEqual([]);
});

test('shows the original wanted poster and saved score when a level has a high score', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await writeSavedProfile(page, {
    id: 'default',
    schemaVersion: 2,
    settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: true },
    completedScenarios: [],
    highScores: { 'campaign-new-mexico-01': 453 },
    appliedSettlementIds: [],
    revision: 1,
    lastOperationId: 'menu-highscore-fixture',
    lastRequestDigest: 'menu-highscore-fixture',
  });
  await page.reload();
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await page.getByTestId('campaign-level-01').click();

  await expect(page.locator('.campaign-overview-wanted')).toBeVisible();
  await expectCampaignOverviewAnchors(page);
  await expect(page.locator('.campaign-overview-score-label')).toHaveText('Best score');
  await expect(page.locator('.campaign-overview-score')).toHaveText('$ 453');
  await expect(page.locator('.campaign-overview-no-score')).toHaveCount(0);
});

test('Free Play overview note stays readable in English and Chinese across screen sizes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const sound = page.getByTestId('menu-sound');
  if (await sound.getAttribute('aria-pressed') !== 'false') await sound.click();
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('menu-free-play').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await page.getByTestId('campaign-level-01').click();

  const assertFreePlayNoteLayout = async (): Promise<void> => {
    const note = page.locator('.campaign-overview-free-play-note');
    await expect(note).toBeVisible();
    const layout = await note.evaluate((element) => {
      const card = element.closest<HTMLElement>('.campaign-overview-card');
      const detail = element.querySelector<HTMLElement>('span');
      const play = card?.querySelector<HTMLElement>('.campaign-overview-play');
      const description = card?.querySelector<HTMLElement>('.campaign-level-description');
      const images = card?.querySelector<HTMLElement>('.campaign-overview-images');
      if (!card || !detail || !play || !description || !images) throw new Error('Free Play overview layout is incomplete');
      const bounds = (target: Element) => {
        const { left, top, right, bottom, width } = target.getBoundingClientRect();
        return { left, top, right, bottom, width };
      };
      return {
        card: bounds(card), note: bounds(element), detail: bounds(detail), play: bounds(play),
        description: bounds(description), images: bounds(images),
        detailScrollHeight: detail.scrollHeight, detailClientHeight: detail.clientHeight,
        detailScrollWidth: detail.scrollWidth, detailClientWidth: detail.clientWidth,
      };
    });
    const overlap = (a: typeof layout.note, b: typeof layout.note) => (
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
    );
    expect(layout.note.left).toBeGreaterThanOrEqual(layout.card.left);
    expect(layout.note.right).toBeLessThanOrEqual(layout.card.right + 1);
    expect(layout.note.width / layout.card.width).toBeGreaterThanOrEqual(0.29);
    expect(layout.note.bottom).toBeLessThanOrEqual(layout.play.top);
    expect(overlap(layout.note, layout.description)).toBe(false);
    expect(overlap(layout.note, layout.images)).toBe(false);
    expect(layout.detailScrollHeight).toBeLessThanOrEqual(layout.detailClientHeight + 1);
    expect(layout.detailScrollWidth).toBeLessThanOrEqual(layout.detailClientWidth + 1);
  };

  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 640, height: 360 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByTestId('campaign-overview-minimap')).toBeVisible();
    await expect(page.getByTestId('campaign-overview-minimap')).toHaveAttribute('data-scenario-id', 'campaign-new-mexico-01');
    await expect(page.locator('.campaign-overview-free-play-note strong')).toHaveText('FREE PLAY');
    await expect(page.locator('.campaign-overview-free-play-note span')).toHaveText('No campaign progress or score is saved.');
    await assertFreePlayNoteLayout();

    await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
    await expect(page.locator('.campaign-overview-free-play-note strong')).toHaveText('自由游玩');
    await expect(page.locator('.campaign-overview-free-play-note span')).toHaveText('不记录战役进度或分数。');
    await assertFreePlayNoteLayout();
    await page.getByRole('button', { name: '切换界面语言为英文' }).click();
  }
  await expect(page.getByTestId('campaign-stage-play')).toBeEnabled();
  await expect(page.getByTestId('campaign-menu-back').first()).toBeVisible();
});

test('keeps Options to Help and Sound while the experiment lab stays outside the game frame', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.getByTestId('menu-start')).toBeVisible();
  await expect(page.getByTestId('menu-free-play')).toBeVisible();
  await expect(page.getByTestId('menu-help')).toBeVisible();
  await expect(page.getByTestId('menu-options')).toBeVisible();
  await expect(page.getByTestId('menu-sound')).toBeVisible();

  await page.getByTestId('menu-help').click();
  const helpPanel = page.getByTestId('game-help');
  await expect(helpPanel).toBeVisible();
  await expect(helpPanel.locator('.campaign-help-card')).toHaveCSS('background-image', /gng_hud_2_textbox_large\.png/);
  await expect(helpPanel).toContainText('HOW TO PLAY');
  await expect(helpPanel).toContainText('Select a unit, then click or tap');
  await expect(page.getByTestId('help-page-number')).toHaveText('1 / 3');
  const helpText = page.locator('.campaign-help-card ol');
  await expect(helpText).toHaveCSS('color', 'rgb(73, 55, 34)');
  expect(await helpText.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(10);
  const helpLayout = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.campaign-help-card');
    const list = card?.querySelector('ol');
    if (!card || !list) throw new Error('Help card content is missing');
    const cardBounds = card.getBoundingClientRect();
    const titleBounds = card.querySelector<HTMLElement>(':scope > h2')?.getBoundingClientRect();
    const listBounds = list.getBoundingClientRect();
    const backBounds = card.querySelector<HTMLElement>('.campaign-menu-back')?.getBoundingClientRect();
    if (!titleBounds || !backBounds) throw new Error('Help title or back control is missing');
    const overlapsBack = listBounds.left < backBounds.right && listBounds.right > backBounds.left
      && listBounds.top < backBounds.bottom && listBounds.bottom > backBounds.top;
    const usableRightEdge = cardBounds.right - cardBounds.width * 0.07;
    return { listRight: listBounds.right, titleRight: titleBounds.right, usableRightEdge, overlapsBack };
  });
  expect(helpLayout.listRight).toBeLessThanOrEqual(helpLayout.usableRightEdge);
  expect(helpLayout.titleRight).toBeLessThanOrEqual(helpLayout.usableRightEdge);
  expect(helpLayout.overlapsBack).toBe(false);
  await page.getByTestId('help-next').click();
  await expect(helpPanel).toContainText('Pinch');
  await expect(page.getByTestId('help-page-number')).toHaveText('2 / 3');
  await page.getByTestId('help-next').click();
  await expect(page.getByTestId('help-page-number')).toHaveText('3 / 3');
  await expect(page.getByTestId('help-next')).toBeDisabled();
  await page.getByTestId('help-previous').click();
  await expect(page.getByTestId('help-page-number')).toHaveText('2 / 3');
  await helpPanel.getByTestId('campaign-menu-back').click();
  await expect(helpPanel).toBeHidden();

  await page.getByTestId('menu-options').click();
  const optionsPanel = page.getByTestId('game-options');
  await expect(optionsPanel).toBeVisible();
  await expect(page.locator('.campaign-options-card > h2')).toHaveCSS('color', 'rgb(86, 57, 25)');
  await expect(optionsPanel.locator('.campaign-options-card')).toHaveCSS('background-image', /gng_hud_2_textbox_large\.png/);
  const optionsLayout = await optionsPanel.locator('.campaign-options-card').evaluate((card) => {
    const stage = card.closest('.game-stage');
    const bounds = card.getBoundingClientRect();
    const stageBounds = stage?.getBoundingClientRect();
    const heading = card.querySelector(':scope > h2')?.getBoundingClientRect();
    const help = card.querySelector<HTMLElement>('[data-testid="options-help"]')?.getBoundingClientRect();
    const sound = card.querySelector<HTMLElement>('[data-testid="options-sound-toggle"]')?.getBoundingClientRect();
    if (!stageBounds || !heading || !help || !sound) throw new Error('Options layout is incomplete');
    return {
      centerOffsetRatio: Math.abs((bounds.left + bounds.width / 2) - (stageBounds.left + stageBounds.width / 2)) / stageBounds.width,
      heightRatio: bounds.height / stageBounds.height,
      headingBottom: heading.bottom,
      helpTop: help.top,
      helpBottom: help.bottom,
      soundTop: sound.top,
      controlWidthDelta: Math.abs(help.width - sound.width),
      fontFamily: getComputedStyle(card).fontFamily,
      overflowing: card.scrollHeight > card.clientHeight + 1,
    };
  });
  expect(optionsLayout.centerOffsetRatio).toBeLessThan(0.01);
  expect(optionsLayout.heightRatio).toBeLessThan(0.5);
  expect(optionsLayout.headingBottom).toBeLessThan(optionsLayout.helpTop);
  expect(optionsLayout.helpBottom).toBeLessThan(optionsLayout.soundTop);
  expect(optionsLayout.controlWidthDelta).toBeLessThan(1);
  expect(optionsLayout.fontFamily).toContain('serif');
  expect(optionsLayout.overflowing).toBe(false);
  await expect(optionsPanel.getByTestId('options-help')).toHaveCSS('background-image', /gng_startmenu_2_menu_1_button\.png/);
  await expect(optionsPanel.getByTestId('options-sound-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(optionsPanel.getByTestId('options-sound-toggle')).toHaveCSS('background-image', /gng_startmenu_2_menu_1_button\.png/);
  await expect(optionsPanel.getByTestId('export-profile-archive')).toHaveCount(0);
  await expect(optionsPanel.getByTestId('simulation-speed')).toHaveCount(0);
  await expect(optionsPanel.getByTestId('experiment-cash-reward')).toHaveCount(0);
  await expect(optionsPanel.getByTestId('export-experiment-archive')).toHaveCount(0);
  await expect(optionsPanel.getByTestId('export-replay')).toHaveCount(0);
  await expect(optionsPanel.locator('button[data-action]')).toHaveCount(3);
  const menuSound = page.getByTestId('menu-sound');
  await expect(menuSound).toBeVisible();
  const menuSoundCovered = await menuSound.evaluate((button) => {
    const bounds = button.getBoundingClientRect();
    const topmost = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    return topmost !== button && topmost?.closest('[data-testid="overlay-host"]') !== null;
  });
  expect(menuSoundCovered).toBe(true);
  await expect(page.getByTestId('options-help')).toBeVisible();
  const lab = page.getByTestId('lab-workbench');
  await expect(lab).toBeVisible();
  expect(await lab.evaluate((section) => section.closest('.game-frame') === null)).toBe(true);
  await expect(lab.locator('.lab-card')).toHaveCount(3);
  await expect(lab).toHaveCSS('background-image', 'none');
  await expect(lab.locator('.lab-card').first()).toHaveCSS('background-image', 'none');
  await expect(lab.getByTestId('compare-schemes')).toHaveCSS('background-image', /gng_startmenu_2_menu_1_button\.png/);
  await expect(lab.getByTestId('export-experiment-archive')).toHaveCSS('background-image', /gng_startmenu_2_menu_1_button\.png/);
  const speed = page.getByTestId('simulation-speed');
  await expect(speed).toBeVisible();
  const experimentPanel = page.locator('.experiment-panel');
  await expect(experimentPanel).toBeVisible();
  expect(await experimentPanel.evaluate((panel) => panel.closest('.game-frame') !== null)).toBe(false);
  await expect(page.getByTestId('export-profile-archive')).toBeVisible();
  await expect(page.getByTestId('import-profile-archive')).toBeVisible();
  await expect(page.getByTestId('experiment-cash-reward')).toBeVisible();
  await expect(page.getByTestId('export-experiment-archive')).toBeVisible();
  await expect(page.getByTestId('import-experiment-archive')).toBeVisible();
  const optionsSound = optionsPanel.getByTestId('options-sound-toggle');
  await optionsSound.click();
  await expect(optionsSound).toHaveAttribute('aria-pressed', 'false');
  await expect(menuSound).toHaveAttribute('aria-pressed', 'false');
  await optionsSound.click();
  await expect(optionsSound).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('options-help').click();
  await expect(helpPanel).toBeVisible();
  await expect(optionsPanel).toBeHidden();
  await expect(helpPanel).toContainText('Select a unit, then click or tap');
  await helpPanel.getByTestId('campaign-menu-back').click();
  await expect(optionsPanel).toBeVisible();
  await optionsPanel.getByTestId('campaign-menu-back').click();
  await expect(optionsPanel).toBeHidden();
  await expect(page.getByTestId('menu-start')).toBeVisible();
});

test('opens Help from pause Options and returns to the still-paused board', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?testBattle=1');
  await expect(page.getByTestId('campaign-wave-intro')).toBeHidden();
  await expect(page.getByTestId('controls-help')).toHaveCount(0);
  await expect(page.getByTestId('sound-toggle')).toHaveCount(0);

  await pauseFromHud(page);
  await page.getByTestId('pause-options').click();
  const optionsPanel = page.getByTestId('game-options');
  await expect(optionsPanel).toBeVisible();
  await expect(page.getByTestId('campaign-menu-screen')).toBeHidden();
  await page.getByTestId('options-help').click();
  const helpPanel = page.getByTestId('game-help');
  await expect(helpPanel).toBeVisible();
  await expect(helpPanel).toContainText('HOW TO PLAY');
  await helpPanel.getByTestId('campaign-menu-back').click();
  await expect(optionsPanel).toBeVisible();
  await optionsPanel.getByTestId('campaign-menu-back').click();

  await expect(optionsPanel).toBeHidden();
  await expect(page.getByTestId('pause-board')).toBeVisible();
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
});

test('Escape returns through menu panels and opens the original pause board from battle', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByTestId('menu-options').click();
  const options = page.getByTestId('game-options');
  await expect(options).toBeVisible();
  await page.getByTestId('options-help').click();
  const help = page.getByTestId('game-help');
  await expect(help).toBeVisible();
  await expect(options).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
  await expect(options).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(options).toBeHidden();
  await expect(page.getByTestId('menu-start')).toBeVisible();

  await page.goto('/?testBattle=1');
  const waveIntro = page.getByTestId('campaign-wave-intro');
  if (await waveIntro.isVisible()) await waveIntro.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('overlay-host')).toBeHidden();
  await expect(page.getByTestId('wave-status')).not.toBeEmpty();
  await installEscapeEventDiagnostics(page);
  await logEscapeDiagnostics(page, 'before-first-escape');
  await page.keyboard.press('Escape');
  await logEscapeDiagnostics(page, 'after-first-escape');
  const pauseBoard = page.getByTestId('pause-board');
  await expect(pauseBoard).toBeVisible();
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
  await page.keyboard.press('Escape');
  await expect(pauseBoard).toBeVisible();
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
  await page.getByTestId('pause-continue').click();
});

test('the test battle opens Cow Gulch when the saved profile cannot be read', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined });
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?testBattle=1');

  await expect(page.getByTestId('wave-status')).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-board')).toBeVisible();
  await expect(page.locator('.game-frame')).toHaveAttribute('data-simulation-state', 'paused');
});

test('keeps Options and the external simulation speed usable on a narrow phone with the site language', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('campaign-menu-screen')).toBeVisible();
  const frame = page.locator('.game-frame');
  const bounds = await frame.boundingBox();
  if (!bounds) throw new Error('Game frame has no layout box');
  expect(Math.abs(bounds.width / bounds.height - 16 / 9)).toBeLessThan(0.02);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  const sound = page.getByTestId('menu-sound');
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  const soundHit = await sound.evaluate((button) => {
    const bounds = button.getBoundingClientRect();
    const target = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    return {
      bounds: { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom },
      hit: target?.outerHTML.slice(0, 180),
      isTopmost: target === button || button.contains(target),
    };
  });
  expect(soundHit.isTopmost, JSON.stringify(soundHit)).toBe(true);
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('settings-status')).toHaveText('Settings saved.');

  await page.getByTestId('menu-options').click();
  await expect(page.getByTestId('menu-sound')).toBeVisible();
  await expect(page.getByTestId('options-sound-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('game-options').getByTestId('campaign-menu-back').click();
  const speed = page.getByTestId('simulation-speed');
  await speed.scrollIntoViewIfNeeded();
  await speed.focus();
  await speed.press('Home');
  for (let index = 0; index < 9; index += 1) await speed.press('ArrowRight');
  await expect(speed).toHaveValue('2.5');
  await expect(page.getByTestId('simulation-speed-value')).toHaveText('2.5×');
  await expect(page.getByTestId('settings-status')).toHaveText('Settings saved.');

  await page.reload();
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByTestId('menu-start')).toHaveText('开始');
  await expect(page.getByTestId('menu-sound')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('simulation-speed')).toHaveValue('2.5');
  await expect(page.getByTestId('simulation-speed-value')).toHaveText('2.5×');
  await page.getByTestId('menu-options').click();
  await expect(page.getByTestId('options-sound-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('menu-sound')).toBeVisible();
  await expect(page.getByTestId('campaign-menu-back')).toHaveAttribute('aria-label', '返回');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
