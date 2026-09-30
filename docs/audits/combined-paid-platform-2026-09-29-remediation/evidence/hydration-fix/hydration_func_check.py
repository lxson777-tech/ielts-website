import sys, json, re
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8")
B = "http://localhost:4472/ielts-website"
OUT = sys.argv[1]
res = []
def ok(name, cond, detail=""):
    res.append((name, bool(cond), str(detail)[:200])); print(("PASS " if cond else "FAIL ") + name + ("  [" + str(detail)[:200] + "]" if detail else ""), flush=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, locale="en-GB")
    page = ctx.new_page(); errs = []
    page.on("pageerror", lambda e: errs.append(str(e)[:200]))
    # model answers deep link
    page.goto(B + "/writing/models?task=pte-wt-131-task2&reason=from-session", wait_until="domcontentloaded"); page.wait_for_timeout(3000)
    href = page.evaluate("() => [...document.querySelectorAll('a')].map(a => a.getAttribute('href')).find(h => h && h.includes('task=pte-wt-131-task2')) || ''")
    ok("models: linked task is the one on screen (its 'write this one' link)", "pte-wt-131-task2" in href, href)
    ok("models: 'from your session' note shown", page.locator("text=/session/i").count() > 0)
    page.screenshot(path=OUT + "/models-deeplink.png")
    # default models page opens on first task, not the linked one
    page.goto(B + "/writing/models", wait_until="domcontentloaded"); page.wait_for_timeout(2500)
    href2 = page.evaluate("() => [...document.querySelectorAll('a')].map(a => a.getAttribute('href')).find(h => h && /checker\?task=|trainers\/writing\?task=/.test(h)) || ''")
    ok("models: no link -> default first task", "pte-wt-131-task2" not in href2, href2)
    # cue card deep link
    page.goto(B + "/speaking/cue-cards?card=place-city-visit&reason=from-session", wait_until="domcontentloaded"); page.wait_for_timeout(3000)
    body = page.inner_text("body")
    ok("cue cards: detail view of the linked card (its question and the 'All cue cards' way back)", "Describe a city you would like to visit" in body and "All cue cards" in body)
    page.screenshot(path=OUT + "/cue-card-deeplink.png")
    page.goto(B + "/speaking/cue-cards", wait_until="domcontentloaded"); page.wait_for_timeout(2500)
    ok("cue cards: no link -> the grid", "All cue cards" not in page.inner_text("main"))
    # band ladder deep link
    page.goto(B + "/learn/bands?paper=speaking&criterion=lexicalResource&from=7&reason=from-session", wait_until="domcontentloaded"); page.wait_for_timeout(3000)
    sel = page.evaluate("() => [...document.querySelectorAll('[role=tab][aria-selected=true], [aria-pressed=true]')].map(e => e.innerText.trim())")
    ok("bands: Speaking + Lexical Resource + band 7 selected", any("Speaking" in s for s in sel) and any("Lexical" in s for s in sel) and any("7" in s for s in sel), sel)
    page.screenshot(path=OUT + "/bands-deeplink.png")
    # resume a sitting: start, answer, reload
    page.goto(B + "/tests/reading-full-001", wait_until="domcontentloaded"); page.wait_for_timeout(2500)
    page.evaluate("() => localStorage.clear()"); page.reload(wait_until="domcontentloaded"); page.wait_for_timeout(2500)
    ok("test: fresh visit shows the instructions with Start test", page.locator("button", has_text="Start test").count() > 0)
    page.locator("button", has_text="Start test").first.click(); page.wait_for_timeout(1500)
    inp = page.locator("input[type=text]:visible, input[type=radio]:visible").first
    typ = inp.get_attribute("type")
    if typ == "radio": inp.check(force=True)
    else: inp.fill("resume-check")
    page.wait_for_timeout(6000)
    before = page.evaluate("() => JSON.stringify(Object.keys(localStorage).filter(k => k.includes('session') || k.includes('sitting')).map(k => [k, localStorage.getItem(k).length]))")
    errs.clear(); page.reload(wait_until="domcontentloaded"); page.wait_for_timeout(3500)
    ok("test: after reload the paper is running again (no Start test button)", page.locator("button", has_text="Start test").count() == 0)
    if typ == "radio":
        kept = page.locator("input[type=radio]:checked").count() > 0
    else:
        kept = page.locator("input[type=text]:visible").first.input_value() == "resume-check"
    ok("test: the answer given before the reload is still there", kept, typ)
    clock = page.evaluate("() => { const e = document.querySelector('[role=timer], [aria-label*=remaining]'); return e ? e.innerText.replace(/[^0-9:]/g, '') : ''; }")
    ok("test: the clock carried on from the saved deadline (59:xx, not back to 60:00)", clock.startswith("59:"), clock)
    ok("test: no page errors on the reload", not errs, errs[:1])
    page.screenshot(path=OUT + "/test-resumed.png")
    b.close()
print(sum(1 for r in res if r[1]), "of", len(res), "passed")
