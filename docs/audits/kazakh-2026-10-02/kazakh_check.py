"""Builder K: Kazakh on the legal and buying pages, in a real browser.

Gated production build (PUBLIC_ACCESS_MODE=trial) served by `astro preview`,
pointed at the local stand-in (tools/mr-ez-dev-server.mjs --trial: SIMULATED
payments, no money, no AI provider). Synthetic @example.test account only.

  KK_BASE     the gated build  (default http://localhost:4475/ielts-website)

What it proves, each as a named check in results.json:
  device     a browser whose first language is Kazakh opens in Kazakh
  sales      the sales page, its KZ button and its price list in Kazakh
  pages      /plans, /terms, /privacy, /help, /sign-up show Kazakh, and the
             Help page's course answers fall back to Russian (not English)
  account    sign-up with the consent box, the profile form, then Account >
             Profile (Delete account, Download my data) and Access in Kazakh
  lesson     a lesson body is Russian for a Kazakh reader
  switch     the workspace's EN / RU / KZ switch changes the page to Kazakh,
             and English and Russian still read as before
  phone      every page above at 390 px wide with no sideways scroll
and zero uncaught page errors on every visit.
"""

import json
import os
import re
import time
import urllib.parse
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("KK_BASE", "http://localhost:4475/ielts-website")
HERE = Path(__file__).resolve().parent
SHOTS = HERE / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)
PASSWORD = "Synthetic-pass-2026"
HYDRATED = """() => [...document.querySelectorAll('astro-island[ssr]')].every(el => ['visible', 'media'].includes(el.getAttribute('client')))"""

results = []
page_errors = []


def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f"  ({detail})" if detail and not ok else ""), flush=True)
    return ok


def settle(page):
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_function(HYDRATED, timeout=45000)
    page.wait_for_function("() => !document.documentElement.classList.contains('i18n-pending')", timeout=10000)
    page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 400))))")


def visit(page, path, wait_text=None):
    page.goto(BASE + path, wait_until="domcontentloaded")
    settle(page)
    if wait_text:
        try:
            page.wait_for_function("(t) => document.body.innerText.includes(t)", arg=wait_text, timeout=20000)
        except Exception:  # noqa: BLE001
            pass


def text(page):
    return page.evaluate("() => document.body.innerText")


def shot(page, name, full=False):
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=full)


def no_sideways(page):
    return page.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1")


def watch(page, tag):
    page.on("pageerror", lambda e: page_errors.append({"tag": tag, "url": page.url, "error": str(e)[:400]}))


def context(browser, device_lang="kk-KZ", stored=None, w=1440, h=900):
    phone = w < 720
    ctx = browser.new_context(viewport={"width": w, "height": h}, locale=device_lang,
                              device_scale_factor=2 if phone else 1, is_mobile=phone, has_touch=phone)
    if stored:
        ctx.add_init_script(f"try{{ if (!sessionStorage.getItem('kk-seeded')) {{ localStorage.setItem('ielts.locale.v1','{stored}'); sessionStorage.setItem('kk-seeded','1') }} }}catch(e){{}}")
    return ctx


# Kazakh lines each page must show (from src/lib/i18n/dict/kk and sales-copy.ts).
KK_PAGES = {
    "/plans": ["Қарқынды жоғалтпаңыз.", "Бір ай", "Ақша қалай қайтарылады"],
    "/terms": ["Жария оферта", "Ақшаны қайтару", "Сатушы кім"],
    "/privacy": ["Кім жауап береді", "Сіздің құқықтарыңыз", "Деректерді тағы кім алады"],
    "/help": ["Ақшаны қайтаруға бола ма?", "Адамға жазу"],
    "/sign-up": ["Аккаунт ашыңыз", "Дербес деректерімнің"],
}
KAZAKH_LETTERS = re.compile(r"[әғқңөұүһі]", re.I)


