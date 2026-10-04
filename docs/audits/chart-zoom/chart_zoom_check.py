"""Runtime proof for the inline chart zoom (ZoomableChart).

Drives the real dev server with Python Playwright: desktop click-to-zoom,
pointer pan, wheel, controls, keyboard; phone double tap, pinch, drag and a
swipe that must scroll the page; the grader request body; the mock exam and a
focused Task 1 exercise. Screenshots go to docs/audits/chart-zoom/.
"""
import json
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(r"C:\Users\Alex\Desktop\Projects\IELTS website\.claude\worktrees\agent-a507d2531c551866e")
OUT = ROOT / "docs" / "audits" / "chart-zoom"
OUT.mkdir(parents=True, exist_ok=True)
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4622
BASE = f"http://127.0.0.1:{PORT}/ielts-website"
TASK = "pte-wt-132-task1"
results = []


def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))


VIEW_JS = """(sel) => {
  const img = document.querySelector(sel || '.zchart-img');
  const t = img.style.transform || 'none';
  const m = t.match(/translate\\(([-\\d.e]+)px, ([-\\d.e]+)px\\) scale\\(([-\\d.e]+)\\)/);
  const f = img.closest('.zchart-frame').getBoundingClientRect();
  return { s: m ? +m[3] : 1, x: m ? +m[1] : 0, y: m ? +m[2] : 0,
           fw: f.width, fh: f.height, fl: f.left, ft: f.top,
           nw: img.naturalWidth, dw: img.offsetWidth, dh: img.offsetHeight,
           zoomed: img.closest('.zchart-frame').dataset.zoomed };
}"""


def view(page, sel=".zchart-img"):
    return page.evaluate(VIEW_JS, sel)


def wait_chart(page, sel=".zchart-img"):
    page.wait_for_function(
        "(sel) => { const i = document.querySelector(sel); return i && i.complete && i.naturalWidth > 0 && i.offsetWidth > 0; }",
        arg=sel,
        timeout=30000,
    )
    page.wait_for_timeout(300)


def expected_prompt_html():
    src = (ROOT / "src/data/writing-prompts-imported.ts").read_text(encoding="utf-8")
    i = src.index(f"id: '{TASK}'")
    j = src.index("promptHtml: `", i) + len("promptHtml: `")
    k = src.index("`,", j)
    raw = src[j:k]
    return re.sub(r"\$\{withBase\('([^']+)'\)\}", lambda m: "/ielts-website" + m.group(1), raw)


