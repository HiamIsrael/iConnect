import { createMockProvider } from './mock.js';
import { createOpenAIProvider, createAnthropicProvider, createGeminiProvider } from './adapters.js';

/**
 * AI provider registry. Providers expose:
 *   id, supportsImages,
 *   complete(task, context) → canonical JSON per task
 *     ('metadata' | 'thumbnails' | 'analysis' | 'insights'),
 *   generateImage({ prompt, brief }) → { dataUrl, mime }
 */
export function getAiProvider(cfg, deps) {
  const id = String(cfg?.ai?.provider || 'mock').toLowerCase();
  switch (id) {
    case 'mock':
      return createMockProvider();
    case 'openai':
      return createOpenAIProvider(cfg, deps);
    case 'anthropic':
      return createAnthropicProvider(cfg, deps);
    case 'gemini':
      return createGeminiProvider(cfg, deps);
    default:
      throw new Error(`Unknown AI provider: ${id}`);
  }
}

export default getAiProvider;
