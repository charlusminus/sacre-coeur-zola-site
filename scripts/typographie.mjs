// Typographie française sur les pages construites : espace insécable avant « : ; ? ! » et dans
// les heures et les montants (« 7 h 45 », « 53 € »), pour éviter les coupures de ligne ; « Sacré-Cœur »
// insécable.
// N'agit que sur le texte entre les balises, jamais dans les scripts, styles ou attributs.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const NBSP = ' ', FINE = ' ';
const pages = [];
(function parcourir(d) { for (const n of readdirSync(d)) { const c = join(d, n); statSync(c).isDirectory() ? parcourir(c) : n.endsWith('.html') && pages.push(c); } })('dist');

const corriger = (t) => t
  .replace(/ ([:;?!»])/g, (m, s) => (s === ':' ? NBSP : FINE) + s)
  .replace(/« /g, '«' + FINE)
  .replace(/(\d) h( \d|\b)/g, (m, a, b) => `${a}${NBSP}h${b.startsWith(' ') ? NBSP + b.slice(1) : b}`)
  .replace(/(\d) (€|%|élèves|ans)/g, `$1${NBSP}$2`)
  .replace(/(\d) (\d{3})\b/g, `$1${NBSP}$2`);

let total = 0;
for (const f of pages) {
  const html = readFileSync(f, 'utf8');
  const sortie = html.replace(/(<(script|style|title|textarea|option)\b[\s\S]*?<\/\2>)|>([^<]+)</g, (m, bloc, _t, texte) => {
    if (bloc) return bloc;
    // « Sacré-Cœur » ne se coupe jamais au trait d'union (titres sur téléphone).
    const c = corriger(texte).replace(/Sacré-Cœur/g, '<span class="insecable">Sacré-Cœur</span>');
    if (c !== texte) total++;
    return '>' + c + '<';
  });
  writeFileSync(f, sortie);
}
console.log(`typographie : ${total} passages corrigés sur ${pages.length} pages`);
