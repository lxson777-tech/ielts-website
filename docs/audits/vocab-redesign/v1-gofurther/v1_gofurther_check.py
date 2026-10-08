"""Builder V1, second round (8 October 2026): the topic page's lower groups
made interactive. Go Further as guess-the-word cards, Key Collocations as
pick-the-partner, Useful Essay Phrases as copy-ready cards.

Open site: http://localhost:4640/ielts-website (astro dev, stand-in on 4645)
Run:       python docs/audits/vocab-redesign/v1-gofurther/v1_gofurther_check.py
Writes results.json and shots/ next to this file."""
import json, os, re, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
SHOTS = HERE / "shots"
SHOTS.mkdir(exist_ok=True)
OPEN = os.environ.get("OPEN_BASE", "http://localhost:4640/ielts-website")
HYDRATED = """() => [...document.querySelectorAll('astro-island[ssr]')].every(el => ['visible', 'media'].includes(el.getAttribute('client')))"""

results, errors = [], {}


def check(section, name, ok, detail=""):
    results.append({"section": section, "check": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + f"[{section}] {name}" + (f"  ({detail})" if detail else ""))


def collocation_answers(slug):
    """The bold key words of a topic's Key Collocations, read from the lesson
    file itself, so the script knows the right chip without the page
    giving it away."""
    html = (REPO / "src/content/lesson-bodies" / f"vocabulary-{slug}.html").read_text(encoding="utf-8")
    block = re.search(r"<h3>Key Collocations</h3>\s*<ul>([\s\S]*?)</ul>", html).group(1)
    out = []
    for li in re.findall(r"<li>([\s\S]*?)</li>", block):
        bolds = re.findall(r"<(?:strong|b)>([\s\S]*?)</(?:strong|b)>", li)
        joined = re.search(r"<(strong|b)>[^<]*</\1>\s*/\s*<(strong|b)>", li)
        out.append(" / ".join(bolds[:2]) if joined else (bolds[0] if bolds else None))
    return out


def settle(pg):
    pg.wait_for_load_state("domcontentloaded")
    pg.wait_for_function(HYDRATED, timeout=60000)
    pg.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 300))))")


def bring(pg, selector):
    """Scroll so the element sits just under the floating header."""
    pg.evaluate(f"""() => {{ const el = document.querySelector('{selector}'); window.scrollTo({{ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: 'instant' }}); }}""")
    pg.wait_for_timeout(250)


def overflow(pg):
    return pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")


ENV = collocation_answers("environment")
print("environment answers:", ENV)

TEXT = {
    "en": {"band": "Band 7+", "rev": "{n} of 10 revealed", "score": "{n} of 9 right", "copied": "Copied", "copy": "Copy", "hint": "Copy a phrase into the Writing trainer", "hide": "Hide all again", "retry": "Try again"},
    "ru": {"band": "Балл 7+", "rev": "Открыто {n} из 10", "score": "Верно {n} из 9", "copied": "Скопировано", "copy": "Копировать", "hint": "Скопируйте фразу в тренажёр Writing", "hide": "Скрыть все снова", "retry": "Попробовать ещё раз"},
}

