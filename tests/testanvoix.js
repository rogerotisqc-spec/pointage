const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport:{width:390,height:844} });
  await ctx.addInitScript(() => { window.__said=[]; window.AndroidBridge = { getVersion:()=>'5.4', keepScreenOn(){}, setOrientation(){}, listen(){},
    speak(t){ window.__said.push(t); }, stopSpeaking(){ window.__stop=(window.__stop||0)+1; } }; localStorage.setItem('pointage.voice.cloud','0'); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(T.app);
  const id = await p.evaluate(() => { const P=(k,n)=>({key:k,name:n,color:'#1c7ed6',guest:true});
    const g={id:uid(),type:'wizard',title:'',created:Date.now(),updated:Date.now(),finished:true,players:[P('a','Roger'),P('b','Marie'),P('c','Léa')],rounds:[{s:{a:30,b:-10,c:20},m:{bid:{a:1,b:0,c:0},tricks:{a:1,b:1,c:0}}}],turns:[],cur:0,opts:{rounds:20},dealer0:0};
    db.games.push(g); save(); return g.id; });
  await p.evaluate(id => { S.gameId = id; go('results'); render(true); }, id);
  await p.click('[data-a=analyse]'); await p.waitForFunction(() => S.askAi && !S.askBusy);
  await p.waitForTimeout(300);
  console.log('lu en ligne :', await p.evaluate(() => __said.length ? __said[0].slice(0,60) : '(rien)'), '| bouton arrêter :', !!(await p.$('[data-a=askStop]')));
  await p.click('[data-a=askStop]'); console.log('arrêt :', await p.evaluate(() => S.speaking));
  await ctx.setOffline(true); await p.evaluate(() => { __said = []; });
  await p.evaluate(id => { S = {view:'home', stack:[]}; S.gameId = id; go('results'); render(true); }, id);
  await p.click('[data-a=analyse]'); await p.waitForTimeout(300);
  console.log('lu hors ligne :', await p.evaluate(() => __said.length ? __said[0].slice(0,60) : '(rien)'));
  await ctx.setOffline(false);
  // question écrite ordinaire : pas lue
  await p.evaluate(() => { __said = []; }); await p.click('[data-a=askNoRecap]');
  await p.fill('#askQ', 'combien vaut une mise ratée'); await p.keyboard.press('Enter'); await p.waitForFunction(() => S.askAi && !S.askBusy); await p.waitForTimeout(300);
  console.log('question écrite lue :', await p.evaluate(() => __said.length));
  console.log('erreurs', errs); await b.close();
})();
