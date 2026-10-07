"""Builder V1, 8 October 2026: the Vocabulary home (/review), its topic pages
and the topic lesson pictures, driven in a real browser.

Open site:  http://localhost:4640/ielts-website  (astro dev, stand-in Supabase on 4645)
Gated site: http://localhost:4641/ielts-website  (PUBLIC_ACCESS_MODE=trial build,
            trial stand-in on 4644, synthetic @example.test account)

Run:  python docs/audits/vocab-redesign/v1/v1_vocab_check.py
Writes results.json and shots/ next to this file."""
import json, os, re, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = Path(__file__).resolve().parent
SHOTS = HERE / "shots"
SHOTS.mkdir(exist_ok=True)
OPEN = os.environ.get("OPEN_BASE", "http://localhost:4640/ielts-website")
GATED = os.environ.get("GATED_BASE", "http://localhost:4641/ielts-website")
STAMP = str(int(time.time()))
PASSWORD = "Synthetic-Verify-1"
HYDRATED = """() => [...document.querySelectorAll('astro-island[ssr]')].every(el => ['visible', 'media'].includes(el.getAttribute('client')))"""

results = []
errors = {}


def check(section, name, ok, detail=""):
    results.append({"section": section, "check": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + f"[{section}] {name}" + (f"  ({detail})" if detail else ""))


def context(browser, lang="en", w=1440, h=900, reduced=False):
    phone = w < 720
    ctx = browser.new_context(viewport={"width": w, "height": h}, locale="ru-RU" if lang == "ru" else "en-GB",
                              device_scale_factor=2 if phone else 1, is_mobile=phone, has_touch=phone,
                              reduced_motion="reduce" if reduced else "no-preference")
    ctx.add_init_script(f"try{{ if (!sessionStorage.getItem('v1-lang-set')) {{ localStorage.setItem('ielts.locale.v1','{lang}'); sessionStorage.setItem('v1-lang-set','1') }} }}catch(e){{}}")
    return ctx


def page_of(ctx, tag):
    pg = ctx.new_page()
    errors.setdefault(tag, [])
    pg.on("pageerror", lambda e: errors[tag].append(str(e)))
    return pg


def settle(pg):
    pg.wait_for_load_state("domcontentloaded")
    pg.wait_for_function(HYDRATED, timeout=60000)
    pg.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 300))))")


def visit(pg, url, wait_for=None):
    pg.goto(url, wait_until="domcontentloaded")
    settle(pg)
    if wait_for:
        pg.wait_for_selector(wait_for, timeout=60000)


def overflow(pg):
    return pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")


def shot(pg, name, full=False):
    pg.screenshot(path=str(SHOTS / name), full_page=full)


def pressed(loc):
    return loc.get_attribute("aria-pressed")


