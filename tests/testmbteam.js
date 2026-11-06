const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.src);
  const setup = async (names, nt) => { await p.evaluate(() => tab('home')); await p.click('[data-a=setup][data-t=millebornes]'); await p.evaluate(() => { S.sel = []; S.guests = []; render(); });
    for (const n of names) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
    await p.click('[data-a=setTeams][data-v="1"]'); if (nt === 3) await p.click('[data-a=setNTeams][data-v="3"]'); };
  // 4 joueurs, 2 équipes : équipe A fait 1000 km avec capot
  await setup(['Roger','Léa','Marie','Zoé'], 2);
  console.log('composition :', await p.textContent('.opts .hint:last-of-type'));
  await p.click('[data-a=start]');
  await p.click('[data-a=addRound]');
  const plus = f => p.click(`#mb-body [data-a=mbC][data-f=${f}][data-d="1"]`);
  for (let i=0;i<4;i++) await plus('c100'); for (let i=0;i<2;i++) await plus('c200'); for (let i=0;i<4;i++) await plus('c50');
  console.log('onglets :', (await p.$$eval('.ptab .n', e => e.map(x => x.textContent.trim()))).join(' | '), '| total A :', await p.textContent('.mbtot b'));
  await p.screenshot({path:T.out('mbt-1.png')});
  await p.click('[data-a=saveRound]');
  console.log('totaux 2 équipes :', await p.evaluate(() => JSON.stringify(totals(curGame()))), '| brasseur suivant :', await p.textContent('.dealer b'));
  await p.click('[data-a=menu]'); await p.click('[data-a=finish]'); await p.waitForTimeout(150);
  console.log('résultat :', (await p.textContent('.card h2')).trim(), '|', (await p.textContent('.card .hint:last-child')).trim());
  // 6 joueurs, 3 équipes
  await setup(['Roger','Léa','Marie','Zoé','Paul','Anne'], 3);
  console.log('composition 3 :', await p.textContent('.opts .hint:last-of-type'));
  await p.click('[data-a=start]'); await p.click('[data-a=addRound]'); await plus('c100'); await p.click('[data-a=mbNext]'); await plus('c75');
  await p.click('[data-a=saveRound]');
  console.log('totaux 3 équipes :', await p.evaluate(() => JSON.stringify(totals(curGame()))));
  await p.evaluate(() => tab('stats'));
  console.log('stats :', await p.$$eval('.statt tbody tr', r => r.map(x => x.querySelector('b').textContent + ' ' + x.children[2].querySelector('b').textContent + 'v').join(' | ')));
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
