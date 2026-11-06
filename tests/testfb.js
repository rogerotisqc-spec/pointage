const T = require('./_env');
const { chromium } = require('playwright');
const S=T.dir;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  let online = false, posted = [];
  await p.route('https://api.github.com/**', async r => {
    if(!online) return r.abort();
    posted.push({auth: r.request().headers()['authorization'], body: JSON.parse(r.request().postData())});
    r.fulfill({status:201, contentType:'application/json', body: JSON.stringify({number: 41 + posted.length})});
  });
  await p.goto('file://' + S + '/fbtest/index.html');
  await p.click('[data-a=setup][data-t=flip7]');
  for (const n of ['Roger','Léa']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
  await p.click('[data-a=start]'); await p.click('[data-a=addRound]');
  const ins = await p.$$('#modal .num input'); await ins[0].fill('45'); await ins[1].fill('30'); await p.click('[data-a=saveRound]');
  await p.click('[data-a=menu]'); await p.click('[data-a=feedback]');
  await p.click('[data-a=fbType][data-v=suggestion]');
  await p.fill('#fbMsg', 'Ajouter un minuteur de tour\nCe serait utile.'); await p.fill('#fbName', 'Roger');
  await p.waitForTimeout(300); await p.screenshot({path: S+'/shots/fb-1.png'});
  await p.click('[data-a=fbSend]'); await p.waitForTimeout(500);
  console.log('hors ligne, file :', await p.evaluate(() => fbQueue().length), await p.textContent('#toast'));
  online = true; await p.evaluate(() => fbFlush(false)); await p.waitForTimeout(500);
  console.log('envoyé :', posted.length, posted[0].auth, '|', posted[0].body.title, '|', posted[0].body.labels.join(','));
  console.log(await p.textContent('#toast'), '| file :', await p.evaluate(() => fbQueue().length));
  console.log(posted[0].body.body.slice(0, 400));
  await p.click('[data-a=back]'); await p.click('[data-a=go][data-v=settings]'); await p.screenshot({path: S+'/shots/fb-2.png'});
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
