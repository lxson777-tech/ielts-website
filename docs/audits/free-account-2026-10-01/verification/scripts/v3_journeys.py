"""V3: the free-account journeys on Alex's review servers (gated build
localhost:4441 with stand-in 8841: SIMULATED payments and SIMULATED AI; open
build localhost:4442). Synthetic @example.test accounts only.

Sections: b signed-out platform, c free student, c-phone layouts (en 390,
ru 390, ru 320), d paying student (SIMULATED purchase through the real
buttons), e complimentary student (admin@example.test through the real
/admin buttons), f returning student, open build.

  python v3_journeys.py <out-dir> [sections,comma,separated]
"""
import base64
import json
import re
import sys
import urllib.parse
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from vhelpers import (DIALOG, GATED, OPEN, PASSWORD, STAMP, STANDIN, Run, body_text, close_dialog, dialog_feature,  # noqa: E402
                      fill_profile, get_json, lesson_ready, lesson_state, new_context, overflow, post_json, settle,
                      probn_uses, sign_in, sign_up, token_of, trial_hits, visit)

R = Run(sys.argv[1])
ONLY = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else None
TRIAL_SEEN = []

PAID_JS = r"""() => {
  const EXACT = {'/tests/mock':'mock','/placement':'placement','/writing/checker':'essay','/writing/models':'model-answers',
    '/trainers/writing':'trainer','/trainers/speaking':'trainer','/trainers/reading':'drill','/trainers/listening':'drill',
    '/speaking/examiner':'live','/speaking/recorded':'speaking','/speaking/cue-cards':'cue-cards','/learn/bands':'band-guide'};
  const PREFIX = [['/tests/drills/','drill'],['/tests/','test'],['/trainers/reading/','drill'],['/trainers/listening/','drill'],
    ['/trainers/focused/','focused'],['/trainers/speaking-focus/','focused']];
  const base = '/ielts-website';
  const clean = (href) => { try { const u = new URL(href, location.href); if (u.origin !== location.origin) return null;
    let r = u.pathname; if (r === base || r.startsWith(base + '/')) r = r.slice(base.length); r = r.replace(/\.html$/, '');
    if (r.length > 1) r = r.replace(/\/+$/, ''); return r || '/'; } catch (e) { return null } };
  const feat = (r) => r && (EXACT[r] || (PREFIX.find(([p]) => r.startsWith(p) && r.length > p.length) || [])[1]) || null;
  const vis = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && !el.closest('[hidden],[aria-hidden=true],[inert]') };
  return [...document.querySelectorAll('a[href]')].filter(a => !a.getAttribute('href').startsWith('#') && clean(a.href) !== clean(location.href)).filter(vis).map(a => ({ href: a.getAttribute('href'), route: clean(a.href), feature: feat(clean(a.href)), text: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 50) })).filter(x => x.feature);
}"""

PAID_PAGES = [("/trainers/writing", "trainer"), ("/trainers/speaking", "trainer"), ("/trainers/reading", "drill"), ("/trainers/listening", "drill"),
              ("/tests/mock", "mock"), ("/placement", "placement"), ("/writing/models", "model-answers"), ("/speaking/cue-cards", "cue-cards"),
              ("/learn/bands", "band-guide"), ("/writing/checker", "essay"), ("/speaking/examiner", "live"), ("/speaking/recorded", "speaking"),
              ("/tests/reading-full-001", "test"), ("/tests/listening-full-001", "test"),
              ("/trainers/focused/listening-categorisation-check-a", "focused")]


PROBN_SEEN = {}


def note_trial(page, where):
    text = body_text(page)
    for u in probn_uses(text):
        PROBN_SEEN.setdefault(u, where)
    hits = trial_hits(text)
    if hits:
        TRIAL_SEEN.append({"where": where, "url": page.url, "hits": hits[:3]})
    return hits


def focused(page):
    return page.evaluate("() => document.activeElement && (document.activeElement.outerHTML || '').slice(0, 80)")


def opens_dialog(sec, page, name, locator, expect, stays=True):
    before = page.url
    try:
        locator.first.scroll_into_view_if_needed(timeout=8000)
        locator.first.click(timeout=8000)
    except Exception as e:  # noqa: BLE001
        return R.check(sec, name, False, f"could not click: {str(e)[:140]}")
    feat = dialog_feature(page)
    ok = feat == expect and (page.url == before or not stays)
    R.check(sec, name, ok, f"feature={feat} expected={expect} url={page.url}")
    if feat:
        close_dialog(page)
    return ok


def keyboard_contract(sec, page, name, opener):
    try:
        page.wait_for_function("() => document.activeElement && document.activeElement.closest('[role=dialog]')", timeout=5000)
        focus_in = True
    except Exception:  # noqa: BLE001
        focus_in = False
    inside = True
    for _ in range(7):
        page.keyboard.press("Tab")
        inside = inside and page.evaluate("() => !!(document.activeElement && document.activeElement.closest('[role=dialog]'))")
    for _ in range(4):
        page.keyboard.press("Shift+Tab")
        inside = inside and page.evaluate("() => !!(document.activeElement && document.activeElement.closest('[role=dialog]'))")
    named = page.evaluate("() => { const d = document.querySelector('[role=dialog][aria-labelledby=upgrade-title]'); return !!d && d.getAttribute('aria-modal') === 'true' && !!document.getElementById(d.getAttribute('aria-labelledby')).textContent.trim() }")
    page.keyboard.press("Escape")
    try:
        page.wait_for_selector(DIALOG, state="detached", timeout=5000)
        closed = True
    except Exception:  # noqa: BLE001
        closed = False
    page.wait_for_function("(o) => document.activeElement && (document.activeElement.outerHTML || '').slice(0, 80) === o", arg=opener, timeout=3000) if closed else None
    back = focused(page)
    R.check(sec, name, focus_in and inside and named and closed and back == opener,
            f"focusIn={focus_in} tabContained={inside} named={named} escapeCloses={closed} focusBack={back == opener} ({back})")


