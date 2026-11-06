const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (w, h) => { const c = await b.newContext({ viewport:{width:w||820,height:h||1180}, deviceScaleFactor:2 }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/Failed to load|404|ERR_INTERNET/.test(m.text())) errs.push('console: ' + m.text()); }); return [c, p]; };
  const [hc, host] = await mk();
  await host.goto(T.app);
  // partie de Skyjo à 3
  await host.click('[data-a=setup][data-t=skyjo]');
  for (const n of ['Roger','Marie','Léa']) { await host.fill('#guestName', n); await host.click('[data-a=addGuest]'); }
  await host.click('[data-a=start]');
  await host.click('.top [data-a=menu]');
  console.log('menu partager :', !!(await host.$('#modal [data-a=liveStart]')));
  await host.click('#modal [data-a=liveStart]');
  await host.waitForSelector('#modal svg');
  await host.screenshot({path:T.out('live-qr-tab.png')});
  const link = await host.evaluate(() => liveLink(curGame().share));
  console.log('lien :', link.replace(/\.[^.]+$/, '.<clé>'), '| barre :', !!(await host.$('#livebar')));
  const snap = await host.evaluate(() => JSON.stringify(liveSnap(curGame())));
  console.log('snapshot sans share/rid :', !/"share"|"rid"|"tok"/.test(snap));
  await host.click('#modal [data-a=close]');
  // joueur qui suit
  const [vc, view] = await mk();
  await view.goto(T.app + link.slice(link.indexOf('#')));
  await view.waitForFunction(() => S.live && S.live.g);
  console.log('suivi ouvert :', (await view.textContent('main')).replace(/\s+/g,' ').slice(0, 160));
  // l'hôte inscrit deux manches
  await host.evaluate(() => { const g = curGame(), k = g.players.map(p => p.key); g.rounds.push({s:{[k[0]]:12,[k[1]]:5,[k[2]]:20}, m:{raw:{[k[0]]:12,[k[1]]:5,[k[2]]:20}, fin:k[1]}}); save(); render(); });
  await view.waitForFunction(() => S.live.g && S.live.g.rounds.length === 1, null, {timeout: 8000});
  await host.evaluate(() => { const g = curGame(), k = g.players.map(p => p.key); g.rounds.push({s:{[k[0]]:-3,[k[1]]:30,[k[2]]:8}, m:{raw:{[k[0]]:-3,[k[1]]:15,[k[2]]:8}, fin:k[1], doubled:true}}); save(); render(); });
  await view.waitForFunction(() => S.live.g && S.live.g.rounds.length === 2, null, {timeout: 8000});
  console.log('après 2 manches :', (await view.textContent('main')).replace(/\s+/g,' ').slice(0, 260));
  await view.screenshot({path:T.out('live-tab.png'), fullPage:true});
  // lien abîmé
  const [bc, bad] = await mk();
  await bad.goto(T.app + link.slice(link.indexOf('#')).replace(/.{4}$/, 'AAAA'));
  await bad.waitForTimeout(1500); console.log('mauvaise clé :', (await bad.textContent('main')).replace(/\s+/g,' ').slice(0, 120));
  // fin de partie puis arrêt
  await host.evaluate(() => { const g = curGame(); g.finished = true; save(); });
  await view.waitForFunction(() => S.live.g && S.live.g.finished, null, {timeout: 8000});
  console.log('fin vue :', await view.evaluate(() => !!document.querySelector('.banner.done')));
  await host.evaluate(() => { S.view = 'sheet'; render(); });
  await host.click('#livebar [data-a=liveShow]'); await host.click('#modal [data-a=liveStop]'); await host.click('#modal .btn.danger');
  console.log('partage arrêté :', await host.evaluate(() => !curGame().share));
  await view.waitForFunction(() => S.live.gone, null, {timeout: 8000});
  console.log('vue après arrêt :', (await view.textContent('main')).replace(/\s+/g,' ').slice(0, 110));
  await view.click('[data-a=liveQuit]'); console.log('quitter → accueil :', await view.evaluate(() => S.view + ' ' + location.hash));
  // relais pas configuré
  require('http').get('http://localhost:8788/off', () => {});
  await host.waitForTimeout(200);
  await host.evaluate(() => { tab('home'); }); await host.click('[data-a=setup][data-t=uno]');
  for (const n of ['A','B']) { await host.fill('#guestName', n); await host.click('[data-a=addGuest]'); }
  await host.click('[data-a=start]').catch(()=>{}); await host.waitForTimeout(200);
  await host.evaluate(() => { if(S.view !== 'sheet'){ const s=document.querySelector('[data-a=start]'); if(s) s.click(); } });
  await host.click('.top [data-a=menu]'); await host.click('#modal [data-a=liveStart]'); await host.waitForTimeout(500);
  console.log('relais sans D1 :', await host.textContent('#toast'), '| share retiré :', await host.evaluate(() => !curGame().share));
  require('http').get('http://localhost:8788/off', () => {});
  console.log('erreurs', errs); await b.close();
})();
