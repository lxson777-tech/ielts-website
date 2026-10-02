"""Builder C (2 October 2026): consent at sign-up, the parent's declaration,
Download my data, the ai-review support reason and the AI labels, clicked
through on a local gated build (dev server 4461) with its own stand-in
(8861, started with --trial). Synthetic @example.test accounts only. Nothing
here calls a paid service: the stand-in answers every AI call as SIMULATED.

  python c_legal_check.py <out-dir>
"""
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
SITE = os.environ.get("C_SITE", "http://127.0.0.1:4461/ielts-website")
STANDIN = os.environ.get("C_STANDIN", "http://127.0.0.1:8861")
PASSWORD = "Synthetic-Verify-1"
STAMP = str(int(time.time()))
HYDRATED = """() => [...document.querySelectorAll('astro-island[ssr]')].every(el => ['visible', 'media'].includes(el.getAttribute('client')))"""
OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
results = []


def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": str(detail)[:400]})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{str(detail)[:300]}]" if detail and not ok else ""), flush=True)


def settle(page, extra=600):
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_function(HYDRATED, timeout=60000)
    page.wait_for_timeout(extra)


def ctx_for(browser, lang="en", w=1280, h=900):
    ctx = browser.new_context(viewport={"width": w, "height": h}, locale="ru-RU" if lang == "ru" else "en-GB", accept_downloads=True)
    ctx.add_init_script(f"try{{ localStorage.setItem('ielts.locale.v1','{lang}') }}catch(e){{}}")
    return ctx


def token(page):
    return page.evaluate("() => { for (const k of Object.keys(localStorage)) if (k.startsWith('sb-') && k.endsWith('-auth-token')) return JSON.parse(localStorage.getItem(k)).access_token; return null }")


