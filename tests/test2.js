const T = require('./_env');
const { chromium } = require('playwright');
const out = T.out('v11-');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(T.src);
  const shot = n => p.screenshot({ path: out + n + '.png' }); const tap = s => p.click(s);
  await tap('[data-a=tab][data-v=players]');
  for (const n of ['Roger', 'Marie', 'Léa']) { await p.fill('#newPlayer', n); await p.keyboard.press('Enter'); }
  await tap('[data-a=tab][data-v=home]');
  // Mille Bornes
  await tap('[data-a=setup][data-t=millebornes]');
  for (const n of ['Roger','Marie','Léa']) await tap(`[data-a=toggleSel] >> text=${n}`);
  await tap('[data-a=setDealer0] >> text=Marie');
  await shot('01-setup'); await tap('[data-a=start]'); await shot('02-mb-sheet');
  await tap('[data-a=addRound]');
  const plus = f => tap(`#mb-body [data-a=mbC][data-f=${f}][data-d="1"]`);
  for (let i=0;i<4;i++) await plus('c100'); for (let i=0;i<2;i++) await plus('c200');
  for (let i=0;i<3;i++) await plus('c50'); await plus('c25'); await plus('c25'); // 400+400+150+50 = 1000
  // 400+400+200+50+75+50 -> let's just read
  await plus('b'); await plus('b'); await plus('cf');
  await shot('03-mb-roger');
  console.log('roger tab', await p.textContent('.ptab.on .v'), 'km', await p.textContent('#mb-body .sec'));
  await tap('[data-a=mbNext]'); await plus('c100'); await shot('04-mb-marie');
  await tap('[data-a=saveRound]'); await shot('05-mb-after');
  console.log('dealer', await p.textContent('.dealer'));
  // Play Nine
  await tap('[data-a=back]'); await tap('[data-a=setup][data-t=playnine]');
  for (const n of ['Roger','Marie']) await tap(`[data-a=toggleSel] >> text=${n}`);
  await tap('[data-a=start]');
  for (let h=0; h<3; h++){
    await tap('[data-a=addRound] >> nth=0');
    const k = await p.$$eval('.calc-t', e => e.map(x => x.dataset.k));
    await tap(`.calc-t[data-k="${k[0]}"]`);
    for (const v of [5,5,-5,3, 5,5,-5,7]) await tap(`[data-a=p9k][data-k="${k[0]}"][data-v="${v}"]`);
    if(h===0){ await shot('06-p9-calc'); console.log('p9', await p.inputValue(`#in-${k[0]}`), await p.textContent(`#p9e-${k[0]}`)); }
    await p.fill(`#in-${k[1]}`, String(10+h));
    await tap('[data-a=saveRound]');
  }
  await shot('07-p9-sheet');
  await tap('[data-a=dealer]'); await shot('08-dealer-pick'); await tap('[data-a=pickDealer] >> nth=0');
  console.log('dealer after pick', await p.textContent('.dealer'));
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
