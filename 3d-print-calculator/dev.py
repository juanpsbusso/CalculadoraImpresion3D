#!/usr/bin/env python3
"""
Local Development Server for 3D Print Calculator
Serves static frontend files and handles /api/fetch-model endpoint.
Run with: py dev.py
"""
import http.server
import socketserver
import urllib.parse
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

PORT = 8085

class DevHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/fetch-model':
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
        
        # Fallback to standard static file serving
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
