"""C6: the LIVE site after the 2 October 2026 release, read only and signed
out (no account is created, nothing is submitted). Every key page loads
without an uncaught error or a failed request, and the release's changes are
there.

  python c6_live_check.py <out-dir>
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

LIVE = "https://lxson777-tech.github.io/ielts-website"
OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROUTES = ["/", "/dashboard", "/start", "/learn", "/trainers", "/tests", "/review", "/lessons/writing/problem",
          "/lessons/reading/tfng", "/writing/models", "/trainers/focused/listening-categorisation-check-a",
          "/tests/reading-full-001", "/account", "/help", "/privacy", "/terms", "/support", "/sign-in", "/sign-up"]
results = []


def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": str(detail)[:300]})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{str(detail)[:200]}]" if detail and not ok else ""), flush=True)


with sync_playwright() as p:
    b = p.chromium.launch()
    for lang, w, h in (("en", 1440, 900), ("ru", 390, 844)):
        ctx = b.new_context(viewport={"width": w, "height": h}, locale="ru-RU" if lang == "ru" else "en-GB",
                            is_mobile=w < 720, has_touch=w < 720)
        ctx.add_init_script(f"try{{ localStorage.setItem('ielts.locale.v1','{lang}') }}catch(e){{}}")
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(("pageerror", str(e)[:200], page.url)))
        page.on("response", lambda r: errors.append(("http", f"{r.status} {r.url[:150]}", page.url)) if r.status >= 400 else None)
        for route in ROUTES:
            errors.clear()
            resp = page.goto(LIVE + route, wait_until="load", timeout=60000)
            page.wait_for_timeout(2500)
            check(f"{lang} {w} {route}: loads ({resp.status if resp else '?'}), no error", resp and resp.status < 400 and not errors, errors[:3])
            if route == "/lessons/writing/problem" and lang == "en":
                sec = page.locator("section:has(h2:text('What a Band 8 answer looks like'))")
                check("the Problem / Solution lesson shows its Band 8 worked example", sec.count() == 1 and "teenagers" in sec.inner_text())
                if sec.count():
                    sec.screenshot(path=str(OUT / "live-problem-lesson.png"))
            if route == "/trainers" and lang == "en":
                check("Practice links Model answers and Cue cards", page.locator("main a[href$='/writing/models']").count() >= 1 and page.locator("main a[href$='/speaking/cue-cards']").count() >= 1)
            if route == "/dashboard":
                check(f"{lang} {w}: signed out, the header shows one Log in button", page.locator(".ws-login").count() == 1 and page.locator(".ws-avatar").count() == 0)
                check(f"{lang} {w}: no 'Report a problem' link (support form not live yet)", page.locator("a[href*='/support']").count() == 0)
                sw = page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")
                check(f"{lang} {w}: no sideways scroll", sw)
                page.screenshot(path=str(OUT / f"live-dashboard-{lang}-{w}.png"))
            if route == "/account":
                page.wait_for_selector("[data-account-signed-out]:not([hidden])", timeout=20000)
                check(f"{lang} {w}: signed-out Account is only a log-in card", not page.locator("[data-account-body]").is_visible())
        ctx.close()
    b.close()
(OUT / "results.json").write_text(json.dumps(results, indent=1, ensure_ascii=False), encoding="utf-8")
print(f"\n{sum(r['ok'] for r in results)} of {len(results)} passed")
