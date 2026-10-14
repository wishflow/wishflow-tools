import type Phaser from 'phaser';
import { getLanguage, subscribeLanguage } from '@wishflow/site-shell';
import { createDefaultRegistry } from './core/registry';
import { createGame, dispatchCommand } from './core/game';
import { createBrowserProfileRepository } from './save/profileRepository';
import { createDefaultGameModeRegistry, type GameModeCategory } from './modes/registry';
import { VasebreakerRuntime, type VasebreakerSnapshot } from './modes/vasebreaker';
import { IZombieRuntime, I_ZOMBIE_COSTS, type IZombieSnapshot } from './modes/iZombie';
import { WallNutBowlingRuntime, type WallNutBowlingSnapshot } from './modes/wallNutBowling';
import { ZenGardenRuntime, type ZenGardenSnapshot, type ZenCareAction } from './modes/zenGarden';
import { WhackAZombieRuntime, type WhackSnapshot } from './modes/whackAZombie';
import { gameSession } from './game/session';
import { collectUnlockedModeIds } from './game/modeProgression';
import { ADVENTURE_LEVELS, PLANTS, ZOMBIES } from './content/base';
import { plantName, t, terrainName } from './locales';
import { createAlmanacIndex, renderAlmanac } from './ui/almanac';
import { renderSeedChooser } from './ui/seedChooser';
import { I_ZOMBIE_LEVELS, MINI_GAMES, VASEBREAKER_LEVELS } from './modes/levelCatalog';
import { LAWN, cellHeightFor, cellWidth, sunPosition } from './rendering/layout';
import type { LevelTerrain } from './core/types';
import './styles.css';

const root = document.querySelector<HTMLElement>('#root');
if (!root) throw new Error('Game root element was not found.');

const repository = createBrowserProfileRepository();
const registry = createDefaultRegistry();
const gameModes = createDefaultGameModeRegistry();
let selectedTool: 'plant' | 'shovel' = 'plant';
let hasRecordedVictory = false;
let phaserGame: Phaser.Game | null = null;
let rendererLoading = false;
let autoPausedForBackground = false;
let vasebreakerRuntime: VasebreakerRuntime | null = null;
let iZombieRuntime: IZombieRuntime | null = null;
let wallNutRuntime: WallNutBowlingRuntime | null = null;
let zenGardenRuntime: ZenGardenRuntime | null = null;
let whackRuntime: WhackAZombieRuntime | null = null;
let selectedIZombie = 'basic';
let customModeTimer = 0;
let hasRecordedModeVictory = false;
const maxSeedSelection = 6;
let pendingModeId = 'adventure';
let pendingLevelId = '1-1';
let selectedSeedIds: string[] = [];
let seededForModeId: string | null = null;

root.innerHTML = `
  <div class="garden-app">
    <header class="app-header">
      <div class="brand-lockup"><span class="brand-mark" aria-hidden="true">✿</span><div><p class="eyebrow" data-copy="eyebrow"></p><h1 data-copy="title"></h1></div></div>
      <button class="quiet-button" id="settings-button" type="button" aria-expanded="false"><span aria-hidden="true">⚙</span> <span data-copy="settings"></span></button>
    </header>
    <section class="settings-panel" id="settings-panel" hidden>
      <label><input id="setting-music" type="checkbox" /> <span data-copy="music"></span></label>
      <label><input id="setting-sound" type="checkbox" /> <span data-copy="sound"></span></label>
      <label><input id="setting-shake" type="checkbox" /> <span data-copy="shake"></span></label>
    </section>
    <section class="landing" id="landing">
      <div class="landing-copy">
        <p class="chapter-tag"><span class="sun-dot" aria-hidden="true"></span><span data-copy="chapterLabel"></span></p>
        <h2 data-copy="menuHeading"></h2><p class="landing-description" data-copy="menuDescription"></p>
        <button class="primary-button" id="start-adventure" type="button"><span data-copy="startAdventure"></span><span aria-hidden="true">→</span></button>
        <label class="level-picker"><span data-copy="selectLevel"></span><select id="level-select" aria-label="Unlocked levels"></select></label>
        <button class="quiet-button almanac-link" id="almanac-button" type="button" data-copy="almanac"></button>
        <p class="project-note" data-copy="version"></p>
      </div>
      <div class="yard-art" aria-hidden="true"><div class="yard-sun"></div><div class="yard-hill hill-back"></div><div class="yard-hill hill-front"></div><div class="yard-fence"></div><div class="garden-plant plant-a"><span></span></div><div class="garden-plant plant-b"><span></span></div><div class="garden-zombie"><span></span></div></div>
      <section class="mode-section" aria-labelledby="mode-heading"><div class="section-heading"><h3 id="mode-heading" data-copy="modeHeading"></h3><p data-copy="modesLater"></p></div>
        <div class="mode-list">
          <button class="mode-card active" type="button" id="adventure-card"><span class="mode-icon" aria-hidden="true">🌱</span><span class="mode-title" data-copy="adventure"></span><span class="mode-state" id="adventure-progress">0 / 50</span></button>
          <button class="mode-card active" type="button" id="mini-games-card" disabled><span class="mode-icon" aria-hidden="true">🎯</span><span class="mode-title" data-copy="miniGames"></span><span class="mode-state" id="mini-games-state" data-copy="lockedUntilFirstWin"></span></button>
          <button class="mode-card active" type="button" id="puzzle-card" disabled><span class="mode-icon" aria-hidden="true">🧩</span><span class="mode-title" data-copy="puzzle"></span><span class="mode-state" id="puzzle-state" data-copy="lockedUntilFirstWin"></span></button>
          <button class="mode-card active" type="button" id="survival-card" disabled><span class="mode-icon" aria-hidden="true">🛡</span><span class="mode-title" data-copy="survival"></span><span class="mode-state" id="survival-state" data-copy="lockedUntilFirstWin"></span></button>
          <button class="mode-card active" type="button" id="zen-garden-card" disabled><span class="mode-icon" aria-hidden="true">🪴</span><span class="mode-title" data-copy="zenGarden"></span><span class="mode-state" id="zen-garden-state" data-copy="lockedUntilFirstWin"></span></button>
        </div>
      </section>
    </section>
    <section class="seed-select-view" id="seed-select-view" hidden aria-labelledby="seed-select-title">
      <header class="custom-mode-header"><div><p class="chapter-tag" id="seed-select-category" data-copy="adventure"></p><h2 id="seed-select-title" data-copy="seedSelection"></h2><p id="seed-select-level" class="landing-description"></p></div><button class="quiet-button" id="seed-select-menu" type="button" data-copy="mainMenu"></button></header>
      <div class="seed-chooser-columns">
        <section class="seed-chooser-panel" aria-labelledby="available-seeds-title"><div class="seed-chooser-heading"><h3 id="available-seeds-title" data-copy="availableSeeds"></h3><span data-copy="seedSlots"></span></div><div class="seed-chooser-list" id="seed-chooser-available"></div></section>
        <section class="seed-chooser-panel" aria-labelledby="chosen-seeds-title"><div class="seed-chooser-heading"><h3 id="chosen-seeds-title" data-copy="chosenSeeds"></h3><span id="seed-selection-count">0 / 6</span></div><div class="seed-chooser-selected" id="seed-chooser-selected"></div></section>
      </div>
      <footer class="seed-chooser-footer"><p id="seed-selection-status" role="status" aria-live="polite"></p><button class="primary-button" id="seed-chooser-start" type="button"><span id="seed-chooser-action-label" data-copy="startLevel"></span><span aria-hidden="true">→</span></button></footer>
    </section>
    <section class="game-view" id="game-view" hidden>
      <div class="game-toolbar">
        <div class="level-label"><span class="level-stamp" id="level-stamp">1-1</span><span><strong id="level-title">Front Yard</strong><small id="level-terrain">Day · Adventure</small></span></div>
        <div class="sun-meter" aria-live="polite"><span class="sun-token" aria-hidden="true">✦</span><span id="sun-count">Sun 150</span><div class="sun-pickups" id="sun-pickups" aria-label="Collect sunlight"></div></div>
        <div class="toolbar-actions"><button class="quiet-button" id="pause-button" type="button"><span data-copy="pause"></span></button><button class="quiet-button" id="menu-button" type="button"><span data-copy="mainMenu"></span></button></div>
      </div>
      <div class="seed-bank-wrap"><div class="seed-bank-title" data-copy="selectSeed"></div><div class="seed-bank" id="seed-bank"></div><button class="shovel-button" id="shovel-button" type="button" aria-pressed="false"><span class="shovel-glyph" aria-hidden="true">⛏</span><span data-copy="shovel"></span></button></div>
      <div class="battle-stage" role="region" aria-label="Battlefield" id="battlefield"><div class="game-host" id="game-host" aria-hidden="true"></div><div class="board-grid" id="board-grid" aria-label="Lawn tiles"></div><div class="orientation-shade"><span aria-hidden="true">↻</span><strong data-copy="rotated"></strong></div></div>
      <div class="battle-footer"><p id="game-status" role="status" aria-live="polite" data-copy="ready"></p><p id="wave-counter">Wave 0 / 3</p><button class="quiet-button" id="reselect-seeds" type="button" hidden><span data-copy="reselectSeeds"></span></button><button class="primary-button replay-button" id="replay-button" type="button" hidden><span data-copy="replay"></span></button></div>
    </section>
    <section class="custom-mode-view" id="custom-mode-view" hidden aria-labelledby="custom-mode-title">
      <header class="custom-mode-header"><div><p class="chapter-tag" id="custom-mode-category"></p><h2 id="custom-mode-title"></h2><p id="custom-mode-description" class="landing-description"></p></div><button class="quiet-button" id="custom-mode-menu" type="button" data-copy="mainMenu"></button></header>
      <p class="custom-mode-status" id="custom-mode-status" role="status" aria-live="polite"></p>
      <div class="custom-mode-actions" id="custom-mode-actions"></div>
      <div class="vase-board" id="vase-board" role="grid" aria-label="Vasebreaker board"></div>
    </section>
    <section class="mode-picker-view" id="mode-picker-view" hidden aria-labelledby="mode-picker-title">
      <header class="custom-mode-header"><div><p class="chapter-tag" data-copy="modeHeading"></p><h2 id="mode-picker-title"></h2></div><button class="quiet-button" id="mode-picker-menu" type="button" data-copy="mainMenu"></button></header>
      <div class="mode-option-list" id="mode-option-list"></div>
    </section>
    <section class="almanac-view" id="almanac-view" hidden aria-labelledby="almanac-title">
      <header class="custom-mode-header"><div><p class="chapter-tag" data-copy="almanac"></p><h2 id="almanac-title" data-copy="almanac"></h2></div><button class="quiet-button" id="almanac-menu" type="button" data-copy="mainMenu"></button></header>
      <div class="almanac-content" id="almanac-content"></div>
    </section>
  </div>
`;

