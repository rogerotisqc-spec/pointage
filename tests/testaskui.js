const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  await ctx.addInitScript(() => { window.__said=[]; window.AndroidBridge = { getVersion:()=>'3.5', keepScreenOn(){}, setOrientation(){},
    listen(){ setTimeout(() => window.onSpeech(JSON.stringify(['au wizard combien vaut une mise raté','au wizard combien vaut une mise rater'])), 30); },
    speak(t){ window.__said.push(t); setTimeout(() => window.onSpeakEnd(), 200); }, stopSpeaking(){ window.__said.push('STOP'); } }; });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.build);
  await p.click('[data-a=ask]'); await p.screenshot({path:T.out('ask-1.png')});
  await p.fill('#askQ', 'comment je corrige une manche'); await p.keyboard.press('Enter');
  console.log('texte → titre :', await p.textContent('main .card h2'));
  await p.screenshot({path:T.out('ask-2.png'), fullPage:true});
  await p.click('[data-a=askMic]'); await p.waitForTimeout(120);
  console.log('voix → titre :', await p.textContent('main .card h2'), '| lu :', JSON.stringify(await p.evaluate(()=>__said)).slice(0,160));
  console.log('bouton arrêter :', !!(await p.$('[data-a=askStop]')));
  await p.screenshot({path:T.out('ask-3.png'), fullPage:true});
  await p.waitForTimeout(300); console.log('après lecture, bouton lire :', !!(await p.$('[data-a=askSpeak]')));
  await p.click('[data-a=askPick] >> nth=0'); console.log('autre réponse :', await p.textContent('main .card h2'));
  // depuis une partie : contexte du jeu
  await p.click('[data-a=back]'); await p.click('[data-a=setup][data-t=skyjo]');
  for (const n of ['A','B']) { await p.fill('#guestName', n); await p.click('[data-a=addGuest]'); }
  await p.click('[data-a=start]'); await p.click('[data-a=rules]'); await p.click('[data-a=ask]');
  console.log('contexte :', (await p.textContent('[data-a=askNoGame]')).trim(), '| exemples :', await p.$$eval('[data-a=askEx]', e=>e.map(x=>x.textContent).join(' / ')));
  await p.click('[data-a=askEx] >> nth=0'); console.log('exemple → ', await p.textContent('main .card h2'));
  await p.screenshot({path:T.out('ask-4.png'), fullPage:true});
  // dés : la voix du jeu de dés fonctionne toujours
  console.log('ERRORS', JSON.stringify(errs));
  await p.setViewportSize({width:1024,height:768}); await p.screenshot({path:T.out('ask-5.png')});
  await b.close();
})();
