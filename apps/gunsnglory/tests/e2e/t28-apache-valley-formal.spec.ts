import { expect, test } from '@playwright/test';
import map from '../../src/content/new-mexico-02.json' with { type: 'json' };
import { calculateMapViewport, getMapCameraOriginBounds } from '../../src/render/map-viewport';
import { continueFromPauseBoard, setSimulationSpeedFromLab } from './helpers';

const officialCowGulchId = 'campaign-new-mexico-01';
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

function apacheSourceCollisionPack(enemiesText: string): readonly string[] | undefined {
  const enemies = [...enemiesText.matchAll(/(campaign-6-enemy-\d+) at \((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/g)]
    .flatMap((match) => {
      const [, id, x, y] = match;
      if (!id || !x || !y) return [];
      return [{ id, x: Number(x), y: Number(y) }];
    });
  const wagon = enemies.find(({ x, y }) => x === 4.5 && y >= -0.9 && y <= -0.75);
  const horsemen = enemies.filter(({ x, y }) => x === 4.5 && y === -1.5);
  if (!wagon || horsemen.length < 2) return undefined;
  return [wagon.id, ...horsemen.slice(0, 2).map(({ id }) => id)].sort();
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

async function hireThroughMapUi(page: import('@playwright/test').Page, slot: HireSlot): Promise<void> {
  const point = await mapHirePoint(page, slot);
  await clickCanvasPoint(page, point.x, point.y);
  const unitName = slot.type === 'gunslinger' ? 'Desperado' : 'Bandito';
  await expect(page.getByTestId('map-hire-confirmation')).toBeVisible();
  await expect(page.getByTestId('map-hire-confirmation-title')).toHaveText(unitName);
  await expect(page.getByTestId('map-hire-confirmation-price')).toHaveText(`$ ${slot.price}`);
  const confirmHire = page.getByTestId('confirm-map-hire');
  await expect(confirmHire).toBeEnabled();
  await confirmHire.click();
  await expect(page.getByTestId('map-hire-status')).toContainText('hired from the map');
}

test('formal Apache Valley reproduces the Wave 6 source collision stall without saving progress', async ({ page }) => {
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
  const status = page.getByTestId('wave-status');
  await expect(status).toContainText('Wave 1/6 · Lives 50');
  await expect(status).toContainText('Cash $100');
  const intro = page.getByTestId('campaign-wave-intro');
  await expect(intro).toBeVisible();
  await intro.getByRole('button', { name: 'Continue', exact: true }).click();

  await setSimulationSpeedFromLab(page, 4);
  await installManualGameClock(page);
  await continueFromPauseBoard(page);
  await expect(page.getByTestId('pause-board')).toBeHidden();
  const profileBeforeBattle = await readProfile(page);

  const slots = apacheValleyHireSlots();
  const hired = new Set<string>();
  currentMapOriginY = mapViewport.origin.y;
  const firstHire = slots.find(({ id }) => id === 'mexican-hire-01')!;
  await hireThroughMapUi(page, firstHire);
  hired.add(firstHire.id);
  await page.getByTestId('inspection-panel').evaluate((element) => {
    (element as HTMLDetailsElement).open = true;
  });

  let currentWave = 1;
  let collisionPack: readonly string[] | undefined;
  for (let frame = 0; frame < 100 && !collisionPack; frame += 1) {
    if (await intro.isVisible()) {
      await intro.getByRole('button', { name: 'Continue', exact: true }).click();
      continue;
    }
    if (!(await advanceGameFrame(page))) {
      throw new Error('The manual game clock has no scheduled animation frame');
    }
    if (await intro.isVisible()) {
      await intro.getByRole('button', { name: 'Continue', exact: true }).click();
      continue;
    }
    await expect(page.getByTestId('settlement')).toBeHidden();

    const statusText = await status.innerText();
    const waveMatch = statusText.match(/Wave (\d+)\/6/);
    if (waveMatch) currentWave = Number(waveMatch[1]);
    const cash = Number(statusText.match(/Cash \$(\d+)/)?.[1]);
    if (!Number.isSafeInteger(cash)) throw new Error(`Cash is not visible in wave status: ${statusText}`);
    const candidate = slots.find((slot) => !hired.has(slot.id) && slot.price <= cash);
    if (candidate) {
      await hireThroughMapUi(page, candidate);
      hired.add(candidate.id);
    }

    const packNow = apacheSourceCollisionPack(await page.getByTestId('inspection-enemies').innerText());
    if (packNow) {
      collisionPack = packNow;
      for (let step = 0; step < 5; step += 1) {
        expect(await advanceGameFrame(page, 25)).toBe(true);
        expect(apacheSourceCollisionPack(await page.getByTestId('inspection-enemies').innerText()))
          .toEqual(collisionPack);
        await expect(status).toContainText('Wave 6/6');
        await expect(page.getByTestId('settlement')).toBeHidden();
      }
    }
  }

  expect(collisionPack).toBeDefined();
  expect(currentWave).toBe(6);
  await expect(status).toContainText('Wave 6/6');
  await expect(page.getByTestId('settlement')).toBeHidden();
  expect(hired.has('mexican-hire-01')).toBe(true);

  const profile = await readProfile(page);
  expect(profile.completedScenarios).toEqual(profileBeforeBattle.completedScenarios);
  expect(profile.highScores).toEqual(profileBeforeBattle.highScores);
  expect(profile.appliedSettlementIds).toEqual(profileBeforeBattle.appliedSettlementIds);

  await page.reload();
  await expect(page.getByTestId('campaign-menu-screen')).toBeVisible();
  expect(await readProfile(page)).toEqual(profileBeforeBattle);
  await page.getByTestId('menu-start').click();
  await page.getByTestId('campaign-region-new-mexico').click();
  await expect(page.getByTestId('campaign-level-02')).toBeEnabled();
  await expect(page.getByTestId('campaign-level-03')).toBeDisabled();
});
