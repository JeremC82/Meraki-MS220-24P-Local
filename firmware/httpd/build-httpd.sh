#!/bin/sh
# Construit le serveur web de l'interface : busybox 1.36.1 réduit à httpd
# (authentification, CGI), lié en statique avec la chaîne buildroot.
# Usage : build-httpd.sh DOSSIER_DE_TRAVAIL CHAINE_BUILDROOT_HOST
set -e
here=$(cd "$(dirname "$0")" && pwd)
W=$(mkdir -p "$1" && cd "$1" && pwd); HOST=$(cd "$2" && pwd)
export PATH="$HOST/bin:$PATH"
cd "$W"
[ -s busybox-1.36.1.tar.bz2 ] || wget -q https://busybox.net/downloads/busybox-1.36.1.tar.bz2
rm -rf busybox-1.36.1 && tar xjf busybox-1.36.1.tar.bz2
cp "$here/busybox-httpd.config" busybox-1.36.1/.config
make -C busybox-1.36.1 CROSS_COMPILE=mipsel-linux- oldconfig </dev/null >/dev/null
make -C busybox-1.36.1 CROSS_COMPILE=mipsel-linux- -j"$(nproc)" busybox
# le binaire doit s'appeler httpd (busybox choisit la commande d'après son nom)
cp busybox-1.36.1/busybox "$W/httpd"
echo "Serveur web : $W/httpd"
