import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, config.host, () => {
  console.log(`CreatorDesk listening on http://${config.host}:${config.port}`);
  console.log(`  youtube provider: ${config.youtube.provider}`);
  console.log(`  ai provider:      ${config.ai.provider}`);
});
