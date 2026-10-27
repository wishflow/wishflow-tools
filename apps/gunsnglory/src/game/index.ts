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

export type Direction = 'east' | 'south' | 'west' | 'north';

export interface WaveRedirect {
  cell: { x: number; y: number };
  directions: readonly Direction[];
}

export interface PreviewWaveDefinition {
  number: number;
  initialLives: number;
  spawn: { cell: { x: number; y: number }; direction: Direction };
  baseEnemySpeed: number;
  speedMultiplierMin: number;
  speedMultiplierCount: number;
  escapePenalty: number;
  redirects: readonly WaveRedirect[];
  exit: { x: number; y: number };
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
  previewWave?: PreviewWaveDefinition;
}

export type GameIntent =
  | { type: 'select-at'; x: number; y: number }
  | { type: 'clear-selection' }
  | { type: 'start-wave' };

export interface UnitView extends ScenarioUnit {
  selected: boolean;
}

export interface EnemyView {
  id: string;
  type: 1;
  asset: 'pioneer_male';
  speed: number;
  direction: Direction;
  positionFine: { x: number; y: number };
  animationFrame: number;
}

export interface WaveView {
  number: number;
  phase: 'not-started' | 'active' | 'complete';
  lives: number;
  escapedEnemies: number;
  activeEnemies: number;
}

export interface GameView {
  frame: number;
  elapsedMs: number;
  scenarioId: string;
  map: ScenarioContent['map'];
  units: readonly UnitView[];
  enemies: readonly EnemyView[];
  wave?: WaveView;
}

export interface GameSession {
  readonly id: string;
  readonly startRecord: Readonly<{
    sessionId: string;
    scenarioId: string;
    contentVersion: string;
    randomAlgorithm: 'java.util.Random';
    randomSeed: number;
  }>;
  submitIntent(intent: GameIntent): boolean;
  advance(input?: { deltaMs?: number }): GameView;
  observe(): GameView;
  close(): void;
}

export interface Game {
  open(options: { scenarioId: string; randomSeed?: number }): Promise<GameSession>;
}

interface PendingIntent {
  sequence: number;
  intent: GameIntent;
}

interface MutableEnemy {
  id: string;
  type: 1;
  asset: 'pioneer_male';
  speed: number;
  direction: Direction;
  positionFine: { x: number; y: number };
}

interface MutableWave {
  phase: WaveView['phase'];
  lives: number;
  escapedEnemies: number;
  enemies: MutableEnemy[];
}

const FINE_UNITS_PER_CELL = 7680;
const FIELD_CENTER_OFFSET = 15360;
const FIELD_CENTER_HALF = 3840;
const MAX_DELTA_MS = 100;

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

function validSeed(seed: number): boolean {
  return Number.isInteger(seed) && seed >= 0 && seed <= 0xffff_ffff;
}

/** Java's 48-bit LCG and bounded nextInt, used by the recovered game. */
class JavaRandom {
  private seed: bigint;

  constructor(seed: number) {
    this.seed = (BigInt(seed) ^ 0x5deece66dn) & ((1n << 48n) - 1n);
  }

  private next(bits: number): number {
    this.seed = (this.seed * 0x5deece66dn + 0xbn) & ((1n << 48n) - 1n);
    return Number(this.seed >> BigInt(48 - bits));
  }

  nextInt(bound: number): number {
    if (!Number.isInteger(bound) || bound <= 0) throw new RangeError('Random bound must be a positive integer');
    if ((bound & (bound - 1)) === 0) return Math.floor((bound * this.next(31)) / 0x8000_0000);

    let bits: number;
    let value: number;
    do {
      bits = this.next(31);
      value = bits % bound;
    } while (bits - value + (bound - 1) >= 0x8000_0000);
    return value;
  }
}

