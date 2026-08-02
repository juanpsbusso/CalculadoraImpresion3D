import json
import re
import urllib.request
import urllib.parse
import zipfile
import io
import struct
import base64
from http.server import BaseHTTPRequestHandler

def fetch_url(url, headers=None, timeout=12):
    if headers is None:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read()
    except Exception as e:
        print("fetch_url error:", e)
        return None

def parse_stl_bytes(buffer):
    if not buffer or len(buffer) < 84:
        return None
    try:
        if buffer[:5].lower() == b'solid':
            text = buffer.decode('utf-8', errors='ignore')
            pattern_vertex = re.compile(r'vertex\s+([-\d\.eE+]+)\s+([-\d\.eE+]+)\s+([-\d\.eE+]+)')
            vertices = []
            for match in pattern_vertex.finditer(text):
                vertices.append(float(match.group(1)))
                vertices.append(float(match.group(2)))
                vertices.append(float(match.group(3)))
            
            face_count = len(vertices) // 9
            if face_count == 0:
                return None
                
            min_x = min_y = min_z = float('inf')
            max_x = max_y = max_z = float('-inf')
            vol = 0.0

            for i in range(face_count):
                p_idx = i * 9
                v1x, v1y, v1z = vertices[p_idx], vertices[p_idx+1], vertices[p_idx+2]
                v2x, v2y, v2z = vertices[p_idx+3], vertices[p_idx+4], vertices[p_idx+5]
                v3x, v3y, v3z = vertices[p_idx+6], vertices[p_idx+7], vertices[p_idx+8]

                min_x, max_x = min(min_x, v1x, v2x, v3x), max(max_x, v1x, v2x, v3x)
                min_y, max_y = min(min_y, v1y, v2y, v3y), max(max_y, v1y, v2y, v3y)
                min_z, max_z = min(min_z, v1z, v2z, v3z), max(max_z, v1z, v2z, v3z)

                v321 = v3x * v2y * v1z
                v231 = v2x * v3y * v1z
                v312 = v3x * v1y * v2z
                v132 = v1x * v3y * v2z
                v213 = v2x * v1y * v3z
                v123 = v1x * v2y * v3z
                vol += (-v321 + v231 + v312 - v132 - v213 + v123) / 6.0

            return {
                "volumeCm3": round(abs(vol) / 1000.0, 2),
                "dimensions": {
                    "x": round(abs(max_x - min_x), 1),
                    "y": round(abs(max_y - min_y), 1),
                    "z": round(abs(max_z - min_z), 1)
                }
            }

        face_count = struct.unpack('<I', buffer[80:84])[0]
        expected_len = 84 + face_count * 50
        if len(buffer) < expected_len:
            return None

        pos = 84
        min_x = min_y = min_z = float('inf')
        max_x = max_y = max_z = float('-inf')
        vol = 0.0

        for _ in range(face_count):
            data = struct.unpack('<12f', buffer[pos:pos+48])
            pos += 50
            
            v1x, v1y, v1z = data[3], data[4], data[5]
            v2x, v2y, v2z = data[6], data[7], data[8]
            v3x, v3y, v3z = data[9], data[10], data[11]

            min_x, max_x = min(min_x, v1x, v2x, v3x), max(max_x, v1x, v2x, v3x)
            min_y, max_y = min(min_y, v1y, v2y, v3y), max(max_y, v1y, v2y, v3y)
            min_z, max_z = min(min_z, v1z, v2z, v3z), max(max_z, v1z, v2z, v3z)

            v321 = v3x * v2y * v1z
            v231 = v2x * v3y * v1z
            v312 = v3x * v1y * v2z
            v132 = v1x * v3y * v2z
            v213 = v2x * v1y * v3z
            v123 = v1x * v2y * v3z
            vol += (-v321 + v231 + v312 - v132 - v213 + v123) / 6.0

        volume_cm3 = abs(vol) / 1000.0
        return {
            "volumeCm3": round(volume_cm3, 2),
            "dimensions": {
                "x": round(abs(max_x - min_x), 1),
                "y": round(abs(max_y - min_y), 1),
                "z": round(abs(max_z - min_z), 1)
            }
        }
    except Exception:
        return None

def parse_thingiverse(url):
    match = re.search(r'thing:(\d+)', url)
    thing_id = match.group(1) if match else None
    
    html_bytes = fetch_url(url)
    html = html_bytes.decode('utf-8', errors='ignore') if html_bytes else ""

    title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
    title = title_match.group(1).split('- Thingiverse')[0].strip() if title_match else f"Thing {thing_id}"
    
    img_match = re.search(r'<meta property="og:image" content="(.*?)"', html)
    image = img_match.group(1) if img_match else None
    
    files = []
    if thing_id:
        zip_url = f"https://www.thingiverse.com/thing:{thing_id}/zip"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': url
        }
        zip_bytes = fetch_url(zip_url, headers=headers, timeout=15)
        
        if zip_bytes and len(zip_bytes) > 1000:
            try:
                with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
                    for filename in z.namelist():
                        if filename.lower().endswith('.stl'):
                            stl_bytes = z.read(filename)
                            clean_name = filename.split('/')[-1]
                            stats = parse_stl_bytes(stl_bytes)
                            b64_data = base64.b64encode(stl_bytes).decode('utf-8')
                            
                            files.append({
                                "name": clean_name,
                                "sizeBytes": len(stl_bytes),
                                "volumeCm3": stats["volumeCm3"] if stats else 10,
                                "dimensions": stats["dimensions"] if stats else {"x": 50, "y": 50, "z": 20},
                                "stlBase64": b64_data
                            })
            except Exception as e:
                print("Thingiverse Zip extract error:", e)

    return {
        "source": "Thingiverse",
        "title": title,
        "image": image,
        "url": url,
        "id": thing_id,
        "files": files
    }

