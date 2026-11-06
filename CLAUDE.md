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
4. L'assistant hors ligne lit le manuel : `tools/inject_help.py` l'insère dans l'app à chaque build
   (`build.sh` et `make_pages.py`, marqueur `/*HELP*/`). Pour une nouvelle fonction, ajouter aussi une
   réponse rapide dans `HELP_FAQ` (index.html) et, au besoin, des synonymes dans `HELP_SYN`.
   Test : `tests/run.sh testask` (questions types).

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
- `server/worker.js` : relais IA (Cloudflare Worker `pointage-ia.rogerotisqc.workers.dev`, compte Cloudflare de
  Roger). Garde la clé Anthropic (secret ANTHROPIC_API_KEY), vérifie APP_TOKEN (= `keystore/ai.token`, injecté
  dans l'app par `inject_key.py`), compte les questions (KV `LIMITS`), modèle claude-haiku-5-5 + recherche web.
  Pour le modifier : Roger recolle le fichier dans Cloudflare (Edit code → Deploy). L'IA passe avant
  l'assistant hors ligne, qui sert sans connexion ou en cas d'erreur.
- Analyse de partie par Ludo (index.html : gameRecap, anFacts, anStart) : récapitulatif texte de la partie + faits
  calculés par l'app, envoyés au relais dans `recap` (`mode: 'analyse'` pour la première demande) ; le relais répond
  `recap: true` (sinon l'app affiche les faits seuls, comme hors ligne). Nouveau jeu : ajouter ses détails dans anRoundNote
  et anFacts.
- Partie en direct (index.html : liveStart, livePush, vLive ; relais : /live/get|put|del) : l'hôte envoie la partie
  chiffrée AES-GCM (clé dans le lien du code QR, après #suivre=ID.CLÉ, jamais envoyée au serveur) ; base D1 liée au
  relais sous le nom DB (table live, effacée après 3 jours) ; les autres suivent en lecture seule (web app, sondage 3 s).
  g.share = {id, tok, k} reste sur le téléphone de l'hôte (jamais dans liveSnap). Générateur QR : qrcode-generator (MIT).
  Étape B (liveEntryHtml, liveSendScore, liveInboxLoop, liveApply, liveOpenInbox) : chaque joueur envoie ses points
  chiffrés (/live/send, table livemsg) ; l'hôte les lit (/live/inbox, toutes les 3 s), les garde dans g.inbox (clé
  liveRoundKey) et préremplit sa fenêtre de saisie ; l'hôte enregistre toujours. Yahtzee : case inscrite à l'arrivée.
  Phase 10 : « phase réussie » appliquée quand la manche est enregistrée (liveInboxCheck). Jeux : LIVE_ENTRY.
  Jeux par tours (Scrabble, dés, Triomino) : le joueur dont c'est le tour utilise l'outil de la feuille (LIVE_PANEL, posé
  par vFarkle/vScrabble/vTriomino) sur sa copie ; render() → liveTurnCheck envoie le changement {t:'turn', base, cur0, add, cur}
  puis remet la copie ; l'hôte n'accepte que si g.turns.length === base et g.cur === cur0 (liveTurnApply). Mille Bornes :
  une saisie par équipe avec le calculateur (liveMbOpen, M.liveMb : mbOthers → null), primes croisées calculées par l'hôte.
  Reprise : l'hôte repousse la partie à la réouverture (LIVE_OPENED) ; les joueurs retrouvent les parties suivies sur l'accueil
  (localStorage pointage.suivies, 4 jours) ; « Garder cette partie » copie la partie dans db.games (fromLive). Android : lien
  pointage://suivre/ID.CLÉ (intent-filter, MainActivity.liveLink/openLive), bouton intent:// sur la page de suivi.
- Synchronisation des appareils (index.html : syncNow, syncMerge, syncApply, syncCard ; relais : /sync/get|put, table sync) :
  groupe {id, k} dans localStorage pointage.sync (lien #relier=ID.CLÉ, Android pointage://relier/…), copie chiffrée (gzip +
  AES-GCM) de tout db sauf share/inbox ; fusion à trois voies avec les empreintes de la dernière synchro (pointage.syncb) ;
  même partie changée des deux côtés : la plus récente ; joueurs de même nom fusionnés (rid remappé) ; écriture versionnée
  (409 → recombiner). Synchro après save() (4 s), à l'ouverture et toutes les 60 s.
- Bouton réseau (NET_SVG, liveTopBtn) en haut de chaque partie, ajouté par histBtns.
- `tools/inject_help.py` : insère le texte du manuel pour l'assistant hors ligne (questions vocales,
  réponse lue par TextToSpeech côté Android, speechSynthesis côté web).

## Publier une version

1. Monter `versionCode` (+1) et `versionName` dans `AndroidManifest.xml`.
2. Tester : `tests/run.sh` (40 tests Playwright, téléphone et tablette, relais simulé `tests/mockrelay.js` ;
   voir `tests/README.md`). GitHub les relance à chaque push (`.github/workflows/tests.yml`). Nouveau test : `tests/testXXX.js`
   avec `const T = require('./_env')` (T.app, T.build, T.src, T.out).
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
- Phase 10 : g.ph[pk] = phase à réussir (1..11). Tableau : ligne 0 « Départ » ; marqueur plein à la dernière phase réussie
  (p10At), cercle pointillé = phase à réussir (le toucher = phase réussie), petits points = chemin parcouru.
- Skyjo : règles officielles (partie à 100, le plus bas gagne, colonne de 3 identiques retirée,
  doublement de celui qui termine s'il n'a pas strictement le plus bas et que son pointage est positif).
- Wizard : 3 à 6 joueurs, 60 ÷ joueurs manches (k cartes à la manche k), mises puis plis (g.pend garde
  les mises en cours), réussie = 20 + 10 par pli, ratée = −10 par pli d'écart, le plus haut gagne.
  Règle maison au choix : le total des mises ne doit pas égaler le nombre de cartes.
- Acquire : calculatrice + pointage (argent papier conservé). g.opts.ed (classic / ah2016 / h2016) donne les
  chaînes et leur gamme ; g.aq = {size, sh, log}. Prix (taille 2..5, 6-10, 11-20, 21-30, 31-40, 41+) × 100 $ + 100 $ par
  gamme ; primes 10× et 5× le prix ; égalités partagées, arrondies à la centaine supérieure. Pointage final =
  argent saisi + primes des chaînes actives + vente des actions ; enregistré comme une seule « manche ».
- Yahtzee : règles officielles (13 cases, prime de 35 à 63 en section supérieure, full 25, petite suite 30, grande
  suite 40, Yahtzee 50, prime de 100 par Yahtzee de plus si la case vaut 50, joker). g.yz = {cur, sc, yb} ; totals()
  calcule à partir de g.yz. Dés transitoires dans S.yzDice ; S.yzView = joueur affiché.
- Triomino : règles Goliath (pièce = somme des 3 chiffres, pont +40, hexagone +50 / double +60 / triple +70,
  pioche −5 par pièce au plus 3, −25 en tout si on ne peut pas jouer ; fin de manche : 25 + pièces des autres ;
  manche bloquée : chacun retire ses pièces). Partie à 400 (manche terminée, plus haut total). Variante cochable :
  bonus du triple de départ (+10, triple 0 = 40). Jeu « par tours » (isTurnGame) : g.turns, x.end marque une fin de manche.
- Train mexicain : g.opts.set (9 / 12 / 15) → set + 1 manches, du double le plus haut au double blanc ; chacun compte
  les points de ses dominos restants, celui qui a tout posé marque 0 (rd.m.w) ; le plus bas gagne. Variante cochable :
  double blanc = 50. Saisie par moitiés de dominos (mtOpen) ou total tapé.
