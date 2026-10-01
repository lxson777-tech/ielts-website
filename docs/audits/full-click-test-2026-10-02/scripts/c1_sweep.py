"""C1: EVERY page of a build, opened by one kind of student.

  python c1_sweep.py <tier> <out-dir> [lang] [WxH]
  tier: visitor | free | paid | open-visitor (the open build, as live today)

For each page: it loads (no 404), React takes over without an uncaught error,
no console error, no failed request that is not an expected refusal, no
broken-screen wording, and every internal link on it points at a page or a
file that exists in the build. It also records whether the page showed the
calm locked state, so the tiers can be compared (paid: never locked; free:
lessons never locked).
"""
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from c_common import BROKEN_TEXT, DIST, GATED, OPEN, OPEN_DIST, account, exists, new_ctx, ready, routes, watch  # noqa: E402

tier = sys.argv[1]
OUT = Path(sys.argv[2])
lang = sys.argv[3] if len(sys.argv) > 3 else "en"
w, h = map(int, (sys.argv[4] if len(sys.argv) > 4 else "1440x900").split("x"))
OUT.mkdir(parents=True, exist_ok=True)
is_open = tier.startswith("open")
base = OPEN if is_open else GATED
dist = OPEN_DIST if is_open else DIST
pages = routes(dist)
only = sys.argv[5].split(",") if len(sys.argv) > 5 else None
if only:
    pages = [p for p in pages if any(p.startswith(o) for o in only)]

LINKS_JS = """() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))"""
STATE_JS = """() => ({
  title: document.title,
  locked: !!document.querySelector('[data-paid-locked]'),
  gated: !!document.querySelector('[data-lesson-gated], [data-signed-out-invite], .lesson-gate'),
  notFound: /page not found|страница не найдена/i.test(document.title + ' ' + (document.querySelector('h1')?.textContent || '')),
  text: (document.querySelector('main') || document.body).innerText.slice(0, 20000),
  lang: document.documentElement.lang,
})"""

rows = []
t0 = time.time()
with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
    ctx = new_ctx(browser, lang, w, h)
    page = ctx.new_page()
    email = account(page, tier, f"sweep-{tier}-{lang}")
    sink = []
    watch(page, sink, base)
    for i, route in enumerate(pages):
        sink.clear()
        row = {"route": route}
        try:
            resp = page.goto(base + route, wait_until="domcontentloaded", timeout=45000)
            row["status"] = resp.status if resp else None
            ready(page)
            st = page.evaluate(STATE_JS)
            row.update({k: st[k] for k in ("title", "locked", "gated", "notFound", "lang")})
            row["final"] = page.url.replace(base, "")
            bad = BROKEN_TEXT.findall(st["text"])
            row["brokenText"] = sorted(set(bad))[:5]
            links = page.evaluate(LINKS_JS)
            broken = []
            for href in links:
                if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
                    continue
                if href.startswith("http") and not href.startswith(base.rsplit("/ielts-website", 1)[0]):
                    continue  # another site
                path = href.split(base.rsplit("/ielts-website", 1)[0], 1)[-1]
                if path.startswith("/ielts-website") and not exists(dist, path):
                    broken.append(href)
                elif not path.startswith("/ielts-website") and path.startswith("/"):
                    broken.append(href + "  (missing /ielts-website)")
            row["brokenLinks"] = sorted(set(broken))
        except Exception as e:  # noqa: BLE001
            row["exception"] = str(e)[:300]
        row["errors"] = list(sink)
        rows.append(row)
        if i % 25 == 0:
            print(f"{i}/{len(pages)} {route} {time.time() - t0:.0f}s", flush=True)
    browser.close()

(OUT / "rows.json").write_text(json.dumps({"tier": tier, "lang": lang, "size": f"{w}x{h}", "email": email, "rows": rows}, indent=1, ensure_ascii=False), encoding="utf-8")
problems = [r for r in rows if r.get("exception") or r.get("notFound") or (r.get("status") or 0) >= 400 or r.get("brokenText") or r.get("brokenLinks") or r.get("errors")]
print(f"\n{tier} {lang} {w}x{h}: {len(rows)} pages, {len(problems)} with something to look at, {time.time() - t0:.0f}s")
