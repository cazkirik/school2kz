import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { supabase } from '../lib/supabase';
import { siteConfig } from '../siteConfig';

export const prerender = false;

const base = siteConfig.siteUrl.replace(/\/$/, '');

const staticRoutes = [
  '', '/about/', '/contacts/', '/schedule/', '/teachers/', '/news/', '/publications/', '/announcements/', '/feedback/',
  '/kk/', '/kk/about/', '/kk/contacts/', '/kk/schedule/', '/kk/teachers/', '/kk/news/', '/kk/publications/', '/kk/announcements/', '/kk/feedback/',
];

export const GET: APIRoute = async () => {
  const { data: newsItems } = await supabase
    .from('news')
    .select('slug, lang, updated_at');

  const newsRoutes = (newsItems ?? [])
    .filter((n: { slug: string | null }) => n.slug)
    .map((n: { slug: string; lang: string; updated_at: string }) => ({
      path: `${n.lang === 'ru' ? '' : '/kk'}/news/${n.slug}/`,
      mod: n.updated_at,
    }));

  const pubs = await getCollection('publications');
  const pubRoutes = pubs.map((p) => ({
    path: `${p.data.lang === 'ru' ? '' : '/kk'}/publications/${p.id.split('/')[0]}/`,
    mod: p.data.date.toISOString(),
  }));

  const all: { path: string; mod: string | null }[] = [
    ...staticRoutes.map((p) => ({ path: p, mod: null as string | null })),
    ...newsRoutes,
    ...pubRoutes,
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all
    .map((r) => `<url><loc>${base}${r.path}</loc>${r.mod ? `<lastmod>${r.mod.split('T')[0]}</lastmod>` : ''}<changefreq>monthly</changefreq></url>`)
    .join('\n')}\n</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
