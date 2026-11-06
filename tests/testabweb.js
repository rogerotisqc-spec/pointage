const T = require('./_env');
const { chromium } = require('playwright');
const S=T.dir;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:900,height:900} });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.addInitScript(() => {
    window.__files = {}; window.__perm = 'granted';
    const dir = { name: 'Documents', queryPermission: async () => window.__perm, requestPermission: async () => (window.__perm = 'granted'),
      getFileHandle: async (n) => ({ createWritable: async () => { let buf=''; return { write: async d => { buf += d; }, close: async () => { window.__files[n] = buf.length; } }; } }) };
    window.showDirectoryPicker = async () => dir;
  });
  await p.goto(T.src);
  await p.click('[data-a=go][data-v=settings]'); await p.click('[data-a=abToggle]'); await p.waitForTimeout(300);
  console.log('fichiers :', await p.evaluate(() => JSON.stringify(window.__files)));
  await p.screenshot({path: S+'/shots/abw-1.png', fullPage:true});
  // permission perdue (réouverture) → bandeau, puis reprise d'un clic
  await p.evaluate(() => { window.__perm = 'prompt'; window.__files = {}; db.players.push({id:'z', name:'Zed', color:'#000'}); save(); autoBackupNow(); });
  await p.waitForTimeout(300); await p.evaluate(() => tab('home')); await p.waitForTimeout(100);
  console.log('bandeau pause :', await p.$('[data-a=abResume]') ? 'oui' : 'non', '| fichiers :', await p.evaluate(() => Object.keys(window.__files).length));
  await p.click('[data-a=abResume]'); await p.waitForTimeout(300);
  console.log('après autorisation :', await p.evaluate(() => JSON.stringify(window.__files)), '| bandeau :', await p.$('[data-a=abResume]') ? 'oui' : 'non');
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
