const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message)); const calls=[];
  await p.addInitScript(() => { window.__keep = []; window.AndroidBridge = { getVersion: () => '2.6', keepScreenOn(k){ window.__keep.push(k); } }; });
  await p.goto(T.src);
  console.log('écran (accueil) :', await p.evaluate(() => window.__keep.slice(-1)[0]));
  await p.click('[data-a=setup][data-t=scrabble]');
  for (const n of ['Roger','Marie']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
  await p.click('[data-a=setScrMode][data-v="1"]'); await p.screenshot({path:T.out('scrs-1.png')});
  await p.click('[data-a=start]');
  await p.fill('#scrPts', '24'); await p.keyboard.press('Enter');
  await p.fill('#scrPts', '18'); await p.check('#scrBingoS'); await p.click('[data-a=scrSimple]');
  await p.click('[data-a=scrPass]');
  console.log('totaux :', await p.evaluate(() => JSON.stringify(Object.values(totals(curGame())))), 'simple :', await p.evaluate(() => curGame().opts.simple));
  await p.screenshot({path:T.out('scrs-2.png')});
  await p.click('[data-a=back]'); await p.click('[data-a=go][data-v=settings]'); await p.click('[data-a=screenToggle]');
  console.log('écran après désactivation :', await p.evaluate(() => window.__keep.slice(-1)[0]));
  await p.screenshot({path:T.out('scrs-3.png'), fullPage:true});
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
