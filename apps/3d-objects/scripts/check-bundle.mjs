#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

function findJavaScriptFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...findJavaScriptFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
  }
  return files;
}

export function validateJavaScriptBundle(rootDir) {
  const errors = [];
  let contract;
  try {
    contract = JSON.parse(readFileSync(path.join(rootDir, 'app-contract.json'), 'utf8'));
  } catch (error) {
    return { errors: ['无法读取 app-contract.json：' + error.message], gzipBytes: 0 };
  }
  const bundleDirectory = path.join(rootDir, 'dist', 'assets');
  const files = findJavaScriptFiles(bundleDirectory);
  if (!files.length) return { errors: ['dist/assets 中没有 JavaScript 构建产物。'], gzipBytes: 0 };

  const gzipBytes = files.reduce((total, file) => total + gzipSync(readFileSync(file)).length, 0);
  const maximum = contract.maxJavaScriptGzipBytes;
  if (!Number.isInteger(maximum) || maximum < 1) {
    errors.push('app-contract.json 的 maxJavaScriptGzipBytes 必须为正整数。');
  } else if (gzipBytes > maximum) {
    errors.push('JavaScript gzip 体积超出预算：' + gzipBytes + ' > ' + maximum + ' bytes。');
  }
  return { errors, gzipBytes };
}

function main() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = validateJavaScriptBundle(projectRoot);
  if (result.errors.length) {
    for (const error of result.errors) console.error('ERROR: ' + error);
    process.exitCode = 1;
    return;
  }
  console.log('JavaScript gzip 体积通过：' + result.gzipBytes + ' bytes。');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
