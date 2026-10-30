import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED_FIELDS = ['description', 'descriptionZh', 'slug', 'title', 'titleZh'];
const OPTIONAL_FIELDS = ['icon', 'iconImage'];

export function validateCatalog(catalog, repoRoot) {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    throw new Error('apps/catalog.json must contain at least one project.');
  }

  const seenSlugs = new Set();
  for (const [index, project] of catalog.entries()) {
    const prefix = 'apps/catalog.json entry ' + (index + 1);
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      throw new Error(prefix + ' must be an object.');
    }

    const fields = Object.keys(project).sort();
    const allowedFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].sort();
    if (
      REQUIRED_FIELDS.some((field) => !fields.includes(field)) ||
      fields.some((field) => !allowedFields.includes(field))
    ) {
      throw new Error(prefix + ' must contain required fields (' + REQUIRED_FIELDS.join(', ') + ') and only optional fields (' + OPTIONAL_FIELDS.join(', ') + ').');
    }

    const { slug, title, titleZh, description, descriptionZh, icon, iconImage } = project;
    if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
      throw new Error(prefix + ' has an invalid slug: ' + String(slug) + '.');
    }
    if (seenSlugs.has(slug)) throw new Error('Duplicate project slug: ' + slug + '.');
    seenSlugs.add(slug);

    for (const [field, value] of Object.entries({ title, titleZh, description, descriptionZh })) {
      if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(prefix + ' field "' + field + '" must be a non-empty string.');
      }
    }

    if ((icon === undefined || icon === '') && (iconImage === undefined || iconImage === '')) {
      throw new Error(prefix + ' must define either "icon" or "iconImage".');
    }
    if (icon !== undefined && (typeof icon !== 'string' || icon.trim() === '')) {
      throw new Error(prefix + ' field "icon" must be a non-empty string when provided.');
    }
    if (iconImage !== undefined) {
      if (
        typeof iconImage !== 'string' ||
        iconImage.trim() === '' ||
        iconImage.startsWith('/') ||
        iconImage.includes('\\') ||
        iconImage.split('/').some((part) => part === '' || part === '.' || part === '..')
      ) {
        throw new Error(prefix + ' field "iconImage" must be a safe project-relative path.');
      }
    }

    const appDir = path.join(repoRoot, 'apps', slug);
    const packagePath = path.join(appDir, 'package.json');
    const lockPath = path.join(appDir, 'pnpm-lock.yaml');
    const npmLockPath = path.join(appDir, 'package-lock.json');
    const installPath = path.join(appDir, 'scripts', 'install.sh');
    if (!existsSync(appDir)) throw new Error('Project directory does not exist: apps/' + slug + '/.');
    if (iconImage !== undefined && !existsSync(path.join(appDir, iconImage))) {
      throw new Error('Project apps/' + slug + ' is missing icon image ' + iconImage + '.');
    }
    if (!existsSync(packagePath)) throw new Error('Project apps/' + slug + ' is missing package.json.');
    if (!existsSync(lockPath)) throw new Error('Project apps/' + slug + ' is missing pnpm-lock.yaml.');
    if (existsSync(npmLockPath)) throw new Error('Project apps/' + slug + ' still has an npm package-lock.json.');
    if (!existsSync(installPath)) throw new Error('Project apps/' + slug + ' is missing scripts/install.sh.');
    try {
      accessSync(installPath, constants.X_OK);
    } catch {
      throw new Error('Project apps/' + slug + '/scripts/install.sh must be executable.');
    }
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    const packageManager = packageJson.packageManager;
    if (packageManager !== undefined && (typeof packageManager !== 'string' || !/^pnpm@.+$/.test(packageManager))) {
      throw new Error('Project apps/' + slug + '/package.json may omit packageManager, but an explicit manager must use pnpm.');
    }
    for (const script of ['build', 'test:ci']) {
      if (typeof packageJson.scripts?.[script] !== 'string' || packageJson.scripts[script].trim() === '') {
        throw new Error('Project apps/' + slug + '/package.json must define a "' + script + '" script.');
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
    throw new Error('Unable to read apps/catalog.json: ' + error.message);
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
  return projects.map(({ slug, title, titleZh, description, descriptionZh, icon, iconImage }) => {
    const iconMarkup = iconImage
      ? '<span class="icon icon-image" aria-hidden="true"><img src="./' + escapeHtml(slug) + '/' + escapeHtml(iconImage) + '" alt="" width="48" height="52" /></span>'
      : '<span class="icon" aria-hidden="true">' + escapeHtml(icon) + '</span>';
    return '        <a class="card" href="./' + escapeHtml(slug) + '/">\n' +
      '          ' + iconMarkup + '\n' +
      '          <h2><span data-locale="en">' + escapeHtml(title) + '</span><span data-locale="zh">' + escapeHtml(titleZh) + '</span></h2>\n' +
      '          <p class="description"><span data-locale="en">' + escapeHtml(description) + '</span><span data-locale="zh">' + escapeHtml(descriptionZh) + '</span></p>\n' +
      '          <span class="open"><span data-locale="en">Open project →</span><span data-locale="zh">打开项目 →</span></span>\n' +
      '        </a>';
  }).join('\n');
}

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findHtmlFiles(entryPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(entryPath);
  }
  return files.sort();
}

export async function configureSiteShellPages(appRoot, projects) {
  const projectPayload = JSON.stringify(projects.map(({ slug, title, titleZh }) => ({ slug, title, titleZh })))
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;');
  const configuredPages = [];

  for (const pagePath of await findHtmlFiles(appRoot)) {
    const html = await readFile(pagePath, 'utf8');
    if (!/<wishflow-site-shell\b/i.test(html)) continue;
    const configured = html.replace(/<wishflow-site-shell\b([^>]*)>/gi, (tag, attributes) => {
      const cleaned = attributes.replace(/\sdata-projects=(?:"[^"]*"|'[^']*')/gi, '');
      return `<wishflow-site-shell${cleaned} data-projects="${projectPayload}">`;
    });
    if (!configured.includes('data-projects=')) {
      throw new Error(`Cannot inject project navigation into ${pagePath}.`);
    }
    if (configured !== html) await writeFile(pagePath, configured);
    configuredPages.push(pagePath);
  }

  return configuredPages;
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
    throw new Error('Navigation cards do not match apps/catalog.json. Expected: ' + expectedSlugs.join(', ') + '; got: ' + cardSlugs.join(', ') + '.');
  }

  for (const { slug } of projects) {
    const appIndex = path.join(siteRoot, slug, 'index.html');
    const appIndexStats = await stat(appIndex).catch(() => null);
    if (!appIndexStats?.isFile()) throw new Error('Shared site output is missing _site/' + slug + '/index.html.');
    const appHtml = await readFile(appIndex, 'utf8');
    if (!/<wishflow-site-shell\b[^>]*\bdata-projects=/i.test(appHtml)) {
      throw new Error('Shared site output is missing project navigation in _site/' + slug + '/index.html.');
    }
  }
}
