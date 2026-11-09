import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4173);
const host = '0.0.0.0';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = createServer(async (request, response) => {
  try {
    const requestPath = new URL(request.url, `http://${request.headers.host}`).pathname;
    const relative = requestPath === '/' ? 'index.html' : decodeURIComponent(requestPath.slice(1));
    const target = path.resolve(root, relative);
    if (!target.startsWith(root) || !existsSync(target)) throw new Error('not found');
    const info = await stat(target);
    if (!info.isFile()) throw new Error('not a file');
    response.writeHead(200, {
      'Content-Type': mime[path.extname(target)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('资源不存在');
  }
});

server.listen(port, host, () => {
  const localUrl = `http://127.0.0.1:${port}`;
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((item) => item && item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
  console.log(`毛概复习已启动：${localUrl}`);
  for (const address of addresses) console.log(`手机局域网访问：http://${address}:${port}`);
  console.log('按 Ctrl+C 停止服务。');
  if (process.argv.includes('--open') && process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', localUrl], { detached: true, stdio: 'ignore' }).unref();
  }
});
