#!/usr/bin/env bash
# Installe lftp sur le runner GitHub.
# Le 11/11/2026, les miroirs Ubuntu ne répondaient plus depuis les runners (« Temporary failure resolving
# security.ubuntu.com », puis aucune liste de paquets lisible) : quatre mises à jour de suite se sont arrêtées
# avant tout envoi. D'abord apt, borné à 2 minutes ; sinon lftp tourne dans un conteneur Alpine (Docker Hub et
# miroir Alpine, indépendants d'Ubuntu), derrière une commande `lftp` qui voit les mêmes fichiers que le runner.
# FORCER_REPLI=docker saute apt (vérification du repli, workflow « Outil d'envoi »).
set -uo pipefail
command -v lftp > /dev/null && exit 0

if [ "${FORCER_REPLI:-}" != docker ] && timeout 120 sudo apt-get -qq install -y lftp > /dev/null 2>&1; then exit 0; fi
echo "lftp introuvable par apt : repli sur un conteneur Alpine."

printf 'FROM alpine:3.20\nRUN apk add --no-cache lftp\n' | docker build -q -t lftp-alpine - > /dev/null || {
  echo "::error::lftp n'a pas pu être installé, ni par apt ni en conteneur."; exit 1; }
TEMP=${TMPDIR:-/tmp}
sudo tee /usr/local/bin/lftp > /dev/null <<SHIM
#!/usr/bin/env bash
exec docker run --rm -i --network host -u "\$(id -u):\$(id -g)" -e HOME=/tmp -v "\$PWD:\$PWD" -v "$TEMP:$TEMP" -w "\$PWD" lftp-alpine lftp "\$@"
SHIM
sudo chmod +x /usr/local/bin/lftp
lftp --version | head -1