function directionVector(direction: Direction): { x: -1 | 0 | 1; y: -1 | 0 | 1 } {
  switch (direction) {
    case 'east': return { x: 1, y: 0 };
    case 'south': return { x: 0, y: 1 };
    case 'west': return { x: -1, y: 0 };
    case 'north': return { x: 0, y: -1 };
  }
}

function passesFieldCenter(oldFine: number, nextFine: number): boolean {
  const oldPhase = (oldFine + FIELD_CENTER_OFFSET) % FINE_UNITS_PER_CELL;
  const nextPhase = (nextFine + FIELD_CENTER_OFFSET) % FINE_UNITS_PER_CELL;
  return (oldPhase < FIELD_CENTER_HALF && nextPhase >= FIELD_CENTER_HALF && nextFine > oldFine)
    || (oldPhase > FIELD_CENTER_HALF && nextPhase <= FIELD_CENTER_HALF && nextFine < oldFine);
}

function fullCell(fine: number): number {
  return Math.trunc(Math.fround(fine / FINE_UNITS_PER_CELL));
}

function normalizedDelta(deltaMs: number | undefined): number {
  if (deltaMs === undefined || !Number.isFinite(deltaMs)) return 0;
  return Math.trunc(Math.max(0, Math.min(MAX_DELTA_MS, deltaMs)));
}

function moveEnemy(enemy: MutableEnemy, deltaMs: number, definition: PreviewWaveDefinition, random: JavaRandom): boolean {
  if (deltaMs === 0) return false;

  const previous = { ...enemy.positionFine };
  const vector = directionVector(enemy.direction);
  const distance = Math.fround((enemy.speed * deltaMs) / 100);
  enemy.positionFine = {
    x: Math.trunc(Math.fround(previous.x + vector.x * distance)),
    y: Math.trunc(Math.fround(previous.y + vector.y * distance)),
  };

  const passedCenter = vector.x !== 0
    ? passesFieldCenter(previous.x, enemy.positionFine.x)
    : passesFieldCenter(previous.y, enemy.positionFine.y);
  if (!passedCenter) return false;

  const cell = { x: fullCell(enemy.positionFine.x), y: fullCell(enemy.positionFine.y) };
  if (cell.x === definition.exit.x && cell.y === definition.exit.y) return true;

  const redirect = definition.redirects.find((candidate) =>
    candidate.cell.x === cell.x && candidate.cell.y === cell.y);
  if (redirect) enemy.direction = redirect.directions[random.nextInt(redirect.directions.length)]!;
  return false;
}

