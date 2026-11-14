import { expect, test } from '@playwright/test';
import map from '../../src/content/new-mexico-03.json' with { type: 'json' };
import { calculateMapViewport } from '../../src/render/map-viewport';
import { continueFromPauseBoard, setSimulationSpeedFromLab } from './helpers';

const cowGulchId = 'campaign-new-mexico-01';
const apacheValleyId = 'campaign-new-mexico-02';
const fortKaboomId = 'campaign-new-mexico-03';
const mapViewport = calculateMapViewport(22, 17, 1024, 576);

type HireType = 'gunslinger' | 'mexican' | 'cannon' | 'indian' | 'sniper' | 'grandpa';
type HireSlot = { id: string; type: HireType; price: number; x: number; y: number };
type AudioPlayAttempt = { source: string; introWave?: string };

const hireDefinitions: Readonly<Record<number, { type: HireType; price: number }>> = {
  96: { type: 'gunslinger', price: 75 },
  97: { type: 'mexican', price: 100 },
  98: { type: 'cannon', price: 150 },
  99: { type: 'indian', price: 125 },
  100: { type: 'sniper', price: 90 },
  101: { type: 'grandpa', price: 130 },
};

const mapHirePriority: readonly HireType[] = ['sniper', 'mexican', 'indian', 'grandpa', 'gunslinger', 'cannon'];

const expectedIntros = [
  {
    wave: 1,
    speaker: 'Pedro',
    portrait: 'portrait_pedro',
    voice: 'sound_pedro',
    text: 'The army has hidden supply crates here. Collect them with a unit to earn lots of rewards!',
  },
  {
    wave: 2,
    speaker: 'Pedro',
    portrait: 'portrait_pedro',
    voice: 'sound_pedro',
    text: "The soldiers of Fort Kaboom love money more than anything. They're bound to desert and join us for a fistful of dollars.",
  },
  {
    wave: 3,
    speaker: 'Settlers',
    portrait: 'portrait_settlers',
    voice: 'sound_siedler',
    text: "I always feel claustrophobic in these narrow canyons. Let's take the more open western approach!",
  },
  {
    wave: 4,
    speaker: 'Pedro',
    portrait: 'portrait_pedro',
    voice: 'sound_pedro',
    text: 'More and more soldiers are deserting. Watch where the cannons go; if they leave the fort, you can then hire them later!',
  },
  {
    wave: 5,
    speaker: 'Settlers',
    portrait: 'portrait_settlers',
    voice: 'sound_siedler',
    text: 'We actually want to go west, so why are we always traveling east? Aww, what the heck!',
  },
  {
    wave: 6,
    speaker: 'Deserter',
    portrait: 'portrait_deserter',
    voice: 'sound_deserter_yes_sir',
    text: 'Sir, our spies report that hundreds of settlers are approaching from all directions.',
  },
  {
    wave: 7,
    speaker: 'Pedro',
    portrait: 'portrait_pedro',
    voice: 'sound_pedro',
    text: 'Loot! Lots of lovely loot!',
  },
  {
    wave: 8,
    speaker: 'Pedro',
    portrait: 'portrait_pedro',
    voice: 'sound_pedro',
    text: 'Hee hee hee! Come here!',
  },
  {
    wave: 9,
    speaker: 'Deserter',
    portrait: 'portrait_deserter',
    voice: 'sound_deserter_yes_sir',
    text: 'Sir, a large group of riders is approaching!',
  },
  {
    wave: 10,
    speaker: 'Pedro',
    portrait: 'portrait_pedro',
    voice: 'sound_pedro',
    text: "Looks like that's all. No, wait... more are arriving!",
  },
] as const;

function fortKaboomHireSlots(): HireSlot[] {
  const counts = new Map<number, number>();
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const definition = hireDefinitions[code];
    if (!definition) return [];
    const index = (counts.get(code) ?? 0) + 1;
    counts.set(code, index);
    return [{
      id: `${definition.type}-hire-${String(index).padStart(2, '0')}`,
      ...definition,
      x,
      y,
    }];
  }));
}

async function canvasPoint(
  page: import('@playwright/test').Page,
  x: number,
  y: number,
): Promise<{ x: number; y: number }> {
  const canvas = page.getByTestId('game-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no layout box');
  return { x: bounds.x + (x / 1024) * bounds.width, y: bounds.y + (y / 576) * bounds.height };
}

