import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { navigation } from '../lib/site';
export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const chemins = ['', ...navigation.map((n) => n.href), 'mentions-legales/', 'plan-du-site/', ...(await getCollection('actualites')).map((a) => `actualites/${a.id}/`)];
  const urls = chemins.map((c) => `<url><loc>${new URL(base + c, site).href}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'content-type': 'application/xml' } });
};
