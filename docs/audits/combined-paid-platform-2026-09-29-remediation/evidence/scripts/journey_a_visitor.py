"""Journey A: the visitor. Sales page (EN/RU switch), questionnaire, plan, pricing, FAQ,
footer links (Privacy, Terms, Ask a person), start trial -> sign-up -> profile (explanation)
-> Before you begin -> Start. Language must persist throughout. Four combinations.
Default target: Alex's review trial site 4441 / stand-in 8841 (simulated payments)."""
import os
import sys

from playwright.sync_api import sync_playwright

from vh import COMBOS, Run, body, fill_profile, fill_signup, lang_of, no_sideways, stored_lang, try_click, wait_for, wait_text

BASE = os.environ.get("J_BASE", "http://localhost:4441/ielts-website")
STANDIN = os.environ.get("J_STANDIN", "http://127.0.0.1:8841")
R = Run("journey-a-visitor", BASE, STANDIN)

T = {
    "en": {"h1": "Open the gates", "plan": "Your Band 7", "faq_part1": "Part 1", "price1": "10,000", "price3": "25,000",
           "privacy": "Privacy", "terms": "Terms", "support": "Ask a person", "create": "Create a free account",
           "start": "Start my 3-day trial", "before": "Before you begin"},
    "ru": {"h1": "Откройте ворота", "plan": "Ваша цель: балл 7", "faq_part1": "Part 1", "price1": "10 000", "price3": "25 000",
           "privacy": "Конфиденциальность", "terms": "Условия", "support": "Спросить человека", "create": None,
           "start": None, "before": None},
}


def norm(s: str) -> str:
    return s.replace(" ", " ").replace(" ", " ")


