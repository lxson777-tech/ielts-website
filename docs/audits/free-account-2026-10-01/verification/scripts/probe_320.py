"""Reproduce two findings: (1) sideways scroll on /tests in Russian at 320 for a
free account; (2) 'Transition was aborted because of invalid state' after the
pop-up's primary button for a visitor."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).parent))
from vhelpers import *  # noqa

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
log = {}
WIDE = """() => { const W = document.documentElement.clientWidth; const out = [];
  for (const el of document.querySelectorAll('body *')) { const b = el.getBoundingClientRect(); if (b.width && b.right > W + 1) {
    const p = el.parentElement && el.parentElement.getBoundingClientRect(); if (!p || p.right <= W + 1) out.push({ tag: el.tagName, cls: String(el.className).slice(0, 80), right: Math.round(b.right), text: (el.innerText || '').slice(0, 60) }) } }
  return { W, scroll: document.documentElement.scrollWidth, culprits: out.slice(0, 8) } }"""
with sync_playwright() as p:
    b = p.chromium.launch()
    # (1) overflow
    for lang, w, h, state in (("ru", 320, 700, "free"), ("en", 320, 700, "free"), ("ru", 320, 700, "signed-out"), ("ru", 390, 844, "free")):
        ctx = new_context(b, lang, w, h)
        page = ctx.new_page()
        if state == "free":
            sign_up(page, f"probe320-{lang}-{w}-{STAMP}@example.test")
            page.wait_for_url("**/dashboard**", timeout=40000)
        visit(page, "/tests", "[data-test-rotation]")
        page.wait_for_timeout(800)
        r = page.evaluate(WIDE)
        log[f"overflow /tests {lang} {w} {state}"] = r
        page.screenshot(path=str(OUT / f"tests-{lang}-{w}-{state}.png"), full_page=True)
        ctx.close()
    # (2) transition error, five attempts per configuration
    for lang, w, h in (("ru", 320, 700), ("en", 320, 700), ("ru", 390, 844), ("en", 1440, 900)):
        errs = []
        for i in range(5):
            ctx = new_context(b, lang, w, h)
            page = ctx.new_page()
            page.on("pageerror", lambda e: errs.append(str(e)[:200]))
            visit(page, "/tests", "[data-test-rotation]")
            page.locator("[data-test-rotation]").first.click()
            dialog_feature(page)
            page.locator("[data-upgrade-primary]").click()
            page.wait_for_url("**/sign-up**", timeout=15000)
            page.wait_for_selector("#signup-email", timeout=20000)
            page.wait_for_timeout(1000)
            ctx.close()
        log[f"transition errors {lang} {w} (5 tries)"] = errs
    b.close()
(OUT / "probe-320.json").write_text(json.dumps(log, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(log, ensure_ascii=False, indent=1))
