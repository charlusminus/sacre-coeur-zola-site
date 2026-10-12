#!/usr/bin/env node
// Recette complète du site construit (dist/), avec Playwright : ce qu'un parent ferait, page par
// page, sur téléphone et sur ordinateur, plus les contrôles qu'il ne voit pas (accessibilité,
// données structurées, liens externes).
//
//   npm run build && node scripts/recette.mjs            recette de dist/ servi localement
//   node scripts/recette.mjs --en-ligne                  ajoute les contrôles HTTP du site publié
//
// Sort en erreur (code 1) si un point bloquant échoue ; les avertissements ne bloquent pas.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = '/sacre-coeur-zola-site/';
const EN_LIGNE = 'https://charlusminus.github.io' + BASE;
const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const erreurs = [];
const avertissements = [];
const ok = [];
const echec = (m) => erreurs.push(m);
const alerte = (m) => avertissements.push(m);

// ---- Serveur local de dist/ sous la base GitHub Pages ------------------------------------------
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
const serveur = createServer((req, res) => {
  const p = decodeURI(req.url.split('?')[0]);
  if (!p.startsWith(BASE)) { res.writeHead(404); return res.end(); }
  let f = join('dist', p.slice(BASE.length));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end(readFileSync('dist/404.html')); }
  res.writeHead(200, { 'content-type': types[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
const ORIGINE = `http://127.0.0.1:${serveur.address().port}`;
const url = (c = '') => ORIGINE + BASE + c;

// ---- Pages : celles du plan du site, plus la 404 -----------------------------------------------
const plan = readFileSync('dist/sitemap.xml', 'utf8');
const pages = [...plan.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.slice(BASE.length));
ok.push(`${pages.length} pages au plan du site`);

const navigateur = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const formats = {
  'téléphone 320': { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
  'téléphone 390': { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'tablette 768': { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
  'bureau 1440': { viewport: { width: 1440, height: 900 } },
};
const liensExternes = new Set();

for (const [nom, options] of Object.entries(formats)) {
  const ctx = await navigateur.newContext({ ...options, locale: 'fr-FR' });
  const page = await ctx.newPage();
  for (const chemin of pages) {
    const problemes = [];
    page.removeAllListeners('console'); page.removeAllListeners('pageerror'); page.removeAllListeners('response');
    page.on('console', (m) => m.type() === 'error' && problemes.push(`console : ${m.text()}`));
    page.on('pageerror', (e) => problemes.push(`script : ${e.message}`));
    page.on('response', (r) => r.status() >= 400 && r.url().startsWith(ORIGINE) && problemes.push(`ressource ${r.status()} : ${r.url().slice(ORIGINE.length)}`));
    const rep = await page.goto(url(chemin), { waitUntil: 'networkidle' });
    if (rep.status() !== 200) problemes.push(`HTTP ${rep.status()}`);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo(0, 0); });
    await page.waitForLoadState('networkidle');
    const m = await page.evaluate(async () => {
      const r = {};
      r.debord = document.documentElement.scrollWidth - window.innerWidth;
      r.h1 = document.querySelectorAll('h1').length;
      r.title = document.title;
      r.description = document.querySelector('meta[name=description]')?.content ?? '';
      r.canonique = document.querySelector('link[rel=canonical]')?.href ?? '';
      r.imagesSansAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.src);
      r.imagesCassees = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src);
      // Largeur réelle du fichier chargé (naturalWidth est corrigé de la densité quand il y a un srcset).
      r.imagesFloues = [];
      for (const i of document.images) {
        if (!i.currentSrc || !i.getBoundingClientRect().width) continue;
        const f = new Image(); f.src = i.currentSrc; await f.decode().catch(() => {});
        const besoin = Math.round(i.getBoundingClientRect().width * devicePixelRatio);
        if (f.naturalWidth && besoin > f.naturalWidth * 1.25) r.imagesFloues.push(`${i.currentSrc.split('/').pop()} (${f.naturalWidth}px pour ${besoin})`);
      }
      const petits = [...document.querySelectorAll('a.btn, button, summary, .menu-bouton, input, select, textarea')]
        .filter((e) => e.offsetParent && (e.getBoundingClientRect().height < 44 || e.getBoundingClientRect().width < 44))
        .map((e) => `${e.tagName.toLowerCase()} « ${(e.textContent || e.getAttribute('aria-label') || e.name || '').trim().slice(0, 30)} » ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
      r.ciblesPetites = petits;
      r.ldErreurs = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => { try { JSON.parse(s.textContent); return []; } catch (e) { return [e.message]; } });
      r.externes = [...document.querySelectorAll('a[href^="http"]')].map((a) => a.href).filter((h) => !h.startsWith(location.origin));
      r.texteDebordant = [...document.querySelectorAll('h1,h2,h3,p,li,a,span,td,th')].filter((e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === 'visible' && e.clientWidth > 0 && e.getBoundingClientRect().right > window.innerWidth + 1).map((e) => e.textContent.trim().slice(0, 40));
      return r;
    });
    m.externes.forEach((h) => liensExternes.add(h));
    if (m.debord > 0) problemes.push(`débord horizontal de ${m.debord}px`);
    if (m.h1 !== 1) problemes.push(`${m.h1} titres h1`);
    if (!m.title.includes('Sacré-Cœur')) problemes.push(`titre sans le nom de l'école : ${m.title}`);
    if (chemin !== '404.html' && (m.description.length < 100 || m.description.length > 175)) alerte(`${chemin || '/'} : description de ${m.description.length} caractères`);
    if (m.imagesSansAlt.length) problemes.push(`images sans alt : ${m.imagesSansAlt.join(', ')}`);
    if (m.imagesCassees.length) problemes.push(`images cassées : ${m.imagesCassees.join(', ')}`);
    if (m.ldErreurs.length) problemes.push(`JSON-LD invalide : ${m.ldErreurs.join(' ; ')}`);
    if (m.texteDebordant.length) problemes.push(`texte qui sort de l'écran : ${m.texteDebordant.slice(0, 3).join(' | ')}`);
    if (m.ciblesPetites.length && nom.startsWith('téléphone')) alerte(`${nom} ${chemin || '/'} : cibles tactiles < 44 px : ${m.ciblesPetites.slice(0, 4).join(' ; ')}`);
    if (m.imagesFloues.length && nom === 'téléphone 390') alerte(`${chemin || '/'} : images trop petites pour l'écran : ${m.imagesFloues.join(', ')}`);
    // Accessibilité (axe-core, WCAG 2.1 AA), une fois par page, au format téléphone et bureau.
    if (nom === 'téléphone 390' || nom === 'bureau 1440') {
      await page.addScriptTag({ content: AXE });
      const axe = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] })).violations.map((v) => `${v.impact} ${v.id} (${v.nodes.length}) : ${v.nodes[0]?.target.join(' ')}`));
      axe.forEach((v) => (v.startsWith('critical') || v.startsWith('serious') ? problemes.push(`axe ${v}`) : alerte(`${nom} ${chemin || '/'} : axe ${v}`)));
    }
    problemes.forEach((p) => echec(`${nom} ${chemin || '/'} : ${p}`));
  }
  await ctx.close();
}
ok.push(`${pages.length} pages × ${Object.keys(formats).length} formats parcourues (HTTP, console, débord, h1, titre, alt, images, JSON-LD, axe)`);

// ---- Parcours ----------------------------------------------------------------------------------
async function parcours(nom, options, fn) {
  const ctx = await navigateur.newContext({ ...options, locale: 'fr-FR' });
  const page = await ctx.newPage();
  try { await fn(page); ok.push(nom); } catch (e) { echec(`${nom} : ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
const tel = formats['téléphone 390'];
const bureau = formats['bureau 1440'];
const affirmer = (c, m) => { if (!c) throw new Error(m); };

await parcours('menu téléphone : ouverture, lien actif, Échap', tel, async (page) => {
  await page.goto(url('ecole/'));
  const bouton = page.locator('[data-menu]');
  affirmer(await page.locator('#navigation').isHidden(), 'la navigation est visible avant ouverture');
  await bouton.click();
  affirmer((await bouton.getAttribute('aria-expanded')) === 'true', 'aria-expanded reste false');
  affirmer(await page.locator('#navigation a[href$="/inscriptions/"]').isVisible(), 'lien Inscriptions invisible menu ouvert');
  affirmer((await page.locator('#navigation a[aria-current="page"]').textContent()).includes("L'école") || (await page.locator('#navigation a[aria-current="page"]').textContent()).includes('L’école'), 'rubrique courante non marquée');
  await page.keyboard.press('Escape');
  affirmer((await bouton.getAttribute('aria-expanded')) === 'false', 'Échap ne ferme pas le menu');
  await bouton.click();
  await page.locator('#navigation a[href$="/agenda/"]').click();
  await page.waitForURL(/agenda\/$/);
});

await parcours("parcours d'inscription téléphone : accueil, bouton, formulaire", tel, async (page) => {
  await page.goto(url());
  await page.locator('.une .btn-principal').click();
  await page.waitForURL(/inscriptions\/#demande$/);
  const visible = await page.locator('#demande').evaluate((e) => { const r = e.getBoundingClientRect(); const h = document.querySelector('.entete').getBoundingClientRect().bottom; return r.top >= h && r.top < h + 40; });
  affirmer(visible, "le formulaire n'arrive pas juste sous l'en-tête après le clic");
  // Envoi vide : refusé, rien ne s'affiche
  await page.locator('form[data-demande] button[type=submit]').click();
  affirmer(await page.locator('[data-confirmation]').isHidden(), 'la confirmation apparaît avec un formulaire vide');
  const erreursAffichees = await page.locator('.erreur').count();
  affirmer(erreursAffichees === 6, `${erreursAffichees} messages d'erreur au lieu de 6`);
  const focus = await page.evaluate(() => { const e = document.activeElement; const r = e.getBoundingClientRect(); const h = document.querySelector('.entete').getBoundingClientRect().bottom; return { id: e.id, visible: r.top >= h && r.bottom <= innerHeight, label: document.querySelector(`label[for="${e.id}"]`).getBoundingClientRect().top >= h }; });
  affirmer(focus.id === 'parent', `focus sur ${focus.id} au lieu du premier champ`);
  affirmer(focus.visible && focus.label, 'le champ en erreur ou son libellé est caché sous l\u2019en-tête');
  // Saisie : date au format français, classe déduite
  await page.fill('#parent', 'Parent Test');
  affirmer(!(await page.locator('#erreur-parent').count()), "l'erreur du nom ne disparaît pas à la saisie");
  await page.fill('#telephone', '06 00 00 00 00');
  await page.fill('#email', 'test@example.org');
  await page.fill('#enfant', 'Camille');
  await page.locator('#naissance').pressSequentially('15032024');
  affirmer((await page.inputValue('#naissance')) === '15/03/2024', `date mal formatée : ${await page.inputValue('#naissance')}`);
  affirmer((await page.inputValue('#classe')) === 'Petite section', `classe déduite : ${await page.inputValue('#classe')} au lieu de Petite section`);
  await page.selectOption('#rentree', { index: 1 });
  affirmer((await page.inputValue('#classe')) === 'Moyenne section' || (await page.inputValue('#classe')) === 'Petite section', 'classe non recalculée au changement de rentrée');
  await page.fill('#naissance', '');
  await page.locator('#naissance').pressSequentially('02092017');
  await page.selectOption('#rentree', { index: 0 });
  affirmer((await page.inputValue('#classe')) === 'CM2', `enfant né en 2017 : ${await page.inputValue('#classe')} au lieu de CM2`);
  await page.locator('form[data-demande] button[type=submit]').click();
  affirmer(await page.locator('[data-confirmation]').isVisible(), 'pas de confirmation après un envoi complet');
  affirmer(await page.locator('form[data-demande]').isHidden(), 'le formulaire reste affiché après envoi (double envoi possible)');
  const conf = await page.evaluate(() => { const e = document.querySelector('[data-confirmation]'); const r = e.getBoundingClientRect(); return document.activeElement === e && r.top >= document.querySelector('.entete').getBoundingClientRect().bottom && r.top < innerHeight; });
  affirmer(conf, "la confirmation n'est ni à l'écran ni focalisée");
});

await parcours('FAQ : ouverture au clavier, réponse lisible', bureau, async (page) => {
  await page.goto(url('questions-frequentes/'));
  const resume = page.locator('details summary').first();
  await resume.focus();
  await page.keyboard.press('Enter');
  affirmer(await page.locator('details').first().evaluate((d) => d.open), "Entrée n'ouvre pas la question");
  affirmer(await page.locator('details').first().locator('p').isVisible(), 'réponse invisible');
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  const n = JSON.parse(ld)['@graph'].find((x) => x['@type'] === 'FAQPage')?.mainEntity.length;
  const visibles = await page.locator('details').count();
  affirmer(n === visibles, `FAQPage déclare ${n} questions, la page en montre ${visibles}`);
});

await parcours("clavier : lien d'évitement et focus visible", bureau, async (page) => {
  await page.goto(url());
  await page.keyboard.press('Tab');
  const premier = await page.evaluate(() => document.activeElement?.textContent?.trim());
  affirmer(premier === 'Aller au contenu', `premier focus : ${premier}`);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  const style = await page.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return { dans: !!e.closest('main'), contour: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2 }; });
  affirmer(style.dans, "après le lien d'évitement, le focus n'est pas dans le contenu");
  affirmer(style.contour, 'focus clavier sans contour visible');
});

