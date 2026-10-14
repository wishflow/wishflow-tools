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

function usagiWidgetEnabled(html) {
  return !/data-usagi-widget=(?:"off"|'off')/i.test(html);
}

async function attachUsagiWidget(pagePath, relativePrefix, isPetPage) {
  const html = await readFile(pagePath, 'utf8');
  if (!usagiWidgetEnabled(html)) return false;
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
  return true;
}

async function configureSiteShell(pagePath) {
  const html = await readFile(pagePath, 'utf8');
  const projectPayload = JSON.stringify(projects.map(({ slug, title, titleZh }) => ({ slug, title, titleZh })))
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;');
  const configured = html.replace(/<wishflow-site-shell\b([^>]*)>/g, (tag, attributes) => {
    const cleaned = attributes.replace(/\sdata-projects=(?:"[^"]*"|'[^']*')/g, '');
    return `<wishflow-site-shell${cleaned} data-projects="${projectPayload}">`;
  });
  if (configured === html || !configured.includes('data-projects=')) {
    throw new Error(`No wishflow-site-shell element found in ${pagePath}.`);
  }
  await writeFile(pagePath, configured);
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
await cp(
  path.join(repoRoot, 'packages', 'site-shell', 'src', 'index.js'),
  path.join(siteRoot, 'site-shell.js'),
);
const renderedIndex = indexTemplate.replace(marker, renderProjectCards(projects));
await writeFile(path.join(siteRoot, 'index.html'), renderedIndex);
for (const project of projects) {
  await cp(
    path.join(repoRoot, 'apps', project.slug, 'dist'),
    path.join(siteRoot, project.slug),
    { recursive: true },
  );
}
await configureSiteShell(path.join(siteRoot, 'index.html'));
for (const project of projects) {
  await configureSiteShell(path.join(siteRoot, project.slug, 'index.html'));
}
const sitePages = [
  { pagePath: path.join(siteRoot, 'index.html'), relativePrefix: './', isPetPage: false },
  ...projects.map((project) => ({
    pagePath: path.join(siteRoot, project.slug, 'index.html'),
    relativePrefix: '../',
    isPetPage: project.slug === 'pet',
  })),
];
for (const { pagePath, relativePrefix, isPetPage } of sitePages) {
  await attachUsagiWidget(pagePath, relativePrefix, isPetPage);
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
for (const { pagePath } of sitePages) {
  const html = await readFile(pagePath, 'utf8');
  const hasWidgetScript = html.includes('id="usagi-widget-script"');
  const hasWidgetStyle = html.includes('id="usagi-widget-style"');
  const expected = usagiWidgetEnabled(html);
  if (hasWidgetScript !== expected || hasWidgetStyle !== expected) {
    throw new Error(`Usagi widget installation does not match the page opt-in setting in ${pagePath}.`);
  }
}
