"""Journey C: the paying student (SIMULATED provider, no money moves).
From the trial: buy one month on /plans -> simulated /__pay -> Pay -> /plans/return -> Today full;
previously locked lesson, Writing checker full choice, cue cards, model answer, band guide, a focused
exercise, vocabulary review, placement start; account "Your access" with history and receipt; buy
three months extends; a SECOND fresh browser signs in and is paid; Fail and Cancel on new orders;
interrupted purchase (open /__pay then go back) -> pending with Check again; refund locks again;
expire -> "ended on", results kept. Trial / signed-out contexts must make zero /content/pack/ requests.
Default target: verifier's fresh gated build 4492 / 8492 (see VERIFICATION.md for why not 4441)."""
import json
import os
import re
import sys
from datetime import datetime, timedelta

from playwright.sync_api import sync_playwright

from vh import (COMBOS, Run, body, click_until, fill_profile, fill_signin, fill_signup, lang_of, no_sideways, try_click,
                wait_for, wait_text)

BASE = os.environ.get("J_BASE", "http://localhost:4492/ielts-website")
STANDIN = os.environ.get("J_STANDIN", "http://127.0.0.1:8492")
R = Run(os.environ.get("J_NAME", "journey-c-paying"), BASE, STANDIN)
LOCKED = ("Available with full access", "Доступно с полным доступом", "Your full access has ended", "Ваш полный доступ закончился")
W = {
    "en": {"buy1": "Buy one month", "buy3": "Buy three months", "in": "You’re in.", "full": "Full access until",
           "today": "Go to Today", "fail": "Payment was not completed", "cancel": "You cancelled the payment",
           "unfinished": "You have an unfinished purchase", "check": "Check again", "access": "Your access",
           "history": "Purchase history", "receipt": "Receipt", "ended": "Your full access ended on", "kept": "Your results are kept",
           "refunded": "Refunded"},
    "ru": {"buy1": "Купить один месяц", "buy3": "Купить три месяца", "in": "Готово, вы с нами.", "full": "Полный доступ до",
           "today": "Перейти к «Сегодня»", "fail": "Оплата не завершена", "cancel": None,
           "unfinished": None, "check": None, "access": None, "history": "История покупок", "receipt": None,
           "ended": None, "kept": None, "refunded": None},
}


def orders_of(email):
    return [o for o in R.standin("/__trial/state").get("orders", []) if o.get("email") == email]


def grants_of(email):
    s = R.standin("/__trial/state")
    ids = {o["user_id"] for o in s.get("orders", []) if o.get("email") == email}
    return [g for g in s.get("grants", []) if g["user_id"] in ids]


def token_status(page, path):
    return page.evaluate("""async (url) => { let token = null;
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i);
          if (k && k.startsWith('sb-')) { try { const v = JSON.parse(localStorage.getItem(k)); token = v.access_token || (v.currentSession && v.currentSession.access_token); } catch (e) {} } }
        const r = await fetch(url, { headers: token ? { Authorization: 'Bearer ' + token } : {} }); return r.status; }""", STANDIN + path)


def start_trial(page, email):
    R.goto(page, "/sign-up?next=/trial", 1500)
    fill_signup(page, email)
    R.wait_route(page, lambda r: r != "/sign-up")
    if R.route(page) == "/profile":
        fill_profile(page)
    R.wait_route(page, lambda r: r == "/trial")
    page.wait_for_timeout(1500)
    click_until(page, lambda: page.locator(".trial-join button.trial-primary"), lambda: R.route(page) == "/dashboard")
    return R.wait_route(page, lambda r: r == "/dashboard", 25000)


def sign_in(page, email, nxt):
    R.goto(page, f"/sign-in?next={nxt}", 1500)
    fill_signin(page, email)
    R.wait_route(page, lambda r: r != "/sign-in")
    page.wait_for_timeout(1500)
    if R.route(page) == "/profile":
        fill_profile(page)


