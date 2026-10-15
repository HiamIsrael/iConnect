const $ = (s) => document.querySelector(s);
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const number = (n) => Number(n || 0).toLocaleString('en-US');
const compact = (n) =>
  Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);
let operatorToken = '',
  videos = [],
  sending = false;
async function api(path, body) {
  const r = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(operatorToken ? { authorization: `Bearer ${operatorToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || `Request failed (${r.status})`);
  return data;
}
function notice(text) {
  $('#notice').hidden = !text;
  $('#notice').textContent = text;
}
function view(name) {
  for (const key of ['agent', 'library', 'activity', 'connections'])
    $(`#${key}-view`).hidden = key !== name;
  document
    .querySelectorAll('.sidebar [data-view]')
    .forEach((el) => el.classList.toggle('active', el.dataset.view === name));
  $('#view-name').textContent = {
    agent: 'Channel assistant',
    library: 'Content library',
    activity: 'Publishing activity',
    connections: 'Connections',
  }[name];
  if (name === 'activity') activity();
}
document
  .querySelectorAll('[data-view]')
  .forEach((el) => (el.onclick = () => view(el.dataset.view)));
$('#timezone').textContent = `(${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
$('#schedule-time').min = new Date(Date.now() + 120000 - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 16);
function message(text, who = 'assistant') {
  const el = document.createElement('div');
  el.className = `message ${who}`;
  el.innerHTML = `<div class="message-label">${who === 'user' ? 'YOU' : '✦ CHANNEL ASSISTANT'}</div><div>${esc(text)}</div>`;
  $('#conversation').append(el);
  el.scrollIntoView({ block: 'nearest' });
  return el;
}
function resultHTML(result) {
  let summary = '';
  if (result.roadmap)
    summary = `<h4>Recommended next moves</h4><ul class="result-list">${result.roadmap.map((r) => `<li><b>${esc(r.action)}</b><br>${esc(r.why)}</li>`).join('')}</ul>`;
  else if (result.titles)
    summary = `<h4>Title directions</h4><ul class="result-list">${result.titles.map((t) => `<li><b>${esc(t.text)}</b><br>${esc(t.rationale)}</li>`).join('')}</ul>`;
  else if (result.summary) summary = `<p>${esc(result.summary)}</p>`;
  return `<div class="result">${summary}<details><summary>View complete tool output</summary><pre>${esc(JSON.stringify(result, null, 2))}</pre></details></div>`;
}
function renderProposal(p, container) {
  const card = document.createElement('section');
  card.className = 'proposal';
  card.innerHTML = `<div class="section-label">${p.mode === 'mock' ? 'DEMO CHANGE · NO YOUTUBE WRITE' : 'LIVE CHANNEL CHANGE'} · APPROVAL REQUIRED</div><h3>${p.action === 'schedule' ? 'Schedule this upload' : 'Apply prepared metadata'}</h3><p>${esc(p.videoTitle)}</p>${p.action === 'schedule' ? `<p><b>${esc(new Date(p.preview.publishAt).toLocaleString())}</b></p><p>UTC: ${esc(p.preview.publishAt)}<br>Privacy until release: private</p>` : `<pre>${esc(JSON.stringify(p.preview, null, 2))}</pre>`}<p class="approval-note">This exact change will be sent to ${p.mode === 'mock' ? 'the demo channel only' : 'YouTube'}. Approval expires after one hour.</p><button class="button dark approve">${p.mode === 'mock' ? 'Approve demo change' : 'Approve channel change'}</button><button class="button outline dismiss">Dismiss</button><div class="approval-status" role="status"></div>`;
  container.append(card);
  card.querySelector('.dismiss').onclick = () => {
    card.querySelectorAll('button').forEach((b) => (b.disabled = true));
    card.querySelector('.approval-status').textContent =
      'Dismissed locally. No channel changes made.';
  };
  card.querySelector('.approve').onclick = async () => {
    card.querySelectorAll('button').forEach((b) => (b.disabled = true));
    const status = card.querySelector('.approval-status');
    status.textContent = 'Executing approved change…';
    try {
      const r = await api(`/agent/approve/${p.id}`, { confirm: true });
      status.textContent = `✓ ${r.receipt.mode === 'mock' ? 'Demo operation' : 'Channel operation'} completed. Receipt: ${r.receipt.id}`;
      await loadChannel();
    } catch (e) {
      status.textContent = `${e.message} If the outcome is uncertain, check YouTube before creating another proposal.`;
    }
  };
}
async function send(text) {
  if (sending || !text.trim()) return;
  sending = true;
  $('#send').disabled = true;
  message(text, 'user');
  $('#message').value = '';
  const pending = message('Checking the available tools…');
  try {
    const time = $('#schedule-time').value;
    const r = await api('/agent/chat', {
      message: text,
      videoId: $('#video-select').value || undefined,
      publishAt: time ? new Date(time).toISOString() : undefined,
    });
    pending.remove();
    const reply = message(r.reply);
    if (r.trace)
      reply.insertAdjacentHTML(
        'beforeend',
        `<div class="trace">${r.trace.map((t) => `<span>✓ ${esc(t)}</span>`).join('')}</div>`,
      );
    if (r.result) reply.insertAdjacentHTML('beforeend', resultHTML(r.result));
    if (r.proposal) renderProposal(r.proposal, reply);
    reply.scrollIntoView({ block: 'nearest' });
  } catch (e) {
    pending.remove();
    message(`I couldn't complete this request: ${e.message}`);
  } finally {
    sending = false;
    $('#send').disabled = false;
  }
}
$('#composer').onsubmit = (e) => {
  e.preventDefault();
  send($('#message').value);
};
$('#message').onkeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send($('#message').value);
  }
};
document
  .querySelectorAll('[data-prompt]')
  .forEach((el) => (el.onclick = () => send(el.dataset.prompt)));
