"""Re-audit fixes R02 (privacy), R03 (paid Speaking says "free") and R04
(Russian Writing overview at 320px), checked in a real browser.

Needs, already running (production builds served by `astro preview`):
  gated build with SIMULATED payments  http://localhost:4441/ielts-website  (stand-in 8841)
  open build                           http://localhost:4442/ielts-website  (stand-in 8842)
Override with GATED_BASE / GATED_STANDIN / OPEN_BASE.

Every account is a synthetic @example.test account on the local stand-in and
every payment is SIMULATED (the stand-in's provider page; no money, no card).
Waits are for a named element or state, never a fixed short sleep.
"""
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GATED = os.environ.get("GATED_BASE", "http://localhost:4441/ielts-website")
STANDIN = os.environ.get("GATED_STANDIN", "http://127.0.0.1:8841")
OPEN = os.environ.get("OPEN_BASE", "http://localhost:4442/ielts-website")
OUT = Path(__file__).resolve().parents[1] / "evidence" / "r02-r03-r04"
OUT.mkdir(parents=True, exist_ok=True)
STAMP = str(int(time.time()))
PASSWORD = "Synthetic-Recheck-1"

results = []
page_errors = []


def check(name, ok, detail=""):
    results.append({"name": name, "ok": bool(ok), "detail": str(detail)})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)


def context(browser, lang, width, height=844, state=None):
    ctx = browser.new_context(viewport={"width": width, "height": height}, locale="ru-RU" if lang == "ru" else "en-GB",
                              storage_state=state)
    ctx.add_init_script(f"try{{localStorage.setItem('ielts.locale.v1','{lang}')}}catch(e){{}}")
    return ctx


def watch(page, label):
    page.on("pageerror", lambda e: page_errors.append(f"{label}: {str(e)[:200]}"))


def ready_language(page, lang):
    """The page has finished switching to the chosen language."""
    page.wait_for_function("l => document.documentElement.lang === l", arg=lang, timeout=20000)


def widths(page):
    return page.evaluate("({doc: document.documentElement.scrollWidth, view: window.innerWidth})")


def post_json(url, data=None, token=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode() if data is not None else b"",
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json", "Origin": GATED.rsplit("/", 1)[0],
                 **({"Authorization": "Bearer " + token} if token else {})},
    )
    with urllib.request.urlopen(req) as r:
        body = r.read()
        return r.status, (json.loads(body) if body else None)


def sign_up(page, email):
    page.goto(GATED + "/sign-up?next=%2Fdashboard", wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=30000)
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_selector("#profile-firstName", timeout=30000)
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
    page.wait_for_url("**/dashboard", timeout=30000)


def token_of(page):
    return page.evaluate(
        "() => { for (const k of Object.keys(localStorage)) { if (k.startsWith('sb-') && k.endsWith('-auth-token')) "
        "{ return JSON.parse(localStorage.getItem(k)).access_token } } return null }"
    )


def buy_month_simulated(page):
    """SIMULATED purchase: a real order through the payments Worker, paid on
    the stand-in's provider route."""
    token = token_of(page)
    _, order = post_json(STANDIN + "/payments/checkout", {"planId": "month-1"}, token)
    status, _ = post_json(f"{STANDIN}/__pay/{order['orderId']}/pay")
    return order["orderId"], status


def paid_state(browser):
    """A fresh synthetic account with a SIMULATED one-month purchase; its
    sign-in, to open further windows as the same paid student."""
    ctx = context(browser, "en", 1440, 900)
    page = ctx.new_page()
    sign_up(page, f"recheck-paid-{STAMP}-{len(results)}@example.test")
    order, status = buy_month_simulated(page)
    check("SIMULATED one-month purchase confirmed for the paid checks", status == 200, order)
    state = ctx.storage_state()
    ctx.close()
    return state


