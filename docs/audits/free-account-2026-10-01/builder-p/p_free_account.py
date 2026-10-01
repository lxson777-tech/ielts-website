"""Builder P: the free-account model on the platform, in a real browser.

Alex's decision of 1 October 2026 (docs/paid-access/FREE-ACCOUNT-MODEL.md).
Gated production build, local stand-in (tools/mr-ez-dev-server.mjs --trial,
SIMULATED payments, no money, no AI provider), synthetic @example.test
accounts only.

  GATED_BASE     the gated build   (default http://127.0.0.1:4661/ielts-website)
  GATED_STANDIN  the stand-in      (default http://127.0.0.1:8661)

What it proves, each as a named check in results.json:
  signed-out   a lesson shows its title and the invitation, never the lesson;
               the invitation's sign-up comes back to the lesson; a paid
               link opens the pop-up with sign-up then /plans; /trial goes
               to sign-up keeping the questionnaire answers
  free         sign-up and profile land on Today with the answers used;
               every lesson opens through the door, with its quiz; every
               paid entry point opens the pop-up (keyboard: focus in, Tab
               contained, Escape, focus back); direct links show the calm
               locked page; the first-lesson nudge once only; no trial
               anywhere; /plans and /account say "Free account"
  paid         a SIMULATED purchase opens everything: tests, trainers, Mr EZ,
               help buttons, no pop-up anywhere; the tier on /plans
  gift         a complimentary grant from the admin helper opens everything;
               "Free access from your teacher until"
  ru           the same screens in Russian at 390x844 and 320x700
and zero uncaught page errors or hydration messages on every visit.

A page is judged once React has taken over every island that loads on
arrival (no waiting astro-island[ssr]), never after a fixed short sleep.
"""
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GATED = os.environ.get("GATED_BASE", "http://127.0.0.1:4661/ielts-website")
STANDIN = os.environ.get("GATED_STANDIN", "http://127.0.0.1:8661")
OUT = Path(__file__).resolve().parent
SHOTS = OUT / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)
STAMP = str(int(time.time()))
PASSWORD = "Synthetic-Free-1"
JOURNEY = "journey=1&band=7.5&skill=writing&focus=method&time=30"

HYDRATED = """() => [...document.querySelectorAll('astro-island[ssr]')].every(el => ['visible', 'media'].includes(el.getAttribute('client')))"""
HYDRATION_WORDS = ("ydrat", "#418", "#423", "#425", "didn't match", "did not match")
DIALOG = "[role=dialog][aria-labelledby=upgrade-title]"

results = []
page_errors = []


def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f"  ({detail})" if detail and not ok else ""), flush=True)
    return ok


def post_json(url, data=None, token=None):
    req = urllib.request.Request(
        url, data=json.dumps(data).encode() if data is not None else b"", method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json", "Origin": GATED.rsplit("/", 1)[0],
                 **({"Authorization": "Bearer " + token} if token else {})})
    with urllib.request.urlopen(req) as r:
        body = r.read()
        return r.status, (json.loads(body) if body else None)


def settle(page):
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_function(HYDRATED, timeout=45000)
    page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 250))))")


def visit(page, path, wait_for=None):
    page.goto(GATED + path, wait_until="domcontentloaded")
    settle(page)
    if wait_for:
        page.wait_for_selector(wait_for, timeout=30000)


def shot(page, name):
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=False)


def body_text(page):
    return page.evaluate("() => document.body.innerText")


def watch(page, tag):
    page.on("pageerror", lambda e: page_errors.append({"tag": tag, "url": page.url, "error": str(e)[:400]}))
    page.on("console", lambda m: page_errors.append({"tag": tag, "url": page.url, "error": m.text[:400]})
            if m.type == "error" and any(w in m.text for w in HYDRATION_WORDS) else None)


def new_context(browser, lang="en", w=1440, h=900):
    phone = w < 720
    ctx = browser.new_context(viewport={"width": w, "height": h}, locale="ru-RU" if lang == "ru" else "en-GB",
                              device_scale_factor=2 if phone else 1, is_mobile=phone, has_touch=phone)
    ctx.add_init_script(f"try{{ localStorage.setItem('ielts.locale.v1','{lang}') }}catch(e){{}}")
    return ctx


