// Partie en direct : l'hôte dit qui il est, avertissement s'il manque des points, points en retard ajoutés à la manche
const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async () => { const c = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/Failed to load|404|ERR_INTERNET/.test(m.text())) errs.push('console: ' + m.text()); }); return p; };
  const host = await mk(); await host.goto(T.app);
  await host.click('[data-a=setup][data-t=skyjo]');
  for (const n of ['Roger', 'Marie', 'Léa']) { await host.fill('#guestName', n); await host.click('[data-a=addGuest]'); }
  await host.click('[data-a=start]');
  await host.click('.top [data-a=menu]'); await host.click('#modal [data-a=liveStart]'); await host.waitForSelector('#modal svg');
  await host.click('#modal [data-a=liveHostMe] >> text=Roger');
  console.log('hôte = Roger :', await host.evaluate(() => curGame().players.find(p => p.key === curGame().share.me).name));
  await host.screenshot({path:T.out('livec-qr.png'), fullPage:true});
  await host.click('#modal [data-a=close]');
  const link = await host.evaluate(() => liveLink(curGame().share));
  const open = async () => { const v = await mk(); await v.goto(T.app + link.slice(link.indexOf('#'))); await v.waitForFunction(() => S.live && S.live.g && S.live.ver); return v; };
  const marie = await open(), lea = await open();
  await marie.waitForTimeout(300);
  console.log('choix offerts à Marie :', (await marie.$$eval('[data-a=liveMe]', a => a.map(x => x.textContent.trim()))).join(' | '));
  await marie.click('[data-a=liveMe] >> text=Marie'); await lea.click('[data-a=liveMe] >> text=Léa');

  // Manche 1 : seule Marie envoie ; l'hôte enregistre trop tôt
  await marie.fill('#liveVal', '15'); await marie.click('[data-a=liveSendScore]');
  await host.waitForFunction(() => { const g = curGame(); return g.inbox && Object.keys(g.inbox.e).length === 1; }, null, {timeout: 10000}); await host.waitForTimeout(200);
  console.log('bandeau :', (await host.textContent('#liveinbox')).replace(/\s+/g, ' ').trim());
  await host.click('[data-a=liveOpenInbox]');
  await host.evaluate(() => { $('in-' + curGame().share.me).value = '20'; });
  await host.click('#modal [data-a=saveRound]'); await host.waitForTimeout(150);
  console.log('avertissement :', (await host.textContent('#modal .mfoot p')).trim(), '| manche enregistrée ?', await host.evaluate(() => curGame().rounds.length));
  await host.screenshot({path:T.out('livec-warn.png')});
  await host.click('#modal [data-a=saveRound]'); await host.waitForTimeout(150);
  console.log('2e avertissement :', (await host.textContent('#modal .mfoot p')).trim().slice(0, 50));
  await host.click('#modal [data-a=saveRound]');
  console.log('après 3e toucher :', await host.evaluate(() => { const r = curGame().rounds[0]; return JSON.stringify({n: curGame().rounds.length, miss: r.m.miss && r.m.miss.length}); }));
  // Léa envoie en retard (manche 1)
  await lea.waitForTimeout(100);
  await lea.evaluate(() => { const L = S.live, d = liveDraft(L, '0'); d.v = '7'; liveSendMsg({t: 'r', key: '0', pk: L.me, v: 7}); });
  await host.waitForFunction(() => { const r = curGame().rounds[0]; return !r.m.miss; }, null, {timeout: 10000});
  console.log('retard ajouté :', await host.textContent('#toast'), '|', await host.evaluate(() => JSON.stringify(Object.values(curGame().rounds[0].s))));

  // Manche 2 : Marie et Léa envoient → la fenêtre s'ouvre seule, curseur dans la case de Roger
  await marie.waitForFunction(() => S.live.g.rounds.length === 1, null, {timeout: 10000}); await lea.waitForFunction(() => S.live.g.rounds.length === 1, null, {timeout: 10000});
  await marie.waitForTimeout(200); await lea.waitForTimeout(200);
  await marie.fill('#liveVal', '4'); await marie.click('[data-a=liveSendScore]');
  await lea.fill('#liveVal', '9'); await lea.click('[data-a=liveSendScore]');
  await host.waitForFunction(() => M && document.querySelector('#modal [data-a=saveRound]'), null, {timeout: 10000}); await host.waitForTimeout(400);
  console.log('ouverture seule :', await host.textContent('#toast'), '| curseur :', await host.evaluate(() => document.activeElement && document.activeElement.id === 'in-' + curGame().share.me));
  await host.keyboard.type('11'); await host.click('#modal [data-a=saveRound]');
  console.log('manche 2 sans avertissement :', await host.evaluate(() => JSON.stringify(curGame().rounds[1].s) + ' miss=' + !!curGame().rounds[1].m.miss));
  console.log('erreurs', errs); await b.close();
})();
