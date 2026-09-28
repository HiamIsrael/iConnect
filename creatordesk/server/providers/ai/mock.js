// Deterministic mock AI provider. Same input → byte-identical output.
// Pure helpers are exported for unit tests and reuse by live adapters later.

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'so', 'of', 'to', 'in',
  'on', 'at', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', 'do',
  'does', 'did', 'for', 'with', 'without', 'this', 'that', 'these', 'those',
  'it', 'its', 'you', 'your', 'we', 'our', 'us', 'i', 'my', 'me', 'he', 'she',
  'they', 'them', 'his', 'her', 'their', 'as', 'by', 'from', 'up', 'out',
  'about', 'into', 'over', 'after', 'before', 'how', 'what', 'why', 'when',
  'where', 'who', 'which', 'will', 'would', 'can', 'could', 'should', 'shall',
  'may', 'might', 'must', 'not', 'no', 'yes', 'than', 'too', 'very', 'just',
  'more', 'most', 'some', 'any', 'all', 'each', 'every', 'both', 'few',
  'many', 'much', 'such', 'here', 'there', 'today', 'welcome', 'back',
  'thanks', 'thank', 'watching', 'hello', 'hi', 'okay', 'right', 'now',
  // filler that pollutes titles/hashtags/chapters
  'actually', 'really', 'thing', 'things', 'need', 'needs', 'needed', 'want',
  'wants', 'make', 'makes', 'made', 'get', 'gets', 'got', 'use', 'used',
  'using', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'first', 'second', 'third', 'next', 'finally', 'simple',
  'simply', 'say', 'said', 'see', 'look', 'show', 'shows', 'shown', 'let',
  'lets', 'take', 'takes', 'give', 'gives', 'going', 'come', 'comes', 'ever',
  'everyone', 'someone', 'anything', 'everything', 'nothing', 'bit', 'lot',
]);

