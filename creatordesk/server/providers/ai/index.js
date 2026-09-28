import { createMockProvider } from './mock.js';

/**
 * AI provider registry. Providers expose:
 *   id, supportsImages,
 *   complete(task, context) → canonical JSON per task
 *     ('metadata' | 'thumbnails' | 'analysis' | 'insights'),
 *   generateImage({ prompt, brief }) → { dataUrl, mime }
 */
export function getAiProvider(cfg) {
  const id = String(cfg?.ai?.provider || 'mock').toLowerCase();
  switch (id) {
    case 'mock':
      return createMockProvider();
    default:
      throw new Error(`Unknown AI provider: ${id}`);
  }
}

export default getAiProvider;
