export type GameUiRoute =
  | { screen: 'home' }
  | {
    screen: 'campaign';
    mode: 'campaign' | 'free-play';
    page: 'regions' | 'levels' | 'overview' | 'difficulty';
    regionId: string;
    level: number;
  }
  | { screen: 'battle'; scenarioId: string; mode: 'campaign' | 'free-play' };

export type GameUiPanel =
  | { kind: 'pause' }
  | { kind: 'confirmation'; action: 'restart' | 'close' | 'profile-import' }
  | { kind: 'options' }
  | { kind: 'help'; page: number }
  | { kind: 'recruit' }
  | { kind: 'map-hire' }
  | { kind: 'upgrade' }
  | { kind: 'gambler' }
  | { kind: 'wave-intro' }
  | { kind: 'settlement' };

export interface GameUiState {
  readonly route: GameUiRoute;
  readonly panels: readonly GameUiPanel[];
}

export type GameUiEvent =
  | { type: 'navigate'; route: GameUiRoute }
  | { type: 'present-panel'; panel: GameUiPanel }
  | { type: 'set-help-page'; page: number; pageCount: number }
  | { type: 'dismiss-panel' }
  | { type: 'dismiss-all-panels' };

export function createInitialGameUiState(): GameUiState {
  return { route: { screen: 'home' }, panels: [] };
}

function panelCanOpenOnRoute(panel: GameUiPanel, route: GameUiRoute): boolean {
  if (panel.kind === 'pause' || panel.kind === 'settlement') return route.screen === 'battle';
  return true;
}

function shouldNestPanel(parent: GameUiPanel | undefined, next: GameUiPanel): boolean {
  if (!parent) return false;
  if (next.kind === 'options') return parent.kind === 'pause';
  if (next.kind === 'help') return parent.kind === 'pause' || parent.kind === 'options';
  if (next.kind === 'confirmation') return parent.kind === 'pause' || parent.kind === 'options';
  return false;
}

/** Owns page and panel navigation only. Simulation and browser fullscreen are separate owners. */
export class GameUiController {
  private currentState: GameUiState;

  constructor(initial: Partial<GameUiState> = {}) {
    this.currentState = {
      route: initial.route ?? { screen: 'home' },
      panels: [...(initial.panels ?? [])],
    };
  }

  get state(): GameUiState {
    return this.currentState;
  }

  get activePanel(): GameUiPanel | undefined {
    return this.currentState.panels.at(-1);
  }

  /** Panels that should be painted beneath the active panel for the original in-game flow. */
  get visiblePanels(): readonly GameUiPanel[] {
    const panels = this.currentState.panels;
    const active = panels.at(-1);
    if (!active) return [];

    // Help is a full page. Keep its caller in the navigation state, but replace it visually.
    if (active.kind === 'help') return [active];

    // APK options and confirmation dialogs sit over the pause board. Options invoked from
    // the menu have no pause board, and unrelated business panels are shown alone.
    if (active.kind === 'options' && panels.some(({ kind }) => kind === 'pause')) {
      const pause = panels.find(({ kind }) => kind === 'pause');
      return pause ? [pause, active] : [active];
    }
    if (active.kind === 'confirmation' && panels.length > 1) return panels;

    return [active];
  }

  dispatch(event: GameUiEvent): GameUiState {
    switch (event.type) {
      case 'navigate':
        this.currentState = { route: event.route, panels: [] };
        break;
      case 'present-panel': {
        if (!panelCanOpenOnRoute(event.panel, this.currentState.route)) break;
        if (this.activePanel?.kind === event.panel.kind) break;
        const parent = this.activePanel;
        const panels = shouldNestPanel(parent, event.panel)
          ? [...this.currentState.panels, event.panel]
          : [event.panel];
        this.currentState = { ...this.currentState, panels };
        break;
      }
      case 'set-help-page': {
        const panel = this.activePanel;
        if (panel?.kind !== 'help' || !Number.isInteger(event.page)
          || !Number.isInteger(event.pageCount) || event.pageCount < 1
          || event.page < 0 || event.page >= event.pageCount) break;
        this.currentState = {
          ...this.currentState,
          panels: [...this.currentState.panels.slice(0, -1), { kind: 'help', page: event.page }],
        };
        break;
      }
      case 'dismiss-panel':
        if (this.currentState.panels.length > 0) {
          this.currentState = { ...this.currentState, panels: this.currentState.panels.slice(0, -1) };
        }
        break;
      case 'dismiss-all-panels':
        if (this.currentState.panels.length > 0) {
          this.currentState = { ...this.currentState, panels: [] };
        }
        break;
    }
    return this.currentState;
  }
}
