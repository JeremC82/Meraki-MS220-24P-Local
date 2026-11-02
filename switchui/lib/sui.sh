#!/bin/sh
# switchui : fonctions communes (configuration et application au switch)
#
# /etc/switchui/ports.conf : une ligne par port, champs séparés par "|"
#   port|nom|actif|mode|vitesse|vlanmode|pvid|vlans|poe|stp|edge|isole|storm
#   mode     : aneg | forced          vitesse : 10hdx 10fdx 100hdx 100fdx 1Gfdx
#   vlanmode : access | trunk         vlans   : "" = tous, sinon "1,10-20"
#   edge     : auto | yes | no        actif/poe/stp/isole/storm : 1 | 0
# /etc/switchui/system.conf : variables shell KEY='valeur'
# /etc/switchui/vlans.conf  : id|nom

SUI_ETC=/etc/switchui
SUI_RUN=/tmp/sui
C=/click
PORTS_CONF=$SUI_ETC/ports.conf
SYS_CONF=$SUI_ETC/system.conf
VLANS_CONF=$SUI_ETC/vlans.conf

sui_log() { logger -t switchui "$*" 2>/dev/null; echo "$(date '+%F %T') $*" >> $SUI_RUN/actions.log; }

num_ports() { cat $C/sw0_ctrl/num_ports 2>/dev/null || echo 24; }

has_poe() { grep -q 'MODEL=.*P$' /etc/boardinfo 2>/dev/null; }

# écrit dans un handler Click et renvoie l'erreur éventuelle (dmesg)
click_write() {
    h=$1; shift
    if ! echo "$*" > $C/$h 2>/dev/null; then
        sui_log "ERREUR $h <- $*"
        return 1
    fi
    return 0
}

sys_defaults() {
    cat <<EOF
HOSTNAME='$(hostname)'
IP_MODE='dhcp'
IP_ADDR=''
IP_MASK='255.255.255.0'
IP_GW=''
IP_DNS=''
MGMT_VLAN='1'
STP_PRIO='61440'
LLDP='1'
IGMP='1'
MIRROR_DEST='0'
MIRROR_IN=''
MIRROR_OUT=''
FAN_MODE='auto'
FAN_MANUAL='60'
FAN_MIN='30'
FAN_T_LOW='45'
FAN_T_HIGH='70'
FAN_MAX='100'
SNMP='0'
SNMP_COMMUNITY='public'
SNMP_ALLOW='default'
SNMP_LOCATION=''
SNMP_CONTACT=''
EOF
}

# crée les fichiers de configuration à partir de l'état actuel s'ils manquent
sui_init_conf() {
    mkdir -p $SUI_ETC $SUI_RUN
    [ -f $SYS_CONF ] || sys_defaults > $SYS_CONF
    [ -f $VLANS_CONF ] || echo "1|default" > $VLANS_CONF
    if [ ! -f $PORTS_CONF ]; then
        n=$(num_ports); i=1
        while [ $i -le $n ]; do
            echo "$i|Port $i|1|aneg||trunk|1||1|1|auto|0|1"
            i=$((i+1))
        done > $PORTS_CONF
    fi
}

load_sys() { sys_defaults > $SUI_RUN/sys.def; . $SUI_RUN/sys.def; [ -f $SYS_CONF ] && . $SYS_CONF; }

port_line() { awk -F'|' -v p="$1" '$1==p' $PORTS_CONF; }

bool() { [ "$1" = 1 ] && echo true || echo false; }

# applique la configuration d'un port au matériel
apply_port() {
    p=$1
    line=$(port_line $p)
    [ -z "$line" ] && return 1
    IFS='|' read -r _ name en mode speed vmode pvid vlans poe stp edge iso storm <<EOF
$line
EOF
    # couche physique
    if [ "$en" != 1 ]; then
        click_write switch_port_table/set_port_phy_cfgs "PORT $p, FC_OBEY false, EEE_ADV_ENABLED true, MODE off"
    elif [ "$mode" = forced ] && [ -n "$speed" ]; then
        click_write switch_port_table/set_port_phy_cfgs "PORT $p, FC_OBEY false, EEE_ADV_ENABLED true, MODE forced, FORCE_SPEED $speed"
    else
        click_write switch_port_table/set_port_phy_cfgs "PORT $p, FC_OBEY false, EEE_ADV_ENABLED true, MODE aneg"
    fi
    # VLAN
    [ -z "$pvid" ] && pvid=1
    if [ "$vmode" = access ]; then
        click_write switch_port_table/set_vlan_allports_conf "PORT $p, ALLOWED_VLANS \"$pvid\", ALLOW_TAGGED_IN false, ALLOW_UNTAGGED_IN true, INGRESS_FILTER true, RADIUS_CAN_ASSIGN_VLAN false, PVID $pvid, UNTAGGED_VID $pvid"
    else
        click_write switch_port_table/set_vlan_allports_conf "PORT $p, ALLOWED_VLANS \"$vlans\", ALLOW_TAGGED_IN true, ALLOW_UNTAGGED_IN true, INGRESS_FILTER true, RADIUS_CAN_ASSIGN_VLAN false, PVID $pvid, UNTAGGED_VID $pvid"
    fi
    # Spanning Tree
    mac=$(cat /tmp/MERAKI_MAC 2>/dev/null)
    ae=false; e=false
    [ "$edge" = auto ] && ae=true
    [ "$edge" = yes ] && e=true
    click_write stp/set_many_port_cfgs "PORT $mac/$p, ENABLED $(bool $stp), AUTOEDGE $ae, EDGE $e, AUTOPTP true, PTP false, PRI 128, COST 0"
    # isolation et protection contre les tempêtes
    click_write switch_port_table/set_port_isolation "PORT $p, ENABLED $(bool $iso)"
    click_write switch_port_table/set_port_storm_control "PORT $p, ENABLED $(bool $storm)"
    # PoE (seulement si l'état change)
    if has_poe; then
        cur=$(pd690xx -l 2>/dev/null | awk -v p=$p '$1==p {print $2}')
        if [ "$poe" = 1 ] && [ "$cur" != Enabled ]; then pd690xx -e $p >/dev/null 2>&1
        elif [ "$poe" != 1 ] && [ "$cur" = Enabled ]; then pd690xx -d $p >/dev/null 2>&1
        fi
    fi
    return 0
}

