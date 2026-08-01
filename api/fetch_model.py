import json
import re
import urllib.request
import urllib.parse
from http.server import BaseHTTPRequestHandler

def fetch_url(url, headers=None):
    if headers is None:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'
        }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            return response.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return None

def extract_stl_files_from_html(html, base_url):
    files = []
    stl_matches = re.findall(r'href=["\'](https?://[^"\']+\.stl[^"\']*)["\']', html, re.IGNORECASE)
    for match in stl_matches:
        filename = match.split('/')[-1].split('?')[0]
        filename = urllib.parse.unquote(filename)
        if not any(f['url'] == match for f in files):
            files.append({"name": filename, "url": match})

    tv_matches = re.findall(r'href=["\'](/download:\d+)["\']', html)
    for m in tv_matches:
        full_url = urllib.parse.urljoin("https://www.thingiverse.com", m)
        if not any(f['url'] == full_url for f in files):
            files.append({"name": f"Modelo_{m.replace('/', '')}.stl", "url": full_url})

    return files

def parse_thingiverse(url):
    match = re.search(r'thing:(\d+)', url)
    thing_id = match.group(1) if match else None
    
    html = fetch_url(url)
    if not html:
        return {"error": "No se pudo acceder a Thingiverse"}

    title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
    title = title_match.group(1).split('- Thingiverse')[0].strip() if title_match else "Modelo de Thingiverse"
    
    img_match = re.search(r'<meta property="og:image" content="(.*?)"', html)
    image = img_match.group(1) if img_match else None
    
    files = []
    if thing_id:
        api_url = f"https://api.thingiverse.com/things/{thing_id}/files"
        api_json = fetch_url(api_url)
        if api_json:
            try:
                data = json.loads(api_json)
                if isinstance(data, list):
                    for f in data:
                        if f.get('name', '').lower().endswith('.stl'):
                            download_url = f.get('download_url') or f.get('public_url') or f.get('url')
                            if download_url:
                                files.append({"name": f['name'], "url": download_url})
            except Exception:
                pass

    if not files:
        files = extract_stl_files_from_html(html, url)

    return {
        "source": "Thingiverse",
        "title": title,
        "image": image,
        "url": url,
        "id": thing_id,
        "files": files
    }

def parse_printables(url):
    html = fetch_url(url)
    if not html:
        return {"error": "No se pudo acceder a Printables"}
        
    title_match = re.search(r'<meta property="og:title" content="(.*?)"', html)
    title = title_match.group(1).split('| Printables')[0].strip() if title_match else "Modelo de Printables"
    
    img_match = re.search(r'<meta property="og:image" content="(.*?)"', html)
    image = img_match.group(1) if img_match else None
    
    files = extract_stl_files_from_html(html, url)

    return {
        "source": "Printables",
        "title": title,
        "image": image,
        "url": url,
        "files": files
    }

def parse_cults3d(url):
    html = fetch_url(url)
    if not html:
        return {"error": "No se pudo acceder a Cults3D"}
        
    title_match = re.search(r'<meta property="og:title" content="(.*?)"', html)
    title = title_match.group(1).split('• Cults')[0].strip() if title_match else "Modelo de Cults3D"
    
    img_match = re.search(r'<meta property="og:image" content="(.*?)"', html)
    image = img_match.group(1) if img_match else None
    
    files = extract_stl_files_from_html(html, url)

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
    else:
        html = fetch_url(url)
        if html:
            title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
            title = title_match.group(1).strip() if title_match else "Modelo 3D"
            img_match = re.search(r'<meta property="og:image" content="(.*?)"', html)
            image = img_match.group(1) if img_match else None
            files = extract_stl_files_from_html(html, url)
            return {
                "source": "Web",
                "title": title,
                "image": image,
                "url": url,
                "files": files
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
