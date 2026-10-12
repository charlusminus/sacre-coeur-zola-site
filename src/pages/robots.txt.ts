import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) => {
  const enLigne = import.meta.env.PUBLIC_EN_LIGNE === 'oui';
  const corps = enLigne
    ? `User-agent: *\nAllow: /\nSitemap: ${new URL(import.meta.env.BASE_URL + 'sitemap.xml', site).href}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(corps);
};
