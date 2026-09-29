"""Cross-cutting checks ("Throughout") plus the two builder leftovers, measured fresh.
Open site 4442/8842 and trial site 4441/8841 (Alex's review servers)."""
import json
import os
import sys

os.environ.setdefault("IELTS_BASE_URL", "http://localhost:4442/ielts-website")
os.environ.setdefault("IELTS_STANDIN_URL", "http://127.0.0.1:8842")
sys.path.insert(0, os.path.dirname(__file__))

from playwright.sync_api import sync_playwright  # noqa: E402

import p01_placement_journey as p01  # noqa: E402
from vh import (ACTIVE_JS, LAUNCHER_JS, Run, body, click_until, fill_profile, fill_signup, lang_of, no_sideways,  # noqa: E402
                overflow, try_click, wait_for)

OPEN = "http://localhost:4442/ielts-website"
TRIAL = "http://localhost:4441/ielts-website"
R = Run("cross-cutting" + ("-rerun-" + "-".join(sys.argv[1:]) if sys.argv[1:] else ""), OPEN, "http://127.0.0.1:8842")
MEAS = {}


def ctx_for(b, lang, w, h):
    return R.context(b, lang, w, h)


def sign_up(page, base, email):
    page.goto(base + "/sign-up?next=/dashboard", wait_until="domcontentloaded")
    fill_signup(page, email)
    wait_for(page, lambda: "/sign-up" not in page.url, 20000)
    if "/profile" in page.url:
        fill_profile(page)
    page.wait_for_timeout(1500)


# ── 1. keyboard-only result dialog after a drill (and a full test) ──
WORDS = {"en": {"start": "Start test", "submit": "Submit", "score": "Score", "review": "Review Answers"},
         "ru": {"start": "Начать тест", "submit": "Отправить", "score": "Результат", "review": "Разобрать ответы"}}


def active(page):
    return page.evaluate(ACTIVE_JS)


def tab_to(page, pred, limit=90, shift=False):
    for _ in range(limit):
        page.keyboard.press("Shift+Tab" if shift else "Tab")
        a = active(page)
        if pred(a):
            return a
    return None


def keyboard_dialog(b, lang, w, h, path, kind):
    combo = f"{lang}-{w}"
    wd = WORDS[lang]
    ctx, page = ctx_for(b, lang, w, h)
    page.goto(OPEN + path, wait_until="domcontentloaded")
    page.wait_for_timeout(3500)
    a = tab_to(page, lambda a: a["text"] == wd["start"])
    R.check(combo, f"{kind}: Start reached with Tab only", a is not None)
    page.keyboard.press("Enter")
    page.wait_for_timeout(1500)
    page.evaluate("document.activeElement && document.activeElement.blur()")
    a = tab_to(page, lambda a: a["text"] == wd["submit"] and a["tag"] == "BUTTON")
    R.check(combo, f"{kind}: header Submit reached with Tab", a is not None)
    page.keyboard.press("Enter")
    page.wait_for_timeout(800)
    for _ in range(60):
        if page.evaluate("() => !!(document.activeElement && document.activeElement.closest('[role=alert]'))") and active(page)["text"] == wd["submit"]:
            break
        page.keyboard.press("Tab")
    page.keyboard.press("Enter")
    page.wait_for_timeout(1300)
    dlg = page.locator("[role=dialog][aria-modal=true]")
    a = active(page)
    R.check(combo, f"{kind}: result dialog opened with focus inside, named by its heading",
            dlg.count() == 1 and a["inside"] and page.evaluate("() => { const d = document.querySelector('[role=dialog][aria-modal=true]'); const id = d && d.getAttribute('aria-labelledby'); return !!(id && document.getElementById(id) && document.getElementById(id).textContent.trim()); }"), a)
    R.shot(page, f"kbd-{combo}-{kind}-dialog")
    fw = [active(page) for _ in range(1) if page.keyboard.press("Tab") is None]
    seq = []
    for _ in range(20):
        page.keyboard.press("Tab")
        seq.append(active(page))
    back = []
    for _ in range(20):
        page.keyboard.press("Shift+Tab")
        back.append(active(page))
    R.check(combo, f"{kind}: 20 Tab and 20 Shift+Tab stay inside the dialog", all(x["inside"] for x in seq + back), " > ".join(x["text"] for x in seq[:6]))
    page.keyboard.press("Escape")
    page.wait_for_timeout(700)
    a = active(page)
    R.check(combo, f"{kind}: Escape closes into the review and focus returns to Score", dlg.count() == 0 and a["text"] == wd["score"], a["text"])
    R.shot(page, f"kbd-{combo}-{kind}-after-escape")
    page.keyboard.press("Enter")
    page.wait_for_timeout(900)
    a = active(page)
    R.check(combo, f"{kind}: Score reopens the dialog with focus inside", dlg.count() == 1 and a["inside"], a["text"])
    a = tab_to(page, lambda a: a["text"] == wd["review"], 30)
    page.keyboard.press("Enter")
    page.wait_for_timeout(700)
    R.check(combo, f"{kind}: Review Answers closes it, focus on Score", dlg.count() == 0 and active(page)["text"] == wd["score"], active(page)["text"])
    ctx.close()


