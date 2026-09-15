// Single-file build for sharing the app as one HTML page (no service worker, no manifest).
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z') },
  resolve: { alias: { '@core': fileURLToPath(new URL('../core', import.meta.url)) } },
  server: { fs: { allow: ['..'] } },
  build: { outDir: 'dist-single', assetsInlineLimit: 100000000, cssCodeSplit: false },
  plugins: [viteSingleFile()],
});