with sync_playwright() as p:
    browser = p.chromium.launch()

    # ── A browser whose first language is Kazakh, nothing chosen yet ──────────
    ctx = context(browser, device_lang="kk-KZ")
    page = ctx.new_page()
    watch(page, "desktop-kk")
    visit(page, "/", wait_text="Болашағыңыздың")
    check("device: a Kazakh-first browser opens the sales page in Kazakh",
          page.evaluate("() => document.documentElement.lang") == "kk" and "Болашағыңыздың" in text(page))
    check("sales: the KZ button is pressed",
          page.locator('[data-lang-option="kk"]').get_attribute("aria-pressed") == "true")
    shot(page, "01-sales-kk-1440")
    page.locator("#pricing").scroll_into_view_if_needed()
    page.wait_for_timeout(800)
    # textContent, not innerText: the label is set in capitals by CSS.
    body = page.evaluate("() => document.body.textContent")
    check("sales: the price list is Kazakh, with the tenge price",
          "Практика және сүйемелдеу" in body and re.search(r"12\s990\s₸", body) is not None, body[:200])
    shot(page, "02-sales-pricing-kk-1440")

    for path, needles in KK_PAGES.items():
        visit(page, path, wait_text=needles[0])
        body = text(page)
        missing = [n for n in needles if n not in body]
        check(f"pages: {path} is in Kazakh", not missing, f"missing {missing}")
        if path == "/plans":
            check("pages: /plans prices in tenge, written the Kazakh or Russian way", re.search(r"12\s990\s₸", body) is not None)
        shot(page, f"03-{path.strip('/').replace('/', '-')}-kk-1440")

    visit(page, "/help", wait_text="Ақшаны қайтаруға")
    body = text(page)
    check("pages: /help course answers fall back to Russian, not English",
          "С чего начать?" in body and "Where do I start?" not in body)

    visit(page, "/terms", wait_text="Жария оферта")
    body = text(page)
    check("pages: /terms seller block and refund example are Kazakh", "Сатушы" in body and "Мысал" in body)
    shot(page, "04-terms-refunds-kk-1440", full=True)

    # ── Sign up and the profile, in Kazakh ────────────────────────────────────
    email = f"kk-check-{int(time.time())}@example.test"
    page.goto(BASE + "/sign-up?next=" + urllib.parse.quote("/account", safe=""), wait_until="domcontentloaded")
    settle(page)
    page.wait_for_selector("#signup-email", timeout=40000)
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    page.locator("#signup-confirm").fill(PASSWORD)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_timeout(600)
    body = text(page)
    check("account: sign-up refuses without consent, in Kazakh", "Аккаунт ашу үшін келісім белгісін қойыңыз." in body)
    page.locator("[data-testid=consent-details] summary").first.click()
    page.wait_for_timeout(300)
    body = text(page)
    check("account: the full consent wording is Kazakh",
          "Деректеріңізді кім өңдейді" in body and "Келісімді қалай кері қайтарып алуға болады" in body)
    shot(page, "05-sign-up-consent-kk-1440", full=True)
    page.locator("#signup-consent").check(force=True)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_selector("#profile-firstName", timeout=40000)
    settle(page)
    body = text(page)
    check("account: the profile form is Kazakh", "Аты" in body and "Туған күні" in body, body[:200])
    shot(page, "06-profile-kk-1440")
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
    page.wait_for_url(re.compile(r".*/account.*"), timeout=40000)
    settle(page)
    page.wait_for_function("() => document.body.innerText.includes('Аккаунтты жою')", timeout=20000)
    body = text(page)
    check("account: Account > Profile shows Delete account and Download my data in Kazakh",
          "Аккаунтты жою" in body and "Деректерімді жүктеп алу" in body)
    shot(page, "07-account-profile-kk-1440", full=True)
    if page.locator("#account-tab-access").count():
        page.locator("#account-tab-access").click()
        page.wait_for_timeout(800)
        body = text(page)
        check("account: Account > Access is Kazakh", "Қолжетімділігіңіз" in body or "Тегін аккаунт" in body, body[:300])
        shot(page, "08-account-access-kk-1440")

    visit(page, "/plans", wait_text="Бір ай")
    shot(page, "09-plans-signed-in-kk-1440")

    # ── A lesson reads Russian ────────────────────────────────────────────────
    visit(page, "/lessons/reading/tfng")
    try:
        page.wait_for_selector("[data-lesson-body][data-lesson-body-locale]", timeout=30000)
    except Exception:  # noqa: BLE001
        pass
    lesson_locale = page.evaluate("() => document.querySelector('[data-lesson-body]')?.getAttribute('data-lesson-body-locale')")
    lesson_text = page.evaluate("() => document.querySelector('[data-lesson-body]')?.innerText || ''")
    check("lesson: a lesson body is Russian for a Kazakh reader",
          lesson_locale == "ru" and re.search(r"[а-яё]{4,}", lesson_text, re.I) is not None, f"locale={lesson_locale}")
    shot(page, "10-lesson-ru-for-kk-1440")
    ctx.close()

    # ── The switch, from English, and English / Russian unchanged ─────────────
    ctx = context(browser, device_lang="en-GB", stored="en")
    page = ctx.new_page()
    watch(page, "switch")
    visit(page, "/terms", wait_text="Public offer")
    check("switch: English still reads English", "Public offer" in text(page) and "Жария оферта" not in text(page))
    labels = page.locator(".ws-lang-option").all_inner_texts()
    check("switch: the workspace offers EN / RU / KZ", [s.strip() for s in labels] == ["EN", "RU", "KZ"], str(labels))
    shot(page, "11-terms-en-1440")
    page.locator('.ws-lang-option[lang="ru"]').click()
    page.wait_for_function("() => document.body.innerText.includes('Публичная оферта')", timeout=20000)
    check("switch: Russian still reads Russian", "Публичная оферта" in text(page))
    page.locator('.ws-lang-option[lang="kk"]').click()
    page.wait_for_function("() => document.body.innerText.includes('Жария оферта')", timeout=20000)
    check("switch: pressing KZ turns the page Kazakh without a reload",
          page.evaluate("() => document.documentElement.lang") == "kk"
          and page.locator('.ws-lang-option[lang="kk"]').get_attribute("aria-pressed") == "true")
    shot(page, "12-terms-after-kz-switch-1440")
    visit(page, "/", wait_text="Болашағыңыздың")
    check("switch: the choice carries to the sales page", "Болашағыңыздың" in text(page))
    page.locator('[data-lang-option="en"]').click()
    page.wait_for_function("() => document.body.innerText.includes('Open the gates')", timeout=10000)
    page.locator('[data-lang-option="kk"]').click()
    page.wait_for_function("() => document.body.innerText.includes('Болашағыңыздың')", timeout=10000)
    check("switch: the sales page KZ button works", True)
    ctx.close()

    # ── Phone, 390 px ─────────────────────────────────────────────────────────
    ctx = context(browser, device_lang="kk-KZ", stored="kk", w=390, h=844)
    page = ctx.new_page()
    watch(page, "phone-kk")
    for i, path in enumerate(["/", "/plans", "/terms", "/privacy", "/help", "/sign-up", "/account", "/lessons/reading/tfng"]):
        visit(page, path)
        body = text(page)
        ok_wide = no_sideways(page)
        check(f"phone: {path} has no sideways scroll at 390 px", ok_wide,
              str(page.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")))
        if path not in ("/lessons/reading/tfng", "/account"):
            check(f"phone: {path} shows Kazakh", KAZAKH_LETTERS.search(body) is not None)
        shot(page, f"13-phone-{i:02d}-{path.strip('/').replace('/', '-') or 'sales'}-kk-390")
    ctx.close()
    browser.close()

check("no uncaught page errors on any visit", not page_errors, json.dumps(page_errors[:5], ensure_ascii=False))
(HERE / "results.json").write_text(json.dumps({"base": BASE, "results": results, "page_errors": page_errors}, indent=1, ensure_ascii=False), encoding="utf-8")
failed = [r for r in results if not r["ok"]]
print(f"\n{len(results) - len(failed)} of {len(results)} checks passed")
