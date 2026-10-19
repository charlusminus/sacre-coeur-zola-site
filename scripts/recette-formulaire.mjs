// Recette de l'envoi des demandes d'inscription, comme sur l'hébergement OVH : le site construit avec
// PUBLIC_FORMULAIRE=php, servi par PHP, avec un faux sendmail qui écrit les e-mails dans un fichier.
//
//   PUBLIC_FORMULAIRE=php TURNSTILE_SECRET=essai npx astro build --outDir /tmp/dist-php
//   node scripts/recette-formulaire.mjs /tmp/dist-php
// Avec une clé Turnstile dans le script, le widget Cloudflare est simulé dans le navigateur et la
// vérification part vers un faux serveur local, qui n'accepte que le jeton « jeton-essai ».
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync, mkdirSync, cpSync } from 'node:fs';
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
const servi = join(dossier, 'www', BASE.replaceAll('/', ''));
cpSync(dist, servi, { recursive: true });
const port = 8000 + Math.floor(Math.random() * 900);
const turnstile = /const TURNSTILE_SECRET = '[^']+';/.test(readFileSync(join(servi, 'envoi-demande.php'), 'utf8'));
const serveurs = [];
if (turnstile) {
  mkdirSync(join(dossier, 'cloudflare'));
  writeFileSync(join(dossier, 'cloudflare', 'index.php'), `<?php echo json_encode(['success' => ($_POST['response'] ?? '') === 'jeton-essai']);`);
  serveurs.push(spawn('php', ['-S', `127.0.0.1:${port + 1}`, '-t', join(dossier, 'cloudflare')], { stdio: 'ignore' }));
  const script = join(servi, 'envoi-demande.php');
  writeFileSync(script, readFileSync(script, 'utf8').replace('https://challenges.cloudflare.com/turnstile/v0/siteverify', `http://127.0.0.1:${port + 1}/`));
}
serveurs.push(spawn('php', ['-d', `sendmail_path=${sendmail}`, '-S', `127.0.0.1:${port}`, '-t', join(dossier, 'www')], { stdio: 'ignore' }));
await new Promise((r) => setTimeout(r, 800));
// Widget Turnstile simulé : il dépose le jeton choisi par le test, comme le vrai widget.
const simulerTurnstile = (page, jeton) => page.route('https://challenges.cloudflare.com/turnstile/v0/api.js', (r) => r.fulfill({
  contentType: 'text/javascript',
  body: `window.turnstile = { reset() {} }; document.querySelectorAll('.cf-turnstile').forEach((w) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = 'cf-turnstile-response'; i.value = '${jeton}'; w.append(i); });`,
}));

const echecs = [];
const affirmer = (c, m) => { if (!c) echecs.push(m); };
const navigateur = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
try {
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  await simulerTurnstile(page, 'jeton-essai');
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
  affirmer(/^Reply-To: .*<marie\.essai@example\.fr>/m.test(mail), 'réponse non adressée à la famille');
  const copie = readFileSync(join(dist, 'envoi-demande.php'), 'utf8').match(/const COPIE_CACHEE = \[(.*)\];/)?.[1] ?? '';
  if (copie.trim()) affirmer(/^Bcc: .+@.+/m.test(mail), 'copie cachée absente du courriel');
  // Corps en deux versions (texte et mise en forme), encodées en base64.
  const parties = [...mail.matchAll(/Content-Type: (text\/(?:plain|html)); charset=UTF-8\r?\nContent-Transfer-Encoding: base64\r?\n\r?\n([A-Za-z0-9+/=\r\n]+)/g)]
    .map(([, type, b64]) => [type, Buffer.from(b64.replace(/\s/g, ''), 'base64').toString('utf8')]);
  const texte = parties.find(([t]) => t === 'text/plain')?.[1] ?? '';
  const html = parties.find(([t]) => t === 'text/html')?.[1] ?? '';
  affirmer(texte.includes('Classe demandée : Moyenne section'), 'classe absente de la version texte');
  affirmer(html.includes('Moyenne section') && html.includes('href="tel:0612345678"'), 'version mise en forme incomplète (classe ou lien d\'appel)');
  if (process.env.APERCU_MAIL) writeFileSync(process.env.APERCU_MAIL, html);

  // Jeton Turnstile refusé par Cloudflare : aucun e-mail, message d'erreur, formulaire conservé.
  if (turnstile) {
    const avant = existsSync(boite) ? readFileSync(boite, 'utf8').length : 0;
    const page3 = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
    await simulerTurnstile(page3, 'jeton-refuse');
    await page3.goto(`http://127.0.0.1:${port}${BASE}inscriptions/`);
    for (const [s, v] of [['#parent', 'A'], ['#telephone', '0612345678'], ['#email', 'a@b.fr'], ['#enfant', 'B'], ['#naissance', '01012022']]) await page3.fill(s, v);
    await page3.waitForTimeout(3200);
    await page3.click('[data-envoyer]');
    await page3.locator('[data-erreur-envoi]').waitFor({ state: 'visible', timeout: 10000 });
    affirmer((await page3.locator('[data-erreur-envoi]').textContent()).includes('anti-robot'), 'refus Turnstile sans message clair');
    affirmer((existsSync(boite) ? readFileSync(boite, 'utf8').length : 0) === avant, 'e-mail parti malgré le refus Turnstile');
    affirmer(await page3.locator('form[data-demande]').isVisible(), 'le formulaire disparaît après un refus Turnstile');
  }

  // Envoi refusé par le serveur : message d'erreur, formulaire conservé.
  const page2 = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  await simulerTurnstile(page2, 'jeton-essai');
  await page2.route('**/envoi-demande.php', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"message":"L\'envoi n\'a pas abouti. Appelez-nous."}' }));
  await page2.goto(`http://127.0.0.1:${port}${BASE}inscriptions/`);
  for (const [s, v] of [['#parent', 'A'], ['#telephone', '0612345678'], ['#email', 'a@b.fr'], ['#enfant', 'B'], ['#naissance', '01012022']]) await page2.fill(s, v);
  await page2.click('[data-envoyer]');
  await page2.locator('[data-erreur-envoi]').waitFor({ state: 'visible', timeout: 5000 });
  affirmer(await page2.locator('form[data-demande]').isVisible(), 'le formulaire disparaît après un échec');
  affirmer(await page2.locator('[data-envoyer]').isEnabled(), 'le bouton reste bloqué après un échec');
} finally {
  await navigateur.close();
  serveurs.forEach((p) => p.kill());
}
if (echecs.length) { console.error(`Recette formulaire : ${echecs.length} échec(s)\n- ${echecs.join('\n- ')}`); process.exit(1); }
console.log(`Recette formulaire : envoi réel, e-mail aux destinataires, réponse à la famille, échec géré${turnstile ? ', Turnstile accepté puis refusé' : ' (sans Turnstile)'}. 0 échec.`);
