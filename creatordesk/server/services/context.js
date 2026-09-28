import { validationError, notFound } from '../errors.js';

function str(value, field, { max = 2000, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw validationError(`${field} is required`);
    return '';
  }
  if (typeof value !== 'string') throw validationError(`${field} must be a string`, { field });
  if (value.length > max) throw validationError(`${field} must be ≤${max} characters`, { field });
  return value.trim();
}

/** Normalize request options shared by all generation tasks. */
export function normalizeOptions(body = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw validationError('Request body must be a JSON object');
  }
  const notes = str(body.notes, 'notes', { max: 4000 });
  const tone = str(body.tone, 'tone', { max: 200 });

  let keywords = [];
  if (body.keywords !== undefined && body.keywords !== null && body.keywords !== '') {
    if (Array.isArray(body.keywords)) {
      keywords = body.keywords.map((k, i) => str(k, `keywords[${i}]`, { max: 60, required: true }));
    } else if (typeof body.keywords === 'string') {
      keywords = body.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    } else {
      throw validationError('keywords must be an array of strings or a comma-separated string', { field: 'keywords' });
    }
    if (keywords.length > 10) throw validationError('keywords accepts at most 10 entries', { field: 'keywords' });
  }
  return { notes, tone, keywords };
}

export function normalizeVariants(body = {}) {
  const v = body.variants === undefined ? 3 : body.variants;
  if (!Number.isInteger(v) || v < 1 || v > 4) {
    throw validationError('variants must be an integer between 1 and 4', { field: 'variants' });
  }
  return v;
}

/** Assemble the AI context for one video (throws NOT_FOUND for unknown ids). */
export async function buildVideoContext(youtube, videoId, options = {}) {
  let video;
  try {
    video = await youtube.getVideo(videoId);
  } catch (err) {
    if (err && err.code === 'NOT_FOUND') throw notFound(`No such video: ${videoId}`);
    throw err;
  }
  const { transcript, ...videoMeta } = video;
  const segments = Array.isArray(transcript?.segments) ? transcript.segments : [];
  return {
    video: videoMeta,
    transcript: segments,
    notes: options.notes || '',
    tone: options.tone || '',
    keywords: options.keywords || [],
  };
}
