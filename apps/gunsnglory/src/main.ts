import '@wishflow/site-shell';
import { getLanguage, registerMessages, subscribeLanguage } from '@wishflow/site-shell';
import { createBrowserGame, createBrowserProgress } from './bootstrap/browser';
import { drawGame, GAME_VIEWPORT, getMapViewport, resizeCanvas } from './render/canvas-renderer';
import { screenToMapCell } from './render/map-viewport';
import { fitAspectViewport, toLogicalPoint } from './render/viewport';
import { DEFAULT_SIMULATION_SPEED, normalizeSimulationSpeed, SimulationTimeAccumulator } from './game/time-scaling';
import type { GameEvent, GameIntent, GameMode, GameSettlementRecord } from './game';
import type { ProfileView, SettlementSaveResult } from './progress';
import { messages } from './locales';
import './styles.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Game root is missing');

app.innerHTML = [
  '<section class="game-page" id="game">',
  '  <header class="game-heading">',
  '    <p class="eyebrow">FIRST COMBAT SLICE</p>',
  '    <h1>Guns’n’Glory</h1>',
  '    <p class="intro">Use the Cow Gulch map to defeat a pioneer and collect the reward.</p>',
  '  </header>',
  '  <section class="game-panel" aria-labelledby="scene-title">',
  '    <div class="scene-heading"><h2 id="scene-title">Cow Gulch</h2><span data-testid="scene-context">NEW MEXICO · 01</span></div>',
  '    <div class="game-frame">',
  '      <canvas data-testid="game-canvas" aria-label="Cow Gulch game map" tabindex="0"></canvas>',
  '      <section class="settlement-panel" data-testid="settlement" aria-labelledby="settlement-title" aria-live="polite" hidden>',
  '        <h2 id="settlement-title">Battle result</h2>',
  '        <p data-testid="settlement-outcome"></p>',
  '        <p data-testid="settlement-summary"></p>',
  '        <p data-testid="settlement-score"></p>',
  '        <p data-testid="settlement-high-score"></p>',
  '        <p data-testid="settlement-save-status" role="status" aria-live="polite"></p>',
  '        <button type="button" data-action="retry-settlement-save" hidden>Retry saving result</button>',
  '        <button type="button" data-action="restart-sample">Restart this sample</button>',
  '      </section>',
  '    </div>',
  '    <div class="game-controls">',
  '      <p data-testid="profile-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="selection-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="wave-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="combat-status" role="status" aria-live="polite"></p>',
  '      <label class="simulation-speed-control" for="simulation-speed">',
  '        <span id="simulation-speed-label">Simulation speed</span>',
  '        <input id="simulation-speed" data-testid="simulation-speed" aria-labelledby="simulation-speed-label" type="range" min="0.25" max="4" step="0.25" value="1" disabled>',
  '        <output data-testid="simulation-speed-value" for="simulation-speed">1×</output>',
  '      </label>',
  '      <p data-testid="settings-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="upgrade-sample-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="upgrade-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="recruit-pool-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="recruit-status" role="status" aria-live="polite"></p>',
  '      <button type="button" data-action="start-wave">Start one pioneer sample</button>',
  '      <button type="button" data-action="recruit-unit">Hire Gunslinger</button>',
  '      <button type="button" data-action="upgrade-unit" hidden>Upgrade selected Gunslinger</button>',
  '      <button type="button" data-action="start-upgrade-sample">Open upgrade rules sample</button>',
  '      <button type="button" data-action="return-cow-gulch" hidden>Return to Cow Gulch sample</button>',
  '      <button type="button" data-action="start-defeat-sample">Test defeat with one life</button>',
  '      <button type="button" data-action="clear-selection">Clear selection</button>',
  '      <p data-testid="pause-status" role="status" aria-live="polite" hidden></p>',
  '      <button type="button" data-testid="pause-toggle" data-action="toggle-pause" disabled>Pause battle</button>',
  '    </div>',
  '    <dialog class="recruit-confirmation" data-testid="recruit-confirmation" aria-labelledby="recruit-confirmation-title">',
  '      <h2 id="recruit-confirmation-title"></h2>',
  '      <div class="recruit-confirmation-actions">',
  '        <button type="button" data-action="confirm-recruit">Recruit</button>',
  '        <button type="button" data-action="cancel-recruit">Cancel</button>',
  '      </div>',
  '    </dialog>',
  '    <dialog class="recruit-confirmation upgrade-confirmation" data-testid="upgrade-confirmation" aria-labelledby="upgrade-confirmation-title">',
  '      <h2 id="upgrade-confirmation-title"></h2>',
  '      <p data-testid="upgrade-confirmation-details"></p>',
  '      <div class="recruit-confirmation-actions">',
  '        <button type="button" data-action="confirm-upgrade">Confirm upgrade</button>',
  '        <button type="button" data-action="cancel-upgrade">Cancel upgrade</button>',
  '      </div>',
  '    </dialog>',
  '    <p class="scene-caption">The normal sample resolves a victory; the one-life test verifies defeat. Later waves and the campaign are out of scope.</p>',
  '  </section>',
  '</section>',
].join('');

registerMessages('gunsnglory', messages);

