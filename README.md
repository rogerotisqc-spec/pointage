# Pointage

Feuilles de pointage pour les jeux de société de la famille : Play Nine, Flip 7, Uno, Skip-Bo,
Mille Bornes, Phase 10, jeu de dés (10 000) et pointage libre.

## Installer l'app (Android)

Téléchargez la dernière version sur le téléphone :
**https://github.com/rogerotisqc-spec/pointage/releases/latest/download/Pointage.apk**

Ouvrez le fichier, puis autorisez l'installation d'applications inconnues si Android le demande.

## Mises à jour

Dans l'app : ⚙︎ Réglages → **Vérifier les mises à jour**. L'app vérifie aussi d'elle-même une fois par jour
et affiche un bandeau sur l'accueil quand une nouvelle version est publiée. Les parties et les joueurs sont conservés.

## Pour les développeurs

- `app/src/main/assets/index.html` : toute l'interface (HTML/JS), partagée avec la version web (`tools/make_web.py`).
- `app/src/main/java/.../MainActivity.java` : l'enveloppe Android (WebView, sauvegarde, mise à jour).
- `build.sh` : compilation sans Gradle (aapt2, javac, dx, signature apksig).
- `tools/publish.sh` : publication d'une nouvelle version sur GitHub.

La clé de signature n'est pas dans ce dépôt.
