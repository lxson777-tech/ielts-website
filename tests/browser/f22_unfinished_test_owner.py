"""Scenario 22 - An unfinished test belongs to the student who started it.

WHY THIS FILE EXISTS
An independent review on 23 September 2026 drove the real browser and found
finding 1: the in-progress test session lived under one device-wide key
(`ielts.testsession.v1`) with nobody's name on it. Student A started the
Reading drill `reading-full-006-drill-p2`, chose "i" for question 14 and
walked away. A signed out, B signed up on the same browser, opened the same
drill from its real hub link, and A's "i" was already selected. B pressed
Submit and A's answer was recorded as B's, in B's learner record and in the
rows the account received.

That review's reproduction is preserved at
docs/audits/claude-review-2026-09-23/independent-browser.py. This file is
that journey adapted into the browser suite, run against the FIXED code, plus
the two things the reproduction did not cover:

  - A signing back in and resuming their own sitting, with "i" still there;
  - the owner changing while the player is MOUNTED (A mid-drill in one tab,
    signed out from a second tab), where the player must stop and must not
    submit.

SECOND CODEX ROUND (23 September 2026), two more journeys:
  - Step 6, R2-01: a sitting B left under the OLD device-wide key by an older
    build, on a device whose history stamp names A. A signs in and must see
    none of B's answers; the old sitting stays with the device's anonymous
    owner, where the signed-out student finds it.
  - Steps 7 to 9, R2-03: A starts a mock exam, finishes Listening, signs out
    in another tab. B signs in and gets a fresh mock with nothing of A's. A
    signs back in: the open tab carries straight on, a newly opened page
    offers A's own sitting back with Listening still done, and a reload in
    the Writing leg keeps both the essay and the Writing deadline.

THIRD CODEX ROUND (23 September 2026), two more journeys:
  - Step 11, R2B-02: carrying on from Step 10, A finishes Writing, signs out
    on the Speaking brief, and again with the examiner open, and each time
    comes back to the Speaking brief, never to the results; a deliberate Back
    on the examiner still skips Speaking. The stand-in cannot run a real
    interview, and none is started: the site is pointed at an examiner
    address on the stand-in that has nothing behind it
    (PUBLIC_LIVE_EXAMINER_URL below), so the examiner opens, fails to connect
    before any microphone or session is asked for, and sits on its own error
    screen. That is enough to take it off screen by an account change, which
    is the path that used to finish the mock.
  - Step 12, R2B-03: A answers part of a mock's Listening paper, leaves for a
    standalone Reading drill (answers it too), comes back and resumes the
    mock with the Listening answers and the same deadline; then starts a
    fresh mock on the SAME Listening paper and gets an empty paper with a
    clock of its own. A mock's papers are kept inside that mock sitting now,
    never in the one slot a paper opened on its own uses.

WHAT THIS IS NOT
- Not a real Supabase project. `tools/mr-ez-dev-server.mjs` stands in for it,
  in memory, on this machine only. Every fact below is about that stand-in,
  never claimed as proof about a real project.
- Not the frozen production snapshot the f01-f17 suite uses. This script
  drives its own dev server and its own stand-in (addresses below).
- No real account, no real key, no paid API call, no deployment.

Requires, already running before this script starts (the second round used
the stand-in on 8813 and the site on 4366, the third 8821 and 4374; override
with IELTS_STANDIN_URL and IELTS_BASE_URL):
  1. the stand-in:  MR_EZ_DEV_PORT=8821 node tools/mr-ez-dev-server.mjs
  2. the site, with its OWN Vite dependency cache (astro.config.f22.mjs;
     see astro.config.f21.mjs for why two dev servers on one checkout must
     not share one):
                    PUBLIC_SUPABASE_URL=http://127.0.0.1:8821
                    PUBLIC_SUPABASE_ANON_KEY=local-anon-key
                    PUBLIC_MR_EZ_URL=http://127.0.0.1:8821/tutor
                    PUBLIC_LIVE_EXAMINER_URL=http://127.0.0.1:8821/no-examiner-here
                    npx astro dev --config astro.config.f22.mjs --port 4374 --host 127.0.0.1
     The examiner address is deliberately one the stand-in answers "not
     found" on (step 12). Without it, Step 12's examiner checks are reported
     as not run rather than passed.

Run with:
  IELTS_STANDIN_URL=http://127.0.0.1:8821 python tests/browser/f22_unfinished_test_owner.py

Every email, password and answer below is SYNTHETIC, made up for this run.
"""
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))

# final_helpers.py reads these at IMPORT time, so they must be set before the
# import below. Its own results file and screenshot prefix, so nothing here
# can collide with another tester's evidence. The first round wrote
# results-unfinished-test.md with "unfinished-" screenshots and the second
# results-unfinished-test-2.md with "unfinished2-"; this round's defaults
# write a third file beside them and leave both as they were.
os.environ.setdefault("IELTS_BASE_URL", "http://127.0.0.1:4374/ielts-website")
os.environ.setdefault("IELTS_RESULTS_SUFFIX", "-unfinished-test-3")
os.environ.setdefault("IELTS_SHOT_PREFIX", "unfinished3-")

from playwright.sync_api import sync_playwright  # noqa: E402

import f20_account_journey as journey  # noqa: E402
from final_helpers import (  # noqa: E402
    BASE_URL,
    attach_diagnostics,
    goto,
    new_context,
    read_record,
    report_diagnostics,
    reset_results,
    shot,
    storage_keys,
    write_note,
    write_row,
    write_section,
)

# The stand-in this run talks to, read the same way f20 and f21 read it, so
# one environment variable points every journey script at the same place.
# f20's own reads go through journey.STANDIN_URL, so it is kept in step.
STANDIN_URL = os.environ.get("IELTS_STANDIN_URL", "http://127.0.0.1:8821")  # the local stand-in; override per run
journey.STANDIN_URL = STANDIN_URL

EMAIL_A = "synthetic-student-a-f22@example.test"
EMAIL_B = "synthetic-student-b-f22@example.test"
PASSWORD_A = "Synthetic-Pass-A1"
PASSWORD_B = "Synthetic-Pass-B1"

DRILL_PATH = "/trainers/reading/reading-full-006-drill-p2"
DRILL_HREF = "/ielts-website" + DRILL_PATH
SESSION_KEY = "ielts.testsession.v1"

A_CHOICE_INDEX = 1  # whatever option 1 is for q14; read back and reported


# Every localStorage read below goes through journey.settle(), which retries
# on "Execution context was destroyed, most likely because of a navigation".
# Signing out in a second tab makes the first tab's page react, and a read
# that lands in the gap between the two execution contexts fails for timing
# reasons that have nothing to do with the product. f20 documents the same
# race and the same work-around.

def session_keys(page):
    """Every in-progress-sitting key in this browser, owner suffix and all."""
    return journey.settle(page, lambda pg: [k for k in storage_keys(pg) if k.startswith(SESSION_KEY)])


def session_for(page, namespace):
    return journey.settle(
        page,
        lambda pg: pg.evaluate(
            "(key) => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }",
            f"{SESSION_KEY}::{namespace}",
        ),
    )


def all_sessions(page):
    return journey.settle(
        page,
        lambda pg: pg.evaluate(
            """() => Object.fromEntries(Object.entries(localStorage)
                .filter(([k]) => k.startsWith('ielts.testsession.v1'))
                .map(([k, v]) => { try { return [k, JSON.parse(v)]; } catch (e) { return [k, v]; } }))"""
        ),
    )


