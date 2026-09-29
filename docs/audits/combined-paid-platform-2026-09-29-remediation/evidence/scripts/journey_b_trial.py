"""Journey B: the trial student. Today (suggested three days, links work), Tests main buttons
(fresh / resumed after refresh / submitted / after rewind ended), Practice labels before the
click, a locked lesson, Mr EZ allowance, the ended state with Ask a person reachable, /plans.
Four combinations, every branch in each. Default target 4441 / 8841."""
import os
import sys

from playwright.sync_api import sync_playwright

from vh import (COMBOS, Run, body, click_until, fill_answers, fill_profile, fill_signup, lang_of, no_sideways, try_click,
                wait_for, wait_text)

BASE = os.environ.get("J_BASE", "http://localhost:4441/ielts-website")
STANDIN = os.environ.get("J_STANDIN", "http://127.0.0.1:8841")
R = Run(os.environ.get("J_NAME", "journey-b-trial"), BASE, STANDIN)
LOCKED = ("Available with full access", "Доступно с полным доступом")


def dest(page, section):
    return page.evaluate(f"() => {{ const e = document.querySelector('[data-trial-section={section}]'); return e ? [e.dataset.trialDestination, e.textContent.trim(), e.getAttribute('href')] : null; }}")


def tests_page(page):
    R.goto(page, "/tests", 1500)
    try:
        page.wait_for_function("() => { const e = document.querySelector('[data-trial-section=reading]'); return e && e.dataset.trialDestination && e.dataset.trialDestination !== 'wait'; }", timeout=25000)
    except Exception:
        pass


def click_main(page, section):
    before = page.url
    try_click(page.locator(f'[data-trial-section="{section}"]'))
    try:
        page.wait_for_url(lambda u: u != before, timeout=15000)
    except Exception:
        pass
    page.wait_for_timeout(1000)
    return R.route(page)