async function clickCanvasPoint(
  page: import('@playwright/test').Page,
  x: number,
  y: number,
): Promise<void> {
  const point = await canvasPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

function mapHirePoint(slot: HireSlot): { x: number; y: number } {
  const unitAnchorY = (slot.y + 0.25) * mapViewport.tileSize;
  const targetY = mapViewport.origin.y + unitAnchorY;
  if (targetY < 64 || targetY >= 447) throw new Error(`Map hire slot ${slot.id} remains behind the HUD`);
  return {
    x: mapViewport.origin.x + (slot.x + 0.5) * mapViewport.tileSize,
    y: targetY,
  };
}

function hireLabel(type: HireType): string {
  return ({
    gunslinger: 'Gunslinger',
    mexican: 'Mexican',
    cannon: 'Cannon',
    indian: 'Native',
    sniper: 'Markswoman',
    grandpa: 'Scattergun Grandpa',
  })[type];
}

async function hireThroughMapUi(
  page: import('@playwright/test').Page,
  slot: HireSlot,
): Promise<void> {
  const point = mapHirePoint(slot);
  await clickCanvasPoint(page, point.x, point.y);
  const selection = page.getByTestId('selection-status');
  const expectedSelection = `${hireLabel(slot.type)} is waiting to be hired · Cell (${slot.x + 1}, ${slot.y + 1})`;
  const actualSelection = await selection.innerText();
  if (actualSelection !== expectedSelection) {
    throw new Error(
      `Expected map selection ${expectedSelection}; received ${actualSelection || '(none)'} `
      + `at logical point (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`,
    );
  }
  await expect(page.getByTestId('map-hire-confirmation')).toBeVisible();
  await expect(page.getByTestId('map-hire-confirmation-title')).toHaveText(`Hire ${hireLabel(slot.type)} for $${slot.price}?`);
  const confirmHire = page.getByTestId('confirm-map-hire');
  await expect(confirmHire).toBeEnabled();
  await confirmHire.click();
  await expect(page.getByTestId('map-hire-status')).toHaveText(
    `${hireLabel(slot.type)} hired from the map for $${slot.price}.`,
  );
}

async function readCash(page: import('@playwright/test').Page): Promise<number> {
  const text = await page.getByTestId('wave-status').innerText();
  const cash = Number(text.match(/Cash \$(\d+)/)?.[1]);
  if (!Number.isSafeInteger(cash)) throw new Error(`Cash is not visible in wave status: ${text}`);
  return cash;
}

async function readLives(page: import('@playwright/test').Page): Promise<number> {
  const text = await page.getByTestId('wave-status').innerText();
  const lives = Number(text.match(/Lives (\d+)/)?.[1]);
  if (!Number.isSafeInteger(lives)) throw new Error(`Life count is not visible in wave status: ${text}`);
  return lives;
}

async function readProfile(page: import('@playwright/test').Page): Promise<Record<string, unknown>> {
  return page.evaluate(async () => new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readonly');
      const read = transaction.objectStore('profiles').get('default');
      read.onsuccess = () => resolve(read.result as Record<string, unknown>);
      read.onerror = () => reject(read.error);
      transaction.oncomplete = () => database.close();
    };
  }));
}

async function writeUnlockedProfile(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async ([cowGulchScenarioId, apacheValleyScenarioId]) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default',
        schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: true },
        completedScenarios: [cowGulchScenarioId, apacheValleyScenarioId],
        highScores: { [cowGulchScenarioId]: 50, [apacheValleyScenarioId]: 50 },
        appliedSettlementIds: [],
        revision: 2,
        lastOperationId: 'seed-fort-kaboom-formal-test',
        lastRequestDigest: 'seed-fort-kaboom-formal-test',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), [cowGulchId, apacheValleyId]);
}

async function installSeed42(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const originalGetRandomValues = crypto.getRandomValues.bind(crypto);
    let provideCampaignSeed = true;
    crypto.getRandomValues = ((array: Uint32Array<ArrayBuffer>) => {
      if (provideCampaignSeed && array instanceof Uint32Array && array.length === 1) {
        array[0] = 42;
        provideCampaignSeed = false;
        return array;
      }
      return originalGetRandomValues(array) as typeof array;
    }) as typeof crypto.getRandomValues;
  });
}