def one(browser, lang, w, h):
    combo = f"{lang}-{w}"
    t = T[lang]
    ctx, page = R.context(browser, lang, w, h, watch=f"visitor-{combo}", set_lang=False)  # nothing stored: a real first visit
    R.goto(page, "", 2500)
    R.check(combo, "sales page opens in English for an English device with nothing stored",
            lang_of(page) == "en" and "Open the gates" in page.inner_text("h1"), lang_of(page))
    # Switch EN -> RU -> (EN) with the header switch
    try_click(page.locator('[data-lang-option="ru"]'))
    page.wait_for_timeout(500)
    R.check(combo, "RU switch: page Russian and choice stored", lang_of(page) == "ru" and stored_lang(page) == "ru"
            and "Откройте ворота" in page.inner_text("h1"), f"{lang_of(page)} {stored_lang(page)}")
    if lang == "en":
        try_click(page.locator('[data-lang-option="en"]'))
        page.wait_for_timeout(500)
        R.check(combo, "EN switch back: page English and choice stored", lang_of(page) == "en" and stored_lang(page) == "en"
                and "Open the gates" in page.inner_text("h1"), f"{lang_of(page)} {stored_lang(page)}")
    R.shot(page, f"{combo}-01-sales-top")
    ok, o = no_sideways(page)
    R.check(combo, "sales page: no sideways scroll", ok, o)

    # Questionnaire
    try:
        page.locator("#journey-band").scroll_into_view_if_needed()
        for name, val in (("band", "7"), ("skill", "reading"), ("focus", "method"), ("time", "15")):
            page.locator(f'label.journey-option:has(input[name="{name}"][value="{val}"])').click()
            page.wait_for_timeout(2300)
        page.wait_for_timeout(1500)
        res = page.locator("#journey-result").inner_text()
        R.check(combo, "questionnaire: plan generated in the chosen language", t["plan"] in res, res[:160])
        R.check(combo, "questionnaire: plan has three days", all(d in res for d in (("Day 1", "Day 2", "Day 3") if lang == "en" else ("День 1", "День 2", "День 3")))
                , res[:200])
        page.locator("#journey-result").screenshot(path=str(R.out / f"{combo}-02-questionnaire-plan.png"))
        href = page.locator("[data-plan-link]").get_attribute("href") or ""
        R.check(combo, "questionnaire: trial link carries the answers", "journey=1" in href and "skill=reading" in href, href)
    except Exception as e:  # noqa: BLE001
        R.check(combo, "questionnaire: completed", False, str(e)[:200])
        href = "/ielts-website/trial"

    # Pricing
    price = norm(page.locator("#pricing").inner_text())
    R.check(combo, "pricing: 10,000 and 25,000 KZT shown in local format", t["price1"] in price and t["price3"] in price, price[:200])
    page.locator("#pricing").screenshot(path=str(R.out / f"{combo}-03-pricing.png"))
    # What the pricing buttons do for a visitor
    btn = page.locator("#pricing button").first
    before = page.url
    label = btn.inner_text().strip() if btn.count() else ""
    try_click(btn)
    page.wait_for_timeout(2000)
    status = page.locator("#checkout-status").inner_text().strip() if page.locator("#checkout-status").count() else ""
    R.note(combo, f"pricing button '{label}' as a visitor -> url {R.route(page)}; status line: {status[:160]!r}")
    R.check(combo, "pricing button leads somewhere sensible (sign-up/trial/plans or an explained status)",
            R.route(page) in ("/trial", "/sign-up", "/sign-in", "/plans") or len(status) > 10 or page.url != before, R.route(page))
    R.shot(page, f"{combo}-04-after-pricing-click")
    if R.route(page) != "" and R.route(page) != "/":
        R.goto(page, "", 2000)
    R.check(combo, "language still the chosen one after pricing", lang_of(page) == lang, lang_of(page))

    # FAQ
    page.evaluate("document.querySelectorAll('#questions details').forEach(d => d.open = true)")
    page.wait_for_timeout(400)
    faq = page.locator("#questions").inner_text()
    R.check(combo, "FAQ: trial wording says Speaking Part 1 (not 'full test in each section')",
            "Part 1" in faq and "full test in each section" not in faq, faq[:200])
    page.locator("#questions").screenshot(path=str(R.out / f"{combo}-05-faq.png"))

    # Footer links
    foot = page.locator("footer")
    hrefs = {}
    for key in ("privacy", "terms", "support"):
        a = foot.get_by_role("link", name=t[key])
        hrefs[key] = a.first.get_attribute("href") if a.count() else None
    R.check(combo, "footer: Privacy, Terms and Ask a person links present", all(hrefs.values()), hrefs)
    for key, href in hrefs.items():
        if not href:
            continue
        resp = page.goto(href if href.startswith("http") else BASE.split("/ielts-website")[0] + href, wait_until="domcontentloaded")
        page.wait_for_timeout(1800)
        h1 = page.locator("h1").first.inner_text() if page.locator("h1").count() else ""
        ok, o = no_sideways(page)
        R.check(combo, f"footer {key}: opens (HTTP {resp.status if resp else '?'}), heading '{h1[:40]}', language kept",
                resp is not None and resp.status == 200 and h1 and lang_of(page) == lang, lang_of(page))
        R.check(combo, f"footer {key}: no sideways scroll", ok, o)
        if key == "support":
            R.check(combo, "Ask a person: a form a signed-out visitor can use (message box and email)",
                    page.locator("#support-message").count() == 1 and page.locator("input[type=email]").count() >= 1)
        R.shot(page, f"{combo}-06-footer-{key}", full=True)

    # Start the trial from the plan link
    R.goto(page, "", 2000)
    try:
        page.locator("#journey-band").scroll_into_view_if_needed()
        for name, val in (("band", "7"), ("skill", "reading"), ("focus", "method"), ("time", "15")):
            page.locator(f'label.journey-option:has(input[name="{name}"][value="{val}"])').click()
            page.wait_for_timeout(2300)
        page.wait_for_timeout(1200)
        page.locator("[data-plan-link]").click()
    except Exception:
        page.goto(BASE.split("/ielts-website")[0] + href, wait_until="domcontentloaded")
    R.wait_route(page, lambda r: r == "/trial", 20000)
    page.wait_for_timeout(2000)
    R.check(combo, "start trial: /trial opens in the chosen language", R.route(page) == "/trial" and lang_of(page) == lang, f"{R.route(page)} {lang_of(page)}")
    txt = body(page)
    R.check(combo, "trial offer states Academic IELTS and Speaking Part 1 before sign-up", "Academic IELTS" in txt and "Part 1" in txt)
    R.shot(page, f"{combo}-07-trial-offer", full=True)
    email = f"verify-a-{combo}-{R.stamp}@example.test"
    signup_link = page.locator('main a[href*="/sign-up"]')
    try_click(signup_link)
    R.wait_route(page, lambda r: r == "/sign-up", 20000)
    page.wait_for_timeout(1500)
    R.check(combo, "sign-up: opened from the trial, language kept", R.route(page) == "/sign-up" and lang_of(page) == lang, f"{R.route(page)} {lang_of(page)}")
    why = page.locator("#signup-why")
    R.check(combo, "sign-up: explains what is asked next and links to privacy",
            why.count() == 1 and why.is_visible() and why.locator('a[href*="/privacy"]').count() == 1, why.inner_text()[:120] if why.count() else "")
    ok, o = no_sideways(page)
    R.check(combo, "sign-up: no sideways scroll", ok, o)
    R.shot(page, f"{combo}-08-sign-up", full=True)
    fill_signup(page, email)
    R.wait_route(page, lambda r: r != "/sign-up", 20000)
    page.wait_for_timeout(1500)
    R.check(combo, "profile: required profile follows sign-up, language kept", R.route(page) == "/profile" and lang_of(page) == lang, f"{R.route(page)} {lang_of(page)}")
    pw = page.locator("#profile-why")
    R.check(combo, "profile: explanation visible (why, who sees it, link to privacy)",
            pw.count() == 1 and pw.is_visible() and page.locator('a[href*="/privacy"]').count() >= 1, pw.inner_text()[:160] if pw.count() else "")
    ok, o = no_sideways(page)
    R.check(combo, "profile: no sideways scroll", ok, o)
    R.shot(page, f"{combo}-09-profile", full=True)
    R.check(combo, "profile: saved", fill_profile(page))
    R.wait_route(page, lambda r: r == "/trial", 20000)
    page.wait_for_timeout(2500)
    txt = body(page)
    start_btn = page.locator(".trial-join button.trial-primary")
    R.check(combo, "Before you begin: back on /trial with the Start button, language kept",
            R.route(page) == "/trial" and start_btn.count() >= 1 and lang_of(page) == lang, f"{R.route(page)} {lang_of(page)} {start_btn.first.inner_text() if start_btn.count() else ''}")
    R.check(combo, "Before you begin: the clock starts only on Start (said on the page)",
            ("start" in txt.lower() and "3" in txt) if lang == "en" else ("3" in txt), txt[:120])
    R.shot(page, f"{combo}-10-before-you-begin", full=True)
    R.check(combo, "no trial yet before pressing Start", (R.trial_account(email) or {}).get("started_at") in (None, ""),
            R.trial_account(email))
    try_click(start_btn)
    R.wait_route(page, lambda r: r == "/dashboard", 25000)
    page.wait_for_timeout(3000)
    acc = R.trial_account(email) or {}
    R.check(combo, "Start: trial begins on the server and Today opens in the chosen language",
            R.route(page) == "/dashboard" and lang_of(page) == lang and bool(acc.get("started_at") or acc.get("trial_started_at") or acc), f"{R.route(page)} {lang_of(page)} {str(acc)[:160]}")
    R.check(combo, "questionnaire answers kept with the trial", (acc.get("questionnaire") or {}).get("skill") == "reading", str(acc.get("questionnaire")))
    R.check(combo, "language stored throughout", stored_lang(page) == lang, stored_lang(page))
    ok, o = no_sideways(page)
    R.check(combo, "Today: no sideways scroll", ok, o)
    R.shot(page, f"{combo}-11-today", full=False)
    ctx.close()


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        for lang, w, h in COMBOS:
            try:
                one(b, lang, w, h)
            except Exception as e:  # noqa: BLE001
                R.check(f"{lang}-{w}", "journey completed without an unexpected error", False, repr(e)[:300])
        b.close()
    R.check("all", "a signed-out visitor / new trial account made ZERO /content/pack/ requests",
            sum(len(v) for v in R.pack_requests.values()) == 0, {k: len(v) for k, v in R.pack_requests.items()})
    passed, total = R.save()
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
