import type { GameIntent, GameMode, GameView, WaveSettlement } from './index';
import { canonicalSha256Digest } from '../value-digest';

export const GAME_RULES_VERSION = 'gng-rules-1';
export const GAME_REPLAY_FORMAT_VERSION = 1;
export const GAME_REPLAY_CHECKPOINT_INTERVAL = 120;
export const GAME_REPLAY_MAX_CHARACTERS = 10_000_000;
export const GAME_REPLAY_MAX_FRAMES = 250_000;

export interface NumericParameterValue {
  path: string;
  value: number;
}

export interface PreparedSetup {
  scenarioId: string;
  contentVersion: string;
  rulesVersion: string;
  parameters: readonly NumericParameterValue[];
  digest: string;
}

export interface GameStartRecord {
  sessionId: string;
  scenarioId: string;
  contentVersion: string;
  rulesVersion: string;
  randomAlgorithm: 'java.util.Random';
  randomSeed: number;
  mode: GameMode;
  /** Present in new records; absent in legacy v1 recordings which used the scenario baseline. */
  preparedSetup?: PreparedSetup;
}

export interface GameReplayFrame {
  frame: number;
  deltaMs: number;
  intents: readonly GameIntent[];
}

export interface GameReplayCheckpoint {
  frame: number;
  stateDigest: string;
}

export interface GameReplayTerminal {
  frame: number;
  settlement: WaveSettlement;
  stateDigest: string;
}

export interface GameReplayPayload {
  formatVersion: number;
  rulesVersion: string;
  startRecord: GameStartRecord;
  frames: readonly GameReplayFrame[];
  checkpoints: readonly GameReplayCheckpoint[];
  terminal: GameReplayTerminal;
}

export interface GameReplayDocument extends GameReplayPayload {
  digest: string;
}

export type GameReplayErrorCode =
  | 'missing-version'
  | 'unsupported-version'
  | 'content-unavailable'
  | 'corrupt-input'
  | 'digest-mismatch'
  | 'result-mismatch'
  | 'incomplete-recording'
  | 'recording-too-large'
  | 'unsupported-mode';

export class GameReplayError extends Error {
  constructor(readonly code: GameReplayErrorCode, message: string, readonly frame?: number) {
    super(message);
    this.name = 'GameReplayError';
  }
}

export function captureReplayState(view: GameView): ReplayState {
  return {
    frame: view.frame,
    elapsedMs: view.elapsedMs,
    units: view.units,
    enemies: view.enemies,
    shots: view.shots,
    recruitPool: view.recruitPool,
    events: view.events,
    wave: view.wave ?? null,
  };
}

export type ReplayState = Pick<GameView, 'frame' | 'elapsedMs' | 'units' | 'enemies' | 'shots' | 'recruitPool' | 'events'> & {
  wave: GameView['wave'] | null;
};

export async function replayStateDigest(state: ReplayState): Promise<string> {
  return gameValueDigest(state);
}

export async function serializeReplay(payload: GameReplayPayload): Promise<string> {
  if (payload.frames.length > GAME_REPLAY_MAX_FRAMES) {
    throw new GameReplayError('recording-too-large', 'Replay frame count exceeds the supported limit');
  }
  const digest = await gameValueDigest(payload);
  const serialized = JSON.stringify({ ...payload, digest });
  if (serialized.length > GAME_REPLAY_MAX_CHARACTERS) {
    throw new GameReplayError('recording-too-large', 'Replay exceeds the supported file size or frame count');
  }
  return serialized;
}

