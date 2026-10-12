# Site de l'école Sacré-Cœur La Salle, Nantes

Proposition de refonte du site de l'école, portée par le pôle communication de l'APEL.
Démonstration : https://charlusminus.github.io/sacre-coeur-zola-site/ (non indexée).

## Ce que c'est
Un site statique (Astro), pensé d'abord pour le téléphone et pour les familles qui cherchent une
école : premier écran clair, parcours d'inscription en trois étapes, tarifs publics, horaires,
cantine, agenda. Rapide (accueil ≈ 320 Ko, contre 4,7 Mo aujourd'hui) et accessible (Lighthouse
mobile : accessibilité 100).

## Les contenus
Les contenus vivent dans `src/contenus/`, découpés comme les futurs documents du CMS :
- `parametres.json` : coordonnées, horaires du secrétariat, chiffres clés ;
- `evenements/` : un fichier par événement (agenda) ;
- `actualites/` : un fichier par actualité ;
- `menus/menus.json` : un menu par semaine.

L'agenda et le menu de la semaine se mettent à jour seuls : le site se reconstruit chaque nuit.

## Travailler sur le site
```
npm ci
npm run dev        # aperçu local
npm run build      # build complet + contrôles (typographie, rédaction, liens)
npm run captures   # captures bureau et téléphone de chaque page (Playwright)
npm run recette    # recette complète : 4 formats, parcours (menu, inscription, FAQ, clavier, 404, agenda),
                   # accessibilité axe, données structurées, liens externes ; --en-ligne pour le site publié
```
Le build refuse un tiret cadratin, un lien interne mort, et en production (`PUBLIC_EN_LIGNE=oui`)
tout marqueur `[À CONFIRMER]`.

## Mise en ligne
Ce dépôt est public et déployé sur GitHub Pages : un push sur `main` met la démo en ligne. Pendant la
phase de build, on pousse directement sur `main` après un build vert et des captures vérifiées ; la
discipline branche + PR de `RELEASE.md` s'appliquera au passage en production.
