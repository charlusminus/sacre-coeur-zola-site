// Vérifie que chaque lien interne (href, src) des pages construites mène à un fichier de dist/.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const racine = 'dist';
const base = (process.env.BASE_PATH ?? '/sacre-coeur-zola-site/').replace(/\/?$/, '/');
const pages = [];
(function parcourir(dossier) {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) parcourir(chemin);
    else if (nom.endsWith('.html')) pages.push(chemin);
  }
})(racine);

const morts = new Set();
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const [, url] of html.matchAll(/(?:href|src)="([^"#?]+)[^"]*"/g)) {
    if (!url.startsWith(base)) continue;
    const chemin = join(racine, decodeURI(url.slice(base.length)));
    const ok = existsSync(chemin) && (statSync(chemin).isFile() || existsSync(join(chemin, 'index.html')));
    if (!ok) morts.add(`${page} -> ${url}`);
  }
}
if (morts.size) {
  console.error(`check-liens : ${morts.size} lien(s) interne(s) mort(s)\n` + [...morts].join('\n'));
  process.exit(1);
}
console.log(`check-liens : ${pages.length} pages, aucun lien interne mort`);