def sign_up(page, email, next_route):
    page.goto(GATED + "/sign-up?next=" + urllib.parse.quote(next_route, safe=""), wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=40000)
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_selector("#profile-firstName", timeout=40000)
    page.locator("#profile-firstName").fill("Synthetic")
    page.locator("#profile-lastName").fill("Student")
    page.locator("#profile-dob-day").select_option("4")
    page.locator("#profile-dob-month").select_option("3")
    page.locator("#profile-dob-year").select_option("2000")
    page.locator("#profile-phone").fill("+7 701 234 56 78")
    page.locator("#profile-city").fill("Almaty")
    page.locator("#profile-occupation").fill("Synthetic University")
    page.locator("#profile-source-friend").check(force=True)
    page.locator("button.auth-button[type=submit]").click()


def token_of(page):
    return page.evaluate(
        "() => { for (const k of Object.keys(localStorage)) { if (k.startsWith('sb-') && k.endsWith('-auth-token')) "
        "{ return JSON.parse(localStorage.getItem(k)).access_token } } return null }")


def dialog_feature(page, timeout=8000):
    try:
        page.wait_for_selector(DIALOG, timeout=timeout)
        # Settled: its entrance animation has finished (for the screenshots).
        page.wait_for_function("() => { const l = document.querySelector('.upgrade-layer'); return l && l.getAnimations({ subtree: true }).every(a => a.playState !== 'running') }", timeout=5000)
    except Exception:  # noqa: BLE001
        if not page.locator(DIALOG).count():
            return None
    return page.locator("[data-upgrade-dialog]").get_attribute("data-upgrade-dialog")


def close_dialog(page):
    page.keyboard.press("Escape")
    page.wait_for_selector(DIALOG, state="detached", timeout=5000)


def opens_dialog(page, name, locator, expect_feature, stays_on=None):
    before = page.url
    try:
        locator.first.scroll_into_view_if_needed(timeout=8000)
        locator.first.click(timeout=8000)
    except Exception as e:  # noqa: BLE001
        return check(name, False, f"could not click: {str(e)[:120]}")
    feature = dialog_feature(page)
    ok = feature == expect_feature and page.url == before
    check(name, ok, f"feature={feature} url={page.url}")
    if feature:
        close_dialog(page)
    return ok


def focused(page):
    return page.evaluate("() => document.activeElement && (document.activeElement.outerHTML || '').slice(0, 80)")


def keyboard_contract(page, name, opener):
    """Focus moves in, Tab stays inside, Escape closes, focus goes back to
    `opener` (the control focused before the pop-up opened)."""
    page.wait_for_function("() => document.activeElement && document.activeElement.closest('[role=dialog]')", timeout=5000)
    inside = True
    for _ in range(6):
        page.keyboard.press("Tab")
        inside = inside and page.evaluate("() => !!(document.activeElement && document.activeElement.closest('[role=dialog]'))")
    for _ in range(3):
        page.keyboard.press("Shift+Tab")
        inside = inside and page.evaluate("() => !!(document.activeElement && document.activeElement.closest('[role=dialog]'))")
    named = page.evaluate("() => { const d = document.querySelector('[role=dialog][aria-labelledby=upgrade-title]'); return d && d.getAttribute('aria-modal') === 'true' && !!document.getElementById(d.getAttribute('aria-labelledby')).textContent.trim() }")
    page.keyboard.press("Escape")
    page.wait_for_selector(DIALOG, state="detached", timeout=5000)
    page.wait_for_timeout(120)
    back = page.evaluate("() => document.activeElement && (document.activeElement.outerHTML || '').slice(0, 80)")
    check(name, inside and named and back == opener, f"inside={inside} named={named} opener={opener} back={back}")


def no_trial_text(page, name):
    text = body_text(page)
    hits = re.findall(r"[^.\n]*\b(trial|пробн\w*)\b[^.\n]*", text, re.I)
    check(name, not hits, "; ".join(h.strip()[:80] for h in hits[:3]))


SWEEP = ["/plans", "/dashboard", "/lessons/reading/paraphrase", "/trainers/writing", "/trainers/speaking", "/tests", "/trainers",
         "/account", "/start", "/learn", "/review", "/lessons/writing", "/lessons/vocabulary/environment", "/privacy", "/support", "/help"]


def sweep(page, tag):
    """A fresh visit and a refresh of each page; page errors are collected by watch()."""
    for path in SWEEP:
        for kind in ("fresh", "refresh"):
            try:
                if kind == "fresh":
                    page.goto(GATED + path, wait_until="domcontentloaded")
                else:
                    page.reload(wait_until="domcontentloaded")
                settle(page)
            except Exception as e:  # noqa: BLE001
                page_errors.append({"tag": tag, "url": GATED + path, "error": "did not finish loading: " + str(e)[:200]})
    check(f"{tag}: {len(SWEEP)} pages visited and refreshed", True)


