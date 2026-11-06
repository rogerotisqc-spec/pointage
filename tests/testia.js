const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs=[];
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  await ctx.addInitScript(() => { window.__said=[]; window.AndroidBridge = { getVersion:()=>'3.8', keepScreenOn(){}, setOrientation(){},
    listen(){ setTimeout(() => window.onSpeech(JSON.stringify(['au wizard j ai misé 2 et fait 4 plis'])), 30); },
    speak(t){ window.__said.push(t); setTimeout(() => window.onSpeakEnd(), 100); }, stopSpeaking(){} }; });
  const p = await ctx.newPage(); p.on('pageerror', e=>errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push('console: ' + m.text()); });
  await p.goto(T.app);
  await p.evaluate(() => { db.house.wizard = 'Le dernier qui distribue choisit l’atout.'; save(); });
  await p.click('[data-a=setup][data-t=wizard]');
  for (const n of ['Roger','Marie','Léa']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
  await p.click('[data-a=start]'); await p.click('.top [data-a=ask]');
  await p.click('[data-a=askMic]'); await p.waitForTimeout(80);
  console.log('pendant :', !!(await p.$('.spin')));
  await p.screenshot({path:T.out('ia-0.png')});
  await p.waitForSelector('[data-a=askLocal]');
  console.log('réponse IA :', (await p.textContent('main .card:nth-of-type(2)')).replace(/\s+/g,' ').slice(0,140));
  console.log('lu :', JSON.stringify(await p.evaluate(()=>__said)));
  await p.screenshot({path:T.out('ia-1.png'), fullPage:true});
  // suivi
  await p.fill('#askQ', 'et si j’avais fait 2 plis ?'); await p.keyboard.press('Enter'); await p.waitForSelector('[data-a=askLocal]');
  // panne → hors ligne
  await p.fill('#askQ', 'panne combien vaut une mise ratée'); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
  console.log('panne :', (await p.textContent('main')).match(/⚠︎[^.]*\./)[0], '| hors ligne :', await p.textContent('main .card h2'));
  // hors ligne
  await ctx.setOffline(true); await p.fill('#askQ', 'qui doit brasser'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  console.log('sans réseau :', (await p.textContent('main')).match(/⚠︎[^.]*\./)[0]); await ctx.setOffline(false);
  // annuler
  await p.fill('#askQ', 'lent question'); await p.keyboard.press('Enter'); await p.waitForTimeout(200); await p.click('[data-a=askCancel]');
  console.log('annulé :', (await p.textContent('main')).match(/⚠︎[^.]*\./)[0]);
  // réglage désactivé
  await p.evaluate(() => tab('settings')); console.log('réglage IA présent :', !!(await p.$('[data-a=iaToggle]'))); await p.click('[data-a=iaToggle]');
  await p.evaluate(() => tab('home')); await p.click('[data-a=ask]'); await p.fill('#askQ', 'qui doit brasser'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  console.log('IA désactivée → hors ligne :', await p.textContent('main .card h2'));
  const log = require('fs').readFileSync(T.log,'utf8').trim().split('\n').map(JSON.parse).filter(x => !x.path || x.path === '/ask');
  console.log('envoyé #1 : jeton', log[0].tok ? log[0].tok.slice(0,5)+'…' : 'ABSENT', '| jeu', log[0].gameName, '| maison', log[0].house, '| règles', log[0].rules.length, 'car.', '| histo', log[0].history.length);
  console.log('envoyé #2 histo :', JSON.stringify(log[1].history).slice(0, 90));
  console.log('ERRORS', JSON.stringify(errs.filter(e => !/502|Failed to load resource/.test(e)))); await b.close();
})();
