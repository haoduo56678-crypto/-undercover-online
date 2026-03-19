const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const publicRoot = root;
const contentFile = path.join(root, 'content', 'site-content.json');
const port = Number(process.env.ADMIN_PORT || 4173);
const adminPassword = process.env.ADMIN_PASSWORD || 'change-me';
const sessions = new Map();

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function loadContent() {
  return JSON.parse(fs.readFileSync(contentFile, 'utf8'));
}

function saveContent(content) {
  fs.writeFileSync(contentFile, JSON.stringify(content, null, 2) + '\n');
}

function isAuthorized(req) {
  const token = req.headers['x-admin-token'];
  if (!token) return false;
  return sessions.has(token);
}

function safeJoin(base, targetPath) {
  const resolved = path.normalize(path.join(base, targetPath));
  return resolved.startsWith(base) ? resolved : null;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8'
  }[ext] || 'application/octet-stream';
}

function serveStatic(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = safeJoin(publicRoot, decodeURIComponent(requestPath.split('?')[0]));
  if (!filePath) return sendJson(res, 400, { ok: false, error: 'Bad path.' });

  let resolvedPath = filePath;
  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
    resolvedPath = path.join(resolvedPath, 'index.html');
  }

  if (!fs.existsSync(resolvedPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, { 'Content-Type': contentType(resolvedPath) });
  fs.createReadStream(resolvedPath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/admin-api/login') {
      const body = JSON.parse(await readBody(req) || '{}');
      if ((body.password || '') !== adminPassword) {
        return sendJson(res, 401, { ok: false, error: 'Incorrect password.' });
      }
      const token = crypto.randomBytes(24).toString('hex');
      sessions.set(token, Date.now());
      return sendJson(res, 200, { ok: true, token });
    }

    if (req.url === '/admin-api/content') {
      if (!isAuthorized(req)) {
        return sendJson(res, 401, { ok: false, error: 'Unauthorized.' });
      }

      if (req.method === 'GET') {
        return sendJson(res, 200, { ok: true, content: loadContent() });
      }

      if (req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const content = {
          announcement: {
            enabled: !!body.announcement?.enabled,
            label: String(body.announcement?.label || '').slice(0, 30),
            title: String(body.announcement?.title || '').slice(0, 120),
            body: String(body.announcement?.body || '').slice(0, 1000),
            linkText: String(body.announcement?.linkText || '').slice(0, 80),
            linkUrl: String(body.announcement?.linkUrl || '').slice(0, 200)
          },
          terms: {
            title: String(body.terms?.title || 'Rules and Terms').slice(0, 120),
            intro: String(body.terms?.intro || '').slice(0, 500),
            items: Array.isArray(body.terms?.items) ? body.terms.items.map((item) => String(item).slice(0, 300)).filter(Boolean).slice(0, 30) : [],
            lastUpdated: String(body.terms?.lastUpdated || '').slice(0, 20)
          }
        };
        saveContent(content);
        return sendJson(res, 200, { ok: true, content });
      }
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || 'Server error.' });
  }
});

server.listen(port, () => {
  console.log(`Local admin server running at http://localhost:${port}`);
  console.log('Set ADMIN_PASSWORD before launch to change the default password.');
});