async function installAudioTracker(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const testWindow = window as Window & { __soundPlayAttempts?: AudioPlayAttempt[] };
    testWindow.__soundPlayAttempts = [];
    HTMLMediaElement.prototype.play = function () {
      const intro = document.querySelector<HTMLDialogElement>('[data-testid="campaign-wave-intro"]');
      testWindow.__soundPlayAttempts?.push({
        source: this.currentSrc || this.src,
        ...(intro?.open ? { introWave: intro.dataset.waveNumber } : {}),
      });
      return Promise.resolve();
    };
  });
}

async function installManualGameClock(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextHandle = 0;
    let timestamp = performance.now();
    window.requestAnimationFrame = (callback) => {
      const handle = ++nextHandle;
      callbacks.set(handle, callback);
      return handle;
    };
    window.cancelAnimationFrame = (handle) => { callbacks.delete(handle); };
    (window as Window & { advanceGngGameFrame?: (realDeltaMs?: number) => boolean }).advanceGngGameFrame = (realDeltaMs = 10_000) => {
      const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (!entry) return false;
      callbacks.delete(entry[0]);
      timestamp += realDeltaMs;
      entry[1](timestamp);
      return true;
    };
  });
}

async function advanceGameFrame(
  page: import('@playwright/test').Page,
  realDeltaMs = 10_000,
): Promise<boolean> {
  return page.evaluate((delta) => (
    window as Window & { advanceGngGameFrame?: (realDeltaMs?: number) => boolean }
  ).advanceGngGameFrame?.(delta) ?? false, realDeltaMs);
}

async function soundAttempts(page: import('@playwright/test').Page): Promise<AudioPlayAttempt[]> {
  return page.evaluate(() => (window as Window & { __soundPlayAttempts?: AudioPlayAttempt[] }).__soundPlayAttempts ?? []);
}

async function assertWaveIntro(
  page: import('@playwright/test').Page,
  expected: typeof expectedIntros[number],
): Promise<void> {
  const intro = page.getByTestId('campaign-wave-intro');
  await expect(intro).toBeVisible();
  await expect(intro).toHaveAttribute('data-wave-number', String(expected.wave));
  await expect(page.locator('#campaign-wave-intro-title')).toHaveText(expected.speaker);
  await expect(page.getByTestId('campaign-wave-intro-text')).toHaveText(expected.text);
  const portrait = page.getByTestId('campaign-wave-intro-portrait');
  await expect(portrait).toHaveAttribute('alt', expected.speaker);
  await expect(portrait).toHaveAttribute('src', new RegExp(`${expected.portrait}\\.png`));
  await expect(portrait).toHaveJSProperty('naturalWidth', 96);
  const attempts = await soundAttempts(page);
  expect(attempts.filter(({ source, introWave }) => (
    source.includes(`/assets/sounds/${expected.voice}.ogg`) && introWave === String(expected.wave)
  ))).toHaveLength(1);
  await intro.getByRole('button', { name: 'Continue', exact: true }).click();
}

async function moveFirstCannonThroughCanvas(page: import('@playwright/test').Page): Promise<void> {
  const originY = mapViewport.origin.y;
  const start = await canvasPoint(
    page,
    mapViewport.origin.x + (9.5 * mapViewport.tileSize),
    originY + (6.25 * mapViewport.tileSize),
  );
  const target = await canvasPoint(
    page,
    mapViewport.origin.x + (9.5 * mapViewport.tileSize),
    originY + (5.75 * mapViewport.tileSize),
  );
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 6 });
  for (let frame = 0; frame < 12; frame += 1) {
    if (await page.getByTestId('campaign-wave-intro').isVisible()) break;
    if (!(await advanceGameFrame(page, 250))) break;
  }
  await page.mouse.up();
  await expect(page.getByTestId('selection-status')).toHaveText('Cannon selected · Cell (10, 6)');
}

