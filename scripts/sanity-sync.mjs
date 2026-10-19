// Contenus Sanity vers contenu-sanity/, dans la forme exacte de src/contenus/ : le site ne sait pas
// d'où viennent ses contenus. Lancé avant `astro build` quand PUBLIC_CONTENU=sanity.
//
//   SANITY_PROJECT_ID=xxxx node scripts/sanity-sync.mjs            documents publiés, en ligne
//   node scripts/sanity-sync.mjs --depuis amorce.ndjson             documents d'un fichier (essais)
//
// Règle : une saisie ne doit jamais bloquer la mise en ligne. Un document incomplet est écarté, un
// conflit (deux actualités au même titre) est résolu par un suffixe ; dans les deux cas une ligne
// part dans contenu-sanity/rapport.txt, que la GitHub Action signale à Charles.
import { mkdir, rm, writeFile, copyFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = join(RACINE, 'contenu-sanity');
const RUBRIQUES = ["Vie de l'école", 'Vie des classes', 'Pastorale', 'Éco-École', 'APEL', 'Sorties', 'Inscriptions'];
const NIVEAUX = ['PS', 'MS', 'GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];
const PUBLICS = ["Familles de l'école", 'Futures familles', 'Tout public'];

const rapport = [];
const signaler = (m) => { rapport.push(m); console.warn(`sanity-sync : ${m}`); };

export const adresse = (t) =>
  (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '');

// Texte riche (Portable Text) vers Markdown : paragraphes, gras, italique, liens, listes.
const echapper = (t) => t.replace(/([\\*_`[\]<>#])/g, '\\$1');
export function versMarkdown(blocs = []) {
  const sortie = [];
  let precedent = null;
  for (const b of blocs) {
    if (b._type !== 'block') continue;
    const liens = Object.fromEntries((b.markDefs ?? []).map((d) => [d._key, d.href]));
    const ligne = (b.children ?? []).map((s) => {
      let t = echapper(s.text ?? '');
      if (!t.trim()) return t;
      const marques = s.marks ?? [];
      if (marques.includes('em')) t = `*${t}*`;
      if (marques.includes('strong')) t = `**${t}**`;
      const lien = marques.map((m) => liens[m]).find(Boolean);
      return lien ? `[${t}](${lien})` : t;
    }).join('').trim();
    if (!ligne) continue;
    const liste = b.listItem;
    const puce = liste === 'number' ? '1. ' : liste === 'bullet' ? '- ' : '';
    const coller = liste && precedent === liste;
    sortie.push((coller ? '\n' : sortie.length ? '\n\n' : '') + puce + ligne);
    precedent = liste ?? null;
  }
  return sortie.join('') + '\n';
}

const yaml = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')
  .map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');

// Un fichier (photo, PDF) : téléchargé depuis le CDN Sanity, ou copié (fichier local des essais).
async function recuperer(url, chemin) {
  if (url.startsWith('file://')) return copyFile(fileURLToPath(url), chemin);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} sur ${url}`);
  await writeFile(chemin, Buffer.from(await r.arrayBuffer()));
}
// Photos bornées à 2 400 px en JPEG : Anne peut téléverser l'original de son téléphone.
const allegee = (url) => (url.startsWith('https://cdn.sanity.io/') ? `${url}?w=2400&fit=max&fm=jpg&q=85` : url);

async function lireDocuments() {
  const i = process.argv.indexOf('--depuis');
  if (i > 0) {
    const lignes = (await readFile(process.argv[i + 1], 'utf8')).split('\n').filter(Boolean);
    return lignes.map((l) => JSON.parse(l));
  }
  const projet = process.env.SANITY_PROJECT_ID;
  if (!projet) throw new Error('SANITY_PROJECT_ID manquant (identifiant du projet Sanity de l\'école).');
  const jeu = process.env.SANITY_DATASET ?? 'production';
  const requete = `*[_type in ["actualite","evenement","menu","parametres","questionsFrequentes","pageEcoEcole","pagePastorale","pageTarifs","pageEcole","pageVieScolaire","pageCantine","pageApel"] && !(_id in path("drafts.**"))]{
    ..., "photoUrl": photo.asset->url, "pdfUrl": pdf.asset->url,
    "fournituresUrls": listesFournitures[]{classe, "url": pdf.asset->url} }`;
  const url = `https://${projet}.api.sanity.io/v2025-02-19/data/query/${jeu}?perspective=published&query=${encodeURIComponent(requete)}`;
  const r = await fetch(url, { headers: process.env.SANITY_TOKEN ? { Authorization: `Bearer ${process.env.SANITY_TOKEN}` } : {} });
  if (!r.ok) throw new Error(`Sanity a répondu ${r.status} : ${await r.text()}`);
  return (await r.json()).result;
}

async function main() {
  const docs = await lireDocuments();
  const de = (t) => docs.filter((d) => d._type === t);
  await rm(SORTIE, { recursive: true, force: true });
  for (const d of ['actualites', 'evenements', 'menus', 'images']) await mkdir(join(SORTIE, d), { recursive: true });

  // Actualités : l'adresse de la page vient du titre ; deux titres identiques, l'année puis un numéro.
  const prises = new Set();
  let nbA = 0;
  for (const a of de('actualite').sort((x, y) => (x.date ?? '').localeCompare(y.date ?? '') || x._id.localeCompare(y._id))) {
    const nom = `« ${a.titre ?? 'sans titre'} »`;
    if (!a.titre || !a.date || !a.resume || !RUBRIQUES.includes(a.rubrique)) { signaler(`actualité ${nom} écartée : titre, date, résumé ou rubrique manquant.`); continue; }
    const voulu = adresse(a.titre) || 'actualite';
    let id = prises.has(voulu) ? `${voulu}-${a.date.slice(0, 4)}` : voulu;
    for (let n = 2; prises.has(id); n++) id = `${voulu}-${a.date.slice(0, 4)}-${n}`;
    if (id !== voulu) signaler(`deux actualités s'appellent ${nom} : la plus récente est publiée à l'adresse /actualites/${id}/.`);
    prises.add(id);
    const champs = { titre: a.titre, date: a.date, modifie: a._updatedAt, resume: a.resume, rubrique: a.rubrique, niveaux: (a.niveaux ?? []).filter((n) => NIVEAUX.includes(n)) };
    if (a.photoUrl) {
      const fichier = `${id}.${a.photoUrl.startsWith('file://') ? a.photoUrl.split('.').pop() : 'jpg'}`;
      try {
        await recuperer(allegee(a.photoUrl), join(SORTIE, 'images', fichier));
        Object.assign(champs, { photo: `../images/${fichier}`, alt: a.photo?.alt || a.titre });
      } catch (e) { signaler(`photo de l'actualité ${nom} non récupérée (${e.message}) : article publié sans photo.`); }
    }
    await writeFile(join(SORTIE, 'actualites', `${id}.md`), `---\n${yaml(champs)}\n---\n\n${versMarkdown(a.texte)}`);
    nbA++;
  }

  let nbE = 0;
  const idsE = new Set();
  for (const e of de('evenement')) {
    const nom = `« ${e.titre ?? 'sans titre'} »`;
    if (!e.titre || !e.debut || !e.resume || !PUBLICS.includes(e.public)) { signaler(`événement ${nom} écarté : titre, date, description ou public manquant.`); continue; }
    let id = `${adresse(e.titre)}-${e.debut.slice(0, 10)}`;
    for (let n = 2; idsE.has(id); n++) id = `${adresse(e.titre)}-${e.debut.slice(0, 10)}-${n}`;
    idsE.add(id);
    const fin = e.fin && e.fin >= e.debut ? e.fin : undefined;
    await writeFile(join(SORTIE, 'evenements', `${id}.md`), `---\n${yaml({ titre: e.titre, debut: e.debut, fin, horaires: e.horaires, lieu: e.lieu, public: e.public, resume: e.resume, enAvant: !!e.enAvant })}\n---\n`);
    nbE++;
  }

  // Menus : un PDF par semaine ; deux menus pour la même semaine, le dernier modifié l'emporte.
  const parSemaine = new Map();
  for (const m of de('menu')) {
    if (!m.semaine || !m.pdfUrl) { signaler(`menu ${m.semaine ? `de la semaine du ${m.semaine}` : 'sans semaine'} écarté : semaine ou PDF manquant.`); continue; }
    const deja = parSemaine.get(m.semaine);
    if (deja) signaler(`deux menus pour la semaine du ${m.semaine} : le plus récemment modifié est gardé.`);
    if (!deja || (m._updatedAt ?? '') > (deja._updatedAt ?? '')) parSemaine.set(m.semaine, m);
  }
  const menus = [];
  for (const m of parSemaine.values()) {
    const pdf = `${m.semaine}.pdf`;
    try { await recuperer(m.pdfUrl, join(SORTIE, 'menus', pdf)); } catch (e) { signaler(`PDF du menu du ${m.semaine} non récupéré (${e.message}).`); continue; }
    menus.push({ id: m.semaine, semaine: m.semaine, pdf, publierLe: m.publierLe || undefined, message: m.message?.trim() || undefined });
  }
  await writeFile(join(SORTIE, 'menus', 'menus.json'), JSON.stringify(menus, null, 2));

  // Informations générales : seuls les champs remplis remplacent les valeurs locales.
  const p = de('parametres')[0];
  if (p) {
    const garder = ['telephone', 'telephoneMobile', 'emailSecretariat', 'emailDirection', 'horairesSecretariat', 'accesTransports', 'accesStationnement', 'instagram', 'direction', 'secretariat', 'equipe', 'anneeEquipe', 'rentree', 'inscriptionsOuvertes', 'destinatairesDemandes', 'copieCacheeDemandes', 'anneeFournitures'];
    const sans = (o) => (Array.isArray(o) ? o.map(sans) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, sans(v)])) : o);
    const champs = Object.fromEntries(garder.filter((k) => p[k] !== undefined && p[k] !== null && p[k] !== '').map((k) => [k, sans(p[k])]));
    // Listes de fournitures : un PDF par classe, servi par le site (src/pages/fournitures/).
    const listes = [];
    for (const l of p.fournituresUrls ?? []) {
      if (!l?.classe || !l?.url) { signaler(`liste de fournitures ${l?.classe ?? 'sans classe'} écartée : classe ou PDF manquant.`); continue; }
      const pdf = `${adresse(l.classe)}.pdf`;
      try { await mkdir(join(SORTIE, 'fournitures'), { recursive: true }); await recuperer(l.url, join(SORTIE, 'fournitures', pdf)); listes.push({ classe: l.classe, pdf }); }
      catch (e) { signaler(`liste de fournitures ${l.classe} non récupérée (${e.message}).`); }
    }
    champs.listesFournitures = listes;
    await writeFile(join(SORTIE, 'parametres.json'), JSON.stringify(champs, null, 2));
  } else signaler('informations générales absentes de Sanity : valeurs du dépôt utilisées.');

  const q = de('questionsFrequentes')[0]?.questions ?? [];
  const faq = q.filter((x) => x.question && x.reponse && x.theme).map((x, i) => ({ id: adresse(x.question) || `q${i}`, theme: x.theme, q: x.question, r: x.reponse }));
  if (faq.length) await writeFile(join(SORTIE, 'faq.json'), JSON.stringify(faq, null, 2));

  // Textes des pages : seuls les champs remplis remplacent le texte d'origine (src/lib/pages.ts).
  // Le tiret long, refusé par le build, ne peut pas passer le back-office ; on le retire par sûreté.
  const propre = (v) => (typeof v === 'string' ? v.replace(/\s*\u2014\s*/g, ', ').trim() : Array.isArray(v) ? v.map(propre) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith('_')).map(([k, x]) => [k, propre(x)])) : v);
  const PAGES = { pageEcoEcole: 'eco-ecole', pagePastorale: 'pastorale', pageTarifs: 'tarifs', pageEcole: 'ecole', pageVieScolaire: 'vie-scolaire', pageCantine: 'cantine', pageApel: 'apel' };
  const LISTES = { annees: ['annee', 'theme', 'texte'], tempsForts: ['nom', 'texte'], lignes: ['libelle', 'montant'], dates: ['annee', 'texte'], horaires: ['moment', 'horaire'], fiches: ['titre', 'texte'], axes: ['titre'] };
  await mkdir(join(SORTIE, 'pages'), { recursive: true });
  for (const [type, nom] of Object.entries(PAGES)) {
    const doc = de(type)[0];
    if (!doc) continue;
    const champs = {};
    for (const [k, v] of Object.entries(propre(doc))) {
      if (['photo', 'photoUrl', 'pdfUrl', 'fournituresUrls'].includes(k) || v == null || v === '') continue;
      if (LISTES[k]) {
        const complets = (v ?? []).filter((x) => LISTES[k].every((c) => typeof x?.[c] === 'string' && x[c]))
          .map((x) => (k === 'axes' ? { ...x, points: (x.points ?? []).filter((pt) => typeof pt === 'string' && pt) } : x)).filter((x) => k !== 'axes' || x.points.length);
        if (complets.length < v.length) signaler(`page ${nom} : ${v.length - complets.length} ligne(s) incomplète(s) écartée(s) dans « ${k} ».`);
        if (complets.length) champs[k] = complets;
      } else if (typeof v === 'string') champs[k] = v;
    }
    if (doc.photoUrl) {
      const fichier = `page-${nom}.jpg`;
      if (!doc.photo?.alt) signaler(`page ${nom} : photo sans description, photo d'origine gardée.`);
      else {
        try { await recuperer(allegee(doc.photoUrl), join(SORTIE, 'images', fichier)); Object.assign(champs, { photo: fichier, alt: doc.photo.alt }); }
        catch (e) { signaler(`page ${nom} : photo non récupérée (${e.message}), photo d'origine gardée.`); }
      }
    }
    await writeFile(join(SORTIE, 'pages', `${nom}.json`), JSON.stringify(champs, null, 2));
  }

  await writeFile(join(SORTIE, 'rapport.txt'), rapport.join('\n') + (rapport.length ? '\n' : ''));
  console.log(`sanity-sync : ${nbA} actualités, ${nbE} événements, ${menus.length} menus, ${faq.length} questions${rapport.length ? `, ${rapport.length} point(s) à regarder (contenu-sanity/rapport.txt)` : ''}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(`sanity-sync : ${e.message}`); process.exit(1); });
