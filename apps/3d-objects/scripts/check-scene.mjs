#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverObjectModules } from './object-modules.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blender = process.env.BLENDER_BIN || 'blender';
const script = path.join(projectRoot, 'scripts', 'check-scene.py');
const { modules, errors } = discoverObjectModules(projectRoot);
if (errors.length) {
  for (const error of errors) console.error('ERROR: ' + error);
  process.exit(1);
}

let checked = 0;
for (const module of modules) {
  const generator = path.join(module.moduleRoot, 'blender', 'generate_scene.py');
  if (!existsSync(generator)) continue;

  const blendFile = path.join(module.moduleRoot, 'blender', 'scene.blend');
  if (!existsSync(blendFile)) {
    console.error(module.slug + ': 找不到 blender/scene.blend；先运行 pnpm run generate:scene。');
    process.exit(1);
  }
  if (!existsSync(path.join(module.moduleRoot, 'scene-contract.json'))) {
    console.error(module.slug + ': 声明了 Blender 生成流程，但缺少 scene-contract.json。');
    process.exit(1);
  }

  const result = spawnSync(blender, [
    '--background', blendFile,
    '--python', script,
    '--', module.moduleRoot,
  ], {
    cwd: module.moduleRoot,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) {
    console.error('无法启动 Blender。请确认 blender 在 PATH 中，或设置 BLENDER_BIN。');
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
  checked += 1;
}

console.log(checked ? 'Blender 场景检查通过：' + checked + ' 个对象模块。' : '没有声明 Blender 检查流程的对象模块。');