# ── R04: the Writing overview's featured cards on narrow phones ──────────
def r04(browser):
    paid = paid_state(browser)
    for site, base in (("open", OPEN), ("gated-paid", GATED)):
        for lang, width in (("ru", 320), ("ru", 390), ("en", 320), ("en", 390), ("ru", 1440), ("en", 1440)):
            ctx = context(browser, lang, width, 900 if width > 1000 else 844, state=paid if site == "gated-paid" else None)
            page = ctx.new_page()
            watch(page, f"r04 {site} {lang} {width}")
            page.goto(base + "/lessons/writing", wait_until="domcontentloaded")
            ready_language(page, lang)
            # Visible, not merely present: a covered (locked) page would measure nothing.
            page.wait_for_selector(".lesson-body .sample-card.featured .sample-go", state="visible", timeout=40000)
            if lang == "ru":
                page.wait_for_function(
                    "() => /[\\u0400-\\u04FF]/.test(document.querySelector('.lesson-body .sample-card.featured .sample-go')?.textContent || '')",
                    timeout=30000,
                )
            cards = page.evaluate(
                """() => [...document.querySelectorAll('.lesson-body .sample-card.featured')].map(card => {
                     const go = card.querySelector('.sample-go'); const title = card.querySelector('.sample-title');
                     const r = go.getBoundingClientRect(); const c = card.getBoundingClientRect(); const t = title.getBoundingClientRect();
                     return { title: title.textContent.trim(), go: go.textContent.trim(), goLeft: Math.round(r.left), goRight: Math.round(r.right),
                              cardRight: Math.round(c.right), titleRight: Math.round(t.right), goWidth: Math.round(r.width),
                              goClipped: go.scrollWidth > go.clientWidth + 1, titleClipped: title.scrollWidth > title.clientWidth + 1,
                              overflow: getComputedStyle(card).overflow };
                   })"""
            )
            w = widths(page)
            label = f"R04 {site} {lang} {width}"
            check(f"{label}: page is not wider than the screen", w["doc"] <= w["view"], w)
            check(f"{label}: featured cards are on screen with a real button", len(cards) >= 1 and all(c["goWidth"] > 20 for c in cards),
                  [(c["title"], c["goWidth"]) for c in cards])
            check(
                f"{label}: each featured button and title ends inside the screen and its card",
                all(c["goRight"] <= width and c["goLeft"] >= 0 and c["titleRight"] <= width and c["goRight"] <= c["cardRight"] + 1 for c in cards),
                [(c["go"], c["goLeft"], c["goRight"], c["cardRight"]) for c in cards],
            )
            check(f"{label}: nothing is clipped or hidden", all(not c["goClipped"] and not c["titleClipped"] and c["overflow"] == "visible" for c in cards),
                  [(c["goClipped"], c["titleClipped"], c["overflow"]) for c in cards])
            page.locator(".lesson-body .sample-card.featured").first.scroll_into_view_if_needed()
            # Sections fade in as they are scrolled to: photograph the card once it is fully shown.
            page.wait_for_function(
                """() => { let n = document.querySelector('.lesson-body .sample-card.featured'); let o = 1;
                          while (n && n.nodeType === 1) { o *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
                          return o > 0.99; }""",
                timeout=20000,
            )
            shown = page.evaluate(
                """() => { const r = document.querySelector('.lesson-body .sample-card.featured .sample-go').getBoundingClientRect();
                          return r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth; }"""
            )
            check(f"{label}: the first featured button is fully on screen after scrolling to its card", shown)
            page.screenshot(path=str(OUT / f"r04-{site}-{lang}-{width}.png"))
            ctx.close()

    # The same card pattern on the other overviews, Russian at 320.
    ctx = context(browser, "ru", 320)
    page = ctx.new_page()
    watch(page, "r04 other overviews")
    for path in ("/lessons/listening", "/lessons/speaking", "/lessons/vocabulary"):
        page.goto(OPEN + path, wait_until="domcontentloaded")
        ready_language(page, "ru")
        page.wait_for_selector(".lesson-body", state="visible", timeout=30000)
        w = widths(page)
        check(f"R04 open ru 320 {path}: page is not wider than the screen", w["doc"] <= w["view"], w)
    ctx.close()


# ── R03: "free" only on the open site ────────────────────────────────────
FREE = {"en": "free", "ru": "бесплатно"}


def speaking_footer(page, lang):
    """The count line under the Speaking practice cards, once its counts are in."""
    page.wait_for_function(
        "() => [...document.querySelectorAll('p')].some(p => /Part 1/.test(p.textContent) && /\\d/.test(p.textContent) && p.textContent.includes('·'))",
        timeout=40000,
    )
    return page.evaluate(
        "() => [...document.querySelectorAll('p')].filter(p => /Part 1/.test(p.textContent) && p.textContent.includes('·')).map(p => p.textContent.trim().replace(/\\s+/g, ' '))"
    )