const landing = root.querySelector<HTMLElement>('#landing')!;
const gameView = root.querySelector<HTMLElement>('#game-view')!;
const settingsPanel = root.querySelector<HTMLElement>('#settings-panel')!;
const statusElement = root.querySelector<HTMLElement>('#game-status')!;
const seedBank = root.querySelector<HTMLElement>('#seed-bank')!;
const boardGrid = root.querySelector<HTMLElement>('#board-grid')!;
const shovelButton = root.querySelector<HTMLButtonElement>('#shovel-button')!;
const replayButton = root.querySelector<HTMLButtonElement>('#replay-button')!;
const levelSelect = root.querySelector<HTMLSelectElement>('#level-select')!;
const customModeView = root.querySelector<HTMLElement>('#custom-mode-view')!;
const vaseBoard = root.querySelector<HTMLElement>('#vase-board')!;
const customModeActions = root.querySelector<HTMLElement>('#custom-mode-actions')!;
const modePickerView = root.querySelector<HTMLElement>('#mode-picker-view')!;
const modeOptionList = root.querySelector<HTMLElement>('#mode-option-list')!;
const almanacView = root.querySelector<HTMLElement>('#almanac-view')!;
const almanacContent = root.querySelector<HTMLElement>('#almanac-content')!;
const seedSelectView = root.querySelector<HTMLElement>('#seed-select-view')!;
const seedChooserAvailable = root.querySelector<HTMLElement>('#seed-chooser-available')!;
const seedChooserSelected = root.querySelector<HTMLElement>('#seed-chooser-selected')!;

function isEnglish(): boolean {
  return getLanguage() === 'en';
}

function syncLocale(): void {
  root!.querySelectorAll<HTMLElement>('[data-copy]').forEach((element) => {
    element.textContent = t(element.dataset.copy as Parameters<typeof t>[0]);
  });
  root!.querySelector('#battlefield')?.setAttribute('aria-label', isEnglish() ? 'Battlefield' : '战场');
  settingsPanel!.setAttribute('aria-label', t('settings'));
  buildSeedBank();
  buildLevelSelector();
  updateAdventureProgress();
  buildBoardGrid();
  renderSnapshot();
  if (!almanacView!.hidden) buildAlmanac();
  if (!seedSelectView!.hidden) buildSeedChooser();
  if (vasebreakerRuntime) renderVasebreaker(vasebreakerRuntime.getSnapshot());
  else if (iZombieRuntime) renderIZombie(iZombieRuntime.getSnapshot());
  else if (wallNutRuntime) renderWallNutBowling(wallNutRuntime.getSnapshot());
  else if (zenGardenRuntime) renderZenGarden(zenGardenRuntime.getSnapshot());
  else if (whackRuntime) renderWhack(whackRuntime.getSnapshot());
}

function buildSeedBank(): void {
  const selected = new Set(gameSession.plantIds);
  seedBank!.replaceChildren();
  for (const plant of PLANTS) {
    if (!selected.has(plant.id)) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'seed-card';
    button.dataset.plantId = plant.id;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', plantName(plant.id) + ', ' + plant.cost + ' sun');
    button.innerHTML = '<span class="seed-art seed-' + plant.id + '" aria-hidden="true"><i></i></span><span class="seed-name"></span><span class="seed-cost">✦ ' + plant.cost + '</span>';
    button.querySelector('.seed-name')!.textContent = plantName(plant.id);
    button.addEventListener('click', () => {
      if (!gameSession.runtime) return;
      const result = dispatchCommand(gameSession.runtime, { type: 'SELECT_PLANT', plantId: plant.id });
      if (result.accepted) {
        selectedTool = 'plant';
        shovelButton!.setAttribute('aria-pressed', 'false');
        syncSelection();
      }
    });
    seedBank!.append(button);
  }
}