def buy(page, label, action):
    btn = page.get_by_role("button", name=label).first
    btn.wait_for(timeout=20000)
    wait_for(page, lambda: btn.is_enabled(), 8000)
    btn.click()
    page.wait_for_url("**/__pay/**", timeout=25000)
    m = re.search(r"/__pay/([0-9a-f-]{36})", page.url)
    oid = m.group(1) if m else None
    if action:
        lab = {"pay": "Pay (SIMULATED)", "fail": "Payment fails (SIMULATED)", "cancel": "Cancel (SIMULATED)"}[action]
        page.get_by_role("button", name=lab).click()
        page.wait_for_url("**/plans/return**", timeout=25000)
    return oid


def en_date(iso):
    d = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone()
    return f"{d.day} {d.strftime('%B')} {d.year}"


def paid_pages(page, combo, full):
    """The formerly locked material, used by the paid account."""
    ru = combo.startswith("ru")
    R.goto(page, "/dashboard", 4000)
    R.check(combo, "Today is the full Today (not the trial home)", wait_for(page, lambda: page.locator(".dash-welcome").count() > 0, 20000)
            and page.locator(".trial-library").count() == 0)
    R.shot(page, f"{combo}-p01-today-full")
    R.goto(page, "/lessons/reading/tfng", 4500)
    R.check(combo, "previously locked lesson opens (reading/tfng)", wait_for(page, lambda: not any(x in body(page) for x in LOCKED) and len(body(page)) > 3000, 20000))
    R.shot(page, f"{combo}-p02-locked-lesson-now-open")
    R.goto(page, "/writing/checker", 3500)
    t1 = "Начать Task 1" if ru else "Start Task 1"
    has_choice = wait_for(page, lambda: page.locator("button", has_text="Task 1").count() > 0 and page.locator("button", has_text="Task 2").count() > 0, 20000)
    R.check(combo, "Writing checker offers the full question choice (Task 1 and Task 2)", has_choice)
    R.shot(page, f"{combo}-p03-writing-checker")
    R.goto(page, "/speaking/cue-cards", 3500)
    R.check(combo, "cue cards open (24 cards)", wait_for(page, lambda: "/ 24" in body(page), 20000))
    if full:
        try_click(page.get_by_role("button", name=re.compile("Model answer|Образец ответа")))
        page.wait_for_timeout(800)
    R.shot(page, f"{combo}-p04-cue-cards", full=full)
    R.goto(page, "/writing/models", 4000)
    R.check(combo, "model answer page shows a Band 8 answer", wait_for(page, lambda: "Band 8" in body(page) and len(body(page)) > 2000, 20000))
    R.shot(page, f"{combo}-p05-model-answers")
    R.goto(page, "/learn/bands", 3500)
    R.check(combo, "band guide shows real steps", wait_for(page, lambda: not any(x in body(page) for x in LOCKED) and len(body(page)) > 1500, 20000))
    R.shot(page, f"{combo}-p06-band-guide")
    R.goto(page, "/trainers/focused/reading-tfng-guided", 3500)
    wait_for(page, lambda: page.locator(".focused-check").count() > 0, 20000)
    sels = page.locator("select.focused-answer")
    for i in range(sels.count()):
        vals = [v for v in sels.nth(i).locator("option").evaluate_all("els => els.map(e => e.value)") if v]
        if vals:
            sels.nth(i).select_option(vals[0])
    for i in range(page.locator("input.focused-answer").count()):
        page.locator("input.focused-answer").nth(i).fill("answer")
    try_click(page.locator(".focused-check"))
    R.check(combo, "focused exercise answered and checked start to finish", wait_for(page, lambda: page.locator(".focused-summary").count() > 0, 15000))
    R.shot(page, f"{combo}-p07-focused-exercise", full=full)
    R.goto(page, "/review", 3500)
    R.check(combo, "vocabulary review topics open", wait_for(page, lambda: "/ 36" in body(page) and not any(x in body(page) for x in LOCKED), 20000), body(page)[:120])
    R.shot(page, f"{combo}-p08-vocabulary-review")
    R.goto(page, "/placement", 3500)
    sp = page.get_by_role("button", name=re.compile("Start the placement test|Начать тест на уровень|Начать"))
    R.check(combo, "placement material arrived and can start", wait_for(page, lambda: sp.count() > 0, 20000))
    if full and sp.count():
        sp.first.click()
        page.wait_for_timeout(2500)
        R.check(combo, "placement test started", "Listening" in body(page))
    R.shot(page, f"{combo}-p09-placement")
    ok, o = no_sideways(page)
    R.check(combo, "placement: no sideways scroll", ok, o)


