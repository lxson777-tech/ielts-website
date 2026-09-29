"""Journey D: the returning student. Sign in fresh from a lesson and land back there; the
forgot-password screen; a second device. Four combinations on the open site (4442/8842),
plus the same sign-in-from-a-lesson on the trial site (4441/8841) for an included lesson."""
import os
import sys

from playwright.sync_api import sync_playwright

from vh import (COMBOS, Run, body, click_until, fill_profile, fill_signin, fill_signup, lang_of, no_sideways, try_click,
                wait_for, wait_text)

OPEN = os.environ.get("J_OPEN", "http://localhost:4442/ielts-website")
OPEN_S = os.environ.get("J_OPEN_STANDIN", "http://127.0.0.1:8842")
TRIAL = os.environ.get("J_TRIAL", "http://localhost:4441/ielts-website")
TRIAL_S = os.environ.get("J_TRIAL_STANDIN", "http://127.0.0.1:8841")
R = Run("journey-d-returning", OPEN, OPEN_S)
LESSON = "/lessons/reading/paraphrase"


def make_account(browser, base, email):
    ctx, page = R.context(browser, "en", 1440, 900)
    page.goto(base + "/sign-up?next=/dashboard", wait_until="domcontentloaded")
    fill_signup(page, email)
    wait_for(page, lambda: "/sign-up" not in page.url, 20000)
    if "/profile" in page.url:
        fill_profile(page)
    page.wait_for_timeout(1500)
    ok = "/sign-up" not in page.url and "/profile" not in page.url
    ctx.close()
    return ok


def one(browser, lang, w, h):
    combo = f"{lang}-{w}"
    email = f"verify-d-{combo}-{R.stamp}@example.test"
    R.check(combo, "returning account exists (made in an earlier, closed browser)", make_account(browser, OPEN, email))

    # Sign in fresh from a lesson via Mr EZ's sign-in link, land back there
    ctx, page = R.context(browser, lang, w, h)
    R.base = OPEN
    R.goto(page, LESSON, 3500)
    opened = click_until(page, lambda: page.locator(".mrez-launcher"), lambda: page.locator("#mrez-panel.is-open").count() > 0)
    link = page.locator('#mrez-panel a[href*="/sign-in"]')
    R.check(combo, "lesson: Mr EZ panel offers Sign in to a signed-out student", opened and link.count() >= 1)
    R.shot(page, f"{combo}-01-lesson-signed-out-mrez")
    try_click(link)
    R.wait_route(page, lambda r: r == "/sign-in", 15000)
    page.wait_for_timeout(1200)
    R.check(combo, "sign-in page keeps the lesson as the next step and the language", "next=" in page.url and "paraphrase" in page.url and lang_of(page) == lang, page.url)
    ok, o = no_sideways(page)
    R.check(combo, "sign-in: no sideways scroll", ok, o)
    R.shot(page, f"{combo}-02-sign-in", full=True)
    fill_signin(page, email)
    back = R.wait_route(page, lambda r: r == LESSON, 25000)
    page.wait_for_timeout(2000)
    R.check(combo, "signed in and landed back on the lesson", back and lang_of(page) == lang, R.route(page))
    R.shot(page, f"{combo}-03-back-on-lesson")
    ctx.close()

    # Forgot password
    ctx, page = R.context(browser, lang, w, h)
    R.goto(page, "/sign-in", 2500)
    fp = page.locator('a[href*="/forgot-password"]')
    R.check(combo, "sign-in offers 'Forgot password?'", fp.count() >= 1)
    try_click(fp)
    R.wait_route(page, lambda r: r == "/forgot-password", 15000)
    page.wait_for_timeout(1200)
    R.check(combo, "forgot-password screen opens in the chosen language", R.route(page) == "/forgot-password" and lang_of(page) == lang)
    R.shot(page, f"{combo}-04-forgot-password", full=True)
    try:
        page.locator("#forgot-email").fill(email)
        try_click(page.locator("form button[type=submit]"))
        ok2 = wait_for(page, lambda: email in body(page), 20000)
        R.check(combo, "reset request: confirmation names the email, generic about account existence (local, no email really sent)", ok2, body(page)[:160])
    except Exception as e:  # noqa: BLE001
        R.check(combo, "reset request sent", False, str(e)[:150])
    R.shot(page, f"{combo}-05-reset-confirmation", full=True)
    ctx.close()

    # Second device: a separate browser process
    b2 = browser.browser_type.launch()
    ctx, page = R.context(b2, lang, w, h)
    R.goto(page, "/sign-in?next=/account", 2500)
    fill_signin(page, email)
    R.wait_route(page, lambda r: r == "/account", 25000)
    page.wait_for_timeout(2500)
    txt = body(page)
    R.check(combo, "second device: signed in, account shows the same person (name and email)", R.route(page) == "/account" and "Synthetic" in txt and email in txt, R.route(page))
    ok, o = no_sideways(page)
    R.check(combo, "account: no sideways scroll", ok, o)
    R.shot(page, f"{combo}-06-second-device-account", full=True)
    ctx.close()
    b2.close()


def trial_variant(browser):
    combo = "trial-en-1440"
    R.base = TRIAL
    R.standin_url = TRIAL_S
    email = f"verify-d-trial-{R.stamp}@example.test"
    R.check(combo, "trial-site account made", make_account(browser, TRIAL, email))
    ctx, page = R.context(browser, "en", 1440, 900, watch="trial-returning")
    R.goto(page, LESSON, 3500)
    si = page.locator('main a[href*="/sign-in"], #workspace-content a[href*="/sign-in"]')
    R.check(combo, "trial site, signed out, included lesson: covered with a Sign in link", si.count() >= 1 and not page.locator("[data-trial-protected]").first.is_visible() if page.locator("[data-trial-protected]").count() else si.count() >= 1)
    R.shot(page, f"{combo}-01-lesson-signed-out")
    try_click(si)
    R.wait_route(page, lambda r: r == "/sign-in", 15000)
    fill_signin(page, email)
    back = R.wait_route(page, lambda r: r == LESSON or r == "/trial", 25000)
    page.wait_for_timeout(2000)
    R.note(combo, f"after sign-in from the trial lesson, the student landed on {R.route(page)}")
    R.check(combo, "trial site: signed in from a lesson and returned to it (or to the trial start if no trial yet)", back, R.route(page))
    R.shot(page, f"{combo}-02-after-sign-in")
    ctx.close()


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        for lang, w, h in COMBOS:
            try:
                one(b, lang, w, h)
            except Exception as e:  # noqa: BLE001
                R.check(f"{lang}-{w}", "journey completed without an unexpected error", False, repr(e)[:300])
        try:
            trial_variant(b)
        except Exception as e:  # noqa: BLE001
            R.check("trial-en-1440", "trial variant completed", False, repr(e)[:300])
        b.close()
    R.base = OPEN
    passed, total = R.save()
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
