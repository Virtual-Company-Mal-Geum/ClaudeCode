import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

AI_SERVER = os.environ.get('AI_SERVER', 'https://desktop-75bjpd-lab4090.tail6dd0ea.ts.net:8443')


class ProxyHandler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        if self.path != '/api/evaluate':
            self.send_error(404)
            return

        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length)
        content_type = self.headers.get('Content-Type', 'application/json')

        try:
            req = urllib.request.Request(
                f'{AI_SERVER}/evaluate',
                data=body,
                headers={'Content-Type': content_type},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                response_body = resp.read()
                self.send_response(resp.status)
                self.send_header('Content-Type', resp.headers.get_content_type() or 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(response_body)))
                self.end_headers()
                self.wfile.write(response_body)
        except urllib.error.HTTPError as err:
            response_body = err.read()
            self.send_response(err.code)
            self.send_header('Content-Type', err.headers.get_content_type() or 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(response_body)))
            self.end_headers()
            self.wfile.write(response_body)
        except Exception:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', '0')
            self.end_headers()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    server = ThreadingHTTPServer(('0.0.0.0', port), ProxyHandler)
    print(f'Serving on http://0.0.0.0:{port}')
    server.serve_forever()
