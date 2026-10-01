import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeChanges, workerBuildInputsChanged } from './workflow-changes.mjs';
import { readProjectCatalog, renderProjectCards, validateCatalog, verifySiteOutput } from './project-catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projects = readProjectCatalog(repoRoot);

test('catalog projects have valid local build and test contracts', () => {
  assert.ok(projects.length > 0);
  assert.equal(new Set(projects.map(({ slug }) => slug)).size, projects.length);
});

test('catalog rejects duplicate and unsafe slugs', () => {
  assert.throws(() => validateCatalog([...projects, { ...projects[0] }], repoRoot), /Duplicate project slug/);
  assert.throws(
    () => validateCatalog([{ ...projects[0], slug: '../escape' }], repoRoot),
    /invalid slug/,
  );
});

test('navigation cards are rendered from catalog values with HTML escaping', () => {
  const cards = renderProjectCards([{ ...projects[0], title: '<script>alert(1)</script>' }]);
  assert.match(cards, /href="\.\/duolingo-avatar\/"/);
  assert.match(cards, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(cards, /<script>/);
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
