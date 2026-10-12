import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { navigation } from '../lib/site';
export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const actus = await getCollection('actualites');
  const jour = (d: Date) => d.toISOString().slice(0, 10);
  const derniere = actus.reduce((m, a) => (a.data.date > m ? a.data.date : m), new Date(0));
  const pages: [string, Date?][] = [
    ['', derniere], ...navigation.map((n): [string, Date?] => [n.href, n.href === 'agenda/' ? derniere : undefined]),
    ['pastorale/'], ['eco-ecole/'], ['apel/'], ['questions-frequentes/'], ['mentions-legales/'], ['plan-du-site/'],
    ...actus.map((a): [string, Date] => [`actualites/${a.id}/`, a.data.date]),
  ];
  const urls = pages.map(([c, d]) => `<url><loc>${new URL(base + c, site).href}</loc>${d ? `<lastmod>${jour(d)}</lastmod>` : ''}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'content-type': 'application/xml' } });
};
