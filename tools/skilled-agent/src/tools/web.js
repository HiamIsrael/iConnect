// Web research tools with no API keys: DuckDuckGo HTML search + page fetch → readable text.
import { registerTool, truncate } from './registry.js';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

function decodeEntities(s) {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[e]));
}

export function htmlToText(html) {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const t = text.replace(/<[^>]+>/g, '').trim();
    return t && !href.startsWith('#') && !href.startsWith('javascript:') ? `[${t}](${href})` : t;
  });
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, l, t) => `\n${'#'.repeat(+l)} ${t.replace(/<[^>]+>/g, '')}\n`)
    .replace(/<li[^>]*>/gi, '\n- ').replace(/<\/(p|div|tr|li|section|article|blockquote|pre)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<td[^>]*>/gi, ' | ').replace(/<[^>]+>/g, '');
  return decodeEntities(s).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function webSearch(query, count = 8) {
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
    body: new URLSearchParams({ q: query, kl: 'wt-wt' }),
  });
  if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
  const html = await res.text();
  const results = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>)?/g;
  let m;
  while ((m = re.exec(html)) && results.length < count) {
    let url = m[1];
    const u = url.match(/[?&]uddg=([^&]+)/);
    if (u) url = decodeURIComponent(u[1]);
    if (url.startsWith('//')) url = 'https:' + url;
    results.push({ title: decodeEntities(m[2].replace(/<[^>]+>/g, '')).trim(), url, snippet: decodeEntities((m[3] ?? m[4] ?? '').replace(/<[^>]+>/g, '')).trim() });
  }
  return results;
}

export async function fetchPage(url, { maxChars = 12000 } = {}) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/json,text/plain,*/*' }, redirect: 'follow' });
  const ctype = res.headers.get('content-type') || '';
  const raw = await res.text();
  if (!res.ok) return `HTTP ${res.status}\n${raw.slice(0, 1000)}`;
  const text = /html/.test(ctype) ? htmlToText(raw) : raw;
  const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  return `${title ? `# ${decodeEntities(title)}\nURL: ${url}\n\n` : ''}${truncate(text, maxChars)}`;
}

registerTool({
  name: 'web_search',
  description: 'Search the web (DuckDuckGo). Returns titles, URLs and snippets. Follow up with fetch_page to read a result.',
  parameters: { type: 'object', properties: { query: { type: 'string' }, count: { type: 'integer', description: 'default 8' } }, required: ['query'] },
  async run({ query, count = 8 }) {
    const r = await webSearch(query, count);
    return r.length ? r.map((x, i) => `${i + 1}. ${x.title}\n   ${x.url}\n   ${x.snippet}`).join('\n') : 'No results';
  },
});

registerTool({
  name: 'fetch_page',
  description: 'Fetch a URL and return its readable text (HTML converted to markdown-ish text; JSON/text returned as-is).',
  parameters: { type: 'object', properties: { url: { type: 'string' }, max_chars: { type: 'integer', description: 'default 12000' } }, required: ['url'] },
  async run({ url, max_chars = 12000 }) { return fetchPage(url, { maxChars: max_chars }); },
});

registerTool({
  name: 'http_request',
  description: 'Make an arbitrary HTTP request (REST APIs, webhooks). Returns status, headers and body.',
  parameters: {
    type: 'object',
    properties: { url: { type: 'string' }, method: { type: 'string' }, headers: { type: 'object', additionalProperties: { type: 'string' } }, body: { type: 'string' } },
    required: ['url'],
  },
  async run({ url, method = 'GET', headers = {}, body }) {
    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    const h = Object.fromEntries([...res.headers.entries()].filter(([k]) => ['content-type', 'location', 'x-ratelimit-remaining'].includes(k)));
    return truncate(`status: ${res.status}\nheaders: ${JSON.stringify(h)}\n\n${text}`);
  },
});