def account_user(page):
    """The account as the stand-in's auth API returns it (GET /auth/v1/user)."""
    req = urllib.request.Request(STANDIN + "/auth/v1/user", headers={"Authorization": "Bearer " + token(page), "apikey": "local-anon-key"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def put_user(page, data):
    req = urllib.request.Request(STANDIN + "/auth/v1/user", data=json.dumps({"data": data}).encode(), method="PUT",
                                 headers={"Authorization": "Bearer " + token(page), "apikey": "local-anon-key", "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def give_access(email):
    """The stand-in's local helper: complimentary access, so the paid screens open."""
    req = urllib.request.Request(STANDIN + "/__access/complimentary", data=json.dumps({"email": email, "action": "give"}).encode(), method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return r.status


ESSAY = " ".join(["Some people believe that technology has made our lives easier, while others think it has created new problems."] * 4 +
                 ["In my opinion, the benefits clearly outweigh the drawbacks, because modern tools save time and connect people across great distances."] * 6 +
                 ["For example, students can now study online and communicate with teachers at any time of the day."] * 4)


def fill_profile(page, year="2000", minor=False):
    page.wait_for_selector("#profile-firstName", timeout=40000)
    page.locator("#profile-firstName").fill("Synthetic")
    page.locator("#profile-lastName").fill("Student")
    page.locator("#profile-dob-day").select_option("4")
    page.locator("#profile-dob-month").select_option("3")
    page.locator("#profile-dob-year").select_option(year)
    page.locator("#profile-phone").fill("+7 701 234 56 78")
    page.locator("#profile-city").fill("Almaty")
    page.locator("#profile-occupation").fill("Synthetic School")
    page.locator("#profile-source-friend").check(force=True)
    if minor:
        page.locator("#profile-parentName").fill("Synthetic Parent")
        page.locator("#profile-parentPhone").fill("+7 701 000 00 01")


with sync_playwright() as p:
    b = p.chromium.launch()

    # ── 1. Email sign-up: the tick is required, and stored with the account ──
    ctx = ctx_for(b)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(SITE + "/sign-up?next=%2Fdashboard", wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=60000)
    settle(page)
    box = page.locator("#signup-consent")
    check("sign-up: the consent box is there and unticked", box.count() == 1 and not box.is_checked())
    email = f"c-consent-{STAMP}@example.test"
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    page.locator("#signup-confirm").fill(PASSWORD)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_timeout(800)
    err = page.locator("#signup-consent-error")
    check("sign-up: without the tick the account is not created and the box says why", err.count() == 1 and "/sign-up" in page.url, page.url)
    page.locator("button.auth-button.is-secondary", has_text="Google").click()
    page.wait_for_timeout(800)
    check("sign-up: without the tick the Google button does not leave the page", "/sign-up" in page.url, page.url)
    page.locator("[data-testid=consent-details] > summary").click()
    page.wait_for_timeout(300)
    details = page.locator("[data-testid=consent-details]").inner_text()
    for needle in ["Who processes your data", "[full registered name]", "[IIN]", "Supabase", "OpenAI", "Cloudflare", "GitHub Pages", "outside Kazakhstan",
                   "The payment company handles payments (Kazakhstan)", "until you withdraw it or delete your account", "Delete account", "Consent version 2026-10-02"]:
        check(f"sign-up: the wording says '{needle}'", needle in details)
    page.screenshot(path=str(OUT / "01-sign-up-consent-open-en.png"), full_page=True)
    box.check()
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_url("**/profile**", timeout=40000)
    settle(page)
    meta = account_user(page)["user_metadata"]
    check("sign-up: the account holds consent_version 2026-10-02 and a time", meta.get("consent_version") == "2026-10-02" and "T" in str(meta.get("consent_at")), meta)
    check("profile after email sign-up: no second consent box", page.locator("#profile-consent").count() == 0)

    # ── 2. Under 18: the parent's declaration, stored with its version ──
    fill_profile(page, year="2011", minor=True)
    label = page.locator("label.auth-check", has=page.locator("#profile-parentConsent")).inner_text()
    check("profile: the parent's declaration covers data and, in the gated build, purchases",
          "personal data" in label and "any purchase of access" in label, label)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_timeout(800)
    check("profile: under 18 cannot save without the parent's tick", page.locator("#profile-parentConsent-error").count() == 1)
    page.screenshot(path=str(OUT / "02-profile-parent-declaration-en.png"), full_page=True)
    page.locator("#profile-parentConsent").check()
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_url("**/dashboard**", timeout=40000)
    meta = account_user(page)["user_metadata"]
    check("profile: parent_consent_version and parent_consent_at are on the account",
          meta.get("parent_consent_version") == "2026-10-02" and "T" in str(meta.get("parent_consent_at")), meta)

    # ── 3. Ask a person to review an AI result: the support reason ──
    page.goto(SITE + "/support?reason=ai-review", wait_until="domcontentloaded")
    settle(page, 1200)
    body = page.locator("main").inner_text()
    check("support: reason ai-review explains why the student came", "review an AI-marked result" in body, body[:300])
    picked = page.evaluate("() => { const r = document.querySelector('input[name$=topic]:checked, input[type=radio]:checked'); return r ? r.value : null }")
    check("support: the topic 'Something else' is pre-selected", picked == "other", picked)
    page.locator("textarea").first.fill("Please review the band on my last essay, synthetic test message.")
    page.locator("form button[type=submit]").first.click()
    page.wait_for_timeout(2500)
    page.screenshot(path=str(OUT / "03-support-ai-review-sent-en.png"), full_page=True)

    # ── 4. Download my data ──
    page.goto(SITE + "/account", wait_until="domcontentloaded")
    settle(page, 1500)
    row = page.locator("[data-testid=download-my-data]")
    check("account: the Download my data row is there", row.count() == 1 and row.is_visible())
    row.scroll_into_view_if_needed()
    page.screenshot(path=str(OUT / "04-account-download-row-en.png"), full_page=True)
    with page.expect_download(timeout=30000) as dl:
        row.locator("button").click()
    download = dl.value
    path = OUT / "05-my-data-sample.json"
    download.save_as(str(path))
    data = json.loads(path.read_text(encoding="utf-8"))
    check("download: the file is named by date", download.suggested_filename.startswith("ielts-is-ez-my-data-") and download.suggested_filename.endswith(".json"), download.suggested_filename)
    check("download: the account and its consent record are in it", data["account"]["email"] == email and data["account"]["metadata"].get("consent_version") == "2026-10-02")
    profile_rows = data["database"].get("student_profiles", {}).get("rows", [])
    check("download: the profile is in it", len(profile_rows) == 1 and profile_rows[0].get("first_name") == "Synthetic", profile_rows)
    support_rows = data["database"].get("support_requests", {}).get("rows", [])
    check("download: the support message sent above is in it, with its reason", any(r.get("context") == "ai-review" for r in support_rows), support_rows)
    check("download: what this browser keeps is in it, without the sign-in token",
          isinstance(data["thisBrowser"]["localStorage"], dict) and not any(k.startswith("sb-") for k in data["thisBrowser"]["localStorage"]))
    check("download: nothing could not be read", "couldNotBeRead" not in data, data.get("couldNotBeRead"))
    check("download: the closed records are named", [n["table"] for n in data["notIncluded"]] == ["mr_ez_turns", "live_examiner_sessions", "assessment_provider_usage"])
    status = row.locator("[role=status]").inner_text() if row.locator("[role=status]").count() else ""
    check("account: the row says the file is downloading", "downloading" in status, status)

    # ── 5. AI labels: an essay result, Mr EZ and the live examiner ──
    check("stand-in: complimentary access given", give_access(email) == 200)
    page.goto(SITE + "/trainers/writing", wait_until="domcontentloaded")
    settle(page, 1500)
    try:
        page.locator(".writing-choice-card").last.click(timeout=15000)
        page.locator("main textarea:visible").first.wait_for(timeout=20000)
        page.locator("main textarea:visible").first.fill(ESSAY)
        page.get_by_role("button", name="Check my essay").click()
        page.locator("[data-testid=ai-estimate-note]").wait_for(timeout=120000)
        note = page.locator("[data-testid=ai-estimate-note]")
        text = note.inner_text()
        href = note.locator("a").get_attribute("href") if note.locator("a").count() else ""
        check("essay result: says it was marked by AI and is not an official IELTS score",
              "Marked by AI" in text and "not an official IELTS score" in text, text)
        check("essay result: links to a person's review with reason ai-review", "reason=ai-review" in (href or ""), href)
        note.scroll_into_view_if_needed()
        page.screenshot(path=str(OUT / "05b-essay-result-ai-note-en.png"), full_page=False)
    except Exception as exc:  # noqa: BLE001
        page.screenshot(path=str(OUT / "05b-essay-result-missing.png"), full_page=True)
        check("essay result: the AI note appears", False, exc)
    page.goto(SITE + "/speaking/examiner", wait_until="domcontentloaded")
    settle(page, 1500)
    note = page.locator("[data-testid=ai-voice-note]")
    check("examiner: before the interview, Ms. Taylor is named as an AI voice", note.count() >= 1 and "Ms. Taylor is an AI voice, not a real person" in note.first.inner_text(),
          note.first.inner_text() if note.count() else "missing")
    page.screenshot(path=str(OUT / "06-examiner-ai-voice-en.png"), full_page=False)
    page.goto(SITE + "/dashboard", wait_until="domcontentloaded")
    settle(page, 1500)
    launcher = page.locator(".mrez-launcher")
    if launcher.count():
        launcher.first.click()
        page.wait_for_timeout(600)
        label = page.locator("[data-testid=mrez-ai-label]")
        check("Mr EZ: the panel says he is an AI tutor, not a real person", label.count() == 1 and label.is_visible())
        page.screenshot(path=str(OUT / "07-mr-ez-ai-label-en.png"), full_page=False)
    else:
        check("Mr EZ: launcher found", False)
    ctx.close()

    # ── 6. Google from /sign-up: the tick crosses the redirect ──
    ctx = ctx_for(b)
    page = ctx.new_page()
    page.goto(SITE + "/sign-up?next=%2Fdashboard", wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=60000)
    settle(page)
    page.locator("#signup-consent").check()
    page.locator("button.auth-button.is-secondary", has_text="Google").click()
    page.wait_for_url("**/profile**", timeout=40000)
    settle(page, 1500)
    meta = account_user(page)["user_metadata"]
    check("Google: the tick given before the redirect is on the account afterwards", meta.get("consent_version") == "2026-10-02", meta)
    left = page.evaluate("() => sessionStorage.getItem('ielts.consent.pending.v1')")
    check("Google: the pending tick is cleared from the tab", left is None, left)
    check("Google: the profile form does not ask again", page.locator("#profile-consent").count() == 0)
    if page.locator("#profile-firstName").count():  # a fresh stand-in: the Google account has no profile yet
        fill_profile(page)
        page.locator("button.auth-button[type=submit]").click()
    page.wait_for_url("**/dashboard**", timeout=40000)

    # ── 7. An account without current consent is asked on the profile form ──
    # Take the consent off this account, then sign in again with Google from
    # /sign-in (no tick there), so the browser holds the account as it is now.
    put_user(page, {"consent_version": None, "consent_at": None})
    page.evaluate("() => { for (const k of Object.keys(localStorage)) if (k.startsWith('sb-')) localStorage.removeItem(k) }")
    page.goto(SITE + "/sign-in", wait_until="domcontentloaded")
    page.wait_for_selector("#signin-email", timeout=60000)
    settle(page)
    page.locator("button.auth-button.is-secondary", has_text="Google").click()
    page.wait_for_timeout(3000)
    page.goto(SITE + "/profile", wait_until="domcontentloaded")
    settle(page, 1500)
    check("no consent on the account: the profile form shows the box", page.locator("#profile-consent").count() == 1)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_timeout(800)
    check("no consent: saving without the tick is refused", page.locator("#profile-consent-error").count() == 1)
    page.screenshot(path=str(OUT / "08-profile-asks-consent-en.png"), full_page=True)
    page.locator("#profile-consent").check()
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_timeout(2000)
    meta = account_user(page)["user_metadata"]
    check("no consent: ticking and saving stores it", meta.get("consent_version") == "2026-10-02", meta)
    ctx.close()

    # ── 8. Russian ──
    ctx = ctx_for(b, "ru", 390, 844)
    page = ctx.new_page()
    page.goto(SITE + "/sign-up", wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=60000)
    settle(page, 1200)
    page.locator("[data-testid=consent-details] > summary").click()
    page.wait_for_timeout(300)
    text = page.locator("[data-testid=consent-details]").inner_text() + page.locator("label.auth-check").first.inner_text()
    check("ru: the consent sentence and wording are Russian", "Я согласен(на)" in text and "Кто обрабатывает ваши данные" in text and "за пределы Казахстана" in text, text[:200])
    page.screenshot(path=str(OUT / "09-sign-up-consent-ru-390.png"), full_page=True)
    ctx.close()

    check("no uncaught page errors in the English run", not errors, errors[:3])
    b.close()

(OUT / "results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
failed = [r for r in results if not r["ok"]]
print(f"\n{len(results) - len(failed)} of {len(results)} passed")
sys.exit(1 if failed else 0)
