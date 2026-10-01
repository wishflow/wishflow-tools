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

for (const project of projects) {
  const appDir = path.join(repoRoot, 'apps', project.slug);
  const build = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
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
await writeFile(path.join(siteRoot, '.nojekyll'), '');
await verifySiteOutput(projects, siteRoot);
