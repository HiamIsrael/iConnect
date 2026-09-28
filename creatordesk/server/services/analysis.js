import { buildVideoContext, normalizeOptions } from './context.js';
import { validateAnalysis } from './validate.js';

/** Per-video analysis: summary, strengths/weaknesses, improvements, SEO, retention. */
export async function analyzeVideo({ ai, youtube }, videoId, body = {}) {
  const options = normalizeOptions(body);
  const context = await buildVideoContext(youtube, videoId, options);
  const result = await ai.complete('analysis', context);
  return validateAnalysis(result);
}

export default analyzeVideo;
