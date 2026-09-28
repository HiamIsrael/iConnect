import { notConfirmed, validationError } from '../errors.js';
import { buildVideoContext } from './context.js';
import { validateMetadata, validateThumbnails, validateAnalysis } from './validate.js';

/** Validate a publish patch against YouTube field limits. */
export function validatePublishPatch(body) {
  const patch = {};
  const updated = [];
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.length === 0 || body.title.length > 100) {
      throw validationError('title must be a string of 1-100 characters', { field: 'title' });
    }
    patch.title = body.title;
    updated.push('title');
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.length > 5000) {
      throw validationError('description must be a string of ≤5000 characters', { field: 'description' });
    }
    patch.description = body.description;
    updated.push('description');
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.length > 30 || body.tags.some((t) => typeof t !== 'string' || !t)) {
      throw validationError('tags must be an array of ≤30 non-empty strings', { field: 'tags' });
    }
    const total = body.tags.reduce((a, t) => a + t.length, 0);
    if (total > 500) throw validationError('tags must total ≤500 characters', { field: 'tags' });
    patch.tags = body.tags;
    updated.push('tags');
  }
  if (body.thumbnail !== undefined) {
    const t = body.thumbnail;
    if (typeof t !== 'string' || !t.startsWith('data:image/') || t.length > 4_000_000) {
      throw validationError('thumbnail must be a data:image/... URL', { field: 'thumbnail' });
    }
    patch.thumbnail = t;
    updated.push('thumbnail');
  }
  return { patch, updated };
}

/**
 * Publish approved metadata to the channel. Requires explicit `confirm: true`
 * (SPEC boundary: nothing ever writes to YouTube without a user click).
 * Every write is appended to the audit log.
 */
export async function publishVideo({ youtube, store }, videoId, body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw validationError('Request body must be a JSON object');
  }
  if (body.confirm !== true) throw notConfirmed();
  const { patch, updated } = validatePublishPatch(body);
  if (updated.length === 0) {
    throw validationError('Nothing to publish: provide at least one of title, description, tags, thumbnail');
  }

  // Ensure the video exists (NOT_FOUND propagates) before any write.
  await youtube.getVideo(videoId);

  const { thumbnail, ...videoPatch } = patch;
  if (Object.keys(videoPatch).length > 0) await youtube.updateVideo(videoId, videoPatch);
  if (thumbnail) await youtube.setThumbnail(videoId, thumbnail);

  await store.appendLog({
    at: new Date().toISOString(),
    videoId,
    mode: youtube.mode || youtube.id,
    updated,
  });

  return { published: true, mode: youtube.mode || youtube.id, updated };
}

/** Compose a copy-paste bundle of every generated asset for one video. */
export async function exportBundle({ ai, youtube }, videoId) {
  const context = await buildVideoContext(youtube, videoId, {});
  const [metadata, thumbnails, analysis] = await Promise.all([
    ai.complete('metadata', context).then(validateMetadata),
    ai.complete('thumbnails', context).then(validateThumbnails),
    ai.complete('analysis', context).then(validateAnalysis),
  ]);
  const json = {
    video: { id: context.video.id, title: context.video.title, duration: context.video.duration },
    metadata,
    thumbnails: { briefs: thumbnails.briefs, prompts: thumbnails.prompts },
    analysis,
  };
  return { markdown: renderExportMarkdown(json), json };
}

export function renderExportMarkdown(json) {
  const { video, metadata, thumbnails, analysis } = json;
  const lines = [
    `# ${video.title} — CreatorDesk bundle`,
    '',
    '## Title options',
    ...metadata.titles.map((t, i) => `${i + 1}. **${t.text}** (${Math.round(t.score * 100)}) — ${t.rationale}`),
    '',
    '## Description',
    '```text',
    metadata.description,
    '```',
    '',
    '## Chapters',
    ...metadata.chapters.map((c) => `- ${c.time} ${c.label}`),
    '',
    '## Tags',
    metadata.tags.join(', '),
    '',
    '## Hashtags',
    metadata.hashtags.join(' '),
    '',
    '## Thumbnail briefs',
    ...thumbnails.briefs.flatMap((b, i) => [
      `### ${i + 1}. ${b.concept}`,
      `- Hook: ${b.hookText}`,
      `- Layout: ${b.layout}`,
      `- Colors: ${b.colors.join(', ')}`,
      `- Composition: ${b.composition}`,
      `- Mood: ${b.mood}`,
      `- Prompt: ${thumbnails.prompts[i]?.prompt || ''}`,
      '',
    ]),
    '## Analysis',
    `### Summary`,
    analysis.summary,
    '',
    '### Strengths',
    ...analysis.strengths.map((s) => `- ${s}`),
    '',
    '### Weaknesses',
    ...analysis.weaknesses.map((s) => `- ${s}`),
    '',
    '### Improvements',
    ...analysis.improvements.map((imp) => `- **${imp.area}** (${imp.impact}/${imp.effort}): ${imp.suggestion}`),
    '',
    `### SEO score: ${analysis.seo.score}/100`,
    ...analysis.seo.checks.map((c) => `- [${c.passed ? 'x' : ' '}] ${c.name}: ${c.detail}`),
    '',
    '### Retention',
    `- Hook: ${analysis.retention.hook}`,
    `- Structure: ${analysis.retention.structure}`,
    `- Pacing: ${analysis.retention.pacing}`,
  ];
  return lines.join('\n');
}