export function createGame(options: {
  scenarios: Readonly<Record<string, ScenarioContent>>;
  randomSeedSource?: () => number;
}): Game {
  const scenarios = new Map<string, ScenarioContent>();
  for (const [key, scenario] of Object.entries(options.scenarios)) {
    scenarios.set(key, freezeDeep(clone(scenario)));
  }

  let nextSessionNumber = 1;

  return Object.freeze({
    async open({ scenarioId, randomSeed }: { scenarioId: string; randomSeed?: number }): Promise<GameSession> {
      const scenario = scenarios.get(scenarioId);
      if (!scenario) throw new Error('Unknown scenario: ' + scenarioId);

      const resolvedSeed = randomSeed ?? options.randomSeedSource?.() ?? 1;
      if (!validSeed(resolvedSeed)) throw new RangeError('Random seed must be an unsigned 32-bit integer');
      const random = new JavaRandom(resolvedSeed);
      const sessionId = 'game-session-' + nextSessionNumber;
      nextSessionNumber += 1;
      const units = scenario.units.map((definition) => ({ definition, selected: false }));
      const pending: PendingIntent[] = [];
      let nextIntentSequence = 1;
      let frame = 0;
      let elapsedMs = 0;
      let closed = false;
      let wave: MutableWave | undefined = scenario.previewWave
        ? { phase: 'not-started', lives: scenario.previewWave.initialLives, escapedEnemies: 0, enemies: [] }
        : undefined;

      const assertOpen = () => {
        if (closed) throw new Error('Game session is closed');
      };

      const observe = (): GameView => {
        assertOpen();
        return freezeDeep({
          frame,
          elapsedMs,
          scenarioId: scenario.id,
          map: scenario.map,
          units: units.map(({ definition, selected }) => ({ ...clone(definition), selected })),
          enemies: (wave?.enemies ?? []).map((enemy) => ({
            id: enemy.id,
            type: enemy.type,
            asset: enemy.asset,
            speed: enemy.speed,
            direction: enemy.direction,
            positionFine: { ...enemy.positionFine },
            animationFrame: Math.floor(elapsedMs / 128) % 3,
          })),
          ...(wave && scenario.previewWave ? {
            wave: {
              number: scenario.previewWave.number,
              phase: wave.phase,
              lives: wave.lives,
              escapedEnemies: wave.escapedEnemies,
              activeEnemies: wave.enemies.length,
            },
          } : {}),
        });
      };

      const session: GameSession = {
        id: sessionId,
        startRecord: freezeDeep({
          sessionId,
          scenarioId: scenario.id,
          contentVersion: scenario.contentVersion ?? 'unversioned',
          randomAlgorithm: 'java.util.Random',
          randomSeed: resolvedSeed,
        }),
        submitIntent(intent: GameIntent): boolean {
          assertOpen();
          if (!intent || typeof intent !== 'object') return false;

          if (intent.type === 'clear-selection') {
            pending.push({ sequence: nextIntentSequence, intent: { type: 'clear-selection' } });
            nextIntentSequence += 1;
            return true;
          }

          if (intent.type === 'start-wave') {
            if (!wave || !scenario.previewWave || wave.phase !== 'not-started') return false;
            pending.push({ sequence: nextIntentSequence, intent: { type: 'start-wave' } });
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
        advance(input: { deltaMs?: number } = {}): GameView {
          assertOpen();
          frame += 1;
          const deltaMs = normalizedDelta(input.deltaMs);
          elapsedMs += deltaMs;
          let waveStarted = false;
          pending.sort((left, right) => left.sequence - right.sequence);
          for (const command of pending.splice(0)) {
            if (command.intent.type === 'clear-selection') {
              for (const unit of units) unit.selected = false;
              continue;
            }

            if (command.intent.type === 'start-wave') {
              if (wave?.phase !== 'not-started' || !scenario.previewWave) continue;
              const speedMultiplier = scenario.previewWave.speedMultiplierMin
                + random.nextInt(scenario.previewWave.speedMultiplierCount);
              const speed = Math.trunc((scenario.previewWave.baseEnemySpeed * speedMultiplier) / 100);
              wave.enemies.push({
                id: 'preview-pioneer-1',
                type: 1,
                asset: 'pioneer_male',
                speed,
                direction: scenario.previewWave.spawn.direction,
                positionFine: {
                  x: (scenario.previewWave.spawn.cell.x - 2) * FINE_UNITS_PER_CELL,
                  y: scenario.previewWave.spawn.cell.y * FINE_UNITS_PER_CELL,
                },
              });
              wave.phase = 'active';
              waveStarted = true;
              continue;
            }

            const selection = command.intent;
            if (selection.type !== 'select-at') continue;
            const target = [...units].reverse().find(({ definition }) =>
              contains(definition.hitArea, selection.x, selection.y));
            for (const unit of units) unit.selected = unit === target;
          }

          if (wave?.phase === 'active' && !waveStarted && scenario.previewWave) {
            for (const enemy of [...wave.enemies]) {
              if (!moveEnemy(enemy, deltaMs, scenario.previewWave, random)) continue;
              wave.enemies = wave.enemies.filter((candidate) => candidate !== enemy);
              wave.lives = Math.max(0, wave.lives - scenario.previewWave.escapePenalty);
              wave.escapedEnemies += 1;
            }
            if (wave.enemies.length === 0 && wave.escapedEnemies > 0) wave.phase = 'complete';
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
