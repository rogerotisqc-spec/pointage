const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 }); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  p.on('requestfailed', r => errs.push('échec ' + r.url()));
  await p.goto('http://localhost:8766/manuel/'); await p.waitForTimeout(400);
  await p.screenshot({path:T.out('man-1.png')});
  for (const q of ['brasser', 'joker', 'sauvegarde nouveau téléphone', 'penalite', 'xyzzz']) {
    await p.fill('#q', q); await p.waitForTimeout(300);
    console.log(q, '→', (await p.textContent('#results h2')).trim(), '|', (await p.$$eval('#results li a', a => a.slice(0,4).map(x => x.textContent))).join(' / '), '| marques:', await p.$$eval('main mark', m => m.length));
  }
  await p.fill('#q', 'joker'); await p.waitForTimeout(300); await p.screenshot({path:T.out('man-2.png')});
  await p.click('#results li a >> nth=0'); await p.waitForTimeout(300); await p.screenshot({path:T.out('man-3.png')});
  await p.click('#qx'); await p.click('#tocbtn'); await p.waitForTimeout(300); await p.screenshot({path:T.out('man-4.png')});
  const imgs = await p.$$eval('img', a => a.length);
  await p.evaluate(async () => { for (const i of document.querySelectorAll('img')) { i.loading = 'eager'; } });
  await p.waitForTimeout(800); const broken = await p.$$eval('img', a => a.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src));
  console.log('images', imgs, 'cassées', broken);
  const d = await b.newPage({ viewport:{width:1280,height:900} }); await d.goto('http://localhost:8766/manuel/#q=scrabble'); await d.waitForTimeout(400); await d.screenshot({path:T.out('man-5.png')});
  await d.goto('http://localhost:8766/manuel/'); await d.click('nav a[href="#phase10"]'); await d.waitForTimeout(500); await d.screenshot({path:T.out('man-6.png')});
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