const canvasElement = app.querySelector<HTMLCanvasElement>('[data-testid="game-canvas"]');
const profileStatusElement = app.querySelector<HTMLElement>('[data-testid="profile-status"]');
const statusElement = app.querySelector<HTMLElement>('[data-testid="selection-status"]');
const waveStatusElement = app.querySelector<HTMLElement>('[data-testid="wave-status"]');
const combatStatusElement = app.querySelector<HTMLElement>('[data-testid="combat-status"]');
const sceneTitleElement = app.querySelector<HTMLElement>('#scene-title');
const sceneContextElement = app.querySelector<HTMLElement>('[data-testid="scene-context"]');
const upgradeSampleStatusElement = app.querySelector<HTMLElement>('[data-testid="upgrade-sample-status"]');
const upgradeStatusElement = app.querySelector<HTMLElement>('[data-testid="upgrade-status"]');
const recruitPoolStatusElement = app.querySelector<HTMLElement>('[data-testid="recruit-pool-status"]');
const recruitStatusElement = app.querySelector<HTMLElement>('[data-testid="recruit-status"]');
const settingsStatusElement = app.querySelector<HTMLElement>('[data-testid="settings-status"]');
const pauseStatusElement = app.querySelector<HTMLElement>('[data-testid="pause-status"]');
const pauseButtonElement = app.querySelector<HTMLButtonElement>('[data-testid="pause-toggle"]');
const simulationSpeedInputElement = app.querySelector<HTMLInputElement>('[data-testid="simulation-speed"]');
const simulationSpeedValueElement = app.querySelector<HTMLOutputElement>('[data-testid="simulation-speed-value"]');
const clearButton = app.querySelector<HTMLButtonElement>('[data-action="clear-selection"]');
const startWaveButton = app.querySelector<HTMLButtonElement>('[data-action="start-wave"]');
const recruitButton = app.querySelector<HTMLButtonElement>('[data-action="recruit-unit"]');
const upgradeButton = app.querySelector<HTMLButtonElement>('[data-action="upgrade-unit"]');
const startUpgradeSampleButton = app.querySelector<HTMLButtonElement>('[data-action="start-upgrade-sample"]');
const returnCowGulchButton = app.querySelector<HTMLButtonElement>('[data-action="return-cow-gulch"]');
const recruitConfirmationElement = app.querySelector<HTMLDialogElement>('[data-testid="recruit-confirmation"]');
const recruitConfirmationTitleElement = app.querySelector<HTMLElement>('#recruit-confirmation-title');
const confirmRecruitButton = app.querySelector<HTMLButtonElement>('[data-action="confirm-recruit"]');
const cancelRecruitButton = app.querySelector<HTMLButtonElement>('[data-action="cancel-recruit"]');
const upgradeConfirmationElement = app.querySelector<HTMLDialogElement>('[data-testid="upgrade-confirmation"]');
const upgradeConfirmationTitleElement = app.querySelector<HTMLElement>('#upgrade-confirmation-title');
const upgradeConfirmationDetailsElement = app.querySelector<HTMLElement>('[data-testid="upgrade-confirmation-details"]');
const confirmUpgradeButton = app.querySelector<HTMLButtonElement>('[data-action="confirm-upgrade"]');
const cancelUpgradeButton = app.querySelector<HTMLButtonElement>('[data-action="cancel-upgrade"]');
const startDefeatButton = app.querySelector<HTMLButtonElement>('[data-action="start-defeat-sample"]');
const settlementPanelElement = app.querySelector<HTMLElement>('[data-testid="settlement"]');
const settlementTitleElement = app.querySelector<HTMLElement>('#settlement-title');
const settlementOutcomeElement = app.querySelector<HTMLElement>('[data-testid="settlement-outcome"]');
const settlementSummaryElement = app.querySelector<HTMLElement>('[data-testid="settlement-summary"]');
const settlementScoreElement = app.querySelector<HTMLElement>('[data-testid="settlement-score"]');
const settlementHighScoreElement = app.querySelector<HTMLElement>('[data-testid="settlement-high-score"]');
const settlementSaveStatusElement = app.querySelector<HTMLElement>('[data-testid="settlement-save-status"]');
const retrySettlementButton = app.querySelector<HTMLButtonElement>('[data-action="retry-settlement-save"]');
const restartButton = app.querySelector<HTMLButtonElement>('[data-action="restart-sample"]');
if (!canvasElement || !profileStatusElement || !statusElement || !waveStatusElement || !combatStatusElement
  || !sceneTitleElement || !sceneContextElement || !upgradeSampleStatusElement || !upgradeStatusElement
  || !recruitPoolStatusElement || !recruitStatusElement || !recruitButton || !recruitConfirmationElement
  || !upgradeButton || !startUpgradeSampleButton || !returnCowGulchButton || !upgradeConfirmationElement
  || !upgradeConfirmationTitleElement || !upgradeConfirmationDetailsElement || !confirmUpgradeButton || !cancelUpgradeButton
  || !recruitConfirmationTitleElement || !confirmRecruitButton || !cancelRecruitButton || !settingsStatusElement
  || !pauseStatusElement || !pauseButtonElement
  || !simulationSpeedInputElement || !simulationSpeedValueElement || !clearButton || !startWaveButton
  || !startDefeatButton || !settlementPanelElement || !settlementTitleElement || !settlementOutcomeElement
  || !settlementSummaryElement || !settlementScoreElement || !settlementHighScoreElement
  || !settlementSaveStatusElement || !retrySettlementButton || !restartButton) {
  throw new Error('Game controls are missing');
}
const canvas: HTMLCanvasElement = canvasElement;
const profileStatus: HTMLElement = profileStatusElement;
const status: HTMLElement = statusElement;
const waveStatus: HTMLElement = waveStatusElement;
const combatStatus: HTMLElement = combatStatusElement;
const sceneTitle: HTMLElement = sceneTitleElement;
const sceneContext: HTMLElement = sceneContextElement;
const upgradeSampleStatus: HTMLElement = upgradeSampleStatusElement;
const upgradeStatus: HTMLElement = upgradeStatusElement;
const recruitPoolStatus: HTMLElement = recruitPoolStatusElement;
const recruitStatus: HTMLElement = recruitStatusElement;
const settingsStatus: HTMLElement = settingsStatusElement;
const pauseStatus: HTMLElement = pauseStatusElement;
const pauseControl: HTMLButtonElement = pauseButtonElement;
const simulationSpeedInput: HTMLInputElement = simulationSpeedInputElement;
const simulationSpeedValue: HTMLOutputElement = simulationSpeedValueElement;
const startWaveControl: HTMLButtonElement = startWaveButton;
const recruitControl: HTMLButtonElement = recruitButton;
const upgradeControl: HTMLButtonElement = upgradeButton;
const startUpgradeSampleControl: HTMLButtonElement = startUpgradeSampleButton;
const returnCowGulchControl: HTMLButtonElement = returnCowGulchButton;
const recruitConfirmation: HTMLDialogElement = recruitConfirmationElement;
const recruitConfirmationTitle: HTMLElement = recruitConfirmationTitleElement;
const confirmRecruitControl: HTMLButtonElement = confirmRecruitButton;
const cancelRecruitControl: HTMLButtonElement = cancelRecruitButton;
const upgradeConfirmation: HTMLDialogElement = upgradeConfirmationElement;
const upgradeConfirmationTitle: HTMLElement = upgradeConfirmationTitleElement;
const upgradeConfirmationDetails: HTMLElement = upgradeConfirmationDetailsElement;
const confirmUpgradeControl: HTMLButtonElement = confirmUpgradeButton;
const cancelUpgradeControl: HTMLButtonElement = cancelUpgradeButton;
const startDefeatControl: HTMLButtonElement = startDefeatButton;
const clearSelectionControl: HTMLButtonElement = clearButton;
const restartControl: HTMLButtonElement = restartButton;
const settlementPanel: HTMLElement = settlementPanelElement;
const settlementTitle: HTMLElement = settlementTitleElement;
const settlementOutcome: HTMLElement = settlementOutcomeElement;
const settlementSummary: HTMLElement = settlementSummaryElement;
const settlementScore: HTMLElement = settlementScoreElement;
const settlementHighScore: HTMLElement = settlementHighScoreElement;
const settlementSaveStatus: HTMLElement = settlementSaveStatusElement;
const retrySettlementControl: HTMLButtonElement = retrySettlementButton;

