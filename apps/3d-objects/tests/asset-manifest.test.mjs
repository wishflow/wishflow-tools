import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { validateAssetManifest } from '../scripts/check-assets.mjs';

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
