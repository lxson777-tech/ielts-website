"""Browser check: the three vocabulary games at /review/games (8 October 2026).

Plays Match pairs, the 60-second sprint and Spell it from start to finish on
desktop (1440) and phone (390), with one wrong answer in each, Match by
keyboard, Spell with a letter hint; checks the review store and the learner
record after Spell, including a word becoming "known" after a second day;
checks no sideways scroll at 320, 390 and 1440, no page errors, and the
Russian interface with the words left in English.

Runs against a local build of the OPEN site on port 4650, pointed at the
local stand-in on 4655 (tools/mr-ez-dev-server.mjs, MR_EZ_DEV_PORT=4655,
MR_EZ_SITE_ORIGIN=http://localhost:4650). Nothing here talks to production
or calls a paid service. Synthetic @example.test accounts only.

THE SECOND DAY is simulated in the browser's own storage: every date in the
student's review store (due, last reviewed, recall days) is moved back one
day, exactly what the store would hold had the first game been played
yesterday. The next Spell set then brings yesterday's words back as due,
and spelling them again adds a second, different day.

  python vocab_games_check.py [out-dir]
"""
import json
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent
SHOTS = OUT / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)
SITE = "http://localhost:4650/ielts-website"
STAMP = str(int(time.time()))
PASSWORD = "Synthetic-Verify-1"
STUDENT = f"vg-student-{STAMP}@example.test"
TOPIC = "environment"
GAMES = SITE + "/review/games"

results = []
errors = []
taken = set()  # wrong-answer screenshots already taken this run
knowledge = {}  # meaning -> word, learnt from the games' own reveals


def check(section, name, ok, detail=""):
    results.append({"section": section, "check": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + f"[{section}] {name}" + (f" :: {detail}" if detail else ""))


def shot(page, name, full=True):
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=full)


def settle(page, extra=500):
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(extra)


def new_ctx(browser, w=1440, h=900, locale="en"):
    phone = w < 720
    ctx = browser.new_context(viewport={"width": w, "height": h}, locale="en-GB", device_scale_factor=2 if phone else 1, is_mobile=phone, has_touch=phone)
    ctx.add_init_script(f"try{{ if (!localStorage.getItem('ielts.locale.v1')) localStorage.setItem('ielts.locale.v1','{locale}') }}catch(e){{}}")
    return ctx


def watch(page, tag):
    page.on("pageerror", lambda e: errors.append({"tag": tag, "url": page.url, "error": str(e)[:400]}))
    page.on("console", lambda m: errors.append({"tag": tag, "url": page.url, "error": "console: " + m.text[:300]}) if m.type == "error" else None)


def fill_profile(page):
    page.wait_for_selector("#profile-firstName", timeout=40000)
    page.locator("#profile-firstName").fill("Aigerim")
    page.locator("#profile-lastName").fill("Synthetic")
    page.locator("#profile-dob-day").select_option("4")
    page.locator("#profile-dob-month").select_option("3")
    page.locator("#profile-dob-year").select_option("2000")
    page.locator("#profile-phone").fill("+7 701 234 56 78")
    page.locator("#profile-city").fill("Almaty")
    page.locator("#profile-occupation").fill("Synthetic University")
    page.locator("#profile-source-friend").check(force=True)
    page.locator("button.auth-button[type=submit]").click()


def sign_up(page, email):
    page.goto(SITE + "/sign-up?next=%2Fdashboard", wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=40000)
    settle(page)
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    if page.locator("#signup-consent").count():
        page.locator("#signup-consent").check(force=True)
    page.locator("button.auth-button[type=submit]").click()
    try:
        page.wait_for_function("() => !location.pathname.endsWith('/sign-up')", timeout=12000)
    except Exception:  # noqa: BLE001
        sign_in(page, email)
    if "/profile" in page.url or page.locator("#profile-firstName").count():
        fill_profile(page)
    page.wait_for_url("**/dashboard**", timeout=40000)


def sign_in(page, email):
    page.goto(SITE + "/sign-in?next=%2Fdashboard", wait_until="domcontentloaded")
    page.wait_for_selector("#signin-email", timeout=40000)
    settle(page)
    page.locator("#signin-email").fill(email)
    page.locator("#signin-password").fill(PASSWORD)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_function("() => !location.pathname.endsWith('/sign-in')", timeout=40000)
    if page.locator("#profile-firstName").count():
        fill_profile(page)


