#!/usr/bin/env node
/* Repere les commits ORPHELINS : pousses sur une branche dont la PR etait deja mergee ou fermee,
 * donc qui n'arriveront jamais dans `main`.
 *
 * POURQUOI CE SCRIPT EXISTE
 * Constate DEUX FOIS sur le projet Balinaisa, et les deux fois le travail a ete annonce comme fait :
 *   - 27/07 : (Balinaisa) PR mergee a 19h38, commit pousse a 19h50. Perdu 2 SEMAINES. Il portait
 *     une simplification de parametres de tracking, annoncee comme livree.
 *   - (Balinaisa) PR mergee, commit de donnees structurees pousse apres. Repere le jour meme.
 * Rien ne les signalait : `git status` propre, aucune PR ouverte, la branche ne vivait plus qu'en
 * local. Une relecture de `git log` ne suffit pas non plus, parce qu'un squash-merge fait
 * disparaitre les sha d'origine : `git branch --merged` croit la branche non fusionnee ET
 * `git log main..branche` liste des commits deja appliques. On utilise donc `git cherry`, qui
 * compare les PATCHES et pas les sha.
 *
 *   node tools/check-orphans.js
 *
 * Lecture : un `+` = patch absent de `main`.
 *   - PR de la branche MERGEE ou FERMEE -> ORPHELIN, il n'arrivera jamais tout seul.
 *   - PR OUVERTE                        -> normal, travail en cours.
 *   - aucune PR                         -> branche de travail, a proposer ou a supprimer.
 */
'use strict';

const { execFileSync } = require('child_process');

const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
function gh(args) {
  try { return execFileSync('gh', args, { encoding: 'utf8' }).trim(); }
  catch (e) { return null; }   // gh absent ou non authentifie
}

/* Branches locales ET distantes : un orphelin survit a la suppression de la branche locale. */
const branches = [...new Set(
  git(['branch', '-a', '--format=%(refname:short)'])
    .split('\n')
    .map((b) => b.trim())
    .filter((b) => b && b !== 'main' && b !== 'origin/main' && !b.includes('HEAD'))
)];

let orphans = 0, pending = 0;

for (const b of branches) {
  let cherry;
  try { cherry = git(['cherry', 'main', b]); } catch (e) { continue; }
  const missing = cherry.split('\n').filter((l) => l.startsWith('+')).map((l) => l.slice(2).trim());
  if (!missing.length) continue;

  const short = b.replace(/^origin\//, '');
  const raw = gh(['pr', 'list', '--head', short, '--state', 'all', '--json', 'number,state', '--limit', '5']);
  let verdict, prs = [];
  if (raw === null) { verdict = 'gh indisponible, statut PR inconnu'; }
  else {
    prs = JSON.parse(raw);
    if (!prs.length) verdict = 'aucune PR : branche de travail, a proposer ou a supprimer';
    else if (prs.some((p) => p.state === 'OPEN')) verdict = 'PR ouverte : normal, travail en cours';
    else verdict = 'ORPHELIN : PR ' + prs.map((p) => '#' + p.number + ' ' + p.state).join(', ') + ' -> ces commits n arriveront JAMAIS dans main';
  }

  const isOrphan = verdict.startsWith('ORPHELIN');
  if (isOrphan) orphans++; else pending++;

  console.log((isOrphan ? '\n[!] ' : '\n    ') + b);
  console.log('    ' + verdict);
  for (const sha of missing) {
    console.log('      ' + git(['log', '-1', '--format=%h %ad %s', '--date=format:%d/%m %H:%M', sha]).slice(0, 120));
  }
}

console.log('');
if (orphans) {
  console.log(orphans + ' branche(s) avec des commits ORPHELINS.');
  console.log('Correctif : rebrancher le travail sur une branche fraiche depuis main, puis PR.');
  console.log('  git checkout -b fix/<slug> origin/main && git cherry-pick <sha>');
  process.exit(1);
}
console.log('Aucun commit orphelin.' + (pending ? ' (' + pending + ' branche(s) avec du travail en cours ou non propose)' : ''));
