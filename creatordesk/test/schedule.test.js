import { it, expect } from 'vitest';
import { createLiveYouTubeProvider } from '../server/providers/youtube/live.js';
function setup({ privacyStatus = 'private', channelId = 'mine' } = {}) {
  const calls = [];
  const provider = createLiveYouTubeProvider(
    { youtube: { clientId: 'id', clientSecret: 'secret', refreshToken: 'refresh' } },
    {
      fetchImpl: async (url, init = {}) => {
        calls.push({ url, init });
        const body = url.includes('oauth2')
          ? { access_token: 'token' }
          : url.includes('/channels?')
            ? { items: [{ id: 'mine' }] }
            : init.method === 'PUT'
              ? { id: 'v', status: JSON.parse(init.body).status }
              : {
                  items: [
                    {
                      id: 'v',
                      snippet: { channelId },
                      status: { privacyStatus, selfDeclaredMadeForKids: true },
                    },
                  ],
                };
        return { ok: true, json: async () => body };
      },
    },
  );
  return { provider, calls };
}
it('delegates schedule to YouTube and preserves made-for-kids declaration', async () => {
  const { provider, calls } = setup();
  await provider.scheduleVideo('v', '2099-01-01T10:00:00Z');
  const write = calls.find((c) => c.init.method === 'PUT');
  expect(JSON.parse(write.init.body).status).toEqual({
    privacyStatus: 'private',
    publishAt: '2099-01-01T10:00:00.000Z',
    selfDeclaredMadeForKids: true,
  });
});
it('refuses public videos and videos not owned by the connected channel', async () => {
  for (const options of [{ privacyStatus: 'public' }, { channelId: 'other' }]) {
    const { provider, calls } = setup(options);
    await expect(provider.scheduleVideo('v', '2099-01-01T10:00:00Z')).rejects.toThrow();
    expect(calls.some((c) => c.init.method === 'PUT')).toBe(false);
  }
});
it('rejects past dates before making API requests', async () => {
  const { provider, calls } = setup();
  await expect(provider.scheduleVideo('v', '2020-01-01T10:00:00Z')).rejects.toThrow();
  expect(calls).toHaveLength(0);
});