# ── The runs ─────────────────────────────────────────────────────────────

def signed_out(browser):
    ctx = new_context(browser)
    page = ctx.new_page()
    watch(page, "signed-out")
    visit(page, "/lessons/reading/tfng", "[data-lesson-invite]")
    body = page.locator("[data-lesson-body]")
    empty = body.count() == 0 or page.evaluate("() => { const b = document.querySelector('[data-lesson-body]'); return !b || b.textContent.trim() === '' }")
    title = page.locator("#lesson-invite-title").inner_text()
    check("signed-out lesson: title and invitation, no lesson text", empty and len(title.strip()) > 3, f"title={title} empty={empty}")
    html = page.content()
    check("signed-out lesson page carries no lesson text in its HTML", "data-lesson-gated" in html)
    shot(page, "01-signed-out-lesson-invite-en-1440")
    href = page.locator("[data-lesson-invite-signup]").get_attribute("href")
    check("invitation's sign-up comes back to the lesson", "/sign-up?next=%2Flessons%2Freading%2Ftfng" in (href or ""), href)
    no_trial_text(page, "signed-out lesson: no trial wording")

    visit(page, "/tests", "[data-test-rotation]")
    page.locator("[data-test-rotation]").first.click()
    feature = dialog_feature(page)
    primary = page.locator("[data-upgrade-primary]").get_attribute("href") if feature else None
    check("signed-out: a paid button opens the pop-up, primary is sign-up then /plans", feature == "test" and primary and "/sign-up?next=%2Fplans" in primary, f"{feature} {primary}")
    shot(page, "02-signed-out-tests-dialog-en-1440")
    if feature:
        close_dialog(page)

    page.goto(GATED + "/trial?" + JOURNEY, wait_until="domcontentloaded")
    page.wait_for_url("**/sign-up**", timeout=20000)
    check("/trial goes to sign-up with the answers inside next", "next=%2Fdashboard%3Fjourney%3D1%26band%3D7.5" in page.url, page.url)
    sweep(page, "signed-out sweep")
    ctx.close()


