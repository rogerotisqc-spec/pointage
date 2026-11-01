#!/usr/bin/env python3
"""Remplace __FB_KEY__ par la clé des rapports (keystore/feedback.key), encodée et découpée.
Sans fichier de clé, le bouton de rapport met les rapports en attente sans les envoyer."""
import base64, os, sys
here = os.path.dirname(os.path.abspath(__file__))
kf = os.path.join(here, "..", "keystore", "feedback.key")
path = sys.argv[1]
s = open(path, encoding="utf-8").read()
if os.path.exists(kf):
    key = open(kf).read().strip()
    b = base64.b64encode(key.encode()).decode()
    parts = [b[i:i+9] for i in range(0, len(b), 9)]
    s = s.replace("__FB_KEY__", ".".join(reversed(parts)))
    open(path, "w", encoding="utf-8").write(s)
    print("clé des rapports injectée")
else:
    print("aucune clé de rapports (keystore/feedback.key absent)")
# Jeton du relais IA (keystore/ai.token), même encodage
tf = os.path.join(here, "..", "keystore", "ai.token")
if os.path.exists(tf):
    s = open(path, encoding="utf-8").read()
    b = base64.b64encode(open(tf).read().strip().encode()).decode()
    s = s.replace("__AI_TOKEN__", ".".join(reversed([b[i:i+9] for i in range(0, len(b), 9)])))
    open(path, "w", encoding="utf-8").write(s)
    print("jeton IA injecté")
