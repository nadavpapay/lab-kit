#!/usr/bin/env python3
"""A lab's server, for when stars, statuses and rail order should be shared.

Without it a lab keeps all of that in each browser. With it, everyone who
opens the lab sees the same rail and the same stars.

  python3 serve.py            serves the built lab (dist/) and /__lab on port 5199
  PORT=8080 python3 serve.py  on another port

In dev, Vite proxies /__lab here (see vite.config.ts), so run this beside
`npm run dev` and set `server: "/__lab"` in src/main.tsx.

State is one small JSON file (LAB_DATA, default ./lab-data.json). Anyone who
can reach the server can change it, so keep it on a private address. No
dependencies beyond Python 3.
"""

import json
import os
import re
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "5199"))
DATA = os.environ.get("LAB_DATA", os.path.join(HERE, "lab-data.json"))
DIST = os.environ.get("LAB_DIST", os.path.join(HERE, "dist"))
ROUTE = "/__lab"

# A status is a word, a star carries a short note (its name and the address
# it was starred at), a rail order is comma-joined lab ids, and a finished
# lab keeps its part count so a new round can reopen it. The ceilings keep
# the file small.
KEY = re.compile(r"^[a-z0-9-]{1,48}/[a-z0-9-]{1,96}$")
WORDS = {"todo", "doing", "review", "done"}
MAX_KEYS = 1000
MAX_NOTE = 400
ORDER = re.compile(r"^[a-z0-9-]{1,48}(,[a-z0-9-]{1,48}){0,127}$")
ROUNDS_KEY = re.compile(r"^[a-z0-9-]*rail-rounds/")
ROUNDS = re.compile(r"^[0-9]{1,4}$")
lock = threading.Lock()


def read():
    try:
        with open(DATA, encoding="utf-8") as f:
            held = json.load(f)
        return held if isinstance(held, dict) else {}
    except (OSError, ValueError):
        return {}


def write(state):
    tmp = DATA + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=1, sort_keys=True)
    os.replace(tmp, DATA)


def allowed(key, word):
    if word is None:
        return True
    if not isinstance(word, str):
        return False
    if key.startswith("star-"):
        return 0 < len(word) <= MAX_NOTE and word.isprintable()
    if key.startswith("rail-order/"):
        return len(word) <= 6000 and bool(ORDER.match(word))
    if ROUNDS_KEY.match(key):
        return bool(ROUNDS.match(word))
    return word in WORDS


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=DIST, **k)

    def send_json(self, code, body):
        data = json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.partition("?")[0]
        if path == ROUTE:
            with lock:
                return self.send_json(200, {"status": read()})
        # Every lab address is the one page: the lab reads its place from the path.
        if not os.path.isfile(os.path.join(DIST, path.lstrip("/"))):
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        if self.path.partition("?")[0] != ROUTE:
            return self.send_json(404, {"ok": False})
        try:
            size = int(self.headers.get("Content-Length") or 0)
            if not 0 < size <= 2048:
                raise ValueError("size")
            body = json.loads(self.rfile.read(size).decode("utf-8"))
            key, word = body.get("key"), body.get("status")
            if not isinstance(key, str) or not KEY.match(key):
                raise ValueError("key")
            if not allowed(key, word):
                raise ValueError("status")
            with lock:
                state = read()
                if word is None:
                    state.pop(key, None)
                elif key in state or len(state) < MAX_KEYS:
                    state[key] = word
                else:
                    raise ValueError("full")
                write(state)
            self.send_json(200, {"ok": True})
        except (ValueError, OSError, AttributeError) as err:
            self.send_json(400, {"ok": False, "error": str(err)})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print(f"lab server on http://localhost:{PORT} (state in {DATA})")
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
