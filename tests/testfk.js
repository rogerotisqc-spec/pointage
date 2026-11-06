const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto(T.src);
  const tap = s => p.click(s);
  await tap('[data-a=setup][data-t=farkle]');
  for (const n of ['A','B']) { await p.fill('#guestName', n); await tap('[data-a=addGuest]'); }
  await tap('summary'); await p.fill('#f-target','3000'); await tap('[data-a=start]');
  const man = async v => { await p.fill('#fk-man', String(v)); await tap('[data-a=fkAddMan]'); };
  const st = () => p.evaluate(() => { const g = curGame(); return JSON.stringify({tot: totals(g), cur: g.cur, turn: S.turn}); });
  await man(2500); await tap('[data-a=fkBank]');            // A 2500
  await man(1000); await tap('[data-a=fkBank]');            // B 1000
  await man(300); await man(300); console.log('A depasse ->', await st()); // 2500+600 > 3000 => bust, B's turn
  await man(500); await tap('[data-a=fkBank]');             // B 1500
  await man(500); console.log('A exact, avant encaisser', await st(), await p.textContent('.turnbox'));
  await tap('[data-a=fkBank]');
  await p.screenshot({path:T.out('fk.png')});
  console.log('fin', await st(), await p.textContent('.banner'));
  // penalité toujours active : partie 25000 zone
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
