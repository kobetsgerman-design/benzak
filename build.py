#!/usr/bin/env python3
"""Собирает один файл Benzak.html: PixiJS + game.js + (если есть) assets/*.png в base64.
Запуск:  python3 build.py [куда_сохранить]   (по умолчанию ../Benzak.html)"""
import base64, glob, json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(here, p), encoding='utf-8').read()
html = rd('index.html')
pixi = rd('lib/pixi.min.js').replace('</script>', '<\\/script>')
game = rd('game.js').replace('</script>', '<\\/script>')
assets = {}
for f in sorted(glob.glob(os.path.join(here, 'assets', '*.png')) + glob.glob(os.path.join(here, 'assets', '*.jpg')) + glob.glob(os.path.join(here, 'assets', 'props', '*.png')) + glob.glob(os.path.join(here, 'assets', '*.m4a'))):
    name, ext = os.path.splitext(os.path.basename(f))
    if os.path.basename(os.path.dirname(f)) == 'props': name = 'prop_' + name
    mime = 'audio/mp4' if ext == '.m4a' else 'image/jpeg' if ext == '.jpg' else 'image/png'
    assets[name] = 'data:%s;base64,' % mime + base64.b64encode(open(f, 'rb').read()).decode()
inline = '<script>window.__ASSETS=%s;</script>\n<script>%s</script>\n<script>%s</script>' % (json.dumps(assets), pixi, game)
marker = '<script src="lib/pixi.min.js"></script>\n<script src="game.js"></script>'
assert marker in html
out = html.replace(marker, inline)
dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', 'Benzak.html')
open(dst, 'w', encoding='utf-8').write(out)
print('OK', os.path.abspath(dst), round(len(out)/1024), 'KB, ассетов:', len(assets))