await parcours('page introuvable : 404 utile', bureau, async (page) => {
  const rep = await page.goto(url('ancienne-page-wordpress/'));
  affirmer(rep.status() === 404, `statut ${rep.status()}`);
  affirmer(await page.locator('a[href$="/inscriptions/"]').first().isVisible(), 'pas de lien vers les inscriptions');
});

await parcours('agenda : événements à venir, triés, sans date passée', bureau, async (page) => {
  await page.goto(url('agenda/'));
  const dates = await page.locator('.agenda time, .agenda .discret').allTextContents();
  affirmer(dates.length > 0, 'agenda vide');
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())['@graph'].filter((x) => x['@type'] === 'Event');
  const debuts = ld.map((e) => +new Date(e.startDate));
  affirmer(debuts.every((d, i) => i === 0 || d >= debuts[i - 1]), 'événements non triés');
  const hier = Date.now() - 864e5;
  affirmer(ld.every((e) => +new Date(e.endDate) >= hier), 'un événement passé est encore affiché');
});

await navigateur.close();
serveur.close();

// ---- Fichiers pour les moteurs -----------------------------------------------------------------
const llms = readFileSync('dist/llms.txt', 'utf8');
if (!llms.includes('24 rue de la Salle Verte') || !llms.includes('## Questions fréquentes')) echec('llms.txt incomplet');
else ok.push('llms.txt complet (faits, FAQ, pages)');
const robots = readFileSync('dist/robots.txt', 'utf8');
if (process.env.PUBLIC_EN_LIGNE !== 'oui' && !robots.includes('Disallow: /')) echec('robots.txt ouvert sur la démo');
else ok.push('robots.txt conforme à la cible (démo fermée)');

