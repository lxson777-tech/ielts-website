"""Offer review (1 October 2026), student side, clicked through in a real browser.

Builder S. Proves on the GATED build, against the free local stand-in (trial
mode: real Workers, SIMULATED grades, SIMULATED payments, no money, no model):

  - a paid account's "Assessments left" counts follow the server and refresh
    after a graded essay without a reload (P2-6);
  - once all 12 essays of the 30-day period are used, the Writing Checker says
    so plainly in English and Russian, with the period's end date and a link
    to Plans, and never "could not reach the grading service" (P1-2, P2-12);
  - the placement test and Mock Exam Day say what they use before starting
    (P1-6);
  - the refund answer says no refunds after purchase (P2-10).

And on the OPEN build (today's live site configuration) against the same
open build of commit fe4ebdb: lesson help buttons for a signed-out reader,
part-of-lesson links that scroll, no examiner card on the Speaking trainer
and no /speaking/recorded page (P2-9).

Servers it needs and does NOT start (see tools/offer-preview.ps1):
  stand-in: MR_EZ_DEV_PORT=8631 MR_EZ_SITE_ORIGIN=http://127.0.0.1:4631
            node --import ./tests/ts-extension-loader.mjs tools/mr-ez-dev-server.mjs --trial
  gated build served on 4631, this commit's open build on 4632, fe4ebdb's
  open build on 4633.

Every account is synthetic (@example.test). Screenshots go to S_SHOTS
(default: docs/paid-access/offer-review-s/).
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import uuid
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GATED = os.environ.get("S_GATED", "http://127.0.0.1:4631/ielts-website")
OPEN = os.environ.get("S_OPEN", "http://127.0.0.1:4632/ielts-website")
BASELINE = os.environ.get("S_BASELINE", "http://127.0.0.1:4633/ielts-website")
STANDIN = os.environ.get("S_STANDIN", "http://127.0.0.1:8631")
ROOT = Path(__file__).resolve().parents[2]
SHOTS = Path(os.environ.get("S_SHOTS", ROOT / "docs" / "paid-access" / "offer-review-s"))
SHOTS.mkdir(parents=True, exist_ok=True)
PASSWORD = "LocalReviewOnly123!"
SUFFIX = uuid.uuid4().hex[:8]

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)
    return bool(ok)


def shot(page: Page, name: str, full: bool = True) -> None:
    # A focused skip link or a sticky header repeated down a full-page capture
    # is a screenshot artefact, not the page: let go of focus first.
    page.evaluate("document.activeElement && document.activeElement.blur && document.activeElement.blur()")
    settle(page)
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=full)


def settle(page: Page) -> None:
    """Entrance animations finished, so the capture is the settled screen.
    Infinite (ambient) animations are ignored."""
    page.wait_for_function(
        "()=>document.getAnimations().every(a=>a.playState!=='running' || a.effect?.getTiming().iterations===Infinity)",
        timeout=15000,
    )


def shot_alert(page: Page, name: str) -> None:
    """The grading message in view, as the student sees it."""
    page.evaluate("document.activeElement && document.activeElement.blur && document.activeElement.blur()")
    page.locator(".bg-error-tint").first.evaluate("el => el.scrollIntoView({block: 'center'})")
    page.wait_for_function(
        "()=>{const r=document.querySelector('.bg-error-tint').getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight;}",
        timeout=10000,
    )
    settle(page)
    page.screenshot(path=str(SHOTS / f"{name}.png"))


ESSAY = (
    "Some people believe that the working week should be shorter. In my opinion this is a sensible idea for most "
    "workers, although it does not suit every job. First, a shorter week gives people more time to rest, and rested "
    "employees usually make fewer mistakes. For example, several companies that tried a four day week reported higher "
    "output per hour. Second, families benefit because parents can spend more time with their children. However, some "
    "services such as hospitals cannot simply close for an extra day, so these sectors would need careful planning and "
    "more staff. In conclusion, I believe a shorter working week brings clear benefits, provided that essential "
    "services are organised so that the public is not affected. Governments and employers should therefore test the "
    "idea gradually and measure the results before making it a rule for everyone in the economy."
)


def account(request, label: str) -> dict:
    """A synthetic account with a profile, made on the stand-in."""
    session = request.post(
        f"{STANDIN}/auth/v1/signup", data={"email": f"s-{label}-{SUFFIX}@example.test", "password": PASSWORD}
    ).json()
    headers = {"Authorization": "Bearer " + session["access_token"], "apikey": "local-anon-key"}
    profile = request.post(
        f"{STANDIN}/rest/v1/student_profiles",
        headers=headers,
        data={
            "user_id": session["user"]["id"],
            "first_name": "Synthetic",
            "last_name": "Student",
            "date_of_birth": "2000-01-01",
            "phone": "+77010000000",
            "city": "Almaty",
            "occupation": "Synthetic test account",
            "source": "other",
            "parent_name": None,
            "parent_phone": None,
            "parent_consent_at": None,
            "updated_at": "2026-10-01T12:00:00Z",
        },
    )
    assert profile.ok or profile.status == 409, profile.text()
    return session


def signed_in_context(browser, session: dict, locale: str, viewport: dict):
    ctx = browser.new_context(viewport=viewport, locale="ru-RU" if locale == "ru" else "en-US")
    ctx.add_init_script(
        f'localStorage.setItem("ielts.locale.v1","{locale}");'
        + 'localStorage.setItem("sb-127-auth-token",'
        + json.dumps(json.dumps(session))
        + ");"
    )
    return ctx


def status_of(request, session: dict) -> dict:
    headers = {"Authorization": "Bearer " + session["access_token"], "apikey": "local-anon-key"}
    return request.post(f"{STANDIN}/rest/v1/rpc/trial_status", headers=headers, data={}).json()


def buy(page: Page) -> None:
    """The plans page, the SIMULATED provider page, and back."""
    page.goto(f"{GATED}/plans", wait_until="domcontentloaded")
    buy_button = page.get_by_role("button", name="Buy one month", exact=True)
    buy_button.wait_for(timeout=60000)
    page.wait_for_function('()=>!document.querySelector(".access-buy")?.disabled', timeout=30000)
    buy_button.click()
    page.wait_for_url("**/__pay/**", timeout=30000)
    page.get_by_role("button", name="Pay (SIMULATED)", exact=True).click()
    page.wait_for_url("**/ielts-website/**", timeout=30000)


def grade_directly(request, session: dict) -> int:
    """One essay through the REAL essay Worker on the stand-in, whose model
    reply is SIMULATED. Returns the HTTP status."""
    resp = request.post(
        f"{STANDIN}/grade-essay",
        headers={"Authorization": "Bearer " + session["access_token"], "Origin": "http://127.0.0.1:4631"},
        data={
            "prompt": {
                "task": "task2",
                "variant": "opinion",
                "promptHtml": "<p>Some people think the working week should be shorter. Do you agree or disagree?</p>",
                "minWords": 250,
            },
            "essay": ESSAY,
            "mechanics": {"wordCount": len(ESSAY.split()), "underLength": False},
            "locale": "en",
        },
        timeout=60000,
    )
    return resp.status


def open_checker_and_submit(page: Page) -> tuple[str, str]:
    """Opens the Writing Checker, starts a Task 2 essay, writes and submits.
    Returns the balance shown before starting and the text of the grading
    error box once it appears."""
    page.goto(f"{GATED}/writing/checker", wait_until="domcontentloaded")
    start = page.locator(".writing-choice button", has_text="Task 2")
    start.wait_for(timeout=60000)
    page.locator("[data-assessment-balance='paid']").wait_for(timeout=30000)
    balance = page.locator("[data-assessment-balance='paid']").inner_text()
    start.click()
    box = page.locator("textarea").first
    box.wait_for(timeout=30000)
    box.fill(ESSAY)
    page.locator("button", has_text="Check my essay").or_(page.locator("button", has_text="Проверить")).first.click()
    alert = page.locator(".bg-error-tint").first
    alert.wait_for(timeout=60000)
    return balance, alert.inner_text()


def gated_journey(p) -> None:
    browser = p.chromium.launch()
    request = p.request.new_context()
    session = account(request, "paid")
    desk = signed_in_context(browser, session, "en", {"width": 1440, "height": 900})
    page = desk.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    buy(page)
    st = status_of(request, session)
    check("SIMULATED purchase gives running paid access", bool(st.get("paid")), json.dumps(st.get("paid")))

    # Assessments left on the Writing Checker, before anything is graded.
    page.goto(f"{GATED}/writing/checker", wait_until="domcontentloaded")
    bal = page.locator("[data-assessment-balance='paid']")
    bal.wait_for(timeout=60000)
    text = bal.inner_text()
    check("paid balance shows 12, 6, 2 and 2 mocks", all(s in text for s in ("12 of 12", "6 of 6", "2 of 2")), text.replace("\n", " | "))
    shot(page, "01-checker-balance-paid-en-1440")

    # One essay through the page (SIMULATED grade): the count follows without a reload.
    page.locator(".writing-choice button", has_text="Task 2").click()
    page.locator("textarea").first.fill(ESSAY)
    with page.expect_response(lambda r: "/grade-essay" in r.url and r.request.method == "POST", timeout=90000) as graded:
        with page.expect_response(
            lambda r: "/rest/v1/rpc/trial_status" in r.url and r.request.method == "POST", timeout=90000
        ) as refreshed:
            page.locator("button", has_text="Check my essay").first.click()
    check("SIMULATED essay grade returned", graded.value.status == 200, str(graded.value.status))
    after = refreshed.value.json()
    check(
        "the page asked the server again right after the grade, and heard 1 essay used",
        after.get("assessments", {}).get("writingUsed") == 1,
        json.dumps(after.get("assessments")),
    )
    page.get_by_text("SIMULATED", exact=False).first.wait_for(timeout=90000)
    shot(page, "02a-simulated-report-en-1440")
    st = status_of(request, session)
    check("the graded essay is counted by the server", st["assessments"]["writingUsed"] == 1, json.dumps(st["assessments"]))
    page.goto(f"{GATED}/writing/checker", wait_until="domcontentloaded")
    page.locator("[data-assessment-balance='paid']").wait_for(timeout=60000)
    page.wait_for_function("()=>document.querySelector('[data-assessment-balance]')?.innerText.includes('11 of 12')", timeout=30000)
    check("balance on the page reads 11 of 12 after one graded essay", True)
    shot(page, "02-checker-balance-after-one-en-1440")

    # The other 11 through the real Worker (SIMULATED grades).
    codes = [grade_directly(request, session) for _ in range(11)]
    check("eleven more essays graded (SIMULATED)", all(c == 200 for c in codes), str(codes))
    st = status_of(request, session)
    check("server counts 12 essays used", st["assessments"]["writingUsed"] == 12, json.dumps(st["assessments"]))
    over = grade_directly(request, session)
    check("a 13th essay is refused by the Worker", over == 403, str(over))

    # The 13th through the page: a plain "used up", never an outage.
    balance, alert = open_checker_and_submit(page)
    check("English: balance said Writing 0 of 12 before starting", "0 of 12" in balance, balance.replace(chr(10), " | "))
    check("English: says all 12 essays are used", "You have used all 12 essay assessments in this 30-day period." in alert, alert)
    check("English: says when the period ends", "This 30-day period ends on" in alert, alert)
    check("English: the essay is kept", "Your essay is safe on this page." in alert, alert)
    check("English: no outage wording", "could not reach" not in alert.lower(), alert)
    check("English: a link to Plans", page.get_by_role("link", name="See plans and what is included").count() >= 1)
    shot_alert(page, "03-essay-used-up-en-1440")
    page.set_viewport_size({"width": 390, "height": 844})
    check("phone: no sideways scroll", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
    shot_alert(page, "04-essay-used-up-en-390")

    # Placement and Mock Exam Day say what they use, before starting.
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto(f"{GATED}/placement", wait_until="domcontentloaded")
    note = page.locator("[data-allowance-note='placement']")
    note.wait_for(timeout=60000)
    t = note.inner_text()
    check("placement intro: once per account", "taken once per account" in t, t)
    check("placement intro: does not use live interviews", "does not use your live interviews (2 of 2 left)" in t, t)
    check("placement intro: the essay uses the 12, 0 left now", "(0 of 12 left in this 30-day period)" in t, t)
    shot(page, "06-placement-intro-en-1440")
    page.goto(f"{GATED}/tests/mock", wait_until="domcontentloaded")
    note = page.locator("[data-allowance-note='mock']")
    note.wait_for(timeout=60000)
    t = note.inner_text()
    check("mock start: 2 of 2 mocks left, no live interviews used", "Full mock exams: 2 of 2 left" in t and "does not use your live interviews" in t, t)
    shot(page, "07-mock-start-en-1440")
    page.set_viewport_size({"width": 390, "height": 844})
    shot(page, "08-mock-start-en-390")
    # Russian, phone and desktop.
    for vp, tag in (({"width": 390, "height": 844}, "390"), ({"width": 1440, "height": 900}, "1440")):
        ru = signed_in_context(browser, session, "ru", vp)
        rp = ru.new_page()
        rp.on("pageerror", lambda e: errors.append(str(e)))
        balance, alert = open_checker_and_submit(rp)
        check(f"Russian {tag}: balance in Russian", "Осталось проверок" in balance and "0 из 12" in balance, balance.replace(chr(10), " | "))
        check(f"Russian {tag}: says all 12 essays are used", "Вы использовали все 12 проверок эссе" in alert, alert)
        check(f"Russian {tag}: period end date in Russian", "октября" in alert or "ноября" in alert, alert)
        check(f"Russian {tag}: Plans link in Russian", rp.get_by_role("link", name="Посмотреть тарифы и что в них входит").count() >= 1)
        check(f"Russian {tag}: no sideways scroll", rp.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        shot_alert(rp, f"05-essay-used-up-ru-{tag}")
        ru.close()

    ru = signed_in_context(browser, session, "ru", {"width": 390, "height": 844})
    rp = ru.new_page()
    rp.goto(f"{GATED}/placement", wait_until="domcontentloaded")
    rp.locator("[data-allowance-note='placement']").wait_for(timeout=60000)
    t = rp.locator("[data-allowance-note='placement']").inner_text()
    check("Russian placement intro", "Вступительный тест проходят один раз на аккаунт." in t, t)
    shot(rp, "09-placement-intro-ru-390")
    rp.goto(f"{GATED}/tests/mock", wait_until="domcontentloaded")
    rp.locator("[data-allowance-note='mock']").wait_for(timeout=60000)
    shot(rp, "10-mock-start-ru-390")
    ru.close()

    # No balance shown to a signed-in account with no access (P2-6).
    plain = account(request, "noaccess")
    pc = signed_in_context(browser, plain, "en", {"width": 1440, "height": 900})
    pp = pc.new_page()
    pp.goto(f"{GATED}/plans", wait_until="domcontentloaded")
    pp.get_by_role("button", name="Buy one month", exact=True).wait_for(timeout=60000)
    pp.wait_for_timeout(1500)
    check("no access: no assessments-left box", pp.locator("[data-assessment-balance]").count() == 0)
    shot(pp, "11-plans-no-access-en-1440")
    pc.close()

    # The refund answer (sales page, signed out), both languages.
    for lang, phrase, question in (
        ("en", "There are no refunds after purchase.", "Can I get a refund?"),
        ("ru", "после покупки деньги не возвращаются", "Можно ли вернуть деньги?"),
    ):
        sc = browser.new_context(viewport={"width": 390, "height": 844}, locale="ru-RU" if lang == "ru" else "en-US")
        sc.add_init_script(f'localStorage.setItem("ielts.locale.v1","{lang}");')
        sp = sc.new_page()
        sp.goto(f"{GATED}/", wait_until="networkidle")
        q = sp.get_by_text(question, exact=True).first
        q.wait_for(timeout=30000)
        q.scroll_into_view_if_needed()
        q.click()
        sp.wait_for_function("(p)=>document.body.innerText.includes(p)", arg=phrase, timeout=30000)
        check(f"refund FAQ ({lang}): no refunds after purchase, shown when opened", True)
        shot(sp, f"13-refund-faq-{lang}-390", full=False)
        sc.close()

    check("no page errors on the gated journey", not errors, "; ".join(errors[:3]))
    desk.close()
    browser.close()


def lesson_probe(page: Page, base: str) -> dict:
    """A signed-out reader on a lesson, with a part-of-lesson link."""
    page.goto(f"{base}/lessons/reading/paraphrase", wait_until="networkidle")
    page.locator("[data-lesson-block]").first.wait_for(timeout=30000)
    blocks = page.eval_on_selector_all("[data-lesson-block]", "els => els.map(e => e.id)")
    target = blocks[min(3, len(blocks) - 1)]
    page.goto(f"{base}/lessons/reading/paraphrase#{target}", wait_until="networkidle")
    page.locator(f"[data-lesson-block='{target}']").wait_for(timeout=30000)
    page.wait_for_function(
        "(id)=>{const r=document.getElementById(id)?.getBoundingClientRect(); return r && r.top>=0 && r.top<200;}",
        arg=target,
        timeout=15000,
    )
    return {
        "help": page.locator(".lesson-block-help").count(),
        "target": target,
        "top": page.evaluate("(id)=>Math.round(document.getElementById(id).getBoundingClientRect().top)", target),
    }


def open_journey(p) -> None:
    browser = p.chromium.launch()
    for name, base in (("this commit", OPEN), ("fe4ebdb", BASELINE)):
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="en-US")
        page = ctx.new_page()
        try:
            probe = lesson_probe(page, base)
            check(f"open build ({name}): help buttons for a signed-out reader", probe["help"] > 0, json.dumps(probe))
            check(f"open build ({name}): part-of-lesson link scrolls to its block", 0 <= probe["top"] < 200, json.dumps(probe))
            shot(page, f"12-open-lesson-anchor-{'now' if base == OPEN else 'fe4ebdb'}", full=False)
            page.goto(f"{base}/trainers/speaking", wait_until="networkidle")
            cards = page.locator(".skill-resource-card-title").all_inner_texts()
            check(f"open build ({name}): no Live AI Examiner card on the trainer", "Live AI Examiner" not in cards, json.dumps(cards))
            resp = page.goto(f"{base}/speaking/recorded")
            check(f"open build ({name}): /speaking/recorded is not published", resp is not None and resp.status == 404, str(resp.status if resp else None))
        finally:
            ctx.close()
    browser.close()


def bundle_stop_minutes(root: Path) -> list[str]:
    """The live examiner's absolute stop, as compiled into a build."""
    found: set[str] = set()
    for js in (root / "_astro").glob("*.js"):
        text = js.read_text(encoding="utf-8", errors="ignore")
        if "Live mock speaking test" not in text:
            continue
        for marker in ("108e4", "18*6e4", "?15:18)*6e4", "9e5"):
            if marker in text:
                found.add(marker)
    return sorted(found)


def main() -> None:
    with sync_playwright() as p:
        if os.environ.get("S_SKIP_GATED") != "1":
            gated_journey(p)
        if os.environ.get("S_SKIP_OPEN") != "1":
            open_journey(p)
    roots = os.environ.get("S_BUNDLE_ROOTS")
    if roots:
        for item in roots.split(";"):
            label, path = item.split("=", 1)
            print(f"BUNDLE {label}: live examiner stop markers {bundle_stop_minutes(Path(path))}", flush=True)
    failed = [r for r in results if not r[1]]
    lines = [f"# Builder S browser journey ({time.strftime('%Y-%m-%d %H:%M')})", "", "All grades and payments SIMULATED on the local stand-in.", ""]
    lines += [f"- {'PASS' if ok else 'FAIL'} {name}" + (f" ({detail})" if detail and not ok else "") for name, ok, detail in results]
    (SHOTS / "results.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n{len(results) - len(failed)} of {len(results)} passed", flush=True)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
