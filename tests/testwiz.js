const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.src);
  console.log('pointage :', await p.evaluate(() => [wzScore(2,2), wzScore(0,0), wzScore(3,1), wzScore(0,2)].join(',')));
  await p.click('[data-a=setup][data-t=wizard]');
  for (const n of ['Roger','Marie','Léa','Zoé']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
  await p.check('#o-wznoeven'); await p.evaluate(() => window.scrollTo(0, 9999)); await p.screenshot({path:T.out('wz-1.png')});
  console.log('préparation :', (await p.textContent('.opts p')).trim());
  await p.click('[data-a=start]');
  console.log('sous-titre :', await p.textContent('.top .sub'), '| bouton :', await p.textContent('.fab'));
  // manche 1 (1 carte) : mises 1,0,0,0 → total 1 = cartes : interdit par la règle maison
  await p.click('[data-a=wzOpen]'); const ks = await p.evaluate(() => curGame().players.map(x => x.key));
  await p.click(`[data-a=wzStep][data-k="${ks[0]}"][data-f=bid][data-d="1"]`);
  await p.click('[data-a=wzSave]'); console.log('règle maison bloque :', await p.evaluate(() => !curGame().pend));
  await p.click(`[data-a=wzStep][data-k="${ks[1]}"][data-f=bid][data-d="1"]`); // total 2
  await p.screenshot({path:T.out('wz-2.png')});
  await p.click('[data-a=wzSave]'); console.log('mises :', await p.evaluate(() => JSON.stringify(curGame().pend.bid)), '| bouton :', await p.textContent('.fab'));
  await p.screenshot({path:T.out('wz-3.png')});
  // plis : Roger fait 1 pli (mise 1 ✓), Marie 0 (mise 1 ✗), Léa 0 ✓, Zoé 0 ✓ — par défaut plis = mises, donc ajuster Marie à 0
  await p.click('[data-a=wzOpen]'); await p.click(`[data-a=wzStep][data-k="${ks[1]}"][data-f=tricks][data-d="-1"]`);
  await p.screenshot({path:T.out('wz-4.png')});
  await p.click('[data-a=wzSave]');
  console.log('manche 1 :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))), '| sous-titre :', await p.textContent('.top .sub'));
  // manche 2 sans règle bloquante : mises 1,1,0,1 (3≠2), plis 1,1,0,0
  await p.click('[data-a=wzOpen]'); for (const i of [0,1,3]) await p.click(`[data-a=wzStep][data-k="${ks[i]}"][data-f=bid][data-d="1"]`); await p.click('[data-a=wzSave]');
  await p.click('[data-a=wzOpen]'); await p.click(`[data-a=wzStep][data-k="${ks[3]}"][data-f=tricks][data-d="-1"]`); await p.click('[data-a=wzSave]');
  console.log('manche 2 :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))));
  await p.screenshot({path:T.out('wz-5.png')});
  // modifier la manche 1
  await p.click('[data-a=editRound] >> nth=0'); await p.screenshot({path:T.out('wz-6.png')}); await p.click('[data-a=close]');
  // simuler la fin : 15 manches
  await p.evaluate(() => { const g = curGame(); while(g.rounds.length < g.opts.rounds) g.rounds.push(JSON.parse(JSON.stringify(g.rounds[0]))); save(); render(); });
  console.log('fin :', await p.textContent('.banner .grow'), '| bouton manche présent :', !!(await p.$('[data-a=wzOpen]')));
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
