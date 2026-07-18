import express from 'express';
import path from 'path';
import history from 'connect-history-api-fallback';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// ── API Proxy ─────────────────────────────────────────────────
// Forward /api/* requests to the backend service.
// This is a server-side safety net: even if VITE_API_BASE_URL is
// misconfigured at build time, relative /api calls still reach the backend.
const BACKEND_URL = process.env.BACKEND_URL || 'https://stacksave-round2-backend.onrender.com';
const backendUrl = new URL(BACKEND_URL);
const isHttps = backendUrl.protocol === 'https:';
const transport = isHttps ? https : http;

app.use('/api', (req, res) => {
  const targetPath = `/api${req.url}`;
  const options = {
    hostname: backendUrl.hostname,
    port: backendUrl.port || (isHttps ? 443 : 80),
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: backendUrl.hostname,
    },
  };

  const proxyReq = transport.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[Proxy Error]', err.message);
    res.status(502).json({ success: false, error: 'Backend unreachable' });
  });

  req.pipe(proxyReq, { end: true });
});

// ── SPA Fallback ─────────────────────────────────────────────
// Must come AFTER the /api proxy so API routes aren't swallowed
app.use(history());

// Serve static files from dist directory with correct MIME types
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  },
}));

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`API proxying to: ${BACKEND_URL}`);
});