apply_all_ports() {
    n=$(num_ports); i=1
    while [ $i -le $n ]; do apply_port $i; i=$((i+1)); done
}

apply_system() {
    load_sys
    [ -n "$HOSTNAME" ] && hostname "$HOSTNAME"
    click_write stp/set_params "PRIORITY $STP_PRIO, HELLO_TIME 2, FORWARD_DELAY 15, MAX_AGE 20, HOLDCOUNT 6"
    click_write enable_lldp/run "$(bool $LLDP)"
    click_write configure_igmp_snoop/run "$(bool $IGMP)"
    # miroir de port
    if [ "$MIRROR_DEST" -gt 0 ] 2>/dev/null; then
        click_write sw0_ctrl/mirror_port "$MIRROR_DEST"
        click_write sw0_ctrl/mirror_ports "INGRESS_PORTS \"$MIRROR_IN\", EGRESS_PORTS \"$MIRROR_OUT\""
    else
        click_write sw0_ctrl/mirror_ports "INGRESS_PORTS \"\", EGRESS_PORTS \"\""
    fi
    # VLAN de management (pris en compte au prochain démarrage par S10clickconfig)
    echo "DHCP_VLAN=$MGMT_VLAN" > /etc/default/switch_dhcp
    # adresse IP fixe
    if [ "$IP_MODE" = static ] && [ -n "$IP_ADDR" ]; then
        bc=$(echo "$IP_ADDR $IP_MASK" | awk '{ split($1, a, "."); split($2, m, ".")
            for (i = 1; i <= 4; i++) { b = 0; for (k = 128; k >= 1; k /= 2) { mb = int(m[i] / k) % 2; ab = int(a[i] / k) % 2; b += (mb ? ab : 1) * k }
                printf "%s%d", (i > 1 ? "." : ""), b } }')
        click_write set_host_ip/run "$IP_ADDR $IP_MASK $IP_GW 1500 $bc $MGMT_VLAN"
        [ -n "$IP_DNS" ] && echo "nameserver $IP_DNS" > /etc/resolv.conf
    fi
}

# agent SNMP (net-snmp, lecture seule) : ports via sbin/sui-snmp
apply_snmp() {
    load_sys
    for d in /usr/sbin /etc/switchui-snmp; do [ -x $d/snmpd ] && SNMPD=$d/snmpd && break; done
    start-stop-daemon -K -q -p /var/run/sui-snmpd.pid 2>/dev/null; rm -f /var/run/sui-snmpd.pid
    [ "$SNMP" = 1 ] && [ -n "$SNMPD" ] || return 0
    mkdir -p $SUI_RUN/snmp
    cat > $SUI_RUN/snmp/snmpd.conf <<EOC
agentAddress udp:161
rocommunity $SNMP_COMMUNITY $SNMP_ALLOW
sysName $(hostname)
sysDescr Meraki MS220-24P - firmware local $(cat /etc/switchui/VERSION 2>/dev/null) - noyau $(uname -r)
sysLocation ${SNMP_LOCATION:-inconnu}
sysContact ${SNMP_CONTACT:-inconnu}
sysServices 2
pass_persist -p 1 .1.3.6.1.2.1.2 /etc/switchui/sbin/sui-snmp
pass_persist -p 1 .1.3.6.1.2.1.31 /etc/switchui/sbin/sui-snmp
pass_persist -p 1 .1.3.6.1.2.1.105 /etc/switchui/sbin/sui-snmp
EOC
    LD_LIBRARY_PATH=/etc/switchui-snmp/lib $SNMPD -C -c $SUI_RUN/snmp/snmpd.conf -p /var/run/sui-snmpd.pid -Lf /dev/null
}

# tableau JSON d'une chaîne (échappement minimal)
json_str() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
