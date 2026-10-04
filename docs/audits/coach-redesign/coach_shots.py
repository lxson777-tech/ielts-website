"""Screenshots and checks for the coach panel redesign (4 October 2026).

Against two local dev servers of this worktree (open build, nothing paid):
  4610  PUBLIC_SPEAKING_GRADER_URL and PUBLIC_GRADER_URL set to an unused
        address, so the recorded Speaking trainer and the Writing trainer
        open (nothing is ever submitted, so no grader is called)
  4611  PUBLIC_LIVE_EXAMINER_URL set to an unused address, so
        /trainers/speaking is the live examiner's drills, opened with
        ?preview (no microphone, no session, no cost)

Run:  python docs/audits/coach-redesign/coach_shots.py
"""
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = Path(__file__).resolve().parent
SHOTS = HERE / "shots"
SHOTS.mkdir(exist_ok=True)
A = "http://127.0.0.1:4610/ielts-website"
B = "http://127.0.0.1:4611/ielts-website"
SIZES = {"1440": (1440, 900), "390": (390, 844)}
HYDRATED = """() => [...document.querySelectorAll('astro-island[ssr]')].every(el => !el.hasAttribute('ssr'))"""

INTRO = ("While some argue that sugary products should stay cheap, I firmly believe that a modest price rise "
         "would encourage healthier choices without harming most consumers.")
BODY1 = "The main reason is that price strongly shapes everyday buying."

results = []
errors = []


def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": str(detail)[:400]})
    print(("PASS " if ok else "FAIL ") + name + (f"  ({detail})" if detail and not ok else ""), flush=True)


def ctx_for(browser, lang, size):
    w, h = SIZES[size]
    phone = w < 720
    ctx = browser.new_context(viewport={"width": w, "height": h}, locale="ru-RU" if lang == "ru" else "en-GB",
                              device_scale_factor=1, is_mobile=phone, has_touch=phone)
    ctx.add_init_script(f"try{{ localStorage.setItem('ielts.locale.v1','{lang}') }}catch(e){{}}")
    for origin in ("http://127.0.0.1:4610", "http://127.0.0.1:4611"):
        ctx.grant_permissions(["microphone"], origin=origin)
    return ctx


def settle(page, ms=600):
    page.wait_for_load_state("domcontentloaded")
    try:
        page.wait_for_function(HYDRATED, timeout=60000)
    except Exception:  # noqa: BLE001
        pass
    page.wait_for_timeout(ms)


def watch(page, tag):
    page.on("pageerror", lambda e: errors.append({"tag": tag, "error": str(e)[:300]}))
    page.on("console", lambda m: errors.append({"tag": tag, "error": "console: " + m.text[:300]})
            if m.type == "error" and "127.0.0.1:9" not in m.text and "Failed to load resource" not in m.text else None)


def panel_shot(page, name, selector=".coach-panel"):
    """Desktop: the panel element. Phone: the viewport scrolled to the panel."""
    el = page.locator(selector).first
    el.scroll_into_view_if_needed()
    path = SHOTS / f"{name}.png"
    if page.viewport_size["width"] < 720:
        # Clear the floating header: the panel's top just under it.
        page.evaluate("(sel) => { const r = document.querySelector(sel).getBoundingClientRect(); window.scrollTo(0, r.top + window.scrollY - 84); }", selector)
        page.wait_for_timeout(700)
        page.screenshot(path=str(path), animations="disabled")
    else:
        # From the top of the page, so the floating header is not over the
        # panel's title (the panel is sticky beside the editor).
        page.evaluate("() => window.scrollTo(0, 0)")
        page.wait_for_timeout(700)
        el.screenshot(path=str(path), animations="disabled")
    return path


def tab_row_ok(page, tag):
    """One row, nothing wrapped, every tab 44px tall."""
    info = page.evaluate("""() => {
      const list = document.querySelector('.coach-panel [role=tablist]');
      const tabs = [...list.querySelectorAll('[role=tab]')];
      const tops = new Set(tabs.map(t => Math.round(t.getBoundingClientRect().top)));
      return { rows: tops.size, minH: Math.min(...tabs.map(t => t.getBoundingClientRect().height)),
               overflow: list.scrollWidth - list.clientWidth, n: tabs.length,
               pageOverflow: document.documentElement.scrollWidth - window.innerWidth };
    }""")
    check(f"{tag}: tabs on one row", info["rows"] == 1, info)
    check(f"{tag}: tabs fit without scrolling", info["overflow"] <= 1, info)
    check(f"{tag}: tab targets at least 44px", info["minH"] >= 44, info)
    check(f"{tag}: no sideways page scroll", info["pageOverflow"] <= 0, info)
    return info


