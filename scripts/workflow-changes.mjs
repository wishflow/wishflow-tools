import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readProjectCatalog } from './project-catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC_PATTERN = /\.(?:md|mdx)$/i;
const SHARED_TEST_PATHS = new Set(['apps/catalog.json', 'package.json', 'scripts/build-site.mjs']);
const SITE_BUILD_PATHS = new Set(['apps/catalog.json', 'scripts/build-site.mjs', 'scripts/project-catalog.mjs']);

function affectsWorker(file) {
  return /^apps\/[^/]+\/(?:worker\/|wrangler(?:\.[^/]+)?$)/.test(file);
}

function isWorkerOnlyPath(file) {
  return /^apps\/[^/]+\/(?:worker\/|wrangler(?:\.[^/]+)?$)/.test(file);
}

function pnpmDependencyLock(lockfileText) {
  const lines = lockfileText.split(/\r?\n/);
  const importersIndex = lines.findLastIndex((line) => line.trim() === 'importers:');
  const declaredPackagesIndex = lines.findIndex((line, index) => index > importersIndex && line.trim() === 'packages:');
  if (importersIndex < 0) return null;
  const packagesIndex = declaredPackagesIndex > importersIndex ? declaredPackagesIndex : lines.length;

  const versions = new Map();
  let inRootImporter = false;
  let section = null;
  let packageName = null;
  for (const line of lines.slice(importersIndex + 1, packagesIndex)) {
    if (/^  \.\s*:$/.test(line)) {
      inRootImporter = true;
      section = null;
      packageName = null;
      continue;
    }
    if (/^  \S/.test(line)) {
      inRootImporter = false;
      section = null;
      packageName = null;
    }
    if (!inRootImporter) continue;

    const sectionMatch = /^    (dependencies|devDependencies):\s*$/.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1];
      packageName = null;
      continue;
    }
    if (/^    \S/.test(line)) {
      section = null;
      packageName = null;
      continue;
    }
    if (!section) continue;

    const dependencyMatch = /^      (.+):\s*$/.exec(line);
    if (dependencyMatch) {
      packageName = dependencyMatch[1].replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1');
      continue;
    }
    const versionMatch = /^        version:\s*(.+?)\s*$/.exec(line);
    if (packageName && versionMatch) {
      const value = versionMatch[1];
      const version = value.replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1');
      versions.set(packageName, version);
      packageName = null;
    }
  }
  const integrities = new Map();
  let packageKey = null;
  let readingResolution = false;
  for (const line of lines.slice(declaredPackagesIndex > importersIndex ? packagesIndex + 1 : lines.length)) {
    if (/^\S/.test(line)) break;
    const entryMatch = /^  (.+):\s*$/.exec(line);
    if (entryMatch) {
      packageKey = entryMatch[1].replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1');
      readingResolution = false;
      continue;
    }
    if (!packageKey) continue;
    const inlineIntegrity = /^    resolution:\s*\{[^}]*integrity:\s*([^, }]+)[^}]*\}/.exec(line);
    const nestedResolution = /^    resolution:\s*$/.test(line);
    const nestedIntegrity = /^      integrity:\s*(\S+)/.exec(line);
    if (inlineIntegrity) {
      integrities.set(packageKey, inlineIntegrity[1]);
      packageKey = null;
    } else if (nestedResolution) {
      readingResolution = true;
    } else if (readingResolution && nestedIntegrity) {
      integrities.set(packageKey, nestedIntegrity[1]);
      packageKey = null;
      readingResolution = false;
    }
  }
  return { versions, integrities };
}

function dependencyBuildInputs(packageJson, lockfile) {
  if (!packageJson || !lockfile) return null;
  const declarations = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const sortedNames = Object.keys(declarations).sort();

  let npmLock = lockfile;
  if (typeof lockfile === 'string') {
    try {
      npmLock = JSON.parse(lockfile);
    } catch {
      const pnpmLock = pnpmDependencyLock(lockfile);
      if (!pnpmLock) return null;
      const inputs = sortedNames.map((name) => {
        const version = pnpmLock.versions.get(name) ?? null;
        const packageVersion = version?.split('(', 1)[0] ?? null;
        const comparableVersion = packageVersion?.startsWith('file:') ? null : packageVersion;
        const packageKey = comparableVersion === null ? null : `${name}@${comparableVersion}`;
        const integrity = packageKey ? pnpmLock.integrities.get(packageKey) ?? null : null;
        return [name, declarations[name], comparableVersion, integrity];
      });
      return inputs;
    }
  }

  const inputs = sortedNames.map((name) => {
    const locked = npmLock.packages?.[`node_modules/${name}`];
    return [name, declarations[name], locked?.version ?? null, locked?.integrity ?? null];
  });
  return inputs;
}

export function workerBuildInputsChanged(previousPackage, currentPackage, previousLock, currentLock) {
  const currentInputs = dependencyBuildInputs(currentPackage, currentLock);
  if (!currentInputs) return true;
  const previousInputs = previousPackage
    ? dependencyBuildInputs(previousPackage, previousLock)
    : [];
  if (previousPackage && !previousInputs) return true;
  return JSON.stringify(previousInputs)
    !== JSON.stringify(currentInputs);
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
    SITE_BUILD_PATHS.has(file)
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

function readGitText(revision, file) {
  if (!revision || /^0+$/.test(revision)) return null;
  const result = spawnSync('git', ['show', `${revision}:${file}`], { cwd: repoRoot, encoding: 'utf8' });
  return result.status === 0 ? result.stdout : null;
}

function findWorkerConfigChanges(changedFiles, projects, base) {
  const changedPackages = new Set();
  for (const file of changedFiles) {
    const match = /^apps\/([^/]+)\/(?:package\.json|package-lock\.json|pnpm-lock\.yaml)$/.exec(file);
    if (match && projects.some(({ slug }) => slug === match[1])) changedPackages.add(match[1]);
  }

  const changedWorkerConfigs = new Set();
  for (const slug of changedPackages) {
    const appPath = `apps/${slug}`;
    let previousPackage;
    try {
      previousPackage = JSON.parse(readGitText(base, `${appPath}/package.json`) ?? 'null');
    } catch {
      previousPackage = null;
    }
    const previousLock = readGitText(base, `${appPath}/pnpm-lock.yaml`)
      ?? readGitText(base, `${appPath}/package-lock.json`)
      ?? readGitText(base, 'package-lock.json');
    let currentPackage;
    let currentLock;
    try {
      currentPackage = JSON.parse(readFileSync(path.join(repoRoot, appPath, 'package.json'), 'utf8'));
      currentLock = readFileSync(path.join(repoRoot, appPath, 'pnpm-lock.yaml'), 'utf8');
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