const game = createBrowserGame();
const progress = createBrowserProgress();
let session = await game.open({ scenarioId: 'cow-gulch', mode: 'formal' });
let view = session.observe();
let profile: ProfileView = {
  settings: { simulationSpeed: DEFAULT_SIMULATION_SPEED },
  completedScenarios: [],
  highScores: {},
};
let context: CanvasRenderingContext2D | undefined;
let simulationSpeed = DEFAULT_SIMULATION_SPEED;
let pauseReason: 'manual' | 'background' | undefined;
let pageLeaving = false;
let settingsStatusKey: 'load-failed' | 'saved' | 'save-failed' | undefined;
let profileLoadFailed = false;
let settlementSaveState: SettlementSaveResult['status'] | 'saving' | 'debug' | undefined;
let activeSettlementRecord: GameSettlementRecord | undefined;
let lastDefeatReward: number | undefined;
let lastRecruitmentEvent: Extract<GameEvent, { type: 'unit-recruited' | 'unit-recruitment-rejected' }> | undefined;
let pendingRecruitmentType: string | undefined;
let recruitmentCommandNumber = 0;
let lastUpgradeEvent: Extract<GameEvent, { type: 'unit-upgraded' | 'unit-upgrade-rejected' }> | undefined;
let pendingUpgradeUnitId: string | undefined;
let upgradeCommandNumber = 0;
let settingsSaveSequence = 0;
const simulationTime = new SimulationTimeAccumulator();
const languageMessages = {
  en: {
    result: 'Battle result',
    none: 'No unit selected',
    selected: 'Gunslinger selected',
    failed: 'Game scene failed to load',
    pauseBattle: 'Pause battle',
    resumeBattle: 'Resume battle',
    battlePaused: 'Battle paused.',
    battlePausedInBackground: 'Battle paused automatically while this tab was in the background.',
    waiting: (lives: number, number: number, cash: number) => `Wave ${number} ready · Lives ${lives} · Cash $${cash}`,
    active: (lives: number, number: number, enemies: number, cash: number) => `Wave ${number} · Lives ${lives} · Enemies ${enemies} · Cash $${cash}`,
    complete: (lives: number, number: number, escaped: number, defeated: number, cash: number) => `Wave ${number} complete · Lives ${lives} · Escaped ${escaped} · Defeated ${defeated} · Cash $${cash}`,
    defeated: (cashReward: number) => `Pioneer defeated · +$${cashReward}`,
    recruitButton: (name: string, price: number) => `Hire ${name} · $${price}`,
    recruitPool: (units: string) => `Recruit pool: ${units}`,
    recruitPoolEmpty: 'Recruit pool: empty',
    recruited: (name: string, price: number) => `${name} recruited for $${price}; held in the spawn pool.`,
    insufficientCash: (name: string, price: number, cash: number) => `Not enough cash for ${name}: need $${price}, have $${cash}.`,
    confirmRecruit: (name: string, price: number) => `Recruit ${name} for $${price}?`,
    confirmRecruitButton: 'Recruit',
    cancelRecruitButton: 'Cancel',
    upgradeSceneTitle: 'Cow Gulch · upgrade test',
    upgradeSceneContext: 'DEBUG RULE TEST',
    originalUpgradeLimit: 'Original Cow Gulch has an upgrade limit of 0. This separate debug fixture sets the limit to 1 and starts with $25; it never saves progress.',
    debugUpgradeFixture: 'Debug-only fixture · upgrade limit 1 · $25 starting cash · no profile writes.',
    upgradeButton: (price: number) => `Upgrade Gunslinger · $${price}`,
    upgradeSummary: (level: number, speed: number, nextSpeed: number, reload: number, nextReload: number) =>
      `Level ${level} → ${level + 1} · Speed ${speed} → ${nextSpeed} · Reload ${reload} → ${nextReload} ms`,
    upgradeDetails: (level: number, speed: number, nextSpeed: number, damage: number, nextDamage: number,
      range: number, nextRange: number, reload: number, nextReload: number, specialReload: number,
      nextSpecialReload: number, price: number, cash: number) =>
      `Level ${level} → ${level + 1} · Speed ${speed} → ${nextSpeed} · Damage ${damage} → ${nextDamage} · Range ${range} → ${nextRange} fine units · Reload ${reload} → ${nextReload} ms · Special reload ${specialReload} → ${nextSpecialReload} ms · Price $${price} · Cash $${cash}`,
    confirmUpgrade: (name: string, price: number) => `Upgrade ${name} for $${price}?`,
    confirmUpgradeButton: 'Confirm upgrade',
    cancelUpgradeButton: 'Cancel upgrade',
    upgraded: (name: string, level: number, price: number) => `${name} upgraded to level ${level} for $${price}.`,
    insufficientUpgradeCash: (price: number, cash: number) => `Not enough cash to upgrade: need $${price}, have $${cash}.`,
    upgradeLimitReached: 'This unit has reached the upgrade limit for this level.',
    noUpgradeAvailable: 'No upgrade is available for this unit in this level.',
    'load-failed': 'Speed preference unavailable; using 1× for this session.',
    saved: 'Speed preference saved.',
    'save-failed': 'Speed is active for this session, but could not be saved.',
    noSavedProfile: 'Saved profile: no Cow Gulch result yet.',
    profileLoadFailed: 'Saved profile could not be read.',
    profileSaved: (completed: boolean, score: number | undefined) =>
      `Saved profile: Cow Gulch${completed ? ' sample complete' : ''}${score === undefined ? '' : ` · Best $${score}`}.`,
    settlementSaving: 'Saving result to this browser…',
    settlementSaved: 'Result saved to this browser.',
    settlementFailed: 'Result is not saved. Retry to save it.',
    settlementConflict: 'A newer profile exists. Retry to merge this result.',
    settlementDebug: 'Debug result · not added to the saved profile.',
    scoreCandidate: (score: number) => `High-score candidate: $${score}`,
    scoreSaved: (score: number) => `High-score saved: $${score}`,
    retrySave: 'Retry saving result',
    victory: 'Victory',
    defeat: 'Defeat',
    settlementSummary: (number: number, lives: number, escaped: number, defeated: number, cash: number) =>
      `Wave ${number} · Lives ${lives} · Escaped ${escaped} · Defeated ${defeated} · Cash $${cash}`,
    displayScore: (score: number) => `Displayed score: $${score}`,
  },
  zh: {
    result: '战斗结算',
    none: '尚未选择单位',
    selected: '已选择枪手',
    failed: '游戏场景加载失败',
    pauseBattle: '暂停战斗',
    resumeBattle: '继续战斗',
    battlePaused: '战斗已暂停。',
    battlePausedInBackground: '切换到后台时已自动暂停战斗。',
    waiting: (lives: number, number: number, cash: number) => `第 ${number} 波待开始 · 生命 ${lives} · 现金 $${cash}`,
    active: (lives: number, number: number, enemies: number, cash: number) => `第 ${number} 波 · 生命 ${lives} · 敌人 ${enemies} · 现金 $${cash}`,
    complete: (lives: number, number: number, escaped: number, defeated: number, cash: number) => `第 ${number} 波完成 · 生命 ${lives} · 逃脱 ${escaped} · 击败 ${defeated} · 现金 $${cash}`,
    defeated: (cashReward: number) => `拓荒者被击败 · +$${cashReward}`,
    recruitButton: (name: string, price: number) => `招募${name} · $${price}`,
    recruitPool: (units: string) => `预备单位：${units}`,
    recruitPoolEmpty: '预备单位：无',
    recruited: (name: string, price: number) => `已花费 $${price} 招募${name}，现存于生成池。`,
    insufficientCash: (name: string, price: number, cash: number) => `现金不足，无法招募${name}：需要 $${price}，当前 $${cash}。`,
    confirmRecruit: (name: string, price: number) => `花费 $${price} 招募${name}？`,
    confirmRecruitButton: '确认招募',
    cancelRecruitButton: '取消',
    upgradeSceneTitle: '牛溪谷 · 升级测试',
    upgradeSceneContext: '规则测试 · 调试场景',
    originalUpgradeLimit: '原版牛溪谷的升级上限为 0。此独立调试样本将上限设为 1、初始现金设为 $25；不会写入存档。',
    debugUpgradeFixture: '仅供规则测试 · 升级上限 1 · 初始现金 $25 · 不写入档案。',
    upgradeButton: (price: number) => `升级枪手 · $${price}`,
    upgradeSummary: (level: number, speed: number, nextSpeed: number, reload: number, nextReload: number) =>
      `等级 ${level} → ${level + 1} · 移动速度 ${speed} → ${nextSpeed} · 装填 ${reload} → ${nextReload} 毫秒`,
    upgradeDetails: (level: number, speed: number, nextSpeed: number, damage: number, nextDamage: number,
      range: number, nextRange: number, reload: number, nextReload: number, specialReload: number,
      nextSpecialReload: number, price: number, cash: number) =>
      `等级 ${level} → ${level + 1} · 移动速度 ${speed} → ${nextSpeed} · 伤害 ${damage} → ${nextDamage} · 射程 ${range} → ${nextRange} 细单位 · 装填 ${reload} → ${nextReload} 毫秒 · 特殊装填 ${specialReload} → ${nextSpecialReload} 毫秒 · 价格 $${price} · 当前现金 $${cash}`,
    confirmUpgrade: (name: string, price: number) => `花费 $${price} 升级${name}？`,
    confirmUpgradeButton: '确认升级',
    cancelUpgradeButton: '取消升级',
    upgraded: (name: string, level: number, price: number) => `已花费 $${price} 将${name}升至等级 ${level}。`,
    insufficientUpgradeCash: (price: number, cash: number) => `升级资金不足：需要 $${price}，当前 $${cash}。`,
    upgradeLimitReached: '该单位已达到本关升级上限。',
    noUpgradeAvailable: '该单位在本关没有可用升级。',
    'load-failed': '无法读取倍速设置，本次暂用 1×。',
    saved: '倍速设置已保存。',
    'save-failed': '本次使用所选倍速，但保存失败。',
    noSavedProfile: '已保存档案：尚无牛溪谷结算。',
    profileLoadFailed: '无法读取已保存档案。',
    profileSaved: (completed: boolean, score: number | undefined) =>
      `已保存档案：牛溪谷${completed ? '样本已完成' : ''}${score === undefined ? '' : ` · 最高分 $${score}`}。`,
    settlementSaving: '正在将结算保存到此浏览器…',
    settlementSaved: '结算已保存到此浏览器。',
    settlementFailed: '结算尚未保存。请重试保存。',
    settlementConflict: '档案已有更新版本。重试可合并本次结果。',
    settlementDebug: '调试结果 · 不会写入已保存档案。',
    scoreCandidate: (score: number) => `高分候选值：$${score}`,
    scoreSaved: (score: number) => `已保存高分：$${score}`,
    retrySave: '重试保存结算',
    victory: '胜利',
    defeat: '败北',
    settlementSummary: (number: number, lives: number, escaped: number, defeated: number, cash: number) =>
      `第 ${number} 波 · 生命 ${lives} · 逃脱 ${escaped} · 击败 ${defeated} · 现金 $${cash}`,
    displayScore: (score: number) => `画面分数：$${score}`,
  },
};