def full_flow(browser, lang, w, h):
    combo = f"{lang}-{w}"
    t = W[lang]
    ru = lang == "ru"
    ctx, page = R.context(browser, lang, w, h, watch=f"trial-before-buying-{combo}")
    a = f"verify-c-a-{combo}-{R.stamp}@example.test"
    R.check(combo, "trial started", start_trial(page, a))
    # Trial pages first: zero pack requests expected
    for path in ("/writing/models", "/speaking/cue-cards", "/learn/bands", "/review", "/lessons/reading/tfng", "/writing/checker"):
        R.goto(page, path, 2500)
    R.check(combo, "trial account visiting locked pages made ZERO /content/pack/ requests", len(R.pack_requests[f"trial-before-buying-{combo}"]) == 0,
            R.pack_requests[f"trial-before-buying-{combo}"][:3])
    # Now watch the paid phase separately
    R.pack_requests[f"paid-{combo}"] = []
    ctx.on("request", lambda req: R.pack_requests[f"paid-{combo}"].append(req.url) if "/content/pack/" in req.url else None)
    R.goto(page, "/plans", 3000)
    wait_for(page, lambda: page.get_by_role("button", name=t["buy1"]).count() > 0, 20000)
    R.check(combo, "/plans (trial): both Buy buttons enabled", page.get_by_role("button", name=t["buy1"]).first.is_enabled()
            and page.get_by_role("button", name=t["buy3"]).first.is_enabled())
    R.check(combo, "/plans: SIMULATED banner visible", "SIMULATED" in body(page) or "СИМУЛЯЦИЯ" in body(page))
    ok, o = no_sideways(page)
    R.check(combo, "/plans: no sideways scroll", ok, o)
    R.shot(page, f"{combo}-01-plans-trial", full=True)
    o1 = buy(page, t["buy1"], None)
    R.check(combo, "simulated provider page (/__pay) reached, labelled SIMULATED", "SIMULATED" in body(page), page.url)
    R.shot(page, f"{combo}-02-simulated-provider-page")
    page.get_by_role("button", name="Pay (SIMULATED)").click()
    page.wait_for_url("**/plans/return**", timeout=25000)
    R.check(combo, "/plans/return: 'You're in' after the provider confirmed", wait_text(page, t["in"], 40000))
    g1 = [g for g in grants_of(a) if g["order_id"] == o1]
    oo = next((o for o in orders_of(a) if o["id"] == o1), {})
    R.check(combo, "server: order paid at 10,000 KZT with exactly one grant", oo.get("status") == "paid" and oo.get("amount") == 10000 and len(g1) == 1, json.dumps(oo)[:200])
    end1 = g1[0]["ends_at"] if g1 else ""
    if not ru and end1:
        R.check(combo, "return page states the access-until date from the server grant", en_date(end1) in body(page), en_date(end1))
    R.shot(page, f"{combo}-03-return-paid", full=True)
    page.reload(wait_until="domcontentloaded")
    R.check(combo, "reloading the return page is safe (no second grant)", wait_text(page, t["in"], 30000) and len([g for g in grants_of(a) if g["order_id"] == o1]) == 1)
    try_click(page.get_by_role("link", name=t["today"]))
    R.wait_route(page, lambda r: r == "/dashboard")
    paid_pages(page, combo, full=True)
    R.check(combo, "paid browsing fetched packs through the door", len(R.pack_requests[f"paid-{combo}"]) > 0, len(R.pack_requests[f"paid-{combo}"]))

    # Account: Your access, history, receipt
    R.goto(page, "/account", 3500)
    wait_for(page, lambda: page.locator("#access").count() > 0 and len(page.locator("#access").inner_text()) > 40, 20000)
    page.wait_for_timeout(1500)
    acc = page.locator("#access").inner_text()
    R.check(combo, "account: Your access with end date and a purchase history row", t["full"] in acc and (("Paid" in acc) or ("Оплачено" in acc)), acc[:200])
    R.shot(page, f"{combo}-04-account-access", full=True)
    rl = page.locator("#access a[href*='/account/receipt']")
    R.check(combo, "account: receipt link present", rl.count() >= 1)
    if rl.count():
        rl.first.click()
        R.wait_route(page, lambda r: r == "/account/receipt")
        page.wait_for_timeout(2000)
        rc = page.locator(".access-receipt").inner_text() if page.locator(".access-receipt").count() else body(page)
        R.check(combo, "receipt: number, amount and status shown, marked SIMULATED", (oo.get("receipt_number") or "@@") in rc and ("10,000" in rc or "10 000" in rc.replace(" ", " ").replace(" ", " ")) and ("SIMULATED" in rc or "СИМУЛЯЦ" in rc), rc[:200])
        R.shot(page, f"{combo}-05-receipt", full=True)

    # Buy three months while paid: extends
    R.goto(page, "/plans", 3000)
    wait_text(page, t["full"])
    o3 = buy(page, t["buy3"], "pay")
    wait_text(page, t["in"], 40000)
    g3 = [g for g in grants_of(a) if g["order_id"] == o3]
    R.check(combo, "three months extends: new grant starts when the first ends (+90 days)",
            bool(g3) and g3[0]["starts_at"][:16] == end1[:16]
            and abs((datetime.fromisoformat(g3[0]["ends_at"].replace("Z", "+00:00")) - datetime.fromisoformat(end1.replace("Z", "+00:00"))) - timedelta(days=90)) < timedelta(minutes=2),
            json.dumps(g3)[:200])
    R.shot(page, f"{combo}-06-return-extended", full=True)

    # Second fresh browser
    b2 = browser.browser_type.launch()
    ctx2, p2 = R.context(b2, lang, w, h, watch=f"second-browser-{combo}")
    sign_in(p2, a, "/plans")
    R.check(combo, "second fresh browser: signed in and /plans shows paid access", wait_text(p2, t["full"], 30000))
    R.goto(p2, "/lessons/reading/tfng", 4500)
    R.check(combo, "second browser: previously locked lesson open", wait_for(p2, lambda: not any(x in body(p2) for x in LOCKED) and len(body(p2)) > 3000, 20000))
    R.goto(p2, "/dashboard", 4000)
    R.check(combo, "second browser: full Today", wait_for(p2, lambda: p2.locator(".dash-welcome").count() > 0, 20000))
    R.shot(p2, f"{combo}-07-second-browser-today")
    ctx2.close()
    b2.close()

    # Fail and Cancel
    R.goto(page, "/plans", 3000)
    buy(page, t["buy1"], "fail")
    R.check(combo, "Fail: 'Payment was not completed', access unchanged", wait_text(page, t["fail"], 30000))
    R.shot(page, f"{combo}-08-return-failed", full=True)
    R.goto(page, "/plans", 3000)
    oc = buy(page, t["buy1"], "cancel")
    oc_row = next((o for o in orders_of(a) if o["id"] == oc), {})
    R.check(combo, "Cancel: order cancelled on the server and the page says so", oc_row.get("status") == "cancelled"
            and (wait_text(page, t["cancel"], 30000) if t["cancel"] else wait_for(page, lambda: "/plans/return" in page.url and len(body(page)) > 100, 15000)), oc_row.get("status"))
    R.shot(page, f"{combo}-09-return-cancelled", full=True)
    # Interrupted: open /__pay then go back to /plans
    R.goto(page, "/plans", 3000)
    oi = buy(page, t["buy1"], None)
    page.go_back(wait_until="domcontentloaded")
    page.wait_for_timeout(3000)
    if R.route(page) != "/plans":
        R.goto(page, "/plans", 3000)
    chk = page.get_by_role("button", name=t["check"]) if t["check"] else page.get_by_role("button", name=re.compile("Проверить"))
    R.check(combo, "interrupted: back on /plans the pending order is shown with Check again",
            wait_for(page, lambda: chk.count() == 1, 20000) and (not t["unfinished"] or t["unfinished"] in body(page)), R.route(page))
    R.shot(page, f"{combo}-10-plans-interrupted", full=True)
    if chk.count():
        chk.first.click()
        page.wait_for_timeout(2000)
        R.shot(page, f"{combo}-11-plans-check-again")
    oi_row = next((o for o in orders_of(a) if o["id"] == oi), {})
    R.check(combo, "interrupted order is 'pending' on the server, grants unchanged", oi_row.get("status") == "pending" and len(grants_of(a)) == 2, oi_row.get("status"))

    # Refund: student B, a single purchase refunded -> locked again
    ctxb, pb = R.context(browser, lang, w, h, watch=f"refund-{combo}")
    bmail = f"verify-c-b-{combo}-{R.stamp}@example.test"
    start_trial(pb, bmail)
    R.goto(pb, "/plans", 3000)
    ob = buy(pb, t["buy1"], "pay")
    wait_text(pb, t["in"], 40000)
    R.check(combo, "student B paid: door open for the paid lesson", token_status(pb, "/content/lesson/reading-tfng") == 200)
    R.standin("/__pay/refund", {"orderId": ob})
    R.goto(pb, "/lessons/reading/tfng", 4500)
    R.check(combo, "refund: the lesson is locked again on screen", wait_for(pb, lambda: any(x in body(pb) for x in LOCKED), 20000))
    R.check(combo, "refund: the door refuses the paid lesson (403)", token_status(pb, "/content/lesson/reading-tfng") == 403)
    R.goto(pb, "/account", 3500)
    wait_for(pb, lambda: pb.locator("#access").count() > 0, 15000)
    pb.wait_for_timeout(1500)
    accb = pb.locator("#access").inner_text() if pb.locator("#access").count() else ""
    R.check(combo, "refund: account shows the order refunded and no paid access", (("Refunded" in accb) or ("Возвра" in accb)) and t["full"] not in accb, accb[:200])
    R.shot(pb, f"{combo}-12-account-refunded", full=True)
    ctxb.close()

    # Expire (student A): ended on, results kept
    R.goto(page, "/tests/reading-full-002", 3000)  # a paid-only paper: submit it so there is a result to keep
    started = click_until(page, lambda: page.get_by_role("button", name="Начать тест" if ru else "Start test"), lambda: page.get_by_role("button", name="Отправить" if ru else "Submit").count() > 0)
    if started:
        page.evaluate("() => { for (const el of document.querySelectorAll('input[type=radio]')) { if (!document.querySelector(`input[name=\"${el.name}\"]:checked`)) el.click(); } }")
        try_click(page.get_by_role("button", name="Отправить" if ru else "Submit"))
        page.wait_for_timeout(1200)
        if page.locator('[role="alert"]').count():
            try_click(page.locator('[role="alert"]').get_by_role("button", name="Отправить" if ru else "Submit"))
        page.wait_for_timeout(3000)
    R.check(combo, "paid student submitted a paid-only paper (result to keep)", started and page.locator("[role=dialog]").count() > 0)
    R.standin("/__pay/expire", {"email": a})
    R.goto(page, "/account", 4000)
    wait_for(page, lambda: page.locator("#access").count() > 0, 15000)
    page.wait_for_timeout(2000)
    acc = page.locator("#access").inner_text() if page.locator("#access").count() else ""
    if t["ended"]:
        R.check(combo, "expire: account says 'ended on' and results are kept", t["ended"] in acc and t["kept"] in acc, acc[:200])
    else:
        R.check(combo, "expire: account no longer says full access until", t["full"] not in acc and len(acc) > 20, acc[:200])
    R.shot(page, f"{combo}-13-account-expired", full=True)
    R.goto(page, "/lessons/reading/tfng", 4500)
    R.check(combo, "expire: previously paid lesson locked again", wait_for(page, lambda: any(x in body(page) for x in LOCKED), 20000))
    R.goto(page, "/report", 4000)
    R.check(combo, "expire: saved results still on the report", wait_for(page, lambda: page.evaluate("() => { const t = [...document.querySelectorAll('table')].find(x => /Attempts|Попыт/.test(x.innerText)); if (!t) return false; const row = [...t.querySelectorAll('tr')].find(r => /Reading/.test(r.innerText)); return !!row && row.innerText.split(/\s+/).includes('1'); }"), 15000), body(page)[:160])
    R.shot(page, f"{combo}-14-report-after-expiry", full=True)
    ctx.close()


