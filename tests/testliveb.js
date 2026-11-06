// Étape B : chacun inscrit ses points sur son téléphone (relais simulé : tests/mockrelay.js sur le port 8788)
const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async () => { const c = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/Failed to load|404|ERR_INTERNET/.test(m.text())) errs.push('console: ' + m.text()); }); return p; };
  const host = await mk(); await host.goto(T.app);
  const start = async (type, names, prep) => {
    await host.evaluate(() => tab('home')); await host.click(`[data-a=setup][data-t=${type}]`);
    for (const n of names) { await host.fill('#guestName', n); await host.click('[data-a=addGuest]'); }
    if (prep) await prep();
    await host.click('[data-a=start]');
    await host.click('.top [data-a=menu]'); await host.click('#modal [data-a=liveStart]'); await host.waitForSelector('#modal svg'); await host.click('#modal [data-a=close]');
    return host.evaluate(() => liveLink(curGame().share));
  };
  const viewer = async (link, name) => { const v = await mk(); await v.goto(T.app + link.slice(link.indexOf('#')));
    await v.waitForFunction(() => S.live && S.live.g); await v.click(`[data-a=liveMe] >> text=${name}`); return v; };
  const waitHost = (fn, arg) => host.waitForFunction(fn, arg, {timeout: 10000});
  const txt = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ').trim();

  // ---------- Skyjo ----------
  let link = await start('skyjo', ['Roger', 'Marie', 'Léa']);
  const marie = await viewer(link, 'Marie'), lea = await viewer(link, 'Léa');
  console.log('formulaire Marie :', (await txt(marie, 'main')).slice(0, 130));
  await marie.screenshot({path:T.out('liveb-form.png'), fullPage:true});
  await marie.fill('#liveVal', '15'); await marie.click('#liveX-fin'); await marie.click('[data-a=liveSendScore]');
  await lea.click('[data-a=liveSign]'); await lea.fill('#liveVal', '3'); await lea.click('[data-a=liveSendScore]');
  await waitHost(() => { const g = curGame(); return g.inbox && Object.keys(g.inbox.e).length === 2; });
  await host.waitForTimeout(300);
  console.log('bandeau hôte :', await txt(host, '#liveinbox'));
  await host.screenshot({path:T.out('liveb-host.png')});
  await marie.waitForFunction(() => S.live.g.inbox && S.live.g.inbox.e[S.live.me], null, {timeout: 10000}); await marie.waitForTimeout(200);
  console.log('Marie voit :', (await txt(marie, 'main')).match(/✓ Reçu[^.]*\./)[0]);
  await host.click('[data-a=liveOpenInbox]');
  const pre = await host.evaluate(() => { const g = curGame(), k = g.players.map(p => p.key); return k.map(x => $('in-' + x).value).join(',') + ' fin=' + (document.querySelector('input[name=skfin]:checked') || {}).value; });
  console.log('fenêtre préremplie :', pre);
  await host.evaluate(() => { const g = curGame(); $('in-' + g.players[0].key).value = '20'; });
  await host.click('#modal [data-a=saveRound]');
  console.log('manche :', await host.evaluate(() => JSON.stringify(curGame().rounds[0].s)), '| boîte vidée :', await host.evaluate(() => !curGame().inbox));
  await marie.waitForFunction(() => S.live.g.rounds.length === 1, null, {timeout: 10000});
  console.log('Marie, manche 2 :', (await txt(marie, 'main')).slice(0, 80));

  // ---------- Phase 10 : phase réussie ----------
  link = await start('phase10', ['Roger', 'Marie']);
  const m2 = await viewer(link, 'Marie');
  await m2.click('[data-a=liveSendScore]'); await m2.waitForTimeout(200);
  console.log('Phase 10, envoi vide :', await m2.textContent('#toast'));
  await m2.click('#liveX-out'); await m2.waitForTimeout(100);
  console.log('Phase 10, case « terminé » : champ caché =', !(await m2.$('#liveVal')), '| phase cochée =', await m2.evaluate(() => $('liveX-ph').checked && $('liveX-ph').disabled));
  await m2.click('[data-a=liveSendScore]');
  await waitHost(() => { const g = curGame(); return g.inbox && g.inbox.e[g.players[1].key]; });
  await host.click('[data-a=liveOpenInbox]'); await host.evaluate(() => { $('in-' + curGame().players[0].key).value = '45'; }); await host.click('#modal [data-a=saveRound]');
  console.log('Phase 10 → phases :', await host.evaluate(() => { const g = curGame(); return g.players.map(p => p.name + ' ' + phaseOf(g, p.key)).join(', '); }));
  await m2.waitForFunction(() => S.live.g.rounds.length === 1, null, {timeout: 10000}); await m2.waitForTimeout(200);
  console.log('suivi Phase 10 :', (await txt(m2, 'main')).match(/Progression des phases.{0,120}/)[0]);
  await m2.screenshot({path:T.out('liveb-p10.png'), fullPage:true});

  // ---------- Wizard : mises puis plis, tout le monde envoie → fenêtre ouverte toute seule ----------
  link = await start('wizard', ['Roger', 'Marie', 'Léa']);
  const w = []; for (const n of ['Roger', 'Marie', 'Léa']) w.push(await viewer(link, n));
  for (const [i, v] of w.entries()) { if (i === 1) await v.click('[data-a=liveWz][data-d="1"]'); await v.click('[data-a=liveSendScore]'); }
  await waitHost(() => M && M.wz && M.wz.phase === 'bid');
  console.log('Wizard mises préremplies :', await host.evaluate(() => JSON.stringify(Object.values(M.wz.bid))));
  await host.click('#modal [data-a=wzSave]');
  await w[1].waitForFunction(() => S.live.g.pend, null, {timeout: 10000}); await w[1].waitForTimeout(200);
  console.log('Marie, plis :', (await txt(w[1], 'main')).match(/Mes plis[^0-9]*\d[^·]*· mise : \d/)[0]);
  for (const v of w) { await v.waitForFunction(() => S.live.g.pend, null, {timeout: 10000}); await v.waitForTimeout(150); await v.click('[data-a=liveSendScore]'); }
  await waitHost(() => M && M.wz && M.wz.phase === 'tricks');
  await host.click('#modal [data-a=wzSave]');
  console.log('Wizard manche 1 :', await host.evaluate(() => JSON.stringify(curGame().rounds[0])));

  // ---------- Yahtzee : Marie remplit sa case ----------
  link = await start('yahtzee', ['Roger', 'Marie']);
  const y = await viewer(link, 'Marie');
  await y.click('[data-a=liveYzCat][data-c=u5]'); await y.click('#modal [data-a=liveYzSet][data-v="15"]');
  await waitHost(() => { const g = curGame(); return g.yz && g.yz.sc[g.players[1].key].u5 === 15; });
  console.log('Yahtzee : case Cinq de Marie =', await host.evaluate(() => { const g = curGame(); return g.yz.sc[g.players[1].key].u5; }));
  await y.waitForFunction(() => !document.querySelector('[data-a=liveYzCat][data-c=u5]'), null, {timeout: 10000});
  console.log('case retirée chez Marie : oui');

  // ---------- Train : tous les dominos posés ----------
  link = await start('train', ['Roger', 'Marie']);
  const t = await viewer(link, 'Marie');
  await t.click('#liveX-out'); await t.click('[data-a=liveSendScore]');
  await waitHost(() => { const g = curGame(); return g.inbox && g.inbox.e[g.players[1].key]; });
  await host.click('[data-a=liveOpenInbox]');
  console.log('Train prérempli :', await host.evaluate(() => JSON.stringify(M.mt.v[curGame().players[1].key])));

  // ---------- Uno officiel / Mille Bornes : pas de saisie par joueur ----------
  link = await start('uno', ['Roger', 'Marie']);
  const u = await mk(); await u.goto(T.app + link.slice(link.indexOf('#'))); await u.waitForFunction(() => S.live && S.live.g);
  console.log('Uno officiel, choix du nom offert :', !!(await u.$('[data-a=liveMe]')));
  console.log('erreurs', errs); await b.close();
})();
