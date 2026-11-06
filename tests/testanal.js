const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/Failed to load|ERR_INTERNET/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto(T.app);
  const ids = await p.evaluate(() => {
    const P = (k, n) => ({key:k, name:n, color:'#1c7ed6', guest:true});
    const base = (type, opts, extra) => Object.assign({id:uid(), type, title:'', created:Date.now()-86400e3, updated:Date.now(), finished:true, players:[P('a','Roger'),P('b','Marie'),P('c','Léa')], rounds:[], turns:[], cur:0, opts, dealer0:0}, extra);
    const wz = base('wizard', {rounds:20}, {rounds:[
      {s:{a:30,b:-10,c:20}, m:{bid:{a:1,b:0,c:0}, tricks:{a:1,b:1,c:0}}},
      {s:{a:-20,b:40,c:30}, m:{bid:{a:2,b:2,c:1}, tricks:{a:0,b:2,c:1}}},
      {s:{a:-10,b:50,c:-10}, m:{bid:{a:1,b:3,c:0}, tricks:{a:0,b:3,c:1}}}]});
    const yz = base('yahtzee', {}, {yz:{cur:0, sc:{a:{u1:3,u2:6,u3:9,u4:12,u5:15,u6:18,brelan:20,carre:0,full:25,ps:30,gs:0,yz:50,chance:22}, b:{u1:2,u2:4,u3:6,u4:8,u5:10,u6:12,brelan:15,carre:20,full:25,ps:30,gs:40,yz:0,chance:25}, c:{u1:1}}, yb:{a:1,b:0,c:0}}});
    const sc = base('scrabble', {}, {turns:[{pk:'a',pts:24,note:'QUARTZ 24'},{pk:'b',pts:0,note:'Passe ou échange'},{pk:'c',pts:72,note:'ORANGES 22 · Scrabble ! +50'},{pk:'a',pts:12,note:'ZOO 12'},{pk:'b',pts:30,note:'MAISON 30'},{pk:'c',pts:8,note:'AS 8'}]});
    const fk = base('farkle', {f:Object.assign({}, FD)}, {turns:[{pk:'a',pts:1500,note:''},{pk:'b',pts:0,note:'Raté'},{pk:'c',pts:-1000,note:'Raté à 21 000 : pénalité'}]});
    const uno = base('uno', {target:500, mode:'official'}, {rounds:[{s:{a:45,b:0,c:0}, m:{w:'a', left:{b:30,c:15}}},{s:{a:0,b:0,c:80}, m:{w:'c', left:{a:50,b:30}}}]});
    const mb = base('millebornes', {target:5000}, {players:[P('a','Roger'),P('b','Marie')], rounds:[{s:{a:1300,b:600}, m:{a:{v2:true,c100:4,c200:2,c75:4,c25:4,b:1,cf:1}, b:{v2:true,c50:4,c100:2}}}]});
    const empty = base('skyjo', {target:100, low:true}, {finished:false});
    db.games.push(wz, yz, sc, fk, uno, mb, empty); save();
    return {wz:wz.id, yz:yz.id, sc:sc.id, fk:fk.id, uno:uno.id, mb:mb.id, empty:empty.id};
  });
  for (const k of ['wz','yz','sc','fk','uno','mb']) {
    const r = await p.evaluate(id => gameRecap(db.games.find(g => g.id === id)), ids[k]);
    console.log('=== ' + k + '\n' + r + '\n');
  }
  console.log('vide sans données :', await p.evaluate(id => anHasData(db.games.find(g => g.id === id)), ids.empty));
  await p.evaluate(id => { S.gameId = id; go('results'); render(true); }, ids.wz);
  await p.screenshot({path:T.out('an-res.png'), fullPage:true});
  await p.click('[data-a=analyse]'); await p.waitForTimeout(80);
  console.log('pendant :', !!(await p.$('.spin')));
  await p.waitForFunction(() => S.askAi && !S.askBusy);
  console.log('analyse :', (await p.textContent('main')).replace(/\s+/g,' ').slice(0, 400));
  await p.screenshot({path:T.out('an-ia.png'), fullPage:true});
  await p.fill('#askQ', 'et Marie, qu’aurait-elle dû faire ?'); await p.keyboard.press('Enter'); await p.waitForFunction(() => S.askAi && !S.askBusy && S.askAi.q.includes('Marie'));
  await p.click('[data-a=askNoRecap]');
  console.log('puce retirée :', await p.evaluate(() => S.askRecap));
  await p.evaluate(() => { S = {view:'home', stack:[]}; render(true); });
  await p.click('.top [data-a=ask]'); await p.fill('#askQ', 'Analyse ma dernière partie'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => S.askAi && !S.askBusy);
  console.log('dernière partie :', await p.evaluate(() => S.askRecap && S.askRecap.title));
  await ctx.setOffline(true);
  await p.evaluate(id => { S = {view:'home', stack:[]}; S.gameId = id; go('results'); render(true); }, ids.yz);
  await p.click('[data-a=analyse]'); await p.waitForTimeout(200);
  console.log('hors ligne :', (await p.textContent('main')).replace(/\s+/g,' ').slice(0, 500));
  await p.screenshot({path:T.out('an-off.png'), fullPage:true});
  await ctx.setOffline(false);
  await p.evaluate(id => { S = {view:'home', stack:[]}; S.gameId = id; S.view = 'sheet'; render(true); }, ids.sc);
  await p.click('.top [data-a=menu]'); console.log('menu analyse :', !!(await p.$('#modal [data-a=analyse]')));
  await p.evaluate(() => closeModal());
  await p.evaluate(id => { S.gameId = id; render(true); }, ids.empty); await p.click('.top [data-a=menu]').catch(()=>{});
  console.log('menu analyse (partie vide) :', !!(await p.$('#modal [data-a=analyse]')));
  const log = require('fs').readFileSync(T.log,'utf8').trim().split('\n').map(JSON.parse);
  console.log('envoyés :', log.map(x => (x.mode||'-') + ' recap=' + (x.recap ? x.recap.length : 0)).join(' | '));
  console.log('erreurs :', errs);
  await b.close();
})();
