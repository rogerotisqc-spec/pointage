const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const errs = [];
  const p = await (await b.newContext()).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(T.app); await p.waitForTimeout(500);
  require('fs').writeFileSync(T.log,'');
  const long = ('Points tournants : après la manche 2, Léa menait avec 50 points et Marie suivait. ').repeat(12) + '\n' + ('Recommandations : misez prudemment quand vous avez peu d’atouts ! ').repeat(12) + 'Fin du texte.';
  console.log('longueur', long.length);
  await p.evaluate(t => { AI_TTS = true; speak(t, {cloud:true}); }, long);
  await p.waitForFunction(() => !S.speaking, null, {timeout: 20000}).catch(()=>console.log('toujours en lecture'));
  const tts = require('fs').readFileSync(T.log,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(x => x.path === '/tts');
  console.log('morceaux envoyés :', tts.map(x => x.text.length), 'dernier finit par :', tts.length ? tts[tts.length-1].text.slice(-14) : '');
  // arrêt au milieu
  require('fs').writeFileSync(T.log,'');
  await p.evaluate(t => speak(t, {cloud:true}), long); await p.waitForTimeout(150); await p.evaluate(() => speakStop());
  await p.waitForTimeout(1500);
  console.log('après arrêt :', require('fs').readFileSync(T.log,'utf8').trim().split('\n').filter(Boolean).length, 'appel(s), speaking=', await p.evaluate(() => S.speaking));
  console.log('erreurs', errs); await b.close();
})();
