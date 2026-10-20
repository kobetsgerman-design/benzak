#!/usr/bin/env python3
"""Приёмник файлов для tools/to_webp.js: браузер кодирует WebP (на macOS нет своего кодировщика) и присылает POST-ом.
Запуск:  python3 tools/webp_receiver.py [папка_проекта] [порт]     (по умолчанию текущая папка и 8778)
POST /save?path=assets/props/city_1.webp  — тело запроса записывается в этот путь внутри папки проекта."""
import http.server, os, sys, urllib.parse

ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8778

class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        q = urllib.parse.urlparse(self.path)
        rel = urllib.parse.parse_qs(q.query).get('path', [''])[0]
        dst = os.path.abspath(os.path.join(ROOT, rel))
        if q.path != '/save' or not dst.startswith(ROOT + os.sep) or not dst.endswith('.webp'):
            self.send_response(400); self._cors(); self.end_headers(); return
        n = int(self.headers.get('Content-Length', 0))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'wb') as f: f.write(self.rfile.read(n))
        self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass

http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
