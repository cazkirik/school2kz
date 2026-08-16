// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: {
    enabled: false,
  },
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'kk'],
    routing: {
      prefixDefaultLocale: false,
      fallbackType: 'redirect',
    },
  },
});