import { timingSafeEqual } from 'node:crypto';
import express from 'express';
import path from 'node:path';
import { config } from './config.js';
import { getAiProvider } from './providers/ai/index.js';
import { getYoutubeProvider } from './providers/youtube/index.js';
import { createStore } from './store.js';
import { createApiRouter } from './routes.js';

// Re-export the structured error helpers (single source: server/errors.js).
export { ApiError, notFound, validationError, providerError, ah } from './errors.js';

/**
 * Build the CreatorDesk express app. Does not listen — `server/index.js`
 * (or tests) decide that. Providers are resolved from config unless injected
 * (tests may pass stubs).
 */
export function createApp({ ai, youtube, store, accessToken = process.env.CREATORDESK_ACCESS_TOKEN } = {}) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const aiProvider = ai || getAiProvider(config);
  const youtubeProvider = youtube || getYoutubeProvider(config);
  const storeImpl = store || createStore(config.dataDir);

  const restricted = youtubeProvider.id !== 'mock' || aiProvider.id !== 'mock';
  if (restricted && (!accessToken || accessToken.length < 16)) throw new Error('Set CREATORDESK_ACCESS_TOKEN (at least 16 characters) before enabling live providers');
  app.use('/api', (req, res, next) => {
    if (!restricted || req.path === '/health') return next();
    const expected = Buffer.from(`Bearer ${accessToken}`);
    const actual = Buffer.from(req.headers.authorization || '');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Operator access token required.' } });
    next();
  });
  app.use('/api', createApiRouter({ ai: aiProvider, youtube: youtubeProvider, store: storeImpl }));

  // Static web workbench (no-build vanilla UI). Fallback to index.html for
  // client-side view routing; /api/* is already handled above.
  app.get('/GO-LIVE.md', (req, res) => res.type('text/plain').sendFile(path.join(config.root, 'GO-LIVE.md')));
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
