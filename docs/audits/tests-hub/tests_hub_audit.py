"""The simplified Tests page (/tests), 8 October 2026: browser proof.

Servers (all local, free, synthetic @example.test accounts only):
  open build   http://localhost:4660  (stand-in on 127.0.0.1:4665)
  gated build  http://localhost:4661  (PUBLIC_ACCESS_MODE=trial, stand-in --trial on 127.0.0.1:4664)
  dev server   http://localhost:4662  (same env as the open build; used ONLY to load the real
                                       src/lib/progress.ts module into the 4660 page, so the
                                       synthetic attempts are written by the real progress store)

Before-heights come from live_baseline.json (read-only visit to the live page).
Writes results.json and shots/ next to this file.
"""
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
OUT = Path(__file__).parent
SHOTS = OUT / "shots"
SHOTS.mkdir(exist_ok=True)
OPEN = "http://localhost:4660/ielts-website"
GATED = "http://localhost:4661/ielts-website"
DEV_PROGRESS = "http://localhost:4662/ielts-website/src/lib/progress.ts"
PASSWORD = "Synthetic-Verify-1"
HYDRATED = """() => [...document.querySelectorAll('astro-island[ssr]')].every(el => ['visible', 'media'].includes(el.getAttribute('client')))"""
LIVE = json.loads((OUT / "live_baseline.json").read_text(encoding="utf-8"))

results = {"checks": [], "heights": {}, "page_errors": {}}


def check(name, ok, detail=""):
    results["checks"].append({"name": name, "ok": bool(ok), "detail": str(detail)[:400]})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{str(detail)[:200]}]" if detail else ""), flush=True)


def new_context(browser, lang="ru", w=1440, h=900):
    phone = w < 720
    ctx = browser.new_context(viewport={"width": w, "height": h}, locale="ru-RU" if lang == "ru" else "en-GB",
                              is_mobile=phone, has_touch=phone)
    ctx.add_init_script(f"try{{ localStorage.setItem('ielts.locale.v1','{lang}') }}catch(e){{}}")
    return ctx


def settle(page):
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_function(HYDRATED, timeout=45000)
    page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 400))))")


def watch_errors(page, label):
    errs = results["page_errors"].setdefault(label, [])
    page.on("pageerror", lambda e: errs.append(str(e)[:300]))
    return errs


def fill_profile(page):
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


def sign_up(page, base, email):
    page.goto(base + "/sign-up?next=%2Ftests", wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=40000)
    settle(page)
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    page.locator("#signup-consent").check(force=True)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_function("() => !location.pathname.endsWith('/sign-up')", timeout=20000)
    if "/profile" in page.url:
        fill_profile(page)
        page.wait_for_function("() => !location.pathname.endsWith('/profile')", timeout=20000)


def no_sideways(page):
    return page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")


def tile_targets(page):
    return page.evaluate("""() => [...document.querySelectorAll('.tests-tile')].map(t => ({
        tile: t.dataset.tile, tag: t.tagName, href: t.getAttribute('href'),
        rotation: t.dataset.rotationKey || null, paid: t.dataset.paidFeature || null }))""")


