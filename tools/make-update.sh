#!/bin/sh
# Fabrique un paquet de mise à jour .msu pour l'interface d'administration.
#
# Usage :
#   tools/make-update.sh -v VERSION [-n NOM] [-d DESCRIPTION] [-k kernel.part] [-s install.sh] [-r] [-e DOSSIER_ETC] [-o sortie.msu] [--no-ui]
#
#   -v VERSION      numéro de version (obligatoire), écrit dans /etc/switchui/VERSION
#   -n NOM          nom du paquet (défaut : switchui)
#   -d DESCRIPTION  texte affiché avant l'installation
#   -k FICHIER      image de partition noyau (sortie de firmware/kernel/build-kernel.sh)
#   -s FICHIER      script lancé sur le switch après la copie des fichiers
#   -r              demander un redémarrage après l'installation
#   -e DOSSIER      fichiers supplémentaires à installer dans /etc (arborescence relative à /etc)
#   --no-ui         ne pas inclure l'interface (paquet noyau seul, par exemple)
set -e
here=$(cd "$(dirname "$0")/.." && pwd)
NAME=switchui; DESC=""; VER=""; KERNEL=""; SCRIPT=""; REBOOT=0; EXTRA=""; OUT=""; UI=1
while [ $# -gt 0 ]; do
    case "$1" in
        -v) VER=$2; shift ;;
        -n) NAME=$2; shift ;;
        -d) DESC=$2; shift ;;
        -k) KERNEL=$2; shift ;;
        -s) SCRIPT=$2; shift ;;
        -r) REBOOT=1 ;;
        -e) EXTRA=$2; shift ;;
        -o) OUT=$2; shift ;;
        --no-ui) UI=0 ;;
        *) echo "option inconnue : $1" >&2; exit 1 ;;
    esac
    shift
done
[ -n "$VER" ] || { echo "-v VERSION est obligatoire" >&2; exit 1; }
for v in "$NAME" "$VER" "$DESC"; do
    case "$v" in *[\"\$\`\\]*) echo "caractères interdits (\" \$ \` \\) dans le nom, la version ou la description" >&2; exit 1 ;; esac
done
[ -n "$OUT" ] || OUT="$NAME-$VER.msu"

st=$(mktemp -d); trap 'rm -rf "$st"' EXIT
if [ $UI = 1 ]; then
    mkdir -p "$st/etc/switchui" "$st/etc/init.d"
    cp -a "$here/switchui/bin" "$here/switchui/lib" "$here/switchui/sbin" "$here/switchui/www" "$st/etc/switchui/"
    cp "$here/switchui/init/"* "$st/etc/init.d/"
    chmod 755 "$st/etc/switchui/bin/"* "$st/etc/switchui/sbin/"* "$st/etc/switchui/www/cgi-bin/"* "$st/etc/init.d/"*
fi
[ -n "$EXTRA" ] && { mkdir -p "$st/etc"; cp -a "$EXTRA/." "$st/etc/"; }
if [ -n "$KERNEL" ]; then
    [ "$(head -c 4 "$KERNEL")" = SPIM ] || { echo "$KERNEL n'a pas d'en-tête SPIM" >&2; exit 1; }
    [ "$(stat -c %s "$KERNEL")" -le $((0x2C0000)) ] || { echo "$KERNEL dépasse 0x2C0000 octets" >&2; exit 1; }
    cp "$KERNEL" "$st/kernel.part"
fi
[ -n "$SCRIPT" ] && cp "$SCRIPT" "$st/install.sh"
cat > "$st/manifest" <<EOF
NAME="$NAME"
VERSION="$VER"
DESCRIPTION="$DESC"
REBOOT="$REBOOT"
EOF
(cd "$st" && find . -type f ! -name sha256sums | sed 's#^\./##' | sort | xargs sha256sum > sha256sums)
# chemins sans "./" et propriétaire root, comme attendu par le switch
(cd "$st" && tar --owner=0 --group=0 --numeric-owner -cf - manifest sha256sums $(ls -d etc kernel.part install.sh 2>/dev/null)) | gzip -9 > "$OUT"
echo "Paquet créé : $OUT ($(stat -c %s "$OUT") octets)"
tar tzf "$OUT" | sed 's/^/  /'
