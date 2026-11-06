const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844} });
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto(T.src);
  const tap = s => p.click(s);
  await tap('[data-a=setup][data-t=farkle]');
  for (const n of ['A','B']) { await p.fill('#guestName', n); await tap('[data-a=addGuest]'); }
  await tap('[data-a=start]');
  const man = async v => { await p.fill('#fk-man', String(v)); await tap('[data-a=fkAddMan]'); };
  const tot = () => p.evaluate(() => Object.values(totals(curGame())).join('/'));
  await man(21000); await tap('[data-a=fkBank]'); await man(21000); await tap('[data-a=fkBank]'); // A,B 21000
  await man(300); await tap('[data-a=fkFarkle]'); console.log('A raté après 300 :', await tot());   // 21000 attendu
  await tap('[data-a=fkFarkle]'); console.log('B raté à zéro :', await tot());                     // 20000 attendu
  await tap('[data-a=fkDie][data-v="1"]'); await tap('[data-a=fkFarkle]'); console.log('A raté avec un 1 sélectionné :', await tot()); // 21000
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