function profileMessage(language: keyof typeof languageMessages): string {
  if (profileLoadFailed) return languageMessages[language].profileLoadFailed;
  const completed = profile.completedScenarios.includes('cow-gulch');
  const score = profile.highScores['cow-gulch'];
  if (!completed && score === undefined) return languageMessages[language].noSavedProfile;
  return languageMessages[language].profileSaved(completed, score);
}

function settlementSaveMessage(language: keyof typeof languageMessages): string {
  const messages = languageMessages[language];
  switch (settlementSaveState) {
    case 'saving': return messages.settlementSaving;
    case 'saved': return messages.settlementSaved;
    case 'failed': return messages.settlementFailed;
    case 'conflict': return messages.settlementConflict;
    case 'debug': return messages.settlementDebug;
    default: return '';
  }
}

async function applyFormalSettlement(record: GameSettlementRecord): Promise<void> {
  try {
    const result = await progress.applySettlement(record);
    profile = result.profile;
    profileLoadFailed = false;
    settlementSaveState = result.status;
  } catch {
    settlementSaveState = 'failed';
    try {
      profile = await progress.loadProfile();
      profileLoadFailed = false;
    } catch {
      profileLoadFailed = true;
    }
  }
  renderStatus();
}

async function retryFormalSettlement(): Promise<void> {
  const settlementId = activeSettlementRecord?.settlementId;
  if (!settlementId || (settlementSaveState !== 'failed' && settlementSaveState !== 'conflict')) return;
  settlementSaveState = 'saving';
  renderStatus();
  try {
    const result = await progress.retrySettlement(settlementId);
    profile = result.profile;
    profileLoadFailed = false;
    settlementSaveState = result.status;
  } catch {
    settlementSaveState = 'failed';
  }
  renderStatus();
}

