// Chemins communs des tests (tout ce qui est produit va dans tests/.work, ignoré par git)
const path = require('path'), fs = require('fs');
const W = path.join(__dirname, '.work'), OUT = path.join(W, 'out');
fs.mkdirSync(OUT, { recursive: true });
module.exports = {
  app: 'file://' + path.join(W, 'app.html'),          // app avec le relais simulé (localhost:8788)
  build: 'file://' + path.join(W, 'offline.html'),    // app sans relais joignable : l'assistant hors ligne répond
  src: 'file://' + path.resolve(__dirname, '../app/src/main/assets/index.html'),
  log: path.join(W, 'mockai.log'),
  dir: OUT,
  out: f => path.join(OUT, f)
};
