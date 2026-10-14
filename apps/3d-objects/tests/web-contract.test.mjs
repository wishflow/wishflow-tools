import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { inspectGlbBuffer, validateAppContract, validateSceneContract, validateWebProject } from '../scripts/check-web.mjs';
import { discoverObjectModules } from '../scripts/object-modules.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const houseRoot = path.join(projectRoot, 'objects', 'house');

test('starter GLB is a valid glTF 2 binary document', () => {
  const model = readFileSync(path.join(houseRoot, 'assets', 'scene.glb'));
  assert.equal(inspectGlbBuffer(model).document.asset.version, '2.0');
});

test('scene contract prevents unsafe paths and missing budgets', () => {
  const errors = validateSceneContract({
    version: 1,
    modelPath: '../outside.glb',
    requiredObjects: [],
  }, houseRoot);
  assert.match(errors.join('\n'), /模块内安全的相对路径/);
  assert.match(errors.join('\n'), /maxTriangles 必须为正整数/);
  assert.doesNotMatch(errors.join('\n'), /maxJavaScriptGzipBytes/);
});

test('object module discovery returns distinct module entry pages', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'object-discovery-test-'));
  try {
    for (const [slug, title] of [['lamp', 'Lamp'], ['chair', 'Chair']]) {
      const moduleRoot = path.join(rootDir, 'objects', slug);
      await mkdir(path.join(moduleRoot, 'assets'), { recursive: true });
      await writeFile(path.join(moduleRoot, 'manifest.json'), JSON.stringify({
        title,
        titleZh: title + ' 中文',
        description: title + ' description',
        descriptionZh: title + ' 描述',
        category: 'Object',
        categoryZh: '物体',
        thumbnail: 'assets/thumbnail.svg',
      }));
      await writeFile(path.join(moduleRoot, 'DetailPage.vue'), '<template><main>' + title + '</main></template>');
      await writeFile(path.join(moduleRoot, 'assets', 'thumbnail.svg'), '<svg/>');
    }
    const result = discoverObjectModules(rootDir);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.modules.map((module) => module.slug), ['chair', 'lamp']);
    assert.ok(result.modules.every((module) => module.detailPagePath.endsWith('/DetailPage.vue')));
    assert.notEqual(result.modules[0].detailPagePath, result.modules[1].detailPagePath);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('invalid object manifest, missing page, and unsafe thumbnail are rejected', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'object-invalid-test-'));
  try {
    const moduleRoot = path.join(rootDir, 'objects', 'broken');
    await mkdir(moduleRoot, { recursive: true });
    await writeFile(path.join(moduleRoot, 'manifest.json'), JSON.stringify({
      title: '',
      titleZh: '损坏对象',
      description: 'description',
      descriptionZh: '说明',
      category: 'Object',
      categoryZh: '物体',
      thumbnail: '../outside.svg',
    }));
    const result = discoverObjectModules(rootDir);
    const errors = result.errors.join('\n');
    assert.match(errors, /title 必须是非空字符串/);
    assert.match(errors, /thumbnail 必须是模块内安全的相对路径/);
    assert.match(errors, /broken\/DetailPage.vue 缺失/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('app JavaScript budget is independent from optional object scene contracts', () => {
  assert.deepEqual(validateAppContract({ version: 1, maxJavaScriptGzipBytes: 262144 }), []);
  assert.match(validateAppContract({ version: 1, maxJavaScriptGzipBytes: 0 }).join('\n'), /必须为正整数/);
});

test('starter satisfies static subpath deployment and local model checks', () => {
  assert.deepEqual(validateWebProject(projectRoot), []);
});
