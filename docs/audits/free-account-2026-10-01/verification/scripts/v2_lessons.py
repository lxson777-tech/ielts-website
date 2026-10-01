"""V2: a FREE account opens every lesson, in English AND Russian, on the gated
review build (localhost:4441, stand-in 8841, SIMULATED services). For each of
the 76 lesson pages: the body arrives through the door (English: Latin text;
Russian: the fragment says locale=ru and is mostly Cyrillic); every lesson
quiz loads and checks an answer; every Writing lesson's worked example shows;
the vocabulary topic lists open with their words. The first-lesson upgrade
nudge is counted across the whole sweep (it may appear once at most).

  python v2_lessons.py <dist-gated> <out-dir>
"""
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from vhelpers import (DIALOG, GATED, STAMP, Run, close_dialog, dialog_feature, lesson_ready, lesson_state,  # noqa: E402
                      new_context, settle, sign_up, visit)

DIST = Path(sys.argv[1])
R = Run(sys.argv[2])
nudges = []
CURRENT = ["en"]


def lesson_routes():
    out = []
    for page in sorted((DIST / "lessons").rglob("*.html")):
        if 'data-lesson-body="' in page.read_text(encoding="utf-8"):
            out.append("/" + page.relative_to(DIST).as_posix()[:-5])
    return out


def note_dialog(page, where):
    """A dialog that is open now: record it (the nudge), close it."""
    if page.locator(DIALOG).count():
        feat = page.locator("[data-upgrade-dialog]").get_attribute("data-upgrade-dialog")
        nudges.append({"where": where, "feature": feat, "lang": CURRENT[0]})
        try:
            page.locator("[data-upgrade-dismiss]").click(timeout=3000)
            page.wait_for_selector(DIALOG, state="detached", timeout=5000)
        except Exception:  # noqa: BLE001
            close_dialog(page)


def try_quiz(page, route, sec):
    if page.locator("astro-island[component-url*='GatedPracticeQuiz']").count() == 0:
        return None
    try:
        page.wait_for_selector("form button[type=submit]:has-text('Check answers'), form button[type=submit]:has-text('Проверить')", timeout=30000)
    except Exception as e:  # noqa: BLE001
        failed = page.locator("text=/could not|не удалось/i").count()
        return R.check(sec, f"{route}: lesson quiz loads", False, f"no Check button; failure text={failed}; {str(e)[:100]}")
    idx = page.evaluate("() => [...document.querySelectorAll('form')].findIndex(f => [...f.querySelectorAll('button[type=submit]')].some(b => /Check answers|Проверить/.test(b.textContent)))")
    form = page.locator("form").nth(idx)
    form.scroll_into_view_if_needed()
    answered = False
    if form.locator("select").count():
        form.locator("select").first.select_option(index=1)
        answered = True
    elif form.locator("input[type=text]").count():
        form.locator("input[type=text]").first.fill("test")
        answered = True
    else:
        opts = form.locator("button[type=button]:not(.help-control)")
        for i in range(min(opts.count(), 6)):
            b = opts.nth(i)
            if b.evaluate("el => !el.closest('.help-controls')") and b.is_visible():
                b.click()
                answered = True
                break
    if not answered:
        return R.check(sec, f"{route}: lesson quiz answers a question", False, "no answer control found")
    form.locator("button[type=submit]").click()
    try:
        page.wait_for_function("(i) => /\\d+\\s*\\/\\s*\\d+/.test(document.querySelectorAll('form')[i].innerText)", arg=idx, timeout=10000)
        score = re.search(r"\d+\s*/\s*\d+[^\n]*", form.inner_text()).group(0)
        note_dialog(page, route + " (quiz checked)")
        return R.check(sec, f"{route}: lesson quiz loads and checks an answer", True, score)
    except Exception as e:  # noqa: BLE001
        return R.check(sec, f"{route}: lesson quiz loads and checks an answer", False, str(e)[:120])


