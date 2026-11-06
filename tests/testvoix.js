const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args:['--autoplay-policy=no-user-gesture-required'] }); const errs=[];
  // Android simulé : voix du téléphone
  let ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  await ctx.addInitScript(() => { window.__dev=[]; window.__set=[]; window.AndroidBridge = { getVersion:()=>'3.9', keepScreenOn(){}, setOrientation(){},
    listVoices(){ setTimeout(() => window.onVoices(JSON.stringify([{name:'fr-ca-x-caa-local',lang:'fr-CA',quality:400,network:false,installed:true,best:true},{name:'fr-ca-x-cab-network',lang:'fr-CA',quality:500,network:true,installed:true,best:false},{name:'fr-fr-x-frd-local',lang:'fr-FR',quality:300,network:false,installed:false}])), 20); },
    setVoice(n,r){ window.__set.push([n,r]); }, speak(t){ window.__dev.push(t); setTimeout(() => window.onSpeakEnd(), 100); }, stopSpeaking(){} };
    HTMLMediaElement.prototype._play = HTMLMediaElement.prototype.play; window.__played = [];
    HTMLMediaElement.prototype.play = function(){ window.__played.push(this.src.slice(0, 20)); const p = this._play(); return p; };
  });
  let p = await ctx.newPage(); p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.app);
  await p.evaluate(() => tab('settings')); await p.waitForTimeout(300);
  console.log('liste voix :', await p.$$eval('#voiceDev option', o => o.map(x => x.textContent).join(' | ')));
  console.log('voix naturelle :', !!(await p.$('[data-a=voiceCloud].on')), '| choix :', await p.$$eval('[data-a=voiceCloudName]', e => e.map(x => x.textContent).join(' / ')));
  await p.screenshot({path:T.out('voix-1.png'), fullPage:true});
  await p.selectOption('#voiceDev', 'fr-ca-x-cab-network'); await p.waitForTimeout(150);
  await p.click('[data-a=voiceRate][data-v="1.15"]');
  await p.click('[data-a=voiceTest][data-v=device]'); await p.waitForTimeout(150);
  console.log('voix choisie envoyée :', JSON.stringify(await p.evaluate(() => __set.slice(-1)[0])));
  await p.click('[data-a=voiceCloudName][data-v=Charon]'); await p.waitForTimeout(800);
  // question IA → voix naturelle
  await p.evaluate(() => tab('home')); await p.click('[data-a=ask]');
  await p.evaluate(() => { window.__dev = []; window.__played = []; });
  await p.fill('#askQ', 'au wizard j ai misé 2 et fait 4 plis'); await p.keyboard.press('Enter'); await p.waitForSelector('[data-a=askLocal]');
  await p.click('[data-a=askSpeak]'); await p.waitForTimeout(1200);
  console.log('lecture IA → audio joué :', JSON.stringify(await p.evaluate(() => __played)), '| voix téléphone :', (await p.evaluate(() => __dev)).length);
  // panne de voix → voix du téléphone
  await p.fill('#askQ', 'vxko'); await p.keyboard.press('Enter'); await p.waitForFunction(() => S.askAi && /PANNEVOIX/.test(S.askAi.answer));
  await p.evaluate(() => { window.__dev = []; }); await p.click('[data-a=askSpeak]'); await p.waitForTimeout(600);
  console.log('panne voix → téléphone :', (await p.evaluate(() => __dev)).length);
  // voix naturelle désactivée
  await p.evaluate(() => { localStorage.setItem('pointage.voice.cloud', '0'); window.__dev = []; }); await p.click('[data-a=askSpeak]'); await p.waitForTimeout(300);
  console.log('naturelle désactivée → téléphone :', (await p.evaluate(() => __dev)).length);
  const log = require('fs').readFileSync(T.log,'utf8').trim().split('\n').map(JSON.parse).filter(x => x.path === '/tts');
  console.log('appels /tts :', log.map(x => x.voice + '@' + x.rate + ':' + (x.text||'').slice(0,20)).join(' | '));
  await ctx.close();
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
