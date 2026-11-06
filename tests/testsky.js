const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.src);
  console.log('calc :', await p.evaluate(() => [skScore([5,1,2,3, 5,4,0,-2, 5,6,7,12]).pts, skScore([5,1,2,3, 5,4,0,-2, 5,6,7,12]).gone.join(), skScore(Array(12).fill(-2)).pts].join(' | ')));
  await p.click('[data-a=setup][data-t=skyjo]');
  for (const n of ['Roger','Marie','Léa']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
  await p.click('[data-a=start]');
  // manche 1 : Roger termine avec 20, Marie 15, Léa 30 → Roger doublé à 40
  await p.click('[data-a=addRound]'); await p.check('input[name=skfin] >> nth=0');
  const k = await p.$$eval('.calc-t', e => e.map(x => x.dataset.k));
  await p.click(`.calc-t[data-k="${k[0]}"]`);
  for (const v of [5,1,2,3, 5,4,0,-2, 5,6,7,12]) await p.click(`[data-a=skk][data-k="${k[0]}"][data-v="${v}"]`);
  console.log('grille Roger :', await p.inputValue(`#in-${k[0]}`), '|', await p.textContent(`#ske-${k[0]}`));
  await p.screenshot({path:T.out('sky-1.png')});
  await p.fill(`#in-${k[0]}`, '20'); await p.fill(`#in-${k[1]}`, '15'); await p.fill(`#in-${k[2]}`, '30');
  await p.click('[data-a=saveRound]');
  console.log('manche 1 :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))));
  // manche 2 : Marie termine avec 3, plus bas strict → pas doublé
  await p.click('[data-a=addRound]'); await p.check('input[name=skfin] >> nth=1');
  const ins = await p.$$('#modal .num input'); await ins[0].fill('10'); await ins[1].fill('3'); await ins[2].fill('8'); await p.click('[data-a=saveRound]');
  // manche 3 : Léa termine avec -4 (négatif, jamais doublé) même si pas plus bas
  await p.click('[data-a=addRound]'); await p.check('input[name=skfin] >> nth=2');
  const in3 = await p.$$('#modal .num input'); await in3[0].fill('-6'); await in3[1].fill('2'); await in3[2].fill('-4'); await p.click('[data-a=saveRound]');
  console.log('totaux :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))));
  await p.click('[data-a=editRound] >> nth=0'); console.log('réouverture : valeur brute Roger =', await p.inputValue('#modal .num input >> nth=0'), '| terminé coché :', await p.$eval('input[name=skfin]:checked', e => e.value) === k[0]); await p.click('[data-a=close]');
  await p.screenshot({path:T.out('sky-2.png')});
  await p.click('[data-a=rules]'); await p.screenshot({path:T.out('sky-3.png'), fullPage:true});
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
