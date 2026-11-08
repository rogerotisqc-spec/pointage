#!/usr/bin/env python3
"""Construit le site GitHub Pages (dossier docs/) à partir de la même source que l'APK.

docs/index.html        page d'accueil : installer sur Android (APK) ou iPhone (app web)
docs/app/              app web installable (plein écran, hors ligne)
docs/Pointage.apk      copie de l'APK courant

Usage : make_pages.py <racine du projet> <dossier docs de sortie>
"""
import json, os, re, shutil, sys
from PIL import Image

root, docs = sys.argv[1], sys.argv[2]
SITE = "https://rogerotisqc-spec.github.io/pointage/"
man = open(os.path.join(root, "app/src/main/AndroidManifest.xml"), encoding="utf-8").read()
VER = re.search(r'android:versionName="([^"]+)"', man).group(1)
app_dir = os.path.join(docs, "app")
os.makedirs(app_dir, exist_ok=True)

# ---------- icônes ----------
src_icon = os.path.join(root, "app/src/main/res/mipmap-xxxhdpi/ic_launcher.png")
base = Image.open(src_icon).convert("RGBA").resize((512, 512), Image.LANCZOS)
for size, name in [(192, "icon-192.png"), (512, "icon-512.png")]:
    base.resize((size, size), Image.LANCZOS).save(os.path.join(app_dir, name))
# icône iPhone : fond plein (iOS n'accepte pas la transparence)
bg = Image.new("RGBA", (180, 180), "#1f5c45")
ic = base.resize((180, 180), Image.LANCZOS)
bg.alpha_composite(ic)
bg.convert("RGB").save(os.path.join(app_dir, "apple-touch-icon.png"))
base.resize((64, 64), Image.LANCZOS).save(os.path.join(docs, "favicon.png"))

# ---------- app web ----------
html = open(os.path.join(root, "app/src/main/assets/index.html"), encoding="utf-8").read()
head_extra = f"""<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Pointage">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" href="icon-192.png">
<style>body{{padding-top:env(safe-area-inset-top)}} .top{{top:env(safe-area-inset-top,0px)}}</style>
<script>window.WEB_VERSION = {json.dumps(VER)};</script>
"""
html = html.replace("<title>Pointage</title>", "<title>Pointage</title>\n" + head_extra, 1)
sw_reg = """<script>
if('serviceWorker' in navigator && location.protocol === 'https:'){ navigator.serviceWorker.register('sw.js').catch(function(){}); }
</script>
</body>"""
html = html.replace("</body>", sw_reg, 1)
open(os.path.join(app_dir, "index.html"), "w", encoding="utf-8").write(html)
import subprocess
subprocess.run([sys.executable, os.path.join(root, "tools/inject_key.py"), os.path.join(app_dir, "index.html")], check=True)
subprocess.run([sys.executable, os.path.join(root, "tools/inject_help.py"), os.path.join(app_dir, "index.html")], check=True)

json.dump({
    "name": "Pointage", "short_name": "Pointage", "lang": "fr-CA",
    "description": "Feuilles de pointage des jeux de société de la famille",
    "start_url": "./", "scope": "./", "display": "standalone",
    "background_color": "#f3f0e8", "theme_color": "#1f5c45",
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
              {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"}]
}, open(os.path.join(app_dir, "manifest.webmanifest"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# Service worker : réseau d'abord (toujours la dernière version), copie locale si hors ligne
open(os.path.join(app_dir, "sw.js"), "w", encoding="utf-8").write(f"""// Pointage {VER}
const CACHE = 'pointage-{VER}';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener('fetch', e => {{
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {{ const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }})
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
}});
""")

# ---------- APK ----------
apk = os.path.join(root, "dist/Pointage.apk")
if os.path.exists(apk):
    shutil.copy(apk, os.path.join(docs, "Pointage.apk"))
n = os.path.getsize(apk) if os.path.exists(apk) else 0
size_mo = (f"{round(n/1024)} Ko" if n < 1048576 else f"{n/1048576:.1f} Mo".replace(".", ",")) if n else "APK"

# ---------- manuel d'utilisation ----------
man_src = os.path.join(root, "manual")
if os.path.isdir(man_src):
    shutil.copytree(man_src, os.path.join(docs, "manuel"), dirs_exist_ok=True)
    mi = os.path.join(docs, "manuel", "index.html")
    txt = open(mi, encoding="utf-8").read().replace("{{VER}}", VER)   # lire AVANT d'ouvrir en écriture
    open(mi, "w", encoding="utf-8").write(txt)

# ---------- tableau de bord des téléchargements (docs/stats/, app web à installer ; données protégées par un code) ----------
from PIL import ImageDraw
st_src = os.path.join(root, "tools/stats/index.html")
if os.path.exists(st_src):
    st_dir = os.path.join(docs, "stats"); os.makedirs(st_dir, exist_ok=True)
    shutil.copy(st_src, os.path.join(st_dir, "index.html"))
    # icône : celle de l'app + une pastille « graphique » pour la distinguer
    ic = base.copy(); dr = ImageDraw.Draw(ic)
    dr.rounded_rectangle((268, 268, 496, 496), radius=48, fill="#ffffff", outline="#1f5c45", width=10)
    for i, (h, col) in enumerate([(70, "#2a78d6"), (120, "#eb6834"), (165, "#2a78d6")]):
        x = 302 + i * 62; dr.rounded_rectangle((x, 462 - h, x + 40, 462), radius=8, fill=col)
    for size, name in [(192, "icon-192.png"), (512, "icon-512.png")]:
        ic.resize((size, size), Image.LANCZOS).save(os.path.join(st_dir, name))
    bg2 = Image.new("RGBA", (180, 180), "#1f5c45"); bg2.alpha_composite(ic.resize((180, 180), Image.LANCZOS))
    bg2.convert("RGB").save(os.path.join(st_dir, "apple-touch-icon.png"))
    json.dump({"name": "Stats Pointage", "short_name": "Stats", "lang": "fr-CA",
               "description": "Téléchargements de l'app Pointage",
               "start_url": "./", "scope": "./", "display": "standalone",
               "background_color": "#f3f0e8", "theme_color": "#1f5c45",
               "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                         {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"}]},
              open(os.path.join(st_dir, "manifest.webmanifest"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    open(os.path.join(st_dir, "sw.js"), "w", encoding="utf-8").write(f"""// Stats Pointage {VER}
const CACHE = 'stats-{VER}';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener('fetch', e => {{
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {{ const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }})
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
}});
""")

# ---------- page d'accueil ----------
open(os.path.join(docs, ".nojekyll"), "w").write("")
landing = open(os.path.join(root, "tools/landing.html"), encoding="utf-8").read()
landing = landing.replace("{{VER}}", VER).replace("{{SIZE}}", size_mo).replace("{{SITE}}", SITE)
open(os.path.join(docs, "index.html"), "w", encoding="utf-8").write(landing)
print("Site construit, version", VER)