function buildSeedChooser(): void {
  const mode = gameModes.modes.get(pendingModeId);
  if (!mode) return;
  const session = mode.createSession('seed-chooser');
  if (session.kind !== 'battle') return;
  const level = pendingModeId === 'adventure'
    ? registry.levels.get(pendingLevelId) ?? ADVENTURE_LEVELS[0]
    : session.level;
  if (!level) return;

  const unlocked = new Set(repository.read().unlockedPlants);
  const allowed = session.allowedPlantIds ? new Set(session.allowedPlantIds) : null;
  const available = PLANTS.filter((plant) => unlocked.has(plant.id) && (!allowed || allowed.has(plant.id)));
  const availableIds = new Set(available.map((plant) => plant.id));
  selectedSeedIds = selectedSeedIds.filter((id) => availableIds.has(id)).slice(0, maxSeedSelection);
  const isIntermission = gameSession.runtime?.getSnapshot().phase === 'intermission';
  root!.querySelector<HTMLElement>('#seed-chooser-action-label')!.textContent = t(isIntermission ? 'continueWave' : 'startLevel');

  const title = isEnglish() ? level.title : level.titleZh ?? level.title;
  const category = gameModes.modes.get(pendingModeId)?.category ?? 'adventure';
  const categoryLabel = category === 'survival' ? t('survival') : category === 'mini-game' ? t('miniGames') : category === 'puzzle' ? t('puzzle') : t('adventure');
  root!.querySelector<HTMLElement>('#seed-select-category')!.textContent = categoryLabel;
  root!.querySelector<HTMLElement>('#seed-select-level')!.textContent = level.id + ' · ' + title + ' · ' + terrainName(level.terrain ?? 'day');
  root!.querySelector<HTMLElement>('#seed-selection-count')!.textContent = selectedSeedIds.length + ' / ' + maxSeedSelection;
  root!.querySelector<HTMLElement>('#seed-selection-status')!.textContent = selectedSeedIds.length === 0 ? t('chooseOneSeed') : '';
  root!.querySelector<HTMLButtonElement>('#seed-chooser-start')!.disabled = selectedSeedIds.length === 0;
  renderSeedChooser(seedChooserAvailable!, seedChooserSelected!, {
    plants: available,
    selectedPlantIds: selectedSeedIds,
    maxSelection: maxSeedSelection,
    nameFor: (plant) => isEnglish() ? plant.title : plant.titleZh ?? plant.title,
    costLabel: (cost) => (isEnglish() ? cost + ' sun' : cost + ' 阳光'),
    onToggle: (plantId) => {
      if (selectedSeedIds.includes(plantId)) selectedSeedIds = selectedSeedIds.filter((id) => id !== plantId);
      else if (selectedSeedIds.length < maxSeedSelection) selectedSeedIds = [...selectedSeedIds, plantId];
      buildSeedChooser();
    },
  });
}

function showSeedChooser(modeId: string, preserveSelection = false): void {
  const mode = gameModes.modes.get(modeId);
  if (!mode) return;
  const session = mode.createSession('seed-chooser');
  if (session.kind !== 'battle') return;
  pendingModeId = modeId;
  pendingLevelId = modeId === 'adventure' ? levelSelect!.value || '1-1' : session.level.id;
  if (!preserveSelection || seededForModeId !== modeId) {
    const unlocked = new Set(repository.read().unlockedPlants);
    const allowed = session.allowedPlantIds ? new Set(session.allowedPlantIds) : null;
    selectedSeedIds = PLANTS.filter((plant) => unlocked.has(plant.id) && (!allowed || allowed.has(plant.id)))
      .slice(0, maxSeedSelection)
      .map((plant) => plant.id);
    seededForModeId = modeId;
  }
  buildSeedChooser();
  landing!.hidden = true;
  gameView!.hidden = true;
  customModeView!.hidden = true;
  modePickerView!.hidden = true;
  almanacView!.hidden = true;
  seedSelectView!.hidden = false;
}

function buildLevelSelector(): void {
  const profile = repository.read();
  const unlocked = new Set(profile.adventure.unlockedLevels);
  const previousValue = levelSelect!.value;
  const levels = ADVENTURE_LEVELS.filter((level) => unlocked.has(level.id));
  levelSelect!.replaceChildren();
  for (const level of levels) {
    const option = document.createElement('option');
    option.value = level.id;
    option.textContent = level.id + ' · ' + (isEnglish() ? level.title : level.titleZh ?? level.title);
    levelSelect!.append(option);
  }
  const validSelection = levels.some((level) => level.id === previousValue);
  levelSelect!.value = validSelection ? previousValue : levels.at(-1)?.id ?? '1-1';
}

function buildAlmanac(): void {
  const labels = {
    sun: t('statSun'),
    health: t('statHealth'),
    armor: t('statArmor'),
    speed: t('statSpeed'),
    ability: t('statAbility'),
  };
  const index = createAlmanacIndex(PLANTS, ZOMBIES, (en, zh) => isEnglish() ? en : zh ?? en, labels);
  renderAlmanac(almanacContent!, index, { plants: t('almanacPlants'), zombies: t('almanacZombies') });
}

function showAlmanac(): void {
  buildAlmanac();
  landing!.hidden = true;
  seedSelectView!.hidden = true;
  gameView!.hidden = true;
  customModeView!.hidden = true;
  modePickerView!.hidden = true;
  almanacView!.hidden = false;
}

function updateAdventureProgress(): void {
  refreshModeUnlocks();
  const profile = repository.read();
  const completedLevels = new Set(profile.adventure.completedLevels);
  const completedCount = completedLevels.size;
  root!.querySelector<HTMLElement>('#adventure-progress')!.textContent = completedCount + ' / ' + ADVENTURE_LEVELS.length;
  const miniGamesUnlocked = completedLevels.has('3-2');
  const puzzleUnlocked = completedLevels.has('4-6');
  const zenGardenUnlocked = completedLevels.has('5-4');
  const survivalUnlocked = completedLevels.has('5-10');
  const survivalCard = root!.querySelector<HTMLButtonElement>('#survival-card')!;
  survivalCard.disabled = !survivalUnlocked;
  const puzzleCard = root!.querySelector<HTMLButtonElement>('#puzzle-card')!;
  puzzleCard.disabled = !puzzleUnlocked;
  root!.querySelector<HTMLElement>('#puzzle-state')!.textContent = t(puzzleUnlocked ? 'puzzleModesState' : 'lockedUntil4_6');
  root!.querySelector<HTMLButtonElement>('#mini-games-card')!.disabled = !miniGamesUnlocked;
  root!.querySelector<HTMLElement>('#mini-games-state')!.textContent = t(miniGamesUnlocked ? 'miniGamesState' : 'lockedUntil3_2');
  root!.querySelector<HTMLElement>('#survival-state')!.textContent = t(survivalUnlocked ? 'survivalModesState' : 'lockedUntil5_10');
  root!.querySelector<HTMLButtonElement>('#zen-garden-card')!.disabled = !zenGardenUnlocked;
  root!.querySelector<HTMLElement>('#zen-garden-state')!.textContent = t(zenGardenUnlocked ? 'zenGardenState' : 'lockedUntil5_4');
}

function refreshModeUnlocks(): void {
  const current = repository.read();
  const unlocked = collectUnlockedModeIds(current);
  if (unlocked.some((modeId) => !current.unlockedModes.includes(modeId))) {
    repository.update((profile) => {
      for (const modeId of unlocked) if (!profile.unlockedModes.includes(modeId)) profile.unlockedModes.push(modeId);
    });
  }
}

function modeTitle(modeId: string): string {
  const catalogEntry = [...MINI_GAMES, ...VASEBREAKER_LEVELS, ...I_ZOMBIE_LEVELS].find((level) => level.id === modeId);
  if (catalogEntry) return isEnglish() ? catalogEntry.title : catalogEntry.titleZh;
  if (modeId === 'wall-nut-bowling') return t('wallNutBowling');
  if (modeId === 'zen-garden') return t('zenGarden');
  if (modeId === 'whack-a-zombie') return t('whackAZombie');
  const survivalMode = /^survival-(day|night|pool|fog|roof)(-hard)?(-endless)?$/.exec(modeId);
  if (survivalMode) {
    const terrain = survivalMode[1] as LevelTerrain;
    return (isEnglish() ? 'Survival · ' : '生存 · ') + terrainName(terrain)
      + (survivalMode[2] ? (isEnglish() ? ' · Hard' : ' · 困难') : '')
      + (survivalMode[3] ? ' · ' + t('endless') : '');
  }
  return modeId;
}

