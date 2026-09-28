#!/usr/bin/env node
// Offline OpenAI-compatible endpoint for smoke-testing the agent with no API key.
// Usage: node scripts/demo_llm.js (port 8790) → LLM_BASE_URL=http://127.0.0.1:8790/v1 LLM_API_KEY=demo node bin/agent.js serve
import http from 'node:http';
const PORT = process.env.DEMO_LLM_PORT ?? 8790;
http.createServer((req, res) => {
  let body = ''; req.on('data', d => body += d);
  req.on('end', () => {
    if (req.url.endsWith('/audio/transcriptions')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ text: 'demo transcription: hello agent' })); }
    if (req.url.endsWith('/models')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'demo-model' }] })); }
    const { messages } = JSON.parse(body || '{}');
    const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
    const results = messages.slice(messages.findLastIndex(m => m.role === 'user')).filter(m => m.role === 'tool');
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const send = o => res.write(`data: ${JSON.stringify(o)}\n\n`);
    const text = s => { for (const ch of s.match(/.{1,6}/gs) ?? []) send({ choices: [{ delta: { content: ch } }] }); };
    const call = (i, name, args) => send({ choices: [{ delta: { tool_calls: [{ index: i, id: `demo_${Date.now()}_${i}`, function: { name, arguments: JSON.stringify(args) } }] } }] });
    if (results.length === 0) { text('Let me route this through the matching skill and take a look at the workspace first.\n'); call(0, 'load_skill', { name: 'using-agent-skills' }); call(1, 'list_dir', { path: '.', depth: 1 }); send({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }); }
    else if (results.length === 2) { call(0, 'bash', { command: 'node -v && python3 --version && echo "tools OK"' }); send({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }); }
    else { text(`**Demo mode** (no real LLM connected).\n\nYou asked: “${lastUser.slice(0, 120)}”\n\nI loaded the \`using-agent-skills\` routing skill, listed the working directory, and ran a shell check. With a real model configured in \`.env\` (LLM_BASE_URL / LLM_API_KEY / LLM_MODEL) I would now plan and execute the task end-to-end using all the tools shown on the right.`); send({ choices: [{ delta: {}, finish_reason: 'stop' }] }); }
    send({ usage: { prompt_tokens: 100, completion_tokens: 50 }, choices: [] }); res.write('data: [DONE]\n\n'); res.end();
  });
}).listen(PORT, '127.0.0.1', () => console.log(`demo LLM on http://127.0.0.1:${PORT}/v1`));
