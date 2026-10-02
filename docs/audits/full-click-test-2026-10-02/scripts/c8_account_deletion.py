"""C8: a student deletes their own account (2 October 2026), end to end, on
the local review servers (gated 4441 with stand-in 8841: the real
delete_my_account() in PGlite; open 4442). Synthetic accounts only.

  python c8_account_deletion.py <out-dir>
"""
import json
import sys
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from c_common import GATED, OPEN, PASSWORD, STAMP, STANDIN, account, new_ctx, ready, sign_in, watch  # noqa: E402

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
results = []


def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": str(detail)[:300]})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{str(detail)[:220]}]" if detail and not ok else ""), flush=True)


def state():
    with urllib.request.urlopen(STANDIN + "/__trial/state") as r:
        return json.loads(r.read())


with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in ("en", "ru"):
        ctx = new_ctx(b, lang, 1440 if lang == "en" else 390, 900 if lang == "en" else 844)
        page = ctx.new_page()
        errors = []
        watch(page, errors, GATED)
        email = account(page, "paid", f"delete-{lang}")  # signed up, profile filled, free access given
        user_id = page.evaluate("() => { for (const k of Object.keys(localStorage)) if (k.startsWith('sb-') && k.endsWith('-auth-token')) return JSON.parse(localStorage.getItem(k)).user.id; return null }")
        # Some real work, so there is data to delete.
        page.goto(GATED + "/lessons/reading/tfng", wait_until="domcontentloaded")
        ready(page, 2500)
        page.locator("#lesson-complete-btn").click()
        page.wait_for_timeout(2500)
        before = state()
        # The stand-in's state: tiers name each account by email, grants by user id.
        had = any(t.get("email") == email for t in before.get("tiers", [])) and any(g.get("user_id") == user_id for g in before.get("grants", []))
        check(f"{lang}: before deleting, the account and its access exist", had)
        page.goto(GATED + "/account", wait_until="domcontentloaded")
        ready(page, 2500)
        row = page.locator(".acct-row-danger")
        check(f"{lang}: Account > Profile shows Delete account", row.count() == 1 and row.is_visible())
        row.locator("button.acct-toggle").click()
        page.wait_for_timeout(400)
        final = page.locator("button.auth-button.is-danger")
        check(f"{lang}: the final button stays off until the box is ticked", final.is_disabled())
        page.screenshot(path=str(OUT / f"delete-form-{lang}.png"), full_page=True)
        page.locator(".acct-confirm input").check()
        final.click()
        page.wait_for_url("**/account-deleted**", timeout=20000)
        ready(page, 1500)
        page.screenshot(path=str(OUT / f"deleted-{lang}.png"))
        check(f"{lang}: the student lands on the 'account deleted' page", "/account-deleted" in page.url, page.url)
        left = page.evaluate(f"() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(k => k.includes('{user_id}') || (k.startsWith('sb-') && k.endsWith('-auth-token')))")
        check(f"{lang}: nothing of the account is left in this browser", user_id and left == [], left[:4])
        after = state()
        gone = had and not any(t.get("email") == email for t in after.get("tiers", [])) and not any(g.get("user_id") == user_id for g in after.get("grants", []))
        check(f"{lang}: the database has no account and no access for that student any more", gone)
        # The same email and password no longer sign in.
        page.goto(GATED + "/sign-in", wait_until="domcontentloaded")
        page.wait_for_selector("#signin-email", timeout=30000)
        ready(page)
        page.locator("#signin-email").fill(email)
        page.locator("#signin-password").fill(PASSWORD)
        page.locator("button.auth-button[type=submit]").click()
        page.wait_for_timeout(3000)
        check(f"{lang}: signing in with the deleted account is refused", "/sign-in" in page.url, page.url)
        check(f"{lang}: no page error along the way", not [e for e in errors if e["kind"] == "pageerror"], errors[:2])
        ctx.close()
    # The open build (the live site's version) does not offer it until its migration is applied.
    ctx = new_ctx(b, "en", 1440, 900)
    page = ctx.new_page()
    page.goto(OPEN + "/sign-up?next=%2Faccount", wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=30000)
    ready(page)
    page.locator("#signup-email").fill(f"c8-open-{STAMP}@example.test")
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    page.locator("button.auth-button[type=submit]").click()
    from c_common import fill_profile  # noqa: E402
    fill_profile(page)
    page.wait_for_url("**/account**", timeout=40000)
    ready(page, 2500)
    check("open build: no Delete account row until the migration is live", page.locator(".acct-row-danger").count() == 0)
    ctx.close()
    b.close()
(OUT / "results.json").write_text(json.dumps(results, indent=1, ensure_ascii=False), encoding="utf-8")
print(f"\n{sum(r['ok'] for r in results)} of {len(results)} passed")
