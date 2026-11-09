// Mise à jour : lien du compteur (relais) en panne → l'app réessaie seule avec le lien direct de GitHub (apk2)
const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844} });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.URLS = [];
    window.AndroidBridge = {
      getVersion: () => '6.9',
      checkUpdate: () => setTimeout(() => window.onUpdateInfo(JSON.stringify({version:'6.10', notes:'n', apk:'https://pointage-ia.rogerotisqc.workers.dev/apk?v=6.10&k=maj', apk2:'https://raw.githubusercontent.com/x/Pointage-6.10.apk', size:9})), 30),
      installUpdate: u => { URLS.push(u); setTimeout(() => URLS.length === 1 ? window.onUpdateError('Téléchargement impossible (code 502).') : window.onUpdateProgress(100), 40); },
      keepScreenOn: () => {}
    };
  });
  await p.goto(T.src); await p.waitForTimeout(1500);
  await p.evaluate(() => go('settings')); await p.click('[data-a=installUp]'); await p.waitForTimeout(400);
  console.log('liens essayés :', JSON.stringify(await p.evaluate(() => URLS.map(u => u.split('/')[2]))), '| état :', await p.evaluate(() => UP.state + ' ' + UP.pct));
  console.log('numéro ajouté au lien du relais seulement :', await p.evaluate(() => /&id=[A-Za-z0-9]{9}$/.test(URLS[0]) && !/id=/.test(URLS[1])), '| même numéro ensuite :', await p.evaluate(() => apkUrl('https://pointage-ia.rogerotisqc.workers.dev/apk?v=1&k=maj') === URLS[0].replace('v=6.10', 'v=1')));
  // Les deux liens échouent → message d'erreur normal
  await p.evaluate(() => { URLS.length = 0; window.AndroidBridge.installUpdate = u => { URLS.push(u); setTimeout(() => window.onUpdateError('Pas de connexion'), 20); }; UP.url = UP.url.replace(/.*/, 'https://pointage-ia.rogerotisqc.workers.dev/apk?v=6.10&k=maj'); UP.state = 'error'; render(); });
  await p.click('[data-a=installUp]'); await p.waitForTimeout(300);
  console.log('deux échecs : essais =', await p.evaluate(() => URLS.length), '| erreur affichée :', await p.evaluate(() => UP.state === 'error'));
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
