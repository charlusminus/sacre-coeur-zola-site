// .htaccess de l'hébergement OVH (Apache), écrit dans dist/ après le build. Sans effet sur GitHub Pages.
//  - toujours : page 404, pas de liste de dossiers, en-têtes de sécurité, cache et compression,
//    redirections des anciennes adresses du WordPress (scripts/anciennes-adresses.json) ;
//  - en ligne seulement (PUBLIC_EN_LIGNE=oui) : HTTPS et domaine sans www imposés, HSTS.
// Une redirection vers une page qui n'existe plus (actualité renommée) est écartée avec un
// avertissement, jamais écrite : elle mènerait à une 404.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const base = (process.env.BASE_PATH ?? '/sacre-coeur-zola-site/').replace(/\/?$/, '/');
const enLigne = process.env.PUBLIC_EN_LIGNE === 'oui';
const carte = JSON.parse(readFileSync(new URL('./anciennes-adresses.json', import.meta.url), 'utf8'));

const existe = (chemin) => chemin === '' || existsSync(join(dist, chemin, 'index.html'));
const echapper = (s) => s.replace(/[.+?()[\]{}|\\^$*]/g, '\\$&');
const regles = [];
const ecartees = [];
const rediriger = (motif, cible) => (existe(cible) ? regles.push(`RewriteRule ${motif} ${base}${cible} [R=301,L]`) : ecartees.push(`${motif} -> ${cible}`));

for (const [ancien, cible] of Object.entries(carte.pages)) rediriger(`^${echapper(ancien)}/?$`, cible);
// Les adresses des actualités viennent des titres saisis dans Sanity : sans Sanity (démo locale), on les saute.
if (process.env.PUBLIC_CONTENU === 'sanity') for (const [ancien, cible] of Object.entries(carte.articles)) rediriger(`^${echapper(ancien)}/?$`, `actualites/${cible}/`);
for (const [motif, cible] of Object.entries(carte.motifs)) rediriger(motif, cible);
const supprimees = carte.supprimees.map((a) => `RewriteRule ^${echapper(a)}/?$ - [G,L]`);

const htaccess = `# Généré par scripts/htaccess.mjs : ne pas modifier sur le serveur.
Options -Indexes
DirectoryIndex index.html
AddDefaultCharset UTF-8
AddType text/plain;charset=UTF-8 .txt
ErrorDocument 404 ${base}404.html
ErrorDocument 410 ${base}404.html

<IfModule mod_rewrite.c>
RewriteEngine On
${enLigne ? `# Une seule adresse : https://sacrecoeurzola.fr
RewriteCond %{HTTPS} !=on [OR]
RewriteCond %{HTTP_HOST} ^www\\. [NC]
RewriteRule ^ https://sacrecoeurzola.fr%{REQUEST_URI} [R=301,L]
` : ''}
# Anciennes adresses du WordPress
${regles.join('\n')}
# Listes nominatives d'élèves de l'ancien site : supprimées (410)
${supprimees.join('\n')}
</IfModule>

<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()"
${enLigne ? 'Header always set Strict-Transport-Security "max-age=31536000"\n' : ''}# Fichiers à empreinte (CSS, JS, images, polices) : un an ; pages : toujours revérifiées.
<FilesMatch "\\.(css|js|webp|avif|jpg|jpeg|png|svg|woff2)$">
Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
<FilesMatch "\\.(html|xml|txt)$">
Header set Cache-Control "no-cache"
</FilesMatch>
<FilesMatch "\\.pdf$">
Header set Cache-Control "public, max-age=86400"
</FilesMatch>
<FilesMatch "\\.php$">
Header set Cache-Control "no-store"
</FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/xml application/javascript application/json image/svg+xml
</IfModule>
`;

writeFileSync(join(dist, '.htaccess'), htaccess);
for (const e of ecartees) console.warn(`htaccess : redirection écartée, page absente : ${e}`);
console.log(`htaccess : ${regles.length} redirections${enLigne ? ', HTTPS imposé' : ''}${ecartees.length ? `, ${ecartees.length} écartée(s)` : ''}.`);
