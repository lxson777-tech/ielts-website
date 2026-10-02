"""C7: after the Writing model review (2 October 2026), every Writing lesson
shows its worked example, in the open build (signed out) and the gated build
(a free account, through the content door), with no page error; the model
answer bank lists every model.

  python c7_writing_examples.py <out-dir>
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from c_common import GATED, OPEN, account, new_ctx, ready, watch  # noqa: E402

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
LESSONS = ["method", "charts", "process", "maps", "task2-method", "opinion", "discussion", "advantages", "problem", "twopart"]
SECTION = "section:has(h2:text('What a Band 8 answer looks like'))"
results = []


def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": str(detail)[:300]})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{str(detail)[:200]}]" if detail and not ok else ""), flush=True)


with sync_playwright() as p:
    b = p.chromium.launch()
    for build, base, tier in (("open", OPEN, "open-visitor"), ("gated", GATED, "free")):
        ctx = new_ctx(b, "en", 1440, 900)
        page = ctx.new_page()
        errors = []
        account(page, tier, "c7")
        watch(page, errors, base)
        for lesson in LESSONS:
            errors.clear()
            page.goto(base + f"/lessons/writing/{lesson}", wait_until="domcontentloaded")
            ready(page, 3000)
            sec = page.locator(SECTION)
            ok = sec.count() == 1
            if ok:
                sec.locator("button").filter(has_text="Show").first.click() if sec.locator("button").filter(has_text="Show").count() else None
                page.wait_for_timeout(400)
                text = sec.inner_text()
                ok = "BAND 8 ANSWER" in text.upper() and "TASK RESPONSE" in text.upper() or "TASK ACHIEVEMENT" in text.upper()
                sec.screenshot(path=str(OUT / f"{build}-{lesson}.png"))
            check(f"{build}: /lessons/writing/{lesson} shows its Band 8 worked example, no error", ok and not errors, errors[:2])
        if build == "open":
            errors.clear()
            page.goto(base + "/writing/models", wait_until="domcontentloaded")
            ready(page, 2500)
            t = page.locator("main").inner_text()
            check("open: the model answer bank loads with no error and lists the new tasks", not errors and "teenagers" in t and "meals together" in t, errors[:2])
        ctx.close()
    b.close()
(OUT / "results.json").write_text(json.dumps(results, indent=1), encoding="utf-8")
print(f"\n{sum(r['ok'] for r in results)} of {len(results)} passed")
