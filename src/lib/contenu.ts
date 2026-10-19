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

// Heure de Paris d'une date et d'une heure locales (gère l'heure d'été).
function aParis(jour: string, heure: string) {
  const essai = new Date(`${jour}T${heure}:00Z`);
  const decalage = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' })
    .formatToParts(essai).find((x) => x.type === 'timeZoneName')?.value.match(/GMT([+-]\d+)/)?.[1] ?? '+1';
  return new Date(+essai - Number(decalage) * 36e5);
}

/** Mise en ligne d'un menu : la date choisie par Anne, sinon le vendredi précédent à 8 h. */
export function miseEnLigne(m: { semaine: Date; publierLe?: Date }) {
  if (m.publierLe) return m.publierLe;
  const vendredi = new Date(+m.semaine - 3 * 864e5).toISOString().slice(0, 10);
  return aParis(vendredi, '08:00');
}

/**
 * Les menus à afficher : ceux déjà mis en ligne dont la semaine n'est pas finie (la semaine en
 * cours, et la suivante dès le vendredi), sinon le dernier publié (vacances). `passe` le signale.
 */
export async function menusDuMoment() {
  const maintenant = new Date();
  const visibles = (await getCollection('menus')).filter((m) => +miseEnLigne(m.data) <= +maintenant);
  const lundi = aujourdhui(); lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  const courants = visibles.filter((m) => +m.data.semaine >= +lundi - 864e5).sort((x, y) => +x.data.semaine - +y.data.semaine).slice(0, 2);
  if (courants.length) return { menus: courants, passe: false };
  const dernier = visibles.sort((x, y) => +y.data.semaine - +x.data.semaine)[0];
  return { menus: dernier ? [dernier] : [], passe: true };
}

/** Menus publiables (fichiers PDF servis par le site) : aucun avant sa date de mise en ligne. */
export async function menusEnLigne() {
  const maintenant = new Date();
  return (await getCollection('menus')).filter((m) => +miseEnLigne(m.data) <= +maintenant);
}
