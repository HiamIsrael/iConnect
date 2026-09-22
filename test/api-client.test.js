import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RETRY,
  SERVER_WAKING_MESSAGE,
  api,
  getApiStatus,
  subscribeApiStatus,
} from '../src/api.js';

// Keep the original RETRY values so tests can shrink them without leaking
// changes between tests (RETRY is intentionally mutable for this).
const ORIGINAL_RETRY = { ...RETRY, delaysMs: [...RETRY.delaysMs] };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client resilience', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(RETRY, { ...ORIGINAL_RETRY, delaysMs: [...ORIGINAL_RETRY.delaysMs] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('GET retries after a 503 and then succeeds', async () => {
    RETRY.delaysMs = [100, 200];
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json({ error: 'Service Unavailable' }, 503))
        .mockResolvedValueOnce(json({ musicians: [] })),
    );

    const pending = api.get('/musicians');
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual({ musicians: [] });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(getApiStatus()).toEqual({ state: 'idle', attempt: 0, attempts: RETRY.attempts });
  });

  it('GET retries after a rejected fetch', async () => {
    RETRY.delaysMs = [100, 200];
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(json({ gigs: [] })),
    );

    const pending = api.get('/gigs');
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual({ gigs: [] });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(getApiStatus().state).toBe('idle');
  });

  it('aborts a hung GET after RETRY.timeoutMs and retries it', async () => {
    RETRY.timeoutMs = 500;
    RETRY.delaysMs = [100, 200];
    const signals = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url, init) => {
        signals.push(init.signal);
        if (signals.length === 1) {
          // Simulates a server that never answers (e.g. Render waking up):
          // the promise only settles when our AbortController fires.
          return new Promise((resolve, reject) => {
            init.signal.addEventListener('abort', () => {
              const error = new Error('The operation was aborted.');
              error.name = 'AbortError';
              reject(error);
            });
          });
        }
        return Promise.resolve(json({ musicians: [] }));
      }),
    );

    const pending = api.get('/musicians');
    await vi.advanceTimersByTimeAsync(RETRY.timeoutMs);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual({ musicians: [] });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(signals[0].aborted).toBe(true);
  });

  it('does not retry a 404 and surfaces the server message with status 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ error: 'Musician not found' }, 404)));

    await expect(api.get('/musicians/999')).rejects.toMatchObject({
      message: 'Musician not found',
      status: 404,
      retryable: false,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getApiStatus().state).toBe('idle');
  });

  it('never retries POST, even on a 503', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ error: 'Service Unavailable' }, 503));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.post('/gigs', { title: 'Test gig' })).rejects.toMatchObject({
      message: 'Service Unavailable',
      status: 503,
      retryable: false,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getApiStatus().state).toBe('error');
  });

  it('gives up after RETRY.attempts failures with a server-waking error', async () => {
    RETRY.delaysMs = [100, 200];
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const pending = api.get('/musicians');
    // Attach the rejection handler before advancing timers so the promise is
    // handled at the moment it rejects.
    const assertion = expect(pending).rejects.toMatchObject({
      status: 0,
      message: SERVER_WAKING_MESSAGE,
      retryable: true,
    });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;

    expect(fetch).toHaveBeenCalledTimes(RETRY.attempts);
    expect(getApiStatus().state).toBe('error');
  });

  it('subscribers observe slow → retrying → idle', async () => {
    RETRY.slowAfterMs = 100;
    RETRY.delaysMs = [200, 400];
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        // First attempt hangs past slowAfterMs (so the feed goes 'slow'),
        // then answers with a 503 (so the feed goes 'retrying').
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(json({ error: 'Service Unavailable' }, 503)), 300);
            }),
        )
        .mockResolvedValueOnce(json({ musicians: [] })),
    );

    const seen = [];
    const unsubscribe = subscribeApiStatus((status) => seen.push(status.state));

    const pending = api.get('/musicians');
    await vi.advanceTimersByTimeAsync(1000);
    unsubscribe();
    await expect(pending).resolves.toEqual({ musicians: [] });

    expect(seen).toEqual(['slow', 'retrying', 'idle']);
  });
});
