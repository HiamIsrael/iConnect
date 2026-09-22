import { describe, expect, it } from 'vitest';
import {
  detectSandboxId,
  looksLikeSandboxId,
  previewUrls,
  verifyUrl,
} from '../tools/preview-url.mjs';

describe('looksLikeSandboxId', () => {
  it('accepts the e2b id shape and rejects everything else', () => {
    expect(looksLikeSandboxId('ioha2csfota4qwygab8yc')).toBe(true);
    expect(looksLikeSandboxId('if39bsff4nhcjyqyer8z7')).toBe(true);
    expect(looksLikeSandboxId('e2b.local')).toBe(false); // dots
    expect(looksLikeSandboxId('short')).toBe(false); // too small
    expect(looksLikeSandboxId('has spaces in it here')).toBe(false);
    expect(looksLikeSandboxId(undefined)).toBe(false);
    expect(looksLikeSandboxId('')).toBe(false);
  });
});

describe('detectSandboxId', () => {
  const no = { env: {}, hostname: 'e2b.local', readFile: () => null };

  it('prefers well-known env vars', () => {
    expect(
      detectSandboxId({ ...no, env: { E2B_SANDBOX_ID: 'ioha2csfota4qwygab8yc' } }),
    ).toBe('ioha2csfota4qwygab8yc');
    expect(
      detectSandboxId({ ...no, env: { SANDBOX_ID: 'abcdefgh12345678' } }),
    ).toBe('abcdefgh12345678');
  });

  it('ignores env values that do not look like a sandbox id', () => {
    expect(
      detectSandboxId({ ...no, env: { E2B_SANDBOX_ID: 'e2b.local' } }),
    ).toBe(null);
  });

  it('falls back to the hostname and runtime files', () => {
    expect(detectSandboxId({ ...no, hostname: 'if39bsff4nhcjyqyer8z7' })).toBe(
      'if39bsff4nhcjyqyer8z7',
    );
    expect(
      detectSandboxId({
        ...no,
        readFile: (file) => (file === '/run/e2b/sandbox-id' ? 'zxcvbnmasdfghjkl1234' : null),
      }),
    ).toBe('zxcvbnmasdfghjkl1234');
  });

  it('returns null when nothing identifies a sandbox', () => {
    expect(detectSandboxId(no)).toBe(null);
  });
});

describe('previewUrls', () => {
  it('builds the sandbox-scoped preview URL', () => {
    expect(previewUrls({ sandboxId: 'ioha2csfota4qwygab8yc', port: 5173 })).toEqual({
      sandboxId: 'ioha2csfota4qwygab8yc',
      web: 'https://5173-ioha2csfota4qwygab8yc.e2b.app',
    });
    expect(previewUrls({ sandboxId: 'ioha2csfota4qwygab8yc', port: 4173 })).toEqual({
      sandboxId: 'ioha2csfota4qwygab8yc',
      web: 'https://4173-ioha2csfota4qwygab8yc.e2b.app',
    });
  });

  it('returns null without a sandbox id', () => {
    expect(previewUrls({ sandboxId: null })).toBe(null);
  });
});

describe('verifyUrl', () => {
  it('reports a reachable URL with its status code', async () => {
    const fetchImpl = async () => ({ status: 200 });
    await expect(verifyUrl('https://example.test', fetchImpl)).resolves.toEqual({
      ok: true,
      detail: 'reachable (HTTP 200)',
    });
  });

  it('falls back to GET when HEAD is rejected', async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push(init.method);
      if (init.method === 'HEAD') throw new Error('405');
      return { status: 200 };
    };
    await expect(verifyUrl('https://example.test', fetchImpl)).resolves.toEqual({
      ok: true,
      detail: 'reachable (HTTP 200)',
    });
    expect(calls).toEqual(['HEAD', 'GET']);
  });

  it('degrades gracefully when egress is blocked', async () => {
    const fetchImpl = async () => {
      throw new Error('blocked');
    };
    const result = await verifyUrl('https://example.test', fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/not verifiable/);
  });
});
