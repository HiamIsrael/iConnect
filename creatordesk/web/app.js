/* CreatorDesk workbench — no-build vanilla SPA. Relative /api calls only. */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  health: null,
  channel: null,
  videos: [],
  artifacts: {}, // videoId → { metadata, thumbnails, analysis, export }
};

/* ---------- API ---------- */
async function api(path, options = {}) {
  const opts = { headers: {}, ...options };
  if (opts.body && typeof opts.body !== 'string') {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(`/api${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Request failed (HTTP ${res.status})`);
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

function showError(err) {
  const banner = $('#error-banner');
  banner.textContent = `⚠ ${err.message || err}`;
  banner.hidden = false;
  clearTimeout(showError._t);
  showError._t = setTimeout(() => { banner.hidden = true; }, 9000);
}

function toast(message) {
  $$('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast('Copied to clipboard');
}

function copyBtn(text) {
  return `<button class="btn small ghost" data-copy="${encodeURIComponent(text)}">Copy</button>`;
}

/* ---------- formatting helpers ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : String(n ?? '—'));
const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return String(iso || ''); }
};
const fmtDuration = (s) => {
  const sec = Math.max(0, Number(s) || 0);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), r = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};

/* ---------- shell ---------- */
async function loadShell() {
  const [health, channel, videos] = await Promise.all([
    api('/health'), api('/channel'), api('/videos'),
  ]);
  state.health = health;
  state.channel = channel.channel;
  state.videos = videos.videos;
  $('#pill-ai').textContent = `AI: ${health.ai.provider}`;
  $('#pill-ai').classList.toggle('on', health.ai.provider !== 'mock');
  $('#pill-yt').textContent = `YouTube: ${health.youtube}`;
  $('#pill-yt').classList.toggle('on', health.youtube !== 'mock');
  $('#demo-banner').hidden = health.youtube !== 'mock';
}

function setNav(route) {
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === route));
}

/* ---------- views ---------- */
function renderChannel() {
  setNav('channel');
  const c = state.channel;
  $('#main').innerHTML = `
    <section class="card" style="margin-bottom:1.25rem">
      <div class="spread">
        <div class="row">
          ${c.thumbnail ? `<img src="${esc(c.thumbnail)}" alt="" width="72" height="72" style="border-radius:12px">` : ''}
          <div>
            <h2 style="margin:0 0 .25rem">${esc(c.title)}</h2>
            <div class="muted small">${esc(c.description || '')}</div>
          </div>
        </div>
        <div class="stats" style="font-size:.95rem">
          <span><b>${fmtNum(c.stats?.subscriberCount)}</b> subscribers</span>
          <span><b>${fmtNum(c.stats?.viewCount)}</b> views</span>
          <span><b>${fmtNum(c.stats?.videoCount)}</b> videos</span>
        </div>
      </div>
    </section>
    <h2>Videos</h2>
    <div class="grid videos">
      ${state.videos.map((v) => `
        <article class="card video-card" data-video="${esc(v.id)}" tabindex="0" role="button">
          ${v.thumbnailUrl
            ? `<img class="video-thumb" src="${esc(v.thumbnailUrl)}" alt="">`
            : `<div class="video-thumb placeholder">▶</div>`}
          <div class="video-title">${esc(v.title)}</div>
          <div class="stats">
            <span>${fmtDate(v.publishedAt)}</span>
            <span>👁 ${fmtNum(v.stats?.viewCount)}</span>
            <span>👍 ${fmtNum(v.stats?.likeCount)}</span>
            <span>💬 ${fmtNum(v.stats?.commentCount)}</span>
          </div>
          <div class="row">
            <button class="btn small primary" data-video="${esc(v.id)}">Open workspace</button>
            <span class="muted small">${fmtDuration(v.duration)}</span>
          </div>
        </article>`).join('')}
    </div>`;

  $$('#main [data-video]').forEach((el) => {
    const open = () => { location.hash = `#/video/${el.dataset.video}`; };
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
  });
}

function workspaceTabs(id, tab) {
  const tabs = ['metadata', 'thumbnails', 'analysis', 'export'];
  return `<div class="tabs" role="tablist">
    ${tabs.map((t) => `
      <button class="tab ${t === tab ? 'active' : ''}" role="tab" data-tab="${t}" data-id="${esc(id)}">
        ${t[0].toUpperCase() + t.slice(1)}
      </button>`).join('')}
  </div>`;
}

function metaView(meta) {
  if (!meta) return emptyBox('Generate title options, chapters, description and tags.', 'generate-metadata');
  return `
    <div class="asset">
      <div class="spread"><h3>Title options</h3></div>
      ${meta.titles.map((t, i) => `
        <div class="title-option asset" style="margin:.55rem 0">
          <span class="score">${Math.round(t.score * 100)}</span>
          <div style="flex:1">
            <div><b>${esc(t.text)}</b></div>
            <div class="muted small" style="margin:.3rem 0 .45rem">${esc(t.rationale)}</div>
            ${copyBtn(t.text)}
            <button class="btn small ghost" data-use-title="${i}">Use for publish</button>
          </div>
        </div>`).join('')}
    </div>
    <div class="asset">
      <div class="spread"><h3>Description</h3>${copyBtn(meta.description)}</div>
      <pre>${esc(meta.description)}</pre>
    </div>
    <div class="asset">
      <div class="spread"><h3>Chapters</h3>${copyBtn(meta.chapters.map((c) => `${c.time} ${c.label}`).join('\n'))}</div>
      <pre>${esc(meta.chapters.map((c) => `${c.time} ${c.label}`).join('\n'))}</pre>
    </div>
    <div class="asset">
      <div class="spread"><h3>Tags</h3>${copyBtn(meta.tags.join(', '))}</div>
      <div class="chips">${meta.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>
      <div class="spread"><h3>Hashtags</h3>${copyBtn(meta.hashtags.join(' '))}</div>
      <div class="chips">${meta.hashtags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>
    </div>`;
}

function thumbsView(thumbs) {
  if (!thumbs) return emptyBox('Generate thumbnail concept briefs, image prompts and previews.', 'generate-thumbnails');
  return thumbs.briefs.map((b, i) => `
    <div class="asset thumb-variant">
      <div>
        ${thumbs.images?.[i] ? `<img src="${esc(thumbs.images[i].dataUrl)}" alt="Thumbnail concept ${i + 1}">` : ''}
      </div>
      <div>
        <h3 style="margin-bottom:.35rem">${esc(b.hookText)}</h3>
        <div class="kv"><b>Concept</b>${esc(b.concept)}</div>
        <div class="kv"><b>Layout</b>${esc(b.layout)}</div>
        <div class="kv"><b>Colors</b>${b.colors.map((c) => `<span class="chip" style="display:inline-block">${esc(c)}</span>`).join('')}</div>
        <div class="kv"><b>Composition</b>${esc(b.composition)}</div>
        <div class="kv"><b>Mood</b>${esc(b.mood)}</div>
        <div class="kv"><b>Prompt</b></div>
        <pre>${esc(thumbs.prompts[i]?.prompt || '')}</pre>
        ${copyBtn(thumbs.prompts[i]?.prompt || '')}
      </div>
    </div>`).join('');
}

function analysisView(a) {
  if (!a) return emptyBox('Summarize the content and get concrete improvement suggestions.', 'generate-analysis');
  return `
    <div class="asset">
      <h3>Summary</h3>
      <p style="line-height:1.6">${esc(a.summary)}</p>
    </div>
    <div class="row" style="align-items:stretch">
      <div class="asset" style="flex:1;min-width:280px">
        <h3>Strengths</h3>
        <ul class="plain list-good">${a.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      </div>
      <div class="asset" style="flex:1;min-width:280px">
        <h3>Weaknesses</h3>
        <ul class="plain list-bad">${a.weaknesses.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="asset">
      <h3>Improvements</h3>
      ${a.improvements.map((imp) => `
        <div class="kv" style="margin:.75rem 0">
          <span class="badge ${esc(imp.impact)}">${esc(imp.impact)} impact</span>
          <span class="badge">${esc(imp.effort)} effort</span>
          <b>${esc(imp.area)}</b> — ${esc(imp.suggestion)}
        </div>`).join('')}
    </div>
    <div class="asset">
      <h3>SEO score: ${esc(a.seo.score)}/100</h3>
      <div class="seo-bar"><i style="width:${Math.max(2, Number(a.seo.score) || 0)}%"></i></div>
      <ul class="plain">
        ${a.seo.checks.map((c) => `
          <li class="${c.passed ? 'check-passed' : 'check-failed'}">
            <b>${c.passed ? '✓' : '○'}</b> ${esc(c.name)} — <span class="muted">${esc(c.detail)}</span>
          </li>`).join('')}
      </ul>
    </div>
    <div class="asset">
      <h3>Retention</h3>
      <div class="kv"><b>Hook</b>${esc(a.retention.hook)}</div>
      <div class="kv"><b>Structure</b>${esc(a.retention.structure)}</div>
      <div class="kv"><b>Pacing</b>${esc(a.retention.pacing)}</div>
    </div>`;
}

function exportView(exp) {
  if (!exp) return emptyBox('Build the full copy-paste bundle (titles, chapters, description, thumbnails, analysis).', 'generate-export');
  return `
    <div class="asset">
      <div class="spread"><h3>Markdown bundle</h3>
        <div class="row">
          ${copyBtn(exp.markdown)}
          <button class="btn small ghost" id="download-md">Download .md</button>
        </div>
      </div>
      <pre style="max-height:480px;overflow:auto">${esc(exp.markdown)}</pre>
    </div>`;
}

function emptyBox(text, action) {
  return `
    <div class="asset" style="text-align:center;padding:2.2rem 1rem">
      <p class="muted">${esc(text)}</p>
      <button class="btn primary" id="${action}">Generate</button>
    </div>`;
}

function renderWorkspace(id, tab = 'metadata') {
  setNav('channel');
  const video = state.videos.find((v) => v.id === id);
  if (!video) { location.hash = '#/'; return; }
  const art = state.artifacts[id] || {};
  const bodies = {
    metadata: metaView(art.metadata),
    thumbnails: thumbsView(art.thumbnails),
    analysis: analysisView(art.analysis),
    export: exportView(art.export),
  };
  $('#main').innerHTML = `
    <div class="workspace-head">
      <div class="spread">
        <div>
          <a href="#/" class="small">← All videos</a>
          <h2 style="margin:.35rem 0 0">${esc(video.title)}</h2>
          <div class="stats">
            <span>${fmtDate(video.publishedAt)}</span>
            <span>${fmtDuration(video.duration)}</span>
            <span>👁 ${fmtNum(video.stats?.viewCount)}</span>
            <span>👍 ${fmtNum(video.stats?.likeCount)}</span>
          </div>
        </div>
        <button class="btn primary" id="publish-btn">Publish to YouTube…</button>
      </div>
    </div>
    ${workspaceTabs(id, tab)}
    <div id="tab-body">${bodies[tab]}</div>`;

  $$('#main .tab').forEach((el) => {
    el.addEventListener('click', () => { location.hash = `#/video/${el.dataset.id}?tab=${el.dataset.tab}`; });
  });

  const actions = {
    'generate-metadata': () => generate(id, 'metadata', 'POST', `/videos/${id}/metadata`, {}),
    'generate-thumbnails': () => generate(id, 'thumbnails', 'POST', `/videos/${id}/thumbnails`, {}),
    'generate-analysis': () => generate(id, 'analysis', 'POST', `/videos/${id}/analyze`, {}),
    'generate-export': () => generate(id, 'export', 'GET', `/videos/${id}/export`, null),
  };
  Object.entries(actions).forEach(([key, fn]) => {
    const btn = $(`#${key}`);
    if (btn) btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Working…';
      try {
        await fn();
        const nextTab = key.replace('generate-', '');
        location.hash = `#/video/${id}?tab=${nextTab}`;
        render();
      } catch (err) {
        showError(err);
        btn.disabled = false;
        btn.textContent = 'Generate';
      }
    });
  });

  $$('#main [data-copy]').forEach((el) => {
    el.addEventListener('click', () => copy(decodeURIComponent(el.dataset.copy)));
  });
  $$('#main [data-use-title]').forEach((el) => {
    el.addEventListener('click', () => {
      const t = art.metadata?.titles?.[Number(el.dataset.useTitle)];
      if (t) toast(`Title selected for publish: “${t.text}”`);
    });
  });
  const dl = $('#download-md');
  if (dl) dl.addEventListener('click', () => {
    const blob = new Blob([art.export.markdown], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${id}-creatordesk.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#publish-btn').addEventListener('click', () => openPublishModal(id));
}

async function generate(id, key, method, path, body) {
  try {
    const result = await api(path, body === null ? { method } : { method, body });
    state.artifacts[id] = { ...(state.artifacts[id] || {}), [key]: result };
  } catch (err) {
    showError(err);
    throw err;
  }
}

function renderInsights() {
  setNav('insights');
  $('#main').innerHTML = `
    <h2>Channel insights</h2>
    <div id="insights-body"><p class="muted">Loading…</p></div>`;
  api('/channel/insights').then((ins) => {
    const o = ins.overview;
    $('#insights-body').innerHTML = `
      <section class="card" style="margin-bottom:1rem">
        <h3>${esc(o.channel)}</h3>
        <div class="stats" style="font-size:.95rem">
          <span>📈 ${esc(o.cadence)}</span>
          <span><b>${fmtNum(o.avgViews)}</b> avg views</span>
          <span><b>${fmtNum(o.subscriberCount)}</b> subscribers</span>
        </div>
        <div class="chips">${(o.topTopics || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>
      </section>
      <section class="card" style="margin-bottom:1rem">
        <h3>Performance</h3>
        <table class="metric-table">
          <thead><tr><th>Metric</th><th>Value</th><th>Trend</th><th>Note</th></tr></thead>
          <tbody>
            ${ins.performance.map((p) => `
              <tr>
                <td>${esc(p.metric)}</td>
                <td><b>${esc(p.value)}</b></td>
                <td class="trend-${p.trend === 'rising' ? 'up' : p.trend === 'falling' ? 'down' : 'flat'}">${esc(p.trend)}</td>
                <td class="muted">${esc(p.note)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </section>
      <div class="row" style="align-items:stretch">
        <section class="card" style="flex:1;min-width:300px">
          <h3>What works</h3>
          <ul class="plain list-good">${ins.whatWorks.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
        </section>
        <section class="card" style="flex:1;min-width:300px">
          <h3>Opportunities</h3>
          <ul class="plain list-bad">${ins.opportunities.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
        </section>
      </div>
      <section class="card" style="margin-top:1rem">
        <h3>Improvement roadmap</h3>
        ${ins.roadmap.map((r) => `
          <div class="roadmap-item">
            <div class="priority">${esc(r.priority)}</div>
            <div>
              <b>${esc(r.action)}</b>
              <div class="muted small" style="margin-top:.3rem">${esc(r.why)}</div>
              <span class="badge" style="margin-top:.45rem">${esc(r.effort)} effort</span>
            </div>
          </div>`).join('')}
      </section>`;
  }).catch(showError);
}

function renderSettings() {
  setNav('settings');
  const h = state.health || { ai: { provider: '…' }, youtube: '…' };
  $('#main').innerHTML = `
    <h2>Settings</h2>
    <section class="card">
      <h3>Provider status</h3>
      <div class="kv"><b>AI provider</b>${esc(h.ai.provider)} ${h.ai.supportsImages ? '(images supported)' : '(text only)'}</div>
      <div class="kv"><b>YouTube</b>${esc(h.youtube)} mode</div>
      <p class="muted small">Keys are read from environment variables and never shown or sent to the browser.</p>
      <h3>Going live</h3>
      <ul class="env-list">
        <li><code>CREATORDESK_AI_PROVIDER</code> = openai | anthropic | gemini — plus the matching key:
          <code>OPENAI_API_KEY</code> / <code>ANTHROPIC_API_KEY</code> / <code>GEMINI_API_KEY</code></li>
        <li><code>CREATORDESK_YOUTUBE</code> = live — plus <code>YOUTUBE_CLIENT_ID</code>,
          <code>YOUTUBE_CLIENT_SECRET</code>, <code>YOUTUBE_REFRESH_TOKEN</code> (OAuth app with
          youtube.readonly + youtube.upload scopes)</li>
        <li><code>CREATORDESK_PORT</code> (default 4180) · <code>CREATORDESK_DATA_DIR</code> for saved assets</li>
      </ul>
      <p class="muted small" style="margin-top:1rem">See <code>creatordesk/README.md</code> for the full OAuth setup guide.</p>
    </section>`;
}

/* ---------- publish modal ---------- */
function openPublishModal(id) {
  const art = state.artifacts[id] || {};
  const meta = art.metadata;
  const thumbs = art.thumbnails;
  const modal = $('#modal');
  $('#modal-sub').textContent = 'Review the fields below. Nothing is sent to YouTube until you press Publish.';
  $('#pub-title').value = meta?.titles?.[0]?.text || '';
  $('#pub-description').value = meta?.description || '';
  $('#pub-tags').value = (meta?.tags || []).join(', ');
  const sel = $('#pub-thumbnail');
  sel.innerHTML = '<option value="">(leave unchanged)</option>' +
    (thumbs?.images || []).map((img, i) => `<option value="${esc(img.dataUrl)}">Thumbnail ${i + 1}: ${esc(thumbs.briefs[i]?.hookText || '')}</option>`).join('');
  modal.hidden = false;
  $('#pub-title').focus();

  $('#modal-cancel').onclick = () => { modal.hidden = true; };
  $('#modal-confirm').onclick = async () => {
    const body = { confirm: true };
    if ($('#pub-title').value.trim()) body.title = $('#pub-title').value.trim();
    if ($('#pub-description').value.trim()) body.description = $('#pub-description').value.trim();
    const tags = $('#pub-tags').value.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length) body.tags = tags;
    if (sel.value) body.thumbnail = sel.value;
    if (Object.keys(body).length === 1) { showError(new Error('Nothing to publish — fill at least one field')); return; }
    $('#modal-confirm').disabled = true;
    try {
      const res = await api(`/videos/${id}/publish`, { method: 'POST', body });
      modal.hidden = true;
      toast(`Published via ${res.mode} mode: ${res.updated.join(', ')}`);
    } catch (err) {
      showError(err);
    } finally {
      $('#modal-confirm').disabled = false;
    }
  };
}

/* ---------- routing ---------- */
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = h.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryPart || ''));
  if (parts[0] === 'video' && parts[1]) return { name: 'video', id: decodeURIComponent(parts[1]), tab: query.tab || 'metadata' };
  if (parts[0] === 'insights') return { name: 'insights' };
  if (parts[0] === 'settings') return { name: 'settings' };
  return { name: 'channel' };
}

function render() {
  const route = parseHash();
  if (route.name === 'video') return renderWorkspace(route.id, route.tab);
  if (route.name === 'insights') return renderInsights();
  if (route.name === 'settings') return renderSettings();
  return renderChannel();
}

window.addEventListener('hashchange', render);

(async function boot() {
  try {
    await loadShell();
  } catch (err) {
    showError(err);
  }
  render();
})();
