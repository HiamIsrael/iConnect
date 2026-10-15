import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundled = await build({
  entryPoints: [path.join(root, 'scripts/offline-runtime.js')],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  minify: true,
  plugins: [
    {
      name: 'browser-uuid',
      setup(b) {
        b.onResolve({ filter: /^node:crypto$/ }, () => ({ path: 'crypto', namespace: 'browser' }));
        b.onLoad({ filter: /.*/, namespace: 'browser' }, () => ({
          contents: 'export const randomUUID = () => globalThis.crypto.randomUUID();',
        }));
      },
    },
  ],
});
const [html, css, js] = await Promise.all(
  ['web/index.html', 'web/agent.css', 'web/agent.js'].map((p) =>
    fs.readFile(path.join(root, p), 'utf8'),
  ),
);
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const result = html
  .replace(/<link\s+rel="stylesheet"\s+href="\/agent\.css"\s*\/?\s*>/, `<style>${css}</style>`)
  .replace(
    '<title>CreatorDesk — Your channel, handled.</title>',
    '<title>CreatorDesk — Offline interactive demo</title>',
  )
  .replace(/(<a\s+class="brand"\s+href=")\//, '$1#')
  .replace('<a class="nav-item" href="/workbench.html"><span>↗</span> Classic workbench</a>', '')
  .replace(
    '<a href="/GO-LIVE.md" target="_blank" class="button outline">Open setup guide ↗</a>',
    '<p>Offline demo: live connection setup is available in the repository at creatordesk/GO-LIVE.md. This file cannot connect to YouTube. Changes reset on reload.</p>',
  )
  .replace('You’re exploring a demo.', 'You’re exploring an offline demo.')
  .replace(
    '<script src="/agent.js"></script>',
    `<script>${safe(bundled.outputFiles[0].text)}</script><script>${safe(js.replace('You’re exploring a demo.', 'Offline interactive demo. Changes live in memory and reset on reload.'))}</script>`,
  );
if (/<(?:script|link)[^>]+(?:src|href)="\//i.test(result)) {
  throw new Error('Portable demo still contains an external asset dependency');
}
const out = path.join(root, 'dist/CreatorDesk-Agent.html');
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, result);
console.log(out);