def first_select_value(page, attempts=6, delay=700):
    """The value showing in the drill's first answer control. Retried: this
    is a large client:load island on a dev server, and a read taken in the
    wrong half-second finds no <select> at all (observed once mid-run, which
    is a timing artefact of the harness, not the product)."""
    for _ in range(attempts):
        try:
            sel = page.locator("select")
            if sel.count():
                return sel.first.input_value()
        except Exception:
            pass
        page.wait_for_timeout(delay)
    return None


def open_drill_from_hub(page):
    """Enter the drill through its REAL hub link, the way a student does, not
    by typing the URL: the review's reproduction did the same, and a
    client-side navigation is the case where an owner can be inherited from
    a page visited earlier."""
    goto(page, "/trainers/reading")
    page.wait_for_timeout(900)
    link = page.locator(f'a[href="{DRILL_HREF}"]')
    if link.count() == 0:
        return False
    link.first.click()
    page.wait_for_timeout(1800)
    return True


# ── Second Codex round (R2-01, R2-03) ────────────────────────────────────────

MOCK_PATH = "/tests/mock"
ACTIVE_MOCK_KEY = "ielts.mock.active.v1"
LEGACY_STAMP_KEY = "ielts.learning.legacy.v1"
UNOWNED_NOTE_KEY = "ielts.unowned.adopted.v1"
DEVICE_ID_KEY = "ielts.device.v1"
RESUME_HEADING = "You have an unfinished mock exam"
# B's answers in the old sitting: real options of the drill's heading list
# (i to vii), and different from A's own "i", so a blank control means
# "not restored" rather than "not a valid option".
B_LEGACY_ANSWERS = {"q14": "iv", "q15": "vii"}
A_DRAFT = "SYNTHETIC Task 1 draft by student A, typed during the mock."


def raw_item(page, key):
    return journey.settle(page, lambda pg: pg.evaluate("(k) => localStorage.getItem(k)", key))


def json_item(page, key):
    raw = raw_item(page, key)
    try:
        return json.loads(raw) if raw else None
    except ValueError:
        return None


def anon_namespace(page):
    device = raw_item(page, DEVICE_ID_KEY)
    return f"anon:{device}" if device else None


def active_mock_for(page, namespace):
    return json_item(page, f"{ACTIVE_MOCK_KEY}::{namespace}")


def text_count(page, text):
    return page.locator(f"text={text}").count()


def wait_for_mock_ready(page, timeout=20000):
    """The mock page renders its start screen on the server, and the offer to
    pick a sitting back up only appears once the island has hydrated and read
    this browser's storage. Wait for the hydration itself (Astro removes the
    island's `ssr` attribute), so a "no offer" reading cannot be taken a beat
    too early and pass for the wrong reason."""
    try:
        page.wait_for_selector('astro-island[component-url*="MockExam"]:not([ssr])', state="attached", timeout=timeout)
    except Exception:
        pass
    page.wait_for_timeout(1500)


def mark_page(page):
    """Leave a marker in the page's memory. A reload wipes it, so
    reloaded_since() can tell a check that ran on the same page from one that
    ran after the dev server reloaded it (another tester saving a source file
    in this checkout does exactly that)."""
    try:
        page.evaluate("() => { window.__f22Marker = true; }")
    except Exception:
        pass


def reloaded_since(page, label):
    try:
        present = page.evaluate("() => window.__f22Marker === true")
    except Exception:
        present = False
    if not present:
        write_note(
            f"**Diagnostic ({label}):** this page was reloaded since it was marked (a dev-server "
            "reload from a file saved in this checkout, or a navigation). Checks that follow on "
            "this page ran after that reload."
        )
    return not present


def clock_seconds(page):
    try:
        text = page.locator('[role="timer"]').first.inner_text()
    except Exception:
        return None, None
    match = re.search(r"(\d+):(\d{2})", text or "")
    if not match:
        return text, None
    return text, int(match.group(1)) * 60 + int(match.group(2))


