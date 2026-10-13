import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { inspectGlbBuffer, validateSceneContract, validateWebProject } from '../scripts/check-web.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('starter GLB is a valid glTF 2 binary document', () => {
  const model = readFileSync(path.join(projectRoot, 'public', 'models', 'scene.glb'));
  assert.equal(inspectGlbBuffer(model).document.asset.version, '2.0');
});

test('scene contract prevents unsafe paths and missing budgets', () => {
  const errors = validateSceneContract({
    version: 1,
    modelPath: '../outside.glb',
    requiredObjects: [],
  }, projectRoot);
  assert.match(errors.join('\n'), /项目内安全的相对路径/);
  assert.match(errors.join('\n'), /maxTriangles 必须为正整数/);
  assert.match(errors.join('\n'), /maxJavaScriptGzipBytes 必须为正整数/);
});

test('starter satisfies static subpath deployment and local model checks', () => {
  assert.deepEqual(validateWebProject(projectRoot), []);
});