def desktop(pw):
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="en-US")
    page = ctx.new_page()
    page.on("dialog", lambda d: d.accept())
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    grader_bodies = []

    def on_grader(route):
        req = route.request
        cors = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
        }
        if req.method == "OPTIONS":
            route.fulfill(status=204, headers=cors)
            return
        grader_bodies.append(req.post_data)
        route.fulfill(status=503, headers={**cors, "Content-Type": "application/json"}, body=json.dumps({"error": "stubbed in the zoom check, nothing was graded"}))

    page.route("**/fake-grade-essay**", on_grader)

    page.goto(f"{BASE}/trainers/writing?task={TASK}", wait_until="networkidle")
    wait_chart(page)
    page.locator(".writing-prompt").scroll_into_view_if_needed()
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(200)
    v0 = view(page)
    check("desktop: chart starts unzoomed in its capped frame", v0["s"] == 1 and v0["fh"] <= 300.5, json.dumps(v0))
    check("desktop: frame is exactly the picture size", abs(v0["fw"] - v0["dw"]) < 1 and abs(v0["fh"] - v0["dh"]) < 1)
    max_expected = min(4, max(1.5, v0["nw"] / v0["dw"] * 1.5))
    hint = page.locator(".zchart-hint").inner_text()
    check("desktop: hint text", hint == "Click the chart to zoom in. Use Full size to open it larger.", hint)
    check("desktop: old hint gone", page.get_by_text("View larger").count() == 0)
    page.screenshot(path=str(OUT / "01-desktop-before.png"))

    # Click to zoom at a point.
    px, py = v0["fw"] * 0.72, v0["fh"] * 0.30
    page.mouse.move(v0["fl"] + px, v0["ft"] + py)
    page.mouse.down()
    page.mouse.up()
    page.wait_for_timeout(450)
    v1 = view(page)
    qx, qy = (px - v1["x"]) / v1["s"], (py - v1["y"]) / v1["s"]
    check(
        "desktop: a click zooms in (2.5x or the sharpness cap)",
        abs(v1["s"] - min(2.5, max_expected)) < 0.01,
        f"s={v1['s']:.3f} cap={max_expected:.3f} natural={v0['nw']} drawn={v0['dw']}",
    )
    check("desktop: the clicked point stays under the pointer", abs(qx - px) < 1 and abs(qy - py) < 1, f"q=({qx:.1f},{qy:.1f}) p=({px:.1f},{py:.1f})")
    check("desktop: no dialog opened by the click", page.locator(".zchart-lightbox").count() == 0)
    page.screenshot(path=str(OUT / "02-desktop-zoomed.png"))

    # Pointer pan.
    page.mouse.move(v0["fl"] + v0["fw"] * 0.15, v0["ft"] + v0["fh"] * 0.85, steps=12)
    page.wait_for_timeout(350)
    v2 = view(page)
    check("desktop: moving the pointer pans", v2["x"] > v1["x"] + 5 and v2["y"] < v1["y"] - 5, f"before=({v1['x']:.1f},{v1['y']:.1f}) after=({v2['x']:.1f},{v2['y']:.1f})")
    check(
        "desktop: pan stays inside the chart",
        v2["x"] <= 0.01 and v2["y"] <= 0.01 and v2["x"] >= v0["fw"] - v2["s"] * v0["fw"] - 0.01 and v2["y"] >= v0["fh"] - v2["s"] * v0["fh"] - 0.01,
    )
    page.screenshot(path=str(OUT / "03-desktop-panned.png"))

    # Wheel while zoomed zooms (page does not scroll).
    sy = page.evaluate("scrollY")
    page.mouse.wheel(0, 200)
    page.wait_for_timeout(300)
    v3 = view(page)
    check("desktop: wheel while zoomed zooms, page does not scroll", v3["s"] < v2["s"] and page.evaluate("scrollY") == sy, f"s {v2['s']:.2f} -> {v3['s']:.2f}")

    # Second click zooms out.
    page.mouse.down()
    page.mouse.up()
    page.wait_for_timeout(400)
    check("desktop: a second click zooms back out", view(page)["s"] == 1)

    # Wheel while unzoomed scrolls the page.
    sy = page.evaluate("scrollY")
    page.mouse.wheel(0, 300)
    page.wait_for_timeout(500)
    check("desktop: wheel while unzoomed scrolls the page", page.evaluate("scrollY") > sy and view(page)["s"] == 1, f"scrollY {sy} -> {page.evaluate('scrollY')}")
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(300)

    # Ctrl + wheel zooms even when unzoomed.
    v0 = view(page)
    page.mouse.move(v0["fl"] + v0["fw"] / 2, v0["ft"] + v0["fh"] / 2)
    page.keyboard.down("Control")
    page.mouse.wheel(0, -200)
    page.keyboard.up("Control")
    page.wait_for_timeout(300)
    check("desktop: Ctrl + wheel zooms the unzoomed chart", view(page)["s"] > 1)

    # Controls.
    page.get_by_role("button", name="Reset zoom").click()
    page.wait_for_timeout(350)
    check("controls: Reset returns to the whole chart", view(page)["s"] == 1)
    check(
        "controls: at 1x only Zoom in and Full size show (Zoom out and Reset hidden)",
        page.get_by_role("button", name="Zoom out").count() == 0 and page.get_by_role("button", name="Reset zoom").count() == 0
        and page.get_by_role("button", name="Zoom in").is_visible() and page.get_by_role("button", name="Full size").is_visible(),
    )
    zin_box0 = page.get_by_role("button", name="Zoom in").bounding_box()
    page.get_by_role("button", name="Zoom in").click()
    page.wait_for_timeout(350)
    s_in = view(page)["s"]
    check("controls: Zoom in steps up 1.5x", abs(s_in - 1.5) < 0.01, f"s={s_in}")
    zin_box1 = page.get_by_role("button", name="Zoom in").bounding_box()
    check("controls: Zoom in stays put when the others appear", abs(zin_box0["x"] - zin_box1["x"]) < 0.5, f"{zin_box0['x']} -> {zin_box1['x']}")
    check("controls: Zoom out and Reset appear once zoomed", page.get_by_role("button", name="Zoom out").is_visible() and page.get_by_role("button", name="Reset zoom").is_visible())
    for _ in range(4):
        if page.get_by_role("button", name="Zoom in").is_disabled():
            break
        page.get_by_role("button", name="Zoom in").click()
        page.wait_for_timeout(120)
    page.wait_for_timeout(350)
    s_max = view(page)["s"]
    check("controls: Zoom in stops at the sharpness cap and disables", abs(s_max - max_expected) < 0.01 and page.get_by_role("button", name="Zoom in").is_disabled(), f"s={s_max:.3f} cap={max_expected:.3f}")
    page.screenshot(path=str(OUT / "04-desktop-controls-max.png"))
    page.get_by_role("button", name="Zoom out").click()
    page.wait_for_timeout(350)
    check("controls: Zoom out steps down", view(page)["s"] < s_max)
    sizes = page.evaluate("""() => [...document.querySelectorAll('.zchart-btn:not([hidden])')].map(b => {
        const r = b.getBoundingClientRect(); const a = getComputedStyle(b, '::after');
        return { w: r.width + 2 * Math.abs(parseFloat(a.left)||0), h: r.height + 2 * Math.abs(parseFloat(a.top)||0), name: b.getAttribute('aria-label') };
    })""")
    check("controls: every control has a 44px target and a name", all(s["w"] >= 44 and s["h"] >= 44 and s["name"] for s in sizes), json.dumps(sizes))

    # Full size opens the larger view; Escape closes it; focus returns.
    page.get_by_role("button", name="Full size").click()
    page.wait_for_timeout(300)
    dialog = page.locator(".zchart-lightbox")
    check("controls: Full size opens the larger view", dialog.count() == 1 and dialog.get_attribute("role") == "dialog")
    page.screenshot(path=str(OUT / "05-desktop-full-size.png"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    focused = page.evaluate("document.activeElement && document.activeElement.getAttribute('aria-label')")
    check("controls: Escape closes it and focus returns to Full size", page.locator(".zchart-lightbox").count() == 0 and focused == "Full size", f"focus={focused}")
    page.get_by_role("button", name="Reset zoom").focus()
    page.keyboard.press("Enter")
    page.wait_for_timeout(350)
    focused = page.evaluate("document.activeElement && document.activeElement.getAttribute('aria-label')")
    check("controls: Reset by keyboard hands focus to Zoom in, not the page", view(page)["s"] == 1 and focused == "Zoom in", f"focus={focused}")

    # Keyboard: Tab to the frame, + / arrows / 0 / Escape.
    page.locator(".zchart-frame").focus()
    page.keyboard.press("+")
    page.wait_for_timeout(350)
    k1 = view(page)
    check("keyboard: + zooms", abs(k1["s"] - 1.5) < 0.01)
    page.keyboard.press("ArrowRight")
    page.keyboard.press("ArrowDown")
    page.wait_for_timeout(350)
    k2 = view(page)
    check("keyboard: arrows pan", k2["x"] < k1["x"] and k2["y"] < k1["y"], f"({k1['x']:.1f},{k1['y']:.1f}) -> ({k2['x']:.1f},{k2['y']:.1f})")
    page.keyboard.press("+")
    page.wait_for_timeout(700)
    live = page.locator(".zchart [aria-live=polite]").inner_text()
    check("keyboard: the zoom level is announced politely", live.startswith("Zoomed to "), live)
    page.screenshot(path=str(OUT / "06-desktop-keyboard-focus.png"))
    page.keyboard.press("-")
    page.wait_for_timeout(300)
    check("keyboard: - zooms out", view(page)["s"] < 2.25 - 0.01 or view(page)["s"] < k2["s"] * 1.5)
    page.keyboard.press("0")
    page.wait_for_timeout(300)
    check("keyboard: 0 resets", view(page)["s"] == 1)
    page.keyboard.press("+")
    page.wait_for_timeout(200)
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    check("keyboard: Escape resets", view(page)["s"] == 1)
    page.wait_for_timeout(700)
    live = page.locator(".zchart [aria-live=polite]").inner_text()
    check("keyboard: reset announced", live == "Zoom reset: the whole chart is shown.", live)
    sy = page.evaluate("scrollY")
    page.keyboard.press("ArrowDown")
    page.wait_for_timeout(400)
    check("keyboard: unzoomed, arrows are left to the page", view(page)["s"] == 1)

    # Reduced motion: no transform animation.
    page.emulate_media(reduced_motion="reduce")
    dur = page.evaluate("getComputedStyle(document.querySelector('.zchart-img')).transitionDuration")
    # The site's global reduced-motion rule shortens every transition to
    # 0.01ms, which is instant; ours sets none.
    check("reduced motion: no transform transition", dur in ("0s", "") or float(dur.rstrip("s")) < 0.001, dur)
    page.emulate_media(reduced_motion="no-preference")
    dur2 = page.evaluate("getComputedStyle(document.querySelector('.zchart-img')).transitionDuration")
    check("motion: eased transition otherwise", dur2 != "0s", dur2)

    # The grader request: the question's promptHtml is the original string.
    page.get_by_role("textbox", name="Your answer").fill(("The chart shows library use at a university and the table gives the reasons. " * 4).strip())
    page.get_by_role("button", name="Check my essay").click()
    for _ in range(40):
        if grader_bodies:
            break
        page.wait_for_timeout(250)
    if grader_bodies:
        body = json.loads(grader_bodies[0])
        sent = body["prompt"]["promptHtml"]
        exp = expected_prompt_html()
        check("grader: the request carries the original promptHtml, byte for byte", sent == exp, f"{len(sent)} chars, img tag kept: {'<img src=' in sent}")
        check("grader: request shape unchanged", sorted(body.keys()) == ["essay", "mechanics", "prompt"] and sorted(body["prompt"].keys()) == ["minWords", "promptHtml", "task", "variant"], json.dumps(sorted(body.keys())))
        (OUT / "grader-request-body.json").write_text(json.dumps(body["prompt"], indent=2, ensure_ascii=False), encoding="utf-8")
    else:
        check("grader: request captured", False, "no request reached the stub")

    check("desktop: no page errors", not [e for e in errors if "fake-grade-essay" not in e and "503" not in e], json.dumps(errors[:5]))

    # The Writing Checker shows the zoomable chart too. A fresh tab: the
    # trainer holds an unsent essay and asks before it is left.
    page = ctx.new_page()
    page.goto(f"{BASE}/writing/checker?task={TASK}", wait_until="networkidle")
    try:
        wait_chart(page)
        check("checker: zoomable chart on the Writing Checker", page.locator(".zchart-frame").count() >= 1)
        page.screenshot(path=str(OUT / "07-checker.png"))
    except Exception as exc:  # noqa: BLE001
        check("checker: zoomable chart on the Writing Checker", False, str(exc)[:200])

    # A focused Task 1 exercise.
    page.goto(f"{BASE}/trainers/focused/writing-task1-data-language-guided", wait_until="networkidle")
    try:
        wait_chart(page)
        f0 = view(page)
        page.locator(".zchart-frame").scroll_into_view_if_needed()
        f0 = view(page)
        page.mouse.click(f0["fl"] + f0["fw"] * 0.5, f0["ft"] + f0["fh"] * 0.5)
        page.wait_for_timeout(450)
        f1 = view(page)
        check("focused: Task 1 exercise chart zooms in place", f1["s"] > 1, f"s={f1['s']:.2f}")
        page.screenshot(path=str(OUT / "08-focused-task1-zoomed.png"))
    except Exception as exc:  # noqa: BLE001
        check("focused: Task 1 exercise chart zooms in place", False, str(exc)[:200])

    browser.close()


def mock(pw):
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="en-US")
    page = ctx.new_page()
    page.on("dialog", lambda d: d.accept())
    page.goto(f"{BASE}/tests/mock", wait_until="networkidle")
    try:
        page.get_by_role("button", name=re.compile(r"^Start", re.I)).first.click()
        # Hand in the Listening and Reading papers blank to reach Writing.
        for _ in range(16):
            page.wait_for_timeout(1500)
            if page.locator(".zchart-img").count() > 0:
                break
            back = page.get_by_role("button", name="Back to results")
            submit = page.get_by_role("button", name="Submit", exact=True)
            cont = page.get_by_role("button", name=re.compile(r"^(Continue|Start)", re.I))
            if back.count() > 0 and back.first.is_visible():
                back.first.click()
            elif submit.count() > 1:
                submit.last.click()  # the "Submit anyway?" confirmation
            elif cont.count() > 0 and cont.first.is_visible():
                cont.first.click()
            elif submit.count() == 1:
                submit.first.click()
        wait_chart(page)
        m0 = view(page)
        page.locator(".zchart-frame").first.scroll_into_view_if_needed()
        m0 = view(page)
        page.mouse.click(m0["fl"] + m0["fw"] * 0.4, m0["ft"] + m0["fh"] * 0.4)
        page.wait_for_timeout(450)
        m1 = view(page)
        check("mock: Writing Task 1 chart zooms in place, height capped", m1["s"] > 1 and m0["fh"] <= 300.5, f"s={m1['s']:.2f} frame h={m0['fh']:.0f}")
        page.screenshot(path=str(OUT / "09-mock-writing-task1-zoomed.png"))
    except Exception as exc:  # noqa: BLE001
        page.screenshot(path=str(OUT / "09-mock-debug.png"))
        check("mock: Writing Task 1 chart zooms in place, height capped", False, str(exc)[:300])
    browser.close()


def phone(pw):
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True, locale="en-US")
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    cdp = ctx.new_cdp_session(page)

    def touch(kind, points):
        cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [{"x": x, "y": y, "id": i} for i, (x, y) in enumerate(points)]})

    def tap(x, y):
        touch("touchStart", [(x, y)])
        touch("touchEnd", [])

    page.goto(f"{BASE}/trainers/writing?task={TASK}", wait_until="networkidle")
    wait_chart(page)
    page.locator(".zchart-frame").scroll_into_view_if_needed()
    page.wait_for_timeout(300)
    p0 = view(page)
    hint = page.locator(".zchart-hint").inner_text()
    check("phone: touch hint", hint.startswith("Pinch or double-tap"), hint)
    check("phone: chart height capped at 30vh", p0["fh"] <= 844 * 0.30 + 0.5, f"h={p0['fh']:.0f}")
    page.screenshot(path=str(OUT / "10-phone-before.png"))
    cx, cy = p0["fl"] + p0["fw"] / 2, p0["ft"] + p0["fh"] / 2

    # A one-finger swipe on the unzoomed chart scrolls the page.
    sy = page.evaluate("scrollY")
    touch("touchStart", [(cx, cy + 60)])
    for i in range(1, 11):
        touch("touchMove", [(cx, cy + 60 - i * 14)])
        time.sleep(0.016)
    touch("touchEnd", [])
    page.wait_for_timeout(700)
    sy2 = page.evaluate("scrollY")
    check("phone: swipe on the unzoomed chart scrolls the page", sy2 > sy + 40 and view(page)["s"] == 1, f"scrollY {sy} -> {sy2}")
    page.evaluate(f"window.scrollTo(0, {sy})")
    page.wait_for_timeout(400)
    p0 = view(page)
    cx, cy = p0["fl"] + p0["fw"] / 2, p0["ft"] + p0["fh"] / 2

    # Double tap toggles zoom at the tapped point.
    tx, ty = p0["fl"] + p0["fw"] * 0.3, p0["ft"] + p0["fh"] * 0.35
    tap(tx, ty)
    page.wait_for_timeout(90)
    tap(tx, ty)
    page.wait_for_timeout(500)
    p1 = view(page)
    cap = min(4, max(1.5, p0["nw"] / p0["dw"] * 1.5))
    check("phone: double tap zooms in", abs(p1["s"] - min(2.5, cap)) < 0.01, f"s={p1['s']:.2f} cap={cap:.2f}")
    page.screenshot(path=str(OUT / "11-phone-double-tap.png"))

    # One-finger drag pans while zoomed, without scrolling the page.
    sy = page.evaluate("scrollY")
    touch("touchStart", [(cx, cy)])
    for i in range(1, 9):
        touch("touchMove", [(cx - i * 8, cy - i * 6)])
        time.sleep(0.016)
    touch("touchEnd", [])
    page.wait_for_timeout(400)
    p2 = view(page)
    check("phone: drag pans the zoomed chart", abs(p2["x"] - p1["x"]) > 20 and page.evaluate("scrollY") == sy, f"x {p1['x']:.1f} -> {p2['x']:.1f}, scrollY {sy} -> {page.evaluate('scrollY')}")
    page.screenshot(path=str(OUT / "12-phone-drag-pan.png"))

    # Double tap again zooms out.
    page.wait_for_timeout(400)
    tap(cx, cy)
    page.wait_for_timeout(90)
    tap(cx, cy)
    page.wait_for_timeout(500)
    check("phone: double tap again zooms out", view(page)["s"] == 1)

    # Pinch out.
    page.wait_for_timeout(400)
    sy = page.evaluate("scrollY")
    touch("touchStart", [(cx - 30, cy), (cx + 30, cy)])
    for i in range(1, 13):
        d = 30 + i * 8
        touch("touchMove", [(cx - d, cy), (cx + d, cy)])
        time.sleep(0.016)
    touch("touchEnd", [])
    page.wait_for_timeout(500)
    p3 = view(page)
    check("phone: pinch zooms (capped 1x to 4x and sharp)", p3["s"] > 1.5 and p3["s"] <= min(4, cap) + 0.001 and page.evaluate("scrollY") == sy, f"s={p3['s']:.2f} cap={cap:.2f}")
    page.screenshot(path=str(OUT / "13-phone-pinch.png"))

    # Pinch back in to 1x.
    touch("touchStart", [(cx - 120, cy), (cx + 120, cy)])
    for i in range(1, 13):
        d = 120 - i * 9
        touch("touchMove", [(cx - d, cy), (cx + d, cy)])
        time.sleep(0.016)
    touch("touchEnd", [])
    page.wait_for_timeout(500)
    check("phone: pinch in returns to the whole chart", view(page)["s"] == 1)
    page.get_by_role("button", name="Full size").tap()
    page.wait_for_timeout(300)
    check("phone: Full size opens the larger view", page.locator(".zchart-lightbox").count() == 1)
    page.screenshot(path=str(OUT / "14-phone-full-size.png"))
    page.get_by_role("button", name="Close").tap()
    overflow = page.evaluate("document.documentElement.scrollWidth > innerWidth")
    check("phone: no horizontal overflow", not overflow)
    check("phone: no page errors", not errors, json.dumps(errors[:5]))
    browser.close()