test('formal Fort Kaboom completes all ten waves through the campaign UI and saves one settlement', async ({ page }) => {
  test.setTimeout(360_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.clock.install({ time: new Date('2026-10-29T00:00:00Z') });
  await installSeed42(page);
  await installAudioTracker(page);
  await page.goto('/');
  await writeUnlockedProfile(page);
  await page.reload();

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-03')).toBeEnabled();
  await page.getByTestId('campaign-level-03').click();
  await expect(page.getByRole('heading', { name: 'Fort Kaboom' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByRole('dialog')).toContainText('Choose difficulty:');
  await page.getByTestId('campaign-difficulty-easy').click();

  await expect(page.locator('#scene-title')).toHaveText('Fort Kaboom · Level 3');
  await expect(page.getByTestId('asset-load-error')).toBeHidden();
  const status = page.getByTestId('wave-status');
  await expect(status).toContainText('Wave 1/10 · Lives 50');
  await expect(status).toContainText('Cash $300');
  const intro = page.getByTestId('campaign-wave-intro');
  await assertWaveIntro(page, expectedIntros[0]);

  await setSimulationSpeedFromLab(page, 4);
  await installManualGameClock(page);
  await continueFromPauseBoard(page);
  await expect(page.getByTestId('pause-board')).toBeHidden();

  const slots = fortKaboomHireSlots();
  expect(slots).toHaveLength(31);
  expect(slots.filter(({ type }) => type === 'cannon').map(({ id }) => id)).toEqual([
    'cannon-hire-01', 'cannon-hire-02',
  ]);
  const hires = new Set<string>();
  const firstCannon = slots.find(({ id }) => id === 'cannon-hire-01')!;
  const secondCannon = slots.find(({ id }) => id === 'cannon-hire-02')!;
  await hireThroughMapUi(page, firstCannon);
  hires.add(firstCannon.id);
  await hireThroughMapUi(page, secondCannon);
  hires.add(secondCannon.id);
  await moveFirstCannonThroughCanvas(page);

  const seenWaves = [1];
  let reachedSettlement = false;
  for (let frame = 0; frame < 120 && !reachedSettlement; frame += 1) {
    if (await intro.isVisible()) {
      const next = expectedIntros[seenWaves.length];
      if (!next) throw new Error('An unexpected extra campaign wave introduction appeared');
      await assertWaveIntro(page, next);
      seenWaves.push(next.wave);
      continue;
    }

    if (!(await advanceGameFrame(page))) {
      reachedSettlement = await page.getByTestId('settlement').isVisible();
      if (!reachedSettlement && !(await intro.isVisible())) {
        throw new Error('The formal campaign stopped without a wave introduction or settlement');
      }
      continue;
    }
    if (await intro.isVisible()) {
      const next = expectedIntros[seenWaves.length];
      if (!next) throw new Error('An unexpected extra campaign wave introduction appeared');
      await assertWaveIntro(page, next);
      seenWaves.push(next.wave);
      continue;
    }
    if (await page.getByTestId('settlement').isVisible()) {
      reachedSettlement = true;
      break;
    }

    const cash = await readCash(page);
    const purchaseCandidate = slots
      .filter(({ id, y }) => !hires.has(id) && y >= 4 && y <= 10)
      .sort((left, right) => mapHirePriority.indexOf(left.type) - mapHirePriority.indexOf(right.type)
        || left.y - right.y || left.x - right.x)
      .find(({ price }) => price <= cash);
    if (purchaseCandidate) {
      await hireThroughMapUi(page, purchaseCandidate);
      hires.add(purchaseCandidate.id);
    }
  }

  expect(seenWaves).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  await expect(page.getByTestId('settlement')).toBeVisible({ timeout: 1_000 });
  await expect(page.getByTestId('settlement-outcome')).toHaveText('Victory');
  await expect(status).toContainText('Wave 10/10');
  expect(await readLives(page)).toBeGreaterThan(0);
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('3/26 stages complete');
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Result saved to this browser.');

  const profile = await readProfile(page);
  expect(profile.completedScenarios).toEqual([cowGulchId, apacheValleyId, fortKaboomId]);
  expect(profile.appliedSettlementIds).toHaveLength(1);
  expect((profile.highScores as Record<string, number>)[fortKaboomId]).toBeGreaterThan(0);
  expect(hires.has('cannon-hire-01')).toBe(true);
  expect(hires.has('cannon-hire-02')).toBe(true);
  expect(hires.size).toBeGreaterThan(2);

  await page.reload();
  await expect(page.getByTestId('campaign-menu-screen')).toBeVisible();
  expect(await readProfile(page)).toEqual(profile);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-03')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-04')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-05')).toBeDisabled();
  await expect(page.getByTestId('campaign-level-05')).toHaveAttribute('aria-label', /locked/i);
  await page.getByTestId('campaign-level-03').click();
  await page.getByTestId('campaign-stage-play').click();
  await page.getByTestId('campaign-difficulty-easy').click();
  await expect(page.locator('#scene-title')).toHaveText('Fort Kaboom · Level 3');
  await expect(status).toContainText('Wave 1/10 · Lives 50');
  await expect(status).toContainText('Cash $300');
  await expect(intro).toHaveAttribute('data-wave-number', '1');
  await expect(page.getByTestId('settlement')).toBeHidden();
});
