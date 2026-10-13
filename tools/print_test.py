"""Imprime la fiche guidée en PDF (Chrome installé, sans toucher au profil de l'utilisateur) et compte les pages.

python tools/print_test.py [app] [niveau]   → tools/fiche-<app>-<niveau>.pdf
Le serveur local doit tourner sur :8790.
"""
import json, sys, re
from playwright.sync_api import sync_playwright

app = sys.argv[1] if len(sys.argv) > 1 else "sol"
level = sys.argv[2] if len(sys.argv) > 2 else "B3"
URL = "http://localhost:8790/"

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    rid = "printtest"
    r = {"id": rid, "app": app, "level": level, "name": "Test impression", "gym": "", "items": [], "manual": {},
         "ded": {"p": 0, "m": 0, "g": 0, "c": 0}, "jumps": [], "svalos": {}, "updated": "2026-10-13T08:00:00.000Z"}
    st = {"level": level, "app": app, "view": "catalogue", "filter": "aut", "q": "", "page": "edit", "sheet": True,
          "drafts": {f"{app}:{level}": {**r, "saved": r["updated"]}}}
    # données posées avant le premier chargement (profil jetable : rien ne touche au navigateur de l'utilisateur)
    pg.add_init_script("if (!sessionStorage.t) { sessionStorage.t = 1; localStorage.setItem('palier-routines-v1', %s); localStorage.setItem('palier-v1', %s); }"
                       % (json.dumps(json.dumps({rid: r})), json.dumps(json.dumps(st))))
    pg.goto(URL + "#edit")
    pg.wait_for_selector("#sheet")
    pg.wait_for_function("() => !document.querySelector('.rq-wait')", timeout=60000)
    out = f"tools/fiche-{app}-{level}.pdf"
    pg.emulate_media(media="print")
    pg.pdf(path=out, prefer_css_page_size=True, print_background=True)
    info = pg.evaluate("""() => { const e = document.getElementById('sheet'), cs = getComputedStyle(e), r = e.getBoundingClientRect();
      const big = [...document.body.children].filter((n) => n.getBoundingClientRect().height > 0).map((n) => n.tagName + '#' + n.id + '.' + n.className + ':' + Math.round(n.getBoundingClientRect().height));
      return { pz: e.style.getPropertyValue('--pz'), pw: e.style.getPropertyValue('--pw'), zoom: cs.zoom, width: cs.width, rectH: Math.round(r.height), rectW: Math.round(r.width), docH: document.documentElement.scrollHeight, big }; }""")
    pg.set_viewport_size({"width": 1062, "height": 733})
    info2 = pg.evaluate("""() => { const e = document.getElementById('sheet'), r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      return { h: Math.round(r.height), w: Math.round(r.width), sh: e.scrollHeight, cw: cs.width, tr: cs.transform, fs: cs.fontSize,
        cols: getComputedStyle(e.querySelector('.sh-cols')).gridTemplateColumns }; }""")
    print("print-viewport:", info2)
    b.close()

data = open(out, "rb").read()
pages = len(re.findall(rb"/Type\s*/Page[^s]", data))
print(out, "pages:", pages, "zoom/width/height:", info)
