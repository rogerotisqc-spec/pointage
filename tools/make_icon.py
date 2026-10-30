from PIL import Image, ImageDraw
import os, sys
S = 1024
def icon():
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([40, 40, S-40, S-40], radius=210, fill='#1f5c45')
    # bloc de pointage
    d.rounded_rectangle([210, 170, 700, 830], radius=60, fill='#fffdf8')
    d.rectangle([210, 170, 700, 300], fill='#f0a91c'); d.rounded_rectangle([210, 170, 700, 330], radius=60, fill='#f0a91c'); d.rectangle([210, 290, 700, 330], fill='#fffdf8')
    for y in (400, 500, 600, 700):
        d.rounded_rectangle([280, y, 630, y+26], radius=13, fill='#cfd8d3')
    d.rectangle([430, 370, 452, 760], fill='#cfd8d3')
    # dé
    x0, y0, s = 540, 520, 330
    d.rounded_rectangle([x0+14, y0+20, x0+s+14, y0+s+20], radius=70, fill=(0, 0, 0, 70))
    d.rounded_rectangle([x0, y0, x0+s, y0+s], radius=70, fill='#ffffff', outline='#1c2420', width=18)
    r = 34
    for cx, cy in [(0.27, 0.27), (0.73, 0.27), (0.5, 0.5), (0.27, 0.73), (0.73, 0.73)]:
        px, py = x0 + cx*s, y0 + cy*s
        d.ellipse([px-r, py-r, px+r, py+r], fill='#c0392b' if (cx, cy) == (0.5, 0.5) else '#1c2420')
    return im
base = icon()
res = sys.argv[1]
for dens, px in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    os.makedirs(f'{res}/mipmap-{dens}', exist_ok=True)
    base.resize((px, px), Image.LANCZOS).save(f'{res}/mipmap-{dens}/ic_launcher.png')
base.resize((512, 512), Image.LANCZOS).save(sys.argv[2])
