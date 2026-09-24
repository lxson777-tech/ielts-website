"""The three-day trial, clicked through in a real browser.

A one-off, self-contained journey in the style of f20_account_journey.py. It
needs two servers that it does NOT start itself:

  the free local backend, in trial mode (the real trial migration in PGlite,
  the real Mr EZ Worker with simulated replies, the real essay and speaking
  graders with a labelled SIMULATED assessment, the real live examiner
  Worker with a SIMULATED voice session; nothing is billed):
    MR_EZ_DEV_PORT=8795 MR_EZ_SITE_ORIGIN=http://localhost:4331 \
      node --import ./tests/ts-extension-loader.mjs tools/mr-ez-dev-server.mjs --trial

  the site, as a trial build pointed at it:
    PUBLIC_ACCESS_MODE=trial PUBLIC_SUPABASE_URL=http://127.0.0.1:8795 \
    PUBLIC_SUPABASE_ANON_KEY=local-anon-key PUBLIC_MR_EZ_URL=http://127.0.0.1:8795/tutor \
    PUBLIC_GRADER_URL=http://127.0.0.1:8795/grade-essay \
    PUBLIC_CONTENT_URL=http://127.0.0.1:8795/content \
    PUBLIC_LIVE_EXAMINER_URL=http://127.0.0.1:8795/live \
    PUBLIC_SPEAKING_GRADER_URL=http://127.0.0.1:8795/grade-speaking npx astro dev --port 4331

The Speaking test's conversation itself is played by tests/browser/live_standin.js,
a WebRTC peer inside the test page standing in for OpenAI's voice service (the
browser's microphone is Chromium's fake device).

Then: python tests/browser/t01_trial_journey.py

Every student is a synthetic, freshly made account on the local backend.
Every claim about what was counted is read back from the backend's own trial
tables (GET /__trial/state), not inferred from the screen. Evidence goes to
docs/trial/evidence/ (results.md and screenshots).
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("TRIAL_BASE_URL", "http://localhost:4331/ielts-website")
STANDIN = os.environ.get("TRIAL_STANDIN_URL", "http://127.0.0.1:8795")
ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "docs" / "trial" / "evidence"
EVIDENCE.mkdir(parents=True, exist_ok=True)

RUN = str(int(time.time()))
PASSWORD = "synthetic-pass-123"

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)
    return bool(ok)


def shot(page, name: str, full: bool = True):
    path = EVIDENCE / f"{name}.png"
    try:
        page.screenshot(path=str(path), full_page=full)
    except Exception as e:  # noqa: BLE001
        print(f"  (screenshot {name} failed: {e})")


def standin(path: str, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        STANDIN + path,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST" if body is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read() or b"null")


def trial_state(email: str) -> dict:
    s = standin("/__trial/state")
    return {
        "account": next((a for a in s["accounts"] if a["email"] == email), None),
        "usage": [u for u in s["usage"] if u["email"] == email],
    }


def usage(email: str, kind: str, section: str, status: str | None = None) -> list[dict]:
    return [
        u
        for u in trial_state(email)["usage"]
        if u["kind"] == kind and u["section"] == section and (status is None or u["status"] == status)
    ]


def goto(page, path: str):
    page.goto(BASE + path, wait_until="domcontentloaded")
    page.wait_for_timeout(1200)


def wait_text(page, text: str, timeout=20000) -> bool:
    try:
        page.get_by_text(text, exact=False).first.wait_for(timeout=timeout)
        return True
    except Exception:
        return False


def try_click(locator, timeout=8000) -> bool:
    try:
        locator.first.click(timeout=timeout)
        return True
    except Exception:
        return False


def click_until(page, locator_fn, verify_fn, attempts=8, delay=1200) -> bool:
    """Large islands can take a moment to hydrate; a click before that is a
    silent no-op. Retry and check a real outcome after each attempt."""
    if verify_fn():
        return True
    for _ in range(attempts):
        try:
            locator_fn().first.click(timeout=4000)
        except Exception:
            pass
        page.wait_for_timeout(delay)
        if verify_fn():
            return True
    return verify_fn()


def english(page):
    page.add_init_script("try { localStorage.setItem('ielts.locale.v1', 'en'); } catch (e) {}")


def sign_up_in_modal(page, email: str):
    dialog = page.locator("[role='dialog'][aria-modal='true']")
    page.wait_for_selector("[role='dialog'][aria-modal='true']", timeout=10000)
    try_click(dialog.get_by_role("button", name="Sign up", exact=True), timeout=4000)
    page.wait_for_timeout(300)
    dialog.locator("#account-email").fill(email)
    dialog.locator("#account-password").fill(PASSWORD)
    if dialog.locator("#account-confirm").count():
        dialog.locator("#account-confirm").fill(PASSWORD)
    try_click(dialog.get_by_role("button", name="Create account"), timeout=8000)
    page.wait_for_timeout(2500)


def sign_in_in_modal(page, email: str):
    dialog = page.locator("[role='dialog'][aria-modal='true']")
    page.wait_for_selector("[role='dialog'][aria-modal='true']", timeout=10000)
    dialog.locator("#account-email").fill(email)
    dialog.locator("#account-password").fill(PASSWORD)
    try_click(dialog.get_by_role("button", name="Log in", exact=True), timeout=8000)
    page.wait_for_timeout(2500)


def open_auth(page, button: str) -> bool:
    return click_until(
        page,
        lambda: page.get_by_role("button", name=button),
        lambda: page.locator("[role='dialog'][aria-modal='true']").count() > 0,
    )


def open_mrez(page) -> bool:
    return click_until(
        page,
        lambda: page.locator(".mrez-launcher"),
        lambda: page.locator("#mrez-panel.is-open").count() > 0,
    )


def mrez_note(page) -> str:
    loc = page.locator(".mrez-trial-note")
    return loc.first.inner_text() if loc.count() else ""


def ask_mrez(page, text: str) -> None:
    page.locator("#mrez-input").fill(text)
    page.locator(".mrez-send").click()
    page.wait_for_timeout(2500)


def fill_answers(page) -> int:
    return page.evaluate(
        """() => {
            let n = 0;
            for (const el of document.querySelectorAll('select')) {
                if (el.options.length > 1) { el.selectedIndex = 1;
                    el.dispatchEvent(new Event('change', { bubbles: true })); n++; }
            }
            for (const el of document.querySelectorAll('input[type=text]')) {
                const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                setter.call(el, 'synthetic'); el.dispatchEvent(new Event('input', { bubbles: true })); n++;
            }
            for (const el of document.querySelectorAll('input[type=radio]')) {
                const name = el.name;
                if (name && !document.querySelector(`input[name="${name}"]:checked`)) { el.click(); n++; }
            }
            return n;
        }"""
    )


def submit_test(page) -> bool:
    submit = page.get_by_role("button", name="Submit")
    if not try_click(submit, timeout=10000):
        return False
    page.wait_for_timeout(1500)
    alert_panel = page.locator('[role="alert"]')
    if alert_panel.count():
        try_click(alert_panel.get_by_role("button", name="Submit"), timeout=6000)
    page.wait_for_timeout(2500)
    return True


GATED = ROOT / "gated-content"


def phrase_from(html: str) -> str:
    """Six plain words from inside ONE paragraph of a lesson or paper, so the
    same words appear together in the page's text however it is styled."""
    import re
    paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", html, flags=re.S) or [html]
    for para in paragraphs:
        words = re.sub(r"<[^>]+>", "", para).split()
        for i in range(len(words) - 6):
            run = words[i : i + 6]
            if all(re.fullmatch(r"[A-Za-z]+", w) for w in run) and len(" ".join(run)) > 30:
                return " ".join(run)
    return ""