with sync_playwright() as p:
    browser = p.chromium.launch()
    for lang, w in (("en", 1440), ("ru", 1440), ("en", 390), ("ru", 390)):
        tag = f"{lang}-{w}"
        L = TEXT[lang]
        phone = w < 720
        ctx = browser.new_context(viewport={"width": w, "height": 900}, locale="ru-RU" if lang == "ru" else "en-GB",
                                  is_mobile=phone, has_touch=phone, device_scale_factor=2 if phone else 1)
        origin = re.match(r"https?://[^/]+", OPEN).group(0)
        ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=origin)
        ctx.add_init_script(f"try{{ localStorage.setItem('ielts.locale.v1','{lang}') }}catch(e){{}}")
        pg = ctx.new_page()
        errors[tag] = []
        pg.on("pageerror", lambda e, t=tag: errors[t].append(str(e)))
        pg.goto(OPEN + "/review?topic=environment", wait_until="domcontentloaded")
        settle(pg)
        pg.wait_for_selector(".vh-guess")

        # ── Go Further: guess the word ──
        g = pg.locator(".vh-guess")
        head = g.locator("h2").inner_text()
        check(f"go further {tag}", "heading carries the Band 7+ tag", L["band"] in head and "Go Further" in head, head.replace("\n", " "))
        cards = g.locator(".vh-flip")
        check(f"go further {tag}", "ten guess cards", cards.count() == 10)
        front = cards.nth(0).locator(".vh-guess-meaning").inner_text()
        check(f"go further {tag}", "the front shows the meaning, in English", front.startswith("the gradual rise in the temperature"), front)
        check(f"go further {tag}", "counter starts at none revealed", L["rev"].format(n=0) in g.locator(".vh-group-meta").inner_text())
        cards.nth(0).click()
        pg.wait_for_timeout(700)
        check(f"go further {tag}", "a click reveals the word", cards.nth(0).get_attribute("aria-pressed") == "true"
              and cards.nth(0).locator(".vh-flip-back .vh-flip-word").inner_text().strip() == "global warming")
        check(f"go further {tag}", "the back carries the example sentence", len(cards.nth(0).locator(".vh-flip-example").inner_text()) > 20)
        cards.nth(1).focus()
        pg.keyboard.press("Enter")
        pg.wait_for_timeout(700)
        check(f"go further {tag}", "Enter reveals a focused card", cards.nth(1).get_attribute("aria-pressed") == "true")
        meta = g.locator(".vh-group-meta").inner_text()
        check(f"go further {tag}", "counter reads 2 of 10 revealed", L["rev"].format(n=2) in meta, meta.replace("\n", " | "))
        if lang == "en":
            bring(pg, ".vh-guess")
            pg.screenshot(path=str(SHOTS / f"01-go-further-two-revealed-{tag}.png"))
        g.locator(".vh-text-btn", has_text=L["hide"]).click()
        pg.wait_for_timeout(500)
        check(f"go further {tag}", "Hide all again turns every card back",
              all(cards.nth(i).get_attribute("aria-pressed") == "false" for i in range(10)) and L["rev"].format(n=0) in g.locator(".vh-group-meta").inner_text()
              and g.locator(".vh-text-btn").count() == 0)
        bg = pg.evaluate("getComputedStyle(document.querySelector('.vh-guess .vh-flip-front')).backgroundColor")
        main_bg = pg.evaluate("getComputedStyle(document.querySelector('.vh-flip-grid:not(.vh-guess-grid) .vh-flip-front')).backgroundColor")
        check(f"go further {tag}", "visibly distinct from the main cards (ochre tint)", bg != main_bg, f"{bg} vs {main_bg}")

        # ── Key Collocations: pick the partner ──
        c = pg.locator(".vh-colloc-group")
        rows = c.locator(".vh-colloc")
        check(f"collocations {tag}", "nine phrases, each with a blank and three choices",
              rows.count() == 9 and all(rows.nth(i).locator(".vh-chip").count() == 3 for i in range(9)))
        r0 = rows.nth(0)
        chips0 = [r0.locator(".vh-chip").nth(i).inner_text().strip() for i in range(3)]
        check(f"collocations {tag}", "choices are distinct and include the bold word", len(set(chips0)) == 3 and ENV[0] in chips0, ", ".join(chips0))
        r0.locator(".vh-chip", has_text=re.compile(rf"^{re.escape(ENV[0])}$")).click()
        pg.wait_for_timeout(600)
        check(f"collocations {tag}", "the right word fills the blank and the choices fold away",
              "is-right" in r0.get_attribute("class") and ENV[0] in r0.locator(".vh-gap").inner_text()
              and "is-collapsed" in r0.locator(".vh-chips-wrap").get_attribute("class"))
        pop = pg.evaluate("getComputedStyle(document.querySelector('.vh-colloc.is-right .vh-gap-word')).animationName")
        check(f"collocations {tag}", "it fills with a gentle pop", pop == "vh-pop", pop)
        r1 = rows.nth(1)
        wrong = [r1.locator(".vh-chip").nth(i).inner_text().strip() for i in range(3)]
        wrong = [x for x in wrong if x != ENV[1]]
        r1.locator(".vh-chip", has_text=re.compile(rf"^{re.escape(wrong[0])}$")).click()
        shaking = "is-shaking" in (r1.locator(".vh-chips").get_attribute("class") or "")
        pg.wait_for_timeout(500)
        first_wrong = r1.locator(".vh-chip", has_text=re.compile(rf"^{re.escape(wrong[0])}$"))
        check(f"collocations {tag}", "a wrong pick shakes and greys that choice, the phrase stays open",
              shaking and first_wrong.is_disabled() and "is-wrong" in first_wrong.get_attribute("class") and r1.get_attribute("data-open") == "true")
        r1.locator(".vh-chip", has_text=re.compile(rf"^{re.escape(wrong[1])}$")).click()
        pg.wait_for_timeout(600)
        check(f"collocations {tag}", "a second miss shows the right word", "is-revealed" in r1.get_attribute("class") and ENV[1] in r1.locator(".vh-gap").inner_text())
        score = c.locator(".vh-group-meta").inner_text()
        check(f"collocations {tag}", "score counts only the right pick", L["score"].format(n=1) in score, score.replace("\n", " | "))
        live = c.locator("p.vh-sr[aria-live]").inner_text()
        check(f"collocations {tag}", "the result is announced", ENV[1] in live, live)
        # Keyboard: answer row 3 with Enter; focus moves on to row 4.
        r2 = rows.nth(2)
        r2.locator(".vh-chip", has_text=re.compile(rf"^{re.escape(ENV[2])}$")).focus()
        pg.keyboard.press("Enter")
        pg.wait_for_timeout(300)
        moved = pg.evaluate("(() => { const a = document.activeElement; const li = a && a.closest('.vh-colloc'); return li ? li.dataset.index : null })()")
        check(f"collocations {tag}", "Enter answers, and focus moves to the next phrase", "is-right" in r2.get_attribute("class") and moved == "3", f"focus on phrase {moved}")
        if lang == "en":
            bring(pg, ".vh-colloc-group")
            pg.screenshot(path=str(SHOTS / f"02-collocations-answered-{tag}.png"))
        c.locator(".vh-text-btn", has_text=L["retry"]).click()
        pg.wait_for_timeout(500)
        check(f"collocations {tag}", "Try again resets every phrase", all(rows.nth(i).get_attribute("data-open") == "true" for i in range(9)) and c.locator(".vh-group-meta").count() == 0)

        # ── Useful Essay Phrases: copy-ready cards ──
        ph = pg.locator(".vh-phrases")
        link = ph.locator(".vh-hint-link")
        check(f"phrases {tag}", "hint links to the Writing trainer", link.get_attribute("href") == "/ielts-website/trainers/writing" and link.inner_text().strip() == L["hint"], link.get_attribute("href"))
        marks = ph.locator("mark.vh-hit").all_inner_texts()
        check(f"phrases {tag}", "topic words are marked inside the phrases", "Environmental degradation" in marks and any(m.lower().startswith("sustainable") for m in marks), ", ".join(marks))
        btn = ph.locator(".vh-copy").nth(0)
        check(f"phrases {tag}", "Copy button labelled", btn.inner_text().strip() == L["copy"])
        btn.click()
        pg.wait_for_timeout(300)
        clip = pg.evaluate("navigator.clipboard.readText()")
        check(f"phrases {tag}", "the clipboard holds the phrase, ready to continue", clip == "Environmental degradation poses a long-term threat to ", repr(clip))
        check(f"phrases {tag}", "the button shows Copied with a tick", btn.inner_text().strip() == L["copied"] and "is-copied" in btn.get_attribute("class"))
        live = ph.locator("p.vh-sr[aria-live]").inner_text()
        check(f"phrases {tag}", "Copied is announced", live.startswith(L["copied"]), live)
        check(f"phrases {tag}", "the phrases stay English", ph.locator(".vh-phrase-text").nth(1).inner_text().startswith("The most effective way"))
        if lang == "en" or w == 390:
            bring(pg, ".vh-phrases")
            pg.screenshot(path=str(SHOTS / f"03-phrases-copied-{tag}.png"))
        pg.wait_for_timeout(1900)
        check(f"phrases {tag}", "the tick fades back to Copy", btn.inner_text().strip() == L["copy"])

        check(f"page {tag}", "no sideways scroll", overflow(pg) <= 0, f"{overflow(pg)}px")
        if lang == "ru":
            bring(pg, ".vh-guess")
            pg.screenshot(path=str(SHOTS / f"04-groups-{tag}.png"))
        ctx.close()

    # ── Fallbacks: Conjunctions, and a whole-bold collocation ──
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script("try{ localStorage.setItem('ielts.locale.v1','en') }catch(e){}")
    pg = ctx.new_page()
    errors["fallbacks"] = []
    pg.on("pageerror", lambda e: errors["fallbacks"].append(str(e)))
    pg.goto(OPEN + "/review?topic=conjunctions", wait_until="domcontentloaded")
    settle(pg)
    pg.wait_for_selector(".vh-topic-page")
    check("fallback", "Conjunctions keeps its 18 word cards and no new groups",
          pg.locator(".vh-flip-grid .vh-flip").count() == 18 and pg.locator(".vh-guess, .vh-colloc-group").count() == 0)
    plain_topic = None
    for f in sorted((REPO / "src/content/lesson-bodies").glob("vocabulary-*.html")):
        block = re.search(r"<h3>Key Collocations</h3>\s*<ul>([\s\S]*?)</ul>", f.read_text(encoding="utf-8"))
        if block and re.search(r"<li>\s*<(strong|b)>[^<]*</\1>\s*</li>", block.group(1)):
            plain_topic = f.stem.replace("vocabulary-", "")
            break
    if plain_topic:
        pg.goto(OPEN + f"/review?topic={plain_topic}", wait_until="domcontentloaded")
        settle(pg)
        pg.wait_for_selector(".vh-colloc-group")
        check("fallback", f"a collocation that is bold end to end shows as a plain row ({plain_topic})", pg.locator(".vh-colloc.is-plain").count() >= 1)
    speaking = None
    for f in sorted((REPO / "src/content/lesson-bodies").glob("vocabulary-*.html")):
        if "<h3>Useful Speaking Phrases</h3>" in f.read_text(encoding="utf-8"):
            speaking = f.stem.replace("vocabulary-", "")
            break
    if speaking:
        pg.goto(OPEN + f"/review?topic={speaking}", wait_until="domcontentloaded")
        settle(pg)
        pg.wait_for_selector(".vh-phrases")
        check("fallback", f"speaking phrases get copy cards without the Writing link ({speaking})", pg.locator(".vh-phrases .vh-copy").count() >= 1 and pg.locator(".vh-phrases .vh-hint-link").count() == 0)
    ctx.close()

    # ── Reduced motion ──
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    pg = ctx.new_page()
    pg.goto(OPEN + "/review?topic=environment", wait_until="domcontentloaded")
    settle(pg)
    pg.wait_for_selector(".vh-guess")
    pg.locator(".vh-guess .vh-flip").nth(0).click()
    pg.wait_for_timeout(500)
    st = pg.evaluate("""() => { const c = document.querySelector('.vh-guess .vh-flip'); const cs = s => getComputedStyle(c.querySelector(s)); return {inner: cs('.vh-flip-inner').transform, back: cs('.vh-flip-back').opacity} }""")
    check("reduced motion", "guess cards crossfade instead of turning", st["inner"] == "none" and st["back"] == "1", json.dumps(st))
    ctx.close()
    browser.close()

for tag, errs in errors.items():
    check("errors", f"no page errors ({tag})", not errs, "; ".join(errs)[:300])

passed = sum(r["ok"] for r in results)
(HERE / "results.json").write_text(json.dumps({"run": time.strftime("%Y-%m-%d %H:%M:%S"), "open": OPEN, "passed": passed, "failed": len(results) - passed, "results": results}, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"\n{passed}/{len(results)} passed")
sys.exit(0 if passed == len(results) else 1)
