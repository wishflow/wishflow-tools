import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED_FIELDS = ['description', 'icon', 'slug', 'title'];

export function validateCatalog(catalog, repoRoot) {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    throw new Error('apps/catalog.json must contain at least one project.');
  }

  const seenSlugs = new Set();
  for (const [index, project] of catalog.entries()) {
    const prefix = `apps/catalog.json entry ${index + 1}`;
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      throw new Error(`${prefix} must be an object.`);
    }

    const fields = Object.keys(project).sort();
    if (fields.length !== REQUIRED_FIELDS.length || fields.some((field, i) => field !== REQUIRED_FIELDS[i])) {
      throw new Error(`${prefix} must contain only: ${REQUIRED_FIELDS.join(', ')}.`);
    }

    const { slug, title, description, icon } = project;
    if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
      throw new Error(`${prefix} has an invalid slug: ${String(slug)}.`);
    }
    if (seenSlugs.has(slug)) throw new Error(`Duplicate project slug: ${slug}.`);
    seenSlugs.add(slug);

    for (const [field, value] of Object.entries({ title, description, icon })) {
      if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${prefix} field "${field}" must be a non-empty string.`);
      }
    }

    const appDir = path.join(repoRoot, 'apps', slug);
    const packagePath = path.join(appDir, 'package.json');
    const lockPath = path.join(appDir, 'package-lock.json');
    const installPath = path.join(appDir, 'scripts', 'install.sh');
    if (!existsSync(appDir)) throw new Error(`Project directory does not exist: apps/${slug}/.`);
    if (!existsSync(packagePath)) throw new Error(`Project apps/${slug} is missing package.json.`);
    if (!existsSync(lockPath)) throw new Error(`Project apps/${slug} is missing package-lock.json.`);
    if (!existsSync(installPath)) throw new Error(`Project apps/${slug} is missing scripts/install.sh.`);
    try {
      accessSync(installPath, constants.X_OK);
    } catch {
      throw new Error(`Project apps/${slug}/scripts/install.sh must be executable.`);
    }
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    for (const script of ['build', 'test:ci']) {
      if (typeof packageJson.scripts?.[script] !== 'string' || packageJson.scripts[script].trim() === '') {
        throw new Error(`Project apps/${slug}/package.json must define a "${script}" script.`);
      }
    }
  }

  return catalog;
}

export function readProjectCatalog(repoRoot) {
  const catalogPath = path.join(repoRoot, 'apps', 'catalog.json');
  let catalog;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read apps/catalog.json: ${error.message}`);
  }
  return validateCatalog(catalog, repoRoot);
}

export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function renderProjectCards(projects) {
  return projects.map(({ slug, title, description, icon }) => `        <a class="card" href="./${slug}/">
          <span class="icon" aria-hidden="true">${escapeHtml(icon)}</span>
          <h2>${escapeHtml(title)}</h2>
          <p class="description">${escapeHtml(description)}</p>
          <span class="open">打开项目 →</span>
        </a>`).join('\n');
}

export async function verifySiteOutput(projects, siteRoot) {
  const indexPath = path.join(siteRoot, 'index.html');
  const indexHtml = await readFile(indexPath, 'utf8').catch(() => null);
  if (indexHtml === null) throw new Error('Shared site output is missing _site/index.html.');
  if (indexHtml.includes('<!-- PROJECT_CARDS -->')) {
    throw new Error('Shared site output still contains the project card template marker.');
  }

  const cardSlugs = [...indexHtml.matchAll(/<a class="card" href="\.\/([^/]+)\/">/g)]
    .map((match) => match[1]);
  const expectedSlugs = projects.map(({ slug }) => slug);
  if (JSON.stringify(cardSlugs) !== JSON.stringify(expectedSlugs)) {
    throw new Error(`Navigation cards do not match apps/catalog.json. Expected: ${expectedSlugs.join(', ')}; got: ${cardSlugs.join(', ')}.`);
  }

  for (const { slug } of projects) {
    const appIndex = path.join(siteRoot, slug, 'index.html');
    const appIndexStats = await stat(appIndex).catch(() => null);
    if (!appIndexStats?.isFile()) throw new Error(`Shared site output is missing _site/${slug}/index.html.`);
  }
}