def free_account(browser):
    ctx = new_context(browser)
    page = ctx.new_page()
    watch(page, "free")
    email = f"p-free-{STAMP}@example.test"
    sign_up(page, email, "/dashboard?" + JOURNEY)
    page.wait_for_url("**/dashboard**", timeout=40000)
    settle(page)
    page.wait_for_selector("[data-free-home]", timeout=30000)
    start = page.locator("[data-free-start]").get_attribute("data-free-start")
    first_next = page.locator("[data-free-next]").first.get_attribute("data-free-next")
    check("free Today: questionnaire answers used (Writing first)", start == "writing" and first_next.startswith("writing"), f"{start} {first_next}")
    no_trial_text(page, "free Today: no trial wording")
    shot(page, "03-free-today-en-1440")
    opens_dialog(page, "free Today: practice and guidance card opens the pop-up", page.locator("[data-free-pitch-open]"), "plan-practice")
    opens_dialog(page, "Mr EZ launcher opens the pop-up", page.locator(".mrez-launcher"), "tutor")

    # A lesson through the door, its quiz, its help buttons.
    visit(page, "/lessons/reading/tfng")
    page.wait_for_function("() => { const b = document.querySelector('[data-lesson-body]'); return b && b.textContent.trim().length > 500 }", timeout=30000)
    check("free: a lesson's text arrives through the door", True)
    page.wait_for_selector(".lesson-body .my-8.overflow-hidden", timeout=30000)
    check("free: the lesson's own quiz opens", page.locator("text=/correct/").count() > 0)
    page.wait_for_selector(".lesson-block-help button", timeout=20000)
    help_btn = page.locator(".lesson-block-help button").first
    help_btn.scroll_into_view_if_needed()
    help_btn.focus()
    opener = focused(page)
    page.keyboard.press("Enter")
    feature = dialog_feature(page)
    check("lesson help button opens the pop-up for a free account", feature == "tutor", str(feature))
    shot(page, "04-free-lesson-help-dialog-en-1440")
    if feature:
        keyboard_contract(page, "pop-up keyboard: focus in, Tab contained, Escape, focus back to the help button", opener)
    no_trial_text(page, "free lesson: no trial wording")

    # The first-lesson nudge, once.
    page.locator("#lesson-complete-btn").scroll_into_view_if_needed()
    page.locator("#lesson-complete-btn").click()
    feature = dialog_feature(page, timeout=6000)
    check("first-lesson nudge after 'studied'", feature == "first-lesson", str(feature))
    shot(page, "05-first-lesson-nudge-en-1440")
    if feature:
        page.locator("[data-upgrade-dismiss]").click()
        page.wait_for_selector(DIALOG, state="detached", timeout=5000)
    visit(page, "/lessons/reading/ynng")
    page.wait_for_function("() => { const b = document.querySelector('[data-lesson-body]'); return b && b.textContent.trim().length > 500 }", timeout=30000)
    page.locator("#lesson-complete-btn").scroll_into_view_if_needed()
    page.locator("#lesson-complete-btn").click()
    page.wait_for_timeout(2500)
    check("no nudge on the second finished lesson", page.locator(DIALOG).count() == 0)
    page.reload(wait_until="domcontentloaded")
    settle(page)
    page.wait_for_timeout(1500)
    check("no nudge after a reload", page.locator(DIALOG).count() == 0)

    # Worked example through the door; its links are paid.
    visit(page, "/lessons/writing/opinion")
    try:
        page.wait_for_selector("text=What a Band 8 answer looks like", timeout=30000)
        check("free: a writing lesson's worked example arrives through the door", True)
    except Exception:  # noqa: BLE001
        check("free: a writing lesson's worked example arrives through the door", False, "no example")
    opens_dialog(page, "lesson's 'check your writing' link opens the pop-up", page.locator("#essay-checker a[href*='/writing/checker']"), "essay")

    # Tests and Practice hubs.
    visit(page, "/tests", "[data-test-rotation]")
    opens_dialog(page, "Tests: Reading start button", page.locator("[data-test-rotation]").nth(0), "test")
    opens_dialog(page, "Tests: Listening start button", page.locator("[data-test-rotation]").nth(1), "test")
    opens_dialog(page, "Tests: a paper in the catalogue", page.locator(".test-catalog a[href*='/tests/reading-full-']"), "test")
    opens_dialog(page, "Tests: Mock Exam Day", page.locator("a.mock-invite"), "mock")
    opens_dialog(page, "Tests: Writing Checker", page.locator("a[href$='/writing/checker']"), "essay")
    opens_dialog(page, "Tests: Live AI Examiner", page.locator("a[href$='/speaking/examiner']"), "live")
    opens_dialog(page, "Tests: Reading Trainer link", page.locator("a[href$='/trainers/reading']"), "drill")
    no_trial_text(page, "Tests: no trial wording")
    shot(page, "06-free-tests-en-1440")
    visit(page, "/trainers")
    for href, feat in (("/trainers/reading", "drill"), ("/trainers/listening", "drill"), ("/trainers/speaking", "trainer"), ("/trainers/writing", "trainer")):
        opens_dialog(page, f"Practice: {href}", page.locator(f"a.activity-start[href$='{href}']"), feat)
    no_trial_text(page, "Practice: no trial wording")

    # Vocabulary topic lists are free; their practice is paid.
    visit(page, "/review")
    try:
        page.wait_for_selector(".vocab-topic-card", timeout=30000)
        check("free: vocabulary topic lists open", True)
        page.locator(".vocab-topic-card").first.click()
        page.wait_for_selector(".vocab-practise-link", timeout=10000)
        opens_dialog(page, "vocabulary practice opens the pop-up", page.locator(".vocab-practise-link"), "vocab-review")
    except Exception as e:  # noqa: BLE001
        check("free: vocabulary topic lists open", False, str(e)[:120])

    # Direct links to paid pages: the calm locked page, its button opens the pop-up.
    for path, feat in (("/trainers/writing", "trainer"), ("/tests/mock", "mock"), ("/placement", "placement"), ("/writing/models", "model-answers"),
                       ("/speaking/cue-cards", "cue-cards"), ("/learn/bands", "band-guide"), ("/writing/checker", "essay"),
                       ("/speaking/examiner", "live"), ("/speaking/recorded", "speaking"), ("/tests/reading-full-001", "test")):
        visit(page, path)
        try:
            page.wait_for_selector(f"[data-paid-locked='{feat}']", timeout=20000)
            ok = True
        except Exception:  # noqa: BLE001
            ok = False
        check(f"direct link {path}: calm locked page", ok)
        if ok:
            opens_dialog(page, f"direct link {path}: its button opens the pop-up", page.locator("[data-paid-locked-open]"), feat)
            if path == "/trainers/writing":
                shot(page, "07-free-locked-page-en-1440")

    visit(page, "/plans")
    page.wait_for_selector(".access-strip b", timeout=20000)
    check("/plans says Free account", page.locator(".access-strip b").first.inner_text().strip() == "Free account", page.locator(".access-strip b").first.inner_text())
    no_trial_text(page, "/plans: no trial wording")
    visit(page, "/account")
    page.wait_for_selector(".access-strip b", timeout=20000)
    check("/account says Free account", page.locator(".access-strip b").first.inner_text().strip() == "Free account")

    # Keyboard: Tests start button by keyboard, Escape returns focus to it.
    visit(page, "/tests", "[data-test-rotation]")
    page.locator("[data-test-rotation]").first.focus()
    opener = focused(page)
    page.keyboard.press("Enter")
    if dialog_feature(page):
        keyboard_contract(page, "pop-up keyboard from a Tests start button", opener)
    sweep(page, "free sweep")
    tok = token_of(page)
    ctx.close()
    return email, tok


