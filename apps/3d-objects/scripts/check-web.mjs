#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { discoverObjectModules, safeModulePath } from './object-modules.mjs';

export function inspectGlbBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 20) throw new Error('GLB 文件长度不足。');
  if (buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error('GLB magic 必须为 glTF。');
  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);
  if (version !== 2) throw new Error('GLB 版本必须为 2。');
  if (declaredLength !== buffer.length) throw new Error('GLB 声明长度与文件大小不一致。');

  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a || jsonLength < 2 || 20 + jsonLength > buffer.length) {
    throw new Error('GLB 缺少有效的 JSON chunk。');
  }
  let document;
  try {
    const nullPadding = String.fromCharCode(0);
    const jsonText = buffer.toString('utf8', 20, 20 + jsonLength).replaceAll(nullPadding, '').trim();
    document = JSON.parse(jsonText);
  } catch {
    throw new Error('GLB JSON chunk 无法解析。');
  }
  if (!document.asset || !String(document.asset.version || '').startsWith('2.')) {
    throw new Error('glTF asset.version 必须为 2.x。');
  }
  return { version, byteLength: buffer.length, document };
}

export function validateSceneContract(contract, moduleRoot) {
  const errors = [];
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    return ['scene-contract.json 必须是 JSON 对象。'];
  }
  if (contract.version !== 1) errors.push('scene-contract version 必须为 1。');
  if (!safeModulePath(moduleRoot, contract.modelPath)) errors.push('modelPath 必须是模块内安全的相对路径。');
  for (const key of ['maxTriangles', 'maxGlbBytes', 'maxTextureEdge', 'minimumMeshCount']) {
    if (!Number.isInteger(contract[key]) || contract[key] < 1) errors.push(key + ' 必须为正整数。');
  }
  if (!Array.isArray(contract.requiredObjects) || contract.requiredObjects.some((item) => typeof item !== 'string' || !item.trim())) {
    errors.push('requiredObjects 必须是对象名组成的数组。');
  }
  return errors;
}

export function validateAppContract(contract) {
  const errors = [];
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    return ['app-contract.json 必须是 JSON 对象。'];
  }
  if (contract.version !== 1) errors.push('app-contract version 必须为 1。');
  if (!Number.isInteger(contract.maxJavaScriptGzipBytes) || contract.maxJavaScriptGzipBytes < 1) {
    errors.push('app-contract.json 的 maxJavaScriptGzipBytes 必须为正整数。');
  }
  return errors;
}

function publicFilesContainCredentials(rootDir) {
  const publicDir = path.join(rootDir, 'public');
  if (!existsSync(publicDir)) return [];
  const errors = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (
        entry.name.startsWith('.env')
        || entry.name === '.npmrc'
        || entry.name === 'credentials.json'
        || entry.name === 'service-account.json'
        || entry.name.endsWith('.pem')
        || entry.name.endsWith('.key')
      ) {
        errors.push(path.relative(rootDir, fullPath) + ' 不得放入网页 public 目录。');
      }
    }
  }
  visit(publicDir);
  return errors;
}

export function validateWebProject(rootDir) {
  const errors = [];
  let packageJson;
  let appContract;
  try {
    packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  } catch (error) {
    return ['无法读取 package.json：' + error.message];
  }
  try {
    appContract = JSON.parse(readFileSync(path.join(rootDir, 'app-contract.json'), 'utf8'));
    errors.push(...validateAppContract(appContract));
  } catch (error) {
    errors.push('无法读取 app-contract.json：' + error.message);
  }
  if (!packageJson.scripts?.build || !packageJson.scripts?.['test:ci']) {
    errors.push('成品应用必须定义 build 和 test:ci。');
  }

  const viteConfigPath = path.join(rootDir, 'vite.config.ts');
  const viteConfig = existsSync(viteConfigPath) ? readFileSync(viteConfigPath, 'utf8') : '';
  if (!/base\s*:\s*['"]\.\/['"]/.test(viteConfig)) {
    errors.push('vite.config.ts 必须设置相对 base，才能发布到共享站点子路径。');
  }
  errors.push(...publicFilesContainCredentials(rootDir));

  const discovery = discoverObjectModules(rootDir);
  errors.push(...discovery.errors);
  for (const module of discovery.modules) {
    const contractPath = path.join(module.moduleRoot, 'scene-contract.json');
    if (!existsSync(contractPath)) continue;
    let contract;
    try {
      contract = JSON.parse(readFileSync(contractPath, 'utf8'));
    } catch (error) {
      errors.push(module.slug + '/scene-contract.json 无法解析：' + error.message);
      continue;
    }
    const contractErrors = validateSceneContract(contract, module.moduleRoot);
    errors.push(...contractErrors.map((error) => module.slug + ': ' + error));
    if (contractErrors.length) continue;

    const modelPath = safeModulePath(module.moduleRoot, contract.modelPath);
    if (!modelPath || !existsSync(modelPath) || !statSync(modelPath).isFile()) {
      errors.push(module.slug + ': SceneSpec 指定的 GLB 文件不存在。');
      continue;
    }
    try {
      const info = inspectGlbBuffer(readFileSync(modelPath));
      if (info.byteLength > contract.maxGlbBytes) errors.push(module.slug + ': GLB 超出 scene-contract.json 的最大体积预算。');
    } catch (error) {
      errors.push(module.slug + ': ' + error.message);
    }
  }
  return errors;
}

function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const errors = validateWebProject(rootDir);
  if (errors.length) {
    for (const error of errors) console.error('ERROR: ' + error);
    process.exitCode = 1;
    return;
  }
  console.log('对象模块、静态网页结构和模块场景合同检查通过。');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
