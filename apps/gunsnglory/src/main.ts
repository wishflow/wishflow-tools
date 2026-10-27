import '@wishflow/site-shell';
import { getLanguage, registerMessages, subscribeLanguage } from '@wishflow/site-shell';
import { createBrowserGame } from './bootstrap/browser';
import { drawGame, GAME_VIEWPORT, getMapOrigin, resizeCanvas } from './render/canvas-renderer';
import { fitAspectViewport, toLogicalPoint } from './render/viewport';
import { messages } from './locales';
import './styles.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Game root is missing');

app.innerHTML = [
  '<section class="game-page" id="game">',
  '  <header class="game-heading">',
  '    <p class="eyebrow">FIRST PLAYABLE SLICE</p>',
  '    <h1>Guns’n’Glory</h1>',
  '    <p class="intro">A recovered map, one gunslinger, and the first browser interaction.</p>',
  '  </header>',
  '  <section class="game-panel" aria-labelledby="scene-title">',
  '    <div class="scene-heading"><h2 id="scene-title">Cow Gulch</h2><span>NEW MEXICO · 01</span></div>',
  '    <div class="game-frame">',
  '      <canvas data-testid="game-canvas" aria-label="Cow Gulch game map" tabindex="0"></canvas>',
  '    </div>',
  '    <div class="game-controls">',
  '      <p data-testid="selection-status" role="status" aria-live="polite"></p>',
  '      <button type="button" data-action="clear-selection">Clear selection</button>',
  '    </div>',
  '    <p class="scene-caption">The map uses a deterministic static terrain variant. Combat is not included in this slice.</p>',
  '  </section>',
  '</section>',
].join('');

registerMessages('gunsnglory', messages);

const canvasElement = app.querySelector<HTMLCanvasElement>('[data-testid="game-canvas"]');
const statusElement = app.querySelector<HTMLElement>('[data-testid="selection-status"]');
const clearButton = app.querySelector<HTMLButtonElement>('[data-action="clear-selection"]');
if (!canvasElement || !statusElement || !clearButton) throw new Error('Game controls are missing');
const canvas: HTMLCanvasElement = canvasElement;
const status: HTMLElement = statusElement;

const game = createBrowserGame();
const session = await game.open({ scenarioId: 'cow-gulch' });
let view = session.observe();
let context: CanvasRenderingContext2D;
const languageMessages = {
  en: { none: 'No unit selected', selected: 'Gunslinger selected', failed: 'Game scene failed to load' },
  zh: { none: '尚未选择单位', selected: '已选择枪手', failed: '游戏场景加载失败' },
};

function renderStatus(): void {
  const language = getLanguage();
  const unit = view.units.find((candidate) => candidate.selected);
  const messages = languageMessages[language];
  status.textContent = unit
    ? messages.selected + ' · Cell (' + (unit.cell.x + 1) + ', ' + (unit.cell.y + 1) + ')'
    : messages.none;
  canvas.setAttribute('aria-label', language === 'zh' ? '牛溪谷游戏地图' : 'Cow Gulch game map');
}

function redraw(): void {
  context = resizeCanvas(canvas);
  drawGame(context, view, images);
}

const assetNames = new Set([
  ...view.map.background.map((tile) => tile.asset),
  ...view.map.streets.map((tile) => tile.asset),
  ...view.units.map((unit) => unit.asset),
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
  redraw();
  renderStatus();
} catch (error) {
  status.textContent = languageMessages[getLanguage()].failed;
  throw error;
}

const frame = app.querySelector<HTMLElement>('.game-frame');
if (frame && typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(redraw).observe(frame);
}
window.addEventListener('resize', redraw);

function dispatch(intent: { type: 'clear-selection' } | { type: 'select-at'; x: number; y: number }): void {
  if (!session.submitIntent(intent)) return;
  view = session.advance();
  renderStatus();
  redraw();
}

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
