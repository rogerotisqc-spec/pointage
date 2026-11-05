// Relais IA de l'app Pointage (Cloudflare Worker).
// Garde la clé Anthropic hors de l'app : l'app envoie la question ici, le relais interroge Claude et renvoie la réponse.
//
// Réglages du Worker (Settings → Variables and Secrets) :
//   ANTHROPIC_API_KEY  (secret)  clé sk-ant-… de la console Anthropic
//   APP_TOKEN          (secret)  jeton partagé avec l'app (refuse les appels qui ne viennent pas de Pointage)
//   DAILY_MAX          (texte, facultatif)  nombre maximal de questions par jour pour tout le monde (défaut 300)
//   IP_MAX             (texte, facultatif)  nombre maximal de questions par jour par appareil (défaut 60)
//   WEB_SEARCH         (texte, facultatif)  "off" pour interdire la recherche sur Internet
//   GOOGLE_TTS_KEY     (secret, facultatif) clé Google Cloud Text-to-Speech : voix naturelle (adresse /tts)
// Liaison KV facultative (Settings → Bindings) : nom LIMITS, pour compter les questions.
// Liaison D1 facultative (Settings → Bindings) : nom DB, pour les parties en direct (adresses /live/…).
//   Le relais ne garde que des données chiffrées par les téléphones (la clé reste dans le code QR) ; effacées après 3 jours.

const MODEL = 'claude-haiku-5-5';
const MANUAL_URL = 'https://rogerotisqc-spec.github.io/pointage/manuel/';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
  'Access-Control-Max-Age': '86400'
};

let MANUAL = { text: '', at: 0 };

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
}
function cut(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }

