#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const REQUIRED_MANIFEST_FIELDS = [
  'title',
  'titleZh',
  'description',
  'descriptionZh',
  'category',
  'categoryZh',
  'thumbnail',
];

export function safeModulePath(moduleRoot, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath || relativePath.includes('\\') || path.isAbsolute(relativePath)) {
    return null;
  }
  const parts = relativePath.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) return null;
  const root = path.resolve(moduleRoot);
  const resolved = path.resolve(root, ...parts);
  return resolved.startsWith(root + path.sep) ? resolved : null;
}

export function validateModuleManifest(manifest, moduleRoot) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['manifest.json 必须是 JSON 对象。'];
  }

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (typeof manifest[field] !== 'string' || !manifest[field].trim()) {
      errors.push('manifest.json 的 ' + field + ' 必须是非空字符串。');
    }
  }

  const thumbnail = safeModulePath(moduleRoot, manifest.thumbnail);
  if (!thumbnail) {
    errors.push('manifest.json 的 thumbnail 必须是模块内安全的相对路径。');
  } else {
    if (!/^thumbnail\.(svg|png|jpe?g|webp)$/.test(path.basename(manifest.thumbnail))) {
      errors.push('manifest.json 的 thumbnail 文件名必须为 thumbnail.svg、thumbnail.png、thumbnail.jpg 或 thumbnail.webp。');
    }
    if (!existsSync(thumbnail) || !statSync(thumbnail).isFile()) {
      errors.push('manifest.json 的 thumbnail 文件不存在：' + manifest.thumbnail + '。');
    }
  }
  return errors;
}

export function discoverObjectModules(appRoot) {
  const objectsRoot = path.join(appRoot, 'objects');
  if (!existsSync(objectsRoot) || !statSync(objectsRoot).isDirectory()) {
    return { modules: [], errors: ['objects/ 目录不存在。'] };
  }

  const errors = [];
  const modules = [];
  const directories = readdirSync(objectsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const slug of directories) {
    const moduleRoot = path.join(objectsRoot, slug);
    const moduleErrors = [];
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      moduleErrors.push('对象目录名必须使用小写字母、数字和连字符：' + slug + '。');
    }

    const manifestPath = path.join(moduleRoot, 'manifest.json');
    const detailPagePath = path.join(moduleRoot, 'DetailPage.vue');
    let manifest;
    if (!existsSync(manifestPath) || !statSync(manifestPath).isFile()) {
      moduleErrors.push(slug + '/manifest.json 缺失。');
    } else {
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        moduleErrors.push(...validateModuleManifest(manifest, moduleRoot).map((error) => slug + ': ' + error));
      } catch (error) {
        moduleErrors.push(slug + '/manifest.json 无法解析：' + error.message);
      }
    }
    if (!existsSync(detailPagePath) || !statSync(detailPagePath).isFile()) {
      moduleErrors.push(slug + '/DetailPage.vue 缺失。');
    }

    errors.push(...moduleErrors);
    modules.push({ slug, moduleRoot, manifest, manifestPath, detailPagePath });
  }

  return { modules, errors };
}