def one(browser, lang, w, h):
    combo = f"{lang}-{w}"
    ru = lang == "ru"
    ctx, page = R.context(browser, lang, w, h, watch=f"trial-{combo}")
    email = f"verify-b-{combo}-{R.stamp}@example.test"
    # Account + trial with the questionnaire's answers
    R.goto(page, "/trial?journey=1&band=7&skill=reading&focus=method&time=15", 2000)
    try_click(page.locator('main a[href*="/sign-up"]'))
    R.wait_route(page, lambda r: r == "/sign-up")
    fill_signup(page, email)
    R.wait_route(page, lambda r: r != "/sign-up")
    if R.route(page) == "/profile":
        fill_profile(page)
    R.wait_route(page, lambda r: r == "/trial")
    page.wait_for_timeout(2000)
    click_until(page, lambda: page.locator(".trial-join button.trial-primary"), lambda: R.route(page) == "/dashboard")
    R.wait_route(page, lambda r: r == "/dashboard", 25000)
    R.check(combo, "trial started, Today open", R.route(page) == "/dashboard" and R.trial_account(email) is not None)

    # ── Today: suggested three days ──
    R.goto(page, "/dashboard", 3000)
    wait_for(page, lambda: page.locator("details.trial-routine").count() > 0, 15000)
    R.shot(page, f"{combo}-01-today-first-screen")
    try_click(page.locator("details.trial-routine > summary"))
    page.wait_for_timeout(500)
    days = page.locator(".trial-routine-days li")
    hrefs = [days.nth(i).locator("a").first.get_attribute("href") for i in range(days.count())]
    R.check(combo, "Today: three suggested days, linking only to included Reading material", days.count() == 3 and hrefs == [
        "/ielts-website/lessons/reading/paraphrase", "/ielts-website/lessons/reading/paraphrase", "/ielts-website/tests/reading-full-001"], hrefs)
    R.shot(page, f"{combo}-02-today-routine-open", full=True)
    ok, o = no_sideways(page)
    R.check(combo, "Today: no sideways scroll", ok, o)
    for i in range(min(3, days.count())):
        R.goto(page, "/dashboard", 2500)
        try_click(page.locator("details.trial-routine > summary"))
        page.wait_for_timeout(400)
        try_click(page.locator(".trial-routine-days li").nth(i).locator("a"))
        page.wait_for_timeout(3500)
        r = R.route(page)
        locked = any(x in body(page) for x in LOCKED)
        R.check(combo, f"Today: day {i + 1} link opens an included page, not a lock", r == hrefs[i].replace("/ielts-website", "") and not locked, r)

    # ── Tests page, fresh ──
    tests_page(page)
    d = dest(page, "reading")
    R.check(combo, "Tests fresh: Reading main button = start the included test", d and d[0] == "start", d)
    R.shot(page, f"{combo}-03-tests-fresh")
    ok, o = no_sideways(page)
    R.check(combo, "Tests: no sideways scroll", ok, o)
    for sec, want in (("reading", "/tests/reading-full-001"), ("listening", "/tests/listening-full-001"), ("writing", "/writing/checker"), ("speaking", "/speaking/examiner")):
        tests_page(page)
        r = click_main(page, sec)
        R.check(combo, f"Tests fresh: {sec} main button opens {want}", r == want, r)
        if sec == "reading":
            R.check(combo, "Tests fresh: the Reading paper it opened is not locked", not any(x in body(page) for x in LOCKED))

    # ── Practice labels before the click ──
    R.goto(page, "/trainers", 2500)
    lab = LOCKED[1] if ru else LOCKED[0]
    n = page.locator('[data-access-copy="trial"]').get_by_text(lab).count()
    R.check(combo, "Practice: every trainer labelled full access before the click", n == 4, n)
    R.check(combo, "Practice: no trainer start link visible to a trial account",
            all(not page.locator(f'a[href$="/trainers/{s}"]').first.is_visible() for s in ("reading", "listening", "writing", "speaking") if page.locator(f'a[href$="/trainers/{s}"]').count()))
    R.shot(page, f"{combo}-04-practice", full=True)
    ok, o = no_sideways(page)
    R.check(combo, "Practice: no sideways scroll", ok, o)

    # ── A locked lesson ──
    R.goto(page, "/lessons/reading/tfng", 4000)
    txt = body(page)
    R.check(combo, "locked lesson: calm lock with the reason and View plans", any(x in txt for x in LOCKED)
            and page.locator('a[href*="/plans"]').count() > 0)
    R.shot(page, f"{combo}-05-locked-lesson")

    # ── Mr EZ allowance ──
    R.goto(page, "/lessons/reading/paraphrase", 3500)
    opened = click_until(page, lambda: page.locator(".mrez-launcher, .ws-dock-mrez, [data-mrez-open]"), lambda: page.locator("#mrez-panel.is-open").count() > 0)
    note = page.locator(".mrez-trial-note").first.inner_text() if page.locator(".mrez-trial-note").count() else ""
    R.check(combo, "Mr EZ: panel opens and shows the trial allowance (5 in this section)", opened and "5" in note, note)
    if opened:
        try:
            page.locator("#mrez-input").fill("What does paraphrase mean in IELTS Reading?")
            page.locator(".mrez-send").click()
            page.wait_for_timeout(4000)
            note2 = page.locator(".mrez-trial-note").first.inner_text() if page.locator(".mrez-trial-note").count() else ""
            R.check(combo, "Mr EZ: after one message the allowance counts down (SIMULATED reply)", "4" in note2, note2)
        except Exception as e:  # noqa: BLE001
            R.check(combo, "Mr EZ: message sent", False, str(e)[:150])
    R.shot(page, f"{combo}-06-mrez-allowance")

    # ── Tests: resumed after refresh, then submitted ──
    R.goto(page, "/tests/reading-full-001", 2500)
    started = click_until(page, lambda: page.get_by_role("button", name="Начать тест" if ru else "Start test"),
                          lambda: len(R.usage(email, "test", "reading")) > 0)
    R.check(combo, "Reading test begun on the server", started)
    page.wait_for_timeout(1500)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(3000)
    tests_page(page)
    d = dest(page, "reading")
    R.check(combo, "Tests after refresh: Reading main button resumes the sitting", d and d[0] == "resume", d)
    R.shot(page, f"{combo}-07-tests-resume")
    r = click_main(page, "reading")
    R.check(combo, "resume goes to the same paper, one reservation", r == "/tests/reading-full-001" and len(R.usage(email, "test", "reading")) == 1, r)
    page.wait_for_timeout(2500)
    fill_answers(page)
    sub = "Отправить" if ru else "Submit"
    try_click(page.get_by_role("button", name=sub))
    page.wait_for_timeout(1500)
    if page.locator('[role="alert"]').count():
        try_click(page.locator('[role="alert"]').get_by_role("button", name=sub))
    page.wait_for_timeout(3500)
    R.check(combo, "submitted: settled on the server", len(R.usage(email, "test", "reading", "settled")) == 1)
    R.shot(page, f"{combo}-08-reading-result")
    tests_page(page)
    d = dest(page, "reading")
    R.check(combo, "Tests after submit: Reading main button = see results", d and d[0] == "used", d)
    r = click_main(page, "reading")
    R.check(combo, "used: goes to results (/report)", r == "/report", r)
    R.shot(page, f"{combo}-09-tests-used-to-report")

    # ── Ended (rewind 3 days) ──
    R.standin("/__trial/rewind", {"email": email, "minutes": 4320})
    tests_page(page)
    try:
        page.wait_for_function("() => document.querySelector('[data-trial-section=listening]')?.dataset.trialDestination === 'ended'", timeout=20000)
    except Exception:
        pass
    dl, dr = dest(page, "listening"), dest(page, "reading")
    R.check(combo, "ended: Listening (never begun) offers the plans", dl and dl[0] == "ended", dl)
    R.check(combo, "ended: used Reading still leads to results", dr and dr[0] == "used", dr)
    R.shot(page, f"{combo}-10-tests-ended")
    r = click_main(page, "listening")
    R.check(combo, "ended: Listening main button goes to /plans", r == "/plans", r)
    R.goto(page, "/dashboard", 3500)
    txt = body(page)
    R.check(combo, "ended Today: says the trial has ended", ("trial has ended" in txt) or ("пробный период закончился" in txt.lower()) or ("завершил" in txt.lower()), txt[:200])
    sup = page.locator('a[href*="/support"]')
    vis = [sup.nth(i) for i in range(sup.count()) if sup.nth(i).is_visible()]
    R.check(combo, "ended Today: Ask a person / Report a problem is reachable", len(vis) > 0, [v.inner_text() for v in vis])
    R.shot(page, f"{combo}-11-today-ended", full=True)
    if vis:
        vis[0].click()
        R.wait_route(page, lambda r: r == "/support", 15000)
        page.wait_for_timeout(2000)
        R.check(combo, "ended: the support form opens for the signed-in student",
                R.route(page) == "/support" and page.locator("#support-message").count() == 1 and lang_of(page) == lang, R.route(page))
        R.shot(page, f"{combo}-12-support-from-ended", full=True)
    R.goto(page, "/lessons/reading/paraphrase", 3500)
    R.check(combo, "ended: the included lesson is now locked calmly", any(x in body(page) for x in LOCKED) or "trial has ended" in body(page) or "Пробный период закончился" in body(page))
    R.shot(page, f"{combo}-12b-lesson-after-trial-ended")
    # /plans
    R.goto(page, "/plans", 3500)
    txt = body(page).replace(" ", " ").replace(" ", " ")
    R.check(combo, "/plans: approved prices", ("10,000" in txt and "25,000" in txt) or ("10 000" in txt and "25 000" in txt), txt[:160])
    buy = page.get_by_role("button", name="Купить один месяц" if ru else "Buy one month")
    notconn = "Payment not connected yet" in txt or "Оплата пока не подключена" in txt
    R.note(combo, f"/plans after the trial ended: buy button {'present' if buy.count() else 'absent'}{', enabled' if buy.count() and buy.first.is_enabled() else ''}; 'not connected' text {'present' if notconn else 'absent'}")
    R.check(combo, "/plans: the ended student can buy (simulated payments on this server) or is told plainly why not",
            (buy.count() == 1 and buy.first.is_enabled()) or notconn)
    ok, o = no_sideways(page)
    R.check(combo, "/plans: no sideways scroll", ok, o)
    R.shot(page, f"{combo}-13-plans-ended", full=True)
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
    R.check("all", "trial accounts made ZERO /content/pack/ requests", sum(len(v) for v in R.pack_requests.values()) == 0,
            {k: len(v) for k, v in R.pack_requests.items()})
    passed, total = R.save()
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
