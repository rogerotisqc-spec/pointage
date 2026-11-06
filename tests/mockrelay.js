// Relais IA simulé pour les tests (port 8788) : /ask, /tts, /live/*, /sync/*
const http = require('http'), fs = require('fs');
http.createServer((req, res) => {
  const H = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, X-App-Token','Access-Control-Allow-Methods':'POST, GET, OPTIONS'};
  if (req.method === 'OPTIONS') { res.writeHead(204, H); return res.end(); }
  if (req.method === 'GET' && req.url === '/syncstat') { res.writeHead(200, H); return res.end(JSON.stringify({puts: global.SYNC_PUTS||0, groups: Object.keys(global.SYNC||{}).length, size: Object.values(global.SYNC||{}).map(r=>r.data.length)})); }
  if (req.method === 'GET' && req.url === '/off') { global.LIVE_OFF = !global.LIVE_OFF; res.writeHead(200, H); return res.end(String(global.LIVE_OFF)); }
  if (req.method === 'GET') { res.writeHead(200, {...H,'Content-Type':'application/json'}); return res.end(JSON.stringify({ok:true, ready:true, tts:true})); }
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    const j = JSON.parse(b || '{}'); const tok = req.headers['x-app-token'];
    fs.appendFileSync((process.env.MOCK_LOG || require('path').join(__dirname, '.work', 'mockai.log')), JSON.stringify({path:req.url, tok, ...j}) + '\n');
    if (req.url.startsWith('/sync/')) {
      const Y = global.SYNC || (global.SYNC = {}); const act = req.url.slice(6); const send = (c, o) => { res.writeHead(c, {...H,'Content-Type':'application/json'}); res.end(JSON.stringify(o)); };
      const row = Y[j.id];
      if (act === 'get') { if (!row) return send(404, {none:true}); if (j.ver === row.ver) return send(200, {ver:row.ver, same:true}); return send(200, {ver:row.ver, iv:row.iv, data:row.data}); }
      if (row && row.tok !== j.tok) return send(403, {error:'Accès refusé'});
      if ((row ? row.ver : 0) !== j.ver) return send(409, {conflict:true, ver: row ? row.ver : 0});
      Y[j.id] = {tok:j.tok, ver:(row?row.ver:0)+1, iv:j.iv, data:j.data}; global.SYNC_PUTS = (global.SYNC_PUTS||0)+1; return send(200, {ok:true, ver:Y[j.id].ver});
    }
    if (req.url.startsWith('/live/')) {
      const L = global.LIVE || (global.LIVE = {}); const act = req.url.slice(6); const send = (c, o) => { res.writeHead(c, {...H,'Content-Type':'application/json'}); res.end(JSON.stringify(o)); };
      if (global.LIVE_OFF) return send(503, {error:'Partage en direct pas encore configuré'});
      const row = L[j.id];
      const M2 = global.MSGS || (global.MSGS = []);
      if (act === 'send') { if (!row) return send(404, {gone:true}); M2.push({gid:j.id, seq:M2.length+1, iv:j.iv, data:j.data}); return send(200, {ok:true}); }
      if (act === 'inbox') { if (!row) return send(404, {gone:true}); if (row.tok !== j.tok) return send(403, {error:'Accès refusé'}); return send(200, {msgs: M2.filter(m => m.gid === j.id && m.seq > (j.after||0)).slice(0,50).map(m => ({seq:m.seq, iv:m.iv, data:m.data}))}); }
      if (act === 'get') { if (!row) return send(404, {gone:true}); if (j.ver === row.ver) return send(200, {ver:row.ver, same:true}); return send(200, {ver:row.ver, iv:row.iv, data:row.data}); }
      if (row && row.tok !== j.tok) return send(403, {error:'Accès refusé'});
      if (act === 'del') { delete L[j.id]; return send(200, {ok:true}); }
      L[j.id] = {tok:j.tok, ver:(row?row.ver:0)+1, iv:j.iv, data:j.data}; return send(200, {ok:true, ver:L[j.id].ver});
    }
    if (req.url === '/tts') { if (/PANNEVOIX/.test(j.text)) { res.writeHead(502, {...H,'Content-Type':'application/json'}); return res.end('{"error":"x"}'); } res.writeHead(200, {...H,'Content-Type':'audio/mpeg'}); return res.end(fs.readFileSync(require('path').join(__dirname, 'beep.mp3'))); }
    if (/panne/.test(j.q)) { res.writeHead(502, {...H,'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'L’IA ne répond pas : test'})); }
    setTimeout(() => { res.writeHead(200, {...H,'Content-Type':'application/json'}); res.end(JSON.stringify(j.recap ? {answer: (j.mode==='analyse' ? 'Points tournants : manche 2.\nErreurs et occasions manquées : mise ratée.\nPour la prochaine fois : Roger, misez moins.' : 'Suivi sur la partie.'), sources:[], tts:true, recap:true} : {answer: /vxko/.test(j.q) ? 'PANNEVOIX réponse' : 'Ta mise de 2 est ratée de 2 plis : −20 points.\nAvec ta mise exacte, tu aurais eu 20 + 10 × 2 = 40.', sources:[{url:'https://example.com/wizard', title:'Règles Wizard'}], tts:true})); }, /lent/.test(j.q) ? 3000 : 300);
  });
}).listen(8788);
