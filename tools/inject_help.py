#!/usr/bin/env python3
"""Insère le texte du manuel dans l'app pour l'assistant hors ligne.

Usage : inject_help.py <index.html à modifier> [manual/index.html]
Remplace le contenu entre /*HELP*/ et /*HELP*/ par la liste des passages du manuel :
[{id, t (titre), g (jeu ou ''), kw (mots-clés), p: [paragraphes]}]
"""
import json, os, re, sys
from bs4 import BeautifulSoup, NavigableString

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
target = sys.argv[1]
manual = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, 'manual/index.html')

GAME_OF = {'libre': 'generic', 'playnine': 'playnine', 'flip7': 'flip7', 'uno': 'uno', 'skipbo': 'skipbo',
           'millebornes': 'millebornes', 'phase10': 'phase10', 'scrabble': 'scrabble', 'skyjo': 'skyjo',
           'wizard': 'wizard', 'des': 'farkle', 'voix': 'farkle'}

def clean(t):
    return re.sub(r'\s+', ' ', t).strip()

soup = BeautifulSoup(open(manual, encoding='utf-8').read(), 'html.parser')
units = []
for sec in soup.select('section.s'):
    h2 = sec.find('h2')
    if not h2:
        continue
    n = h2.find(class_='n')
    if n:
        n.extract()
    stitle, skw, sid = clean(h2.get_text()), sec.get('data-kw', ''), sec.get('id', '')
    cur = {'id': sid, 't': stitle, 'g': '', 'kw': skw, 'p': []}
    units.append(cur)
    for el in sec.find_all(['h3', 'p', 'li', 'div']):
        if el.name == 'h3':
            hid = el.get('id')
            title = clean(el.get_text())
            kwdiv = el.find_next(lambda x: x.name == 'div' and x.has_attr('data-kw'))
            kw = kwdiv.get('data-kw', '') if (hid and kwdiv) else ''
            cur = {'id': hid or sid, 't': stitle + ' › ' + title, 'g': GAME_OF.get(hid, ''), 'kw': (kw + ' ' + skw).strip(), 'p': []}
            if not hid:  # questions fréquentes : la question compte comme mots-clés
                cur['kw'] = title + ' ' + skw
            units.append(cur)
        elif el.name in ('p', 'li') or (el.name == 'div' and 'tip' in (el.get('class') or [])):
            if el.find_parent('figure') or (el.name == 'p' and el.find_parent('li')) or (el.name == 'li' and el.find_parent('div', class_='tip')):
                continue
            if el.name == 'p' and el.find_parent('div', class_='tip'):
                continue
            t = clean(el.get_text(' '))
            t = re.sub(r'\s+([,.;:!?»)])', r'\1', t).replace('« ', '« ').replace('( ', '(')
            if len(t) > 12:
                cur['p'].append(t)
units = [u for u in units if u['p']]
data = json.dumps(units, ensure_ascii=False, separators=(',', ':'))
s = open(target, encoding='utf-8').read()
s2, n = re.subn(r'/\*HELP\*/.*?/\*HELP\*/', lambda m: '/*HELP*/' + data + '/*HELP*/', s, count=1, flags=re.S)
if not n:
    sys.exit('marqueur /*HELP*/ absent de ' + target)
open(target, 'w', encoding='utf-8').write(s2)
print('aide du manuel insérée :', len(units), 'passages,', len(data) // 1024, 'Ko')
