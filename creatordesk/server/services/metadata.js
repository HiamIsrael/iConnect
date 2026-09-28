import { buildVideoContext, normalizeOptions } from './context.js';
import { validateMetadata } from './validate.js';

/** Generate titles/chapters/description/tags/hashtags for one video. */
export async function generateMetadata({ ai, youtube }, videoId, body = {}) {
  const options = normalizeOptions(body);
  const context = await buildVideoContext(youtube, videoId, options);
  const result = await ai.complete('metadata', context);
  return validateMetadata(result);
}

export default generateMetadata;
