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

FOURTH CODEX ROUND (23 September 2026), two more journeys:
  - Step 13, R2C-02: A has a mock (M1) open in Writing in one tab and starts
    a fresh mock (M2) in a second tab. M1's tab stops on its own stopped
    screen, told by the other tab's write, and nothing it does changes M2 or
    its answers. Two more variants stand in for a storage event that a tab
    MISSED (a write made from the page itself raises no event in that same
    page, which is exactly a missed event): typing in a sitting that was
    replaced, and finishing one, are both refused, the replacement is found
    from the refusal, and the newer record is left byte for byte.
  - Step 14, R2C-03: the drill's saved deadline is moved close (a reload
    then puts that short deadline on screen), A signs out in a second tab and
    back in. The still-open page shows the time the deadline leaves, not the
    number frozen at the sign-out; past the deadline it hands the paper in
    at once with A's answers and no time given back. A plain time-up is
    checked too: the answer given after the page opened is the one handed in.

FIFTH CODEX ROUND (23 September 2026), two more journeys:
  - Step 15, R2D-02: A answers paper P in one tab and starts paper Q in a
    second. P's tab stops (the storage event), typing there writes nothing,
    Q keeps its answers, and a reload of Q's tab resumes Q. Stand-ins for a
    missed event: an answer in a replaced tab is refused and stops it, and a
    Submit in a replaced tab is refused BEFORE anything is recorded. Last,
    the same sitting open in two tabs: one hands it in, the other stops with
    the sentence for a sitting handed in elsewhere and cannot hand it in
    again.
  - Step 16, R2D-03: A has a mock open in Writing in one tab; a second tab
    picks up the same sitting and finishes it. The first tab stops with the
    finished-or-closed sentence (not the replaced one), writes nothing, and
    the mock is recorded once, in the mock history and in the learning
    history. Stand-ins for a missed event: a keystroke, and finishing, in a
    tab whose record was removed are refused and stop it, recording nothing.

SIXTH CODEX ROUND (23 September 2026), two more journeys:
  - Step 17, R2E-02: A hands a drill in, asks Mr EZ about one wrong answer
    (the stand-in's simulated reply, sent with A's own token), and leaves
    the review open. A signs out in a second tab, then B signs in there. The
    first tab's review leaves the screen each time (no score, no answers, no
    Mr EZ), with a sentence true for each, and sends nothing more. B's own
    page shows nothing of A; B starting the same drill fresh in that same
    tab, with the same answer, sees none of the reply A bought. A third tab
    that hears nothing from the others stands in for a tab that missed the
    switch: A's review is still on its screen while the stored session is
    B's, and its press sends NOTHING (the request is refused because the
    session is not A's), and the review then leaves the screen.
  - Step 18, R2E-03: A's mock is open on its Listening paper in three tabs
    of the same sitting. Tab 1 hands it in with one set of answers; tab 3
    stops on that hand-in with its own sentence; tab 2, which hears nothing
    from the others, hands in different answers and is refused. The paper's
    result stays tab 1's, and the paper is recorded once, in the progress
    history and in the learner evidence.

SEVENTH ROUND (23 September 2026, the follow-up to R2E-02 for every other
tutor request), one more journey:
  - Step 19: A sends a message from Mr EZ's panel. This script holds that
    request on its way (it is routed to the test, not to the stand-in),
    signs A out and B in in a second tab, and only then releases it with a
    SYNTHETIC reply it writes itself (labelled simulated, no model, not even
    the stand-in's). The first tab's panel is B's by then: the reply is not
    shown, nothing is sent again, and B's saved conversation holds nothing
    of A's. B's own message afterwards goes out with B's token and its
    (equally synthetic) reply lands in B's conversation, so the panel still
    works for whoever is here.

EIGHTH ROUND (23 September 2026, the lesson surfaces that record what the
tutor sends back), one more journey:
  - Step 20: A writes an overview on the guided written task and presses
    Check. This script holds the practice-evaluation request on its way (the
    same routing as step 19), signs A out and B in in a second tab, and only
    then releases it with a SYNTHETIC judged reply it writes itself (labelled
    simulated, no model, not even the stand-in's). The first tab hands the
    task over to B (an empty task and one calm line), the reply is shown to
    nobody, A's answer is kept in A's own learner record (as an attempt
    nothing judged, because the tutor client drops a reply that comes back
    after the switch) and in A's own draft, and B's record, draft and
    account rows hold nothing of A's.

NINTH ROUND (23 September 2026, the follow-up to R2B-01 for the two other
screens that host the lesson help buttons), one more journey:
  - Step 21: A answers part of the guided focused Reading exercise in one
    tab and part of a lesson quick check in another, and B signs in from a
    third. Both of A's tabs hand over (one calm line, nothing of A's
    answers), B's own visits show nothing of A's, and when A signs back in
    both tabs, and a fresh visit, find A's answers where they were kept (A's
    own in-progress copy of each). Last, two tabs that hear nothing from the
    others (the DEAF_TAB_SCRIPT of step 17) still show A's answers while B
    signs in elsewhere; a check pressed in each is refused, records nothing
    for anybody, and takes the answers off that screen.

TENTH ROUND (23 September 2026, the last screens that recorded through the
shared store), one more journey:
  - Step 22: A answers part of the inline quiz written into a lesson body
    (no lesson carries one today, so the scraper's markup is written into the
    real True/False/Not Given lesson page before its own script runs) and
    part of a vocabulary practice round, and B signs in from another tab.
    Both of A's tabs hand over (the calm line, nothing of A's on screen), A's
    quiz answers are kept in A's own run and A's vocabulary answers stay in
    A's schedule and record only, B's own visits show nothing of A's, and a
    press in a tab that hears nothing from the others records nothing. Then
    the spoken task, in a second browser with Chromium's fake microphone: a
    recording under way when B signs in is stopped and dropped (recorder
    stopped, microphone released, nothing recorded), and "Done for now" in a
    deaf tab is refused.

ELEVENTH ROUND (23 September 2026, the sixth Codex inspection), one more
journey in two parts:
  - Step 23a, R2F-01: the spoken task on the fake microphone, with the
    microphone request HELD by this script (an init script makes the
    browser's getUserMedia wait until the test answers it, the way an open
    permission prompt does). A presses Start twice while it is held: the
    page asks for the microphone once. The prompt is answered and one
    recorder runs; B signs in in another tab and every recorder the page
    started is stopped and every track it was given has ended, counted in
    the page. Then two more held starts, and the account changes before the
    prompt is answered: the late microphone is released at once and no
    recorder starts.
  - Step 23b, R2F-02: the written task. A presses Check on X and the
    evaluation request is held (routed to this script, as in step 20). A
    signs out and B in, then B out and A back in, in a second tab; the first
    tab is A's again with X in the box. A writes revision Y and it
    autosaves. The held evaluation is released with a SYNTHETIC reply this
    script wrote (labelled simulated, no model). A reload shows Y, and X is
    in A's attempt history.

WHAT THIS IS NOT
- Not a real Supabase project. `tools/mr-ez-dev-server.mjs` stands in for it,
  in memory, on this machine only. Every fact below is about that stand-in,
  never claimed as proof about a real project.
- Not the frozen production snapshot the f01-f17 suite uses. This script
  drives its own dev server and its own stand-in (addresses below).
- No real account, no real key, no paid API call, no deployment.

Requires, already running before this script starts (the second round used
the stand-in on 8813 and the site on 4366, the third 8821 and 4374, the
fourth, fifth and sixth 8833 and 4386; override with IELTS_STANDIN_URL and
IELTS_BASE_URL):
  1. the stand-in:  MR_EZ_DEV_PORT=8833 node tools/mr-ez-dev-server.mjs
  2. the site, with its OWN Vite dependency cache (astro.config.f22.mjs;
     see astro.config.f21.mjs for why two dev servers on one checkout must
     not share one):
                    PUBLIC_SUPABASE_URL=http://127.0.0.1:8833
                    PUBLIC_SUPABASE_ANON_KEY=local-anon-key
                    PUBLIC_MR_EZ_URL=http://127.0.0.1:8833/tutor
                    PUBLIC_LIVE_EXAMINER_URL=http://127.0.0.1:8833/no-examiner-here
                    npx astro dev --config astro.config.f22.mjs --port 4386 --host 127.0.0.1
     The examiner address is deliberately one the stand-in answers "not
     found" on (step 11). Without it, Step 11's examiner checks are reported
     as not run rather than passed.

Run with:
  IELTS_STANDIN_URL=http://127.0.0.1:8833 python tests/browser/f22_unfinished_test_owner.py

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
# results-unfinished-test.md with "unfinished-" screenshots, the second
# results-unfinished-test-2.md with "unfinished2-", the third
# results-unfinished-test-3.md with "unfinished3-", the fourth
# results-unfinished-test-4.md with "unfinished4-", the fifth
# results-unfinished-test-5.md with "unfinished5-", the sixth
# results-unfinished-test-6.md with "unfinished6-", the seventh
# results-unfinished-test-7.md with "unfinished7-", the eighth
# results-unfinished-test-8.md with "unfinished8-", the ninth
# results-unfinished-test-9.md with "unfinished9-" and the tenth
# results-unfinished-test-10.md with "unfinished10-"; this round's defaults
# write an eleventh file beside them and leave all ten as they were.
os.environ.setdefault("IELTS_BASE_URL", "http://127.0.0.1:4386/ielts-website")
os.environ.setdefault("IELTS_RESULTS_SUFFIX", "-unfinished-test-11")
os.environ.setdefault("IELTS_SHOT_PREFIX", "unfinished11-")

from playwright.sync_api import sync_playwright  # noqa: E402

import f20_account_journey as journey  # noqa: E402
from final_helpers import (  # noqa: E402
    BASE_URL,
    attach_diagnostics,
    events_for,
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
STANDIN_URL = os.environ.get("IELTS_STANDIN_URL", "http://127.0.0.1:8833")  # the local stand-in; override per run
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


# ── Fourth Codex round (R2C-02, R2C-03) ─────────────────────────────────────

REPLACED_SENTENCE = "A newer mock exam was started in another tab, so this one is no longer being saved."
M1_DRAFT = "SYNTHETIC Task 1 draft in the OLDER mock, typed in the first tab."
M2_ANSWERS = ["synthetic harbour", "synthetic friday"]
DRILL_ACTIVITY = "drill:reading-full-006-drill-p2"
DRILL_SECONDS = 20 * 60


def through_to_writing(page):
    """From a mock just started on its Listening paper: hand Listening and
    Reading in (blank is fine, nothing here is about the scores) and carry on
    into Writing. True once the Writing screen is up."""
    journey.submit_and_confirm(page)
    page.wait_for_timeout(1500)
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Back to results"),
        lambda: text_count(page, "starts in") > 0,
    )
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Start now"),
        lambda: page.locator('[role="timer"]').count() > 0,
    )
    page.wait_for_timeout(800)
    journey.submit_and_confirm(page)
    page.wait_for_timeout(1500)
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Back to results"),
        lambda: text_count(page, "Writing starts in") > 0,
    )
    return journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Start now"),
        lambda: page.locator("textarea").count() > 0,
    )


def put_newer_sitting_in_place(page, key, sitting_id, answers):
    """Write, FROM THIS PAGE ITSELF, a newer sitting over the stored one: the
    same record with a new sitting id and a Listening paper of its own with
    `answers`. A page's own write raises no storage event in that page, so
    this is precisely "another tab started a fresh mock and this tab missed
    the event". Returns the value written, byte for byte."""
    return page.evaluate(
        """([key, sittingId, answers]) => {
            const held = JSON.parse(localStorage.getItem(key));
            const paper = held.listeningTestId;
            const now = Date.now();
            const newer = { ...held, sittingId, legSittings: { [paper]: {
                testId: paper, startedAt: now, endsAt: now + 40 * 60000, answers, result: null } } };
            const text = JSON.stringify(newer);
            localStorage.setItem(key, text);
            return text;
        }""",
        [key, sitting_id, answers],
    )


