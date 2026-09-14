// Demo-only copy of the project's vite.config.ts. The one change: Electron is
// started in English (-AppleLanguages), because this Mac is set to Korean and
// the app, its dates and the pages it loads follow the system language.
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron/simple';

const ROOT = '/Users/isangmin/Desktop/JS/focus_desk';

export default defineConfig({
  root: ROOT,
  server: { port: 3007, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: path.join(ROOT, 'electron/main.ts'),
        onstart({ startup }) {
          startup(['.', '--no-sandbox', '-AppleLanguages', '(en-US)']);
        },
      },
      preload: { input: path.join(ROOT, 'electron/preload.ts') },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      '@': path.join(ROOT, 'src'),
    },
  },
});
