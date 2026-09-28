import { validateInsights } from './validate.js';

/** Channel-level insights + prioritized roadmap. */
export async function channelInsights({ ai, youtube }) {
  const [channel, videos] = await Promise.all([youtube.getChannel(), youtube.listVideos()]);
  const result = await ai.complete('insights', { channel, videos });
  return validateInsights(result);
}

export default channelInsights;
