#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blendFile = path.join(projectRoot, 'blender', 'scene.blend');
const blender = process.env.BLENDER_BIN || 'blender';
const script = path.join(projectRoot, 'scripts', 'check-scene.py');

if (!existsSync(blendFile)) {
  console.error('找不到 blender/scene.blend；先运行 pnpm run generate:scene。');
  process.exit(1);
}

const result = spawnSync(blender, ['--background', blendFile, '--python', script], {
  cwd: projectRoot,
  stdio: 'inherit',
  windowsHide: true,
});
if (result.error) {
  console.error('无法启动 Blender。请确认 blender 在 PATH 中，或设置 BLENDER_BIN。');
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status || 1);
