#!/usr/bin/env bash
# Publie l'APK compilé comme nouvelle version (Release) GitHub.
# Usage : tools/publish.sh notes.txt
set -euo pipefail
cd "$(dirname "$0")/.."
REPO=rogerotisqc-spec/pointage
VER=$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' app/src/main/AndroidManifest.xml)
NOTES=${1:?fichier de notes requis}
test -f dist/Pointage.apk
gh release create "v$VER" dist/Pointage.apk -R "$REPO" --title "Pointage $VER" --notes-file "$NOTES" --latest
echo "Publié : https://github.com/$REPO/releases/tag/v$VER"
