#!/usr/bin/env bash
# Installe lftp sur le runner GitHub.
# Le 11/11/2026, security.ubuntu.com ne répondait plus depuis les runners (« Temporary failure resolving »),
# et l'index apt de l'image n'y trouvait lftp que là : trois mises à jour de suite ont échoué avant tout envoi.
# D'abord l'installation normale, bornée à 2 minutes ; sinon, une liste de sources temporaire sans le miroir de
# sécurité (archive principale, release et updates), qui ne touche pas à la configuration du runner.
set -uo pipefail
command -v lftp > /dev/null && exit 0

if timeout 120 sudo apt-get -qq install -y lftp > /dev/null 2>&1; then exit 0; fi
echo "Installation normale de lftp impossible : nouvel essai sans le miroir de sécurité."

. /etc/os-release
T=$(mktemp -d)
mkdir -p "$T/listes/partial"
for miroir in http://azure.archive.ubuntu.com/ubuntu http://archive.ubuntu.com/ubuntu; do
  echo "deb $miroir $VERSION_CODENAME main universe" >> "$T/sources.list"
  echo "deb $miroir $VERSION_CODENAME-updates main universe" >> "$T/sources.list"
done
O=(-o "Dir::Etc::SourceList=$T/sources.list" -o "Dir::Etc::SourceParts=$T/vide" -o "Dir::State::Lists=$T/listes" -o Acquire::Retries=3)
mkdir -p "$T/vide"
sudo apt-get -qq "${O[@]}" update > /dev/null 2>&1
if sudo apt-get -qq "${O[@]}" install -y lftp > /dev/null; then exit 0; fi
echo "::error::lftp n'a pas pu être installé (miroirs Ubuntu injoignables)."
exit 1