def paid_link_sweep(sec, page, path, cap=10):
    visit(page, path)
    links = page.evaluate(PAID_JS)
    seen, tried = set(), 0
    for link in links:
        if link["href"] in seen or tried >= cap:
            continue
        seen.add(link["href"])
        tried += 1
        loc = page.locator(f"a[href=\"{link['href']}\"]:visible")
        opens_dialog(sec, page, f"{path}: paid link '{link['text'] or link['route']}' -> {link['route']} opens the pop-up", loc, link["feature"])
    R.check(sec, f"{path}: paid links found on the page", True, f"{len(links)} visible paid links, {tried} clicked")
    return tried


def wait_page_open(page):
    page.wait_for_function("() => document.body.dataset.trialGate === 'open' || document.querySelector('[data-paid-locked]') || (!document.querySelector('[data-trial-protected]') && !document.querySelector('.access-strip.is-checking'))", timeout=30000)


# ── b. signed-out on the platform ────────────────────────────────────────

def signed_out(browser, lang="en", w=1440, h=900):
    sec = f"b-signed-out-{lang}-{w}"
    ctx = new_context(browser, lang, w, h)
    page = ctx.new_page()
    R.watch(page, sec)
    for route in ("/lessons/reading/tfng", "/lessons/writing/opinion", "/lessons/vocabulary/environment", "/lessons/listening/part1", "/lessons/speaking/part2"):
        visit(page, route, "[data-lesson-invite]")
        st = lesson_state(page)
        title = page.locator("#lesson-invite-title").inner_text().strip()
        ok = st is not None and st["len"] == 0 and st["invite"] and len(title) > 3
        R.check(sec, f"{route}: only the title and the sign-up invitation", ok, f"title={title!r} state={st}")
        R.check(sec, f"{route}: no sideways scroll", overflow(page) <= 0, overflow(page))
        note_trial(page, sec + route)
    R.shot(page, f"{sec}-lesson-invite")
    href = page.locator("[data-lesson-invite-signup]").get_attribute("href")
    R.check(sec, "invitation's sign-up returns to the lesson", "next=%2Flessons%2Fspeaking%2Fpart2" in (href or ""), href)
    # Today and the library show titles.
    for route, sel in (("/dashboard", "main"), ("/start", "main"), ("/learn", "main")):
        visit(page, route)
        try:
            page.wait_for_function("() => [...document.querySelectorAll('main a[href*=\"/lessons/\"]')].filter(a => a.innerText.trim().length > 3).length > 0", timeout=8000)
        except Exception:  # noqa: BLE001
            pass  # counted below: Today may show only the invitation
        titles = page.evaluate("() => [...document.querySelectorAll('main a[href*=\"/lessons/\"]')].map(a => a.innerText.replace(/\\s+/g, ' ').trim()).filter(t => /[A-Za-zА-Яа-я]{4}/.test(t))")
        R.check(sec, f"{route}: shows lesson titles to a visitor", len(titles) >= (3 if route != "/dashboard" else 1), f"{len(titles)} titles, e.g. {titles[:4]}")
        note_trial(page, sec + route)
        if route == "/dashboard":
            R.shot(page, f"{sec}-today")
    # A paid click opens the pop-up; its primary leads to sign-up then /plans.
    visit(page, "/tests", "[data-test-rotation]")
    page.locator("[data-test-rotation]").first.click()
    feat = dialog_feature(page)
    primary = page.locator("[data-upgrade-primary]").get_attribute("href") if feat else None
    R.check(sec, "Tests start button opens the pop-up for a visitor", feat == "test", feat)
    R.check(sec, "pop-up primary goes to sign-up, then /plans", bool(primary) and "/sign-up" in primary and "next=%2Fplans" in primary, primary)
    price = page.locator(".upgrade-price").inner_text() if feat else ""
    R.check(sec, "pop-up states the price and no renewal", ("12,990" in price or "12 990" in price.replace(" ", " ").replace(" ", " ")), price)
    R.shot(page, f"{sec}-dialog")
    if feat:
        page.locator("[data-upgrade-primary]").click()
        try:
            page.wait_for_url("**/sign-up**", timeout=15000)
            page.wait_for_selector("#signup-email", timeout=20000)
            R.check(sec, "pressing the pop-up's primary lands on sign-up", True)
        except Exception as e:  # noqa: BLE001
            R.check(sec, "pressing the pop-up's primary lands on sign-up", False, str(e)[:120])
    visit(page, "/trainers/writing")
    try:
        page.wait_for_selector("[data-paid-locked], [data-lesson-invite], .signed-out-invite, [data-signed-out-invite]", timeout=20000)
        R.check(sec, "direct link to a paid page shows a calm locked page, no practice content", page.locator("[data-paid-locked]").count() > 0, "")
    except Exception as e:  # noqa: BLE001
        R.check(sec, "direct link to a paid page shows a calm locked page, no practice content", False, str(e)[:100])
    page.goto(GATED + "/trial?journey=1&band=7&skill=reading&focus=method&time=30", wait_until="domcontentloaded")
    page.wait_for_url("**/sign-up**", timeout=20000)
    R.check(sec, "/trial redirects to sign-up keeping the answers", "journey%3D1" in page.url, page.url)
    ctx.close()


# ── c. free student ─────────────────────────────────────────────────────

