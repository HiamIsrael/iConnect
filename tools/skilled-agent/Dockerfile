# Skilled Agent — runs the web UI/API (+ Telegram/WhatsApp channels + scheduler) 24/7.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip git curl ripgrep bash ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 \
    AGENT_WORKDIR=/workspace AGENT_DATA_DIR=/data
RUN mkdir -p /workspace /data && chown -R node:node /app /workspace /data
USER node
VOLUME ["/workspace", "/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s CMD curl -fsS http://localhost:8787/healthz || exit 1
CMD ["node", "bin/agent.js", "serve"]
