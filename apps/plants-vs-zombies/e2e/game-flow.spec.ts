import { expect, test } from '@playwright/test';

const allMiniGameIds = [
  'zombotany', 'wall-nut-bowling', 'slot-machine', 'its-raining-seeds', 'beghouled', 'invisi-ghoul', 'seeing-stars', 'zombiquarium', 'beghouled-twist', 'big-trouble-little-zombie',
  'portal-combat', 'column-like-you-see-em', 'bobsled-bonanza', 'zombie-nimble-zombie-quick', 'whack-a-zombie', 'last-stand', 'zombotany-2', 'wall-nut-bowling-2', 'pogo-party', 'dr-zomboss-revenge',
];
const allPuzzleIds = [
  'vasebreaker', 'to-the-left', 'third-vase', 'chain-reaction', 'm-is-for-metal', 'scary-potter', 'hokey-pokey', 'another-chain-reaction', 'ace-of-vase', 'vasebreaker-endless',
  'i-zombie', 'i-zombie-too', 'can-you-dig-it', 'totally-nuts', 'dead-zeppelin', 'me-smash', 'zomboogie', 'three-hit-wonder', 'all-your-brainz-r-belong-to-us', 'i-zombie-endless',
];

async function confirmSeedSelection(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('#seed-select-view')).toBeVisible();
  await page.getByRole('button', { name: /Enter level|进入关卡/ }).click();
}

test('desktop player can start a lawn and place a plant', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Garden Defense|花园防线/ })).toBeVisible();
  await page.getByRole('button', { name: /Almanac|图鉴/ }).click();
  await expect(page.locator('#almanac-content .almanac-section')).toHaveCount(2);
  await expect(page.locator('#almanac-content .almanac-section').nth(0).locator('.almanac-card')).toHaveCount(49);
  await expect(page.locator('#almanac-content .almanac-section').nth(1).locator('.almanac-card')).toHaveCount(26);
  await page.getByRole('button', { name: /Main menu|主菜单/ }).click();
  await page.getByRole('button', { name: /Start Adventure|开始冒险/ }).click();
  await confirmSeedSelection(page);
  await expect(page.getByRole('region', { name: /Battlefield|战场/ })).toBeVisible();
  await expect(page.locator('#game-host canvas')).toBeAttached({ timeout: 15_000 });
  await page.getByRole('button', { name: /Peashooter|豌豆射手/ }).click();
  await page.getByRole('button', { name: /Plant row 3 column 2|种植 第3行 第2列/ }).click();
  await expect(page.getByText(/Sun 50|阳光 50/)).toBeVisible();
});

test('landscape touch viewport keeps the game controls reachable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Start Adventure|开始冒险/ })).toBeVisible();
  await page.getByRole('button', { name: /Start Adventure|开始冒险/ }).tap();
  await confirmSeedSelection(page);
  await expect(page.getByRole('region', { name: /Battlefield|战场/ })).toBeVisible();
  await expect(page.locator('#game-host canvas')).toBeAttached({ timeout: 15_000 });
  await context.close();
});

test('unlocked pool levels expose six lawn rows', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('wishflow-plants-vs-zombies-profile', JSON.stringify({
      version: 1,
      settings: { music: true, sound: true, screenShake: true },
      adventure: {
        unlockedLevels: Array.from({ length: 21 }, (_, index) => (Math.floor(index / 10) + 1) + '-' + (index % 10 + 1)),
        completedLevels: [],
      },
      unlockedPlants: ['sunflower', 'peashooter', 'lily-pad'],
    }));
  });
  await page.goto('/');
  await page.getByLabel(/Unlocked levels|已解锁关卡/).selectOption('3-1');
  await page.getByRole('button', { name: /Start Adventure|开始冒险/ }).click();
  await confirmSeedSelection(page);
  await expect(page.locator('#level-stamp')).toHaveText('3-1');
  await expect(page.locator('#board-grid .board-cell')).toHaveCount(54);
  await page.getByRole('button', { name: /Peashooter|豌豆射手/ }).click();
  await page.getByRole('button', { name: /Plant row 3 column 2|种植 第3行 第2列/ }).click();
  await expect(page.locator('#game-status')).toHaveText(/Place a Lily Pad or Flower Pot first|请先放置睡莲或花盆/);
  await page.getByRole('button', { name: /Lily Pad|睡莲/ }).click();
  await page.getByRole('button', { name: /Plant row 3 column 2|种植 第3行 第2列/ }).click();
  await page.getByRole('button', { name: /Peashooter|豌豆射手/ }).click();
  await page.getByRole('button', { name: /Plant row 3 column 2|种植 第3行 第2列/ }).click();
  await expect(page.getByText(/Sun 75|阳光 75/)).toBeVisible();
});

