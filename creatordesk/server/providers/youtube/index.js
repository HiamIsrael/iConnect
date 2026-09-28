import { createMockProvider } from './mock.js';

/**
 * YouTube provider registry. Providers expose:
 *   id, mode ('mock' | 'live'),
 *   getChannel() → channel card,
 *   listVideos() → video list (newest first, no transcripts),
 *   getVideo(id) → detail incl. transcript segments,
 *   updateVideo(id, { title?, description?, tags? }) → updated detail,
 *   setThumbnail(id, dataUrl) → updated detail.
 * Unknown ids throw ApiError NOT_FOUND.
 */
export function getYoutubeProvider(cfg) {
  const id = String(cfg?.youtube?.provider || 'mock').toLowerCase();
  switch (id) {
    case 'mock':
      return createMockProvider();
    default:
      throw new Error(`Unknown YouTube provider: ${id}`);
  }
}

export default getYoutubeProvider;