def r03(browser):
    for lang, width in (("en", 1440), ("ru", 390)):
        ctx = context(browser, lang, width, 900 if width > 1000 else 844)
        page = ctx.new_page()
        watch(page, f"r03 paid {lang} {width}")
        email = f"recheck-r03-{lang}-{STAMP}@example.test"
        sign_up(page, email)
        order, status = buy_month_simulated(page)
        check(f"R03 {lang} {width}: SIMULATED one-month purchase confirmed", status == 200, order)
        page.goto(GATED + "/trainers/speaking", wait_until="domcontentloaded")
        ready_language(page, lang)
        lines = speaking_footer(page, lang)
        check(f"R03 gated paid {lang} {width}: the Speaking count line is shown", len(lines) >= 1, lines)
        check(f"R03 gated paid {lang} {width}: it does not say '{FREE[lang]}'", all(FREE[lang] not in l.lower() for l in lines), lines)
        body = page.inner_text("main").lower()
        check(f"R03 gated paid {lang} {width}: no stand-alone 'free' label anywhere on the paid Speaking page",
              f"· {FREE[lang]}" not in body, "")
        page.screenshot(path=str(OUT / f"r03-gated-paid-speaking-{lang}-{width}.png"))

        page.goto(GATED + "/lessons/writing", wait_until="domcontentloaded")
        ready_language(page, lang)
        page.wait_for_selector(".cta-card .sample-topic", state="attached", timeout=30000)
        tag = page.locator(".cta-card .sample-topic").first.inner_text().strip()
        check(f"R03 gated paid {lang} {width}: 'Check Your Writing' card does not say '{FREE[lang]}'", FREE[lang] not in tag.lower(), tag)

        page.goto(GATED + "/trainers/writing", wait_until="domcontentloaded")
        ready_language(page, lang)
        # The trainer's own screen has mounted (its paid material arrives through the door first).
        page.wait_for_function("() => (document.querySelector('main')?.innerText || '').includes('Task 2')", timeout=40000)
        check(f"R03 gated paid {lang} {width}: Writing trainer has no '· {FREE[lang]}' label", f"· {FREE[lang]}" not in page.inner_text("main").lower(), "")
        desc = page.locator("meta[name=description]").get_attribute("content") or ""
        ctx.close()

    # Open build keeps its wording.
    for lang, width in (("en", 1440), ("ru", 390)):
        ctx = context(browser, lang, width, 900 if width > 1000 else 844)
        page = ctx.new_page()
        watch(page, f"r03 open {lang} {width}")
        page.goto(OPEN + "/lessons/writing", wait_until="domcontentloaded")
        ready_language(page, lang)
        page.wait_for_selector(".cta-card .sample-topic", state="attached", timeout=30000)
        if lang == "ru":
            page.wait_for_function("() => /[\\u0400-\\u04FF]/.test(document.querySelector('.cta-card .sample-topic')?.textContent || '')", timeout=30000)
        tag = page.locator(".cta-card .sample-topic").first.inner_text().strip()
        check(f"R03 open {lang} {width}: the open site still says '{FREE[lang]}' on the Check Your Writing card", FREE[lang] in tag.lower(), tag)
        ctx.close()

    ctx = context(browser, "en", 1440, 900)
    page = ctx.new_page()
    page.goto(GATED + "/help", wait_until="domcontentloaded")
    gated_desc = page.locator("meta[name=description]").get_attribute("content") or ""
    page.goto(OPEN + "/dashboard", wait_until="domcontentloaded")
    open_desc = page.locator("meta[name=description]").get_attribute("content") or ""
    check("R03: gated build's page descriptions no longer start with 'Free'", not gated_desc.lower().startswith("free"), gated_desc[:70])
    ctx.close()


# ── R02: privacy names the purchase records and the deletion limit ───────
R02_TEXT = {
    "en": {
        "heading": "Purchases and payment records",
        "items": ["Which plan you chose, its price and currency", "waiting for payment, paid, not completed, cancelled or refunded",
                  "reference number for the payment", "A receipt number for each paid purchase", "The dates your paid access starts and ends"],
        "unfinished": "A purchase that you start and do not finish is recorded too.",
        "card": "This site does not receive or keep them.",
        "provider": "No payment company is connected yet",
        "removal": "Removing your account",
        "limit": "An account that has any purchase record cannot be deleted",
        "never_paid": "started and never paid",
        "undecided": "Still being decided",
        "date": "30 September 2026",
    },
    "ru": {
        "heading": "Покупки и платёжные записи",
        "items": ["Какой тариф вы выбрали, его цену и валюту", "ожидает оплаты, оплачена, не завершена, отменена или возвращена",
                  "её номер этого платежа", "Номер квитанции для каждой оплаченной покупки", "Даты начала и окончания платного доступа"],
        "unfinished": "Покупка, которую вы начали, но не завершили, тоже записывается.",
        "card": "Этот сайт их не получает и не хранит.",
        "provider": "Платёжная компания пока не подключена",
        "removal": "Удаление аккаунта",
        "limit": "Аккаунт, у которого есть хотя бы одна запись о покупке, удалить нельзя",
        "never_paid": "так и не оплатили",
        "undecided": "Ещё решается",
        "date": "30 сентября 2026",
    },
}


