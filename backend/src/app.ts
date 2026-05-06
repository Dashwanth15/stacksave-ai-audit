// ============================================================
// Express App — StackSave AI Audit Backend
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { connectDB } from './services/dbService';
import auditRouter from './routes/audit';
import leadsRouter from './routes/leads';
import healthRouter from './routes/health';

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

// ── Global Rate Limiting ─────────────────────────────────────
// 100 requests per 15 minutes per IP — generous for real users,
// blocks automated abuse. Documented in README.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ── Stricter limit for audit creation ────────────────────────
const auditLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 audits/hour per IP — enough for testing, blocks spam
  message: { success: false, error: 'Too many audits created. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/audits', auditLimiter, auditRouter);
app.use('/api/leads', leadsRouter);

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