test('survival unlocks after Adventure and offers five-flag, ten-flag, and endless runs', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('wishflow-plants-vs-zombies-profile', JSON.stringify({
      version: 1,
      settings: { music: true, sound: true, screenShake: true },
      adventure: { unlockedLevels: ['1-1', '1-2', '5-10'], completedLevels: ['5-10'] },
      unlockedPlants: ['sunflower', 'peashooter'],
    }));
  });
  await page.goto('/');
  const survivalButton = page.getByRole('button', { name: /Survival|生存/ });
  await expect(survivalButton).toBeEnabled();
  await survivalButton.click();
  await page.locator('.mode-option').filter({ has: page.getByText('Survival · Day', { exact: true }) }).click();
  await confirmSeedSelection(page);
  await expect(page.locator('#level-stamp')).toHaveText('survival-day');
  await expect(page.locator('#wave-counter')).toHaveText(/Wave 0 \/ 5|波次 0 \/ 5/);
  await page.getByRole('button', { name: /Main menu|主菜单/ }).click();
  await page.getByRole('button', { name: /Survival|生存/ }).click();
  await page.locator('.mode-option').filter({ has: page.getByText('Survival · Day · Hard', { exact: true }) }).click();
  await confirmSeedSelection(page);
  await expect(page.locator('#level-stamp')).toHaveText('survival-day-hard');
  await page.getByRole('button', { name: /Main menu|主菜单/ }).click();
  await page.getByRole('button', { name: /Survival|生存/ }).click();
  await page.locator('.mode-option').filter({ has: page.getByText('Survival · Pool · Endless', { exact: true }) }).click();
  await confirmSeedSelection(page);
  await expect(page.locator('#level-stamp')).toHaveText('survival-pool-endless');
  await expect(page.locator('#wave-counter')).toHaveText(/Wave 0 \/ ∞|波次 0 \/ ∞/);
});

test('Puzzle unlocks after Adventure 4-6 and Vasebreaker opens a deterministic board', async ({ page }) => {
  await page.addInitScript((unlockedModes) => {
    localStorage.setItem('wishflow-plants-vs-zombies-profile', JSON.stringify({
      version: 2,
      settings: { music: true, sound: true, screenShake: true },
      adventure: { unlockedLevels: ['1-1', '1-2', '4-6'], completedLevels: ['4-6'] },
      unlockedPlants: ['sunflower', 'peashooter'],
      unlockedModes,
      completedModes: [],
    }));
  }, allPuzzleIds);
  await page.goto('/');
  await page.getByRole('button', { name: /Puzzle|解谜/ }).click();
  await expect(page.locator('.mode-option')).toHaveCount(20);
  await page.locator('.mode-option').filter({ has: page.getByText('Vasebreaker', { exact: true }) }).click();
  await expect(page.locator('#custom-mode-view')).toBeVisible();
  await expect(page.locator('#custom-mode-title')).toHaveText(/Vasebreaker|砸罐子/);
  await expect(page.locator('.vase-cell')).toHaveCount(30);
  await page.locator('.vase-cell:not(.open)').first().click();
  await expect(page.locator('.vase-cell:not(.open)')).toHaveCount(29);
  await page.getByRole('button', { name: /Main menu|主菜单/ }).click();
  await page.getByRole('button', { name: /Puzzle|解谜/ }).click();
  await page.locator('.mode-option').filter({ has: page.getByText('M is for Metal', { exact: true }) }).click();
  await expect(page.locator('.vase-cell')).toHaveCount(42);
});