function modeDescription(modeId: string): string {
  const catalogEntry = [...MINI_GAMES, ...VASEBREAKER_LEVELS, ...I_ZOMBIE_LEVELS].find((level) => level.id === modeId);
  if (catalogEntry) return isEnglish() ? catalogEntry.description : catalogEntry.descriptionZh;
  if (modeId === 'wall-nut-bowling') return t('wallNutBowlingDescription');
  if (modeId === 'zen-garden') return t('zenGardenDescription');
  if (modeId === 'whack-a-zombie') return t('whackAZombieDescription');
  const survivalMode = /^survival-(day|night|pool|fog|roof)(-hard)?(-endless)?$/.exec(modeId);
  if (survivalMode) {
    if (survivalMode[3]) return isEnglish() ? 'Defend the pool through as many flags as you can.' : '在泳池中抵挡尽可能多的旗帜波次。';
    if (survivalMode[2]) return isEnglish() ? 'Face larger waves at a faster pace on this terrain.' : '在该地形中以更快节奏抵挡更多僵尸。';
    return isEnglish() ? 'Defend across five flags on this terrain.' : '在该地形中连续抵挡五轮旗帜波次。';
  }
  return gameModes.modes.get(modeId)?.description ?? '';
}

function showModePicker(category: GameModeCategory): void {
  const titles: Record<GameModeCategory, string> = {
    adventure: t('adventure'),
    'mini-game': t('miniGames'),
    puzzle: t('puzzle'),
    survival: t('survival'),
    garden: t('zenGarden'),
  };
  root!.querySelector<HTMLElement>('#mode-picker-title')!.textContent = titles[category];
  modeOptionList!.replaceChildren();
  const profile = repository.read();
  const completedLevels = new Set(profile.adventure.completedLevels);
  for (const mode of gameModes.modes.values()) {
    if (mode.category !== category || (mode.unlockAfterLevelId && !completedLevels.has(mode.unlockAfterLevelId))) continue;
    if ((category === 'mini-game' || category === 'puzzle') && !profile.unlockedModes.includes(mode.id)) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode-option';
    const title = document.createElement('strong');
    title.textContent = modeTitle(mode.id);
    const description = document.createElement('span');
    description.textContent = modeDescription(mode.id);
    button.append(title, description);
    button.addEventListener('click', () => launchMode(mode.id));
    modeOptionList!.append(button);
  }
  landing!.hidden = true;
  gameView!.hidden = true;
  customModeView!.hidden = true;
  almanacView!.hidden = true;
  seedSelectView!.hidden = true;
  modePickerView!.hidden = false;
}

function launchMode(modeId: string): void {
  const mode = gameModes.modes.get(modeId);
  if (!mode) return;
  const profile = repository.read();
  const completedLevels = new Set(profile.adventure.completedLevels);
  if (mode.unlockAfterLevelId && !completedLevels.has(mode.unlockAfterLevelId)) return;
  if ((mode.category === 'mini-game' || mode.category === 'puzzle') && !profile.unlockedModes.includes(mode.id)) return;
  const session = mode.createSession('MODE-' + Date.now().toString(36));
  if (session.kind === 'battle') showSeedChooser(modeId);
  else startCustomMode(modeId);
}

function renderVasebreaker(snapshot: VasebreakerSnapshot): void {
  const english = isEnglish();
  root!.querySelector<HTMLElement>('#custom-mode-category')!.textContent = t('puzzle');
  root!.querySelector<HTMLElement>('#custom-mode-title')!.textContent = modeTitle(snapshot.id);
  root!.querySelector<HTMLElement>('#custom-mode-description')!.textContent = modeDescription(snapshot.id);
  customModeActions!.replaceChildren();
  vaseBoard!.style.setProperty('--board-columns', String(snapshot.columns));
  vaseBoard!.style.setProperty('--board-rows', String(snapshot.rows));
  vaseBoard!.replaceChildren();
  for (let row = 0; row < snapshot.rows; row += 1) {
    for (let column = 0; column < snapshot.columns; column += 1) {
      const vase = snapshot.vases.find((item) => item.row === row && item.column === column);
      const plant = snapshot.plants.find((item) => item.row === row && item.column === column);
      const zombie = snapshot.zombies.find((item) => item.row === row && Math.floor(item.x) === column);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vase-cell' + (vase?.open ? ' open' : '');
      button.setAttribute('role', 'gridcell');
      if (vase && !vase.open) {
        button.textContent = '🏺';
        button.setAttribute('aria-label', (english ? 'Break vase, row ' : '打破花瓶，第') + (row + 1) + (english ? ', column ' : '行第') + (column + 1) + (english ? '' : '列'));
        button.addEventListener('click', () => {
          vasebreakerRuntime?.breakVase(vase.id);
          renderVasebreaker(vasebreakerRuntime!.getSnapshot());
        });
      } else if (zombie) {
        button.textContent = '🧟';
        button.setAttribute('aria-label', english ? 'Zombie in row ' + (row + 1) : '第' + (row + 1) + '行有僵尸');
      } else if (plant) {
        button.textContent = plant.typeId === 'wall-nut' ? '🌰' : plant.typeId === 'sunflower' ? '🌻' : '🌱';
        button.setAttribute('aria-label', plantName(plant.typeId));
      } else {
        button.textContent = '·';
        button.setAttribute('aria-label', t('vaseEmpty'));
      }
      if (snapshot.phase !== 'playing') button.disabled = true;
      vaseBoard!.append(button);
    }
  }
  const status = snapshot.phase === 'won'
    ? t('vaseWon')
    : snapshot.phase === 'lost'
      ? t('vaseLost')
      : english
        ? 'Vases: ' + snapshot.closedVaseCount + ' · Sun: ' + snapshot.sun + ' · Zombies: ' + snapshot.zombies.length + ' · ' + snapshot.zombiesKilled + ' defeated' + (snapshot.boardsCleared ? ' · Boards ' + snapshot.boardsCleared : '')
        : '花瓶：' + snapshot.closedVaseCount + ' · 阳光：' + snapshot.sun + ' · 僵尸：' + snapshot.zombies.length + ' · 已击败 ' + snapshot.zombiesKilled + (snapshot.boardsCleared ? ' · 棋盘 ' + snapshot.boardsCleared : '');
  root!.querySelector<HTMLElement>('#custom-mode-status')!.textContent = status;
  if (snapshot.phase === 'won') recordModeVictory(snapshot.id);
}