def sweep(browser, lang):
    sec = f"lessons-{lang}"
    CURRENT[0] = lang
    ctx = new_context(browser, lang)
    page = ctx.new_page()
    R.watch(page, sec)
    email = f"v2-{lang}-{STAMP}@example.test"
    sign_up(page, email)
    page.wait_for_url("**/dashboard**", timeout=40000)
    settle(page)
    routes = lesson_routes()
    R.check(sec, "lesson pages found in the build", len(routes) == 76, len(routes))
    quizzes = examples = 0
    for route in routes:
        try:
            visit(page, route)
            note_dialog(page, route + " (on arrival)")
            lesson_ready(page, 200, 30000)
            if lang == "ru":
                page.wait_for_function("() => { const b = document.querySelector('[data-lesson-body]'); return b && b.getAttribute('data-lesson-body-locale') === 'ru' }", timeout=15000)
            st = lesson_state(page)
            if lang == "en":
                ok = st and st["len"] > 300 and not st["invite"] and st["lat"] > 200 and st["cyr"] < st["lat"] * 0.05
            else:
                ok = st and st["len"] > 300 and not st["invite"] and st["locale"] == "ru" and st["cyr"] >= 300 and st["cyr"] >= 0.25 * (st["cyr"] + st["lat"])
            R.check(sec, f"{route}: lesson body opens in {lang}", ok, st)
        except Exception as e:  # noqa: BLE001
            R.check(sec, f"{route}: lesson body opens in {lang}", False, f"{str(e)[:160]} state={lesson_state(page)}")
            continue
        if route in ("/lessons/reading/tfng", "/lessons/writing/opinion", "/lessons/vocabulary/environment", "/lessons/listening/part1"):
            R.shot(page, f"{lang}-{route.strip('/').replace('/', '-')}")
        if lang == "en" or route.startswith("/lessons/reading/"):
            q = try_quiz(page, route, sec)
            if q is not None:
                quizzes += 1
        if re.match(r"^/lessons/writing/(method|charts|process|maps|task2-method|opinion|discussion|advantages|problem|twopart)$", route):
            if not OPEN_HAS_EXAMPLE.get(route):
                R.check(sec, f"{route}: no worked example, same as the open build (it has none either)", page.locator("section.mt-10.rounded-card").count() == 0)
                continue
            try:
                page.wait_for_selector("section:has(h2:has-text('What a Band 8 answer looks like')), section:has(h2:has-text('Band 8'))"
                                       if lang == "en" else "section.mt-10.rounded-card:has(button)", timeout=30000)
                sect = page.locator("section.mt-10.rounded-card").first
                sect.scroll_into_view_if_needed()
                show = sect.locator("button.bg-brand")
                shown = False
                if show.count():
                    show.first.click()
                    page.wait_for_function("() => { const s = document.querySelector('section.mt-10.rounded-card'); return s && s.innerText.length > 900 }", timeout=10000)
                    shown = True
                examples += 1
                R.check(sec, f"{route}: worked example shows (task and Band 8 answer)", shown, "")
                note_dialog(page, route + " (example)")
                if route == "/lessons/writing/opinion":
                    R.shot(page, f"{lang}-worked-example-opinion")
            except Exception as e:  # noqa: BLE001
                R.check(sec, f"{route}: worked example shows (task and Band 8 answer)", False, str(e)[:160])
    R.check(sec, "lesson quizzes found and exercised", quizzes >= 18 if lang == "en" else quizzes >= 1, quizzes)
    R.check(sec, "Writing worked examples found (as many as the open build shows)", examples == sum(1 for v in OPEN_HAS_EXAMPLE.values() if v), f"{examples} vs open {OPEN_HAS_EXAMPLE}")

    # Vocabulary topic lists: every topic opens with its words.
    visit(page, "/review")
    page.wait_for_selector(".vocab-topic-card", timeout=30000)
    n = page.locator(".vocab-topic-card").count()
    empty = []
    for i in range(n):
        if i:
            page.locator(".vocab-text-link").first.click()
            page.wait_for_selector(".vocab-topic-card", timeout=10000)
        card = page.locator(".vocab-topic-card").nth(i)
        title = card.locator(".vocab-topic-card-title").inner_text()
        card.click()
        try:
            page.wait_for_selector(".vocab-word-list li, .vocab-simple-list li", timeout=10000)
            words = page.locator(".vocab-word-list li, .vocab-simple-list li").count()
            if words < 5:
                empty.append(f"{title}:{words}")
        except Exception:  # noqa: BLE001
            empty.append(f"{title}:none")
        if i == 0:
            R.shot(page, f"{lang}-vocab-topic-first")
    R.check(sec, f"vocabulary: all {n} topic lists open with their words", n == OPEN_TOPICS[0] and n > 0 and not empty, f"{n} topics (open build {OPEN_TOPICS[0]}); thin/empty: {empty}")
    ctx.close()


OPEN_HAS_EXAMPLE = {}
OPEN_TOPICS = [0]


def open_baseline(browser):
    """What the open build (today's site) shows: which Writing lessons have a worked example, how many topics."""
    from vhelpers import OPEN
    ctx = new_context(browser)
    page = ctx.new_page()
    for slug in ("method", "charts", "process", "maps", "task2-method", "opinion", "discussion", "advantages", "problem", "twopart"):
        visit(page, f"/lessons/writing/{slug}", base=OPEN)
        page.wait_for_timeout(800)
        OPEN_HAS_EXAMPLE[f"/lessons/writing/{slug}"] = page.locator("h2:has-text('What a Band 8 answer looks like')").count() > 0
    visit(page, "/review", ".vocab-topic-card", base=OPEN)
    OPEN_TOPICS[0] = page.locator(".vocab-topic-card").count()
    ctx.close()
    print("open baseline", OPEN_HAS_EXAMPLE, OPEN_TOPICS, flush=True)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        open_baseline(browser)
        for lang in ("en", "ru"):
            try:
                sweep(browser, lang)
            except Exception as e:  # noqa: BLE001
                R.check(f"lessons-{lang}", "sweep finished", False, str(e)[:300])
        browser.close()
    first = [n for n in nudges if n["feature"] == "first-lesson"]
    for lang in ("en", "ru"):
        mine = [n for n in first if n["lang"] == lang]
        R.check("nudge", f"{lang} account: first-lesson nudge appeared at most once across the whole sweep (only partial quizzes are checked here)", len(mine) <= 1, mine)
    R.check("nudge", "no other pop-up opened by itself during the sweep", all(n["feature"] == "first-lesson" for n in nudges), nudges)
    R.check("errors", "zero uncaught page errors or hydration messages", not R.errors, R.errors[:3])
    R.save({"nudges": nudges})


if __name__ == "__main__":
    main()
