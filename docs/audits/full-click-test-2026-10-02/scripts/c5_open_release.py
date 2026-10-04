"""C5: the open build (what goes live), signed in, against a database that
has only the migrations production has (the open stand-in on 8842 runs no
paid-access, trial or support migration). Every call to the database and
every failed request is recorded, so a feature that needs an unapplied
migration shows up before it reaches real students.

  python c5_open_release.py <out-dir>
"""
import collections
import json
import re
import sys
import urllib.parse
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from c_common import OPEN, PASSWORD, STAMP, fill_profile, new_ctx, ready  # noqa: E402

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
ROUTES = [
    "/dashboard", "/start", "/learn", "/learn/bands", "/report", "/plan-settings", "/account", "/account#work", "/profile",
    "/trainers", "/trainers/reading", "/trainers/listening", "/trainers/writing", "/trainers/speaking",
    "/trainers/reading/reading-full-001-drill-p1", "/trainers/focused/listening-categorisation-check-a",
    "/tests", "/tests/reading-full-001", "/tests/listening-full-001", "/tests/mock", "/review",
    "/writing/checker", "/writing/models", "/speaking/examiner", "/speaking/cue-cards",
    "/lessons/reading/tfng", "/lessons/writing/problem", "/lessons/speaking/part2", "/lessons/vocabulary/environment",
    "/help", "/support", "/privacy", "/terms",
]

calls = collections.Counter()
bad = []


def sign_up(page, email):
    page.goto(OPEN + "/sign-up?next=" + urllib.parse.quote("/dashboard", safe=""), wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=40000)
    ready(page)
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    # Since 2 October sign-up needs the consent tick (src/lib/legal/consent.ts).
    if page.locator("#signup-consent").count():
        page.locator("#signup-consent").check(force=True)
    page.locator("button.auth-button[type=submit]").click()
    fill_profile(page)
    page.wait_for_url("**/dashboard**", timeout=40000)


with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
    for who, email, routes in (("student", f"c5-open-{STAMP}@example.test", ROUTES), ("admin", "admin@example.test", ["/admin"])):
        ctx = new_ctx(browser, "en", 1440, 900)
        page = ctx.new_page()
        page.on("dialog", lambda d: d.accept() if d.type == "beforeunload" else d.dismiss())

        def on_response(r, who=who):
            if "127.0.0.1:8842" in r.url or "/ielts-website/" in r.url:
                path = re.sub(r"\?.*", "", r.url.split("8842", 1)[-1]) if "8842" in r.url else None
                if path:
                    calls[(who, r.request.method, path, r.status)] += 1
                if r.status >= 400:
                    bad.append({"who": who, "status": r.status, "req": r.request.method + " " + r.url[:160], "page": page.url})

        page.on("response", on_response)
        page.on("pageerror", lambda e, who=who: bad.append({"who": who, "status": "pageerror", "req": str(e)[:200], "page": page.url}))
        try:
            sign_up(page, email)
        except Exception:  # noqa: BLE001
            # admin@example.test may exist already on this stand-in: sign in instead.
            page.goto(OPEN + "/sign-in?next=%2Fdashboard", wait_until="domcontentloaded")
            page.wait_for_selector("#signin-email", timeout=30000)
            page.locator("#signin-email").fill(email)
            page.locator("#signin-password").fill(PASSWORD)
            page.locator("button.auth-button[type=submit]").click()
            page.wait_for_url("**/dashboard**", timeout=30000)
        for route in routes:
            page.goto(OPEN + route, wait_until="domcontentloaded")
            ready(page, 2500)
            # A few representative presses per page: tabs, folding sections, Mr EZ.
            for sel in ("[data-account-tab]", "main summary", "button.mrez-launcher"):
                for el in page.locator(sel).all()[:4]:
                    try:
                        if el.is_visible():
                            el.click(timeout=3000)
                            page.wait_for_timeout(400)
                            page.keyboard.press("Escape")
                    except Exception:  # noqa: BLE001
                        pass
            if route == "/admin":
                page.wait_for_timeout(2500)
                page.screenshot(path=str(OUT / "open-admin.png"), full_page=True)
            if route in ("/support", "/help", "/privacy", "/account"):
                page.screenshot(path=str(OUT / f"open{route.replace('/', '-').replace('#', '-')}.png"), full_page=True)
        ctx.close()
    browser.close()

rows = [{"who": k[0], "method": k[1], "path": k[2], "status": k[3], "count": n} for k, n in sorted(calls.items())]
(OUT / "calls.json").write_text(json.dumps({"calls": rows, "failures": bad}, indent=1), encoding="utf-8")
print("database calls (who, method, path, status, count):")
for r in rows:
    if r["path"].startswith(("/rest", "/auth", "/tutor", "/functions")):
        print(f"  {r['who']:7} {r['method']:5} {r['path'][:70]:70} {r['status']} x{r['count']}")
print(f"\nfailures: {len(bad)}")
for b in bad[:30]:
    print("  ", b)
