// Local preview of the exported site; no application endpoints or storage.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('out'), port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname}`, pathname.endsWith('/') ? 'index.html' : '');
    if (!file.startsWith(root + sep)) throw new Error('invalid path');
    if (!extname(file)) { response.writeHead(308, { Location: pathname + '/' + new URL(request.url, 'http://localhost').search }); response.end(); return; }
    const data = await readFile(file); response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }); response.end(data);
  } catch { response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(await readFile(resolve(root, '404.html')).catch(() => 'Tidak ditemukan')); }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}`));
