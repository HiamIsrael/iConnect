import { scheduleDate } from './schedule-date.js';
import { randomUUID } from 'node:crypto';
import { validationError, notConfirmed, notFound } from '../errors.js';
import { generateMetadata } from './metadata.js';
import { analyzeVideo } from './analysis.js';
import { channelInsights } from './channel.js';
import { publishVideo } from './publish.js';

export function createAgent(deps) {
  const { ai, youtube, store } = deps;
  const busy = new Set();
  const mode = youtube.mode || youtube.id;
  async function propose(action, video, preview) {
    const proposal = {
      id: randomUUID(),
      action,
      videoId: video.id,
      videoTitle: video.title,
      channelId: (await youtube.getChannel()).id,
      preview,
      mode,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await store.write(`agent-${proposal.id}`, proposal);
    return proposal;
  }
  return {
    async chat(body = {}) {
      const { message, videoId, publishAt } = body || {};
      if (typeof message !== 'string' || !message.trim() || message.length > 4000)
        throw validationError('Message must be 1–4000 characters.');
      let kind;
      if (ai.id === 'mock') {
        kind = /schedul/i.test(message)
          ? 'schedule'
          : /title|description|metadata|optimi/i.test(message)
            ? 'metadata'
            : /analy[sz]e.*video|review.*video/i.test(message)
              ? 'analysis'
              : /channel|review|insight|performance/i.test(message)
                ? 'insights'
                : 'help';
      } else {
        const plan = await ai.complete('agent', {
          message,
          selectedVideoId: videoId || null,
          publishAt: publishAt || null,
        });
        kind = plan?.kind;
      }
      if (!['schedule', 'metadata', 'analysis', 'insights', 'help'].includes(kind))
        throw validationError('The model requested an unsupported tool. No action was taken.');
      const trace = [
        `Interpret request · ${ai.id === 'mock' ? 'demo rules' : ai.id}`,
        `Tool · ${kind}`,
      ];
      if (kind === 'help')
        return {
          reply:
            'I can review your channel, analyze a selected video, prepare titles and descriptions, or schedule an existing upload. Select a video for video tasks. Changes always need your approval. Uploads, comments, copyright and monetization are not supported yet.',
          trace,
        };
      if (kind === 'insights')
        return {
          reply:
            'Here is your channel review. These recommendations are based on the data available to the configured provider—not watch-time or revenue analytics.',
          result: await channelInsights(deps),
          trace,
        };
      if (typeof videoId !== 'string' || !videoId)
        return {
          reply: 'Select a video in the context controls below, then send your request again.',
          trace,
        };
      const video = await youtube.getVideo(videoId);
      if (kind === 'analysis')
        return {
          reply: 'Review complete, based on available metadata and transcript (when supplied). I do not watch the video. No channel changes were made.',
          result: await analyzeVideo(deps, videoId, {}),
          trace,
        };
      if (kind === 'schedule') {
        if (!publishAt)
          return {
            reply:
              'Choose a date and time in the schedule control below, then ask me to schedule again. I will not guess a publishing time.',
            trace,
          };
        const date = scheduleDate(publishAt);
        return {
          reply:
            'Review this exact publishing time. On a live channel, YouTube will keep the eligible upload private until this time. Previously published videos may not be eligible.',
          proposal: await propose('schedule', video, { publishAt: date, privacyStatus: 'private' }),
          trace,
        };
      }
      const metadata = await generateMetadata(deps, videoId, { notes: message });
      const preview = {
        title: metadata.titles[0].text,
        description: metadata.description,
        tags: metadata.tags,
      };
      return {
        reply:
          'I prepared a new title, description, chapters and tags. Review the complete change below. Nothing has been applied yet.',
        result: metadata,
        proposal: await propose('metadata', video, preview),
        trace,
      };
    },
    async approve(id, body) {
      if (body?.confirm !== true) throw notConfirmed();
      if (!/^[a-f0-9-]{36}$/.test(id)) throw notFound('Unknown proposal');
      if (busy.has(id)) throw validationError('This proposal is already executing.');
      busy.add(id);
      try {
        const p = await store.read(`agent-${id}`);
        if (!p) throw notFound('Unknown proposal');
        if (p.mode !== mode || p.status !== 'pending')
          throw validationError('This proposal cannot be executed again.');
        if (Date.now() - Date.parse(p.createdAt) > 3600000)
          throw validationError('Proposal expired. Please request a fresh preview.');
        if (p.channelId !== (await youtube.getChannel()).id)
          throw validationError('The connected channel changed. Request a fresh proposal.');
        if (p.action === 'schedule') scheduleDate(p.preview.publishAt);
        p.status = 'executing';
        await store.write(`agent-${id}`, p);
        try {
          if (p.action === 'metadata')
            await publishVideo(deps, p.videoId, { ...p.preview, confirm: true });
          else if (p.action === 'schedule') {
            await youtube.scheduleVideo(p.videoId, p.preview.publishAt);
            await store.appendLog({
              at: new Date().toISOString(),
              videoId: p.videoId,
              mode,
              updated: ['publishAt'],
              publishAt: p.preview.publishAt,
            });
          } else throw validationError('Unsupported action');
          p.status = 'completed';
        } catch (e) {
          p.status = 'needs-review';
          await store.write(`agent-${id}`, p);
          throw e;
        }
        p.completedAt = new Date().toISOString();
        await store.write(`agent-${id}`, p);
        return {
          receipt: {
            id,
            action: p.action,
            videoId: p.videoId,
            status: p.status,
            mode,
            at: p.completedAt,
            preview: p.preview,
          },
        };
      } finally {
        busy.delete(id);
      }
    },
    async activity() {
      return {
        receipts: (await store.readPublishLog())
          .map((r) => ({
            ...r,
            action: r.updated?.includes('publishAt') ? 'schedule' : 'metadata',
            status: 'completed',
          }))
          .reverse(),
      };
    },
  };
}
