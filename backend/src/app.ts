// ============================================================
// Express App — StackSave AI Audit Backend
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { connectDB } from './services/dbService';
import auditRouter from './routes/audit';
import leadsRouter from './routes/leads';
import healthRouter from './routes/health';
import { globalLimiter, auditLimiter, leadLimiter } from './middleware/rateLimit';
import { requestLogger } from './middleware/logger';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Security Headers ─────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // 10kb max — audits are small
app.use(express.urlencoded({ extended: true }));

// ── Request Logging ──────────────────────────────────────────
app.use(requestLogger);

// ── Global Rate Limiting ─────────────────────────────────────
app.use(globalLimiter);

// ── Routes ────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/audits', auditLimiter, auditRouter);
app.use('/api/leads', leadLimiter, leadsRouter);

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 StackSave API running at http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
}

start();

export default app; // for testing
