#!/bin/sh
# Assemble l'image complète de la puce NOR (16 Mo, MX25L12845E) :
#   0x000000  RedBoot sans contrôle CRC/taille (halmartin/MS42-GPL-sources-3-18-122)  256 Ko
#   0x040000  partition "kernel"  : en-tête SPIM + noyau 3.18.131-meraki             2,75 Mo
#   0x300000  partition "squashfs": système buildroot (lecture seule)               8 Mo
#   0xB00000  partition "config"  : jffs2 vide, superposé à /etc et /root            5 Mo
# Usage : make-image.sh kernel.part rootfs.squashfs CHAINE_BUILDROOT_HOST SORTIE.bin
set -e
KERNEL=$1; SQUASH=$2; HOST=$(cd "$3" && pwd); OUT=$4
[ -n "$OUT" ] || { echo "usage : $0 kernel.part rootfs.squashfs buildroot/output/host switch-local.bin"; exit 1; }
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT

REDBOOT_URL=https://github.com/halmartin/MS42-GPL-sources-3-18-122/raw/4b7422b54f99df8b56c47c9b314568b84ad22e2e/redboot/redboot-nocrc-sz.bin
REDBOOT_SHA=adaac5a2ae1695b04a94719ebe3e97844d7682c1b79b355f486a87b05315a477
wget -q -O "$W/loader1" "$REDBOOT_URL"
echo "$REDBOOT_SHA  $W/loader1" | sha256sum -c --quiet || { echo "empreinte de RedBoot inattendue"; exit 1; }

# zone persistante : répertoires de travail de l'overlay /etc et /root, propriétaire root
mkdir -p "$W/jffs2-root/.upper/etc" "$W/jffs2-root/.work/etc" "$W/jffs2-root/.upper/root" "$W/jffs2-root/.work/root"
MKFS="$HOST/sbin/mkfs.jffs2"; [ -x "$MKFS" ] || MKFS=mkfs.jffs2
"$MKFS" --pad=5242880 -l -n -U -X lzo -x zlib -y 40:lzo -r "$W/jffs2-root/" -o "$W/jffs2"

python3 - "$W/loader1" "$KERNEL" "$SQUASH" "$W/jffs2" "$OUT" <<'PY'
import sys, hashlib
loader, kernel, squash, jffs2, out = [open(f, "rb").read() for f in sys.argv[1:5]] + [sys.argv[5]]
def part(data, size, name):
    assert len(data) <= size, f"{name} trop grand ({len(data)} > {size})"
    return data + b"\x00" * (size - len(data))
assert kernel[:4] == b"SPIM", "kernel.part sans en-tête SPIM"
assert squash[:4] == b"hsqs", "rootfs.squashfs n'est pas un squashfs"
img = part(loader, 0x40000, "RedBoot") + part(kernel, 0x2C0000, "noyau") + part(squash, 0x800000, "squashfs") + part(jffs2, 0x500000, "jffs2")
assert len(img) == 16 * 1024 * 1024
open(out, "wb").write(img)
print(f"{out} : 16 Mo, SHA-256 {hashlib.sha256(img).hexdigest()}")
PY
