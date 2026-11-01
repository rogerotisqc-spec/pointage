#!/usr/bin/env python3
"""Affiche le SVG du code QR de l'adresse d'installation (à coller dans QR_SVG de index.html)."""
import qrcode, sys
url = sys.argv[1] if len(sys.argv) > 1 else 'https://tinyurl.com/pointagef'
q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=2)
q.add_data(url); q.make(fit=True)
m = q.get_matrix(); n = len(m); d = []
for y, row in enumerate(m):
    x = 0
    while x < n:
        if row[x]:
            s = x
            while x < n and row[x]: x += 1
            d.append(f'M{s} {y}h{x-s}v1h-{x-s}z')
        else:
            x += 1
print(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges"><rect width="{n}" height="{n}" fill="#fff"/><path d="{"".join(d)}" fill="#000"/></svg>')