export function extractKeywords(text, { limit = 12 } = {}) {
  const tokens = String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  const freq = new Map();
  tokens.forEach((w, i) => {
    const entry = freq.get(w) || { count: 0, first: i };
    entry.count += 1;
    freq.set(w, entry);
  });
  return [...freq.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].first - b[1].first || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([w]) => w);
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function titleCase(text) {
  return String(text || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function firstSentence(text) {
  return String(text || '').split(/(?<=[.!?])\s+/)[0].trim();
}

function clampWords(text, maxChars) {
  const s = String(text || '').trim();
  if (s.length <= maxChars) return s;
  const cut = s.slice(0, maxChars - 1);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > 20 ? cut.slice(0, boundary) : cut).replace(/[\s,:;-]+$/, '')}…`;
}

function chapterLabel(texts) {
  const kws = extractKeywords(texts.join(' '), { limit: 2 });
  if (kws.length === 0) return 'Introduction';
  const label = kws.length === 1 ? titleCase(kws[0]) : `${titleCase(kws[0])}: ${titleCase(kws[1])}`;
  return clampWords(label, 60);
}

/**
 * Group transcript segments into 3-8 chapters. First chapter always starts
 * at 0:00 (YouTube chapter rules); later chapters at their segment start,
 * forced to ≥10s spacing and monotonic order.
 */
export function buildChapters(segments, { duration, minChapters = 3, maxChapters = 8 } = {}) {
  if (!Array.isArray(segments) || segments.length === 0) return [];
  const count = Math.min(maxChapters, Math.max(minChapters, Math.round(segments.length / 1.5)));
  const base = Math.floor(segments.length / count);
  const extra = segments.length % count;
  const groups = [];
  let idx = 0;
  for (let g = 0; g < count; g += 1) {
    const size = base + (g < extra ? 1 : 0);
    groups.push(segments.slice(idx, idx + size));
    idx += size;
  }

  const chapters = [];
  let prev = -10;
  groups.forEach((group, g) => {
    const rawStart = g === 0 ? 0 : Number(group[0]?.start ?? 0);
    const start = g === 0 ? 0 : Math.max(rawStart, prev + 10);
    const capped = Number.isFinite(duration) && duration > 0 ? Math.min(start, Math.max(0, duration - 10)) : start;
    chapters.push({
      time: formatTime(capped),
      seconds: capped,
      label: chapterLabel(group.map((s) => s.text)),
    });
    prev = capped;
  });
  return chapters;
}

export function formatChapterBlock(chapters) {
  if (!Array.isArray(chapters) || chapters.length === 0) return '';
  return ['⏱ Chapters', ...chapters.map((c) => `${c.time} ${c.label}`)].join('\n');
}

const TITLE_TEMPLATES = [
  { make: (topic) => `${topic} — Everything You Need to Know`, angle: 'comprehensive promise', score: 0.92 },
  { make: (topic) => `${topic}: A Practical Guide`, angle: 'search-friendly practical framing', score: 0.88 },
  { make: (topic) => `How ${topic} Actually Works`, angle: 'curiosity + clarity', score: 0.85 },
  { make: (topic) => `${topic}: What Most People Get Wrong`, angle: 'contrarian hook backed by the content', score: 0.83 },
  { make: (topic) => `The Complete ${topic} Breakdown`, angle: 'authority framing', score: 0.8 },
];

function topicPhrase(context) {
  const kws = extractKeywords(transcriptText(context), { limit: 2 });
  if (kws.length > 0) return titleCase(kws.join(' '));
  const title = String(context.video?.title || '').trim();
  if (title) return clampWords(title.replace(/[.!?]+$/, ''), 48);
  return 'This Video';
}

function transcriptText(context) {
  const { transcript = [] } = context;
  if (Array.isArray(transcript)) {
    return transcript.map((s) => (typeof s === 'string' ? s : s.text || '')).join(' ');
  }
  return String(transcript || '');
}

function buildTitles(context) {
  const kws = extractKeywords(transcriptText(context), { limit: 3 });
  const kwTopic = titleCase(kws.slice(0, 2).join(' '));
  const topic = kwTopic || topicPhrase(context);
  const titles = TITLE_TEMPLATES.map((t) => ({
    text: clampWords(t.make(topic), 70),
    rationale: `Leads with the core topic "${topic}" using a ${t.angle}.`,
    score: t.score,
  }));
  const current = String(context.video?.title || '').trim();
  if (current) {
    titles[4] = {
      text: clampWords(current, 70),
      rationale: 'Your current upload title, kept as a control to A/B against the options above.',
      score: 0.78,
    };
  }
  return titles;
}

function buildDescription(context, chapters, hashtags) {
  const topic = topicPhrase(context);
  const kws = extractKeywords(transcriptText(context), { limit: 5 });
  const segments = Array.isArray(context.transcript) ? context.transcript : [];
  const first = segments[0] ? firstSentence(segments[0].text || segments[0]) : `Everything you need to know about ${topic}`;
  const mid = segments.slice(1, -1).map((s) => firstSentence(s.text || s)).filter(Boolean);
  const last = segments.length > 1 ? firstSentence(segments[segments.length - 1].text || segments[segments.length - 1]) : '';

  const parts = [
    `${first}`,
    '',
    `In this video: ${topic.toLowerCase()} — covering ${kws.join(', ')}.`,
    '',
  ];
  if (mid.length > 0) {
    parts.push(mid.join(' '), '');
  }
  if (chapters.length > 0) {
    parts.push(formatChapterBlock(chapters), '');
  }
  if (last) {
    parts.push(last, '');
  }
  parts.push(hashtags.join(' '));
  return parts.join('\n').trim();
}

function buildTags(context) {
  const kws = extractKeywords(transcriptText(context), { limit: 10 });
  const bigrams = kws.slice(0, -1).map((w, i) => `${w} ${kws[i + 1]}`);
  const extras = ['guide', 'tutorial', 'tips', 'how to', 'beginner', 'explained'];
  const videoTags = (context.video && context.video.tags) || [];
  const all = [...kws, ...bigrams, ...videoTags.map((t) => String(t).toLowerCase()), ...extras];
  return [...new Set(all.map((t) => t.trim()).filter(Boolean))].slice(0, 20);
}

function buildHashtags(context) {
  const kws = extractKeywords(transcriptText(context), { limit: 8 })
    .filter((k) => /^[a-z]+$/.test(k))
    .slice(0, 4);
  return kws.map((k) => `#${titleCase(k).replace(/\s+/g, '')}`);
}

