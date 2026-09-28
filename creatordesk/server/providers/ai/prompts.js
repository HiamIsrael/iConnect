import { providerError } from '../../errors.js';

const SYSTEM = `You are CreatorDesk, an expert YouTube metadata writer and channel strategist.
You always respond with ONE JSON object (no markdown, no commentary) that exactly matches the requested schema.
Ground every output in the provided video content — never invent facts that contradict the transcript.`;

const TASK_INSTRUCTIONS = {
  metadata: `Task: generate video metadata.
JSON schema:
{
  "titles": [{ "text": string (≤70 chars), "rationale": string, "score": number 0-1 }]  // exactly 5,
  "description": string  // hook paragraph, then "⏱ Chapters" block with "M:SS label" lines (first must be 0:00), then body, then hashtags,
  "chapters": [{ "time": "M:SS", "seconds": number, "label": string (≤60 chars) }]  // 3-8, first at 0:00,
  "tags": [string]  // 10-20, relevance-ordered,
  "hashtags": [string]  // 3-5, each starting with '#'
}`,
  thumbnails: `Task: generate thumbnail concepts.
JSON schema:
{
  "briefs": [{ "concept": string, "hookText": string (≤5 words), "layout": string, "colors": [string hex], "composition": string, "mood": string }]  // exactly 3,
  "prompts": [{ "prompt": string (detailed image-model prompt), "for": string }]  // exactly 3
}`,
  analysis: `Task: analyze this video's content and packaging.
JSON schema:
{
  "summary": string  // 2-4 sentences,
  "strengths": [string]  // 3-5,
  "weaknesses": [string]  // 3-5,
  "improvements": [{ "area": string, "suggestion": string, "impact": "high"|"medium"|"low", "effort": "small"|"medium"|"large" }]  // 3-6,
  "seo": { "score": number 0-100, "checks": [{ "name": string, "passed": boolean, "detail": string }] }  // 5+ checks,
  "retention": { "hook": string, "structure": string, "pacing": string }
}`,
  insights: `Task: analyze this YouTube channel and produce an improvement roadmap.
JSON schema:
{
  "overview": { "channel": string, "cadence": string, "avgViews": number, "subscriberCount": number, "topTopics": [string] },
  "performance": [{ "metric": string, "value": string, "trend": "rising"|"steady"|"falling", "note": string }]  // 3-5,
  "whatWorks": [string]  // 2-5,
  "opportunities": [string]  // 2-5,
  "roadmap": [{ "priority": number, "action": string, "why": string, "effort": "small"|"medium"|"large" }]  // 3-6, priority ascending
}`,
};

export function buildPrompt(task, context = {}) {
  const instruction = TASK_INSTRUCTIONS[task];
  if (!instruction) throw new Error(`Unknown task: ${task}`);
  return {
    system: SYSTEM,
    user: `${instruction}\n\nVideo/channel context (JSON):\n${JSON.stringify(context, null, 2)}\n\nRespond with the JSON object only.`,
  };
}

/** Extract a JSON object from model output (tolerates code fences and prose). */
export function parseModelJson(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw providerError('AI provider returned an empty response');
  }
  const stripped = text
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw providerError('AI provider returned malformed JSON');
  }
}