def run_legacy_stamp_step(browser, a_id):
    write_section(
        "Step 6 - An old unowned sitting B left, on a device whose history stamp names A (Codex R2-01)",
        "A fresh browser that already holds, before any page script runs, what an older build "
        "would have left: B's unfinished sitting of the same drill under the OLD device-wide key "
        f"(`{SESSION_KEY}`, answers {json.dumps(B_LEGACY_ANSWERS)}, no owner written inside it), "
        f"and the device's history stamp (`{LEGACY_STAMP_KEY}`) naming A. The stamp records whose "
        "HISTORY this device migrated; it says nothing about who started the sitting. A signs in "
        "and opens the drill, and must get none of it.",
    )
    now_ms = int(time.time() * 1000)
    legacy = json.dumps(
        {
            "version": 1,
            "testId": "reading-full-006-drill-p2",
            "startedAt": now_ms,
            "endsAt": now_ms + 20 * 60 * 1000,
            "answers": B_LEGACY_ANSWERS,
        },
        separators=(",", ":"),
    )
    stamp = json.dumps(
        {"version": 1, "ownerKey": f"u:{a_id}", "at": "2026-09-01T09:00:00.000Z"}, separators=(",", ":")
    )
    ctx6 = new_context(browser)
    # Seeded once, before the first page script: each value is only written
    # while its key is still empty, so a later page load never rewrites it.
    ctx6.add_init_script(
        "(() => { try {"
        f" if (localStorage.getItem({json.dumps(SESSION_KEY)}) === null)"
        f" localStorage.setItem({json.dumps(SESSION_KEY)}, {json.dumps(legacy)});"
        f" if (localStorage.getItem({json.dumps(LEGACY_STAMP_KEY)}) === null)"
        f" localStorage.setItem({json.dumps(LEGACY_STAMP_KEY)}, {json.dumps(stamp)});"
        " } catch (e) {} })();"
    )
    page6 = ctx6.new_page()
    errors6, failed6 = attach_diagnostics(page6)
    goto(page6, "/dashboard")
    page6.wait_for_timeout(1200)
    write_row(
        "B's old sitting is on the device under the old device-wide key before A signs in",
        raw_item(page6, SESSION_KEY) == legacy,
        f"{SESSION_KEY} = {raw_item(page6, SESSION_KEY)}",
    )
    write_row(
        "The device's history stamp names A",
        (json_item(page6, LEGACY_STAMP_KEY) or {}).get("ownerKey") == f"u:{a_id}",
        f"{LEGACY_STAMP_KEY} = {raw_item(page6, LEGACY_STAMP_KEY)}",
    )
    back = journey.ws_sign_in(page6, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on this browser", back == a_id, f"signed in as {back}")

    open_drill_from_hub(page6)
    page6.wait_for_timeout(1500)
    running_before_start = page6.locator('[role="timer"]').count()
    write_row(
        "A's drill opens on its instructions, not inside B's running sitting",
        running_before_start == 0,
        f"{running_before_start} running timer(s) on screen before A pressed Start test",
    )
    journey.start_drill_if_needed(page6)
    page6.wait_for_timeout(900)
    a_sees = first_select_value(page6)
    write_row(
        'A sees NO answer selected for q14 (B\'s "iv" is not restored)',
        not a_sees,
        f'A\'s first select reads "{a_sees}"',
    )
    a_sitting = session_for(page6, f"u:{a_id}") or {}
    a_answers = a_sitting.get("answers") or {}
    carried = {k: v for k, v in a_answers.items() if B_LEGACY_ANSWERS.get(k) == v}
    write_row(
        "A's own sitting of the drill holds none of B's answers, so A cannot submit them",
        not carried and a_sitting.get("owner") == f"u:{a_id}",
        f"A's sitting = {json.dumps(a_sitting)}",
    )
    anon_ns = anon_namespace(page6)
    parked = raw_item(page6, f"{SESSION_KEY}::{anon_ns}") if anon_ns else None
    write_row(
        "B's old sitting was parked with this device's ANONYMOUS owner, byte for byte",
        parked == legacy,
        f"{SESSION_KEY}::{anon_ns} = {parked}",
    )
    write_row(
        "The old device-wide key still holds exactly what it held (nothing deleted or changed)",
        raw_item(page6, SESSION_KEY) == legacy,
        "compared byte for byte with the seeded value",
    )
    note = json_item(page6, UNOWNED_NOTE_KEY)
    write_row(
        "The parking note names only the anonymous owner, never A",
        note == {"version": 1, "adopted": {anon_ns: [SESSION_KEY]}},
        f"{UNOWNED_NOTE_KEY} = {raw_item(page6, UNOWNED_NOTE_KEY)}",
    )
    write_note("**Every sitting on the device now:** " + json.dumps(all_sessions(page6)))
    shot(page6, "06-a-signed-in-sees-none-of-b", DRILL_PATH)

    goto(page6, "/dashboard")
    page6.wait_for_timeout(1500)
    journey.ws_sign_out(page6)
    open_drill_from_hub(page6)
    page6.wait_for_timeout(1500)
    device_sees = first_select_value(page6)
    write_row(
        "Signed out, the device's own student finds the old sitting where it was left "
        '(q14 = "iv"), which also shows the blank above was not a rendering accident',
        device_sees == B_LEGACY_ANSWERS["q14"],
        f'the signed-out drill reads "{device_sees}"',
    )
    shot(page6, "07-signed-out-device-keeps-old-sitting", DRILL_PATH)
    report_diagnostics("Step 6", errors6, failed6)
    ctx6.close()


def run_mock_steps(browser, a_id, b_id):
    key_a = f"{ACTIVE_MOCK_KEY}::u:{a_id}"

    # ── Step 7: A starts a mock, finishes Listening, signs out elsewhere ───
    write_section(
        "Step 7 - A starts a mock exam, hands in Listening, and signs out in another tab (Codex R2-03)",
        "The mock used to live only in the screen's memory: a sign-out, a refresh or a stray "
        "navigation lost the finished papers and the essays, and the stopped screen offered only "
        "a fresh mock. It is now written down under the student sitting it.",
    )
    ctx7 = new_context(browser)
    page_a = ctx7.new_page()
    errors7, failed7 = attach_diagnostics(page_a)
    goto(page_a, "/dashboard")
    page_a.wait_for_timeout(1200)
    back = journey.ws_sign_in(page_a, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on a fresh browser", back == a_id, f"signed in as {back}")

    goto(page_a, MOCK_PATH)
    wait_for_mock_ready(page_a)
    write_row(
        "A's start screen offers no unfinished mock (A has none on this browser yet)",
        text_count(page_a, RESUME_HEADING) == 0,
        f'"{RESUME_HEADING}" on screen: {text_count(page_a, RESUME_HEADING)}',
    )
    mark_page(page_a)
    started = journey.click_until(
        page_a,
        lambda: page_a.get_by_role("button", name="Start Mock Exam"),
        lambda: page_a.locator('[role="timer"]').count() > 0,
    )
    a_start = active_mock_for(page_a, f"u:{a_id}") or {}
    write_row(
        "The mock starts on Listening and is written down under A's own key, stamped with A",
        started and a_start.get("owner") == f"u:{a_id}" and a_start.get("stage") == "listening",
        f"{key_a} = {json.dumps(a_start)}",
    )

    submitted = journey.submit_and_confirm(page_a)
    page_a.wait_for_timeout(1500)
    moved_on = journey.click_until(
        page_a,
        lambda: page_a.get_by_role("button", name="Back to results"),
        lambda: text_count(page_a, "starts in") > 0,
    )
    reloaded_since(page_a, "A's mock tab, after handing in Listening")
    a_done = active_mock_for(page_a, f"u:{a_id}") or {}
    write_row(
        "A hands in Listening and the mock moves on to the beat before Reading",
        submitted and moved_on,
        f"submitted = {submitted}, transition screen shown = {moved_on}",
    )
    write_row(
        "A's written-down mock now has Listening done",
        a_done.get("stage") == "transition-reading" and bool(a_done.get("listening")),
        f'stage = {a_done.get("stage")}, listening = {json.dumps(a_done.get("listening"))}',
    )
    shot(page_a, "08-a-listening-done", MOCK_PATH)

    page_b = ctx7.new_page()
    errors7b, failed7b = attach_diagnostics(page_b)
    goto(page_b, "/dashboard")
    page_b.wait_for_timeout(1200)
    journey.ws_sign_out(page_b)
    page_b.wait_for_timeout(1000)
    page_a.bring_to_front()
    page_a.wait_for_timeout(1500)
    reloaded_since(page_a, "A's mock tab, after the sign-out in the second tab")
    write_row(
        "A's open mock stops and says A signed out",
        text_count(page_a, "You signed out during this mock exam") > 0,
        f'"You signed out during this mock exam": {text_count(page_a, "You signed out during this mock exam")}',
    )
    write_row(
        "The stopped screen says the sitting is kept for its student and picks up when they sign back in",
        text_count(page_a, "picks up where it stopped when they sign back in") > 0,
        f'found {text_count(page_a, "picks up where it stopped when they sign back in")}',
    )
    shot(page_a, "09-a-mock-stopped-after-signout", MOCK_PATH)
    a_after_signout = raw_item(page_b, key_a)
    write_row(
        "A's written-down mock is still there after the sign-out, Listening still done",
        bool((json.loads(a_after_signout) if a_after_signout else {}).get("listening")),
        f"{key_a} = {a_after_signout}",
    )

    # ── Step 8: B signs in and gets a fresh mock ──────────────────────────
    write_section(
        "Step 8 - B signs in on the same browser and starts a fresh mock",
        "B must see nothing of A's sitting, get a mock of their own from the start, and A's "
        "written-down sitting must not change at all.",
    )
    b_back = journey.ws_sign_in(page_b, EMAIL_B, PASSWORD_B)
    write_row("B is signed in", b_back == b_id, f"signed in as {b_back}")
    page_a.wait_for_timeout(1500)
    write_row(
        "A's still-open tab now says the mock belongs to another student, and shows none of it",
        text_count(page_a, "This mock exam belongs to another student") > 0 and text_count(page_a, "starts in") == 0,
        f'"belongs to another student": {text_count(page_a, "This mock exam belongs to another student")}, '
        f'transition screen: {text_count(page_a, "starts in")}',
    )
    goto(page_b, MOCK_PATH)
    wait_for_mock_ready(page_b)
    write_row(
        "B's start screen offers NO unfinished mock (A's is not B's to continue)",
        text_count(page_b, RESUME_HEADING) == 0,
        f'"{RESUME_HEADING}" on screen: {text_count(page_b, RESUME_HEADING)}',
    )
    shot(page_b, "10-b-start-screen-no-offer", MOCK_PATH)
    b_started = journey.click_until(
        page_b,
        lambda: page_b.get_by_role("button", name="Start Mock Exam"),
        lambda: page_b.locator('[role="timer"]').count() > 0,
    )
    page_b.wait_for_timeout(800)
    b_mock = active_mock_for(page_b, f"u:{b_id}") or {}
    write_row(
        "B's fresh mock starts at Listening with nothing done, under B's own key",
        b_started
        and b_mock.get("owner") == f"u:{b_id}"
        and b_mock.get("stage") == "listening"
        and b_mock.get("listening") is None,
        f"{ACTIVE_MOCK_KEY}::u:{b_id} = {json.dumps(b_mock)}",
    )
    write_row(
        "B's fresh mock is a different sitting from A's",
        b_mock.get("startedAt") and b_mock.get("startedAt") != a_done.get("startedAt"),
        f'B started {b_mock.get("startedAt")}, A started {a_done.get("startedAt")}',
    )
    # Third round (R2B-03): a mock's paper is kept inside its own mock
    # sitting, not in the one slot a paper opened on its own uses.
    b_leg = (b_mock.get("legSittings") or {}).get(b_mock.get("listeningTestId") or "") or {}
    b_standalone = session_for(page_b, f"u:{b_id}")
    write_row(
        "B's Listening paper is B's own, with no answers carried over, kept inside B's own mock "
        "sitting (not in the standalone slot)",
        bool(b_leg) and not (b_leg.get("answers") or {}) and b_standalone is None,
        f"B's Listening paper = {json.dumps(b_leg)}, B's standalone slot = {json.dumps(b_standalone)}",
    )
    write_row(
        "A's written-down mock was not touched by B's fresh one",
        raw_item(page_b, key_a) == a_after_signout,
        "compared byte for byte with A's copy right after A signed out",
    )
    shot(page_b, "11-b-fresh-mock-listening", MOCK_PATH)
    report_diagnostics("Step 8 (B's tab)", errors7b, failed7b)
    page_b.close()

    # ── Step 9: A signs back in and carries on ────────────────────────────
    write_section(
        "Step 9 - A signs back in and carries on with Listening still done",
        "Two ways back: the tab A left open, which should simply carry on, and a newly opened "
        "mock page, which should offer A's own sitting back.",
    )
    page_c = ctx7.new_page()
    goto(page_c, "/dashboard")
    page_c.wait_for_timeout(1200)
    journey.ws_sign_out(page_c)
    a_again = journey.ws_sign_in(page_c, EMAIL_A, PASSWORD_A)
    write_row("A is signed back in", a_again == a_id, f"signed in as {a_again}")
    page_a.bring_to_front()
    page_a.wait_for_timeout(2000)
    reloaded_since(page_a, "A's first mock tab, after A signed back in")
    write_row(
        "A's still-open tab carries straight on from where it stopped (the beat before Reading)",
        text_count(page_a, "starts in") > 0 and text_count(page_a, "Mock exam stopped") == 0,
        f'transition screen: {text_count(page_a, "starts in")}, stopped screen: {text_count(page_a, "Mock exam stopped")}',
    )
    shot(page_a, "12-a-back-in-the-open-tab", MOCK_PATH)
    page_a.close()
    page_c.close()

    page_d = ctx7.new_page()
    errors7d, failed7d = attach_diagnostics(page_d)
    goto(page_d, MOCK_PATH)
    wait_for_mock_ready(page_d)
    try:
        page_d.wait_for_selector(f"text={RESUME_HEADING}", timeout=8000)
    except Exception:
        pass
    write_row(
        "A newly opened mock page offers A's OWN unfinished mock back",
        text_count(page_d, RESUME_HEADING) > 0,
        f'"{RESUME_HEADING}" on screen: {text_count(page_d, RESUME_HEADING)}',
    )
    write_row(
        "The offer says Listening is already finished and where the sitting picks up",
        text_count(page_d, "Finished so far: Listening") > 0 and text_count(page_d, "It picks up at Reading") > 0,
        f'"Finished so far: Listening": {text_count(page_d, "Finished so far: Listening")}, '
        f'"It picks up at Reading": {text_count(page_d, "It picks up at Reading")}',
    )
    shot(page_d, "13-a-offered-own-mock-back", MOCK_PATH)
    resumed = journey.click_until(
        page_d,
        lambda: page_d.get_by_role("button", name="Continue where you left off"),
        lambda: text_count(page_d, "starts in") > 0 or page_d.locator('[role="timer"]').count() > 0,
    )
    held = active_mock_for(page_d, f"u:{a_id}") or {}
    write_row(
        "A carries on in the SAME sitting with Listening still done",
        resumed
        and bool(held.get("listening"))
        and held.get("startedAt") == a_done.get("startedAt")
        and held.get("mockId") == a_done.get("mockId")
        and bool(held.get("sittingId"))
        and held.get("sittingId") == a_done.get("sittingId"),
        f'stage = {held.get("stage")}, listening = {json.dumps(held.get("listening"))}, '
        f'mockId = {held.get("mockId")}, startedAt = {held.get("startedAt")}, sittingId = {held.get("sittingId")}',
    )
    shot(page_d, "14-a-resumed-own-mock", MOCK_PATH)

    # ── Step 10: a reload in Writing keeps the essay and the deadline ─────
    write_section(
        "Step 10 - A reload during Writing keeps the draft and the Writing deadline",
        "A carries on through Reading into Writing, types a draft, and reloads the page. The "
        "Writing hour is stored as the moment it runs out, so picking the sitting up again must "
        "neither restart the clock nor lose the draft.",
    )
    journey.click_until(
        page_d,
        lambda: page_d.get_by_role("button", name="Start now"),
        lambda: page_d.locator('[role="timer"]').count() > 0,
    )
    page_d.wait_for_timeout(800)
    journey.submit_and_confirm(page_d)
    page_d.wait_for_timeout(1500)
    journey.click_until(
        page_d,
        lambda: page_d.get_by_role("button", name="Back to results"),
        lambda: text_count(page_d, "Writing starts in") > 0,
    )
    in_writing = journey.click_until(
        page_d,
        lambda: page_d.get_by_role("button", name="Start now"),
        lambda: page_d.locator("textarea").count() > 0,
    )
    if in_writing:
        page_d.locator("textarea").first.fill(A_DRAFT)
    page_d.wait_for_timeout(1500)
    before = active_mock_for(page_d, f"u:{a_id}") or {}
    deadline = before.get("writingEndsAt")
    write_row(
        "Writing is running and its deadline, the finished papers and A's draft are written down",
        in_writing
        and before.get("stage") == "writing"
        and isinstance(deadline, (int, float))
        and bool(before.get("listening"))
        and bool(before.get("reading"))
        and before.get("essay1") == A_DRAFT,
        f'stage = {before.get("stage")}, writingEndsAt = {deadline}, essay1 = "{before.get("essay1")}"',
    )
    page_d.wait_for_timeout(4000)
    page_d.on("dialog", lambda dialog: dialog.accept())
    try:
        page_d.reload(wait_until="load")
    except Exception:
        goto(page_d, MOCK_PATH)
    wait_for_mock_ready(page_d)
    try:
        page_d.wait_for_selector(f"text={RESUME_HEADING}", timeout=8000)
    except Exception:
        pass
    write_row(
        "After the reload the start screen offers the sitting back, with the Writing time that is left",
        text_count(page_d, RESUME_HEADING) > 0 and text_count(page_d, "left on the Writing clock") > 0,
        f'offer: {text_count(page_d, RESUME_HEADING)}, "left on the Writing clock": '
        f'{text_count(page_d, "left on the Writing clock")}',
    )
    shot(page_d, "15-a-reload-offer-with-writing-time", MOCK_PATH)
    journey.click_until(
        page_d,
        lambda: page_d.get_by_role("button", name="Continue where you left off"),
        lambda: page_d.locator("textarea").count() > 0,
    )
    page_d.wait_for_timeout(1500)
    draft = page_d.locator("textarea").first.input_value() if page_d.locator("textarea").count() else None
    clock_text, left = clock_seconds(page_d)
    now_ms = int(time.time() * 1000)
    expected = round((deadline - now_ms) / 1000) if isinstance(deadline, (int, float)) else None
    after = active_mock_for(page_d, f"u:{a_id}") or {}
    write_row("A's draft is back exactly as typed", draft == A_DRAFT, f'textarea reads "{draft}"')
    write_row(
        "The stored Writing deadline was not restarted or moved",
        isinstance(deadline, (int, float)) and after.get("writingEndsAt") == deadline,
        f'before the reload {deadline}, after {after.get("writingEndsAt")}',
    )
    write_row(
        "The clock on screen counts down to that same deadline, not a fresh 60:00",
        left is not None and expected is not None and left < 3600 and abs(left - expected) <= 5,
        f'clock shows "{clock_text}" ({left} s), the stored deadline leaves {expected} s',
    )
    shot(page_d, "16-a-writing-resumed-same-deadline", MOCK_PATH)

    run_speaking_steps(ctx7, page_d, a_id)
    report_diagnostics("Steps 7, 9, 10 and 11 (A's tabs)", errors7 + errors7d, failed7 + failed7d)
    ctx7.close()


# ── Third Codex round (R2B-02, R2B-03) ──────────────────────────────────────

SPEAKING_START = "Start speaking test"
INTERRUPTED_NOTE = "Your speaking test was interrupted before it finished"
RESULTS_HEADING = "You've finished the sitting"
MOCK_HISTORY_KEY = "ielts.mock.v1"
# Two SYNTHETIC answers typed into the first two gaps of the mock's Listening
# paper in Step 12.
LEG_ANSWERS = ["synthetic library", "synthetic tuesday"]


def mock_history_for(page, namespace):
    value = json_item(page, f"{MOCK_HISTORY_KEY}::{namespace}")
    return value if isinstance(value, list) else []


def on_speaking_brief(page):
    return text_count(page, "Part 4 of 4") > 0 and page.get_by_role("button", name=SPEAKING_START).count() > 0


def on_results(page):
    return text_count(page, RESULTS_HEADING) > 0


def examiner_error_showing(page):
    return page.get_by_role("button", name="Back").count() > 0 and (
        text_count(page, "Examiner service error") > 0 or text_count(page, "Could not reach the examiner service") > 0
    )


def run_speaking_steps(ctx, page_a, a_id):
    """Step 11 (R2B-02), on A's own tab, carrying on from Step 10 (Writing)."""
    ns_a = f"u:{a_id}"
    key_a = f"{ACTIVE_MOCK_KEY}::{ns_a}"
    write_section(
        "Step 11 - A signs out on the Speaking brief, and again with the examiner open, and is back "
        "on the brief each time, never at the results (Codex R2B-02)",
        "An account change used to take the examiner off screen in a way it reported as the student "
        "cancelling Speaking: the mock skipped Speaking, went to its results, and when A was back it "
        "recorded itself without Speaking and forgot the sitting. The examiner here is opened against "
        "an address on the stand-in with nothing behind it, so no interview, microphone or paid session "
        "is ever started; it stops on its own error screen, which is enough to be taken off screen.",
    )
    to_brief = journey.click_until(
        page_a,
        lambda: page_a.get_by_role("button", name="Finish Writing"),
        lambda: on_speaking_brief(page_a),
    )
    page_a.wait_for_timeout(800)
    held = active_mock_for(page_a, ns_a) or {}
    write_row(
        "A finishes Writing and is on the Speaking brief, written down as such",
        to_brief and held.get("stage") == "speaking-brief",
        f'on the brief = {to_brief}, stage = {held.get("stage")}',
    )
    shot(page_a, "17-a-speaking-brief", MOCK_PATH)
    mark_page(page_a)

    other = ctx.new_page()
    errors_o, failed_o = attach_diagnostics(other)
    goto(other, "/dashboard")
    other.wait_for_timeout(1200)

    # ── Signed out on the brief ──
    journey.ws_sign_out(other)
    other.wait_for_timeout(1000)
    page_a.bring_to_front()
    page_a.wait_for_timeout(1500)
    reloaded_since(page_a, "A's mock tab, after signing out on the Speaking brief")
    write_row(
        "Signed out on the brief, A's open mock stops, and does not go to the results",
        text_count(page_a, "You signed out during this mock exam") > 0 and not on_results(page_a),
        f'stopped screen: {text_count(page_a, "You signed out during this mock exam")}, results: {on_results(page_a)}',
    )
    after = json_item(other, key_a) or {}
    history = mock_history_for(other, ns_a)
    write_row(
        "A's sitting is still written down at the Speaking brief, and no mock was recorded",
        after.get("stage") == "speaking-brief" and not after.get("speakingSkipped") and not history,
        f'stage = {after.get("stage")}, speakingSkipped = {after.get("speakingSkipped")}, A\'s mock history = {json.dumps(history)}',
    )
    back = journey.ws_sign_in(other, EMAIL_A, PASSWORD_A)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2000)
    write_row(
        "A signs back in and the open tab is on the Speaking brief again, not the results",
        back == a_id and on_speaking_brief(page_a) and not on_results(page_a),
        f"signed in as {back}, on the brief = {on_speaking_brief(page_a)}, results = {on_results(page_a)}",
    )
    shot(page_a, "18-a-back-on-the-brief", MOCK_PATH)

    # ── Signed out with the examiner open ──
    start = page_a.get_by_role("button", name=SPEAKING_START)
    if not (start.count() and start.first.is_enabled()):
        write_note(
            "**Not run:** \"Start speaking test\" is disabled, so this dev server was started without "
            "`PUBLIC_LIVE_EXAMINER_URL` (see the header). The examiner checks below are reported as "
            "failed, not skipped silently."
        )
        write_row("The examiner could be opened against the stand-in's empty examiner address", False, "Start disabled")
        report_diagnostics("Step 11 (second tab)", errors_o, failed_o)
        other.close()
        return
    opened = journey.click_until(
        page_a,
        lambda: page_a.get_by_role("button", name=SPEAKING_START),
        lambda: examiner_error_showing(page_a),
    )
    held = active_mock_for(page_a, ns_a) or {}
    write_row(
        "A opens the examiner; with nothing behind its address it stops on its own error screen before "
        "any microphone or session is asked for, and the sitting is written down as in the interview",
        opened and held.get("stage") == "speaking",
        f'examiner error screen = {opened}, stage = {held.get("stage")}',
    )
    shot(page_a, "19-a-examiner-open-no-service", MOCK_PATH)

    journey.ws_sign_out(other)
    other.wait_for_timeout(1000)
    page_a.bring_to_front()
    page_a.wait_for_timeout(1500)
    write_row(
        "Signed out with the examiner open, A's tab stops; it neither skips Speaking nor goes to the results",
        text_count(page_a, "You signed out during this mock exam") > 0 and not on_results(page_a),
        f'stopped screen: {text_count(page_a, "You signed out during this mock exam")}, results: {on_results(page_a)}',
    )
    after = json_item(other, key_a) or {}
    history = mock_history_for(other, ns_a)
    write_row(
        "A's sitting is still written down in the interview: not cleared, Speaking not skipped, no mock recorded",
        after.get("stage") == "speaking" and after.get("speakingSkipped") is False and not history,
        f'stage = {after.get("stage")}, speakingSkipped = {after.get("speakingSkipped")}, A\'s mock history = {json.dumps(history)}',
    )
    shot(page_a, "20-a-stopped-with-examiner-open", MOCK_PATH)
    back = journey.ws_sign_in(other, EMAIL_A, PASSWORD_A)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2000)
    write_row(
        "A signs back in: the open tab is on the Speaking brief, saying the interview was interrupted, "
        "and not on the results",
        back == a_id
        and on_speaking_brief(page_a)
        and text_count(page_a, INTERRUPTED_NOTE) > 0
        and not on_results(page_a),
        f"on the brief = {on_speaking_brief(page_a)}, interrupted note = {text_count(page_a, INTERRUPTED_NOTE)}, "
        f"results = {on_results(page_a)}",
    )
    write_row(
        "Still nothing recorded for A's mock, and A's sitting is still there",
        not mock_history_for(page_a, ns_a) and bool(active_mock_for(page_a, ns_a)),
        f"A's mock history = {json.dumps(mock_history_for(page_a, ns_a))}",
    )
    shot(page_a, "21-a-back-on-brief-after-examiner", MOCK_PATH)

    # ── A reload picks it up at Speaking too ──
    try:
        page_a.reload(wait_until="load")
    except Exception:
        goto(page_a, MOCK_PATH)
    wait_for_mock_ready(page_a)
    try:
        page_a.wait_for_selector(f"text={RESUME_HEADING}", timeout=8000)
    except Exception:
        pass
    write_row(
        "After a reload A is offered the sitting back, picking up at Speaking",
        text_count(page_a, RESUME_HEADING) > 0 and text_count(page_a, "It picks up at Speaking") > 0,
        f'offer: {text_count(page_a, RESUME_HEADING)}, "It picks up at Speaking": {text_count(page_a, "It picks up at Speaking")}',
    )
    resumed = journey.click_until(
        page_a,
        lambda: page_a.get_by_role("button", name="Continue where you left off"),
        lambda: on_speaking_brief(page_a),
    )
    write_row(
        "Continue lands on the Speaking brief with the interrupted note, never back inside an interview",
        resumed and text_count(page_a, INTERRUPTED_NOTE) > 0 and not examiner_error_showing(page_a),
        f"on the brief = {resumed}, interrupted note = {text_count(page_a, INTERRUPTED_NOTE)}",
    )
    shot(page_a, "22-a-reload-resumes-at-speaking-brief", MOCK_PATH)

    # ── A's own Back still skips Speaking ──
    journey.click_until(
        page_a,
        lambda: page_a.get_by_role("button", name=SPEAKING_START),
        lambda: examiner_error_showing(page_a),
    )
    to_results = journey.click_until(
        page_a,
        lambda: page_a.get_by_role("button", name="Back"),
        lambda: on_results(page_a),
    )
    page_a.wait_for_timeout(1200)
    history = mock_history_for(page_a, ns_a)
    write_row(
        "A's own Back on the examiner still goes to the results, with Speaking skipped",
        to_results and text_count(page_a, "you skipped Speaking") > 0,
        f'results = {to_results}, "you skipped Speaking": {text_count(page_a, "you skipped Speaking")}',
    )
    write_row(
        "The mock is recorded once, for A, with Speaking marked skipped, and is no longer offered as unfinished",
        len(history) == 1 and history[0].get("speakingSkipped") is True and active_mock_for(page_a, ns_a) is None,
        f"A's mock history = {json.dumps(history)}, written-down sitting = {raw_item(page_a, key_a)}",
    )
    shot(page_a, "23-a-deliberate-back-skips-speaking", MOCK_PATH)
    report_diagnostics("Step 11 (second tab)", errors_o, failed_o)
    other.close()


