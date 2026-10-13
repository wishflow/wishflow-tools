import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProjectCatalog, renderProjectCards, verifySiteOutput } from './project-catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.join(repoRoot, '_site');
const projects = readProjectCatalog(repoRoot);
const marker = '<!-- PROJECT_CARDS -->';
const indexTemplate = await readFile(path.join(repoRoot, 'site', 'index.html'), 'utf8');
if (indexTemplate.split(marker).length !== 2) {
  throw new Error(`site/index.html must contain exactly one ${marker} marker.`);
}

async function attachUsagiWidget(pagePath, relativePrefix, isPetPage) {
  const html = await readFile(pagePath, 'utf8');
  if (html.includes('id="usagi-widget-script"')) {
    throw new Error(`Usagi widget is already installed in ${pagePath}.`);
  }
  if (!html.includes('</head>')) {
    throw new Error(`Cannot install the Usagi widget because ${pagePath} has no closing head tag.`);
  }

  const petHref = isPetPage ? '#preview' : `${relativePrefix}pet/`;
  const widgetTags = [
    `    <link id="usagi-widget-style" rel="stylesheet" href="${relativePrefix}usagi-widget.css" />`,
    `    <script id="usagi-widget-script" src="${relativePrefix}usagi-widget.js" data-pet-href="${petHref}" data-sprite="${relativePrefix}pet/pets/uu-usagi/spritesheet.webp" data-pet-page="${isPetPage}" defer></script>`,
  ].join('\n');
  await writeFile(pagePath, html.replace('</head>', `${widgetTags}\n  </head>`));
}

for (const project of projects) {
  const appDir = path.join(repoRoot, 'apps', project.slug);
  const build = spawnSync(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['run', 'build'],
    { cwd: appDir, stdio: 'inherit' },
  );

  if (build.error) throw build.error;
  if (build.status !== 0) process.exit(build.status ?? 1);

  const distDir = path.join(appDir, 'dist');
  const distStats = await stat(distDir).catch(() => null);
  if (!distStats?.isDirectory() || !(await readdir(distDir)).includes('index.html')) {
    throw new Error(`Project apps/${project.slug} must build an index.html into its local dist/ directory.`);
  }
}

await rm(siteRoot, { recursive: true, force: true });
await mkdir(siteRoot, { recursive: true });
await cp(path.join(repoRoot, 'site'), siteRoot, { recursive: true });
const renderedIndex = indexTemplate.replace(marker, renderProjectCards(projects));
await writeFile(path.join(siteRoot, 'index.html'), renderedIndex);
for (const project of projects) {
  await cp(
    path.join(repoRoot, 'apps', project.slug, 'dist'),
    path.join(siteRoot, project.slug),
    { recursive: true },
  );
}
await attachUsagiWidget(path.join(siteRoot, 'index.html'), './', false);
for (const project of projects) {
  await attachUsagiWidget(
    path.join(siteRoot, project.slug, 'index.html'),
    '../',
    project.slug === 'pet',
  );
}
await writeFile(path.join(siteRoot, '.nojekyll'), '');
await verifySiteOutput(projects, siteRoot);

const widgetCss = await stat(path.join(siteRoot, 'usagi-widget.css')).catch(() => null);
const widgetJs = await stat(path.join(siteRoot, 'usagi-widget.js')).catch(() => null);
const spritePath = path.join(siteRoot, 'pet', 'pets', 'uu-usagi', 'spritesheet.webp');
const spriteStats = await stat(spritePath).catch(() => null);
if (!widgetCss?.isFile() || !widgetJs?.isFile() || !spriteStats?.isFile()) {
  throw new Error('The shared Usagi widget or its sprite sheet is missing from the built site.');
}
for (const pagePath of [
  path.join(siteRoot, 'index.html'),
  ...projects.map(({ slug }) => path.join(siteRoot, slug, 'index.html')),
]) {
  const html = await readFile(pagePath, 'utf8');
  if (!html.includes('id="usagi-widget-script"') || !html.includes('id="usagi-widget-style"')) {
    throw new Error(`The shared Usagi widget was not installed in ${pagePath}.`);
  }
}
