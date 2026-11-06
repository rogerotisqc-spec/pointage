#!/usr/bin/env bash
# Tests automatiques de Pointage (Playwright, format téléphone et tablette).
#   tests/run.sh            → tous les tests
#   tests/run.sh testwiz    → un ou quelques tests
# Prépare deux copies de l'app (avec le relais simulé, et sans relais), démarre le relais simulé (port 8788)
# et le site construit (port 8766, pour le manuel), puis lance chaque test. Échec si un test plante
# ou affiche une erreur JavaScript (ligne « ERRORS [...] » ou « erreurs [...] » non vide).
set -u
cd "$(dirname "$0")/.."
W=tests/.work; rm -rf "$W"; mkdir -p "$W/out"
cp app/src/main/assets/index.html "$W/app.html"
python3 tools/inject_help.py "$W/app.html" >/dev/null
python3 - "$W" <<'PY'
import re, sys
w = sys.argv[1]; s = open(w + '/app.html').read()
s = re.sub(r"const AI_URL = '[^']*'", "const AI_URL = 'http://localhost:8788'", s)
s = re.sub(r"const AI_T = '[^']*'", "const AI_T = 'dGVzdA=='", s)
open(w + '/app.html', 'w').write(s)
open(w + '/offline.html', 'w').write(s.replace("const AI_URL = 'http://localhost:8788'", "const AI_URL = 'http://127.0.0.1:9'"))
# copie avec une fausse clé de rapports (test du bouton « Signaler un problème ») : jamais la vraie clé
import base64, os
b = base64.b64encode(b'cle-de-test-rapports').decode(); parts = [b[i:i+9] for i in range(0, len(b), 9)]
os.makedirs(w + '/out/fbtest', exist_ok=True)
open(w + '/out/fbtest/index.html', 'w').write(s.replace('__FB_KEY__', '.'.join(reversed(parts))))
PY
python3 tools/make_pages.py . "$W/docs" >/dev/null
node tests/mockrelay.js >/dev/null 2>&1 & RELAY=$!
(cd "$W/docs" && exec python3 -m http.server 8766 >/dev/null 2>&1) & WEB=$!
trap 'kill $RELAY $WEB 2>/dev/null' EXIT
sleep 1
LIST=${*:-$(ls tests/test*.js | xargs -n1 basename | sed 's/\.js$//')}
FAIL=0
for t in $LIST; do
  out=$(timeout 300 node "tests/$t.js" 2>&1); code=$?
  if [ $code -ne 0 ] || echo "$out" | grep -Eiq '^(ERRORS|erreurs) +\[[^]]'; then
    echo "✗ $t"; echo "$out" | tail -8 | sed 's/^/    /'; FAIL=$((FAIL+1))
  else echo "✓ $t"; fi
done
echo; [ $FAIL -eq 0 ] && echo "Tous les tests passent." || echo "$FAIL test(s) en échec."
exit $FAIL
