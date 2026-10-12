// Captures bureau et téléphone de chaque page du site construit, pour la boucle design.
// Usage : npm run build && node scripts/captures.mjs [dossier-de-sortie] [page1 page2 ...]
// Sert dist/ sous la base GitHub Pages, sans réseau extérieur.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const base = '/sacre-coeur-zola-site/';
const sortie = process.argv[2] ?? 'captures';
const pages = process.argv.slice(3).length ? process.argv.slice(3) : ['', 'inscriptions/', 'ecole/', 'vie-scolaire/', 'agenda/', 'contact/'];
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.ico': 'image/x-icon' };

const serveur = createServer((req, res) => {
  let p = decodeURI(req.url.split('?')[0]);
  if (!p.startsWith(base)) { res.writeHead(404); return res.end(); }
  let f = join('dist', p.slice(base.length));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0, '127.0.0.1');
const port = serveur.address().port;
mkdirSync(sortie, { recursive: true });

const navigateur = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const formats = { bureau: { width: 1440, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 } };
const bilan = [];
for (const [nom, vue] of Object.entries(formats)) {
  const ctx = await navigateur.newContext({ viewport: { width: vue.width, height: vue.height }, isMobile: vue.isMobile ?? false, deviceScaleFactor: vue.deviceScaleFactor ?? 1, hasTouch: vue.isMobile ?? false });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));
  page.on('pageerror', (e) => erreurs.push(e.message));
  for (const chemin of pages) {
    await page.goto(`http://127.0.0.1:${port}${base}${chemin}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const debord = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const slug = (chemin.replace(/\/$/, '') || 'accueil').replaceAll('/', '_');
    await page.screenshot({ path: join(sortie, `${slug}-${nom}.png`), fullPage: true });
    await page.screenshot({ path: join(sortie, `${slug}-${nom}-pli.png`) });
    bilan.push(`${nom} ${chemin || '/'} : débord horizontal ${debord}px${erreurs.length ? `, erreurs console : ${erreurs.join(' | ')}` : ''}`);
    erreurs.length = 0;
  }
  await ctx.close();
}
await navigateur.close();
serveur.close();
console.log(bilan.join('\n'));
