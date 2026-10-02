"""Lesson practice exercises, pre-publish fix (3 October 2026): checks in a real browser.

Against a local dev server (default http://localhost:4592/ielts-website), in English and in
Russian (localStorage 'ielts.locale.v1'):
  1. Reading, Summary / table completion, Test 16 table (an answer pool): the right letters
     everywhere except F typed into blanks 5, 7 and 9. Expected: 8 / 10, blanks 7 and 9 marked
     wrong with the letters still owed (G, J) and the "already earned" note.
  2. Reading, Sentence completion: the unit instruction states the paper's word limit.
Screenshots and results.json land next to this script.

    python docs/audits/prepublish-2026-10-03/practice-fix/practice_fix_check.py [base-url]
"""

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4592/ielts-website").rstrip("/")
OUT = Path(__file__).resolve().parent
SHOTS = OUT / "shots"
SHOTS.mkdir(exist_ok=True)

# Test 16 table, blanks 1 to 10: right letters, except F repeated in blanks 5, 7 and 9.
POOL_DRAFTS = ["A", "B", "D", "C", "F", "E", "F", "H", "F", "I"]
EXPECTED = {
    "en": {
        "title": "Exercise. Complete the summary, notes or table (real test questions)",
        "pool_intro": "Write the correct letter, A-L, from the box for each answer.",
        "score": "8 / 10 correct",
        "owed": ["Not quite. The answer is “G”.", "Not quite. The answer is “J”."],
        "repeat_note": "already earned its mark in another blank of this group",
        "sentence_title": "Exercise. Complete the sentences (real test questions)",
        "sentence_intro": "Choose ONE WORD ONLY from the passage for each answer.",
        "collapse": "Collapse passage",
    },
    "ru": {
        "title": "Упражнение. Заполните краткое содержание, заметки или таблицу (настоящие вопросы теста)",
        "pool_intro": "Для каждого ответа напишите правильную букву из списка, от A до L.",
        "score": None,  # checked as the numbers only, the wording is the dictionary's
        "owed": ["Не совсем. Правильный ответ: «G».", "Не совсем. Правильный ответ: «J»."],
        "repeat_note": "уже принёс балл в другом пропуске этой группы",
        "sentence_title": "Упражнение. Закончите предложения (настоящие вопросы теста)",
        "sentence_intro": "Для каждого ответа выберите из текста только одно слово (в задании: ONE WORD ONLY).",
        "collapse": "Свернуть текст",
    },
}

results = {"base": BASE, "checks": []}


def check(name, ok, detail=""):
    results["checks"].append({"name": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f"  ({detail})" if detail and not ok else ""))


def quiz_root(page):
    return page.locator("div.rounded-card", has=page.locator("h3", has_text="🎯")).first


def shot_at(page, locator, name):
    """A viewport screenshot with `locator` near the top, below the fixed navigation."""
    page.evaluate(
        "(el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120)",
        locator.element_handle(),
    )
    page.wait_for_timeout(400)
    page.screenshot(path=str(SHOTS / name))


def open_lesson(context, slug, locale, title):
    page = context.new_page()
    page.goto(f"{BASE}/lessons/reading/{slug}", wait_until="networkidle")
    root = quiz_root(page)
    root.locator("h3", has_text=title).wait_for(timeout=20000)
    return page, root


with sync_playwright() as p:
    browser = p.chromium.launch()
    for locale in ("en", "ru"):
        exp = EXPECTED[locale]
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        context.add_init_script(f"try {{ localStorage.setItem('ielts.locale.v1', '{locale}'); }} catch (e) {{}}")

        # 1. The pooled table.
        page, root = open_lesson(context, "summary-completion", locale, exp["title"])
        check(f"{locale}: set title translated", root.locator("h3").first.inner_text().strip().endswith(exp["title"]))
        form = root.locator("form").first
        check(f"{locale}: table unit states its rule", exp["pool_intro"] in form.inner_text())
        root.get_by_role("button", name=exp["collapse"]).first.click()
        inputs = form.locator("input[type=text]")
        check(f"{locale}: table unit has 10 blanks", inputs.count() == 10, str(inputs.count()))
        for i, letter in enumerate(POOL_DRAFTS):
            inputs.nth(i).fill(letter)
        form.locator("button[type=submit]").click()
        form.locator("text=/8 \\/ 10/").first.wait_for(timeout=10000)
        text = form.inner_text()
        score_line = exp["score"] or "8 / 10"
        check(f"{locale}: F in blanks 5, 7, 9 scores 8 / 10, not 10 / 10", score_line in text and "10 / 10" not in text)
        for owed in exp["owed"]:
            check(f"{locale}: missed blank shows the letter still owed: {owed}", owed in text)
        check(f"{locale}: repeated letter is explained", text.count(exp["repeat_note"]) == 2, str(text.count(exp["repeat_note"])))
        header = root.locator("div").first
        check(f"{locale}: header total counts 8", "8 / " in header.inner_text())
        shot_at(page, root, f"{locale}-01-pool-table-header-and-rule.png")
        shot_at(page, form.locator("input[type=text]").nth(6), f"{locale}-02-pool-blanks-7-to-9.png")
        page.close()

        # 2. A completion unit with its word limit.
        page, root = open_lesson(context, "sentence", locale, exp["sentence_title"])
        form = root.locator("form").first
        check(f"{locale}: sentence unit states the word limit", exp["sentence_intro"] in form.inner_text())
        root.get_by_role("button", name=exp["collapse"]).first.click()
        shot_at(page, root, f"{locale}-03-sentence-word-limit.png")
        page.close()
        context.close()
    browser.close()

(OUT / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
failed = [c for c in results["checks"] if not c["ok"]]
print(f"{len(results['checks']) - len(failed)} / {len(results['checks'])} checks passed")
sys.exit(1 if failed else 0)