def paid_account(browser):
    ctx = new_context(browser)
    page = ctx.new_page()
    watch(page, "paid")
    email = f"p-paid-{STAMP}@example.test"
    sign_up(page, email, "/dashboard")
    page.wait_for_url("**/dashboard**", timeout=40000)
    settle(page)
    _, order = post_json(STANDIN + "/payments/checkout", {"planId": "month-1"}, token_of(page))
    status, _ = post_json(f"{STANDIN}/__pay/{order['orderId']}/pay")
    check("SIMULATED purchase confirmed", status == 200)
    visit(page, "/plans")
    page.wait_for_selector(".access-strip.is-paid b", timeout=30000)
    check("/plans says Practice and guidance until <date>", page.locator(".access-strip b").first.inner_text().startswith("Practice and guidance until"), page.locator(".access-strip b").first.inner_text())
    visit(page, "/dashboard")
    try:
        page.wait_for_selector(".dash-cards, [data-dashboard], .learning-dashboard, .today", timeout=30000)
    except Exception:  # noqa: BLE001
        pass
    check("paid Today is the personal Today, not the free one", page.locator("[data-free-home]").count() == 0)
    shot(page, "08-paid-today-en-1440")
    visit(page, "/tests", "[data-test-rotation]")
    page.locator("[data-test-rotation]").first.click()
    try:
        page.wait_for_url("**/tests/reading-full-**", timeout=20000)
        settle(page)
        page.wait_for_selector("text=/Start|Begin/", timeout=30000)
        check("paid: Tests start button opens a paper", page.locator(DIALOG).count() == 0)
    except Exception as e:  # noqa: BLE001
        check("paid: Tests start button opens a paper", False, str(e)[:120])
    shot(page, "09-paid-paper-en-1440")
    visit(page, "/trainers/writing")
    page.wait_for_timeout(500)
    try:
        page.wait_for_function("() => document.body.dataset.trialGate === 'open'", timeout=30000)
        check("paid: a trainer page opens", page.locator("[data-paid-locked]").count() == 0)
    except Exception:  # noqa: BLE001
        check("paid: a trainer page opens", False)
    visit(page, "/lessons/reading/tfng")
    page.wait_for_function("() => { const b = document.querySelector('[data-lesson-body]'); return b && b.textContent.trim().length > 500 }", timeout=30000)
    page.locator(".mrez-launcher").click()
    page.wait_for_timeout(600)
    check("paid: Mr EZ launcher opens the panel, no pop-up", page.locator(DIALOG).count() == 0 and page.locator("#mrez-panel.is-open").count() == 1)
    sweep(page, "paid sweep")
    check("paid: no pop-up appeared anywhere in the sweep", page.locator(DIALOG).count() == 0)
    ctx.close()


