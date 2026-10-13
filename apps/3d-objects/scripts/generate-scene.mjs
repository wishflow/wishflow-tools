#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blender = process.env.BLENDER_BIN || 'blender';
const script = path.join(projectRoot, 'blender', 'generate_scene.py');
const result = spawnSync(blender, ['--background', '--python', script], {
  cwd: projectRoot,
  stdio: 'inherit',
  windowsHide: true,
});

if (result.error) {
  console.error('无法启动 Blender。请确认 blender 在 PATH 中，或设置 BLENDER_BIN。');
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status || 1);
