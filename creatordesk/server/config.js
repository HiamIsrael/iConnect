import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function bool(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const AI_PROVIDERS = ['mock', 'openai', 'anthropic', 'gemini'];
const YT_PROVIDERS = ['mock', 'live'];

function pick(value, allowed, fallback) {
  const v = String(value || '').toLowerCase();
  return allowed.includes(v) ? v : fallback;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  name: 'creatordesk',
  version: '0.1.0',
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.CREATORDESK_PORT || process.env.PORT) || 4180,
  root: ROOT,
  webDir: path.join(ROOT, 'web'),
  dataDir: process.env.CREATORDESK_DATA_DIR || path.join(ROOT, '.data'),
  ai: {
    provider: pick(process.env.CREATORDESK_AI_PROVIDER, AI_PROVIDERS, 'mock'),
    openaiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    openaiImageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
    geminiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
  youtube: {
    provider: pick(process.env.CREATORDESK_YOUTUBE, YT_PROVIDERS, 'mock'),
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || '',
    apiKey: process.env.YOUTUBE_API_KEY || '',
    timeoutMs: Number(process.env.CREATORDESK_HTTP_TIMEOUT_MS) || 15000,
  },
};

export default config;
