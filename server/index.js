import { startServer } from './app.js';

startServer().catch((error) => {
  console.error('Could not start iConnect:', error);
  process.exit(1);
});
