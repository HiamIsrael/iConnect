import { providerError, notFound } from '../../errors.js';

/** Parse ISO-8601 durations like PT12M32S / PT1H2M3S into seconds. */
export function parseIsoDuration(value) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(value || ''));
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

function parseDataUrl(dataUrl) {
  const m = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(String(dataUrl || ''));
  if (!m) throw providerError('thumbnail must be a data: URL');
  const bytes = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8');
  return { mime: m[1], bytes };
}

/**
 * Live YouTube provider (Data API v3 + OAuth refresh-token flow).
 * Read: channels.list (mine), playlistItems.list (uploads), videos.list.
 * Write: videos.update (snippet), thumbnails.set (multipart upload).
 */
export function createLiveYouTubeProvider(cfg, { fetchImpl = fetch } = {}) {
  const { clientId, clientSecret, refreshToken, timeoutMs = 15000 } = cfg?.youtube || {};
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REFRESH_TOKEN are required for the live youtube provider');
  }

  let token = '';
  let tokenExpiry = 0;

  async function accessToken() {
    if (token && Date.now() < tokenExpiry - 60000) return token;
    const res = await fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
    if (!res.ok) throw providerError(`YouTube OAuth token refresh failed (HTTP ${res.status})`);
    const data = await res.json();
    token = data.access_token;
    tokenExpiry = Date.now() + (Number(data.expires_in) || 3600) * 1000;
    return token;
  }

  async function api(url, init = {}) {
    const bearer = await accessToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        ...init,
        headers: { ...(init.headers || {}), authorization: `Bearer ${bearer}` },
        signal: controller.signal,
      });
      if (!res.ok) throw providerError(`YouTube API request failed (HTTP ${res.status})`);
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function mapVideo(item) {
    return {
      id: item.id,
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      publishedAt: item.snippet?.publishedAt || '',
      duration: parseIsoDuration(item.contentDetails?.duration),
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url || '',
      tags: item.snippet?.tags || [],
      stats: {
        viewCount: Number(item.statistics?.viewCount || 0),
        likeCount: Number(item.statistics?.likeCount || 0),
        commentCount: Number(item.statistics?.commentCount || 0),
      },
    };
  }

  async function fetchVideoItems(ids) {
    const data = await api(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${encodeURIComponent(ids.join(','))}&maxResults=25`
    );
    return (data.items || []).map(mapVideo);
  }

  let uploadsPlaylistId = '';

  return {
    id: 'live',
    mode: 'live',
    async getChannel() {
      const data = await api('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true');
      const item = data.items?.[0];
      if (!item) throw notFound('No YouTube channel is connected to these credentials');
      uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads || '';
      return {
        id: item.id,
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        thumbnail: item.snippet?.thumbnails?.medium?.url || '',
        stats: {
          subscriberCount: Number(item.statistics?.subscriberCount || 0),
          viewCount: Number(item.statistics?.viewCount || 0),
          videoCount: Number(item.statistics?.videoCount || 0),
        },
      };
    },
    async listVideos() {
      if (!uploadsPlaylistId) await this.getChannel();
      const data = await api(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=25`
      );
      const ids = (data.items || []).map((i) => i.contentDetails?.videoId).filter(Boolean);
      if (ids.length === 0) return [];
      const videos = await fetchVideoItems(ids);
      return videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    },
    async getVideo(id) {
      const items = await fetchVideoItems([id]);
      if (items.length === 0) throw notFound(`No such video: ${id}`);
      // The Data API does not expose captions; transcript lookup is a v2 feature.
      return { ...items[0], transcript: { segments: [] } };
    },
    async updateVideo(id, { title, description, tags } = {}) {
      const current = (await fetchVideoItems([id]))[0];
      if (!current) throw notFound(`No such video: ${id}`);
      const snippet = {
        title: title !== undefined ? title : current.title,
        description: description !== undefined ? description : current.description,
        tags: tags !== undefined ? tags : current.tags,
      };
      await api('https://www.googleapis.com/youtube/v3/videos?part=snippet', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, snippet }),
      });
      return { ...current, ...snippet };
    },
    async setThumbnail(id, dataUrl) {
      const { mime, bytes } = parseDataUrl(dataUrl);
      const boundary = `creatordesk-${Math.random().toString(36).slice(2)}`;
      const ext = mime.split('/')[1] || 'png';
      const head = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="thumb.${ext}"\r\nContent-Type: ${mime}\r\n\r\n`;
      const tail = `\r\n--${boundary}--\r\n`;
      const body = Buffer.concat([Buffer.from(head, 'utf8'), bytes, Buffer.from(tail, 'utf8')]);
      await api(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
        body,
      });
      const current = (await fetchVideoItems([id]))[0];
      return current || { id };
    },
  };
}
