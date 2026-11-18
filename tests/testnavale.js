// Battleships : vrai jeu à deux téléphones (flottes secrètes, tirs, réponses automatiques, voix, coulé, victoire)
const T = require('./_env');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async () => { const c = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/Failed to load|404|ERR_INTERNET/.test(m.text())) errs.push('console: ' + m.text()); });
    await p.addInitScript(() => { window.SAID = []; window.VIB = []; window.AndroidBridge = { getVersion: () => '9.9', keepScreenOn(){}, setOrientation(){}, vibrate: s => VIB.push(s) }; }); return p; };
  const host = await mk(); await host.goto(T.app);
  await host.evaluate(() => { window.speak = t => { SAID.push(t); return Promise.resolve(); }; window.speakOk = () => true; window.SND = []; window.bsSound = k => SND.push(k); });
  await host.click('[data-a=setup][data-t=navale]');
  for (const n of ['Roger', 'Marie']) { await host.fill('#guestName', n); await host.click('[data-a=addGuest]'); }
  await host.click('[data-a=start]');
  console.log('écran :', (await host.textContent('main')).replace(/\s+/g, ' ').slice(0, 120));
  // Placement manuel d'un navire, puis le reste au hasard
  await host.click('[data-a=bsPick][data-k=pa]'); await host.click('[data-a=bsPlaceAt][data-r="0"][data-c="0"]');
  await host.click('[data-a=bsPick][data-k=pa]'); await host.click('[data-a=bsRotate]');
  console.log('porte-avions :', await host.evaluate(() => JSON.stringify(bsMine(curGame()).fleet.find(s => s.k === 'pa'))));
  await host.click('[data-a=bsRandom]');
  await host.screenshot({path: T.out('navale-place.png'), fullPage: true});
  // Inviter l'adversaire
  await host.click('[data-a=liveStart]'); await host.waitForSelector('#modal svg'); await host.click('#modal [data-a=close]');
  const link = await host.evaluate(() => liveLink(curGame().share));
  console.log('flotte jamais envoyée :', await host.evaluate(() => !('bsp' in liveSnap(curGame()).g)));
  const marie = await mk(); await marie.goto(T.app + link.slice(link.indexOf('#'))); await marie.waitForFunction(() => S.live && S.live.g);
  await marie.evaluate(() => { window.speak = t => { SAID.push(t); return Promise.resolve(); }; window.speakOk = () => true; window.SND = []; window.bsSound = k => SND.push(k); });
  await marie.waitForSelector('[data-a=bsRandom]');
  console.log('Marie est :', await marie.evaluate(() => S.live.me === S.live.g.players[1].key));
  await marie.click('[data-a=bsRandom]'); await marie.click('[data-a=bsReady]');
  await host.click('[data-a=bsReady]');
  await host.waitForFunction(() => curGame().bs.phase === 'play', null, {timeout: 10000});
  await marie.waitForFunction(() => S.live.g.bs.phase === 'play', null, {timeout: 10000});
  console.log('tour :', (await host.textContent('.bsturn')).replace(/\s+/g, ' ').trim());
  const mf = await marie.evaluate(() => S.live.bsp.fleet.map(s => bsCells(s)));
  const rf = await host.evaluate(() => bsMine(curGame()).fleet.map(s => bsCells(s)));
  const inR = new Set(rf.flat().map(([r, c]) => r * 10 + c));
  const misses = []; for (let i = 0; i < 100; i++) if (!inR.has(i)) misses.push([Math.floor(i / 10), i % 10]);
  const t0 = Date.now();
  // Roger tire sur une case du torpilleur de Marie (touché), Marie tire à l'eau, Roger coule le torpilleur
  const to = await marie.evaluate(() => bsCells(S.live.bsp.fleet.find(s => s.k === 'to')));
  const shoot = async (p, [r, c], who) => { await p.waitForSelector(`.bsgrid.enemy [data-a=bsShoot][data-r="${r}"][data-c="${c}"]`, {timeout: 15000}); await p.click(`.bsgrid.enemy [data-a=bsShoot][data-r="${r}"][data-c="${c}"]`); };
  await shoot(host, to[0]);
  await host.waitForFunction(() => (curGame().bs.shots[curGame().players[0].key] || []).length === 1, null, {timeout: 15000});
  await host.waitForTimeout(300);
  console.log('1er tir de Roger :', await host.evaluate(() => curGame().bs.shots[curGame().players[0].key][0].res), '| son :', await host.evaluate(() => SND.at(-1)), '| voix :', await host.evaluate(() => SAID.length), '| durée :', Date.now() - t0, 'ms');
  console.log('vibration chez Marie (touchée) :', await marie.evaluate(() => JSON.stringify(VIB.at(-1))), '| chez Roger :', await host.evaluate(() => JSON.stringify(VIB.at(-1))));
  await shoot(marie, misses[0]);
  await marie.waitForFunction(() => (S.live.g.bs.shots[S.live.g.players[1].key] || []).length === 1, null, {timeout: 15000}); await marie.waitForTimeout(300);
  console.log('tir de Marie :', await marie.evaluate(() => S.live.g.bs.shots[S.live.g.players[1].key][0].res), '| son chez Marie :', await marie.evaluate(() => SND.at(-1)), '| sons chez Roger :', await host.evaluate(() => SND.length));
  await shoot(host, to[1]);
  await host.waitForFunction(() => curGame().bs.shots[curGame().players[0].key].length === 2, null, {timeout: 15000}); await host.waitForTimeout(1200);
  console.log('2e tir :', await host.evaluate(() => { const s = curGame().bs.shots[curGame().players[0].key][1]; return s.res + ' ' + s.ship; }), '| voix :', await host.evaluate(() => SAID.at(-1)));
  await host.screenshot({path: T.out('navale-jeu.png'), fullPage: true});
  // Accélérer : toutes les autres cases de Marie déjà touchées sauf une, puis le dernier tir réel
  await shoot(marie, misses[1]); await host.waitForFunction(() => curGame().bs.turn === curGame().players[0].key && !curGame().bs.pend, null, {timeout: 15000});
  const rest = mf.flat().filter(([r, c]) => !to.some(([a, b]) => a === r && b === c));
  const last = rest.pop();
  await host.evaluate(cells => { const g = curGame(), k = g.players[0].key; cells.forEach(([r, c]) => g.bs.shots[k].push({r, c, res: 'hit', at: Date.now()})); save(); render(); }, rest);
  await marie.waitForFunction(n => S.live.g.bs.shots[S.live.g.players[0].key].length === n, rest.length + 2, {timeout: 15000});
  await shoot(host, last);
  await host.waitForFunction(() => curGame().finished, null, {timeout: 15000}); await host.waitForTimeout(1200);
  console.log('fin :', await host.evaluate(() => curGame().bs.phase + ' gagnant=' + clPName(curGame(), curGame().winner)), '| voix :', await host.evaluate(() => SAID.at(-1)));
  await marie.waitForFunction(() => S.live.g.finished, null, {timeout: 15000}); await marie.waitForTimeout(200);
  console.log('Marie voit :', (await marie.textContent('.bsturn')).replace(/\s+/g, ' ').trim());
  console.log('Marie voit les navires de Roger :', await marie.evaluate(() => document.querySelectorAll('.bsgrid.enemy .bsship.reveal').length), '| flottes montrées :', await host.evaluate(() => Object.keys(curGame().bs.reveal || {}).length));
  await marie.screenshot({path: T.out('navale-marie.png'), fullPage: true});
  await host.click('[data-a=bsResults]');
  console.log('résultats :', (await host.textContent('main')).replace(/\s+/g, ' ').slice(0, 160));
  console.log('erreurs', errs); await b.close();
})();
