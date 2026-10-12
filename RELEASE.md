# Process de release : site Sacré-Cœur La Salle Nantes (front public)

`sacre-coeur-zola-site` est **public** et déployé sur GitHub Pages : **tout push sur `main` = prod**. Cf paktiz `release-discipline`.

## Règle d'or
Jamais de commit/push direct sur `main`. Toute modif → branche + PR. `main` protégée (PR requise).

## Flow
1. `git checkout main && git pull --ff-only` puis `git checkout -b feat/…`.
2. **Vérif locale** : console propre ; POST lead atteint le backend (marqueur test) ; i18n si applicable ; responsive ; **bump cache-bust** `?v=AAAAMMJJx` si assets changés.
3. `git push -u origin feat/…` puis `gh pr create --fill`. Feu vert avant merge.
4. Merge `main` → l'Action Pages déploie ; run **vert**.
5. **Smoke test prod** : https://charlusminus.github.io/sacre-coeur-zola-site/ → charge, accueil, inscriptions et agenda répondent, formulaire de démonstration.
6. **Commits orphelins** : `node tools/check-orphans.js` → doit sortir vert.
7. **Rollback** : `git revert -m 1 <sha-merge>` + push.

## Commits orphelins : le piège qui a mordu deux fois sur Balinaisa

**Un commit poussé sur une branche dont la PR est DÉJÀ mergée n'arrive jamais dans `main`.** La PR est close, elle ne reprend pas les commits suivants. Rien ne le signale : `git status` reste propre, aucune PR n'apparaît ouverte, le travail semble livré. Un des deux cas a mis **deux semaines** à être découvert.

Une relecture de `git log` ne tranche pas : le merge en squash fait disparaître les sha d'origine, donc `git branch --merged` croit la branche non fusionnée **et** `git log main..branche` liste des commits dont le contenu est déjà dans `main`. Les deux signaux trompent, en sens opposés.

`tools/check-orphans.js` compare les **patches** (via `git cherry`), sur branches locales et distantes, et croise avec l'état de la PR. Rattrapage d'un orphelin :
```
git checkout -b fix/<slug> origin/main && git cherry-pick <sha>
```

**Réflexe** : après un merge, un « petit ajout » va sur une **nouvelle branche**. Les deux incidents se sont produits dans les minutes suivant le merge.

Prévention à l'échelle du repo : **`delete_branch_on_merge` activé** (Settings, ou `gh api -X PATCH repos/<owner>/<repo> -f delete_branch_on_merge=true`), pour qu'aucune branche ne survive à sa PR.

## Notes
Pas de staging natif (Pages ne sert que `main`) → branche + vérif locale = pré-prod. Rien de sensible dans ce repo public.