def run_mock_legs_step(browser, a_id):
    """Step 12 (R2B-03), on a fresh browser for A."""
    ns_a = f"u:{a_id}"
    write_section(
        "Step 12 - A's mock paper survives a standalone drill opened part way through, and a fresh mock "
        "on the same paper starts empty (Codex R2B-03)",
        "A mock's Listening and Reading papers used to share the ONE slot a paper opened on its own "
        "uses, found by paper id alone: a drill opened mid-mock overwrote the mock's answers and clock, "
        "and a new mock on a paper that happened to be in the slot picked up the older sitting. They are "
        "now kept inside the mock sitting itself, under its own identity.",
    )
    ctx = new_context(browser)
    page = ctx.new_page()
    errors, failed = attach_diagnostics(page)
    # Leaving a running paper asks "leave site?"; a student who navigates
    # away says yes, and so does this script.
    page.on("dialog", lambda dialog: dialog.accept())
    goto(page, "/dashboard")
    page.wait_for_timeout(1200)
    back = journey.ws_sign_in(page, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on a fresh browser", back == a_id, f"signed in as {back}")

    goto(page, MOCK_PATH)
    wait_for_mock_ready(page)
    listening_id = page.locator("select").first.input_value()
    started = journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Start Mock Exam"),
        lambda: page.locator('[role="timer"]').count() > 0,
    )
    page.wait_for_timeout(1000)
    gaps = page.locator('input[type="text"]:visible')
    for index, answer in enumerate(LEG_ANSWERS):
        try:
            gaps.nth(index).fill(answer)
        except Exception:
            pass
    page.wait_for_timeout(1500)
    held = active_mock_for(page, ns_a) or {}
    leg = (held.get("legSittings") or {}).get(listening_id) or {}
    first_sitting = held.get("sittingId")
    deadline = leg.get("endsAt")
    leg_before = json.dumps(leg, sort_keys=True)
    write_row(
        "A's answers on the mock's Listening paper are kept inside the mock sitting, with the paper's deadline",
        started
        and bool(first_sitting)
        and sorted((leg.get("answers") or {}).values()) == sorted(LEG_ANSWERS)
        and isinstance(deadline, (int, float)),
        f"sittingId = {first_sitting}, {listening_id} = {leg_before}",
    )
    standalone_before = session_for(page, ns_a)
    write_row(
        "Nothing of the mock's paper is in the standalone slot",
        standalone_before is None,
        f"standalone slot = {json.dumps(standalone_before)}",
    )
    shot(page, "24-a-mock-listening-answered", MOCK_PATH)

    # ── A leaves for a standalone Reading drill and answers it ──
    open_drill_from_hub(page)
    journey.start_drill_if_needed(page)
    page.wait_for_timeout(700)
    try:
        page.locator("select").first.select_option(index=A_CHOICE_INDEX)
    except Exception:
        pass
    page.wait_for_timeout(900)
    drill = session_for(page, ns_a) or {}
    write_row(
        "A's standalone Reading drill uses the standalone slot, with A's answer in it",
        drill.get("testId") == "reading-full-006-drill-p2" and bool(drill.get("answers")),
        f"standalone slot = {json.dumps(drill)}",
    )
    held_mid = active_mock_for(page, ns_a) or {}
    leg_mid = (held_mid.get("legSittings") or {}).get(listening_id) or {}
    write_row(
        "The drill did not touch the mock's Listening paper: same answers, same deadline, byte for byte",
        json.dumps(leg_mid, sort_keys=True) == leg_before and held_mid.get("sittingId") == first_sitting,
        f"{listening_id} now = {json.dumps(leg_mid, sort_keys=True)}",
    )
    shot(page, "25-a-standalone-drill-mid-mock", DRILL_PATH)

    # ── Back to the mock ──
    goto(page, MOCK_PATH)
    wait_for_mock_ready(page)
    try:
        page.wait_for_selector(f"text={RESUME_HEADING}", timeout=8000)
    except Exception:
        pass
    write_row(
        "Back on the mock page, A is offered the same sitting, picking up at Listening",
        text_count(page, RESUME_HEADING) > 0 and text_count(page, "It picks up at Listening") > 0,
        f'offer: {text_count(page, RESUME_HEADING)}, "It picks up at Listening": {text_count(page, "It picks up at Listening")}',
    )
    resumed = journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Continue where you left off"),
        lambda: page.locator('[role="timer"]').count() > 0,
    )
    page.wait_for_timeout(1500)
    gaps = page.locator('input[type="text"]:visible')
    values = []
    for index in range(len(LEG_ANSWERS)):
        try:
            values.append(gaps.nth(index).input_value())
        except Exception:
            values.append(None)
    clock_text, left = clock_seconds(page)
    now_ms = int(time.time() * 1000)
    expected = round((deadline - now_ms) / 1000) if isinstance(deadline, (int, float)) else None
    write_row(
        "A resumes the mock's Listening paper with both answers still in their gaps",
        resumed and values == LEG_ANSWERS,
        f"gaps read {json.dumps(values)}, typed {json.dumps(LEG_ANSWERS)}",
    )
    write_row(
        "The Listening clock counts down to the same deadline it had before the drill",
        left is not None and expected is not None and abs(left - expected) <= 5,
        f'clock shows "{clock_text}" ({left} s), the stored deadline leaves {expected} s',
    )
    shot(page, "26-a-mock-listening-resumed", MOCK_PATH)

    # ── A fresh mock on the SAME Listening paper ──
    try:
        page.reload(wait_until="load")
    except Exception:
        goto(page, MOCK_PATH)
    wait_for_mock_ready(page)
    try:
        page.locator("select").first.select_option(listening_id)
    except Exception:
        pass
    fresh_started = journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Start Mock Exam"),
        lambda: page.locator('[role="timer"]').count() > 0,
    )
    page.wait_for_timeout(1500)
    fresh = active_mock_for(page, ns_a) or {}
    fresh_leg = (fresh.get("legSittings") or {}).get(listening_id) or {}
    gaps = page.locator('input[type="text"]:visible')
    fresh_values = []
    for index in range(len(LEG_ANSWERS)):
        try:
            fresh_values.append(gaps.nth(index).input_value())
        except Exception:
            fresh_values.append(None)
    write_row(
        "The fresh mock is a NEW sitting on the same Listening paper",
        fresh_started
        and bool(fresh.get("sittingId"))
        and fresh.get("sittingId") != first_sitting
        and fresh.get("listeningTestId") == listening_id,
        f'sittingId {first_sitting} -> {fresh.get("sittingId")}, Listening paper = {fresh.get("listeningTestId")}',
    )
    write_row(
        "Its Listening paper starts empty, on screen and in storage",
        fresh_values == ["", ""] and bool(fresh_leg) and not (fresh_leg.get("answers") or {}),
        f"gaps read {json.dumps(fresh_values)}, stored paper = {json.dumps(fresh_leg)}",
    )
    write_row(
        "Its Listening clock is its own: a later deadline than the older sitting's",
        isinstance(fresh_leg.get("endsAt"), (int, float))
        and isinstance(deadline, (int, float))
        and fresh_leg["endsAt"] > deadline,
        f'older deadline {deadline}, fresh deadline {fresh_leg.get("endsAt")}',
    )
    fresh_text = json.dumps(fresh)
    write_row(
        "Nothing of the older sitting's answers is anywhere in the fresh sitting",
        not any(answer in fresh_text for answer in LEG_ANSWERS),
        "searched the whole written-down fresh sitting for the two older answers",
    )
    write_row(
        "A's standalone drill is still in the standalone slot, untouched by either mock",
        (session_for(page, ns_a) or {}) == drill,
        f"standalone slot = {json.dumps(session_for(page, ns_a))}",
    )
    shot(page, "27-a-fresh-mock-empty-listening", MOCK_PATH)
    report_diagnostics("Step 12", errors, failed)
    ctx.close()