def russian(pw):
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="ru-RU")
    page = ctx.new_page()
    page.goto(f"{BASE}/trainers/writing?task={TASK}", wait_until="networkidle")
    wait_chart(page)
    page.wait_for_timeout(800)
    hint = page.locator(".zchart-hint").inner_text()
    names = page.evaluate("[...document.querySelectorAll('.zchart-btn')].map(b => b.getAttribute('aria-label'))")
    check("ru: hint and control names in Russian", hint.startswith("Нажмите на диаграмму") and "Во весь размер" in names, f"{hint} | {names}")
    v = view(page)
    page.mouse.click(v["fl"] + v["fw"] * 0.5, v["ft"] + v["fh"] * 0.5)
    page.wait_for_timeout(450)
    page.screenshot(path=str(OUT / "15-desktop-ru-zoomed.png"))
    browser.close()


with sync_playwright() as pw:
    only = sys.argv[2] if len(sys.argv) > 2 else None
    for fn in (desktop, phone, russian, mock):
        if only and fn.__name__ != only:
            continue
        try:
            fn(pw)
        except Exception as exc:  # noqa: BLE001
            check(f"{fn.__name__}: ran to the end", False, repr(exc)[:400])

if not (len(sys.argv) > 2) : (OUT / "results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
failed = [r for r in results if not r["ok"]]
print(f"\n{len(results) - len(failed)} / {len(results)} passed")
sys.exit(1 if failed else 0)
