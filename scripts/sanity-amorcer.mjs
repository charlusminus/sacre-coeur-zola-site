// Amorce du projet Sanity de l'école avec les contenus de la démonstration (src/contenus/).
// À lancer une seule fois, quand le projet est créé : chaque document n'est créé que s'il n'existe
// pas encore (createIfNotExists), le travail d'Anne n'est jamais écrasé.
//
//   node scripts/sanity-amorcer.mjs --sortie amorce.ndjson     documents dans un fichier (essai hors ligne)
//   SANITY_PROJECT_ID=xxxx SANITY_TOKEN=… node scripts/sanity-amorcer.mjs --simulation
//   SANITY_PROJECT_ID=xxxx SANITY_TOKEN=… node scripts/sanity-amorcer.mjs
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import yaml from 'js-yaml';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const C = join(RACINE, 'src/contenus');
const cle = () => randomBytes(6).toString('hex');

// Markdown simple (paragraphes, listes, gras, italique, liens) vers texte riche Sanity.
function versBlocs(md) {
  const blocs = [];
  for (const para of md.trim().split(/\n\s*\n/)) {
    const lignes = para.split('\n');
    const liste = lignes.every((l) => /^\s*[-*] /.test(l)) ? 'bullet' : lignes.every((l) => /^\s*\d+\. /.test(l)) ? 'number' : null;
    for (const brut of liste ? lignes : [lignes.join(' ')]) {
      const texte = brut.replace(/^\s*([-*]|\d+\.) /, '').trim();
      if (!texte) continue;
      const markDefs = [];
      const children = [];
      const motif = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
      let i = 0;
      for (const m of texte.matchAll(motif)) {
        if (m.index > i) children.push({ _type: 'span', _key: cle(), text: texte.slice(i, m.index), marks: [] });
        if (m[1]) { const k = cle(); markDefs.push({ _type: 'link', _key: k, href: m[2] }); children.push({ _type: 'span', _key: cle(), text: m[1], marks: [k] }); }
        else children.push({ _type: 'span', _key: cle(), text: m[3] ?? m[4], marks: [m[3] ? 'strong' : 'em'] });
        i = m.index + m[0].length;
      }
      if (i < texte.length) children.push({ _type: 'span', _key: cle(), text: texte.slice(i), marks: [] });
      blocs.push({ _type: 'block', _key: cle(), style: 'normal', markDefs, children, ...(liste ? { listItem: liste, level: 1 } : {}) });
    }
  }
  return blocs;
}

async function lireMd(dossier) {
  const sortie = [];
  for (const f of (await readdir(dossier)).filter((f) => f.endsWith('.md')).sort()) {
    const brut = await readFile(join(dossier, f), 'utf8');
    const [, entete, corps] = brut.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    sortie.push({ id: f.replace(/\.md$/, ''), data: yaml.load(entete, { schema: yaml.JSON_SCHEMA }), corps, dossier });
  }
  return sortie;
}
const jour = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
const instant = (d) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());

async function documents() {
  const docs = [];
  for (const a of await lireMd(join(C, 'actualites'))) {
    const d = a.data;
    docs.push({
      _id: `actualite-${a.id}`, _type: 'actualite', titre: d.titre, date: jour(d.date), rubrique: d.rubrique, niveaux: d.niveaux ?? [], resume: d.resume,
      texte: versBlocs(a.corps),
      ...(d.photo ? { _photo: resolve(a.dossier, d.photo), photo: { _type: 'image', alt: d.alt } } : {}),
    });
  }
  for (const e of await lireMd(join(C, 'evenements'))) {
    const d = e.data;
    docs.push({ _id: `evenement-${e.id}`, _type: 'evenement', titre: d.titre, debut: instant(d.debut), ...(d.fin ? { fin: instant(d.fin) } : {}), horaires: d.horaires, lieu: d.lieu ?? 'École Sacré-Cœur La Salle', public: d.public, resume: d.resume, enAvant: !!d.enAvant });
  }
  for (const m of JSON.parse(await readFile(join(C, 'menus/menus.json'), 'utf8'))) {
    docs.push({ _id: `menu-${m.semaine}`, _type: 'menu', semaine: m.semaine, _pdf: join(C, 'menus', m.pdf), pdf: { _type: 'file' }, ...(m.publierLe ? { publierLe: m.publierLe } : {}), ...(m.message ? { message: m.message } : {}) });
  }
  const p = JSON.parse(await readFile(join(C, 'parametres.json'), 'utf8'));
  const avecCles = (l) => l.map((x) => ({ _key: cle(), ...x }));
  docs.push({
    _id: 'parametres', _type: 'parametres',
    ...Object.fromEntries(['telephone', 'telephoneMobile', 'emailSecretariat', 'emailDirection', 'accesTransports', 'accesStationnement', 'instagram', 'direction', 'secretariat', 'anneeEquipe', 'rentree', 'inscriptionsOuvertes', 'destinatairesDemandes', 'copieCacheeDemandes'].map((k) => [k, p[k]])),
    horairesSecretariat: avecCles(p.horairesSecretariat).map((h) => ({ _type: 'creneau', ...h })),
    equipe: avecCles(p.equipe).map((l) => ({ _type: 'ligneEquipe', ...l })),
  });
  const faq = JSON.parse(await readFile(join(C, 'faq.json'), 'utf8'));
  docs.push({ _id: 'questionsFrequentes', _type: 'questionsFrequentes', questions: faq.map((q) => ({ _key: cle(), _type: 'question', question: q.q, reponse: q.r, theme: q.theme })) });
  return docs;
}

