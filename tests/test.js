const T = require('./_env');
const { chromium } = require('playwright');
const out = T.out('');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(T.src);
  const shot = n => p.screenshot({ path: out + n + '.png' });
  const tap = sel => p.click(sel);
  await shot('01-home');
  // joueurs
  await tap('[data-a=tab][data-v=players]');
  for (const n of ['Roger', 'Marie', 'Léa', 'Zoé']) { await p.fill('#newPlayer', n); await p.keyboard.press('Enter'); }
  await shot('02-players');
  // partie libre
  await tap('[data-a=tab][data-v=home]');
  await tap('[data-a=setup][data-t=generic]');
  await tap('[data-a=toggleSel] >> text=Roger'); await tap('[data-a=toggleSel] >> text=Marie');
  await p.fill('#guestName', 'Oncle Paul'); await tap('[data-a=addGuest]');
  await p.fill('#o-title', 'Rummikub'); await p.fill('#o-target', '100');
  await shot('03-setup');
  await tap('[data-a=start]');
  for (const r of [[10, 20, -5], [50, 30, 110]]) {
    await tap('[data-a=addRound]');
    const ins = await p.$$('#modal .num input');
    for (let i = 0; i < ins.length; i++) await ins[i].fill(String(r[i]));
    await tap('[data-a=saveRound]');
  }
  await shot('04-sheet');
  await tap('[data-a=finish]'); await shot('05-results');
  await tap('[data-a=saveGuest]');
  await tap('[data-a=tab][data-v=home]'); await tap('[data-a=setup][data-t=generic]');
  // Flip 7 helper
  await tap('[data-a=back]'); await tap('[data-a=setup][data-t=flip7]');
  await tap('[data-a=toggleSel] >> text=Roger'); await tap('[data-a=toggleSel] >> text=Léa'); await tap('[data-a=start]');
  await tap('[data-a=addRound]');
  const fk = await p.$$eval('.calc-t', e => e.map(x => x.dataset.k));
  await tap(`.calc-t[data-k="${fk[0]}"]`);
  for (const v of [3, 7, 12]) await tap(`[data-a=f7][data-k="${fk[0]}"][data-op=n][data-v="${v}"]`);
  await tap(`[data-a=f7][data-k="${fk[0]}"][data-op=x2]`); await tap(`[data-a=f7][data-k="${fk[0]}"][data-op=m][data-v="4"]`);
  await shot('08-f7-modal');
  console.log('f7 value', await p.inputValue(`#in-${fk[0]}`));
  await tap('[data-a=saveRound]');
  // Farkle
  await tap('[data-a=back]'); await tap('[data-a=setup][data-t=farkle]');
  await tap('[data-a=toggleSel] >> text=Roger'); await tap('[data-a=toggleSel] >> text=Marie'); await tap('[data-a=start]');
  for (const v of [1, 1, 1, 5]) await tap(`[data-a=fkDie][data-v="${v}"]`);
  await shot('09-farkle-sel');
  await tap('[data-a=fkAddSel]'); await tap('[data-a=fkBank]');
  for (const v of [5]) await tap(`[data-a=fkDie][data-v="${v}"]`); await tap('[data-a=fkAddSel]'); await tap('[data-a=fkBank]');
  await shot('10-farkle');
  // dice unit tests
  console.log(await p.evaluate(() => { const f = FD; const t = a => { const c = [0,0,0,0,0,0,0]; a.forEach(d => c[d]++); return diceScore(c, f).pts; };
    return [t([1,1,1,1]), t([1,2,3,4,5,6]), t([2,2,3,3,4,4]), t([5,5,5]), t([1,1,1,1,1]), t([2,2,2,2]), t([1,5])].join(','); }));
  // Phase 10 + skipbo + rules + stats
  await tap('[data-a=back]'); await tap('[data-a=setup][data-t=skipbo]');
  await tap('[data-a=toggleSel] >> text=Roger'); await tap('[data-a=toggleSel] >> text=Marie'); await tap('[data-a=toggleSel] >> text=Léa'); await tap('[data-a=start]');
  await tap('[data-a=addRound]'); await p.check('input[name=sbw] >> nth=0');
  const sbs = await p.$$('[data-sb]'); await sbs[1].fill('4'); await sbs[2].fill('7');
  await shot('11-skipbo'); console.log('sb', await p.textContent('#sb-total'));
  await tap('[data-a=saveRound]');
  await tap('[data-a=rules]'); await p.fill('#house', 'On joue avec 20 cartes.'); await shot('12-rules');
  await tap('[data-a=back]'); await tap('[data-a=menu]'); await tap('[data-a=finish]'); await tap('[data-a=tab][data-v=home]'); await tap('[data-a=tab][data-v=stats]'); await shot('13-stats');
  await tap('[data-a=tab][data-v=home]'); await tap('[data-a=setup][data-t=phase10]');
  await tap('[data-a=toggleSel] >> text=Roger'); await tap('[data-a=toggleSel] >> text=Marie'); await tap('[data-a=start]');
  await tap('[data-a=addRound]'); await tap('.calc-t >> nth=0'); await shot('14-p10');
  await tap('[data-a=close]'); await tap('[data-a=back]'); await shot('15-home');
  await p.emulateMedia({ colorScheme: 'dark' }); await shot('16-dark');
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