def free_student(browser):
    sec = "c-free-en-1440"
    ctx = new_context(browser)
    page = ctx.new_page()
    R.watch(page, sec)
    email = f"v3-free-{STAMP}@example.test"
    # Sign-up and the required profile, carrying questionnaire answers.
    page.goto(GATED + "/sign-up?next=" + urllib.parse.quote("/dashboard?journey=1&band=7.5&skill=writing&focus=method&time=30", safe=""), wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=40000)
    settle(page)
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    if page.locator("#signup-consent").count():  # required since 2 October 2026
        page.locator("#signup-consent").check(force=True)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_selector("#profile-firstName", timeout=40000)
    R.check(sec, "sign-up leads to the required profile", "/profile" in page.url, page.url)
    R.shot(page, f"{sec}-profile")
    fill_profile(page)
    page.wait_for_url("**/dashboard**", timeout=40000)
    settle(page)
    page.wait_for_selector("[data-free-home]", timeout=30000)
    start = page.locator("[data-free-start]").get_attribute("data-free-start")
    first_next = page.locator("[data-free-next]").first.get_attribute("data-free-next")
    R.check(sec, "Today uses the questionnaire answers (Writing first)", start == "writing" and (first_next or "").startswith("writing"), f"{start} {first_next}")
    R.check(sec, "Today: no trial wording", not note_trial(page, sec + " today"))
    R.shot(page, f"{sec}-today")
    opens_dialog(sec, page, "Today's practice-and-guidance card opens the pop-up", page.locator("[data-free-pitch-open]"), "plan-practice")
    opens_dialog(sec, page, "Mr EZ launcher opens the pop-up", page.locator(".mrez-launcher"), "tutor")
    R.check(sec, "Mr EZ panel stays closed for a free account", page.locator("#mrez-panel.is-open").count() == 0)

    # First lesson: body, help button by keyboard, the nudge once.
    visit(page, "/lessons/reading/tfng")
    lesson_ready(page)
    R.check(sec, "a lesson's text arrives through the door", lesson_state(page)["len"] > 500, lesson_state(page))
    page.wait_for_selector(".lesson-block-help button", timeout=20000)
    hb = page.locator(".lesson-block-help button").first
    hb.scroll_into_view_if_needed()
    hb.focus()
    opener = focused(page)
    page.keyboard.press("Enter")
    feat = dialog_feature(page)
    R.check(sec, "lesson help button (keyboard Enter) opens the pop-up", feat == "tutor", feat)
    R.shot(page, f"{sec}-help-dialog")
    if feat:
        keyboard_contract(sec, page, "pop-up keyboard from a lesson help button: focus in, Tab/Shift+Tab contained, Escape closes, focus back", opener)
    # In-quiz hint button.
    try:
        page.wait_for_selector("form button[type=submit]:has-text('Check answers')", timeout=30000)
        hint = page.locator("form .help-controls button.help-control")
        if hint.count():
            opens_dialog(sec, page, "in-quiz hint button opens the pop-up", hint, "tutor")
        else:
            R.check(sec, "in-quiz hint button opens the pop-up", False, "no hint button in the quiz")
    except Exception as e:  # noqa: BLE001
        R.check(sec, "lesson quiz loads", False, str(e)[:120])
    page.locator("#lesson-complete-btn").scroll_into_view_if_needed()
    page.locator("#lesson-complete-btn").click()
    feat = dialog_feature(page, timeout=8000)
    R.check(sec, "first-lesson nudge appears after the first finished lesson", feat == "first-lesson", feat)
    R.shot(page, f"{sec}-first-lesson-nudge")
    if feat:
        page.locator("[data-upgrade-dismiss]").click()
        page.wait_for_selector(DIALOG, state="detached", timeout=5000)
    for route in ("/lessons/reading/ynng", "/lessons/writing/opinion"):
        visit(page, route)
        lesson_ready(page)
        page.locator("#lesson-complete-btn").scroll_into_view_if_needed()
        page.locator("#lesson-complete-btn").click()
        try:
            page.wait_for_selector(DIALOG, timeout=3500)
            seen = True
        except Exception:  # noqa: BLE001
            seen = False
        R.check(sec, f"no nudge when finishing another lesson ({route})", not seen)
    page.reload(wait_until="domcontentloaded")
    settle(page)
    try:
        page.wait_for_selector(DIALOG, timeout=3000)
        seen = True
    except Exception:  # noqa: BLE001
        seen = False
    R.check(sec, "no nudge after a reload", not seen)
    # Worked example and its paid link.
    try:
        page.wait_for_selector("text=What a Band 8 answer looks like", timeout=30000)
        R.check(sec, "a Writing lesson's worked example shows", True)
    except Exception:  # noqa: BLE001
        R.check(sec, "a Writing lesson's worked example shows", False)
    if page.locator("#essay-checker a[href*='/writing/checker']").count():
        opens_dialog(sec, page, "the lesson's 'check your writing' link opens the pop-up", page.locator("#essay-checker a[href*='/writing/checker']"), "essay")

    # Tests hub: start buttons and papers; keyboard from a start button.
    visit(page, "/tests", "[data-test-rotation]")
    n = page.locator("[data-test-rotation]").count()
    for i in range(n):
        opens_dialog(sec, page, f"Tests: start button {i + 1} of {n} opens the pop-up", page.locator("[data-test-rotation]").nth(i), "test")
    page.locator("[data-test-rotation]").first.focus()
    opener = focused(page)
    page.keyboard.press("Enter")
    if dialog_feature(page):
        keyboard_contract(sec, page, "pop-up keyboard from a Tests start button", opener)
    R.shot(page, f"{sec}-tests")
    # Every visible paid link on the main pages opens the pop-up.
    for path in ("/tests", "/trainers", "/start", "/learn", "/dashboard", "/plan-settings", "/lessons/speaking/part2", "/lessons/writing/opinion", "/report", "/trainers/reading", "/trainers/listening"):
        try:
            paid_link_sweep(sec, page, path)
            note_trial(page, sec + path)
        except Exception as e:  # noqa: BLE001
            R.check(sec, f"{path}: paid link sweep finished", False, str(e)[:160])
    # The library links (band guide, model answers, cue cards). Since the
    # account menu was shortened (2 October 2026) they live in their sections:
    # the band guide on Tests, model answers and cue cards in Practice.
    for route, feat, home in (("/learn/bands", "band-guide", "/tests"), ("/writing/models", "model-answers", "/trainers"), ("/speaking/cue-cards", "cue-cards", "/trainers")):
        try:
            visit(page, home)
            page.wait_for_selector(f"main a[href$='{route}']", timeout=8000)
            opens_dialog(sec, page, f"{home}: {route} link opens the pop-up", page.locator(f"main a[href$='{route}']").first, feat)
        except Exception as e:  # noqa: BLE001
            R.check(sec, f"{home}: {route} link opens the pop-up", False, str(e)[:120])
    # Vocabulary review practice.
    visit(page, "/review")
    page.wait_for_selector(".vocab-topic-card", timeout=30000)
    page.locator(".vocab-topic-card").first.click()
    page.wait_for_selector(".vocab-word-list li, .vocab-simple-list li", timeout=10000)
    R.check(sec, "vocabulary: a topic's word list opens", page.locator(".vocab-word-list li, .vocab-simple-list li").count() >= 5)
    opens_dialog(sec, page, "vocabulary: 'Practise these words' opens the pop-up", page.locator(".vocab-practise-link"), "vocab-review")
    # Direct links: the calm locked page; its button opens the pop-up.
    for path, feat in PAID_PAGES:
        visit(page, path)
        try:
            page.wait_for_selector(f"[data-paid-locked='{feat}']", timeout=20000)
            ok = True
        except Exception:  # noqa: BLE001
            ok = False
        R.check(sec, f"direct link {path}: calm locked page ({feat})", ok, page.evaluate("() => (document.querySelector('[data-paid-locked]') || {}).getAttribute ? document.querySelector('[data-paid-locked]').getAttribute('data-paid-locked') : null"))
        if ok:
            opens_dialog(sec, page, f"direct link {path}: its button opens the pop-up", page.locator("[data-paid-locked-open]"), feat)
            note_trial(page, sec + path)
            if path == "/tests/mock":
                R.shot(page, f"{sec}-locked-mock")
    # /plans and /account.
    for path in ("/plans", "/account#access"):
        visit(page, path)
        page.wait_for_selector(".access-strip b", timeout=20000)
        label = page.locator(".access-strip b").first.inner_text().strip()
        R.check(sec, f"{path} says Free account", label == "Free account", label)
        R.check(sec, f"{path}: no trial wording", not note_trial(page, sec + path))
        R.shot(page, f"{sec}{path.replace('/', '-').replace('#', '-')}")
    # The nudge is per account: a second browser, same account, finishing a lesson: no nudge.
    ctx2 = new_context(browser)
    p2 = ctx2.new_page()
    R.watch(p2, sec + "-second-browser")
    sign_in(p2, email, "/lessons/reading/mc")
    p2.wait_for_url("**/lessons/reading/mc**", timeout=40000)
    settle(p2)
    lesson_ready(p2)
    p2.locator("#lesson-complete-btn").scroll_into_view_if_needed()
    p2.locator("#lesson-complete-btn").click()
    try:
        p2.wait_for_selector(DIALOG, timeout=3500)
        seen = True
    except Exception:  # noqa: BLE001
        seen = False
    R.check(sec, "no nudge in a second browser for the same account (model: stored per account)", not seen, "the nudge appeared again: it is remembered per device")
    ctx2.close()
    ctx.close()
    return email


