import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  GameUiController,
  createInitialGameUiState,
  type GameUiPanel,
  type GameUiRoute,
} from '../src/ui/controller';

function makeBattleRoute(): GameUiRoute {
  return { screen: 'battle', scenarioId: 'cow-gulch', mode: 'campaign' };
}

test('navigation replaces the screen and clears panels', () => {
  const ui = new GameUiController();
  ui.dispatch({ type: 'present-panel', panel: { kind: 'options' } });

  ui.dispatch({
    type: 'navigate',
    route: { screen: 'campaign', mode: 'free-play', page: 'regions', regionId: 'new-mexico', level: 1 },
  });

  assert.deepEqual(ui.state.route, {
    screen: 'campaign',
    mode: 'free-play',
    page: 'regions',
    regionId: 'new-mexico',
    level: 1,
  });
  assert.deepEqual(ui.state.panels, []);
});

test('pause Options and Help preserve the native return path', () => {
  const ui = new GameUiController({ route: makeBattleRoute() });
  ui.dispatch({ type: 'present-panel', panel: { kind: 'pause' } });
  ui.dispatch({ type: 'present-panel', panel: { kind: 'options' } });
  ui.dispatch({ type: 'present-panel', panel: { kind: 'help', page: 0 } });

  assert.deepEqual(ui.state.panels.map(({ kind }) => kind), ['pause', 'options', 'help']);
  assert.deepEqual(ui.visiblePanels.map(({ kind }) => kind), ['help']);

  ui.dispatch({ type: 'dismiss-panel' });
  assert.equal(ui.activePanel?.kind, 'options');
  assert.deepEqual(ui.visiblePanels.map(({ kind }) => kind), ['pause', 'options']);
  ui.dispatch({ type: 'dismiss-panel' });
  assert.equal(ui.activePanel?.kind, 'pause');
  assert.deepEqual(ui.visiblePanels.map(({ kind }) => kind), ['pause']);
});

test('main-menu Help replaces Options visually and restores it on return', () => {
  const ui = new GameUiController();
  ui.dispatch({ type: 'present-panel', panel: { kind: 'options' } });
  ui.dispatch({ type: 'present-panel', panel: { kind: 'help', page: 0 } });

  assert.deepEqual(ui.state.panels.map(({ kind }) => kind), ['options', 'help']);
  assert.deepEqual(ui.visiblePanels.map(({ kind }) => kind), ['help']);

  ui.dispatch({ type: 'dismiss-panel' });
  assert.deepEqual(ui.visiblePanels.map(({ kind }) => kind), ['options']);
});

test('Help page transitions stay within their bounds and keep their parent panel', () => {
  const ui = new GameUiController();
  ui.dispatch({ type: 'present-panel', panel: { kind: 'options' } });
  ui.dispatch({ type: 'present-panel', panel: { kind: 'help', page: 0 } });
  ui.dispatch({ type: 'set-help-page', page: 1, pageCount: 3 });
  assert.deepEqual(ui.activePanel, { kind: 'help', page: 1 });

  const current = ui.activePanel;
  ui.dispatch({ type: 'set-help-page', page: 3, pageCount: 3 });
  assert.equal(ui.activePanel, current);
  ui.dispatch({ type: 'dismiss-panel' });
  assert.equal(ui.activePanel?.kind, 'options');
});

test('canceling pause confirmations returns to the still-active pause board', () => {
  const ui = new GameUiController({ route: makeBattleRoute() });
  ui.dispatch({ type: 'present-panel', panel: { kind: 'pause' } });
  ui.dispatch({ type: 'present-panel', panel: { kind: 'confirmation', action: 'close' } });

  assert.equal(ui.activePanel?.kind, 'confirmation');
  assert.deepEqual(ui.visiblePanels.map(({ kind }) => kind), ['pause', 'confirmation']);
  ui.dispatch({ type: 'dismiss-panel' });

  assert.deepEqual(ui.state.panels.map(({ kind }) => kind), ['pause']);
});

test('archive confirmation returns to Options without losing the pause-board return path', () => {
  const ui = new GameUiController({ route: makeBattleRoute() });
  ui.dispatch({ type: 'present-panel', panel: { kind: 'pause' } });
  ui.dispatch({ type: 'present-panel', panel: { kind: 'options' } });
  ui.dispatch({ type: 'present-panel', panel: { kind: 'confirmation', action: 'profile-import' } });

  assert.deepEqual(ui.state.panels.map(({ kind }) => kind), ['pause', 'options', 'confirmation']);
  ui.dispatch({ type: 'dismiss-panel' });
  assert.equal(ui.activePanel?.kind, 'options');
  ui.dispatch({ type: 'dismiss-panel' });
  assert.equal(ui.activePanel?.kind, 'pause');
});

test('unrelated business panels replace the active panel instead of creating accidental nesting', () => {
  const ui = new GameUiController({ route: makeBattleRoute() });
  ui.dispatch({ type: 'present-panel', panel: { kind: 'wave-intro' } });
  ui.dispatch({ type: 'present-panel', panel: { kind: 'settlement' } });

  assert.deepEqual(ui.state.panels, [{ kind: 'settlement' }]);
});

test('pause and settlement panels cannot be opened over a non-battle screen', () => {
  const ui = new GameUiController();
  const before = ui.state;

  ui.dispatch({ type: 'present-panel', panel: { kind: 'pause' } });
  assert.equal(ui.state, before);

  ui.dispatch({ type: 'present-panel', panel: { kind: 'settlement' } });
  assert.equal(ui.state, before);
});

test('initial UI state is the original home screen without simulation or fullscreen duplicates', () => {
  const initial = createInitialGameUiState();
  assert.deepEqual(initial, { route: { screen: 'home' }, panels: [] });
  assert.equal('simulation' in initial, false);
  assert.equal('fullscreen' in initial, false);
});

test('panel kinds remain a closed internal union', () => {
  const expected: GameUiPanel['kind'][] = [
    'pause',
    'confirmation',
    'options',
    'help',
    'recruit',
    'map-hire',
    'upgrade',
    'gambler',
    'wave-intro',
    'settlement',
  ];
  assert.equal(new Set(expected).size, expected.length);
});
