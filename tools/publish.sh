#!/usr/bin/env bash
# Publie l'APK compilé dans le dépôt GitHub (dossier update/) avec son fichier de version.
# Usage : tools/publish.sh notes.txt /chemin/du/clone
set -euo pipefail
cd "$(dirname "$0")/.."
NOTES=${1:?fichier de notes requis}; REPO_DIR=${2:?chemin du clone requis}
VER=$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' app/src/main/AndroidManifest.xml)
mkdir -p "$REPO_DIR/update"
# Un nom propre à chaque version : aucune copie en cache ne peut être servie à sa place
cp dist/Pointage.apk "$REPO_DIR/update/Pointage-$VER.apk"
cp dist/Pointage.apk "$REPO_DIR/update/Pointage.apk"   # lien fixe pour la famille
python3 - "$VER" "$NOTES" "$REPO_DIR/update" <<'PY'
import json, os, sys
ver, notes, d = sys.argv[1:4]
json.dump({"version": ver, "notes": open(notes, encoding="utf-8").read().strip(),
           "apk": f"https://raw.githubusercontent.com/rogerotisqc-spec/pointage/main/update/Pointage-{ver}.apk",
           "size": os.path.getsize(os.path.join(d, "Pointage.apk"))},
          open(os.path.join(d, "version.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
PY
python3 tools/make_pages.py . "$REPO_DIR/docs"
echo "Prêt dans $REPO_DIR/update (version $VER) : il reste à faire commit et push."