async function activity() {
  const list = $('#activity-list');
  list.textContent = 'Loading operation receipts…';
  try {
    const { receipts } = await api('/agent/activity');
    list.innerHTML = receipts.length
      ? receipts
          .map(
            (r) =>
              `<article class="activity-row"><span class="receipt-check">✓</span><div><strong>${esc(r.action === 'schedule' ? 'Publishing schedule set' : 'Metadata updated')}</strong><small>${esc(r.videoId)} · ${esc(r.mode)} · ${esc(new Date(r.at).toLocaleString())}</small>${r.publishAt ? `<small>Release: ${esc(new Date(r.publishAt).toLocaleString())}</small>` : ''}</div></article>`,
          )
          .join('')
      : '<div class="activity-row">No approved changes yet. Ask the assistant to prepare metadata or schedule a video, then review its proposal.</div>';
  } catch (e) {
    list.textContent = e.message;
  }
}
$('#refresh-activity').onclick = activity;
async function loadChannel() {
  const [c, v] = await Promise.all([api('/channel'), api('/videos')]);
  const channel = c.channel;
  videos = v.videos;
  $('#channel-title').textContent = channel.title;
  $('#channel-avatar').textContent = channel.title
    .split(/\s+/)
    .filter((t) => /^[a-z]/i.test(t))
    .slice(0, 2)
    .map((t) => t[0])
    .join('')
    .toUpperCase();
  $('#channel-subtitle').textContent =
    c.mode === 'mock' ? 'Simulated example channel' : 'Authorized YouTube channel';
  $('#subscribers').textContent = compact(channel.stats?.subscriberCount);
  $('#views').textContent = compact(channel.stats?.viewCount);
  $('#video-count').textContent = number(channel.stats?.videoCount);
  const selected = $('#video-select').value;
  $('#video-select').innerHTML =
    '<option value="">Select a video</option>' +
    videos.map((v) => `<option value="${esc(v.id)}">${esc(v.title)}</option>`).join('');
  if (selected) $('#video-select').value = selected;
  else if (videos[0]) $('#video-select').value = videos[0].id;
  const compared = [...videos].sort((a, b) => b.stats.viewCount - a.stats.viewCount).slice(0, 5);
  const max = Math.max(...compared.map((v) => v.stats.viewCount), 1);
  $('#performance-bars').innerHTML = compared
    .map(
      (v) =>
        `<div class="bar-row"><div class="bar-label"><span title="${esc(v.title)}">${esc(v.title)}</span><b>${compact(v.stats.viewCount)}</b></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(1, (v.stats.viewCount / max) * 100)}%"></div></div></div>`,
    )
    .join('');
  $('#library').innerHTML = videos
    .map(
      (v, i) =>
        `<article class="video-tile"><div class="video-art" style="filter:hue-rotate(${i * 16}deg)">▷</div><h3>${esc(v.title)}</h3><p>${number(v.stats.viewCount)} views · ${number(v.stats.likeCount)} likes</p>${v.status?.publishAt ? `<p>Scheduled: ${esc(new Date(v.status.publishAt).toLocaleString())}</p>` : ''}<button class="button outline" data-context="${esc(v.id)}">Work on this video ↗</button></article>`,
    )
    .join('');
  document.querySelectorAll('[data-context]').forEach(
    (b) =>
      (b.onclick = () => {
        $('#video-select').value = b.dataset.context;
        view('agent');
        $('#message').focus();
      }),
  );
}
async function boot() {
  try {
    const h = await api('/health');
    const demo = h.youtube === 'mock';
    $('#mode').textContent = demo ? 'Demo workspace' : 'Live workspace';
    $('#channel-kind').textContent = demo ? 'DEMO' : 'LIVE';
    $('#agent-status').textContent = demo ? 'Demo tools available' : 'Live providers configured';
    $('#provider-label').textContent =
      h.ai.provider === 'mock'
        ? 'Demo rules · not a live language model'
        : `${h.ai.provider} · bounded tool access`;
    $('#composer-mode').textContent = h.ai.provider === 'mock' ? 'Demo assistant' : h.ai.provider;
    $('#yt-connection').textContent = demo
      ? 'Not connected · demo data'
      : 'Live provider configured';
    $('#ai-connection').textContent =
      h.ai.provider === 'mock' ? 'Not connected · demo rules' : `${h.ai.provider} configured`;
    notice(
      demo
        ? 'You’re exploring a demo. Channel figures and changes are simulated. Connect your own providers on a persistent server to work with real videos.'
        : 'Live workspace. Review every proposal carefully: approved changes affect your YouTube channel.',
    );
    await loadChannel();
  } catch (e) {
    notice(
      `Workspace could not load: ${e.message} Open Connections to unlock a live server, or retry by reloading.`,
    );
  }
}
$('#unlock').onclick = async () => {
  operatorToken = $('#operator-token').value;
  $('#operator-token').value = '';
  await boot();
};
boot();
