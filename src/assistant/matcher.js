import {
  GUIDE_DESTINATIONS,
  GUIDE_FALLBACK,
  GUIDE_INTENTS,
} from './knowledge.js';

const MIN_CONFIDENCE = 0.6;

export function normalizeGuideInput(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreIntent(intent, input, currentPath) {
  const phraseScore = intent.phrases.reduce((best, phrase) => {
    if (!input.includes(phrase)) return best;
    const coverage = phrase.length / Math.max(input.length, phrase.length);
    return Math.max(best, 0.78 + (coverage * 0.12));
  }, 0);

  const tokens = new Set(input.split(' '));
  const matchedKeywords = intent.keywords.filter((keyword) => {
    const normalizedKeyword = normalizeGuideInput(keyword);
    return normalizedKeyword.split(' ').every((part) => tokens.has(part) || input.includes(part));
  });
  const keywordScore = matchedKeywords.length / Math.max(intent.keywords.length, 1);
  const contextBonus = intent.contextPaths.some((path) => currentPath === path || currentPath.startsWith(`${path}/`)) ? 0.08 : 0;

  return Math.min(0.99, (phraseScore * 0.82) + (keywordScore * 0.18) + contextBonus);
}

function safeIntentResult(intent, confidence) {
  const action = GUIDE_DESTINATIONS.has(intent.action.path) ? intent.action : GUIDE_FALLBACK.action;
  return {
    kind: 'answer',
    intentId: intent.id,
    confidence: Number(confidence.toFixed(3)),
    answer: intent.answer,
    action,
    suggestions: intent.suggestions,
  };
}

export function matchGuideIntent(value, { currentPath = '/' } = {}) {
  const input = normalizeGuideInput(value);
  if (!input) return { ...GUIDE_FALLBACK };

  const ranked = GUIDE_INTENTS
    .map((intent) => ({ intent, score: scoreIntent(intent, input, currentPath) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];

  if (!best || best.score < MIN_CONFIDENCE) return { ...GUIDE_FALLBACK };
  return safeIntentResult(best.intent, best.score);
}

export { GUIDE_DESTINATIONS, GUIDE_INTENTS, MIN_CONFIDENCE };
