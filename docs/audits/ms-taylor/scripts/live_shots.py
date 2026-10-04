"""Ms. Taylor in a whole (simulated) live interview, end to end (4 October 2026).

The site runs on a local dev server (default http://127.0.0.1:4602) whose
accounts and Mr EZ point at the free local stand-in (tools/mr-ez-dev-server.mjs,
every tutor reply labelled simulated), and whose live examiner and speaking
grader are answered inside the page by live_fixture.js. No request reaches
OpenAI, a Worker or production. Synthetic @example.test accounts only.

    python docs/audits/ms-taylor/scripts/live_shots.py [base-url]

For each language and width it signs a new student up, runs a Part 1 live
drill (/trainers/speaking) through to the result, photographs every state,
presses "Ask Mr EZ to explain this result", and then runs the full test
(/speaking/examiner) to its result. It also checks that Mr EZ is silenced
during the interview (body flag, panel header) and restored after, and
records her frames while she speaks.
"""
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "screens"
OUT.mkdir(parents=True, exist_ok=True)
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4602/ielts-website"
ONLY = sys.argv[2] if len(sys.argv) > 2 else "all"
PASSWORD = "Synthetic-Verify-1"
STAMP = str(int(time.time()))
SIZES = {"1440": (1440, 900), "390": (390, 844)}
HYDRATED = "() => [...document.querySelectorAll('astro-island[ssr]')].length === 0"
results = {}
errors = []


def ctx(browser, lang, size):
    w, h = SIZES[size]
    phone = w < 720
    c = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if phone else 1,
                            is_mobile=phone, has_touch=phone, locale="ru-RU" if lang == "ru" else "en-GB")
    c.add_init_script(f"try{{localStorage.setItem('ielts.locale.v1','{lang}')}}catch(e){{}}")
    c.add_init_script(path=str(HERE / "live_fixture.js"))
    origin = BASE.split("/ielts-website")[0]
    c.grant_permissions(["microphone"], origin=origin)
    return c


def settle(page, extra=900):
    page.wait_for_load_state("domcontentloaded")
    try:
        page.wait_for_function(HYDRATED, timeout=45000)
    except Exception:  # noqa: BLE001
        pass
    page.wait_for_timeout(extra)


def shot(page, name, full=False):
    p = OUT / f"{name}.png"
    page.screenshot(path=str(p), full_page=full)
    print(p)
    return p


def sign_up(page, tag):
    email = f"ms-taylor-{tag}-{STAMP}@example.test"
    page.goto(BASE + "/sign-up?next=%2Fdashboard", wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=60000)
    settle(page)
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    if page.locator("#signup-consent").count():
        page.locator("#signup-consent").check(force=True)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_function("() => !location.pathname.endsWith('/sign-up')", timeout=40000)
    if "/profile" in page.url or page.locator("#profile-firstName").count():
        page.wait_for_selector("#profile-firstName", timeout=40000)
        page.locator("#profile-firstName").fill("Synthetic")
        page.locator("#profile-lastName").fill("Student")
        page.locator("#profile-dob-day").select_option("4")
        page.locator("#profile-dob-month").select_option("3")
        page.locator("#profile-dob-year").select_option("2000")
        if page.locator("#profile-phone").count():
            page.locator("#profile-phone").fill("+7 701 234 56 78")
        if page.locator("#profile-city").count():
            page.locator("#profile-city").fill("Almaty")
        if page.locator("#profile-occupation").count():
            page.locator("#profile-occupation").fill("Synthetic University")
        if page.locator("#profile-source-friend").count():
            page.locator("#profile-source-friend").check(force=True)
        if page.locator("#profile-consent").count():
            page.locator("#profile-consent").check(force=True)
        page.locator("button.auth-button[type=submit]").click()
    page.wait_for_url("**/dashboard**", timeout=40000)
    return email


def scene(page):
    return page.evaluate("document.querySelector('.es-card')?.dataset.scene || null")


def wait_scene(page, names, timeout=60000):
    page.wait_for_function("(ns) => ns.includes(document.querySelector('.es-card')?.dataset.scene)", arg=names, timeout=timeout)


def flags(page):
    return page.evaluate("""() => ({ live: document.body.dataset.liveInterview || null, exam: document.body.dataset.examRunning || null,
      session: document.body.dataset.speakingSession || null,
      launcherVisible: (() => { const e = document.querySelector('.mrez-launcher'); return !!e && getComputedStyle(e).display !== 'none'; })(),
      dockVisible: (() => { const e = document.querySelector('.ws-tabbar'); return !!e && getComputedStyle(e).display !== 'none'; })(),
      headingVisible: (() => { const e = document.querySelector('.section-heading'); return !!e && getComputedStyle(e).display !== 'none'; })(),
      status: document.querySelector('.es-status')?.innerText || null,
      label: document.querySelector('.es-chip')?.innerText || null })""")


