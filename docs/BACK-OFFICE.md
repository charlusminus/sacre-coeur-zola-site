# Le back-office du site (Sanity)

Décision de la direction du 19/10/2026 : la structure du site est validée telle quelle, le contenu
s'édite dans un back-office Sanity. Anne publie des actualités, des événements et les menus de la
cantine, et modifie les informations générales (coordonnées, accès, direction, équipe). Elle ne
touche jamais à la mise en page ni à une adresse de page : le site s'en charge.

## Ce qu'il y a dans le back-office

| Rubrique | Contenu | Règles |
|---|---|---|
| Actualités | titre, date, rubrique (liste fermée), classes concernées (cases), résumé, photo, texte | adresse de la page tirée du titre ; deux titres identiques : l'année est ajoutée et Charles est prévenu |
| Agenda | titre, date (ou premier et dernier jour), horaires, lieu, pour qui, description, « mettre en avant » | l'événement disparaît du site une fois passé |
| Menus de la cantine | semaine (un lundi), PDF, date de mise en ligne facultative, petit mot facultatif | sans date, le menu apparaît le vendredi précédent à 8 h ; sans mot, « Voici le menu de la cantine pour la semaine du … » |
| Informations générales (document unique) | téléphones, e-mails, horaires du secrétariat, accès, Instagram, direction, secrétariat, équipe, prochaine rentrée, destinataires des demandes d'inscription | ni création d'un second exemplaire, ni suppression |
| Questions fréquentes (document unique) | questions et réponses, et la page où les afficher ; ordre par glisser-déposer | |
| Textes des pages : Éco-École, Pastorale, Tarifs (documents uniques, depuis le 19/10/2026) | un champ par bloc de texte, à sa place fixe dans la page ; listes (années, temps forts, lignes de tarif) ; photo de la page | la mise en page ne bouge pas ; un champ vidé reprend le texte d'origine (`src/contenus/pages/`) ; ligne de liste incomplète écartée et signalée |

Aucun champ technique : pas d'adresse de page, pas de balise, pas de référencement à remplir. Le
tiret long est refusé dès la saisie (le site le refuse aussi). Les autres pages (projet, vie
scolaire, APEL, etc.) restent dans le code : leur texte change par Charles. Pour rendre une page
éditable : un document dans `studio/schemaTypes/pages.ts`, ses textes d'origine dans
`src/contenus/pages/`, la fusion dans `src/lib/pages.ts`, le type dans `scripts/sanity-sync.mjs` et dans
le filtre du webhook.

## Comment le site lit le back-office

1. `scripts/sanity-sync.mjs` lit les documents **publiés** et les écrit dans `contenu-sanity/`
   (ignoré par git), dans la forme exacte de `src/contenus/` : photos et PDF téléchargés, texte
   converti en Markdown.
2. `PUBLIC_CONTENU=sanity` fait lire `contenu-sanity/` au site (`npm run build:sanity` enchaîne les
   deux). Sans cette variable, le site lit les fichiers de démonstration de `src/contenus/`.
3. Une saisie incomplète est **écartée**, jamais bloquante ; un conflit est résolu par un suffixe.
   Les deux cas sont écrits dans `contenu-sanity/rapport.txt`, et la GitHub Action ouvre (ou
   complète) le ticket « Contenus du back-office : points à regarder », assigné à Charles.
4. Le site est reconstruit à chaque publication (webhook Sanity), chaque nuit, et chaque matin vers
   8 h 10 pour les menus programmés. Un menu n'existe en ligne, PDF compris, qu'à partir de sa date
   de mise en ligne.

## Les demandes d'inscription

