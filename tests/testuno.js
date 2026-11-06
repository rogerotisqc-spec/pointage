const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.src);
  const setup = async mode => { await p.evaluate(() => tab('home')); await p.click('[data-a=setup][data-t=uno]'); await p.evaluate(() => { S.sel = []; S.guests = []; render(); });
    for (const n of ['Roger','Marie','Léa']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
    await p.click(`[data-a=setUnoMode][data-v=${mode}]`); };
  // Officiel
  await setup('official'); await p.screenshot({path:T.out('uno-1.png')}); await p.click('[data-a=start]');
  await p.click('[data-a=addRound]'); await p.check('input[name=unow] >> nth=1');
  const ks = await p.$$eval('[data-uno]', e => e.map(x => x.id.slice(3)));
  await p.click(`.calc-t[data-k="${ks[0]}"]`); for (const v of [7, 20, 50]) await p.click(`[data-a=addv][data-for="in-${ks[0]}"][data-v="${v}"]`);
  await p.fill(`#in-${ks[2]}`, '33'); await p.dispatchEvent(`#in-${ks[2]}`, 'input');
  console.log('total gagnant affiché :', await p.textContent('#uno-total'));
  await p.screenshot({path:T.out('uno-2.png')});
  await p.click('[data-a=saveRound]');
  console.log('officiel totaux :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))), '| sous-titre :', await p.textContent('.top .sub'));
  await p.click('[data-a=editRound] >> nth=1'); console.log('réouverture : gagnant coché =', await p.$eval('input[name=unow]:checked', e => e.value) === ks[1], 'valeur Roger =', await p.inputValue(`#in-${ks[0]}`)); await p.click('[data-a=close]');
  await p.screenshot({path:T.out('uno-3.png')});
  await p.click('[data-a=rules]'); await p.screenshot({path:T.out('uno-4.png'), fullPage:true}); await p.click('[data-a=back]');
  // Maison
  await setup('house'); await p.click('[data-a=start]');
  await p.click('[data-a=addRound]'); const ins = await p.$$('#modal .num input'); await ins[0].fill('12'); await ins[1].fill('0'); await ins[2].fill('40'); await p.click('[data-a=saveRound]');
  console.log('maison totaux :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))), '| sous-titre :', await p.textContent('.top .sub'), '| low :', await p.evaluate(() => curGame().opts.low));
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
