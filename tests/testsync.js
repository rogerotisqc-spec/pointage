// Synchronisation de mes appareils : téléphone + tablette (relais simulé tests/mockrelay.js)
const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (w, h) => { const c = await b.newContext({ viewport:{width:w||390,height:h||844}, deviceScaleFactor:2 }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/Failed to load|404|409|ERR_INTERNET/.test(m.text())) errs.push('console: ' + m.text()); }); return p; };
  const tel = await mk(), tab = await mk(820, 1180);
  await tel.goto(T.app); await tab.goto(T.app);
  // Chaque appareil a déjà ses propres données (Marie existe des deux côtés, avec des identifiants différents)
  const mkGame = (type, names, rounds, upd) => `(() => { const ps = ${JSON.stringify(names)}.map(n => { const q = db.players.find(x => x.name === n); return {key: q ? 'p' + q.id : 'g' + n, rid: q ? q.id : undefined, name: n, color: '#1c7ed6', guest: !q}; });
    const g = {id: uid(), type: '${type}', title: '', created: Date.now() - 5e6, updated: ${upd}, finished: true, players: ps, rounds: ${JSON.stringify(rounds)}.map(r => ({s: Object.fromEntries(ps.map((p, i) => [p.key, r[i]])), m: {}})), turns: [], cur: 0, opts: {target: 200}, dealer0: 0};
    db.games.push(g); save(); return g.id; })()`;
  await tel.evaluate(() => { newPlayer('Roger', null); newPlayer('Marie', null); db.house.uno = 'On joue à 300.'; save(); });
  const gTel = await tel.evaluate(mkGame('flip7', ['Roger', 'Marie'], [[120, 80], [100, 60]], 'Date.now() - 4e6'));
  await tab.evaluate(() => { newPlayer('Marie', null); newPlayer('Léa', null); save(); });
  const gTab = await tab.evaluate(mkGame('skyjo', ['Marie', 'Léa'], [[10, 20]], 'Date.now() - 3e6'));

  // Réglages du téléphone → Relier un autre appareil
  await tel.evaluate(() => go('settings'));
  console.log('carte réglages :', (await tel.textContent('main')).replace(/\s+/g, ' ').match(/Mes appareils.{0,90}/)[0]);
  await tel.click('[data-a=syncQr]'); await tel.waitForSelector('#modal svg', {timeout: 8000});
  await tel.screenshot({path:T.out('sync-qr.png')});
  const link = await tel.evaluate(() => syncLink(syncCfg()));
  await tel.click('#modal [data-a=close]');
  // La tablette ouvre le lien
  await tab.goto(T.app + link.slice(link.indexOf('#')));
  await tab.waitForSelector('#modal [data-a=syncJoin]', {timeout: 8000});
  console.log('tablette, question :', (await tab.textContent('#modal .mbody')).replace(/\s+/g, ' ').slice(0, 120));
  await tab.click('#modal [data-a=syncJoin]');
  await tab.waitForFunction(() => syncCfg() && SYNC_ST.last, null, {timeout: 10000});
  const sum = p => p.evaluate(() => ({joueurs: db.players.map(x => x.name).join(','), parties: db.games.map(g => gameName(g)).sort().join(','), regle: db.house.uno || ''}));
  console.log('tablette après liaison :', JSON.stringify(await sum(tab)));
  await tel.evaluate(() => syncNow(true));
  console.log('téléphone après synchro :', JSON.stringify(await sum(tel)));
  console.log('Marie en double ? tél', await tel.evaluate(() => db.players.filter(p => p.name === 'Marie').length), 'tab', await tab.evaluate(() => db.players.filter(p => p.name === 'Marie').length));
  console.log('partie de la tablette, Marie reliée au bon joueur :', await tel.evaluate(id => { const g = db.games.find(x => x.id === id), m = g.players.find(p => p.name === 'Marie'); return m.rid === db.players.find(p => p.name === 'Marie').id; }, gTab));

  // Changements des deux côtés en même temps : nouvelle partie sur le téléphone, règle maison sur la tablette, suppression sur la tablette
  await tel.evaluate(mkGame('uno', ['Roger', 'Marie'], [[50, 0]], 'Date.now()'));
  await tab.evaluate(id => { db.house.skyjo = 'Colonne de 3 = 0.'; db.games = db.games.filter(g => g.id !== id); save(); }, gTel);
  await tab.evaluate(() => syncNow(true)); await tel.evaluate(() => syncNow(true)); await tab.evaluate(() => syncNow(true));
  console.log('tél :', JSON.stringify(await sum(tel)), '| règle skyjo :', await tel.evaluate(() => db.house.skyjo || '-'));
  console.log('tab :', JSON.stringify(await sum(tab)));
  // Même partie modifiée des deux côtés : la plus récente gagne
  const g2 = await tel.evaluate(() => db.games.find(g => g.type === 'uno').id);
  await tel.evaluate(id => { const g = db.games.find(x => x.id === id); g.rounds.push({s: Object.fromEntries(g.players.map(p => [p.key, 1])), m: {}}); g.updated = Date.now() - 1000; save(); }, g2);
  await tab.evaluate(id => { const g = db.games.find(x => x.id === id); g.rounds.push({s: Object.fromEntries(g.players.map(p => [p.key, 9])), m: {}}); g.updated = Date.now(); save(); }, g2);
  await tel.evaluate(() => syncNow(true)); await tab.evaluate(() => syncNow(true)); await tel.evaluate(() => syncNow(true));
  console.log('conflit, manches uno tél/tab :', await tel.evaluate(id => db.games.find(x => x.id === id).rounds.length + ' (dernière ' + Object.values(db.games.find(x => x.id === id).rounds.at(-1).s)[0] + ')', g2), '/', await tab.evaluate(id => db.games.find(x => x.id === id).rounds.length, g2));
  // Synchro automatique après un changement (sans bouton)
  await tel.evaluate(() => { newPlayer('Zoé', null); });
  await tel.waitForTimeout(5500); await tab.evaluate(() => syncNow(true));
  console.log('Zoé arrivée sur la tablette :', await tab.evaluate(() => db.players.some(p => p.name === 'Zoé')));
  // Partie en direct : le partage reste propre au téléphone
  await tel.evaluate(id => { db.games.find(x => x.id === id).share = {id: 'AbCdEfGhIjKl', tok: 'x'.repeat(22), k: 'y'.repeat(22)}; save(); }, g2);
  await tel.evaluate(() => syncNow(true)); await tab.evaluate(() => syncNow(true));
  console.log('partage pas copié sur la tablette :', await tab.evaluate(id => !db.games.find(x => x.id === id).share, g2), '| gardé sur le téléphone :', await tel.evaluate(id => !!db.games.find(x => x.id === id).share, g2));
  console.log('relais :', await (await fetch('http://localhost:8788/syncstat')).text());
  // Délier
  await tab.evaluate(() => go('settings')); await tab.click('[data-a=syncOff]'); await tab.click('#modal .btn.danger');
  console.log('tablette déliée :', await tab.evaluate(() => !syncCfg() && db.games.length > 0));
  console.log('erreurs', errs); await b.close();
})();
