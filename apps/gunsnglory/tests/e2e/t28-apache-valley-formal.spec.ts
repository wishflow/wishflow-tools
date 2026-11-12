import { expect, test } from '@playwright/test';
import map from '../../src/content/new-mexico-02.json' with { type: 'json' };
import { calculateMapViewport, getMapCameraOriginBounds } from '../../src/render/map-viewport';
import { continueFromPauseBoard, setSimulationSpeedFromLab } from './helpers';

const officialCowGulchId = 'campaign-new-mexico-01';
const officialApacheValleyId = 'campaign-new-mexico-02';
const mapViewport = calculateMapViewport(20, 18, 1024, 576);
const mapOriginBounds = getMapCameraOriginBounds(mapViewport.mapHeight, 576, mapViewport.tileSize);
let currentMapOriginY = mapViewport.origin.y;

type HireSlot = { id: string; type: 'gunslinger' | 'mexican'; price: number; x: number; y: number };

function apacheValleyHireSlots(): HireSlot[] {
  const counts = new Map<number, number>();
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    if (code !== 96 && code !== 97) return [];
    const index = (counts.get(code) ?? 0) + 1;
    counts.set(code, index);
    const gunslinger = code === 96;
    return [{
      id: `${gunslinger ? 'gunslinger' : 'mexican'}-hire-${String(index).padStart(2, '0')}`,
      type: gunslinger ? 'gunslinger' as const : 'mexican' as const,
      price: gunslinger ? 75 : 100,
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

async function panMapBy(page: import('@playwright/test').Page, deltaY: number): Promise<void> {
  let remaining = deltaY;
  while (Math.abs(remaining) > 0.5) {
    const step = Math.max(-200, Math.min(200, remaining));
    const startY = step > 0 ? 100 : 400;
    const start = await canvasPoint(page, mapViewport.origin.x + (0.5 * mapViewport.tileSize), startY);
    const end = await canvasPoint(page, mapViewport.origin.x + (0.5 * mapViewport.tileSize), startY + step);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 5 });
    await page.mouse.up();
    remaining -= step;
  }
}

async function mapHirePoint(page: import('@playwright/test').Page, slot: HireSlot): Promise<{ x: number; y: number }> {
  const unitAnchorY = (slot.y + 0.25) * mapViewport.tileSize;
  let targetY = currentMapOriginY + unitAnchorY;
  if (targetY < 90 || targetY > 430) {
    const desiredY = targetY < 90 ? 150 : 420;
    const nextOrigin = Math.max(mapOriginBounds.minimum, Math.min(mapOriginBounds.maximum, desiredY - unitAnchorY));
    await panMapBy(page, nextOrigin - currentMapOriginY);
    currentMapOriginY = Math.round(nextOrigin);
    targetY = currentMapOriginY + unitAnchorY;
  }
  if (targetY < 64 || targetY >= 447) throw new Error(`Map hire slot ${slot.id} remains behind the HUD`);
  return {
    x: mapViewport.origin.x + (slot.x + 0.5) * mapViewport.tileSize,
    y: targetY,
  };
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
  await page.evaluate(async (completedScenarioId) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default',
        schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: false },
        completedScenarios: [completedScenarioId],
        highScores: { [completedScenarioId]: 50 },
        appliedSettlementIds: [],
        revision: 1,
        lastOperationId: 'seed-apache-valley-formal-test',
        lastRequestDigest: 'seed-apache-valley-formal-test',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), officialCowGulchId);
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
    (window as Window & { advanceGngGameFrame?: () => boolean }).advanceGngGameFrame = () => {
      const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (!entry) return false;
      callbacks.delete(entry[0]);
      timestamp += 10_000;
      entry[1](timestamp);
      return true;
    };
  });
}

async function hireThroughMapUi(page: import('@playwright/test').Page, slot: HireSlot): Promise<void> {
  const point = await mapHirePoint(page, slot);
  await clickCanvasPoint(page, point.x, point.y);
  const unitName = slot.type === 'gunslinger' ? 'Gunslinger' : 'Mexican';
  await expect(page.getByTestId('map-hire-confirmation')).toBeVisible();
  await expect(page.getByTestId('map-hire-confirmation-title')).toHaveText(`Hire ${unitName} for $${slot.price}?`);
  const confirmHire = page.getByTestId('confirm-map-hire');
  await expect(confirmHire).toBeEnabled();
  await confirmHire.click();
  await expect(page.getByTestId('map-hire-status')).toContainText('hired from the map');
}

