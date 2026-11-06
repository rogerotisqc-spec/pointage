const T = require('./_env');
const { chromium } = require('playwright');
const out = T.out('up-');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.AndroidBridge = {
      getVersion: () => '1.8',
      checkUpdate: () => setTimeout(() => window.onUpdateInfo(JSON.stringify({version:'1.9', notes:'exemple', apk:'https://x/Pointage.apk', size:72000})), 50),
      installUpdate: () => { let k=0; const t=setInterval(()=>{ k+=25; window.onUpdateProgress(k); if(k>=100){ clearInterval(t); } }, 30); },
      keepScreenOn: () => {}
    };
  });
  await p.goto(T.src);
  await p.waitForTimeout(1800); await p.screenshot({path: out+'1-home.png'});
  await p.click('.banner'); await p.waitForTimeout(200); await p.screenshot({path: out+'2-settings.png'});
  await p.click('[data-a=installUp]'); await p.waitForTimeout(60); await p.screenshot({path: out+'3-dl.png'});
  await p.waitForTimeout(300); console.log(await p.textContent('#upTxt'));
  await p.evaluate(() => window.onUpdateError('Installation annulée.')); await p.screenshot({path: out+'4-err.png'});
  await p.evaluate(() => { window.AndroidBridge.checkUpdate = () => setTimeout(() => window.onUpdateInfo(JSON.stringify({version:'1.8', apk:'x'})), 30); });
  await p.evaluate(() => { UP = {state:'idle'}; render(); }); await p.click('[data-a=checkUp]'); await p.waitForTimeout(150);
  console.log((await p.textContent('main')).includes('dernière version'));
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
