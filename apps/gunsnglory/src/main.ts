import '@wishflow/site-shell';
import { getLanguage, registerMessages, subscribeLanguage } from '@wishflow/site-shell';
import { createBrowserGame, createBrowserProgress } from './bootstrap/browser';
import { drawGame, GAME_VIEWPORT, getMapViewport, resizeCanvas } from './render/canvas-renderer';
import { screenToMapCell } from './render/map-viewport';
import { fitAspectViewport, toLogicalPoint } from './render/viewport';
import { DEFAULT_SIMULATION_SPEED, normalizeSimulationSpeed, SimulationTimeAccumulator } from './game/time-scaling';
import type { GameEvent, GameIntent } from './game';
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
  '    <div class="scene-heading"><h2 id="scene-title">Cow Gulch</h2><span>NEW MEXICO · 01</span></div>',
  '    <div class="game-frame">',
  '      <canvas data-testid="game-canvas" aria-label="Cow Gulch game map" tabindex="0"></canvas>',
  '      <section class="settlement-panel" data-testid="settlement" aria-labelledby="settlement-title" aria-live="polite" hidden>',
  '        <h2 id="settlement-title">Battle result</h2>',
  '        <p data-testid="settlement-outcome"></p>',
  '        <p data-testid="settlement-summary"></p>',
  '        <p data-testid="settlement-score"></p>',
  '        <p data-testid="settlement-high-score"></p>',
  '        <button type="button" data-action="restart-sample">Restart this sample</button>',
  '      </section>',
  '    </div>',
  '    <div class="game-controls">',
  '      <p data-testid="selection-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="wave-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="combat-status" role="status" aria-live="polite"></p>',
  '      <label class="simulation-speed-control" for="simulation-speed">',
  '        <span id="simulation-speed-label">Simulation speed</span>',
  '        <input id="simulation-speed" data-testid="simulation-speed" aria-labelledby="simulation-speed-label" type="range" min="0.25" max="4" step="0.25" value="1" disabled>',
  '        <output data-testid="simulation-speed-value" for="simulation-speed">1×</output>',
  '      </label>',
  '      <p data-testid="settings-status" role="status" aria-live="polite"></p>',
  '      <button type="button" data-action="start-wave">Start one pioneer sample</button>',
  '      <button type="button" data-action="start-defeat-sample">Test defeat with one life</button>',
  '      <button type="button" data-action="clear-selection">Clear selection</button>',
  '    </div>',
  '    <p class="scene-caption">The normal sample resolves a victory; the one-life test verifies defeat. Later waves and the campaign are out of scope.</p>',
  '  </section>',
  '</section>',
].join('');

registerMessages('gunsnglory', messages);

const canvasElement = app.querySelector<HTMLCanvasElement>('[data-testid="game-canvas"]');
const statusElement = app.querySelector<HTMLElement>('[data-testid="selection-status"]');
const waveStatusElement = app.querySelector<HTMLElement>('[data-testid="wave-status"]');
const combatStatusElement = app.querySelector<HTMLElement>('[data-testid="combat-status"]');
const settingsStatusElement = app.querySelector<HTMLElement>('[data-testid="settings-status"]');
const simulationSpeedInputElement = app.querySelector<HTMLInputElement>('[data-testid="simulation-speed"]');
const simulationSpeedValueElement = app.querySelector<HTMLOutputElement>('[data-testid="simulation-speed-value"]');
const clearButton = app.querySelector<HTMLButtonElement>('[data-action="clear-selection"]');
const startWaveButton = app.querySelector<HTMLButtonElement>('[data-action="start-wave"]');
const startDefeatButton = app.querySelector<HTMLButtonElement>('[data-action="start-defeat-sample"]');
const settlementPanelElement = app.querySelector<HTMLElement>('[data-testid="settlement"]');
const settlementTitleElement = app.querySelector<HTMLElement>('#settlement-title');
const settlementOutcomeElement = app.querySelector<HTMLElement>('[data-testid="settlement-outcome"]');
const settlementSummaryElement = app.querySelector<HTMLElement>('[data-testid="settlement-summary"]');
const settlementScoreElement = app.querySelector<HTMLElement>('[data-testid="settlement-score"]');
const settlementHighScoreElement = app.querySelector<HTMLElement>('[data-testid="settlement-high-score"]');
const restartButton = app.querySelector<HTMLButtonElement>('[data-action="restart-sample"]');
if (!canvasElement || !statusElement || !waveStatusElement || !combatStatusElement || !settingsStatusElement
  || !simulationSpeedInputElement || !simulationSpeedValueElement || !clearButton || !startWaveButton
  || !startDefeatButton || !settlementPanelElement || !settlementTitleElement || !settlementOutcomeElement
  || !settlementSummaryElement || !settlementScoreElement || !settlementHighScoreElement || !restartButton) {
  throw new Error('Game controls are missing');
}
const canvas: HTMLCanvasElement = canvasElement;
const status: HTMLElement = statusElement;
const waveStatus: HTMLElement = waveStatusElement;
const combatStatus: HTMLElement = combatStatusElement;
const settingsStatus: HTMLElement = settingsStatusElement;
const simulationSpeedInput: HTMLInputElement = simulationSpeedInputElement;
const simulationSpeedValue: HTMLOutputElement = simulationSpeedValueElement;
const startWaveControl: HTMLButtonElement = startWaveButton;
const startDefeatControl: HTMLButtonElement = startDefeatButton;
const clearSelectionControl: HTMLButtonElement = clearButton;
const restartControl: HTMLButtonElement = restartButton;
const settlementPanel: HTMLElement = settlementPanelElement;
const settlementTitle: HTMLElement = settlementTitleElement;
const settlementOutcome: HTMLElement = settlementOutcomeElement;
const settlementSummary: HTMLElement = settlementSummaryElement;
const settlementScore: HTMLElement = settlementScoreElement;
const settlementHighScore: HTMLElement = settlementHighScoreElement;

