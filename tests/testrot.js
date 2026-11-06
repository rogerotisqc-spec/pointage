const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w,h,mock] of [[390,844,true],[1024,768,false]]) {
    const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2 });
    if (mock) await ctx.addInitScript(() => { window.__or=[]; window.AndroidBridge = { getVersion:()=>'3.4', keepScreenOn(){}, setOrientation(v){ window.__or.push(v); } }; });
    const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
    await p.goto(T.src);
    await p.evaluate(() => { S.view='settings'; render(); });
    await p.click('[data-a=setOrient][data-v=portrait]');
    console.log(w, 'pref:', await p.evaluate(() => orientPref()), '| bouton actif:', await p.textContent('[data-a=setOrient].on'), mock ? '| pont: '+JSON.stringify(await p.evaluate(()=>__or)) : '');
    await p.reload(); if (mock) console.log('au démarrage, pont:', JSON.stringify(await p.evaluate(()=>__or)));
    await p.evaluate(() => { S.view='settings'; render(); }); await p.click('[data-a=setOrient][data-v=auto]');
    const el = await p.$('[data-a=setOrient]'); await el.scrollIntoViewIfNeeded();
    await p.screenshot({ path:T.out(`rot-${w}.png`) });
    console.log('ERRORS', JSON.stringify(errs)); await ctx.close();
  }
  await b.close();
})();
