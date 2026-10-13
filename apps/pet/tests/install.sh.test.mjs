import assert from 'node:assert/strict';
import { accessSync, chmodSync, constants, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installer = path.join(appRoot, 'install.sh');
const fixtureDir = path.join(appRoot, 'pets', 'uu-usagi');
const shellUnavailable = process.platform === 'win32';

function findExecutable(name) {
  for (const directory of process.env.PATH.split(path.delimiter)) {
    const candidate = path.join(directory, name);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {}
  }
  throw new Error(`Could not find required test utility: ${name}`);
}

function createEnvironment({ hideHashUtilities = false } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'usagi-installer-test-'));
  const binDir = path.join(root, 'bin');
  const home = path.join(root, 'user home with spaces');
  const downloadTemp = path.join(root, 'download temp');
  mkdirSync(binDir);
  mkdirSync(home);
  mkdirSync(downloadTemp);
  const curlStub = path.join(binDir, 'curl');
  const curlSource = [
    '#!/bin/sh',
    'set -eu',
    "output=''",
    "url=''",
    'expect_output=0',
    'for argument in "$@"; do',
    '  if [ "$expect_output" -eq 1 ]; then output=$argument; expect_output=0; continue; fi',
    '  case "$argument" in',
    '    -o|--output) expect_output=1 ;;',
    '    https://*) url=$argument ;;',
    '  esac',
    'done',
    'case "${CURL_MODE:-success}" in',
    '  download-failure) exit 22 ;;',
    '  hash-mismatch)',
    '    case "$url" in *spritesheet.webp) printf "%s" "corrupt fixture" > "$output"; exit 0 ;; esac',
    '    ;;',
    'esac',
    'cp "$FIXTURE_DIR/${url##*/}" "$output"',
  ].join('\n');
  writeFileSync(curlStub, curlSource);
  chmodSync(curlStub, 0o755);
  if (hideHashUtilities) {
    for (const utility of ['mktemp', 'cmp', 'mkdir', 'mv', 'rm', 'find', 'wc', 'tr', 'grep', 'awk', 'cp']) {
      symlinkSync(findExecutable(utility), path.join(binDir, utility));
    }
  }
  return { root, binDir, home, downloadTemp };
}

function runInstaller(environment, { codexHome, mode = 'success', hideHashUtilities = false } = {}) {
  const childEnv = {
    ...process.env,
    HOME: environment.home,
    TMPDIR: environment.downloadTemp,
    FIXTURE_DIR: fixtureDir,
    CURL_MODE: mode,
    LANG: 'C',
    LC_ALL: 'C',
    PATH: hideHashUtilities ? environment.binDir : `${environment.binDir}:${process.env.PATH}`,
  };
  if (codexHome === undefined) delete childEnv.CODEX_HOME;
  else childEnv.CODEX_HOME = codexHome;
  return spawnSync('/bin/sh', [installer], { encoding: 'utf8', env: childEnv });
}

function targetFor(root) {
  return path.join(root, 'pets', 'uu-usagi');
}

test('installs into a custom CODEX_HOME with spaces', { skip: shellUnavailable }, (t) => {
  const environment = createEnvironment();
  t.after(() => rmSync(environment.root, { recursive: true, force: true }));
  const codexHome = path.join(environment.root, 'custom Codex home');
  const result = runInstaller(environment, { codexHome });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(targetFor(codexHome)).sort(), ['pet.json', 'spritesheet.webp']);
  assert.match(result.stdout, /Usagi/);
  assert.deepEqual(readdirSync(environment.downloadTemp), []);
});

test('uses the default CODEX home and leaves identical files untouched on repeat install', { skip: shellUnavailable }, (t) => {
  const environment = createEnvironment();
  t.after(() => rmSync(environment.root, { recursive: true, force: true }));
  const first = runInstaller(environment);
  assert.equal(first.status, 0, first.stderr);

  const petJson = path.join(targetFor(path.join(environment.home, '.codex')), 'pet.json');
  const oldTime = new Date('2001-01-01T00:00:00.000Z');
  utimesSync(petJson, oldTime, oldTime);
  const before = statSync(petJson).mtimeMs;

  const second = runInstaller(environment);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /已安装/);
  assert.equal(statSync(petJson).mtimeMs, before);
});

test('rejects a conflicting target and preserves its existing files', { skip: shellUnavailable }, (t) => {
  const environment = createEnvironment();
  t.after(() => rmSync(environment.root, { recursive: true, force: true }));
  const codexHome = path.join(environment.root, 'conflict home');
  const target = targetFor(codexHome);
  mkdirSync(target, { recursive: true });
  writeFileSync(path.join(target, 'marker.txt'), 'user data');
  const result = runInstaller(environment, { codexHome });

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /冲突|已存在|包含不同/);
  assert.deepEqual(readdirSync(target), ['marker.txt']);
  assert.equal(readFileSync(path.join(target, 'marker.txt'), 'utf8'), 'user data');
});

for (const mode of ['download-failure', 'hash-mismatch']) {
  test(`cleans temporary files and leaves no pet directory after ${mode}`, { skip: shellUnavailable }, (t) => {
    const environment = createEnvironment();
    t.after(() => rmSync(environment.root, { recursive: true, force: true }));
    const codexHome = path.join(environment.root, 'failed home');
    const result = runInstaller(environment, { codexHome, mode });

    assert.notEqual(result.status, 0);
    assert.equal(statSync(path.join(codexHome, 'pets', 'uu-usagi'), { throwIfNoEntry: false }), undefined);
    assert.deepEqual(readdirSync(environment.downloadTemp), []);
  });
}

test('fails before creating temporary or install directories when SHA-256 tools are unavailable', { skip: shellUnavailable }, (t) => {
  const environment = createEnvironment({ hideHashUtilities: true });
  t.after(() => rmSync(environment.root, { recursive: true, force: true }));
  const codexHome = path.join(environment.root, 'missing-hash home');
  const result = runInstaller(environment, { codexHome, hideHashUtilities: true });

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /sha256sum 或 shasum/);
  assert.equal(statSync(path.join(codexHome, 'pets'), { throwIfNoEntry: false }), undefined);
  assert.deepEqual(readdirSync(environment.downloadTemp), []);
});