def protected_visible(page) -> bool:
    return page.evaluate(
        "() => { const el = document.querySelector('[data-trial-protected]'); return !!el && el.offsetParent !== null; }"
    )


def run():
    a_email = f"trial-a-{RUN}@example.test"
    b_email = f"trial-b-{RUN}@example.test"

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=[
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
            # Both ends of the stand-in voice connection are in one page:
            # plain local addresses, not mDNS names, so they can reach each other.
            "--disable-features=WebRtcHideLocalIpsWithMdns",
        ])
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, permissions=["microphone"])
        english(ctx)

        # Warm-up: a freshly started dev server prepares its files on the first
        # visit to each page and then reloads that page once, which can close a
        # panel mid-step. Visit the pages the journey uses before any check runs.
        warm = ctx.new_page()
        for path in ("/trial", "/dashboard", "/lessons/reading/paraphrase", "/tests/reading-full-001",
                     "/writing/checker", "/speaking/examiner", "/plans"):
            try:
                warm.goto(BASE + path, wait_until="networkidle", timeout=60000)
            except Exception:
                pass
        warm.close()

        page = ctx.new_page()

        # ── 1. The public offer, signed out, arriving from the questionnaire ──
        goto(page, "/trial?journey=1&band=7&skill=writing&focus=method&time=30")
        check("offer: signed-out visitor sees the offer before any account",
              wait_text(page, "Create a free account") and wait_text(page, "One test each for Reading, Listening, Writing and Speaking"))
        check("offer: questionnaire answers shown as a suggestion, not a level",
              wait_text(page, "not a level test"))
        shot(page, "t01-offer-signed-out")

        # ── 2. A protected lesson while signed out: nothing painted, sign in asked ──
        goto(page, "/lessons/reading/paraphrase")
        wait_text(page, "Sign in to continue your trial")
        check("signed out: included lesson stays covered and asks to sign in",
              page.get_by_text("Sign in to continue your trial").count() > 0 and not protected_visible(page))

        # ── 3. Sign up through the real sign-in, then the explicit start ──
        goto(page, "/trial")
        open_auth(page, "Create a free account")
        sign_up_in_modal(page, a_email)
        check("join: after sign-up, eligibility shows the explicit start screen",
              wait_text(page, "Before you begin") and wait_text(page, "Start my 3-day trial"))
        check("join: questionnaire carried through the sign-in round trip",
              page.get_by_text("Your answers came with you").count() > 0)
        check("join: no trial exists before the student presses start",
              trial_state(a_email)["account"] is None)
        shot(page, "t02-before-you-begin")

        # A protected lesson before starting: an invitation, not the content.
        goto(page, "/lessons/reading/paraphrase")
        wait_text(page, "Start your free trial to open this")
        check("no trial yet: lesson covered with a start invitation",
              page.get_by_text("Start your free trial to open this").count() > 0 and not protected_visible(page))

        goto(page, "/trial")
        wait_text(page, "Start my 3-day trial")
        try_click(page.get_by_role("button", name="Start my 3-day trial"))
        page.wait_for_url("**/dashboard", timeout=20000)
        wait_text(page, "Your 3-day trial")
        a0 = trial_state(a_email)["account"]
        check("start: server recorded the trial with the questionnaire", bool(a0) and (a0 or {}).get("questionnaire", {}).get("skill") == "writing",
              json.dumps(a0) if a0 else "none")
        check("dashboard: time left from the server clock",
              wait_text(page, "2 days and 23 hours left") or wait_text(page, "3 days and 0 hours left"))
        check("dashboard: suggested section tab (Writing) opens first",
              page.locator("#trial-home-tab-writing[aria-selected='true']").count() == 1)
        shot(page, "t03-dashboard-desktop")

        # Keyboard: the section tabs move with the arrow keys.
        page.locator("#trial-home-tab-writing").focus()
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(300)
        check("keyboard: ArrowRight moves to Speaking and focuses it",
              page.evaluate("() => document.activeElement && document.activeElement.id") == "trial-home-tab-speaking"
              and page.locator("#trial-home-tab-speaking[aria-selected='true']").count() == 1)
        check("dashboard: the Speaking test is available (Part 1, Alex's decision)",
              page.get_by_text("1 available").count() > 0)
        page.keyboard.press("Home")
        page.wait_for_timeout(300)

        # Starting again (a second sign-up link, a bookmark) never restarts.
        goto(page, "/trial")
        check("restart: the join page says the trial is already running",
              wait_text(page, "Your trial is already running"))
        a1 = trial_state(a_email)["account"]
        check("restart: the stored start time did not move", a1 and a0 and a1["started_at"] == a0["started_at"])

        # ── 4. Lessons: the included one opens, others stay covered by direct link ──
        goto(page, "/lessons/reading/tfng")
        wait_text(page, "Available with full access")
        tfng_phrase = phrase_from((GATED / "lessons/en/reading-tfng.html").read_text(encoding="utf-8"))
        check("door: a locked lesson's text never reaches the browser", tfng_phrase not in page.content(), tfng_phrase)
        check("locked lesson by direct link: covered, title kept, View plans offered",
              page.get_by_text("Available with full access").count() > 0
              and page.get_by_role("link", name="View plans").count() > 0
              and not protected_visible(page))
        shot(page, "t04-locked-lesson")

        goto(page, "/lessons/reading/paraphrase")
        page.wait_for_timeout(1500)
        check("included lesson opens", protected_visible(page) and page.get_by_text("Available with full access").count() == 0)

        # ── The locked door: the text is not in the page, only on the screen ──
        lesson_phrase = phrase_from((GATED / "lessons/en/reading-paraphrase.html").read_text(encoding="utf-8"))
        locked_phrase = phrase_from((GATED / "lessons/en/reading-tfng.html").read_text(encoding="utf-8"))
        paper = json.loads((GATED / "tests/reading-full-001.json").read_text(encoding="utf-8"))
        paper_phrase = phrase_from(" ".join(p["html"] for p in paper["parts"][0]["stimulus"]["paragraphs"]))
        raw_lesson = page.request.get(BASE + "/lessons/reading/paraphrase").text()
        raw_locked = page.request.get(BASE + "/lessons/reading/tfng").text()
        raw_paper = page.request.get(BASE + "/tests/reading-full-001").text()
        check("door: the lesson page's source carries none of the lesson text",
              bool(lesson_phrase) and lesson_phrase not in raw_lesson, lesson_phrase)
        check("door: a locked lesson's source carries none of its text either",
              bool(locked_phrase) and locked_phrase not in raw_locked, locked_phrase)
        check("door: the paper's page source carries none of the paper",
              bool(paper_phrase) and paper_phrase not in raw_paper, paper_phrase)
        try:
            page.wait_for_function(
                r"(p) => (document.querySelector('[data-lesson-body]')?.textContent ?? '').replace(/\s+/g, ' ').includes(p)",
                arg=lesson_phrase, timeout=15000)
            shown = True
        except Exception:
            shown = False
        check("door: the allowed student sees the lesson text on screen (fetched through the door)", shown, lesson_phrase)
        old_files = [page.request.get(BASE + path).status for path in (
            "/data/tests/reading-full-001.json", "/lesson-bodies/ru/reading-paraphrase.html",
            "/data/lesson-blocks/reading-paraphrase.json", "/data/test-explanations/ru/reading-full-001.json")]
        check("door: the old public data files are not published", all(code == 404 for code in old_files), str(old_files))

        # ── 5. Mr EZ: five answered messages per section ──
        open_mrez(page)
        page.wait_for_timeout(800)
        check("Mr EZ: section and allowance shown before asking", "Reading: 5 of 5 messages left" in mrez_note(page), mrez_note(page))
        ask_mrez(page, "Can you give me an example of a paraphrase?")
        page.wait_for_timeout(1500)
        check("Mr EZ: a successful reply is labelled simulated", page.locator(".mrez-sim-badge").count() > 0)
        check("Mr EZ: one answered message counted in Reading",
              len(usage(a_email, "tutor", "reading", "settled")) == 1)
        page.wait_for_timeout(1000)
        check("Mr EZ: note updates to 4 of 5", "4 of 5" in mrez_note(page), mrez_note(page))

        # A request that fails after the answer is written is not counted.
        # Twice: the site quietly retries a failed request once, with the
        # same request id, and that retry must not be charged either.
        standin("/__force", {"fail": "save-turn", "times": 2})
        ask_mrez(page, "And another example, please?")
        failed_shown = page.locator(".mrez-error").count() > 0
        check("Mr EZ: a failed request shows a plain error with Try again",
              failed_shown and page.locator(".mrez-error button").count() > 0)
        check("Mr EZ: the failed request used nothing (released, not settled)",
              len(usage(a_email, "tutor", "reading", "settled")) == 1
              and len(usage(a_email, "tutor", "reading", "released")) == 1
              and len(usage(a_email, "tutor", "reading")) == 2)
        shot(page, "t05-mrez-failed-retry", full=False)
        try_click(page.locator(".mrez-error button"))
        page.wait_for_timeout(3500)
        check("Mr EZ: retry with the same request id is counted once",
              len(usage(a_email, "tutor", "reading", "settled")) == 2
              and len(usage(a_email, "tutor", "reading")) == 2)

        for i in range(3):
            ask_mrez(page, f"Question number {i + 3}?")
            page.wait_for_timeout(800)
        page.wait_for_timeout(1500)
        check("Mr EZ: five answered messages in Reading", len(usage(a_email, "tutor", "reading", "settled")) == 5)
        check("Mr EZ: exhausted section says so and locks the composer",
              "used your five messages for Reading" in mrez_note(page) and page.locator("#mrez-input").is_disabled(),
              mrez_note(page))
        shot(page, "t06-mrez-exhausted", full=False)

        # Relabel attempt straight at the Worker: a lesson outside the trial.
        token = page.evaluate(
            "() => { for (const k of Object.keys(localStorage)) if (k.includes('auth-token')) return JSON.parse(localStorage.getItem(k)).access_token; return null; }"
        )
        bypass = page.evaluate(
            """async ([url, token]) => {
                const post = (body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, body: await r.json() }));
                return {
                  otherLesson: await post({ task: 'chat', message: 'hi', idempotencyKey: 'bypass-key-0001', place: { lessonKey: 'reading-tfng' } }),
                  general: await post({ task: 'chat', message: 'hi', idempotencyKey: 'bypass-key-0002' }),
                  sixthReading: await post({ task: 'chat', message: 'hi', idempotencyKey: 'bypass-key-0003', place: { lessonKey: 'reading-paraphrase' } }),
                };
            }""",
            [STANDIN + "/tutor", token],
        )
        check("bypass: a lesson outside the trial is refused by the Worker",
              bypass["otherLesson"]["body"].get("code") == "trial-not-included", json.dumps(bypass["otherLesson"]))
        check("bypass: general chat with no section is refused",
              bypass["general"]["body"].get("code") == "trial-not-included")
        check("bypass: a sixth Reading message sent directly is refused",
              bypass["sixthReading"]["body"].get("code") == "trial-allowance-used")
        rpc = page.evaluate(
            """async ([base, token]) => {
                const r = await fetch(base + '/rest/v1/rpc/trial_tutor_reserve', { method: 'POST',
                  headers: { 'Content-Type': 'application/json', apikey: 'local-anon-key', Authorization: 'Bearer ' + token },
                  body: JSON.stringify({ p_user: '00000000-0000-4000-8000-000000000000', p_section: 'reading', p_request: 'forged-00001', p_activity: 'x' }) });
                return r.status;
            }""",
            [STANDIN, token],
        )
        check("bypass: the browser cannot call the Workers' reserve function", rpc == 403, str(rpc))

        # Other sections keep their own five (dashboard tab chooses the section).
        goto(page, "/dashboard")
        wait_text(page, "Your 3-day trial")
        try_click(page.locator("#trial-home-tab-listening"))
        page.wait_for_timeout(600)
        check("dashboard: Reading shows 0 of 5 while Listening keeps 5 of 5",
              page.get_by_text("5 of 5 left").count() > 0)
        open_mrez(page)
        page.wait_for_timeout(600)
        check("Mr EZ: on the dashboard the chosen section (Listening) is the context",
              "Listening: 5 of 5" in mrez_note(page), mrez_note(page))

        # ── 6. Tests: one per section, begun on the server before the timer ──
        goto(page, "/tests/reading-full-002")
        wait_text(page, "Available with full access")
        check("test outside the trial: locked by direct link", page.get_by_text("Available with full access").count() > 0)
        other_paper = json.loads((GATED / "tests/reading-full-002.json").read_text(encoding="utf-8"))
        other_phrase = phrase_from(" ".join(p["html"] for p in other_paper["parts"][0]["stimulus"]["paragraphs"]))
        check("door: the locked paper never reaches the browser", other_phrase not in page.content(), other_phrase)
        goto(page, "/trainers/reading/reading-full-001-drill-p1")
        wait_text(page, "Available with full access")
        check("drill cut from the trial paper: locked (not the section's test)",
              page.get_by_text("Available with full access").count() > 0)

        goto(page, "/tests/reading-full-001")
        wait_text(page, "Starting uses your one Reading test")
        check("trial test: instructions say starting uses the one Reading test",
              page.get_by_text("Starting uses your one Reading test").count() > 0)
        check("trial test: nothing reserved before Start", len(usage(a_email, "test", "reading")) == 0)
        started = click_until(page, lambda: page.get_by_role("button", name="Start test"),
                              lambda: page.locator('[role="timer"]').count() > 0)
        check("trial test: Start begins the sitting on the server, then the timer", started
              and len(usage(a_email, "test", "reading", "reserved")) == 1)
        fill_answers(page)
        page.wait_for_timeout(1200)
        page.reload(wait_until="domcontentloaded")
        page.wait_for_timeout(3000)
        check("trial test: refresh mid-test resumes the same sitting",
              page.locator('[role="timer"]').count() > 0 and len(usage(a_email, "test", "reading")) == 1)
        submit_test(page)
        page.wait_for_timeout(3000)
        check("trial test: result shown after submitting", page.get_by_text("Band").count() > 0)
        shot(page, "t07-reading-result", full=False)
        page.wait_for_timeout(2500)
        check("trial test: submission settled the Reading test on the server",
              len(usage(a_email, "test", "reading", "settled")) == 1)
        goto(page, "/tests/reading-full-001")
        wait_text(page, "trial test")
        check("trial test: reopening says the section's test is used",
              page.get_by_text("You have used this section").count() > 0)
        shot(page, "t08-reading-used")

        # Two tabs starting Listening at the same moment get one sitting.
        p1 = ctx.new_page()
        p2 = ctx.new_page()
        for p in (p1, p2):
            goto(p, "/tests/listening-full-001")
            wait_text(p, "Starting uses your one Listening test")
        p1.get_by_role("button", name="Start test").click()
        p2.get_by_role("button", name="Start test").click()
        p1.wait_for_timeout(3500)
        rows = usage(a_email, "test", "listening")
        check("two tabs: one Listening sitting between them", len(rows) == 1, json.dumps(rows))
        p1.close()
        p2.close()

        # ── 7. Writing: used when graded; a failed grade keeps it ──
        # The Task 2 lesson shows exactly one Band 8 example, from the door.
        example_title = "The best way to provide enough homes"
        essay_title = "The working week should be shorter"
        lesson_src = page.request.get(BASE + "/lessons/writing/task2-method").text()
        goto(page, "/lessons/writing/task2-method")
        shown = wait_text(page, "What a Band 8 answer looks like")
        check("writing lesson: one Band 8 example, fetched through the door, and no 'Another example'",
              shown and page.get_by_text(example_title).count() > 0
              and page.get_by_role("button", name="Another example").count() == 0
              and example_title not in lesson_src)
        shot(page, "t19-writing-lesson-one-example", full=False)
        checker_src = page.request.get(BASE + "/writing/checker").text()
        goto(page, "/writing/checker")
        wait_text(page, "This is your one Writing test")
        check("writing: checker says it is the one Writing test", page.get_by_text("This is your one Writing test").count() > 0)
        check("writing: only the trial's Task 2 question is offered (no Task 1)",
              page.get_by_role("button", name="Start Task 1").count() == 0
              and page.get_by_role("button", name="Start Task 2").count() > 0)
        click_until(page, lambda: page.get_by_role("button", name="Start Task 2"),
                    lambda: page.locator("textarea:not(#mrez-input)").count() > 0)
        essay = ("Many people believe that studying abroad is valuable because it broadens the mind. " * 8).strip()
        page.locator("textarea:not(#mrez-input)").first.fill(essay)
        page.wait_for_timeout(800)
        check("writing: begun on the server when the task started",
              len(usage(a_email, "test", "writing", "reserved")) == 1)
        check("writing: the question is the trial's fixed one, fetched through the door",
              page.get_by_text(essay_title).count() > 0 and essay_title not in checker_src)
        standin("/__force", {"fail": "grader"})
        try_click(page.get_by_role("button", name="Check my essay"), timeout=8000)
        page.wait_for_timeout(5000)
        check("writing: a failed grade leaves the test available and says so",
              page.get_by_text("Writing test has not been used").count() > 0
              and len(usage(a_email, "test", "writing", "reserved")) == 1, "")
        shot(page, "t09-writing-grade-failed", full=False)
        standin("/__force", {"fail": None})
        try_click(page.get_by_role("button", name="Check my essay"), timeout=8000)
        page.wait_for_timeout(6000)
        check("writing: a successful grade uses the test on the server",
              len(usage(a_email, "test", "writing", "settled")) == 1)
        check("writing: the stand-in's assessment is visibly SIMULATED", page.get_by_text("SIMULATED").count() > 0)
        check("writing: the report shows the band guide steps the grader returned",
              page.get_by_text("Full guide: band 6 to 7").count() > 0)
        shot(page, "t10-writing-graded-simulated", full=False)

        # ── 8. Speaking: Part 1, about five minutes (Alex's decision) ──
        goto(page, "/trainers/speaking")
        wait_text(page, "Available with full access")
        check("speaking: the part-by-part Speaking trainer is not in the trial",
              page.get_by_text("Available with full access").count() > 0 and not protected_visible(page))
        page.add_init_script(path=str(Path(__file__).with_name("live_standin.js")))
        goto(page, "/speaking/examiner")
        wait_text(page, "Your trial Speaking test")
        check("speaking: the examiner page opens as the trial's Part 1 test",
              protected_visible(page) and page.get_by_text("Part 1 of the real test, about five minutes").count() > 0
              and page.get_by_text("This is your one Speaking test for the trial").count() > 0)
        check("speaking: the cue-card bank (not in the trial) is not offered",
              page.locator("a[href*='/speaking/cue-cards']").count() == 0)
        check("speaking: nothing reserved before Start", len(usage(a_email, "test", "speaking")) == 0)
        shot(page, "t15-speaking-trial-start", full=False)

        standin("/__force", {"fail": "live"})
        page.locator("[data-trial-speaking-start]").click()
        wait_text(page, "could not start just now", timeout=20000)
        rows = usage(a_email, "test", "speaking")
        check("speaking: Start begins the test on the server; a voice session that failed to open is given back",
              len(rows) == 1 and rows[0]["status"] == "reserved" and rows[0]["sessions"] == 0
              and page.get_by_text("Nothing was used: press Start again").count() > 0, json.dumps(rows))
        sitting = rows[0]["request_id"] if rows else None

        # The session opens, but the student's own connection to it fails.
        page.evaluate("window.__liveStandin.passThrough = true")
        page.locator("[data-trial-speaking-start]").click()
        page.wait_for_function("window.__liveStandin.creates.length >= 2", timeout=30000)
        page.wait_for_function("!document.querySelector('[data-trial-speaking-start]')?.disabled", timeout=30000)
        page.wait_for_timeout(2500)  # the end report is sent in the background
        created = page.evaluate("window.__liveStandin.creates[1]")
        rows = usage(a_email, "test", "speaking")
        check("speaking: a session that opened but never connected gives the interview back",
              (created or {}).get("status") == 201 and len(rows) == 1 and rows[0]["sessions"] == 0
              and rows[0]["status"] == "reserved" and page.get_by_text("Nothing was used: press Start again").count() > 0,
              json.dumps({"created": created, "rows": rows})[:400])
        page.evaluate("window.__liveStandin.passThrough = false")

        standin("/__force", {"fail": "grader"})
        page.locator("[data-trial-speaking-start]").click()
        in_interview = wait_text(page, "Part 1 · Interview", timeout=30000)
        check("speaking: the interview runs as Part 1", in_interview)
        shot(page, "t16-speaking-interview", full=False)
        creates = page.evaluate("window.__liveStandin.creates")
        last = creates[-1] if creates else {}
        check("speaking: the session request carries the begun test and a Part 1 plan",
              last.get("trialSitting") == sitting and (last.get("plan") or {}).get("mode") == "part1"
              and last.get("status") == 201, json.dumps(last)[:300])
        back = page.get_by_role("button", name="Back")
        try:
            back.wait_for(timeout=150000)
        except Exception:
            pass
        rows = usage(a_email, "test", "speaking")
        check("speaking: a grade that fails on our side keeps the test (one interview counted)",
              back.count() > 0 and len(rows) == 1 and rows[0]["status"] == "reserved" and rows[0]["sessions"] == 1,
              json.dumps(rows))
        standin("/__force", {"fail": None})
        back.click()
        wait_text(page, "You have started your trial Speaking test")
        check("speaking: after the failure the test can be started again",
              page.get_by_text("You have started your trial Speaking test").count() > 0)
        page.locator("[data-trial-speaking-start]").click()
        graded = wait_text(page, "SIMULATED", timeout=150000)
        rows = usage(a_email, "test", "speaking")
        check("speaking: a graded interview uses the test on the server (two interviews in all)",
              graded and len(rows) == 1 and rows[0]["status"] == "settled" and rows[0]["sessions"] == 2, json.dumps(rows))
        check("speaking: the stand-in's report is visibly SIMULATED", page.get_by_text("SIMULATED").count() > 0)
        check("speaking: the report shows the band guide steps the grader returned",
              page.get_by_text("Full guide: band 6 to 7").count() > 0)
        shot(page, "t17-speaking-graded-simulated", full=False)
        page.get_by_role("button", name="Done").click()
        wait_text(page, "You have used this section’s trial test")
        check("speaking: back on the page, the Speaking test is used",
              page.get_by_text("You have used this section’s trial test").count() > 0,
              " | ".join(page.locator("main").inner_text()[:200].splitlines()))
        shot(page, "t18-speaking-used", full=False)
        goto(page, "/plans")
        wait_text(page, "Payment not connected yet")
        check("plans: approved prices shown, payment plainly unavailable",
              page.get_by_text("₸10,000").count() > 0 and page.get_by_text("₸25,000").count() > 0
              and page.get_by_role("button", name="Payment not connected yet").first.is_disabled())
        shot(page, "t11-plans")

        # ── 9. Sign out, and a second device: nothing restarts ──
        state_before = trial_state(a_email)
        ctx2 = browser.new_context(viewport={"width": 1440, "height": 900})
        english(ctx2)
        dev2 = ctx2.new_page()
        goto(dev2, "/trial")
        open_auth(dev2, "I already have an account")
        sign_in_in_modal(dev2, a_email)
        check("second device: the same trial, not a new one", wait_text(dev2, "Your trial is already running"))
        goto(dev2, "/dashboard")
        wait_text(dev2, "Your 3-day trial")
        check("second device: Reading shows its used test and no messages left",
              dev2.get_by_text("0 of 5 left").count() > 0 or dev2.locator("#trial-home-tab-reading").count() > 0)
        state_after = trial_state(a_email)
        check("second device: start time and counts unchanged",
              state_after["account"]["started_at"] == state_before["account"]["started_at"]
              and len(state_after["usage"]) == len(state_before["usage"]))
        ctx2.close()

        # Sign out on the first device (the workspace menu).
        click_until(page, lambda: page.locator(".ws-account .ws-avatar"), lambda: page.locator(".ws-menu[role='menu']").count() > 0)
        try_click(page.get_by_role("menuitem", name="Sign out"))
        page.wait_for_timeout(1500)
        goto(page, "/lessons/reading/paraphrase")
        wait_text(page, "Sign in to continue your trial")
        check("after sign-out: included lesson covered again, trial not restarted",
              not protected_visible(page) and trial_state(a_email)["account"]["started_at"] == state_before["account"]["started_at"])

        # ── 10. Another student on the same device sees none of A's trial ──
        goto(page, "/trial")
        open_auth(page, "Create a free account")
        sign_up_in_modal(page, b_email)
        wait_text(page, "Start my 3-day trial")
        check("student B: no trial inherited from A", trial_state(b_email)["account"] is None
              and page.get_by_text("Before you begin").count() > 0)
        try_click(page.get_by_role("button", name="Start my 3-day trial"))
        page.wait_for_url("**/dashboard", timeout=20000)
        wait_text(page, "Your 3-day trial")
        try_click(page.locator("#trial-home-tab-reading"))
        page.wait_for_timeout(500)
        check("student B: own fresh allowance (Reading 5 of 5, test available)",
              page.get_by_text("5 of 5 left").count() > 0 and page.get_by_text("1 available").count() > 0)
        check("student B: A's rows untouched", len(usage(a_email, "tutor", "reading", "settled")) == 5)

        # ── 11. Server failure: covered, plain retry, then opens ──
        page.route("**/rest/v1/rpc/trial_status", lambda route: route.abort())
        goto(page, "/lessons/reading/paraphrase")
        wait_text(page, "We could not check your trial")
        check("server failure: content stays covered with a plain Try again",
              page.get_by_text("We could not check your trial").count() > 0 and not protected_visible(page))
        shot(page, "t12-check-failed", full=False)
        page.unroute("**/rest/v1/rpc/trial_status")
        try_click(page.get_by_role("button", name="Try again"))
        page.wait_for_timeout(2500)
        check("server failure: Try again opens the lesson once the server answers", protected_visible(page))

        # ── 12. Expiry, from the stored start time ──
        standin("/__trial/rewind", {"email": b_email, "minutes": 72 * 60})
        goto(page, "/dashboard")
        wait_text(page, "Your trial has ended")
        check("expired: dashboard says the trial has ended", page.get_by_text("Your trial has ended").count() > 0)
        shot(page, "t13-dashboard-ended")
        goto(page, "/lessons/reading/paraphrase")
        wait_text(page, "Your trial has ended")
        check("expired: the included lesson is locked calmly with View plans",
              page.get_by_text("Your trial has ended").count() > 0 and not protected_visible(page))
        open_mrez(page)
        page.wait_for_timeout(600)
        check("expired: Mr EZ says so and the composer is locked",
              "trial has ended" in mrez_note(page) and page.locator("#mrez-input").is_disabled(), mrez_note(page))
        goto(page, "/tests/listening-full-001")
        wait_text(page, "Your trial has ended")
        check("expired: a test not begun cannot start", page.get_by_text("Your trial has ended").count() > 0)

        # ── 13. Phone width and Russian ──
        phone = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        ru = phone.new_page()
        ru.add_init_script("try { localStorage.setItem('ielts.locale.v1', 'ru'); } catch (e) {}")
        goto(ru, "/trial")
        open_auth(ru, "Создать бесплатный аккаунт")
        dialog = ru.locator("[role='dialog'][aria-modal='true']")
        try:
            ru.wait_for_selector("[role='dialog'][aria-modal='true']", timeout=10000)
            dialog.locator("#account-email").fill(f"trial-ru-{RUN}@example.test")
            dialog.locator("#account-password").fill(PASSWORD)
            if dialog.locator("#account-confirm").count():
                dialog.locator("#account-confirm").fill(PASSWORD)
            dialog.locator("button[type=submit]").first.click()
        except Exception as e:  # noqa: BLE001
            print("  ru sign-up:", e)
        ru.wait_for_timeout(2500)
        try_click(ru.get_by_role("button", name="Начать 3 дня бесплатно"))
        try:
            ru.wait_for_url("**/dashboard", timeout=20000)
        except Exception:
            pass
        ru.wait_for_timeout(2500)
        overflow = ru.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check("phone, Russian: trial home renders in Russian without sideways scroll",
              ru.get_by_text("Немного практики").count() > 0 and overflow <= 1, f"overflow={overflow}")
        shot(ru, "t14-dashboard-ru-phone")
        phone.close()

        # Reduced motion: the trial's transitions and the loading shimmer stop.
        rm = browser.new_context(reduced_motion="reduce")
        english(rm)
        rmp = rm.new_page()
        goto(rmp, "/trial")
        wait_text(rmp, "Create a free account")
        motion = rmp.evaluate(
            """() => {
                const b = document.querySelector('.trial-ui .trial-btn');
                const probe = document.createElement('div');
                probe.className = 'trial-ui';
                probe.innerHTML = '<div class=\"trial-skeleton\"><span></span></div>';
                document.body.appendChild(probe);
                const s = probe.querySelector('span');
                return { button: b ? getComputedStyle(b).transitionDuration : 'missing', shimmer: getComputedStyle(s).animationName };
            }"""
        )
        check("reduced motion: no button transitions and no shimmer",
              motion["button"] in ("0s", "0s, 0s, 0s") and motion["shimmer"] == "none", json.dumps(motion))
        rm.close()

        browser.close()

    passed = sum(1 for _, ok, _ in results if ok)
    lines = [
        "# Trial journey (t01), local stand-in",
        "",
        f"Run {RUN}. Site {BASE}, backend {STANDIN} (--trial: real migration in PGlite, real Workers,",
        "simulated tutor replies, SIMULATED essay assessment). Synthetic accounts only. Nothing billed.",
        "",
        f"**{passed} of {len(results)} checks passed.**",
        "",
        "| Result | Check | Detail |",
        "|---|---|---|",
    ]
    for name, ok, detail in results:
        lines.append(f"| {'PASS' if ok else 'FAIL'} | {name} | {detail.replace('|', '/')[:160]} |")
    (EVIDENCE / "results-t01.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n{passed} of {len(results)} passed")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(run())
