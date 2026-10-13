#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function safeProjectPath(rootDir, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath || relativePath.includes('\\') || path.isAbsolute(relativePath)) {
    return null;
  }
  const parts = relativePath.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) return null;
  const root = path.resolve(rootDir);
  const resolved = path.resolve(root, ...parts);
  return resolved.startsWith(root + path.sep) ? resolved : null;
}

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

export function validateSceneContract(contract, rootDir) {
  const errors = [];
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    return ['scene-contract.json 必须是 JSON 对象。'];
  }
  if (contract.version !== 1) errors.push('scene-contract version 必须为 1。');
  if (!safeProjectPath(rootDir, contract.modelPath)) errors.push('modelPath 必须是项目内安全的相对路径。');
  for (const [key, label] of [
    ['maxTriangles', 'maxTriangles'],
    ['maxGlbBytes', 'maxGlbBytes'],
    ['maxTextureEdge', 'maxTextureEdge'],
    ['maxJavaScriptGzipBytes', 'maxJavaScriptGzipBytes'],
    ['minimumMeshCount', 'minimumMeshCount'],
  ]) {
    if (!Number.isInteger(contract[key]) || contract[key] < 1) errors.push(label + ' 必须为正整数。');
  }
  if (!Array.isArray(contract.requiredObjects) || contract.requiredObjects.some((item) => typeof item !== 'string' || !item.trim())) {
    errors.push('requiredObjects 必须是对象名组成的数组。');
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
  const packagePath = path.join(rootDir, 'package.json');
  const contractPath = path.join(rootDir, 'scene-contract.json');
  let packageJson;
  let contract;

  try {
    packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  } catch (error) {
    return ['无法读取 package.json：' + error.message];
  }
  try {
    contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  } catch (error) {
    errors.push('无法读取 scene-contract.json：' + error.message);
  }
  if (contract) errors.push(...validateSceneContract(contract, rootDir));
  if (!packageJson.scripts?.build || !packageJson.scripts?.['test:ci']) {
    errors.push('成品应用必须定义 build 和 test:ci。');
  }

  const viteConfigPath = path.join(rootDir, 'vite.config.ts');
  const viteConfig = existsSync(viteConfigPath) ? readFileSync(viteConfigPath, 'utf8') : '';
  if (!/base\s*:\s*['"]\.\/['"]/.test(viteConfig)) {
    errors.push('vite.config.ts 必须设置相对 base，才能发布到共享站点子路径。');
  }
  errors.push(...publicFilesContainCredentials(rootDir));

  if (contract && !validateSceneContract(contract, rootDir).length) {
    const modelPath = safeProjectPath(rootDir, contract.modelPath);
    if (!modelPath || !existsSync(modelPath) || !statSync(modelPath).isFile()) {
      errors.push('SceneSpec 指定的 GLB 文件不存在。');
    } else {
      try {
        const info = inspectGlbBuffer(readFileSync(modelPath));
        if (info.byteLength > contract.maxGlbBytes) errors.push('GLB 超出 scene-contract.json 的最大体积预算。');
      } catch (error) {
        errors.push(error.message);
      }
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
  console.log('静态网页结构和本地 GLB 检查通过。');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
