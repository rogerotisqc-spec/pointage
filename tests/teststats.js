const T = require('./_env');
const { chromium } = require('playwright');
const S=T.dir;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.addInitScript(() => {
    window.__writes = []; let folder = null, last = 0;
    window.AndroidBridge = { getVersion: () => '2.2', keepScreenOn(){},
      pickBackupFolder(){ folder = 'Documents/Pointage'; setTimeout(() => window.onBackupFolder(true), 20); },
      backupInfo(){ return JSON.stringify(folder ? {folder, last: last || undefined} : {}); },
      writeBackup(j){ window.__writes.push(j.length); last = Date.now(); setTimeout(() => window.onBackupDone(true, ''), 10); } };
  });
  await p.goto(T.src);
  // historique simulé : 12 parties Flip 7 et Uno
  await p.evaluate(() => {
    const ppl = ['Roger','Marie','Léa','Zoé'].map((n,i) => { const pl = {id:'r'+i, name:n, color:PALETTE[i]}; db.players.push(pl); return pl; });
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for(let k = 0; k < 12; k++){
      const type = k % 3 ? 'flip7' : 'uno';
      const players = ppl.map(pl => ({key:'p'+pl.id, rid:pl.id, name:pl.name, color:pl.color}));
      const rounds = []; for(let r = 0; r < 6 + (k%3); r++){ const s = {}; players.forEach((pp,i) => s[pp.key] = Math.round(rnd() * 40 + (type==='flip7' && i===k%4 ? 12 : 0))); rounds.push({s, m:{}}); }
      db.games.push({id:'g'+k, type, title:'', created: Date.now() - (12-k)*864e5*3, updated: Date.now() - (12-k)*864e5*3, finished:true, players, rounds, turns:[], cur:0, opts:{low: type==='uno', target: type==='uno'?500:200}});
    }
    save(); render();
  });
  await p.click('[data-a=tab][data-v=stats]'); await p.screenshot({path:S+'/shots/st-1.png', fullPage:true});
  await p.click('[data-a=statF][data-v=flip7]'); await p.screenshot({path:S+'/shots/st-2.png', fullPage:true});
  await p.click('[data-a=statPlayer] >> nth=0'); await p.waitForTimeout(300); await p.screenshot({path:S+'/shots/st-3.png'});
  await p.click('[data-a=close]');
  await p.click('[data-a=open][data-id=g11]'); await p.click('[data-a=menu]'); await p.click('[data-a=chart]'); await p.waitForTimeout(300);
  const box = await p.$eval('#chm rect[data-chart]', e => { const r = e.getBoundingClientRect(); return [r.x + r.width*0.6, r.y + r.height/2]; });
  await p.mouse.move(box[0], box[1]); await p.waitForTimeout(100); await p.screenshot({path:S+'/shots/st-4.png'});
  await p.click('[data-a=close]'); await p.click('[data-a=results]').catch(()=>{});
  // sauvegarde automatique
  await p.click('[data-a=back]').catch(()=>{}); await p.evaluate(() => tab('home')); await p.click('[data-a=go][data-v=settings]');
  await p.click('[data-a=abToggle]'); await p.waitForTimeout(200);
  console.log('écritures après activation :', await p.evaluate(() => window.__writes.length));
  await p.evaluate(() => { db.players.push({id:'x', name:'Test', color:'#000'}); save(); });
  await p.waitForTimeout(8500); console.log('écritures 8 s après un changement :', await p.evaluate(() => window.__writes.length));
  await p.evaluate(() => render()); await p.screenshot({path:S+'/shots/st-5.png', fullPage:true});
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