def step_states(page, scope=".coach-tabpanel"):
    return page.evaluate(f"""() => [...document.querySelectorAll('{scope} .coach-path > li')].map(li => li.dataset.state)""")


def writing(browser, lang, size):
    tag = f"writing-{lang}-{size}"
    ctx = ctx_for(browser, lang, size)
    page = ctx.new_page()
    watch(page, tag)
    page.goto(A + "/trainers/writing", wait_until="domcontentloaded")
    settle(page)
    # Task 2 is the second practice card.
    page.locator("main button").filter(has_text=re.compile("Essay|Эссе")).first.click()
    page.wait_for_selector(".coach-panel", state="attached", timeout=30000)
    page.wait_for_timeout(500)
    phone = size == "390"
    if phone:
        page.locator(".writing-view-switch button").nth(1).click()
        page.wait_for_timeout(400)
    tab_row_ok(page, tag)

    # Keyboard: arrow keys move between tabs.
    page.locator(".coach-panel [role=tab][aria-selected=true]").focus()
    page.keyboard.press("ArrowRight")
    focused = page.evaluate("() => document.activeElement?.getAttribute('role') === 'tab' && document.activeElement.getAttribute('aria-selected')")
    check(f"{tag}: ArrowRight moves to and selects the next tab", focused == "true", focused)
    page.keyboard.press("Home")

    tabs = page.locator(".coach-panel [role=tab]")
    ids = ["question", "structure", "phrases", "avoid"]
    # Structure before typing.
    tabs.nth(1).click()
    page.wait_for_timeout(1000)
    states = step_states(page)
    check(f"{tag}: structure before typing starts on step 1", states[:2] == ["now", "later"], states)
    check(f"{tag}: no checkboxes in the coach", page.locator(".coach-panel input[type=checkbox]").count() == 0)
    panel_shot(page, f"{tag}-structure-empty")

    # Type two paragraphs: intro done, body 1 under way.
    if phone:
        page.locator(".writing-view-switch button").nth(0).click()
        page.wait_for_timeout(300)
    page.locator("textarea").first.fill(INTRO + "\n\n" + BODY1)
    if phone:
        page.locator(".writing-view-switch button").nth(1).click()
        page.wait_for_timeout(400)
    else:
        page.wait_for_timeout(1000)
    states = step_states(page)
    check(f"{tag}: after two paragraphs intro is done and Body 1 is now", states[:3] == ["done", "now", "later"], states)
    sr = page.locator(".coach-tabpanel .coach-path > li").first.inner_text()
    check(f"{tag}: done state is in the text for screen readers", ("done" in sr) or ("готово" in sr), sr)
    panel_shot(page, f"{tag}-structure-typed")
    if not phone:
        page.evaluate("() => window.scrollTo(0, document.querySelector('.writing-workspace').getBoundingClientRect().top + window.scrollY - 110)")
        page.wait_for_timeout(500)
        page.screenshot(path=str(SHOTS / f"{tag}-structure-typed-page.png"), animations="disabled")

    for i, tid in enumerate(ids):
        if tid == "structure":
            continue
        tabs.nth(i).click()
        page.wait_for_timeout(1000)
        if tid == "question":
            q_states = step_states(page)
            check(f"{tag}: question plan follows the essay too", q_states[:2] == ["done", "now"], q_states)
            opened = page.evaluate("() => [...document.querySelectorAll('.coach-tabpanel .coach-path > li')].map(li => !!li.querySelector('details[open]'))")
            check(f"{tag}: only the step being written has its tips open", opened[:3] == [False, True, False], opened)
        panel_shot(page, f"{tag}-{tid}")
        if tid in ("question", "phrases") and not phone:
            el = page.locator(".coach-panel").first
            el.screenshot(path=str(SHOTS / f"{tag}-{tid}-full.png"), animations="disabled")
    ctx.close()


