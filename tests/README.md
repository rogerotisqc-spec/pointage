# Tests automatiques

`tests/run.sh` lance tous les tests (ou `tests/run.sh testwiz testlive` pour quelques-uns).

Il faut Node 18+, Python 3 et Playwright (`npm i playwright@1.63.0` puis `npx playwright install chromium`).
Le script prépare une copie de l'app branchée sur un relais simulé (`mockrelay.js`, port 8788 : Ludo, voix,
partie en direct, synchronisation) et le site construit (port 8766, pour le manuel). Les copies d'écran des
tests vont dans `tests/.work/out/` (ignoré par git).

Les tests vérifient chaque jeu, Ludo, la voix, la partie en direct (suivi, saisie par joueur, tours joués à
distance), la synchronisation des appareils et le manuel, au format téléphone et tablette, sans erreur JavaScript.
GitHub les relance à chaque envoi sur `main` (`.github/workflows/tests.yml`).