function renderIZombie(snapshot: IZombieSnapshot): void {
  const english = isEnglish();
  root!.querySelector<HTMLElement>('#custom-mode-category')!.textContent = t('puzzle');
  root!.querySelector<HTMLElement>('#custom-mode-title')!.textContent = modeTitle(snapshot.id);
  root!.querySelector<HTMLElement>('#custom-mode-description')!.textContent = modeDescription(snapshot.id);
  customModeActions!.replaceChildren();
  if (!snapshot.availableZombieIds.includes(selectedIZombie)) selectedIZombie = snapshot.availableZombieIds[0] ?? 'basic';
  for (const typeId of snapshot.availableZombieIds) {
    const cost = I_ZOMBIE_COSTS[typeId]!;
    const definition = registry.zombies.get(typeId);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode-action' + (selectedIZombie === typeId ? ' selected' : '');
    button.disabled = snapshot.phase !== 'playing' || snapshot.brains < cost;
    button.setAttribute('aria-pressed', String(selectedIZombie === typeId));
    button.textContent = (isEnglish() ? definition?.title : definition?.titleZh ?? definition?.title) + ' · ' + cost;
    button.addEventListener('click', () => { selectedIZombie = typeId; renderIZombie(iZombieRuntime!.getSnapshot()); });
    customModeActions!.append(button);
  }
  vaseBoard!.style.setProperty('--board-columns', String(snapshot.columns));
  vaseBoard!.style.setProperty('--board-rows', String(snapshot.rows));
  vaseBoard!.replaceChildren();
  for (let row = 0; row < snapshot.rows; row += 1) {
    for (let column = 0; column < snapshot.columns; column += 1) {
      const plant = snapshot.plants.find((item) => item.row === row && item.column === column);
      const zombie = snapshot.zombies.find((item) => item.row === row && Math.floor(item.x) === column);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vase-cell' + (plant ? ' open' : '');
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', english ? 'Deploy in row ' + (row + 1) : '在第' + (row + 1) + '行部署僵尸');
      button.disabled = snapshot.phase !== 'playing';
      button.textContent = zombie ? '🧟' : plant ? (plant.typeId === 'wall-nut' ? '🌰' : plant.typeId === 'sunflower' ? '🌻' : '🌱') : '·';
      button.addEventListener('click', () => {
        iZombieRuntime?.spawnZombie(selectedIZombie, row);
        renderIZombie(iZombieRuntime!.getSnapshot());
      });
      vaseBoard!.append(button);
    }
  }
  const status = snapshot.phase === 'won' ? t('modeWon') : snapshot.phase === 'lost' ? t('modeLost')
    : english
      ? 'Brains: ' + snapshot.brains + ' · Zombies: ' + snapshot.zombies.length + ' · Breached: ' + snapshot.leakedCount
      : '脑子：' + snapshot.brains + ' · 僵尸：' + snapshot.zombies.length + ' · 已突破：' + snapshot.leakedCount;
  root!.querySelector<HTMLElement>('#custom-mode-status')!.textContent = status;
  if (snapshot.phase === 'won') recordModeVictory(snapshot.id);
}

function renderWallNutBowling(snapshot: WallNutBowlingSnapshot): void {
  const english = isEnglish();
  root!.querySelector<HTMLElement>('#custom-mode-category')!.textContent = t('miniGames');
  root!.querySelector<HTMLElement>('#custom-mode-title')!.textContent = modeTitle(snapshot.id);
  root!.querySelector<HTMLElement>('#custom-mode-description')!.textContent = modeDescription(snapshot.id);
  customModeActions!.replaceChildren();
  for (let row = 0; row < snapshot.rows; row += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode-action';
    button.disabled = snapshot.phase !== 'playing' || snapshot.cooldownTicks > 0;
    button.textContent = english ? 'Roll in row ' + (row + 1) : '第' + (row + 1) + '行滚出坚果';
    button.addEventListener('click', () => {
      wallNutRuntime?.throwNut(row);
      renderWallNutBowling(wallNutRuntime!.getSnapshot());
    });
    customModeActions!.append(button);
  }
  vaseBoard!.style.setProperty('--board-columns', String(snapshot.columns));
  vaseBoard!.style.setProperty('--board-rows', String(snapshot.rows));
  vaseBoard!.replaceChildren();
  for (let row = 0; row < snapshot.rows; row += 1) {
    for (let column = 0; column < snapshot.columns; column += 1) {
      const button = document.createElement('div');
      button.className = 'vase-cell open';
      button.setAttribute('role', 'gridcell');
      const zombie = snapshot.zombies.find((item) => item.row === row && Math.floor(item.x) === column);
      const nut = snapshot.nuts.find((item) => item.row === row && Math.floor(item.x) === column);
      button.textContent = zombie ? '🧟' : nut ? '🌰' : '·';
      vaseBoard!.append(button);
    }
  }
  const status = snapshot.phase === 'won' ? t('modeWon') : snapshot.phase === 'lost' ? t('modeLost')
    : english
      ? 'Score: ' + snapshot.score + ' / ' + snapshot.targetCount + ' · Lives: ' + snapshot.lives + (snapshot.cooldownTicks ? ' · Recharging' : ' · Ready')
      : '击退：' + snapshot.score + ' / ' + snapshot.targetCount + ' · 生命：' + snapshot.lives + (snapshot.cooldownTicks ? ' · 坚果准备中' : ' · 可以投掷');
  root!.querySelector<HTMLElement>('#custom-mode-status')!.textContent = status;
  if (snapshot.phase === 'won') recordModeVictory(snapshot.id);
}

function renderZenGarden(snapshot: ZenGardenSnapshot): void {
  const english = isEnglish();
  root!.querySelector<HTMLElement>('#custom-mode-category')!.textContent = t('zenGarden');
  root!.querySelector<HTMLElement>('#custom-mode-title')!.textContent = t('zenGarden');
  root!.querySelector<HTMLElement>('#custom-mode-description')!.textContent = t('zenGardenDescription');
  customModeActions!.replaceChildren();
  vaseBoard!.style.setProperty('--board-columns', String(snapshot.plants.length));
  vaseBoard!.style.setProperty('--board-rows', '1');
  vaseBoard!.replaceChildren();
  for (const plant of snapshot.plants) {
    const card = document.createElement('article');
    card.className = 'zen-card';
    card.setAttribute('role', 'gridcell');
    const title = document.createElement('h3');
    title.textContent = plantName(plant.typeId);
    const art = document.createElement('div');
    art.className = 'zen-plant-art';
    art.textContent = plant.typeId === 'sunflower' ? '🌻' : plant.typeId === 'wall-nut' ? '🌰' : '🌱';
    const bars = document.createElement('p');
    bars.textContent = (english ? 'Water ' : '水分 ') + plant.hydration + '% · ' + (english ? 'Growth ' : '生长 ') + plant.growth + '%';
    card.append(title, art, bars);
    for (const action of ['water', 'fertilize', 'clean'] as ZenCareAction[]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mode-action';
      button.textContent = t(action === 'water' ? 'waterPlant' : action === 'fertilize' ? 'fertilizePlant' : 'cleanPlant');
      button.addEventListener('click', () => {
        zenGardenRuntime?.care(plant.id, action);
        renderZenGarden(zenGardenRuntime!.getSnapshot());
      });
      card.append(button);
    }
    vaseBoard!.append(card);
  }
  const averageGrowth = Math.round(snapshot.plants.reduce((sum, plant) => sum + plant.growth, 0) / Math.max(1, snapshot.plants.length));
  root!.querySelector<HTMLElement>('#custom-mode-status')!.textContent = (english ? 'Temporary garden · Average growth ' : '临时花园 · 平均生长 ') + averageGrowth + '%';
}