def user_id_of(page):
    return page.evaluate("() => { for (const k of Object.keys(localStorage)) { if (k.startsWith('sb-') && k.endsWith('-auth-token')) { return JSON.parse(localStorage.getItem(k)).user.id } } return null }")


def overflow(page):
    return page.evaluate("() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth")


def vocab_store(page, uid):
    return page.evaluate("(uid) => { const k = Object.keys(localStorage).find(k => k.startsWith('ielts.vocab.v1') && k.includes(uid)); return k ? JSON.parse(localStorage.getItem(k)) : null }", uid)


def learner_events(page, uid):
    return page.evaluate(
        """(uid) => { const out = []; for (const k of Object.keys(localStorage)) { if (!k.includes(uid)) continue; try { const v = JSON.parse(localStorage.getItem(k)); if (v && Array.isArray(v.events)) out.push(...v.events) } catch (e) {} } return out }""",
        uid,
    )


def bests_store(page, uid):
    return page.evaluate("(uid) => { const k = Object.keys(localStorage).find(k => k.startsWith('ielts.vocabgames.v1') && k.includes(uid)); return k ? JSON.parse(localStorage.getItem(k)) : null }", uid)


def open_game(page, game, topic=TOPIC):
    q = f"?game={game}" + (f"&topic={topic}" if topic else "")
    page.goto(GAMES + q, wait_until="domcontentloaded")
    page.wait_for_selector("[data-vg-start]", timeout=40000)
    settle(page, 400)


def phase(page):
    return page.get_attribute(".vg-game", "data-phase")


# ── Match ──────────────────────────────────────────────────────────────


def play_match(page, tag, keyboard=False):
    sec = f"match-{tag}"
    open_game(page, "match")
    shot(page, f"{tag}-match-1-start")
    page.click("[data-vg-start]")
    page.wait_for_selector("[data-tile]", timeout=10000)
    page.wait_for_timeout(300)
    tiles = page.eval_on_selector_all("[data-tile]", "els => els.map(e => e.dataset.tile)")
    words = [t[2:] for t in tiles if t.startswith("w:")]
    check(sec, "six pairs on the board", len(words) == 6 and len([t for t in tiles if t.startswith("m:")]) == 6, str(words))
    first, second = words[0], words[1]

    if keyboard:
        active = page.evaluate("() => document.activeElement && document.activeElement.dataset.tile")
        check(sec, "focus starts on the first word tile", active == f"w:{first}", str(active))
        page.keyboard.press("Enter")  # choose the first word
        pressed = page.get_attribute(f"[data-tile='w:{first}']", "aria-pressed")
        check(sec, "Enter selects a tile (aria-pressed)", pressed == "true")
        # Tab to a WRONG meaning and press Space.
        for _ in range(30):
            page.keyboard.press("Tab")
            cur = page.evaluate("() => document.activeElement && document.activeElement.dataset.tile")
            if cur and cur.startswith("m:") and cur != f"m:{first}":
                break
        page.keyboard.press("Space")
    else:
        page.click(f"[data-tile='w:{first}']")
        page.click(f"[data-tile='m:{second}']")
    page.wait_for_timeout(120)
    shaking = page.locator(".vg-tile.is-shaking").count()
    shot(page, f"{tag}-match-2-wrong-shake", full=False)
    check(sec, "a wrong pair shakes both tiles", shaking == 2, str(shaking))
    live = page.inner_text("[data-vg-live]")
    check(sec, "the live region says it was not a pair", "pair" in live.lower() or "пара" in live.lower(), live)
    page.wait_for_timeout(500)

    # Now every pair right. Keyboard: Tab to the tile and press Enter.
    for i, w in enumerate(words):
        for side in ("w", "m"):
            target = f"{side}:{w}"
            if keyboard:
                for _ in range(40):
                    cur = page.evaluate("() => document.activeElement && document.activeElement.dataset.tile")
                    if cur == target:
                        break
                    page.keyboard.press("Shift+Tab" if side == "w" else "Tab")
                page.keyboard.press("Enter")
            else:
                page.click(f"[data-tile='{target}']")
        if i == 0:
            page.wait_for_timeout(90)
            shot(page, f"{tag}-match-3-right-pop", full=False)
            check(sec, "a right pair settles as done", page.locator(f"[data-tile='w:{w}'].is-done").count() == 1)
    page.wait_for_selector(".vg-end", timeout=8000)
    page.wait_for_timeout(500)
    shot(page, f"{tag}-match-4-end")
    end_text = page.inner_text(".vg-end")
    check(sec, "finish screen with time, mistakes and best", all(x in end_text for x in ("Time", "Mistakes", "Your best")) or "Время" in end_text, end_text[:160])
    check(sec, "the missed word is listed to look at again", first in end_text, first)
    check(sec, "Play again and Next topic offered", page.locator(".vg-end button.vg-btn-primary").count() == 1 and page.locator(".vg-end a.vg-btn-secondary").count() == 1)
    check(sec, "no sideways scroll", overflow(page) <= 0, str(overflow(page)))
    return first


