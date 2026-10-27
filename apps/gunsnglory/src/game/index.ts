export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderTile {
  asset: string;
  source: Rectangle;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScenarioUnit {
  id: string;
  type: string;
  cell: { x: number; y: number };
  asset: string;
  frame: Rectangle;
  render: Rectangle;
  hitArea: Rectangle;
}

export interface ScenarioContent {
  id: string;
  contentVersion?: string;
  title: { en: string; zh: string };
  map: {
    width: number;
    height: number;
    tileSize: number;
    background: readonly RenderTile[];
    streets: readonly RenderTile[];
  };
  units: readonly ScenarioUnit[];
}

export type GameIntent =
  | { type: 'select-at'; x: number; y: number }
  | { type: 'clear-selection' };

export interface UnitView extends ScenarioUnit {
  selected: boolean;
}

export interface GameView {
  frame: number;
  scenarioId: string;
  map: ScenarioContent['map'];
  units: readonly UnitView[];
}

export interface GameSession {
  readonly id: string;
  readonly startRecord: Readonly<{
    sessionId: string;
    scenarioId: string;
    contentVersion: string;
  }>;
  submitIntent(intent: GameIntent): boolean;
  advance(): GameView;
  observe(): GameView;
  close(): void;
}

export interface Game {
  open(options: { scenarioId: string }): Promise<GameSession>;
}

interface PendingIntent {
  sequence: number;
  intent: GameIntent;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function freezeDeep<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(object)) freezeDeep(child, seen);
  return Object.freeze(object) as T;
}

function contains(rectangle: Rectangle, x: number, y: number): boolean {
  return x >= rectangle.x
    && y >= rectangle.y
    && x < rectangle.x + rectangle.width
    && y < rectangle.y + rectangle.height;
}

export function createGame(options: { scenarios: Readonly<Record<string, ScenarioContent>> }): Game {
  const scenarios = new Map<string, ScenarioContent>();
  for (const [key, scenario] of Object.entries(options.scenarios)) {
    scenarios.set(key, freezeDeep(clone(scenario)));
  }

  let nextSessionNumber = 1;

  return Object.freeze({
    async open({ scenarioId }: { scenarioId: string }): Promise<GameSession> {
      const scenario = scenarios.get(scenarioId);
      if (!scenario) throw new Error('Unknown scenario: ' + scenarioId);

      const sessionId = 'game-session-' + nextSessionNumber;
      nextSessionNumber += 1;
      const units = scenario.units.map((definition) => ({
        definition,
        selected: false,
      }));
      const pending: PendingIntent[] = [];
      let nextIntentSequence = 1;
      let frame = 0;
      let closed = false;

      const assertOpen = () => {
        if (closed) throw new Error('Game session is closed');
      };

      const observe = (): GameView => {
        assertOpen();
        return freezeDeep({
          frame,
          scenarioId: scenario.id,
          map: clone(scenario.map),
          units: units.map(({ definition, selected }) => ({
            ...clone(definition),
            selected,
          })),
        });
      };

      const session: GameSession = {
        id: sessionId,
        startRecord: freezeDeep({
          sessionId,
          scenarioId: scenario.id,
          contentVersion: scenario.contentVersion ?? 'unversioned',
        }),
        submitIntent(intent: GameIntent): boolean {
          assertOpen();
          if (!intent || typeof intent !== 'object') return false;

          if (intent.type === 'clear-selection') {
            pending.push({ sequence: nextIntentSequence, intent: { type: 'clear-selection' } });
            nextIntentSequence += 1;
            return true;
          }

          if (intent.type !== 'select-at' || !Number.isFinite(intent.x) || !Number.isFinite(intent.y)) {
            return false;
          }

          pending.push({
            sequence: nextIntentSequence,
            intent: { type: 'select-at', x: intent.x, y: intent.y },
          });
          nextIntentSequence += 1;
          return true;
        },
        advance(): GameView {
          assertOpen();
          frame += 1;
          pending.sort((left, right) => left.sequence - right.sequence);
          for (const command of pending.splice(0)) {
            if (command.intent.type === 'clear-selection') {
              for (const unit of units) unit.selected = false;
              continue;
            }

            const selection = command.intent;
            if (selection.type !== 'select-at') continue;
            const target = [...units].reverse().find(({ definition }) =>
              contains(definition.hitArea, selection.x, selection.y));
            for (const unit of units) unit.selected = unit === target;
          }
          return observe();
        },
        observe,
        close(): void {
          if (closed) return;
          closed = true;
          pending.length = 0;
        },
      };

      return Object.freeze(session);
    },
  });
}