# ── 2. Writing answer box label ──
def writing_label(b, lang, w, h):
    combo = f"{lang}-{w}"
    ctx, page = ctx_for(b, lang, w, h)
    page.goto(OPEN + "/writing/checker", wait_until="domcontentloaded")
    page.wait_for_timeout(3500)
    try_click(page.locator("button", has_text="Task 2"))
    page.wait_for_timeout(1500)
    info = page.evaluate("""() => { const ta = document.querySelector('.writing-editor textarea') || document.querySelector('main textarea:not(#mrez-input)'); if (!ta) return null;
        const lab = ta.labels && ta.labels[0]; const r = lab ? lab.getBoundingClientRect() : null;
        return { label: lab ? lab.textContent.trim() : null, visible: !!(r && r.width > 1 && r.height > 1), aria: ta.getAttribute('aria-label'), placeholder: ta.placeholder }; }""")
    if info:
        page.locator(".writing-editor textarea, main textarea:not(#mrez-input)").first.fill("A synthetic sentence for the label check.")
        still = page.evaluate("() => { const ta = document.querySelector('.writing-editor textarea') || document.querySelector('main textarea:not(#mrez-input)'); const l = ta.labels && ta.labels[0]; return !!(l && l.getBoundingClientRect().height > 1); }")
    else:
        still = False
    want = "Your answer" if lang == "en" else "Ваш ответ"
    R.check(combo, "Writing checker: answer box has a visible label that stays after typing", info and info["label"] == want and info["visible"] and still, info)
    R.shot(page, f"writing-label-{combo}")
    ctx.close()


# ── 3. Mr EZ desktop launcher vs buttons ──
def launcher_sweep(page, where, width, combo):
    page.set_viewport_size({"width": width, "height": 900})
    page.wait_for_timeout(700)
    h = page.evaluate("document.documentElement.scrollHeight")
    ys = list(range(0, max(1, h - 900) + 1, 250)) + [max(0, h - 900)]
    worst = []
    for y in ys:
        page.evaluate(f"window.scrollTo(0, {y})")
        page.wait_for_timeout(220)
        m = page.evaluate(LAUNCHER_JS)
        if m.get("launcher") in (None, "hidden"):
            return {"launcher": m.get("launcher"), "positions": 0, "hits": []}
        if m["hits"]:
            worst.append({"y": y, "launcher": m["launcher"], "hits": m["hits"][:3]})
    return {"launcher": "present", "positions": len(ys), "hits": worst}