def record_answers(record):
    """Every first answer in every item of every event in a learner record."""
    out = []
    for event in (record or {}).get("events") or []:
        for item in event.get("items") or []:
            out.append({"itemId": item.get("itemId"), "firstAnswer": item.get("firstAnswer")})
    return out


def run():
    reset_results()
    write_note(
        "**Correcting the boilerplate above, which belongs to the f01-f17 suite and is "
        "written by `final_helpers.reset_results()` (another builder's file, not edited "
        "here).** Two of its sentences are wrong for THIS run and are superseded by this "
        "note: this is NOT the frozen production snapshot (it is a dev server started for "
        f"this run at {BASE_URL}), and it is NOT a rerun on top of `results.md`. Supabase IS "
        "configured here, pointed at the free local stand-in, which is the whole point of "
        "the scenario. No AI is called at any step."
    )
    write_note(
        "**This run is against the FREE LOCAL STAND-IN** "
        f"(`node tools/mr-ez-dev-server.mjs` at {STANDIN_URL}, in memory, this machine only), "
        f"site under test at {BASE_URL}, stand-in REST surface at {journey.STANDIN_URL}. "
        "It is NOT a real Supabase project and nothing below is claimed as proof about one. "
        "Every student, email and answer is SYNTHETIC.\n\n"
        "It re-runs the journey of finding 1 in "
        "`docs/audits/claude-personal-learning-review-2026-09-23.md` "
        "(original reproduction: `docs/audits/claude-review-2026-09-23/independent-browser.py`) "
        "against the fixed code, and adds A's resume and the mounted-player owner change. "
        "Steps 6 to 10 are the second Codex round: R2-01 (an old unowned sitting and a history "
        "stamp naming A) and R2-03 (the unfinished mock exam, per student, resumable by its own "
        "student only). Steps 11 and 12 are the third: R2B-02 (an account change during Speaking "
        "is a suspension back to the Speaking brief, not a cancellation to the results) and R2B-03 "
        "(a mock's papers are kept inside their own sitting, apart from standalone papers)."
    )

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = new_context(browser)
        page = ctx.new_page()
        errors, failed = attach_diagnostics(page)

        # ── Step 1: A starts the drill and leaves it unfinished ───────────
        write_section(
            "Step 1 - Student A starts the drill and walks away",
            "A signs up, opens `reading-full-006-drill-p2` from the real Reading hub link, "
            "answers question 14 and leaves without submitting.",
        )
        goto(page, "/dashboard")
        page.wait_for_timeout(1200)
        a_id = journey.ws_sign_up(page, EMAIL_A, PASSWORD_A)
        write_row("Student A is signed in with a real account id", bool(a_id), f"A = {a_id}")

        write_row("The drill opens from its real hub link", open_drill_from_hub(page), f'clicked a[href="{DRILL_HREF}"]')
        journey.start_drill_if_needed(page)
        page.wait_for_timeout(600)
        selects = page.locator("select")
        write_row("The drill is on screen with its answer controls", selects.count() > 0, f"{selects.count()} select(s)")
        selects.first.select_option(index=A_CHOICE_INDEX)
        page.wait_for_timeout(700)
        on_screen = first_select_value(page)
        a_sessions = all_sessions(page)
        write_note("**A's saved sitting:** " + json.dumps(a_sessions))
        # The answer A actually chose, taken from the saved sitting rather
        # than from the control on screen: the saved value is the thing every
        # later assertion is really about, and it cannot be read a beat early.
        a_saved = next(iter(a_sessions.values()), {}) or {}
        a_answer = (a_saved.get("answers") or {}).get("q14")
        write_row(
            "A's chosen answer for q14 was saved",
            bool(a_answer),
            f'saved answer = "{a_answer}", control on screen showed "{on_screen}"',
        )
        a_key_owned = [k for k in a_sessions if k.startswith(f"{SESSION_KEY}::u:")]
        write_row(
            "A's unfinished sitting is saved under A's own key, not the old device-wide one",
            bool(a_key_owned) and a_key_owned[0].endswith(f"u:{a_id}"),
            f"keys = {session_keys(page)}",
        )
        write_row(
            "The sitting carries the owner it was started under",
            (session_for(page, f"u:{a_id}") or {}).get("owner") == f"u:{a_id}",
            f'owner = {(session_for(page, f"u:{a_id}") or {}).get("owner")}, answer q14 = "{a_answer}"',
        )
        shot(page, "01-a-answers-q14", DRILL_PATH)

        # ── Step 2: B signs up and opens the same drill ───────────────────
        write_section(
            "Step 2 - B signs up on the same browser and opens the same drill",
            "The exact path the review reproduced the defect on: A signs out, B signs up, "
            "B enters the drill from the same hub link.",
        )
        goto(page, "/dashboard")
        page.wait_for_timeout(1200)
        journey.ws_sign_out(page)
        b_id = journey.ws_sign_up(page, EMAIL_B, PASSWORD_B)
        write_row("Student B is a different account", bool(b_id) and b_id != a_id, f"B = {b_id}")

        open_drill_from_hub(page)
        journey.start_drill_if_needed(page)
        page.wait_for_timeout(800)
        b_restored = first_select_value(page)
        write_row(
            "B sees NO answer selected (A's answer is not restored)",
            not b_restored,
            f'B\'s first select reads "{b_restored}" (A had chosen "{a_answer}")',
        )
        shot(page, "02-b-sees-a-blank-drill", DRILL_PATH)

        # ── Step 3: B submits ─────────────────────────────────────────────
        write_section(
            "Step 3 - B submits the drill",
            "B submits without answering anything, so ANY non-empty first answer in B's "
            "record or in the rows the account received could only have come from A.",
        )
        journey.submit_and_confirm(page)
        page.wait_for_timeout(2500)
        b_record = read_record(page)
        b_answers = record_answers(b_record)
        b_nonblank = [row for row in b_answers if row["firstAnswer"]]
        write_note("**B's learner record, every first answer:** " + json.dumps(b_answers))
        write_row(
            "B's learner record contains none of A's answers",
            not b_nonblank,
            f"{len(b_answers)} item(s) recorded, {len(b_nonblank)} of them non-blank: {json.dumps(b_nonblank)}",
        )
        carries_a = f'"firstAnswer":"{a_answer}"' in json.dumps(b_record or {}, separators=(",", ":"))
        write_row(
            "Nothing anywhere in B's whole browser record carries A's answer",
            not carries_a,
            f'searched B\'s whole record for \'"firstAnswer":"{a_answer}"\': '
            + ("found it" if carries_a else "not present"),
        )
        shot(page, "03-b-submitted", DRILL_PATH)

        goto(page, "/dashboard")
        page.wait_for_timeout(2500)
        remote_b = journey.settled_store_snapshot(b_id)
        remote_answers = []
        for row in remote_b.get("learning_events") or []:
            for item in (row.get("event") or {}).get("items") or []:
                remote_answers.append({"itemId": item.get("itemId"), "firstAnswer": item.get("firstAnswer")})
        remote_nonblank = [row for row in remote_answers if row["firstAnswer"]]
        write_note("**The rows the stand-in holds for B, every first answer:** " + json.dumps(remote_answers))
        write_row(
            "The stand-in's rows for B contain only B's own (blank) answers, nothing of A's",
            not remote_nonblank,
            f"{len(remote_answers)} item(s) in B's rows, {len(remote_nonblank)} non-blank: {json.dumps(remote_nonblank)}",
        )
        remote_carries_a = f'"firstAnswer":"{a_answer}"' in json.dumps(remote_b, separators=(",", ":"))
        write_row(
            "Nothing in everything the stand-in holds for B carries A's answer",
            not remote_carries_a,
            f'searched every row the stand-in holds for B for \'"firstAnswer":"{a_answer}"\': '
            + ("found it" if remote_carries_a else "not present"),
        )
        a_remote_before = journey.settled_store_snapshot(a_id)
        write_row(
            "A's own account received nothing from B's submission either",
            all(
                "drill:reading-full-006-drill-p2" != row.get("activity_id")
                for row in a_remote_before.get("learning_events") or []
            ),
            f'{len(a_remote_before.get("learning_events") or [])} event(s) on A so far',
        )

        # ── Step 4: A signs back in and resumes ───────────────────────────
        write_section(
            "Step 4 - A signs back in and resumes the sitting",
            "Nothing was deleted: A's answers are still under A's own key, and the drill "
            "restores them.",
        )
        journey.ws_sign_out(page)
        back_id = journey.ws_sign_in(page, EMAIL_A, PASSWORD_A)
        write_row("A is signed back in, same account id", back_id == a_id, f"back as {back_id}")
        write_note("**Every sitting on the device now:** " + json.dumps(all_sessions(page)))
        write_row(
            "A's unfinished sitting survived B's entire visit",
            (session_for(page, f"u:{a_id}") or {}).get("answers", {}) != {},
            json.dumps(session_for(page, f"u:{a_id}")),
        )

        open_drill_from_hub(page)
        page.wait_for_timeout(1500)
        resumed = first_select_value(page)
        write_row(
            "A's own answer is restored when A resumes",
            resumed == a_answer,
            f'A resumed to "{resumed}" (A had chosen "{a_answer}")',
        )
        write_row(
            "A resumed straight into the running paper, not the instructions gate",
            page.locator('[role="timer"]').count() > 0,
            f'{page.locator("[role=timer]").count()} timer(s) on screen',
        )
        shot(page, "04-a-resumes-own-answer", DRILL_PATH)

        report_diagnostics("Steps 1 to 4", errors, failed)

        # ── Step 5: the owner changes while the player is MOUNTED ─────────
        write_section(
            "Step 5 - A is mid-drill and signs out in a SECOND TAB",
            "The case the review asked for explicitly: the player is already on screen "
            "when the account changes. It must stop and must not submit.",
        )
        mark_page(page)
        page2 = ctx.new_page()
        errors2, failed2 = attach_diagnostics(page2)
        goto(page2, "/dashboard")
        page2.wait_for_timeout(1500)
        journey.ws_sign_out(page2)
        page2.wait_for_timeout(1500)

        page.bring_to_front()
        page.wait_for_timeout(2000)
        reloaded_since(page, "A's drill tab, after the sign-out in the second tab")
        stopped = page.locator("text=You signed out during this test").count() > 0
        write_row(
            "The mounted player stopped and says the sitting belongs to the signed-out account",
            stopped,
            'looked for "You signed out during this test" on the open drill; '
            f"found {page.locator('text=You signed out during this test').count()}",
        )
        write_row(
            "The stopped player offers a way to start fresh under the account using the browser now",
            page.get_by_role("button", name="Start this test fresh").count() > 0,
            f'"Start this test fresh" buttons: {page.get_by_role("button", name="Start this test fresh").count()}',
        )
        write_row(
            "No Submit control is reachable on the stopped player",
            page.get_by_role("button", name="Submit").count() == 0,
            f'Submit buttons on screen: {page.get_by_role("button", name="Submit").count()}',
        )
        shot(page, "05-player-stopped-after-signout")

        anon_keys = [k for k in session_keys(page) if "::anon:" in k]
        write_note("**Every sitting on the device after the sign-out:** " + json.dumps(all_sessions(page)))
        write_row(
            "A's answers stayed under A's own key and were not copied to the signed-out device owner",
            (session_for(page, f"u:{a_id}") or {}).get("answers", {}) != {} and not anon_keys,
            f"keys = {session_keys(page)}",
        )

        a_remote_after = journey.settled_store_snapshot(a_id)
        drill_events = [
            row for row in a_remote_after.get("learning_events") or []
            if row.get("activity_id") == "drill:reading-full-006-drill-p2"
        ]
        write_row(
            "The stopped sitting was never submitted for anybody",
            not drill_events,
            f"{len(drill_events)} submitted drill event(s) on A's rows",
        )

        report_diagnostics("Step 5", errors2, failed2)
        ctx.close()

        run_legacy_stamp_step(browser, a_id)
        run_mock_steps(browser, a_id, b_id)
        run_mock_legs_step(browser, a_id)
        browser.close()

    write_note(
        "**Run complete.** Every check above ran against the local stand-in "
        f"({journey.STANDIN_URL}) and the site at {BASE_URL}. Nothing here is evidence about a "
        "real Supabase project."
    )


if __name__ == "__main__":
    run()