def free_phone(browser, lang, w, h):
    sec = f"c-free-{lang}-{w}"
    ctx = new_context(browser, lang, w, h)
    page = ctx.new_page()
    R.watch(page, sec)
    email = f"v3-phone-{lang}-{w}-{STAMP}@example.test"
    sign_up(page, email)
    page.wait_for_url("**/dashboard**", timeout=40000)
    settle(page)
    page.wait_for_selector("[data-free-home]", timeout=30000)
    if lang == "ru":
        page.wait_for_function("() => document.documentElement.lang === 'ru' && /[а-я]/i.test(document.querySelector('[data-free-home] h1').textContent)", timeout=15000)
    R.check(sec, f"Today in {lang}", True)
    pages = ["/dashboard", "/lessons/reading/tfng", "/lessons/writing/opinion", "/lessons/vocabulary/environment", "/tests", "/trainers", "/review",
             "/plans", "/account#access", "/tests/mock", "/start", "/learn"]
    for path in pages:
        visit(page, path)
        if path.startswith("/lessons/"):
            lesson_ready(page)
            if lang == "ru":
                page.wait_for_function("() => document.querySelector('[data-lesson-body]').getAttribute('data-lesson-body-locale') === 'ru'", timeout=15000)
                st = lesson_state(page)
                R.check(sec, f"{path}: Russian lesson body renders", st["locale"] == "ru" and st["cyr"] >= 300 and st["cyr"] >= 0.25 * (st["cyr"] + st["lat"]), st)
        if path == "/tests/mock":
            page.wait_for_selector("[data-paid-locked]", timeout=20000)
        ov = overflow(page)
        R.check(sec, f"{path}: no sideways scroll at {w}", ov <= 0, ov)
        if lang == "ru" and path in ("/plans", "/account#access"):
            page.wait_for_selector(".access-strip b", timeout=20000)
            label = page.locator(".access-strip b").first.inner_text().strip()
            R.check(sec, f"{path} says the free account in Russian", re.search(r"[а-я]", label, re.I) is not None and "есплатн" in label, label)
        R.check(sec, f"{path}: no trial wording", not note_trial(page, sec + path))
        R.shot(page, f"{sec}{path.replace('/', '-').replace('#', '-')}")
    visit(page, "/tests", "[data-test-rotation]")
    page.locator("[data-test-rotation]").first.click()
    feat = dialog_feature(page)
    R.check(sec, "pop-up opens from Tests", feat == "test", feat)
    fits = page.evaluate("() => { const p = document.querySelector('.upgrade-panel'); const b = p.getBoundingClientRect(); return b.left >= -1 && b.right <= innerWidth + 1 }")
    R.check(sec, "pop-up fits the screen width", fits)
    reach = page.evaluate("() => { const a = document.querySelector('[data-upgrade-primary]'); a.scrollIntoView({block:'nearest'}); const b = a.getBoundingClientRect(); return b.bottom <= innerHeight + 1 && b.top >= 0 }")
    R.check(sec, "pop-up's primary button can be reached on screen", reach)
    if lang == "ru":
        price = page.locator(".upgrade-price").inner_text()
        R.check(sec, "pop-up in Russian with the price", "за 30 дней" in price and "990" in price, price)
    R.shot(page, f"{sec}-dialog")
    if feat:
        close_dialog(page)
    ctx.close()


# ── d. paying student ───────────────────────────────────────────────────

