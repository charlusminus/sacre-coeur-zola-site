// Chemins et URL du site, en tenant compte de la base GitHub Pages.
export const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const lien = (chemin = '') => base + chemin.replace(/^\//, '');

type Lien = { titre: string; href: string };
type Rubrique = Lien & { enfants?: Lien[] };
// Les rubriques à sous-menu n'ont pas de page propre : leur href sert au plan du site.
export const navigation: Rubrique[] = [
  {
    titre: 'L’école', href: 'ecole/', enfants: [
      { titre: 'Projet, équipe et histoire', href: 'ecole/' },
      { titre: 'Pastorale', href: 'pastorale/' },
      { titre: 'Éco-École', href: 'eco-ecole/' },
      { titre: 'APEL', href: 'apel/' },
    ],
  },
  {
    titre: 'Vie scolaire', href: 'vie-scolaire/', enfants: [
      { titre: 'Menus de la cantine', href: 'cantine/' },
      { titre: 'Horaires et garderie', href: 'vie-scolaire/' },
      { titre: 'Vie des classes', href: 'vie-des-classes/' },
    ],
  },
  { titre: 'Agenda', href: 'agenda/' },
  { titre: 'Contact', href: 'contact/' },
];
export const sansAncre = (href: string) => href.replace(/#.*$/, '');
// Toutes les pages du menu, sans doublon, pour le plan du site et le sitemap.
export const pagesDuMenu = [...new Map(navigation.flatMap((n) => n.enfants ?? [n]).map((l) => [sansAncre(l.href), l])).values()];

const mois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
const jourMois = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
export const dateLongue = (d: Date) => mois.format(d);
export const dateJour = (d: Date) => jourMois.format(d);
