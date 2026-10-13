import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsRoot = path.join(appRoot, 'pets', 'uu-usagi');
const expected = {
  'pets/uu-usagi/pet.json': '9279ef338ef91cb56b99753f56f4335fa1dc55f38a765a7008a182fc5a92b2da',
  'pets/uu-usagi/spritesheet.webp': '3bb176b93e06e7a9d73717f26ac102f816f64d083e77d11691f3aa63958306a0',
};

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

test('pet metadata and original spritesheet match the preserved package', () => {
  const pet = JSON.parse(readFileSync(path.join(assetsRoot, 'pet.json'), 'utf8'));
  assert.deepEqual(pet, {
    id: 'uu-usagi',
    displayName: 'Usagi',
    description: 'A preview build of the animated yellow bunny pet.',
    spritesheetPath: 'spritesheet.webp',
    kind: 'animal',
  });

  for (const [relativePath, expectedHash] of Object.entries(expected)) {
    const absolutePath = path.join(appRoot, relativePath);
    assert.equal(sha256(absolutePath), expectedHash, relativePath + ' SHA-256');
  }

  const image = readFileSync(path.join(assetsRoot, 'spritesheet.webp'));
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');
  assert.equal(image.toString('ascii', 12, 16), 'VP8L');
  assert.equal(image[20], 0x2f, 'WebP lossless signature');
  const dimensions = image.readUInt32LE(21);
  assert.equal((dimensions & 0x3fff) + 1, 1536, 'spritesheet width');
  assert.equal(((dimensions >>> 14) & 0x3fff) + 1, 1872, 'spritesheet height');
});

test('checksum manifest and both installers pin the original asset hashes', () => {
  const manifest = readFileSync(path.join(appRoot, 'SHA256SUMS'), 'utf8');
  for (const [relativePath, expectedHash] of Object.entries(expected)) {
    const escapedPath = relativePath.replaceAll('/', '\\/');
    assert.match(manifest, new RegExp('^' + expectedHash + '  ' + escapedPath + '\\s*$', 'm'));
  }

  for (const installer of ['install.sh', 'install.ps1']) {
    const source = readFileSync(path.join(appRoot, installer), 'utf8');
    for (const hash of Object.values(expected)) assert.ok(source.includes(hash), installer + ' pins ' + hash);
    assert.ok(source.includes('wishflow/wishflow-tools/master/apps/pet'), installer + ' uses the repository master branch');
  }
});

test('static build contains the bilingual page, interactive preview, and an unmodified spritesheet copy', () => {
  const builtPage = readFileSync(path.join(appRoot, 'dist', 'index.html'), 'utf8');
  const builtScript = readFileSync(path.join(appRoot, 'dist', 'app.js'), 'utf8');
  const builtStyles = readFileSync(path.join(appRoot, 'dist', 'styles.css'), 'utf8');
  assert.match(builtPage, /<html lang="en">/);
  assert.match(builtPage, /data-language-toggle/);
  assert.match(builtPage, /id="install-prompt"/);
  assert.ok(builtPage.indexOf('id="copy-prompt"') < builtPage.indexOf('id="preview"'), 'Codex prompt is at the top of the page');
  assert.match(builtPage, /role="tablist"[^>]*data-install-tabs/);
  assert.equal((builtPage.match(/role="tab"/g) ?? []).length, 4, 'four installation scenario tabs');
  assert.equal((builtPage.match(/role="tabpanel"/g) ?? []).length, 4, 'four installation scenario panels');
  assert.match(builtPage, /id="install-panel-desktop"[^>]*data-install-panel="desktop"/);
  assert.match(builtPage, /id="install-panel-web"[^>]*data-install-panel="web"[^>]*hidden/);
  assert.match(builtPage, /Settings → Pets/);
  assert.match(builtPage, /Settings → Personalization → Pet/);
  assert.match(builtPage, /\/pets uu-usagi/);
  assert.match(builtPage, /not connected to a Codex session/);
  const previewStates = ['idle', 'running-right', 'running-left', 'waving', 'jumping', 'running', 'needs-input', 'complete', 'blocked'];
  for (const state of previewStates) {
    assert.ok(builtPage.includes('data-state="' + state + '"'), 'page exposes state ' + state);
    assert.ok(
      state === 'idle'
        ? builtStyles.includes('.pet-sprite {') && builtStyles.includes('animation: usagi-idle')
        : builtStyles.includes('.pet-sprite[data-state="' + state + '"]'),
      'styles map state ' + state,
    );
  }
  assert.match(builtScript, /clipboard\.writeText/);
  assert.match(builtScript, /ArrowRight/);
  assert.match(builtScript, /aria-selected/);
  assert.doesNotMatch(builtScript, /setInterval/);
  assert.match(builtStyles, /\.pet-stage\s*\{[^}]*background:\s*transparent/);
  assert.match(builtStyles, /@keyframes usagi-idle/);
  assert.match(builtStyles, /@keyframes usagi-running/);
  assert.match(builtStyles, /prefers-reduced-motion/);
  assert.equal(
    sha256(path.join(appRoot, 'dist', 'pets', 'uu-usagi', 'spritesheet.webp')),
    expected['pets/uu-usagi/spritesheet.webp'],
  );
  assert.equal(
    sha256(path.join(appRoot, 'dist', 'pets', 'uu-usagi', 'pet.json')),
    expected['pets/uu-usagi/pet.json'],
  );
  assert.equal(statSync(path.join(appRoot, 'dist', 'index.html')).isFile(), true);
});
