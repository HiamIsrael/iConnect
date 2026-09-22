// Resolve the public preview URL for the Arena/e2b sandbox this repo is
// running in.
//
// Preview URLs are sandbox-scoped: https://<port>-<sandboxId>.e2b.app — and
// they stop resolving the moment the sandbox is replaced (the id CHANGES
// between sandboxes). Never hardcode one: derive it from the live environment
// and verify it every time. `npm run preview-url` prints the current link.

import fs from 'node:fs';
import os from 'node:os';

export const DEFAULT_WEB_PORT = 5173;
const DEFAULT_DOMAIN = 'e2b.app';
const ID_ENV_KEYS = ['E2B_SANDBOX_ID', 'SANDBOX_ID', 'ARENA_SANDBOX_ID'];
const ID_FILES = ['/run/e2b/sandbox-id', '/run/e2b/id'];

export function looksLikeSandboxId(value) {
  return typeof value === 'string' && /^[a-z0-9]{8,64}$/.test(value.trim());
}

function tryRead(file) {
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    return null;
  }
}

/**
 * Find the current sandbox id. Sources, in order: well-known env vars, the
 * machine hostname, e2b runtime files. Everything is injectable for tests.
 * Returns null when this is not an identifiable sandbox.
 */
export function detectSandboxId({
  env = process.env,
  hostname = os.hostname(),
  readFile = tryRead,
} = {}) {
  for (const key of ID_ENV_KEYS) {
    if (looksLikeSandboxId(env[key])) return env[key].trim();
  }
  for (const candidate of [hostname, readFile('/etc/hostname')]) {
    if (looksLikeSandboxId(candidate)) return candidate.trim();
  }
  for (const file of ID_FILES) {
    const value = readFile(file);
    if (looksLikeSandboxId(value)) return value.trim();
  }
  return null;
}

/** Build the public preview URL for `port`, or null outside an e2b sandbox. */
export function previewUrls({
  port = Number(process.env.WEB_PORT) || DEFAULT_WEB_PORT,
  domain = process.env.PREVIEW_DOMAIN || DEFAULT_DOMAIN,
  sandboxId = detectSandboxId(),
} = {}) {
  if (!sandboxId) return null;
  return {
    sandboxId,
    web: `https://${port}-${sandboxId}.${domain}`,
  };
}

/** Best-effort reachability check for a URL from inside the sandbox. */
export async function verifyUrl(url, fetchImpl = fetch, timeoutMs = 5000) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetchImpl(url, {
        method,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });
      return { ok: true, detail: `reachable (HTTP ${res.status})` };
    } catch {
      /* try the next method */
    }
  }
  return {
    ok: false,
    detail: 'not verifiable from inside the sandbox (restricted egress) — the link may still work in your browser',
  };
}

/** Is the dev server up locally? */
export async function localStatus(port = DEFAULT_WEB_PORT, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`http://127.0.0.1:${port}/`, {
      signal: AbortSignal.timeout(2000),
    });
    return `up on :${port} (HTTP ${res.status})`;
  } catch {
    return `not running on :${port} — start it with \`npm run dev\``;
  }
}

async function main() {
  const info = previewUrls();
  if (!info) {
    console.error('Could not detect a sandbox id (checked env, hostname, /run/e2b).');
    console.error('If you are in an e2b sandbox, export E2B_SANDBOX_ID=<id> and retry.');
    process.exit(1);
  }
  const [local, external] = await Promise.all([
    localStatus(Number(info.web.split('//')[1].split('-')[0]) || DEFAULT_WEB_PORT),
    verifyUrl(info.web),
  ]);
  console.log(`Sandbox:  ${info.sandboxId}`);
  console.log(`Preview:  ${info.web}`);
  console.log(`Local:    ${local}`);
  console.log(`External: ${external.detail}`);
  console.log('');
  console.log('This URL is scoped to the CURRENT sandbox and stops resolving when the');
  console.log('sandbox is replaced (the id changes). Re-run `npm run preview-url` for the');
  console.log('live link — never hardcode an old one.');
}

// Run the CLI only when invoked directly (deliberately no import.meta /
// shebang: vite's config loader splices an import.meta shim onto line 1 of
// imported modules, which would glue onto a shebang and break the build).
if (/preview-url\.mjs$/.test(String(process.argv[1] || ''))) {
  main();
}
