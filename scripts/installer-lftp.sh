#!/usr/bin/env bash
# Installe lftp sur le runner GitHub. L'index apt de l'image peut viser un paquet que le miroir de sécurité
# ne sert plus, ou ce miroir peut ne pas répondre (échec du 11/11/2026, « Temporary failure resolving
# security.ubuntu.com », deux fois de suite) : on rafraîchit l'index et on réessaie trois fois.
set -uo pipefail
command -v lftp > /dev/null && exit 0
for essai in 1 2 3; do
  sudo apt-get -qq update > /dev/null 2>&1
  sudo apt-get -qq install -y --fix-missing lftp > /dev/null && exit 0
  echo "Installation de lftp : essai $essai échoué, nouvel essai dans 20 s."
  sleep 20
done
echo "::error::lftp n'a pas pu être installé (miroirs Ubuntu injoignables)."
exit 1