export async function parseReplay(serialized: string): Promise<GameReplayDocument> {
  if (typeof serialized !== 'string' || serialized.length > GAME_REPLAY_MAX_CHARACTERS) {
    throw new GameReplayError('corrupt-input', 'Replay input is too large or is not text');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new GameReplayError('corrupt-input', 'Replay JSON cannot be parsed');
  }
  if (!isRecord(parsed)) throw new GameReplayError('corrupt-input', 'Replay document must be an object');

  if (!('formatVersion' in parsed) || !('rulesVersion' in parsed) || !('startRecord' in parsed)) {
    throw new GameReplayError('missing-version', 'Replay is missing a required format, rules, or content version');
  }
  if (!isRecord(parsed.startRecord)) throw new GameReplayError('corrupt-input', 'Replay start record is invalid');
  if (!('rulesVersion' in parsed.startRecord) || !('contentVersion' in parsed.startRecord)) {
    throw new GameReplayError('missing-version', 'Replay is missing a required format, rules, or content version');
  }
  if (!Number.isSafeInteger(parsed.formatVersion)
    || typeof parsed.rulesVersion !== 'string'
    || typeof parsed.startRecord.rulesVersion !== 'string'
    || typeof parsed.startRecord.contentVersion !== 'string') {
    throw new GameReplayError('corrupt-input', 'Replay version fields have invalid types');
  }
  if (!parsed.rulesVersion.trim()
    || !parsed.startRecord.rulesVersion.trim()
    || !parsed.startRecord.contentVersion.trim()
    || parsed.startRecord.contentVersion === 'unversioned') {
    throw new GameReplayError('missing-version', 'Replay is missing a required format, rules, or content version');
  }
  if (parsed.formatVersion !== GAME_REPLAY_FORMAT_VERSION
    || parsed.rulesVersion !== GAME_RULES_VERSION
    || parsed.startRecord.rulesVersion !== GAME_RULES_VERSION) {
    throw new GameReplayError('unsupported-version', 'Replay format or rules version is not supported');
  }
  if (parsed.startRecord.randomAlgorithm !== 'java.util.Random') {
    throw new GameReplayError('unsupported-version', 'Replay random algorithm is not supported');
  }
  if (parsed.startRecord.mode === 'replay') {
    throw new GameReplayError('unsupported-mode', 'A replay cannot be used as the source battle');
  }
  if (!validStartRecord(parsed.startRecord)
    || !Array.isArray(parsed.frames)
    || !Array.isArray(parsed.checkpoints)
    || !validTerminal(parsed.terminal)) {
    throw new GameReplayError('corrupt-input', 'Replay metadata is invalid');
  }
  if (parsed.frames.length === 0 || parsed.frames.length > GAME_REPLAY_MAX_FRAMES) {
    throw new GameReplayError('corrupt-input', 'Replay frame count is outside the supported range');
  }

  const frames: GameReplayFrame[] = [];
  for (let index = 0; index < parsed.frames.length; index += 1) {
    const value: unknown = parsed.frames[index];
    if (!isRecord(value)
      || value.frame !== index + 1
      || !Number.isSafeInteger(value.deltaMs)
      || (value.deltaMs as number) < 0
      || (value.deltaMs as number) > 100
      || !Array.isArray(value.intents)
      || value.intents.length > 1_000
      || !value.intents.every(isGameIntent)) {
      throw new GameReplayError('corrupt-input', `Replay frame ${index + 1} is invalid`, index + 1);
    }
    frames.push({
      frame: value.frame as number,
      deltaMs: value.deltaMs as number,
      intents: value.intents,
    });
  }

  const checkpoints = parsed.checkpoints as unknown[];
  const expectedCheckpointFrames = checkpointFrames(frames.length);
  if (checkpoints.length !== expectedCheckpointFrames.length
    || !checkpoints.every((checkpoint, index) => isRecord(checkpoint)
      && checkpoint.frame === expectedCheckpointFrames[index]
      && typeof checkpoint.stateDigest === 'string'
      && /^sha256:[a-f0-9]{64}$/.test(checkpoint.stateDigest))) {
    throw new GameReplayError('corrupt-input', 'Replay checkpoints are incomplete or invalid');
  }
  if (parsed.terminal.frame !== frames.length
    || parsed.terminal.stateDigest !== (checkpoints.at(-1) as GameReplayCheckpoint).stateDigest) {
    throw new GameReplayError('corrupt-input', 'Replay terminal does not match its final checkpoint');
  }
  if (typeof parsed.digest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(parsed.digest)) {
    throw new GameReplayError('corrupt-input', 'Replay digest is missing or malformed');
  }

  const payload: GameReplayPayload = {
    formatVersion: parsed.formatVersion as number,
    rulesVersion: parsed.rulesVersion,
    startRecord: parsed.startRecord as unknown as GameStartRecord,
    frames,
    checkpoints: checkpoints as GameReplayCheckpoint[],
    terminal: parsed.terminal as unknown as GameReplayTerminal,
  };
  if (await gameValueDigest(payload) !== parsed.digest) {
    throw new GameReplayError('digest-mismatch', 'Replay digest does not match its contents');
  }
  return { ...payload, digest: parsed.digest };
}