async function manualText() {
  if (MANUAL.text && Date.now() - MANUAL.at < 6 * 3600e3) return MANUAL.text;
  try {
    const r = await fetch(MANUAL_URL, { cf: { cacheTtl: 21600, cacheEverything: true } });
    let h = await r.text();
    h = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<header[\s\S]*?<\/header>|<nav[\s\S]*?<\/nav>/gi, ' ');
    const main = (h.match(/<main[\s\S]*<\/main>/i) || [h])[0];
    const t = main
      .replace(/<h[23][^>]*>/gi, '\n\n## ').replace(/<\/h[23]>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n- ').replace(/<\/(p|div|li|figcaption)>/gi, '\n')
      .replace(/<figure[\s\S]*?<\/figure>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&rsquo;|&#8217;/g, '’')
      .replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
    if (t.length > 1000) MANUAL = { text: cut(t, 60000), at: Date.now() };
  } catch (e) { /* on garde l'ancienne copie */ }
  return MANUAL.text;
}

async function overLimit(env, ip) {
  if (!env.LIMITS) return null;
  const day = new Date().toISOString().slice(0, 10);
  const kAll = 'd:' + day, kIp = 'ip:' + day + ':' + ip;
  const [all, mine] = await Promise.all([env.LIMITS.get(kAll), env.LIMITS.get(kIp)]);
  const nAll = +all || 0, nIp = +mine || 0;
  if (nAll >= (+env.DAILY_MAX || 300)) return 'La limite de questions du jour est atteinte. Réessayez demain.';
  if (nIp >= (+env.IP_MAX || 60)) return 'Vous avez atteint la limite de questions pour aujourd’hui.';
  await Promise.all([
    env.LIMITS.put(kAll, String(nAll + 1), { expirationTtl: 172800 }),
    env.LIMITS.put(kIp, String(nIp + 1), { expirationTtl: 172800 })
  ]);
  return null;
}

const SYSTEM = `Tu t’appelles Ludo. Tu es l’assistant de « Pointage », une app familiale (Android et web) de feuilles de pointage pour les jeux de société, utilisée au Québec.
Tu réponds aux questions sur les règles des jeux et sur l’utilisation de l’app.

Façon de répondre :
- En français du Québec, avec des mots simples, en tutoyant ou vouvoyant comme la question.
- Court : 2 à 5 phrases (au plus 120 mots), sauf si on te demande des détails. La réponse est souvent lue à voix haute pendant une partie : pas de tableaux, pas de titres, pas de markdown, peu de listes.
- Les règles maison de la famille passent toujours avant les règles officielles. Le résumé des règles fourni avec la question est celui de l’app : il contient les règles de la famille (par exemple au jeu de dés).
- Pour une question sur l’app (boutons, écrans, réglages), fie-toi au manuel ci-dessous ; n’invente pas de fonction qui n’y est pas.
- Pour un calcul de points, fais-le avec soin et donne le résultat avec le détail en une phrase.
- Cherche sur Internet seulement si la réponse n’est ni dans le résumé des règles, ni dans les règles maison, ni dans le manuel. N’écris rien avant de chercher. Si tu n’es pas sûr, dis-le simplement.
- Quand c’est utile (question de stratégie, choix à faire pendant la partie, situation délicate), termine par une courte recommandation pratique, en une phrase. Pas de recommandation pour une simple question de règle ou d’utilisation de l’app.
- Si on te demande qui tu es, réponds que tu es Ludo, l’assistant de jeux de l’app Pointage.
- Ne dis pas d’où vient l’information (manuel, résumé, Internet, sources) et ne rappelle pas les règles maison si on ne te le demande pas : va droit à la réponse.`;

const ANALYSE = `Analyse d’une partie : on te donne le récapitulatif d’une partie inscrite dans l’app (manches ou tours, détails propres au jeu, et « faits calculés par l’app », qui sont exacts : ne refais pas les additions et ne les contredis pas).
Quand on te demande d’analyser la partie, réponds en 4 courts paragraphes, chacun commençant par son petit titre suivi de deux-points (pas de markdown, pas d’astérisques) :
Points tournants : les 2 ou 3 moments où la partie a basculé (nomme la manche ou le tour et les joueurs).
Erreurs et occasions manquées : ce que les données montrent vraiment (mise ratée, case rayée, prime manquée, raté avec pénalité, gros paquet de cartes ou de dominos en main, pointage doublé…). N’invente aucun coup qui n’est pas dans les données ; si on n’a que des totaux, dis-le en une phrase et reste prudent.
Recommandations : 2 ou 3 conseils de stratégie reconnus pour ce jeu, choisis parce qu’ils auraient aidé dans cette partie-ci (par exemple au Yahtzee, viser la prime de 35 en remplissant tôt les Cinq et les Six ; au Wizard, miser prudemment quand on a peu d’atouts). Respecte nos règles maison.
Pour la prochaine fois : un conseil concret et court pour chaque joueur.
Ton chaleureux et un brin taquin, jamais méchant ; félicite le gagnant. Au plus 320 mots.
Pour une question de suivi sur la partie, réponds court (2 à 5 phrases) en te servant du récapitulatif.`;

async function askClaude(env, body) {
  const manual = await manualText();
  const ctx = [];
  if (body.gameName) ctx.push(`Jeu en cours : ${cut(body.gameName, 60)}.`);
  if (body.house) ctx.push(`Nos règles maison (prioritaires) :\n${cut(body.house, 3000)}`);
  if (body.rules) ctx.push(`Résumé des règles de ce jeu dans l’app :\n${cut(body.rules, 4000)}`);
  const recap = body.recap ? cut(body.recap, 16000) : '';
  if (recap) ctx.push(`Récapitulatif de la partie (données de l’app) :\n${recap}`);
  const analyse = !!recap && body.mode === 'analyse';
  if (analyse) ctx.push('Fais l’analyse demandée de cette partie.');
  ctx.push(`Question : ${cut(body.q, 500)}`);
  const messages = [];
  (Array.isArray(body.history) ? body.history.slice(-3) : []).forEach(h => {
    if (h && h.q && h.a) { messages.push({ role: 'user', content: cut(h.q, 500) }, { role: 'assistant', content: cut(h.a, 1500) }); }
  });
  messages.push({ role: 'user', content: ctx.join('\n\n') });
  const system = [{ type: 'text', text: SYSTEM + (recap ? '\n\n' + ANALYSE : '') }];
  if (manual) system.push({ type: 'text', text: 'Manuel d’utilisation de l’app :\n\n' + manual, cache_control: { type: 'ephemeral' } });
  // La réflexion du modèle (activée d’office) compte dans max_tokens : on laisse beaucoup de place.
  const req = { model: MODEL, max_tokens: analyse ? 10000 : 6000, system, messages };
  // Pour l’analyse, les faits sont déjà calculés par l’app : peu de réflexion suffit (plus rapide, moins cher)
  const effort = body._effort || (analyse ? 'low' : '');
  if (effort) req.output_config = { effort };
  if (env.WEB_SEARCH !== 'off' && !analyse) req.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2,
    user_location: { type: 'approximate', region: 'Quebec', country: 'CA', timezone: 'America/Toronto' } }];

  let out = [], searched = 0, stop = '';
  for (let i = 0; i < 3; i++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(req)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + r.status));
    out = out.concat(data.content || []);
    searched += (data.content || []).filter(b => b.type === 'server_tool_use').length;
    stop = data.stop_reason || '';
    if (stop !== 'pause_turn') break;
    req.messages = messages.concat([{ role: 'assistant', content: data.content }]);
  }
  // Après une recherche, on garde seulement le texte écrit après les derniers résultats (sinon la réponse se répète)
  let last = -1; out.forEach((b, i) => { if (b.type === 'web_search_tool_result') last = i; });
  const answer = out.slice(last + 1).filter(b => b.type === 'text').map(b => b.text).join('').replace(/\*\*/g, '').trim();
  const seen = new Set(), sources = [];
  out.forEach(b => (b.citations || []).forEach(c => { if (c.url && !seen.has(c.url)) { seen.add(c.url); sources.push({ url: c.url, title: c.title || c.url }); } }));
  if (!answer && stop === 'max_tokens' && !body._retry && !analyse) {
    // Réflexion trop longue : on réessaie une fois en demandant moins d’effort
    return askClaude(env, { ...body, _retry: true, _effort: 'low' });
  }
  if (!answer) throw new Error('réponse vide (' + (stop || '?') + ')');
  return { answer, sources: sources.slice(0, 4), searched, stop, tts: !!env.GOOGLE_TTS_KEY, recap: !!recap };
}


