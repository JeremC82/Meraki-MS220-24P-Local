'use strict';
// Interface translation (French source text -> English).
// The page is written in French; when English is selected, every text node,
// placeholder, title, toast, confirmation and chart label goes through t().
const LANG = (() => {
  try { const l = localStorage.getItem('sui-lang'); if (l) return l; } catch (e) { }
  return /^fr/i.test(navigator.language || '') ? 'fr' : 'en';
})();
document.documentElement.lang = LANG;

const EN = {
  // navigation / header
  'Tableau de bord': 'Dashboard', 'Ports': 'Ports', 'VLAN': 'VLAN', 'PoE': 'PoE', 'Ventilation': 'Cooling',
  'Graphiques': 'Charts', 'Table MAC': 'MAC table', 'Diagnostic': 'Diagnostics', 'Système': 'System',
  'Switch – Administration': 'Switch – Administration', 'hors ligne': 'offline',
  // dashboard
  'Ports actifs': 'Active ports', 'Débit entrant': 'Inbound traffic', 'Débit sortant': 'Outbound traffic',
  'reçu par le switch': 'received by the switch', 'envoyé par le switch': 'sent by the switch',
  'PoE consommé': 'PoE power', 'Température PoE': 'PoE temperature', 'Ventilateur': 'Fan', 'Charge CPU': 'CPU load',
  'En service depuis': 'Uptime', 'Façade': 'Front panel', 'cliquez sur un port pour le configurer': 'click a port to configure it',
  'lien actif': 'link up', '1 Gb/s': '1 Gb/s', '100 Mb/s': '100 Mb/s', 'désactivé': 'disabled', 'alimenté en PoE': 'PoE powered',
  'module SFP inséré (ports 21 à 24)': 'SFP module inserted (ports 21 to 24)',
  'Débit du switch': 'Switch traffic', 'toutes les 10 s, dernière heure': 'every 10 s, last hour',
  'Puissance PoE': 'PoE power', "dernière heure · détail dans l'onglet PoE": 'last hour · details in the PoE tab',
  'Ports les plus actifs': 'Busiest ports', 'Port': 'Port', 'Nom': 'Name', 'Entrant': 'In', 'Sortant': 'Out', 'Lien': 'Link',
  'Aucun trafic': 'No traffic', 'off': 'off',
  // ports
  'Remettre les compteurs à zéro': 'Reset counters', 'État': 'State', 'STP': 'STP', 'Débit ↓ / ↑': 'Rate ↓ / ↑',
  'Reçu / Envoyé': 'Received / Sent', 'MAC': 'MAC', 'activé': 'enabled', 'pas de lien': 'no link', 'prêt': 'ready',
  'coupé': 'off', 'combo': 'combo', 'SFP': 'SFP', 'forwarding': 'forwarding', 'discarding': 'discarding', 'learning': 'learning',
  'tous': 'all', 'tous les trunks': 'all trunks',
  // VLAN
  'Liste des VLAN': 'VLAN list', "les noms servent uniquement à l'affichage": 'names are for display only',
  'ID': 'ID', 'Ports non étiquetés': 'Untagged ports', 'Ports étiquetés': 'Tagged ports', 'Ajouter': 'Add',
  'Enregistrer': 'Save', 'Supprimer': 'Delete', 'Appartenance des ports': 'Port membership', 'default': 'default',
  "U = non étiqueté (VLAN natif) · T = étiqueté (trunk) · – = absent. Pour modifier, configurez le port dans l'onglet Ports.":
    'U = untagged (native VLAN) · T = tagged (trunk) · – = not a member. To change it, configure the port in the Ports tab.',
  // PoE
  'Consommation': 'Power draw', 'budget 370 W': '370 W budget', 'Tension': 'Voltage', 'Température': 'Temperature',
  'Ports alimentés': 'Powered ports', 'Consommation totale': 'Total power', 'estimée, au secteur': 'estimated, at the wall',
  'Consommation du switch': 'Switch power draw', 'Consommation à vide (W, mesurée sans appareil PoE)': 'Idle power (W, measured with no PoE device)',
  "Estimation = consommation à vide + puissance PoE délivrée ÷ 0,9 (rendement supposé de l'alimentation). Le switch ne mesure pas sa consommation au secteur : pour la mesurer, utilisez une prise wattmètre.":
    'Estimate = idle power + delivered PoE power ÷ 0.9 (assumed power supply efficiency). The switch does not measure its wall power: use a plug-in power meter to measure it.',
  'Consommation à vide enregistrée': 'Idle power saved', 'Valeur entre 1 et 300 W': 'Value between 1 and 300 W',
  'Chenillard des LED pendant le démarrage': 'LED chaser during boot', 'Ports PoE': 'PoE ports', 'Norme': 'Standard', 'Priorité': 'Priority',
  'Couper': 'Turn off', 'Activer': 'Turn on', 'Redémarrer': 'Power cycle', 'Total du switch': 'Switch total',
  'Une courbe par appareil': 'One curve per device', 'Ce modèle ne gère pas le PoE.': 'This model has no PoE.',
  'Total (W)': 'Total (W)', 'PoE total (W)': 'PoE total (W)', 'PoE (W)': 'PoE (W)', 'Aucun appareil alimenté': 'No powered device',
  // cooling
  'Vitesse actuelle': 'Current speed', 'Carte': 'Board', 'capteur TMP411': 'TMP411 sensor', 'Puce de commutation': 'Switch chip',
  'diode distante TMP411': 'TMP411 remote diode', 'Contrôleur PoE': 'PoE controller', 'Température retenue': 'Reference temperature',
  'la plus haute des trois': 'highest of the three', 'automatique': 'automatic', 'vitesse fixe': 'fixed speed',
  'Préréglages': 'Presets', 'cliquez pour charger, puis Appliquer': 'click to load, then Apply',
  'Silencieux': 'Quiet', 'Équilibré (recommandé)': 'Balanced (recommended)', 'Performance': 'Performance', 'Plein régime': 'Full speed',
  "30 % jusqu'à 50 °C, 70 % max à 72 °C": '30 % up to 50 °C, 70 % max at 72 °C', "30 % jusqu'à 45 °C, 100 % à 70 °C": '30 % up to 45 °C, 100 % at 70 °C',
  "40 % jusqu'à 38 °C, 100 % à 60 °C": '40 % up to 38 °C, 100 % at 60 °C', '100 % en permanence': '100 % at all times',
  'Courbe de ventilation': 'Fan curve', 'le point indique la situation actuelle': 'the dot shows the current state',
  'Mode': 'Mode', 'Automatique (selon la température)': 'Automatic (temperature based)', 'Vitesse fixe': 'Fixed speed',
  'Vitesse fixe (%)': 'Fixed speed (%)', 'Vitesse minimale (%)': 'Minimum speed (%)', 'Vitesse maximale (%)': 'Maximum speed (%)',
  'Début de la montée (°C)': 'Ramp starts at (°C)', 'Vitesse maximale atteinte à (°C)': 'Maximum speed reached at (°C)',
  'Sous le début de la montée : vitesse minimale. Entre les deux températures : montée linéaire. Au-delà : vitesse maximale. Le ventilateur ne descend jamais sous 30 % (il calerait). Sécurité permanente : 100 % au-delà de 75 °C ou si un capteur ne répond plus.':
    'Below the ramp start: minimum speed. Between the two temperatures: linear ramp. Above: maximum speed. The fan never goes below 30 % (it would stall). Permanent safety: 100 % above 75 °C or if a sensor stops responding.',
  'Appliquer': 'Apply', 'Modifications non appliquées': 'Unapplied changes', 'Historique': 'History',
  'Carte (°C)': 'Board (°C)', 'Puce (°C)': 'Chip (°C)', 'PoE (°C)': 'PoE (°C)', 'Ventilateur (%)': 'Fan (%)', 'sécurité': 'safety',
  // charts
  'Débit par port': 'Traffic per port', 'Dernière heure (10 s)': 'Last hour (10 s)', '24 heures (1 min)': '24 hours (1 min)',
  'Tous les ports': 'All ports', 'Température PoE et charge CPU': 'PoE temperature and CPU load', '24 h': '24 h',
  'Température PoE (°C)': 'PoE temperature (°C)', 'Charge CPU ×10': 'CPU load ×10', 'Données en cours de collecte…': 'Collecting data…',
  // MAC table
  'Adresses MAC apprises': 'Learned MAC addresses', 'Vider la table': 'Flush table', 'Adresse MAC': 'MAC address',
  'Adresse IP': 'IP address', "Nom de l'appareil": 'Device name', 'Nom du port': 'Port name', 'Type': 'Type',
  'statique': 'static', 'dynamique': 'dynamic',
  // diagnostics
  'Test de câble (VeriPHY)': 'Cable test (VeriPHY)', 'Lancer le test': 'Run test',
  'Le lien du port est coupé quelques secondes pendant le test.': 'The port link goes down for a few seconds during the test.',
  'Paire': 'Pair', 'Longueur / distance du défaut': 'Length / distance to fault', 'correcte': 'OK', 'open': 'open', 'short': 'short',
  'Miroir de port': 'Port mirroring', 'Port de destination (analyseur)': 'Destination port (analyzer)', 'Désactivé': 'Disabled',
  'Ports source – trafic entrant': 'Source ports – ingress', 'Ports source – trafic sortant': 'Source ports – egress',
  'Journal': 'Log', 'Actualiser': 'Refresh',
  // system
  'Informations': 'Information', 'Modèle': 'Model', 'Noyau': 'Kernel', 'Adresse IP actuelle': 'Current IP address',
  'Passerelle': 'Gateway', 'DNS': 'DNS', "VLAN d'administration": 'Management VLAN', 'Charge': 'Load', 'Mémoire': 'Memory',
  'Températures': 'Temperatures', "Réseau d'administration": 'Management network', 'Nom du switch': 'Switch name',
  'Adressage': 'Addressing', 'DHCP': 'DHCP', 'Adresse fixe': 'Static address', 'Masque': 'Netmask',
  "Le VLAN d'administration est pris en compte au prochain redémarrage. Une adresse fixe erronée peut rendre la page inaccessible : la console série permet toujours de corriger.":
    'The management VLAN takes effect at the next reboot. A wrong static address can make this page unreachable: the serial console can always fix it.',
  'Fonctions du switch': 'Switch features', 'Priorité Spanning Tree (RSTP)': 'Spanning Tree priority (RSTP)',
  'LLDP (découverte des voisins)': 'LLDP (neighbour discovery)', 'IGMP snooping (multicast)': 'IGMP snooping (multicast)',
  'Enregistrer et appliquer': 'Save and apply', 'SNMP': 'SNMP', 'agent actif': 'agent running', 'agent arrêté': 'agent stopped',
  "Activer l'agent SNMP (v2c, lecture seule, port UDP 161)": 'Enable the SNMP agent (v2c, read-only, UDP port 161)',
  'Communauté': 'Community', 'Adresses autorisées': 'Allowed addresses', 'Emplacement (sysLocation)': 'Location (sysLocation)',
  'Contact (sysContact)': 'Contact (sysContact)',
  'Données publiées : système (nom, description, durée de fonctionnement), IF-MIB pour les 24 ports (état, vitesse, compteurs 32 et 64 bits, nom du port en ifAlias) et POWER-ETHERNET-MIB (état PoE par port, consommation totale). Compatible LibreNMS, Zabbix, PRTG, Observium, Grafana… Choisissez une communauté différente de « public ».':
    'Published data: system (name, description, uptime), IF-MIB for the 24 ports (status, speed, 32 and 64-bit counters, port name as ifAlias) and POWER-ETHERNET-MIB (PoE status per port, total power). Works with LibreNMS, Zabbix, PRTG, Observium, Grafana… Use a community other than "public".',
  "Accès à l'interface": 'Web interface access', 'Identifiant': 'Username', 'Nouveau mot de passe': 'New password',
  'Confirmation': 'Confirm', 'Changer le mot de passe': 'Change password', 'Mise à jour': 'Update',
  "Version de l'interface": 'Interface version', 'non renseignée': 'not set',
  'Choisir un paquet de mise à jour (.msu)': 'Choose an update package (.msu)',
  "Revenir à la version précédente de l'interface": 'Roll back to the previous interface version',
  'Installer': 'Install', 'Annuler': 'Cancel',
  'Le paquet est vérifié (empreintes SHA-256, chemins autorisés, taille du noyau) avant toute installation. La configuration (ports, VLAN, mot de passe) est conservée.':
    'The package is verified (SHA-256 checksums, allowed paths, kernel size) before anything is installed. The configuration (ports, VLANs, password) is kept.',
  'Paquet': 'Package', 'Description': 'Description', 'Fichiers installés': 'Installed files', 'aucun': 'none',
  'Nouveau noyau': 'New kernel', "Script d'installation": 'Install script', 'Redémarrage': 'Reboot', 'oui': 'yes', 'non': 'no',
  'oui (environ 3 minutes de coupure)': 'yes (about 3 minutes of downtime)',
  'Sauvegarde et maintenance': 'Backup and maintenance', 'Télécharger la configuration': 'Download configuration',
  'Restaurer une configuration': 'Restore a configuration', 'Redémarrer le switch': 'Reboot the switch',
  "Bouton reset en façade maintenu 10 secondes : retour à la configuration par défaut (DHCP sur le VLAN 1, identifiant admin / numéro de série, ports par défaut). La LED passe à l'orange puis le switch redémarre.":
    'Front reset button held for 10 seconds: back to the default configuration (DHCP on VLAN 1, admin / serial number login, default ports). The LED turns orange, then the switch reboots.',
  // port dialog
  'Port activé': 'Port enabled', 'Vitesse / duplex': 'Speed / duplex', 'Automatique': 'Automatic',
  '1 Gb/s full': '1 Gb/s full', '100 Mb/s full': '100 Mb/s full', '100 Mb/s half': '100 Mb/s half', '10 Mb/s full': '10 Mb/s full', '10 Mb/s half': '10 Mb/s half',
  'Type de port': 'Port type', 'Trunk (plusieurs VLAN)': 'Trunk (several VLANs)', 'Accès (un seul VLAN)': 'Access (single VLAN)',
  "VLAN natif / d'accès": 'Native / access VLAN', 'VLAN autorisés (vide = tous)': 'Allowed VLANs (empty = all)',
  'Alimentation PoE': 'PoE power', 'Spanning Tree (RSTP)': 'Spanning Tree (RSTP)', 'Port terminal (edge)': 'Edge port',
  'Oui': 'Yes', 'Non': 'No', 'Isolation (ne communique pas avec les autres ports isolés)': 'Isolation (cannot talk to other isolated ports)',
  'Protection contre les tempêtes de broadcast': 'Broadcast storm protection', 'Redémarrer le PoE': 'Power-cycle PoE',
  'Appareils connectés': 'Connected devices', 'Vu': 'Seen', 'inconnue': 'unknown', 'Aucun appareil détecté sur ce port': 'No device detected on this port',
  'Historique du port': 'Port history', 'RJ45': 'RJ45', 'RJ45 (cage SFP vide)': 'RJ45 (SFP cage empty)',
  'module SFP inséré (cuivre prioritaire si un câble RJ45 est aussi branché)': 'SFP module inserted (copper wins if an RJ45 cable is also plugged in)',
  // placeholders
  'ex. 1,10,20-30': 'e.g. 1,10,20-30', 'ex. 1-3,7': 'e.g. 1-3,7', 'Filtrer (MAC, port, VLAN)': 'Filter (MAC, port, VLAN)',
  'default = toutes, ou 192.168.1.0/24': 'default = any, or 192.168.1.0/24',
  // toasts / confirmations
  '6 caractères minimum': '6 characters minimum', 'Ce VLAN existe déjà': 'This VLAN already exists',
  'Communauté : lettres, chiffres, _ . - (32 caractères maximum)': 'Community: letters, digits, _ . - (32 characters max)',
  'Compteurs remis à zéro': 'Counters reset', 'Configuration appliquée': 'Configuration applied', 'Configuration restaurée': 'Configuration restored',
  'ID de VLAN invalide (1 à 4094)': 'Invalid VLAN ID (1 to 4094)', 'Installer cette mise à jour ?': 'Install this update?',
  'La vitesse minimale doit être inférieure ou égale à la maximale': 'The minimum speed must be lower than or equal to the maximum',
  'Le début de la montée doit être inférieur à la température du maximum': 'The ramp start must be lower than the maximum temperature',
  'Les mots de passe ne correspondent pas': 'Passwords do not match', 'Mot de passe changé : reconnectez-vous': 'Password changed: please log in again',
  'Paquet vérifié': 'Package verified', 'Redémarrage en cours…': 'Rebooting…', 'Mise à jour installée': 'Update installed',
  'Mise à jour installée — redémarrage du switch…': 'Update installed — rebooting the switch…',
  'Redémarrer le switch ? Le réseau sera coupé environ 3 minutes.': 'Reboot the switch? The network will be down for about 3 minutes.',
  'Remettre à zéro les compteurs de tous les ports ?': 'Reset the counters of all ports?',
  'Remplacer toute la configuration par ce fichier ?': 'Replace the whole configuration with this file?',
  "Revenir à la version précédente de l'interface ? Votre configuration est conservée.": 'Roll back to the previous interface version? Your configuration is kept.',
  "Ce port semble être celui par lequel vous accédez au switch. La modification peut couper l'accès. Continuer ?":
    'This port looks like the one you use to reach the switch. The change may cut your access. Continue?',
  'SNMP appliqué': 'SNMP applied', 'Table MAC vidée': 'MAC table flushed', 'Test en cours…': 'Test running…',
  'Ventilation appliquée': 'Cooling applied', 'Version précédente restaurée': 'Previous version restored',
  'Vider la table des adresses MAC ?': 'Flush the MAC address table?', 'VLAN enregistrés': 'VLANs saved',
  'Le paquet est vérifié': 'Package verified',
  // server messages
  'action inconnue': 'unknown action', 'application impossible': 'could not apply', 'archive illisible': 'unreadable archive',
  'aucune version précédente': 'no previous version', 'aucun paquet vérifié en attente': 'no verified package pending',
  'bascule impossible': 'switch-over failed', "ce fichier n'est pas un paquet .msu (gzip)": 'this file is not an .msu package (gzip)',
  'copie des fichiers impossible': 'could not copy files', 'copie impossible': 'copy failed', 'écriture du noyau impossible': 'could not write the kernel',
  'empreintes SHA-256 incorrectes : paquet corrompu': 'SHA-256 checksums do not match: corrupted package', 'envoi incomplet': 'incomplete upload',
  'extraction impossible': 'extraction failed', 'fichier de sauvegarde invalide': 'invalid backup file',
  'identifiant ou mot de passe trop court (6 caractères minimum)': 'username or password too short (6 characters minimum)',
  "kernel.part n'a pas d'en-tête SPIM": 'kernel.part has no SPIM header', 'le paquet contient des chemins non autorisés': 'the package contains forbidden paths',
  'manifest invalide': 'invalid manifest', 'manifest ou sha256sums manquant': 'missing manifest or sha256sums',
  'noyau trop grand pour la partition': 'kernel too large for the partition', 'origine refusée': 'origin refused', 'port invalide': 'invalid port',
  'POST requis': 'POST required', 'system.conf invalide': 'invalid system.conf', 'taille de paquet invalide': 'invalid package size',
  'test impossible': 'test failed', 'vérification du noyau écrit incorrecte': 'written kernel verification failed', 'vitesse invalide': 'invalid speed',
  'VLAN natif invalide': 'invalid native VLAN', 'erreur': 'error'
};