function renderStatus(events: readonly GameEvent[] = view.events): void {
  const language = getLanguage();
  const unit = view.units.find((candidate) => candidate.selected);
  const messages = languageMessages[language];
  const profileText = profileMessage(language);
  if (profileStatus.textContent !== profileText) profileStatus.textContent = profileText;
  const defeatEvent = events.find((event) => event.type === 'enemy-defeated');
  if (defeatEvent?.type === 'enemy-defeated') lastDefeatReward = defeatEvent.cashReward;
  const recruitmentEvent = [...events].reverse().find((event) =>
    event.type === 'unit-recruited' || event.type === 'unit-recruitment-rejected');
  if (recruitmentEvent?.type === 'unit-recruited' || recruitmentEvent?.type === 'unit-recruitment-rejected') {
    lastRecruitmentEvent = recruitmentEvent;
  }
  const upgradeEvent = [...events].reverse().find((event) =>
    event.type === 'unit-upgraded' || event.type === 'unit-upgrade-rejected');
  if (upgradeEvent?.type === 'unit-upgraded' || upgradeEvent?.type === 'unit-upgrade-rejected') {
    lastUpgradeEvent = upgradeEvent;
  }
  const selectionText = unit
    ? messages.selected + ' · Cell (' + (unit.cell.x + 1) + ', ' + (unit.cell.y + 1) + ')'
    : messages.none;
  if (status.textContent !== selectionText) status.textContent = selectionText;
  simulationSpeedValue.textContent = simulationSpeed + '×';
  const pauseMessage = view.paused
    ? pauseReason === 'background' ? messages.battlePausedInBackground : messages.battlePaused
    : '';
  pauseStatus.textContent = pauseMessage;
  pauseStatus.hidden = !view.paused;
  pauseControl.textContent = view.paused ? messages.resumeBattle : messages.pauseBattle;
  pauseControl.disabled = !view.paused
    && view.wave?.phase !== 'active'
    && !view.units.some((candidate) => candidate.moving);
  const settingsText = settingsStatusKey ? messages[settingsStatusKey] : '';
  if (settingsStatus.textContent !== settingsText) settingsStatus.textContent = settingsText;
  if (view.wave) {
    const wave = view.wave;
    const waveText = wave.phase === 'not-started'
      ? messages.waiting(wave.lives, wave.number, wave.cash)
      : wave.phase === 'active'
        ? messages.active(wave.lives, wave.number, wave.activeEnemies, wave.cash)
        : messages.complete(wave.lives, wave.number, wave.escapedEnemies, wave.defeatedEnemies, wave.cash);
    if (waveStatus.textContent !== waveText) waveStatus.textContent = waveText;
  }
  const combatText = lastDefeatReward === undefined ? '' : messages.defeated(lastDefeatReward);
  if (combatStatus.textContent !== combatText) combatStatus.textContent = combatText;
  const poolEntries = view.recruitPool.filter((entry) => entry.count > 0);
  const poolText = poolEntries.length === 0
    ? messages.recruitPoolEmpty
    : messages.recruitPool(poolEntries.map((entry) => `${entry.name[language]} ×${entry.count}`).join(' · '));
  if (recruitPoolStatus.textContent !== poolText) recruitPoolStatus.textContent = poolText;
  const recruitDefinition = view.recruitPool[0];
  let recruitText = '';
  if (lastRecruitmentEvent?.type === 'unit-recruited') {
    recruitText = messages.recruited(
      recruitDefinition?.name[language] ?? lastRecruitmentEvent.unitType,
      lastRecruitmentEvent.price,
    );
  } else if (lastRecruitmentEvent?.type === 'unit-recruitment-rejected') {
    recruitText = messages.insufficientCash(
      recruitDefinition?.name[language] ?? lastRecruitmentEvent.unitType,
      lastRecruitmentEvent.price,
      lastRecruitmentEvent.availableCash,
    );
  }
  if (recruitStatus.textContent !== recruitText) recruitStatus.textContent = recruitText;
  if (recruitDefinition) {
    const recruitLabel = messages.recruitButton(recruitDefinition.name[language], recruitDefinition.price);
    if (recruitControl.textContent !== recruitLabel) recruitControl.textContent = recruitLabel;
  }
  const upgradeScenario = view.scenarioId === 'cow-gulch-upgrade-sample';
  sceneTitle.textContent = upgradeScenario ? messages.upgradeSceneTitle : 'Cow Gulch';
  sceneContext.textContent = upgradeScenario ? messages.upgradeSceneContext : 'NEW MEXICO · 01';
  upgradeSampleStatus.textContent = upgradeScenario ? messages.debugUpgradeFixture : messages.originalUpgradeLimit;
  const selectedUnit = unit;
  const nextUpgrade = selectedUnit?.nextUpgrade;
  let upgradeText = '';
  if (lastUpgradeEvent?.type === 'unit-upgraded') {
    const unitName = language === 'zh' ? '枪手' : 'Gunslinger';
    upgradeText = messages.upgraded(unitName, lastUpgradeEvent.level, lastUpgradeEvent.price);
  } else if (lastUpgradeEvent?.type === 'unit-upgrade-rejected') {
    upgradeText = lastUpgradeEvent.reason === 'insufficient-funds'
      ? messages.insufficientUpgradeCash(lastUpgradeEvent.price, lastUpgradeEvent.availableCash)
      : messages.upgradeLimitReached;
  } else if (selectedUnit && nextUpgrade && selectedUnit.weapon) {
    upgradeText = messages.upgradeSummary(
      selectedUnit.upgradeLevel,
      selectedUnit.movementSpeedFinePer100Ms,
      nextUpgrade.movementSpeedFinePer100Ms,
      selectedUnit.weapon.reloadTimeMs,
      nextUpgrade.weapon.reloadTimeMs,
    );
  } else if (selectedUnit) {
    upgradeText = messages.noUpgradeAvailable;
  }
  if (upgradeStatus.textContent !== upgradeText) upgradeStatus.textContent = upgradeText;
  if (nextUpgrade) {
    upgradeControl.textContent = messages.upgradeButton(nextUpgrade.price);
  } else {
    upgradeControl.textContent = messages.upgradeButton(0);
  }
  confirmRecruitControl.textContent = messages.confirmRecruitButton;
  cancelRecruitControl.textContent = messages.cancelRecruitButton;
  confirmUpgradeControl.textContent = messages.confirmUpgradeButton;
  cancelUpgradeControl.textContent = messages.cancelUpgradeButton;
  if (pendingRecruitmentType) {
    const pendingRecruit = view.recruitPool.find((entry) => entry.unitType === pendingRecruitmentType);
    if (pendingRecruit) recruitConfirmationTitle.textContent = messages.confirmRecruit(
      pendingRecruit.name[language], pendingRecruit.price,
    );
  }
  if (pendingUpgradeUnitId) renderUpgradeConfirmation(language);
  const settlement = view.wave?.settlement;
  const newSettlement = Boolean(settlement) && settlementPanel.hidden;
  settlementPanel.hidden = !settlement;
  if (settlement && recruitConfirmation.open) {
    pendingRecruitmentType = undefined;
    recruitConfirmation.close();
  }
  if (settlement && upgradeConfirmation.open) {
    pendingUpgradeUnitId = undefined;
    upgradeConfirmation.close();
    confirmUpgradeControl.hidden = false;
  }
  if (settlement && view.wave) {
    if (newSettlement) {
      activeSettlementRecord = session.terminalRecord();
      settlementSaveState = activeSettlementRecord?.mode === 'formal' ? 'saving' : 'debug';
    }
    settlementTitle.textContent = messages.result;
    settlementOutcome.textContent = messages[settlement.outcome];
    settlementSummary.textContent = messages.settlementSummary(
      view.wave.number,
      view.wave.lives,
      view.wave.escapedEnemies,
      view.wave.defeatedEnemies,
      view.wave.cash,
    );
    settlementScore.textContent = messages.displayScore(settlement.displayScore);
    const savedHighScore = profile.highScores[view.scenarioId];
    settlementHighScore.textContent = settlementSaveState === 'saved' && savedHighScore !== undefined
      ? messages.scoreSaved(savedHighScore)
      : messages.scoreCandidate(settlement.highScoreCandidate);
    const saveMessage = settlementSaveMessage(language);
    if (settlementSaveStatus.textContent !== saveMessage) settlementSaveStatus.textContent = saveMessage;
    retrySettlementControl.hidden = settlementSaveState !== 'failed' && settlementSaveState !== 'conflict';
    retrySettlementControl.textContent = messages.retrySave;
    if (newSettlement) restartControl.focus();
    if (newSettlement && activeSettlementRecord?.mode === 'formal') {
      void applyFormalSettlement(activeSettlementRecord);
    }
  } else {
    settlementSaveStatus.textContent = '';
    retrySettlementControl.hidden = true;
  }
  const waveNotStarted = view.wave?.phase === 'not-started';
  startWaveControl.disabled = !waveNotStarted || view.paused;
  recruitControl.disabled = Boolean(settlement) || !recruitDefinition || view.paused;
  upgradeControl.hidden = !nextUpgrade;
  upgradeControl.disabled = Boolean(settlement) || !nextUpgrade || view.paused;
  startUpgradeSampleControl.hidden = upgradeScenario;
  returnCowGulchControl.hidden = !upgradeScenario;
  startDefeatControl.disabled = !waveNotStarted || view.scenarioId !== 'cow-gulch' || view.paused;
  clearSelectionControl.disabled = Boolean(settlement) || view.paused;
  const canvasLabel = upgradeScenario
    ? language === 'zh' ? '牛溪谷升级规则测试地图' : 'Cow Gulch upgrade rules test map'
    : language === 'zh' ? '牛溪谷游戏地图' : 'Cow Gulch game map';
  if (canvas.getAttribute('aria-label') !== canvasLabel) canvas.setAttribute('aria-label', canvasLabel);
}