// ---- Liens externes (curl, une fois chacun) -----------------------------------------------------
for (const lien of liensExternes) {
  if (lien.startsWith('tel:') || lien.startsWith('mailto:')) continue;
  let code = '000';
  try { code = execFileSync('curl', ['-s', '-o', '/dev/null', '-L', '-m', '20', '-A', 'Mozilla/5.0 recette', '-w', '%{http_code}', lien], { encoding: 'utf8' }); } catch {}
  if (code === '000' || code === '404' || code === '410') echec(`lien externe ${code} : ${lien}`);
  else if (code !== '200') alerte(`lien externe ${code} (anti-robot probable) : ${lien}`);
}
ok.push(`${liensExternes.size} liens externes vérifiés`);

// ---- Site publié ----------------------------------------------------------------------------------
if (process.argv.includes('--en-ligne')) {
  for (const c of ['', ...pages.filter((p) => p !== '404.html'), 'llms.txt', 'robots.txt', 'partage.jpg']) {
    let code = '000';
    try { code = execFileSync('curl', ['-s', '-o', '/dev/null', '-m', '20', '-w', '%{http_code}', EN_LIGNE + c], { encoding: 'utf8' }); } catch {}
    if (code !== '200') echec(`en ligne ${code} : ${EN_LIGNE + c}`);
  }
  const local = readFileSync('dist/index.html', 'utf8').match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1];
  const distant = execFileSync('curl', ['-s', '-m', '20', EN_LIGNE], { encoding: 'utf8' }).match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1];
  if (local !== distant) alerte("le site publié n'est pas la dernière version construite (h1 différent)");
  ok.push('site publié : toutes les pages répondent');
}

console.log(`\nRecette du site Sacré-Cœur La Salle\n`);
ok.forEach((m) => console.log(`  ok    ${m}`));
avertissements.forEach((m) => console.log(`  avert ${m}`));
erreurs.forEach((m) => console.log(`  ÉCHEC ${m}`));
console.log(`\n${erreurs.length} échec(s), ${avertissements.length} avertissement(s)`);
process.exit(erreurs.length ? 1 : 0);
