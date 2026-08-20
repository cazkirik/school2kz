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
  redirects: {
    '/register': '/auth/signup',
    '/kk/register': '/kk/auth/signup',
    '/admin/news/new': '/admin/news',
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