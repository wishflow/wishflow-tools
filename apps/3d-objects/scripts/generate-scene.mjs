#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverObjectModules } from './object-modules.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blender = process.env.BLENDER_BIN || 'blender';
const { modules, errors } = discoverObjectModules(projectRoot);
if (errors.length) {
  for (const error of errors) console.error('ERROR: ' + error);
  process.exit(1);
}

let generated = 0;
for (const module of modules) {
  const script = path.join(module.moduleRoot, 'blender', 'generate_scene.py');
  if (!existsSync(script)) continue;
  const result = spawnSync(blender, ['--background', '--python', script], {
    cwd: module.moduleRoot,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) {
    console.error(module.slug + ': 无法启动 Blender。请确认 blender 在 PATH 中，或设置 BLENDER_BIN。');
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
  generated += 1;
}

console.log(generated ? '已生成 ' + generated + ' 个对象场景。' : '没有声明 Blender 生成流程的对象模块。');
