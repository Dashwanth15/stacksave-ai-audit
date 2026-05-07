// ============================================================
// Request Logger Middleware — StackSave AI Audit
//
// Lightweight structured logging for API requests.
// Logs method, path, status code, and response time.
// Useful for debugging and observability without a full
// logging library like Pino (which can be added at scale).
// ============================================================

import { Request, Response, NextFunction } from 'express';

/**
 * Logs each API request with method, path, status, and duration.
 * Uses colored output in development for readability.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, path } = req;

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor =
      status >= 500 ? '🔴' :
      status >= 400 ? '🟡' :
      status >= 300 ? '🔵' : '🟢';

    console.log(
      `${statusColor} ${method} ${path} → ${status} (${duration}ms)`
    );
  });

  next();
}