function renderWhack(snapshot: WhackSnapshot): void {
  const english = isEnglish();
  root!.querySelector<HTMLElement>('#custom-mode-category')!.textContent = t('miniGames');
  root!.querySelector<HTMLElement>('#custom-mode-title')!.textContent = t('whackAZombie');
  root!.querySelector<HTMLElement>('#custom-mode-description')!.textContent = t('whackAZombieDescription');
  customModeActions!.replaceChildren();
  vaseBoard!.style.setProperty('--board-columns', String(snapshot.columns));
  vaseBoard!.style.setProperty('--board-rows', String(snapshot.rows));
  vaseBoard!.replaceChildren();
  for (let row = 0; row < snapshot.rows; row += 1) {
    for (let column = 0; column < snapshot.columns; column += 1) {
      const target = snapshot.activeTarget?.row === row && snapshot.activeTarget.column === column;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vase-cell open whack-hole' + (target ? ' target' : '');
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', target
        ? (english ? 'Whack zombie, row ' : '砸僵尸，第') + (row + 1) + (english ? ', column ' : '行第') + (column + 1) + (english ? '' : '列')
        : (english ? 'Empty hole, row ' : '空洞，第') + (row + 1) + (english ? ', column ' : '行第') + (column + 1) + (english ? '' : '列'));
      button.disabled = snapshot.phase !== 'playing';
      button.textContent = target ? '🧟' : '·';
      button.addEventListener('click', () => {
        whackRuntime?.whack(row, column);
        renderWhack(whackRuntime!.getSnapshot());
      });
      vaseBoard!.append(button);
    }
  }
  const status = snapshot.phase === 'won' ? t('modeWon') : snapshot.phase === 'lost' ? t('modeLost')
    : english
      ? 'Targets: ' + snapshot.score + ' / ' + snapshot.targetCount + ' · Chances: ' + snapshot.lives
      : '击中：' + snapshot.score + ' / ' + snapshot.targetCount + ' · 机会：' + snapshot.lives;
  root!.querySelector<HTMLElement>('#custom-mode-status')!.textContent = status;
  if (snapshot.phase === 'won') recordModeVictory(gameSession.modeId);
}

function startCustomMode(modeId: string): void {
  const seed = 'PUZZLE-' + Date.now().toString(36);
  const mode = gameModes.modes.get(modeId);
  const session = mode?.createSession(seed);
  if (!session || session.kind !== 'custom' || session.modeId !== modeId) return;
  if (customModeTimer) window.clearInterval(customModeTimer);
  customModeTimer = 0;
  vasebreakerRuntime = null;
  iZombieRuntime = null;
  wallNutRuntime = null;
  zenGardenRuntime = null;
  whackRuntime = null;
  gameSession.runtime = null;
  gameSession.modeId = modeId;
  gameSession.progression = 'none';
  hasRecordedModeVictory = false;
  if (VASEBREAKER_LEVELS.some((level) => level.id === modeId)) vasebreakerRuntime = new VasebreakerRuntime({ seed, levelId: modeId });
  else if (I_ZOMBIE_LEVELS.some((level) => level.id === modeId)) iZombieRuntime = new IZombieRuntime(seed, modeId);
  else if (modeId === 'wall-nut-bowling' || modeId === 'wall-nut-bowling-2') wallNutRuntime = new WallNutBowlingRuntime(seed, modeId === 'wall-nut-bowling-2'
    ? { id: modeId, targetCount: 20, zombieHealth: 500, spawnIntervalTicks: 120, zombieSpeedPerTick: 0.014 }
    : { id: modeId });
  else if (modeId === 'zen-garden') zenGardenRuntime = new ZenGardenRuntime(seed);
  else if (modeId === 'whack-a-zombie') whackRuntime = new WhackAZombieRuntime(seed);
  else return;
  landing!.hidden = true;
  seedSelectView!.hidden = true;
  gameView!.hidden = true;
  modePickerView!.hidden = true;
  customModeView!.hidden = false;
  almanacView!.hidden = true;
  if (vasebreakerRuntime) renderVasebreaker(vasebreakerRuntime.getSnapshot());
  else if (iZombieRuntime) renderIZombie(iZombieRuntime.getSnapshot());
  else if (wallNutRuntime) renderWallNutBowling(wallNutRuntime.getSnapshot());
  else if (zenGardenRuntime) renderZenGarden(zenGardenRuntime.getSnapshot());
  else if (whackRuntime) renderWhack(whackRuntime.getSnapshot());
  customModeTimer = window.setInterval(() => {
    let ended = false;
    let shouldRender = false;
    if (vasebreakerRuntime) {
      vasebreakerRuntime.step();
      const snapshot = vasebreakerRuntime.getSnapshot();
      shouldRender = snapshot.tick % 12 === 0 || snapshot.phase !== 'playing';
      if (shouldRender) renderVasebreaker(snapshot);
      ended = snapshot.phase !== 'playing';
    } else if (iZombieRuntime) {
      iZombieRuntime.step();
      const snapshot = iZombieRuntime.getSnapshot();
      shouldRender = snapshot.tick % 12 === 0 || snapshot.phase !== 'playing';
      if (shouldRender) renderIZombie(snapshot);
      ended = snapshot.phase !== 'playing';
    } else if (wallNutRuntime) {
      wallNutRuntime.step();
      const snapshot = wallNutRuntime.getSnapshot();
      shouldRender = snapshot.tick % 12 === 0 || snapshot.phase !== 'playing';
      if (shouldRender) renderWallNutBowling(snapshot);
      ended = snapshot.phase !== 'playing';
    } else if (zenGardenRuntime) {
      zenGardenRuntime.step();
      const snapshot = zenGardenRuntime.getSnapshot();
      if (snapshot.tick % 60 === 0) renderZenGarden(snapshot);
    } else if (whackRuntime) {
      whackRuntime.step();
      const snapshot = whackRuntime.getSnapshot();
      shouldRender = snapshot.tick % 12 === 0 || snapshot.phase !== 'playing';
      if (shouldRender) renderWhack(snapshot);
      ended = snapshot.phase !== 'playing';
    }
    if (ended && customModeTimer) {
      window.clearInterval(customModeTimer);
      customModeTimer = 0;
    }
  }, 1_000 / 60);
}

function buildBoardGrid(): void {
  boardGrid!.replaceChildren();
  const selectedLevel = gameSession.runtime?.level ?? registry.levels.get(levelSelect!.value);
  const rows = selectedLevel?.rows ?? LAWN.rows;
  const columns = selectedLevel?.columns ?? LAWN.columns;
  boardGrid!.style.setProperty('--board-columns', String(columns));
  boardGrid!.style.setProperty('--board-rows', String(rows));
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'board-cell';
      button.dataset.row = String(row);
      button.dataset.column = String(column);
      button.setAttribute('aria-label', isEnglish() ? 'Plant row ' + (row + 1) + ' column ' + (column + 1) : '种植 第' + (row + 1) + '行 第' + (column + 1) + '列');
      button.addEventListener('click', () => {
        const runtime = gameSession.runtime;
        if (!runtime) return;
        const snapshot = runtime.getSnapshot();
        const sun = snapshot.suns.find((candidate) => {
          const position = sunPosition(candidate.id);
          return Math.floor((position.x - LAWN.x) / cellWidth) === column
            && Math.floor((position.y - LAWN.y) / cellHeightFor(runtime.level.rows)) === row;
        });
        const result = sun
          ? dispatchCommand(runtime, { type: 'COLLECT_SUN', sunId: sun.id })
          : selectedTool === 'shovel'
            ? dispatchCommand(runtime, { type: 'SHOVEL', row, column })
            : dispatchCommand(runtime, { type: 'PLANT', row, column });
        if (!result.accepted) showCommandMessage(result.reason);
        else {
          statusElement!.textContent = t('ready');
          renderSnapshot();
        }
      });
      boardGrid!.append(button);
    }
  }
}

function syncSelection(): void {
  const selectedId = gameSession.runtime?.getSnapshot().selectedPlantId;
  seedBank!.querySelectorAll<HTMLButtonElement>('.seed-card').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.plantId === selectedId && selectedTool === 'plant'));
  });
}