def r02(browser):
    for lang, width in (("en", 1440), ("ru", 390), ("ru", 320), ("en", 390)):
        ctx = context(browser, lang, width, 900 if width > 1000 else 844)
        page = ctx.new_page()
        watch(page, f"r02 gated {lang} {width}")
        page.goto(GATED + "/privacy", wait_until="domcontentloaded")
        ready_language(page, lang)
        want = R02_TEXT[lang]
        page.wait_for_function("t => document.body.innerText.includes(t)", arg=want["heading"], timeout=30000)
        text = page.inner_text("article")
        label = f"R02 gated {lang} {width}"
        check(f"{label}: purchases section with all five kinds of record", all(i in text for i in want["items"]), [i for i in want["items"] if i not in text])
        check(f"{label}: says an unfinished purchase is recorded", want["unfinished"] in text)
        check(f"{label}: says card details are not received or kept", want["card"] in text)
        check(f"{label}: says no payment company is connected, names none", want["provider"] in text)
        check(f"{label}: account removal section with today's limit, including never-paid purchases",
              want["removal"] in text and want["limit"] in text and want["never_paid"] in text)
        check(f"{label}: what is still undecided is listed separately", want["undecided"] in text)
        check(f"{label}: updated date", want["date"] in text)
        for invented in ("Kaspi", "Halyk", "Stripe", "Paddle", "FreedomPay", "CloudPayments"):
            if invented in text:
                check(f"{label}: no invented provider ({invented})", False)
        check(f"{label}: no operator name or contact published", page.locator("#privacy-who").count() == 0)
        w = widths(page)
        check(f"{label}: page is not wider than the screen", w["doc"] <= w["view"], w)
        page.locator("#privacy-purchases").scroll_into_view_if_needed()
        page.screenshot(path=str(OUT / f"r02-gated-privacy-purchases-{lang}-{width}.png"))
        page.locator("#privacy-removal").scroll_into_view_if_needed()
        page.screenshot(path=str(OUT / f"r02-gated-privacy-removal-{lang}-{width}.png"))
        ctx.close()

    ctx = context(browser, "en", 1440, 900)
    page = ctx.new_page()
    watch(page, "r02 open")
    page.goto(OPEN + "/privacy", wait_until="domcontentloaded")
    page.wait_for_selector("#privacy-removal", timeout=30000)
    text = page.inner_text("article")
    check("R02 open build: no purchases section (the open site sells nothing)", page.locator("#privacy-purchases").count() == 0 and "purchase record" not in text)
    check("R02 open build: removal section and undecided note still shown", "Removing your account" in text and "Still being decided" in text)
    ctx.close()


def main():
    which = sys.argv[1:] or ["r04", "r03", "r02"]
    with sync_playwright() as p:
        browser = p.chromium.launch()
        if "r04" in which:
            r04(browser)
        if "r03" in which:
            r03(browser)
        if "r02" in which:
            r02(browser)
        browser.close()
    check("no uncaught page errors during these checks", not page_errors, page_errors[:6])
    passed = sum(1 for r in results if r["ok"])
    (OUT / "results.json").write_text(json.dumps({"passed": passed, "total": len(results), "results": results, "pageErrors": page_errors}, ensure_ascii=False, indent=1), encoding="utf-8")
    lines = ["# R02, R03, R04 browser checks", "", f"Payments SIMULATED. {passed} of {len(results)} passed.", "", "| Check | Result | Detail |", "|---|---|---|"]
    for r in results:
        lines.append(f"| {r['name']} | {'PASS' if r['ok'] else 'FAIL'} | {r['detail'][:160].replace('|', '/')} |")
    (OUT / "results.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n{passed} of {len(results)} passed")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
