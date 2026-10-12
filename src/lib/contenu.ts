// Lecture des contenus, triés pour l'affichage. Le site se reconstruit chaque nuit (workflow)
// pour que l'agenda et le menu de la semaine restent à jour sans intervention.
import { getCollection } from 'astro:content';

const aujourdhui = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export async function evenementsAVenir(limite?: number) {
  const tous = await getCollection('evenements');
  const a = aujourdhui();
  const liste = tous
    .filter((e) => (e.data.fin ?? e.data.debut) >= a)
    .sort((x, y) => +x.data.debut - +y.data.debut);
  return limite ? liste.slice(0, limite) : liste;
}

export async function actualites(limite?: number) {
  const liste = (await getCollection('actualites')).sort((x, y) => +y.data.date - +x.data.date);
  return limite ? liste.slice(0, limite) : liste;
}

/** Menu de la semaine en cours, sinon le plus récent publié. */
export async function menuDeLaSemaine() {
  const menus = (await getCollection('menus')).sort((x, y) => +y.data.semaine - +x.data.semaine);
  const a = aujourdhui();
  return menus.find((m) => +m.data.semaine <= +a && +a - +m.data.semaine < 7 * 864e5) ?? menus[0];
}

export const jours = ['lundi', 'mardi', 'jeudi', 'vendredi'] as const;