function renderUpgradeConfirmation(language: keyof typeof languageMessages): void {
  const unit = view.units.find((candidate) => candidate.id === pendingUpgradeUnitId);
  const nextUpgrade = unit?.nextUpgrade;
  const cash = view.wave?.cash;
  if (!unit || !nextUpgrade || !unit.weapon || cash === undefined) {
    pendingUpgradeUnitId = undefined;
    if (upgradeConfirmation.open) upgradeConfirmation.close();
    confirmUpgradeControl.hidden = false;
    return;
  }

  const messages = languageMessages[language];
  const unitName = language === 'zh' ? '枪手' : 'Gunslinger';
  upgradeConfirmationTitle.textContent = messages.confirmUpgrade(unitName, nextUpgrade.price);
  const details = messages.upgradeDetails(
    unit.upgradeLevel,
    unit.movementSpeedFinePer100Ms,
    nextUpgrade.movementSpeedFinePer100Ms,
    unit.weapon.damage,
    nextUpgrade.weapon.damage,
    unit.weapon.rangeFine,
    nextUpgrade.weapon.rangeFine,
    unit.weapon.reloadTimeMs,
    nextUpgrade.weapon.reloadTimeMs,
    unit.weapon.specialReloadTimeMs ?? 0,
    nextUpgrade.weapon.specialReloadTimeMs ?? 0,
    nextUpgrade.price,
    cash,
  );
  const affordable = cash >= nextUpgrade.price;
  upgradeConfirmationDetails.textContent = affordable
    ? details
    : `${details} · ${messages.insufficientUpgradeCash(nextUpgrade.price, cash)}`;
  confirmUpgradeControl.hidden = !affordable;
  confirmUpgradeControl.disabled = !affordable;
}

function redraw(resize = false): void {
  const displayPixelScale = getDisplayPixelScale();
  if (resize || !context) context = resizeCanvas(canvas, displayPixelScale);
  drawGame(context, view, images, displayPixelScale);
}

function getDisplayPixelScale(): number {
  const cssWidth = canvas.getBoundingClientRect().width;
  const cssScale = cssWidth > 0 ? cssWidth / GAME_VIEWPORT.width : 1;
  return cssScale * Math.max(1, window.devicePixelRatio || 1);
}

const assetNames = new Set([
  ...view.map.background.map((tile) => tile.asset),
  ...view.map.streets.map((tile) => tile.asset),
  ...view.units.map((unit) => unit.asset),
  'pioneer_male',
]);
const images: Record<string, HTMLImageElement> = {};

async function loadSettings(): Promise<void> {
  try {
    profile = await progress.loadProfile();
    profileLoadFailed = false;
    simulationSpeed = profile.settings.simulationSpeed;
    simulationSpeedInput.value = String(simulationSpeed);
  } catch {
    settingsStatusKey = 'load-failed';
    profileLoadFailed = true;
  } finally {
    simulationSpeedInput.disabled = false;
    renderStatus();
  }
}

