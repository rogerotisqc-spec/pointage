#!/usr/bin/env python3
"""Produit la version web (page publiée) à partir de la même source que l'APK."""
import re, sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
s = re.sub(r'^<!doctype html>\s*<html[^>]*>\s*<head>\s*', '', s, flags=re.I)
s = re.sub(r'<meta charset[^>]*>\s*<meta name="viewport"[^>]*>\s*', '', s)
s = s.replace('</head>\n<body>\n', '\n').replace('</body>\n</html>', '').rstrip() + '\n'
s = s.replace('<title>Pointage</title>', '<title>Pointage famille</title>', 1)
open(out, 'w', encoding='utf-8').write(s)