En ligne (`PUBLIC_FORMULAIRE=php`), le formulaire envoie la demande à `envoi-demande.php`, généré au
build sur l'hébergement OVH de l'école : un e-mail part aux adresses choisies dans « Informations
générales > Inscriptions » (direction et secrétariat), plus une copie cachée facultative (Charles depuis le 19/10/2026), avec la famille en adresse de réponse. Rien
n'est stocké sur le serveur. Protections : champ piège et délai minimal contre les robots, même site
seulement, 5 demandes par heure et par adresse IP, champs validés. Expéditeur
`ne-pas-repondre@sacrecoeurzola.fr` (domaine de l'école, couvert par le SPF OVH). La démo sur
GitHub Pages, sans PHP, garde une confirmation simulée.

Anti-robot : Cloudflare Turnstile (widget discret, il ne demande une action qu'en cas de doute).
Clé publique dans `src/lib/site.ts`, clé secrète dans le secret GitHub `TURNSTILE_SECRET`, inscrite
au build dans le seul script PHP. Sans ce secret, pas de vérification ; si Cloudflare ne répond pas,
la demande passe plutôt que d'être perdue.

Recette : `PUBLIC_FORMULAIRE=php TURNSTILE_SECRET=essai npx astro build --outDir /tmp/dist-php && npm run recette:formulaire -- /tmp/dist-php`
(PHP local, faux sendmail : parcours complet, e-mail vérifié, échec géré).

## Mise en route

Projet Sanity **`vqyjjech`** (« École Sacré-Cœur La Salle », organisation Paktiz), jeu `production`
public : le site le lit sans jeton.

- [x] Projet créé par Charles (19/10/2026).
- [x] Amorce : les 38 documents de la démo chargés le 19/10/2026 (`scripts/sanity-amorcer.mjs`,
  createIfNotExists). **Depuis, Sanity fait foi** : la démo se construit depuis Sanity, modifier
  `src/contenus/` ne change plus le site.
- [x] **Secret GitHub** `SANITY_DEPLOY_TOKEN_SCLS` (19/10/2026, back-office publié) (Settings > Secrets and variables > Actions >
  New repository secret) : la GitHub Action publie alors le back-office sur
  https://sacrecoeurzola.sanity.studio à chaque modification de `studio/`. Le jeton doit avoir le
  droit « Deploy Studio » (ou être Administrateur) ; sinon, un jeton dédié.
- [x] **Webhook** (19/10/2026, vérifié : une publication remet le site à jour en moins d'une minute ; jeton GitHub valable un an, à renouveler en octobre 2027) : projet > API > Webhooks > « Create webhook » : URL
  `https://api.github.com/repos/charlusminus/sacre-coeur-zola-site/dispatches`, méthode POST, jeu
  `production`, déclencheur création, mise à jour et suppression, filtre
  `_type in ["actualite","evenement","menu","parametres","questionsFrequentes","pageEcoEcole","pagePastorale","pageTarifs"]`, projection
  `{"event_type": "sanity"}`, en-têtes `Authorization: Bearer <jeton GitHub>` (jeton à grain fin,
  ce seul dépôt, droit « Contents: read and write ») et `Accept: application/vnd.github+json`.
  Sans webhook, une publication n'apparaît qu'à la reconstruction suivante (chaque nuit et chaque
  matin vers 8 h 10).
- [x] **Invitations** envoyées le 19/10/2026, rôle Éditrice : Anne (secretariat.ecole@sacrecoeurzola.fr) et Hélène Lampérière (ec.nantes.sacre-coeur@ec44.fr). Suivi : projet > Members.

Jamais de `sanity dataset import --replace` une fois Anne au travail : une correction passe par le
back-office, ou par l'API en `patch` document par document.

## Mode d'emploi pour Anne (à lui remettre à l'atelier)

- **Publier une actualité** : Actualités > « + » ; titre, date, rubrique, classes, résumé, photo,
  texte ; bouton **Publier** en bas. Le site est à jour en deux minutes environ.
- **Photos** : jamais de visage d'enfant (de dos, des mains, des lieux). Remplir « Que montre la photo ? ».
- **Menus** : Menus de la cantine > « + » ; choisir le lundi, déposer le PDF, **Publier**. Le menu
  apparaît tout seul le vendredi précédent à 8 h. On peut déposer tous les menus d'une période d'un coup.
- **Modifier un numéro, un horaire, la direction ou l'équipe** : Informations générales, puis Publier.
- **Retirer un contenu du site** : menu « … » en haut du document > « Dépublier (retirer du site) ».
  « Supprimer définitivement » efface aussi l'historique.
- Un message en rouge sous un champ indique ce qu'il faut corriger avant de pouvoir publier.
