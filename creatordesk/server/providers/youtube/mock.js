import { notFound } from '../../errors.js';
import { DEMO_CHANNEL, DEMO_VIDEOS } from './demo-data.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Mock YouTube provider: an in-memory demo channel. Mutations (updateVideo /
 * setThumbnail) are recorded per provider instance so tests stay isolated.
 */
export function createMockProvider() {
  const channel = clone(DEMO_CHANNEL);
  const videos = new Map(clone(DEMO_VIDEOS).map((v) => [v.id, v]));

  function requireVideo(id) {
    const v = videos.get(id);
    if (!v) throw notFound(`No such video: ${id}`);
    return v;
  }

  return {
    id: 'mock',
    mode: 'mock',
    async getChannel() {
      return clone(channel);
    },
    async listVideos() {
      return [...videos.values()]
        .map(({ transcript, ...rest }) => clone(rest))
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    },
    async getVideo(id) {
      return clone(requireVideo(id));
    },
    async updateVideo(id, { title, description, tags } = {}) {
      const v = requireVideo(id);
      if (title !== undefined) v.title = String(title);
      if (description !== undefined) v.description = String(description);
      if (tags !== undefined) v.tags = tags.map((t) => String(t));
      return clone(v);
    },
    async setThumbnail(id, dataUrl) {
      const v = requireVideo(id);
      v.thumbnailUrl = String(dataUrl);
      return clone(v);
    },
  };
}

export default createMockProvider;
