"""Trust and human support (audit F04), clicked through in a real browser.

Needs four servers it does NOT start itself (Builder E, 29 September 2026):

  the open stand-in and site:
    MR_EZ_DEV_PORT=8572 MR_EZ_SITE_ORIGIN=http://localhost:4572 node tools/mr-ez-dev-server.mjs
    PUBLIC_SUPABASE_URL=http://127.0.0.1:8572 PUBLIC_SUPABASE_ANON_KEY=local-anon-key \
      PUBLIC_MR_EZ_URL=http://127.0.0.1:8572/tutor \
      PUBLIC_SUPPORT_URL=http://127.0.0.1:8572/support npx astro dev --port 4572

  the trial stand-in and site (the commands in t01_trial_journey.py's header,
  on 8571 and 4571).

Then: python tests/browser/e01_trust_journey.py

Signed-out support (re-audit R01, 30 September 2026) goes to the REAL support
Worker, which the stand-in mounts at /support and which limits each sender by
network address. Every browser here shares this machine's address, so each
signed-out visitor is played from its own address with the stand-in's
test-only X-Standin-Source header (tools/stand-in/support.mjs). The header
exists only in the stand-in's bridge, never in the Worker. The run also
floods the form from one played address and shows that a different visitor
still gets through, and that a direct anonymous call to the database is
refused.

Every account is synthetic (@example.test) and lives only in the stand-in's
memory. Stored support requests are read back from the stand-in's own
database (GET /__support/state), not inferred from the screen. Screenshots go
to E01_SHOTS (default: .tmp/e01-trust).
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

OPEN = os.environ.get("E01_OPEN_URL", "http://localhost:4572/ielts-website")
OPEN_STANDIN = os.environ.get("E01_OPEN_STANDIN", "http://127.0.0.1:8572")
TRIAL = os.environ.get("E01_TRIAL_URL", "http://localhost:4571/ielts-website")
TRIAL_STANDIN = os.environ.get("E01_TRIAL_STANDIN", "http://127.0.0.1:8571")
ROOT = Path(__file__).resolve().parents[2]
SHOTS = Path(os.environ.get("E01_SHOTS", ROOT / ".tmp" / "e01-trust"))
SHOTS.mkdir(parents=True, exist_ok=True)

RUN = str(int(time.time()))
PASSWORD = "synthetic-pass-123"
COMBOS = [("en", 1440, 900), ("ru", 1440, 900), ("en", 390, 844), ("ru", 390, 844)]

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)
    return bool(ok)


def call(base: str, path: str, body: dict | None = None, headers: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        base + path,
        data=data,
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST" if body is not None else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def requests(standin: str) -> list[dict]:
    return call(standin, "/__support/state")[1]["requests"]


def shot(page, name: str, full: bool = True):
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=full)


def new_page(browser, locale: str, width: int, height: int):
    phone = width < 720
    ctx = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=2 if phone else 1,
        is_mobile=phone,
        has_touch=phone,
    )
    ctx.add_init_script(f"try {{ localStorage.setItem('ielts.locale.v1', '{locale}'); }} catch (e) {{}}")
    return ctx, ctx.new_page()


def goto(page, base: str, route: str):
    page.goto(base + route, wait_until="domcontentloaded")
    page.wait_for_timeout(1200)


def route_of(page, base: str) -> str:
    from urllib.parse import urlparse

    path = urlparse(page.url).path
    prefix = urlparse(base).path.rstrip("/")
    return path[len(prefix):] if prefix and path.startswith(prefix) else path


def wait_route(page, base: str, predicate, timeout_ms=20000) -> bool:
    deadline = time.time() + timeout_ms / 1000
    while time.time() < deadline:
        if predicate(route_of(page, base)):
            return True
        page.wait_for_timeout(200)
    return False


def wait_text(page, text: str, timeout_ms=15000) -> bool:
    try:
        page.get_by_text(text, exact=False).first.wait_for(timeout=timeout_ms)
        return True
    except Exception:
        return False


def no_sideways_scroll(page) -> bool:
    return page.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1")


def fill_profile(page):
    page.wait_for_selector("#profile-firstName", timeout=20000)
    page.locator("#profile-firstName").fill("Synthetic")
    page.locator("#profile-lastName").fill("Student")
    page.locator("#profile-dob-day").select_option("4")
    page.locator("#profile-dob-month").select_option("3")
    page.locator("#profile-dob-year").select_option("2000")
    page.locator("#profile-phone").fill("+7 701 234 56 78")
    page.locator("#profile-city").fill("Almaty")
    page.locator("#profile-occupation").fill("Synthetic University")
    page.locator("#profile-source-friend").check(force=True)
    page.locator(".auth-form button[type=submit]").click()


def sign_up(page, base: str, email: str, locale: str, tag: str, capture: bool = False):
    goto(page, base, "/sign-up?next=/dashboard")
    page.wait_for_selector("#signup-email", timeout=20000)
    why = page.locator("#signup-why")
    expected = "How we handle your information" if locale == "en" else "Как мы обращаемся с вашими данными"
    wait_text(page, expected, 8000)
    if capture:
        check(f"{tag} sign-up: explains the next step and links to /privacy",
              why.is_visible() and expected in why.inner_text() and why.locator("a[href$='/privacy']").count() == 1,
              why.inner_text()[:80])
        shot(page, f"{tag}-sign-up")
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    page.locator("#signup-confirm").fill(PASSWORD)
    page.locator(".auth-form button[type=submit]").click()
    wait_route(page, base, lambda r: r == "/profile")
    page.wait_for_selector("#profile-firstName", timeout=20000)
    if capture:
        why_p = page.locator("#profile-why")
        expected_p = "Why we ask for each one" if locale == "en" else "Зачем нужен каждый пункт"
        wait_text(page, expected_p, 8000)
        hint = page.locator("#profile-phone-hint").inner_text()
        check(f"{tag} profile: why and who sees it, linked to /privacy",
              why_p.is_visible() and expected_p in why_p.inner_text()
              and why_p.locator("a[href$='/privacy#privacy-asked']").count() == 1, why_p.inner_text()[:80])
        check(f"{tag} profile: no vague 'the centre' wording",
              "centre" not in page.locator(".auth-panel").inner_text().replace("The teaching centre", "")
              and "центр" not in hint, hint)
        shot(page, f"{tag}-profile")
    fill_profile(page)
    wait_route(page, base, lambda r: r != "/profile")
    page.wait_for_timeout(800)


def play_source(page, address: str):
    """Signed-out requests from this page reach the support Worker as if from
    `address` (the stand-in's test-only header; see this file's header)."""
    page.route(
        "**/support/request",
        lambda route: route.continue_(headers={**route.request.headers, "x-standin-source": address}),
    )


def support_outcome(page, timeout_ms=20000) -> tuple[bool, str]:
    """Waits for the form to answer: (sent, the refusal sentence if any)."""
    page.wait_for_selector(".support-sent, .auth-form .auth-alert", timeout=timeout_ms)
    if page.locator(".support-sent").count():
        return True, ""
    return False, page.locator(".auth-form .auth-alert").first.inner_text()


def send_support(page, message: str, email: str | None = None) -> bool:
    page.wait_for_selector("#support-message", timeout=20000)
    page.locator("label:has(#support-topic-problem)").click()
    page.locator("#support-message").fill(message)
    if email is not None:
        page.locator("#support-email").fill(email)
    page.locator(".auth-form button[type=submit]").click()
    return page.locator(".support-sent").first.is_visible() or bool(
        page.wait_for_selector(".support-sent", timeout=15000)
    )


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ── Open site: sign-up, profile, policies, footer, Help, support ──
        admin_email = None
        for locale, w, h in COMBOS:
            tag = f"{locale}-{w}"
            email = f"e01-{tag}-{RUN}@example.test"
            admin_email = admin_email or email
            ctx, page = new_page(browser, locale, w, h)
            sign_up(page, OPEN, email, locale, tag, capture=True)

            goto(page, OPEN, "/privacy")
            h1 = page.locator("h1").first.inner_text()
            want = "How your information is used" if locale == "en" else "Как используются ваши данные"
            wait_text(page, want, 8000)
            h1 = page.locator("h1").first.inner_text()
            body = page.locator(".policy").inner_text()
            check(f"{tag} /privacy: readable in the chosen language", want in h1, h1)
            check(f"{tag} /privacy: names the real services and says recordings are not saved",
                  "OpenAI" in body and "Supabase" in body
                  and ("recording itself is not saved" in body or "запись сайт не сохраняет" in body))
            check(f"{tag} /privacy: no operator line while unpublished",
                  page.locator("#privacy-who").count() == 0 and "TBD" not in body)
            check(f"{tag} /privacy: no sideways scroll", no_sideways_scroll(page))
            shot(page, f"{tag}-privacy")

            goto(page, OPEN, "/terms")
            want = "The terms, in plain words" if locale == "en" else "Условия простыми словами"
            wait_text(page, want, 8000)
            body = page.locator(".policy").inner_text()
            price = ("10,000 KZT" in body and "25,000 KZT" in body) if locale == "en" else (
                "10 000 тенге" in body.replace(" ", " ") and "25 000 тенге" in body.replace(" ", " "))
            check(f"{tag} /terms: readable, with the approved prices", want in body and price)
            check(f"{tag} /terms: refund of the unused share, no renewal, fair daily limits, results kept",
                  all(k in body for k in (["share you have not used", "Nothing renews", "daily safety limit", "stays on your account"]
                                           if locale == "en" else ["неиспользованную часть", "не продлевается", "дневной лимит", "остаётся в аккаунте"])))
            check(f"{tag} /terms: says buying is not open yet", "not open yet" in body or "пока нельзя" in body)
            check(f"{tag} /terms: no sideways scroll", no_sideways_scroll(page))
            shot(page, f"{tag}-terms")

            goto(page, OPEN, "/help")
            wait_text(page, "Talk to a person" if locale == "en" else "Написать человеку", 8000)
            band = page.locator(".help-person")
            check(f"{tag} /help: 'Talk to a person' with the form link",
                  band.is_visible() and band.locator("a[href*='/support?reason=help']").count() == 1)
            footer = page.locator(".ws-footer")
            hrefs = footer.locator("a").evaluate_all("els => els.map(e => e.getAttribute('href'))")
            check(f"{tag} footer: Help, Report a problem, Privacy, Terms",
                  [h.split("/ielts-website")[-1] for h in hrefs] == ["/help", "/support?reason=footer", "/privacy", "/terms"], str(hrefs))
            check(f"{tag} footer/help: no sideways scroll", no_sideways_scroll(page))
            shot(page, f"{tag}-help")
            footer.scroll_into_view_if_needed()
            footer.screenshot(path=str(SHOTS / f"{tag}-footer.png"))

            # Signed in: send from the footer link.
            before = len(requests(OPEN_STANDIN))
            footer.locator("a").nth(1).click()
            wait_route(page, OPEN, lambda r: r == "/support")
            page.wait_for_selector("#support-message", timeout=20000)
            check(f"{tag} /support signed in: no email asked, replies to the account",
                  page.locator("#support-email").count() == 0 and email in page.locator(".support-reply-to").inner_text())
            # Too short first: the form refuses before sending.
            page.locator("label:has(#support-topic-question)").click()
            page.locator("#support-message").fill("short")
            page.locator(".auth-form button[type=submit]").click()
            page.wait_for_selector("#support-message-error", timeout=10000)
            check(f"{tag} /support: a too-short message is refused in the form",
                  page.locator("#support-message-error").count() == 1 and len(requests(OPEN_STANDIN)) == before)
            shot(page, f"{tag}-support-signed-in", full=False)
            send_support(page, f"Signed-in request from {tag}: the footer link works.")
            page.locator(".support-sent").wait_for(state="visible", timeout=15000)
            shot(page, f"{tag}-support-sent", full=False)
            rows = requests(OPEN_STANDIN)
            mine = [r for r in rows if r["account_email"] == email]
            check(f"{tag} /support signed in: stored with the account, from the footer",
                  len(rows) == before + 1 and len(mine) == 1 and mine[0]["context"] == "footer"
                  and mine[0]["contact_email"] is None and mine[0]["locale"] == locale, json.dumps(mine[:1])[:200])
            ctx.close()

            # Signed out: an email is required. Each visitor has their own address.
            ctx, page = new_page(browser, locale, w, h)
            play_source(page, f"198.51.100.{10 + COMBOS.index((locale, w, h))}")
            posted: list[str] = []
            page.on("request", lambda r, posted=posted: posted.append(r.url) if r.method == "POST" else None)
            goto(page, OPEN, "/support")
            page.wait_for_selector("#support-message", timeout=20000)
            page.locator("label:has(#support-topic-question)").click()
            page.locator("#support-message").fill(f"Visitor question from {tag}, before signing up.")
            page.locator(".auth-form button[type=submit]").click()
            page.wait_for_selector("#support-email-error", timeout=10000)
            check(f"{tag} /support signed out: email is required",
                  page.locator("#support-email-error").count() == 1)
            shot(page, f"{tag}-support-signed-out", full=False)
            visitor = f"visitor-{tag}-{RUN}@example.test"
            page.locator("#support-email").fill(visitor)
            page.locator(".auth-form button[type=submit]").click()
            sent, alert = support_outcome(page)
            rows = requests(OPEN_STANDIN)
            v = [r for r in rows if r["contact_email"] == visitor]
            check(f"{tag} /support signed out: stored with the visitor's email and no account",
                  sent and len(v) == 1 and v[0]["user_id"] is None, alert or json.dumps(v[:1])[:200])
            check(f"{tag} /support signed out: sent through the support Worker, never straight to the database",
                  any(u.endswith("/support/request") for u in posted)
                  and not any("/rest/v1/rpc/support_request" in u for u in posted), str([u for u in posted if "support" in u]))
            check(f"{tag} /support signed out: the sender is kept as a hash, not an address",
                  len(v) == 1 and len(v[0]["source_hash"] or "") == 64 and "198.51.100" not in json.dumps(v))
            ctx.close()

        # ── R01: one sender cannot use up everyone's signed-out support ──
        flooder = "203.0.113.7"
        before = len(requests(OPEN_STANDIN))
        flood = [
            call(OPEN_STANDIN, "/support/request",
                 {"email": f"flood-{i}-{RUN}@example.test", "topic": "question",
                  "message": f"Synthetic flood message {i} from one sender.", "locale": "en"},
                 {"Origin": OPEN.split("/ielts-website")[0], "X-Standin-Source": flooder, "X-Forwarded-For": f"10.0.0.{i}"})
            for i in range(1, 41)
        ]
        ok_count = sum(1 for status, body in flood if status == 200 and body.get("ok") is True)
        codes = {(status, body.get("code")) for status, body in flood if status != 200}
        check("R01 flood: of forty requests with forty emails from one sender, three are accepted",
              ok_count == 3 and codes == {(429, "source-hour")} and len(requests(OPEN_STANDIN)) == before + 3,
              f"{ok_count} accepted, refusals {sorted(codes)}, {len(requests(OPEN_STANDIN)) - before} stored")
        for locale, w, h in [("en", 1440, 900), ("ru", 390, 844)]:
            tag = f"{locale}-{w}"
            # The flooding sender, in the real form: told it is their own limit.
            ctx, page = new_page(browser, locale, w, h)
            play_source(page, flooder)
            goto(page, OPEN, "/support")
            page.wait_for_selector("#support-message", timeout=20000)
            page.locator("label:has(#support-topic-question)").click()
            page.locator("#support-message").fill("One more from the sender who already sent forty.")
            page.locator("#support-email").fill(f"flood-form-{tag}-{RUN}@example.test")
            page.locator(".auth-form button[type=submit]").click()
            sent, alert = support_outcome(page)
            own = "in the last hour" if locale == "en" else "За последний час"
            everyone = "Many messages are arriving" if locale == "en" else "приходит много сообщений"
            check(f"R01 {tag}: the flooding sender is refused with their own reason, not 'many messages are arriving'",
                  not sent and own in alert and everyone not in alert, alert)
            shot(page, f"{tag}-r01-flood-sender-refused", full=False)
            ctx.close()
            # Straight afterwards, a new visitor on another address gets through.
            ctx, page = new_page(browser, locale, w, h)
            play_source(page, f"198.51.100.{20 if locale == 'en' else 21}")
            goto(page, OPEN, "/support")
            page.wait_for_selector("#support-message", timeout=20000)
            fresh = f"fresh-visitor-{tag}-{RUN}@example.test"
            page.locator("label:has(#support-topic-account)").click()
            page.locator("#support-message").fill("I cannot sign in to my account and need help from a person.")
            page.locator("#support-email").fill(fresh)
            page.locator(".auth-form button[type=submit]").click()
            sent, alert = support_outcome(page)
            stored = [r for r in requests(OPEN_STANDIN) if r["contact_email"] == fresh]
            check(f"R01 {tag}: a different visitor still sends, straight after the flood",
                  sent and len(stored) == 1, alert or "stored")
            shot(page, f"{tag}-r01-fresh-visitor-sent", full=False)
            ctx.close()
        anon = {"apikey": "local-anon-key"}
        status, body = call(OPEN_STANDIN, "/rest/v1/rpc/support_request_create",
                            {"p_topic": "question", "p_message": "A direct anonymous call.", "p_email": f"direct-{RUN}@example.test"}, anon)
        check("R01: an anonymous call straight to the old database function is refused", status == 403, f"{status} {body}")
        status, body = call(OPEN_STANDIN, "/rest/v1/rpc/support_request_visitor",
                            {"p_source_hash": "f" * 64, "p_email": f"direct-{RUN}@example.test", "p_topic": "question",
                             "p_message": "A direct anonymous call.", "p_challenged": True}, anon)
        check("R01: an anonymous call straight to the Worker's database function is refused", status == 403, f"{status} {body}")
        check("R01: neither direct call stored anything",
              not [r for r in requests(OPEN_STANDIN) if (r["contact_email"] or "").startswith("direct-")])

        # ── Mr EZ failure leads to a person (open site) ──
        for locale, w, h in [("en", 1440, 900), ("ru", 390, 844)]:
            tag = f"{locale}-{w}"
            email = f"e01-mrez-{tag}-{RUN}@example.test"
            ctx, page = new_page(browser, locale, w, h)
            sign_up(page, OPEN, email, locale, tag)
            goto(page, OPEN, "/lessons/reading/paraphrase")
            page.wait_for_timeout(1500)
            for _ in range(8):
                try:
                    page.locator(".mrez-launcher").first.click(timeout=3000)
                except Exception:
                    pass
                page.wait_for_timeout(600)
                if page.locator("#mrez-panel.is-open").count():
                    break
            # Mr EZ's service goes down only now, after the panel is ready.
            page.wait_for_selector("#mrez-input:not([disabled])", timeout=20000)
            page.route("**/tutor**", lambda route: route.abort())
            page.locator("#mrez-input").fill("Why is paraphrasing important?")
            page.keyboard.press("Enter")
            try:
                page.wait_for_selector(".mrez-error .support-link a", timeout=20000)
            except Exception:
                pass
            link = page.locator(".mrez-error .support-link a")
            check(f"{tag} Mr EZ failure: 'Ask a person' is offered", link.count() == 1,
                  page.locator(".mrez-error").first.inner_text()[:120] if page.locator(".mrez-error").count() else "no error box")
            shot(page, f"{tag}-mrez-failure", full=False)
            if link.count():
                link.click()
                wait_route(page, OPEN, lambda r: r == "/support")
                page.wait_for_selector("#support-message", timeout=20000)
                note = page.locator(".support-context").inner_text() if page.locator(".support-context").count() else ""
                check(f"{tag} Mr EZ failure: the form knows where the student came from",
                      "reason=mr-ez" in page.url and "from=%2Flessons%2Freading%2Fparaphrase" in page.url
                      and page.locator("#support-topic-problem").is_checked() and bool(note), page.url)
                shot(page, f"{tag}-support-from-mrez", full=False)
            ctx.close()

        # ── Admin reads, a student cannot ──
        call(OPEN_STANDIN, "/__support/admin", {"email": admin_email})
        ctx, page = new_page(browser, "en", 1440, 900)
        goto(page, OPEN, "/sign-in?next=/admin")
        page.wait_for_selector("#signin-email", timeout=20000)
        page.locator("#signin-email").fill(admin_email)
        page.locator("#signin-password").fill(PASSWORD)
        page.locator(".auth-form button[type=submit]").click()
        wait_route(page, OPEN, lambda r: r == "/admin")
        page.wait_for_selector("[data-testid=support-request]", timeout=20000)
        items = page.locator("[data-testid=support-request]")
        first_msg = items.first.locator(".admin-support-message").inner_text()
        stored = requests(OPEN_STANDIN)
        check("admin: newest first, the five newest shown at once",
              items.count() == min(5, len(stored)) and first_msg == stored[0]["message"], f"{items.count()} shown, {len(stored)} stored")
        shot(page, "en-1440-admin-support")
        page.locator(".admin-support-more").click()
        page.wait_for_timeout(300)
        check("admin: 'Show all' lists every stored request", items.count() == len(stored), f"{items.count()} of {len(stored)}")
        page.locator(".admin-support-more").click()
        page.wait_for_timeout(300)
        newest_id = requests(OPEN_STANDIN)[0]["id"]
        items.first.get_by_role("button", name="Mark as answered").click()
        page.wait_for_timeout(1000)
        newest = [r for r in requests(OPEN_STANDIN) if r["id"] == newest_id][0]
        check("admin: mark as answered is stored", bool(newest["answered_at"]) and "Answered" in items.first.inner_text())
        shot(page, "en-1440-admin-support-answered", full=False)
        ctx.close()

        student = f"e01-mrez-en-1440-{RUN}@example.test"
        ctx, page = new_page(browser, "en", 390, 844)
        goto(page, OPEN, "/sign-in?next=/admin")
        page.wait_for_selector("#signin-email", timeout=20000)
        page.locator("#signin-email").fill(student)
        page.locator("#signin-password").fill(PASSWORD)
        page.locator(".auth-form button[type=submit]").click()
        wait_route(page, OPEN, lambda r: r == "/admin")
        wait_text(page, "This page isn’t available", 15000)
        check("student at /admin: refused, and no request is shown",
              page.get_by_text("This page isn’t available").count() == 1
              and page.locator("[data-testid=support-request]").count() == 0
              and "Signed-in request" not in page.content())
        token = page.evaluate(
            "() => { for (const k of Object.keys(localStorage)) if (k.includes('auth-token')) return JSON.parse(localStorage.getItem(k)).access_token; return null; }"
        )
        status, body = call(OPEN_STANDIN, "/rest/v1/rpc/support_admin_list", {}, {"Authorization": f"Bearer {token}", "apikey": "local-anon-key"})
        check("student calling the admin function directly: refused by the database", status == 403, f"{status} {body}")
        shot(page, "en-390-admin-refused", full=False)
        ctx.close()

        # ── Trial: ended and locked screens lead to a person ──
        for locale, w, h in [("en", 1440, 900), ("ru", 390, 844)]:
            tag = f"trial-{locale}-{w}"
            email = f"e01-{tag}-{RUN}@example.test"
            ctx, page = new_page(browser, locale, w, h)
            sign_up(page, TRIAL, email, locale, tag)
            goto(page, TRIAL, "/trial")
            start = "Start my 3-day trial" if locale == "en" else "Начать 3 дня бесплатно"
            wait_text(page, start, 20000)
            for _ in range(5):
                try:
                    page.get_by_role("button", name=start).first.click(timeout=4000)
                except Exception:
                    pass
                page.wait_for_timeout(1500)
                if route_of(page, TRIAL) == "/dashboard":
                    break
            call(TRIAL_STANDIN, "/__trial/rewind", {"email": email, "minutes": 72 * 60})
            goto(page, TRIAL, "/dashboard")
            page.wait_for_selector(".trial-home .support-link a", timeout=20000)
            check(f"{tag} ended trial: 'Ask a person' under the ended notice",
                  page.locator(".trial-home .support-link a").count() == 1)
            shot(page, f"{tag}-ended-dashboard", full=False)

            goto(page, TRIAL, "/lessons/reading/paraphrase")
            page.wait_for_selector(".trial-gate .support-link a", timeout=20000)
            check(f"{tag} ended trial: locked lesson offers 'Ask a person'",
                  page.locator(".trial-gate .support-link a").count() == 1)
            shot(page, f"{tag}-ended-lesson", full=False)

            before = len(requests(TRIAL_STANDIN))
            page.locator(".trial-gate .support-link a").click()
            wait_route(page, TRIAL, lambda r: r == "/support")
            send_support(page, f"Ended-trial question from {tag}: how do I keep going?")
            rows = requests(TRIAL_STANDIN)
            mine = [r for r in rows if r["account_email"] == email]
            check(f"{tag} ended trial: request stored with its context",
                  len(rows) == before + 1 and len(mine) == 1 and mine[0]["context"] == "trial-ended"
                  and mine[0]["page"] == "/lessons/reading/paraphrase", json.dumps(mine[:1])[:200])
            shot(page, f"{tag}-support-sent", full=False)
            ctx.close()

        browser.close()

    passed = sum(1 for _, ok, _ in results if ok)
    lines = [f"# e01 trust journey, run {RUN}", "", f"{passed} of {len(results)} checks passed.", ""]
    lines += [f"- {'PASS' if ok else 'FAIL'} {name}" + (f" ({detail})" if detail and not ok else "") for name, ok, detail in results]
    (SHOTS / "results.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n{passed}/{len(results)} passed. Evidence in {SHOTS}")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
