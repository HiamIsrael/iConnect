# ⚡ Skilled Agent

A general-purpose, local-first AI agent that **plans, researches, codes, runs, verifies, schedules, delegates and chats** —
guided by the 25 [Agent Skills](https://github.com/addyosmani/agent-skills) (Addy Osmani, MIT) and talking to
**any OpenAI-compatible LLM** (OpenAI, OpenRouter, Groq, Together, Ollama, LM Studio, vLLM…).

- **Zero npm dependencies** — Node ≥ 20 only. Python 3 powers the `run_python` tool and the skills sync script.
- **Five front-ends, one core**: CLI, REPL, Web UI (with voice), Telegram bot, WhatsApp.
- **Runs anywhere**: `node`, Docker/Compose, or systemd. Self-contained — copy this folder anywhere.

> This folder lives in the iConnect repo purely for safekeeping (`tools/skilled-agent/`). It is not part of the
> iConnect app, its build, tests or deploys. A ready-to-download archive is at `tools/skilled-agent.tar.gz`.

```
skilled-agent/
├── bin/agent.js              CLI: one-shot · REPL · serve · telegram · skills · tools · jobs · models · doctor
├── src/
│   ├── agent.js              the loop: system prompt + history → LLM → tools → … → answer
│   ├── prompt.js             system prompt (env, working rules, skills catalog, memory)
│   ├── config.js             .env / config.json / defaults
│   ├── llm/openai.js         streaming chat-completions client with tool calls
│   ├── skills/loader.js      SKILL.md frontmatter index + progressive disclosure
│   ├── memory.js             persistent key/value memory
│   ├── scheduler.js          one-off / interval / cron jobs, with chat notifications
│   ├── voice.js              speech-to-text + text-to-speech via OpenAI-compatible audio endpoints
│   ├── mcp/client.js         MCP client (stdio JSON-RPC) → mcp__<server>__<tool>
│   ├── tools/                bash · run_python · background processes · files · glob · grep · git ·
│   │                         web_search · fetch_page · http_request · skills · memory · delegate · scheduler
│   ├── channels/             base (shared) · telegram (long polling) · whatsapp (Meta Cloud API webhook)
│   └── server/               HTTP API + SSE + single-file Web UI with mic & read-aloud
├── skills/  references/      the Agent Skills pack (25 skills, 7 checklists)
├── scripts/sync_skills.py    sync/verify skills (from ../../.agents, another dir, or GitHub) → skills-lock.json
├── scripts/demo_llm.js       offline fake LLM for smoke-testing without a key
├── Dockerfile · docker-compose.yml · skilled-agent.service
└── test/                     node:test suite (mock LLM, tools, channels, webhook, voice)
```

## Quick start

```bash
cd tools/skilled-agent            # or wherever you extracted it
cp .env.example .env              # set LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
node bin/agent.js doctor          # config + endpoint check
node bin/agent.js "explore this directory and summarise the project"    # one-shot
node bin/agent.js                 # REPL
node bin/agent.js serve           # Web UI on http://localhost:8787
npm link                          # optional: global `agent` command
```

### Providers

| Provider | `.env` |
|---|---|
| OpenAI | `LLM_BASE_URL=https://api.openai.com/v1` `LLM_MODEL=gpt-4o-mini` |
| OpenRouter (Claude, Gemini, Llama…) | `LLM_BASE_URL=https://openrouter.ai/api/v1` `LLM_MODEL=anthropic/claude-sonnet-4` |
| Groq | `LLM_BASE_URL=https://api.groq.com/openai/v1` `LLM_MODEL=llama-3.3-70b-versatile` |
| Ollama (local, free) | `LLM_BASE_URL=http://localhost:11434/v1` `LLM_MODEL=qwen2.5-coder:14b` |

Any model with tool calling works; stronger models make a stronger agent.

## Capabilities

| Capability | Tools |
|---|---|
| Run anything | `bash`, `run_python`, `start_background_process` / `get_process_logs` / `stop_process` |
| Code & files | `read_file`, `write_file`, `edit_file`, `list_dir`, `glob`, `grep`, `git` |
| Research | `web_search` (DuckDuckGo, no key), `fetch_page`, `http_request` |
| Engineering discipline | `list_skills`, `load_skill`, `load_reference` — routed via `using-agent-skills` |
| Remember | `save_memory`, `search_memory`, `forget_memory` (injected into every prompt) |
| Delegate | `delegate`, `delegate_parallel` — sub-agents with fresh context (depth-limited) |
| Automate | `schedule_task` (one-off / every N min / cron) with `notify: telegram:<id>` or `whatsapp:<num>` |
| Extend | MCP servers in `config.json` appear as tools automatically |

## Channels

### Telegram (easiest — no public URL)
1. `@BotFather` → `/newbot` → copy the token into `TELEGRAM_BOT_TOKEN`.
2. Run `node bin/agent.js serve` (or `agent telegram` for bot-only). Message the bot; it replies with your chat id → put it in `TELEGRAM_ALLOWED_CHAT_IDS`.
3. Chat naturally. Progress is live-edited into the "Working…" message. **Voice notes are transcribed** (needs STT). `/reset`, `/status`, `/jobs`, `/skills`.

### WhatsApp (Meta Cloud API)
1. Meta for Developers → create app → WhatsApp → get `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`.
2. Expose the server over HTTPS (Docker on a VPS, or `cloudflared tunnel` / `ngrok` for testing).
3. Webhook: Callback URL `https://<host>/webhooks/whatsapp`, Verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to **messages**. Set `WHATSAPP_APP_SECRET` for signature verification and `WHATSAPP_ALLOWED_NUMBERS` to lock it down.

### Voice
- **Web UI:** 🎤 uses browser SpeechRecognition (Chrome/Edge) and falls back to recording + `/api/transcribe`. 🔈 reads replies aloud via `/api/speak` (OpenAI `tts-1`) or browser speech.
- **Server STT/TTS:** any `/audio/transcriptions` + `/audio/speech` endpoint. Defaults to the LLM endpoint; e.g. Groq Whisper: `STT_BASE_URL=https://api.groq.com/openai/v1 STT_MODEL=whisper-large-v3`.

## Run 24/7

```bash
# Docker
cp .env.example .env && mkdir -p workspace   # put projects in ./workspace (mounted at /workspace)
docker compose up -d --build                 # web UI :8787, Telegram polling, scheduler, WhatsApp webhook
docker compose logs -f agent

# systemd (bare metal)
sudo cp -r . /opt/skilled-agent && sudo cp skilled-agent.service /etc/systemd/system/
sudo systemctl enable --now skilled-agent
```

## Safety

`AGENT_APPROVAL=auto|ask|deny` governs dangerous actions (`rm -rf`, force-push, `reset --hard`, `DROP TABLE`…). In `ask` mode the CLI prompts and the Web UI shows Allow/Deny; chat channels treat `ask` as deny. Set `AGENT_WEB_TOKEN` when exposing the API. Always set channel allowlists.

## HTTP API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/events?session=ID` | SSE stream (`text`, `tool_call`, `tool_result`, `approval_request`, `done`, `error`) |
| POST | `/api/chat` `{message, session}` | start a turn (202; results stream on `/api/events`) |
| POST | `/api/stop` · `/api/reset` · `/api/approve` · `/api/config` | control |
| POST | `/api/transcribe` (audio body) · `/api/speak` `{text}` | voice |
| GET | `/api/status` `/api/skills[?name=]` `/api/tools` `/api/memory` `/api/jobs` `/api/sessions` `/api/history` `/healthz` | introspection |
| GET/POST | `/webhooks/whatsapp` | Meta webhook |

## Skills maintenance & tests

```bash
npm run skills:sync                       # from ../../.agents (the iConnect copy)
python3 scripts/sync_skills.py --github   # latest upstream pack
npm run skills:verify
npm test
```

## Offline demo (no key)

```bash
node scripts/demo_llm.js &
LLM_BASE_URL=http://127.0.0.1:8790/v1 LLM_API_KEY=demo node bin/agent.js serve
```
