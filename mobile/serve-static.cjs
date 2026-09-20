// Minimal production static server for the Expo web build.
// Usage: node serve-static.cjs [port]
// Serves ./dist and falls back to index.html so SPA routes work.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.argv[2] || process.env.PORT || 8081);
const root = path.resolve(__dirname, 'dist');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function serveFile(req, res, filePath, status = 200) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(status, {
      'content-type': types[ext] || 'application/octet-stream',
      'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  let filePath = path.resolve(root, '.' + urlPath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      fs.stat(filePath, (e2, s2) => {
        if (e2 || !s2.isFile()) serveFile(req, res, path.join(root, 'index.html'));
        else serveFile(req, res, filePath);
      });
      return;
    }
    if (!err && stat.isFile()) {
      serveFile(req, res, filePath);
      return;
    }
    serveFile(req, res, path.join(root, 'index.html'));
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Serving iConnect mobile web build from ${root}`);
  console.log(`  Preview: http://0.0.0.0:${port}`);
});
