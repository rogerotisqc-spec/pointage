// Produit les copies d'écran du manuel à partir de parties d'exemple.
// Usage : node tools/manual_shots.js <dossier de sortie png>
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2];
// Copie construite (clé, jeton IA et aide du manuel insérés) : lancer build.sh avant
const APP = 'file://' + path.resolve(__dirname, '../build/assets/index.html');
const VER = (require('fs').readFileSync(path.resolve(__dirname, '../app/src/main/AndroidManifest.xml'), 'utf8').match(/versionName="([^"]+)"/) || [])[1] || '?';
const LANDING = 'file://' + path.resolve(__dirname, '../../pointage-repo/docs/index.html');

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((VER_) => {
    // Simule l'app Android pour montrer ses fonctions (mises à jour, sauvegarde automatique)
    window.AndroidBridge = {
      getVersion: () => VER_, keepScreenOn() {}, checkUpdate() { setTimeout(() => window.onUpdateInfo(JSON.stringify({ version: '2.7', apk: 'x' })), 20); },
      installUpdate() {}, backupInfo: () => JSON.stringify({ folder: 'Documents', last: Date.now() - 120000 }),
      pickBackupFolder() {}, writeBackup() {}, aiApps: () => JSON.stringify([{ pkg: 'com.google.android.apps.bard', name: 'Gemini' }, { pkg: 'com.openai.chatgpt', name: 'ChatGPT' }]), askAi() {}, listVoices() { setTimeout(() => window.onVoices(JSON.stringify([{ name: 'fr-ca-x-caa-local', lang: 'fr-CA', quality: 400, network: false, installed: true, best: true }, { name: 'fr-ca-x-cab-network', lang: 'fr-CA', quality: 400, network: true, installed: true }, { name: 'fr-fr-x-frd-local', lang: 'fr-FR', quality: 300, network: false, installed: true }])), 10); }, setVoice() {}, speak() {}, stopSpeaking() {}, listen() { setTimeout(() => window.onSpeech(JSON.stringify(['trois cinq et un un'])), 20); }
    };
    try { localStorage.setItem('pointage.autobackup', '1'); localStorage.setItem('pointage.lastCheck', String(Date.now())); localStorage.setItem('pointage.fbname', 'Roger'); } catch (e) {}
  }, VER);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const shot = async (name, opts) => { await p.waitForTimeout(250); await p.evaluate(() => { const t = document.getElementById('toast'); if (t) { t.style.transition = 'none'; t.classList.remove('on'); } }); await p.waitForTimeout(30); await p.screenshot({ path: path.join(OUT, name + '.png'), ...(opts || {}) }); };
  const tap = s => p.click(s);

  await p.goto(APP);
  // ---------- données d'exemple ----------
  await p.evaluate(() => {
    const names = ['Roger', 'Marie', 'Léa', 'Zoé'];
    const ppl = names.map((n, i) => { const pl = { id: 'r' + i, name: n, color: PALETTE[i] }; db.players.push(pl); return pl; });
    let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const types = ['flip7', 'uno', 'flip7', 'playnine', 'flip7', 'uno', 'playnine', 'flip7', 'uno', 'flip7', 'skipbo', 'flip7'];
    types.forEach((type, k) => {
      const players = ppl.map(pl => ({ key: 'p' + pl.id, rid: pl.id, name: pl.name, color: pl.color }));
      const n = type === 'playnine' ? 9 : 6 + (k % 3), rounds = [];
      for (let r = 0; r < n; r++) { const s = {}; players.forEach((pp, i) => s[pp.key] = type === 'playnine' ? Math.round(rnd() * 14 - 3) : Math.round(rnd() * 40 + (i === k % 4 ? 10 : 0))); rounds.push({ s, m: {} }); }
      const day = Date.now() - (14 - k) * 864e5 * 2;
      db.games.push({ id: 'old' + k, type, title: '', created: day, updated: day, finished: true, players, rounds, turns: [], cur: 0, opts: { low: type === 'uno' || type === 'playnine', target: { uno: 500, flip7: 200, skipbo: 500 }[type], holes: type === 'playnine' ? 9 : undefined }, dealer0: 0 });
    });
    db.titles = ['Rummikub'];
    db.house = { farkle: 'On joue à 25 000. Six dés identiques : victoire immédiate.' };
    save(); render();
  });
  const startGame = async (type, who, opts) => {
    await p.evaluate(() => tab('home')); await tap(`[data-a=setup][data-t=${type}]`);
    await p.evaluate(() => { S.sel = []; render(); });
    for (const n of who) await tap(`[data-a=toggleSel] >> text=${n}`);
    if (opts) await opts();
    await tap('[data-a=start]');
  };
  const addRound = async (vals) => { await tap('[data-a=addRound] >> nth=0'); const ins = await p.$$('#modal .num input'); for (let i = 0; i < ins.length && i < vals.length; i++) await ins[i].fill(String(vals[i])); await tap('[data-a=saveRound]'); };

  // ---------- Joueurs ----------
  await tap('[data-a=tab][data-v=players]'); await shot('joueurs');

  // ---------- Nouvelle partie (Flip 7) ----------
  await p.evaluate(() => tab('home')); await tap('[data-a=setup][data-t=flip7]');
  await p.evaluate(() => { S.sel = []; render(); });
  for (const n of ['Roger', 'Marie', 'Léa']) await tap(`[data-a=toggleSel] >> text=${n}`);
  await p.fill('#guestName', 'Oncle Paul'); await tap('[data-a=addGuest]');
  await tap('[data-a=setDealer0] >> text=Marie');
  await shot('nouvelle-partie');
  await tap('[data-a=start]');
  await addRound([45, 30, 0, 52]); await addRound([38, 61, 44, 20]);
  await tap('[data-a=addRound]');
  const k = await p.$$eval('.calc-t', e => e.map(x => x.dataset.k));
  await tap(`.calc-t[data-k="${k[0]}"]`);
  for (const v of [3, 7, 12, 9]) await tap(`[data-a=f7][data-k="${k[0]}"][data-op=n][data-v="${v}"]`);
  await tap(`[data-a=f7][data-k="${k[0]}"][data-op=x2]`); await tap(`[data-a=f7][data-k="${k[0]}"][data-op=m][data-v="4"]`);
  await shot('flip7-calculatrice');
  const ins = await p.$$('#modal .num input'); await ins[1].fill('25'); await ins[2].fill('33'); await ins[3].fill('0');
  await tap('[data-a=saveRound]');
  await shot('feuille');
  await tap('[data-a=menu]'); await shot('menu-partie');
  await tap('[data-a=chart]'); await p.waitForTimeout(200);
  const box = await p.$eval('#chm rect[data-chart]', e => { const r = e.getBoundingClientRect(); return [r.x + r.width * 0.55, r.y + r.height / 2]; });
  await p.mouse.move(box[0], box[1]); await shot('graphique');
  await tap('[data-a=close]');
  await tap('[data-a=dealer]'); await shot('brasseur'); await tap('[data-a=close]');

  // ---------- Uno : façon de compter, puis saisie officielle ----------
  await startGame('uno', ['Roger', 'Zoé', 'Léa'], async () => { await tap('[data-a=setUnoMode][data-v=official]'); await p.evaluate(() => window.scrollTo(0, 9999)); await shot('uno-mode'); });
  await tap('[data-a=addRound]'); await p.check('input[name=unow] >> nth=0');
  const ku = await p.$$eval('[data-uno]', e => e.map(x => x.id.slice(3)));
  await tap(`.calc-t[data-k="${ku[1]}"]`);
  for (const v of [7, 20, 50]) await tap(`[data-a=addv][data-for="in-${ku[1]}"][data-v="${v}"]`);
  await p.fill(`#in-${ku[2]}`, '33'); await p.dispatchEvent(`#in-${ku[2]}`, 'input');
  await shot('uno-saisie');
  await tap('[data-a=close]');

  // ---------- Play Nine ----------
  await startGame('playnine', ['Roger', 'Marie', 'Léa', 'Zoé']);
  for (const r of [[4, 12, -3, 9], [0, 7, 5, 11], [6, -5, 8, 2]]) await addRound(r);
  await shot('playnine');
  await tap('[data-a=addRound] >> nth=0');
  const kp = await p.$$eval('.calc-t', e => e.map(x => x.dataset.k));
  await tap(`.calc-t[data-k="${kp[0]}"]`);
  for (const v of [5, 5, -5, 3, 5, 5, -5, 7]) await tap(`[data-a=p9k][data-k="${kp[0]}"][data-v="${v}"]`);
  await shot('playnine-calculatrice'); await tap('[data-a=close]');

  // ---------- Skip-Bo en équipes ----------
  await startGame('skipbo', ['Roger', 'Léa', 'Marie', 'Zoé'], async () => { await tap('[data-a=setTeams][data-v="1"]'); await p.evaluate(() => window.scrollTo(0, 9999)); await shot('skipbo-equipes'); });
  await tap('[data-a=addRound]'); await p.check('input[name=sbw] >> nth=0');
  await p.fill('#sb-tm1-0', '4'); await p.fill('#sb-tm1-1', '6'); await p.dispatchEvent('#sb-tm1-1', 'input');
  await shot('skipbo-saisie'); await tap('[data-a=saveRound]');
  await tap('[data-a=addRound]'); await p.check('input[name=sbw] >> nth=1'); await p.fill('#sb-tm0-0', '2'); await tap('[data-a=saveRound]');
  await tap('[data-a=menu]'); await tap('[data-a=finish]'); await shot('skipbo-resultat');

  // ---------- Mille Bornes ----------
  await startGame('millebornes', ['Roger', 'Léa', 'Marie', 'Zoé'], async () => { await tap('[data-a=setTeams][data-v="1"]'); });
  await tap('[data-a=addRound]');
  const plus = f => tap(`#mb-body [data-a=mbC][data-f=${f}][data-d="1"]`);
  for (let i = 0; i < 4; i++) await plus('c100'); for (let i = 0; i < 2; i++) await plus('c200');
  for (let i = 0; i < 3; i++) await plus('c50'); await plus('c25'); await plus('c25'); await plus('b'); await plus('b'); await plus('cf');
  await shot('millebornes-saisie');
  await p.evaluate(() => { document.getElementById('mb-body').scrollTop = 9999; }); await shot('millebornes-primes');
  await tap('[data-a=close]');

  // ---------- Phase 10 ----------
  await startGame('phase10', ['Roger', 'Marie', 'Léa', 'Zoé']);
  const kk = await p.$$eval('.sw', e => e.map(x => x.dataset.k));
  await tap(`.sw[data-k="${kk[0]}"]`); await shot('phase10-couleurs'); await tap('.cpick button >> nth=2');
  for (const [i, n] of [[0, 2], [0, 3], [1, 2], [3, 2], [3, 3], [3, 4]]) await tap(`[data-a=p10cell][data-k="${kk[i]}"][data-n="${n}"]`);
  await addRound([15, 40, 85, 5]);
  await p.evaluate(() => window.scrollTo(0, 0)); await shot('phase10');
  await tap(`[data-a=p10cell][data-k="${kk[3]}"][data-n="4"]`); await shot('phase10-objectif'); await tap('[data-a=close]');

  // ---------- Scrabble ----------
  await startGame('scrabble', ['Roger', 'Marie']);
  await p.fill('#scrWord', 'quartz'); await p.waitForTimeout(450);
  await tap('[data-a=scrMark][data-i="5"]'); await tap('[data-a=scrMark][data-i="5"]'); await tap('[data-a=scrMult][data-v="2"]');
  await shot('scrabble-calculateur');
  await tap('[data-a=scrAddWord]'); await p.fill('#scrWord', 'as'); await p.waitForTimeout(450); await tap('[data-a=scrAddWord]');
  await tap('[data-a=scrDone]');
  await p.fill('#scrWord', 'maison'); await p.waitForTimeout(450); await tap('[data-a=scrAddWord]'); await tap('[data-a=scrDone]');
  await tap('[data-a=scrEnd]'); const sl = await p.$$('[data-scrleft]'); await sl[1].fill('qe'); await p.waitForTimeout(100);
  await shot('scrabble-fin'); await tap('[data-a=close]');
  await startGame('scrabble', ['Léa', 'Zoé'], async () => { await tap('[data-a=setScrMode][data-v="1"]'); });
  await p.fill('#scrPts', '24'); await p.keyboard.press('Enter');
  await shot('scrabble-simple');

  // ---------- Skyjo ----------
  await startGame('skyjo', ['Roger', 'Marie', 'Léa']);
  await tap('[data-a=addRound]'); await p.check('input[name=skfin] >> nth=0');
  const kj = await p.$$eval('.calc-t', e => e.map(x => x.dataset.k));
  await tap(`.calc-t[data-k="${kj[0]}"]`);
  for (const v of [5, 1, 2, 3, 5, 4, 0, -2, 5, 6, 7, 12]) await tap(`[data-a=skk][data-k="${kj[0]}"][data-v="${v}"]`);
  await shot('skyjo-calculatrice');
  const sj = await p.$$('#modal .num input'); await sj[0].fill('20'); await sj[1].fill('15'); await sj[2].fill('30'); await tap('[data-a=saveRound]');
  await tap('[data-a=addRound]'); await p.check('input[name=skfin] >> nth=1');
  const sj2 = await p.$$('#modal .num input'); await sj2[0].fill('10'); await sj2[1].fill('3'); await sj2[2].fill('8'); await tap('[data-a=saveRound]');
  await shot('skyjo');

  // ---------- Wizard ----------
  await startGame('wizard', ['Roger', 'Marie', 'Léa', 'Zoé']);
  const wk = await p.evaluate(() => curGame().players.map(x => x.key));
  const wzStep = (i, f, d) => tap(`[data-a=wzStep][data-k="${wk[i]}"][data-f=${f}][data-d="${d}"]`);
  // manche 1 : mises 1,0,0,0 ; plis 0,0,0,1
  await tap('[data-a=wzOpen]'); await wzStep(0, 'bid', 1); await tap('[data-a=wzSave]');
  await tap('[data-a=wzOpen]'); await wzStep(0, 'tricks', -1); await wzStep(3, 'tricks', 1); await tap('[data-a=wzSave]');
  // manche 2 : mises 1,1,0,1 ; plis 1,1,0,0
  await tap('[data-a=wzOpen]'); for (const i of [0, 1, 3]) await wzStep(i, 'bid', 1); await tap('[data-a=wzSave]');
  await tap('[data-a=wzOpen]'); await wzStep(3, 'tricks', -1); await tap('[data-a=wzSave]');
  // manche 3 : mises 2,0,1,1
  await tap('[data-a=wzOpen]'); await wzStep(0, 'bid', 1); await wzStep(0, 'bid', 1); await wzStep(2, 'bid', 1); await wzStep(3, 'bid', 1);
  await shot('wizard-mises'); await tap('[data-a=wzSave]');
  await tap('[data-a=wzOpen]'); await wzStep(3, 'tricks', -1);
  await shot('wizard-plis'); await tap('[data-a=wzSave]');
  await shot('wizard');

  // ---------- Jeu de dés ----------
  await startGame('farkle', ['Roger', 'Marie', 'Léa']);
  await p.fill('#fk-man', '1500'); await tap('[data-a=fkAddMan]'); await tap('[data-a=fkBank]');
  for (const v of [1, 1, 1, 5]) await tap(`[data-a=fkDie][data-v="${v}"]`);
  await shot('des');
  await tap('[data-a=fkClear]'); await tap('[data-a=voice]'); await p.waitForTimeout(150);
  await shot('des-voix');
  await tap('[data-a=fkClear]');
  await p.evaluate(() => { const g = curGame(); g.turns.push({ pk: g.players[2].key, pts: 21000, raw: 21000, note: 'Entré !', t: Date.now() }); g.cur = 2; save(); render(); });
  await p.fill('#fk-man', '300'); await tap('[data-a=fkAddMan]');
  await shot('des-zone');

  // ---------- Règles ----------
  await tap('[data-a=rules]'); await shot('regles'); await tap('[data-a=back]');

  // ---------- Assistant ----------
  await p.route('**/pointage-ia.rogerotisqc.workers.dev/', r => r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true,"ready":true,"tts":true}' }));
  await p.route('**/pointage-ia.rogerotisqc.workers.dev/**', r => r.request().method() === 'OPTIONS'
    ? r.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    : r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: 'Ta mise de 2 est ratée de 2 plis : tu perds 20 points (−10 par pli d’écart).\nSi tu avais misé 4, tu aurais eu 20 + 10 × 4 = 60 points.', sources: [] }) }));
  await startGame('wizard', ['Roger', 'Marie', 'Léa']);
  await tap('.top [data-a=ask]');
  await p.fill('#askQ', 'J’ai misé 2 et fait 4 plis, combien j’ai ?'); await p.keyboard.press('Enter');
  await p.waitForSelector('[data-a=askLocal]');
  await shot('assistant');
  await ctx.setOffline(true);
  await p.fill('#askQ', 'Qui doit brasser ?'); await p.keyboard.press('Enter');
  await shot('assistant-horsligne');
  await ctx.setOffline(false);
  await p.evaluate(() => { const g = db.games.filter(x => x.type === 'farkle' && !x.finished).pop(); tab('home'); go('sheet', { gameId: g.id }); });

  // ---------- Rapport ----------
  await tap('[data-a=menu]'); await tap('[data-a=feedback]');
  await p.fill('#fbMsg', 'Au Mille Bornes, j’aimerais pouvoir jouer en équipes de deux.'); await tap('[data-a=fbType][data-v=suggestion]');
  await shot('rapport'); await tap('[data-a=close]');

  // ---------- Résultat ----------
  await p.evaluate(() => { tab('home'); });
  await p.evaluate(() => { const g = db.games.find(x => x.type === 'flip7' && !x.finished); S.gameId = g.id; });
  await p.evaluate(() => { const g = db.games.find(x => x.type === 'flip7' && !x.finished); A.open({ dataset: { id: g.id } }); });
  await tap('[data-a=menu]'); await tap('[data-a=finish]'); await shot('resultat', { fullPage: true });

  // ---------- Accueil, historique, stats, réglages ----------
  await p.evaluate(() => tab('home')); await shot('accueil');
  await p.evaluate(() => { const h = [...document.querySelectorAll('h2.sec')].find(x => /Nouvelle/.test(x.textContent)); window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 90); }); await shot('accueil-tuiles');
  await tap('[data-a=tab][data-v=history]'); await shot('historique');
  await tap('[data-a=tab][data-v=stats]'); await shot('statistiques', { fullPage: true });
  await tap('[data-a=statPlayer] >> nth=0'); await shot('fiche-joueur'); await tap('[data-a=close]');
  await tap('[data-a=statF][data-v=flip7]'); await p.evaluate(() => window.scrollTo(0, 99999)); await shot('records');
  await p.evaluate(() => tab('home')); await tap('[data-a=go][data-v=settings]'); await tap('[data-a=checkUp]'); await p.waitForTimeout(100);
  await shot('reglages', { fullPage: true });
  await tap('button[data-a=qrBig] >> nth=1'); await shot('partager'); await tap('[data-a=close]');

  // ---------- Page d'installation ----------
  const p2 = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36' })).newPage();
  await p2.goto(LANDING); await p2.screenshot({ path: path.join(OUT, 'installation.png') });

  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
