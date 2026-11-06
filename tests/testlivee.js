// Partie en direct : reprise plus tard (repartage à l'ouverture, parties suivies), copie dans l'historique, bouton « Ouvrir dans l'app »
const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (ua) => { const c = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, userAgent: ua }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/Failed to load|404|ERR_INTERNET/.test(m.text())) errs.push('console: ' + m.text()); }); return p; };
  const host = await mk(); await host.goto(T.app);
  await host.evaluate(() => { newPlayer('Marie', null); });
  await host.click('[data-a=setup][data-t=flip7]');
  for (const n of ['Roger', 'Marie']) { await host.fill('#guestName', n); await host.click('[data-a=addGuest]'); }
  await host.click('[data-a=start]');
  await host.click('.top [data-a=menu]'); await host.click('#modal [data-a=liveStart]'); await host.waitForSelector('#modal svg'); await host.click('#modal [data-a=close]');
  const link = await host.evaluate(() => liveLink(curGame().share));
  const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
  const v = await mk(android); await v.goto(T.app + link.slice(link.indexOf('#'))); await v.waitForFunction(() => S.live && S.live.g);
  const app = await v.getAttribute('a[href^="intent://suivre/"]', 'href');
  console.log('bouton app :', app ? app.replace(/\/[^.]+\.[^#]+#/, '/ID.CLÉ#').slice(0, 95) + '…' : 'absent');
  await v.click('[data-a=liveQuit]');
  console.log('accueil du joueur :', (await v.textContent('main')).replace(/\s+/g, ' ').slice(0, 80));
  await v.screenshot({path:T.out('livee-home.png')});

  // Le relais a oublié la partie (plus de 3 jours) ; le maître la rouvre : elle revient
  await host.evaluate(() => { const sh = curGame().share; return liveCall('del', {id: sh.id, tok: sh.tok}); });
  await v.click('[data-a=liveRejoin]'); await v.waitForTimeout(1500);
  console.log('avant réouverture :', (await v.textContent('main')).replace(/\s+/g, ' ').slice(0, 90));
  await host.evaluate(() => { const id = curGame().id; tab('home'); LIVE_OPENED.clear(); A.open({dataset: {id}}); });
  await host.waitForTimeout(1200);
  await v.click('[data-a=liveQuit]'); await v.click('[data-a=liveRejoin]');
  await v.waitForFunction(() => S.live && S.live.g, null, {timeout: 10000});
  console.log('après réouverture : partie revenue =', await v.evaluate(() => !!S.live.g && !S.live.gone));

  // Fin de partie → garder une copie (Marie est dans la liste de joueurs de ce téléphone ? non : c'est l'hôte)
  await host.evaluate(() => { const g = curGame(), k = g.players.map(p => p.key); g.rounds.push({s: {[k[0]]: 120, [k[1]]: 210}, m: {}}); g.finished = true; save(); render(); });
  await v.waitForFunction(() => S.live.g.finished, null, {timeout: 10000}); await v.waitForTimeout(300);
  await v.evaluate(() => newPlayer('Marie', null));
  await v.click('[data-a=liveKeep]');
  console.log('copie :', await v.textContent('#toast'), '|', await v.evaluate(() => { const c = db.games.find(x => x.fromLive); return c ? gameName(c) + ' terminée=' + c.finished + ' Marie liée=' + !!c.players.find(p => p.name === 'Marie').rid : 'aucune'; }));
  await v.click('[data-a=liveKeep]');
  console.log('2e fois :', await v.textContent('#toast'), '| copies =', await v.evaluate(() => db.games.filter(x => x.fromLive).length));
  console.log('statistiques du joueur :', await v.evaluate(() => { S.statP = 'all'; return statGames().length; }));
  console.log('bouton app absent dans l’app Android :', await (async () => { const a = await mk(); await a.addInitScript(() => { window.AndroidBridge = { getVersion: () => '6.0', keepScreenOn(){}, setOrientation(){} }; });
    await a.goto(T.app + link.slice(link.indexOf('#'))); await a.waitForFunction(() => S.live && S.live.g); return !(await a.$('a[href^="intent://"]')); })());
  console.log('erreurs', errs); await b.close();
})();
