import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProjectCatalog } from './project-catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projects = readProjectCatalog(repoRoot);
for (const project of projects) {
  const appDir = path.join(repoRoot, 'apps', project.slug);
  console.log(`Installing apps/${project.slug} dependencies`);
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['ci'],
    { cwd: appDir, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
