// Browser-only, in-memory demo. Uses the same orchestration and mock tools as
// the server; never calls a remote API or stores credentials.
import { createAgent } from '../server/services/agent.js';
import { createMockProvider as createAI } from '../server/providers/ai/mock.js';
import { createMockProvider as createYouTube } from '../server/providers/youtube/mock.js';
const ai = createAI(),
  youtube = createYouTube();
const values = new Map(),
  log = [];
const copy = (value) => JSON.parse(JSON.stringify(value));
const store = {
  async read(key, fallback = null) {
    return values.has(key) ? copy(values.get(key)) : fallback;
  },
  async write(key, value) {
    values.set(key, copy(value));
    return value;
  },
  async appendLog(entry) {
    log.push(copy(entry));
  },
  async readPublishLog() {
    return copy(log);
  },
};
const agent = createAgent({ ai, youtube, store });
window.fetch = async (url, options = {}) => {
  let result,
    status = 200;
  try {
    const body = options.body ? JSON.parse(options.body) : {};
    if (url === '/api/health') result = { youtube: 'mock', ai: { provider: 'mock' } };
    else if (url === '/api/channel') result = { channel: await youtube.getChannel(), mode: 'mock' };
    else if (url === '/api/videos') result = { videos: await youtube.listVideos() };
    else if (url === '/api/agent/chat') result = await agent.chat(body);
    else if (url === '/api/agent/activity') result = await agent.activity();
    else if (url.startsWith('/api/agent/approve/'))
      result = await agent.approve(url.split('/').pop(), body);
    else throw new Error('This offline demo does not support that operation.');
  } catch (error) {
    status = error.status || 400;
    result = { error: { message: error.message } };
  }
  return { ok: status === 200, status, json: async () => result };
};