function buildThumbnailBriefs(context) {
  const topic = topicPhrase(context);
  const [k0 = 'topic', k1 = 'guide'] = extractKeywords(transcriptText(context), { limit: 2 });
  return [
    {
      concept: `Bold hero shot of ${topic.toLowerCase()} with oversized text`,
      hookText: clampWords(titleCase(k0), 22),
      layout: 'Subject right-of-center, text block on the left third',
      colors: ['#0f172a', '#f8fafc', '#f97316'],
      composition: 'Rule of thirds, shallow depth of field, high micro-contrast',
      mood: 'confident and energetic',
    },
    {
      concept: `Before/after split contrasting common mistakes vs the right way (${titleCase(k0)})`,
      hookText: `Mistakes vs ${clampWords(titleCase(k1), 14)}`,
      layout: 'Diagonal split; left side desaturated, right side vivid',
      colors: ['#7f1d1d', '#14532d', '#fde047'],
      composition: 'Diagonal divider with the hook text straddling the seam',
      mood: 'curiosity-driven, slightly provocative',
    },
    {
      concept: `Numbered checklist teaser for ${topic.toLowerCase()}`,
      hookText: `The ${titleCase(k0)} Checklist`,
      layout: 'Large number badge top-left, checklist icons bottom-right',
      colors: ['#1e3a8a', '#f8fafc', '#38bdf8'],
      composition: 'Flat-lay style, strong foreground number, clean negative space',
      mood: 'helpful and organized',
    },
  ];
}

