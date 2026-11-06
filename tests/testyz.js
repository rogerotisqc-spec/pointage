const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs=[];
  for (const [w,h] of [[390,844],[1024,768]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:2 }); p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.build);
  await p.click('[data-a=setup][data-t=yahtzee]');
  for (const n of ['Roger','Marie','Léa']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
  await p.click('[data-a=start]');
  const faces = async arr => { for (const v of arr) await p.click(`[data-a=yzFace][data-v="${v}"]`); };
  await faces([3,3,3,5,5]);
  const pot = async c => (await p.textContent(`[data-a=yzCat][data-c=${c}] .yzv`)).trim();
  console.log(w, 'possibles :', 'full', await pot('full'), '| brelan', await pot('brelan'), '| Trois', await pot('u3'), '| Cinq', await pot('u5'), '| ps', await pot('ps'), '| chance', await pot('chance'));
  if (w === 390) await p.screenshot({path:T.out('yz-1.png'), fullPage:true});
  await p.click('[data-a=yzCat][data-c=full]');
  console.log('tour suivant :', await p.evaluate(() => curGame().players[curGame().yz.cur].name), '| vue :', await p.textContent('.yzchip.on .yzn'));
  await faces([1,2,3,4,6]); console.log('Marie ps :', await pot('ps'), '| gs :', await pot('gs'));
  await p.click('[data-a=yzCat][data-c=gs]'); await p.click('[data-a=confirmOk]');
  console.log('Marie gs :', await p.evaluate(() => { const g = curGame(); return g.yz.sc[g.players[1].key].gs; }));
  // Léa : case directe sans dés → popup
  await p.click('[data-a=yzCat][data-c=u6]'); await p.click('[data-a=yzSet][data-v="18"]');
  // Roger : Yahtzee 5 puis un 2e Yahtzee → joker + prime
  await faces([5,5,5,5,5]); await p.click('[data-a=yzCat][data-c=yz]');
  await p.click('[data-a=yzCat][data-c=chance]'); await p.fill('#yzval', '22'); await p.keyboard.press('Enter');
  await p.click('[data-a=yzCat][data-c=u1]'); await p.click('[data-a=yzSet][data-v="3"]');
  await faces([4,4,4,4,4]); console.log('Roger joker gs :', await pot('gs'), '| ps', await pot('ps'));
  await p.click('[data-a=yzCat][data-c=gs]');
  console.log('Roger :', await p.evaluate(() => { const g = curGame(); return JSON.stringify(yzParts(g, g.players[0].key)); }));
  // prime section supérieure
  await p.evaluate(() => { const g = curGame(), k = g.players[2].key; Object.assign(g.yz.sc[k], {u1:3,u2:6,u3:9,u4:12,u5:15,u6:18}); save(); render(); });
  console.log('Léa :', await p.evaluate(() => { const g = curGame(); return JSON.stringify(yzParts(g, g.players[2].key)); }), '| classement :', await p.evaluate(() => ranking(curGame()).map(x => x.p.name + ' ' + x.total).join(', ')));
  await p.click('[data-a=yzView][data-k]:nth-child(1)');
  if (w === 390) { await p.screenshot({path:T.out('yz-2.png')}); await p.evaluate(() => window.scrollTo(0, 600)); await p.screenshot({path:T.out('yz-3.png')}); }
  else await p.screenshot({path:T.out('yz-tab.png')});
  await p.click('[data-a=yzSheet]'); await p.waitForTimeout(400); if (w === 390) await p.screenshot({path:T.out('yz-4.png')}); await p.click('#modal [data-a=close]');
  // fin : tout remplir
  await p.evaluate(() => { const g = curGame(); g.players.forEach(pl => YZ_ALL.forEach(c => { if(g.yz.sc[pl.key][c.id] == null) g.yz.sc[pl.key][c.id] = 0; })); save(); render(); });
  console.log('fin :', !!(await p.$('.banner [data-a=finish]')), '| total Léa', await p.evaluate(() => totals(curGame())[curGame().players[2].key]));
  await p.close(); }
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