test('formal Apache Valley can be won through the map hiring UI and saves progress across reload', async ({ page }) => {
  test.setTimeout(360_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.clock.install({ time: new Date('2026-10-29T00:00:00Z') });
  await installSeed42(page);
  await page.goto('/');
  await writeUnlockedProfile(page);
  await page.reload();

  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-02')).toBeEnabled();
  await page.getByTestId('campaign-level-02').click();
  await expect(page.getByRole('heading', { name: 'Death Valley' })).toBeVisible();
  await page.getByTestId('campaign-stage-play').click();
  await expect(page.getByRole('dialog')).toContainText('Choose difficulty:');
  await page.getByTestId('campaign-difficulty-easy').click();
  await expect(page.locator('#scene-title')).toHaveText('Apache Valley · Level 2');
  await expect(page.getByTestId('wave-status')).toContainText('Wave 1/6 · Lives 50');
  await expect(page.getByTestId('wave-status')).toContainText('Cash $100');
  const intro = page.getByTestId('campaign-wave-intro');
  await expect(intro).toBeVisible();
  await intro.getByRole('button', { name: 'Continue', exact: true }).click();

  await setSimulationSpeedFromLab(page, 4);
  await installManualGameClock(page);
  await continueFromPauseBoard(page);
  await expect(page.getByTestId('pause-board')).toBeHidden();

  const slots = apacheValleyHireSlots();
  const hired = new Set<string>();
  currentMapOriginY = mapViewport.origin.y;
  const firstHire = slots.find(({ id }) => id === 'mexican-hire-01')!;
  await hireThroughMapUi(page, firstHire);
  hired.add(firstHire.id);
  const status = page.getByTestId('wave-status');
  let currentWave = 1;
  for (let frame = 0; frame < 100; frame += 1) {
    if (await intro.isVisible()) {
      await intro.getByRole('button', { name: 'Continue', exact: true }).click();
      continue;
    }
    const advanced = await page.evaluate(() => (window as Window & { advanceGngGameFrame?: () => boolean }).advanceGngGameFrame?.());
    if (!advanced) throw new Error('The manual game clock has no scheduled animation frame');
    if (await intro.isVisible()) {
      await intro.getByRole('button', { name: 'Continue', exact: true }).click();
      continue;
    }
    if (await page.getByTestId('settlement').isVisible()) break;

    const statusText = await status.innerText();
    const waveMatch = statusText.match(/Wave (\d+)\/6/);
    if (waveMatch) currentWave = Number(waveMatch[1]);
    const cashMatch = statusText.match(/Cash \$(\d+)/);
    const cash = Number(cashMatch?.[1]);
    if (!Number.isSafeInteger(cash)) throw new Error(`Cash is not visible in wave status: ${statusText}`);
    const candidate = slots.find((slot) => !hired.has(slot.id) && slot.price <= cash);
    if (!candidate) continue;

    await hireThroughMapUi(page, candidate);
    hired.add(candidate.id);
  }

  const settlement = page.getByTestId('settlement');
  await expect(settlement).toBeVisible({ timeout: 1_000 });
  await expect(page.getByTestId('settlement-outcome')).toHaveText('Victory');
  await expect(status).toContainText('Wave 6/6');
  const finalStatus = await status.innerText();
  const lives = Number(finalStatus.match(/Lives (\d+)/)?.[1]);
  expect(lives).toBeGreaterThan(0);
  await expect(page.getByTestId('campaign-progress-summary')).toHaveText('2/16 stages complete');
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Result saved to this browser.');

  const profile = await readProfile(page);
  expect(profile.completedScenarios).toEqual([officialCowGulchId, officialApacheValleyId]);
  expect(profile.appliedSettlementIds).toHaveLength(1);
  expect((profile.highScores as Record<string, number>)[officialApacheValleyId]).toBeGreaterThan(0);
  expect(hired.size).toBeGreaterThanOrEqual(17);

  await page.reload();
  await expect(page.getByTestId('campaign-menu-screen')).toBeVisible();
  expect(await readProfile(page)).toEqual(profile);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-01')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-02')).toBeEnabled();
  expect(currentWave).toBe(6);
});
