import '@wishflow/site-shell';
import { getLanguage, registerMessages, subscribeLanguage } from '@wishflow/site-shell';
import { createBrowserGame } from './bootstrap/browser';
import { drawGame, GAME_VIEWPORT, getMapOrigin, resizeCanvas } from './render/canvas-renderer';
import { fitAspectViewport, toLogicalPoint } from './render/viewport';
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
const clearButton = app.querySelector<HTMLButtonElement>('[data-action="clear-selection"]');
const startWaveButton = app.querySelector<HTMLButtonElement>('[data-action="start-wave"]');
if (!canvasElement || !statusElement || !waveStatusElement || !clearButton || !startWaveButton) {
  throw new Error('Game controls are missing');
}
const canvas: HTMLCanvasElement = canvasElement;
const status: HTMLElement = statusElement;
const waveStatus: HTMLElement = waveStatusElement;
const startWaveControl: HTMLButtonElement = startWaveButton;

const game = createBrowserGame();
const session = await game.open({ scenarioId: 'cow-gulch' });
let view = session.observe();
let context: CanvasRenderingContext2D | undefined;
const languageMessages = {
  en: {
    none: 'No unit selected',
    selected: 'Gunslinger selected',
    failed: 'Game scene failed to load',
    waiting: (lives: number, number: number) => `Wave ${number} ready · Lives ${lives}`,
    active: (lives: number, number: number, enemies: number) => `Wave ${number} · Lives ${lives} · Enemies ${enemies}`,
    complete: (lives: number, number: number, escaped: number) => `Wave ${number} complete · Lives ${lives} · Escaped ${escaped}`,
  },
  zh: {
    none: '尚未选择单位',
    selected: '已选择枪手',
    failed: '游戏场景加载失败',
    waiting: (lives: number, number: number) => `第 ${number} 波待开始 · 生命 ${lives}`,
    active: (lives: number, number: number, enemies: number) => `第 ${number} 波 · 生命 ${lives} · 敌人 ${enemies}`,
    complete: (lives: number, number: number, escaped: number) => `第 ${number} 波完成 · 生命 ${lives} · 逃脱 ${escaped}`,
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

async function loadImage(assetName: string): Promise<void> {
  const image = new Image();
  image.src = new URL(import.meta.env.BASE_URL + 'assets/' + assetName + '.png', window.location.href).toString();
  await image.decode();
  images[assetName] = image;
}

try {
  await Promise.all([...assetNames].map(loadImage));
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

function startWaveLoop(): void {
  if (animationFrame !== 0) return;
  const tick = (timestamp: number) => {
    if (view.wave?.phase !== 'active') {
      animationFrame = 0;
      previousTimestamp = undefined;
      return;
    }

    const currentTimestamp = Math.trunc(timestamp);
    const deltaMs = previousTimestamp === undefined ? 0 : currentTimestamp - previousTimestamp;
    previousTimestamp = currentTimestamp;
    view = session.advance({ deltaMs });
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
  const viewport = fitAspectViewport(bounds.width, bounds.height, GAME_VIEWPORT.width, GAME_VIEWPORT.height);
  const point = toLogicalPoint(
    event.clientX - bounds.left,
    event.clientY - bounds.top,
    viewport,
    GAME_VIEWPORT.width,
    GAME_VIEWPORT.height,
  );
  if (!point) return;

  const origin = getMapOrigin(view);
  const tileSize = view.map.tileSize;
  dispatch({
    type: 'select-at',
    x: (point.x - origin.x) / tileSize,
    y: (point.y - origin.y) / tileSize,
  });
});

subscribeLanguage(renderStatus);
