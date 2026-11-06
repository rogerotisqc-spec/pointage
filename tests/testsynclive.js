// Appareils reliés + partie en direct : pas de copie en double
const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async () => { const c = await b.newContext({ viewport:{width:390,height:844} }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); return p; };
  const tel = await mk(), tab = await mk();
  await tel.goto(T.app); await tab.goto(T.app);
  // Cas 1 : appareils reliés avant la partie
  await tel.evaluate(() => { newPlayer('Roger', null); newPlayer('Marie', null); });
  await tel.evaluate(() => syncShowQr()); await tel.waitForSelector('#modal svg'); const sl = await tel.evaluate(() => syncLink(syncCfg())); await tel.evaluate(() => closeModal());
  await tab.goto(T.app + sl.slice(sl.indexOf('#'))); await tab.waitForSelector('#modal [data-a=syncJoin]'); await tab.click('#modal [data-a=syncJoin]');
  await tab.waitForFunction(() => SYNC_ST.last, null, {timeout: 10000});
  await tel.click('[data-a=setup][data-t=flip7]'); await tel.click('[data-a=selPlayer] >> nth=0').catch(() => {});
  await tel.evaluate(() => { tab('home'); }); await tel.click('[data-a=setup][data-t=flip7]');
  for (const n of ['Léa']) { await tel.fill('#guestName', n); await tel.click('[data-a=addGuest]'); }
  await tel.evaluate(() => { db.players.forEach(p => { if(!S.sel.includes(p.id)) S.sel.push(p.id); }); });
  await tel.click('[data-a=start]');
  await tel.click('.top .netbtn'); await tel.waitForSelector('#modal svg'); const ll = await tel.evaluate(() => liveLink(curGame().share)); await tel.evaluate(() => closeModal());
  await tel.evaluate(() => { const g = curGame(); g.rounds.push({s: Object.fromEntries(g.players.map((p, i) => [p.key, 50 + i * 30])), m: {}}); g.finished = true; save(); render(); });
  await tel.evaluate(() => syncNow(true)); await tab.evaluate(() => syncNow(true));
  const v = await mk(); // la tablette ouvre le lien de la partie
  await tab.goto(T.app + ll.slice(ll.indexOf('#'))); await tab.waitForFunction(() => S.live && S.live.g && S.live.g.finished, null, {timeout: 10000});
  console.log('page de suivi sur la tablette :', (await tab.textContent('main')).replace(/\s+/g, ' ').match(/✓ Cette partie est déjà[^.]*\./) ? 'déjà dans l’historique ✓' : 'bouton Garder (problème)');
  await tab.evaluate(() => { if(document.querySelector('[data-a=liveKeep]')) A.liveKeep(); });
  await tab.evaluate(() => syncNow(true)); await tel.evaluate(() => syncNow(true));
  console.log('parties Flip 7 : tél', await tel.evaluate(() => db.games.filter(g => g.type === 'flip7').length), '| tab', await tab.evaluate(() => db.games.filter(g => g.type === 'flip7').length));
  // Cas 2 : copie gardée AVANT de relier → doublon nettoyé à la liaison
  const a = await mk(), c = await mk(); await a.goto(T.app); await c.goto(T.app);
  await a.click('[data-a=setup][data-t=skyjo]'); for (const n of ['Roger', 'Marie']) { await a.fill('#guestName', n); await a.click('[data-a=addGuest]'); } await a.click('[data-a=start]');
  await a.click('.top .netbtn'); await a.waitForSelector('#modal svg'); const l2 = await a.evaluate(() => liveLink(curGame().share)); await a.evaluate(() => closeModal());
  await a.evaluate(() => { const g = curGame(); g.rounds.push({s: Object.fromEntries(g.players.map(p => [p.key, 30])), m: {}}); g.finished = true; save(); render(); });
  await c.goto(T.app + l2.slice(l2.indexOf('#'))); await c.waitForFunction(() => S.live && S.live.g && S.live.g.finished, null, {timeout: 10000});
  await c.click('[data-a=liveKeep]'); await c.click('[data-a=liveQuit]');
  console.log('copie gardée sur c :', await c.evaluate(() => db.games.filter(g => g.type === 'skyjo').length));
  console.log('copie sans marque d’origine :', await c.evaluate(() => { const g = db.games.find(x => x.fromLive); return g && !g.liveId; }));
  await a.evaluate(() => { tab('home'); syncShowQr(); }); await a.waitForSelector('#modal svg'); const s2 = await a.evaluate(() => syncLink(syncCfg())); await a.evaluate(() => closeModal());
  await c.goto(T.app + s2.slice(s2.indexOf('#'))); await c.waitForSelector('#modal [data-a=syncJoin]'); await c.click('#modal [data-a=syncJoin]');
  await c.waitForFunction(() => SYNC_ST.last, null, {timeout: 10000}); await a.evaluate(() => syncNow(true)); await c.evaluate(() => syncNow(true));
  console.log('après liaison, parties Skyjo : a', await a.evaluate(() => db.games.filter(g => g.type === 'skyjo').length), '| c', await c.evaluate(() => db.games.filter(g => g.type === 'skyjo').length));
  console.log('erreurs', errs); await b.close();
})();
