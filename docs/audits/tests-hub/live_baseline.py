"""Read-only baseline of the LIVE /tests page: page heights and the start hrefs."""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
OUT = Path(__file__).parent
URL = "https://lxson777-tech.github.io/ielts-website/tests"
res = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in [(1440, 900), (390, 844), (320, 700)]:
        pg = b.new_page(viewport={"width": w, "height": h})
        pg.goto(URL, wait_until="networkidle")
        pg.wait_for_timeout(1500)
        res[f"height_{w}"] = pg.evaluate("document.documentElement.scrollHeight")
        if w == 1440:
            res["links"] = pg.evaluate("""() => [...document.querySelectorAll('main a, main button[data-test-rotation]')].slice(0,40).map(e => ({text: e.textContent.trim().slice(0,60), href: e.getAttribute('href'), rotation: e.dataset.rotationKey || null}))""")
        pg.close()
    b.close()
(OUT / "live_baseline.json").write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps(res, indent=2, ensure_ascii=False)[:4000])
