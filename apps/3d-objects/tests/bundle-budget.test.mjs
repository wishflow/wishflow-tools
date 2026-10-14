import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { validateJavaScriptBundle } from '../scripts/check-bundle.mjs';

test('JavaScript gzip budget passes under limit and blocks oversized output', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'scene-bundle-test-'));
  try {
    await mkdir(path.join(rootDir, 'dist', 'assets'), { recursive: true });
    await writeFile(path.join(rootDir, 'dist', 'assets', 'main.js'), 'export const scene = true;');
    await writeFile(path.join(rootDir, 'app-contract.json'), JSON.stringify({
      maxJavaScriptGzipBytes: 2048,
    }));
    assert.deepEqual(validateJavaScriptBundle(rootDir).errors, []);

    await writeFile(path.join(rootDir, 'app-contract.json'), JSON.stringify({
      maxJavaScriptGzipBytes: 1,
    }));
    assert.match(validateJavaScriptBundle(rootDir).errors.join('\n'), /JavaScript gzip 体积超出预算/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
