# Pointage — consignes pour toute modification de l'app

Application familiale de feuilles de pointage (Android + app web). Propriétaire : Roger
(GitHub `rogerotisqc-spec`). Tout se fait en français, avec des mots simples.

## Règle permanente : le manuel suit l'app

**À chaque modification de l'app, mettre à jour le manuel d'utilisation dans la même version :**
1. Adapter le texte de `manual/index.html` (section concernée, table des matières, mots-clés
   `data-kw` pour la recherche, questions fréquentes au besoin).
2. Si l'écran a changé, adapter `tools/manual_shots.js` puis régénérer les copies d'écran :
   `node tools/manual_shots.js <dossier png>` puis conversion en WebP 520 px dans `manual/img/`.
3. Vérifier le manuel (recherche, images, table des matières) avant de publier.

## Structure

- `app/src/main/assets/index.html` : toute l'interface (HTML/CSS/JS), partagée par l'APK et l'app web.
- `app/src/main/java/ca/famille/pointage/MainActivity.java` : enveloppe Android (WebView, sauvegarde,
  mises à jour intégrées, voix, rapports, écran allumé).
- `manual/` : manuel d'utilisation (copié dans `docs/manuel/` par `tools/make_pages.py`).
- `tools/landing.html` : page d'installation (docs/index.html).
- `tools/make_pages.py` : construit le site GitHub Pages (`docs/`) : page d'installation, app web
  installable (`docs/app/`), manuel, APK.
- `tools/publish.sh notes.txt <clone du dépôt>` : dépose l'APK (`update/Pointage-X.Y.apk` et
  `update/Pointage.apk`), `update/version.json` (lu par le bouton de mise à jour) et reconstruit `docs/`.
- `tools/inject_key.py` : insère la clé des rapports (encodée, découpée) au moment de construire.

## Publier une version

1. Monter `versionCode` (+1) et `versionName` dans `AndroidManifest.xml`.
2. Tester (Playwright au format téléphone et tablette, sans erreur JS).
3. `AAPT2=… ANDROID_JAR=… DX_JAR=… ./build.sh` (aapt2, android.jar API 29, dx 30.0.2 ; signature apksig
   par uber-apk-signer avec `keystore/pointage.p12`, alias `pointage`, mot de passe `pointage`).
4. Mettre à jour le manuel (voir plus haut).
5. Notes de version courtes dans un fichier texte, puis `tools/publish.sh`, commit et push sur `main`.
6. Vérifier que la clé des rapports n'apparaît en clair nulle part dans le dépôt.

## Secrets (jamais dans le dépôt public)

- `keystore/` : clé de signature (sans elle, les mises à jour ne s'installent plus par-dessus l'app)
  et `feedback.key` (clé GitHub limitée aux issues du dépôt). Ils sont seulement dans
  `Pointage-projet.zip`, dans `Documents\Pointage` sur le PC de Roger.

## Règles de jeu de la famille (déjà dans l'app)

- Jeu de dés : partie à 25 000, entrée à 1 000 en un tour, objectif à atteindre exactement (un
  dépassement termine le tour sans gain ni perte), pénalité de 1 000 à partir de 20 000 seulement si
  aucun dé n'a compté pendant le tour, six dés identiques = victoire immédiate.
- Uno : choix au début de la partie. Officielle (par défaut) : celui qui termine la manche marque les
  cartes des autres, premier à 500 gagne. Maison : chacun compte ses cartes, le plus bas gagne.
- Skip-Bo et Mille Bornes (TEAM_GAMES) : individuel ou en équipes (choix au début). En équipes,
  g.players contient les équipes, g.members les joueurs de chaque équipe, g.seat l'ordre autour de la
  table. Au Mille Bornes, les partenaires partagent un seul jeu : la saisie se fait par équipe.
- Skip-Bo : pointage officiel.
- Play Nine : 9 trous seulement.
