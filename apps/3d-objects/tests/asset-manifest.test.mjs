import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { validateAssetManifest, validateModuleAssetManifests } from '../scripts/check-assets.mjs';

test('empty asset list is valid for an entirely procedural scene', () => {
  assert.deepEqual(validateAssetManifest({ version: 1, assets: [] }, process.cwd()), []);
});

test('external asset with a local file and explicit redistribution license is valid', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'scene-assets-test-'));
  try {
    await mkdir(path.join(rootDir, 'assets'));
    await writeFile(path.join(rootDir, 'assets', 'model.glb'), 'model');
    const errors = validateAssetManifest({
      version: 1,
      assets: [{
        id: 'sample-model',
        name: 'Sample model',
        origin: 'external',
        sourceUrl: 'https://example.org/model',
        author: 'Example author',
        license: 'CC-BY-4.0',
        attribution: 'Credit Example author.',
        redistribution: 'allowed',
        localPath: 'assets/model.glb',
      }],
    }, rootDir);
    assert.deepEqual(errors, []);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('unknown license and path traversal fail the publication gate', () => {
  const errors = validateAssetManifest({
    version: 1,
    assets: [{
      id: 'unsafe',
      name: 'Unverified file',
      origin: 'external',
      sourceUrl: 'https://example.org/model',
      author: 'Unknown',
      license: 'unknown',
      attribution: 'Unknown',
      redistribution: 'unknown',
      localPath: '../outside.glb',
    }],
  }, process.cwd());
  assert.match(errors.join('\n'), /许可缺失或仍未确认/);
  assert.match(errors.join('\n'), /必须明确允许公开静态托管和再分发/);
  assert.match(errors.join('\n'), /项目内安全的相对路径/);
});

test('module asset manifests are discovered and checked per object', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'object-assets-test-'));
  try {
    const moduleRoot = path.join(rootDir, 'objects', 'sample');
    await mkdir(path.join(moduleRoot, 'assets'), { recursive: true });
    await writeFile(path.join(moduleRoot, 'manifest.json'), JSON.stringify({
      title: 'Sample',
      titleZh: '示例',
      description: 'Sample object',
      descriptionZh: '示例物体',
      category: 'Object',
      categoryZh: '物体',
      thumbnail: 'assets/thumbnail.svg',
    }));
    await writeFile(path.join(moduleRoot, 'DetailPage.vue'), '<template><main/></template>');
    await writeFile(path.join(moduleRoot, 'assets', 'thumbnail.svg'), '<svg/>');
    await writeFile(path.join(moduleRoot, 'assets', 'manifest.json'), JSON.stringify({
      version: 1,
      assets: [{
        id: 'unlicensed-file',
        name: 'Unlicensed file',
        origin: 'external',
        sourceUrl: 'https://example.org/model',
        author: 'Unknown',
        license: 'unknown',
        attribution: 'Unknown',
        redistribution: 'unknown',
        localPath: '../outside.glb',
      }],
    }));

    const errors = validateModuleAssetManifests(rootDir).join('\n');
    assert.match(errors, /sample: assets\[0\] 许可缺失或仍未确认/);
    assert.match(errors, /sample: assets\[0\] localPath 必须是项目内安全的相对路径/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
