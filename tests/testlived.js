// Partie en direct : jeux par tours (Scrabble, dés, Triomino) joués sur le téléphone du joueur, et Mille Bornes par équipe
const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async () => { const c = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/Failed to load|404|ERR_INTERNET/.test(m.text())) errs.push('console: ' + m.text()); }); return p; };
  const host = await mk(); await host.goto(T.app);
  const start = async (type, names, prep, me) => {
    await host.evaluate(() => tab('home')); await host.click(`[data-a=setup][data-t=${type}]`);
    for (const n of names) { await host.fill('#guestName', n); await host.click('[data-a=addGuest]'); }
    if (prep) await prep();
    await host.click('[data-a=start]');
    await host.click('.top [data-a=menu]'); await host.click('#modal [data-a=liveStart]'); await host.waitForSelector('#modal svg');
    if (me) await host.click(`#modal [data-a=liveHostMe] >> text=${me}`);
    await host.click('#modal [data-a=close]');
    return host.evaluate(() => liveLink(curGame().share));
  };
  const viewer = async (link, name) => { const v = await mk(); await v.goto(T.app + link.slice(link.indexOf('#')));
    await v.waitForFunction(() => S.live && S.live.g); await v.waitForTimeout(700); await v.click(`[data-a=liveMe] >> text=${name}`); return v; };
  const txt = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ').trim();
  const lastTurn = () => host.evaluate(() => { const g = curGame(), x = g.turns[g.turns.length - 1]; return x ? (g.players.find(p => p.key === x.pk).name + ' ' + x.pts + ' ' + x.note) : '-'; });

  // ---------- Scrabble ----------
  let link = await start('scrabble', ['Roger', 'Marie'], null, 'Roger');
  const ms = await viewer(link, 'Marie');
  console.log('Marie, pas son tour :', (await txt(ms, 'main')).slice(0, 90));
  await host.click('[data-a=scrPass]');
  await ms.waitForSelector('#scrWord', {timeout: 10000});
  console.log('Marie, son tour :', (await txt(ms, '.livepanel')).slice(0, 70), '| fin de partie cachée :', !(await ms.isVisible('.livepanel [data-a=scrEnd]')));
  await ms.fill('#scrWord', 'QUARTZ'); await ms.waitForTimeout(500);
  await ms.click('[data-a=scrMark][data-i="5"]'); await ms.click('[data-a=scrMark][data-i="5"]');   // Z sur L×3
  await ms.click('[data-a=scrMult][data-v="2"]');
  await ms.screenshot({path:T.out('lived-scr.png'), fullPage:true});
  await ms.click('[data-a=scrAddWord]'); await ms.click('[data-a=scrDone]');
  console.log('Marie après envoi :', (await txt(ms, 'main')).slice(0, 70));
  await host.waitForFunction(() => curGame().turns.length === 2, null, {timeout: 10000});
  console.log('feuille :', await lastTurn(), '| au tour de', await host.evaluate(() => curGame().players[curGame().cur].name));
  await ms.waitForFunction(() => !S.live.pend, null, {timeout: 10000}); await ms.waitForTimeout(100);
  console.log('confirmation chez Marie :', await ms.textContent('#toast'));

  // ---------- Dés : entrée, puis conflit (l'hôte inscrit le tour en même temps) ----------
  link = await start('farkle', ['Roger', 'Marie'], null, 'Roger');
  const md = await viewer(link, 'Marie');
  await host.click('[data-a=fkFarkle]');                      // Roger rate
  await md.waitForSelector('.livepanel [data-a=fkDie]', {timeout: 10000});
  for (let i = 0; i < 3; i++) await md.click('.livepanel .dice [data-a=fkDie][data-v="1"]');
  await md.click('[data-a=fkAddSel]'); await md.click('[data-a=fkBank]');
  await host.waitForFunction(() => curGame().turns.length === 2, null, {timeout: 10000});
  console.log('dés :', await lastTurn());
  await host.click('[data-a=fkFarkle]');                      // Roger rate encore → au tour de Marie
  await md.waitForFunction(() => S.live.g.turns.length === 3, null, {timeout: 10000}); await md.waitForTimeout(300);
  await md.click('.livepanel .dice [data-a=fkDie][data-v="5"]'); await md.click('[data-a=fkAddSel]');
  await host.click('[data-a=fkFarkle]');                      // l'hôte inscrit le tour de Marie lui-même
  await md.click('[data-a=fkBank]');
  await host.waitForTimeout(4000);
  console.log('conflit, hôte :', await host.textContent('#toast'), '| tours :', await host.evaluate(() => curGame().turns.length));
  await md.waitForFunction(() => !S.live.pend, null, {timeout: 10000}); await md.waitForTimeout(100);
  console.log('conflit, Marie :', await md.textContent('#toast'));

  // ---------- Triomino ----------
  link = await start('triomino', ['Roger', 'Marie'], null, 'Roger');
  const mt = await viewer(link, 'Marie');
  await host.click('[data-a=trNum][data-v="5"]'); await host.click('[data-a=trNum][data-v="5"]'); await host.click('[data-a=trNum][data-v="4"]'); await host.click('[data-a=trSave]');
  await mt.waitForSelector('.livepanel [data-a=trNum]', {timeout: 10000});
  console.log('fin de manche cachée :', !(await mt.isVisible('.livepanel [data-a=trEnd]')));
  for (const v of [3, 4, 5]) await mt.click(`.livepanel [data-a=trNum][data-v="${v}"]`);
  await mt.click('.livepanel [data-a=trSave]');
  await host.waitForFunction(() => curGame().turns.length === 2, null, {timeout: 10000});
  console.log('triomino :', await lastTurn());

  // ---------- Mille Bornes en équipes ----------
  link = await start('millebornes', ['Roger', 'Marie', 'Léa', 'Zoé'], async () => { await host.click('[data-a=setTeams][data-v="1"]'); }, null);
  const teams = await host.evaluate(() => curGame().players.map(p => p.name));
  console.log('équipes :', teams.join(' | '));
  const mb = await mk(); await mb.goto(T.app + link.slice(link.indexOf('#'))); await mb.waitForFunction(() => S.live && S.live.g); await mb.waitForTimeout(700);
  console.log('choix :', (await txt(mb, '.card')).slice(0, 120));
  await mb.click(`[data-a=liveMe] >> text=${teams[1]}`);
  await mb.click('[data-a=liveMbOpen]');
  for (let i = 0; i < 5; i++) await mb.click('#mb-body [data-a=mbC][data-f=c100][data-d="1"]');
  await mb.click('#mb-body [data-a=mbC][data-f=b][data-d="1"]');
  await mb.screenshot({path:T.out('lived-mb.png')});
  await mb.click('[data-a=liveMbSend]');
  await host.waitForFunction(() => { const g = curGame(); return g.inbox && Object.keys(g.inbox.e).length === 1; }, null, {timeout: 10000}); await host.waitForTimeout(200);
  console.log('bande MB :', await txt(host, '#liveinbox'));
  await host.click('[data-a=liveOpenInbox]');
  console.log('prérempli :', await host.evaluate(() => { const g = curGame(); return JSON.stringify(M.mb[g.players[1].key]); }));
  await host.click('#modal [data-a=mbC][data-f=c200][data-d="1"]');   // l'hôte inscrit son équipe : 200 km
  await host.click('#modal [data-a=saveRound]');
  console.log('manche MB :', await host.evaluate(() => JSON.stringify(curGame().rounds[0].s)));
  console.log('erreurs', errs); await b.close();
})();
