// Textes des pages éditables dans le back-office (Textes des pages : L'école, Vie scolaire, Cantine,
// Éco-École, Pastorale, APEL, Tarifs).
// La mise en page reste dans le code ; seuls les textes et la photo changent. Valeurs de
// src/contenus/pages/, remplacées champ par champ par celles de Sanity quand le site est construit
// avec PUBLIC_CONTENU=sanity (fichiers écrits par scripts/sanity-sync.mjs). Un champ laissé vide dans
// le back-office garde le texte d'origine.
import type { ImageMetadata } from 'astro';
import ecoEcole from '../contenus/pages/eco-ecole.json';
import pastorale from '../contenus/pages/pastorale.json';
import tarifs from '../contenus/pages/tarifs.json';
import ecole from '../contenus/pages/ecole.json';
import vieScolaire from '../contenus/pages/vie-scolaire.json';
import cantine from '../contenus/pages/cantine.json';
import apel from '../contenus/pages/apel.json';

const depuisSanity = import.meta.env.PUBLIC_CONTENU === 'sanity';
const synchro = import.meta.glob<Record<string, unknown>>('../../contenu-sanity/pages/*.json', { eager: true, import: 'default' });
const photos = import.meta.glob<ImageMetadata>('../../contenu-sanity/images/page-*', { eager: true, import: 'default' });

type Photo = { photo?: ImageMetadata; alt?: string };

function fusion<T extends object>(nom: string, local: T): T & Photo {
  const brut = depuisSanity ? (synchro[`../../contenu-sanity/pages/${nom}.json`] ?? {}) : {};
  const sortie: Record<string, unknown> = { ...local };
  for (const [k, v] of Object.entries(brut)) {
    if (k === 'photo' || k === 'alt') continue;
    if (Array.isArray(v) ? v.length : typeof v === 'string' ? v.trim() : v != null) sortie[k] = v;
  }
  const fichier = typeof brut.photo === 'string' ? photos[`../../contenu-sanity/images/${brut.photo}`] : undefined;
  if (fichier && typeof brut.alt === 'string' && brut.alt.trim()) Object.assign(sortie, { photo: fichier, alt: brut.alt });
  return sortie as T & Photo;
}

export const pageEcoEcole = fusion('eco-ecole', ecoEcole);
export const pagePastorale = fusion('pastorale', pastorale);
export const pageTarifs = fusion('tarifs', tarifs);
export const pageEcole = fusion('ecole', ecole);
export const pageVieScolaire = fusion('vie-scolaire', vieScolaire);
export const pageCantine = fusion('cantine', cantine);
export const pageApel = fusion('apel', apel);

// Un texte saisi en plusieurs paragraphes (séparés par une ligne vide).
export const paragraphes = (t = '') => t.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);

// « 1er », « 2e » en exposant, le reste échappé (pour set:html).
const echapper = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export const ordinaux = (t = '') => echapper(t).replace(/\b(\d+)(er|re|e)\b/g, '$1<sup>$2</sup>');

// Texte placé après « : » : minuscule initiale (« Repas : cuisinés… »), sauf sigle ou nom propre en tête.
export const apresDeuxPoints = (t = '') => (/^\p{Lu}\p{Ll}/u.test(t) && !/^(Les Alchimistes|Saint|Sainte)\b/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);