def check_open(sec, page, path, label=""):
    visit(page, path)
    try:
        wait_page_open(page)
    except Exception:  # noqa: BLE001
        pass
    page.wait_for_timeout(300)
    locked = page.locator("[data-paid-locked]").count()
    dlg = page.locator(DIALOG).count()
    main = page.evaluate("() => (document.querySelector('main') || document.body).innerText.trim().length")
    R.check(sec, f"{label}{path} opens (no locked page, no pop-up)", locked == 0 and dlg == 0 and main > 200, f"locked={locked} dialog={dlg} mainText={main}")


def paying_student(browser):
    sec = "d-paid"
    ctx = new_context(browser)
    page = ctx.new_page()
    R.watch(page, sec)
    email = f"v3-paid-{STAMP}@example.test"
    sign_up(page, email)
    page.wait_for_url("**/dashboard**", timeout=40000)
    settle(page)
    visit(page, "/plans")
    buy = page.get_by_role("button", name="Buy one month")
    buy.wait_for(timeout=20000)
    R.check(sec, "/plans: Buy one month is offered at 12,990", "12,990" in body_text(page), "")
    R.shot(page, f"{sec}-plans-before")
    buy.click()
    page.wait_for_url("**/__pay/**", timeout=20000)
    R.check(sec, "Buy leads to the SIMULATED provider page", "SIMULATED" in body_text(page), page.url)
    R.shot(page, f"{sec}-simulated-provider")
    page.get_by_role("button", name="Pay (SIMULATED)").click()
    page.wait_for_url("**/plans/return**", timeout=20000)
    settle(page)
    try:
        page.wait_for_selector("text=You’re in.", timeout=30000)
        R.check(sec, "return page confirms the payment", True)
    except Exception:  # noqa: BLE001
        R.check(sec, "return page confirms the payment", False, body_text(page)[:200])
    R.shot(page, f"{sec}-return")
    visit(page, "/plans")
    page.wait_for_selector(".access-strip.is-paid b", timeout=30000)
    label = page.locator(".access-strip b").first.inner_text()
    R.check(sec, "/plans says Practice and guidance until <date>", label.startswith("Practice and guidance until"), label)
    visit(page, "/account#access")
    page.wait_for_selector("[data-assessment-balance=paid]", timeout=30000)
    bal = page.locator("[data-assessment-balance=paid]").inner_text()
    R.check(sec, "allowances shown: Writing 12, Speaking 6, live 2, mock 2", all(x in bal for x in ("12 of 12", "6 of 6", "2 of 2")) and bal.count("2 of 2") == 2, bal.replace("\n", " | "))
    R.shot(page, f"{sec}-account-allowances")
    # Everything opens.
    for path, _ in PAID_PAGES:
        check_open(sec, page, path)
    visit(page, "/tests", "[data-test-rotation]")
    page.locator("[data-test-rotation]").first.click()
    try:
        page.wait_for_url("**/tests/**-full-**", timeout=20000)
        settle(page)
        R.check(sec, "Tests start button goes straight to a paper", page.locator(DIALOG).count() == 0, page.url)
    except Exception as e:  # noqa: BLE001
        R.check(sec, "Tests start button goes straight to a paper", False, str(e)[:120])
    # A finished paper, so a saved result exists for the expiry check.
    visit(page, "/tests/reading-full-001")
    result_saved = False
    try:
        page.get_by_role("button", name="Start test").click(timeout=20000)
        page.get_by_role("button", name="Submit").first.click(timeout=20000)
        try:
            page.get_by_role("button", name=re.compile("^(Submit|Yes|Submit anyway|Submit now)")).last.click(timeout=4000)
        except Exception:  # noqa: BLE001
            pass
        page.wait_for_function("() => /Band|band/.test(document.body.innerText) && /\\d+\\s*\\/\\s*40|out of 40|of 40/.test(document.body.innerText)", timeout=30000)
        result_saved = True
        R.shot(page, f"{sec}-paper-result")
    except Exception as e:  # noqa: BLE001
        R.check(sec, "a Reading paper can be started and submitted", False, str(e)[:160])
    if result_saved:
        R.check(sec, "a Reading paper can be started and submitted", True)
    visit(page, "/tests")
    try:
        page.wait_for_function("() => document.querySelectorAll('table tbody tr').length > 0", timeout=15000)
    except Exception:  # noqa: BLE001
        pass
    rows_before = page.locator("table tbody tr").count()
    R.check(sec, "the result appears in the score history", rows_before >= 1 or not result_saved, rows_before)
    # Mr EZ, lesson help, vocab practice: no pop-up (AI replies are SIMULATED).
    visit(page, "/lessons/reading/tfng")
    lesson_ready(page)
    page.locator(".mrez-launcher").click()
    try:
        page.wait_for_selector("#mrez-panel.is-open", timeout=8000)
        R.check(sec, "Mr EZ launcher opens the panel, no pop-up", page.locator(DIALOG).count() == 0)
    except Exception:  # noqa: BLE001
        R.check(sec, "Mr EZ launcher opens the panel, no pop-up", False, f"dialog={page.locator(DIALOG).count()}")
    page.keyboard.press("Escape")
    page.wait_for_selector(".lesson-block-help button", timeout=20000)
    page.locator(".lesson-block-help button").first.scroll_into_view_if_needed()
    page.locator(".lesson-block-help button").first.click()
    page.wait_for_timeout(1200)
    R.check(sec, "lesson help button works with no pop-up (SIMULATED AI reply)", page.locator(DIALOG).count() == 0)
    visit(page, "/review")
    page.wait_for_selector(".vocab-topic-card", timeout=30000)
    page.locator(".vocab-topic-card").first.click()
    page.locator(".vocab-practise-link").click()
    page.wait_for_timeout(1000)
    R.check(sec, "vocabulary practice opens, no pop-up", page.locator(DIALOG).count() == 0 and page.locator(".vocab-practise-link").count() == 0)
    for path in ("/dashboard", "/tests", "/trainers", "/start"):
        visit(page, path)
        links = page.evaluate(PAID_JS)
        if links:
            href = links[0]["href"]
            page.locator(f"a[href=\"{href}\"]:visible").first.click()
            page.wait_for_timeout(1200)
            R.check(sec, f"{path}: a paid link navigates, no pop-up", page.locator(DIALOG).count() == 0, f"{href} -> {page.url}")
    visit(page, "/dashboard")
    R.check(sec, "paid Today is the personal Today", page.locator("[data-free-home]").count() == 0)
    R.shot(page, f"{sec}-today")
    # A second, fresh browser is paid too.
    ctx2 = new_context(browser)
    p2 = ctx2.new_page()
    R.watch(p2, sec + "-second-browser")
    sign_in(p2, email, "/plans")
    p2.wait_for_url("**/plans**", timeout=40000)
    settle(p2)
    p2.wait_for_selector(".access-strip.is-paid b", timeout=30000)
    R.check(sec, "second fresh browser: /plans shows the paid access", p2.locator(".access-strip b").first.inner_text().startswith("Practice and guidance until"))
    check_open(sec, p2, "/tests/mock", "second browser: ")
    R.shot(p2, f"{sec}-second-browser-plans")
    ctx2.close()
    # Expiry: back to free; lessons readable; results kept.
    status, _ = post_json(STANDIN + "/__pay/expire", {"email": email})
    R.check(sec, "SIMULATED expiry accepted by the stand-in", status == 200, status)
    visit(page, "/plans")
    page.wait_for_selector(".access-strip b", timeout=30000)
    page.wait_for_function("() => !document.querySelector('.access-strip.is-paid')", timeout=30000)
    label = page.locator(".access-strip b").first.inner_text()
    R.check(sec, "after expiry /plans no longer shows paid access", not label.startswith("Practice and guidance until"), label)
    R.shot(page, f"{sec}-plans-after-expiry")
    visit(page, "/tests/mock")
    try:
        page.wait_for_selector("[data-paid-locked]", timeout=20000)
        R.check(sec, "after expiry paid pages are locked again", True)
    except Exception:  # noqa: BLE001
        R.check(sec, "after expiry paid pages are locked again", False)
    for route in ("/lessons/reading/tfng", "/lessons/writing/opinion", "/lessons/vocabulary/environment"):
        visit(page, route)
        try:
            lesson_ready(page)
            R.check(sec, f"after expiry {route} is still readable", True)
        except Exception:  # noqa: BLE001
            R.check(sec, f"after expiry {route} is still readable", False, lesson_state(page))
    visit(page, "/tests")
    try:
        page.wait_for_function("() => document.querySelectorAll('table tbody tr').length > 0", timeout=15000)
    except Exception:  # noqa: BLE001
        pass
    rows_after = page.locator("table tbody tr").count()
    R.check(sec, "after expiry saved results are still shown", rows_after >= rows_before and rows_after >= (1 if result_saved else 0), f"before={rows_before} after={rows_after}")
    visit(page, "/account#access")
    page.wait_for_selector("text=Purchase history", timeout=20000)
    R.check(sec, "after expiry the purchase history is kept", "₸12,990" in body_text(page))
    R.shot(page, f"{sec}-account-after-expiry")
    ctx.close()


