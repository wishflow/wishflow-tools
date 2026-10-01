import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.join(repoRoot, '_site');

await rm(siteRoot, { recursive: true, force: true });

const build = spawnSync(
  'npm',
  ['run', 'build:app', '--workspace=@wishflow/duolingo-avatar'],
  { cwd: repoRoot, stdio: 'inherit', shell: process.platform === 'win32' },
);

if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

await mkdir(siteRoot, { recursive: true });
await cp(path.join(repoRoot, 'site'), siteRoot, { recursive: true });
await writeFile(path.join(siteRoot, '.nojekyll'), '');
