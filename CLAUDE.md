# CLAUDE.md : site de l'école Sacré-Cœur La Salle, Nantes

Dépôt **public** (GitHub Pages) du site de démonstration. Le contexte (discovery, benchmark,
décisions, routine d'itération) est dans le dépôt privé `charlusminus/sacre-coeur-zola`.

## Règles
- **Phase de build (décision de Charles du 12/10/2026)** : on déploie directement, push sur `main` sans PR,
  après `npm run build` vert et captures vérifiées. Push sur `main` = mise en ligne de la démo. La règle
  branche + PR + feu vert reviendra au passage en production sur le domaine de l'école.
- Rien de privé ici : ni données de familles, ni noms d'enfants, ni éléments financiers internes.
- Rédaction : français, vouvoiement, jamais de tiret cadratin (le build le refuse), « Sacré-Cœur »
  avec « œ ». Un fait non vérifié porte `[À CONFIRMER]` (bloquant en production).
- **Aucun visage d'enfant** (règle de Charles du 12/10/2026) : des enfants de dos, des mains, des lieux, jamais
  un visage, même petit ou au second plan. Recadrer ou écarter la photo. Vérifier chaque image à l'œil avant de l'ajouter.
- `src/styles/tokens.css` est la source unique du design (charte La Salle France, contrastes notés) ;
  aucune couleur en dur ailleurs. Une seule action principale, le rose.
- Les contenus (`src/contenus/`) préfigurent les documents du futur CMS (Sanity) : garder les
  schémas de `src/content.config.ts` stricts, une saisie invalide ne doit jamais casser la mise en ligne.
- Avant chaque push : `npm run build && npm run recette` (0 échec exigé), et les captures pour tout changement visuel.
- Pièges vécus : un attribut `[hidden]` est écrasé par un `display` de classe (règle globale `[hidden]` dans le CSS) ;
  un `pattern` d'attribut perd ses `\d` dans Astro (écrire `[0-9]`) ; `scroll-padding-top` et `scroll-margin-top`
  s'additionnent sous l'en-tête collant.