def launcher_checks(b):
    # open site, signed in; trial site, signed in trial student
    for base, label in ((OPEN, "open"), (TRIAL, "trial")):
        ctx, page = ctx_for(b, "en", 1440, 900)
        email = f"verify-x-launch-{label}-{R.stamp}@example.test"
        sign_up(page, base, email)
        if label == "trial":
            page.goto(base + "/trial", wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            click_until(page, lambda: page.locator(".trial-join button.trial-primary"), lambda: "/dashboard" in page.url)
        for path in ("/dashboard", "/lessons/reading/paraphrase", "/tests", "/trainers", "/learn", "/writing/checker", "/report", "/account"):
            page.set_viewport_size({"width": 1440, "height": 900})
            page.goto(base + path, wait_until="domcontentloaded")
            page.wait_for_timeout(3000)
            for width in (1440, 1280, 1024):
                res = launcher_sweep(page, path, width, label)
                MEAS.setdefault("launcher", []).append({"site": label, "path": path, "width": width, **res})
                R.check(f"{label}-{width}", f"Mr EZ launcher intersects no button/link at any scroll position on {path}",
                        not res["hits"], json.dumps(res["hits"][:1], ensure_ascii=False) if res["hits"] else f"{res['launcher']} / {res['positions']} positions")
            page.set_viewport_size({"width": 1440, "height": 900})
            page.evaluate("window.scrollTo(0,0)")
            page.wait_for_timeout(300)
            if path == "/dashboard":
                R.shot(page, f"launcher-{label}-1440-dashboard")
        page.set_viewport_size({"width": 1024, "height": 900})
        page.goto(base + "/dashboard", wait_until="domcontentloaded")
        page.wait_for_timeout(3000)
        R.shot(page, f"launcher-{label}-1024-dashboard")
        ctx.close()


# ── 4. no sideways scroll at 390 in Russian (and 320 on the vocabulary overview) ──
PAGES = ["", "/dashboard", "/start", "/learn", "/tests", "/trainers", "/lessons/vocabulary", "/lessons/writing", "/lessons/writing-task1",
         "/lessons/writing-task2", "/lessons/reading", "/lessons/listening", "/lessons/speaking", "/lessons/reading/paraphrase", "/review", "/report",
         "/account", "/help", "/privacy", "/terms", "/support", "/plans", "/writing/checker", "/speaking/examiner", "/tests/reading-full-001",
         "/trainers/writing", "/placement", "/plan-settings", "/trial", "/sign-in", "/sign-up", "/forgot-password", "/learn/bands", "/writing/models",
         "/speaking/cue-cards", "/tests/listening-full-001", "/trainers/reading"]


def ru_overflow(b):
    for base, label in ((OPEN, "open"), (TRIAL, "trial")):
        ctx, page = ctx_for(b, "ru", 390, 844)
        email = f"verify-x-ru390-{label}-{R.stamp}@example.test"
        sign_up(page, base, email)
        if label == "trial":
            page.goto(base + "/trial", wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            click_until(page, lambda: page.locator(".trial-join button.trial-primary"), lambda: "/dashboard" in page.url)
        bad = []
        for path in PAGES:
            page.goto(base + path, wait_until="domcontentloaded")
            page.wait_for_timeout(2500)
            page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
            page.wait_for_timeout(500)
            o = overflow(page)
            MEAS.setdefault("ru390", []).append({"site": label, "path": path or "/", **o})
            ok = o.get("scrollWidth", 9999) <= o.get("clientWidth", 0) + 1
            if not ok:
                bad.append(path)
                R.shot(page, f"overflow-ru-390-{label}{(path or '/home').replace('/', '-')}", full=False)
            R.check(f"ru-390-{label}", f"no sideways scroll on {path or '/'}", ok, f"{o.get('scrollWidth')}/{o.get('clientWidth')} {o.get('wide', [])[:2]}")
        ctx.close()
    # 320 on the vocabulary overview (open), both languages
    for lang in ("ru", "en"):
        ctx, page = R.context(b, lang, 320, 700)
        page.goto(OPEN + "/lessons/vocabulary", wait_until="domcontentloaded")
        page.wait_for_timeout(3000)
        page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
        page.wait_for_timeout(600)
        o = overflow(page)
        MEAS.setdefault("vocab320", []).append({"lang": lang, **o})
        R.check(f"{lang}-320", "vocabulary overview: no sideways scroll at 320", o.get("scrollWidth", 9999) <= o.get("clientWidth", 0) + 1, f"{o.get('scrollWidth')}/{o.get('clientWidth')} {o.get('wide', [])[:2]}")
        page.evaluate("window.scrollTo(0, 0)")
        R.shot(page, f"vocab-overview-{lang}-320", full=True)
        ctx.close()


# ── 5. vocabulary overview search ──
VSTATE = r"""() => { const vis = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
  const empty = document.querySelector('[data-vocab-empty]'); const cards = [...document.querySelectorAll('.lesson-body .sample-card')];
  const label = [...document.querySelectorAll('[data-vocab-label]')].find(l => !l.hidden);
  return { box: !!document.querySelector('[data-vocab-search]'), label: label ? label.textContent.trim() : null, emptyShown: vis(empty), cards: cards.length, cardsVisible: cards.filter(vis).length,
    titles: cards.filter(vis).map(c => (c.querySelector('.sample-title') || c).textContent.trim()).slice(0, 3) }; }"""


def vocab_search(b, lang, w, h):
    combo = f"{lang}-{w}"
    ctx, page = ctx_for(b, lang, w, h)
    page.goto(OPEN + "/lessons/vocabulary", wait_until="domcontentloaded")
    page.wait_for_timeout(3500)
    s0 = page.evaluate(VSTATE)
    R.check(combo, "vocabulary overview: topic search, no 'No matches' before typing, all topics visible", s0["box"] and not s0["emptyShown"] and s0["cardsVisible"] == s0["cards"] and s0["cards"] > 0, s0)
    box = page.locator("[data-vocab-search]")
    box.scroll_into_view_if_needed()
    q = "Ecology" if lang == "en" else "экология"
    box.fill("")
    box.type(q, delay=25)
    page.wait_for_timeout(400)
    s1 = page.evaluate(VSTATE)
    R.check(combo, f"vocabulary overview: '{q}' finds a topic", s1["cardsVisible"] >= 1 and not s1["emptyShown"], s1)
    R.shot(page, f"vocab-search-{combo}-{'ecology'}")
    box.fill("")
    box.type("zzqx", delay=25)
    page.wait_for_timeout(400)
    s2 = page.evaluate(VSTATE)
    R.check(combo, "vocabulary overview: nonsense query shows the no-match message", s2["emptyShown"] and s2["cardsVisible"] == 0, s2)
    box.fill("")
    page.wait_for_timeout(300)
    s3 = page.evaluate(VSTATE)
    R.check(combo, "vocabulary overview: clearing the box restores every topic", s3["cardsVisible"] == s3["cards"] and not s3["emptyShown"], s3)
    ctx.close()


# ── 6. Today first phone screen: one primary action ──
MEASURE_TODAY = r"""() => { const vh = innerHeight; const dock = document.querySelector('.ws-tabbar');
  const dockTop = dock && getComputedStyle(dock).display !== 'none' ? dock.getBoundingClientRect().top : vh;
  const filled = [];
  for (const el of document.querySelectorAll('#workspace-content a, #workspace-content button')) {
    const b = el.getBoundingClientRect(); if (!b.width || b.bottom <= 0 || b.top >= dockTop) continue;
    const bg = getComputedStyle(el).backgroundColor; const m = bg.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/);
    if (!m || (m[4] !== undefined && Number(m[4]) < 0.9)) continue;
    const lum = (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255;
    const text = el.innerText.trim().slice(0, 40); if (b.height >= 36 && text) filled.push({ text, bg, lum: Math.round(lum * 100) / 100 });
  }
  const start = document.querySelector('.today-start'); const sr = start ? start.getBoundingClientRect() : null;
  return { dockTop: Math.round(dockTop), filled: [...new Map(filled.map(f => [f.text, f])).values()], start: sr ? { top: Math.round(sr.top), bottom: Math.round(sr.bottom) } : null, offer: !!document.querySelector('[data-placement-offer]') }; }"""


def today_phone(b):
    for lang in ("en", "ru"):
        combo = f"{lang}-390"
        ctx, page = ctx_for(b, "en", 390, 844)  # the p01 helper answers the goal questions by their English labels
        p01.EMAIL = f"verify-x-today-{lang}-{R.stamp}@example.test"
        p01.BASE = OPEN
        p01.sign_up(page)
        page.goto(OPEN + "/dashboard", wait_until="domcontentloaded")
        page.wait_for_timeout(3000)
        page.evaluate("window.scrollTo(0,0)")
        m0 = page.evaluate(MEASURE_TODAY)
        R.shot(page, f"today-first-screen-{combo}-before-goal-questions")
        MEAS.setdefault("today", []).append({"combo": combo, "stage": "before goal questions", **m0})
        R.check(combo, "fresh student, Today first screen (goal questions stage): at most one filled primary action", len(m0["filled"]) <= 1, m0["filled"])
        walked = p01.walk_intake(page)
        page.evaluate(f"localStorage.setItem('ielts.locale.v1', '{lang}')")
        page.goto(OPEN + "/dashboard", wait_until="domcontentloaded")
        try:
            page.wait_for_selector(".today-start", timeout=20000)
        except Exception:
            pass
        page.wait_for_timeout(2000)
        page.evaluate("window.scrollTo(0,0)")
        page.wait_for_timeout(300)
        m1 = page.evaluate(MEASURE_TODAY)
        MEAS["today"].append({"combo": combo, "stage": "after goal questions", **m1})
        R.shot(page, f"today-first-screen-{combo}-after-goal-questions")
        R.check(combo, "goal questions answered", walked)
        R.check(combo, "Today first phone screen: exactly one filled primary action", len(m1["filled"]) == 1, m1["filled"])
        R.check(combo, "Today first phone screen: today's Start fully visible above the dock", m1["start"] is not None and m1["start"]["bottom"] <= m1["dockTop"], m1)
        ctx.close()


# ── 7/8. the two leftovers ──
def leftovers(b):
    out = {}
    for base, label in ((OPEN, "open"),):
        for lang in ("ru", "en"):
            for width in (390, 375, 360, 320):
                ctx, page = R.context(b, lang, width, 844)
                page.goto(base + "/tests/reading-full-001", wait_until="domcontentloaded")
                page.wait_for_timeout(3500)
                click_until(page, lambda: page.get_by_role("button", name=WORDS[lang]["start"]), lambda: page.get_by_role("button", name=WORDS[lang]["submit"]).count() > 0)
                page.wait_for_timeout(1200)
                m = page.evaluate("""(label) => { const btns = [...document.querySelectorAll('button')].filter(b => b.innerText.trim() === label);
                    const b = btns[0]; if (!b) return { found: false };
                    const r = b.getBoundingClientRect(); const hdr = b.closest('header') || b.parentElement; const hr = hdr.getBoundingClientRect();
                    let clipper = null; for (let p = b.parentElement; p; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.overflowX !== 'visible' || cs.overflow !== 'visible') { const pr = p.getBoundingClientRect(); clipper = { tag: p.tagName, cls: String(p.className).slice(0, 50), left: Math.round(pr.left), right: Math.round(pr.right) }; break; } }
                    const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = r.top + r.height / 2; const hit = document.elementFromPoint(cx, cy);
                    return { found: true, vw: document.documentElement.clientWidth, left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), top: Math.round(r.top),
                      textOverflow: b.scrollWidth > b.clientWidth + 1, scrollW: b.scrollWidth, clientW: b.clientWidth, headerRight: Math.round(hr.right), clipper,
                      fullyInView: r.left >= 0 && r.right <= document.documentElement.clientWidth, centerHitsButton: !!(hit && (hit === b || b.contains(hit))),
                      docW: document.documentElement.scrollWidth }; }""", WORDS[lang]["submit"])
                out[f"submit-{label}-{lang}-{width}"] = m
                R.shot(page, f"leftover-i-submit-{lang}-{width}")
                page.locator("header").first.screenshot(path=str(R.out / f"leftover-i-submit-header-{lang}-{width}.png")) if page.locator("header").count() else None
                if width == 390 or lang == "ru":
                    R.check(f"{lang}-{width}", "test player: Submit button fully visible and not cut off", m.get("found") and m.get("fullyInView") and not m.get("textOverflow") and m.get("centerHitsButton"), m)
                ctx.close()
    for lang in ("ru", "en"):
        for path in ("/lessons/writing", "/lessons/writing-task1", "/lessons/writing-task2"):
            ctx, page = R.context(b, lang, 390, 844)
            page.goto(OPEN + path, wait_until="domcontentloaded")
            page.wait_for_timeout(3500)
            page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
            page.wait_for_timeout(800)
            o = overflow(page)
            out[f"writing-overview-{lang}-390{path}"] = o
            R.check(f"{lang}-390", f"{path}: document width equals the phone width (no sideways scroll)", o.get("scrollWidth", 9999) <= o.get("clientWidth", 0) + 1, f"{o.get('scrollWidth')}/{o.get('clientWidth')} {o.get('wide', [])[:3]}")
            page.evaluate("window.scrollTo(0, 0)")
            R.shot(page, f"leftover-ii{path.replace('/', '-')}-{lang}-390", full=True)
            ctx.close()
    MEAS["leftovers"] = out


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        steps = [
            ("keyboard", lambda: [keyboard_dialog(b, l, w, h, path, kind) for (l, w, h) in (("en", 1440, 900), ("ru", 390, 844), ("ru", 1440, 900), ("en", 390, 844))
                                  for (path, kind) in (("/trainers/reading/reading-full-001-drill-p1", "drill"), ("/tests/reading-full-002", "full test"))]),
            ("writing", lambda: [writing_label(b, l, w, h) for (l, w, h) in (("en", 1440, 900), ("ru", 1440, 900), ("en", 390, 844), ("ru", 390, 844))]),
            ("vocab", lambda: [vocab_search(b, l, w, h) for (l, w, h) in (("en", 1440, 900), ("ru", 1440, 900), ("en", 390, 844), ("ru", 390, 844))]),
            ("leftovers", lambda: leftovers(b)),
            ("today", lambda: today_phone(b)),
            ("overflow", lambda: ru_overflow(b)),
            ("launcher", lambda: launcher_checks(b)),
        ]
        only = sys.argv[1:] or [s for s, _ in steps]
        for name, fn in steps:
            if name not in only:
                continue
            try:
                fn()
            except Exception as e:  # noqa: BLE001
                R.check("all", f"{name} step completed without an unexpected error", False, repr(e)[:300])
        b.close()
    (R.out / "measurements.json").write_text(json.dumps(MEAS, indent=1, ensure_ascii=False), encoding="utf-8")
    passed, total = R.save()
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
