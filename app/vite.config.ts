import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: process.env.BASE_PATH ?? '/benchmate/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: { '@core': fileURLToPath(new URL('../core', import.meta.url)) },
  },
  server: { fs: { allow: ['..'] } },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'TGGR Bench Mate',
        short_name: 'Bench Mate',
        description: 'Bench companion for molecular biology. Offline, no ads, no accounts.',
        theme_color: '#0e1c1d',
        background_color: '#0e1c1d',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,json,md}'] },
    }),
  ],
  test: { include: ['tests/**/*.test.ts'] },
});