def run_interview(page, key, lang, size, kind):
    """kind: 'drill' (Part 1 on /trainers/speaking) or 'full' (/speaking/examiner)."""
    tag = f"{kind}-{lang}-{size}"
    rec = results.setdefault(tag, {})
    if kind == "drill":
        page.goto(BASE + "/trainers/speaking", wait_until="domcontentloaded")
        settle(page, 1500)
        page.wait_for_function("() => [...document.querySelectorAll('.speaking-part-card')].some(b => !b.disabled)", timeout=40000)
        shot(page, f"live-{tag}-0-menu")
        page.locator(".speaking-part-card").first.click()
    else:
        page.goto(BASE + "/speaking/examiner", wait_until="domcontentloaded")
        settle(page, 1500)
        btn = page.locator("button", has_text="Start the interview" if lang == "en" else "Начать интервью")
        if not btn.count():
            btn = page.locator(".rounded-button.bg-brand").first
        page.wait_for_function("() => [...document.querySelectorAll('button')].some(b => b.className.includes('bg-brand') && !b.disabled)", timeout=40000)
        shot(page, f"live-{tag}-0-menu")
        btn.first.click()
    wait_scene(page, ["connecting"], 30000)
    page.wait_for_timeout(600)
    rec["connecting"] = flags(page)
    shot(page, f"live-{tag}-1-connecting")
    wait_scene(page, ["speaking"], 40000)
    page.wait_for_timeout(1200)
    rec["speaking"] = flags(page)
    shot(page, f"live-{tag}-2-she-speaks")
    if kind == "drill" and size == "1440" and lang == "en":
        # Her mouth while she really speaks (the page's own level meter).
        tile = page.locator(".es-tile-her")
        (OUT / "mouth").mkdir(exist_ok=True)
        seq = []
        for i in range(20):
            f = page.evaluate("document.querySelector('.es-card').dataset.frame")
            seq.append(f)
            tile.screenshot(path=str(OUT / "mouth" / f"live-{i:02d}.png"))
            page.wait_for_timeout(50)
        rec["mouth-sequence"] = seq
        # Mr EZ during the interview: the desktop launcher stays, but he is invigilating.
        page.locator(".mrez-launcher").click()
        page.wait_for_timeout(500)
        rec["mrez-panel-during"] = page.evaluate("document.querySelector('.mrez-head-text span')?.innerText || null")
        shot(page, f"live-{tag}-2b-mrez-steps-back")
        page.locator(".mrez-launcher").click()
    wait_scene(page, ["your-turn", "pause"], 40000)
    page.wait_for_timeout(1500)
    rec["your-turn"] = flags(page)
    shot(page, f"live-{tag}-3-your-turn")
    try:
        # Chromium's fake microphone beeps without a break, so the student is
        # never quiet here; the pause is photographed in the preview instead.
        wait_scene(page, ["pause"], 6000)
        page.wait_for_timeout(150)
        rec["pause"] = flags(page)
        shot(page, f"live-{tag}-4-pause")
    except Exception as e:  # noqa: BLE001
        errors.append(f"{tag}: no pause seen ({e})")
    # The closing line, then the end.
    page.wait_for_function("() => /end of the test|тест окончен/i.test(document.querySelector('.es-status')?.innerText || '')", timeout=90000)
    page.wait_for_timeout(300)
    rec["closing"] = flags(page)
    shot(page, f"live-{tag}-5-closing")
    try:
        wait_scene(page, ["closed"], 15000)
        page.wait_for_timeout(700)
        rec["closed"] = flags(page)
        shot(page, f"live-{tag}-6-closed")
    except Exception as e:  # noqa: BLE001
        errors.append(f"{tag}: closed scene not photographed ({e})")
    # The grading wait (the existing screen).
    try:
        page.wait_for_selector(".lx-eq", timeout=30000)
        page.wait_for_timeout(500)
        rec["grading"] = flags(page)
        shot(page, f"live-{tag}-7-grading")
    except Exception as e:  # noqa: BLE001
        errors.append(f"{tag}: no grading screen ({e})")
    page.wait_for_selector(".band-score-pop", timeout=120000)
    page.wait_for_timeout(1500)
    page.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })")
    page.wait_for_timeout(700)
    rec["report"] = flags(page)
    rec["report-mrez"] = page.evaluate("""() => ({ explainButton: !!document.querySelector('.es-result-mrez .mrez-explain-button'),
      note: document.querySelector('.es-result-mrez .es-result-note')?.innerText || null,
      avatar: !!document.querySelector('.es-result-mrez .mrez-avatar') })""")
    shot(page, f"live-{tag}-8-result")
    if kind == "drill":
        btn = page.locator(".es-result-mrez .mrez-explain-button")
        if btn.count():
            btn.click()
            try:
                page.wait_for_selector(".es-result-mrez .mrez-explain-answer, .es-result-mrez .mrez-error", timeout=40000)
            except Exception as e:  # noqa: BLE001
                errors.append(f"{tag}: explain gave nothing ({e})")
            page.wait_for_timeout(800)
            rec["explain"] = page.evaluate("""() => ({ answer: document.querySelector('.es-result-mrez .mrez-explain-answer')?.innerText?.slice(0, 300) || null,
              error: document.querySelector('.es-result-mrez .mrez-error')?.innerText || null })""")
            page.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })")
            page.wait_for_timeout(700)
            shot(page, f"live-{tag}-9-mr-ez-explains")
    fx = page.evaluate("window.__msTaylorFixture")
    rec["fixture"] = fx


with sync_playwright() as pw:
    browser = pw.chromium.launch(args=["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream",
                                       "--autoplay-policy=no-user-gesture-required"])
    plan = [("en", "1440"), ("en", "390"), ("ru", "1440"), ("ru", "390")]
    for lang, size in plan:
        if ONLY != "all" and ONLY != f"{lang}-{size}":
            continue
        c = ctx(browser, lang, size)
        page = c.new_page()
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        try:
            sign_up(page, f"{lang}{size}")
            run_interview(page, "drill", lang, size, "drill")
            if (lang, size) in (("en", "1440"), ("ru", "390"), ("en", "390")):
                run_interview(page, "full", lang, size, "full")
        except Exception as e:  # noqa: BLE001
            errors.append(f"{lang}-{size}: FAILED {e}")
            shot(page, f"live-failed-{lang}-{size}", full=True)
        c.close()
    browser.close()

results["errors"] = errors
(OUT / f"live-results{'' if ONLY == 'all' else '-' + ONLY}.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps(results, indent=1, ensure_ascii=False)[:6000])
