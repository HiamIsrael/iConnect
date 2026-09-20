/* Skills Browser front-end. Zero build step; talks to server.mjs. */

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined) node.append(c);
  return node;
};

const state = { manifest: null, route: null, query: '' };
const fileCache = new Map();

// ---------------------------------------------------------------------------
// Markdown: vendored `marked` (tools/skills-browser/vendor), with a small built-in fallback renderer.

let markedPromise = null;
function loadMarked() {
  if (!markedPromise) {
    markedPromise = import('/vendor/marked.esm.js')
      .then((m) => { m.marked.use({ gfm: true, breaks: false }); return m.marked; })
      .catch(() => null);
  }
  return markedPromise;
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function inline(md) {
  return esc(md)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}

/** Minimal GFM-ish renderer used only if the vendored module fails to load. */
function miniMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para.length = 0; } };
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      flushPara();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { flushPara(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flushPara(); out.push('<hr>'); i++; continue; }
    if (/^\|/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || '')) {
      flushPara();
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${miniMarkdown(buf.join('\n'))}</blockquote>`);
      continue;
    }
    const li = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      flushPara();
      const ordered = /\d/.test(li[2]);
      const items = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (!m || m[1].length !== li[1].length) {
          if (lines[i] && /^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1] += ' ' + lines[i].trim(); i++; continue; }
          break;
        }
        items.push(m[3]);
        i++;
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    if (!line.trim()) { flushPara(); i++; continue; }
    para.push(line.trim());
    i++;
  }
  flushPara();
  return out.join('\n');
}

async function renderMarkdown(md) {
  const marked = await loadMarked();
  const html = marked ? marked.parse(md) : miniMarkdown(md);
  // Defensive sanitisation: these are our own repo files, but keep it cheap and safe.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, style, link').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((n) => {
    for (const a of [...n.attributes]) {
      if (/^on/i.test(a.name)) n.removeAttribute(a.name);
      if ((a.name === 'href' || a.name === 'src') && /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name);
    }
  });
  return doc.body;
}

// ---------------------------------------------------------------------------
// Routing

const routes = {
  parse(hash) {
    const h = (hash || '#overview').replace(/^#/, '');
    const [kind, ...rest] = h.split('/');
    return { kind: kind || 'overview', arg: rest.join('/') };
  },
  go(kind, arg) { location.hash = arg ? `${kind}/${arg}` : kind; },
};

window.addEventListener('hashchange', () => render());

// ---------------------------------------------------------------------------
// Data helpers

async function fetchFile(rel) {
  if (fileCache.has(rel)) return fileCache.get(rel);
  const res = await fetch(`/api/file?p=${encodeURIComponent(rel)}`);
  if (!res.ok) throw new Error(`${rel}: ${res.status}`);
  const { text } = await res.json();
  fileCache.set(rel, text);
  return text;
}

const stripFrontmatter = (t) => t.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
const phaseLabel = (id) => (state.manifest.phases.find((p) => p.id === id) || { label: 'Other' }).label;
const skillByName = (n) => state.manifest.skills.find((s) => s.name === n || s.dir === n);

/** Map a repo-relative path (already resolved against the current doc) to an in-app route, or null. */
function routeForPath(rel) {
  const s = /^(?:\.agents|\.claude)\/skills\/([^/]+)(?:\/SKILL\.md)?$/.exec(rel);
  if (s && skillByName(s[1])) return `#skill/${s[1]}`;
  const r = /^(?:\.agents|\.claude)\/references\/([a-z0-9-]+)\.md$/.exec(rel);
  if (r && state.manifest.references.some((x) => x.name === r[1])) return `#reference/${r[1]}`;
  if (/\.(md|toml|json)$/.test(rel) && /^(\.agents|\.claude|\.gemini)\//.test(rel) || ['AGENTS.md', 'CLAUDE.md', 'README.md', 'skills-lock.json'].includes(rel)) return `#file/${rel}`;
  return null;
}

/** Turn relative markdown links — and inline-code path citations — into in-app routes. */
function rewriteLinks(container, currentPath) {
  const base = new URL(currentPath, 'http://repo/');
  const resolve = (href) => {
    try { return decodeURIComponent(new URL(href, base).pathname.replace(/^\//, '')); } catch { return null; }
  };

  for (const a of container.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (/^https?:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; continue; }
    if (href.startsWith('#')) continue;
    const rel = resolve(href);
    const route = rel && routeForPath(rel);
    if (route) a.href = route; else a.removeAttribute('href');
  }

  // Skills cite shared files as `../../references/x.md` or `skills/<name>/SKILL.md` inside backticks.
  const pathLike = /^(?:\.\.\/)*(?:references|skills)\/[A-Za-z0-9._/-]+$/;
  for (const code of container.querySelectorAll('code')) {
    if (code.closest('pre, a')) continue;
    const text = code.textContent.trim();
    if (!pathLike.test(text)) continue;
    // Bare `skills/<name>` is written from the pack root; resolve it against the skills dir instead of the current file.
    const rel = text.startsWith('skills/') ? `.agents/${text}` : resolve(text);
    const route = rel && routeForPath(rel);
    if (!route) continue;
    const a = el('a', { href: route });
    code.replaceWith(a);
    a.append(code);
  }
}

// ---------------------------------------------------------------------------
// Sidebar

function buildSidebar() {
  const m = state.manifest;
  const nav = $('#sidebar');
  nav.replaceChildren();

  const group = (title, items, count = items.length) => {
    if (!items.length) return;
    nav.append(el('div', { class: 'nav-group' },
      el('div', { class: 'nav-title' }, title, el('span', { class: 'count' }, String(count))),
      ...items,
    ));
  };
  const item = (label, route, { dot, mono = true, search } = {}) =>
    el('button', { class: 'nav-item', 'data-route': route, 'data-search': (search || label).toLowerCase(), onclick: () => (location.hash = route) },
      dot ? el('span', { class: `dot ${dot}` }) : null,
      el('span', { class: mono ? 'mono' : '' }, label),
    );

  nav.append(el('div', { class: 'nav-group' }, item('Overview & wiring', 'overview', { mono: false, search: 'overview wiring agents matrix' })));

  for (const ph of m.phases) {
    const skills = m.skills.filter((s) => s.phase === ph.id);
    group(ph.label, skills.map((s) => item(s.name, `skill/${s.dir}`, { dot: ph.id, search: `${s.name} ${s.description}` })));
  }
  const other = m.skills.filter((s) => s.phase === 'other');
  group('Other skills', other.map((s) => item(s.name, `skill/${s.dir}`, { dot: 'other', search: `${s.name} ${s.description}` })));

  const claudeCmds = m.commands.filter((c) => c.host === 'Claude Code');
  group('Slash commands', claudeCmds.map((c) => item(c.name, `command/${c.name.slice(1)}`, { search: `${c.name} ${c.description} ${c.skills.join(' ')}` })));
  group('Personas', m.personas.map((p) => item(p.name, `persona/${p.name}`, { search: `${p.name} ${p.description}` })));
  group('References', m.references.map((r) => item(r.name, `reference/${r.name}`, { search: `${r.name} ${r.title}` })));
  group('Project files', m.projectFiles.map((f) => item(f.name, `file/${f.path}`, { search: f.name })));

  applyFilter();
  markActive();
}

function applyFilter() {
  const terms = state.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  for (const g of document.querySelectorAll('.nav-group')) {
    let visible = 0;
    for (const it of g.querySelectorAll('.nav-item')) {
      const hit = terms.every((t) => it.dataset.search.includes(t));
      it.classList.toggle('hidden', !hit);
      if (hit) visible++;
    }
    g.style.display = visible ? '' : 'none';
  }
}

function markActive() {
  const current = location.hash.replace(/^#/, '') || 'overview';
  for (const it of document.querySelectorAll('.nav-item')) it.classList.toggle('active', it.dataset.route === current);
}

// ---------------------------------------------------------------------------
// Views

function header({ crumbs, title, desc, badges = [], invoke = [] }) {
  return el('div', { class: 'doc-head' },
    el('div', { class: 'crumbs' }, crumbs),
    el('h1', {}, title),
    desc ? el('p', { class: 'doc-desc' }, desc) : null,
    badges.length ? el('div', { class: 'badges' }, ...badges) : null,
    invoke.length ? el('div', { class: 'invoke' }, ...invoke.map(([host, how]) => el('div', {}, el('b', {}, host), el('code', {}, how)))) : null,
  );
}

async function markdownBody(rel) {
  const text = stripFrontmatter(await fetchFile(rel));
  const body = await renderMarkdown(text);
  const wrap = el('article', { class: 'md' });
  wrap.append(...body.childNodes);
  rewriteLinks(wrap, rel);
  return wrap;
}

async function viewSkill(dir) {
  const s = skillByName(dir);
  if (!s) return notFound(`skill "${dir}"`);
  const badges = [
    el('span', { class: `badge phase ${s.phase}` }, phaseLabel(s.phase)),
    el('span', { class: 'badge' }, s.path),
    el('span', { class: `badge ${s.claude === 'symlink' || s.claude === 'copy' ? 'ok' : 'bad'}` }, `.claude/skills/${s.dir} ${s.claude === 'symlink' ? '→ symlink ✓' : s.claude === 'copy' ? '(copy) ✓' : '✗ ' + s.claude}`),
    el('span', { class: 'badge' }, `${s.words.toLocaleString()} words`),
    ...s.references.map((r) => el('span', { class: 'badge' }, 'uses ', el('button', { onclick: () => routes.go('reference', r.replace(/\.md$/, '')) }, `references/${r}`))),
    ...s.extraFiles.map((f) => el('span', { class: 'badge' }, `+ ${f}`)),
  ];
  const cmds = state.manifest.commands.filter((c) => c.host === 'Claude Code' && c.skills.includes(s.name));
  const invoke = [
    ['Claude Code', cmds.length ? cmds.map((c) => c.name).join(' · ') : `Skill: ${s.name}`],
    ['Codex', `@${s.name}`],
    ['GitHub Copilot', `/${s.name}`],
    ['Cursor · Gemini · OpenCode', 'auto-activates from description'],
  ];
  return [header({ crumbs: s.path, title: s.title, desc: s.description, badges, invoke }), await markdownBody(s.path)];
}

async function viewCommand(name) {
  const cmds = state.manifest.commands.filter((c) => c.name === '/' + name);
  if (!cmds.length) return notFound(`command /${name}`);
  const claude = cmds.find((c) => c.host === 'Claude Code') || cmds[0];
  const gemini = cmds.find((c) => c.host === 'Gemini CLI');
  const badges = cmds.map((c) => el('span', { class: 'badge ok' }, `${c.host}: ${c.path}`));
  for (const sk of claude.skills) {
    const s = skillByName(sk);
    if (s) badges.push(el('span', { class: `badge` }, 'invokes ', el('button', { onclick: () => routes.go('skill', s.dir) }, s.name)));
  }
  for (const pn of claude.personas || []) {
    badges.push(el('span', { class: `badge` }, 'persona ', el('button', { onclick: () => routes.go('persona', pn) }, pn)));
  }
  const parts = [header({ crumbs: claude.path, title: claude.name, desc: claude.description, badges })];
  parts.push(await markdownBody(claude.path));
  if (gemini) {
    parts.push(el('div', { class: 'section' }, el('h2', {}, 'Gemini CLI wrapper', el('small', {}, gemini.path))));
    const text = await fetchFile(gemini.path);
    parts.push(el('pre', { class: 'tree' }, text));
  }
  return parts;
}

async function viewPersona(name) {
  const p = state.manifest.personas.find((x) => x.name === name);
  if (!p) return notFound(`persona "${name}"`);
  const badges = [el('span', { class: 'badge ok' }, p.path), ...p.skills.map((sk) => el('span', { class: 'badge' }, 'uses ', el('button', { onclick: () => routes.go('skill', sk) }, sk)))];
  const invoke = [['Claude Code', `subagent: ${p.name}`], ['Any agent', `paste ${p.path} as the system prompt`]];
  return [header({ crumbs: p.path, title: p.title || p.name, desc: p.description, badges, invoke }), await markdownBody(p.path)];
}

async function viewReference(name) {
  const r = state.manifest.references.find((x) => x.name === name);
  if (!r) return notFound(`reference "${name}"`);
  const badges = [el('span', { class: 'badge ok' }, r.path), el('span', { class: 'badge ok' }, '.claude/references → .agents/references')];
  for (const sk of r.usedBy) badges.push(el('span', { class: 'badge' }, 'used by ', el('button', { onclick: () => routes.go('skill', sk) }, sk)));
  return [header({ crumbs: r.path, title: r.title, badges }), await markdownBody(r.path)];
}

async function viewFile(rel) {
  const text = await fetchFile(rel);
  const head = header({ crumbs: rel, title: rel.split('/').pop(), badges: [el('span', { class: 'badge' }, rel)] });
  if (rel.endsWith('.md')) return [head, await markdownBody(rel)];
  return [head, el('pre', { class: 'tree' }, text)];
}

function notFound(what) {
  return [el('div', { class: 'doc-head' }, el('h1', {}, 'Not found'), el('p', { class: 'doc-desc error' }, `No ${what} is wired into this repository.`))];
}

function tree(m) {
  const skills = m.skills.map((s) => s.dir);
  const show = (arr, n = 3) => arr.slice(0, n).map((x) => `│   │   ├── ${x}/`).join('\n') + (arr.length > n ? `\n│   │   └── … ${arr.length - n} more` : '');
  const lines = [
    `${m.repo}/`,
    `├── AGENTS.md                      <span class="c"># read by Codex, Cursor, Gemini, OpenCode, Copilot, Zed…</span>`,
    `├── CLAUDE.md                      <span class="c"># Claude Code — imports AGENTS.md</span>`,
    `├── skills-lock.json               <span class="c"># pinned source + hashes for \`npx skills update\`</span>`,
    `├── .agents/`,
    `│   ├── skills/                    <span class="c"># canonical copy — ${m.stats.skills} skills</span>`,
    show(skills),
    `│   └── references/                <span class="c"># ${m.stats.references} shared checklists (../../references/*.md)</span>`,
    `├── .claude/`,
    `│   ├── skills/<name> <span class="l">→ ../../.agents/skills/<name></span>   <span class="c"># ${m.stats.skills} symlinks</span>`,
    `│   ├── references <span class="l">→ ../.agents/references</span>`,
    `│   ├── commands/                  <span class="c"># ${m.stats.commands} slash commands</span>`,
    `│   └── agents/                    <span class="c"># ${m.stats.personas} subagent personas</span>`,
    `├── .gemini/`,
    `│   └── commands/                  <span class="c"># ${m.stats.geminiCommands} TOML command wrappers</span>`,
    `└── tools/skills-browser/          <span class="c"># this UI</span>`,
  ];
  const pre = el('pre', { class: 'tree' });
  pre.innerHTML = lines.join('\n');
  return pre;
}

function viewOverview() {
  const m = state.manifest;
  const cmdFor = { define: '/spec', plan: '/plan', build: '/build', verify: '/test', review: '/review', ship: '/ship' };

  const hero = el('div', { class: 'hero' },
    el('h1', {}, 'What the agents see'),
    el('p', {}, `${m.stats.skills} skills, ${m.stats.commands} slash commands, ${m.stats.personas} personas and ${m.stats.references} shared checklists from ${m.pack.name} v${m.pack.version} are wired into this repository. Every item below is read live from the working tree.`),
  );

  const pipeline = el('div', { class: 'pipeline' },
    ...m.phases.filter((p) => p.id !== 'meta').map((p) => {
      const n = m.skills.filter((s) => s.phase === p.id).length;
      return el('button', { class: 'stage', onclick: () => { const first = m.skills.find((s) => s.phase === p.id); if (first) routes.go('skill', first.dir); } },
        el('span', { class: `bar ${p.id}` }),
        el('div', { class: 'k' }, p.label),
        el('div', { class: 'n' }, `${n}`, el('span', { class: 'b' }, ` skill${n === 1 ? '' : 's'}`)),
        el('div', { class: 'b' }, p.blurb),
        el('div', { class: 'cmd' }, cmdFor[p.id] || ''),
      );
    }),
  );

  const health = m.problems.length
    ? el('div', { class: 'problems' }, el('h3', {}, `${m.problems.length} wiring problem${m.problems.length === 1 ? '' : 's'}`), el('ul', {}, ...m.problems.map((p) => el('li', {}, p))))
    : el('div', { class: 'allgood' }, '✓ All symlinks resolve, every ../../references/ link points at a real file, and no plugin-namespaced command references remain.');

  const tick = (v) => el('span', { class: v === null ? 'na' : v ? 'tick' : 'cross' }, v === null ? '—' : v ? '✓' : '✗');
  const matrix = el('table', { class: 'matrix' },
    el('thead', {}, el('tr', {}, ...['Agent', 'Skills', 'Commands', 'Personas', 'Instructions', 'How to invoke'].map((h) => el('th', {}, h)))),
    el('tbody', {}, ...m.agents.map((a) => el('tr', {},
      el('td', {}, a.name),
      el('td', {}, tick(a.ok.skills), ' ', el('code', {}, a.skills)),
      el('td', {}, a.commands ? [tick(a.ok.commands), ' ', el('code', {}, a.commands)] : el('span', { class: 'na' }, '— (use skill names)')),
      el('td', {}, a.personas ? [tick(a.ok.personas), ' ', el('code', {}, a.personas)] : el('span', { class: 'na' }, '—')),
      el('td', {}, tick(a.ok.instructions), ' ', el('code', {}, a.instructions)),
      el('td', {}, el('code', {}, a.invoke)),
    ))),
  );

  const skillCards = el('div', { class: 'cards' }, ...m.skills.map((s) => el('button', { class: 'card', onclick: () => routes.go('skill', s.dir) },
    el('div', { class: 'name' }, el('span', { class: `dot ${s.phase}` }), s.name),
    el('div', { class: 'desc' }, s.description),
    el('div', { class: 'meta' }, `${phaseLabel(s.phase)} · ${s.words.toLocaleString()} words${s.references.length ? ` · ${s.references.length} ref${s.references.length > 1 ? 's' : ''}` : ''}`),
  )));

  const cmdCards = el('div', { class: 'cards' }, ...m.commands.filter((c) => c.host === 'Claude Code').map((c) => el('button', { class: 'card', onclick: () => routes.go('command', c.name.slice(1)) },
    el('div', { class: 'name' }, c.name),
    el('div', { class: 'desc' }, c.description),
    el('div', { class: 'meta' }, [...c.skills, ...(c.personas || []).map((p) => `${p} (persona)`)].length ? `→ ${[...c.skills, ...(c.personas || []).map((p) => `${p} (persona)`)].join(', ')}` : ''),
  )));

  const personaCards = el('div', { class: 'cards' }, ...m.personas.map((p) => el('button', { class: 'card', onclick: () => routes.go('persona', p.name) },
    el('div', { class: 'name' }, p.name),
    el('div', { class: 'desc' }, p.description),
  )));

  const lock = m.lock ? el('p', { class: 'dim' }, `skills-lock.json pins ${m.lock.count} skills from ${m.lock.sources.join(', ')} — run `, el('code', {}, 'npx skills update'), ' to pull upstream changes.') : null;

  return [
    hero,
    pipeline,
    health,
    el('div', { class: 'section' }, el('h2', {}, 'Who reads what', el('small', {}, 'checked against the working tree just now')), matrix),
    el('div', { class: 'section' }, el('h2', {}, 'Layout'), tree(m), lock),
    el('div', { class: 'section' }, el('h2', {}, 'Skills', el('small', {}, `${m.stats.skills} · ${m.stats.words.toLocaleString()} words of workflow`)), skillCards),
    el('div', { class: 'section' }, el('h2', {}, 'Slash commands', el('small', {}, 'Claude Code · mirrored for Gemini CLI as TOML')), cmdCards),
    el('div', { class: 'section' }, el('h2', {}, 'Personas', el('small', {}, 'Claude Code subagents · usable as system prompts anywhere')), personaCards),
  ];
}

// ---------------------------------------------------------------------------
// Render loop

async function render() {
  const content = $('#content');
  markActive();
  if (!state.manifest) return;
  const { kind, arg } = routes.parse(location.hash);
  content.replaceChildren(el('div', { class: 'loading' }, 'Loading…'));
  try {
    let nodes;
    switch (kind) {
      case 'skill': nodes = await viewSkill(arg); break;
      case 'command': nodes = await viewCommand(arg); break;
      case 'persona': nodes = await viewPersona(arg); break;
      case 'reference': nodes = await viewReference(arg); break;
      case 'file': nodes = await viewFile(arg); break;
      default: nodes = viewOverview();
    }
    content.replaceChildren(...nodes);
    content.scrollIntoView({ block: 'start' });
    window.scrollTo({ top: 0 });
  } catch (err) {
    content.replaceChildren(el('p', { class: 'error' }, String(err.message || err)));
  }
}

function renderStats() {
  const m = state.manifest;
  $('#pack-line').textContent = `${m.pack.name} v${m.pack.version} · ${m.pack.license} · wired into ${m.repo}/`;
  $('#stats').replaceChildren(
    el('span', { class: 'chip' }, el('b', {}, m.stats.skills), ' skills'),
    el('span', { class: 'chip' }, el('b', {}, m.stats.commands), ' commands'),
    el('span', { class: 'chip' }, el('b', {}, m.stats.personas), ' personas'),
    el('span', { class: 'chip' }, el('b', {}, m.stats.references), ' references'),
    el('span', { class: `chip ${m.problems.length ? 'bad' : 'ok'}` }, m.problems.length ? `${m.problems.length} problems` : 'wiring healthy'),
  );
}

async function boot() {
  try {
    const res = await fetch('/api/manifest');
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    state.manifest = await res.json();
  } catch (err) {
    $('#content').replaceChildren(el('p', { class: 'error' }, `Could not load manifest: ${err.message}`));
    return;
  }
  renderStats();
  buildSidebar();
  loadMarked(); // warm up
  render();

  const search = $('#search');
  search.addEventListener('input', () => { state.query = search.value; applyFilter(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
    if (e.key === 'Escape' && document.activeElement === search) { search.value = ''; state.query = ''; applyFilter(); search.blur(); }
  });
}

boot();
