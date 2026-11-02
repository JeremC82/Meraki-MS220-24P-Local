#!/bin/sh
# Construit le noyau 3.18.131-meraki compatible avec les modules du firmware
# Meraki 2023 présents dans la NAND du switch.
#
#   sources Meraki GPL 3.18.123 (halmartin/switch-11-22-ms220)
# + mises à jour officielles Linux 3.18.124 → 3.18.131 (kernel.org)
# + cb de sk_buff à 96 octets (0001-skbuff-cb-96-octets.patch)
# + configuration : CONFIG_LOCALVERSION="-meraki", CONFIG_MODULE_SIG=y
#
# Usage : build-kernel.sh DOSSIER_DE_TRAVAIL CHAINE_BUILDROOT_HOST
#   CHAINE_BUILDROOT_HOST = buildroot/output/host (fournit mipsel-linux-gcc)
# Produit : DOSSIER/kernel.part (en-tête SPIM + noyau compressé, partition "kernel")
set -e
here=$(cd "$(dirname "$0")" && pwd)
W=$(mkdir -p "$1" && cd "$1" && pwd); HOST=$(cd "$2" && pwd)
export PATH="$HOST/bin:$PATH"
# construction reproductible, sans le nom de la machine ni la date dans « Linux version »
export KBUILD_BUILD_USER=builder KBUILD_BUILD_HOST=meraki-ms220-local KBUILD_BUILD_VERSION=1
export KBUILD_BUILD_TIMESTAMP="2023-03-18 00:00:00 UTC"
command -v mipsel-linux-gcc >/dev/null || { echo "mipsel-linux-gcc introuvable dans $HOST/bin (construire d'abord buildroot)"; exit 1; }

SRC_REPO=https://github.com/halmartin/switch-11-22-ms220.git
SRC_COMMIT=d167da8b01e46e29bf3347b8952ce9063ba75d29

cd "$W"
if [ ! -d switch-11-22-ms220 ]; then
    git clone -q $SRC_REPO switch-11-22-ms220
    git -C switch-11-22-ms220 checkout -q $SRC_COMMIT
fi
if [ ! -f linux-3.18.131/.patched ]; then
    rm -rf linux-3.18.131
    cp -a switch-11-22-ms220/linux-3.18 linux-3.18.131
    mkdir -p stable
    for i in 123 124 125 126 127 128 129 130; do
        f=patch-3.18.$i-$((i + 1)).xz
        [ -s stable/$f ] || wget -q -O stable/$f https://cdn.kernel.org/pub/linux/kernel/v3.x/incr/$f
        echo "mise à jour Linux 3.18.$i -> 3.18.$((i + 1))"
        xzcat stable/$f | patch -d linux-3.18.131 -p1 -s -f --no-backup-if-mismatch
    done
    patch -d linux-3.18.131 -p1 --no-backup-if-mismatch < "$here/0001-skbuff-cb-96-octets.patch"
    touch linux-3.18.131/.patched
fi
grep -q '^SUBLEVEL = 131$' linux-3.18.131/Makefile || { echo "les mises à jour 3.18.131 n'ont pas été appliquées"; exit 1; }

mkdir -p build
cp "$here/config-3.18.131-meraki" build/.config
make -C linux-3.18.131 O="$W/build" ARCH=mips CROSS_COMPILE=mipsel-linux- olddefconfig >/dev/null
rel=$(make -s -C linux-3.18.131 O="$W/build" ARCH=mips CROSS_COMPILE=mipsel-linux- kernelrelease)
[ "$rel" = 3.18.131-meraki ] || { echo "version du noyau inattendue : $rel"; exit 1; }
make -C linux-3.18.131 O="$W/build" ARCH=mips CROSS_COMPILE=mipsel-linux- -j"$(nproc)" vmlinuz
mipsel-linux-objcopy -O binary build/vmlinuz build/vmlinuz.bin

# partition "kernel" : en-tête SPIM (chargement et point d'entrée 0x81000000) + noyau
python3 - "$W/build/vmlinuz.bin" "$W/kernel.part" <<'EOF'
import struct, sys
k = open(sys.argv[1], "rb").read()
p = b"SPIM" + struct.pack("<III", 0x81000000, len(k), 0x81000000) + b"\x00" * 16 + k
assert len(p) <= 0x2C0000, "noyau trop grand pour la partition"
open(sys.argv[2], "wb").write(p + b"\x00" * (0x2C0000 - len(p)))
EOF
# le module de compatibilité est compilé avec ce noyau
make -C build ARCH=mips CROSS_COMPILE=mipsel-linux- M="$here/../assoc_stub" modules
cp "$here/../assoc_stub/assoc_stub.ko" "$W/assoc_stub.ko"
echo "Noyau : $W/kernel.part — module : $W/assoc_stub.ko"
strings build/vmlinux | grep -m1 '^Linux version'
