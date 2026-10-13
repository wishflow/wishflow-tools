import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(appRoot, 'dist');

await rm(distRoot, { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });
await Promise.all([
  cp(path.join(appRoot, 'index.html'), path.join(distRoot, 'index.html')),
  cp(path.join(appRoot, 'styles.css'), path.join(distRoot, 'styles.css')),
  cp(path.join(appRoot, 'pets'), path.join(distRoot, 'pets'), { recursive: true }),
]);
