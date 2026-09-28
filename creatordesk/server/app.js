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
export function createApp({ ai, youtube, store } = {}) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const aiProvider = ai || getAiProvider(config);
  const youtubeProvider = youtube || getYoutubeProvider(config);
  const storeImpl = store || createStore(config.dataDir);

  app.use('/api', createApiRouter({ ai: aiProvider, youtube: youtubeProvider, store: storeImpl }));

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
