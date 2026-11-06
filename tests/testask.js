const T = require('./_env');
const { chromium } = require('playwright');
const QS = [
  ['comment je corrige une manche', null], ['je me suis trompé de pointage', null], ['qui doit brasser', null],
  ['comment on gagne au uno', null], ['au wizard combien vaut une mise ratée', null], ['combien de points pour une mise réussie', 'wizard'],
  ['au skyjo est-ce qu on double si on termine', null], ['quand est-ce qu on perd 1000 points au jeu de dés', null],
  ['combien vaut un joker', 'uno'], ['comment ajouter un invité', null], ['comment empêcher l écran de pivoter', null],
  ['comment faire une sauvegarde', null], ['c est quoi le coup fourré', null], ['combien de cartes au skip bo', null],
  ['combien vaut une colonne de trois cartes pareilles', 'skyjo'], ['comment marche le mot compte triple', null],
  ['trois un ça vaut combien aux dés', null], ['comment on joue en équipe', null], ['la voix comprend mal', null],
  ['qu est-ce que la phase 4', null], ['comment installer sur iphone', null], ['xylophone banane', null], ['quelle est la règle de la sortie exacte', 'farkle']
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 }); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(T.build);
  await p.evaluate(() => { db.house.uno = 'On peut empiler les +2 et les +4.'; });
  for (const [q, g] of QS) {
    const r = await p.evaluate(([q, g]) => { const R = helpSearch(q, g); return { cov: R.cov.toFixed(2), top: R.list.slice(0, 2).map(x => `${x.u.title} [${x.score.toFixed(1)}] « ${x.u.paras[x.i].slice(0, 70)} »`) }; }, [q, g]);
    console.log(`\n? ${q}${g ? ' (' + g + ')' : ''} — cov ${r.cov}\n  1. ${r.top[0] || '—'}\n  2. ${r.top[1] || '—'}`);
  }
  console.log('\nERRORS', JSON.stringify(errs)); await b.close();
})();
