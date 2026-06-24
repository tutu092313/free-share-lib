// 零依赖静态文件服务器（为网站提供本地预览）
// 用法：node server.js [port]
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT || process.argv[2] || '7821', 10);
const ROOT = __dirname;

// MIME 类型
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.md':   'text/markdown; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.map':  'application/json',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.eot':   'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname || '/');

  // 安全：禁止跳出 ROOT
  const safePath = path.normalize(pathname).replace(/^([\\/]\.\.)+/, '');
  let filePath = path.join(ROOT, safePath);

  // 路径越界 → 返回 403
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  // 目录 → 找 index.html
  fs.stat(filePath, (err, stat) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found: ' + pathname);
    }
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 Not Found: ' + pathname);
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(data);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 静态服务器已启动`);
  console.log(`   本地访问：http://localhost:${PORT}/`);
  console.log(`   局域网访问：http://0.0.0.0:${PORT}/`);
  console.log(`   根目录：${ROOT}`);
  console.log(`   按 Ctrl+C 停止\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${PORT} 已被占用！`);
    console.error(`   解决：先杀掉占用进程（Windows: netstat -ano | findstr :${PORT}），或换个端口：node server.js 8000`);
  } else {
    console.error('服务器错误：', err);
  }
  process.exit(1);
});