# ── e. complimentary student via the real /admin buttons ────────────────

def admin_sign_in(page):
    page.goto(GATED + "/sign-up?next=%2Fadmin", wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=40000)
    settle(page)
    page.locator("#signup-email").fill("admin@example.test")
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    if page.locator("#signup-consent").count():  # required since 2 October 2026
        page.locator("#signup-consent").check(force=True)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_function("() => !location.pathname.endsWith('/sign-up')", timeout=40000)
    if "/profile" in page.url:
        fill_profile(page)
    page.wait_for_url("**/admin**", timeout=40000)
    settle(page)


def open_student(page, email):
    page.wait_for_selector("input[type=search]", timeout=40000)
    page.locator("input[type=search]").fill(email)
    row = page.locator("button.admin-row-main").first
    row.wait_for(timeout=15000)
    if row.get_attribute("aria-expanded") != "true":
        row.click()
    page.wait_for_selector("section.admin-access:not([aria-busy=true])", timeout=20000)


def admin_act(page, label, confirm=False):
    page.get_by_role("button", name=label).click()
    if confirm:
        page.get_by_role("button", name="Yes, stop").click()
    page.wait_for_function("() => { const m = document.querySelector('.admin-access-message'); return m && m.textContent.trim().length > 0 }", timeout=20000)
    return page.locator(".admin-access-message").inner_text().strip(), page.locator(".admin-access-message").get_attribute("class")


def grant_of(email):
    st = get_json(STANDIN + "/__trial/state")
    return [g for g in st.get("grants", []) if g.get("email") == email or g.get("user") == email]


