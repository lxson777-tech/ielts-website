"""Builder K: the headers still fit on the narrowest phones in all three
languages, now that the switches carry a third language (KZ).

For each language (en, ru, kk) and width (320, 360, 390), opens the sales
page and the workspace pages as a phone and reports whether the page is
wider than the screen. Writes narrow-results.json next to this file.

  KK_BASE   the gated build (default http://localhost:4475/ielts-website)
"""

import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("KK_BASE", "http://localhost:4475/ielts-website")
HERE = Path(__file__).resolve().parent
PATHS = ["/", "/plans", "/terms", "/privacy", "/help", "/sign-up", "/account"]
rows = []

with sync_playwright() as p:
    browser = p.chromium.launch()
    for lang in ["en", "ru", "kk"]:
        for width in [320, 360, 390]:
            ctx = browser.new_context(viewport={"width": width, "height": 700}, is_mobile=True, has_touch=True, device_scale_factor=2)
            ctx.add_init_script(f"try{{localStorage.setItem('ielts.locale.v1','{lang}')}}catch(e){{}}")
            page = ctx.new_page()
            for path in PATHS:
                page.goto(BASE + path, wait_until="domcontentloaded")
                page.wait_for_timeout(2200)
                scroll, inner = page.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")
                ok = scroll <= width + 1 and inner <= width + 1
                rows.append({"lang": lang, "width": width, "path": path, "scrollWidth": scroll, "innerWidth": inner, "ok": ok})
                print(("PASS " if ok else "FAIL ") + f"{lang} {width} {path} {scroll}/{inner}", flush=True)
                if width == 320 and path in ("/", "/terms"):
                    page.screenshot(path=str(HERE / "shots" / f"15-{lang}-320-{path.strip('/') or 'sales'}.png"))
            ctx.close()
    browser.close()

(HERE / "narrow-results.json").write_text(json.dumps(rows, indent=1), encoding="utf-8")
print(f"{sum(r['ok'] for r in rows)} of {len(rows)} fit")
