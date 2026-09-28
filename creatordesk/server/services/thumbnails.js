import { buildVideoContext, normalizeOptions, normalizeVariants } from './context.js';
import { validateThumbnails } from './validate.js';

/** Generate thumbnail briefs, image-model prompts, and images (when supported). */
export async function generateThumbnails({ ai, youtube }, videoId, body = {}) {
  const options = normalizeOptions(body);
  const variants = normalizeVariants(body);
  const context = await buildVideoContext(youtube, videoId, options);
  const result = validateThumbnails(await ai.complete('thumbnails', context));
  // Honor the requested variant count (works for any provider).
  return {
    briefs: result.briefs.slice(0, variants),
    prompts: result.prompts.slice(0, variants),
    ...(result.images ? { images: result.images.slice(0, variants) } : {}),
  };
}

export default generateThumbnails;
