#!/usr/bin/env python3
"""Статика + POST /save/<имя>.png -> benzak/assets (только для генератора арта)."""
import http.server, os, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        name = os.path.basename(self.path.split('?')[0])
        if not self.path.startswith('/save/') or not name.endswith('.png'):
            self.send_response(400); self.end_headers(); return
        n = int(self.headers.get('Content-Length', 0))
        open(os.path.join(ROOT, 'benzak', 'assets', name), 'wb').write(self.rfile.read(n))
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8765), H).serve_forever()
