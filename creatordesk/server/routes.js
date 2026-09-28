import express from 'express';
import { config } from './config.js';
import { notFound, ah } from './errors.js';
import { generateMetadata } from './services/metadata.js';
import { generateThumbnails } from './services/thumbnails.js';
import { analyzeVideo } from './services/analysis.js';
import { channelInsights } from './services/channel.js';

/**
 * API router. Dependencies (providers) are injected so tests can swap them.
 * All responses are JSON; errors use the structured shape from server/errors.js.
 */
export function createApiRouter({ ai, youtube }) {
  const router = express.Router();
  const deps = { ai, youtube };

  router.get('/health', (req, res) => {
    res.json({
      ok: true,
      name: config.name,
      version: config.version,
      youtube: youtube.id,
      ai: {
        provider: ai.id,
        supportsImages: Boolean(ai.supportsImages),
      },
    });
  });

  router.get('/channel', ah(async (req, res) => {
    const channel = await youtube.getChannel();
    res.json({ channel, mode: youtube.mode || youtube.id });
  }));

  router.get('/videos', ah(async (req, res) => {
    const videos = await youtube.listVideos();
    res.json({ videos });
  }));

  router.get('/videos/:id', ah(async (req, res) => {
    const video = await youtube.getVideo(req.params.id);
    res.json({ video });
  }));

  router.post('/videos/:id/metadata', ah(async (req, res) => {
    res.json(await generateMetadata(deps, req.params.id, req.body));
  }));

  router.post('/videos/:id/thumbnails', ah(async (req, res) => {
    res.json(await generateThumbnails(deps, req.params.id, req.body));
  }));

  router.post('/videos/:id/analyze', ah(async (req, res) => {
    res.json(await analyzeVideo(deps, req.params.id, req.body));
  }));

  router.get('/channel/insights', ah(async (req, res) => {
    res.json(await channelInsights(deps));
  }));

  // Unknown API routes → structured 404.
  router.use((req, res, next) => {
    next(notFound(`No such endpoint: ${req.method} ${req.baseUrl}${req.path}`));
  });

  return router;
}

export default createApiRouter;
