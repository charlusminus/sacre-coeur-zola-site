// Chemins et URL du site, en tenant compte de la base GitHub Pages.
export const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const lien = (chemin = '') => base + chemin.replace(/^\//, '');

export const navigation = [
  { titre: 'L’école', href: 'ecole/' },
  { titre: 'Vie des classes', href: 'vie-des-classes/' },
  { titre: 'Vie scolaire', href: 'vie-scolaire/' },
  { titre: 'Inscriptions', href: 'inscriptions/' },
  { titre: 'Agenda', href: 'agenda/' },
  { titre: 'Contact', href: 'contact/' },
];

const mois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
const jourMois = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
export const dateLongue = (d: Date) => mois.format(d);
export const dateJour = (d: Date) => jourMois.format(d);
