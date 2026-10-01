"""The sales website under the free-account model (Alex, 1 October 2026),
clicked through in a real browser. Builder W.

What it proves, on a GATED build (the build whose front page is the sales
website):
  - the whole page scrolls in English and Russian at 1440x900, 390x844 and
    Russian at 320 wide with no sideways scroll, and the gates still open;
  - every call to action lands on sign-up, sign-in or the plans page, and no
    link anywhere on the page goes to /trial or to a lesson;
  - the pricing and the questions say: every lesson free with an account,
    practice and guidance paid, the price, no automatic renewal, no refunds
    after purchase;
  - the questionnaire's plan marks which days are free lessons, and its
    answers survive sign-up and the profile and arrive on the dashboard;
  - /terms, /privacy and /help read correctly in both languages.

It needs two servers that it does NOT start itself (both local, nothing is
billed, no real service is called):

  the free local backend in gated mode (the real migrations in PGlite, the
  real Workers with simulated replies, the payments Worker with its
  SIMULATED provider):
    MR_EZ_DEV_PORT=8651 MR_EZ_SITE_ORIGIN=http://127.0.0.1:4651 \
      node --import ./tests/ts-extension-loader.mjs tools/mr-ez-dev-server.mjs --trial

  the site, as a gated build pointed at it (as tools/offer-preview.ps1, with
  port 8651), served by `npx astro preview --host 127.0.0.1 --port 4651`.

Then: python tests/browser/w01_free_account_website.py
Screenshots go to W01_EVIDENCE (default: docs/paid-access/evidence/w01).
Every account is a synthetic @example.test address on the local backend.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from playwright.sync_api import sync_playwright

BASE = os.environ.get("W01_BASE_URL", "http://127.0.0.1:4651/ielts-website")
ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = Path(os.environ.get("W01_EVIDENCE", ROOT / "docs" / "paid-access" / "evidence" / "w01"))
EVIDENCE.mkdir(parents=True, exist_ok=True)
RUN = str(int(time.time()))
PASSWORD = "synthetic-pass-123"
PROFILE = {
    "first_name": "Synthetic",
    "last_name": "Visitor",
    "dob": ("4", "3", "2000"),
    "phone": "+7 701 234 56 78",
    "city": "Almaty",
    "occupation": "Synthetic University",
    "source": "friend",
}

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)
    return bool(ok)


def shot(page, name: str, full: bool = False):
    page.screenshot(path=str(EVIDENCE / f"{name}.png"), full_page=full)


def route_of(url: str) -> str:
    path = urlparse(url).path
    base = urlparse(BASE).path.rstrip("/")
    return path[len(base):] if path.startswith(base) else path


def set_locale(context, locale: str):
    context.add_init_script(f"try {{ localStorage.setItem('ielts.locale.v1', '{locale}'); }} catch (e) {{}}")


def open_sales(page):
    page.goto(BASE + "/", wait_until="domcontentloaded")
    # Ready: the language step has run (no pending class) and the
    # questionnaire's script has revealed its interactive parts.
    page.wait_for_selector("html:not(.i18n-pending) [data-next-chapter]", timeout=20000)
    page.wait_for_selector("[data-journey-interactive]:not([hidden])", state="attached", timeout=20000)


def scroll_whole_page(page, label: str) -> dict:
    """Scroll top to bottom in steps; record sideways overflow and the gates."""
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_function("window.scrollY === 0")
    gate_states = []
    worst = 0
    steps = 0
    while True:
        info = page.evaluate(
            """() => ({
                y: window.scrollY,
                h: document.documentElement.scrollHeight,
                vh: window.innerHeight,
                over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                gate: document.querySelector('[data-sc-stage]')?.dataset.scVerifyState || ''
            })"""
        )
        worst = max(worst, info["over"])
        gate_states.append(info["gate"])
        if info["y"] + info["vh"] >= info["h"] - 2 or steps > 80:
            break
        page.mouse.wheel(0, int(info["vh"] * 0.7))
        page.wait_for_function(f"window.scrollY > {info['y']} || window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2", timeout=5000)
        page.wait_for_timeout(120)  # one frame of the scroll-driven scene
        steps += 1
    gates = [int(s.split("gate:")[1].split(";")[0]) for s in gate_states if "gate:" in s]
    return {"overflow": worst, "steps": steps, "gate_max": max(gates) if gates else -1, "gate_first": gate_states[0]}


def all_links(page) -> list[dict]:
    return page.evaluate(
        """() => [...document.querySelectorAll('a[href]')].map(a => ({
            href: a.getAttribute('href'), text: (a.textContent || '').trim(),
            cta: a.matches('.button, .price-choose, .close-secondary, .workspace-link, .menu-sign-in, [data-signup-link], [data-buy-link]')
        }))"""
    )


def norm(s: str) -> str:
    """Russian numbers use non-breaking spaces (12 990); compare as plain spaces."""
    return s.replace(" ", " ").replace(" ", " ")


def text_of(page, selector: str) -> str:
    return norm(page.locator(selector).inner_text())


def fill_profile(page) -> bool:
    page.wait_for_selector("#profile-firstName", timeout=20000)
    page.locator("#profile-firstName").fill(PROFILE["first_name"])
    page.locator("#profile-lastName").fill(PROFILE["last_name"])
    d, m, y = PROFILE["dob"]
    page.locator("#profile-dob-day").select_option(d)
    page.locator("#profile-dob-month").select_option(m)
    page.locator("#profile-dob-year").select_option(y)
    page.locator("#profile-phone").fill(PROFILE["phone"])
    page.locator("#profile-city").fill(PROFILE["city"])
    page.locator("#profile-occupation").fill(PROFILE["occupation"])
    page.locator(f"#profile-source-{PROFILE['source']}").check(force=True)
    page.locator("form button[type=submit]").first.click()
    page.wait_for_function("!location.pathname.endsWith('/profile')", timeout=20000)
    return True


def run() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---------------------------------------------------------- English, desktop
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        set_locale(ctx, "en")
        page = ctx.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        open_sales(page)
        shot(page, "01-hero-en-1440")
        check("en 1440: hero says lessons are free with an account",
              "free with an account" in text_of(page, ".hero-copy").lower(), text_of(page, ".hero-copy").replace("\n", " "))
        header_cta = page.locator(".nav-actions [data-signup-link]")
        check("en 1440: header call to action is Create a free account",
              header_cta.inner_text().strip() == "Create a free account", header_cta.inner_text())
        scroll = scroll_whole_page(page, "en-1440")
        check("en 1440: whole page scrolls with no sideways scroll", scroll["overflow"] <= 0, str(scroll))
        check("en 1440: the gates open while scrolling", scroll["gate_max"] >= 90 and "gate:0" in scroll["gate_first"], str(scroll))

        page.locator("#pricing").scroll_into_view_if_needed()
        page.wait_for_timeout(400)
        shot(page, "02-pricing-en-1440")
        pricing = text_of(page, "#pricing")
        for phrase in ["Every lesson, free.", "Free account", "Every lesson for Reading, Listening, Writing and Speaking",
                       "Practice and guidance", "₸12,990", "for 30 days", "12 essay assessments and 6 recorded Speaking assessments",
                       "2 live interviews", "2 full mock exams and the placement test", "No automatic renewal",
                       "No refunds after purchase", "Get practice and guidance"]:
            check(f"en pricing says: {phrase}", phrase.lower() in pricing.lower())  # labels are capitalised by CSS
        buy = page.locator("#pricing [data-buy-link]")
        check("en pricing: Get practice and guidance goes to /plans (buying is on in this build)",
              buy.count() == 1 and route_of(buy.get_attribute("href")) == "/plans", buy.get_attribute("href") if buy.count() else "none")

        page.locator("#questions").scroll_into_view_if_needed()
        for d in page.locator("#questions details").all():
            d.locator("summary").click()
        page.wait_for_timeout(300)
        shot(page, "03-faq-en-1440", full=False)
        faq = text_of(page, "#questions")
        for phrase in ["What is free?", "Every lesson, with an account", "What is paid, and why?", "costs real money to run",
                       "30 days cost ₸12,990, paid once", "Does it renew automatically?", "never charged automatically",
                       "Can I get a refund?", "No. Payments are not refunded after purchase", "Academic IELTS",
                       "Do I need an account to read the lessons?", "Yes. Lessons open with a free account"]:
            check(f"en FAQ says: {phrase}", phrase in faq)
        body = page.locator("body").inner_text()
        check("en: no trial anywhere on the page", "trial" not in body.lower())

        links = all_links(page)
        bad = [l for l in links if "/trial" in l["href"] or "/learn" in l["href"] or "/lessons" in l["href"]]
        check("en: no link to /trial or to a lesson anywhere", not bad, str(bad))
        ctas = [l for l in links if l["cta"]]
        allowed = {"/sign-up", "/sign-in", "/plans"}
        wrong = [l for l in ctas if route_of(l["href"].split("?")[0]) not in allowed]
        check("en: every call to action lands on sign-up, sign-in or plans", ctas and not wrong,
              f"{len(ctas)} calls to action; " + "; ".join(sorted({l['text'] + ' -> ' + route_of(l['href']) for l in ctas})))
        page.locator("#close-title").scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        shot(page, "04-close-en-1440")

        # Following them: sign-up, sign-in, plans.
        for selector, expect in [(".nav-actions [data-signup-link]", "/sign-up"), (".nav-actions .workspace-link", "/sign-in"),
                                 (".close-card [data-signup-link]", "/sign-up"), (".close-card .close-secondary", "/sign-in"),
                                 ("#pricing .price-free [data-signup-link]", "/sign-up"), ("#pricing [data-buy-link]", "/plans")]:
            open_sales(page)
            page.locator(selector).first.scroll_into_view_if_needed()
            page.locator(selector).first.click()
            page.wait_for_function(f"location.pathname.endsWith('{expect}')", timeout=15000)
            ready = "#signup-email" if expect == "/sign-up" else "#signin-email" if expect == "/sign-in" else "main"
            page.wait_for_selector(ready, timeout=20000)
            check(f"en: {selector} opens {expect}", route_of(page.url) == expect, page.url)
        shot(page, "05-plans-from-pricing-en-1440")

        # ---------------------------------------------------------- the questionnaire
        open_sales(page)
        page.locator("#journey-band").scroll_into_view_if_needed()
        for name, value in [("band", "7.5"), ("skill", "writing"), ("focus", "method"), ("time", "30")]:
            # As a visitor does: press the answer's card. The page then glides
            # to the next question; the answer chip says it was taken.
            page.locator(f"label.journey-option:has(input[name={name}][value='{value}'])").click()
            page.wait_for_function(f"document.querySelector('[data-answer-chip={name}]').textContent.trim() !== ''", timeout=5000)
            page.wait_for_timeout(1800)  # the 1.45 s glide to the next question
        page.wait_for_selector("[data-plan-card]:not([hidden])", timeout=10000)
        page.locator("[data-plan-card]").scroll_into_view_if_needed()
        page.wait_for_timeout(1700)  # the questionnaire's own glide to the plan
        shot(page, "06-plan-en-1440")
        tags = [t.strip() for t in page.locator("[data-plan-access]").all_inner_texts()]
        check("en plan: day 1 is a free lesson, days 2 and 3 need practice and guidance",
              tags == ["Free lesson", "Practice and guidance", "Practice and guidance"], str(tags))
        action = text_of(page, ".journey-plan-action")
        check("en plan: ends in create a free account and start with these lessons",
              "Start with these lessons." in action and "Create a free account" in action, action.replace("\n", " "))
        href = page.locator(".journey-plan-action [data-signup-link]").get_attribute("href")
        nxt = unquote(parse_qs(urlparse(href).query).get("next", [""])[0])
        check("en plan: its sign-up link carries the four answers inside next",
              route_of(href.split("?")[0]) == "/sign-up" and nxt == "/dashboard?journey=1&band=7.5&skill=writing&focus=method&time=30", href)
        header_href = page.locator(".nav-actions [data-signup-link]").get_attribute("href")
        check("en plan: the header's sign-up link carries them too", header_href == href, header_href)
        signin_href = page.locator(".nav-actions .workspace-link").get_attribute("href")
        check("en plan: sign-in links stay plain", "journey" not in signin_href, signin_href)

        # Follow it: sign up, give the profile, land on the dashboard with the answers.
        seen: list[str] = []
        page.on("framenavigated", lambda f: seen.append(f.url) if f == page.main_frame else None)
        page.locator(".journey-plan-action [data-signup-link]").click()
        page.wait_for_selector("#signup-email", timeout=20000)
        email = f"w01-{RUN}@example.test"
        page.locator("#signup-email").fill(email)
        page.locator("#signup-password").fill(PASSWORD)
        if page.locator("#signup-confirm").count():
            page.locator("#signup-confirm").fill(PASSWORD)
        page.locator("form button[type=submit]").first.click()
        page.wait_for_function("!location.pathname.endsWith('/sign-up')", timeout=20000)
        on_profile = route_of(page.url) == "/profile"
        profile_next = unquote(parse_qs(urlparse(page.url).query).get("next", [""])[0])
        check("sign-up: goes on to the profile, still carrying the answers",
              on_profile and profile_next == "/dashboard?journey=1&band=7.5&skill=writing&focus=method&time=30", page.url)
        if on_profile:
            fill_profile(page)
        page.wait_for_function("location.pathname.endsWith('/dashboard')", timeout=20000)
        landed = [u for u in seen if route_of(u.split("?")[0]) == "/dashboard"]
        q = parse_qs(urlparse(landed[0]).query) if landed else {}
        check("after sign-up and profile: the dashboard opens with the questionnaire's answers",
              q.get("journey") == ["1"] and q.get("band") == ["7.5"] and q.get("skill") == ["writing"]
              and q.get("focus") == ["method"] and q.get("time") == ["30"], landed[0] if landed else str(seen))
        draft = page.evaluate("sessionStorage.getItem('ielts.journey.draft.v1')")
        check("after sign-up: the answers are also still in this tab's storage", draft is not None and '"band":"7.5"' in draft, str(draft))
        page.wait_for_timeout(1500)
        shot(page, "07-dashboard-after-signup-en-1440")
        check("en desktop: no page errors", not errors, "; ".join(errors[:3]))
        ctx.close()

        # ---------------------------------------------------------- English, phone
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        set_locale(ctx, "en")
        page = ctx.new_page()
        open_sales(page)
        shot(page, "08-hero-en-390")
        scroll = scroll_whole_page(page, "en-390")
        check("en 390: whole page scrolls with no sideways scroll", scroll["overflow"] <= 0, str(scroll))
        check("en 390: the gates open while scrolling", scroll["gate_max"] >= 90, str(scroll))
        page.locator("#pricing").scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        shot(page, "09-pricing-en-390")
        page.locator("#pricing .price-paid").scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        shot(page, "09b-pricing-paid-en-390")
        page.evaluate("window.scrollTo(0,0)")
        page.locator(".menu-toggle").click()
        page.wait_for_selector(".menu-toggle[aria-expanded=true]", timeout=5000)
        menu = [a.get_attribute("href") for a in page.locator("#chapter-nav a").all()]
        check("en 390: the menu has no lesson or trial link, and has Sign in",
              not any("/learn" in h or "/trial" in h for h in menu) and any(h.endswith("/sign-in") for h in menu), str(menu))
        shot(page, "10-menu-en-390")
        ctx.close()

        # ---------------------------------------------------------- Russian
        for width, height, tag in [(1440, 900, "1440"), (390, 844, "390"), (320, 700, "320")]:
            ctx = browser.new_context(viewport={"width": width, "height": height}, is_mobile=width < 768, has_touch=width < 768)
            set_locale(ctx, "ru")
            page = ctx.new_page()
            open_sales(page)
            shot(page, f"11-hero-ru-{tag}")
            check(f"ru {tag}: the page is in Russian", page.evaluate("document.documentElement.lang") == "ru"
                  and "все уроки ielts бесплатно с аккаунтом" in text_of(page, ".hero-copy").lower(), text_of(page, ".hero-copy").replace("\n", " "))
            scroll = scroll_whole_page(page, f"ru-{tag}")
            check(f"ru {tag}: whole page scrolls with no sideways scroll", scroll["overflow"] <= 0, str(scroll))
            check(f"ru {tag}: the gates open while scrolling", scroll["gate_max"] >= 90, str(scroll))
            page.locator("#pricing").scroll_into_view_if_needed()
            page.wait_for_timeout(300)
            shot(page, f"12-pricing-ru-{tag}")
            pricing = text_of(page, "#pricing")
            for phrase in ["Практика и сопровождение", "Бесплатный аккаунт", "12 990 ₸", "за 30 дней",
                           "Без автоматического продления", "После покупки деньги не возвращаются", "Подключить практику и сопровождение"]:
                check(f"ru {tag} pricing says: {phrase}", phrase.lower() in pricing.lower())
            if tag == "320":
                page.locator("#pricing .price-paid").scroll_into_view_if_needed()
                page.wait_for_timeout(300)
                shot(page, "12b-pricing-paid-ru-320")
                page.locator("#questions").scroll_into_view_if_needed()
                for d in page.locator("#questions details").all()[:6]:
                    d.locator("summary").click()
                page.wait_for_timeout(300)
                shot(page, "13-faq-ru-320", full=False)
                faq = text_of(page, "#questions")
                for phrase in ["Что бесплатно?", "Что платно и почему?", "30 дней стоят", "Продлевается ли доступ автоматически?",
                               "Нет. После покупки деньги не возвращаются", "Нужен ли аккаунт, чтобы читать уроки?"]:
                    check(f"ru 320 FAQ says: {phrase}", phrase in faq)
                over = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                check("ru 320: no sideways scroll with the questions open", over <= 0, str(over))
                header = page.locator(".nav-actions [data-signup-link]")
                box = header.bounding_box()
                check("ru 320: the header's sign-up button fits the screen", box is not None and box["x"] + box["width"] <= 320, str(box))
            body = page.locator("body").inner_text().lower()
            check(f"ru {tag}: no trial on the page", "пробный период" not in body and "пробного периода" not in body and "trial" not in body)
            ctx.close()

        # ---------------------------------------------------------- terms, privacy, help
        expectations = {
            "en": {
                "/terms": ["Your free account", "Every lesson is free", "Lessons open once you are signed in to a free account",
                           "Practice and guidance cost 12,990 KZT for 30 days, paid once", "Nothing renews",
                           "Payments are not refunded after purchase", "12 essay assessments, 6 recorded Speaking assessments",
                           "2 full mock exams", "The placement test, once per account"],
                "/privacy": ["The trial is no longer offered, so no new trial records are made",
                             "How many of the included assessments you have used", "If the person who runs the site gives you free access"],
                "/help": ["What is free, and what is paid?", "How do I get practice and guidance?"],
            },
            "ru": {
                "/terms": ["Ваш бесплатный аккаунт", "Все уроки бесплатны", "Практика и сопровождение стоят 12 990 тенге за 30 дней",
                           "После покупки деньги не возвращаются", "12 проверок эссе"],
                "/privacy": ["Пробный период больше не предлагается"],
                "/help": ["Что бесплатно, а что платно?", "Как подключить практику и сопровождение?"],
            },
        }
        for locale, pages in expectations.items():
            for width in (1440, 390):
                ctx = browser.new_context(viewport={"width": width, "height": 900 if width > 400 else 844})
                set_locale(ctx, locale)
                page = ctx.new_page()
                for path, phrases in pages.items():
                    page.goto(BASE + path, wait_until="domcontentloaded")
                    page.wait_for_selector("html:not(.i18n-pending) h1", timeout=20000)
                    for d in page.locator("details").all():
                        try:
                            d.locator("summary").click(timeout=2000)
                        except Exception:
                            pass
                    if locale == "ru":
                        page.wait_for_function("document.documentElement.lang === 'ru'", timeout=10000)
                        page.wait_for_function(f"document.body.innerText.includes({phrases[0]!r})", timeout=15000)
                    text = norm(page.locator("body").inner_text())
                    for phrase in phrases:
                        check(f"{locale} {width} {path} says: {phrase[:60]}", phrase in text)
                    if path != "/privacy":
                        check(f"{locale} {width} {path}: no trial", "trial" not in text.lower() and "пробный период" not in text.lower())
                    over = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                    check(f"{locale} {width} {path}: no sideways scroll", over <= 0, str(over))
                    shot(page, f"20-{path.strip('/')}-{locale}-{width}", full=True)
                ctx.close()

        browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)} passed, {len(failed)} failed")
    (EVIDENCE / "results.md").write_text(
        "\n".join(("PASS " if ok else "FAIL ") + name + (f"  [{d}]" if d else "") for name, ok, d in results) + "\n", encoding="utf-8")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(run())