export function checkpointFrames(frameCount: number): number[] {
  const frames = [0];
  for (let frame = GAME_REPLAY_CHECKPOINT_INTERVAL; frame < frameCount; frame += GAME_REPLAY_CHECKPOINT_INTERVAL) {
    frames.push(frame);
  }
  if (frameCount > 0) frames.push(frameCount);
  return frames;
}

export async function gameValueDigest(value: unknown): Promise<string> {
  return canonicalSha256Digest(value);
}

function validPreparedSetup(value: unknown): value is PreparedSetup {
  if (!isRecord(value)
    || typeof value.scenarioId !== 'string' || !value.scenarioId
    || typeof value.contentVersion !== 'string' || !value.contentVersion
    || typeof value.rulesVersion !== 'string' || !value.rulesVersion
    || typeof value.digest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(value.digest)
    || !Array.isArray(value.parameters)) return false;

  const paths = new Set<string>();
  for (const parameter of value.parameters) {
    if (!isRecord(parameter) || typeof parameter.path !== 'string' || !parameter.path
      || !Number.isSafeInteger(parameter.value) || (parameter.value as number) < 0
      || paths.has(parameter.path)) return false;
    paths.add(parameter.path);
  }
  return true;
}

function validStartRecord(value: unknown): value is GameStartRecord {
  if (!isRecord(value)) return false;
  return (value.preparedSetup === undefined || validPreparedSetup(value.preparedSetup))
    && typeof value.sessionId === 'string' && value.sessionId.length > 0
    && typeof value.scenarioId === 'string' && value.scenarioId.length > 0
    && typeof value.contentVersion === 'string' && value.contentVersion.length > 0
    && typeof value.rulesVersion === 'string' && value.rulesVersion.length > 0
    && value.randomAlgorithm === 'java.util.Random'
    && Number.isSafeInteger(value.randomSeed) && (value.randomSeed as number) >= 0 && (value.randomSeed as number) <= 0xffff_ffff
    && (value.mode === 'formal' || value.mode === 'debug' || value.mode === 'experiment');
}

function validTerminal(value: unknown): value is GameReplayTerminal {
  if (!isRecord(value) || !Number.isSafeInteger(value.frame) || (value.frame as number) < 1
    || typeof value.stateDigest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(value.stateDigest)
    || !isRecord(value.settlement)) return false;
  return (value.settlement.outcome === 'victory' || value.settlement.outcome === 'defeat')
    && Number.isSafeInteger(value.settlement.scoreBase)
    && Number.isSafeInteger(value.settlement.displayScore)
    && Number.isSafeInteger(value.settlement.highScoreCandidate);
}

function isGameIntent(value: unknown): value is GameIntent {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case 'select-at': return hasOnlyKeys(value, ['type', 'x', 'y'])
      && Number.isFinite(value.x) && Number.isFinite(value.y);
    case 'move-unit': return hasOnlyKeys(value, ['type', 'targetX', 'targetY'])
      && Number.isFinite(value.targetX) && Number.isFinite(value.targetY);
    case 'start-wave':
    case 'stop-moving':
    case 'clear-selection': return hasOnlyKeys(value, ['type']);
    case 'recruit-unit': return hasOnlyKeys(value, ['type', 'unitType', 'commandId'])
      && typeof value.unitType === 'string' && value.unitType.length > 0 && value.unitType.length <= 128
      && typeof value.commandId === 'string' && value.commandId.trim().length > 0 && value.commandId.length <= 128;
    case 'upgrade-unit': return hasOnlyKeys(value, ['type', 'unitId', 'commandId'])
      && typeof value.unitId === 'string' && value.unitId.length > 0 && value.unitId.length <= 128
      && typeof value.commandId === 'string' && value.commandId.trim().length > 0 && value.commandId.length <= 128;
    default: return false;
  }
}

function hasOnlyKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).length === expected.length && expected.every((key) => key in value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