with sync_playwright() as p:
    browser = p.chromium.launch()

    # ── A. Open site, English, desktop ──────────────────────────────
    ctx = context(browser, "en", 1440, 900)
    pg = page_of(ctx, "open-en-1440")
    visit(pg, OPEN + "/review", ".vh-home")
    check("home", "heading is Vocabulary", pg.locator(".vh-home h1").inner_text().strip() == "Vocabulary")
    check("home", "Today strip shows the new-student invitation", pg.locator(".vh-today-intro").count() == 1,
          pg.locator(".vh-today").inner_text().replace("\n", " | "))
    start = pg.locator(".vh-today-start")
    check("home", "Start today's 5 minutes goes to Spell it, mixed set",
          start.get_attribute("href") == "/ielts-website/review/games?game=spell", start.get_attribute("href"))
    check("home", "36 topics listed, 12 shown first", pg.locator(".discovery-count").inner_text().strip().startswith("12 / 36"),
          pg.locator(".discovery-count").inner_text())
    cards = pg.locator(".vh-topic")
    check("home", "topic cards have a picture frame, a title and a ring",
          cards.count() == 12 and pg.locator(".vh-topic .vh-pic").count() == 12 and pg.locator(".vh-topic .vh-ring").count() == 12)
    # The server-rendered page, before the browser drops any picture whose
    # file is not there yet (only environment.webp exists while V1 builds).
    html = pg.request.get(OPEN + "/review").text()
    tags = re.findall(r'<button[^>]*class="vh-topic"[^>]*>.*?</button>', html, re.S)
    imgs = [dict(re.findall(r'(width|height|decoding|loading)="([^"]*)"', re.search(r"<img[^>]*>", t).group(0))) for t in tags if "<img" in t]
    check("home", "every picture has width, height and async decoding", len(imgs) == 12 and all(i.get("width") == "960" and i.get("height") == "720" and i.get("decoding") == "async" for i in imgs), f"{len(imgs)} pictures in the server HTML")
    check("home", "first row loads eagerly, the rest lazily", [i.get("loading") for i in imgs[:3]] == ["eager"] * 3 and all(i.get("loading") == "lazy" for i in imgs[3:]))
    frames = pg.evaluate("""() => [...document.querySelectorAll('.vh-topic .vh-pic')].map(f => Math.round(f.getBoundingClientRect().height))""")
    check("home", "a missing picture leaves its tinted frame at full size", len(set(frames)) == 1 and frames[0] > 100, f"frame heights {sorted(set(frames))}")
    check("home", "no sideways scroll at 1440", overflow(pg) <= 0, f"{overflow(pg)}px")
    shot(pg, "01-home-en-1440.png", full=True)
    shot(pg, "01b-home-en-1440-fold.png")

    # Word of the day
    wotd = pg.locator(".vh-wotd .vh-flip")
    word = pg.locator(".vh-wotd .vh-flip-front .vh-flip-word").inner_text().strip()
    check("word of the day", "shows one word, English", bool(re.fullmatch(r"[A-Za-z][A-Za-z ()'/-]*", word)), word)
    check("word of the day", "starts face up", pressed(wotd) == "false")
    wotd.click()
    pg.wait_for_timeout(900)
    check("word of the day", "a tap turns it over", pressed(wotd) == "true")
    meaning = pg.locator(".vh-wotd .vh-flip-meaning").inner_text().strip()
    check("word of the day", "the back shows meaning and example", len(meaning) > 5 and pg.locator(".vh-wotd .vh-flip-example").count() == 1, meaning)
    rot = pg.evaluate("getComputedStyle(document.querySelector('.vh-wotd .vh-flip-inner')).transform")
    check("word of the day", "it turns with a 3D rotation", rot not in ("none", ""), rot)
    check("word of the day", "only the visible side is read out",
          pg.locator(".vh-wotd .vh-flip-front").get_attribute("aria-hidden") == "true" and pg.locator(".vh-wotd .vh-flip-back").get_attribute("aria-hidden") == "false")
    shot(pg, "02-word-of-the-day-flipped-en-1440.png")
    pg.reload(); settle(pg)
    check("word of the day", "the same word after a reload (one per day)", pg.locator(".vh-wotd .vh-flip-front .vh-flip-word").inner_text().strip() == word)

    # Search still filters
    pg.locator(".discovery-search input").fill("crime")
    pg.wait_for_timeout(300)
    check("home", "search still filters topics", pg.locator(".vh-topic").count() >= 1 and pg.locator(".vh-topic").count() < 12, f"{pg.locator('.vh-topic').count()} cards for 'crime'")
    pg.locator(".discovery-search input").fill("")
    pg.wait_for_timeout(200)
    pg.locator(".discovery-more").click()
    check("home", "Show more reveals the next twelve", pg.locator(".vh-topic").count() == 24)

    # Open a topic
    pg.locator('.vh-topic[data-topic="environment"]').click()
    pg.wait_for_selector(".vh-topic-page")
    check("topic", "the URL names the topic", pg.url.endswith("/review?topic=environment"), pg.url)
    check("topic", "the page opens at the top", pg.evaluate("window.scrollY") == 0)
    check("topic", "picture header present", pg.locator(".vh-topic-header .vh-banner img").count() == 1)
    banner_h = pg.evaluate("document.querySelector('.vh-banner').getBoundingClientRect().height")
    check("topic", "picture header is modest (160 to 260px)", 160 <= banner_h <= 260, f"{banner_h:.0f}px")
    check("topic", "ring summary reads 0 of 20 learnt", "0 of 20 learnt" in pg.locator(".vh-topic-summary").inner_text())
    games = pg.evaluate("""() => [...document.querySelectorAll('.vh-game')].map(a => ({g: a.dataset.game, href: a.getAttribute('href'), paid: a.hasAttribute('data-paid-feature')}))""")
    expected = [{"g": g, "href": f"/ielts-website/review/games?game={g}&topic=environment", "paid": False} for g in ("match", "sprint", "spell")]
    check("topic", "three game links point at the games with this topic, none marked paid", games == expected, json.dumps(games))
    check("topic", "the practice round button is still there", pg.locator(".vocab-practise-link").count() == 1)
    flips = pg.locator(".vh-flip-grid .vh-flip")
    check("topic", "the ten main words are flip cards", flips.count() == 10, f"{flips.count()}")
    first = flips.nth(0)
    first.click()
    pg.wait_for_timeout(800)
    check("flip", "a click turns a card over", pressed(first) == "true")
    check("flip", "the back shows the meaning", len(first.locator(".vh-flip-meaning").inner_text()) > 5)
    second = flips.nth(1)
    second.focus()
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(700)
    check("flip", "Enter turns a focused card over", pressed(second) == "true")
    pg.keyboard.press("Space")
    pg.wait_for_timeout(700)
    check("flip", "Space turns it back", pressed(second) == "false")
    # Keyboard focus is visible: tab to the next card.
    pg.keyboard.press("Tab")
    outline = pg.evaluate("(() => { const el = document.activeElement; const cs = getComputedStyle(el); return {cls: el.className, focusVisible: el.matches(':focus-visible'), outline: cs.outlineStyle + ' ' + cs.outlineWidth} })()")
    check("flip", "Tab moves to the next card with a visible focus ring", "vh-flip" in outline["cls"] and outline["focusVisible"] and outline["outline"].startswith("solid"), json.dumps(outline))
    shot(pg, "03-topic-en-1440.png")
    pg.locator(".vh-flip-grid").scroll_into_view_if_needed()
    shot(pg, "04-topic-cards-flipped-en-1440.png")
    pg.locator(".vh-view-toggle").click()
    pg.wait_for_timeout(300)
    check("list view", "Show all as a list shows today's list", pg.locator(".vh-words .vocab-word-list li").count() == 10 and pg.locator(".vh-flip-grid").count() == 0)
    check("list view", "the toggle now offers cards", "Show as cards" in pg.locator(".vh-view-toggle").inner_text())
    shot(pg, "05-topic-list-view-en-1440.png")
    pg.locator(".vh-view-toggle").click()
    check("list view", "and back to cards", pg.locator(".vh-flip-grid .vh-flip").count() == 10)
    check("topic", "the lesson's other groups stay", all(h in pg.locator(".vh-topic-page").inner_text() for h in ("Go Further", "Key Collocations", "Useful Essay Phrases")))
    check("topic", "no sideways scroll at 1440", overflow(pg) <= 0, f"{overflow(pg)}px")
    pg.locator(".vh-back").click()
    pg.wait_for_selector(".vh-home")
    check("topic", "All topics returns to the home and clears the URL", pg.url.endswith("/review"), pg.url)

    # Conjunctions has no main table: its function groups become cards.
    visit(pg, OPEN + "/review?topic=conjunctions", ".vh-topic-page")
    check("topic", "Conjunctions shows its 18 words as cards", pg.locator(".vh-flip-grid .vh-flip").count() == 18, f"{pg.locator('.vh-flip-grid .vh-flip').count()}")
    ctx.close()

    # ── B. Phone widths ─────────────────────────────────────────────
    for w in (390, 320):
        ctx = context(browser, "en", w, 844)
        pg = page_of(ctx, f"open-en-{w}")
        visit(pg, OPEN + "/review", ".vh-home")
        check(f"phone {w}", "home: no sideways scroll", overflow(pg) <= 0, f"{overflow(pg)}px")
        stacked = pg.evaluate("getComputedStyle(document.querySelector('.vh-today')).flexDirection")
        check(f"phone {w}", "Today strip stacks", stacked == "column", stacked)
        if w == 390:
            shot(pg, "06-home-en-390.png", full=True)
            shot(pg, "06b-home-en-390-fold.png")
        visit(pg, OPEN + "/review?topic=environment", ".vh-topic-page")
        check(f"phone {w}", "topic: no sideways scroll", overflow(pg) <= 0, f"{overflow(pg)}px")
        bh = pg.evaluate("document.querySelector('.vh-banner').getBoundingClientRect().height")
        check(f"phone {w}", "topic picture is 160px tall", abs(bh - 160) < 1, f"{bh:.0f}px")
        f = pg.locator(".vh-flip-grid .vh-flip").nth(0)
        f.tap()
        pg.wait_for_timeout(800)
        check(f"phone {w}", "a tap turns a card", pressed(f) == "true")
        if w == 390:
            shot(pg, "07-topic-en-390.png")
            pg.locator(".vh-flip-grid").scroll_into_view_if_needed()
            shot(pg, "08-topic-cards-en-390.png")
        ctx.close()

    # ── C. Russian ──────────────────────────────────────────────────
    ctx = context(browser, "en", 1440, 900)
    pg = page_of(ctx, "open-ru-1440")
    visit(pg, OPEN + "/review", ".vh-home")
    word_en = pg.locator(".vh-wotd .vh-flip-front .vh-flip-word").inner_text().strip()
    pg.locator(".ws-lang-option", has_text="RU").first.click()
    pg.wait_for_function("document.querySelector('.vh-home h1').textContent.trim() === 'Словарь'", timeout=20000)
    check("russian", "the switch turns the page Russian", True, pg.locator(".vh-home h1").inner_text())
    check("russian", "Today strip in Russian", "Начать 5 минут на сегодня" in pg.locator(".vh-today-start").inner_text(), pg.locator(".vh-today").inner_text().replace("\n", " | "))
    check("russian", "word of the day heading in Russian", pg.locator("#vh-wotd-title").inner_text().strip() == "Слово дня")
    check("russian", "the word itself stays English", pg.locator(".vh-wotd .vh-flip-front .vh-flip-word").inner_text().strip() == word_en, word_en)
    check("russian", "topic names translated", "Окружающая среда" in pg.locator(".vh-topic-grid").inner_text())
    check("russian", "word counts in Russian", "20 слов" in pg.locator(".vh-topic-grid").inner_text())
    shot(pg, "09-home-ru-1440.png")
    pg.locator('.vh-topic[data-topic="environment"]').click()
    pg.wait_for_selector(".vh-topic-page")
    txt = pg.locator(".vh-topic-page").inner_text()
    check("russian", "game names and toggle in Russian", all(s in txt for s in ("Найди пару", "Спринт за 60 секунд", "Напиши слово", "Показать всё списком")))
    words = [pg.locator(".vh-flip-grid .vh-flip-word").nth(i).inner_text().strip() for i in range(3)]
    check("russian", "the vocabulary words stay English", words[:3] == ["carbon footprint", "biodiversity", "deforestation"], ", ".join(words))
    f = pg.locator(".vh-flip-grid .vh-flip").nth(0)
    f.click(); pg.wait_for_timeout(800)
    check("russian", "meanings and examples stay English", "greenhouse gas emissions" in f.locator(".vh-flip-meaning").inner_text())
    check("russian", "no em or en dash on the page", not re.search("[–—]", pg.locator("main").inner_text()))
    shot(pg, "10-topic-ru-1440.png")
    ctx.close()

    # ── D. Reduced motion ───────────────────────────────────────────
    ctx = context(browser, "en", 1440, 900, reduced=True)
    pg = page_of(ctx, "open-reduced")
    visit(pg, OPEN + "/review?topic=environment", ".vh-topic-page")
    f = pg.locator(".vh-flip-grid .vh-flip").nth(0)
    f.click(); pg.wait_for_timeout(600)
    st = pg.evaluate("""() => { const c = document.querySelector('.vh-flip-grid .vh-flip'); const cs = s => getComputedStyle(c.querySelector(s)); return {inner: cs('.vh-flip-inner').transform, back: cs('.vh-flip-back').opacity, front: cs('.vh-flip-front').opacity, tr: cs('.vh-flip-back').transitionProperty + ' ' + cs('.vh-flip-back').transitionDuration} }""")
    check("reduced motion", "no rotation, the faces crossfade", st["inner"] == "none" and st["back"] == "1" and st["front"] == "0" and "opacity" in st["tr"], json.dumps(st))
    ctx.close()

    # ── E. A returning student: rings, streak and due words ─────────
    ctx = context(browser, "en", 1440, 900)
    pg = page_of(ctx, "open-returning")
    visit(pg, OPEN + "/dashboard")
    seeded = pg.evaluate("""() => {
      const planKey = Object.keys(localStorage).find(k => k.startsWith('ielts.studyplan.v1'));
      if (!planKey) return null;
      const suffix = planKey.slice('ielts.studyplan.v1'.length);
      const pad = n => String(n).padStart(2, '0');
      const local = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const now = new Date(); const y = new Date(now.getTime() - 86400000); const y2 = new Date(now.getTime() - 2 * 86400000);
      const utc = now.toISOString().slice(0, 10);
      const card = (extra) => Object.assign({ ease: 2.5, interval: 1, due: utc, reps: 2, lapses: 0, introducedDate: local(y2) }, extra);
      localStorage.setItem('ielts.vocab.v1' + suffix, JSON.stringify({ version: 1, settings: { newPerDay: 10 }, cards: {
        'carbon footprint': card({ recallSuccessDates: [local(y2), local(y)] }),
        'biodiversity': card({}),
      }}));
      const pk = 'ielts.progress.v1' + suffix;
      const prog = JSON.parse(localStorage.getItem(pk) || '{"version":1,"lessons":{},"attempts":{}}');
      prog.activity = Object.assign({}, prog.activity, { [local(now)]: { minutes: 5, lessons: 0, attempts: 1 }, [local(y)]: { minutes: 30, lessons: 1, attempts: 0 } });
      localStorage.setItem(pk, JSON.stringify(prog));
      return suffix;
    }""")
    check("returning", "stores seeded under this browser's owner key", bool(seeded), str(seeded))
    visit(pg, OPEN + "/dashboard")
    pg.wait_for_timeout(800)
    dash_streak = pg.locator(".dash-streak").inner_text().strip() if pg.locator(".dash-streak").count() else ""
    visit(pg, OPEN + "/review", ".vh-today-stats")
    strip = pg.locator(".vh-today").inner_text().replace("\n", " | ")
    check("returning", "Today strip shows the streak and the words due", "2 day streak" in strip and "2 words to review today" in strip, strip)
    check("returning", "the streak agrees with the dashboard", dash_streak.startswith("2"), f"dashboard: {dash_streak!r}")
    env = pg.locator('.vh-topic[data-topic="environment"]')
    check("returning", "Environment card: 1 of 20 learnt", "1 of 20 learnt" in env.inner_text(), env.inner_text().replace("\n", " | "))
    dash = pg.evaluate("document.querySelector('.vh-topic[data-topic=environment] .vh-ring-value').getAttribute('stroke-dashoffset')")
    check("returning", "its ring is drawn one twentieth full", abs(float(dash) - 2 * 3.14159265 * 12 * 19 / 20) < 0.05, dash)
    shot(pg, "11-home-returning-en-1440.png")
    env.click(); pg.wait_for_selector(".vh-topic-page")
    check("returning", "the learnt word carries a Learnt mark", pg.locator(".vh-flip-grid li").nth(0).locator(".vh-learnt").count() == 1 and pg.locator(".vh-learnt").count() == 1)
    shot(pg, "12-topic-returning-en-1440.png")
    ctx.close()

    # ── F. Topic lesson pages ───────────────────────────────────────
    for w in (1440, 390):
        ctx = context(browser, "en", w, 900)
        pg = page_of(ctx, f"lesson-{w}")
        visit(pg, OPEN + "/lessons/vocabulary/environment", ".vh-lesson-art")
        h = pg.evaluate("document.querySelector('.vh-lesson-art .vh-pic').getBoundingClientRect().height")
        cap = 260 if w > 720 else 160
        check(f"lesson {w}", f"picture at the top, no taller than {cap}px", 0 < h <= cap, f"{h:.0f}px")
        href = pg.locator(".vh-lesson-play").get_attribute("href")
        check(f"lesson {w}", "Play games with these words links to this topic's games", href == "/ielts-website/review/games?game=match&topic=environment", href)
        body_top = pg.evaluate("document.querySelector('[data-lesson-body]').getBoundingClientRect().top")
        check(f"lesson {w}", "the lesson starts within the first screen and a half", body_top < 900 * 1.5, f"body at {body_top:.0f}px")
        check(f"lesson {w}", "no sideways scroll", overflow(pg) <= 0, f"{overflow(pg)}px")
        shot(pg, f"13-lesson-environment-en-{w}.png")
        ctx.close()

    # ── G. Gated build (trial mode), free account ───────────────────
    gated = {"skipped": False}
    try:
        ctx = context(browser, "en", 1440, 900)
        pg = page_of(ctx, "gated-free")
        email = f"v1-vocab-{STAMP}@example.test"
        pg.goto(GATED + "/sign-up?next=%2Freview", wait_until="domcontentloaded")
        pg.wait_for_selector("#signup-email", timeout=60000)
        settle(pg)
        pg.locator("#signup-email").fill(email)
        pg.locator("#signup-password").fill(PASSWORD)
        if pg.locator("#signup-confirm").count():
            pg.locator("#signup-confirm").fill(PASSWORD)
        if pg.locator("#signup-consent").count():
            pg.locator("#signup-consent").check(force=True)
        pg.locator("button.auth-button[type=submit]").click()
        pg.wait_for_selector("#profile-firstName", timeout=60000)
        pg.locator("#profile-firstName").fill("Synthetic")
        pg.locator("#profile-lastName").fill("Student")
        pg.locator("#profile-dob-day").select_option("4")
        pg.locator("#profile-dob-month").select_option("3")
        pg.locator("#profile-dob-year").select_option("2000")
        pg.locator("#profile-phone").fill("+7 701 234 56 78")
        pg.locator("#profile-city").fill("Almaty")
        pg.locator("#profile-occupation").fill("Synthetic University")
        pg.locator("#profile-source-friend").check(force=True)
        pg.locator("button.auth-button[type=submit]").click()
        pg.wait_for_timeout(2500)
        visit(pg, GATED + "/review")
        pg.wait_for_selector(".vh-home", timeout=60000)
        check("gated", "free account: the Vocabulary home renders", True, email)
        check("gated", "36 topics", "/ 36" in pg.locator(".discovery-count").inner_text(), pg.locator(".discovery-count").inner_text())
        check("gated", "word of the day present", pg.locator(".vh-wotd .vh-flip-word").count() == 1)
        check("gated", "Today strip button has no paid marker", pg.locator(".vh-today-start").get_attribute("data-paid-feature") is None)
        shot(pg, "14-gated-free-home-en-1440.png")
        pg.locator('.vh-topic[data-topic="environment"]').click()
        pg.wait_for_selector(".vh-topic-page")
        check("gated", "topic opens with its cards", pg.locator(".vh-flip-grid .vh-flip").count() == 10)
        check("gated", "game links carry no paid marker", pg.locator(".vh-game[data-paid-feature]").count() == 0 and pg.locator(".vh-game").count() == 3)
        check("gated", "the practice round keeps its paid marker", pg.locator(".vocab-practise-link").get_attribute("data-paid-feature") == "vocab-review")
        check("gated", "no sideways scroll", overflow(pg) <= 0)
        shot(pg, "15-gated-free-topic-en-1440.png")
        ctx.close()
    except Exception as e:  # noqa: BLE001
        gated = {"skipped": True, "reason": str(e)[:400]}
        check("gated", "gated run completed", False, str(e)[:300])

    browser.close()

for tag, errs in errors.items():
    check("errors", f"no page errors ({tag})", not errs, "; ".join(errs)[:300])

passed = sum(r["ok"] for r in results)
summary = {"run": time.strftime("%Y-%m-%d %H:%M:%S"), "open": OPEN, "gated": GATED, "passed": passed, "failed": len(results) - passed, "results": results}
(HERE / "results.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"\n{passed}/{len(results)} passed")
sys.exit(0 if passed == len(results) else 1)
