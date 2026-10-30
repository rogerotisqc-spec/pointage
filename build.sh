#!/usr/bin/env bash
# Compile l'APK de Pointage sans Gradle : aapt2 + javac + dx + signature v2.
# Variables : AAPT2, ANDROID_JAR, DX_JAR (chemins des outils)
set -euo pipefail
cd "$(dirname "$0")"
: "${AAPT2:?}" "${ANDROID_JAR:?}" "${DX_JAR:?}"
B=build; rm -rf "$B"; mkdir -p "$B/res" "$B/gen" "$B/classes" "$B/dex"
SRC=app/src/main

"$AAPT2" compile --dir "$SRC/res" -o "$B/res/res.zip"
"$AAPT2" link -o "$B/base.apk" -I "$ANDROID_JAR" --manifest "$SRC/AndroidManifest.xml" \
  --java "$B/gen" -A "$SRC/assets" "$B/res/res.zip" --auto-add-overlay

javac -source 8 -target 8 -Xlint:-options -encoding UTF-8 -bootclasspath "$ANDROID_JAR" \
  -d "$B/classes" $(find "$SRC/java" "$B/gen" -name '*.java')
java -cp "$DX_JAR" com.android.dx.command.Main --dex --min-sdk-version=24 --output="$B/dex/classes.dex" "$B/classes"

cp "$B/base.apk" "$B/unsigned.apk"
(cd "$B/dex" && zip -q -X ../unsigned.apk classes.dex)
mkdir -p dist keystore
# Signature avec apksig (outil officiel d'Android, via uber-apk-signer) et la clé du projet
rm -rf "$B/sig"; mkdir -p "$B/sig"; cp "$B/unsigned.apk" "$B/sig/Pointage.apk"
java -jar tools/bin/uber-apk-signer.jar -a "$B/sig/Pointage.apk" --ks keystore/pointage.p12 --ksAlias pointage \
  --ksPass pointage --ksKeyPass pointage --allowResign -o "$B/sig/out" | tail -3
cp "$B/sig/out/Pointage-aligned-signed.apk" dist/Pointage.apk
