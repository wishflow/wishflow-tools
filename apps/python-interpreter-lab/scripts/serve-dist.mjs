import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 4173);
const prefix = '/python-interpreter-lab/';
const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.wasm', 'application/wasm'],
]);

createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', `http://${request.headers.host}`).pathname;
  if (pathname === prefix.slice(0, -1)) {
    response.writeHead(308, { location: prefix }).end();
    return;
  }
  if (!pathname.startsWith(prefix)) {
    response.writeHead(404).end('Not found');
    return;
  }

  let filePath;
  try {
    const relativePath = decodeURIComponent(pathname.slice(prefix.length));
    filePath = resolve(root, relativePath || 'index.html');
  } catch {
    response.writeHead(400).end('Invalid path');
    return;
  }
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const details = await stat(filePath);
    if (!details.isFile()) throw new Error('Not a file');
    const body = await readFile(filePath);
    const extension = filePath.slice(filePath.lastIndexOf('.'));
    response.writeHead(200, { 'content-type': mimeTypes.get(extension) ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`Serving ${root} at http://127.0.0.1:${port}${prefix}\n`);
});
