import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Append the sandbox-scoped public preview URL to vite's startup banner.
//
// Preview hostnames embed the sandbox id (https://<port>-<sandboxId>.e2b.app)
// and the id CHANGES when the sandbox is replaced — hardcoded links die with
// "Sandbox not found". So this derives the URL from the live environment on
// every start. Keep this helper self-contained: importing tools/preview-url.mjs
// from a vite config trips vite's config bundling (import.meta shim glued onto
// the module's shebang). Full CLI + tests live in tools/preview-url.mjs
// (`npm run preview-url`).
function sandboxPreviewBanner() {
  return {
    name: 'sandbox-preview-banner',
    configureServer(server) {
      const printUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        printUrls();
        const id =
          process.env.E2B_SANDBOX_ID ||
          process.env.SANDBOX_ID ||
          process.env.ARENA_SANDBOX_ID;
        const port = server.config.server.port || 5173;
        const domain = process.env.PREVIEW_DOMAIN || 'e2b.app';
        const ok = typeof id === 'string' && /^[a-z0-9]{8,64}$/.test(id.trim());
        console.log(
          ok
            ? `  ➜  Preview:  https://${port}-${id.trim()}.${domain}  (sandbox-scoped — dies with the sandbox; re-check with \`npm run preview-url\`)`
            : '  ➜  Preview:  not an e2b sandbox — no public URL detected',
        );
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), sandboxPreviewBanner()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Dev-only: sandbox previews are proxied under *.e2b.app hostnames.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