async function loadImage(assetName: string): Promise<void> {
  const image = new Image();
  image.src = new URL(import.meta.env.BASE_URL + 'assets/' + assetName + '.png', window.location.href).toString();
  await image.decode();
  images[assetName] = image;
}

try {
  await Promise.all([...assetNames].map(loadImage).concat(loadSettings()));
  redraw(true);
  renderStatus();
} catch (error) {
  status.textContent = languageMessages[getLanguage()].failed;
  throw error;
}

const frame = app.querySelector<HTMLElement>('.game-frame');
if (frame && typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => redraw(true)).observe(frame);
}
window.addEventListener('resize', () => redraw(true));

let animationFrame = 0;
let previousTimestamp: number | undefined;
let loopGeneration = 0;
let replacingSession = false;
let activePointerId: number | undefined;
let activePointerOrigin: { x: number; y: number } | undefined;
let activeDragUnitId: string | undefined;
let dragStarted = false;
const DRAG_START_TOLERANCE = 20;

function stopGameLoop(): void {
  loopGeneration += 1;
  if (animationFrame !== 0) window.cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  previousTimestamp = undefined;
  simulationTime.reset();
}

async function replaceSession(scenarioId: string, randomSeed: number, mode: GameMode): Promise<boolean> {
  if (replacingSession) return false;
  replacingSession = true;
  stopGameLoop();
  const previousSession = session;
  try {
    session = await game.open({ scenarioId, randomSeed, mode });
    view = session.observe();
    pauseReason = undefined;
    previousSession.close();
    lastDefeatReward = undefined;
    lastRecruitmentEvent = undefined;
    pendingRecruitmentType = undefined;
    recruitmentCommandNumber = 0;
    lastUpgradeEvent = undefined;
    pendingUpgradeUnitId = undefined;
    upgradeCommandNumber = 0;
    if (recruitConfirmation.open) recruitConfirmation.close();
    if (upgradeConfirmation.open) upgradeConfirmation.close();
    confirmUpgradeControl.hidden = false;
    activeSettlementRecord = undefined;
    settlementSaveState = undefined;
    renderStatus();
    redraw();
    return true;
  } catch {
    session = previousSession;
    status.textContent = languageMessages[getLanguage()].failed;
    return false;
  } finally {
    replacingSession = false;
  }
}

simulationSpeedInput.addEventListener('input', () => {
  settingsSaveSequence += 1;
  simulationSpeed = normalizeSimulationSpeed(Number(simulationSpeedInput.value));
  simulationSpeedInput.value = String(simulationSpeed);
  settingsStatusKey = undefined;
  renderStatus();
});

simulationSpeedInput.addEventListener('change', () => {
  const sequence = ++settingsSaveSequence;
  const requestedSpeed = normalizeSimulationSpeed(Number(simulationSpeedInput.value));
  simulationSpeed = requestedSpeed;
  void progress.saveSettings({ simulationSpeed: requestedSpeed }).then((saved) => {
    if (sequence !== settingsSaveSequence) return;
    simulationSpeed = saved.simulationSpeed;
    settingsStatusKey = 'saved';
    renderStatus();
  }).catch(() => {
    if (sequence !== settingsSaveSequence) return;
    settingsStatusKey = 'save-failed';
    renderStatus();
  });
});

function finishPointerMovement(pointerId?: number): void {
  if (pointerId !== undefined && pointerId !== activePointerId) return;
  const wasDragging = dragStarted;
  activePointerId = undefined;
  activePointerOrigin = undefined;
  activeDragUnitId = undefined;
  dragStarted = false;
  if (wasDragging) dispatch({ type: 'stop-moving' });
}

function pauseForBackground(): void {
  previousTimestamp = undefined;
  simulationTime.reset();
  if (view.paused) {
    stopGameLoop();
    return;
  }
  finishPointerMovement();
  pauseReason = 'background';
  stopGameLoop();
  view = session.pause();
  renderStatus();
  redraw();
}

