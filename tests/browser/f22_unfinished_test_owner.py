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

WHAT THIS IS NOT
- Not a real Supabase project. `tools/mr-ez-dev-server.mjs` stands in for it,
  in memory, on this machine only. Every fact below is about that stand-in,
  never claimed as proof about a real project.
- Not the frozen production snapshot the f01-f17 suite uses. This script
  drives its own site on port 4358 and its own stand-in on port 8805.
- No real account, no real key, no paid API call, no deployment.

Requires, already running before this script starts:
  1. the stand-in:  MR_EZ_DEV_PORT=8805 node tools/mr-ez-dev-server.mjs
  2. the site:      PUBLIC_SUPABASE_URL=http://127.0.0.1:8805
                    PUBLIC_SUPABASE_ANON_KEY=local-anon-key
                    PUBLIC_MR_EZ_URL=http://127.0.0.1:8805/tutor
                    npx astro dev --port 4358

Run with:
  python tests/browser/f22_unfinished_test_owner.py

Every email, password and answer below is SYNTHETIC, made up for this run.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

# final_helpers.py reads these at IMPORT time, so they must be set before the
# import below. Its own results file and screenshot prefix, so nothing here
# can collide with another tester's evidence.
os.environ.setdefault("IELTS_BASE_URL", "http://127.0.0.1:4358/ielts-website")
os.environ.setdefault("IELTS_RESULTS_SUFFIX", "-unfinished-test")
os.environ.setdefault("IELTS_SHOT_PREFIX", "unfinished-")

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

# The stand-in this run talks to (f20 defaults to 8799, which belongs to
# another tester's run).
journey.STANDIN_URL = "http://127.0.0.1:8805"

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
        "this run on port 4358), and it is NOT a rerun on top of `results.md`. Supabase IS "
        "configured here, pointed at the free local stand-in, which is the whole point of "
        "the scenario. No AI is called at any step."
    )
    write_note(
        "**This run is against the FREE LOCAL STAND-IN** "
        "(`node tools/mr-ez-dev-server.mjs` on port 8805, in memory, this machine only), "
        f"site under test at {BASE_URL}, stand-in REST surface at {journey.STANDIN_URL}. "
        "It is NOT a real Supabase project and nothing below is claimed as proof about one. "
        "Every student, email and answer is SYNTHETIC.\n\n"
        "It re-runs the journey of finding 1 in "
        "`docs/audits/claude-personal-learning-review-2026-09-23.md` "
        "(original reproduction: `docs/audits/claude-review-2026-09-23/independent-browser.py`) "
        "against the fixed code, and adds A's resume and the mounted-player owner change."
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
        page2 = ctx.new_page()
        errors2, failed2 = attach_diagnostics(page2)
        goto(page2, "/dashboard")
        page2.wait_for_timeout(1500)
        journey.ws_sign_out(page2)
        page2.wait_for_timeout(1500)

        page.bring_to_front()
        page.wait_for_timeout(2000)
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
        browser.close()

    write_note(
        "**Run complete.** Every check above ran against the local stand-in "
        f"({journey.STANDIN_URL}) and the site at {BASE_URL}. Nothing here is evidence about a "
        "real Supabase project."
    )


if __name__ == "__main__":
    run()
