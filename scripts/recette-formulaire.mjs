// Recette de l'envoi des demandes d'inscription, comme sur l'hébergement OVH : le site construit avec
// PUBLIC_FORMULAIRE=php, servi par PHP, avec un faux sendmail qui écrit les e-mails dans un fichier.
//
//   PUBLIC_FORMULAIRE=php npx astro build --outDir /tmp/dist-php
//   node scripts/recette-formulaire.mjs /tmp/dist-php
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, symlinkSync, chmodSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = '/sacre-coeur-zola-site/';
const dist = resolve(process.argv[2] ?? 'dist');
if (!existsSync(join(dist, 'envoi-demande.php'))) { console.error(`Pas de envoi-demande.php dans ${dist} : construire avec PUBLIC_FORMULAIRE=php.`); process.exit(1); }

const dossier = mkdtempSync(join(tmpdir(), 'recette-formulaire-'));
const boite = join(dossier, 'mails.txt');
const sendmail = join(dossier, 'sendmail.sh');
writeFileSync(sendmail, `#!/bin/sh\ncat >> "${boite}"\necho "=====" >> "${boite}"\n`);
chmodSync(sendmail, 0o755);
mkdirSync(join(dossier, 'www'));
symlinkSync(dist, join(dossier, 'www', BASE.replaceAll('/', '')));
const port = 8000 + Math.floor(Math.random() * 900);
const php = spawn('php', ['-d', `sendmail_path=${sendmail}`, '-S', `127.0.0.1:${port}`, '-t', join(dossier, 'www')], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const echecs = [];
const affirmer = (c, m) => { if (!c) echecs.push(m); };
const navigateur = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
try {
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`http://127.0.0.1:${port}${BASE}inscriptions/`);
  await page.fill('#parent', 'Marie Essai');
  await page.fill('#telephone', '06 12 34 56 78');
  await page.fill('#email', 'marie.essai@example.fr');
  await page.fill('#enfant', 'Léon');
  await page.fill('#naissance', '15032023');
  await page.fill('#message', 'Message de recette, à ignorer.');
  await page.waitForTimeout(3200); // en dessous de 3 s, le serveur prend la demande pour un robot
  await page.click('[data-envoyer]');
  await page.locator('[data-confirmation]').waitFor({ state: 'visible', timeout: 10000 });
  affirmer((await page.locator('[data-confirmation]').textContent()).includes('bien envoyée'), 'confirmation absente ou texte de la démo');
  const mail = existsSync(boite) ? readFileSync(boite, 'utf8') : '';
  affirmer(/^To: .+@.+/m.test(mail), "aucun e-mail parti vers les destinataires");
  affirmer(mail.includes('Reply-To: Marie Essai <marie.essai@example.fr>'), 'réponse non adressée à la famille');
  affirmer(mail.includes('Classe : Moyenne section'), 'classe absente du courriel');

  // Envoi refusé par le serveur : message d'erreur, formulaire conservé.
  const page2 = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  await page2.route('**/envoi-demande.php', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"message":"L\'envoi n\'a pas abouti. Appelez-nous."}' }));
  await page2.goto(`http://127.0.0.1:${port}${BASE}inscriptions/`);
  for (const [s, v] of [['#parent', 'A'], ['#telephone', '0612345678'], ['#email', 'a@b.fr'], ['#enfant', 'B'], ['#naissance', '01012022']]) await page2.fill(s, v);
  await page2.click('[data-envoyer]');
  await page2.locator('[data-erreur-envoi]').waitFor({ state: 'visible', timeout: 5000 });
  affirmer(await page2.locator('form[data-demande]').isVisible(), 'le formulaire disparaît après un échec');
  affirmer(await page2.locator('[data-envoyer]').isEnabled(), 'le bouton reste bloqué après un échec');
} finally {
  await navigateur.close();
  php.kill();
}
if (echecs.length) { console.error(`Recette formulaire : ${echecs.length} échec(s)\n- ${echecs.join('\n- ')}`); process.exit(1); }
console.log('Recette formulaire : envoi réel, e-mail aux destinataires, réponse à la famille, échec géré. 0 échec.');
