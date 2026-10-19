// Listes de fournitures (PDF), déposées dans le back-office (Informations générales > Vie scolaire).
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { racineContenus } from '../../content.config';
import { parametres as p } from '../../lib/donnees';

export function getStaticPaths() {
  return p.listesFournitures.map((l) => ({ params: { fichier: l.pdf } }));
}

export const GET: APIRoute = async ({ params }) =>
  new Response(await readFile(`${racineContenus}/fournitures/${params.fichier}`), { headers: { 'content-type': 'application/pdf' } });