def run_replaced_mock_step(browser, a_id):
    """Step 13 (R2C-02), on a fresh browser for A."""
    ns_a = f"u:{a_id}"
    key_a = f"{ACTIVE_MOCK_KEY}::{ns_a}"
    write_section(
        "Step 13 - A mock left open in one tab stops when A starts a fresh one in another, and never "
        "overwrites or removes it (Codex R2C-02)",
        "The papers' own writes already had to name their sitting; the mock screen's own saves and its "
        "tidy-up did not. A keystroke in an older mock (M1) left open in one tab replaced a fresh mock (M2) "
        "the same student had started in another, papers and all, and finishing M1 deleted M2. Now only "
        "starting a mock may replace a sitting; every other save and the tidy-up must name the stored "
        "sitting itself, and a replaced tab stops for good.",
    )
    ctx = new_context(browser)
    tab1 = ctx.new_page()
    errors1, failed1 = attach_diagnostics(tab1)
    tab1.on("dialog", lambda dialog: dialog.accept())
    goto(tab1, "/dashboard")
    tab1.wait_for_timeout(1200)
    back = journey.ws_sign_in(tab1, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on a fresh browser", back == a_id, f"signed in as {back}")

    # ── Tab 1: M1, through to Writing, with a draft ──
    goto(tab1, MOCK_PATH)
    wait_for_mock_ready(tab1)
    journey.click_until(
        tab1,
        lambda: tab1.get_by_role("button", name="Start Mock Exam"),
        lambda: tab1.locator('[role="timer"]').count() > 0,
    )
    tab1.wait_for_timeout(1000)
    in_writing = through_to_writing(tab1)
    if in_writing:
        tab1.locator("textarea").first.fill(M1_DRAFT)
    tab1.wait_for_timeout(1500)
    m1 = active_mock_for(tab1, ns_a) or {}
    write_row(
        "Tab 1: A's mock M1 is in Writing, with A's draft written down",
        in_writing and m1.get("stage") == "writing" and m1.get("essay1") == M1_DRAFT and bool(m1.get("sittingId")),
        f'stage = {m1.get("stage")}, sittingId = {m1.get("sittingId")}, essay1 = "{m1.get("essay1")}"',
    )
    shot(tab1, "28-m1-in-writing", MOCK_PATH)
    mark_page(tab1)

    # ── Tab 2: A starts a fresh mock M2 and answers part of its Listening ──
    tab2 = ctx.new_page()
    errors2, failed2 = attach_diagnostics(tab2)
    tab2.on("dialog", lambda dialog: dialog.accept())
    goto(tab2, MOCK_PATH)
    wait_for_mock_ready(tab2)
    try:
        tab2.wait_for_selector(f"text={RESUME_HEADING}", timeout=8000)
    except Exception:
        pass
    write_row(
        "Tab 2's start screen offers M1 back and says that starting a new mock replaces it",
        text_count(tab2, RESUME_HEADING) > 0 and text_count(tab2, "replaces this unfinished one") > 0,
        f'offer: {text_count(tab2, RESUME_HEADING)}, "replaces this unfinished one": '
        f'{text_count(tab2, "replaces this unfinished one")}',
    )
    m2_started = journey.click_until(
        tab2,
        lambda: tab2.get_by_role("button", name="Start Mock Exam"),
        lambda: tab2.locator('[role="timer"]').count() > 0,
    )
    tab2.wait_for_timeout(1000)
    gaps = tab2.locator('input[type="text"]:visible')
    for index, answer in enumerate(M2_ANSWERS):
        try:
            gaps.nth(index).fill(answer)
        except Exception:
            pass
    tab2.wait_for_timeout(1500)
    m2 = active_mock_for(tab2, ns_a) or {}
    m2_leg = (m2.get("legSittings") or {}).get(m2.get("listeningTestId") or "") or {}
    m2_raw = raw_item(tab2, key_a)
    write_row(
        "Tab 2: M2 is a NEW sitting, with its own Listening answers kept inside it",
        m2_started
        and bool(m2.get("sittingId"))
        and m2.get("sittingId") != m1.get("sittingId")
        and sorted((m2_leg.get("answers") or {}).values()) == sorted(M2_ANSWERS),
        f'M1 {m1.get("sittingId")} -> M2 {m2.get("sittingId")}, M2 Listening answers = '
        f'{json.dumps(m2_leg.get("answers"))}',
    )
    shot(tab2, "29-m2-started-in-second-tab", MOCK_PATH)

    # ── Tab 1: told by tab 2's write ──
    tab1.bring_to_front()
    tab1.wait_for_timeout(1500)
    reloaded_since(tab1, "tab 1 (M1), after tab 2 started M2")
    write_row(
        "Tab 1 stops on its own calm screen, told by the other tab's write: the new sentence, no essay "
        "boxes, no Finish Writing",
        text_count(tab1, REPLACED_SENTENCE) > 0
        and text_count(tab1, "Mock exam stopped") > 0
        and tab1.locator("textarea").count() == 0
        and tab1.get_by_role("button", name="Finish Writing").count() == 0,
        f'sentence: {text_count(tab1, REPLACED_SENTENCE)}, textareas: {tab1.locator("textarea").count()}, '
        f'Finish Writing: {tab1.get_by_role("button", name="Finish Writing").count()}',
    )
    shot(tab1, "30-m1-stopped-replaced-by-m2", MOCK_PATH)
    # A student typing away at tab 1 regardless.
    try:
        tab1.keyboard.type("SYNTHETIC keystrokes on the stopped tab")
    except Exception:
        pass
    tab1.wait_for_timeout(2500)
    write_row(
        "Nothing tab 1 does writes: the record is still M2, byte for byte, its Listening answers intact",
        raw_item(tab1, key_a) == m2_raw and bool(m2_raw),
        f"{key_a} compared byte for byte with M2 as tab 2 left it",
    )
    write_row(
        "No mock was recorded for A from the stopped M1",
        not mock_history_for(tab1, ns_a),
        f"A's mock history = {json.dumps(mock_history_for(tab1, ns_a))}",
    )
    tab2.bring_to_front()
    tab2.wait_for_timeout(1000)
    write_row(
        "Tab 2 carries on untouched: M2's paper is on screen with its answers, and it is not stopped",
        tab2.locator('[role="timer"]').count() > 0 and text_count(tab2, REPLACED_SENTENCE) == 0,
        f'timers: {tab2.locator("[role=timer]").count()}, stopped sentence: {text_count(tab2, REPLACED_SENTENCE)}',
    )
    report_diagnostics("Step 13 (tab 1)", errors1, failed1)
    tab1.close()

    # ── A missed event, while typing ──
    write_note(
        "**The two variants below stand in for a tab that MISSED the other tab's storage event.** "
        "The newer sitting is written from the page itself, which raises no storage event in that page. "
        "The record is otherwise exactly what a fresh mock would write."
    )
    # A dev-server reload part way through (another server on this checkout
    # rewriting .astro/ does it, observed in the sixth round's first run)
    # drops the page back to the mock's start screen; say so if it happens.
    mark_page(tab2)
    in_writing2 = through_to_writing(tab2)
    tab2.wait_for_timeout(1200)
    reloaded_since(tab2, "tab 2 (M2), while it was taken on into Writing")
    m2_now = active_mock_for(tab2, ns_a) or {}
    write_row(
        "Tab 2 takes M2 on into Writing (the setting for the next check)",
        in_writing2 and m2_now.get("stage") == "writing" and m2_now.get("sittingId") == m2.get("sittingId"),
        f'stage = {m2_now.get("stage")}, sittingId = {m2_now.get("sittingId")}',
    )
    newer = put_newer_sitting_in_place(tab2, key_a, "SYNTHETIC-newer-sitting-missed-event", {"q1": "SYNTHETIC newer answer"})
    mark_page(tab2)
    tab2.wait_for_timeout(800)
    before_typing = text_count(tab2, REPLACED_SENTENCE)
    if tab2.locator("textarea").count():
        tab2.locator("textarea").first.fill("SYNTHETIC Task 1 typed in M2 after it was replaced")
    tab2.wait_for_timeout(1500)
    reloaded_since(tab2, "tab 2 (M2), after the missed-event replacement")
    write_row(
        "With the event missed, tab 2 was still open before typing; the first keystroke's save is refused, "
        "the replacement is found from that refusal, and the stopped screen shows",
        before_typing == 0 and text_count(tab2, REPLACED_SENTENCE) > 0,
        f"stopped sentence before typing: {before_typing}, after: {text_count(tab2, REPLACED_SENTENCE)}",
    )
    write_row(
        "The keystroke wrote nothing: the newer record is there byte for byte, its paper and answer intact",
        raw_item(tab2, key_a) == newer,
        f"{key_a} compared byte for byte with the newer sitting written before the keystroke",
    )
    shot(tab2, "31-m2-stopped-on-refused-save", MOCK_PATH)
    report_diagnostics("Step 13 (tab 2)", errors2, failed2)
    tab2.close()

    # ── A missed event, while finishing ──
    tab3 = ctx.new_page()
    errors3, failed3 = attach_diagnostics(tab3)
    tab3.on("dialog", lambda dialog: dialog.accept())
    goto(tab3, MOCK_PATH)
    wait_for_mock_ready(tab3)
    try:
        tab3.wait_for_selector(f"text={RESUME_HEADING}", timeout=8000)
    except Exception:
        pass
    resumed = journey.click_until(
        tab3,
        lambda: tab3.get_by_role("button", name="Continue where you left off"),
        lambda: tab3.locator("textarea").count() > 0,
    )
    to_brief = journey.click_until(
        tab3,
        lambda: tab3.get_by_role("button", name="Finish Writing"),
        lambda: on_speaking_brief(tab3),
    )
    tab3.wait_for_timeout(1000)
    held = active_mock_for(tab3, ns_a) or {}
    write_row(
        "A third tab picks up the stored sitting and saves normally into it, on to the Speaking brief",
        resumed and to_brief and held.get("stage") == "speaking-brief"
        and held.get("sittingId") == "SYNTHETIC-newer-sitting-missed-event",
        f'stage = {held.get("stage")}, sittingId = {held.get("sittingId")}',
    )
    newest = put_newer_sitting_in_place(tab3, key_a, "SYNTHETIC-newest-sitting-missed-event", {"q1": "SYNTHETIC newest answer"})
    mark_page(tab3)
    skipped = journey.click_until(
        tab3,
        lambda: tab3.get_by_role("button", name="Skip speaking"),
        lambda: text_count(tab3, REPLACED_SENTENCE) > 0 or on_results(tab3),
    )
    tab3.wait_for_timeout(1500)
    reloaded_since(tab3, "tab 3, after finishing a replaced sitting")
    write_row(
        "Finishing the replaced sitting (Skip speaking, straight to the results) stops on the stopped "
        "screen instead of the results",
        skipped and text_count(tab3, REPLACED_SENTENCE) > 0 and not on_results(tab3),
        f"stopped sentence: {text_count(tab3, REPLACED_SENTENCE)}, results: {on_results(tab3)}",
    )
    write_row(
        "Finishing it removed nothing: the newer record is still there byte for byte",
        raw_item(tab3, key_a) == newest,
        f"{key_a} compared byte for byte with the newer sitting written before the finish",
    )
    write_row(
        "And recorded nothing: A's mock history is still empty",
        not mock_history_for(tab3, ns_a),
        f"A's mock history = {json.dumps(mock_history_for(tab3, ns_a))}",
    )
    shot(tab3, "32-finish-of-replaced-sitting-refused", MOCK_PATH)
    report_diagnostics("Step 13 (tab 3)", errors3, failed3)
    ctx.close()


def set_saved_deadline(page, namespace, ends_at):
    """Move the saved deadline of `namespace`'s drill sitting to `ends_at`,
    leaving every other field exactly as it is."""
    return journey.settle(
        page,
        lambda pg: pg.evaluate(
            """([key, endsAt]) => {
                const held = JSON.parse(localStorage.getItem(key));
                if (!held) return null;
                held.endsAt = endsAt;
                localStorage.setItem(key, JSON.stringify(held));
                return held;
            }""",
            [f"{SESSION_KEY}::{namespace}", ends_at],
        ),
    )


def reload_into_paper(page):
    try:
        page.reload(wait_until="load")
    except Exception:
        goto(page, DRILL_PATH)
    try:
        page.wait_for_selector('[role="timer"]', timeout=20000)
    except Exception:
        pass
    page.wait_for_timeout(1500)


def score_showing(page):
    return page.get_by_role("button", name="Review Answers").count() > 0


LEARNER_RECORD_KEY = "ielts.learning.record.v1"


def drill_events(page, namespace):
    """The drill's events in `namespace`'s own learner record, read by its
    exact key (read_record prefers the anonymous owner's record, which is
    not the one a signed-in student's paper is recorded in)."""
    return events_for(json_item(page, f"{LEARNER_RECORD_KEY}::{namespace}"), DRILL_ACTIVITY)


def run_deadline_step(browser, a_id):
    """Step 14 (R2C-03), on a fresh browser for A."""
    ns_a = f"u:{a_id}"
    write_section(
        "Step 14 - The open page's clock follows the saved deadline across a sign-out, and a paper that "
        "ran out while A was away is handed in at once (Codex R2C-03)",
        "The player used to freeze a count-down while A was away and carry on from the frozen number when "
        "A was back on the same open page: ten minutes away cost nothing there, while a reload of the same "
        "sitting found it expired. Every reading now comes from the saved deadline. To keep the run short "
        "the saved deadline is moved close and the page reloaded, so the page holds that short deadline "
        "BEFORE the sign-out; from there it is never reloaded.",
    )
    ctx = new_context(browser)
    page = ctx.new_page()
    errors, failed = attach_diagnostics(page)
    page.on("dialog", lambda dialog: dialog.accept())
    goto(page, "/dashboard")
    page.wait_for_timeout(1200)
    back = journey.ws_sign_in(page, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on a fresh browser", back == a_id, f"signed in as {back}")
    other = ctx.new_page()
    goto(other, "/dashboard")
    other.wait_for_timeout(1200)

    # ── 14a: back before the deadline ──
    page.bring_to_front()
    open_drill_from_hub(page)
    journey.start_drill_if_needed(page)
    page.wait_for_timeout(700)
    try:
        page.locator("select").first.select_option(index=A_CHOICE_INDEX)
    except Exception:
        pass
    page.wait_for_timeout(900)
    deadline = int(time.time() * 1000) + 150_000
    set_saved_deadline(page, ns_a, deadline)
    reload_into_paper(page)
    mark_page(page)
    _, shown = clock_seconds(page)
    expected = round((deadline - time.time() * 1000) / 1000)
    write_row(
        "The drill runs with a saved deadline about 150 seconds ahead, and the open page shows it",
        shown is not None and abs(shown - expected) <= 3,
        f"clock shows {shown} s, the saved deadline leaves {expected} s",
    )
    _, at_signout = clock_seconds(page)
    journey.ws_sign_out(other)
    page.bring_to_front()
    page.wait_for_timeout(1500)
    write_row(
        "A signs out in the second tab and the open drill stops",
        text_count(page, "You signed out during this test") > 0,
        f'"You signed out during this test": {text_count(page, "You signed out during this test")}',
    )
    away_until = time.time() + 25
    while time.time() < away_until:
        page.wait_for_timeout(1000)
    again = journey.ws_sign_in(other, EMAIL_A, PASSWORD_A)
    page.bring_to_front()
    page.wait_for_timeout(1200)
    reloaded_since(page, "A's drill, after signing back in (deadline ahead)")
    text, left = clock_seconds(page)
    expected = round((deadline - time.time() * 1000) / 1000)
    write_row(
        "Back on the same open page, the clock shows what the deadline leaves, not the number frozen at "
        "the sign-out",
        again == a_id
        and left is not None
        and at_signout is not None
        and abs(left - expected) <= 3
        and left <= at_signout - 15,
        f'at the sign-out the clock read {at_signout} s; back after about 25 s away it reads "{text}" '
        f"({left} s); the saved deadline leaves {expected} s",
    )
    shot(page, "33-back-before-deadline-clock-from-deadline", DRILL_PATH)

    # ── 14b: back after the deadline ──
    try:
        page.locator("select").nth(1).select_option(index=2)
    except Exception:
        pass
    page.wait_for_timeout(900)
    deadline = int(time.time() * 1000) + 20_000
    set_saved_deadline(page, ns_a, deadline)
    reload_into_paper(page)
    mark_page(page)
    kept = (session_for(page, ns_a) or {}).get("answers") or {}
    journey.ws_sign_out(other)
    page.bring_to_front()
    page.wait_for_timeout(1200)
    stopped = text_count(page, "You signed out during this test") > 0
    while time.time() * 1000 < deadline + 8_000:
        page.wait_for_timeout(1000)
    anon_ns = anon_namespace(page)
    a_events_away = drill_events(page, ns_a)
    anon_events_away = drill_events(page, anon_ns) if anon_ns else []
    write_row(
        "A is away past the deadline; the stopped paper was not handed in for anybody meanwhile",
        stopped and not a_events_away and not anon_events_away and bool(session_for(page, ns_a)),
        f"stopped = {stopped}, drill events in A's record = {len(a_events_away)}, in the signed-out "
        f"device's = {len(anon_events_away)}, A's sitting still saved = {bool(session_for(page, ns_a))}",
    )
    again = journey.ws_sign_in(other, EMAIL_A, PASSWORD_A)
    page.bring_to_front()
    page.wait_for_timeout(2500)
    reloaded_since(page, "A's drill, after signing back in (deadline passed)")
    text, left = clock_seconds(page)
    events = drill_events(page, ns_a)
    latest = events[-1] if events else {}
    answered = {
        (item.get("itemId") or "").split(":")[-1]: item.get("firstAnswer")
        for item in latest.get("items") or []
        if item.get("firstAnswer")
    }
    write_row(
        "Back on the open page, the paper is handed in at once, as an expired sitting is on a fresh load: "
        "the score is showing and the clock reads 00:00",
        again == a_id and score_showing(page) and left == 0,
        f'score showing = {score_showing(page)}, clock "{text}"',
    )
    used = (latest.get("outcome") or {}).get("secondsUsed")
    write_row(
        "No time was given back: the time used is the whole paper, and A's answers (both, including the "
        "one given after the first reload) were handed in",
        used == DRILL_SECONDS
        and len(answered) >= 2
        and set(kept.values()) <= set(answered.values()),
        f"secondsUsed = {used} (paper {DRILL_SECONDS} s), saved answers {json.dumps(kept)}, "
        f"handed in {json.dumps(answered)}",
    )
    write_row(
        "The finished sitting is no longer saved as unfinished",
        session_for(page, ns_a) is None,
        f"A's standalone slot = {json.dumps(session_for(page, ns_a))}",
    )
    shot(page, "34-back-after-deadline-handed-in", DRILL_PATH)

    # ── 14c: a plain time-up hands in the answer given after the page opened ──
    events_before = len(drill_events(page, ns_a))
    open_drill_from_hub(page)
    journey.start_drill_if_needed(page)
    page.wait_for_timeout(700)
    deadline = int(time.time() * 1000) + 18_000
    set_saved_deadline(page, ns_a, deadline)
    reload_into_paper(page)
    mark_page(page)
    try:
        page.locator("select").first.select_option(index=A_CHOICE_INDEX)
    except Exception:
        pass
    chosen = ((session_for(page, ns_a) or {}).get("answers") or {})
    while time.time() * 1000 < deadline + 6_000:
        page.wait_for_timeout(1000)
    reloaded_since(page, "A's drill, plain time-up")
    events = drill_events(page, ns_a)
    latest = events[-1] if len(events) > events_before else {}
    answered = [item.get("firstAnswer") for item in latest.get("items") or [] if item.get("firstAnswer")]
    write_row(
        "When time runs out on the open page, the paper is handed in WITH the answer given after the page "
        "opened (the timer used to hand in the answers of the moment it started)",
        score_showing(page)
        and bool(chosen)
        and latest.get("completion") == "completed"
        and set(chosen.values()) <= set(answered),
        f'score showing = {score_showing(page)}, answer given after the reload {json.dumps(chosen)}, '
        f'handed in {json.dumps(answered)}, completion = {latest.get("completion")}',
    )
    shot(page, "35-plain-time-up-keeps-late-answer", DRILL_PATH)
    report_diagnostics("Step 14", errors, failed)
    ctx.close()


# ── Fifth Codex round (R2D-02, R2D-03) ──────────────────────────────────────

PAPER_P_ID = "reading-full-006-drill-p2"
PAPER_Q_ID = "reading-full-007-drill-p1"
PAPER_Q_PATH = f"/trainers/reading/{PAPER_Q_ID}"
PAPER_Q_ACTIVITY = f"drill:{PAPER_Q_ID}"
TEST_REPLACED_SENTENCE = "A newer test was started in another tab, so this one is no longer being saved."
TEST_GONE_SENTENCE = "This test was submitted or closed in another tab, so this one is no longer being saved."
MOCK_GONE_SENTENCE = "This mock exam was finished or closed in another tab, so this one is no longer being saved."
M_DRAFT = "SYNTHETIC Task 1 draft in the first tab, typed before the other tab finished the mock."
MOCK_ACTIVITY = "test:mock"


def answer_first_question(page, option_index=1, text="synthetic answer"):
    """Answer the first question of the paper on screen, whatever its control
    is (a drop-down, a gap, or a choice). Returns which kind it was, or None
    when there is no answer control on screen at all."""
    for _ in range(6):
        try:
            sel = page.locator("select:visible")
            if sel.count():
                sel.first.select_option(index=option_index)
                return "select"
            box = page.locator('input[type="text"]:visible')
            if box.count():
                box.first.fill(text)
                return "text"
            radio = page.locator('input[type="radio"]:visible')
            if radio.count():
                radio.nth(min(option_index, radio.count() - 1)).check()
                return "radio"
        except Exception:
            pass
        page.wait_for_timeout(700)
    return None


def answer_controls(page):
    return page.locator('select:visible, input[type="text"]:visible, input[type="radio"]:visible').count()


def submitted_events(page, namespace, activity, since):
    """`activity`'s HANDED-IN events (completed or blank) in `namespace`'s own
    learner record, read by its exact key, made at or after `since` (an ISO
    moment taken from the page's own clock when the step began). Events made
    by earlier steps, which the site pulls back down from the stand-in after
    a sign-in, are left out, so a count cannot move for that reason. An
    unfinished one written by the next test page that loads ('abandoned' or
    'expired') is not counted."""
    return [
        e for e in events_for(json_item(page, f"{LEARNER_RECORD_KEY}::{namespace}"), activity)
        if e.get("completion") in ("completed", "blank") and (e.get("at") or "") >= since
    ]


def page_now(page):
    return page.evaluate("() => new Date().toISOString()")


def put_other_sitting_in_slot(page, key, test_id, answers):
    """Write, FROM THIS PAGE ITSELF, a newer standalone sitting of `test_id`
    (its own sitting id, a fresh twenty-minute deadline, `answers`) over the
    stored one, exactly what "Start test" in another tab writes. A page's own
    write raises no storage event in that page, so this is precisely "another
    tab started a paper and this tab missed the event". Returns the value
    written, byte for byte."""
    return page.evaluate(
        """([key, testId, answers]) => {
            const held = JSON.parse(localStorage.getItem(key) || 'null');
            const now = Date.now();
            const newer = { version: 1, testId, sittingId: 'SYNTHETIC-sitting-' + now, startedAt: now,
                endsAt: now + 20 * 60000, answers, owner: held ? held.owner : undefined };
            const text = JSON.stringify(newer);
            localStorage.setItem(key, text);
            return text;
        }""",
        [key, test_id, answers],
    )


def open_paper(page, path):
    goto(page, path)
    try:
        page.wait_for_selector('[role="timer"], button:has-text("Start test")', timeout=20000)
    except Exception:
        pass
    page.wait_for_timeout(1200)


def run_standalone_tabs_step(browser, a_id):
    """Step 15 (R2D-02), on a fresh browser for A."""
    ns_a = f"u:{a_id}"
    key = f"{SESSION_KEY}::{ns_a}"
    write_section(
        "Step 15 - Two different papers in two tabs: the older one stops, never writes over the newer one, "
        "and hands in nothing (Codex R2D-02)",
        "The one standalone slot per student used to check only WHOSE sitting a save or a clear was for, "
        "never WHICH: a keystroke in paper P, left open in one tab, wrote P's answers over paper Q started in "
        "another, handing P in cleared Q, and P's result was recorded before that clear. Every sitting now has "
        "its own identity; ordinary saves and the hand-in must name the stored sitting itself, a replaced tab "
        "stops for good, and a hand-in is checked BEFORE anything is recorded.",
    )
    ctx = new_context(browser)
    tab1 = ctx.new_page()
    errors1, failed1 = attach_diagnostics(tab1)
    tab1.on("dialog", lambda dialog: dialog.accept())
    goto(tab1, "/dashboard")
    tab1.wait_for_timeout(1200)
    back = journey.ws_sign_in(tab1, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on a fresh browser", back == a_id, f"signed in as {back}")

    # ── Tab 1: paper P, question 14 answered ──
    open_drill_from_hub(tab1)
    journey.start_drill_if_needed(tab1)
    tab1.wait_for_timeout(700)
    try:
        tab1.locator("select").first.select_option(index=A_CHOICE_INDEX)
    except Exception:
        pass
    tab1.wait_for_timeout(1000)
    p = session_for(tab1, ns_a) or {}
    write_row(
        "Tab 1: A answers question 14 of paper P, saved in the slot with P's own sitting id",
        p.get("testId") == PAPER_P_ID and bool(p.get("sittingId")) and bool((p.get("answers") or {}).get("q14")),
        f'testId = {p.get("testId")}, sittingId = {p.get("sittingId")}, answers = {json.dumps(p.get("answers"))}',
    )
    shot(tab1, "36-p-answered-in-tab-1", DRILL_PATH)
    mark_page(tab1)
    since = page_now(tab1)

    # ── Tab 2: paper Q, started and answered ──
    tab2 = ctx.new_page()
    errors2, failed2 = attach_diagnostics(tab2)
    tab2.on("dialog", lambda dialog: dialog.accept())
    open_paper(tab2, PAPER_Q_PATH)
    q_started = journey.start_drill_if_needed(tab2)
    tab2.wait_for_timeout(700)
    how = answer_first_question(tab2)
    tab2.wait_for_timeout(1500)
    q = session_for(tab2, ns_a) or {}
    q_raw = raw_item(tab2, key)
    write_row(
        "Tab 2: A starts paper Q and answers it; the slot holds Q now, a different sitting, with Q's answer",
        q_started
        and q.get("testId") == PAPER_Q_ID
        and bool(q.get("sittingId"))
        and q.get("sittingId") != p.get("sittingId")
        and bool(q.get("answers")),
        f'answered with a {how}; slot testId = {q.get("testId")}, sittingId {p.get("sittingId")} -> '
        f'{q.get("sittingId")}, answers = {json.dumps(q.get("answers"))}',
    )
    shot(tab2, "37-q-started-in-tab-2", PAPER_Q_PATH)

    # ── Tab 1: told by tab 2's write ──
    tab1.bring_to_front()
    tab1.wait_for_timeout(1500)
    reloaded_since(tab1, "tab 1 (paper P), after tab 2 started paper Q")
    write_row(
        "Tab 1 stops on the calm stopped screen, told by tab 2's write: the new sentence, no answer controls, "
        "no Submit",
        text_count(tab1, TEST_REPLACED_SENTENCE) > 0
        and answer_controls(tab1) == 0
        and tab1.get_by_role("button", name="Submit").count() == 0,
        f'sentence: {text_count(tab1, TEST_REPLACED_SENTENCE)}, answer controls: {answer_controls(tab1)}, '
        f'Submit: {tab1.get_by_role("button", name="Submit").count()}',
    )
    shot(tab1, "38-p-stopped-in-tab-1", DRILL_PATH)
    try:
        tab1.keyboard.type("SYNTHETIC keystrokes on the stopped paper")
    except Exception:
        pass
    tab1.wait_for_timeout(1500)
    write_row(
        "Typing again in tab 1 writes nothing: the slot is still Q, byte for byte, with Q's answer",
        bool(q_raw) and raw_item(tab1, key) == q_raw,
        f"{key} compared byte for byte with the slot as tab 2 left it",
    )
    p_abandoned = [
        e for e in events_for(json_item(tab1, f"{LEARNER_RECORD_KEY}::{ns_a}"), DRILL_ACTIVITY)
        if e.get("completion") in ("abandoned", "expired")
    ]
    write_row(
        "Tab 1 handed nothing in: no submitted attempt of P in A's learner record since this step began",
        len(submitted_events(tab1, ns_a, DRILL_ACTIVITY, since)) == 0,
        f"handed-in events of P since {since}: {len(submitted_events(tab1, ns_a, DRILL_ACTIVITY, since))}; "
        f"P's unfinished rows (written by tab 2's page load, the existing rule for a paper left behind): "
        f"{len(p_abandoned)}",
    )

    # ── Tab 2 reloads and resumes Q ──
    tab2.bring_to_front()
    try:
        tab2.reload(wait_until="load")
    except Exception:
        open_paper(tab2, PAPER_Q_PATH)
    try:
        tab2.wait_for_selector('[role="timer"]', timeout=20000)
    except Exception:
        pass
    tab2.wait_for_timeout(1500)
    q_after = session_for(tab2, ns_a) or {}
    write_row(
        "Reloading tab 2 resumes Q as before: the same sitting, its answers, the paper running and not stopped",
        tab2.locator('[role="timer"]').count() > 0
        and text_count(tab2, TEST_REPLACED_SENTENCE) == 0
        and q_after.get("sittingId") == q.get("sittingId")
        and q_after.get("answers") == q.get("answers")
        and q_after.get("endsAt") == q.get("endsAt"),
        f'timers: {tab2.locator("[role=timer]").count()}, sittingId = {q_after.get("sittingId")}, '
        f'answers = {json.dumps(q_after.get("answers"))}, same deadline: {q_after.get("endsAt") == q.get("endsAt")}',
    )
    shot(tab2, "39-q-resumed-after-reload", PAPER_Q_PATH)
    report_diagnostics("Step 15 (tab 1)", errors1, failed1)
    tab1.close()

    # ── A missed event, while answering ──
    write_note(
        "**The next two checks stand in for a tab that MISSED the other tab's storage event.** The newer "
        "sitting is written from the page itself, which raises no storage event in that page; the value is "
        "exactly what \"Start test\" in another tab writes."
    )
    newer = put_other_sitting_in_slot(tab2, key, PAPER_P_ID, {"q14": "SYNTHETIC-newer-sitting-answer"})
    mark_page(tab2)
    tab2.wait_for_timeout(800)
    before = text_count(tab2, TEST_REPLACED_SENTENCE)
    how2 = answer_first_question(tab2, option_index=2, text="synthetic answer typed after the replacement")
    tab2.wait_for_timeout(1500)
    reloaded_since(tab2, "tab 2 (paper Q), after the missed-event replacement")
    write_row(
        "With the event missed, tab 2 was still running; its next answer's save is refused, the replacement "
        "is found from that refusal, and the stopped screen shows",
        before == 0 and bool(how2) and text_count(tab2, TEST_REPLACED_SENTENCE) > 0,
        f"answered with a {how2}; stopped sentence before: {before}, after: {text_count(tab2, TEST_REPLACED_SENTENCE)}",
    )
    write_row(
        "That answer wrote nothing: the newer sitting is there byte for byte",
        raw_item(tab2, key) == newer,
        f"{key} compared byte for byte with the newer sitting written before the answer",
    )
    shot(tab2, "40-q-stopped-on-refused-save", PAPER_Q_PATH)
    report_diagnostics("Step 15 (tab 2)", errors2, failed2)
    tab2.close()

    # ── A missed event, while handing in ──
    tab3 = ctx.new_page()
    errors3, failed3 = attach_diagnostics(tab3)
    tab3.on("dialog", lambda dialog: dialog.accept())
    open_paper(tab3, DRILL_PATH)
    held = session_for(tab3, ns_a) or {}
    write_row(
        "A third tab on paper P picks up the stored (newer) sitting of P and runs it",
        tab3.locator('[role="timer"]').count() > 0 and held.get("sittingId") == json.loads(newer).get("sittingId"),
        f'timers: {tab3.locator("[role=timer]").count()}, sittingId = {held.get("sittingId")}',
    )
    newest = put_other_sitting_in_slot(tab3, key, PAPER_Q_ID, {})
    mark_page(tab3)
    journey.submit_and_confirm(tab3)
    tab3.wait_for_timeout(1500)
    reloaded_since(tab3, "tab 3 (paper P), after its Submit")
    write_row(
        "Its Submit is refused before anything is recorded: the stopped screen, not the score",
        text_count(tab3, TEST_REPLACED_SENTENCE) > 0 and not score_showing(tab3),
        f"stopped sentence: {text_count(tab3, TEST_REPLACED_SENTENCE)}, score showing: {score_showing(tab3)}",
    )
    write_row(
        "Nothing was recorded for P and nothing was cleared: the slot is the newer sitting, byte for byte",
        len(submitted_events(tab3, ns_a, DRILL_ACTIVITY, since)) == 0 and raw_item(tab3, key) == newest,
        f"handed-in events of P since the step began: {len(submitted_events(tab3, ns_a, DRILL_ACTIVITY, since))}; "
        f"{key} compared byte for byte",
    )
    shot(tab3, "41-submit-refused-when-replaced", DRILL_PATH)
    report_diagnostics("Step 15 (tab 3)", errors3, failed3)
    tab3.close()

    # ── The same sitting in two tabs: one hands it in, the other finds it gone ──
    tab4 = ctx.new_page()
    errors4, failed4 = attach_diagnostics(tab4)
    tab4.on("dialog", lambda dialog: dialog.accept())
    open_paper(tab4, PAPER_Q_PATH)
    mark_page(tab4)
    tab5 = ctx.new_page()
    tab5.on("dialog", lambda dialog: dialog.accept())
    open_paper(tab5, PAPER_Q_PATH)
    shared = json.loads(newest).get("sittingId")
    both_running = tab4.locator('[role="timer"]').count() > 0 and tab5.locator('[role="timer"]').count() > 0
    journey.submit_and_confirm(tab5)
    tab5.wait_for_timeout(2000)
    handed_in = score_showing(tab5)
    tab4.bring_to_front()
    tab4.wait_for_timeout(1500)
    reloaded_since(tab4, "tab 4 (paper Q), after tab 5 handed the same sitting in")
    write_row(
        "The same sitting open in two tabs: one hands it in, and the other stops with the sentence for a sitting "
        "handed in elsewhere, with no Submit left to press",
        both_running
        and handed_in
        and text_count(tab4, TEST_GONE_SENTENCE) > 0
        and tab4.get_by_role("button", name="Submit").count() == 0,
        f"shared sitting {shared}; both running: {both_running}; tab 5 score showing: {handed_in}; tab 4 "
        f'sentence: {text_count(tab4, TEST_GONE_SENTENCE)}, Submit: {tab4.get_by_role("button", name="Submit").count()}',
    )
    write_row(
        "Q was handed in once, and the slot is empty",
        len(submitted_events(tab4, ns_a, PAPER_Q_ACTIVITY, since)) == 1 and session_for(tab4, ns_a) is None,
        f"handed-in events of Q since the step began: {len(submitted_events(tab4, ns_a, PAPER_Q_ACTIVITY, since))}; "
        f"slot = {json.dumps(session_for(tab4, ns_a))}",
    )
    shot(tab4, "42-same-sitting-handed-in-elsewhere", PAPER_Q_PATH)
    report_diagnostics("Step 15 (tab 4)", errors4, failed4)
    ctx.close()


def remove_item_from_page(page, key):
    """Remove `key` FROM THIS PAGE ITSELF: no storage event in this page, which
    is precisely "another tab finished this sitting and this tab missed the
    event"."""
    page.evaluate("(k) => localStorage.removeItem(k)", key)


def mock_events(page, namespace):
    return events_for(json_item(page, f"{LEARNER_RECORD_KEY}::{namespace}"), MOCK_ACTIVITY)


def start_fresh_mock_to_writing(page):
    goto(page, MOCK_PATH)
    wait_for_mock_ready(page)
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Start Mock Exam"),
        lambda: page.locator('[role="timer"]').count() > 0,
    )
    page.wait_for_timeout(1000)
    return through_to_writing(page)


def run_mock_gone_step(browser, a_id):
    """Step 16 (R2D-03), on a fresh browser for A."""
    ns_a = f"u:{a_id}"
    key_a = f"{ACTIVE_MOCK_KEY}::{ns_a}"
    write_section(
        "Step 16 - A mock finished in another tab stops the tab still showing it, and is recorded once "
        "(Codex R2D-03)",
        "A mock whose record DISAPPEARED used to be treated as nothing to worry about: two tabs on the same "
        "sitting, one finished it (recording it and clearing the record), and the other went on unsaved and "
        "recorded the same mock again at its own results. Now a record that is gone after a tab saw it stops "
        "that tab for good with its own sentence, the results step records only after it finalised that very "
        "sitting, and the history takes one record per sitting.",
    )
    ctx = new_context(browser)
    tab1 = ctx.new_page()
    errors1, failed1 = attach_diagnostics(tab1)
    tab1.on("dialog", lambda dialog: dialog.accept())
    goto(tab1, "/dashboard")
    tab1.wait_for_timeout(1200)
    back = journey.ws_sign_in(tab1, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on a fresh browser", back == a_id, f"signed in as {back}")
    history_before = len(mock_history_for(tab1, ns_a))

    # ── Tab 1: a mock, in Writing, with a draft ──
    in_writing = start_fresh_mock_to_writing(tab1)
    if in_writing:
        tab1.locator("textarea").first.fill(M_DRAFT)
    tab1.wait_for_timeout(1500)
    m = active_mock_for(tab1, ns_a) or {}
    write_row(
        "Tab 1: A's mock is in Writing, with A's draft written down",
        in_writing and m.get("stage") == "writing" and m.get("essay1") == M_DRAFT and bool(m.get("sittingId")),
        f'stage = {m.get("stage")}, sittingId = {m.get("sittingId")}',
    )
    shot(tab1, "43-mock-in-writing-tab-1", MOCK_PATH)
    mark_page(tab1)

    # ── Tab 2: picks up the SAME sitting and finishes it ──
    tab2 = ctx.new_page()
    errors2, failed2 = attach_diagnostics(tab2)
    tab2.on("dialog", lambda dialog: dialog.accept())
    goto(tab2, MOCK_PATH)
    wait_for_mock_ready(tab2)
    try:
        tab2.wait_for_selector(f"text={RESUME_HEADING}", timeout=8000)
    except Exception:
        pass
    resumed = journey.click_until(
        tab2,
        lambda: tab2.get_by_role("button", name="Continue where you left off"),
        lambda: tab2.locator("textarea").count() > 0,
    )
    tab2.wait_for_timeout(1000)
    same = (active_mock_for(tab2, ns_a) or {}).get("sittingId")
    write_row(
        "Tab 2 picks up the same sitting, in Writing, and tab 1 carries on (a write of the same sitting stops nothing)",
        resumed and same == m.get("sittingId") and text_count(tab1, MOCK_GONE_SENTENCE) == 0
        and text_count(tab1, REPLACED_SENTENCE) == 0,
        f"sittingId = {same}; tab 1 stopped sentences: {text_count(tab1, MOCK_GONE_SENTENCE)}, "
        f"{text_count(tab1, REPLACED_SENTENCE)}",
    )
    to_brief = journey.click_until(
        tab2,
        lambda: tab2.get_by_role("button", name="Finish Writing"),
        lambda: on_speaking_brief(tab2),
    )
    finished = journey.click_until(
        tab2,
        lambda: tab2.get_by_role("button", name="Skip speaking"),
        lambda: on_results(tab2),
    )
    tab2.wait_for_timeout(2000)
    history = mock_history_for(tab2, ns_a)
    rows2 = [r for r in history if r.get("sittingId") == m.get("sittingId")]
    write_row(
        "Tab 2 finishes it: the results are showing, the in-progress record is gone, and A's mock history "
        "holds it once, with its sitting id",
        to_brief and finished and raw_item(tab2, key_a) is None and len(rows2) == 1,
        f"results: {on_results(tab2)}, record present: {raw_item(tab2, key_a) is not None}, history "
        f"{history_before} -> {len(history)} rows, rows of sitting {m.get('sittingId')}: {len(rows2)}",
    )
    shot(tab2, "44-mock-finished-in-tab-2", MOCK_PATH)

    # ── Tab 1: told by tab 2's removal ──
    tab1.bring_to_front()
    tab1.wait_for_timeout(1500)
    reloaded_since(tab1, "tab 1 (mock), after tab 2 finished the same sitting")
    write_row(
        "Tab 1 stops on its stopped screen with the sentence for a sitting finished elsewhere (not the replaced "
        "one): no essay boxes, no Finish Writing",
        text_count(tab1, MOCK_GONE_SENTENCE) > 0
        and text_count(tab1, REPLACED_SENTENCE) == 0
        and tab1.locator("textarea").count() == 0
        and tab1.get_by_role("button", name="Finish Writing").count() == 0,
        f'gone sentence: {text_count(tab1, MOCK_GONE_SENTENCE)}, replaced sentence: '
        f'{text_count(tab1, REPLACED_SENTENCE)}, textareas: {tab1.locator("textarea").count()}',
    )
    shot(tab1, "45-mock-tab-1-stopped-finished-elsewhere", MOCK_PATH)
    try:
        tab1.keyboard.type("SYNTHETIC keystrokes on the stopped mock")
    except Exception:
        pass
    tab1.wait_for_timeout(2500)
    this_sitting = [e for e in mock_events(tab1, ns_a) if e.get("at") == m.get("startedAt")]
    rows = [r for r in mock_history_for(tab1, ns_a) if r.get("sittingId") == m.get("sittingId")]
    write_row(
        "Nothing tab 1 does writes or records: no in-progress record comes back, the mock history holds the "
        "sitting once, and the learning history holds its mock event once",
        raw_item(tab1, key_a) is None and len(rows) == 1 and len(this_sitting) == 1,
        f"record present: {raw_item(tab1, key_a) is not None}, history rows of this sitting: {len(rows)}, "
        f"'{MOCK_ACTIVITY}' events of this sitting (at {m.get('startedAt')}): {len(this_sitting)}",
    )
    report_diagnostics("Step 16 (tab 1)", errors1, failed1)
    report_diagnostics("Step 16 (tab 2)", errors2, failed2)
    tab1.close()
    tab2.close()

    # ── A missed event, while writing ──
    write_note(
        "**The next two checks stand in for a tab that MISSED the other tab's storage event.** The record is "
        "removed from the page itself, which raises no storage event in that page; that removal is exactly "
        "what another tab finishing the same sitting does."
    )
    tab3 = ctx.new_page()
    errors3, failed3 = attach_diagnostics(tab3)
    tab3.on("dialog", lambda dialog: dialog.accept())
    in_writing3 = start_fresh_mock_to_writing(tab3)
    tab3.wait_for_timeout(1200)
    remove_item_from_page(tab3, key_a)
    mark_page(tab3)
    tab3.wait_for_timeout(800)
    before = text_count(tab3, MOCK_GONE_SENTENCE)
    if tab3.locator("textarea").count():
        tab3.locator("textarea").first.fill("SYNTHETIC Task 1 typed after the sitting was finished elsewhere")
    tab3.wait_for_timeout(1500)
    reloaded_since(tab3, "tab 3 (mock), after the missed-event removal")
    write_row(
        "With the event missed, tab 3 was still in Writing; its next keystroke's save is refused, the loss is "
        "found from that refusal, and the stopped screen shows the finished-elsewhere sentence",
        in_writing3 and before == 0 and text_count(tab3, MOCK_GONE_SENTENCE) > 0,
        f"stopped sentence before typing: {before}, after: {text_count(tab3, MOCK_GONE_SENTENCE)}",
    )
    write_row(
        "The keystroke wrote nothing back: no in-progress record",
        raw_item(tab3, key_a) is None,
        f"record present: {raw_item(tab3, key_a) is not None}",
    )
    shot(tab3, "46-mock-stopped-on-refused-save", MOCK_PATH)
    report_diagnostics("Step 16 (tab 3)", errors3, failed3)
    tab3.close()

    # ── A missed event, while finishing ──
    tab4 = ctx.new_page()
    errors4, failed4 = attach_diagnostics(tab4)
    tab4.on("dialog", lambda dialog: dialog.accept())
    in_writing4 = start_fresh_mock_to_writing(tab4)
    to_brief4 = journey.click_until(
        tab4,
        lambda: tab4.get_by_role("button", name="Finish Writing"),
        lambda: on_speaking_brief(tab4),
    )
    tab4.wait_for_timeout(1000)
    m4 = active_mock_for(tab4, ns_a) or {}
    remove_item_from_page(tab4, key_a)
    mark_page(tab4)
    skipped = journey.click_until(
        tab4,
        lambda: tab4.get_by_role("button", name="Skip speaking"),
        lambda: text_count(tab4, MOCK_GONE_SENTENCE) > 0 or on_results(tab4),
    )
    tab4.wait_for_timeout(2000)
    reloaded_since(tab4, "tab 4 (mock), after finishing a sitting that was gone")
    write_row(
        "Finishing a sitting whose record is gone (Skip speaking, straight to the results) stops on the stopped "
        "screen instead of the results",
        in_writing4 and to_brief4 and skipped and text_count(tab4, MOCK_GONE_SENTENCE) > 0 and not on_results(tab4),
        f"stopped sentence: {text_count(tab4, MOCK_GONE_SENTENCE)}, results: {on_results(tab4)}",
    )
    rows4 = [r for r in mock_history_for(tab4, ns_a) if r.get("sittingId") == m4.get("sittingId")]
    events4 = [e for e in mock_events(tab4, ns_a) if e.get("at") == m4.get("startedAt")]
    write_row(
        "And it recorded nothing: no mock history row and no learning event for that sitting",
        bool(m4.get("sittingId")) and not rows4 and not events4,
        f"sitting {m4.get('sittingId')}: history rows {len(rows4)}, '{MOCK_ACTIVITY}' events {len(events4)}",
    )
    shot(tab4, "47-finish-of-gone-sitting-refused", MOCK_PATH)
    report_diagnostics("Step 16 (tab 4)", errors4, failed4)
    ctx.close()


# ── Sixth Codex round (R2E-02, R2E-03) ──────────────────────────────────────

REVIEW_OTHER_HEADING = "This test belongs to another student"
REVIEW_SIGNED_OUT_HEADING = "You signed out, so this result is hidden"
WHY_BUTTON = "Why was my answer wrong?"
DEBRIEF_BUTTON = "Go through my mistakes with Mr EZ"
SIMULATED_BADGE = "Simulated, not a real AI reply"
SIMULATED_REVIEW_TEXT = "Simulated answer review from the local dev server"
HANDED_IN_SENTENCE = (
    "This paper was already handed in from another tab, so it was not handed in again here. "
    "The mock exam carries on from that tab."
)
PROGRESS_KEY = "ielts.progress.v1"
TAB1_LEG_ANSWERS = ["synthetic library", "synthetic tuesday"]
TAB2_LEG_ANSWERS = ["synthetic museum", "synthetic sunday"]

# A tab that hears NOTHING from the other tabs of this browser: no storage
# event, no auth broadcast, and no "this tab is visible again" signal (the
# auth library re-reads the session when a tab comes back into view).
# Installed before any page script runs, and
# only in the tab it is named for. It stands in for a tab that missed the
# other tab's news (a slow tab, a sleeping one, an event lost in the gap
# between two page loads), which is the window both R2E findings live in:
# the other tab's sign-in, or its hand-in, has changed what storage holds,
# and this tab has not been told. Nothing in the site itself is changed.
DEAF_TAB_SCRIPT = """
(() => {
  try {
    Object.defineProperty(window, 'BroadcastChannel', { value: undefined, configurable: true, writable: true });
  } catch (e) {}
  const add = window.addEventListener;
  window.addEventListener = function (type, listener, options) {
    if (type === 'storage' || type === 'visibilitychange') return undefined;
    return add.call(this, type, listener, options);
  };
})();
"""


def watch_tutor_posts(page):
    """Every request this page sends to Mr EZ (the stand-in's /tutor), with
    its task and the token it carried. The GET that only reads the tutor's
    settings is not a request to Mr EZ and is left out."""
    posts = []

    def on_request(req):
        try:
            if req.method != "POST" or "/tutor" not in req.url:
                return
            try:
                body = json.loads(req.post_data or "{}")
            except ValueError:
                body = {}
            posts.append({
                "task": body.get("task"),
                "auth": req.headers.get("authorization", ""),
                "items": ((body.get("review") or {}).get("items") or []),
            })
        except Exception:
            pass

    page.on("request", on_request)
    return posts


def review_posts(posts):
    return [p for p in posts if p.get("task") in ("item", "debrief")]


def auth_session(page):
    """The session this browser holds right now, read the way the site reads
    it: its token and the user it was issued to."""
    return journey.settle(
        page,
        lambda pg: pg.evaluate(
            """() => {
                for (const k of Object.keys(localStorage)) {
                    if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
                        try {
                            const s = JSON.parse(localStorage.getItem(k));
                            return { token: s.access_token, user: s.user ? s.user.id : null };
                        } catch (e) { return null; }
                    }
                }
                return null;
            }"""
        ),
    )


def review_leftovers(page):
    """What is left on screen of a handed-in paper's review: the score, the
    answers and every Mr EZ control or reply."""
    return {
        "score": text_count(page, "Your Score") + page.get_by_role("button", name="Review Answers").count(),
        "answers": text_count(page, "Correct answer:") + answer_controls(page),
        "tutor": page.get_by_role("button", name=WHY_BUTTON).count()
        + text_count(page, DEBRIEF_BUTTON)
        + text_count(page, SIMULATED_REVIEW_TEXT),
    }


def nothing_left(leftovers):
    return all(value == 0 for value in leftovers.values())


def hand_in_and_review(page):
    """Hand the paper on screen in and open its review. Returns whether the
    score appeared and whether the review is now on screen."""
    journey.submit_and_confirm(page)
    page.wait_for_timeout(1500)
    scored = score_showing(page)
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Review Answers"),
        lambda: not score_showing(page),
    )
    page.wait_for_timeout(1500)
    return scored, text_count(page, "Correct answer:") > 0


def run_review_switch_step(browser, a_id, b_id):
    """Step 17 (R2E-02), on a fresh browser for A, then B."""
    write_section(
        "Step 17 - A handed-in paper's review leaves the screen when the account changes, and Mr EZ is "
        "never asked about it as anybody else (Codex R2E-02)",
        "The test player's owner listener used to leave a SUBMITTED paper alone. A handed a drill in and "
        "left its review open; A signed out and B signed in in another tab; the first tab still showed A's "
        "answers and score to B, and \"Why was my answer wrong?\" sent A's answer to Mr EZ with B's token. "
        "Now the review belongs to the student who sat the paper: an account change takes the answers, the "
        "score and every tutor control off the screen, and every review request to Mr EZ carries that "
        "student and is refused, sending nothing, when anybody else would be sending it. The tutor here is "
        "the stand-in: every reply it gives is labelled simulated, and no model is called.",
    )
    ctx = new_context(browser)
    tab1 = ctx.new_page()
    errors1, failed1 = attach_diagnostics(tab1)
    tab1.on("dialog", lambda dialog: dialog.accept())
    posts1 = watch_tutor_posts(tab1)
    goto(tab1, "/dashboard")
    tab1.wait_for_timeout(1200)
    back = journey.ws_sign_in(tab1, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on a fresh browser", back == a_id, f"signed in as {back}")

    # ── Tab 1: A sits the drill, hands it in, opens the review ──
    open_paper(tab1, DRILL_PATH)
    journey.start_drill_if_needed(tab1)
    tab1.wait_for_timeout(700)
    try:
        tab1.locator("select").first.select_option(index=A_CHOICE_INDEX)
    except Exception:
        pass
    tab1.wait_for_timeout(800)
    a_given = first_select_value(tab1)
    scored, reviewing = hand_in_and_review(tab1)
    why_offered = tab1.get_by_role("button", name=WHY_BUTTON).count()
    write_row(
        "Tab 1: A hands the drill in and reads the review: the score came up, the answers are on screen, and "
        "\"Why was my answer wrong?\" is offered",
        scored and reviewing and why_offered > 0,
        f"score shown: {scored}, review on screen: {reviewing}, \"{WHY_BUTTON}\" buttons: {why_offered}, "
        f"A's answer to q14 = \"{a_given}\"",
    )

    # ── A asks once, as A ──
    a_session = auth_session(tab1) or {}
    journey.click_until(
        tab1,
        lambda: tab1.get_by_role("button", name=WHY_BUTTON),
        lambda: text_count(tab1, SIMULATED_REVIEW_TEXT) > 0,
    )
    tab1.wait_for_timeout(800)
    a_posts = review_posts(posts1)
    write_row(
        "A's own press goes out once, with A's own token, and the reply on screen is labelled simulated",
        len(a_posts) == 1
        and bool(a_session.get("token"))
        and a_posts[0]["auth"] == f"Bearer {a_session.get('token')}"
        and text_count(tab1, SIMULATED_BADGE) > 0,
        f"review requests from tab 1: {len(a_posts)} ({', '.join(p['task'] for p in a_posts)}), sent with A's "
        f"token: {bool(a_posts) and a_posts[0]['auth'] == 'Bearer ' + str(a_session.get('token'))}, simulated "
        f"badge: {text_count(tab1, SIMULATED_BADGE)}",
    )
    shot(tab1, "48-a-review-with-a-simulated-reply", DRILL_PATH)
    mark_page(tab1)
    before_switch = len(review_posts(posts1))

    # ── Tab 2: A signs out ──
    tab2 = ctx.new_page()
    errors2, failed2 = attach_diagnostics(tab2)
    tab2.on("dialog", lambda dialog: dialog.accept())
    goto(tab2, "/dashboard")
    tab2.wait_for_timeout(1500)
    journey.ws_sign_out(tab2)
    tab2.wait_for_timeout(1200)
    tab1.bring_to_front()
    tab1.wait_for_timeout(2000)
    left_out = review_leftovers(tab1)
    write_row(
        "A signs out in a second tab: the first tab's review leaves the screen for the signed-out sentence, "
        "with no score, no answers and no Mr EZ",
        text_count(tab1, REVIEW_SIGNED_OUT_HEADING) > 0 and nothing_left(left_out),
        f"\"{REVIEW_SIGNED_OUT_HEADING}\": {text_count(tab1, REVIEW_SIGNED_OUT_HEADING)}; left on screen: "
        f"{json.dumps(left_out)}",
    )
    shot(tab1, "49-review-hidden-after-sign-out", DRILL_PATH)

    # ── Tab 2: B signs in ──
    b_back = journey.ws_sign_in(tab2, EMAIL_B, PASSWORD_B)
    tab1.bring_to_front()
    tab1.wait_for_timeout(2000)
    reloaded_since(tab1, "tab 1 (A's review), after B signed in in tab 2")
    left_b = review_leftovers(tab1)
    write_row(
        "B signs in there: the first tab says the test belongs to another student and still shows none of "
        "A's review",
        b_back == b_id and text_count(tab1, REVIEW_OTHER_HEADING) > 0 and nothing_left(left_b),
        f"B = {b_back}; \"{REVIEW_OTHER_HEADING}\": {text_count(tab1, REVIEW_OTHER_HEADING)}; left on screen: "
        f"{json.dumps(left_b)}",
    )
    write_row(
        "Nothing was sent to Mr EZ from the first tab after the switch",
        len(review_posts(posts1)) == before_switch,
        f"review requests from tab 1 before the switch: {before_switch}, now: {len(review_posts(posts1))}",
    )
    shot(tab1, "50-review-hidden-b-signed-in", DRILL_PATH)

    # ── B's own page ──
    open_paper(tab2, DRILL_PATH)
    left_b_page = review_leftovers(tab2)
    write_row(
        "B's own page for the same drill shows nothing of A: the instructions, no score, no answers, no Mr EZ "
        "reply",
        tab2.get_by_role("button", name="Start test").count() > 0 and nothing_left(left_b_page),
        f"Start test: {tab2.get_by_role('button', name='Start test').count()}; left on screen: "
        f"{json.dumps(left_b_page)}",
    )
    shot(tab2, "51-b-own-drill-page", DRILL_PATH)

    # ── Tab 1: B starts the same drill fresh, answers it the same way ──
    journey.click_until(
        tab1,
        lambda: tab1.get_by_role("button", name="Start this test fresh"),
        lambda: tab1.get_by_role("button", name="Start test").count() > 0,
    )
    journey.start_drill_if_needed(tab1)
    tab1.wait_for_timeout(700)
    try:
        tab1.locator("select").first.select_option(index=A_CHOICE_INDEX)
    except Exception:
        pass
    tab1.wait_for_timeout(800)
    b_given = first_select_value(tab1)
    b_scored, b_reviewing = hand_in_and_review(tab1)
    b_why = tab1.get_by_role("button", name=WHY_BUTTON).count()
    write_row(
        "In the same open tab, B's own review of the same drill with the same answer shows none of the reply "
        "A bought: every \"Why was my answer wrong?\" is a fresh button (the cache is per student)",
        b_scored and b_reviewing and b_given == a_given and b_why == why_offered
        and text_count(tab1, SIMULATED_REVIEW_TEXT) == 0,
        f"B's answer to q14 = \"{b_given}\" (A's was \"{a_given}\"); buttons: {b_why} (A had {why_offered}); "
        f"simulated replies on screen: {text_count(tab1, SIMULATED_REVIEW_TEXT)}",
    )
    b_session = auth_session(tab1) or {}
    journey.click_until(
        tab1,
        lambda: tab1.get_by_role("button", name=WHY_BUTTON),
        lambda: text_count(tab1, SIMULATED_REVIEW_TEXT) > 0,
    )
    tab1.wait_for_timeout(800)
    b_posts = review_posts(posts1)[before_switch:]
    write_row(
        "B's own press on B's own review goes out once, with B's token",
        len(b_posts) == 1 and bool(b_session.get("token")) and b_posts[0]["auth"] == f"Bearer {b_session.get('token')}"
        and b_session.get("user") == b_id,
        f"review requests since the switch: {len(b_posts)}, B's session user = {b_session.get('user')}, sent with "
        f"B's token: {bool(b_posts) and b_posts[0]['auth'] == 'Bearer ' + str(b_session.get('token'))}",
    )
    shot(tab1, "52-b-own-review-own-reply", DRILL_PATH)
    report_diagnostics("Step 17 (tab 1)", errors1, failed1)
    tab1.close()

    # ── A tab that missed the switch ──
    write_note(
        "**The next checks stand in for a tab that MISSED the other tab's sign-in.** The third tab is opened "
        "with a small script (installed by this test, before the site's own code) that stops it hearing "
        "anything from the other tabs: no storage event and no auth broadcast. So when the account changes in "
        "tab 2, this tab still believes A is signed in while the stored session is already B's, which is the "
        "window in which the old code sent A's answer with B's token."
    )
    goto(tab2, "/dashboard")
    tab2.wait_for_timeout(1200)
    journey.ws_sign_out(tab2)
    back_a = journey.ws_sign_in(tab2, EMAIL_A, PASSWORD_A)
    tab3 = ctx.new_page()
    errors3, failed3 = attach_diagnostics(tab3)
    tab3.on("dialog", lambda dialog: dialog.accept())
    tab3.add_init_script(DEAF_TAB_SCRIPT)
    posts3 = watch_tutor_posts(tab3)
    open_paper(tab3, DRILL_PATH)
    journey.start_drill_if_needed(tab3)
    tab3.wait_for_timeout(700)
    try:
        tab3.locator("select").first.select_option(index=A_CHOICE_INDEX)
    except Exception:
        pass
    tab3.wait_for_timeout(800)
    scored3, reviewing3 = hand_in_and_review(tab3)
    why3 = tab3.get_by_role("button", name=WHY_BUTTON).count()
    write_row(
        "A is back (tab 2), and a third tab that hears nothing from the others hands the drill in as A and "
        "shows A's review with \"Why was my answer wrong?\"",
        back_a == a_id and scored3 and reviewing3 and why3 > 0,
        f"A = {back_a}; score shown: {scored3}, review: {reviewing3}, buttons: {why3}",
    )
    tab2.bring_to_front()
    journey.ws_sign_out(tab2)
    journey.ws_sign_in(tab2, EMAIL_B, PASSWORD_B)
    stored = auth_session(tab2) or {}
    tab3.bring_to_front()
    tab3.wait_for_timeout(2000)
    still = review_leftovers(tab3)
    write_row(
        "B signs in in tab 2; the third tab was not told, so A's review is still on its screen (the window "
        "the finding describes), while the session this browser holds is B's",
        stored.get("user") == b_id and still["answers"] > 0 and still["tutor"] > 0,
        f"stored session user = {stored.get('user')} (B = {b_id}); left on the third tab's screen: "
        f"{json.dumps(still)}",
    )
    shot(tab3, "53-deaf-tab-still-shows-a-review", DRILL_PATH)
    mark_page(tab3)
    before3 = len(review_posts(posts3))
    try:
        tab3.get_by_role("button", name=WHY_BUTTON).first.click(timeout=6000)
    except Exception:
        pass
    tab3.wait_for_timeout(2500)
    reloaded_since(tab3, "the third tab, after its press")
    after3 = review_leftovers(tab3)
    write_row(
        "Its press on A's review sends NOTHING (zero requests to Mr EZ, so nobody's token carried A's answer): "
        "the session it would have used is B's, so the request is refused and the review leaves the screen",
        len(review_posts(posts3)) == before3 and text_count(tab3, REVIEW_OTHER_HEADING) > 0 and nothing_left(after3),
        f"review requests from the third tab: before the press {before3}, after {len(review_posts(posts3))}; "
        f"\"{REVIEW_OTHER_HEADING}\": {text_count(tab3, REVIEW_OTHER_HEADING)}; left on screen: {json.dumps(after3)}",
    )
    shot(tab3, "54-deaf-tab-press-refused", DRILL_PATH)
    report_diagnostics("Step 17 (tab 2)", errors2, failed2)
    report_diagnostics("Step 17 (tab 3)", errors3, failed3)
    ctx.close()


def progress_attempts_since(page, namespace, test_id, since):
    record = json_item(page, f"{PROGRESS_KEY}::{namespace}") or {}
    return [a for a in ((record.get("tests") or {}).get(test_id) or []) if (a.get("at") or "") >= since]


def fill_gaps(page, answers):
    gaps = page.locator('input[type="text"]:visible')
    for index, answer in enumerate(answers):
        try:
            gaps.nth(index).fill(answer)
        except Exception:
            pass
    page.wait_for_timeout(1200)


def resume_mock_in(page):
    goto(page, MOCK_PATH)
    wait_for_mock_ready(page)
    try:
        page.wait_for_selector(f"text={RESUME_HEADING}", timeout=8000)
    except Exception:
        pass
    return journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Continue where you left off"),
        lambda: page.locator('[role="timer"]').count() > 0,
    )


def run_mock_paper_twice_step(browser, a_id):
    """Step 18 (R2E-03), on a fresh browser for A."""
    ns_a = f"u:{a_id}"
    key_a = f"{ACTIVE_MOCK_KEY}::{ns_a}"
    write_section(
        "Step 18 - The same mock paper handed in from two tabs: the first hand-in is final, and the paper is "
        "recorded once (Codex R2E-03)",
        "Two tabs that picked up the same mock sitting hold the same Listening paper, and the sitting reads as "
        "theirs in both. Handing the paper in used to overwrite whatever result it already had, so the second "
        "tab's hand-in replaced the first one's result and recorded the paper a second time, in the progress "
        "history and in the learner evidence. Now the first hand-in is final: a tab still holding the paper "
        "stops on the other tab's hand-in, and a hand-in that still arrives is refused and records nothing.",
    )
    ctx = new_context(browser)
    tab1 = ctx.new_page()
    errors1, failed1 = attach_diagnostics(tab1)
    tab1.on("dialog", lambda dialog: dialog.accept())
    goto(tab1, "/dashboard")
    tab1.wait_for_timeout(1200)
    back = journey.ws_sign_in(tab1, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on a fresh browser", back == a_id, f"signed in as {back}")
    since = page_now(tab1)

    # ── Tab 1 starts a mock; tabs 2 and 3 pick up the same sitting ──
    goto(tab1, MOCK_PATH)
    wait_for_mock_ready(tab1)
    listening_id = tab1.locator("select").first.input_value()
    started = journey.click_until(
        tab1,
        lambda: tab1.get_by_role("button", name="Start Mock Exam"),
        lambda: tab1.locator('[role="timer"]').count() > 0,
    )
    tab1.wait_for_timeout(1000)
    sitting_id = (active_mock_for(tab1, ns_a) or {}).get("sittingId")
    tab2 = ctx.new_page()
    errors2, failed2 = attach_diagnostics(tab2)
    tab2.on("dialog", lambda dialog: dialog.accept())
    tab2.add_init_script(DEAF_TAB_SCRIPT)
    resumed2 = resume_mock_in(tab2)
    tab3 = ctx.new_page()
    errors3, failed3 = attach_diagnostics(tab3)
    tab3.on("dialog", lambda dialog: dialog.accept())
    resumed3 = resume_mock_in(tab3)
    tab2.wait_for_timeout(800)
    write_row(
        "Tab 1 starts a mock on its Listening paper; tab 2 (which hears nothing from the other tabs) and tab 3 "
        "pick up the same sitting and the same paper",
        started and resumed2 and resumed3 and bool(sitting_id)
        and (active_mock_for(tab3, ns_a) or {}).get("sittingId") == sitting_id,
        f"Listening paper {listening_id}, sitting {sitting_id}; tab 2 running: {resumed2}, tab 3 running: {resumed3}",
    )
    write_note(
        "**Tab 2 stands in for a tab that MISSED the other tab's hand-in**, by the same small script as step "
        "17 (no storage event reaches it). Tab 3 is an ordinary tab."
    )

    # ── Tab 2 answers one way, tab 1 another, and tab 1 hands in first ──
    tab2.bring_to_front()
    fill_gaps(tab2, TAB2_LEG_ANSWERS)
    tab1.bring_to_front()
    fill_gaps(tab1, TAB1_LEG_ANSWERS)
    leg_before = ((active_mock_for(tab1, ns_a) or {}).get("legSittings") or {}).get(listening_id) or {}
    journey.submit_and_confirm(tab1)
    tab1.wait_for_timeout(2000)
    leg_after_1 = ((active_mock_for(tab1, ns_a) or {}).get("legSittings") or {}).get(listening_id) or {}
    result_1 = json.dumps(leg_after_1.get("result"), sort_keys=True)
    write_row(
        "Tab 1 answers differently from tab 2 and hands the paper in first: accepted, its score is showing, and "
        "the paper's result is kept inside the sitting",
        sorted((leg_before.get("answers") or {}).values()) == sorted(TAB1_LEG_ANSWERS)
        and score_showing(tab1)
        and bool(leg_after_1.get("result")),
        f"answers before the hand-in (tab 1's, the last written): {json.dumps(leg_before.get('answers'))}; "
        f"score showing: {score_showing(tab1)}; result = {result_1}",
    )
    shot(tab1, "55-mock-paper-handed-in-tab-1", MOCK_PATH)

    # ── Tab 3: told by tab 1's hand-in ──
    tab3.bring_to_front()
    tab3.wait_for_timeout(2000)
    write_row(
        "Tab 3 stops on the stopped screen with the sentence for a paper handed in from another tab: no answer "
        "boxes, no Submit",
        text_count(tab3, HANDED_IN_SENTENCE) > 0
        and answer_controls(tab3) == 0
        and tab3.get_by_role("button", name="Submit").count() == 0,
        f"sentence: {text_count(tab3, HANDED_IN_SENTENCE)}, answer controls: {answer_controls(tab3)}, "
        f"Submit: {tab3.get_by_role('button', name='Submit').count()}",
    )
    shot(tab3, "56-mock-paper-tab-3-stopped", MOCK_PATH)

    # ── Tab 2: never told; hands in its own, different answers ──
    tab2.bring_to_front()
    tab2.wait_for_timeout(800)
    running2 = tab2.locator('[role="timer"]').count() > 0 and text_count(tab2, HANDED_IN_SENTENCE) == 0
    mark_page(tab2)
    journey.submit_and_confirm(tab2)
    tab2.wait_for_timeout(2000)
    reloaded_since(tab2, "tab 2 (mock paper), after its hand-in")
    write_row(
        "Tab 2, never told, is still running with its own answers; its hand-in is refused and it stops with the "
        "same sentence, never reaching a score",
        running2 and text_count(tab2, HANDED_IN_SENTENCE) > 0 and not score_showing(tab2),
        f"running before its hand-in: {running2}; sentence after: {text_count(tab2, HANDED_IN_SENTENCE)}; "
        f"score showing: {score_showing(tab2)}",
    )
    shot(tab2, "57-mock-paper-tab-2-refused", MOCK_PATH)
    held = active_mock_for(tab2, ns_a) or {}
    leg_now = (held.get("legSittings") or {}).get(listening_id) or {}
    write_row(
        "The paper's result is still tab 1's, byte for byte, and the sitting is still written down",
        json.dumps(leg_now.get("result"), sort_keys=True) == result_1 and held.get("sittingId") == sitting_id,
        f"result now = {json.dumps(leg_now.get('result'), sort_keys=True)}; sitting {held.get('sittingId')}",
    )
    attempts = progress_attempts_since(tab2, ns_a, listening_id, since)
    events = submitted_events(tab2, ns_a, f"test:{listening_id}", since)
    event_answers = sorted(
        (item.get("firstAnswer") or "") for event in events for item in (event.get("items") or []) if item.get("firstAnswer")
    )
    write_row(
        "The paper was recorded once: one attempt in A's progress history and one submission in A's learner "
        "evidence, carrying tab 1's answers and none of tab 2's",
        len(attempts) == 1
        and len(events) == 1
        and all(answer in event_answers for answer in TAB1_LEG_ANSWERS)
        and not any(answer in event_answers for answer in TAB2_LEG_ANSWERS),
        f"attempts of {listening_id} since the step began: {len(attempts)}; submissions: {len(events)}; "
        f"answers in the evidence: {json.dumps(event_answers)}",
    )
    raw_after = raw_item(tab2, key_a)
    write_row(
        "Nothing tab 2 did was written: the in-progress record holds no answer of tab 2's",
        bool(raw_after) and not any(answer in raw_after for answer in TAB2_LEG_ANSWERS),
        f"searched {key_a} for tab 2's two answers",
    )
    report_diagnostics("Step 18 (tab 1)", errors1, failed1)
    report_diagnostics("Step 18 (tab 2)", errors2, failed2)
    report_diagnostics("Step 18 (tab 3)", errors3, failed3)
    ctx.close()


# ── Seventh round: every tutor request belongs to its student ───────────────

CONVERSATION_KEY = "ielts.mrez.conversation.v1"
PANEL_MESSAGE_A = "SYNTHETIC question typed by student A in the Mr EZ panel"
PANEL_REPLY_A = "SYNTHETIC reply for student A, written by this test and released late"
PANEL_MESSAGE_B = "SYNTHETIC question typed by student B in the Mr EZ panel"
PANEL_REPLY_B = "SYNTHETIC reply for student B, written by this test"
PANEL_EMPTY = "Where shall we start?"


def synthetic_panel_reply(text, conversation_id):
    """A reply in the tutor's own shape, written HERE: labelled simulated
    (live false), from no model and not from the stand-in either."""
    return json.dumps({
        "task": "chat",
        "conversationId": conversation_id,
        "text": text,
        "mood": "explaining",
        "live": False,
        "model": "simulated",
    })


def hold_chat_requests(page):
    """Hold every chat message this page sends to Mr EZ, unanswered, in a
    list the test releases from. Nothing else is touched: the settings
    probe, the welcome and every other request go through as usual."""
    held = []

    def on_route(route):
        request = route.request
        body = {}
        if request.method == "POST":
            try:
                body = json.loads(request.post_data or "{}")
            except ValueError:
                body = {}
        if request.method == "POST" and body.get("task") == "chat":
            held.append({
                "route": route,
                "auth": request.headers.get("authorization", ""),
                "message": body.get("message"),
            })
            return
        route.continue_()

    page.route("**/tutor**", on_route)
    return held


def release(held_request, text, conversation_id):
    held_request["route"].fulfill(
        status=200,
        headers={"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        body=synthetic_panel_reply(text, conversation_id),
    )


def conversations_in_tab(page):
    """Every conversation this tab keeps in its own session storage, key by
    key, exactly as stored."""
    return journey.settle(
        page,
        lambda pg: pg.evaluate(
            """(base) => Object.fromEntries(Object.keys(sessionStorage)
                .filter((k) => k.startsWith(base))
                .map((k) => [k, sessionStorage.getItem(k)]))""",
            CONVERSATION_KEY,
        ),
    )


def panel_text(page):
    panel = page.locator("#mrez-panel")
    try:
        return panel.first.inner_text() if panel.count() else ""
    except Exception:
        return ""


def wait_for_held(page, held, count, attempts=40):
    for _ in range(attempts):
        if len(held) >= count:
            return True
        page.wait_for_timeout(250)
    return len(held) >= count


def send_from_panel(page, message):
    box = page.locator("#mrez-input")
    try:
        box.fill(message, timeout=8000)
        box.press("Enter")
        return True
    except Exception:
        return False


def run_panel_switch_step(browser, a_id, b_id):
    """Step 19 (every tutor request bound to its student), on a fresh browser
    for A, then B."""
    write_section(
        "Step 19 - A message sent to Mr EZ is answered to its own student or to nobody (follow-up to Codex R2E-02)",
        "R2E-02 bound the two review requests to the student who sat the paper. Every other request to Mr EZ "
        "still went out with whatever token the browser held, and its reply went into whichever conversation "
        "was on the page when it came back; the panel also kept one conversation for the whole browser tab. "
        "Now every request is bound to the student on the page when it is made, and handed back only while that "
        "student is still the one on the page; the panel's conversation is kept per student and changes with "
        "the account. Here A's panel message is held on its way (routed to this test, which answers it), the "
        "account changes to B in a second tab, and only then is it released with a SYNTHETIC reply this test "
        "wrote, labelled simulated. No model is called, and the stand-in never sees either chat message.",
    )
    ctx = new_context(browser)
    tab1 = ctx.new_page()
    errors1, failed1 = attach_diagnostics(tab1)
    tab1.on("dialog", lambda dialog: dialog.accept())
    held = hold_chat_requests(tab1)
    posts1 = watch_tutor_posts(tab1)
    goto(tab1, "/dashboard")
    tab1.wait_for_timeout(1200)
    back = journey.ws_sign_in(tab1, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on a fresh browser", back == a_id, f"signed in as {back}")

    # ── Tab 1: A asks Mr EZ something, and the request is held on its way ──
    journey.click_until(
        tab1,
        lambda: tab1.locator(".mrez-launcher"),
        lambda: tab1.locator("#mrez-panel.is-open").count() > 0,
    )
    tab1.wait_for_timeout(600)
    sent_a = send_from_panel(tab1, PANEL_MESSAGE_A)
    got_a = wait_for_held(tab1, held, 1)
    tab1.wait_for_timeout(600)
    a_session = auth_session(tab1) or {}
    a_key = f"{CONVERSATION_KEY}::u:{a_id}"
    stored_a = conversations_in_tab(tab1)
    write_row(
        "A sends a message from the panel: it goes out once, with A's own token, and is held on its way with no "
        "reply yet; A's question is on screen and saved under A's own key",
        sent_a and got_a and len(held) == 1
        and held[0]["auth"] == f"Bearer {a_session.get('token')}"
        and held[0]["message"] == PANEL_MESSAGE_A
        and PANEL_MESSAGE_A in panel_text(tab1)
        and PANEL_MESSAGE_A in (stored_a.get(a_key) or ""),
        f"chat requests held: {len(held)}, sent with A's token: "
        f"{bool(held) and held[0]['auth'] == 'Bearer ' + str(a_session.get('token'))}, A's question on screen: "
        f"{PANEL_MESSAGE_A in panel_text(tab1)}, conversation keys in the tab: {sorted(stored_a.keys())}",
    )
    shot(tab1, "55-a-message-held-on-its-way", "/dashboard")
    mark_page(tab1)

    # ── Tab 2: A signs out, B signs in ──
    tab2 = ctx.new_page()
    errors2, failed2 = attach_diagnostics(tab2)
    tab2.on("dialog", lambda dialog: dialog.accept())
    goto(tab2, "/dashboard")
    tab2.wait_for_timeout(1500)
    journey.ws_sign_out(tab2)
    b_back = journey.ws_sign_in(tab2, EMAIL_B, PASSWORD_B)
    tab1.bring_to_front()
    tab1.wait_for_timeout(2500)
    reloaded_since(tab1, "tab 1 (A's panel), after B signed in in tab 2")
    before_release = panel_text(tab1)
    write_row(
        "B signs in in a second tab: the first tab's panel is B's now, with none of A's question on it",
        b_back == b_id and PANEL_MESSAGE_A not in before_release and text_count(tab1, PANEL_EMPTY) > 0,
        f"B = {b_back}; A's question in the panel: {PANEL_MESSAGE_A in before_release}; B's empty panel "
        f"(\"{PANEL_EMPTY}\"): {text_count(tab1, PANEL_EMPTY)}",
    )
    shot(tab1, "56-panel-is-b-before-release", "/dashboard")

    # ── The held request comes back, late, with a reply for A ──
    release(held[0], PANEL_REPLY_A, "SYNTHETIC-conversation-a-panel")
    tab1.wait_for_timeout(2500)
    after_release = panel_text(tab1)
    stored = conversations_in_tab(tab1)
    b_key = f"{CONVERSATION_KEY}::u:{b_id}"
    anywhere = json.dumps(stored)
    write_row(
        "The late reply for A is not shown: it is nowhere on the first tab's page",
        PANEL_REPLY_A not in after_release and text_count(tab1, PANEL_REPLY_A) == 0,
        f"reply in the panel: {PANEL_REPLY_A in after_release}; anywhere on the page: "
        f"{text_count(tab1, PANEL_REPLY_A)}",
    )
    chat_posts = [p for p in posts1 if p.get("task") == "chat"]
    write_row(
        "Nothing was sent again: one chat request in all, the held one",
        len(held) == 1 and len(chat_posts) == 1,
        f"chat requests held: {len(held)}; chat requests the page made: {len(chat_posts)}",
    )
    write_row(
        "B's saved conversation holds nothing of A: no question, no reply, and the late reply is not saved "
        "anywhere in the tab",
        PANEL_MESSAGE_A not in (stored.get(b_key) or "")
        and PANEL_REPLY_A not in anywhere
        and CONVERSATION_KEY not in stored,
        f"B's key present: {b_key in stored}, holds A's question: {PANEL_MESSAGE_A in (stored.get(b_key) or '')}; "
        f"late reply saved anywhere: {PANEL_REPLY_A in anywhere}; old unowned key present: "
        f"{CONVERSATION_KEY in stored}; keys: {sorted(stored.keys())}",
    )
    write_note(
        "**What the tab keeps after the release:** A's own question stays under A's key only ("
        f"`{a_key}`: {'present' if PANEL_MESSAGE_A in (stored.get(a_key) or '') else 'absent'}), where A's next "
        "sign-in on this tab finds it; B's key has nothing of A's."
    )
    shot(tab1, "57-late-reply-dropped", "/dashboard")

    # ── B's own message, in the same panel ──
    b_session = auth_session(tab1) or {}
    sent_b = send_from_panel(tab1, PANEL_MESSAGE_B)
    got_b = wait_for_held(tab1, held, 2)
    if got_b:
        release(held[1], PANEL_REPLY_B, "SYNTHETIC-conversation-b-panel")
    tab1.wait_for_timeout(2500)
    stored_b = conversations_in_tab(tab1)
    shown_b = panel_text(tab1)
    write_row(
        "B's own message goes out with B's token, and its reply (synthetic, labelled simulated) lands in B's panel "
        "and B's saved conversation, with nothing of A's beside it",
        sent_b and got_b
        and held[1]["auth"] == f"Bearer {b_session.get('token')}"
        and b_session.get("user") == b_id
        and PANEL_REPLY_B in shown_b
        and text_count(tab1, SIMULATED_BADGE) > 0
        and PANEL_REPLY_B in (stored_b.get(b_key) or "")
        and PANEL_MESSAGE_A not in shown_b
        and PANEL_MESSAGE_A not in (stored_b.get(b_key) or ""),
        f"sent with B's token: {got_b and held[1]['auth'] == 'Bearer ' + str(b_session.get('token'))}; reply in "
        f"the panel: {PANEL_REPLY_B in shown_b}; simulated badge: {text_count(tab1, SIMULATED_BADGE)}; saved "
        f"under B: {PANEL_REPLY_B in (stored_b.get(b_key) or '')}; A's question beside it: "
        f"{PANEL_MESSAGE_A in shown_b or PANEL_MESSAGE_A in (stored_b.get(b_key) or '')}",
    )
    shot(tab1, "58-b-own-message-and-reply", "/dashboard")
    report_diagnostics("Step 19 (tab 1)", errors1, failed1)
    report_diagnostics("Step 19 (tab 2)", errors2, failed2)
    ctx.close()


# ── Eighth round: a lesson answer and its evaluation belong to their student ──

EVAL_TASK_ID = "writing-task1-overview-guided"
EVAL_PATH = f"/trainers/focused/{EVAL_TASK_ID}"
EVAL_ACTIVITY = f"focus:{EVAL_TASK_ID}"
EVAL_ANSWER_A = (
    "SYNTHETIC overview by student A: coal use fell steadily over the period, "
    "while renewable sources rose to overtake it."
)
EVAL_OBSERVATION_A = "SYNTHETIC observation for student A, written by this test and released late"
EVAL_NOTE = "The account on this page changed. Any answer in progress was kept for the student who was writing it."
WRITTEN_DRAFT_BASE = "ielts.learning.written.v1"
LEARNER_RECORD_BASE = "ielts.learning.record.v1"


def synthetic_evaluation_reply():
    """A judged verdict in the tutor's own shape, written HERE: labelled
    simulated (live false), from no model and not from the stand-in either."""
    return json.dumps({
        "task": "evaluate-practice",
        "verdict": "met",
        "met": True,
        "judged": True,
        "feedback": "SYNTHETIC feedback, from no model",
        "observations": [EVAL_OBSERVATION_A, "SYNTHETIC second observation, from no model"],
        "suggestions": ["SYNTHETIC next move, from no model"],
        "isBand": False,
        "live": False,
        "model": "simulated",
    })


def hold_evaluation_requests(page):
    """Hold every practice-evaluation request this page sends to Mr EZ,
    unanswered, in a list the test releases from. Everything else goes
    through as usual."""
    held = []

    def on_route(route):
        request = route.request
        body = {}
        if request.method == "POST":
            try:
                body = json.loads(request.post_data or "{}")
            except ValueError:
                body = {}
        if request.method == "POST" and body.get("task") == "evaluate-practice":
            held.append({
                "route": route,
                "auth": request.headers.get("authorization", ""),
                "submission": body.get("submission"),
            })
            return
        route.continue_()

    page.route("**/tutor**", on_route)
    return held


def stored_json(page, key):
    return journey.settle(
        page,
        lambda pg: pg.evaluate(
            "(key) => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }",
            key,
        ),
    )


def written_draft_of(page, namespace):
    return stored_json(page, f"{WRITTEN_DRAFT_BASE}::{namespace}::{EVAL_TASK_ID}")


def evaluation_events_of(page, namespace):
    record = stored_json(page, f"{LEARNER_RECORD_BASE}::{namespace}") or {}
    return [event for event in (record.get("events") or []) if event.get("activityId") == EVAL_ACTIVITY]


def keys_holding(page, text):
    """Every localStorage key whose value contains `text`."""
    return journey.settle(
        page,
        lambda pg: pg.evaluate(
            "(text) => Object.keys(localStorage).filter((k) => (localStorage.getItem(k) || '').includes(text)).sort()",
            text,
        ),
    )


def answer_box_value(page):
    box = page.locator("#written-answer")
    try:
        return box.first.input_value(timeout=3000) if box.count() else None
    except Exception:
        return None


def run_lesson_evaluation_step(browser, a_id, b_id):
    """Step 20 (a lesson answer and its evaluation belong to the student who
    pressed Check), on a fresh browser for A, then B."""
    write_section(
        "Step 20 - A written answer sent for evaluation is kept for its own student and shown to nobody else "
        "(the lesson surfaces, after R2E-02)",
        "The follow-up to R2E-02 for the lesson surfaces that RECORD what the tutor sends back. The tutor client "
        "already dropped a reply that came back after the page changed hands, but the written focused task then "
        "recorded the student's answer, as not judged, into whichever student was on the page by then. Now the "
        "answer is bound at the press to the student who wrote it, kept in THAT student's own record and draft "
        "whatever happens next, and shown only while they are still the one on the page; when the page changes "
        "hands the task is handed over, empty, to the next student. Here A's evaluation request is held on its "
        "way (routed to this test, which answers it), the account changes to B in a second tab, and only then is "
        "it released with a SYNTHETIC judged reply this test wrote, labelled simulated. No model is called, and "
        "the stand-in never sees the evaluation request.",
    )
    ctx = new_context(browser)
    tab1 = ctx.new_page()
    errors1, failed1 = attach_diagnostics(tab1)
    tab1.on("dialog", lambda dialog: dialog.accept())
    held = hold_evaluation_requests(tab1)
    posts1 = watch_tutor_posts(tab1)
    goto(tab1, "/dashboard")
    tab1.wait_for_timeout(1200)
    back = journey.ws_sign_in(tab1, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on a fresh browser", back == a_id, f"signed in as {back}")

    # ── Tab 1: A writes an overview and presses Check; the request is held ──
    goto(tab1, EVAL_PATH)
    tab1.wait_for_timeout(1500)
    box = tab1.locator("#written-answer")
    typed = False
    try:
        box.first.click(timeout=8000)
        box.first.fill(EVAL_ANSWER_A, timeout=8000)
        typed = True
    except Exception:
        typed = False
    tab1.wait_for_timeout(1200)
    journey.click_until(
        tab1,
        lambda: tab1.locator("button.focused-check"),
        lambda: len(held) > 0,
    )
    got = wait_for_held(tab1, held, 1)
    tab1.wait_for_timeout(600)
    a_session = auth_session(tab1) or {}
    ns_a = f"u:{a_id}"
    ns_b = f"u:{b_id}"
    write_row(
        "A presses Check on the guided overview task: the evaluation goes out once, with A's own token and A's "
        "own words, and is held on its way with no reply yet",
        typed and got and len(held) == 1
        and held[0]["auth"] == f"Bearer {a_session.get('token')}"
        and held[0]["submission"] == EVAL_ANSWER_A
        and a_session.get("user") == a_id,
        f"typed: {typed}; evaluation requests held: {len(held)}; sent with A's token: "
        f"{bool(held) and held[0]['auth'] == 'Bearer ' + str(a_session.get('token'))}; carries A's words: "
        f"{bool(held) and held[0]['submission'] == EVAL_ANSWER_A}",
    )
    shot(tab1, "59-a-evaluation-held-on-its-way", EVAL_PATH)
    mark_page(tab1)

    # ── Tab 2: A signs out, B signs in ──
    tab2 = ctx.new_page()
    errors2, failed2 = attach_diagnostics(tab2)
    tab2.on("dialog", lambda dialog: dialog.accept())
    goto(tab2, "/dashboard")
    tab2.wait_for_timeout(1500)
    journey.ws_sign_out(tab2)
    b_back = journey.ws_sign_in(tab2, EMAIL_B, PASSWORD_B)
    tab1.bring_to_front()
    tab1.wait_for_timeout(2500)
    reloaded_since(tab1, "tab 1 (A's written task), after B signed in in tab 2")
    box_now = answer_box_value(tab1)
    write_row(
        "B signs in in a second tab: the first tab's task is handed over to B, empty, with one calm line saying why",
        b_back == b_id
        and box_now == ""
        and text_count(tab1, EVAL_ANSWER_A) == 0
        and text_count(tab1, EVAL_NOTE) > 0,
        f"B = {b_back}; answer box now holds: {json.dumps(box_now)}; A's words anywhere on the page: "
        f"{text_count(tab1, EVAL_ANSWER_A)}; the notice (\"{EVAL_NOTE}\"): {text_count(tab1, EVAL_NOTE)}",
    )
    shot(tab1, "60-task-handed-to-b-before-release", EVAL_PATH)

    # ── The held request comes back, late, with a verdict for A ──
    if held:
        held[0]["route"].fulfill(
            status=200,
            headers={"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            body=synthetic_evaluation_reply(),
        )
    tab1.wait_for_timeout(2500)
    write_row(
        "The late verdict for A is shown to nobody: neither the verdict nor A's words are anywhere on the first "
        "tab's page",
        text_count(tab1, EVAL_OBSERVATION_A) == 0
        and text_count(tab1, EVAL_ANSWER_A) == 0
        and answer_box_value(tab1) == "",
        f"verdict on the page: {text_count(tab1, EVAL_OBSERVATION_A)}; A's words on the page: "
        f"{text_count(tab1, EVAL_ANSWER_A)}; answer box: {json.dumps(answer_box_value(tab1))}",
    )
    evaluation_posts = [p for p in posts1 if p.get("task") == "evaluate-practice"]
    write_row(
        "Nothing was sent again: one evaluation request in all, the held one",
        len(held) == 1 and len(evaluation_posts) == 1,
        f"evaluation requests held: {len(held)}; evaluation requests the page made: {len(evaluation_posts)}",
    )

    a_events = evaluation_events_of(tab1, ns_a)
    a_answers = [((event.get("items") or [{}])[0] or {}).get("firstAnswer") for event in a_events]
    a_outcomes = [event.get("outcome") or {} for event in a_events]
    write_note(
        "**A's learner record, this task's events:** "
        + json.dumps([{"firstAnswer": answer, "outcome": outcome} for answer, outcome in zip(a_answers, a_outcomes)])
    )
    write_row(
        "A's answer is kept in A's own learner record, once, as an attempt nothing judged (the late verdict was "
        "dropped, so no verdict is claimed either way)",
        len(a_events) == 1
        and a_answers[0] == EVAL_ANSWER_A
        and a_outcomes[0].get("met") is False
        and a_outcomes[0].get("byModel") is False,
        f"{len(a_events)} event(s) for {EVAL_ACTIVITY} under {ns_a}; first answer matches A's words: "
        f"{bool(a_answers) and a_answers[0] == EVAL_ANSWER_A}; outcome: {json.dumps(a_outcomes)}",
    )
    a_draft = written_draft_of(tab1, ns_a) or {}
    a_attempts = [attempt.get("text") for attempt in (a_draft.get("attempts") or [])]
    write_row(
        "A's answer is kept in A's own draft of the task too, where A's next visit finds it",
        a_attempts == [EVAL_ANSWER_A],
        f"attempts in A's draft: {json.dumps(a_attempts)}",
    )
    b_events = evaluation_events_of(tab1, ns_b)
    b_draft = written_draft_of(tab1, ns_b)
    holding_a = keys_holding(tab1, EVAL_ANSWER_A)
    holding_verdict = keys_holding(tab1, EVAL_OBSERVATION_A)
    write_row(
        "B's learner record and B's draft hold nothing of A's, and the late verdict is kept nowhere at all",
        not b_events
        and b_draft is None
        and not [key for key in holding_a if ns_b in key]
        and not holding_verdict,
        f"events for this task under B: {len(b_events)}; B's draft: {json.dumps(b_draft)}; keys holding A's "
        f"words: {holding_a}; keys holding the late verdict: {holding_verdict}",
    )
    shot(tab1, "61-late-verdict-dropped", EVAL_PATH)

    tab1.wait_for_timeout(2500)
    remote_b = journey.settled_store_snapshot(b_id)
    remote_b_text = json.dumps(remote_b)
    write_row(
        "Nothing the stand-in holds for B carries A's words or the late verdict",
        EVAL_ANSWER_A not in remote_b_text and EVAL_OBSERVATION_A not in remote_b_text,
        f"searched every row the stand-in holds for B: A's words "
        f"{'found' if EVAL_ANSWER_A in remote_b_text else 'not present'}; late verdict "
        f"{'found' if EVAL_OBSERVATION_A in remote_b_text else 'not present'}",
    )
    report_diagnostics("Step 20 (tab 1)", errors1, failed1)
    report_diagnostics("Step 20 (tab 2)", errors2, failed2)
    ctx.close()


# ── Ninth round: an exercise on screen belongs to the student it was opened for ──

FOCUS_ID = "reading-matching-headings-guided"
FOCUS_PATH = f"/trainers/focused/{FOCUS_ID}"
FOCUS_ACTIVITY = f"focus:{FOCUS_ID}"
QUIZ_PATH = "/lessons/reading/headings"
QUIZ_SET = "practice-reading-headings"
QUIZ_ACTIVITY = f"check:{QUIZ_SET}"
FOCUS_COPY_BASE = "ielts.learning.focus.v1"
QUIZ_RUN_BASE = "ielts.learning.check.v1"
# A's answers to three of the six questions: real options of the exercise's
# heading list, one of them wrong on purpose. Nothing here is checked for
# being right, only for whose it is.
A_FOCUS_ANSWERS = ["v", "vii", "ii"]
EXERCISE_NOTE = (
    "The account on this page changed. Any answers in progress were kept for the student who was working on them."
)


def focus_copy_of(page, namespace):
    return stored_json(page, f"{FOCUS_COPY_BASE}::{namespace}::{FOCUS_ID}")


def quiz_run_of(page, namespace):
    return stored_json(page, f"{QUIZ_RUN_BASE}::{namespace}::{QUIZ_SET}")


def activity_events_of(page, namespace, activity):
    record = stored_json(page, f"{LEARNER_RECORD_BASE}::{namespace}") or {}
    return [event for event in (record.get("events") or []) if event.get("activityId") == activity]


def focus_values(page):
    """The value in each of the focused exercise's answer controls, in order."""
    return journey.settle(
        page,
        lambda pg: pg.evaluate(
            "() => Array.from(document.querySelectorAll('select.focused-answer')).map((s) => s.value)"
        ),
    )


def quiz_selects(page):
    return page.locator("astro-island select").filter(has=page.locator("option", has_text="Choose heading"))


def quiz_values(page):
    """The value in each of the quick check's heading controls, in order."""
    return journey.settle(
        page,
        lambda pg: pg.evaluate(
            """() => Array.from(document.querySelectorAll('astro-island select'))
                .filter((s) => Array.from(s.options).some((o) => (o.textContent || '').includes('Choose heading')))
                .map((s) => s.value)"""
        ),
    )


def run_exercise_switch_step(browser, a_id, b_id):
    """Step 21 (the focused exercise and the lesson quick check belong to the
    student they were opened for), on a fresh browser for A, then B."""
    write_section(
        "Step 21 - The focused exercise and the lesson quick check hand over when the account changes, and a "
        "check is recorded only for the student whose answers they are (the follow-up to R2B-01)",
        "The two other screens that host the lesson help buttons used to keep the previous student's answers on "
        "screen after an account change, and a press of check recorded them into whoever was signed in by then. "
        "Now each exercise is bound to the student it was opened for: when the page changes hands it hands over "
        "(A's answers stay in A's own in-progress copy, the screen shows the next student's own or nothing, with "
        "one calm line), and a check is refused, recording nothing, for a student who is no longer here. Two tabs "
        "that hear nothing from the others stand in for tabs that missed the switch. No model is called at any "
        "point: nothing here asks Mr EZ for anything.",
    )
    ns_a = f"u:{a_id}"
    ns_b = f"u:{b_id}"
    ctx = new_context(browser)

    # ── Tab 3 is where the accounts change hands; A signs in there first ──
    tab3 = ctx.new_page()
    errors3, failed3 = attach_diagnostics(tab3)
    tab3.on("dialog", lambda dialog: dialog.accept())
    goto(tab3, "/dashboard")
    tab3.wait_for_timeout(1200)
    back = journey.ws_sign_in(tab3, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on a fresh browser", back == a_id, f"signed in as {back}")

    # ── Tab 1: A answers three of six on the guided focused exercise ──
    tab1 = ctx.new_page()
    errors1, failed1 = attach_diagnostics(tab1)
    goto(tab1, FOCUS_PATH)
    tab1.wait_for_timeout(2200)
    selects = tab1.locator("select.focused-answer")
    try:
        for index, value in enumerate(A_FOCUS_ANSWERS):
            selects.nth(index).select_option(value, timeout=8000)
    except Exception as error:
        write_note(f"**Diagnostic:** answering the focused exercise raised {type(error).__name__}.")
    tab1.wait_for_timeout(900)
    a_focus_on_screen = focus_values(tab1) or []
    a_copy = focus_copy_of(tab1, ns_a) or {}
    a_copy_answers = [value for value in (a_copy.get("answers") or {}).values()]
    write_row(
        "A answers three of the six questions on the guided focused exercise, and they are kept in A's own "
        "in-progress copy",
        a_focus_on_screen[:3] == A_FOCUS_ANSWERS and sorted(a_copy_answers) == sorted(A_FOCUS_ANSWERS),
        f"on screen: {json.dumps(a_focus_on_screen)}; A's copy holds: {json.dumps(a_copy.get('answers'))}",
    )
    shot(tab1, "62-a-focused-exercise-part-answered", FOCUS_PATH)

    # ── Tab 2: A answers three questions of the lesson quick check ──
    tab2 = ctx.new_page()
    errors2, failed2 = attach_diagnostics(tab2)
    goto(tab2, QUIZ_PATH)
    tab2.wait_for_timeout(2400)
    quiz = quiz_selects(tab2)
    try:
        for index in range(3):
            quiz.nth(index).scroll_into_view_if_needed(timeout=8000)
            quiz.nth(index).select_option(index=index + 1, timeout=8000)
    except Exception as error:
        write_note(f"**Diagnostic:** answering the quick check raised {type(error).__name__}.")
    tab2.wait_for_timeout(900)
    a_quiz_on_screen = (quiz_values(tab2) or [])[:3]
    a_run = quiz_run_of(tab2, ns_a) or {}
    a_run_drafts = (((a_run.get("units") or [{}])[0]) or {}).get("drafts") or []
    write_row(
        "A answers three questions of the lesson quick check, and they are kept in A's own unfinished run",
        len(a_quiz_on_screen) == 3 and all(a_quiz_on_screen) and a_run_drafts[:3] == a_quiz_on_screen,
        f"on screen: {json.dumps(a_quiz_on_screen)}; A's run, unit 1: {json.dumps(a_run_drafts)}",
    )
    shot(tab2, "63-a-quick-check-part-answered", QUIZ_PATH)
    mark_page(tab1)
    mark_page(tab2)

    # ── Tab 3: A signs out and B signs in ──
    tab3.bring_to_front()
    journey.ws_sign_out(tab3)
    b_back = journey.ws_sign_in(tab3, EMAIL_B, PASSWORD_B)
    tab1.bring_to_front()
    tab1.wait_for_timeout(2500)
    reloaded_since(tab1, "tab 1 (A's focused exercise), after B signed in in tab 3")
    focus_now = focus_values(tab1) or []
    write_row(
        "B signs in in another tab: A's focused exercise tab hands over, with one calm line and nothing of A's "
        "answers",
        b_back == b_id and not any(focus_now) and text_count(tab1, EXERCISE_NOTE) > 0,
        f"B = {b_back}; answer controls now read: {json.dumps(focus_now)}; the notice (\"{EXERCISE_NOTE}\"): "
        f"{text_count(tab1, EXERCISE_NOTE)}",
    )
    shot(tab1, "64-focused-exercise-handed-to-b", FOCUS_PATH)
    tab2.bring_to_front()
    tab2.wait_for_timeout(1500)
    reloaded_since(tab2, "tab 2 (A's quick check), after B signed in in tab 3")
    quiz_now = quiz_values(tab2) or []
    write_row(
        "A's quick check tab hands over too, with the same calm line and nothing of A's answers",
        not any(quiz_now) and text_count(tab2, EXERCISE_NOTE) > 0,
        f"heading controls now read: {json.dumps(quiz_now)}; the notice: {text_count(tab2, EXERCISE_NOTE)}",
    )
    shot(tab2, "65-quick-check-handed-to-b", QUIZ_PATH)

    a_copy_after = focus_copy_of(tab1, ns_a) or {}
    a_run_after = quiz_run_of(tab1, ns_a) or {}
    a_run_after_drafts = (((a_run_after.get("units") or [{}])[0]) or {}).get("drafts") or []
    write_row(
        "A's answers are still kept for A, in A's own copy of each",
        (a_copy_after.get("answers") or {}) == (a_copy.get("answers") or {})
        and a_run_after_drafts[:3] == a_quiz_on_screen,
        f"A's focused copy: {json.dumps(a_copy_after.get('answers'))}; A's quick check run, unit 1: "
        f"{json.dumps(a_run_after_drafts)}",
    )
    write_row(
        "Nothing of A's is kept under B: no focused copy and no quick check run for B, and no event for either "
        "activity in B's record",
        focus_copy_of(tab1, ns_b) is None
        and quiz_run_of(tab1, ns_b) is None
        and not activity_events_of(tab1, ns_b, FOCUS_ACTIVITY)
        and not activity_events_of(tab1, ns_b, QUIZ_ACTIVITY),
        f"B's focused copy: {json.dumps(focus_copy_of(tab1, ns_b))}; B's quick check run: "
        f"{json.dumps(quiz_run_of(tab1, ns_b))}; B's events for them: "
        f"{len(activity_events_of(tab1, ns_b, FOCUS_ACTIVITY)) + len(activity_events_of(tab1, ns_b, QUIZ_ACTIVITY))}",
    )

    # ── B's own visits show nothing of A's ──
    tab3.bring_to_front()
    goto(tab3, FOCUS_PATH)
    tab3.wait_for_timeout(2200)
    b_focus = focus_values(tab3) or []
    shot(tab3, "66-b-own-focused-exercise-empty", FOCUS_PATH)
    goto(tab3, QUIZ_PATH)
    tab3.wait_for_timeout(2400)
    b_quiz = quiz_values(tab3) or []
    write_row(
        "B opening the same exercise and the same quick check afresh finds nothing of A's",
        len(b_focus) == 6 and not any(b_focus) and len(b_quiz) >= 3 and not any(b_quiz),
        f"B's focused exercise controls: {json.dumps(b_focus)}; B's quick check controls: {json.dumps(b_quiz)}",
    )
    shot(tab3, "67-b-own-quick-check-empty", QUIZ_PATH)

    # ── A signs back in: the open tabs, and a fresh visit, find A's answers ──
    goto(tab3, "/dashboard")
    tab3.wait_for_timeout(1200)
    journey.ws_sign_out(tab3)
    a_again = journey.ws_sign_in(tab3, EMAIL_A, PASSWORD_A)
    tab1.bring_to_front()
    tab1.wait_for_timeout(2500)
    focus_back = focus_values(tab1) or []
    tab2.bring_to_front()
    tab2.wait_for_timeout(1500)
    quiz_back = (quiz_values(tab2) or [])[:3]
    write_row(
        "A signs back in: the open focused exercise tab and the open quick check tab both show A's own answers "
        "again",
        a_again == a_id and focus_back[:3] == A_FOCUS_ANSWERS and quiz_back == a_quiz_on_screen,
        f"A = {a_again}; focused controls: {json.dumps(focus_back)}; quick check controls, first three: "
        f"{json.dumps(quiz_back)}",
    )
    shot(tab1, "68-a-back-focused-exercise-restored", FOCUS_PATH)
    shot(tab2, "69-a-back-quick-check-restored", QUIZ_PATH)

    # ── Two tabs that hear nothing, with A's answers on screen ──
    tab4 = ctx.new_page()
    errors4, failed4 = attach_diagnostics(tab4)
    tab4.add_init_script(DEAF_TAB_SCRIPT)
    goto(tab4, FOCUS_PATH)
    tab4.wait_for_timeout(2200)
    tab5 = ctx.new_page()
    errors5, failed5 = attach_diagnostics(tab5)
    tab5.add_init_script(DEAF_TAB_SCRIPT)
    goto(tab5, QUIZ_PATH)
    tab5.wait_for_timeout(2400)
    deaf_focus = focus_values(tab4) or []
    deaf_quiz = (quiz_values(tab5) or [])[:3]
    write_row(
        "Two tabs that hear nothing from the others open the same exercise and quick check for A, and show A's "
        "answers",
        deaf_focus[:3] == A_FOCUS_ANSWERS and deaf_quiz == a_quiz_on_screen,
        f"deaf focused tab: {json.dumps(deaf_focus)}; deaf quick check tab, first three: {json.dumps(deaf_quiz)}",
    )

    tab3.bring_to_front()
    journey.ws_sign_out(tab3)
    b_again = journey.ws_sign_in(tab3, EMAIL_B, PASSWORD_B)
    tab4.bring_to_front()
    tab4.wait_for_timeout(2000)
    session_now = auth_session(tab4) or {}
    still_focus = focus_values(tab4) or []
    write_row(
        "B signs in again elsewhere; the deaf tabs miss it and still show A's answers, while the session this "
        "browser holds is B's",
        b_again == b_id
        and session_now.get("user") == b_id
        and still_focus[:3] == A_FOCUS_ANSWERS
        and text_count(tab4, EXERCISE_NOTE) == 0,
        f"B = {b_again}; stored session names {session_now.get('user')}; deaf focused tab still reads "
        f"{json.dumps(still_focus)}; notice there: {text_count(tab4, EXERCISE_NOTE)}",
    )
    shot(tab4, "70-deaf-focused-tab-still-shows-a", FOCUS_PATH)
    mark_page(tab4)
    mark_page(tab5)

    before = {
        "a_focus": len(activity_events_of(tab4, ns_a, FOCUS_ACTIVITY)),
        "b_focus": len(activity_events_of(tab4, ns_b, FOCUS_ACTIVITY)),
        "a_quiz": len(activity_events_of(tab4, ns_a, QUIZ_ACTIVITY)),
        "b_quiz": len(activity_events_of(tab4, ns_b, QUIZ_ACTIVITY)),
    }
    try:
        tab4.locator("button.focused-check").first.click(timeout=8000)
        pressed4 = True
    except Exception:
        pressed4 = False
    tab4.wait_for_timeout(1800)
    reloaded_since(tab4, "the deaf focused tab, after its press")
    after_focus_controls = tab4.locator("select.focused-answer").count()
    write_row(
        "A check pressed in the deaf focused exercise tab is refused: nothing is recorded for A or for B, and "
        "A's answers leave that screen with the calm line",
        pressed4
        and len(activity_events_of(tab4, ns_a, FOCUS_ACTIVITY)) == before["a_focus"] == 0
        and len(activity_events_of(tab4, ns_b, FOCUS_ACTIVITY)) == before["b_focus"] == 0
        and after_focus_controls == 0
        and text_count(tab4, EXERCISE_NOTE) > 0,
        f"pressed: {pressed4}; focused events under A {before['a_focus']} -> "
        f"{len(activity_events_of(tab4, ns_a, FOCUS_ACTIVITY))}, under B {before['b_focus']} -> "
        f"{len(activity_events_of(tab4, ns_b, FOCUS_ACTIVITY))}; answer controls left on screen: "
        f"{after_focus_controls}; notice: {text_count(tab4, EXERCISE_NOTE)}",
    )
    shot(tab4, "71-deaf-focused-check-refused", FOCUS_PATH)

    tab5.bring_to_front()
    tab5.wait_for_timeout(800)
    try:
        button = tab5.get_by_role("button", name="Check answers").first
        button.scroll_into_view_if_needed(timeout=8000)
        button.click(timeout=8000)
        pressed5 = True
    except Exception:
        pressed5 = False
    tab5.wait_for_timeout(1800)
    reloaded_since(tab5, "the deaf quick check tab, after its press")
    after_quiz_controls = quiz_selects(tab5).count()
    write_row(
        "A check pressed in the deaf quick check tab is refused the same way: nothing recorded for anybody, and "
        "A's answers leave that screen with the calm line",
        pressed5
        and len(activity_events_of(tab5, ns_a, QUIZ_ACTIVITY)) == before["a_quiz"] == 0
        and len(activity_events_of(tab5, ns_b, QUIZ_ACTIVITY)) == before["b_quiz"] == 0
        and after_quiz_controls == 0
        and text_count(tab5, EXERCISE_NOTE) > 0,
        f"pressed: {pressed5}; quick check events under A {before['a_quiz']} -> "
        f"{len(activity_events_of(tab5, ns_a, QUIZ_ACTIVITY))}, under B {before['b_quiz']} -> "
        f"{len(activity_events_of(tab5, ns_b, QUIZ_ACTIVITY))}; heading controls left on screen: "
        f"{after_quiz_controls}; notice: {text_count(tab5, EXERCISE_NOTE)}",
    )
    shot(tab5, "72-deaf-quick-check-refused", QUIZ_PATH)

    a_copy_end = focus_copy_of(tab5, ns_a) or {}
    a_run_end = quiz_run_of(tab5, ns_a) or {}
    a_run_end_unit = ((a_run_end.get("units") or [{}])[0]) or {}
    write_row(
        "After the refused presses A's answers are still in A's own copies, unchecked, ready for A's next visit",
        (a_copy_end.get("answers") or {}) == (a_copy.get("answers") or {})
        and (a_run_end_unit.get("drafts") or [])[:3] == a_quiz_on_screen
        and a_run_end_unit.get("checked") is False,
        f"A's focused copy: {json.dumps(a_copy_end.get('answers'))}; A's quick check run, unit 1: "
        f"{json.dumps(a_run_end_unit)}",
    )

    tab3.wait_for_timeout(2500)
    remote_a = journey.settled_store_snapshot(a_id)
    remote_b = journey.settled_store_snapshot(b_id)
    remote_rows = [
        row.get("activity_id")
        for snapshot in (remote_a, remote_b)
        for row in snapshot.get("learning_events") or []
        if row.get("activity_id") in (FOCUS_ACTIVITY, QUIZ_ACTIVITY)
    ]
    write_row(
        "The stand-in holds no row for either activity, for A or for B: nothing was checked, so nothing was "
        "recorded or sent",
        not remote_rows,
        f"rows for {FOCUS_ACTIVITY} or {QUIZ_ACTIVITY} across A's and B's accounts: {json.dumps(remote_rows)}",
    )

    # ── A back once more: on the tabs that followed every change, a check
    #    records again, once, for A only, with the answers kept for A ──
    tab3.bring_to_front()
    journey.ws_sign_out(tab3)
    a_last = journey.ws_sign_in(tab3, EMAIL_A, PASSWORD_A)
    tab1.bring_to_front()
    tab1.wait_for_timeout(2500)
    ready_focus = focus_values(tab1) or []
    try:
        tab1.locator("button.focused-check").first.click(timeout=8000)
        checked1 = True
    except Exception:
        checked1 = False
    tab1.wait_for_timeout(1800)
    a_focus_events = activity_events_of(tab1, ns_a, FOCUS_ACTIVITY)
    a_focus_given = [
        item.get("firstAnswer") for item in ((a_focus_events[0].get("items") or []) if a_focus_events else [])
    ]
    write_row(
        "A signs back in; on the focused exercise tab that followed every change, A's check is recorded once, "
        "under A, with the answers kept for A, and nothing under B",
        a_last == a_id
        and ready_focus[:3] == A_FOCUS_ANSWERS
        and checked1
        and len(a_focus_events) == 1
        and [given for given in a_focus_given if given] == A_FOCUS_ANSWERS
        and not activity_events_of(tab1, ns_b, FOCUS_ACTIVITY)
        and focus_copy_of(tab1, ns_a) is None,
        f"A = {a_last}; controls before the press: {json.dumps(ready_focus)}; events under A: "
        f"{len(a_focus_events)}, first answers {json.dumps(a_focus_given)}; events under B: "
        f"{len(activity_events_of(tab1, ns_b, FOCUS_ACTIVITY))}; A's copy after the check: "
        f"{json.dumps(focus_copy_of(tab1, ns_a))}",
    )
    shot(tab1, "73-a-focused-check-recorded-for-a", FOCUS_PATH)

    tab2.bring_to_front()
    tab2.wait_for_timeout(1500)
    ready_quiz = (quiz_values(tab2) or [])[:3]
    try:
        button2 = tab2.get_by_role("button", name="Check answers").first
        button2.scroll_into_view_if_needed(timeout=8000)
        button2.click(timeout=8000)
        checked2 = True
    except Exception:
        checked2 = False
    tab2.wait_for_timeout(1800)
    a_quiz_events = activity_events_of(tab2, ns_a, QUIZ_ACTIVITY)
    a_quiz_given = [
        item.get("firstAnswer") for item in ((a_quiz_events[0].get("items") or []) if a_quiz_events else [])
    ]
    write_row(
        "On the quick check tab that followed every change, A's check of unit 1 is recorded once, under A, with "
        "the answers kept for A, and nothing under B",
        ready_quiz == a_quiz_on_screen
        and checked2
        and len(a_quiz_events) == 1
        and a_quiz_given[:3] == a_quiz_on_screen
        and not activity_events_of(tab2, ns_b, QUIZ_ACTIVITY),
        f"controls before the press: {json.dumps(ready_quiz)}; events under A: {len(a_quiz_events)}, first "
        f"answers {json.dumps(a_quiz_given)}; events under B: {len(activity_events_of(tab2, ns_b, QUIZ_ACTIVITY))}",
    )
    shot(tab2, "74-a-quick-check-recorded-for-a", QUIZ_PATH)

    tab3.wait_for_timeout(2500)
    remote_b_end = journey.settled_store_snapshot(b_id)
    remote_b_rows = [
        row.get("activity_id")
        for row in remote_b_end.get("learning_events") or []
        if row.get("activity_id") in (FOCUS_ACTIVITY, QUIZ_ACTIVITY)
    ]
    write_row(
        "The stand-in still holds no row for either activity on B's account",
        not remote_b_rows,
        f"rows for {FOCUS_ACTIVITY} or {QUIZ_ACTIVITY} on B's account: {json.dumps(remote_b_rows)}",
    )
    report_diagnostics("Step 21 (tab 1, focused exercise)", errors1, failed1)
    report_diagnostics("Step 21 (tab 2, quick check)", errors2, failed2)
    report_diagnostics("Step 21 (tab 3, accounts)", errors3, failed3)
    report_diagnostics("Step 21 (tab 4, deaf focused exercise)", errors4, failed4)
    report_diagnostics("Step 21 (tab 5, deaf quick check)", errors5, failed5)
    ctx.close()


# ── Tenth round: the last screens that recorded through the shared store ──

INLINE_PATH = "/lessons/reading/tfng"
INLINE_LESSON = "reading-tfng"
INLINE_ACTIVITY = f"check:lesson-quiz:{INLINE_LESSON}"
INLINE_RUN_SET = f"lesson-quiz:{INLINE_LESSON}:c0"
# A's answers to three of the four questions below. Nothing is checked for
# being right, only for whose it is.
INLINE_A = ["true", "false", "not given"]
VOCAB_TOPIC = "environment"
VOCAB_PATH = f"/review?topic={VOCAB_TOPIC}"
VOCAB_ACTIVITY = f"review:vocabulary:{VOCAB_TOPIC}"
VOCAB_STORE_BASE = "ielts.vocab.v1"
SPOKEN_ID = "speaking-part1-extend-an-answer"
SPOKEN_PATH = f"/trainers/speaking-focus/{SPOKEN_ID}"
SPOKEN_ACTIVITY = f"focus:{SPOKEN_ID}"
# The spoken task's OWN calm line (SPOKEN_TASK_OWNER_CHANGED_NOTE in
# src/components/learning/spoken-task-owner.ts). It replaced the exercises'
# "were kept" line on that screen, which was not true there: a recording in
# progress is dropped, never kept. Checking for the exercises' line would
# read zero on the real screen.
SPOKEN_NOTE = "The account on this page changed. Any recording on this screen was stopped and not kept."

# No lesson body on the site carries an inline quiz today (the reading
# lessons' quick quizzes were taken out of the bodies earlier in the
# project), but src/scripts/lesson-quiz.ts still runs on every lesson page
# and tools/scrape_ielts_materials.py still writes the markup it reads. So
# this script writes that markup (build_reading_quiz_html's shape, four
# SYNTHETIC True/False/Not Given statements) into a REAL lesson page, the
# moment the lesson body is parsed and before any of the page's own scripts
# run, exactly where the scraper would have put it. The page's own script
# then finds it on page load, as it would find a scraped one. Nothing in the
# site is changed.
INLINE_QUIZ_SCRIPT = """
(() => {
  const questions = [
    ['SYNTHETIC statement one about the passage.', 'true'],
    ['SYNTHETIC statement two about the passage.', 'false'],
    ['SYNTHETIC statement three about the passage.', 'not given'],
    ['SYNTHETIC statement four about the passage.', 'true'],
  ];
  const markup = () => {
    const items = questions.map(([text, answer], i) =>
      '<div class="quiz-item" data-answer="' + answer + '">' +
      '<span class="quiz-num">' + (i + 1) + '.</span>' +
      '<span class="quiz-q">' + text + '</span>' +
      '<select class="quiz-select"><option value="">-</option><option value="true">True</option>' +
      '<option value="false">False</option><option value="not given">Not Given</option></select>' +
      '</div>').join('');
    return '<div class="section" id="quiz"><div class="section-header"><div class="section-num">Q</div>' +
      '<div class="section-title-block"><div class="tag">Quick Quiz</div><h2>Practice Quiz</h2></div></div>' +
      '<div class="exercise-box" data-quiz="reading"><p class="quiz-h3">SYNTHETIC Reading Quiz</p>' + items +
      '<button class="quiz-check-btn">Check Answers</button><p class="quiz-score" hidden></p>' +
      '<p class="material-source">Source: SYNTHETIC, written by the test</p></div></div>';
  };
  const place = () => {
    if (document.querySelector('[data-quiz="reading"]')) return true;
    const body = document.querySelector('[data-lesson-body]');
    if (!body) return false;
    body.insertAdjacentHTML('afterbegin', markup());
    return true;
  };
  const watch = new MutationObserver(() => {
    if (place()) watch.disconnect();
  });
  watch.observe(document, { childList: true, subtree: true });
})();
"""

# Installed before any page script runs, in the spoken part only: records
# every microphone track the page is given and every recorder it starts, so
# the run can MEASURE that a recording stopped and the microphone was
# released rather than infer it from the screen. It changes nothing the page
# does. The same probe f23 uses.
SPOKEN_MEDIA_PROBE = """
(() => {
  const probe = { tracks: [], recorders: [] };
  window.__f22Media = probe;
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) {
    const original = md.getUserMedia.bind(md);
    md.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      stream.getTracks().forEach((track) => probe.tracks.push(track));
      return stream;
    };
  }
  const Recorder = window.MediaRecorder;
  if (Recorder) {
    const start = Recorder.prototype.start;
    Recorder.prototype.start = function (...args) { probe.recorders.push(this); return start.apply(this, args); };
  }
})();
"""


def inline_values(page):
    return journey.settle(
        page,
        lambda pg: pg.evaluate(
            "() => Array.from(document.querySelectorAll('[data-quiz=\"reading\"] select')).map((s) => s.value)"
        ),
    )


def inline_state(page):
    """The inline quiz as it stands on screen: answers, marks, the score
    line, the calm line and whether it can be used."""
    return journey.settle(
        page,
        lambda pg: pg.evaluate(
            """() => {
                const box = document.querySelector('[data-quiz="reading"]');
                if (!box) return null;
                const note = box.querySelector('.quiz-owner-note');
                const score = box.querySelector('.quiz-score');
                return {
                    values: Array.from(box.querySelectorAll('select')).map((s) => s.value),
                    marked: box.querySelectorAll('.quiz-correct, .quiz-wrong').length,
                    score: score && !score.hidden ? score.textContent : '',
                    note: note && !note.hidden ? note.textContent : '',
                    disabled: box.querySelector('.quiz-check-btn').disabled,
                };
            }"""
        ),
    )


def inline_answer(page, answers):
    selects = page.locator('[data-quiz="reading"] select.quiz-select')
    for index, value in enumerate(answers):
        selects.nth(index).scroll_into_view_if_needed(timeout=8000)
        selects.nth(index).select_option(value, timeout=8000)


def inline_check(page):
    button = page.locator('[data-quiz="reading"] .quiz-check-btn').first
    try:
        button.scroll_into_view_if_needed(timeout=8000)
        button.click(timeout=8000)
        return True
    except Exception:
        return False


def inline_run_of(page, namespace):
    return stored_json(page, f"{QUIZ_RUN_BASE}::{namespace}::{INLINE_RUN_SET}")


def vocab_cards_of(page, namespace):
    return (stored_json(page, f"{VOCAB_STORE_BASE}::{namespace}") or {}).get("cards") or {}


def open_vocab_practice(page):
    goto(page, VOCAB_PATH)
    page.wait_for_timeout(1800)
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Practise these words"),
        lambda: page.locator(".vocab-option").count() > 0,
    )
    page.wait_for_timeout(600)


def vocab_state(page):
    return journey.settle(
        page,
        lambda pg: pg.evaluate(
            """(note) => ({
                options: document.querySelectorAll('.vocab-option').length,
                progress: (document.querySelector('.vocab-progress') || {}).textContent || '',
                feedback: document.querySelectorAll('.vocab-feedback').length,
                answered: document.querySelectorAll('.vocab-option.is-right, .vocab-option.is-wrong').length,
                note: Array.from(document.querySelectorAll('[role="status"]')).some((el) => el.textContent.trim() === note),
            })""",
            EXERCISE_NOTE,
        ),
    )


def vocab_answer_one(page):
    """Answer the question on screen with its first option and go on. Returns
    the word the question was about (the option marked right afterwards)."""
    try:
        page.locator(".vocab-option").first.click(timeout=8000)
    except Exception:
        return None
    page.wait_for_timeout(500)
    right = page.locator(".vocab-option.is-right span")
    word = right.first.inner_text().strip() if right.count() else None
    try:
        page.locator(".vocab-next").first.click(timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(500)
    return word


def spoken_media(page):
    try:
        return page.evaluate(
            """() => {
                const probe = window.__f22Media || { tracks: [], recorders: [] };
                return {
                    tracks: probe.tracks.length,
                    liveTracks: probe.tracks.filter((t) => t.readyState === 'live').length,
                    recorders: probe.recorders.length,
                    activeRecorders: probe.recorders.filter((r) => r.state !== 'inactive').length,
                };
            }"""
        )
    except Exception:
        return {}


def spoken_screen(page):
    return {
        "recording": text_count(page, "Recording..."),
        "start": page.get_by_role("button", name="Start recording").count(),
        "audio": page.locator("audio.spoken-audio").count(),
        "done": page.get_by_role("button", name="Done for now").count(),
        "saved": text_count(page, "Recorded as practice."),
        "note": text_count(page, SPOKEN_NOTE),
    }


def spoken_record(page, stop=True):
    """Start a recording on the fake microphone, and stop it for listening
    back when `stop`. Returns whether each step reached its screen."""
    started = journey.try_click(page.get_by_role("button", name="Start recording"), timeout=8000)
    page.wait_for_timeout(1800)
    recording = text_count(page, "Recording...") > 0
    if not stop:
        return started and recording
    journey.try_click(page.get_by_role("button", name="Stop and listen back"), timeout=8000)
    page.wait_for_timeout(1800)
    return started and recording and page.locator("audio.spoken-audio").count() > 0


def run_last_screens_step(browser, a_id, b_id):
    """Step 22 (the inline lesson quiz, the vocabulary practice round and the
    spoken focused task belong to the student they were opened for), on a
    fresh browser for A, then B."""
    write_section(
        "Step 22 - The inline lesson quiz, the vocabulary practice round and the spoken task hand over when "
        "the account changes, and record only for the student whose work they are (the follow-up to R2B-01)",
        "Three more screens looked the owner up once and recorded through the shared learner store, which "
        "answers for whoever is signed in at the press: the quiz written into a lesson body, the vocabulary "
        "practice round, and the spoken focused task. Now each is bound to the student it was opened for: when "
        "the page changes hands it hands over (the outgoing student's work stays theirs, the screen shows the "
        "next student's own or nothing, with one calm line), a press for a student who is no longer here is "
        "refused and records nothing, and a recording under way is stopped and dropped. Tabs that hear nothing "
        "from the others stand in for tabs that missed the switch. No model or grader is called at any point: "
        "none of these screens asks for one. No lesson body carries an inline quiz today, so this step writes "
        "the scraper's quiz markup (four SYNTHETIC statements) into the real True/False/Not Given lesson page "
        "before the page's own script runs; the site itself is unchanged.",
    )
    ns_a = f"u:{a_id}"
    ns_b = f"u:{b_id}"
    ctx = new_context(browser)
    ctx.add_init_script(INLINE_QUIZ_SCRIPT)

    # ── Tab 3 is where the accounts change hands; A signs in there first ──
    tab3 = ctx.new_page()
    errors3, failed3 = attach_diagnostics(tab3)
    tab3.on("dialog", lambda dialog: dialog.accept())
    goto(tab3, "/dashboard")
    tab3.wait_for_timeout(1200)
    back = journey.ws_sign_in(tab3, EMAIL_A, PASSWORD_A)
    write_row("A is signed in on a fresh browser", back == a_id, f"signed in as {back}")

    # ── Tab 1: A answers three of four on the inline lesson quiz ──
    tab1 = ctx.new_page()
    errors1, failed1 = attach_diagnostics(tab1)
    goto(tab1, INLINE_PATH)
    tab1.wait_for_timeout(2400)
    try:
        inline_answer(tab1, INLINE_A)
    except Exception as error:
        write_note(f"**Diagnostic:** answering the inline quiz raised {type(error).__name__}.")
    tab1.wait_for_timeout(700)
    a_inline = inline_state(tab1) or {}
    write_row(
        "A answers three of the four questions of the inline quiz on the real True/False/Not Given lesson page; "
        "as it always has, the quiz keeps and records nothing before a check",
        (a_inline.get("values") or [])[:3] == INLINE_A
        and inline_run_of(tab1, ns_a) is None
        and not activity_events_of(tab1, ns_a, INLINE_ACTIVITY),
        f"on screen: {json.dumps(a_inline.get('values'))}; A's kept run: {json.dumps(inline_run_of(tab1, ns_a))}; "
        f"A's events for it: {len(activity_events_of(tab1, ns_a, INLINE_ACTIVITY))}",
    )
    shot(tab1, "75-a-inline-quiz-part-answered", INLINE_PATH)

    # ── Tab 2: A answers two questions of a vocabulary practice round ──
    tab2 = ctx.new_page()
    errors2, failed2 = attach_diagnostics(tab2)
    open_vocab_practice(tab2)
    a_words = [vocab_answer_one(tab2), vocab_answer_one(tab2)]
    a_cards = vocab_cards_of(tab2, ns_a)
    a_vocab_events = activity_events_of(tab2, ns_a, VOCAB_ACTIVITY)
    write_row(
        "A answers two questions of a vocabulary practice round, and each answer is written at its click into "
        "A's own review schedule and A's learner record",
        all(a_words)
        and all(word in a_cards for word in a_words)
        and len(a_vocab_events) == 2,
        f"A's words: {json.dumps(a_words)}; in A's schedule: {json.dumps(sorted(a_cards))}; A's events for "
        f"{VOCAB_ACTIVITY}: {len(a_vocab_events)}",
    )
    a_state = vocab_state(tab2) or {}
    shot(tab2, "76-a-vocab-round-part-answered", "/review")
    mark_page(tab1)
    mark_page(tab2)

    # ── Tab 3: A signs out and B signs in ──
    tab3.bring_to_front()
    journey.ws_sign_out(tab3)
    b_back = journey.ws_sign_in(tab3, EMAIL_B, PASSWORD_B)
    tab1.bring_to_front()
    tab1.wait_for_timeout(2500)
    reloaded_since(tab1, "tab 1 (A's inline quiz), after B signed in in tab 3")
    inline_now = inline_state(tab1) or {}
    write_row(
        "B signs in in another tab: A's inline quiz tab hands over, with one calm line and nothing of A's "
        "answers",
        b_back == b_id
        and not any(inline_now.get("values") or ["x"])
        and inline_now.get("note") == EXERCISE_NOTE
        and inline_now.get("marked") == 0,
        f"B = {b_back}; quiz now: {json.dumps(inline_now)}",
    )
    shot(tab1, "77-inline-quiz-handed-to-b", INLINE_PATH)
    a_run = inline_run_of(tab1, ns_a) or {}
    a_run_unit = ((a_run.get("units") or [{}])[0]) or {}
    write_row(
        "A's answers were kept for A at the hand-over, in A's own unfinished run of the quiz (unchecked), and "
        "nothing is kept or recorded under B",
        (a_run_unit.get("drafts") or [])[:3] == INLINE_A
        and a_run_unit.get("checked") is False
        and inline_run_of(tab1, ns_b) is None
        and not activity_events_of(tab1, ns_a, INLINE_ACTIVITY)
        and not activity_events_of(tab1, ns_b, INLINE_ACTIVITY),
        f"A's run, unit 1: {json.dumps(a_run_unit)}; B's run: {json.dumps(inline_run_of(tab1, ns_b))}; events "
        f"for it under A {len(activity_events_of(tab1, ns_a, INLINE_ACTIVITY))}, under B "
        f"{len(activity_events_of(tab1, ns_b, INLINE_ACTIVITY))}",
    )

    tab2.bring_to_front()
    tab2.wait_for_timeout(1500)
    reloaded_since(tab2, "tab 2 (A's vocabulary round), after B signed in in tab 3")
    vocab_now = vocab_state(tab2) or {}
    b_cards = vocab_cards_of(tab2, ns_b)
    # A's learner record leaves this device at A's sign-out (the account
    # layer's own sign-out on a shared machine, by design), so A's two
    # answers are checked where they now live, on A's account, further down.
    write_row(
        "A's vocabulary round tab hands over to a fresh round with the same calm line: A's answers and their "
        "feedback are gone from the screen, and none of A's words is in B's schedule or B's record",
        vocab_now.get("note") is True
        and vocab_now.get("answered") == 0
        and vocab_now.get("feedback") == 0
        and str(vocab_now.get("progress", "")).startswith("1 of")
        and not any(word in b_cards for word in a_words)
        and not activity_events_of(tab2, ns_b, VOCAB_ACTIVITY),
        f"before: {json.dumps(a_state)}; now: {json.dumps(vocab_now)}; B's schedule: {json.dumps(sorted(b_cards))}; "
        f"events under B {len(activity_events_of(tab2, ns_b, VOCAB_ACTIVITY))}",
    )
    shot(tab2, "78-vocab-round-handed-to-b", "/review")

    # ── B's own visits show nothing of A's ──
    tab3.bring_to_front()
    goto(tab3, INLINE_PATH)
    tab3.wait_for_timeout(2400)
    b_inline = inline_state(tab3) or {}
    shot(tab3, "79-b-own-inline-quiz-empty", INLINE_PATH)
    open_vocab_practice(tab3)
    b_vocab = vocab_state(tab3) or {}
    write_row(
        "B opening the same lesson quiz and the same practice round afresh finds nothing of A's",
        len(b_inline.get("values") or []) == 4
        and not any(b_inline.get("values") or ["x"])
        and b_inline.get("marked") == 0
        and b_vocab.get("answered") == 0
        and not any(word in vocab_cards_of(tab3, ns_b) for word in a_words),
        f"B's inline quiz: {json.dumps(b_inline)}; B's practice round: {json.dumps(b_vocab)}",
    )
    if b_inline.get("note") or b_vocab.get("note"):
        write_note(
            "**Diagnostic (not a failure of this step, and not caused by it):** B's own fresh page shows the calm "
            "line although nothing of A's is on it. Traced in this round: on a signed-in page load the account "
            "layer's startSyncForUser (src/lib/auth/sync.ts) calls stopSync first, which resets the owner to "
            "this device's anonymous owner, and then sets B again, so every screen bound to its owner hears two "
            "account changes (B, anonymous, B) when it mounts before the account layer has finished. It depends "
            "on timing, so it does not happen on every load. Nothing is written for anybody by it; the screen "
            "ends on B's own work. Reported to the lead."
        )
    shot(tab3, "80-b-own-vocab-round", "/review")

    # ── A signs back in: the open quiz tab finds A's answers again ──
    goto(tab3, "/dashboard")
    tab3.wait_for_timeout(1200)
    journey.ws_sign_out(tab3)
    a_again = journey.ws_sign_in(tab3, EMAIL_A, PASSWORD_A)
    tab1.bring_to_front()
    tab1.wait_for_timeout(2500)
    inline_back = inline_state(tab1) or {}
    tab2.bring_to_front()
    tab2.wait_for_timeout(1500)
    vocab_back = vocab_state(tab2) or {}
    write_row(
        "A signs back in: the open inline quiz tab shows A's own answers again, and the practice round tab "
        "hands over to a fresh round of A's own",
        a_again == a_id
        and (inline_back.get("values") or [])[:3] == INLINE_A
        and vocab_back.get("answered") == 0
        and vocab_back.get("note") is True
        and len(activity_events_of(tab2, ns_a, VOCAB_ACTIVITY)) == 2,
        f"A = {a_again}; inline quiz: {json.dumps(inline_back)}; practice round: {json.dumps(vocab_back)}",
    )
    shot(tab1, "81-a-back-inline-quiz-restored", INLINE_PATH)

    # ── Two tabs that hear nothing, open for A ──
    tab4 = ctx.new_page()
    errors4, failed4 = attach_diagnostics(tab4)
    tab4.add_init_script(DEAF_TAB_SCRIPT)
    goto(tab4, INLINE_PATH)
    tab4.wait_for_timeout(2400)
    tab5 = ctx.new_page()
    errors5, failed5 = attach_diagnostics(tab5)
    tab5.add_init_script(DEAF_TAB_SCRIPT)
    open_vocab_practice(tab5)
    deaf_inline = inline_state(tab4) or {}
    deaf_vocab = vocab_state(tab5) or {}
    write_row(
        "Two tabs that hear nothing from the others open the inline quiz (showing A's answers) and a practice "
        "round for A",
        (deaf_inline.get("values") or [])[:3] == INLINE_A and (deaf_vocab.get("options") or 0) > 0,
        f"deaf quiz tab: {json.dumps(deaf_inline)}; deaf practice tab: {json.dumps(deaf_vocab)}",
    )

    tab3.bring_to_front()
    journey.ws_sign_out(tab3)
    b_again = journey.ws_sign_in(tab3, EMAIL_B, PASSWORD_B)
    tab4.bring_to_front()
    tab4.wait_for_timeout(2000)
    session_now = auth_session(tab4) or {}
    still_inline = inline_state(tab4) or {}
    write_row(
        "B signs in again elsewhere; the deaf quiz tab misses it and still shows A's answers, while the session "
        "this browser holds is B's",
        b_again == b_id
        and session_now.get("user") == b_id
        and (still_inline.get("values") or [])[:3] == INLINE_A
        and still_inline.get("disabled") is False,
        f"B = {b_again}; stored session names {session_now.get('user')}; deaf quiz tab: {json.dumps(still_inline)}",
    )
    shot(tab4, "82-deaf-inline-quiz-still-shows-a", INLINE_PATH)
    mark_page(tab4)
    mark_page(tab5)

    before = {
        "a_inline": len(activity_events_of(tab4, ns_a, INLINE_ACTIVITY)),
        "b_inline": len(activity_events_of(tab4, ns_b, INLINE_ACTIVITY)),
        "a_vocab": len(activity_events_of(tab4, ns_a, VOCAB_ACTIVITY)),
        "b_vocab": len(activity_events_of(tab4, ns_b, VOCAB_ACTIVITY)),
    }
    a_cards_before = vocab_cards_of(tab4, ns_a)
    pressed4 = inline_check(tab4)
    tab4.wait_for_timeout(1500)
    reloaded_since(tab4, "the deaf quiz tab, after its press")
    refused_inline = inline_state(tab4) or {}
    a_run_end = inline_run_of(tab4, ns_a) or {}
    a_run_end_unit = ((a_run_end.get("units") or [{}])[0]) or {}
    write_row(
        "A check pressed in the deaf quiz tab is refused: nothing is recorded or marked for A or for B, A's "
        "answers leave that screen (the quiz is disabled until the tab hears), with the calm line, and stay in "
        "A's own run, unchecked",
        pressed4
        and len(activity_events_of(tab4, ns_a, INLINE_ACTIVITY)) == before["a_inline"] == 0
        and len(activity_events_of(tab4, ns_b, INLINE_ACTIVITY)) == before["b_inline"] == 0
        and not any(refused_inline.get("values") or ["x"])
        and refused_inline.get("marked") == 0
        and not refused_inline.get("score")
        and refused_inline.get("disabled") is True
        and refused_inline.get("note") == EXERCISE_NOTE
        and (a_run_end_unit.get("drafts") or [])[:3] == INLINE_A
        and a_run_end_unit.get("checked") is False,
        f"pressed: {pressed4}; quiz now: {json.dumps(refused_inline)}; events under A {before['a_inline']} -> "
        f"{len(activity_events_of(tab4, ns_a, INLINE_ACTIVITY))}, under B {before['b_inline']} -> "
        f"{len(activity_events_of(tab4, ns_b, INLINE_ACTIVITY))}; A's run, unit 1: {json.dumps(a_run_end_unit)}",
    )
    shot(tab4, "83-deaf-inline-quiz-check-refused", INLINE_PATH)

    tab5.bring_to_front()
    tab5.wait_for_timeout(800)
    try:
        tab5.locator(".vocab-option").first.click(timeout=8000)
        pressed5 = True
    except Exception:
        pressed5 = False
    tab5.wait_for_timeout(1500)
    reloaded_since(tab5, "the deaf practice tab, after its click")
    refused_vocab = vocab_state(tab5) or {}
    write_row(
        "An answer clicked in the deaf practice tab is refused the same way: nothing is written to either "
        "student's schedule or record, and the round leaves that screen with the calm line",
        pressed5
        and vocab_cards_of(tab5, ns_a) == a_cards_before
        and not vocab_cards_of(tab5, ns_b)
        and len(activity_events_of(tab5, ns_a, VOCAB_ACTIVITY)) == before["a_vocab"]
        and len(activity_events_of(tab5, ns_b, VOCAB_ACTIVITY)) == before["b_vocab"] == 0
        and refused_vocab.get("options") == 0
        and refused_vocab.get("note") is True,
        f"clicked: {pressed5}; practice tab now: {json.dumps(refused_vocab)}; A's schedule unchanged: "
        f"{vocab_cards_of(tab5, ns_a) == a_cards_before}; B's schedule: {json.dumps(sorted(vocab_cards_of(tab5, ns_b)))}; "
        f"events under A {before['a_vocab']} -> {len(activity_events_of(tab5, ns_a, VOCAB_ACTIVITY))}, under B "
        f"{before['b_vocab']} -> {len(activity_events_of(tab5, ns_b, VOCAB_ACTIVITY))}",
    )
    shot(tab5, "84-deaf-vocab-click-refused", "/review")

    tab3.wait_for_timeout(2500)
    remote_a = journey.settled_store_snapshot(a_id)
    remote_b = journey.settled_store_snapshot(b_id)
    rows_a = [row.get("activity_id") for row in remote_a.get("learning_events") or []]
    rows_b = [row.get("activity_id") for row in remote_b.get("learning_events") or []]
    b_dump = json.dumps(remote_b, separators=(",", ":"))
    a_words_on_b = [word for word in a_words if word and ('"' + word + '"') in b_dump]
    write_row(
        "The stand-in holds no inline quiz row for anybody, A's two vocabulary answers only on A's account, and "
        "nothing of A's vocabulary round anywhere on B's",
        INLINE_ACTIVITY not in rows_a
        and INLINE_ACTIVITY not in rows_b
        and rows_a.count(VOCAB_ACTIVITY) == 2
        and VOCAB_ACTIVITY not in rows_b
        and not a_words_on_b,
        f"A's rows for the quiz {rows_a.count(INLINE_ACTIVITY)}, for the round {rows_a.count(VOCAB_ACTIVITY)}; "
        f"B's rows for the quiz {rows_b.count(INLINE_ACTIVITY)}, for the round {rows_b.count(VOCAB_ACTIVITY)}; "
        f"A's words anywhere in what the stand-in holds for B: {json.dumps(a_words_on_b)}",
    )

    # ── A back once more: on the tabs that followed every change, a check
    #    and an answer are recorded again, for A only ──
    tab3.bring_to_front()
    journey.ws_sign_out(tab3)
    a_last = journey.ws_sign_in(tab3, EMAIL_A, PASSWORD_A)
    tab1.bring_to_front()
    tab1.wait_for_timeout(2500)
    ready_inline = inline_state(tab1) or {}
    checked1 = inline_check(tab1)
    tab1.wait_for_timeout(1500)
    done_inline = inline_state(tab1) or {}
    a_inline_events = activity_events_of(tab1, ns_a, INLINE_ACTIVITY)
    a_inline_given = [item.get("firstAnswer") for item in ((a_inline_events[0].get("items") or []) if a_inline_events else [])]
    write_row(
        "A signs back in; on the quiz tab that followed every change, A's check is recorded once, under A, with "
        "the answers kept for A, and marked as it always was; nothing under B",
        a_last == a_id
        and (ready_inline.get("values") or [])[:3] == INLINE_A
        and checked1
        and len(a_inline_events) == 1
        and a_inline_given == INLINE_A
        and done_inline.get("marked") == 3
        and done_inline.get("score") == "3 / 4 correct"
        and not activity_events_of(tab1, ns_b, INLINE_ACTIVITY),
        f"A = {a_last}; before the press: {json.dumps(ready_inline)}; after: {json.dumps(done_inline)}; events "
        f"under A: {len(a_inline_events)}, first answers {json.dumps(a_inline_given)}; events under B: "
        f"{len(activity_events_of(tab1, ns_b, INLINE_ACTIVITY))}",
    )
    shot(tab1, "85-a-inline-quiz-recorded-for-a", INLINE_PATH)

    tab2.bring_to_front()
    tab2.wait_for_timeout(1500)
    a_third = vocab_answer_one(tab2)
    write_row(
        "On the practice tab that followed every change, A's next answer is written once, under A, and nothing "
        "under B",
        bool(a_third)
        and len(activity_events_of(tab2, ns_a, VOCAB_ACTIVITY)) == 3
        and not activity_events_of(tab2, ns_b, VOCAB_ACTIVITY)
        and a_third in vocab_cards_of(tab2, ns_a),
        f"A's word: {a_third}; events under A {len(activity_events_of(tab2, ns_a, VOCAB_ACTIVITY))}, under B "
        f"{len(activity_events_of(tab2, ns_b, VOCAB_ACTIVITY))}",
    )
    report_diagnostics("Step 22 (tab 1, inline quiz)", errors1, failed1)
    report_diagnostics("Step 22 (tab 2, practice round)", errors2, failed2)
    report_diagnostics("Step 22 (tab 3, accounts)", errors3, failed3)
    report_diagnostics("Step 22 (tab 4, deaf inline quiz)", errors4, failed4)
    report_diagnostics("Step 22 (tab 5, deaf practice round)", errors5, failed5)
    ctx.close()

    run_spoken_switch_part(browser, a_id, b_id)


def run_spoken_switch_part(browser, a_id, b_id):
    """Step 22, the spoken task: a recording under way when the page changes
    hands, and "Done for now" from a tab that missed it. Needs a browser with
    Chromium's FAKE microphone (a test tone, no real voice), so it launches
    one of its own beside the run's browser, the way f23 does."""
    ns_a = f"u:{a_id}"
    ns_b = f"u:{b_id}"
    try:
        fake = browser.browser_type.launch(
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
        )
    except Exception as error:
        write_row(
            "A browser with the fake microphone starts for the spoken task",
            False,
            f"{type(error).__name__}: the spoken task's checks were not run",
        )
        return
    try:
        ctx = new_context(fake)
        ctx.add_init_script(SPOKEN_MEDIA_PROBE)
        tab3 = ctx.new_page()
        errors3, failed3 = attach_diagnostics(tab3)
        tab3.on("dialog", lambda dialog: dialog.accept())
        goto(tab3, "/dashboard")
        tab3.wait_for_timeout(1200)
        back = journey.ws_sign_in(tab3, EMAIL_A, PASSWORD_A)

        tab1 = ctx.new_page()
        errors1, failed1 = attach_diagnostics(tab1)
        goto(tab1, SPOKEN_PATH)
        tab1.wait_for_timeout(2200)
        recording = spoken_record(tab1, stop=False)
        media_before = spoken_media(tab1)
        write_row(
            "A opens the spoken task (a browser with the fake microphone) and is recording an answer",
            back == a_id
            and recording
            and media_before.get("liveTracks", 0) >= 1
            and media_before.get("activeRecorders", 0) >= 1,
            f"A = {back}; recording on screen: {recording}; microphone and recorder: {json.dumps(media_before)}",
        )
        shot(tab1, "86-a-spoken-task-recording", SPOKEN_PATH)
        mark_page(tab1)

        tab3.bring_to_front()
        journey.ws_sign_out(tab3)
        b_back = journey.ws_sign_in(tab3, EMAIL_B, PASSWORD_B)
        tab1.bring_to_front()
        tab1.wait_for_timeout(2500)
        reloaded_since(tab1, "tab 1 (A's spoken task), after B signed in in tab 3")
        media_after = spoken_media(tab1)
        screen_after = spoken_screen(tab1)
        write_row(
            "B signs in in another tab: A's recording is stopped and dropped (the recorder stopped, the "
            "microphone released), nothing is played back, and the task hands over empty with the calm line",
            b_back == b_id
            and media_after.get("liveTracks") == 0
            and media_after.get("activeRecorders") == 0
            and screen_after["recording"] == 0
            and screen_after["audio"] == 0
            and screen_after["start"] == 1
            and screen_after["note"] > 0,
            f"B = {b_back}; microphone and recorder: {json.dumps(media_after)}; screen: {json.dumps(screen_after)}",
        )
        shot(tab1, "87-spoken-task-handed-to-b", SPOKEN_PATH)
        write_row(
            "Nothing of A's recording is recorded for anybody",
            not activity_events_of(tab1, ns_a, SPOKEN_ACTIVITY) and not activity_events_of(tab1, ns_b, SPOKEN_ACTIVITY),
            f"events for {SPOKEN_ACTIVITY} under A {len(activity_events_of(tab1, ns_a, SPOKEN_ACTIVITY))}, under B "
            f"{len(activity_events_of(tab1, ns_b, SPOKEN_ACTIVITY))}",
        )

        # ── A back; a tab that hears nothing records and listens back ──
        tab3.bring_to_front()
        journey.ws_sign_out(tab3)
        a_again = journey.ws_sign_in(tab3, EMAIL_A, PASSWORD_A)
        tab4 = ctx.new_page()
        errors4, failed4 = attach_diagnostics(tab4)
        tab4.add_init_script(DEAF_TAB_SCRIPT)
        goto(tab4, SPOKEN_PATH)
        tab4.wait_for_timeout(2200)
        listened = spoken_record(tab4, stop=True)
        write_row(
            "A signs back in; a tab that hears nothing from the others records an answer and listens back",
            a_again == a_id and listened and spoken_screen(tab4)["done"] == 1,
            f"A = {a_again}; listening back: {listened}; screen: {json.dumps(spoken_screen(tab4))}",
        )
        tab3.bring_to_front()
        journey.ws_sign_out(tab3)
        b_again = journey.ws_sign_in(tab3, EMAIL_B, PASSWORD_B)
        tab4.bring_to_front()
        tab4.wait_for_timeout(1500)
        session_now = auth_session(tab4) or {}
        missed = spoken_screen(tab4)
        mark_page(tab4)
        pressed = journey.try_click(tab4.get_by_role("button", name="Done for now"), timeout=8000)
        tab4.wait_for_timeout(1500)
        reloaded_since(tab4, "the deaf spoken tab, after its press")
        refused = spoken_screen(tab4)
        write_row(
            "B signs in again elsewhere; the deaf tab still shows A's recording, and its \"Done for now\" is "
            "refused: nothing recorded for A or B, and the recording leaves that screen with the calm line",
            b_again == b_id
            and session_now.get("user") == b_id
            and missed["audio"] == 1
            and missed["done"] == 1
            and pressed
            and refused["audio"] == 0
            and refused["saved"] == 0
            and refused["note"] > 0
            and not activity_events_of(tab4, ns_a, SPOKEN_ACTIVITY)
            and not activity_events_of(tab4, ns_b, SPOKEN_ACTIVITY),
            f"B = {b_again}; stored session names {session_now.get('user')}; before the press: {json.dumps(missed)}; "
            f"after: {json.dumps(refused)}; events under A {len(activity_events_of(tab4, ns_a, SPOKEN_ACTIVITY))}, "
            f"under B {len(activity_events_of(tab4, ns_b, SPOKEN_ACTIVITY))}",
        )
        shot(tab4, "88-deaf-spoken-done-refused", SPOKEN_PATH)

        # ── A back once more: the tab that followed every change records for A ──
        tab3.bring_to_front()
        journey.ws_sign_out(tab3)
        a_last = journey.ws_sign_in(tab3, EMAIL_A, PASSWORD_A)
        tab1.bring_to_front()
        tab1.wait_for_timeout(2500)
        listened1 = spoken_record(tab1, stop=True)
        done1 = journey.try_click(tab1.get_by_role("button", name="Done for now"), timeout=8000)
        tab1.wait_for_timeout(1500)
        a_events = activity_events_of(tab1, ns_a, SPOKEN_ACTIVITY)
        write_row(
            "A signs back in; on the tab that followed every change, A records, listens back and presses \"Done "
            "for now\": recorded once, under A, as practice (never a grade), and nothing under B",
            a_last == a_id
            and listened1
            and done1
            and spoken_screen(tab1)["saved"] == 1
            and len(a_events) == 1
            and ((a_events[0].get("outcome") or {}).get("kind") == "studied")
            and not activity_events_of(tab1, ns_b, SPOKEN_ACTIVITY),
            f"A = {a_last}; listened back: {listened1}; pressed: {done1}; events under A: {len(a_events)} "
            f"({json.dumps([(e.get('outcome') or {}).get('kind') for e in a_events])}); under B: "
            f"{len(activity_events_of(tab1, ns_b, SPOKEN_ACTIVITY))}",
        )
        shot(tab1, "89-a-spoken-recorded-for-a", SPOKEN_PATH)
        tab3.wait_for_timeout(2500)
        remote_b = journey.settled_store_snapshot(b_id)
        remote_a = journey.settled_store_snapshot(a_id)
        write_row(
            "The stand-in holds the spoken practice once on A's account and never on B's",
            [row.get("activity_id") for row in remote_a.get("learning_events") or []].count(SPOKEN_ACTIVITY) == 1
            and SPOKEN_ACTIVITY not in [row.get("activity_id") for row in remote_b.get("learning_events") or []],
            f"A's rows for it: {[row.get('activity_id') for row in remote_a.get('learning_events') or []].count(SPOKEN_ACTIVITY)}; "
            f"B's rows for it: {[row.get('activity_id') for row in remote_b.get('learning_events') or []].count(SPOKEN_ACTIVITY)}",
        )
        report_diagnostics("Step 22 (spoken, tab 1)", errors1, failed1)
        report_diagnostics("Step 22 (spoken, tab 3, accounts)", errors3, failed3)
        report_diagnostics("Step 22 (spoken, tab 4, deaf)", errors4, failed4)
        ctx.close()
    finally:
        fake.close()


# ── Eleventh round: the sixth Codex inspection (R2F-01, R2F-02) ──────────────

# Installed before any page script runs, in step 23a only. It counts every
# microphone track the page is given and every recorder it starts (as the
# step 22 probe does), and it HOLDS every microphone request: the browser's
# own getUserMedia is not even called until the test answers, which is what
# an open permission prompt looks like to the page. __f22ReleaseMic() answers
# every request waiting. It changes nothing else the page does.
HELD_MIC_PROBE = """
(() => {
  const probe = { tracks: [], recorders: [], calls: 0, waiting: [] };
  window.__f22Media = probe;
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) {
    const original = md.getUserMedia.bind(md);
    md.getUserMedia = (constraints) => {
      probe.calls += 1;
      return new Promise((resolve, reject) => {
        probe.waiting.push(() => original(constraints).then((stream) => {
          stream.getTracks().forEach((track) => probe.tracks.push(track));
          resolve(stream);
        }, reject));
      });
    };
  }
  window.__f22ReleaseMic = () => {
    const answering = probe.waiting.splice(0);
    answering.forEach((answer) => answer());
    return answering.length;
  };
  const Recorder = window.MediaRecorder;
  if (Recorder) {
    const start = Recorder.prototype.start;
    Recorder.prototype.start = function (...args) { probe.recorders.push(this); return start.apply(this, args); };
  }
})();
"""

WRITTEN_X_23 = (
    "SYNTHETIC overview by student A for step 23: coal use halved over the period, "
    "while solar and wind rose to lead by the end."
)
WRITTEN_Y_23 = (
    "SYNTHETIC revision by student A, written after coming back: coal use fell by half, "
    "and renewables overtook it in the final year."
)


def held_mic(page):
    """The microphone requests the page made, and how many still wait."""
    try:
        return page.evaluate(
            "() => { const p = window.__f22Media || {}; return { calls: p.calls || 0, waiting: (p.waiting || []).length }; }"
        )
    except Exception:
        return {}


def release_mic(page):
    try:
        return page.evaluate("() => window.__f22ReleaseMic ? window.__f22ReleaseMic() : -1")
    except Exception:
        return -1


def press_start_twice(page):
    """Two real clicks on Start, a moment apart, while the prompt is held.
    The button stays on screen while the page waits for the microphone, so
    both clicks land on it."""
    button = page.get_by_role("button", name="Start recording")
    pressed = 0
    for _ in range(2):
        try:
            button.first.click(timeout=8000)
            pressed += 1
        except Exception:
            pass
        page.wait_for_timeout(400)
    return pressed


def remote_activity_count(user_id, activity):
    rows = journey.settled_store_snapshot(user_id).get("learning_events") or []
    return [row.get("activity_id") for row in rows].count(activity)


def wait_for_box(page, expected, attempts=16, delay=500):
    for _ in range(attempts):
        if answer_box_value(page) == expected:
            return True
        page.wait_for_timeout(delay)
    return answer_box_value(page) == expected


def run_sixth_inspection_step(browser, a_id, b_id):
    """Step 23 (R2F-01 and R2F-02)."""
    write_section(
        "Step 23 - One microphone take at a time, and a late evaluation never replaces a newer draft "
        "(the sixth Codex inspection, R2F-01 and R2F-02)",
        "R2F-01: Start pressed twice while the microphone prompt was still open used to start two recordings, and "
        "an account change stopped only the second, leaving the first capturing behind the emptied screen. Now a "
        "press while the prompt is open does nothing, a microphone that arrives for a take no longer on screen is "
        "released at once, and an account change stops every recorder and ends every track. Here the prompt is "
        "held by this script (the browser's microphone request waits until the test answers it), on Chromium's "
        "fake microphone (a test tone, no real voice). R2F-02: an evaluation that came back late used to put the "
        "submitted words back in the draft over a revision written after the student came back, so a reload lost "
        "the revision. Now it only adds the attempt to the history. Here the evaluation request is held on its "
        "way (routed to this script) and released with a SYNTHETIC reply written here, labelled simulated. No "
        "model is called, and the stand-in never sees the evaluation request.",
    )
    run_held_microphone_part(browser, a_id, b_id)
    run_late_evaluation_part(browser, a_id, b_id)


def run_held_microphone_part(browser, a_id, b_id):
    """Step 23a, R2F-01."""
    ns_a = f"u:{a_id}"
    ns_b = f"u:{b_id}"
    try:
        fake = browser.browser_type.launch(
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
        )
    except Exception as error:
        write_row(
            "A browser with the fake microphone starts for step 23a",
            False,
            f"{type(error).__name__}: the held-microphone checks were not run",
        )
        return
    try:
        remote_a_before = remote_activity_count(a_id, SPOKEN_ACTIVITY)
        remote_b_before = remote_activity_count(b_id, SPOKEN_ACTIVITY)
        ctx = new_context(fake)
        ctx.add_init_script(HELD_MIC_PROBE)
        tab3 = ctx.new_page()
        errors3, failed3 = attach_diagnostics(tab3)
        tab3.on("dialog", lambda dialog: dialog.accept())
        goto(tab3, "/dashboard")
        tab3.wait_for_timeout(1200)
        back = journey.ws_sign_in(tab3, EMAIL_A, PASSWORD_A)

        tab1 = ctx.new_page()
        errors1, failed1 = attach_diagnostics(tab1)
        goto(tab1, SPOKEN_PATH)
        tab1.wait_for_timeout(2200)
        mark_page(tab1)

        # ── Two presses while the prompt is held ──
        pressed = press_start_twice(tab1)
        tab1.wait_for_timeout(800)
        asked = held_mic(tab1)
        write_row(
            "A presses Start twice while the microphone prompt is still open (held by this test): the page asks "
            "for the microphone once, and nothing records yet",
            back == a_id
            and pressed == 2
            and asked.get("calls") == 1
            and asked.get("waiting") == 1
            and spoken_media(tab1).get("recorders") == 0,
            f"A = {back}; presses that landed: {pressed}; microphone requests: {json.dumps(asked)}; "
            f"microphone and recorder: {json.dumps(spoken_media(tab1))}",
        )
        answered = release_mic(tab1)
        tab1.wait_for_timeout(1800)
        media_live = spoken_media(tab1)
        write_row(
            "The prompt is answered: one recorder runs, on one microphone",
            answered == 1
            and text_count(tab1, "Recording...") > 0
            and media_live.get("tracks") == 1
            and media_live.get("liveTracks") == 1
            and media_live.get("recorders") == 1
            and media_live.get("activeRecorders") == 1,
            f"requests answered: {answered}; recording on screen: {text_count(tab1, 'Recording...') > 0}; "
            f"microphone and recorder: {json.dumps(media_live)}",
        )
        shot(tab1, "90-one-take-after-two-presses", SPOKEN_PATH)

        # ── The account changes in another tab ──
        tab3.bring_to_front()
        journey.ws_sign_out(tab3)
        b_back = journey.ws_sign_in(tab3, EMAIL_B, PASSWORD_B)
        tab1.bring_to_front()
        tab1.wait_for_timeout(2500)
        reloaded_since(tab1, "tab 1 (A's spoken task, two presses), after B signed in in tab 3")
        media_after = spoken_media(tab1)
        screen_after = spoken_screen(tab1)
        write_row(
            "B signs in in another tab: every recorder the page started is stopped and every microphone track it "
            "was given has ended, and the task hands over empty with the spoken task's calm line",
            b_back == b_id
            and media_after.get("tracks", 0) >= 1
            and media_after.get("liveTracks") == 0
            and media_after.get("recorders", 0) >= 1
            and media_after.get("activeRecorders") == 0
            and screen_after["recording"] == 0
            and screen_after["audio"] == 0
            and screen_after["start"] == 1
            and screen_after["note"] > 0,
            f"B = {b_back}; microphone and recorder: {json.dumps(media_after)}; screen: {json.dumps(screen_after)}",
        )
        shot(tab1, "91-every-take-stopped-after-switch", SPOKEN_PATH)

        # ── Two more held presses, and the account changes before the answer ──
        before_second = held_mic(tab1)
        recorders_before = spoken_media(tab1).get("recorders", 0)
        pressed_again = press_start_twice(tab1)
        tab1.wait_for_timeout(800)
        asked_again = held_mic(tab1)
        tab3.bring_to_front()
        journey.ws_sign_out(tab3)
        a_again = journey.ws_sign_in(tab3, EMAIL_A, PASSWORD_A)
        tab1.bring_to_front()
        tab1.wait_for_timeout(2500)
        answered_late = release_mic(tab1)
        tab1.wait_for_timeout(2000)
        media_late = spoken_media(tab1)
        screen_late = spoken_screen(tab1)
        write_row(
            "B presses Start twice while the prompt is held, and the account changes back to A before it is "
            "answered: the page asked once, and when the prompt is answered the late microphone is released at "
            "once and no recorder starts",
            a_again == a_id
            and pressed_again == 2
            and asked_again.get("calls", 0) - before_second.get("calls", 0) == 1
            and answered_late == 1
            and media_late.get("tracks", 0) >= 2
            and media_late.get("liveTracks") == 0
            and media_late.get("recorders") == recorders_before
            and media_late.get("activeRecorders") == 0
            and screen_late["recording"] == 0
            and screen_late["start"] == 1,
            f"A = {a_again}; presses that landed: {pressed_again}; microphone requests before and after: "
            f"{json.dumps(before_second)} then {json.dumps(asked_again)}; requests answered late: {answered_late}; "
            f"microphone and recorder: {json.dumps(media_late)}; screen: {json.dumps(screen_late)}",
        )
        shot(tab1, "92-late-microphone-released", SPOKEN_PATH)

        tab3.wait_for_timeout(2500)
        remote_a_after = remote_activity_count(a_id, SPOKEN_ACTIVITY)
        remote_b_after = remote_activity_count(b_id, SPOKEN_ACTIVITY)
        write_row(
            "Nothing of any of these takes is recorded for anybody: the stand-in's spoken practice rows for A and "
            "B are what they were before this step, and neither local record gained one",
            remote_a_after == remote_a_before
            and remote_b_after == remote_b_before
            and len(activity_events_of(tab1, ns_b, SPOKEN_ACTIVITY)) == 0,
            f"A's rows for it before and after: {remote_a_before} then {remote_a_after}; B's: {remote_b_before} then "
            f"{remote_b_after}; B's local events for it: {len(activity_events_of(tab1, ns_b, SPOKEN_ACTIVITY))}; "
            f"A's local events for it (A's earlier practice from step 22 may be pulled in from the account): "
            f"{len(activity_events_of(tab1, ns_a, SPOKEN_ACTIVITY))}",
        )
        report_diagnostics("Step 23a (spoken, tab 1)", errors1, failed1)
        report_diagnostics("Step 23a (spoken, tab 3, accounts)", errors3, failed3)
        ctx.close()
    finally:
        fake.close()


def run_late_evaluation_part(browser, a_id, b_id):
    """Step 23b, R2F-02."""
    ns_a = f"u:{a_id}"
    ns_b = f"u:{b_id}"
    ctx = new_context(browser)
    tab1 = ctx.new_page()
    errors1, failed1 = attach_diagnostics(tab1)
    tab1.on("dialog", lambda dialog: dialog.accept())
    held = hold_evaluation_requests(tab1)
    goto(tab1, "/dashboard")
    tab1.wait_for_timeout(1200)
    back = journey.ws_sign_in(tab1, EMAIL_A, PASSWORD_A)

    goto(tab1, EVAL_PATH)
    tab1.wait_for_timeout(1500)
    box = tab1.locator("#written-answer")
    typed = False
    try:
        box.first.click(timeout=8000)
        box.first.fill(WRITTEN_X_23, timeout=8000)
        typed = True
    except Exception:
        typed = False
    tab1.wait_for_timeout(1200)
    journey.click_until(
        tab1,
        lambda: tab1.locator("button.focused-check"),
        lambda: len(held) > 0,
    )
    got = wait_for_held(tab1, held, 1)
    tab1.wait_for_timeout(600)
    a_session = auth_session(tab1) or {}
    write_row(
        "A writes X on the guided written task and presses Check: the evaluation goes out once, with A's token "
        "and A's words, and is held on its way",
        back == a_id
        and typed
        and got
        and len(held) == 1
        and held[0]["auth"] == f"Bearer {a_session.get('token')}"
        and held[0]["submission"] == WRITTEN_X_23,
        f"A = {back}; typed: {typed}; evaluation requests held: {len(held)}; carries X: "
        f"{bool(held) and held[0]['submission'] == WRITTEN_X_23}",
    )
    mark_page(tab1)

    # ── Away to B and back to A, in a second tab ──
    tab2 = ctx.new_page()
    errors2, failed2 = attach_diagnostics(tab2)
    tab2.on("dialog", lambda dialog: dialog.accept())
    goto(tab2, "/dashboard")
    tab2.wait_for_timeout(1500)
    journey.ws_sign_out(tab2)
    b_back = journey.ws_sign_in(tab2, EMAIL_B, PASSWORD_B)
    tab1.bring_to_front()
    tab1.wait_for_timeout(2000)
    box_for_b = answer_box_value(tab1)
    tab2.bring_to_front()
    journey.ws_sign_out(tab2)
    a_back = journey.ws_sign_in(tab2, EMAIL_A, PASSWORD_A)
    tab1.bring_to_front()
    tab1.wait_for_timeout(2000)
    reloaded_since(tab1, "tab 1 (A's written task), after B and then A signed in in tab 2")
    x_back = wait_for_box(tab1, WRITTEN_X_23)
    write_row(
        "A signs out and B in, then B out and A back in, in a second tab, while X is still being evaluated: the "
        "first tab showed B an empty task, and is A's again with X in the box and the calm line",
        b_back == b_id
        and a_back == a_id
        and box_for_b == ""
        and x_back
        and text_count(tab1, EVAL_NOTE) > 0
        and len(held) == 1,
        f"B = {b_back}; box while B was here: {json.dumps(box_for_b)}; A = {a_back}; X back in the box: {x_back}; "
        f"the notice: {text_count(tab1, EVAL_NOTE)}; evaluation requests held: {len(held)}",
    )
    shot(tab1, "93-a-back-with-x-while-evaluation-held", EVAL_PATH)

    # ── A writes revision Y and it autosaves ──
    revised = False
    try:
        box.first.click(timeout=8000)
        box.first.fill(WRITTEN_Y_23, timeout=8000)
        revised = True
    except Exception:
        revised = False
    tab1.wait_for_timeout(1500)
    draft_before = written_draft_of(tab1, ns_a) or {}
    attempts_before = [attempt.get("text") for attempt in (draft_before.get("attempts") or [])]
    write_row(
        "A writes revision Y in the first tab and it autosaves: A's stored draft holds Y, and X is not yet in "
        "the attempt history",
        revised and draft_before.get("draft") == WRITTEN_Y_23 and WRITTEN_X_23 not in attempts_before,
        f"typed: {revised}; stored draft: {json.dumps(draft_before.get('draft'))}; attempts: {json.dumps(attempts_before)}",
    )

    # ── The held evaluation comes back, late ──
    events_before = [
        ((event.get("items") or [{}])[0] or {}).get("firstAnswer") for event in evaluation_events_of(tab1, ns_a)
    ]
    if held:
        held[0]["route"].fulfill(
            status=200,
            headers={"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            body=synthetic_evaluation_reply(),
        )
    tab1.wait_for_timeout(2500)
    draft_after = written_draft_of(tab1, ns_a) or {}
    attempts_after = [attempt.get("text") for attempt in (draft_after.get("attempts") or [])]
    write_row(
        "The held evaluation of X is released with a SYNTHETIC reply (labelled simulated): A's stored draft still "
        "holds Y, and X is added to A's attempt history",
        draft_after.get("draft") == WRITTEN_Y_23
        and attempts_after[-1:] == [WRITTEN_X_23]
        and answer_box_value(tab1) == WRITTEN_Y_23,
        f"stored draft: {json.dumps(draft_after.get('draft'))}; attempts: {json.dumps(attempts_after)}; box on "
        f"screen: {json.dumps(answer_box_value(tab1))}; the late verdict on the page: "
        f"{text_count(tab1, EVAL_OBSERVATION_A)}",
    )

    # ── Reload ──
    try:
        tab1.reload()
    except Exception:
        pass
    tab1.wait_for_timeout(2500)
    y_on_screen = wait_for_box(tab1, WRITTEN_Y_23)
    draft_reloaded = written_draft_of(tab1, ns_a) or {}
    attempts_reloaded = [attempt.get("text") for attempt in (draft_reloaded.get("attempts") or [])]
    write_row(
        "After a reload the revision Y is what is on screen, and the submitted X is in A's attempt history",
        y_on_screen and WRITTEN_X_23 in attempts_reloaded and draft_reloaded.get("draft") == WRITTEN_Y_23,
        f"box after the reload: {json.dumps(answer_box_value(tab1))}; stored draft: "
        f"{json.dumps(draft_reloaded.get('draft'))}; attempts: {json.dumps(attempts_reloaded)}",
    )
    shot(tab1, "94-revision-survives-reload", EVAL_PATH)

    events_after = [
        ((event.get("items") or [{}])[0] or {}).get("firstAnswer") for event in evaluation_events_of(tab1, ns_a)
    ]
    b_events = evaluation_events_of(tab1, ns_b)
    holding_x = keys_holding(tab1, WRITTEN_X_23)
    holding_y = keys_holding(tab1, WRITTEN_Y_23)
    write_row(
        "X is recorded once, in A's own learner record; nothing of X or Y is under B",
        events_after.count(WRITTEN_X_23) - events_before.count(WRITTEN_X_23) == 1
        and not [event for event in b_events if WRITTEN_X_23 in json.dumps(event)]
        and not [key for key in holding_x + holding_y if ns_b in key],
        f"A's events for this task carrying X, before and after: {events_before.count(WRITTEN_X_23)} then "
        f"{events_after.count(WRITTEN_X_23)}; B's events for this task: {len(b_events)}; keys holding X: "
        f"{holding_x}; keys holding Y: {holding_y}",
    )
    report_diagnostics("Step 23b (tab 1)", errors1, failed1)
    report_diagnostics("Step 23b (tab 2)", errors2, failed2)
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
        "(a mock's papers are kept inside their own sitting, apart from standalone papers). "
        "Steps 13 and 14 are the fourth: R2C-02 (a mock left open in one tab never overwrites or "
        "removes a fresh one started in another, and stops) and R2C-03 (the open page's clock "
        "follows the saved deadline across a sign-out, with no time given back). "
        "Steps 15 and 16 are the fifth: R2D-02 (a paper left open in one tab never writes over, clears, "
        "or hands in over a newer paper started in another, and stops) and R2D-03 (a mock finished in "
        "another tab stops the tab still showing it, and is recorded once). "
        "Steps 17 and 18 are the sixth: R2E-02 (a handed-in paper's review leaves the screen when the "
        "account changes, and Mr EZ is never asked about it with anybody else's token) and R2E-03 (the same "
        "mock paper handed in from two tabs keeps the first result and is recorded once). "
        "Step 19 is the seventh round, the follow-up to R2E-02 for every other tutor request: a panel message "
        "held on its way while the account changes is answered to nobody, and the panel is the new student's. "
        "Step 20 is the eighth, for the lesson surfaces that record what the tutor sends back: a written answer "
        "held on its way to be evaluated while the account changes is kept in its own student's record and "
        "draft, shown to nobody, and the task is handed to the new student empty. "
        "Step 21 is the ninth, the follow-up to R2B-01 for the focused Reading exercise and the lesson quick "
        "check: both hand over when the account changes, keep the outgoing student's answers for that student, "
        "and a check from a tab that missed the change records nothing. "
        "Step 22 is the tenth, for the last screens that recorded through the shared store: the inline lesson "
        "quiz, the vocabulary practice round and the spoken task hand over the same way, record only for the "
        "student whose work they are, and a recording under way when the account changes is stopped and dropped. "
        "Step 23 is the eleventh, for the sixth Codex inspection: R2F-01 (Start pressed twice while the microphone "
        "prompt is open asks once and starts one recording, and an account change stops every recorder and ends "
        "every microphone track) and R2F-02 (an evaluation that comes back after the student left and returned "
        "adds the submitted answer to their history and never replaces the revision they wrote since)."
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
        run_replaced_mock_step(browser, a_id)
        run_deadline_step(browser, a_id)
        run_standalone_tabs_step(browser, a_id)
        run_mock_gone_step(browser, a_id)
        run_review_switch_step(browser, a_id, b_id)
        run_mock_paper_twice_step(browser, a_id)
        run_panel_switch_step(browser, a_id, b_id)
        run_lesson_evaluation_step(browser, a_id, b_id)
        run_exercise_switch_step(browser, a_id, b_id)
        run_last_screens_step(browser, a_id, b_id)
        run_sixth_inspection_step(browser, a_id, b_id)
        browser.close()

    write_note(
        "**Run complete.** Every check above ran against the local stand-in "
        f"({journey.STANDIN_URL}) and the site at {BASE_URL}. Nothing here is evidence about a "
        "real Supabase project."
    )


if __name__ == "__main__":
    run()