with sync_playwright() as p:
    browser = p.chromium.launch()

    # 1. New student, Russian, three widths.
    for w, h in [(1440, 900), (390, 844), (320, 700)]:
        ctx = new_context(browser, "ru", w, h)
        page = ctx.new_page()
        errs = watch_errors(page, f"new-{w}")
        page.goto(OPEN + "/tests", wait_until="domcontentloaded")
        settle(page)
        page.wait_for_selector("[data-tests-checkpoints]", timeout=15000)
        height = page.evaluate("document.documentElement.scrollHeight")
        results["heights"][f"after_{w}"] = height
        results["heights"][f"before_{w}"] = LIVE.get(f"height_{w}")
        page.screenshot(path=str(SHOTS / f"new-student-ru-{w}.png"), full_page=True)
        check(f"{w}: no sideways scroll", no_sideways(page))
        check(f"{w}: page is shorter than the live page", height < LIVE.get(f"height_{w}", 10**9), f"{LIVE.get(f'height_{w}')} -> {height}")
        check(f"{w}: Russian interface", page.locator("h1").inner_text().strip() == "Тесты", page.locator("h1").inner_text())
        check(f"{w}: five tiles", page.locator(".tests-tile").count() == 5)
        check(f"{w}: credits line present",
              page.locator("a[href='https://practicepteonline.com/listening-ielts-tests/']").count() == 1
              and "Listening" in page.locator(".tests-credits").inner_text())
        check(f"{w}: one friendly line instead of empty boxes",
              page.locator(".tests-results-empty").count() == 1 and page.locator(".tests-results [role=tab]").count() == 0,
              page.locator("#results").inner_text()[:160])
        check(f"{w}: no page errors", not errs, errs[:2])
        if w == 1440:
            vh = 900
            results["heights"]["after_1440_screens"] = round(height / vh, 2)
            results["tiles"] = tile_targets(page)
        ctx.close()

    # 2. Tile destinations match the live page's buttons and links.
    live_links = LIVE["links"]
    live_rot = {l["rotation"] for l in live_links if l["rotation"]}
    live_hrefs = {l["href"] for l in live_links if l["href"]}
    tiles = {t["tile"]: t for t in results["tiles"]}
    check("Reading tile uses the live Reading rotation", tiles["reading"]["rotation"] in live_rot, tiles["reading"])
    check("Listening tile uses the live Listening rotation", tiles["listening"]["rotation"] in live_rot, tiles["listening"])
    for key in ("writing", "speaking", "mock"):
        check(f"{key} tile goes where the live button goes", tiles[key]["href"] in live_hrefs, tiles[key]["href"])

    ctx = new_context(browser, "ru", 1440, 900)
    page = ctx.new_page()
    errs = watch_errors(page, "clicks")
    nav = {}
    for key, expect in [("reading", "/tests/reading-full-"), ("listening", "/tests/listening-full-"),
                        ("writing", "/writing/checker"), ("speaking", "/speaking/examiner"), ("mock", "/tests/mock")]:
        page.goto(OPEN + "/tests", wait_until="domcontentloaded")
        settle(page)
        page.locator(f".tests-tile[data-tile={key}]").click()
        page.wait_for_url(f"**{expect}**", timeout=20000)
        nav[key] = page.url.replace(OPEN, "")
        check(f"clicking the {key} tile opens {expect}", expect in page.url, page.url)
        if key == "reading":
            settle(page)
            page.wait_for_selector(".preflight-essential", timeout=20000)
            check("Reading start screen says the clock cannot be paused (Russian)",
                  "нельзя" in page.locator(".preflight-essential").inner_text().lower(), page.locator(".preflight-essential").inner_text())
        if key == "listening":
            settle(page)
            page.wait_for_selector(".preflight-essential", timeout=20000)
            body = page.locator("main").inner_text()
            check("Listening start screen asks for headphones before the clock starts", "наушник" in body.lower())
        if key == "speaking":
            settle(page)
            txt = page.locator("main").inner_text()
            page.wait_for_selector("[data-testid=mic-note]", timeout=20000)
            mic = page.locator("[data-testid=mic-note]").first
            check("Speaking start screen says a microphone is needed, before the interview starts",
                  mic.is_visible() and "микрофон" in mic.inner_text().lower(), mic.inner_text())
    results["tile_navigation"] = nav
    page.goto(OPEN + "/tests", wait_until="domcontentloaded")
    settle(page)
    page.locator(".tests-quiet-line a").click()
    page.wait_for_url("**/trainers", timeout=15000)
    check("the Practice line opens /trainers", page.url.endswith("/trainers"), page.url)

    # 3. Checkpoint links start a paper.
    page.goto(OPEN + "/tests", wait_until="domcontentloaded")
    settle(page)
    links = page.evaluate("() => [...document.querySelectorAll('[data-checkpoint-link]')].map(a => ({skill: a.dataset.checkpointLink, href: a.getAttribute('href'), text: a.textContent}))")
    results["checkpoint_links"] = links
    check("checkpoint line offers Reading and Listening to a new student", [l["skill"] for l in links] == ["reading", "listening"], links)
    page.locator("[data-checkpoint-link=listening]").click()
    page.wait_for_url("**/tests/listening-full-**", timeout=15000)
    settle(page)
    page.wait_for_selector(".preflight-essential", timeout=20000)
    check("the Listening checkpoint link starts a Listening paper", "/tests/listening-full-" in page.url, page.url)

    # 4. Bank tabs: mouse and keyboard, search counts, show more.
    page.goto(OPEN + "/tests", wait_until="domcontentloaded")
    settle(page)
    vis = lambda key: page.locator(f"#catalog-panel-{key}").is_visible()  # noqa: E731
    check("bank opens on Reading only", vis("reading") and not vis("listening"))
    shown = page.locator("#catalog-panel-reading [data-discovery-item]:visible").count()
    check("bank shows 6 Reading papers before Show more", shown == 6, shown)
    page.locator("[data-catalogue-more]").click()
    check("Show more adds papers", page.locator("#catalog-panel-reading [data-discovery-item]:visible").count() == 12)
    page.locator("#catalog-tab-listening").click()
    check("mouse: Listening tab shows only Listening",
          vis("listening") and not vis("reading") and page.locator("#catalog-tab-listening").get_attribute("aria-selected") == "true")
    page.locator("#catalog-tab-listening").focus()
    page.keyboard.press("ArrowLeft")
    focused = page.evaluate("document.activeElement.id")
    check("keyboard: ArrowLeft moves to Reading and focuses it",
          focused == "catalog-tab-reading" and vis("reading") and not vis("listening"), focused)
    page.keyboard.press("End")
    check("keyboard: End selects the last tab", page.evaluate("document.activeElement.id") == "catalog-tab-listening" and vis("listening"))
    page.keyboard.press("Home")
    check("keyboard: Home selects the first tab", page.evaluate("document.activeElement.id") == "catalog-tab-reading" and vis("reading"))
    page.locator("[data-catalogue-search]").fill("Test 12")
    page.wait_for_timeout(200)
    counts = page.evaluate("() => Object.fromEntries([...document.querySelectorAll('[data-catalog-tab-count]')].map(e => [e.dataset.catalogTabCount, e.textContent]))")
    check("search updates both tab counts", counts.get("reading") == "1" and counts.get("listening") == "1", counts)
    check("search shows the match in the open tab", page.locator("#catalog-panel-reading [data-discovery-item]:visible").count() == 1)
    page.screenshot(path=str(SHOTS / "bank-search-ru-1440.png"), full_page=False)
    check("no page errors on clicks and tabs", not errs, errs[:2])
    ctx.close()

    # 5. A signed-in student with synthetic attempts written by the real progress store.
    ctx = new_context(browser, "ru", 1440, 900)
    page = ctx.new_page()
    errs = watch_errors(page, "signed-in")
    email = f"tests-hub-{int(time.time())}@example.test"
    sign_up(page, OPEN, email)
    page.goto(OPEN + "/tests", wait_until="domcontentloaded")
    settle(page)
    seeded = page.evaluate("""async (url) => {
        const progress = await import(url);
        const day = (d) => new Date(Date.now() - d * 86400000).toISOString();
        progress.recordTestAttempt('reading-full-003', { at: day(6), raw: 24, total: 40, band: 6, bandLabel: '6.0', secondsUsed: 3480, kind: 'full', skill: 'reading',
          byType: { tfng: { correct: 5, total: 9 }, 'matching-headings': { correct: 3, total: 7 }, 'sentence-completion': { correct: 9, total: 11 } } });
        progress.recordTestAttempt('reading-full-007', { at: day(2), raw: 28, total: 40, band: 6.5, bandLabel: '6.5', secondsUsed: 3540, kind: 'full', skill: 'reading',
          byType: { tfng: { correct: 7, total: 9 }, 'matching-headings': { correct: 4, total: 7 }, 'sentence-completion': { correct: 10, total: 11 } } });
        progress.recordTestAttempt('listening-full-004', { at: day(1), raw: 31, total: 40, band: 7, bandLabel: '7.0', secondsUsed: 2300, kind: 'full', skill: 'listening',
          byType: { 'form-completion': { correct: 9, total: 10 }, 'multiple-choice': { correct: 6, total: 10 } } });
        return progress.getAttempts().length;
    }""", DEV_PROGRESS)
    check("three synthetic attempts recorded through the real progress store", seeded == 3, seeded)
    page.reload(wait_until="domcontentloaded")
    settle(page)
    page.wait_for_selector(".tests-results [role=tab]", timeout=15000)
    lasts = page.evaluate("() => Object.fromEntries([...document.querySelectorAll('[data-tile]')].filter(t => t.querySelector('[data-last-band]')).map(t => [t.dataset.tile, t.querySelector('[data-last-band]').hidden ? null : t.querySelector('[data-last-band]').textContent]))")
    check("tiles show the last band", lasts.get("reading", "") and "6.5" in lasts["reading"] and "7.0" in (lasts.get("listening") or ""), lasts)
    sel = page.locator(".tests-results [role=tab][aria-selected=true]").inner_text().strip()
    check("results open on the tab of the latest attempt (Listening)", sel == "Listening", sel)
    panel = page.locator(".tests-results [role=tabpanel]")
    check("Listening tab shows score history and weak spots",
          panel.locator("table tbody tr").count() == 1 and panel.locator("li").count() >= 2, panel.inner_text()[:200])
    page.locator("#tab-results-reading").click()
    page.wait_for_timeout(500)
    check("mouse: Reading tab shows two rows, the band chart and weak spots",
          panel.locator("table tbody tr").count() == 2 and panel.locator("svg[role=img]").count() == 1 and panel.locator("li").count() >= 3,
          panel.inner_text()[:200])
    page.locator("#tab-results-reading").focus()
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(400)
    check("keyboard: ArrowRight moves the results to Listening",
          page.evaluate("document.activeElement.id") == "tab-results-listening" and panel.locator("table tbody tr").count() == 1)
    page.locator("#tab-results-reading").click()
    page.wait_for_timeout(700)
    page.evaluate("() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); }")
    page.wait_for_timeout(300)
    results["heights"]["signed_in_1440"] = page.evaluate("document.documentElement.scrollHeight")
    page.screenshot(path=str(SHOTS / "signed-in-with-attempts-ru-1440.png"), full_page=True)
    page.locator("#results").screenshot(path=str(SHOTS / "signed-in-results-ru-1440.png"))
    check("signed in: no sideways scroll", no_sideways(page))
    check("signed in: no page errors", not errs, errs[:2])
    ctx.close()

    # 6. The gated build, free account.
    ctx = new_context(browser, "ru", 1440, 900)
    page = ctx.new_page()
    errs = watch_errors(page, "gated-free")
    sign_up(page, GATED, f"tests-hub-free-{int(time.time())}@example.test")
    page.goto(GATED + "/tests", wait_until="domcontentloaded")
    settle(page)
    page.wait_for_timeout(1200)
    gtiles = tile_targets(page)
    results["gated_tiles"] = gtiles
    check("gated: five tiles render", len(gtiles) == 5, gtiles)
    check("gated: Reading and Listening tiles carry the paid guard",
          all(t["paid"] == "test" for t in gtiles if t["tile"] in ("reading", "listening")))
    check("gated: checkpoint line hidden for a free account", not page.locator("[data-tests-checkpoints]").is_visible())
    check("gated: credits present", page.locator(".tests-credits").count() == 1)
    page.screenshot(path=str(SHOTS / "gated-free-account-ru-1440.png"), full_page=True)
    page.locator(".tests-tile[data-tile=reading]").click()
    try:
        page.wait_for_selector("[role=dialog][aria-labelledby=upgrade-title]", timeout=10000)
        dialog = True
    except Exception:  # noqa: BLE001
        dialog = False
    check("gated: a free account's Reading tile opens the upgrade pop-up, not a paper", dialog and "/tests/reading-full" not in page.url, page.url)
    check("gated: no page errors", not errs, errs[:2])
    ctx.close()

    browser.close()

results["passed"] = sum(1 for c in results["checks"] if c["ok"])
results["failed"] = sum(1 for c in results["checks"] if not c["ok"])
(OUT / "results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"\n{results['passed']} passed, {results['failed']} failed")
print(json.dumps(results["heights"], indent=2))