# ── Sprint ─────────────────────────────────────────────────────────────


def sprint_answer(page, force_wrong=False):
    """Answer the question on screen: from knowledge when we have it, else a guess."""
    clue = page.locator(".vg-clue span[lang=en]")
    meaning = clue.inner_text() if clue.count() else page.inner_text(".vg-sentence")
    options = page.eval_on_selector_all(".vg-option span", "els => els.map(e => e.textContent)")
    known = knowledge.get(meaning)
    choice = known if known in options else options[0]
    if force_wrong and known in options:
        choice = next(o for o in options if o != known)
    idx = options.index(choice)
    page.locator(".vg-option").nth(idx).click()
    page.wait_for_timeout(60)
    right = page.eval_on_selector_all(".vg-option.is-right span", "els => els.map(e => e.textContent)")
    if right:
        knowledge[meaning] = right[0]
    return choice == (right[0] if right else None)


def play_sprint(page, tag, pause=False):
    sec = f"sprint-{tag}"
    open_game(page, "sprint")
    shot(page, f"{tag}-sprint-1-start")
    check(sec, "the clock does not run before Start", page.locator("[data-vg-seconds]").count() == 0)
    page.click("[data-vg-start]")
    page.wait_for_selector(".vg-option", timeout=10000)
    got_wrong = got_flame = shot_wrong = shot_flame = paused_ok = False
    start = time.time()
    while phase(page) in ("play", "paused") and time.time() - start < 90:
        if phase(page) == "paused":
            break
        if not page.locator(".vg-option:not([aria-disabled])").count():
            page.wait_for_timeout(50)
            continue
        try:
            ok = sprint_answer(page, force_wrong=not got_wrong and len(knowledge) > 0)
        except Exception:  # noqa: BLE001  (the minute ran out mid-answer)
            break
        if not ok and not shot_wrong:
            got_wrong = True
            shot(page, f"{tag}-sprint-2-wrong-shows-answer", full=False)
            shot_wrong = True
        streak = int(page.get_attribute("[data-vg-streak]", "data-vg-streak") or 0)
        if streak >= 3 and not shot_flame:
            got_flame = page.locator(".vg-flame").count() == 1
            shot(page, f"{tag}-sprint-3-streak-flame", full=False)
            shot_flame = True
        if pause and not paused_ok and time.time() - start > 8:
            page.wait_for_timeout(1300)
            before = page.inner_text("[data-vg-seconds]")
            page.evaluate("() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) }")
            page.wait_for_selector(".vg-paused", timeout=3000)
            page.wait_for_timeout(2500)
            during = page.inner_text("[data-vg-seconds]")
            shot(page, f"{tag}-sprint-4-paused", full=False)
            page.evaluate("() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')) }")
            page.click(".vg-paused button")
            paused_ok = before == during
            check(sec, "a hidden tab pauses the minute", paused_ok, f"{before} -> {during} after 2.5s hidden")
        page.wait_for_timeout(30)
    page.wait_for_selector(".vg-end", timeout=75000)
    page.wait_for_timeout(500)
    shot(page, f"{tag}-sprint-5-end")
    end_text = page.inner_text(".vg-end")
    check(sec, "at least one wrong answer, shown with the right one", got_wrong)
    check(sec, "a streak of three shows the flame", got_flame)
    check(sec, "end screen: score, best and the missed words", "Score" in end_text or "Результат" in end_text, end_text[:200])
    check(sec, "no sideways scroll", overflow(page) <= 0, str(overflow(page)))