def complimentary(browser):
    sec = "e-complimentary"
    sctx = new_context(browser)
    sp = sctx.new_page()
    R.watch(sp, sec + "-student")
    email = f"v3-gift-{STAMP}@example.test"
    sign_up(sp, email)
    sp.wait_for_url("**/dashboard**", timeout=40000)
    settle(sp)
    actx = new_context(browser)
    ap = actx.new_page()
    R.watch(ap, sec + "-admin")
    admin_sign_in(ap)
    R.check(sec, "admin@example.test reaches /admin", "/admin" in ap.url)
    open_student(ap, email)
    tier = ap.locator(".admin-access-tier").inner_text()
    R.check(sec, "admin panel shows the student as Free account", tier.strip() == "Free account", tier)
    R.shot(ap, f"{sec}-admin-before")
    msg, cls = admin_act(ap, "Give free access (30 days)")
    R.check(sec, "admin: 'Give free access (30 days)' succeeds", "is-done" in (cls or ""), msg)
    ends1 = ap.locator(".admin-kv div:has(dt:text-matches('Ends')) dd").first.inner_text()
    R.shot(ap, f"{sec}-admin-given")
    visit(sp, "/plans")
    sp.wait_for_selector(".access-strip.is-paid b", timeout=30000)
    label = sp.locator(".access-strip b").first.inner_text()
    R.check(sec, "student /plans: Free access from your teacher until <date>", label.startswith("Free access from your teacher until"), label)
    R.shot(sp, f"{sec}-student-plans")
    for path in ("/tests/mock", "/writing/checker", "/trainers/writing", "/speaking/cue-cards"):
        check_open(sec, sp, path, "complimentary: ")
    visit(sp, "/account#access")
    try:
        sp.wait_for_selector("[data-assessment-balance=paid]", timeout=20000)
        bal = sp.locator("[data-assessment-balance=paid]").inner_text()
        R.check(sec, "complimentary allowances are the paid ones (12/6/2/2)", "12 of 12" in bal and "6 of 6" in bal and bal.count("2 of 2") == 2, bal.replace("\n", " | "))
    except Exception:  # noqa: BLE001
        R.check(sec, "complimentary allowances are the paid ones (12/6/2/2)", False, "no balance shown")
    msg, cls = admin_act(ap, "Renew (another 30 days)")
    ends2 = ap.locator(".admin-kv div:has(dt:text-matches('Ends')) dd").first.inner_text()
    gr = [g for g in get_json(STANDIN + "/__trial/state")["grants"] if g.get("email") == email and g.get("kind") == "complimentary"]
    latest = max((g["ends_at"] for g in gr), default="")
    R.check(sec, "admin: Renew adds another 30 days (message, and a second grant in the database)", "is-done" in (cls or "") and len(gr) >= 2 and "until" in msg, f"{msg} | grants={[(g['starts_at'][:10], g['ends_at'][:10]) for g in gr]}")
    # Since 1 October 2026 the renewed date is on its own line, "Access runs
    # until", with the queued period counted; "Ends" stays the running grant's.
    runs = ap.locator(".admin-kv div:has(dt:text-is('Access runs until')) dd")
    runs_text = runs.first.inner_text() if runs.count() else ""
    R.check(sec, "admin panel's Access block shows the renewed end date", runs.count() == 1 and "queued" in runs_text, f"'Access runs until'={runs_text!r}; 'Ends' before={ends1!r} after={ends2!r}; latest grant ends {latest[:10]}")
    visit(sp, "/plans")
    sp.wait_for_selector(".access-strip.is-paid b", timeout=30000)
    label2 = sp.locator(".access-strip b").first.inner_text()
    R.check(sec, "student /plans shows the later date after Renew", label2 != label and label2.startswith("Free access from your teacher until"), f"{label} -> {label2}")
    msg, cls = admin_act(ap, "Stop free access", confirm=True)
    R.check(sec, "admin: Stop (with confirmation) succeeds", "is-done" in (cls or ""), msg)
    R.shot(ap, f"{sec}-admin-stopped")
    visit(sp, "/tests/mock")
    try:
        sp.wait_for_selector("[data-paid-locked]", timeout=30000)
        R.check(sec, "after Stop the student's paid features are locked", True)
    except Exception:  # noqa: BLE001
        R.check(sec, "after Stop the student's paid features are locked", False)
    visit(sp, "/lessons/reading/tfng")
    try:
        lesson_ready(sp)
        R.check(sec, "after Stop lessons stay readable", True)
    except Exception:  # noqa: BLE001
        R.check(sec, "after Stop lessons stay readable", False)
    visit(sp, "/plans")
    sp.wait_for_selector(".access-strip b", timeout=20000)
    lab = sp.locator(".access-strip b").first.inner_text().strip()
    R.check(sec, "after Stop /plans shows no running access (free account or 'ended')", lab == "Free account" or " ended on " in lab, lab)
    # A normal student cannot use the admin functions.
    visit(sp, "/admin")
    sp.wait_for_timeout(1500)
    sp.wait_for_function("() => !document.querySelector('[aria-busy=true]')", timeout=20000)
    txt = body_text(sp)
    R.check(sec, "a normal student sees no admin panel at /admin", sp.locator("input[type=search]").count() == 0 and sp.locator("button.admin-row-main").count() == 0, txt[:200].replace("\n", " "))
    R.shot(sp, f"{sec}-student-admin-denied")
    tok = token_of(sp)
    uid = sp.evaluate("() => { for (const k of Object.keys(localStorage)) { if (k.startsWith('sb-') && k.endsWith('-auth-token')) { return JSON.parse(localStorage.getItem(k)).user.id } } return null }")
    status, body = post_json(STANDIN + "/rest/v1/rpc/access_admin_complimentary", {"p_user": uid, "p_action": "give", "p_note": "self"}, tok)
    refused = not (status == 200 and isinstance(body, dict) and body.get("ok") is True)
    R.check(sec, "a normal student calling the admin function directly is refused", refused, f"{status} {str(body)[:200]}")
    visit(sp, "/tests/mock")
    try:
        sp.wait_for_selector("[data-paid-locked]", timeout=20000)
        R.check(sec, "... and still has no paid access afterwards", True)
    except Exception:  # noqa: BLE001
        R.check(sec, "... and still has no paid access afterwards", False)
    actx.close()
    sctx.close()


# ── f. returning student ────────────────────────────────────────────────

def returning(browser, email):
    sec = "f-returning"
    ctx = new_context(browser)
    page = ctx.new_page()
    R.watch(page, sec)
    visit(page, "/lessons/writing/discussion", "[data-lesson-invite]")
    signin = page.locator("[data-lesson-invite] a.trial-btn:not(.trial-primary)").first
    href = signin.get_attribute("href")
    R.check(sec, "lesson invitation has a Sign in link that returns to the lesson", "/sign-in" in (href or "") and "discussion" in (href or ""), href)
    signin.click()
    page.wait_for_selector("#signin-email", timeout=30000)
    settle(page)
    page.locator("#signin-email").fill(email)
    page.locator("#signin-password").fill(PASSWORD)
    page.locator("button.auth-button[type=submit]").click()
    try:
        page.wait_for_url("**/lessons/writing/discussion**", timeout=40000)
        settle(page)
        lesson_ready(page)
        R.check(sec, "signing in from a lesson lands back on that lesson, text open", True)
    except Exception as e:  # noqa: BLE001
        R.check(sec, "signing in from a lesson lands back on that lesson, text open", False, f"{page.url} {str(e)[:100]}")
    R.shot(page, f"{sec}-back-on-lesson")
    ctx.close()
    for lang in ("en", "ru"):
        ctx = new_context(browser, lang)
        page = ctx.new_page()
        R.watch(page, sec + "-" + lang)
        visit(page, "/sign-in?next=%2Flessons%2Freading%2Ftfng")
        page.locator("a[href*='/forgot-password']").first.click()
        page.wait_for_selector("#forgot-email", timeout=20000)
        settle(page)
        if lang == "ru":
            page.wait_for_function("() => document.documentElement.lang === 'ru'", timeout=10000)
        R.check(sec, f"forgot-password screen opens from sign-in ({lang})", True)
        R.shot(page, f"{sec}-forgot-{lang}")
        page.locator("#forgot-email").fill(email)
        page.locator("button[type=submit]").first.click()
        try:
            page.wait_for_selector("text=/Check your email|Проверьте почту/", timeout=20000)
            R.check(sec, f"forgot-password: 'check your email' confirmation ({lang}, stand-in sends no mail)", True)
        except Exception:  # noqa: BLE001
            R.check(sec, f"forgot-password: 'check your email' confirmation ({lang}, stand-in sends no mail)", False, body_text(page)[:200])
        R.shot(page, f"{sec}-forgot-sent-{lang}")
        ctx.close()


