import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readProjectCatalog } from './project-catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC_PATTERN = /\.(?:md|mdx)$/i;
const SHARED_TEST_PATHS = new Set(['apps/catalog.json', 'package.json', 'scripts/build-site.mjs']);

function affectsWorker(file) {
  return /^apps\/[^/]+\/(?:worker\/|wrangler(?:\.[^/]+)?$)/.test(file);
}

function isWorkerOnlyPath(file) {
  return /^apps\/[^/]+\/(?:worker\/|wrangler(?:\.[^/]+)?$)/.test(file);
}

function dependencyBuildInputs(packageJson, lockfile) {
  const declarations = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const sortedNames = Object.keys(declarations).sort();
  return sortedNames.map((name) => {
    const locked = lockfile.packages?.[`node_modules/${name}`];
    return [name, declarations[name], locked?.version ?? null, locked?.integrity ?? null];
  });
}

export function workerBuildInputsChanged(previousPackage, currentPackage, previousLock, currentLock) {
  if (!previousPackage || !previousLock || !currentPackage || !currentLock) return true;
  return JSON.stringify(dependencyBuildInputs(previousPackage, previousLock))
    !== JSON.stringify(dependencyBuildInputs(currentPackage, currentLock));
}

export function analyzeChanges(changedFiles, projects, workerConfigApps = new Set()) {
  const files = changedFiles.map((file) => file.replaceAll('\\', '/')).filter(Boolean);
  const projectSlugs = new Set(projects.map(({ slug }) => slug));
  const changedApps = new Set();
  const sharedTestChange = files.some((file) => (
    SHARED_TEST_PATHS.has(file)
    || file.startsWith('scripts/')
    || file.startsWith('site/')
  ));
  let siteRequired = files.some((file) => (
    file === 'apps/catalog.json'
    || file === 'scripts/build-site.mjs'
    || file.startsWith('site/')
  ));
  let workerRequired = false;

  for (const file of files) {
    const appMatch = /^apps\/([^/]+)\//.exec(file);
    if (appMatch && projectSlugs.has(appMatch[1]) && !DOC_PATTERN.test(file)) {
      changedApps.add(appMatch[1]);
      if (!isWorkerOnlyPath(file)) siteRequired = true;
    }
    if (affectsWorker(file) || (appMatch && workerConfigApps.has(appMatch[1]))) workerRequired = true;
  }

  const testApps = sharedTestChange
    ? [...projectSlugs]
    : [...changedApps];

  return {
    docsOnly: files.length > 0 && files.every((file) => DOC_PATTERN.test(file)),
    siteRequired,
    workerRequired,
    testApps: testApps.sort(),
  };
}

function changedFilesBetween(base, head) {
  let range = [base, head];
  if (!base || /^0+$/.test(base)) {
    const parent = spawnSync('git', ['rev-parse', '--verify', 'HEAD^'], { cwd: repoRoot, encoding: 'utf8' });
    if (parent.status !== 0) return null;
    range = [parent.stdout.trim(), head || 'HEAD'];
  }
  const result = spawnSync('git', ['diff', '--name-only', '-z', ...range], { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Unable to read changed files from git.');
  return result.stdout.split('\0').filter(Boolean);
}

function readGitJson(revision, file) {
  if (!revision || /^0+$/.test(revision)) return null;
  const result = spawnSync('git', ['show', `${revision}:${file}`], { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

function findWorkerConfigChanges(changedFiles, projects, base) {
  const changedPackages = new Set();
  for (const file of changedFiles) {
    const match = /^apps\/([^/]+)\/package(?:-lock)?\.json$/.exec(file);
    if (match && projects.some(({ slug }) => slug === match[1])) changedPackages.add(match[1]);
  }

  const changedWorkerConfigs = new Set();
  for (const slug of changedPackages) {
    const appPath = `apps/${slug}`;
    const previousPackage = readGitJson(base, `${appPath}/package.json`);
    const previousLock = readGitJson(base, `${appPath}/package-lock.json`)
      ?? readGitJson(base, 'package-lock.json');
    let currentPackage;
    let currentLock;
    try {
      currentPackage = JSON.parse(readFileSync(path.join(repoRoot, appPath, 'package.json'), 'utf8'));
      currentLock = JSON.parse(readFileSync(path.join(repoRoot, appPath, 'package-lock.json'), 'utf8'));
    } catch {
      changedWorkerConfigs.add(slug);
      continue;
    }

    if (workerBuildInputsChanged(previousPackage, currentPackage, previousLock, currentLock)) {
      changedWorkerConfigs.add(slug);
    }
  }
  return changedWorkerConfigs;
}

function writeOutputs(changes, fallbackApp) {
  const matrixApps = changes.testApps.length ? changes.testApps : [fallbackApp];
  process.stdout.write([
    `docs_only=${changes.docsOnly}`,
    `site_required=${changes.siteRequired}`,
    `worker_required=${changes.workerRequired}`,
    `test_required=${changes.testApps.length > 0}`,
    `test_matrix=${JSON.stringify({ app: matrixApps })}`,
  ].join('\n') + '\n');
}

async function main(args) {
  const projects = readProjectCatalog(repoRoot);
  if (args.includes('--all')) {
    writeOutputs({
      docsOnly: false,
      siteRequired: true,
      workerRequired: true,
      testApps: projects.map(({ slug }) => slug),
    }, projects[0].slug);
    return;
  }

  const base = args[0];
  const head = args[1] || 'HEAD';
  let files = changedFilesBetween(base, head);
  if (files === null) {
    writeOutputs({
      docsOnly: false,
      siteRequired: true,
      workerRequired: true,
      testApps: projects.map(({ slug }) => slug),
    }, projects[0].slug);
    return;
  }
  const workerConfigApps = findWorkerConfigChanges(files, projects, base);
  writeOutputs(analyzeChanges(files, projects, workerConfigApps), projects[0].slug);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