const propre = (d) => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith('_') || ['_id', '_type'].includes(k)));

async function main() {
  const docs = await documents();
  const i = process.argv.indexOf('--sortie');
  if (i > 0) {
    // Forme des documents telle que la renvoie la requête du script de synchronisation.
    const lignes = docs.map((d) => JSON.stringify({ ...propre(d), ...(d._photo ? { photoUrl: pathToFileURL(d._photo).href } : {}), ...(d._pdf ? { pdfUrl: pathToFileURL(d._pdf).href } : {}) }));
    await writeFile(process.argv[i + 1], lignes.join('\n') + '\n');
    console.log(`sanity-amorcer : ${docs.length} documents écrits dans ${process.argv[i + 1]}.`);
    return;
  }
  const { SANITY_PROJECT_ID: projet, SANITY_TOKEN: jeton } = process.env;
  const jeu = process.env.SANITY_DATASET ?? 'production';
  if (!projet || !jeton) throw new Error('SANITY_PROJECT_ID et SANITY_TOKEN (jeton Éditeur) sont nécessaires.');
  const simulation = process.argv.includes('--simulation');
  const api = `https://${projet}.api.sanity.io/v2025-02-19`;
  const entetes = { Authorization: `Bearer ${jeton}` };
  const televerser = async (chemin, genre, type) => {
    if (simulation) return 'simulation';
    const r = await fetch(`${api}/assets/${genre}/${jeu}?filename=${encodeURIComponent(chemin.split('/').pop())}`, { method: 'POST', headers: { ...entetes, 'Content-Type': type }, body: await readFile(chemin) });
    if (!r.ok) throw new Error(`téléversement de ${chemin} : ${r.status} ${await r.text()}`);
    return (await r.json()).document._id;
  };
  const mutations = [];
  for (const d of docs) {
    const doc = propre(d);
    // En simulation, rien n'est téléversé : photos et PDF ne sont pas rattachés.
    if (d._photo && !simulation) doc.photo = { ...d.photo, asset: { _type: 'reference', _ref: await televerser(d._photo, 'images', `image/${d._photo.split('.').pop().toLowerCase().replace('jpg', 'jpeg')}`) } };
    if (d._pdf && !simulation) doc.pdf = { _type: 'file', asset: { _type: 'reference', _ref: await televerser(d._pdf, 'files', 'application/pdf') } };
    mutations.push({ createIfNotExists: doc });
  }
  const r = await fetch(`${api}/data/mutate/${jeu}?dryRun=${simulation}`, { method: 'POST', headers: { ...entetes, 'Content-Type': 'application/json' }, body: JSON.stringify({ mutations }) });
  if (!r.ok) throw new Error(`mutations : ${r.status} ${await r.text()}`);
  console.log(`sanity-amorcer : ${mutations.length} documents ${simulation ? 'vérifiés (simulation, rien écrit)' : 'créés s\'ils n\'existaient pas'}.`);
}

main().catch((e) => { console.error(`sanity-amorcer : ${e.message}`); process.exit(1); });
