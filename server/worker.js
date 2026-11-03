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
- Si on te demande qui tu es, réponds que tu es Ludo, l’assistant de jeux de l’app Pointage.
- Ne dis pas d’où vient l’information (manuel, résumé, Internet, sources) et ne rappelle pas les règles maison si on ne te le demande pas : va droit à la réponse.`;

async function askClaude(env, body) {
  const manual = await manualText();
  const ctx = [];
  if (body.gameName) ctx.push(`Jeu en cours : ${cut(body.gameName, 60)}.`);
  if (body.house) ctx.push(`Nos règles maison (prioritaires) :\n${cut(body.house, 3000)}`);
  if (body.rules) ctx.push(`Résumé des règles de ce jeu dans l’app :\n${cut(body.rules, 4000)}`);
  ctx.push(`Question : ${cut(body.q, 500)}`);
  const messages = [];
  (Array.isArray(body.history) ? body.history.slice(-3) : []).forEach(h => {
    if (h && h.q && h.a) { messages.push({ role: 'user', content: cut(h.q, 500) }, { role: 'assistant', content: cut(h.a, 1500) }); }
  });
  messages.push({ role: 'user', content: ctx.join('\n\n') });
  const system = [{ type: 'text', text: SYSTEM }];
  if (manual) system.push({ type: 'text', text: 'Manuel d’utilisation de l’app :\n\n' + manual, cache_control: { type: 'ephemeral' } });
  const req = { model: MODEL, max_tokens: 2000, system, messages };
  if (env.WEB_SEARCH !== 'off') req.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2,
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
  if (!answer) throw new Error('réponse vide (' + (stop || '?') + ')');
  return { answer, sources: sources.slice(0, 4), searched, stop, tts: !!env.GOOGLE_TTS_KEY };
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
    if (request.method === 'GET') return json({ ok: true, service: 'pointage-ia', ready: !!(env.ANTHROPIC_API_KEY && env.APP_TOKEN), tts: !!env.GOOGLE_TTS_KEY });
    if (request.method !== 'POST' || (url.pathname !== '/ask' && url.pathname !== '/tts')) return json({ error: 'Adresse inconnue' }, 404);
    if (!env.ANTHROPIC_API_KEY || !env.APP_TOKEN) return json({ error: 'Relais pas encore configuré' }, 503);
    if (request.headers.get('X-App-Token') !== env.APP_TOKEN) return json({ error: 'Accès refusé' }, 403);
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'Requête illisible' }, 400); }
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
