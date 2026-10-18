import { defineConfig } from 'vite';

// No `@vitejs/plugin-react`: the app ships no package.json (see the merge note
// in TASKS.md), so the plugin can never be installed, and importing it here
// made every workspace-wide vite config load fail — including `svelte-check`
// and the root build. Vite's own esbuild transform handles .jsx/.tsx without
// the plugin; only fast-refresh was lost, and this app has no dev server to
// refresh. Re-add both together only if the MFE route is revived (#36).
export default defineConfig({
  server: {
    port: 5174,
    cors: true,
  },
  build: {
    target: 'esnext',
    minify: false,
  },
});
