"""Recheck of the five findings in VERIFICATION.md after commit d28fb35.

Against Alex's review servers (gated build with SIMULATED payments on 4441,
stand-in 8841). Synthetic @example.test accounts only; nothing real is
charged. Each check waits for a named element or state, not a short sleep.
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from vhelpers import *  # noqa: F401,F403

OUT = Path(__file__).resolve().parents[1] / "fixes-recheck"
OUT.mkdir(parents=True, exist_ok=True)
results = []


def check(name, ok, detail=""):
    results.append({"name": name, "ok": bool(ok), "detail": str(detail)[:300]})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{str(detail)[:200]}]" if detail else ""), flush=True)


def admin_page(browser):
    ctx = new_context(browser, "en", 1440, 900)
    page = ctx.new_page()
    page.goto(GATED + "/sign-up?next=%2Fadmin", wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=40000)
    settle(page)
    page.locator("#signup-email").fill("admin@example.test")
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    if page.locator("#signup-consent").count():  # required since 2 October 2026
        page.locator("#signup-consent").check(force=True)
    page.locator("button.auth-button[type=submit]").click()
    try:
        page.wait_for_function("() => !location.pathname.endsWith('/sign-up')", timeout=12000)
    except Exception:
        # Already registered by an earlier run on this stand-in: sign in instead.
        sign_in(page, "admin@example.test", "/admin")
    if "/profile" in page.url:
        fill_profile(page)
    page.wait_for_url("**/admin**", timeout=40000)
    settle(page)
    return ctx, page


with sync_playwright() as p:
    b = p.chromium.launch()
    errors = []

    # 1. Drill catalogues for a free account.
    ctx = new_context(b, "en", 1440, 900)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append("1: " + str(e)[:200]))
    student = f"fixes-free-{STAMP}@example.test"
    sign_up(page, student)
    page.wait_for_url("**/dashboard**", timeout=40000)
    settle(page)
    for route in ("/trainers/reading", "/trainers/listening"):
        visit(page, route)
        page.wait_for_function("() => !!document.querySelector('[data-paid-locked]') || document.body.innerText.includes('practice and guidance')", timeout=30000)
        locked = page.locator("[data-paid-locked]").count() > 0
        visible_drills = page.locator("main a[href*='/trainers/reading/']:visible, main a[href*='/trainers/listening/']:visible").count()
        check(f"1. free account, {route}: the locked page, no drill catalogue", locked and visible_drills == 0, f"locked={locked} visible drill links={visible_drills}")
        page.screenshot(path=str(OUT / f"1-free{route.replace('/', '-')}.png"))

    # 3. Nudge once per account: this account finishes a lesson here...
    visit(page, "/lessons/reading/paraphrase")
    lesson_ready(page)
    page.locator("#lesson-complete-btn").scroll_into_view_if_needed()
    # Lesson progress is saved to the account 1.5 s after a change (src/lib/auth/sync.ts):
    # wait for that save to reach the server before this "device" is closed.
    with page.expect_response(lambda r: "user_state" in r.url and r.request.method in ("POST", "PATCH", "PUT"), timeout=20000) as saved:
        page.locator("#lesson-complete-btn").click()
        feat = dialog_feature(page, timeout=12000)
    check("3. first device: the nudge appears after the account's first finished lesson", feat == "first-lesson", feat)
    check("3. first device: the finished lesson was saved to the account", saved.value.ok, saved.value.status)
    page.screenshot(path=str(OUT / "3-first-device-nudge.png"))
    ctx.close()

    # ...then a second, fresh device finishes another lesson: no nudge.
    ctx = new_context(b, "en", 1440, 900)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append("3b: " + str(e)[:200]))
    # As the verifier did: sign in straight to a lesson and wait for it.
    sign_in(page, student, "/lessons/reading/paraphrase")
    page.wait_for_url("**/lessons/reading/paraphrase**", timeout=40000)
    settle(page)
    # The account's synced progress has arrived on this device: the earlier lesson shows as studied.
    visit(page, "/lessons/reading/paraphrase")
    lesson_ready(page)
    page.wait_for_function("() => /Studied, tap to undo/.test(document.querySelector('#lesson-complete-btn')?.textContent || '')", timeout=30000)
    visit(page, "/lessons/reading/tfng")
    lesson_ready(page)
    page.locator("#lesson-complete-btn").scroll_into_view_if_needed()
    page.locator("#lesson-complete-btn").click()
    try:
        page.wait_for_selector(DIALOG, timeout=6000)
        second = True
    except Exception:
        second = False
    check("3. second device, another lesson: no nudge (once per account)", not second)
    ctx.close()

    # 2. Russian at 320: Tests page width, and the pop-up's sign-up button.
    for state in ("signed-out", "free"):
        ctx = new_context(b, "ru", 320, 700)
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)[:200]))
        if state == "free":
            sign_up(page, f"fixes-320-{STAMP}@example.test")
            page.wait_for_url("**/dashboard**", timeout=40000)
        visit(page, "/tests", "[data-test-rotation]")
        settle(page)
        w = page.evaluate("({doc: document.documentElement.scrollWidth, view: document.documentElement.clientWidth})")
        check(f"2. RU 320 /tests ({state}): no sideways scroll", w["doc"] <= w["view"], w)
        page.screenshot(path=str(OUT / f"2-tests-ru-320-{state}.png"), full_page=True)
        if state == "signed-out":
            for i in range(5):
                visit(page, "/tests", "[data-test-rotation]")
                page.locator("[data-test-rotation]").first.click()
                dialog_feature(page)
                page.locator("[data-upgrade-primary]").click()
                page.wait_for_url("**/sign-up**", timeout=15000)
                page.wait_for_selector("#signup-email", timeout=20000)
            check("2. RU 320: the pop-up's sign-up button, 5 times, no browser error", not errs, errs[:2])
        ctx.close()

    # 4. Admin: Renew shows when access runs until.
    actx, ap = admin_page(b)
    ap.on("pageerror", lambda e: errors.append("4: " + str(e)[:200]))
    ap.wait_for_selector("input[type=search]", timeout=40000)
    ap.locator("input[type=search]").fill(student)
    row = ap.locator("button.admin-row-main").first
    row.wait_for(timeout=15000)
    if row.get_attribute("aria-expanded") != "true":
        row.click()
    ap.wait_for_selector("section.admin-access:not([aria-busy=true])", timeout=20000)
    for label in ("Give free access (30 days)", "Renew (another 30 days)"):
        ap.get_by_role("button", name=label).click()
        ap.wait_for_function("() => { const m = document.querySelector('.admin-access-message'); return m && m.textContent.trim().length > 0 }", timeout=20000)
        ap.wait_for_timeout(600)
    msg = ap.locator(".admin-access-message").inner_text().strip()
    runs = ap.locator(".admin-kv div:has(dt:text-is('Access runs until')) dd")
    runs_text = runs.first.inner_text() if runs.count() else ""
    check("4. admin: after Renew the Access block says when access runs until", runs.count() == 1 and "queued" in runs_text, f"{runs_text!r} | message: {msg!r}")
    ap.screenshot(path=str(OUT / "4-admin-after-renew.png"))
    ap.get_by_role("button", name="Stop free access").click()
    ap.get_by_role("button", name="Yes, stop").click()
    actx.close()

    # 5. Signed-out Today shows the course's lesson titles.
    for lang, w, h in (("en", 1440, 900), ("ru", 390, 844)):
        ctx = new_context(b, lang, w, h)
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append("5: " + str(e)[:200]))
        visit(page, "/dashboard")
        page.wait_for_selector("a[href*='/lessons/']", timeout=30000)
        titles = page.locator("main a[href*='/lessons/']").count()
        invite = "/sign-up" in page.content()
        check(f"5. signed-out Today ({lang} {w}): sign-up invitation plus lesson titles", invite and titles >= 20, f"lesson links={titles}")
        page.screenshot(path=str(OUT / f"5-today-signed-out-{lang}-{w}.png"))
        ctx.close()

    check("no uncaught page errors in these checks", not errors, errors[:3])
    b.close()

passed = sum(1 for r in results if r["ok"])
(OUT / "results.json").write_text(json.dumps({"passed": passed, "total": len(results), "results": results}, indent=1, ensure_ascii=False), encoding="utf-8")
print(f"\n{passed} of {len(results)} passed")
sys.exit(0 if passed == len(results) else 1)