def parse_printables(url):
    html_bytes = fetch_url(url)
    html = html_bytes.decode('utf-8', errors='ignore') if html_bytes else ""
    
    # Title
    title_match = re.search(r'<meta property="og:title" content="(.*?)"', html)
    if not title_match:
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
    title = title_match.group(1).split('| Printables')[0].strip() if title_match else "Modelo de Printables"
    
    # Image
    img_match = re.search(r'<meta property="og:image" content="(.*?)"', html)
    image = img_match.group(1) if img_match else None
    
    files = []

    # 1. Parse JSON payloads embedded in script tags
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
    for s in scripts:
        if '\"name\"' in s and ('.stl' in s.lower() or 'filePath' in s or 'downloadUrl' in s):
            stl_matches = re.findall(r'\"name\"\s*:\s*\"([^\"]+\.(?:stl|3mf|zip))\"', s, re.I)
            for fname in stl_matches:
                clean_n = fname.split('/')[-1]
                if not any(f['name'] == clean_n for f in files):
                    files.append({
                        "name": clean_n,
                        "volumeCm3": 35.0,
                        "dimensions": {"x": 65.0, "y": 65.0, "z": 45.0}
                    })

    # 2. Fallback text search for STL filenames
    if not files:
        raw_stl_names = re.findall(r'([a-zA-Z0-9_\-]+\.stl)', html, re.I)
        unique_names = list(dict.fromkeys(raw_stl_names))
        for n in unique_names:
            if not n.lower().startswith('thumb') and not n.lower().startswith('logo'):
                files.append({
                    "name": n,
                    "volumeCm3": 40.0,
                    "dimensions": {"x": 70.0, "y": 70.0, "z": 50.0}
                })

    # Default file if none extracted
    if not files:
        files.append({
            "name": f"{title}.stl",
            "volumeCm3": 45.0,
            "dimensions": {"x": 75.0, "y": 75.0, "z": 50.0}
        })

    return {
        "source": "Printables",
        "title": title,
        "image": image,
        "url": url,
        "files": files
    }

def parse_cults3d(url):
    html_bytes = fetch_url(url)
    html = html_bytes.decode('utf-8', errors='ignore') if html_bytes else ""
    
    # Title
    title_match = re.search(r'<meta property="og:title" content="(.*?)"', html)
    if not title_match:
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
    if not title_match:
        title_match = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL)
    
    raw_title = title_match.group(1) if title_match else "Modelo de Cults3D"
    title = re.sub(r'<[^>]+>', '', raw_title).split('• Cults')[0].strip()
    
    # Image
    img_match = re.search(r'<meta property="og:image" content="(.*?)"', html)
    image = img_match.group(1) if img_match else None
    
    files = []
    
    # Extract file list items
    file_list_matches = re.findall(r'class="[^\"]*file-name[^\"]*"[^>]*>\s*([^\n<]+)', html, re.I)
    for fn in file_list_matches:
        clean_fn = fn.strip()
        if clean_fn and not any(f['name'] == clean_fn for f in files):
            files.append({
                "name": clean_fn,
                "volumeCm3": 38.0,
                "dimensions": {"x": 60.0, "y": 60.0, "z": 40.0}
            })

    # Fallback search for STL filenames in HTML body
    if not files:
        stl_names = re.findall(r'([a-zA-Z0-9_\-]+\.stl)', html, re.I)
        unique_stl = list(dict.fromkeys(stl_names))
        for n in unique_stl:
            if not n.lower().startswith('thumb') and not n.lower().startswith('logo'):
                files.append({
                    "name": n,
                    "volumeCm3": 42.0,
                    "dimensions": {"x": 68.0, "y": 68.0, "z": 45.0}
                })

    # Default file entry
    if not files:
        files.append({
            "name": f"{title}.stl",
            "volumeCm3": 45.0,
            "dimensions": {"x": 70.0, "y": 70.0, "z": 50.0}
        })

    return {
        "source": "Cults3D",
        "title": title,
        "image": image,
        "url": url,
        "files": files
    }

def process_url(url):
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower()
    
    if 'thingiverse.com' in domain:
        return parse_thingiverse(url)
    elif 'printables.com' in domain:
        return parse_printables(url)
    elif 'cults3d.com' in domain:
        return parse_cults3d(url)
    elif url.lower().endswith('.stl'):
        stl_bytes = fetch_url(url)
        if stl_bytes:
            filename = url.split('/')[-1].split('?')[0]
            stats = parse_stl_bytes(stl_bytes)
            b64_data = base64.b64encode(stl_bytes).decode('utf-8')
            return {
                "source": "Direct STL Link",
                "title": filename,
                "files": [{
                    "name": filename,
                    "sizeBytes": len(stl_bytes),
                    "volumeCm3": stats["volumeCm3"] if stats else 10,
                    "dimensions": stats["dimensions"] if stats else {"x": 50, "y": 50, "z": 20},
                    "stlBase64": b64_data
                }]
            }
    
    html_bytes = fetch_url(url)
    if html_bytes:
        html = html_bytes.decode('utf-8', errors='ignore')
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
        title = title_match.group(1).strip() if title_match else "Modelo 3D"
        img_match = re.search(r'<meta property="og:image" content="(.*?)"', html)
        image = img_match.group(1) if img_match else None
        return {
            "source": "Web",
            "title": title,
            "image": image,
            "url": url,
            "files": [{
                "name": f"{title}.stl",
                "volumeCm3": 45.0,
                "dimensions": {"x": 70.0, "y": 70.0, "z": 50.0}
            }]
        }
    return {"error": "No se pudo extraer información del enlace"}

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        query_params = urllib.parse.parse_qs(parsed_path.query)
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
