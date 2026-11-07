// Skip-Bo en direct (individuel et en équipes : un téléphone par équipe) + annonce à voix haute du prochain brasseur
const { chromium } = require('playwright');
const T = require('./_env');
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
    const chips = await host.$$eval('#modal [data-a=liveHostMe]', a => a.map(x => x.textContent.trim()));
    if (me) await host.click(`#modal [data-a=liveHostMe] >> text=${me}`);
    await host.click('#modal [data-a=close]');
    return { link: await host.evaluate(() => liveLink(curGame().share)), chips };
  };
  const open = async link => { const v = await mk(); await v.goto(T.app + link.slice(link.indexOf('#'))); await v.waitForFunction(() => S.live && S.live.g); await v.waitForTimeout(700); return v; };
  const txt = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ').trim();

  // ---------- Skip-Bo individuel ----------
  let r = await start('skipbo', ['Roger', 'Marie', 'Léa'], null, 'Roger');
  console.log('hôte, qui tient le téléphone :', r.chips.join(' | '));
  const marie = await open(r.link), lea = await open(r.link);
  await marie.click('[data-a=liveMe] >> text=Marie'); await lea.click('[data-a=liveMe] >> text=Léa');
  console.log('formulaire Marie :', (await txt(marie, 'main')).match(/Mon talon.{0,120}/)[0]);
  await marie.fill('#liveVal', '7'); await marie.click('[data-a=liveSendScore]');
  await lea.click('#liveX-out'); await lea.click('[data-a=liveSendScore]');
  await host.waitForFunction(() => M && document.querySelector('#modal [data-a=saveRound]'), null, {timeout: 10000}); await host.waitForTimeout(300);
  console.log('ouverture seule, préremplie :', await host.evaluate(() => { const g = curGame(), k = g.players.map(p => p.key);
    return 'gagnant=' + g.players.find(p => p.key === (document.querySelector('input[name=sbw]:checked') || {}).value).name + ' Marie=' + $('sb-' + k[1]).value; }));
  await host.evaluate(() => { $('sb-' + curGame().players[0].key).value = '3'; sbUpdate(); });
  await host.click('#modal [data-a=saveRound]');
  console.log('manche 1 :', await host.evaluate(() => curGame().players.map(p => p.name + ' ' + curGame().rounds[0].s[p.key]).join(', ')), '(attendu Léa 75)');

  // ---------- Skip-Bo en équipes ----------
  r = await start('skipbo', ['Roger', 'Marie', 'Léa', 'Zoé'], async () => { await host.click('[data-a=setTeams][data-v="1"]'); }, null);
  const teams = await host.evaluate(() => curGame().players.map(p => p.name));
  console.log('équipes :', teams.join(' | '));
  const eq = await open(r.link);
  console.log('choix :', (await txt(eq, '.card')).slice(0, 110));
  await eq.click(`[data-a=liveMe] >> text=${teams[1]}`);
  await eq.fill('#liveSb-0', '4'); await eq.click('[data-a=liveSendScore]'); await eq.waitForTimeout(200);
  console.log('un seul talon rempli :', await eq.textContent('#toast'));
  await eq.fill('#liveSb-1', '6'); await eq.click('[data-a=liveSendScore]');
  await host.waitForFunction(() => { const g = curGame(); return g.inbox && Object.keys(g.inbox.e).length === 1; }, null, {timeout: 10000}); await host.waitForTimeout(200);
  console.log('bande :', await txt(host, '#liveinbox'));
  await host.click('[data-a=liveOpenInbox]');
  await host.evaluate(() => { document.querySelector(`input[name=sbw][value="${curGame().players[0].key}"]`).click(); sbUpdate(); });
  await host.click('#modal [data-a=saveRound]');
  console.log('manche équipes :', await host.evaluate(() => JSON.stringify(Object.values(curGame().rounds[0].s))), '(attendu [75,0])');

  // ---------- Annonce du brasseur ----------
  await host.evaluate(() => tab('home')); await host.click('[data-a=setup][data-t=uno]');
  for (const n of ['Roger', 'Marie']) { await host.fill('#guestName', n); await host.click('[data-a=addGuest]'); }
  await host.click('[data-a=start]');
  await host.evaluate(() => { window.SAID = []; window.speak = t => { SAID.push(t); return Promise.resolve(); }; window.speakOk = () => true; });
  console.log('icône au départ :', await host.getAttribute('.dealer .spk', 'aria-label'));
  const addRound = () => host.evaluate(() => { const g = curGame(); g.rounds.push({s: Object.fromEntries(g.players.map((p, i) => [p.key, i ? 30 : 0])), m: {}}); save(); render(); });
  await addRound(); await host.waitForTimeout(500);
  console.log('coupée, rien dit :', await host.evaluate(() => SAID.length === 0));
  await host.click('.dealer [data-a=annonce]');
  console.log('activée :', await host.getAttribute('.dealer .spk', 'aria-pressed'), '| une seule icône :', await host.$$eval('.dealer .spk svg', a => a.length), '| dit :', await host.evaluate(() => SAID.at(-1)));
  await host.screenshot({path: T.out('livef-annonce.png')});
  await addRound(); await host.waitForTimeout(600);
  console.log('après la manche :', await host.evaluate(() => SAID.at(-1)));
  await host.click('.dealer [data-a=annonce]'); const n = await host.evaluate(() => SAID.length);
  await addRound(); await host.waitForTimeout(600);
  console.log('recoupée, rien de plus :', await host.evaluate(k => SAID.length === k, n), '| bouton Changer marche :', !!(await host.$('.dealer [data-a=dealer]')));
  console.log('erreurs', errs); await b.close();
})();