# ── the open build ──────────────────────────────────────────────────────

def open_build(browser):
    sec = "open-build"
    for lang in ("en", "ru"):
        ctx = new_context(browser, lang)
        page = ctx.new_page()
        R.watch(page, sec + "-" + lang)
        page.goto(OPEN + "/", wait_until="domcontentloaded")
        page.wait_for_url("**/dashboard**", timeout=20000)
        settle(page)
        R.check(sec, f"{lang}: / redirects to the dashboard", page.url.rstrip("/").endswith("/dashboard"), page.url)
        words = ["Free account", "free account", "12,990", "12 990", "Get practice and guidance", "Practice and guidance", "Бесплатный аккаунт", "бесплатный аккаунт", "Практика и сопровождение"]
        for path in ("/dashboard", "/lessons/reading/tfng", "/lessons/writing/opinion", "/tests", "/trainers", "/start", "/learn", "/review", "/trainers/writing", "/tests/mock", "/writing/models"):
            visit(page, path, base=OPEN)
            if path.startswith("/lessons/"):
                try:
                    lesson_ready(page)
                    st = lesson_state(page)
                    R.check(sec, f"{lang} {path}: lesson text open without an account, no invitation", not st["invite"] and st["len"] > 500, st)
                except Exception:  # noqa: BLE001
                    R.check(sec, f"{lang} {path}: lesson text open without an account, no invitation", False, lesson_state(page))
            txt = body_text(page).replace(" ", " ")
            found = [w for w in words if w in txt]
            R.check(sec, f"{lang} {path}: no free-account, price or upgrade prompt", not found and page.locator("[data-paid-locked], [data-upgrade-dialog]").count() == 0, found)
            R.check(sec, f"{lang} {path}: no trial prompt", not note_trial(page, sec + path))
        visit(page, "/tests", "[data-test-rotation]", base=OPEN)
        page.locator("[data-test-rotation]").first.click()
        try:
            page.wait_for_url("**/tests/**", timeout=20000)
            settle(page)
            R.check(sec, f"{lang}: Tests start button opens a paper directly, no pop-up", page.locator(DIALOG).count() == 0, page.url)
        except Exception as e:  # noqa: BLE001
            R.check(sec, f"{lang}: Tests start button opens a paper directly, no pop-up", False, str(e)[:100])
        visit(page, "/lessons/reading/tfng", base=OPEN)
        lesson_ready(page)
        if page.locator(".lesson-block-help button").count():
            page.locator(".lesson-block-help button").first.click()
            page.wait_for_timeout(1000)
        page.locator("#lesson-complete-btn").scroll_into_view_if_needed()
        page.locator("#lesson-complete-btn").click()
        page.wait_for_timeout(2500)
        R.check(sec, f"{lang}: finishing a lesson shows no nudge or pop-up", page.locator(DIALOG).count() == 0)
        visit(page, "/trainers/writing", base=OPEN)
        page.wait_for_timeout(800)
        R.check(sec, f"{lang}: Writing trainer page opens with no lock", page.locator("[data-paid-locked]").count() == 0)
        R.shot(page, f"{sec}-{lang}-writing-trainer")
        ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        email = None
        plan = [("b", lambda: signed_out(browser)), ("b", lambda: signed_out(browser, "ru", 390, 844)), ("b", lambda: signed_out(browser, "ru", 320, 700)),
                ("b", lambda: signed_out(browser, "en", 390, 844)),
                ("c", lambda: free_student(browser)),
                ("cp", lambda: free_phone(browser, "en", 390, 844)), ("cp", lambda: free_phone(browser, "ru", 390, 844)), ("cp", lambda: free_phone(browser, "ru", 320, 700)),
                ("cp", lambda: free_phone(browser, "ru", 1440, 900)),
                ("d", lambda: paying_student(browser)), ("e", lambda: complimentary(browser)), ("open", lambda: open_build(browser))]
        for key, fn in plan:
            if ONLY and key not in ONLY:
                continue
            try:
                r = fn()
                if key == "c":
                    email = r
            except Exception as e:  # noqa: BLE001
                R.check(key, f"section {key} finished", False, str(e)[:400])
        if not ONLY or "f" in ONLY:
            try:
                if not email:
                    ctx = new_context(browser)
                    pg = ctx.new_page()
                    email = f"v3-ret-{STAMP}@example.test"
                    sign_up(pg, email)
                    pg.wait_for_url("**/dashboard**", timeout=40000)
                    ctx.close()
                returning(browser, email)
            except Exception as e:  # noqa: BLE001
                R.check("f", "section f finished", False, str(e)[:400])
        browser.close()
    R.check("all", "no trial wording on any page visited", not TRIAL_SEEN, TRIAL_SEEN[:5])
    R.check("all", "zero uncaught page errors or hydration messages", not R.errors, R.errors[:3])
    R.save({"trialSeen": TRIAL_SEEN, "russianProbnyUses": PROBN_SEEN})


if __name__ == "__main__":
    main()
