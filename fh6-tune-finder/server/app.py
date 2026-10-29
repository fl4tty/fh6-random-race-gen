"""FH6 Tune Finder backend.

Serves the static frontend from ../public and exposes:
  GET /api/seed              -> hand-curated seed dataset (tunes + car specs)
  GET /api/search?car=NAME   -> seeded matches for NAME + live search-engine
                                 results pulled from a real search API

No third-party packages required (stdlib only) so it runs with a plain
`python server/app.py` on any machine with Python 3.9+.
"""
import json
import mimetypes
import os
import re
import sys
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(__file__))
from providers import google_cse  # noqa: E402

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")
DATA_FILE = os.path.join(ROOT_DIR, "data", "seed_tunes.json")
ENV_FILE = os.path.join(ROOT_DIR, ".env")

DEFAULT_SITES = ["fh6tunes.app", "forzahorizonhub.com", "reddit.com/r/ForzaHorizon"]
CODE_RE = re.compile(r"\b(\d{3})[\s-]?(\d{3})[\s-]?(\d{3})\b")
CACHE_TTL_SECONDS = 3600

_cache = {}  # normalized query -> (timestamp, results)


def load_env(path):
    env = {}
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip().strip('"').strip("'")
    return env


ENV = {**load_env(ENV_FILE), **os.environ}


def get_config():
    api_key = ENV.get("GOOGLE_API_KEY", "").strip()
    cx = ENV.get("GOOGLE_CSE_ID", "").strip()
    sites = [s.strip() for s in ENV.get("TUNE_SITES", "").split(",") if s.strip()] or DEFAULT_SITES
    return api_key, cx, sites


def load_seed_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize(s):
    return re.sub(r"\s+", " ", s.strip().lower())


def build_query(car, sites):
    site_clause = " OR ".join(f"site:{s}" for s in sites)
    return f'{car} tune code forza horizon 6 ({site_clause})'


def extract_code(text):
    m = CODE_RE.search(text)
    if not m:
        return None
    return f"{m.group(1)} {m.group(2)} {m.group(3)}"


def seeded_matches(seed_data, query):
    q = normalize(query)
    if not q:
        return []
    matches = [t for t in seed_data["tunes"] if q in normalize(t["car"])]
    specs = seed_data.get("carSpecs", {})
    out = []
    for t in matches:
        item = dict(t)
        item["carSpec"] = specs.get(t["car"])
        out.append(item)
    out.sort(key=lambda t: (t.get("upvotes") if t.get("upvotes") is not None else -1), reverse=True)
    return out


def live_search(car):
    api_key, cx, sites = get_config()
    query = build_query(car, sites)
    if not api_key or not cx:
        return {
            "configured": False,
            "error": "Search API not configured. Add GOOGLE_API_KEY and GOOGLE_CSE_ID to a .env file "
                     "in the project root (see .env.example and README.md).",
            "query": query,
            "results": [],
        }

    cache_key = normalize(query)
    cached = _cache.get(cache_key)
    if cached and (time.time() - cached[0]) < CACHE_TTL_SECONDS:
        return {"configured": True, "error": None, "query": query, "results": cached[1], "cached": True}

    try:
        results = google_cse.search(query, api_key, cx)
    except google_cse.ProviderError as e:
        return {"configured": True, "error": str(e), "query": query, "results": []}

    for r in results:
        r["extractedCode"] = extract_code(r.get("title", "") + " " + r.get("snippet", ""))

    _cache[cache_key] = (time.time(), results)
    return {"configured": True, "error": None, "query": query, "results": results, "cached": False}


class Handler(BaseHTTPRequestHandler):
    server_version = "FH6TuneFinder/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path, content_type):
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/seed":
            self._send_json(load_seed_data())
            return

        if path == "/api/search":
            qs = urllib.parse.parse_qs(parsed.query)
            car = (qs.get("car", [""])[0] or "").strip()
            if not car:
                self._send_json({"error": "Missing required 'car' query parameter."}, status=400)
                return
            seed_data = load_seed_data()
            self._send_json({
                "car": car,
                "seeded": seeded_matches(seed_data, car),
                "live": live_search(car),
            })
            return

        if path.startswith("/api/"):
            self._send_json({"error": "Not found"}, status=404)
            return

        # Static file serving for the frontend
        rel_path = path.lstrip("/") or "index.html"
        full_path = os.path.normpath(os.path.join(PUBLIC_DIR, rel_path))
        if not full_path.startswith(PUBLIC_DIR):
            self._send_json({"error": "Forbidden"}, status=403)
            return
        if not os.path.isfile(full_path):
            full_path = os.path.join(PUBLIC_DIR, "index.html")
        content_type = mimetypes.guess_type(full_path)[0] or "application/octet-stream"
        self._send_file(full_path, content_type)


def main():
    port = int(ENV.get("PORT", "8000"))
    api_key, cx, _ = get_config()
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"FH6 Tune Finder running at http://localhost:{port}")
    if not api_key or not cx:
        print("NOTE: GOOGLE_API_KEY / GOOGLE_CSE_ID not set — live search will report as unconfigured.")
        print("      Copy .env.example to .env and fill in your keys (see README.md).")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