function showCommandMessage(reason?: string): void {
  const messages: Record<string, Parameters<typeof t>[0]> = {
    'no-plant-selected': 'noSeed',
    'invalid-cell': 'invalidCell',
    occupied: 'occupied',
    'wrong-terrain': 'wrongTerrain',
    'needs-platform': 'needsPlatform',
    'needs-base-plant': 'needsBasePlant',
    'no-sleeping-mushroom': 'noSleepingMushroom',
    'needs-upgrade-target': 'needsUpgradeTarget',
    'grave-blocks': 'graveBlocks',
    'no-grave': 'noGrave',
    'insufficient-sun': 'noSun',
    'on-cooldown': 'cooldown',
    'empty-cell': 'emptyCell',
  };
  const key = reason ? messages[reason] : undefined;
  if (key) statusElement!.textContent = t(key);
}

function renderSnapshot(): void {
  const runtime = gameSession.runtime;
  if (!runtime) return;
  const snapshot = runtime.getSnapshot();
  const modeCategory = gameModes.modes.get(gameSession.modeId)?.category ?? 'adventure';
  root!.querySelector<HTMLElement>('#level-stamp')!.textContent = runtime.level.id;
  root!.querySelector<HTMLElement>('#level-title')!.textContent = modeCategory === 'adventure'
    ? (isEnglish() ? runtime.level.title : runtime.level.titleZh ?? runtime.level.title)
    : modeTitle(gameSession.modeId);
  const categoryLabel = modeCategory === 'survival' ? t('survival') : modeCategory === 'mini-game' ? t('miniGames') : modeCategory === 'puzzle' ? t('puzzle') : t('adventure');
  root!.querySelector<HTMLElement>('#level-terrain')!.textContent = terrainName(runtime.level.terrain ?? 'day') + ' · ' + categoryLabel;
  root!.querySelector<HTMLElement>('#sun-count')!.textContent = isEnglish() ? 'Sun ' + snapshot.sun : '阳光 ' + snapshot.sun;
  root!.querySelector<HTMLElement>('#wave-counter')!.textContent = isEnglish()
    ? 'Wave ' + snapshot.spawnedWaveCount + ' / ' + (runtime.level.endlessWaveRule ? '∞' : snapshot.waveCount)
    : '波次 ' + snapshot.spawnedWaveCount + ' / ' + (runtime.level.endlessWaveRule ? '∞' : snapshot.waveCount);
  const sunPickupList = root!.querySelector<HTMLElement>('#sun-pickups')!;
  sunPickupList.replaceChildren();
  for (const sun of snapshot.suns) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sun-pickup';
    button.textContent = '✦ +' + sun.value;
    button.setAttribute('aria-label', isEnglish() ? 'Collect sunlight, ' + sun.value : '收集阳光，' + sun.value);
    button.addEventListener('click', () => {
      dispatchCommand(runtime, { type: 'COLLECT_SUN', sunId: sun.id });
      renderSnapshot();
    });
    sunPickupList.append(button);
  }
  syncSelection();
  if (snapshot.phase === 'playing') {
    replayButton!.hidden = true;
    root!.querySelector<HTMLButtonElement>('#reselect-seeds')!.hidden = true;
    root!.querySelector<HTMLButtonElement>('#pause-button')!.hidden = false;
    root!.querySelector<HTMLElement>('#pause-button span')!.textContent = t('pause');
  } else if (snapshot.phase === 'intermission') {
    statusElement!.textContent = t('waveIntermission');
    replayButton!.hidden = true;
    root!.querySelector<HTMLButtonElement>('#reselect-seeds')!.hidden = false;
    root!.querySelector<HTMLButtonElement>('#pause-button')!.hidden = true;
  } else if (snapshot.phase === 'paused') {
    statusElement!.textContent = isEnglish() ? 'Game paused.' : '游戏已暂停。';
    root!.querySelector<HTMLButtonElement>('#reselect-seeds')!.hidden = true;
    root!.querySelector<HTMLButtonElement>('#pause-button')!.hidden = false;
    root!.querySelector<HTMLElement>('#pause-button span')!.textContent = t('resume');
  } else if (snapshot.phase === 'won') {
    statusElement!.textContent = t('won');
    root!.querySelector<HTMLButtonElement>('#reselect-seeds')!.hidden = true;
    root!.querySelector<HTMLButtonElement>('#pause-button')!.hidden = true;
    replayButton!.hidden = false;
    if (!hasRecordedVictory) recordVictory();
  } else if (snapshot.phase === 'lost') {
    statusElement!.textContent = t('lost');
    root!.querySelector<HTMLButtonElement>('#reselect-seeds')!.hidden = true;
    root!.querySelector<HTMLButtonElement>('#pause-button')!.hidden = true;
    replayButton!.hidden = false;
  }
}

function recordVictory(): void {
  hasRecordedVictory = true;
  if (gameSession.progression === 'none') {
    recordModeVictory(gameSession.modeId);
    statusElement!.textContent = t('survivalComplete');
    return;
  }
  const currentLevelId = gameSession.runtime?.level.id ?? '1-1';
  const levelIndex = ADVENTURE_LEVELS.findIndex((level) => level.id === currentLevelId);
  const currentLevel = ADVENTURE_LEVELS[levelIndex];
  const nextLevel = ADVENTURE_LEVELS[levelIndex + 1];
  repository.update((profile) => {
    if (!profile.adventure.completedLevels.includes(currentLevelId)) profile.adventure.completedLevels.push(currentLevelId);
    if (nextLevel && !profile.adventure.unlockedLevels.includes(nextLevel.id)) profile.adventure.unlockedLevels.push(nextLevel.id);
    if (currentLevel?.rewardPlantId && !profile.unlockedPlants.includes(currentLevel.rewardPlantId)) {
      profile.unlockedPlants.push(currentLevel.rewardPlantId);
    }
  });
  statusElement!.textContent = nextLevel
    ? (isEnglish() ? currentLevelId + ' cleared · ' + nextLevel.id + ' unlocked' : currentLevelId + ' 关完成 · 已解锁 ' + nextLevel.id)
    : t('allLevelsWon');
  buildSeedBank();
  buildLevelSelector();
  updateAdventureProgress();
}

function recordModeVictory(modeId: string): void {
  if (hasRecordedModeVictory) return;
  hasRecordedModeVictory = true;
  repository.update((profile) => {
    if (!profile.completedModes.includes(modeId)) profile.completedModes.push(modeId);
  });
  refreshModeUnlocks();
}

function startGame(
  levelId = levelSelect!.value || '1-1',
  modeId = 'adventure',
  requestedSeedIds: string[] = selectedSeedIds,
): void {
  if (customModeTimer) window.clearInterval(customModeTimer);
  customModeTimer = 0;
  vasebreakerRuntime = null;
  iZombieRuntime = null;
  wallNutRuntime = null;
  zenGardenRuntime = null;
  whackRuntime = null;
  const seed = 'SESSION-' + Date.now().toString(36);
  const mode = gameModes.modes.get(modeId);
  const modeSession = mode?.createSession(seed);
  if (!modeSession || modeSession.kind !== 'battle') throw new Error('Mode is not available as a battle session: ' + modeId);
  const selectedLevel = modeId === 'adventure' ? registry.levels.get(levelId) : modeSession.level;
  if (!selectedLevel) throw new Error('Unknown level: ' + levelId);
  const unlocked = new Set(repository.read().unlockedPlants);
  const allowed = modeSession.allowedPlantIds ? new Set(modeSession.allowedPlantIds) : null;
  const plantIds = [...new Set(requestedSeedIds)]
    .filter((id) => unlocked.has(id) && registry.plants.has(id) && (!allowed || allowed.has(id)))
    .slice(0, maxSeedSelection);
  if (plantIds.length === 0) throw new Error('A battle session requires at least one unlocked seed packet.');
  const runtime = createGame({ registry, level: selectedLevel, seed, allowedPlantIds: plantIds, maxLoadoutSize: maxSeedSelection });
  dispatchCommand(runtime, { type: 'START' });
  gameSession.runtime = runtime;
  gameSession.modeId = modeId;
  gameSession.progression = modeSession.progression;
  gameSession.plantIds = plantIds;
  selectedSeedIds = [...plantIds];
  hasRecordedVictory = false;
  hasRecordedModeVictory = false;
  selectedTool = 'plant';
  landing!.hidden = true;
  seedSelectView!.hidden = true;
  gameView!.hidden = false;
  customModeView!.hidden = true;
  modePickerView!.hidden = true;
  almanacView!.hidden = true;
  statusElement!.textContent = t('ready');
  replayButton!.hidden = true;
  shovelButton!.setAttribute('aria-pressed', 'false');
  buildSeedBank();
  buildBoardGrid();
  renderSnapshot();
  void startRenderer();
}