// texts containing values
const EN_RULES = [
  [/^(\d+) appareil\(s\) alimenté\(s\)$/, '$1 powered device(s)'],
  [/^estimée : (\d+) W à vide \+ PoE$/, 'estimated: $1 W idle + PoE'],
  [/^(\d+) en 1 Gb\/s$/, '$1 at 1 Gb/s'],
  [/^(\d+) adresse\(s\)$/, '$1 address(es)'],
  [/^max\. 1 h : (.+)$/, '1 h max: $1'],
  [/^mémoire libre (\S+) \/ (\S+) Mo$/, 'free memory $1 / $2 MB'],
  [/^(\S+) Mo libres sur (\S+) Mo$/, '$1 MB free of $2 MB'],
  [/^noyau (.+)$/, 'kernel $1'],
  [/^Trunk · natif (\d+) · tous$/, 'Trunk · native $1 · all'],
  [/^Trunk · natif (\d+) · (.+)$/, 'Trunk · native $1 · $2'],
  [/^Accès (\d+)$/, 'Access $1'],
  [/^il y a (\d+) (s|min|h)$/, '$1 $2 ago'],
  [/^(\d+) j (\d+) h$/, '$1 d $2 h'],
  [/^(\d+) \(défaut\)$/, '$1 (default)'],
  [/^forcé (.+)$/, 'forced $1'],
  [/^(.+) half$/, '$1 half'],
  [/^carte (\S+) °C · puce (\S+) °C · PoE (\S+) °C$/, 'board $1 °C · chip $2 °C · PoE $3 °C'],
  [/^carte (\S+) °C · puce (\S+) °C$/, 'board $1 °C · chip $2 °C'],
  [/^(\d+) \(21 à 24 : combo RJ45\/SFP 1 Gb\/s\)$/, '$1 (21 to 24: RJ45/SFP combo, 1 Gb/s)'],
  [/^Sur la période : moyenne (.+) · maximum (.+) · énergie ≈ (.+)$/, 'Over the period: average $1 · maximum $2 · energy ≈ $3'],
  [/^Port (\d+) \(RJ45, port combo\)$/, 'Port $1 (RJ45, combo port)'],
  [/^Port (\d+) \(SFP\)$/, 'Port $1 (SFP)'],
  [/^Port (\d+) appliqué$/, 'Port $1 applied'],
  [/^PoE du port (\d+) redémarré$/, 'PoE on port $1 power-cycled'],
  [/^Le port (\d+) a un lien actif\. Le désactiver \?$/, 'Port $1 has an active link. Disable it?'],
  [/^Le lien du port (\d+) sera coupé pendant le test\. Continuer \?$/, 'The link of port $1 will go down during the test. Continue?'],
  [/^Couper l'alimentation de l'appareil du port (\d+) \?$/, 'Cut power to the device on port $1?'],
  [/^Couper puis rétablir l'alimentation du port (\d+) \?$/, 'Power-cycle port $1?'],
  [/^Envoi et vérification de (.+)…$/, 'Uploading and verifying $1…'],
  [/^L'adresse va passer à (\S+)\. Vous devrez ouvrir (\S+) ensuite\. Continuer \?$/, 'The address will change to $1. You will then need to open $2. Continue?'],
  [/^(.+) — version (.+)$/, '$1 — version $2'],
  [/^fichier non vérifié dans le paquet : (.+)$/, 'unverified file in the package: $1'],
  [/^Port (\d+) – (.+)$/, 'Port $1 – $2'],
  [/^Lien : (.*)$/, s => 'Link: ' + s.slice(7)
      .replace(/^aucun/, 'none').replace(/full-duplex/g, 'full duplex').replace(/half-duplex/g, 'half duplex')
      .replace('Support : ', 'Media: ').replace('RJ45 (cage SFP vide)', 'RJ45 (SFP cage empty)')
      .replace('module SFP inséré (cuivre prioritaire si un câble RJ45 est aussi branché)', 'SFP module inserted (copper wins if an RJ45 cable is also plugged in)')
      .replace(/Reçu /, 'Received ').replace(/Envoyé /, 'Sent ').replace(/ paquets\)/g, ' packets)').replace(/adresse\(s\) MAC/, 'MAC address(es)')
      .replace(/ Ko/g, ' KB').replace(/ Mo/g, ' MB').replace(/ Go/g, ' GB').replace(/(\d) o\b/g, '$1 B')],
  [/^(\S+) (o|Ko|Mo|Go|To) \/ (\S+) (o|Ko|Mo|Go|To)$/, (m, a, u1, b, u2) => `${a} ${bu(u1)} / ${b} ${bu(u2)}`],
  [/^(\S+) (Ko|Mo|Go|To)$/, (m, a, u) => `${a} ${bu(u)}`],
];
function bu(u) { return { o: 'B', Ko: 'KB', Mo: 'MB', Go: 'GB', To: 'TB' }[u] || u; }

function t(s) {
  if (LANG !== 'en' || s == null) return s;
  const str = String(s), k = str.trim();
  if (!k) return str;
  if (Object.prototype.hasOwnProperty.call(EN, k)) return str.replace(k, EN[k]);
  for (const [re, to] of EN_RULES) {
    if (re.test(k)) return str.replace(k, typeof to === 'function' ? k.replace(re, to) : k.replace(re, to));
  }
  return str;
}

// translates a DOM subtree (text, placeholders, titles); the log and code are left as is
function translateDOM(root) {
  if (LANG !== 'en') return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement && n.parentElement.closest('pre, code, script, style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(n => { const v = t(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; });
  root.querySelectorAll && root.querySelectorAll('[placeholder],[title]').forEach(e => {
    if (e.placeholder) { const v = t(e.placeholder); if (v !== e.placeholder) e.placeholder = v; }
    if (e.title) { const v = t(e.title); if (v !== e.title) e.title = v; }
  });
}

if (LANG === 'en') {
  const _confirm = window.confirm.bind(window);
  window.confirm = m => _confirm(t(m));
  document.addEventListener('DOMContentLoaded', () => {
    translateDOM(document.body);
    // every update of the page is translated as well
    new MutationObserver(muts => muts.forEach(m => {
      if (m.type === 'characterData') { const v = t(m.target.nodeValue); if (v !== m.target.nodeValue) m.target.nodeValue = v; }
      else m.addedNodes.forEach(n => n.nodeType === 3 ? (n.nodeValue = t(n.nodeValue)) : n.nodeType === 1 && translateDOM(n));
    })).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
}
function setLang(l) { try { localStorage.setItem('sui-lang', l); } catch (e) { } location.reload(); }
