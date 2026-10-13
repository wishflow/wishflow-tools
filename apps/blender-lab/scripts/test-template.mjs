#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templateRoot = path.join(projectRoot, 'templates', 'web-3d');

function runPnpm(cwd, args) {
  const result = spawnSync('pnpm', args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) {
    throw new Error('无法启动 pnpm：' + result.error.message);
  }
  if (result.status !== 0) throw new Error('模板命令失败：pnpm ' + args.join(' '));
}

if (!existsSync(path.join(templateRoot, 'pnpm-lock.yaml'))) {
  console.error('3D 网页模板缺少 pnpm-lock.yaml。');
  process.exit(1);
}

const copiedRoot = path.join(tmpdir(), 'blender-lab-template-' + process.pid);
try {
  cpSync(templateRoot, copiedRoot, {
    recursive: true,
    filter(source) {
      const relative = path.relative(templateRoot, source);
      const firstPart = relative.split(path.sep)[0];
      return !['node_modules', 'dist', 'test-results', 'playwright-report'].includes(firstPart);
    },
  });

  const packagePath = path.join(copiedRoot, 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  packageJson.name = '@wishflow/blender-lab-fixture';
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

  runPnpm(copiedRoot, ['install', '--frozen-lockfile']);
  runPnpm(copiedRoot, ['run', 'test:ci']);

  const blender = spawnSync(process.env.BLENDER_BIN || 'blender', ['--version'], {
    encoding: 'utf8',
    stdio: 'ignore',
    windowsHide: true,
  });
  if (!blender.error && blender.status === 0) {
    runPnpm(copiedRoot, ['run', 'check:scene']);
  } else {
    console.log('未检测到 Blender；跳过本机专属的场景检查。');
  }
} finally {
  rmSync(copiedRoot, { recursive: true, force: true });
}
