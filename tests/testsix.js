const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto(T.src);
  const tap = s => p.click(s);
  await tap('[data-a=setup][data-t=farkle]');
  for (const n of ['A','B']) { await p.fill('#guestName', n); await tap('[data-a=addGuest]'); }
  await tap('[data-a=start]');
  await p.fill('#fk-man','2000'); await tap('[data-a=fkAddMan]'); await tap('[data-a=fkBank]'); // A 2000
  for (let i=0;i<6;i++) await tap('[data-a=fkDie][data-v="3"]');
  await p.screenshot({path:T.out('six-a.png')});
  await tap('[data-a=fkAddSel]'); await p.waitForTimeout(400);
  await p.screenshot({path:T.out('six-b.png')});
  console.log(await p.evaluate(() => { const g = curGame(); return JSON.stringify({finished:g.finished, rank: ranking(g).map(x=>x.p.name+':'+x.rank)}); }));
  // stats
  await tap('[data-a=tab][data-v=home]'); await tap('[data-a=tab][data-v=stats]'); console.log((await p.textContent('.statt')).replace(/\s+/g,' '));
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