function handleVisibilityChange(): void {
  if (pageLeaving || replacingSession) return;
  previousTimestamp = undefined;
  simulationTime.reset();
  if (document.hidden) {
    pauseForBackground();
    return;
  }

  if (pauseReason === 'background' && view.paused) {
    pauseReason = undefined;
    view = session.resume();
    renderStatus();
    redraw();
  }
  if (!view.paused && (view.wave?.phase === 'active' || view.units.some((unit) => unit.moving))) {
    startGameLoop();
  }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

function startGameLoop(): void {
  if (view.paused || document.hidden
    || (view.wave?.phase !== 'active' && !view.units.some((unit) => unit.moving))) return;
  if (animationFrame !== 0 || replacingSession) return;
  const loopSession = session;
  const generation = loopGeneration;
  const tick = (timestamp: number) => {
    if (generation !== loopGeneration || loopSession !== session) return;
    if (view.wave?.phase !== 'active' && !view.units.some((unit) => unit.moving)) {
      animationFrame = 0;
      previousTimestamp = undefined;
      simulationTime.reset();
      return;
    }

    if (document.hidden) {
      pauseForBackground();
      animationFrame = 0;
      return;
    }

    if (view.paused) {
      previousTimestamp = undefined;
      simulationTime.reset();
      animationFrame = 0;
      return;
    }

    const currentTimestamp = Math.trunc(timestamp);
    const deltaMs = previousTimestamp === undefined ? 0 : currentTimestamp - previousTimestamp;
    previousTimestamp = currentTimestamp;
    const frameEvents: GameEvent[] = [];
    for (const stepMs of simulationTime.advanceElapsed(deltaMs, simulationSpeed)) {
      view = loopSession.advance({ deltaMs: stepMs });
      frameEvents.push(...view.events);
      if (view.wave?.phase !== 'active') break;
    }
    renderStatus(frameEvents);
    redraw();
    animationFrame = window.requestAnimationFrame(tick);
  };
  animationFrame = window.requestAnimationFrame(tick);
}

function dispatch(intent: GameIntent): void {
  if (!session.submitIntent(intent)) return;
  view = session.advance();
  renderStatus();
  redraw();
  if (view.wave?.phase === 'active' || view.units.some((unit) => unit.moving)) startGameLoop();
}

pauseControl.addEventListener('click', () => {
  if (document.hidden) return;
  previousTimestamp = undefined;
  simulationTime.reset();
  if (view.paused) {
    pauseReason = undefined;
    view = session.resume();
    renderStatus();
    redraw();
    startGameLoop();
    return;
  }

  finishPointerMovement();
  pauseReason = 'manual';
  stopGameLoop();
  view = session.pause();
  renderStatus();
  redraw();
});

startWaveControl.addEventListener('click', () => dispatch({ type: 'start-wave' }));
recruitControl.addEventListener('click', () => {
  const recruit = view.recruitPool[0];
  const cash = view.wave?.cash;
  if (!recruit || cash === undefined || recruitConfirmation.open) return;
  if (cash < recruit.price) {
    dispatch({
      type: 'recruit-unit',
      unitType: recruit.unitType,
      commandId: `${session.id}:recruit:${++recruitmentCommandNumber}`,
    });
    return;
  }
  pendingRecruitmentType = recruit.unitType;
  recruitConfirmationTitle.textContent = languageMessages[getLanguage()].confirmRecruit(
    recruit.name[getLanguage()], recruit.price,
  );
  recruitConfirmation.showModal();
  confirmRecruitControl.focus();
});
confirmRecruitControl.addEventListener('click', () => {
  const unitType = pendingRecruitmentType;
  pendingRecruitmentType = undefined;
  recruitConfirmation.close();
  if (!unitType) return;
  dispatch({
    type: 'recruit-unit',
    unitType,
    commandId: `${session.id}:recruit:${++recruitmentCommandNumber}`,
  });
});
cancelRecruitControl.addEventListener('click', () => {
  pendingRecruitmentType = undefined;
  recruitConfirmation.close();
});
recruitConfirmation.addEventListener('cancel', () => {
  pendingRecruitmentType = undefined;
});
startUpgradeSampleControl.addEventListener('click', () => {
  const randomSeed = session.startRecord.randomSeed;
  void replaceSession('cow-gulch-upgrade-sample', randomSeed, 'debug');
});
returnCowGulchControl.addEventListener('click', () => {
  const randomSeed = session.startRecord.randomSeed;
  void replaceSession('cow-gulch', randomSeed, 'formal');
});
upgradeControl.addEventListener('click', () => {
  const unit = view.units.find((candidate) => candidate.selected && candidate.nextUpgrade);
  if (!unit || upgradeConfirmation.open || view.wave?.cash === undefined) return;
  pendingUpgradeUnitId = unit.id;
  renderUpgradeConfirmation(getLanguage());
  upgradeConfirmation.showModal();
  (confirmUpgradeControl.hidden ? cancelUpgradeControl : confirmUpgradeControl).focus();
});
confirmUpgradeControl.addEventListener('click', () => {
  const unitId = pendingUpgradeUnitId;
  pendingUpgradeUnitId = undefined;
  upgradeConfirmation.close();
  confirmUpgradeControl.hidden = false;
  if (!unitId) return;
  dispatch({
    type: 'upgrade-unit',
    unitId,
    commandId: `${session.id}:upgrade:${++upgradeCommandNumber}`,
  });
  if (upgradeControl.hidden) canvas.focus({ preventScroll: true });
});
cancelUpgradeControl.addEventListener('click', () => {
  pendingUpgradeUnitId = undefined;
  upgradeConfirmation.close();
  confirmUpgradeControl.hidden = false;
});
upgradeConfirmation.addEventListener('cancel', () => {
  pendingUpgradeUnitId = undefined;
  confirmUpgradeControl.hidden = false;
});
clearSelectionControl.addEventListener('click', () => dispatch({ type: 'clear-selection' }));
startDefeatControl.addEventListener('click', () => {
  const randomSeed = session.startRecord.randomSeed;
  void replaceSession('cow-gulch-defeat', randomSeed, 'debug').then((replaced) => {
    if (replaced) dispatch({ type: 'start-wave' });
  });
});
retrySettlementControl.addEventListener('click', () => { void retryFormalSettlement(); });
restartControl.addEventListener('click', () => {
  void replaceSession(session.startRecord.scenarioId, session.startRecord.randomSeed, session.startRecord.mode);
});

window.addEventListener('pagehide', () => {
  pageLeaving = true;
  stopGameLoop();
  session.close();
}, { once: true });

function pointerMapPosition(event: PointerEvent): { x: number; y: number; mapX: number; mapY: number } | undefined {
  const bounds = canvas.getBoundingClientRect();
  const logicalViewport = fitAspectViewport(bounds.width, bounds.height, GAME_VIEWPORT.width, GAME_VIEWPORT.height);
  const point = toLogicalPoint(
    event.clientX - bounds.left,
    event.clientY - bounds.top,
    logicalViewport,
    GAME_VIEWPORT.width,
    GAME_VIEWPORT.height,
  );
  if (!point) return undefined;

  const mapViewport = getMapViewport(view, getDisplayPixelScale());
  const mapCell = screenToMapCell(mapViewport, point.x, point.y);
  return { x: point.x, y: point.y, mapX: mapCell.x, mapY: mapCell.y };
}

canvas.addEventListener('pointerdown', (event: PointerEvent) => {
  if (activePointerId !== undefined) {
    if (event.pointerId !== activePointerId) finishPointerMovement();
    return;
  }
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const point = pointerMapPosition(event);
  if (!point) return;

  event.preventDefault();
  activePointerId = event.pointerId;
  activePointerOrigin = { x: point.x, y: point.y };
  dragStarted = false;
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    finishPointerMovement();
    return;
  }
  dispatch({ type: 'select-at', x: point.mapX, y: point.mapY });
  activeDragUnitId = view.units.find((unit) => unit.selected)?.id;
});

canvas.addEventListener('pointermove', (event: PointerEvent) => {
  if (event.pointerId !== activePointerId || !activePointerOrigin) return;
  const point = pointerMapPosition(event);
  if (!point) {
    finishPointerMovement(event.pointerId);
    return;
  }
  if (!dragStarted
    && Math.abs(point.x - activePointerOrigin.x) <= DRAG_START_TOLERANCE
    && Math.abs(point.y - activePointerOrigin.y) <= DRAG_START_TOLERANCE) return;
  if (!activeDragUnitId || !view.units.some((unit) => unit.id === activeDragUnitId && unit.selected)) return;

  dragStarted = true;
  dispatch({ type: 'move-unit', targetX: point.mapX, targetY: point.mapY });
});

canvas.addEventListener('pointerup', (event: PointerEvent) => {
  if (event.pointerId !== activePointerId) return;
  event.preventDefault();
  finishPointerMovement(event.pointerId);
});

canvas.addEventListener('pointercancel', (event: PointerEvent) => finishPointerMovement(event.pointerId));
canvas.addEventListener('lostpointercapture', (event: PointerEvent) => finishPointerMovement(event.pointerId));
window.addEventListener('blur', () => finishPointerMovement());

subscribeLanguage(() => renderStatus());