# ── Spell ──────────────────────────────────────────────────────────────


def play_spell(page, tag, hint=True, wrong=True, label="spell", topic=TOPIC):
    sec = f"{label}-{tag}"
    open_game(page, "spell", topic)
    shot(page, f"{tag}-{label}-1-start")
    start_text = page.inner_text(".vg-start")
    check(sec, "start screen says this game makes words count as learnt", "learnt" in start_text or "выучен" in start_text)
    page.click("[data-vg-start]")
    page.wait_for_selector("#vg-spell-input", timeout=10000)
    done_hint = done_wrong = False
    played = []
    for _ in range(30):
        if phase(page) != "play":
            break
        meaning = page.inner_text(".vg-meaning")
        known = knowledge.get(meaning)
        page.wait_for_timeout(80)
        if hint and not done_hint and known:
            page.click("[data-vg-hint]")
            page.wait_for_timeout(120)
            typed = page.input_value("#vg-spell-input")
            check(sec, "the hint types the first letter and marks it", typed.lower() == known[:1].lower() and page.locator(".vg-slot.is-hint").count() == 1, typed)
            page.fill("#vg-spell-input", known)
            shot(page, f"{tag}-{label}-2-hint", full=False)
            done_hint = True
        elif (wrong and not done_wrong) or not known:
            page.fill("#vg-spell-input", "zzzq")
            done_wrong = done_wrong or (wrong and not done_wrong)
        else:
            page.fill("#vg-spell-input", known.upper() if len(played) == 1 else f"  {known} ")
        page.click(".vg-spell-form button[type=submit]")
        page.wait_for_selector(".vg-feedback", timeout=5000)
        fb = page.inner_text(".vg-feedback")
        m = re.search(r"[“«](.+?)[”»]", fb)
        if m:
            knowledge[meaning] = m.group(1)
            if f"{tag}-{label}-3-wrong" not in taken:
                taken.add(f"{tag}-{label}-3-wrong")
                shot(page, f"{tag}-{label}-3-wrong", full=False)
            later = page.locator(".vg-feedback button:has-text('Try again later'), .vg-feedback button:has-text('Попробовать позже')")
            if later.count():
                later.click()
            else:
                page.locator(".vg-feedback button").first.click()
        else:
            played.append(meaning)
            page.locator(".vg-feedback button").first.click()
        page.wait_for_timeout(150)
    page.wait_for_selector(".vg-end", timeout=8000)
    page.wait_for_timeout(400)
    shot(page, f"{tag}-{label}-4-end")
    end_text = page.inner_text(".vg-end")
    check(sec, "end screen: words spelt and words to practise", ("Spelt from memory" in end_text or "Написано по памяти" in end_text), end_text[:220])
    check(sec, "no sideways scroll", overflow(page) <= 0, str(overflow(page)))
    return end_text


