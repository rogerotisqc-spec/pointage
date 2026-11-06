const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.src);
  await p.click('[data-a=tab][data-v=players]');
  for (const n of ['Roger','Marie','Léa','Zoé']) { await p.fill('#newPlayer', n); await p.keyboard.press('Enter'); }
  await p.click('[data-a=tab][data-v=home]'); await p.click('[data-a=setup][data-t=skipbo]');
  for (const n of ['Roger','Léa','Marie','Zoé']) await p.click(`[data-a=toggleSel] >> text=${n}`);   // assis : Roger, Léa, Marie, Zoé → A,B,A,B
  await p.click('[data-a=setTeams][data-v="1"]');
  await p.evaluate(() => window.scrollTo(0, 9999)); await p.screenshot({path:T.out('team-1.png')});
  console.log('équipes proposées :', await p.textContent('.opts .hint:last-of-type'));
  await p.click('[data-a=start]');
  console.log('sheet joueurs :', await p.evaluate(() => curGame().players.map(t => t.team + '=' + t.name).join(' | ')), '| brasseur :', await p.textContent('.dealer b'));
  // manche 1 : équipe A gagne ; Léa 4 cartes, Zoé 6 → 25 + 50 = 75
  await p.click('[data-a=addRound]'); await p.check('input[name=sbw] >> nth=0');
  const ins = await p.$$('#modal [data-sb]'); const ids = await p.$$eval('#modal [data-sb]', e => e.map(x => x.id));
  console.log('champs :', ids.join(','));
  await p.fill('#sb-tm1-0', '4'); await p.fill('#sb-tm1-1', '6'); await p.dispatchEvent('#sb-tm1-1', 'input');
  console.log('points du gagnant affichés :', await p.textContent('#sb-total'));
  await p.screenshot({path:T.out('team-2.png')});
  await p.click('[data-a=saveRound]');
  // manche 2 : équipe B gagne ; Roger 2, Marie 0 → 35
  await p.click('[data-a=addRound]'); await p.check('input[name=sbw] >> nth=1'); await p.fill('#sb-tm0-0', '2'); await p.click('[data-a=saveRound]');
  console.log('totaux :', await p.evaluate(() => JSON.stringify(totals(curGame()))), '| brasseur manche 3 :', await p.textContent('.dealer b'));
  await p.screenshot({path:T.out('team-3.png')});
  await p.click('[data-a=menu]'); await p.click('[data-a=finish]'); await p.waitForTimeout(200);
  await p.screenshot({path:T.out('team-4.png'), fullPage:true});
  console.log('résultat :', (await p.textContent('.card h2')).trim(), '|', (await p.textContent('.card .hint:last-child')).trim());
  // stats
  await p.evaluate(() => tab('stats'));
  console.log('stats :', await p.$$eval('.statt tbody tr', r => r.map(x => x.querySelector('b').textContent + ' ' + x.children[1].textContent + 'p/' + x.children[2].querySelector('b').textContent + 'v').join(' | ')));
  await p.screenshot({path:T.out('team-5.png')});
  // revanche : équipes conservées
  await p.evaluate(() => { const g = db.games[0]; S.gameId = g.id; }); await p.evaluate(() => A.rematch());
  console.log('revanche : équipes =', await p.evaluate(() => JSON.stringify([S.setupOpts.teams, S.setupOpts.nteams, S.teamOf])));
  // individuel toujours ok
  await p.evaluate(() => tab('home')); await p.click('[data-a=setup][data-t=skipbo]'); await p.click('[data-a=setTeams][data-v="0"]'); await p.click('[data-a=start]');
  await p.click('[data-a=addRound]'); await p.check('input[name=sbw] >> nth=0'); const s2 = await p.$$('#modal [data-sb]'); await s2[1].fill('3'); await p.dispatchEvent('#modal [data-sb] >> nth=1', 'input');
  console.log('individuel :', await p.textContent('#sb-total'));
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
