import express from 'express';
import path from 'node:path';
import { config } from './config.js';
import { ApiError, notFound } from './errors.js';

// Re-export the structured error helpers (single source: server/errors.js).
export { ApiError, notFound, validationError, providerError } from './errors.js';

/** Wrap an async route handler so thrown ApiErrors reach the error middleware. */
export function ah(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Build the CreatorDesk express app. Does not listen — `server/index.js`
 * (or tests) decide that.
 */
export function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      name: config.name,
      version: config.version,
      youtube: config.youtube.provider,
      ai: {
        provider: config.ai.provider,
        supportsImages: config.ai.provider === 'mock' || config.ai.provider === 'openai' || config.ai.provider === 'gemini',
      },
    });
  });

  // Unknown API routes → structured 404.
  app.use('/api', (req, res, next) => {
    next(notFound(`No such endpoint: ${req.method} ${req.path}`));
  });

  // Static web workbench (no-build vanilla UI). Fallback to index.html for
  // client-side view routing; /api/* is already handled above.
  app.use(express.static(config.webDir));
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    res.sendFile(path.join(config.webDir, 'index.html'), (err) => {
      if (err) next();
    });
  });

  // Unified error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'Unexpected error';
    if (status >= 500 && config.env !== 'test') {
      console.error('[creatordesk]', err);
    }
    res.status(status).json({ error: { code, message, ...(err.details ? { details: err.details } : {}) } });
  });

  return app;
}

export default createApp;
