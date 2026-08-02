#!/usr/bin/env python3
"""
Local Development Server for 3D Print Calculator
Serves static frontend files and handles /api/fetch-model & /api/fetch-stl-proxy endpoints.
Run with: py dev.py
"""
import http.server
import socketserver
import urllib.parse
import urllib.request
import json
import os
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

# Add api directory to import index handler
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))
try:
    from index import process_url
except ImportError:
    process_url = lambda url: {"error": "Módulo de API no encontrado"}

PORT = 8107

class DevHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # 1. Fetch Model Metadata & Extracted STL files
        if parsed.path in ['/api/fetch-model', '/api/fetch_model', '/api/index']:
            query_params = urllib.parse.parse_qs(parsed.query)
            url_param = query_params.get('url', [None])[0]
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            if not url_param:
                res = json.dumps({"error": "Parámetro 'url' requerido"})
            else:
                res = json.dumps(process_url(url_param))
                
            self.wfile.write(res.encode('utf-8'))
            return

        # 2. Fetch STL Proxy (CORS bypass for binary STL files)
        if parsed.path in ['/api/fetch-stl-proxy', '/api/fetch_stl_proxy']:
            query_params = urllib.parse.parse_qs(parsed.query)
            target_url = query_params.get('url', [None])[0]
            
            if not target_url:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Error: Parameter 'url' is required")
                return

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
            try:
                req = urllib.request.Request(target_url, headers=headers)
                with urllib.request.urlopen(req, timeout=15) as resp:
                    content = resp.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/octet-stream')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Content-Length', str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
            except Exception as e:
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(f"Error fetching STL: {str(e)}".encode('utf-8'))
            return
        
        # Fallback to static files
        return super().do_GET()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"Servidor local de pruebas iniciado en http://localhost:{PORT}")
    print(f"Para probar en tu celular en la misma red WiFi: http://<tu-ip-local>:{PORT}")
    print("Presiona Ctrl+C para detener el servidor.\n")
    
    with socketserver.TCPServer(("", PORT), DevHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