function buildThumbnailPrompts(context, briefs) {
  const topic = topicPhrase(context);
  return briefs.map((b) => ({
    for: b.concept,
    prompt:
      `YouTube thumbnail (1280x720), ${b.concept}. Hook text "${b.hookText}" in bold sans-serif, ` +
      `${b.layout}. Palette: ${b.colors.join(', ')}. ${b.composition}. Mood: ${b.mood}. ` +
      `Topic context: ${topic}. Photorealistic where applicable, high contrast for mobile readability, ` +
      `no watermarks, no logos, no fine print.`,
  }));
}

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapHook(text, maxPerLine = 16) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxPerLine && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = `${line} ${w}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function svgThumbnailDataUrl(brief, { width = 1280, height = 720 } = {}) {
  const [bg = '#0f172a', fg = '#f8fafc', accent = '#f97316'] = brief.colors || [];
  const lines = wrapHook(brief.hookText, 16);
  const fontSize = 110 - Math.max(0, lines.length - 1) * 18;
  const startY = height / 2 - ((lines.length - 1) * fontSize * 1.15) / 2 + fontSize * 0.35;
  const textSvg = lines
    .map((l, i) => `<text x="80" y="${(startY + i * fontSize * 1.15).toFixed(1)}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="${fg}" stroke="${bg}" stroke-width="6" paint-order="stroke">${escapeXml(l)}</text>`)
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#g)"/>` +
    `<rect x="40" y="40" width="${width - 80}" height="${height - 80}" fill="none" stroke="${fg}" stroke-width="6" stroke-dasharray="24 14" opacity="0.55"/>` +
    textSvg +
    `<text x="${width - 80}" y="${height - 60}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="${fg}" opacity="0.85">CreatorDesk preview</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildThumbnailImages(context, briefs) {
  return briefs.map((brief) => ({
    dataUrl: svgThumbnailDataUrl(brief),
    prompt: `Hook: ${brief.hookText} — ${brief.concept}`,
  }));
}

function firstSentencesForSummary(segments, count = 3) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return 'This video covers the topic in a structured walkthrough.';
  }
  const picks = [];
  const step = Math.max(1, Math.floor(segments.length / count));
  for (let i = 0; i < count; i += 1) {
    const seg = segments[Math.min(i * step, segments.length - 1)];
    const s = firstSentence(seg.text || seg);
    if (s) picks.push(s);
  }
  return picks.join(' ');
}

const SEO_CHECKS = [
  {
    name: 'Title length',
    run: (c) => {
      const n = String(c.video.title || '').length;
      return { passed: n >= 40 && n <= 70, detail: `Title is ${n} characters (sweet spot 40–70).` };
    },
  },
  {
    name: 'Keyword in title',
    run: (c) => {
      const kw = extractKeywords(transcriptText(c), { limit: 1 })[0] || '';
      const passed = kw.length > 0 && String(c.video.title || '').toLowerCase().includes(kw);
      return { passed, detail: passed ? `Primary keyword "${kw}" appears in the title.` : `Primary keyword "${kw}" is missing from the title.` };
    },
  },
  {
    name: 'Description depth',
    run: (c) => {
      const n = String(c.video.description || '').length;
      return { passed: n >= 200, detail: `Description is ${n} characters (aim for ≥200 with keywords and chapters).` };
    },
  },
  {
    name: 'Chapter coverage',
    run: (c) => {
      const n = Array.isArray(c.transcript) ? c.transcript.length : 0;
      return { passed: n >= 4, detail: `${n} transcript segments detected (≥4 supports clean chapters).` };
    },
  },
  {
    name: 'Tag count',
    run: (c) => {
      const n = (c.video.tags || []).length;
      return { passed: n >= 5 && n <= 20, detail: `${n} tags set (aim for 5–20 relevant tags).` };
    },
  },
  {
    name: 'Hook strength',
    run: (c) => {
      const first = Array.isArray(c.transcript) && c.transcript[0] ? String(c.transcript[0].text || '') : '';
      const passed = /\?|!|\d|why|how|mistake|secret|guide|beginner/i.test(first);
      return { passed, detail: passed ? 'Opening line has a curiosity/number signal.' : 'Opening line lacks a question, number, or strong hook word.' };
    },
  },
];

const SEO_IMPROVE = {
  'Title length': { area: 'Title', suggestion: 'Keep the title between 40–70 characters and lead with the primary keyword.', impact: 'high', effort: 'small' },
  'Keyword in title': { area: 'SEO', suggestion: 'Put the video’s primary keyword in the title — it is the strongest ranking signal.', impact: 'high', effort: 'small' },
  'Description depth': { area: 'Description', suggestion: 'Expand the description to ≥200 characters: hook, chapter block, keyword-rich summary, hashtags.', impact: 'medium', effort: 'small' },
  'Chapter coverage': { area: 'Retention', suggestion: 'Structure the video into ≥4 clear sections and add chapter timestamps to the description.', impact: 'medium', effort: 'small' },
  'Tag count': { area: 'Tags', suggestion: 'Use 5–20 tags mixing broad and specific keyword phrases.', impact: 'low', effort: 'small' },
  'Hook strength': { area: 'Retention', suggestion: 'Open with a question, a number, or a bold claim in the first 15 seconds.', impact: 'high', effort: 'medium' },
};

function buildAnalysis(context) {
  const checks = SEO_CHECKS.map((c) => ({ name: c.name, ...c.run(context) }));
  const score = Math.round((checks.filter((c) => c.passed).length / checks.length) * 100);
  const topic = topicPhrase(context);
  const segments = Array.isArray(context.transcript) ? context.transcript : [];
  const duration = context.video.duration || 0;

  const strengths = checks
    .filter((c) => c.passed)
    .map((c) => `${c.name}: ${c.detail}`)
    .slice(0, 5);
  if (strengths.length < 3) {
    strengths.push(`Clear topic focus around "${topic}".`);
  }

  const failures = checks.filter((c) => !c.passed);
  const weaknesses = failures.map((c) => `${c.name}: ${c.detail}`);
  if (weaknesses.length === 0) weaknesses.push('Metadata is strong — the next gains are in packaging (thumbnail A/B) and retention editing.');

  const improvements = failures.map((c) => ({ ...SEO_IMPROVE[c.name] }));
  if (improvements.length < 3) {
    improvements.push({ area: 'Packaging', suggestion: `Test two thumbnail variants for "${topic}" — one text-heavy, one face/product-led — and keep the winner.`, impact: 'medium', effort: 'small' });
    improvements.push({ area: 'Content', suggestion: 'Add a 10-second “what you’ll learn” agenda right after the hook to lift early retention.', impact: 'high', effort: 'small' });
    improvements.push({ area: 'Distribution', suggestion: 'Pin a comment with the chapter list and a related-video link to drive session time.', impact: 'low', effort: 'small' });
  }

  const words = transcriptText(context).split(/\s+/).filter(Boolean).length;
  const rate = duration > 0 ? (words / duration).toFixed(2) : 'n/a';
  const firstLine = segments[0] ? firstSentence(segments[0].text || segments[0]) : '';

  return {
    summary: `${topic} is covered as a ${segments.length >= 4 ? 'structured walkthrough with distinct sections' : 'compact single-flow explainer'}. ${firstSentencesForSummary(segments)}`,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    improvements: improvements.slice(0, 6),
    seo: { score, checks },
    retention: {
      hook: firstLine
        ? `Opens with: “${clampWords(firstLine, 90)}” — ${/\?|!|\d|why|how|mistake|secret/i.test(firstLine) ? 'a recognizable hook signal is present.' : 'consider adding a question or number in the first sentence.'}`
        : 'No opening line detected — start with a strong hook.',
      structure: segments.length >= 4
        ? `${segments.length} segments form clear sections; add chapters so viewers can scan.`
        : `Only ${segments.length} segments detected — segment the topic into named sections for easier scanning.`,
      pacing: duration > 0
        ? `≈${rate} words/sec over ${formatTime(duration)}; ${words / Math.max(duration, 1) > 2.5 ? 'this is dense — add breathing room or on-screen text.' : 'this is a comfortable pace for tutorials.'}`
        : 'Duration unknown — measure audience retention at the 30-second mark.',
    },
  };
}

function buildInsights(context) {
  const { channel = {}, videos = [] } = context;
  const stats = channel.stats || {};
  const views = videos.map((v) => Number(v.stats?.viewCount || 0));
  const totalViews = views.reduce((a, b) => a + b, 0);
  const avgViews = videos.length ? Math.round(totalViews / videos.length) : 0;
  const best = videos.slice().sort((a, b) => Number(b.stats?.viewCount || 0) - Number(a.stats?.viewCount || 0))[0];
  const latest = videos.slice().sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))[0];

  const allText = videos.map((v) => v.title).join(' ');
  const topTopics = extractKeywords(allText, { limit: 5 });

  const sortedDates = videos
    .map((v) => new Date(v.publishedAt || 0).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  let cadenceNote = 'Not enough upload history to compute cadence.';
  if (sortedDates.length >= 2) {
    const days = (sortedDates[sortedDates.length - 1] - sortedDates[0]) / 86400000;
    cadenceNote = `${videos.length} videos over ${Math.round(days)} days — roughly one every ${Math.max(1, Math.round(days / (sortedDates.length - 1)))} days.`;
  }

  const engagement = totalViews > 0
    ? videos.reduce((a, v) => a + Number(v.stats?.likeCount || 0) + Number(v.stats?.commentCount || 0), 0) / totalViews
    : 0;
  const latestViews = latest ? Number(latest.stats?.viewCount || 0) : 0;
  const trend = latestViews > avgViews * 1.2 ? 'rising' : latestViews < avgViews * 0.8 ? 'falling' : 'steady';

  return {
    overview: {
      channel: channel.title || 'Channel',
      cadence: cadenceNote,
      avgViews,
      subscriberCount: Number(stats.subscriberCount || 0),
      topTopics,
    },
    performance: [
      { metric: 'Total views (sampled)', value: String(totalViews), trend: trend, note: `Across ${videos.length} recent videos.` },
      { metric: 'Average views per video', value: String(avgViews), trend: trend, note: `Latest video: ${latestViews} views.` },
      { metric: 'Engagement rate', value: `${(engagement * 100).toFixed(1)}%`, trend: engagement > 0.06 ? 'rising' : 'steady', note: '(likes + comments) / views on recent uploads.' },
      { metric: 'Best performer', value: best ? best.title : '—', trend: 'rising', note: best ? `${best.stats?.viewCount || 0} views — double down on this topic.` : 'No videos yet.' },
    ],
    whatWorks: [
      best ? `"${best.title}" outperforms your average by ${avgViews > 0 ? Math.round((Number(best.stats?.viewCount || 0) / avgViews - 1) * 100) : 0}% — its topic and packaging resonate.` : 'Publish consistently to establish a baseline.',
      topTopics.length > 0 ? `Your recurring topic cluster (${topTopics.slice(0, 3).join(', ')}) builds channel authority in search.` : 'Distinct, keyword-led titles are your strength.',
      `Engagement rate of ${(engagement * 100).toFixed(1)}% ${engagement > 0.06 ? 'is healthy — your audience responds.' : 'can be lifted with direct questions and pinned comments.'}`,
    ],
    opportunities: [
      'Description depth and chapter blocks are the cheapest YouTube SEO wins — automate them with CreatorDesk for every upload.',
      trend === 'rising'
        ? 'Momentum is up — raise upload frequency while the algorithm is leaning in.'
        : 'Views are flat/falling on recent uploads — re-package 2–3 older videos with new titles/thumbnails before making more.',
      'Thumbnail consistency (palette + text style) improves browse click-through; standardize a template.',
    ],
    roadmap: [
      { priority: 1, action: 'Apply generated titles, chapters, and descriptions to your next 3 uploads (or re-package the best older ones).', why: 'Metadata is the highest-leverage, lowest-effort growth lever.', effort: 'small' },
      { priority: 2, action: 'Standardize a thumbnail template and A/B test hook text on every upload.', why: 'Click-through rate compounds across all impressions.', effort: 'medium' },
      { priority: 3, action: `Lean into your top topic cluster (${topTopics.slice(0, 2).join(', ') || 'your niche'}) with a 3-video series.`, why: 'Topic authority lifts the whole channel in suggested video.', effort: 'medium' },
      { priority: 4, action: 'Add a retention edit pass: tighter hook, agenda at 0:10, pattern interrupts every 60–90s.', why: 'Audience retention is the strongest long-term ranking signal.', effort: 'large' },
    ],
  };
}

const TASKS = {
  metadata: (ctx) => {
    const chapters = buildChapters(ctx.transcript, { duration: ctx.video?.duration });
    const hashtags = buildHashtags(ctx);
    return {
      titles: buildTitles(ctx),
      description: buildDescription(ctx, chapters, hashtags),
      chapters,
      tags: buildTags(ctx),
      hashtags,
    };
  },
  thumbnails: (ctx) => {
    const briefs = buildThumbnailBriefs(ctx);
    return {
      briefs,
      prompts: buildThumbnailPrompts(ctx, briefs),
      images: buildThumbnailImages(ctx, briefs),
    };
  },
  analysis: (ctx) => buildAnalysis(ctx),
  insights: (ctx) => buildInsights(ctx),
};

export function createMockProvider() {
  return {
    id: 'mock',
    supportsImages: true,
    async complete(task, context = {}) {
      const fn = TASKS[task];
      if (!fn) throw new Error(`Unknown task: ${task}`);
      return fn(context);
    },
    async generateImage({ brief }) {
      const b = brief || { hookText: 'CreatorDesk', colors: [] };
      return { dataUrl: svgThumbnailDataUrl(b), mime: 'image/svg+xml' };
    },
  };
}

export default createMockProvider;
