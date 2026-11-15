// Clue : carnet secret, déductions, et partie en direct (hypothèse sur tous les téléphones, réponses, carte vue, accusation)
const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async () => { const c = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/Failed to load|404|ERR_INTERNET/.test(m.text())) errs.push('console: ' + m.text()); }); return p; };
  const host = await mk(); await host.goto(T.app);
  await host.click('[data-a=setup][data-t=clue]');
  for (const n of ['Roger', 'Marie', 'Léa']) { await host.fill('#guestName', n); await host.click('[data-a=addGuest]'); }
  await host.click('[data-a=start]'); await host.waitForTimeout(200);
  for (const c of ['s0', 's5', 'w1', 'w4', 'r2', 'r7']) await host.click(`#modal [data-a=clMineT][data-c="${c}"]`);
  await host.click('#modal [data-a=clMineSave]');
  console.log('cartes en main :', await host.evaluate(() => JSON.stringify(Object.values(curGame().cl.hand))), '| ma colonne déduite :', await host.evaluate(() => { const g = curGame(), D = clDeduce(g, clNB(g)); return D.K.s1[g.clp.me]; }));
  // Partage en direct
  await host.click('.top [data-a=liveStart]'); await host.waitForSelector('#modal svg'); await host.click('#modal [data-a=close]');
  const link = await host.evaluate(() => liveLink(curGame().share));
  console.log('carnet jamais envoyé :', await host.evaluate(() => !('clp' in liveSnap(curGame()).g)));
  const open = async name => { const v = await mk(); await v.goto(T.app + link.slice(link.indexOf('#'))); await v.waitForFunction(() => S.live && S.live.g);
    await v.waitForSelector('.clwhob'); await v.click(`.clwhob >> text=${name}`); await v.waitForSelector('.clbook'); return v; };
  const marie = await open('Marie'), lea = await open('Léa');
  await lea.evaluate(() => { const g = S.live.g, nb = clNB(g); nb.mine = ['s3', 'w2', 'r0', 'r4', 'r8', 'w5']; clSaveNB(g); render(); });
  console.log('Marie voit le tour :', (await marie.textContent('.clturn')).replace(/\s+/g, ' ').trim());
  // Roger fait une hypothèse : Docteur Olive, Tuyau de plomb, Cuisine
  await host.click('[data-a=clPick][data-t=sug]');
  for (const c of ['s3', 'w2', 'r0']) await host.click(`#modal [data-a=clSel][data-c="${c}"]`);
  await host.click('#modal [data-a=clPickNext]');
  await marie.waitForSelector('.clpop [data-a=clResp]', {timeout: 10000});
  console.log('fenêtre chez Marie :', (await marie.textContent('.clpw')).replace(/\s+/g, ' ').trim().slice(0, 150));
  await marie.screenshot({path: T.out('clue-pop-marie.png')});
  await marie.click('.clpop [data-a=clResp][data-r="none"]');
  await lea.waitForSelector('.clpop [data-a=clResp]', {timeout: 10000});
  console.log('Léa est aidée :', (await lea.textContent('.clyou')).replace(/\s+/g, ' ').trim());
  await lea.click('.clpop [data-a=clResp][data-r="show"]');
  await host.waitForSelector('.clpop [data-a=clSeen]', {timeout: 10000});
  await host.screenshot({path: T.out('clue-pop-host.png')});
  await host.click('.clpop [data-a=clSeen][data-c="w2"]');
  const hd = await host.evaluate(() => { const g = curGame(), D = clDeduce(g, clNB(g)), k = g.players.map(p => p.key); return {leaW2: D.K.w2[k[2]], marieS3: D.K.s3[k[1]], marieW2: D.K.w2[k[1]]}; });
  console.log('carnet de Roger :', JSON.stringify(hd));
  await marie.waitForSelector('.clpop [data-a=clPopOk]', {timeout: 10000});
  console.log('Marie voit :', (await marie.textContent('.clrl')).replace(/\s+/g, ' ').trim());
  await marie.click('.clpop [data-a=clPopOk]');
  const md = await marie.evaluate(() => { const g = S.live.g, D = clDeduce(g, clNB(g)), k = g.players.map(p => p.key); return {clauseLea: D.clauses.length, marieS3: D.K.s3[k[1]], asked: !!document.querySelector('td.asked')}; });
  console.log('carnet de Marie :', JSON.stringify(md));
  // Fin du tour de Roger → Marie fait une accusation fausse → elle est éliminée
  await host.click('[data-a=clEnd]');
  await marie.waitForSelector('[data-a=clPick][data-t=acc]', {timeout: 10000});
  await marie.click('[data-a=clPick][data-t=acc]');
  for (const c of ['s1', 'w0', 'r1']) await marie.click(`#modal [data-a=clSel][data-c="${c}"]`);
  await marie.click('#modal [data-a=clPickNext]');
  await marie.waitForSelector('.clpop [data-a=clAccRes]', {timeout: 10000});
  await lea.waitForFunction(() => /regarde dans l’enveloppe/.test((document.querySelector('.clpw') || {}).textContent || ''), null, {timeout: 10000});
  await lea.screenshot({path: T.out('clue-acc-lea.png')});
  await marie.click('.clpop [data-a=clAccRes][data-ok="0"]');
  await lea.waitForSelector('.clpop .clyou.ko', {timeout: 10000});
  console.log('Léa voit :', (await lea.textContent('.clyou.ko')).replace(/\s+/g, ' ').trim());
  console.log('tour passé à :', await host.evaluate(() => clPName(curGame(), clCurKey(curGame()))), '| Marie éliminée :', await host.evaluate(() => !!curGame().cl.out[curGame().players[1].key]));
  // Le téléphone de Léa ne répond plus : Roger répond à sa place
  await host.evaluate(() => { const g = curGame(); g.cl.cur = 2; save(); render(); });
  await host.waitForTimeout(1200);
  await lea.waitForSelector('[data-a=clPick][data-t=sug]', {timeout: 10000});
  await lea.click('.clpop [data-a=clPopOk]');
  await lea.click('[data-a=clPick][data-t=sug]'); for (const c of ['s1', 'w3', 'r5']) await lea.click(`#modal [data-a=clSel][data-c="${c}"]`); await lea.click('#modal [data-a=clPickNext]');
  await host.waitForSelector('.clpop [data-a=clResp]', {timeout: 10000});
  await host.click('.clpop [data-a=clResp][data-r="none"]:not([data-k])');
  await host.waitForSelector('.clpop [data-a=clResp][data-k]', {timeout: 10000});
  console.log('Marie (éliminée, téléphone éteint) :', (await host.textContent('.clsub')).replace(/\s+/g, ' ').trim());
  await host.screenshot({path: T.out('clue-sub.png')});
  await host.click('.clpop [data-a=clResp][data-r="none"][data-k]');
  console.log('hypothèse de Léa terminée :', await host.evaluate(() => { const e = curGame().cl.log.at(-1); return e.done + ' ' + e.resp.map(r => r.r).join(','); }));
  await lea.waitForSelector('.clpop [data-a=clPopOk]', {timeout: 10000});
  // Écran noir sur le téléphone de Léa, relevé par une nouvelle fenêtre
  await lea.click('.clpop [data-a=clPopOk]'); await lea.click('[data-a=clCurtain]');
  console.log('rideau :', !!(await lea.$('.curtain')));
  await lea.click('[data-a=clCurtainOff]');
  console.log('erreurs', errs); await b.close();
})();