def speaking_recorded(browser, lang, size, part):
    tag = f"speaking-part{part}-{lang}-{size}"
    ctx = ctx_for(browser, lang, size)
    page = ctx.new_page()
    watch(page, tag)
    page.goto(A + "/trainers/speaking", wait_until="domcontentloaded")
    settle(page)
    page.locator(".speaking-part-card").nth(part - 1).click()
    page.wait_for_selector(".coach-panel", timeout=30000)
    page.wait_for_timeout(1200)
    tab_row_ok(page, tag)
    check(f"{tag}: no checkboxes and no fold-outs in the plan",
          page.locator(".coach-panel input[type=checkbox], .coach-panel details").count() == 0)
    n = page.locator(".coach-tabpanel .coach-path > li").count()
    check(f"{tag}: method shown as a numbered path", n >= 3, n)
    panel_shot(page, f"{tag}-plan")
    if size == "1440":
        page.evaluate("() => window.scrollTo(0, 0)")
        page.wait_for_timeout(400)
        page.screenshot(path=str(SHOTS / f"{tag}-page.png"), animations="disabled")
        tabs = page.locator(".coach-panel [role=tab]")
        for i, tid in enumerate(["phrases", "avoid"], start=1):
            tabs.nth(i).click()
            page.wait_for_timeout(1000)
            panel_shot(page, f"{tag}-{tid}")
    ctx.close()


def live_drawer(browser, lang, size, which):
    tag = f"live-drill-{which}-{lang}-{size}"
    ctx = ctx_for(browser, lang, size)
    page = ctx.new_page()
    watch(page, tag)
    page.goto(B + "/trainers/speaking?preview=" + which, wait_until="domcontentloaded")
    settle(page, 1200)
    btn = page.locator(".ob-tips-btn")
    if not btn.count():
        check(f"{tag}: Tips control present", False, "no .ob-tips-btn (orb look not active?)")
        page.screenshot(path=str(SHOTS / f"{tag}-missing.png"), animations="disabled")
        ctx.close()
        return
    btn.first.click()
    page.wait_for_selector(".ob-drawer .coach-panel", timeout=10000)
    page.wait_for_timeout(1200)
    info = page.evaluate("""() => {
      const list = document.querySelector('.ob-drawer [role=tablist]');
      const tabs = [...list.querySelectorAll('[role=tab]')];
      return { rows: new Set(tabs.map(t => Math.round(t.getBoundingClientRect().top))).size, overflow: list.scrollWidth - list.clientWidth };
    }""")
    check(f"{tag}: drawer tabs on one row", info["rows"] == 1 and info["overflow"] <= 1, info)
    page.screenshot(path=str(SHOTS / f"{tag}-tips.png"), animations="disabled")
    ctx.close()


def reduced_motion(browser):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="en-GB", reduced_motion="reduce")
    ctx.add_init_script("try{ localStorage.setItem('ielts.locale.v1','en') }catch(e){}")
    page = ctx.new_page()
    page.goto(A + "/trainers/writing", wait_until="domcontentloaded")
    settle(page)
    page.locator("main button").filter(has_text=re.compile("Essay")).first.click()
    page.wait_for_selector(".coach-panel", timeout=30000)
    page.locator(".coach-panel [role=tab]").nth(1).click()
    page.wait_for_timeout(500)
    d = page.evaluate("() => ['.coach-step-mark', '.coach-tab'].map(s => getComputedStyle(document.querySelector(s)).transitionDuration)")
    check("reduced motion: step and tab transitions are off", all(float(v.strip().rstrip("s") or 0) < 0.01 for x in d for v in x.split(",")), d)
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"])
    reduced_motion(browser)
    for lang in ("en", "ru"):
        for size in ("1440", "390"):
            for fn, args in ((writing, ()),
                             (speaking_recorded, (1,)), (speaking_recorded, (2,)), (speaking_recorded, (3,)),
                             (live_drawer, ("part1",)), (live_drawer, ("part2",))):
                try:
                    fn(browser, lang, size, *args)
                except Exception as e:  # noqa: BLE001
                    check(f"{fn.__name__} {lang} {size} {args}: ran", False, repr(e)[:300])
    browser.close()

(HERE / "results.json").write_text(json.dumps({"checks": results, "pageErrors": errors}, ensure_ascii=False, indent=1), encoding="utf-8")
failed = [r for r in results if not r["ok"]]
print(f"\n{len(results) - len(failed)} / {len(results)} passed; {len(errors)} page errors")
for e in errors[:20]:
    print("ERROR", e)
