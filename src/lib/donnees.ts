// Informations générales et questions fréquentes : depuis Sanity quand le site est construit avec
// PUBLIC_CONTENU=sanity (fichiers écrits par scripts/sanity-sync.mjs dans contenu-sanity/), sinon
// depuis src/contenus/. Les champs absents de Sanity gardent la valeur locale.
import locaux from '../contenus/parametres.json';
import faqLocale from '../contenus/faq.json';

const synchro = import.meta.glob<Record<string, unknown>>('../../contenu-sanity/*.json', { eager: true, import: 'default' });
const depuisSanity = import.meta.env.PUBLIC_CONTENU === 'sanity';
const brut = depuisSanity ? synchro['../../contenu-sanity/parametres.json'] : undefined;
const faqSanity = depuisSanity ? (synchro['../../contenu-sanity/faq.json'] as unknown as typeof faqLocale | undefined) : undefined;

type Personne = { civilite: string; prenom: string; nom: string; fonction?: string };
const base = { ...locaux, ...(brut ?? {}) } as typeof locaux;
const d = base.direction as Personne;
const s = base.secretariat as Personne;

export const parametres = {
  ...base,
  // « Mme Hélène Lampérière, cheffe d'établissement »
  direction: `${d.civilite} ${d.prenom} ${d.nom}, ${d.fonction}`,
  directionNom: `${d.prenom} ${d.nom}`,
  directionCourt: `${d.civilite} ${d.nom}`,
  directionFonction: d.fonction ?? "cheffe d'établissement",
  secretariat: `${s.civilite} ${s.prenom} ${s.nom}`,
  secretariatNom: `${s.prenom} ${s.nom}`,
};
export const faq = faqSanity?.length ? faqSanity : faqLocale;
