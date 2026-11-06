const T = require('./_env');
const { chromium } = require('playwright');
const out = T.out('p10-');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(T.src);
  const tap = s => p.click(s); const shot = n => p.screenshot({ path: out + n + '.png' });
  await tap('[data-a=tab][data-v=players]');
  const names = ['Roger','Marie','Léa','Zoé','Antoine','Gabrielle'];
  for (const n of names) { await p.fill('#newPlayer', n); await p.keyboard.press('Enter'); }
  await tap('[data-a=tab][data-v=home]'); await tap('[data-a=setup][data-t=phase10]');
  for (const n of names) await tap(`[data-a=toggleSel] >> text=${n}`);
  await tap('[data-a=start]'); await p.waitForTimeout(300); await shot('1-start');
  const keys = await p.$$eval('.sw', e => e.map(x => x.dataset.k));
  await tap(`.sw[data-k="${keys[0]}"]`); await p.waitForTimeout(500); await shot('2-colors');
  await tap('.cpick button >> nth=2'); // jaune
  // avance
  // cercle pointillé (phase à réussir) = phase réussie ; une autre case = déplacer (avec confirmation)
  await tap(`[data-a=p10cell][data-k="${keys[0]}"][data-n="1"]`);
  await tap(`[data-a=p10cell][data-k="${keys[0]}"][data-n="2"]`);
  await tap(`[data-a=p10cell][data-k="${keys[1]}"][data-n="1"]`);
  await tap(`[data-a=p10cell][data-k="${keys[3]}"][data-n="1"]`);
  await tap(`[data-a=p10cell][data-k="${keys[3]}"][data-n="6"]`); await tap('[data-a=confirmOk]');
  await tap(`[data-a=p10cell][data-k="${keys[3]}"][data-n="7"]`);
  // points
  await tap('[data-a=addRound]'); const ins = await p.$$('#modal .num input'); for (let i=0;i<ins.length;i++) await ins[i].fill(String(i*10)); await shot('3-round');
  await tap('[data-a=saveRound]'); await p.waitForTimeout(300); await shot('4-board');
  await tap(`[data-a=p10cell][data-k="${keys[3]}"][data-n="7"]`); await p.waitForTimeout(500); await shot('5-info');   // marqueur plein
  await tap('[data-a=p10adv]');
  console.log('phases', await p.evaluate(() => JSON.stringify(curGame().ph)));
  await p.evaluate(() => window.scrollTo(0, 2000)); await p.waitForTimeout(2600); await shot('6-bottom');
  await p.emulateMedia({ colorScheme: 'dark' }); await p.evaluate(() => window.scrollTo(0, 0)); await shot('7-dark');
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
