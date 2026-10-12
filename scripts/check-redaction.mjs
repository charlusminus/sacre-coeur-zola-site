// Refuse le build si une page publiée contient un tiret cadratin ou un marqueur [À CONFIRMER]
// en production (règles de rédaction Paktiz, cf CLAUDE.md).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const racine = 'dist';
const enLigne = process.env.PUBLIC_EN_LIGNE === 'oui';
const fichiers = [];
(function parcourir(dossier) {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) parcourir(chemin);
    else if (/\.(html|xml|txt|json)$/.test(nom)) fichiers.push(chemin);
  }
})(racine);

const erreurs = [];
for (const f of fichiers) {
  const texte = readFileSync(f, 'utf8');
  if (texte.includes('—')) erreurs.push(`${f} : tiret cadratin`);
  if (enLigne && texte.includes('[À CONFIRMER]')) erreurs.push(`${f} : marqueur [À CONFIRMER]`);
}
const aConfirmer = fichiers.filter((f) => readFileSync(f, 'utf8').includes('[À CONFIRMER]')).length;
if (erreurs.length) {
  console.error(`check-redaction : ${erreurs.length} erreur(s)\n` + erreurs.join('\n'));
  process.exit(1);
}
console.log(`check-redaction : ${fichiers.length} fichiers propres` + (aConfirmer ? `, ${aConfirmer} page(s) avec [À CONFIRMER] (bloquant en production)` : ''));