def shift_store_one_day(page, uid):
    """Move every date in the student's review store back one day."""
    return page.evaluate(
        """(uid) => {
          const k = Object.keys(localStorage).find(k => k.startsWith('ielts.vocab.v1') && k.includes(uid));
          const s = JSON.parse(localStorage.getItem(k));
          const back = (d) => { const x = new Date(d.length === 10 ? d + 'T00:00:00Z' : d); x.setUTCDate(x.getUTCDate() - 1); return d.length === 10 ? x.toISOString().slice(0, 10) : x.toISOString(); };
          for (const c of Object.values(s.cards)) {
            c.due = back(c.due); c.introducedDate = back(c.introducedDate);
            if (c.lastReviewed) c.lastReviewed = back(c.lastReviewed);
            if (c.recallSuccessDates) c.recallSuccessDates = c.recallSuccessDates.map(back);
          }
          localStorage.setItem(k, JSON.stringify(s));
          return Object.entries(s.cards).filter(([, c]) => (c.recallSuccessDates || []).length).map(([w]) => w);
        }""",
        uid,
    )


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1. Signed out, desktop: the chooser, the topic picker, the invitation.
        ctx = new_ctx(browser)
        page = ctx.new_page()
        watch(page, "signed-out")
        page.goto(GAMES, wait_until="domcontentloaded")
        page.wait_for_selector("[data-vg-choose]", timeout=40000)
        settle(page)
        check("chooser", "three games offered", page.locator("[data-vg-choose]").count() == 3)
        shot(page, "desktop-01-chooser")
        page.click(".vg-topic-switch button")
        page.wait_for_selector(".vg-topic-grid img", timeout=5000)
        page.wait_for_timeout(800)
        imgs = page.eval_on_selector_all(".vg-topic-grid img", "els => els.filter(i => i.complete && i.naturalWidth > 0).length")
        check("chooser", "topic chooser shows the topic pictures", imgs >= 8, f"{imgs} loaded")
        shot(page, "desktop-02-topic-chooser")
        open_game(page, "match")
        check("signed-out", "invitation to sign in to keep progress", page.locator(".vg-signin a").count() == 1)
        page.goto(GAMES + "?game=sprint&topic=no-such-topic", wait_until="domcontentloaded")
        page.wait_for_selector("[data-vg-start]", timeout=40000)
        check("chooser", "an unknown topic falls back to the mixed set", "Mixed set" in page.inner_text(".vg-start"))
        ctx.close()

        # 2. Desktop 1440, signed in: all three games, Match by keyboard.
        ctx = new_ctx(browser)
        page = ctx.new_page()
        watch(page, "desktop")
        sign_up(page, STUDENT)
        uid = user_id_of(page)
        check("account", "signed in as a synthetic student", bool(uid), STUDENT)
        missed = play_match(page, "desktop", keyboard=True)
        store = vocab_store(page, uid) or {"cards": {}}
        check("match-desktop", "the missed word is in the review store as a lapse", store["cards"].get(missed, {}).get("lapses") == 1, json.dumps(store["cards"].get(missed)))
        ev = [e for e in learner_events(page, uid) if e.get("activityId") == f"review:vocabulary:{TOPIC}"]
        check("match-desktop", "every pair written to the learner record as recognition", len(ev) == 7 and all(e["outcome"]["words"][0]["direction"] == "recognise" for e in ev), f"{len(ev)} events")
        best = bests_store(page, uid)
        check("match-desktop", "a best time kept under this student's own key", bool(best and best["match"].get(TOPIC)), json.dumps(best))

        play_sprint(page, "desktop", pause=True)
        best = bests_store(page, uid)
        check("sprint-desktop", "a best score kept", bool(best and best["sprint"].get(TOPIC)), json.dumps(best and best["sprint"]))

        end_text = play_spell(page, "desktop", hint=True, wrong=True)
        store = vocab_store(page, uid)
        recall = {w: c.get("recallSuccessDates") for w, c in store["cards"].items() if c.get("recallSuccessDates")}
        check("spell-desktop", "unaided right spellings recorded as recall days", len(recall) >= 1, json.dumps(recall)[:300])
        spell_events = [e for e in learner_events(page, uid) if e["outcome"].get("words", [{}])[0].get("direction") == "recall"]
        check("spell-desktop", "each spelling written to the learner record as recall", len(spell_events) >= 10, f"{len(spell_events)} recall events")
        check("spell-desktop", "the hinted answer is recorded as assisted (hint)", any(e.get("assistance") == "hint" for e in spell_events))
        check("spell-desktop", "the second go is recorded with the answer shown", any(e.get("assistance") == "answer-shown" for e in spell_events))

        # The second day.
        yesterday_words = shift_store_one_day(page, uid)
        check("second-day", "yesterday's recall days in the store after the shift", len(yesterday_words) >= 1, ", ".join(yesterday_words))
        end2 = play_spell(page, "desktop", hint=False, wrong=False, label="spell-day2")
        store = vocab_store(page, uid)
        known = [w for w, c in store["cards"].items() if len(set(c.get("recallSuccessDates") or [])) >= 2]
        check("second-day", "a word spelt on two different days is now known", len(known) >= 1, ", ".join(known))
        check("second-day", "the end screen says how many words now count as learnt", "now count" in end2 or "now counts" in end2 or "выучен" in end2, end2[:240])
        ctx.close()

        # 3. Phone 390: all three, by tapping.
        ctx = new_ctx(browser, 390, 844)
        page = ctx.new_page()
        watch(page, "phone")
        sign_in(page, STUDENT)
        page.goto(GAMES, wait_until="domcontentloaded")
        page.wait_for_selector("[data-vg-choose]", timeout=40000)
        settle(page)
        shot(page, "phone-01-chooser")
        check("phone", "chooser: no sideways scroll at 390", overflow(page) <= 0, str(overflow(page)))
        play_match(page, "phone", keyboard=False)
        play_sprint(page, "phone")
        # No topic: the Vocabulary home's "Spell it" button (due words first, then new).
        end_mixed = play_spell(page, "phone", hint=True, wrong=True, topic=None)
        check("spell-phone", "with no topic the set is the mixed set", "mixed set" in end_mixed.lower(), end_mixed[:60])
        targets = page.evaluate("() => [...document.querySelectorAll('.vg-end .vg-btn')].map(b => b.getBoundingClientRect().height)")
        check("phone", "end screen buttons at least 44px tall", all(h >= 44 for h in targets), str(targets))
        ctx.close()

        # 4. Phone 320: no sideways scroll on every screen.
        ctx = new_ctx(browser, 320, 640)
        page = ctx.new_page()
        watch(page, "320")
        for q in ("", "?game=match&topic=environment", "?game=sprint", "?game=spell&topic=ai"):
            page.goto(GAMES + q, wait_until="domcontentloaded")
            page.wait_for_selector("[data-vg-choose], [data-vg-start]", timeout=40000)
            settle(page, 300)
            if "game=" in q:
                page.click("[data-vg-start]")
                page.wait_for_timeout(500)
            check("320", f"no sideways scroll {q or 'chooser'}", overflow(page) <= 0, str(overflow(page)))
            if "match" in q:
                tiles = page.evaluate("() => [...document.querySelectorAll('.vg-tile')].map(t => t.getBoundingClientRect().height)")
                check("320", "match tiles at least 44px tall", all(h >= 44 for h in tiles), str(tiles))
                shot(page, "phone320-match-play")
        ctx.close()

        # 5. Russian interface, English words.
        ctx = new_ctx(browser, 1440, 900, locale="ru")
        page = ctx.new_page()
        watch(page, "ru")
        page.goto(GAMES, wait_until="domcontentloaded")
        page.wait_for_selector("[data-vg-choose]", timeout=40000)
        settle(page, 900)
        shot(page, "ru-01-chooser")
        h1 = page.inner_text(".vg-head h1")
        check("russian", "the chooser is in Russian", h1 == "Игры со словами", h1)
        open_game(page, "match")
        page.wait_for_timeout(600)
        page.click("[data-vg-start]")
        page.wait_for_selector("[data-tile]")
        page.wait_for_timeout(400)
        labels = page.inner_text(".vg-board")
        word = page.inner_text(".vg-tile-word")
        check("russian", "column labels in Russian, words in English", "СЛОВА" in labels.upper() and re.fullmatch(r"[A-Za-z ()'/\-]+", word.strip()) is not None, word)
        shot(page, "ru-02-match-play")
        open_game(page, "spell")
        page.wait_for_timeout(600)
        page.click("[data-vg-start]")
        page.wait_for_selector(".vg-meaning")
        page.wait_for_timeout(400)
        shot(page, "ru-03-spell-play", full=False)
        meaning = page.inner_text(".vg-meaning")
        check("russian", "the meaning stays English", re.search(r"[A-Za-z]{3}", meaning) is not None and not re.search(r"[А-Яа-я]", meaning), meaning)
        ctx.close()
        browser.close()

    on_games = [e for e in errors if "/review/games" in e["url"]]
    elsewhere = [e for e in errors if "/review/games" not in e["url"]]
    check("errors", "no page errors or console errors on the games pages", not on_games, json.dumps(on_games[:5], ensure_ascii=False))
    if elsewhere:
        print("NOTE errors outside the games pages (sign-up and dashboard, not this work):", json.dumps(elsewhere[:3], ensure_ascii=False))
    (OUT / "results.json").write_text(
        json.dumps({"site": SITE, "student": STUDENT, "passed": sum(r["ok"] for r in results), "failed": sum(not r["ok"] for r in results), "results": results, "errors": errors}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"\n{sum(r['ok'] for r in results)} passed, {sum(not r['ok'] for r in results)} failed")


if __name__ == "__main__":
    main()
