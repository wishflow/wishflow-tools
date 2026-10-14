import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const runtimeDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../public/portable');
const manifest = JSON.parse(await readFile(resolve(runtimeDirectory, 'runtime-manifest.json'), 'utf8')) as {
  runtime: { version: string; releaseArchiveSha256: string; license: string };
  jszip: { version: string; license: string };
  files: Record<string, string>;
};

test('the committed browser runtime matches its pinned checksums and license manifest', async () => {
  assert.equal(manifest.runtime.version, '0.2.5');
  assert.equal(manifest.runtime.releaseArchiveSha256, '9542ca7fe4aa5804e3cc409a8679d3e03771cc6522920a9220cf58c2366b3f84');
  assert.equal(manifest.runtime.license, 'LGPL-3.0-or-later');
  assert.equal(manifest.jszip.version, '3.10.1');
  assert.equal(manifest.jszip.license, 'MIT');

  for (const [filename, expectedHash] of Object.entries(manifest.files)) {
    const bytes = await readFile(resolve(runtimeDirectory, filename));
    const actualHash = createHash('sha256').update(bytes).digest('hex');
    assert.equal(actualHash, expectedHash, filename + ' does not match runtime-manifest.json');
  }

  for (const filename of ['licenses/PVZ-PORTABLE-LICENSE', 'licenses/PVZ-PORTABLE-COPYING', 'licenses/JSZIP-LICENSE.markdown', 'THIRD-PARTY-NOTICES.txt']) {
    const notice = await readFile(resolve(runtimeDirectory, filename), 'utf8');
    assert.ok(notice.trim().length > 0, filename + ' must be included in the published site');
  }
});

test('the WASM upload page uses the pinned local JSZip file without an external script CDN', async () => {
  const html = await readFile(resolve(runtimeDirectory, 'pvz-portable.html'), 'utf8');
  assert.match(html, /\.\/jszip\.min\.js/);
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net/);
  assert.match(html, /main\.pak/);
  assert.match(html, /IndexedDB/);
});