test('mini-game, I Zombie, and Zen Garden entries launch their separate runtimes', async ({ page }) => {
  await page.addInitScript((unlockedModes) => {
    localStorage.setItem('wishflow-plants-vs-zombies-profile', JSON.stringify({
      version: 2,
      settings: { music: true, sound: true, screenShake: true },
      adventure: { unlockedLevels: ['1-1', '1-2', '3-2', '4-6', '5-4', '5-10'], completedLevels: ['3-2', '4-6', '5-4', '5-10'] },
      unlockedPlants: ['sunflower', 'peashooter'],
      unlockedModes,
      completedModes: [],
    }));
  }, [...allMiniGameIds, ...allPuzzleIds]);
  await page.goto('/');

  await page.getByRole('button', { name: /Mini-games|小游戏/ }).click();
  await expect(page.locator('.mode-option')).toHaveCount(20);
  await page.locator('.mode-option').filter({ has: page.getByText('Wall-nut Bowling', { exact: true }) }).click();
  await expect(page.locator('#custom-mode-title')).toHaveText(/Wall-nut Bowling|坚果保龄球/);
  await expect(page.locator('#custom-mode-actions .mode-action')).toHaveCount(5);
  await page.locator('#custom-mode-actions .mode-action').first().click();
  await page.getByRole('button', { name: /Main menu|主菜单/ }).click();

  await page.getByRole('button', { name: /Mini-games|小游戏/ }).click();
  await page.locator('.mode-option').filter({ has: page.getByText('ZomBotany', { exact: true }) }).click();
  await confirmSeedSelection(page);
  await expect(page.locator('#level-title')).toHaveText('ZomBotany');
  await expect(page.locator('#wave-counter')).toHaveText(/Wave 0 \/ 4|波次 0 \/ 4/);
  await page.getByRole('button', { name: /Main menu|主菜单/ }).click();

  await page.getByRole('button', { name: /Mini-games|小游戏/ }).click();
  await page.getByRole('button', { name: /Whack a Zombie|砸僵尸/ }).click();
  await expect(page.locator('#custom-mode-title')).toHaveText(/Whack a Zombie|砸僵尸/);
  await page.locator('.whack-hole.target').click();
  await expect(page.locator('#custom-mode-status')).toHaveText(/Targets: 1 \/ 20|击中：1 \/ 20/);
  await page.getByRole('button', { name: /Main menu|主菜单/ }).click();

  await page.getByRole('button', { name: /Puzzle|解谜/ }).click();
  await page.locator('.mode-option').filter({ has: page.getByText('I, Zombie', { exact: true }) }).click();
  await expect(page.locator('#custom-mode-title')).toHaveText(/I, Zombie|我是僵尸/);
  await page.locator('#vase-board [role="gridcell"]').first().click();
  await expect(page.locator('#custom-mode-status')).toHaveText(/Brains: 200|脑子：200/);
  await page.getByRole('button', { name: /Main menu|主菜单/ }).click();

  await page.getByRole('button', { name: /Zen Garden|禅境花园/ }).click();
  await expect(page.locator('.zen-card')).toHaveCount(3);
  await page.locator('.zen-card .mode-action').first().click();
});

test('seed chooser enforces six slots and only offers unlocked plants', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('wishflow-plants-vs-zombies-profile', JSON.stringify({
      version: 1,
      settings: { music: true, sound: true, screenShake: true },
      adventure: { unlockedLevels: ['1-1'], completedLevels: [] },
      unlockedPlants: ['sunflower', 'peashooter', 'cherry-bomb', 'wall-nut', 'potato-mine', 'snow-pea', 'chomper', 'repeater'],
    }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Start Adventure|开始冒险/ }).click();
  await expect(page.locator('#seed-chooser-available .seed-choice')).toHaveCount(8);
  await expect(page.locator('#seed-selection-count')).toHaveText('6 / 6');
  await expect(page.locator('#seed-chooser-selected .seed-choice')).toHaveCount(6);
  await expect(page.locator('#seed-chooser-available [data-plant-id="repeater"]')).toBeDisabled();
  await page.locator('#seed-chooser-available [data-plant-id="sunflower"]').click();
  await expect(page.locator('#seed-selection-count')).toHaveText('5 / 6');
  await page.locator('#seed-chooser-available [data-plant-id="repeater"]').click();
  await expect(page.locator('#seed-selection-count')).toHaveText('6 / 6');
  await page.getByRole('button', { name: /Enter level|进入关卡/ }).click();
  await expect(page.locator('#seed-bank .seed-card')).toHaveCount(6);
  await expect(page.locator('#seed-bank [data-plant-id="repeater"]')).toBeAttached();
});
