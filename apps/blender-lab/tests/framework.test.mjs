import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templateRoot = path.join(projectRoot, 'templates', 'web-3d');

test('3D starter has the independent-app scripts and local dependency lock', () => {
  const packageJson = JSON.parse(readFileSync(path.join(templateRoot, 'package.json'), 'utf8'));
  const lockfile = readFileSync(path.join(templateRoot, 'pnpm-lock.yaml'), 'utf8');
  for (const script of ['build', 'test:ci', 'generate:scene', 'check:assets', 'check:scene', 'check:bundle', 'check:release']) {
    assert.ok(packageJson.scripts[script], 'missing script: ' + script);
  }
  assert.match(lockfile, /importers:/);
  assert.ok(readFileSync(path.join(templateRoot, 'scripts', 'install.sh'), 'utf8').includes('pnpm install --frozen-lockfile'));
});

test('approved specification gate and bounded repair policy are documented', () => {
  const instructions = readFileSync(path.join(projectRoot, 'AGENTS.md'), 'utf8');
  const workflow = readFileSync(path.join(projectRoot, 'docs', 'workflow.md'), 'utf8');
  assert.match(instructions, /等待用户确认/);
  assert.match(instructions, /最多自动修复三轮/);
  assert.match(workflow, /用户确认规格/);
  assert.match(workflow, /不得放宽预算/);
});

test('the framework remains unlisted while its code changes can be classified for CI', () => {
  const catalog = JSON.parse(readFileSync(path.resolve(projectRoot, '..', 'catalog.json'), 'utf8'));
  assert.equal(catalog.some(({ slug }) => slug === 'blender-lab'), false);
  assert.equal(readFileSync(path.join(projectRoot, 'CLAUDE.md'), 'utf8').trim(), '@AGENTS.md');
});
