#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { discoverObjectModules, safeModulePath } from './object-modules.mjs';

const UNKNOWN_LICENSES = new Set(['unknown', 'tbd', 'pending', '未确认', '未知']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateAssetManifest(manifest, rootDir) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['素材清单必须是 JSON 对象。'];
  }
  if (manifest.version !== 1) errors.push('素材清单 version 必须为 1。');
  if (!Array.isArray(manifest.assets)) {
    errors.push('素材清单 assets 必须是数组。');
    return errors;
  }

  const seen = new Set();
  for (const [index, asset] of manifest.assets.entries()) {
    const label = 'assets[' + index + ']';
    if (!asset || typeof asset !== 'object' || Array.isArray(asset)) {
      errors.push(label + ' 必须是对象。');
      continue;
    }
    if (!isNonEmptyString(asset.id)) errors.push(label + ' 缺少 id。');
    else if (seen.has(asset.id)) errors.push(label + ' id 重复：' + asset.id + '。');
    else seen.add(asset.id);
    if (!isNonEmptyString(asset.name)) errors.push(label + ' 缺少 name。');
    if (!['external', 'procedural'].includes(asset.origin)) {
      errors.push(label + ' origin 必须为 external 或 procedural。');
    }
    if (!isNonEmptyString(asset.license) || UNKNOWN_LICENSES.has(String(asset.license).trim().toLowerCase())) {
      errors.push(label + ' 许可缺失或仍未确认。');
    }
    if (asset.redistribution !== 'allowed') {
      errors.push(label + ' 必须明确允许公开静态托管和再分发。');
    }
    if (!isNonEmptyString(asset.author)) errors.push(label + ' 缺少作者/来源主体。');
    if (!isNonEmptyString(asset.attribution)) errors.push(label + ' 缺少署名要求说明。');

    if (asset.origin === 'external') {
      if (!isNonEmptyString(asset.sourceUrl)) {
        errors.push(label + ' 外部素材缺少 sourceUrl。');
      } else {
        try {
          const url = new URL(asset.sourceUrl);
          if (!['http:', 'https:'].includes(url.protocol)) errors.push(label + ' sourceUrl 必须使用 HTTP(S)。');
        } catch {
          errors.push(label + ' sourceUrl 不是有效 URL。');
        }
      }
    } else if (asset.origin === 'procedural' && asset.license !== 'project-original') {
      errors.push(label + ' 程序化原创素材的 license 必须为 project-original。');
    }

    const localFile = safeModulePath(rootDir, asset.localPath);
    if (!localFile) {
      errors.push(label + ' localPath 必须是项目内安全的相对路径。');
    } else if (!existsSync(localFile)) {
      errors.push(label + ' localPath 对应文件不存在：' + asset.localPath + '。');
    }
  }

  return errors;
}

export function validateModuleAssetManifests(appRoot) {
  const { modules, errors } = discoverObjectModules(appRoot);
  for (const module of modules) {
    const manifestPath = path.join(module.moduleRoot, 'assets', 'manifest.json');
    if (!existsSync(manifestPath)) continue;
    if (!statSync(manifestPath).isFile()) {
      errors.push(module.slug + '/assets/manifest.json 必须是文件。');
      continue;
    }
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      errors.push(...validateAssetManifest(manifest, module.moduleRoot).map((error) => module.slug + ': ' + error));
    } catch (error) {
      errors.push(module.slug + '/assets/manifest.json 无法解析：' + error.message);
    }
  }
  return errors;
}

function main() {
  const appRoot = process.cwd();
  const selectedManifest = process.argv[2];
  let errors;
  if (selectedManifest) {
    const manifestPath = path.resolve(appRoot, selectedManifest);
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const moduleRoot = path.basename(path.dirname(manifestPath)) === 'assets'
        ? path.dirname(path.dirname(manifestPath))
        : path.dirname(manifestPath);
      errors = validateAssetManifest(manifest, moduleRoot);
    } catch (error) {
      errors = ['无法读取素材清单：' + error.message];
    }
  } else {
    errors = validateModuleAssetManifests(appRoot);
  }
  if (errors.length) {
    for (const error of errors) console.error('ERROR: ' + error);
    process.exitCode = 1;
    return;
  }
  console.log('对象模块素材清单通过：已声明的许可、来源、署名和本地路径均已记录。');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
