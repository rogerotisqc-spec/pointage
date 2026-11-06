const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs=[];
  for (const [w,h] of [[390,844],[1024,768]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:2 }); p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.build);
  await p.click('[data-a=setup][data-t=triomino]');
  for (const n of ['Roger','Marie','Léa']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
  await p.check('#o-trstart'); console.log(w, 'préparation :', (await p.textContent('#o-trstart >> xpath=../following-sibling::p')).trim());
  await p.click('[data-a=start]');
  const tile = async a => { for (const v of a) await p.click(`[data-a=trNum][data-v="${v}"]`); };
  const pts = async () => (await p.textContent('.trpts')).trim();
  await tile([5,5,5]); console.log('triple de départ :', await pts()); if (w === 390) await p.screenshot({path:T.out('tr-1.png')}); await p.click('[data-a=trSave]');
  await tile([1,2,3]); await p.click('[data-a=trHex][data-v="1"]'); console.log('hexagone :', await pts()); await p.click('[data-a=trSave]');
  await p.click('[data-a=trDraw][data-d="1"]'); await p.click('[data-a=trDraw][data-d="1"]'); await tile([0,1,4]); console.log('pioche 2 + pièce :', await pts()); await p.click('[data-a=trSave]');
  for (let i = 0; i < 3; i++) await p.click('[data-a=trDraw][data-d="1"]'); await p.check('#trFail'); console.log('échec :', await pts()); await p.click('[data-a=trSave]');
  await tile([2,3,4]); await p.check('#trBridge'); console.log('pont :', await pts()); await p.click('[data-a=trSave]');
  // fin de manche : Léa termine
  await p.click('[data-a=trEnd]'); const ks = await p.evaluate(() => curGame().players.map(x => x.key));
  await p.click(`[data-a=trWho][data-k="${ks[2]}"]`); await p.fill(`[data-trrack="${ks[0]}"]`, '12'); await p.fill(`[data-trrack="${ks[1]}"]`, '7');
  console.log('fin de manche affiche :', await p.textContent('#trEndTot')); if (w === 390) await p.screenshot({path:T.out('tr-2.png')});
  await p.click('[data-a=trEndSave]');
  console.log('totaux :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))), '| tour de :', await p.evaluate(() => curGame().players[curGame().cur].name));
  await tile([0,0,0]); console.log('triple 0 (manche 2) :', await pts()); await p.click('[data-a=trSave]');
  await p.click('[data-a=trEnd]'); await p.click('[data-a=trWho][data-k=""]'); await p.fill(`[data-trrack="${ks[0]}"]`, '5'); await p.fill(`[data-trrack="${ks[1]}"]`, '3'); await p.click('[data-a=trEndSave]');
  console.log('après manche bloquée :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))));
  await p.click('[data-a=trUndo]'); console.log('annuler :', await p.evaluate(() => curGame().turns.length));
  await p.evaluate(() => { const g = curGame(); g.turns.push({pk: g.players[1].key, pts: 400, note: 'test', t: Date.now()}); save(); render(); });
  console.log('400 :', (await p.textContent('.banner .grow')).trim());
  if (w === 390) await p.screenshot({path:T.out('tr-3.png'), fullPage:true}); else await p.screenshot({path:T.out('tr-tab.png')});
  await p.close(); }
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
