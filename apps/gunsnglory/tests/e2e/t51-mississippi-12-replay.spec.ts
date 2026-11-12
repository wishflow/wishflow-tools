import { expect, test } from './auto-continue-fixtures';

async function createSteamValleyReplay(
  page: import('@playwright/test').Page,
  completedScenarioIds: readonly string[],
): Promise<string> {
  return page.evaluate(async (completed) => {
    const loadModule = (specifier: string) => import(specifier);
    const bootstrap = await loadModule('/src/bootstrap/browser.ts') as typeof import('../../src/bootstrap/browser');
    const identity = await loadModule('/src/content/mississippi-12-identity.ts') as typeof import('../../src/content/mississippi-12-identity');
    const contentVersion = bootstrap.getBrowserScenarioContentVersion(identity.mississippi12CampaignId, completed);
    if (!contentVersion) throw new Error('Steam Valley content version is unavailable');
    const session = await bootstrap.createBrowserGame(completed).open({
      scenarioId: identity.mississippi12CampaignId,
      contentVersion,
      mode: 'formal',
      difficulty: 'hard',
      randomSeed: 1_212,
    });
    try {
      for (let frame = 0; frame < 5_000 && !session.terminalRecord(); frame += 1) {
        session.advance({ deltaMs: 100 });
      }
      if (!session.terminalRecord()) throw new Error('Steam Valley replay fixture did not reach a terminal result');
      return await session.exportReplay();
    } finally {
      session.close();
    }
  }, [...completedScenarioIds]);
}

async function writeProfile(page: import('@playwright/test').Page, completedScenarios: readonly string[]): Promise<void> {
  await page.evaluate(async (completed) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put({
        id: 'default',
        schemaVersion: 2,
        settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: false },
        completedScenarios: completed,
        highScores: { 'campaign-mississippi-11': 900 },
        appliedSettlementIds: ['previous-formal-result'],
        revision: 1,
        lastOperationId: 'seed-mississippi-12-replay',
        lastRequestDigest: 'seed-mississippi-12-replay',
      });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }), completedScenarios);
}

async function readProfile(page: import('@playwright/test').Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('gunsnglory-profile', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('profiles', 'readonly');
      const read = transaction.objectStore('profiles').get('default');
      read.onsuccess = () => {
        const record = read.result;
        database.close();
        if (!record) {
          reject(new Error('Expected the seeded Steam Valley replay profile'));
          return;
        }
        resolve({
          settings: record.settings,
          completedScenarios: record.completedScenarios,
          highScores: record.highScores,
          appliedSettlementIds: record.appliedSettlementIds,
        });
      };
      read.onerror = () => reject(read.error);
    };
  }));
}

test('Steam Valley replay import follows its recorded unlock snapshot, not the active profile', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const withoutPyromaniac = await createSteamValleyReplay(page, []);
  const withPyromaniac = await createSteamValleyReplay(page, ['campaign-nevada-10']);
  await writeProfile(page, ['campaign-nevada-10']);
  await page.reload();
  const profileWithPyromaniac = await readProfile(page);

  await page.getByTestId('import-replay').setInputFiles({
    name: 'steam-valley-pyro-locked.replay.json',
    mimeType: 'application/json',
    buffer: Buffer.from(withoutPyromaniac),
  });
  await expect(page.getByTestId('replay-status')).toContainText('Replay verified');
  await expect(page.locator('#scene-title')).toHaveText('Steam Valley · Level 12');
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Replay result · not added to the saved profile.');
  expect(await readProfile(page)).toEqual(profileWithPyromaniac);

  await writeProfile(page, []);
  await page.reload();
  const profileWithoutPyromaniac = await readProfile(page);
  await page.getByTestId('import-replay').setInputFiles({
    name: 'steam-valley-pyro-unlocked.replay.json',
    mimeType: 'application/json',
    buffer: Buffer.from(withPyromaniac),
  });
  await expect(page.getByTestId('replay-status')).toContainText('Replay verified');
  await expect(page.locator('#scene-title')).toHaveText('Steam Valley · Level 12');
  await expect(page.getByTestId('settlement-save-status')).toHaveText('Replay result · not added to the saved profile.');
  expect(await readProfile(page)).toEqual(profileWithoutPyromaniac);
});
