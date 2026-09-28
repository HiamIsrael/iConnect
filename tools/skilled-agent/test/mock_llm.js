// A tiny scripted OpenAI-compatible server for tests. Each request pops the next scripted reply.
import http from 'node:http';

export function startMockLLM(script) {
  const queue = [...script], seen = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      if (req.url.endsWith('/models')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'mock-1' }] })); }
      if (req.url.endsWith('/audio/transcriptions')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ text: 'transcribed words' })); }
      seen.push(JSON.parse(body));
      const reply = queue.shift() ?? { content: 'no more script' };
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const send = o => res.write(`data: ${JSON.stringify(o)}\n\n`);
      if (reply.content) for (const ch of reply.content.match(/.{1,5}/gs) ?? []) send({ choices: [{ delta: { content: ch } }] });
      if (reply.toolCalls) {
        reply.toolCalls.forEach((tc, i) => {
          send({ choices: [{ delta: { tool_calls: [{ index: i, id: `c${i}`, function: { name: tc.name, arguments: '' } }] } }] });
          for (const ch of JSON.stringify(tc.args).match(/.{1,7}/gs)) send({ choices: [{ delta: { tool_calls: [{ index: i, function: { arguments: ch } }] } }] });
        });
        send({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] });
      } else send({ choices: [{ delta: {}, finish_reason: 'stop' }] });
      send({ usage: { prompt_tokens: 10, completion_tokens: 5 }, choices: [] });
      res.write('data: [DONE]\n\n'); res.end();
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/v1`, seen })));
}