async function startRenderer(): Promise<void> {
  if (phaserGame || rendererLoading) return;
  rendererLoading = true;
  try {
    const [{ default: PhaserRuntime }, { BoardScene }] = await Promise.all([
      import('phaser'),
      import('./rendering/BoardScene'),
    ]);
    if (!document.body.isConnected) return;
    phaserGame = new PhaserRuntime.Game({
      type: PhaserRuntime.AUTO,
      width: 960,
      height: 600,
      backgroundColor: '#c8d29c',
      parent: 'game-host',
      scale: { mode: PhaserRuntime.Scale.FIT, autoCenter: PhaserRuntime.Scale.CENTER_BOTH },
      render: { antialias: true, pixelArt: false, roundPixels: true },
      scene: [BoardScene],
    });
  } catch {
    statusElement!.textContent = t('rendererFailed');
  } finally {
    rendererLoading = false;
  }
}

function returnToMenu(): void {
  if (customModeTimer) window.clearInterval(customModeTimer);
  customModeTimer = 0;
  vasebreakerRuntime = null;
  iZombieRuntime = null;
  wallNutRuntime = null;
  zenGardenRuntime = null;
  whackRuntime = null;
  gameSession.runtime = null;
  gameSession.modeId = 'adventure';
  gameSession.progression = 'adventure';
  gameSession.plantIds = [];
  seededForModeId = null;
  selectedTool = 'plant';
  gameView!.hidden = true;
  seedSelectView!.hidden = true;
  customModeView!.hidden = true;
  modePickerView!.hidden = true;
  almanacView!.hidden = true;
  landing!.hidden = false;
  settingsPanel!.hidden = true;
  root!.querySelector('#settings-button')?.setAttribute('aria-expanded', 'false');
  buildLevelSelector();
  updateAdventureProgress();
}

function togglePause(): void {
  const runtime = gameSession.runtime;
  if (!runtime) return;
  const phase = runtime.getSnapshot().phase;
  dispatchCommand(runtime, phase === 'paused' ? { type: 'RESUME' } : { type: 'PAUSE' });
  renderSnapshot();
}

function setupSettings(): void {
  const profile = repository.read();
  root!.querySelector<HTMLInputElement>('#setting-music')!.checked = profile.settings.music;
  root!.querySelector<HTMLInputElement>('#setting-sound')!.checked = profile.settings.sound;
  root!.querySelector<HTMLInputElement>('#setting-shake')!.checked = profile.settings.screenShake;
  const settings = [
    ['#setting-music', 'music'],
    ['#setting-sound', 'sound'],
    ['#setting-shake', 'screenShake'],
  ] as const;
  for (const [selector, key] of settings) {
    root!.querySelector<HTMLInputElement>(selector)!.addEventListener('change', (event) => {
      const checked = (event.currentTarget as HTMLInputElement).checked;
      repository.update((draft) => { draft.settings[key] = checked; });
    });
  }
}

root.querySelector('#start-adventure')?.addEventListener('click', () => showSeedChooser('adventure'));
root.querySelector('#adventure-card')?.addEventListener('click', () => showSeedChooser('adventure'));
root.querySelector('#mini-games-card')?.addEventListener('click', () => showModePicker('mini-game'));
root.querySelector('#puzzle-card')?.addEventListener('click', () => showModePicker('puzzle'));
root.querySelector('#survival-card')?.addEventListener('click', () => showModePicker('survival'));
root.querySelector('#zen-garden-card')?.addEventListener('click', () => launchMode('zen-garden'));
root.querySelector('#almanac-button')?.addEventListener('click', showAlmanac);
root.querySelector('#almanac-menu')?.addEventListener('click', returnToMenu);
root.querySelector('#mode-picker-menu')?.addEventListener('click', returnToMenu);
root.querySelector('#seed-select-menu')?.addEventListener('click', returnToMenu);
root.querySelector('#seed-chooser-start')?.addEventListener('click', () => {
  if (selectedSeedIds.length === 0) {
    root!.querySelector<HTMLElement>('#seed-selection-status')!.textContent = t('chooseOneSeed');
    return;
  }
  const runtime = gameSession.runtime;
  if (runtime?.getSnapshot().phase === 'intermission') {
    const result = dispatchCommand(runtime, { type: 'SET_LOADOUT', plantIds: selectedSeedIds });
    if (!result.accepted) {
      root!.querySelector<HTMLElement>('#seed-selection-status')!.textContent = t('chooseOneSeed');
      return;
    }
    dispatchCommand(runtime, { type: 'CONTINUE' });
    gameSession.plantIds = [...selectedSeedIds];
    gameView!.hidden = false;
    seedSelectView!.hidden = true;
    buildSeedBank();
    buildBoardGrid();
    renderSnapshot();
    return;
  }
  startGame(pendingLevelId, pendingModeId, selectedSeedIds);
});
root.querySelector('#reselect-seeds')?.addEventListener('click', () => showSeedChooser(gameSession.modeId, true));
root.querySelector('#custom-mode-menu')?.addEventListener('click', returnToMenu);
root.querySelector('#pause-button')?.addEventListener('click', togglePause);
root.querySelector('#menu-button')?.addEventListener('click', returnToMenu);
root.querySelector('#replay-button')?.addEventListener('click', () => startGame(
  gameSession.modeId === 'adventure' ? gameSession.runtime?.level.id : undefined,
  gameSession.modeId,
  gameSession.plantIds,
));
levelSelect.addEventListener('change', buildBoardGrid);
root.querySelector('#settings-button')?.addEventListener('click', () => {
  settingsPanel!.hidden = !settingsPanel!.hidden;
  root!.querySelector('#settings-button')?.setAttribute('aria-expanded', String(!settingsPanel!.hidden));
});
shovelButton.addEventListener('click', () => {
  selectedTool = selectedTool === 'shovel' ? 'plant' : 'shovel';
  shovelButton.setAttribute('aria-pressed', String(selectedTool === 'shovel'));
  syncSelection();
});

setupSettings();
syncLocale();
gameSession.onSnapshot = renderSnapshot;
const unsubscribeLanguage = subscribeLanguage(syncLocale);
document.addEventListener('visibilitychange', () => {
  const runtime = gameSession.runtime;
  if (document.hidden && runtime?.getSnapshot().phase === 'playing') {
    dispatchCommand(runtime, { type: 'PAUSE' });
    autoPausedForBackground = true;
    renderSnapshot();
  } else if (!document.hidden && autoPausedForBackground && runtime?.getSnapshot().phase === 'paused') {
    dispatchCommand(runtime, { type: 'RESUME' });
    autoPausedForBackground = false;
    renderSnapshot();
  }
});
window.addEventListener('pagehide', () => {
  unsubscribeLanguage();
  gameSession.onSnapshot = null;
  phaserGame?.destroy(true);
  if (customModeTimer) window.clearInterval(customModeTimer);
});
