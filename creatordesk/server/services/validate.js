import { providerError } from '../errors.js';

function fail(message, details) {
  throw providerError(`AI provider returned an invalid result: ${message}`, details);
}

function requireString(value, field, { max = 5000, min = 1 } = {}) {
  if (typeof value !== 'string' || value.length < min || value.length > max) fail(`${field} must be a string`, { field });
}

function requireStringArray(value, field, { min = 1, max = 50, prefix } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    fail(`${field} must be an array of ${min}-${max} strings`, { field });
  }
  for (const [i, item] of value.entries()) {
    requireString(item, `${field}[${i}]`);
    if (prefix && !item.startsWith(prefix)) fail(`${field}[${i}] must start with "${prefix}"`, { field });
  }
}

export function validateMetadata(result) {
  if (!result || typeof result !== 'object') fail('metadata must be an object');
  const { titles, description, chapters, tags, hashtags } = result;
  if (!Array.isArray(titles) || titles.length < 3 || titles.length > 10) fail('titles must be an array of 3-10 items');
  for (const [i, t] of titles.entries()) {
    if (!t || typeof t !== 'object') fail(`titles[${i}] must be an object`);
    requireString(t.text, `titles[${i}].text`, { max: 120 });
    requireString(t.rationale, `titles[${i}].rationale`, { max: 500 });
    if (typeof t.score !== 'number' || t.score < 0 || t.score > 1) fail(`titles[${i}].score must be 0-1`);
  }
  requireString(description, 'description');
  if (!Array.isArray(chapters)) fail('chapters must be an array');
  for (const [i, c] of chapters.entries()) {
    if (!c || typeof c !== 'object') fail(`chapters[${i}] must be an object`);
    requireString(c.time, `chapters[${i}].time`, { max: 12 });
    if (typeof c.seconds !== 'number' || c.seconds < 0) fail(`chapters[${i}].seconds must be a number ≥0`);
    requireString(c.label, `chapters[${i}].label`, { max: 80 });
  }
  requireStringArray(tags, 'tags', { min: 1, max: 30 });
  requireStringArray(hashtags, 'hashtags', { min: 1, max: 10, prefix: '#' });
  return result;
}

export function validateThumbnails(result) {
  if (!result || typeof result !== 'object') fail('thumbnails must be an object');
  const { briefs, prompts, images } = result;
  if (!Array.isArray(briefs) || briefs.length < 1 || briefs.length > 6) fail('briefs must be an array of 1-6 items');
  for (const [i, b] of briefs.entries()) {
    if (!b || typeof b !== 'object') fail(`briefs[${i}] must be an object`);
    for (const key of ['concept', 'hookText', 'layout', 'colors', 'composition', 'mood']) {
      if (key === 'colors') {
        if (!Array.isArray(b.colors) || b.colors.length === 0) fail(`briefs[${i}].colors must be a non-empty array`);
      } else {
        requireString(b[key], `briefs[${i}].${key}`, { max: 600 });
      }
    }
  }
  if (!Array.isArray(prompts) || prompts.length < 1 || prompts.length > 6) fail('prompts must be an array of 1-6 items');
  for (const [i, p] of prompts.entries()) {
    if (!p || typeof p !== 'object') fail(`prompts[${i}] must be an object`);
    requireString(p.prompt, `prompts[${i}].prompt`, { min: 20, max: 4000 });
  }
  if (images !== undefined) {
    if (!Array.isArray(images)) fail('images must be an array when present');
    for (const [i, img] of images.entries()) {
      if (!img || typeof img !== 'object') fail(`images[${i}] must be an object`);
      requireString(img.dataUrl, `images[${i}].dataUrl`, { min: 20, max: 2_000_000 });
    }
  }
  return result;
}

export function validateAnalysis(result) {
  if (!result || typeof result !== 'object') fail('analysis must be an object');
  requireString(result.summary, 'summary', { max: 4000 });
  requireStringArray(result.strengths, 'strengths', { min: 1, max: 10 });
  requireStringArray(result.weaknesses, 'weaknesses', { min: 1, max: 10 });
  if (!Array.isArray(result.improvements) || result.improvements.length < 1 || result.improvements.length > 10) {
    fail('improvements must be an array of 1-10 items');
  }
  for (const [i, imp] of result.improvements.entries()) {
    if (!imp || typeof imp !== 'object') fail(`improvements[${i}] must be an object`);
    requireString(imp.area, `improvements[${i}].area`, { max: 120 });
    requireString(imp.suggestion, `improvements[${i}].suggestion`, { max: 1000 });
    if (!['high', 'medium', 'low'].includes(imp.impact)) fail(`improvements[${i}].impact must be high|medium|low`);
    if (!['small', 'medium', 'large'].includes(imp.effort)) fail(`improvements[${i}].effort must be small|medium|large`);
  }
  if (!result.seo || typeof result.seo !== 'object') fail('seo must be an object');
  if (typeof result.seo.score !== 'number' || result.seo.score < 0 || result.seo.score > 100) fail('seo.score must be 0-100');
  if (!Array.isArray(result.seo.checks) || result.seo.checks.length < 1) fail('seo.checks must be a non-empty array');
  for (const [i, c] of result.seo.checks.entries()) {
    if (!c || typeof c !== 'object') fail(`seo.checks[${i}] must be an object`);
    requireString(c.name, `seo.checks[${i}].name`, { max: 120 });
    if (typeof c.passed !== 'boolean') fail(`seo.checks[${i}].passed must be boolean`);
    requireString(c.detail, `seo.checks[${i}].detail`, { max: 600 });
  }
  if (!result.retention || typeof result.retention !== 'object') fail('retention must be an object');
  requireString(result.retention.hook, 'retention.hook', { max: 1000 });
  requireString(result.retention.structure, 'retention.structure', { max: 1000 });
  requireString(result.retention.pacing, 'retention.pacing', { max: 1000 });
  return result;
}

export function validateInsights(result) {
  if (!result || typeof result !== 'object') fail('insights must be an object');
  if (!result.overview || typeof result.overview !== 'object') fail('overview must be an object');
  if (!Array.isArray(result.performance) || result.performance.length < 1) fail('performance must be a non-empty array');
  for (const [i, p] of result.performance.entries()) {
    if (!p || typeof p !== 'object') fail(`performance[${i}] must be an object`);
    requireString(p.metric, `performance[${i}].metric`, { max: 160 });
    requireString(String(p.value), `performance[${i}].value`, { max: 200 });
    requireString(p.note, `performance[${i}].note`, { max: 600 });
  }
  requireStringArray(result.whatWorks, 'whatWorks', { min: 1, max: 10 });
  requireStringArray(result.opportunities, 'opportunities', { min: 1, max: 10 });
  if (!Array.isArray(result.roadmap) || result.roadmap.length < 1) fail('roadmap must be a non-empty array');
  for (const [i, r] of result.roadmap.entries()) {
    if (!r || typeof r !== 'object') fail(`roadmap[${i}] must be an object`);
    if (typeof r.priority !== 'number') fail(`roadmap[${i}].priority must be a number`);
    requireString(r.action, `roadmap[${i}].action`, { max: 1000 });
    requireString(r.why, `roadmap[${i}].why`, { max: 1000 });
    if (!['small', 'medium', 'large'].includes(r.effort)) fail(`roadmap[${i}].effort must be small|medium|large`);
  }
  return result;
}