const game = createBrowserGame();
const progress = createBrowserProgress();
let session = await game.open({ scenarioId: 'cow-gulch' });
let view = session.observe();
let context: CanvasRenderingContext2D | undefined;
let simulationSpeed = DEFAULT_SIMULATION_SPEED;
let settingsStatusKey: 'load-failed' | 'saved' | 'save-failed' | undefined;
let lastDefeatReward: number | undefined;
let settingsSaveSequence = 0;
const simulationTime = new SimulationTimeAccumulator();
const languageMessages = {
  en: {
    result: 'Battle result',
    none: 'No unit selected',
    selected: 'Gunslinger selected',
    failed: 'Game scene failed to load',
    waiting: (lives: number, number: number, cash: number) => `Wave ${number} ready · Lives ${lives} · Cash $${cash}`,
    active: (lives: number, number: number, enemies: number, cash: number) => `Wave ${number} · Lives ${lives} · Enemies ${enemies} · Cash $${cash}`,
    complete: (lives: number, number: number, escaped: number, defeated: number, cash: number) => `Wave ${number} complete · Lives ${lives} · Escaped ${escaped} · Defeated ${defeated} · Cash $${cash}`,
    defeated: (cashReward: number) => `Pioneer defeated · +$${cashReward}`,
    'load-failed': 'Speed preference unavailable; using 1× for this session.',
    saved: 'Speed preference saved.',
    'save-failed': 'Speed is active for this session, but could not be saved.',
    victory: 'Victory',
    defeat: 'Defeat',
    settlementSummary: (number: number, lives: number, escaped: number, defeated: number, cash: number) =>
      `Wave ${number} · Lives ${lives} · Escaped ${escaped} · Defeated ${defeated} · Cash $${cash}`,
    displayScore: (score: number) => `Displayed score: $${score}`,
    highScoreCandidate: (score: number) => `High-score file value (not saved yet): $${score}`,
  },
  zh: {
    result: '战斗结算',
    none: '尚未选择单位',
    selected: '已选择枪手',
    failed: '游戏场景加载失败',
    waiting: (lives: number, number: number, cash: number) => `第 ${number} 波待开始 · 生命 ${lives} · 现金 $${cash}`,
    active: (lives: number, number: number, enemies: number, cash: number) => `第 ${number} 波 · 生命 ${lives} · 敌人 ${enemies} · 现金 $${cash}`,
    complete: (lives: number, number: number, escaped: number, defeated: number, cash: number) => `第 ${number} 波完成 · 生命 ${lives} · 逃脱 ${escaped} · 击败 ${defeated} · 现金 $${cash}`,
    defeated: (cashReward: number) => `拓荒者被击败 · +$${cashReward}`,
    'load-failed': '无法读取倍速设置，本次暂用 1×。',
    saved: '倍速设置已保存。',
    'save-failed': '本次使用所选倍速，但保存失败。',
    victory: '胜利',
    defeat: '败北',
    settlementSummary: (number: number, lives: number, escaped: number, defeated: number, cash: number) =>
      `第 ${number} 波 · 生命 ${lives} · 逃脱 ${escaped} · 击败 ${defeated} · 现金 $${cash}`,
    displayScore: (score: number) => `画面分数：$${score}`,
    highScoreCandidate: (score: number) => `高分文件值（尚未保存）：$${score}`,
  },
};

