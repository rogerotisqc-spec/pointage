const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs=[];
  for (const [w,h] of [[390,844],[1024,768]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:2 }); p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.build);
  await p.click('[data-a=setup][data-t=acquire]');
  console.log('éditions :', await p.$$eval('[data-a=setAqEd]', e => e.map(x => x.textContent).join(' | ')));
  for (const n of ['Roger','Marie','Léa']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
  if (w === 390) await p.screenshot({path:T.out('aq-0.png'), fullPage:true});
  await p.click('[data-a=start]');
  const ks = await p.evaluate(() => curGame().players.map(x => x.key));
  // fonder Luxor (Roger fondateur), American (Marie), Continental (Léa)
  const found = async (id, who) => { await p.click(`[data-a=aqSize][data-c=${id}][data-d="1"]`); await p.click(`[data-a=aqFound][data-k="${ks[who]}"]`); };
  await found('luxor', 0); await found('american', 1); await found('continental', 2);
  console.log('fondation → actions :', await p.evaluate(() => JSON.stringify(curGame().aq.sh)));
  await p.evaluate(() => { const st = curGame().aq; st.size.luxor = 5; st.size.american = 7; st.size.continental = 3; save(); render(); });
  // actions : Luxor R4 M4 L1 ; American R3 M2 L2 ; Continental L3
  const setH = async (who, id, n) => { await p.click(`.aqpl[data-k="${ks[who]}"]`); const cur = await p.evaluate(([id, k]) => aqHeld(curGame(), id, k), [id, ks[who]]); for (let i = cur; i < n; i++) await p.click(`[data-a=aqHoldStep][data-c=${id}][data-d="1"]`); await p.click('#modal [data-a=close] >> nth=-1'); };
  await setH(0,'luxor',4); await setH(1,'luxor',4); await setH(2,'luxor',1); await setH(0,'american',3); await setH(1,'american',2); await setH(2,'american',2); await setH(2,'continental',3);
  console.log('Luxor primes :', await p.evaluate(() => JSON.stringify(aqBonuses(curGame(), 'luxor'))));
  if (w === 390) await p.screenshot({path:T.out('aq-1.png'), fullPage:true});
  // fusion Luxor → American
  await p.click('[data-a=aqMerge]');
  await p.click('[data-a=aqPick][data-f=surv][data-c=american]'); await p.click('[data-a=aqPick][data-f=def][data-c=luxor]');
  await p.click(`[data-a=aqDeal][data-k="${ks[0]}"][data-f=sell][data-d="1"]`); await p.click(`[data-a=aqDeal][data-k="${ks[0]}"][data-f=sell][data-d="1"]`);
  await p.click(`[data-a=aqDeal][data-k="${ks[0]}"][data-f=trade][data-d="2"]`);
  await p.click(`[data-a=aqDeal][data-k="${ks[2]}"][data-f=sell][data-d="1"]`);
  if (w === 390) await p.screenshot({path:T.out('aq-2.png'), fullPage:true});
  await p.click('[data-a=aqMergeApply]');
  console.log('après fusion :', await p.evaluate(() => { const st = curGame().aq; return JSON.stringify({size: st.size, luxor: st.sh.luxor, american: st.sh.american, pay: st.log[0].pay}); }));
  await p.click('[data-a=aqChart]'); if (w === 390) await p.screenshot({path:T.out('aq-3.png')}); await p.click('#modal [data-a=close]');
  // pointage final
  await p.click('.fab[data-a=aqFinal]');
  await p.fill(`[data-aqcash="${ks[0]}"]`, '5000'); await p.fill(`[data-aqcash="${ks[1]}"]`, '9000'); await p.fill(`[data-aqcash="${ks[2]}"]`, '4000');
  if (w === 390) await p.screenshot({path:T.out('aq-4.png'), fullPage:true});
  await p.click('[data-a=aqFinalSave]');
  console.log('vue :', await p.evaluate(() => S.view), '| totaux :', await p.evaluate(() => JSON.stringify(totals(curGame()))), '| gagnant :', await p.evaluate(() => ranking(curGame()).filter(x=>x.rank===1).map(x=>x.p.name).join()));
  await p.evaluate(() => back()); if (w === 390) await p.screenshot({path:T.out('aq-5.png'), fullPage:true}); else await p.screenshot({path:T.out('aq-tab.png'), fullPage:true});
  await p.close(); }
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