def light_flow(browser, lang, w, h):
    combo = f"{lang}-{w}"
    t = W[lang]
    ctx, page = R.context(browser, lang, w, h, watch=f"trial-before-buying-{combo}")
    a = f"verify-c-l-{combo}-{R.stamp}@example.test"
    R.check(combo, "trial started", start_trial(page, a))
    R.goto(page, "/writing/models", 2500)
    R.check(combo, "trial: zero pack requests before buying", len(R.pack_requests[f"trial-before-buying-{combo}"]) == 0)
    R.goto(page, "/plans", 3000)
    ok, o = no_sideways(page)
    R.check(combo, "/plans: no sideways scroll", ok, o)
    R.shot(page, f"{combo}-01-plans-trial", full=True)
    buy(page, t["buy1"], "pay")
    R.check(combo, "bought one month: return page confirms", wait_text(page, t["in"], 40000))
    R.shot(page, f"{combo}-03-return-paid", full=True)
    paid_pages(page, combo, full=False)
    R.goto(page, "/account", 3500)
    wait_for(page, lambda: page.locator("#access").count() > 0, 15000)
    page.wait_for_timeout(1500)
    R.check(combo, "account: Your access shows full access", t["full"] in (page.locator("#access").inner_text() if page.locator("#access").count() else ""))
    ok, o = no_sideways(page)
    R.check(combo, "account: no sideways scroll", ok, o)
    R.shot(page, f"{combo}-04-account-access", full=True)
    ctx.close()


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        # signed-out visitor, phone: zero pack requests on the locked pages
        ctx, page = R.context(b, "en", 390, 844, watch="signed-out-visitor")
        for path in ("/writing/models", "/speaking/cue-cards", "/learn/bands", "/review", "/trainers/focused/reading-tfng-guided", "/placement", "/plans"):
            R.goto(page, path, 2500)
        R.check("en-390", "signed-out visitor made ZERO /content/pack/ requests", len(R.pack_requests["signed-out-visitor"]) == 0, R.pack_requests["signed-out-visitor"][:3])
        ctx.close()
        for lang, w, h in COMBOS:
            try:
                if (lang, w) in (("en", 1440), ("ru", 390)):
                    full_flow(b, lang, w, h)
                else:
                    light_flow(b, lang, w, h)
            except Exception as e:  # noqa: BLE001
                R.check(f"{lang}-{w}", "journey completed without an unexpected error", False, repr(e)[:300])
        b.close()
    passed, total = R.save()
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