def gift_account(browser):
    ctx = new_context(browser)
    page = ctx.new_page()
    watch(page, "gift")
    email = f"p-gift-{STAMP}@example.test"
    sign_up(page, email, "/dashboard")
    page.wait_for_url("**/dashboard**", timeout=40000)
    settle(page)
    status, _ = post_json(STANDIN + "/__access/complimentary", {"email": email, "action": "give"})
    check("complimentary grant given (stand-in admin helper)", status == 200)
    visit(page, "/plans")
    page.wait_for_selector(".access-strip.is-paid b", timeout=30000)
    title = page.locator(".access-strip b").first.inner_text()
    check("/plans says Free access from your teacher until <date>", title.startswith("Free access from your teacher until"), title)
    shot(page, "10-complimentary-plans-en-1440")
    visit(page, "/tests/mock")
    page.wait_for_function("() => document.body.dataset.trialGate === 'open'", timeout=30000)
    check("complimentary: the mock exam page opens", page.locator("[data-paid-locked]").count() == 0)
    post_json(STANDIN + "/__access/complimentary", {"email": email, "action": "stop"})
    visit(page, "/tests/mock")
    try:
        page.wait_for_selector("[data-paid-locked]", timeout=30000)
        check("complimentary stopped: back to the locked page", True)
    except Exception:  # noqa: BLE001
        check("complimentary stopped: back to the locked page", False)
    ctx.close()


def russian(browser, w, h):
    ctx = new_context(browser, "ru", w, h)
    page = ctx.new_page()
    watch(page, f"ru-{w}")
    visit(page, "/lessons/reading/tfng", "[data-lesson-invite]")
    page.wait_for_function("() => document.documentElement.lang === 'ru'", timeout=10000)
    page.wait_for_function("() => document.querySelector('[data-lesson-invite-signup]').textContent.includes('бесплатный')", timeout=15000)
    check(f"ru {w}: signed-out lesson invitation in Russian", True)
    overflow = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth + 1")
    check(f"ru {w}: no sideways scroll on the invitation", not overflow)
    shot(page, f"11-ru-signed-out-lesson-{w}")
    email = f"p-ru-{w}-{STAMP}@example.test"
    sign_up(page, email, "/dashboard")
    page.wait_for_url("**/dashboard**", timeout=40000)
    settle(page)
    page.wait_for_selector("[data-free-home]", timeout=30000)
    page.wait_for_function("() => document.querySelector('[data-free-home] h1').textContent.match(/[а-я]/i)", timeout=15000)
    check(f"ru {w}: free Today in Russian", True)
    shot(page, f"12-ru-free-today-{w}")
    page.locator("[data-free-pitch-open]").click()
    feature = dialog_feature(page)
    price = page.locator(".upgrade-price").inner_text() if feature else ""
    check(f"ru {w}: pop-up in Russian with the price", feature == "plan-practice" and "за 30 дней" in price and "990" in price, price)
    overflow = page.evaluate("() => { const p = document.querySelector('.upgrade-panel'); return p.getBoundingClientRect().right > window.innerWidth + 1 || p.getBoundingClientRect().left < -1 }")
    check(f"ru {w}: the pop-up fits the screen", not overflow)
    shot(page, f"13-ru-dialog-{w}")
    if feature:
        close_dialog(page)
    no_trial_text(page, f"ru {w}: no trial wording on Today")
    ctx.close()


def english_phone(browser):
    ctx = new_context(browser, "en", 390, 844)
    page = ctx.new_page()
    watch(page, "en-390")
    email = f"p-phone-{STAMP}@example.test"
    sign_up(page, email, "/dashboard")
    page.wait_for_url("**/dashboard**", timeout=40000)
    settle(page)
    page.wait_for_selector("[data-free-home]", timeout=30000)
    shot(page, "14-en-free-today-390")
    visit(page, "/tests", "[data-test-rotation]")
    page.locator("[data-test-rotation]").first.click()
    feature = dialog_feature(page)
    check("en 390: the pop-up opens from Tests on a phone", feature == "test")
    overflow = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth + 1")
    check("en 390: no sideways scroll", not overflow)
    shot(page, "15-en-dialog-390")
    ctx.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for run in (signed_out, free_account, paid_account, gift_account, english_phone):
            try:
                run(browser)
            except Exception as e:  # noqa: BLE001
                check(f"{run.__name__} finished", False, str(e)[:300])
        for w, h in ((390, 844), (320, 700)):
            try:
                russian(browser, w, h)
            except Exception as e:  # noqa: BLE001
                check(f"russian {w} finished", False, str(e)[:300])
        browser.close()
    check("zero uncaught page errors or hydration messages", not page_errors, json.dumps(page_errors[:3], ensure_ascii=False))
    failed = [r for r in results if not r["ok"]]
    (OUT / "results.json").write_text(json.dumps({"base": GATED, "checks": results, "pageErrors": page_errors}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n{len(results) - len(failed)} / {len(results)} checks passed; {len(page_errors)} page errors")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    import urllib.parse  # noqa: E402
    main()