/* ---------- Parties en direct ---------- */
// Le téléphone qui tient la feuille envoie la partie chiffrée (put) ; les autres la relisent (get) toutes les quelques secondes.
const LIVE_TTL = 3 * 24 * 3600e3, LIVE_MAX = 400000;
let LIVE_READY = false;
async function liveInit(db) {
  if (LIVE_READY) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS live (id TEXT PRIMARY KEY, tokh TEXT NOT NULL, ver INTEGER NOT NULL, iv TEXT NOT NULL, data TEXT NOT NULL, upd INTEGER NOT NULL)'),
    db.prepare('CREATE INDEX IF NOT EXISTS live_upd ON live (upd)'),
    // Boîte de réception : les points envoyés par les autres téléphones (chiffrés), lus par le téléphone qui tient la feuille
    db.prepare('CREATE TABLE IF NOT EXISTS livemsg (seq INTEGER PRIMARY KEY AUTOINCREMENT, gid TEXT NOT NULL, iv TEXT NOT NULL, data TEXT NOT NULL, upd INTEGER NOT NULL)'),
    db.prepare('CREATE INDEX IF NOT EXISTS livemsg_gid ON livemsg (gid, seq)')
  ]);
  LIVE_READY = true;
}
async function sha(t) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function live(env, action, b) {
  if (!env.DB) return json({ error: 'Partage en direct pas encore configuré' }, 503);
  const id = String(b.id || ''), tok = String(b.tok || '');
  if (!/^[A-Za-z0-9_-]{12}$/.test(id)) return json({ error: 'Partie inconnue' }, 400);
  await liveInit(env.DB);
  if (action === 'get') {
    const row = await env.DB.prepare('SELECT ver, iv, data FROM live WHERE id = ?').bind(id).first();
    if (!row) return json({ gone: true }, 404);
    if (+b.ver === row.ver) return json({ ver: row.ver, same: true });
    return json({ ver: row.ver, iv: row.iv, data: row.data });
  }
  if (action === 'send') {
    const iv = String(b.iv || ''), data = String(b.data || '');
    if (!iv || !data || data.length > 4000) return json({ error: 'Message trop gros ou vide' }, 400);
    const ok = await env.DB.prepare('SELECT ver FROM live WHERE id = ?').bind(id).first();
    if (!ok) return json({ gone: true }, 404);
    await env.DB.prepare('INSERT INTO livemsg (gid, iv, data, upd) VALUES (?, ?, ?, ?)').bind(id, iv, data, Date.now()).run();
    return json({ ok: true });
  }
  if (!/^[A-Za-z0-9_-]{22}$/.test(tok)) return json({ error: 'Accès refusé' }, 403);
  const h = await sha(tok);
  const row = await env.DB.prepare('SELECT tokh, ver FROM live WHERE id = ?').bind(id).first();
  if (row && row.tokh !== h) return json({ error: 'Accès refusé' }, 403);
  if (action === 'del') {
    if (row) await env.DB.batch([env.DB.prepare('DELETE FROM live WHERE id = ?').bind(id), env.DB.prepare('DELETE FROM livemsg WHERE gid = ?').bind(id)]);
    return json({ ok: true });
  }
  if (action === 'inbox') {
    if (!row) return json({ gone: true }, 404);
    const r = await env.DB.prepare('SELECT seq, iv, data FROM livemsg WHERE gid = ? AND seq > ? ORDER BY seq LIMIT 50').bind(id, +b.after || 0).all();
    return json({ msgs: r.results || [] });
  }
  const iv = String(b.iv || ''), data = String(b.data || '');
  if (!iv || !data || data.length > LIVE_MAX) return json({ error: 'Partie trop grosse ou vide' }, 400);
  const ver = (row ? row.ver : 0) + 1, now = Date.now();
  await env.DB.prepare('INSERT OR REPLACE INTO live (id, tokh, ver, iv, data, upd) VALUES (?, ?, ?, ?, ?, ?)').bind(id, h, ver, iv, data, now).run();
  if (Math.random() < 0.05) await env.DB.batch([env.DB.prepare('DELETE FROM live WHERE upd < ?').bind(now - LIVE_TTL), env.DB.prepare('DELETE FROM livemsg WHERE upd < ?').bind(now - LIVE_TTL)]);
  return json({ ok: true, ver });
}