function renderStatus(events: readonly GameEvent[] = view.events): void {
  const language = getLanguage();
  const unit = view.units.find((candidate) => candidate.selected);
  const messages = languageMessages[language];
  const defeatEvent = events.find((event) => event.type === 'enemy-defeated');
  if (defeatEvent?.type === 'enemy-defeated') lastDefeatReward = defeatEvent.cashReward;
  const selectionText = unit
    ? messages.selected + ' · Cell (' + (unit.cell.x + 1) + ', ' + (unit.cell.y + 1) + ')'
    : messages.none;
  if (status.textContent !== selectionText) status.textContent = selectionText;
  simulationSpeedValue.textContent = simulationSpeed + '×';
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
  const settlement = view.wave?.settlement;
  const newSettlement = Boolean(settlement) && settlementPanel.hidden;
  settlementPanel.hidden = !settlement;
  if (settlement && view.wave) {
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
    settlementHighScore.textContent = messages.highScoreCandidate(settlement.highScoreCandidate);
    if (newSettlement) restartControl.focus();
  }
  const waveNotStarted = view.wave?.phase === 'not-started';
  startWaveControl.disabled = !waveNotStarted;
  startDefeatControl.disabled = !waveNotStarted || view.scenarioId !== 'cow-gulch';
  clearSelectionControl.disabled = Boolean(settlement);
  const canvasLabel = language === 'zh' ? '牛溪谷游戏地图' : 'Cow Gulch game map';
  if (canvas.getAttribute('aria-label') !== canvasLabel) canvas.setAttribute('aria-label', canvasLabel);
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
    const settings = await progress.loadSettings();
    simulationSpeed = settings.simulationSpeed;
    simulationSpeedInput.value = String(simulationSpeed);
  } catch {
    settingsStatusKey = 'load-failed';
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

function stopGameLoop(): void {
  loopGeneration += 1;
  if (animationFrame !== 0) window.cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  previousTimestamp = undefined;
  simulationTime.reset();
}

async function replaceSession(scenarioId: string, randomSeed: number): Promise<boolean> {
  if (replacingSession) return false;
  replacingSession = true;
  stopGameLoop();
  const previousSession = session;
  try {
    session = await game.open({ scenarioId, randomSeed });
    view = session.observe();
    previousSession.close();
    lastDefeatReward = undefined;
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

document.addEventListener('visibilitychange', () => {
  previousTimestamp = undefined;
  simulationTime.reset();
});

function startWaveLoop(): void {
  if (animationFrame !== 0 || replacingSession) return;
  const loopSession = session;
  const generation = loopGeneration;
  const tick = (timestamp: number) => {
    if (generation !== loopGeneration || loopSession !== session) return;
    if (view.wave?.phase !== 'active') {
      animationFrame = 0;
      previousTimestamp = undefined;
      simulationTime.reset();
      return;
    }

    if (document.hidden) {
      previousTimestamp = undefined;
      simulationTime.reset();
      animationFrame = window.requestAnimationFrame(tick);
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
  if (intent.type === 'start-wave' && view.wave?.phase === 'active') startWaveLoop();
}

startWaveControl.addEventListener('click', () => dispatch({ type: 'start-wave' }));
clearSelectionControl.addEventListener('click', () => dispatch({ type: 'clear-selection' }));
startDefeatControl.addEventListener('click', () => {
  const randomSeed = session.startRecord.randomSeed;
  void replaceSession('cow-gulch-defeat', randomSeed).then((replaced) => {
    if (replaced) dispatch({ type: 'start-wave' });
  });
});
restartControl.addEventListener('click', () => {
  void replaceSession(session.startRecord.scenarioId, session.startRecord.randomSeed);
});

window.addEventListener('pagehide', () => {
  stopGameLoop();
  session.close();
}, { once: true });

canvas.addEventListener('pointerup', (event: PointerEvent) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const bounds = canvas.getBoundingClientRect();
  const logicalViewport = fitAspectViewport(bounds.width, bounds.height, GAME_VIEWPORT.width, GAME_VIEWPORT.height);
  const point = toLogicalPoint(
    event.clientX - bounds.left,
    event.clientY - bounds.top,
    logicalViewport,
    GAME_VIEWPORT.width,
    GAME_VIEWPORT.height,
  );
  if (!point) return;

  const mapViewport = getMapViewport(view, getDisplayPixelScale());
  const mapCell = screenToMapCell(mapViewport, point.x, point.y);
  dispatch({
    type: 'select-at',
    x: mapCell.x,
    y: mapCell.y,
  });
});

subscribeLanguage(() => renderStatus());
