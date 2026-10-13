import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeChanges, workerBuildInputsChanged } from './workflow-changes.mjs';
import { readProjectCatalog, renderProjectCards, validateCatalog, verifySiteOutput } from './project-catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projects = readProjectCatalog(repoRoot);

test('catalog projects have valid local pnpm build and test contracts', () => {
  assert.ok(projects.length > 0);
  assert.equal(new Set(projects.map(({ slug }) => slug)).size, projects.length);
});

test('catalog rejects duplicate and unsafe slugs and unsafe icon paths', () => {
  assert.throws(() => validateCatalog([...projects, { ...projects[0] }], repoRoot), /Duplicate project slug/);
  assert.throws(
    () => validateCatalog([{ ...projects[0], slug: '../escape' }], repoRoot),
    /invalid slug/,
  );
  assert.throws(
    () => validateCatalog([{ ...projects.find(({ slug }) => slug === 'pet'), iconImage: '../outside.webp' }], repoRoot),
    /safe project-relative path/,
  );
});

test('navigation cards include both languages and render the configured Usagi image safely', () => {
  const cards = renderProjectCards(projects);
  assert.match(cards, /data-locale="en">Usagi animated pet/);
  assert.match(cards, /data-locale="zh">Usagi 动画宠物/);
  assert.match(cards, /src="\.\/pet\/pets\/uu-usagi\/spritesheet\.webp"/);
  assert.doesNotMatch(cards, /🐰/);

  const escaped = renderProjectCards([{ ...projects[0], title: '<script>alert(1)</script>' }]);
  assert.match(escaped, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(escaped, /<script>/);

  const homePage = readFileSync(path.join(repoRoot, 'site', 'index.html'), 'utf8');
  assert.match(homePage, /@keyframes usagi-idle/);
  assert.match(homePage, /@keyframes usagi-card-waving/);
  assert.match(homePage, /\.card:hover \.icon-image img, \.card:focus-visible \.icon-image img/);
  assert.match(homePage, /translate\(-37\.5%, -33\.333333%\)/);
  assert.doesNotMatch(homePage, /usagi-card-staff-spin|icon-image::after/);
  assert.match(homePage, /prefers-reduced-motion: reduce/);

  const widgetStyles = readFileSync(path.join(repoRoot, 'site', 'usagi-widget.css'), 'utf8');
  const widgetScript = readFileSync(path.join(repoRoot, 'site', 'usagi-widget.js'), 'utf8');
  assert.match(widgetStyles, /usagi-widget-waving 700ms linear infinite/);
  assert.match(widgetStyles, /background-position: 0 37\.5%/);
  assert.doesNotMatch(widgetStyles, /usagi-widget-staff-spin|usagi-widget__sprite::after/);
  assert.match(widgetStyles, /data-direction="right"[\s\S]*?usagi-widget-run-right 2000ms steps\(7, end\)/);
  assert.match(widgetStyles, /data-direction="left"[\s\S]*?usagi-widget-run-left 2000ms steps\(7, end\)/);
  assert.match(widgetScript, /dataset\.direction = event\.key === 'ArrowRight' \? 'right' : 'left'/);
  assert.match(widgetScript, /Math\.abs\(movementX\) > 1/);
});

test('shared output contains exactly one navigation card and app build per catalog entry', async () => {
  const siteRoot = await mkdtemp(path.join(tmpdir(), 'wishflow-site-test-'));
  try {
    await writeFile(path.join(siteRoot, 'index.html'), renderProjectCards(projects));
    for (const { slug } of projects) {
      const appDir = path.join(siteRoot, slug);
      await mkdir(appDir);
      await writeFile(path.join(appDir, 'index.html'), '<!doctype html>');
    }
    await assert.doesNotReject(verifySiteOutput(projects, siteRoot));

    await writeFile(path.join(siteRoot, 'index.html'), '<a class="card" href="./unknown/">unknown</a>');
    await assert.rejects(verifySiteOutput(projects, siteRoot), /Navigation cards do not match/);
  } finally {
    await rm(siteRoot, { recursive: true, force: true });
  }
});

test('app changes run that app test and deploy the shared static site', () => {
  assert.deepEqual(analyzeChanges(['apps/duolingo-avatar/src/App.tsx'], projects), {
    docsOnly: false,
    siteRequired: true,
    workerRequired: false,
    testApps: ['duolingo-avatar'],
  });
});

test('worker-only changes run app tests and deploy only the Worker', () => {
  assert.deepEqual(analyzeChanges(['apps/duolingo-avatar/worker/index.ts'], projects), {
    docsOnly: false,
    siteRequired: false,
    workerRequired: true,
    testApps: ['duolingo-avatar'],
  });
});

test('Blender Lab framework changes run its tests without publishing a static app', () => {
  assert.deepEqual(analyzeChanges(['apps/blender-lab/scripts/check-scene.mjs'], projects), {
    docsOnly: false,
    siteRequired: false,
    workerRequired: false,
    testApps: ['blender-lab'],
  });
});

test('app manifest script changes test the app and rebuild static output', () => {
  assert.deepEqual(analyzeChanges(['apps/duolingo-avatar/package.json'], projects), {
    docsOnly: false,
    siteRequired: true,
    workerRequired: false,
    testApps: ['duolingo-avatar'],
  });
});

test('Worker deployment follows dependency lock changes, not unrelated app scripts', () => {
  const previousPackage = { dependencies: { zod: '^4.0.0' }, scripts: { test: 'old' } };
  const currentPackage = { dependencies: { zod: '^4.0.0' }, scripts: { test: 'new' } };
  const previousLock = { packages: { 'node_modules/zod': { version: '4.1.0', integrity: 'same' } } };
  const currentLock = { packages: { 'node_modules/zod': { version: '4.1.0', integrity: 'same' } } };
  assert.equal(workerBuildInputsChanged(previousPackage, currentPackage, previousLock, currentLock), false);
  assert.equal(workerBuildInputsChanged(
    previousPackage,
    currentPackage,
    previousLock,
    { packages: { 'node_modules/zod': { version: '4.2.0', integrity: 'new' } } },
  ), true);

  assert.equal(
    workerBuildInputsChanged(
      null,
      { name: '@wishflow/usagi-pet', packageManager: 'pnpm@12.11.2' },
      null,
      `lockfileVersion: '9.0'\n\nimporters:\n\n  .: {}\n`,
    ),
    false,
    'adding a dependency-free static app does not change Worker build inputs',
  );
  assert.equal(
    workerBuildInputsChanged(null, { dependencies: { zod: '^4.0.0' } }, null, {
      packages: { 'node_modules/zod': { version: '4.1.0', integrity: 'new' } },
    }),
    true,
    'a newly declared build dependency is classified as a Worker build input change',
  );
});

test('Worker dependency comparison accepts pnpm lockfiles and preserves npm-to-pnpm versions', () => {
  const previousPackage = { dependencies: { zod: '^4.0.0' }, scripts: { test: 'old' } };
  const currentPackage = { dependencies: { zod: '^4.0.0' }, packageManager: 'pnpm@12.11.2' };
  const previousLock = {
    packages: { 'node_modules/zod': { version: '4.1.0', integrity: 'sha512-same' } },
  };
  const packageManagerLock = `lockfileVersion: '9.0'\n\nimporters:\n  .:\n    configDependencies: {}\n    packageManagerDependencies:\n      pnpm:\n        specifier: 12.11.2\n        version: 12.11.2\n\npackages: {}\n\nsnapshots: {}\n\n---\n`;
  const currentLock = `${packageManagerLock}lockfileVersion: '9.0'\n\nimporters:\n  .:\n    dependencies:\n      zod:\n        specifier: ^4.0.0\n        version: 4.1.0(peer@1.0.0)\n\npackages:\n  zod@4.1.0:\n    resolution: {integrity: sha512-same}\n`;
  assert.equal(workerBuildInputsChanged(previousPackage, currentPackage, previousLock, currentLock), false);

  const changedLock = currentLock.replace('version: 4.1.0(peer@1.0.0)', 'version: 4.2.0(peer@1.0.0)').replace('zod@4.1.0:', 'zod@4.2.0:');
  assert.equal(workerBuildInputsChanged(previousPackage, currentPackage, previousLock, changedLock), true);
});

test('Worker dependency comparison treats local file dependencies consistently across lockfile formats', () => {
  const packageJson = { dependencies: { shared: 'file:../../packages/shared' } };
  const npmLock = { packages: { 'node_modules/shared': { link: true } } };
  const pnpmLock = `lockfileVersion: '9.0'\n\nimporters:\n  .:\n    dependencies:\n      shared:\n        specifier: file:../../packages/shared\n        version: file:../../packages/shared\n\npackages:\n`;
  assert.equal(workerBuildInputsChanged(packageJson, packageJson, npmLock, pnpmLock), false);
});

test('catalog or shared site changes test every app and rebuild the full site', () => {
  assert.deepEqual(analyzeChanges(['apps/catalog.json'], projects), {
    docsOnly: false,
    siteRequired: true,
    workerRequired: false,
    testApps: projects.map(({ slug }) => slug).sort(),
  });
});

test('documentation-only changes do not trigger tests or deployment', () => {
  assert.deepEqual(analyzeChanges(['apps/duolingo-avatar/README.md', 'AGENTS.md'], projects), {
    docsOnly: true,
    siteRequired: false,
    workerRequired: false,
    testApps: [],
  });
});
