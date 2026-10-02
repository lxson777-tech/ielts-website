"""Builder K: the OPEN build (today's live site) gets the Kazakh switch too.

Serves nothing itself: point KK_OPEN_BASE at `astro preview` of a build made
without PUBLIC_ACCESS_MODE (default http://localhost:4476/ielts-website).
Checks the EN / RU / KZ switch, Kazakh on /terms, /privacy and /help, a
lesson body read in Russian for a Kazakh reader, English and Russian as
before, and no page errors. Writes open-results.json next to this file.
"""

import json
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("KK_OPEN_BASE", "http://localhost:4476/ielts-website")
HERE = Path(__file__).resolve().parent
results, errors = [], []


def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f"  ({detail})" if detail and not ok else ""), flush=True)


def go(page, path, needle=None):
    page.goto(BASE + path, wait_until="domcontentloaded")
    if needle:
        try:
            page.wait_for_function("(t) => document.body.textContent.includes(t)", arg=needle, timeout=20000)
        except Exception:  # noqa: BLE001
            pass
    page.wait_for_timeout(800)
    return page.evaluate("() => document.body.textContent")


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(locale="en-GB")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append({"url": page.url, "error": str(e)[:300]}))
    body = go(page, "/terms", "Terms of use")
    check("open: English /terms is unchanged", "Terms of use" in body and "Пайдалану шарттары" not in body)
    labels = [s.strip() for s in page.locator(".ws-lang-option").all_inner_texts()]
    check("open: the switch offers EN / RU / KZ", labels == ["EN", "RU", "KZ"], str(labels))
    page.locator('.ws-lang-option[lang="ru"]').click()
    page.wait_for_function("() => document.body.textContent.includes('Условия использования')", timeout=20000)
    check("open: Russian /terms is as before", True)
    page.locator('.ws-lang-option[lang="kk"]').click()
    page.wait_for_function("() => document.body.textContent.includes('Пайдалану шарттары')", timeout=20000)
    check("open: KZ turns /terms Kazakh", True)
    page.screenshot(path=str(HERE / "shots" / "16-open-terms-kk-1440.png"))
    body = go(page, "/privacy", "Құпиялылық")
    check("open: /privacy is Kazakh", "Біз нені сұраймыз және не үшін" in body or "Олармен қандай сервистер жұмыс істейді" in body)
    page.screenshot(path=str(HERE / "shots" / "17-open-privacy-kk-1440.png"))
    body = go(page, "/help", "Адамға жазу")
    check("open: /help is Kazakh where translated, Russian elsewhere", "Адамға жазу" in body and "С чего начать?" in body)
    go(page, "/lessons/reading/tfng")
    try:
        page.wait_for_selector("[data-lesson-body][data-lesson-body-locale]", timeout=20000)
    except Exception:  # noqa: BLE001
        pass
    loc = page.evaluate("() => document.querySelector('[data-lesson-body]')?.getAttribute('data-lesson-body-locale')")
    lesson = page.evaluate("() => document.querySelector('[data-lesson-body]')?.innerText || ''")
    check("open: a lesson body is Russian for a Kazakh reader", loc == "ru" and re.search(r"[а-яё]{4,}", lesson, re.I) is not None, f"locale={loc}")
    page.screenshot(path=str(HERE / "shots" / "18-open-lesson-ru-for-kk-1440.png"))
    ctx.close()
    browser.close()

check("open: no uncaught page errors", not errors, json.dumps(errors[:3], ensure_ascii=False))
(HERE / "open-results.json").write_text(json.dumps({"base": BASE, "results": results, "page_errors": errors}, indent=1, ensure_ascii=False), encoding="utf-8")
print(f"{sum(r['ok'] for r in results)} of {len(results)} checks passed")
