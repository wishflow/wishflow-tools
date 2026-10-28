import { randomUUID } from 'node:crypto';
import { readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cowGulchContent } from '../content/cow-gulch';
import { createExperiments } from '../experiments';
import { createGame, GAME_RULES_VERSION } from '../game';
import { parseSerialBatchInput, SerialBatchInputError } from './batch-input';

const MAX_INPUT_BYTES = 1_048_576;
const USAGE = `Usage: pnpm run simulate:batch -- --input <file.json> [--output <file.json>|-]

Runs a bounded, serial Cow Gulch single-wave batch using the versioned start-wave policy.
Output is JSON; non-completed run inputs are included under report.failureInputs,
and cancelled before-start inputs are included under report.notStarted.
`;

interface CliArguments {
  inputPath: string;
  outputPath?: string;
}

interface BatchCliErrorOutput {
  schemaVersion: 1;
  status: 'invalid-input' | 'failed';
  inputPath?: string;
  input?: unknown;
  error: { code: string; message: string };
}

function messageOf(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 512);
}

function parseArguments(argv: readonly string[]): CliArguments | 'help' {
  let inputPath: string | undefined;
  let outputPath: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--' && index === 0) continue;
    if (argument === '--help' || argument === '-h') return 'help';
    if (argument !== '--input' && argument !== '--output') {
      throw new TypeError(`Unsupported argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new TypeError(`${argument} requires a path`);
    index += 1;
    if (argument === '--input') {
      if (inputPath) throw new TypeError('--input may be specified only once');
      inputPath = value;
    } else {
      if (outputPath !== undefined) throw new TypeError('--output may be specified only once');
      outputPath = value;
    }
  }
  if (!inputPath) throw new TypeError('--input is required');
  if (outputPath && outputPath !== '-' && resolve(outputPath) === resolve(inputPath)) {
    throw new TypeError('Input and output must be different files');
  }
  return { inputPath, ...(outputPath === undefined ? {} : { outputPath }) };
}

async function writePayload(outputPath: string | undefined, payload: unknown): Promise<void> {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  if (!outputPath || outputPath === '-') {
    await new Promise<void>((resolveWrite, rejectWrite) => {
      process.stdout.write(json, (error) => error ? rejectWrite(error) : resolveWrite());
    });
    return;
  }

  const targetPath = resolve(outputPath);
  const temporaryPath = `${dirname(targetPath)}/.${basename(targetPath)}.tmp-${randomUUID()}`;
  try {
    await writeFile(temporaryPath, json, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function writeError(
  outputPath: string | undefined,
  result: BatchCliErrorOutput,
  exitCode: number,
): Promise<number> {
  try {
    await writePayload(outputPath, result);
    return exitCode;
  } catch (error) {
    process.stderr.write(`gunsnglory batch: could not write JSON output: ${messageOf(error)}\n`);
    return 1;
  }
}

function makeExperiments() {
  let nextSessionId = 0;
  const game = createGame({
    scenarios: { [cowGulchContent.id]: cowGulchContent },
    sessionIdSource: () => `cli-batch-session-${++nextSessionId}`,
  });
  return createExperiments({
    game,
    policies: [{
      id: 'start-wave',
      version: '1',
      create: () => ({
        decide: (observation) => observation.wave?.phase === 'not-started'
          ? [{ type: 'start-wave' as const }]
          : [],
      }),
    }],
  });
}

export async function runBatchCli(argv = process.argv.slice(2)): Promise<number> {
  let args: CliArguments | 'help';
  try {
    args = parseArguments(argv);
  } catch (error) {
    process.stderr.write(`${messageOf(error)}\n\n${USAGE}`);
    return 2;
  }
  if (args === 'help') {
    process.stdout.write(USAGE);
    return 0;
  }

  let inputText: string;
  try {
    const inputStat = await stat(args.inputPath);
    if (inputStat.size > MAX_INPUT_BYTES) {
      return writeError(args.outputPath, {
        schemaVersion: 1,
        status: 'invalid-input',
        inputPath: args.inputPath,
        input: { byteLength: inputStat.size },
        error: { code: 'input-too-large', message: `Input file exceeds ${MAX_INPUT_BYTES} bytes` },
      }, 2);
    }
    inputText = await readFile(args.inputPath, 'utf8');
  } catch (error) {
    return writeError(args.outputPath, {
      schemaVersion: 1,
      status: 'invalid-input',
      inputPath: args.inputPath,
      error: { code: 'input-read-failed', message: messageOf(error) },
    }, 2);
  }

  let input: unknown;
  try {
    input = JSON.parse(inputText) as unknown;
  } catch (error) {
    return writeError(args.outputPath, {
      schemaVersion: 1,
      status: 'invalid-input',
      inputPath: args.inputPath,
      input: { raw: inputText },
      error: { code: 'invalid-json', message: messageOf(error) },
    }, 2);
  }

  let request;
  try {
    request = parseSerialBatchInput(input);
  } catch (error) {
    return writeError(args.outputPath, {
      schemaVersion: 1,
      status: 'invalid-input',
      inputPath: args.inputPath,
      input,
      error: {
        code: error instanceof SerialBatchInputError ? error.code : 'invalid-input',
        message: messageOf(error),
      },
    }, 2);
  }

  const abortController = new AbortController();
  let receivedSignal: NodeJS.Signals | undefined;
  const handleSignal = (signal: NodeJS.Signals) => {
    receivedSignal ??= signal;
    abortController.abort(signal);
  };
  const onInterrupt = () => handleSignal('SIGINT');
  const onTerminate = () => handleSignal('SIGTERM');
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);

  try {
    const report = await makeExperiments().runBatch(request, { signal: abortController.signal });
    await writePayload(args.outputPath, { schemaVersion: 1, report });
    if (report.status === 'cancelled') return receivedSignal === 'SIGTERM' ? 143 : 130;
    if (report.failureInputs.length > 0 || report.notStarted.length > 0) return 1;
    return 0;
  } catch (error) {
    return writeError(args.outputPath, {
      schemaVersion: 1,
      status: 'failed',
      inputPath: args.inputPath,
      input,
      error: { code: 'execution-error', message: messageOf(error) },
    }, 1);
  } finally {
    process.off('SIGINT', onInterrupt);
    process.off('SIGTERM', onTerminate);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void runBatchCli().then((exitCode) => {
    process.exitCode = exitCode;
  }, (error: unknown) => {
    process.stderr.write(`gunsnglory batch: ${messageOf(error)}\n`);
    process.exitCode = 1;
  });
}
