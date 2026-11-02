#!/bin/sh
# Construit l'image complète de la puce NOR pour MS220-24P (et MS220/MS22 Luton26).
#
# Usage : ./build.sh [DOSSIER_DE_TRAVAIL]      (défaut : ./build)
# Produit : DOSSIER/switch-local.bin  (16 Mo, à écrire avec le programmateur)
#           DOSSIER/kernel/kernel.part (noyau seul, pour un paquet de mise à jour)
# Prévoir environ 10 Go d'espace et 1 à 2 heures (chaîne de compilation buildroot).
set -e
R=$(cd "$(dirname "$0")" && pwd)
W=$(mkdir -p "${1:-$R/build}" && cd "${1:-$R/build}" && pwd)
BRV=2023.02.4
BR=$W/buildroot-$BRV
MB_REPO=https://github.com/halmartin/meraki-builder.git
MB_COMMIT=863800b542392e1153a01af601b4173ca828a1c6
# options pour compiler les outils hôte anciens avec un gcc récent (11 et plus) ;
# -I…/host/include est l'option que buildroot met par défaut dans HOST_CFLAGS
HOSTFLAGS="-O2 -I$BR/output/host/include -Wno-error=incompatible-pointer-types -Wno-error=implicit-function-declaration -Wno-error=int-conversion"

step() { echo; echo "===== $*"; }

step "1/7 buildroot $BRV et meraki-builder"
cd "$W"
[ -s buildroot-$BRV.tar.xz ] || wget -q https://buildroot.org/downloads/buildroot-$BRV.tar.xz
[ -d "$BR" ] || tar xJf buildroot-$BRV.tar.xz
if [ ! -d meraki-builder ]; then
    git clone -q $MB_REPO meraki-builder
    git -C meraki-builder checkout -q $MB_COMMIT
fi
if [ ! -f "$BR/.meraki-ok" ]; then
    rm -rf "$BR/board/meraki"
    cp -a meraki-builder/buildroot/board/meraki "$BR/board/meraki"
    cp -a meraki-builder/buildroot/packages/pd690xx "$BR/package/pd690xx"
    (cd "$BR" && patch -p0 -s < "$W/meraki-builder/buildroot/patches/package_pd690xx.patch")
    touch "$BR/.meraki-ok"
fi
OV=$BR/board/meraki/ms220/overlay
# scripts de démarrage modifiés (modules et modèle Click lus en NAND, PoE)
cp -a "$R/firmware/rootfs/overlay/." "$OV/"
cp "$R/firmware/rootfs/buildroot.config" "$BR/.config"
make -C "$BR" olddefconfig >/dev/null

step "2/7 chaîne de compilation et système (long)"
make -C "$BR" HOST_CFLAGS="$HOSTFLAGS"
HOST=$BR/output/host
[ -x "$HOST/bin/mipsel-linux-gcc" ] || { echo "la chaîne de compilation n'a pas été construite"; exit 1; }

step "3/7 noyau 3.18.131-meraki et module assoc_stub"
"$R/firmware/kernel/build-kernel.sh" "$W/kernel" "$HOST"

step "4/7 serveur web (busybox httpd)"
"$R/firmware/httpd/build-httpd.sh" "$W/httpd" "$HOST"

step "5/7 outils et interface dans le système"
mkdir -p "$OV/usr/bin" "$OV/lib/modules" "$OV/usr/share/switchui" "$OV/etc/init.d"
"$HOST/bin/mipsel-linux-gcc" -Os -static -s -o "$OV/usr/bin/find_hdr" "$W/meraki-builder/tools/find_hdr.c"
cp "$W/kernel/assoc_stub.ko" "$OV/lib/modules/assoc_stub.ko"
rm -rf "$OV/usr/share/switchui"; mkdir -p "$OV/usr/share/switchui"
cp -a "$R/switchui/lib" "$R/switchui/sbin" "$R/switchui/www" "$R/switchui/VERSION" "$OV/usr/share/switchui/"
mkdir -p "$OV/usr/share/switchui/bin" && cp "$W/httpd/httpd" "$OV/usr/share/switchui/bin/httpd"
cp "$R/switchui/init/"* "$OV/etc/init.d/"
chmod 755 "$OV/usr/bin/find_hdr" "$OV/usr/share/switchui/bin/"* "$OV/usr/share/switchui/sbin/"* \
          "$OV/usr/share/switchui/www/cgi-bin/"* "$OV/etc/init.d/"*

step "6/7 système de fichiers final"
# script de démarrage de net-snmp retiré : l'agent est lancé par l'interface (réglage SNMP)
rm -f "$BR/output/target/etc/init.d/S59snmpd"
make -C "$BR" HOST_CFLAGS="$HOSTFLAGS"
[ -s "$BR/output/images/rootfs.squashfs" ] || { echo "rootfs.squashfs absent"; exit 1; }

step "7/7 image de la puce"
"$R/firmware/image/make-image.sh" "$W/kernel/kernel.part" "$BR/output/images/rootfs.squashfs" "$HOST" "$W/switch-local.bin"
echo
echo "Image prête : $W/switch-local.bin"
