import '@wishflow/site-shell';
import { getLanguage, registerMessages, subscribeLanguage } from '@wishflow/site-shell';
import { createBrowserGame, createBrowserProgress } from './bootstrap/browser';
import { drawGame, GAME_VIEWPORT, getMapViewport, resizeCanvas } from './render/canvas-renderer';
import { screenToMapCell } from './render/map-viewport';
import { fitAspectViewport, toLogicalPoint } from './render/viewport';
import { DEFAULT_SIMULATION_SPEED, normalizeSimulationSpeed, SimulationTimeAccumulator } from './game/time-scaling';
import type { GameIntent } from './game';
import { messages } from './locales';
import './styles.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Game root is missing');

app.innerHTML = [
  '<section class="game-page" id="game">',
  '  <header class="game-heading">',
  '    <p class="eyebrow">FIRST PLAYABLE SLICE</p>',
  '    <h1>Guns’n’Glory</h1>',
  '    <p class="intro">A recovered map, a controlled enemy sample, and the first browser wave.</p>',
  '  </header>',
  '  <section class="game-panel" aria-labelledby="scene-title">',
  '    <div class="scene-heading"><h2 id="scene-title">Cow Gulch</h2><span>NEW MEXICO · 01</span></div>',
  '    <div class="game-frame">',
  '      <canvas data-testid="game-canvas" aria-label="Cow Gulch game map" tabindex="0"></canvas>',
  '    </div>',
  '    <div class="game-controls">',
  '      <p data-testid="selection-status" role="status" aria-live="polite"></p>',
  '      <p data-testid="wave-status" role="status" aria-live="polite"></p>',
  '      <label class="simulation-speed-control" for="simulation-speed">',
  '        <span id="simulation-speed-label">Simulation speed</span>',
  '        <input id="simulation-speed" data-testid="simulation-speed" aria-labelledby="simulation-speed-label" type="range" min="0.25" max="4" step="0.25" value="1" disabled>',
  '        <output data-testid="simulation-speed-value" for="simulation-speed">1×</output>',
  '      </label>',
  '      <p data-testid="settings-status" role="status" aria-live="polite"></p>',
  '      <button type="button" data-action="start-wave">Start one pioneer sample</button>',
  '      <button type="button" data-action="clear-selection">Clear selection</button>',
  '    </div>',
  '    <p class="scene-caption">The preview follows one Cow Gulch pioneer to the exit; it does not run the full wave or campaign.</p>',
  '  </section>',
  '</section>',
].join('');

registerMessages('gunsnglory', messages);

const canvasElement = app.querySelector<HTMLCanvasElement>('[data-testid="game-canvas"]');
const statusElement = app.querySelector<HTMLElement>('[data-testid="selection-status"]');
const waveStatusElement = app.querySelector<HTMLElement>('[data-testid="wave-status"]');
const settingsStatusElement = app.querySelector<HTMLElement>('[data-testid="settings-status"]');
const simulationSpeedInputElement = app.querySelector<HTMLInputElement>('[data-testid="simulation-speed"]');
const simulationSpeedValueElement = app.querySelector<HTMLOutputElement>('[data-testid="simulation-speed-value"]');
const clearButton = app.querySelector<HTMLButtonElement>('[data-action="clear-selection"]');
const startWaveButton = app.querySelector<HTMLButtonElement>('[data-action="start-wave"]');
if (!canvasElement || !statusElement || !waveStatusElement || !settingsStatusElement
  || !simulationSpeedInputElement || !simulationSpeedValueElement || !clearButton || !startWaveButton) {
  throw new Error('Game controls are missing');
}
const canvas: HTMLCanvasElement = canvasElement;
const status: HTMLElement = statusElement;
const waveStatus: HTMLElement = waveStatusElement;
const settingsStatus: HTMLElement = settingsStatusElement;
const simulationSpeedInput: HTMLInputElement = simulationSpeedInputElement;
const simulationSpeedValue: HTMLOutputElement = simulationSpeedValueElement;
const startWaveControl: HTMLButtonElement = startWaveButton;

const game = createBrowserGame();
const progress = createBrowserProgress();
const session = await game.open({ scenarioId: 'cow-gulch' });
let view = session.observe();
let context: CanvasRenderingContext2D | undefined;
let simulationSpeed = DEFAULT_SIMULATION_SPEED;
let settingsStatusKey: 'load-failed' | 'saved' | 'save-failed' | undefined;
let settingsSaveSequence = 0;
const simulationTime = new SimulationTimeAccumulator();
const languageMessages = {
  en: {
    none: 'No unit selected',
    selected: 'Gunslinger selected',
    failed: 'Game scene failed to load',
    waiting: (lives: number, number: number) => `Wave ${number} ready · Lives ${lives}`,
    active: (lives: number, number: number, enemies: number) => `Wave ${number} · Lives ${lives} · Enemies ${enemies}`,
    complete: (lives: number, number: number, escaped: number) => `Wave ${number} complete · Lives ${lives} · Escaped ${escaped}`,
    'load-failed': 'Speed preference unavailable; using 1× for this session.',
    saved: 'Speed preference saved.',
    'save-failed': 'Speed is active for this session, but could not be saved.',
  },
  zh: {
    none: '尚未选择单位',
    selected: '已选择枪手',
    failed: '游戏场景加载失败',
    waiting: (lives: number, number: number) => `第 ${number} 波待开始 · 生命 ${lives}`,
    active: (lives: number, number: number, enemies: number) => `第 ${number} 波 · 生命 ${lives} · 敌人 ${enemies}`,
    complete: (lives: number, number: number, escaped: number) => `第 ${number} 波完成 · 生命 ${lives} · 逃脱 ${escaped}`,
    'load-failed': '无法读取倍速设置，本次暂用 1×。',
    saved: '倍速设置已保存。',
    'save-failed': '本次使用所选倍速，但保存失败。',
  },
};

function renderStatus(): void {
  const language = getLanguage();
  const unit = view.units.find((candidate) => candidate.selected);
  const messages = languageMessages[language];
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
      ? messages.waiting(wave.lives, wave.number)
      : wave.phase === 'active'
        ? messages.active(wave.lives, wave.number, wave.activeEnemies)
        : messages.complete(wave.lives, wave.number, wave.escapedEnemies);
    if (waveStatus.textContent !== waveText) waveStatus.textContent = waveText;
    const startDisabled = wave.phase !== 'not-started';
    if (startWaveControl.disabled !== startDisabled) startWaveControl.disabled = startDisabled;
  }
  const canvasLabel = language === 'zh' ? '牛溪谷游戏地图' : 'Cow Gulch game map';
  if (canvas.getAttribute('aria-label') !== canvasLabel) canvas.setAttribute('aria-label', canvasLabel);
}

function redraw(resize = false): void {
  if (resize || !context) context = resizeCanvas(canvas);
  drawGame(context, view, images);
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
  if (animationFrame !== 0) return;
  const tick = (timestamp: number) => {
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
    for (const stepMs of simulationTime.advanceElapsed(deltaMs, simulationSpeed)) {
      view = session.advance({ deltaMs: stepMs });
      if (view.wave?.phase !== 'active') break;
    }
    renderStatus();
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
clearButton.addEventListener('click', () => dispatch({ type: 'clear-selection' }));

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

  const mapViewport = getMapViewport(view);
  const mapCell = screenToMapCell(mapViewport, point.x, point.y);
  dispatch({
    type: 'select-at',
    x: mapCell.x,
    y: mapCell.y,
  });
});

subscribeLanguage(renderStatus);
