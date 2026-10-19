// Les PDF des menus, servis depuis le site (et non depuis Sanity) : un menu n'existe en ligne
// qu'à partir de sa date de mise en ligne.
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { racineContenus } from '../../content.config';
import { menusEnLigne } from '../../lib/contenu';

export async function getStaticPaths() {
  return (await menusEnLigne()).map((m) => ({ params: { fichier: m.data.pdf } }));
}

export const GET: APIRoute = async ({ params }) =>
  new Response(await readFile(`${racineContenus}/menus/${params.fichier}`), { headers: { 'content-type': 'application/pdf' } });
