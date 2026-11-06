const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs=[];
  const out = [];
  for (const w of [360, 390, 1024]) {
    const p = await b.newPage({ viewport:{width:w,height:260}, deviceScaleFactor:2 }); p.on('pageerror', e=>errs.push(e.message));
    await p.goto(T.src);
    for (const t of ['millebornes','wizard','farkle','scrabble','generic','phase10']) {
      await p.evaluate(() => tab('home')); await p.click(`[data-a=setup][data-t=${t}]`);
      if (w === 360 && t === 'millebornes') await p.screenshot({path:T.out('btn-setup.png')});
      for (const n of ['Roger','Marie','Léa']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
      await p.click('[data-a=start]');
      const f = T.out(`btn-${w}-${t}.png`); await p.screenshot({path:f}); out.push(f);
      await p.click('.top [data-a=ask]');
      const chip = await p.$('[data-a=askNoGame]'); console.log(w, t, '→', chip ? (await chip.textContent()).trim() : 'sans contexte');
    }
    await p.close();
  }
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
