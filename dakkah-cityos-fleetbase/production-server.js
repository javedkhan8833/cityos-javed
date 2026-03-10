const http = require('http');
const fs = require('fs');
const path = require('path');
const { createProxyServer } = require('http-proxy');

const PORT = 5000;
const API_PORT = 8000;
const DIST_DIR = path.join(__dirname, 'console', 'dist');

const proxy = createProxyServer({ target: `http://127.0.0.1:${API_PORT}` });

proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API server unavailable' }));
    }
});

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.map': 'application/json',
    '.webp': 'image/webp',
    '.txt': 'text/plain',
    '.xml': 'text/xml',
};

const API_PREFIXES = ['/api/', '/int/', '/auth/', '/webhook/', '/socket', '/broadcasting'];

function isApiRequest(url) {
    return API_PREFIXES.some(prefix => url.startsWith(prefix));
}

const server = http.createServer((req, res) => {
    if (isApiRequest(req.url)) {
        proxy.web(req, res);
        return;
    }

    let filePath = path.join(DIST_DIR, req.url.split('?')[0]);

    if (filePath.endsWith('/')) {
        filePath = path.join(filePath, 'index.html');
    }

    fs.stat(filePath, (err, stats) => {
        if (!err && stats.isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            const headers = { 'Content-Type': contentType };
            if (ext === '.html' || ext === '.json') {
                headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            } else {
                headers['Cache-Control'] = 'public, max-age=31536000, immutable';
            }

            res.writeHead(200, headers);
            fs.createReadStream(filePath).pipe(res);
        } else {
            const indexPath = path.join(DIST_DIR, 'index.html');
            res.writeHead(200, {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            });
            fs.createReadStream(indexPath).pipe(res);
        }
    });
});

server.on('upgrade', (req, socket, head) => {
    proxy.ws(req, socket, head);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Production server listening on port ${PORT}`);
    console.log(`Serving frontend from ${DIST_DIR}`);
    console.log(`Proxying API requests to port ${API_PORT}`);
});
