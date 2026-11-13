// Retour haptique : vibration à chaque dé touché (Farkle, Yahtzee, Triomino), réglage pour la couper
const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844} });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.VIB = []; window.AndroidBridge = { getVersion: () => '6.12', keepScreenOn(){}, setOrientation(){}, vibrate: s => VIB.push(s) }; });
  await p.goto(T.src);
  const start = async (type) => { await p.evaluate(() => tab('home')); await p.click(`[data-a=setup][data-t=${type}]`);
    for (const n of ['Roger', 'Marie']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); } await p.click('[data-a=start]'); };
  await start('farkle');
  for (const v of [5, 5, 5, 5, 5, 1]) await p.click(`.dice [data-a=fkDie][data-v="${v}"]`);
  await p.click('.dice [data-a=fkDie][data-v="2"]');   // 7e dé : refusé, vibration double
  console.log('Farkle :', JSON.stringify(await p.evaluate(() => VIB)), '| dés :', await p.evaluate(() => S.dice.join('')));
  await p.evaluate(() => { VIB.length = 0; });
  await start('triomino'); await p.click('[data-a=trNum][data-v="5"]');
  await start('yahtzee'); const yz = await p.$('[data-a=yzDie]'); if (yz) await yz.click();
  console.log('Triomino + Yahtzee :', JSON.stringify(await p.evaluate(() => VIB)));
  await p.evaluate(() => go('settings'));
  console.log('réglage :', await p.getAttribute('[data-a=hapticToggle]', 'class'));
  await p.click('[data-a=hapticToggle]'); await p.evaluate(() => { VIB.length = 0; });
  await start('farkle'); await p.click('.dice [data-a=fkDie][data-v="5"]');
  console.log('coupée : vibrations =', await p.evaluate(() => VIB.length), '| dé quand même ajouté :', await p.evaluate(() => S.dice.length === 1));
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
