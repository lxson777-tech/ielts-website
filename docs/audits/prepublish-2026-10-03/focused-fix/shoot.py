"""Screenshots for the focused-exercise question sheet fix (3 October 2026).

Opens each focused exercise on the open-build dev server (port 4590 by
default), waits for the island, records whether the publisher's sheet is on
the page and whether every numbered question has a gap in it, and saves a
screenshot of the question area beside this file.

  python shoot.py [base-url]
"""
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = Path(__file__).resolve().parent
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4590") + "/ielts-website"
IDS = [
    "listening-sentence-completion-guided",
    "listening-table-completion-check-a",
    "listening-matching-features-check-a",
    "listening-matching-features-guided-2",
    "listening-multiple-answer-check-a",
    "reading-table-completion-guided-2",
    "reading-sentence-completion-check-b",
]

results = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width, suffix in ((1440, "1440"), (390, "390")):
        ctx = browser.new_context(viewport={"width": width, "height": 900}, device_scale_factor=1)
        ctx.add_init_script("try{ localStorage.setItem('ielts.locale.v1','en') }catch(e){}")
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)[:200]))
        for exercise in IDS:
            if suffix == "390" and exercise not in IDS[:2]:
                continue
            errors.clear()
            page.goto(f"{BASE}/trainers/focused/{exercise}", wait_until="networkidle", timeout=120000)
            page.wait_for_selector(".focused-questions", timeout=60000)
            page.wait_for_timeout(800)
            numbers = [int(n) for n in page.locator(".focused-item-number").all_inner_texts() if n.strip().isdigit()]
            legend = page.locator(".focused-legend")
            legend_html = legend.first.inner_html() if legend.count() else ""
            beside = page.locator(".focused-audio-sheet").count() > 0
            sheet = "focused-source-sheet" in legend_html
            gaps = {n: bool(re.search(rf'data-question="{n}"|\(\s*{n}\s*\)', legend_html)) for n in numbers}
            overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
            shot = HERE / f"{exercise}-{suffix}.png"
            page.locator(".focused-body").screenshot(path=str(shot))
            results.append({"exercise": exercise, "width": width, "sheet": sheet, "sheet_beside_recording": beside, "numbers": numbers,
                            "gaps_in_stimulus": gaps, "page_scrolls_sideways": overflow, "errors": list(errors),
                            "screenshot": shot.name})
            print(exercise, width, "sheet" if sheet else "no sheet", "beside recording" if beside else "", gaps, "overflow" if overflow else "", errors or "")
        ctx.close()
    browser.close()

(HERE / "results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
