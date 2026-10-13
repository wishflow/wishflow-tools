#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const UNKNOWN_LICENSES = new Set(['unknown', 'tbd', 'pending', '未确认', '未知']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function safeProjectFile(rootDir, localPath) {
  if (!isNonEmptyString(localPath) || localPath.includes('\\') || path.isAbsolute(localPath)) return null;
  const parts = localPath.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) return null;
  const root = path.resolve(rootDir);
  const resolved = path.resolve(root, ...parts);
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
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

    const localFile = safeProjectFile(rootDir, asset.localPath);
    if (!localFile) {
      errors.push(label + ' localPath 必须是项目内安全的相对路径。');
    } else if (!existsSync(localFile)) {
      errors.push(label + ' localPath 对应文件不存在：' + asset.localPath + '。');
    }
  }

  return errors;
}

function main() {
  const rootDir = process.cwd();
  const manifestPath = path.resolve(rootDir, process.argv[2] || 'assets/manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    console.error('无法读取素材清单：' + error.message);
    process.exitCode = 1;
    return;
  }

  const errors = validateAssetManifest(manifest, rootDir);
  if (errors.length) {
    for (const error of errors) console.error('ERROR: ' + error);
    process.exitCode = 1;
    return;
  }
  console.log('素材清单通过：许可、来源、署名和本地路径均已记录。');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
