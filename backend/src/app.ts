// ============================================================
// Express App — StackSave AI Audit & Stack Builder Backend
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { connectDB, getFrontendUrl } from './services/dbService';
import auditRouter from './routes/audit';
import leadsRouter from './routes/leads';
import healthRouter from './routes/health';
import chatRouter from './routes/chat';
import stackBuilderRouter from './routes/stackBuilder';
import intelligenceRouter from './routes/intelligence';
import adminRouter from './routes/admin';
import { globalLimiter, leadLimiter } from './middleware/rateLimit';
import { requestLogger } from './middleware/logger';
import { findAvailablePort } from './utils/port';
import { PricingOverlayService } from './pricing/pricingOverlay';

const app = express();
const preferredPort = Number(process.env.PORT) || 5000;
const FRONTEND_URL = getFrontendUrl();
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Trust Proxy (Render / cloud reverse proxy) ───────────────
// Required so express-rate-limit uses the real client IP
// instead of the proxy's IP (which would rate-limit ALL users together).
app.set('trust proxy', 1);

// ── CORS (Must be mounted first to handle all preflights & error responses) ──
const cleanFrontendUrl = FRONTEND_URL.replace(/\/+$/, '');
const allowedOrigins = [
  cleanFrontendUrl,
  'https://stacksaveai.com',
  'https://www.stacksaveai.com',
  'https://stacksave-ai-audit.onrender.com',
  'https://stacksave-frontend.onrender.com',
  'https://stacksave-round2-frontend.onrender.com',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      // In development or test, allow all localhost and 127.0.0.1 ports (5173, 5174, 3000, etc.)
      if (NODE_ENV !== 'production') {
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');

      // Check explicit allowed origins list and domain wildcards
      if (
        allowedOrigins.map((o) => o.replace(/\/+$/, '')).includes(normalizedOrigin) ||
        normalizedOrigin === 'https://stacksaveai.com' ||
        normalizedOrigin === 'https://www.stacksaveai.com' ||
        normalizedOrigin.endsWith('.stacksaveai.com') ||
        normalizedOrigin.endsWith('.onrender.com')
      ) {
        return callback(null, true);
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Audit-Token'],
    optionsSuccessStatus: 200,
  })
);

// ── Security Headers ─────────────────────────────────────────
app.use(helmet());

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // 10kb max — audits are small
app.use(express.urlencoded({ extended: true }));

// ── Request Logging ──────────────────────────────────────────
app.use(requestLogger);

// ── Global Rate Limiting ─────────────────────────────────────
app.use(globalLimiter);

// ── Routes ────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/audits', auditRouter);
app.use('/api/leads', leadLimiter, leadsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/stack-builder', stackBuilderRouter);
app.use('/api/intelligence', intelligenceRouter);
app.use('/api/admin', adminRouter);

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});



// ── Start ─────────────────────────────────────────────────────
async function start() {
  await connectDB();

  // ── Apply DB-verified pricing to recommendation engine ────
  // This is the critical link: VERIFIED prices from MongoDB patch
  // the KnowledgeLoader in-memory cache so audits use live pricing.
  // Runs on every cold start; re-runs after each sync completes.
  PricingOverlayService.applyVerifiedPricing().catch((err) => {
    // Non-fatal: server starts with static plans if DB overlay fails
    console.error('[PricingOverlay] Startup overlay failed — using static plans:', err);
  });

  const PORT = await findAvailablePort(preferredPort);
  app.listen(PORT, () => {
    const serverUrl = NODE_ENV === 'production' ? `https://api.stacksaveai.com` : `http://localhost:${PORT}`;
    console.log(`🚀 StackSave API running at ${serverUrl}`);

    console.log(`   Health: ${serverUrl}/api/health`);
    console.log(`   Environment: ${NODE_ENV}`);
  });
}

start();

export default app; // for testing
