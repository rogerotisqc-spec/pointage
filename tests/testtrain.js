const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs=[];
  for (const [w,h] of [[390,844],[1024,768]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:2 }); p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.build);
  await p.click('[data-a=setup][data-t=train]');
  for (const n of ['Roger','Marie','Léa']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
  await p.check('#o-mtblank'); await p.click('[data-a=start]');
  console.log(w, 'sous-titre :', await p.textContent('.top .sub'), '| bouton :', await p.textContent('.fab'));
  const ks = await p.evaluate(() => curGame().players.map(x => x.key));
  const dom = async (a, c) => { await p.click(`[data-a=mtHalf][data-v="${a}"]`); await p.click(`[data-a=mtHalf][data-v="${c}"]`); };
  // manche 1 : Roger a tout posé, Marie 12-11 + 5-0, Léa total 15
  await p.click('.fab'); await p.click(`[data-a=mtSel][data-k="${ks[0]}"]`); await p.click('#mtOut');
  console.log('après « a tout posé », sélection :', await p.evaluate(() => curGame().players.find(x => x.key === M.mt.sel).name));
  await dom(12,11); await dom(5,0);
  if (w === 390) await p.screenshot({path:T.out('mt-1.png')});
  await p.click(`[data-a=mtSel][data-k="${ks[2]}"]`); await p.fill('#mtManual', '15');
  await p.click('[data-a=mtSave]');
  // manche 2 : Marie a tout posé, Roger double blanc (50), Léa 3-4
  await p.click('.fab'); await p.click(`[data-a=mtSel][data-k="${ks[1]}"]`); await p.click('#mtOut');
  await p.click(`[data-a=mtSel][data-k="${ks[0]}"]`); await dom(0,0); await p.click(`[data-a=mtSel][data-k="${ks[2]}"]`); await dom(3,4); await p.click('[data-a=mtSave]');
  console.log('totaux :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))), '| meneur :', await p.evaluate(() => ranking(curGame())[0].p.name), '| sous-titre :', await p.textContent('.top .sub'));
  // modifier manche 1 : Léa 1-1
  await p.click('[data-a=editRound][data-i="0"] >> nth=0'); await p.click(`[data-a=mtSel][data-k="${ks[2]}"]`); await p.fill('#mtManual', ''); await dom(1,1); await p.click('[data-a=mtSave]');
  console.log('après correction :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))));
  if (w === 390) await p.screenshot({path:T.out('mt-2.png'), fullPage:true}); else await p.screenshot({path:T.out('mt-tab.png')});
  await p.evaluate(() => { const g = curGame(); while (g.rounds.length < g.opts.rounds) g.rounds.push(JSON.parse(JSON.stringify(g.rounds[1]))); save(); render(); });
  console.log('fin :', (await p.textContent('.banner .grow')).trim(), '| bouton manche :', !!(await p.$('.fab')));
  await p.close(); }
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
