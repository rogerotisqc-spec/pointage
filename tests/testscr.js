const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.src);
  console.log('calc :', await p.evaluate(() => [
    scrWordScore(scrLetters('maison'), [], 1),          // 2+1+1+1+1+1 = 7
    scrWordScore(scrLetters('quartz'), [0,0,0,0,0,2], 2), // (8+1+1+1+1+30)*2 = 84
    scrWordScore(scrLetters('été'), [3], 1)               // joker é: 0+1+1 = 2
  ].join(',')));
  await p.click('[data-a=setup][data-t=scrabble]');
  for (const n of ['Roger','Marie']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
  await p.click('[data-a=start]');
  await p.fill('#scrWord', 'quartz'); await p.waitForTimeout(450);
  await p.click('[data-a=scrMark][data-i="5"]'); await p.click('[data-a=scrMark][data-i="5"]'); // Z L×3
  await p.click('[data-a=scrMult][data-v="2"]');
  await p.screenshot({path:T.out('scr-1.png')});
  await p.click('[data-a=scrAddWord]');
  await p.fill('#scrWord', 'as'); await p.waitForTimeout(450); await p.click('[data-a=scrAddWord]');
  await p.check('#scrBingo'); await p.waitForTimeout(100);
  console.log('total du tour :', await p.textContent('.turnpts'));
  await p.screenshot({path:T.out('scr-2.png')});
  await p.click('[data-a=scrDone]');
  await p.fill('#scrWord', 'maison'); await p.waitForTimeout(450); await p.click('[data-a=scrAddWord]'); await p.click('[data-a=scrDone]');
  console.log('totaux :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))), 'joueur courant :', await p.evaluate(() => curGame().cur));
  await p.click('[data-a=undo]'); console.log('après ↶ :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))));
  await p.click('[data-a=redo]');
  await p.click('[data-a=scrEnd]'); const ins = await p.$$('[data-scrleft]'); await ins[1].fill('qe'); await p.waitForTimeout(100);
  await p.screenshot({path:T.out('scr-3.png')});
  await p.click('[data-a=scrEndOk]'); await p.waitForTimeout(200);
  console.log('final :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))), await p.evaluate(() => S.view));
  await p.screenshot({path:T.out('scr-4.png'), fullPage:true});
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
