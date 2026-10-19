#!/usr/bin/env bash
# Mise en ligne du site sur l'hébergement OVH de l'école (racine www/, https://sacrecoeurzola.fr), par FTP.
#
#   scripts/production-ovh.sh envoyer [premiere]   dépose dist/ (construit au préalable)
#   scripts/production-ovh.sh verifier             contrôle le site en ligne
#   scripts/production-ovh.sh retour-arriere       remet le WordPress (après une première mise en ligne)
#
# Variables : HOTE, UTILISATEUR, MOT_DE_PASSE (secrets OVH), RACINE (www par défaut).
#
# Rien de ce que ce script n'a pas déposé n'est supprimé : la liste des fichiers déposés est gardée
# sur le serveur (www/.site-fichiers.txt), et seuls ceux qui ont disparu du build sont retirés.
# Première mise en ligne : les entrées du WordPress que le site remplace (.htaccess, robots.txt…)
# sont déplacées hors de www/, dans sauvegarde-avant-site-astro/. Le reste du WordPress (base de
# données, wp-content, wp-admin) ne bouge pas : le .htaccess du site le ferme et sert encore ses médias.
# Rien de ce qui est lu sur le serveur n'est affiché : les journaux du dépôt sont publics.
set -euo pipefail

RACINE=${RACINE:-www}
SAUVEGARDE=sauvegarde-avant-site-astro
LISTE=.site-fichiers.txt
DOMAINE=https://sacrecoeurzola.fr
T=$(mktemp -d)

ftp() { lftp -u "$UTILISATEUR","$MOT_DE_PASSE" "$HOTE" -e "set ftp:ssl-allow true; set net:max-retries 3; set cmd:fail-exit false; source $1; bye"; }
liste_build() { (cd dist && find . -type f | sed 's|^\./||' | LC_ALL=C sort); }
# Dossiers d'une liste de fichiers, les plus profonds d'abord (pour rmdir).
dossiers() { awk -F/ '{ p = ""; for (i = 1; i < NF; i++) { p = (i > 1 ? p "/" : "") $i; print p } }' "$1" | LC_ALL=C sort -u -r; }
entrees() { ls -A dist; }

envoyer() {
  local premiere=${1:-}
  liste_build > "$T/nouveaux.txt"
  echo "get -O $T $RACINE/$LISTE" > "$T/lire.lftp"
  ftp "$T/lire.lftp" > /dev/null 2>&1 || true
  if [ -s "$T/$LISTE" ]; then
    premiere=''
  elif [ "$premiere" != premiere ]; then
    echo "::notice::Le site n'est pas encore en ligne sur OVH : rien envoyé (lancer « Production OVH » à la main, première mise en ligne cochée)."
    return 0
  fi

  {
    if [ "$premiere" = premiere ]; then
      echo "mkdir -p -f $SAUVEGARDE"
      # Entrées remplacées par le site : mises de côté, sauf .htaccess et index.html, qui basculent en dernier.
      for e in $(entrees); do
        case "$e" in .htaccess|index.html) ;; *) echo "mv \"$RACINE/$e\" \"$SAUVEGARDE/$e\"" ;; esac
      done
    fi
    echo "mirror --reverse --parallel=4 --exclude ^\\.htaccess\$ --exclude ^index\\.html\$ dist/ $RACINE/"
    if [ "$premiere" = premiere ]; then
      echo "mv \"$RACINE/.htaccess\" \"$SAUVEGARDE/.htaccess\""
      echo "mv \"$RACINE/index.html\" \"$SAUVEGARDE/index.html\""
    fi
    echo "put dist/.htaccess -o $RACINE/.htaccess"
    echo "put dist/index.html -o $RACINE/index.html"
    # Fichiers retirés du build (actualité dépubliée, ancien fichier à empreinte…).
    if [ -s "$T/$LISTE" ]; then
      LC_ALL=C comm -23 "$T/$LISTE" "$T/nouveaux.txt" > "$T/retires.txt"
      while IFS= read -r f; do echo "rm \"$RACINE/$f\""; done < "$T/retires.txt"
      dossiers "$T/retires.txt" | while IFS= read -r d; do echo "rmdir \"$RACINE/$d\""; done
    fi
    echo "put $T/nouveaux.txt -o $RACINE/$LISTE"
  } > "$T/envoi.lftp"
  ftp "$T/envoi.lftp" > "$T/journal.txt" 2>&1 || true
  echo "Envoi : $(wc -l < "$T/nouveaux.txt") fichiers${premiere:+, première mise en ligne}."
  [ -n "${GITHUB_OUTPUT:-}" ] && echo "envoye=oui" >> "$GITHUB_OUTPUT"
  return 0
}

verifier() {
  local echecs=0
  attendre() { # url code [redirection attendue]
    local r; r=$(curl -s -o /dev/null -m 20 --max-redirs 0 -w '%{http_code} %{redirect_url}' "$1" || true)
    if [ "${r%% *}" = "$2" ] && { [ -z "${3:-}" ] || [ "${r#* }" = "$3" ]; }; then echo "ok    $1 : $r"
    else echo "ÉCHEC $1 : $r (attendu $2${3:+ vers $3})"; echecs=$((echecs + 1)); fi
  }
  attendre "$DOMAINE/" 200
  attendre "http://sacrecoeurzola.fr/" 301 "$DOMAINE/"
  attendre "https://www.sacrecoeurzola.fr/" 301 "$DOMAINE/"
  attendre "$DOMAINE/inscriptions/" 200
  attendre "$DOMAINE/cantine/" 200
  local menu; menu=$(ls dist/menus-cantine 2>/dev/null | head -1)
  [ -n "$menu" ] && attendre "$DOMAINE/menus-cantine/$menu" 200
  attendre "$DOMAINE/envoi-demande.php" 405
  attendre "$DOMAINE/sitemap.xml" 200
  attendre "$DOMAINE/accueil/" 301 "$DOMAINE/"
  attendre "$DOMAINE/wp-login.php" 404
  attendre "$DOMAINE/wp-content/uploads/2022/12/FLYER_A4_SCLS_WEB_250625.pdf" 200
  local local_h1 distant_h1
  local_h1=$(grep -o '<h1[^>]*>.*</h1>' dist/index.html | head -1)
  distant_h1=$(curl -s -m 20 "$DOMAINE/" | grep -o '<h1[^>]*>.*</h1>' | head -1 || true)
  if [ "$local_h1" = "$distant_h1" ]; then echo "ok    accueil : version construite"; else echo "ÉCHEC accueil : ce n'est pas la version construite"; echecs=$((echecs + 1)); fi
  [ "$echecs" = 0 ]
}

retour_arriere() {
  liste_build > "$T/nouveaux.txt"
  {
    while IFS= read -r f; do echo "rm \"$RACINE/$f\""; done < "$T/nouveaux.txt"
    dossiers "$T/nouveaux.txt" | while IFS= read -r d; do echo "rmdir \"$RACINE/$d\""; done
    echo "rm \"$RACINE/$LISTE\""
    for e in $(entrees); do echo "mv \"$SAUVEGARDE/$e\" \"$RACINE/$e\""; done
  } > "$T/retour.lftp"
  ftp "$T/retour.lftp" > /dev/null 2>&1 || true
  echo "Retour arrière fait : le WordPress est remis en place."
}

case "${1:-}" in
  envoyer) envoyer "${2:-}" ;;
  verifier) verifier ;;
  retour-arriere) retour_arriere ;;
  *) echo "usage : $0 envoyer [premiere] | verifier | retour-arriere" >&2; exit 2 ;;
esac