/* ---------- Synchronisation des appareils d’une même personne ---------- */
// Chaque groupe d’appareils garde ici une seule copie chiffrée de ses données (la clé reste dans les appareils).
// Écriture avec un numéro de version : si un autre appareil a écrit entre-temps, réponse 409 et l’appareil recombine.
const SYNC_MAX = 1900000, SYNC_TTL = 400 * 24 * 3600e3;
let SYNC_READY = false;
async function sync(env, action, b) {
  if (!env.DB) return json({ error: 'Synchronisation pas encore configurée' }, 503);
  const id = String(b.id || ''), tok = String(b.tok || '');
  if (!/^[A-Za-z0-9_-]{12}$/.test(id)) return json({ error: 'Groupe inconnu' }, 400);
  if (!SYNC_READY) { await env.DB.prepare('CREATE TABLE IF NOT EXISTS sync (id TEXT PRIMARY KEY, tokh TEXT NOT NULL, ver INTEGER NOT NULL, iv TEXT NOT NULL, data TEXT NOT NULL, upd INTEGER NOT NULL)').run(); SYNC_READY = true; }
  if (action === 'get') {
    const row = await env.DB.prepare('SELECT ver, iv, data FROM sync WHERE id = ?').bind(id).first();
    if (!row) return json({ none: true }, 404);
    if (+b.ver === row.ver) return json({ ver: row.ver, same: true });
    return json({ ver: row.ver, iv: row.iv, data: row.data });
  }
  if (!/^[A-Za-z0-9_-]{22}$/.test(tok)) return json({ error: 'Accès refusé' }, 403);
  const h = await sha(tok), row = await env.DB.prepare('SELECT tokh, ver FROM sync WHERE id = ?').bind(id).first();
  if (row && row.tokh !== h) return json({ error: 'Accès refusé' }, 403);
  const iv = String(b.iv || ''), data = String(b.data || '');
  if (!iv || !data || data.length > SYNC_MAX) return json({ error: 'Données trop grosses ou vides' }, 400);
  if ((row ? row.ver : 0) !== +b.ver) return json({ conflict: true, ver: row ? row.ver : 0 }, 409);
  const ver = (row ? row.ver : 0) + 1, now = Date.now();
  await env.DB.prepare('INSERT OR REPLACE INTO sync (id, tokh, ver, iv, data, upd) VALUES (?, ?, ?, ?, ?, ?)').bind(id, h, ver, iv, data, now).run();
  if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM sync WHERE upd < ?').bind(now - SYNC_TTL).run();
  return json({ ok: true, ver });
}

