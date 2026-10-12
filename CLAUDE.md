# CLAUDE.md : site de l'école Sacré-Cœur La Salle, Nantes

Dépôt **public** (GitHub Pages) du site de démonstration. Le contexte (discovery, benchmark,
décisions, routine d'itération) est dans le dépôt privé `charlusminus/sacre-coeur-zola`.

## Règles
- **Jamais de push sur `main`** : branche + PR + captures + feu vert de Charles. Fusion = mise en ligne.
- Rien de privé ici : ni données de familles, ni noms d'enfants, ni éléments financiers internes.
- Rédaction : français, vouvoiement, jamais de tiret cadratin (le build le refuse), « Sacré-Cœur »
  avec « œ ». Un fait non vérifié porte `[À CONFIRMER]` (bloquant en production).
- **Droit à l'image** : n'ajouter une photo d'enfant reconnaissable qu'avec l'accord de l'école.
- `src/styles/tokens.css` est la source unique du design (charte La Salle France, contrastes notés) ;
  aucune couleur en dur ailleurs. Une seule action principale, le rose.
- Les contenus (`src/contenus/`) préfigurent les documents du futur CMS (Sanity) : garder les
  schémas de `src/content.config.ts` stricts, une saisie invalide ne doit jamais casser la mise en ligne.
- Vérifier chaque changement visuel par `npm run build && npm run captures` (bureau et téléphone).
