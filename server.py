"""Serveur local de l'appli GAF UFOLEP.

Sert le front (app/) et une petite API JSON pour les enchaînements enregistrés :
  GET    /api/routines            liste
  PUT    /api/routines/<id>       crée / remplace
  DELETE /api/routines/<id>       supprime
  GET/PUT/DELETE /api/media[/<id_element>]   lien vidéo par mouvement {url}
Stockage : data/<collection>.json (écriture atomique).

Lancement : python server.py [--port 8790] [--host 0.0.0.0]
"""
import argparse, json, os, re, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent
APP = ROOT / "app"
DATA_DIR = ROOT / "data"
COLLECTIONS = ("routines", "media")
LOCK = threading.Lock()
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def load(coll):
    try:
        return json.loads((DATA_DIR / f"{coll}.json").read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save(coll, db):
    DATA_DIR.mkdir(exist_ok=True)
    path = DATA_DIR / f"{coll}.json"
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(db, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, path)


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      ".webp": "image/webp", ".webmanifest": "application/manifest+json", ".js": "text/javascript"}
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(APP), **kw)

    def end_headers(self):
        if self.path.endswith((".js", ".json", ".html", ".css", "/")):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _route(self):
        m = re.fullmatch(r"/api/(routines|media)(?:/([^/]+))?/?", self.path.split("?")[0])
        if not m:
            return None, None
        self.coll, rid = m.group(1), m.group(2)
        if rid is not None and not ID_RE.match(rid):
            self._json(400, {"error": "identifiant invalide"})
            return False, None
        return True, rid

    def do_GET(self):
        ok, rid = self._route()
        if ok is None:
            return super().do_GET()
        if ok is False:
            return
        with LOCK:
            db = load(self.coll)
        if rid is None:
            if self.coll == "media":
                return self._json(200, db)
            return self._json(200, sorted(db.values(), key=lambda r: r.get("updated", ""), reverse=True))
        return self._json(200, db[rid]) if rid in db else self._json(404, {"error": "introuvable"})

    def do_PUT(self):
        ok, rid = self._route()
        if not ok or rid is None:
            return self._json(404, {"error": "route inconnue"}) if ok is None or rid is None else None
        try:
            n = int(self.headers.get("Content-Length", 0))
            if n > 200_000:
                return self._json(413, {"error": "trop volumineux"})
            body = json.loads(self.rfile.read(n) or b"{}")
            assert isinstance(body, dict) and isinstance(body.get("items", []), list)
            if self.coll == "media":
                url = str(body.get("url", "")).strip()
                assert re.match(r"^https://\S+$", url) and len(url) < 500
                body = {"url": url}
        except Exception:
            return self._json(400, {"error": "contenu invalide (pour une vidéo : un lien https://)"})
        body["id"] = rid
        with LOCK:
            db = load(self.coll)
            db[rid] = body
            save(self.coll, db)
        return self._json(200, body)

    def do_DELETE(self):
        ok, rid = self._route()
        if not ok or rid is None:
            return self._json(404, {"error": "route inconnue"})
        with LOCK:
            db = load(self.coll)
            existed = db.pop(rid, None) is not None
            save(self.coll, db)
        return self._json(200 if existed else 404, {"deleted": existed})

    def log_message(self, fmt, *args):
        if "/api/" in (args[0] if args else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8790)
    ap.add_argument("--host", default="0.0.0.0")
    a = ap.parse_args()
    print(f"Palier (GAF UFOLEP) : http://localhost:{a.port}")
    ThreadingHTTPServer((a.host, a.port), Handler).serve_forever()