const VOICES = ['Aoede', 'Kore', 'Leda', 'Charon', 'Puck', 'Orus'];
async function synth(env, text, voice, rate) {
  const name = 'fr-CA-Chirp3-HD-' + (VOICES.includes(voice) ? voice : 'Aoede');
  const body = { input: { text: cut(text, 1500) }, voice: { languageCode: 'fr-CA', name }, audioConfig: { audioEncoding: 'MP3' } };
  if (rate && Math.abs(rate - 1) > 0.01) body.audioConfig.speakingRate = Math.min(1.5, Math.max(0.7, rate));
  const call = b => fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(env.GOOGLE_TTS_KEY),
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  let r = await call(body);
  if (!r.ok && body.audioConfig.speakingRate) { delete body.audioConfig.speakingRate; r = await call(body); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.audioContent) throw new Error((d.error && d.error.message) || ('HTTP ' + r.status));
  const bin = atob(d.audioContent), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    if (request.method === 'GET') return json({ ok: true, service: 'pointage-ia', ready: !!(env.ANTHROPIC_API_KEY && env.APP_TOKEN), tts: !!env.GOOGLE_TTS_KEY, live: !!env.DB });
    const lv = url.pathname.match(/^\/live\/(get|put|del|send|inbox)$/), sy = url.pathname.match(/^\/sync\/(get|put)$/);
    if (request.method !== 'POST' || (!lv && !sy && url.pathname !== '/ask' && url.pathname !== '/tts')) return json({ error: 'Adresse inconnue' }, 404);
    if (!env.APP_TOKEN || (!lv && !sy && !env.ANTHROPIC_API_KEY)) return json({ error: 'Relais pas encore configuré' }, 503);
    if (request.headers.get('X-App-Token') !== env.APP_TOKEN) return json({ error: 'Accès refusé' }, 403);
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'Requête illisible' }, 400); }
    if (sy) {
      try { return await sync(env, sy[1], body || {}); }
      catch (e) { return json({ error: 'Synchronisation indisponible : ' + cut(e.message, 200) }, 502); }
    }
    if (lv) {
      try { return await live(env, lv[1], body || {}); }
      catch (e) { return json({ error: 'Partage indisponible : ' + cut(e.message, 200) }, 502); }
    }
    if (url.pathname === '/tts') {
      if (!env.GOOGLE_TTS_KEY) return json({ error: 'Voix naturelle pas configurée' }, 503);
      if (!body || !String(body.text || '').trim()) return json({ error: 'Texte vide' }, 400);
      try {
        const audio = await synth(env, String(body.text), String(body.voice || ''), +body.rate || 1);
        return new Response(audio, { headers: { ...CORS, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
      } catch (e) { return json({ error: 'Voix indisponible : ' + cut(e.message, 200) }, 502); }
    }
    if (!body || !String(body.q || '').trim()) return json({ error: 'Question vide' }, 400);
    const lim = await overLimit(env, request.headers.get('CF-Connecting-IP') || 'inconnu');
    if (lim) return json({ error: lim, limit: true }, 429);
    try { return json(await askClaude(env, body)); }
    catch (e) { return json({ error: 'L’IA ne répond pas : ' + cut(e.message, 200) }, 502); }
  }
};
