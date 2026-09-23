"""Scenario 21 - Entering an exam page DIRECTLY, against the FREE LOCAL STAND-IN.

WHY THIS FILE EXISTS
Finding 3 of the 23 September 2026 review: a signed-in student who opened a
drill by its own address (a saved link, a shared link, a refresh mid-paper)
had their answers written into this device's SHARED ANONYMOUS record instead
of their own. The cause was that sign-in was wired up inside two navigation
components, and the full-screen pages render neither: the test player, the
reading and listening drills and the mock exam all use the `bare` layout.
Reaching one of those pages through ordinary in-app navigation happened to
inherit an owner set on the previous page, which is why the existing browser
journeys never saw it.

The fix has two halves, and this script exercises both in a real browser:

  1. src/lib/store-owner.ts now answers "whose work is this" from the account
     session the browser is already holding, on the FIRST read, so no page and
     no mount order can reach a store before the answer exists.
  2. src/components/AccountLifecycle.astro is rendered by BaseLayout on EVERY
     route, outside every `bare` branch, so the cloud sync starts on the
     full-screen pages too.

This is the adaptation of the reviewer's own reproduction,
docs/audits/claude-review-2026-09-23/direct-exam-owner.py, into a full
journey with its own evidence file.

WHAT IT CHECKS
  1. Student C signs up from the dashboard, then navigates DIRECTLY to a
     drill by URL, answers and submits. The attempt must be in C's own
     record, must NOT be in this device's anonymous record, and must reach
     the stand-in under C's id and no other.
  2. A refresh in the middle of a second, unfinished drill. The same student
     must still own the page afterwards, the answer they had given must still
     be there, and the timer must have carried on rather than started again.
  3. The same direct-entry journey signed out, which is a perfectly valid way
     to use this site: it must record under this device's anonymous owner,
     and under no account.
  4. The avatar menu, which no longer starts and stops the cloud sync itself
     but reads the lifecycle, still signs a student in and out.

WHAT THIS IS NOT
  - Not a real Supabase project. `tools/mr-ez-dev-server.mjs` stands in for
    it, in memory, on this machine only. Every fact below is about that
    stand-in and is never claimed as proof about a real project.
  - Not the frozen production snapshot other testers use. This script drives
    its OWN two servers on its OWN ports (the stand-in on 8803, the site on
    4356) and writes its own evidence file, so nothing here can collide with
    another run.
  - No real account, no real key, no paid API call, no deployment.

Run with, both already running:
  1. the stand-in:
       MR_EZ_DEV_PORT=8803 node tools/mr-ez-dev-server.mjs
  2. the site, with its OWN Vite dependency cache (see astro.config.f21.mjs
     for why: two dev servers sharing one cache invalidate each other's
     modules and the test player never hydrates):
       PUBLIC_SUPABASE_URL=http://127.0.0.1:8803 \\
       PUBLIC_SUPABASE_ANON_KEY=local-anon-key \\
       PUBLIC_MR_EZ_URL=http://127.0.0.1:8803/tutor \\
       npx astro dev --config astro.config.f21.mjs --port 4356
  then:
       python tests/browser/f21_direct_entry_owner.py

Every email, password and answer below is SYNTHETIC, made up for this run.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date

sys.path.insert(0, os.path.dirname(__file__))

# Read at IMPORT time by final_helpers, so these come first. They point the
# shared helpers at THIS run's site, results file and screenshot prefix, so
# nothing here can overwrite another tester's evidence.
os.environ.setdefault("IELTS_BASE_URL", "http://localhost:4356/ielts-website")
os.environ.setdefault("IELTS_RESULTS_SUFFIX", "-direct-entry")
os.environ.setdefault("IELTS_SHOT_PREFIX", "direct-")

from playwright.sync_api import sync_playwright  # noqa: E402

import f20_account_journey as journey  # noqa: E402  (its page actions are reused as-is)
from final_helpers import (  # noqa: E402
    BASE_URL,
    RESULTS_PATH,
    attach_diagnostics,
    goto,
    new_context,
    report_diagnostics,
    shot,
    write_note,
    write_row,
    write_section,
)

STANDIN_URL = "http://127.0.0.1:8803"
SERVICE_ROLE_HEADERS = {"apikey": "local-service-role-key"}

EMAIL_C = "synthetic-student-c-f21@example.test"
PASSWORD_C = "Synthetic-Pass-C1"

# The drill the reviewer's reproduction used, and a second one for the
# refresh, so the two halves cannot contaminate each other.
DRILL = "/trainers/reading/reading-full-006-drill-p2"
REFRESH_DRILL = "/trainers/reading/reading-full-006-drill-p3"


def reset_results() -> None:
    """This run's own header.

    The shared reset_results() introduces the file as the frozen-snapshot
    suite's evidence, which is not what this is: this script drives a DEV
    server and a free local accounts stand-in, both started for it. An
    evidence file that describes itself wrongly is worse than none, so this
    writes the truth about this run instead."""
    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    header = f"""# Direct entry to an exam page: who the work belongs to

Run on {date.today().isoformat()} against a DEV server at {BASE_URL}, with the free local
accounts stand-in (`node tools/mr-ez-dev-server.mjs`) at {STANDIN_URL}. Both were started for
this run and stopped afterwards. This is NOT the frozen production snapshot the `results.md`
suite uses, and it is NOT a real Supabase project: nothing below is evidence about one.

It is the fix round for finding 3 of the 23 September 2026 review
(`docs/audits/claude-personal-learning-review-2026-09-23.md`), grown out of that review's own
reproduction, `claude-review-2026-09-23/direct-exam-owner.py`, into a full journey: a signed-in
student opening a drill by its own address, a refresh in the middle of an unfinished one, and
the same journey signed out.

Every student, email, password and answer here is SYNTHETIC, invented for this run. No real
account, no real key, no paid model call, no deployment.
"""
    RESULTS_PATH.write_text(header, encoding="utf-8")


# ── reading the stand-in's own store ───────────────────────────────────────

def rest_get(path: str):
    """GET against the stand-in's Supabase-shaped REST surface with the
    service-role key, so what is read is what the store ACTUALLY holds
    rather than what the browser believes."""
    req = urllib.request.Request(f"{STANDIN_URL}/rest/v1/{path}", headers=SERVICE_ROLE_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            body = r.read().decode("utf-8")
            return r.status, (json.loads(body) if body else [])
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, (json.loads(body) if body else [])


def all_learning_events():
    """Every learning_events row in the stand-in, for every student.

    Filtered client-side on purpose: the stand-in's service-role path does
    not narrow learning_events by user_id (documented at length in
    f20_account_journey.store_snapshot). Reading them all and grouping here
    is what actually answers "whose rows are in there".
    """
    _, rows = rest_get("learning_events?select=*")
    return rows if isinstance(rows, list) else []


BASELINE_EVENT_IDS: set[str] = set()


def take_baseline() -> None:
    """Remember every row the stand-in already holds before this run starts.

    The stand-in keeps its store in memory for as long as it is up, so a
    second run of this script, or anything else driven against the same
    server, leaves rows behind. Ignoring those by id is what keeps "nothing
    of this run reached anybody else" an honest statement rather than a
    complaint about somebody else's earlier run."""
    BASELINE_EVENT_IDS.clear()
    for row in all_learning_events():
        event_id = row.get("event_id")
        if isinstance(event_id, str):
            BASELINE_EVENT_IDS.add(event_id)


def rows_from_this_run(rows):
    return [r for r in rows if r.get("event_id") not in BASELINE_EVENT_IDS]


def settled_events(attempts: int = 8, delay_ms: int = 1200):
    """all_learning_events(), polled until the count stops changing.

    A submission schedules more than one debounced push, each several round
    trips, so a single fixed wait is a coin flip. Every event id is derived
    from its own content, so waiting longer can only ever settle upward to
    the real total; it never double-counts."""
    previous = -1
    rows = []
    for _ in range(attempts):
        rows = rows_from_this_run(all_learning_events())
        if len(rows) == previous:
            break
        previous = len(rows)
        time.sleep(delay_ms / 1000)
    return rows


# ── reading the browser's own storage ──────────────────────────────────────

BROWSER_STATE = """() => {
    const out = { auth: [], records: [], sessionKeys: [] };
    for (const key of Object.keys(window.localStorage)) {
        const value = window.localStorage.getItem(key) || '';
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            try { out.auth.push({ key, user: (JSON.parse(value).user || {}).id || null }); }
            catch (e) { out.auth.push({ key, user: null }); }
        }
        if (key.startsWith('ielts.learning.record.v1')) {
            try {
                const parsed = JSON.parse(value);
                out.records.push({
                    key,
                    events: (parsed.events || []).map((e) => ({
                        activity: e.activityId,
                        answer: (e.items && e.items[0] && e.items[0].firstAnswer) || null,
                    })),
                });
            } catch (e) { out.records.push({ key, events: [] }); }
        }
        if (key.startsWith('ielts.testsession')) out.sessionKeys.push(key);
    }
    return out;
}"""


def browser_state(page) -> dict:
    return journey.settle(page, lambda p: p.evaluate(BROWSER_STATE))


def record_for(state: dict, namespace_fragment: str):
    for record in state["records"]:
        if namespace_fragment in record["key"]:
            return record
    return None


def signed_in_user(state: dict):
    for entry in state["auth"]:
        if entry.get("user"):
            return entry["user"]
    return None


def timer_text(page) -> str | None:
    node = page.locator('[role="timer"]')
    try:
        if node.count():
            return " ".join(node.first.inner_text(timeout=3000).split())
    except Exception:
        return None
    return None


def timer_seconds(text: str | None):
    """The timer reads like "19:57" or "1:04:12", with a small clock symbol in
    front of it. Every run of digits is taken in order, biggest unit first,
    so two readings can be compared rather than eyeballed."""
    if not text:
        return None
    parts = re.findall(r"\d+", text)
    if not parts:
        return None
    total = 0
    for part in parts:
        total = total * 60 + int(part)
    return total


def wait_for_questions(page) -> bool:
    """The player is a large island; its controls appear a beat after the
    passage does. Waiting for a real control beats a fixed sleep."""
    try:
        page.wait_for_selector("select, input[type=text], input[type=radio]", timeout=20000)
        return True
    except Exception:
        return False


def submit_drill(page) -> bool:
    """f20's two-click submit (the header Submit, then the Submit inside the
    "Submit anyway?" panel), retried.

    Both buttons share the accessible name "Submit", and under load on this
    machine a click can land before the panel is listening, which is a silent
    no-op rather than an error. Retried against a real outcome: the results
    view replaces the questions with "Retry the ... you got wrong"."""
    for _ in range(3):
        if journey.submit_and_confirm(page):
            return True
        page.wait_for_timeout(2000)
        if page.get_by_role("button", name="Wrong only").count():
            return True
    return False


def answer_first_question(page) -> int:
    """Answer whatever the first question happens to be: a dropdown, a text
    box or a radio. Returns how many inputs were filled."""
    return page.evaluate(
        """() => {
            const select = document.querySelector('select');
            if (select && select.options.length > 1) {
                select.selectedIndex = 1;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return 1;
            }
            const text = document.querySelector('input[type=text]');
            if (text) {
                text.value = 'synthetic';
                text.dispatchEvent(new Event('input', { bubbles: true }));
                return 1;
            }
            const radio = document.querySelector('input[type=radio]');
            if (radio) { radio.click(); return 1; }
            return 0;
        }"""
    )


def first_answer_given(page):
    """What the player is showing as the student's answer to the first
    question right now, read straight off the control."""
    return page.evaluate(
        """() => {
            const select = document.querySelector('select');
            if (select) return select.value || null;
            const text = document.querySelector('input[type=text]');
            if (text) return text.value || null;
            const radio = document.querySelector('input[type=radio]:checked');
            if (radio) return radio.value || null;
            return null;
        }"""
    )


# ── the run ────────────────────────────────────────────────────────────────

def run():
    reset_results()
    write_note(
        "**This run is against the FREE LOCAL STAND-IN** "
        "(`node tools/mr-ez-dev-server.mjs`, in memory, this machine only), "
        f"site under test at {BASE_URL}, stand-in REST surface at {STANDIN_URL}. "
        "It is NOT a real Supabase project, and nothing below is claimed as proof "
        "against one. Every student, email and answer is SYNTHETIC.\n\n"
        "It exercises finding 3 of the 23 September 2026 review: entering a full-screen "
        "exam page directly, by its own address, rather than through the app's own links."
    )

    take_baseline()
    if BASELINE_EVENT_IDS:
        write_note(
            f"The stand-in was already holding {len(BASELINE_EVENT_IDS)} row(s) when this run "
            "started (it keeps its store in memory for as long as it is up). Those rows are "
            "ignored by id below, so every count here is about THIS run."
        )

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ── 1. Signed in, entered directly ────────────────────────────────
        write_section(
            "1. A signed-in student opens a drill by its own address",
            "Sign up on the dashboard, then a plain hard navigation straight to the drill, "
            "the way a saved link or a pasted link arrives. No app navigation in between.",
        )
        ctx = new_context(browser)
        page = ctx.new_page()
        errors, failed = attach_diagnostics(page)

        goto(page, "/dashboard")
        journey.wait_for_dashboard(page)
        user_c = journey.ws_sign_up(page, EMAIL_C, PASSWORD_C)
        write_row(
            "Student C has a real account on the stand-in",
            bool(user_c),
            f"user id from the stand-in's own sign-up response: {user_c}",
        )
        page.wait_for_timeout(1500)

        # The direct entry itself.
        goto(page, DRILL)
        page.wait_for_timeout(1200)
        before = browser_state(page)
        write_row(
            "The browser is still holding student C's session on the drill page",
            signed_in_user(before) == user_c,
            f"session in storage: {json.dumps(before['auth'])}",
        )
        write_row(
            "The data owner on this page is student C, not this device's anonymous owner",
            any(f"u:{user_c}" in r["key"] for r in before["records"])
            or not before["records"],
            "record keys present before the drill was sat: "
            + (", ".join(r["key"] for r in before["records"]) or "none yet"),
        )
        shot(page, "01-drill-entered-directly-signed-in", DRILL)

        journey.start_drill_if_needed(page)
        wait_for_questions(page)
        page.wait_for_timeout(800)
        filled = answer_first_question(page)
        write_row("A question was answered on the drill", filled > 0, f"{filled} input(s) filled")
        submitted = submit_drill(page)
        page.wait_for_timeout(2500)
        write_row("The drill was submitted", submitted, "the submit button reports the paper is in")
        shot(page, "02-drill-submitted-signed-in")

        after = browser_state(page)
        mine = record_for(after, f"u:{user_c}")
        anonymous = record_for(after, "anon:")
        drill_id = DRILL.rsplit("/", 1)[-1]
        in_mine = bool(mine) and any(drill_id in (e["activity"] or "") for e in mine["events"])
        in_anonymous = bool(anonymous) and any(
            drill_id in (e["activity"] or "") for e in anonymous["events"]
        )
        write_row(
            "The attempt is in student C's own record",
            in_mine,
            f"C's record key: {mine['key'] if mine else 'none'}; "
            f"events: {json.dumps(mine['events']) if mine else '[]'}",
        )
        write_row(
            "The attempt is NOT in this device's shared anonymous record "
            "(the defect finding 3 reproduced)",
            not in_anonymous,
            f"anonymous record key: {anonymous['key'] if anonymous else 'none on this device'}; "
            f"events: {json.dumps(anonymous['events']) if anonymous else '[]'}",
        )

        rows = settled_events()
        mine_rows = [r for r in rows if r.get("user_id") == user_c]
        other_rows = [r for r in rows if r.get("user_id") != user_c]
        reached = [r for r in mine_rows if drill_id in str(r.get("activity_id"))]
        write_row(
            "The attempt reached the stand-in under student C",
            len(reached) > 0,
            f"{len(reached)} row(s) for this drill under C, out of {len(mine_rows)} row(s) "
            f"for C in total: {json.dumps([r.get('activity_id') for r in mine_rows])}",
        )
        write_row(
            "Nothing about this drill reached the stand-in under anybody else",
            not any(drill_id in str(r.get("activity_id")) for r in other_rows),
            f"{len(other_rows)} row(s) in the stand-in belong to other ids: "
            f"{json.dumps(sorted({str(r.get('user_id')) for r in other_rows}))}",
        )

        # ── 2. A refresh in the middle of a paper ─────────────────────────
        write_section(
            "2. A refresh in the middle of an unfinished drill",
            "The same student, a second drill, one answer given, then a real page load of the "
            "same address. The sitting and its timer have to belong to the same student "
            "afterwards.",
        )
        goto(page, REFRESH_DRILL)
        page.wait_for_timeout(1000)
        journey.start_drill_if_needed(page)
        wait_for_questions(page)
        page.wait_for_timeout(800)
        answered = answer_first_question(page)
        page.wait_for_timeout(1200)
        before_answer = first_answer_given(page)
        before_timer = timer_text(page)
        write_row(
            "An answer was given in the second drill, and the clock is running",
            answered > 0 and before_timer is not None,
            f'answer="{before_answer}", timer reads "{before_timer}"',
        )
        shot(page, "03-mid-drill-before-refresh", REFRESH_DRILL)

        # Let the clock move, so "the timer carried on" is a real observation
        # rather than two readings of the same second.
        page.wait_for_timeout(4000)
        goto(page, REFRESH_DRILL)
        page.wait_for_timeout(2500)
        journey.start_drill_if_needed(page)
        page.wait_for_timeout(1200)
        after_answer = first_answer_given(page)
        after_timer = timer_text(page)
        refreshed = browser_state(page)
        shot(page, "04-mid-drill-after-refresh", REFRESH_DRILL)

        write_row(
            "After the refresh the page still belongs to student C",
            signed_in_user(refreshed) == user_c
            and any(f"u:{user_c}" in r["key"] for r in refreshed["records"]),
            f"session: {json.dumps(refreshed['auth'])}; record keys: "
            + ", ".join(r["key"] for r in refreshed["records"]),
        )
        write_row(
            "The answer given before the refresh is still there",
            bool(after_answer) and after_answer == before_answer,
            f'before="{before_answer}", after="{after_answer}"',
        )
        before_seconds = timer_seconds(before_timer)
        after_seconds = timer_seconds(after_timer)
        carried_on = (
            before_seconds is not None
            and after_seconds is not None
            and after_seconds < before_seconds
        )
        write_row(
            "The timer carried on rather than starting again",
            carried_on,
            f'before the refresh "{before_timer}" ({before_seconds}s left), after it '
            f'"{after_timer}" ({after_seconds}s left)',
        )
        write_row(
            "The unfinished sitting is stored on this device",
            len(refreshed["sessionKeys"]) > 0,
            f"session keys: {json.dumps(refreshed['sessionKeys'])}",
        )

        report_diagnostics("Signed in, direct entry and refresh", errors, failed)
        ctx.close()

        # ── 3. The same journey, signed out ───────────────────────────────
        write_section(
            "3. The same direct entry, signed out",
            "A fresh browser with no account at all. Working signed out is a supported way to "
            "use this site, and it must still be recorded, under this device and under no "
            "account.",
        )
        ctx2 = new_context(browser)
        page2 = ctx2.new_page()
        errors2, failed2 = attach_diagnostics(page2)

        goto(page2, DRILL)
        page2.wait_for_timeout(1200)
        journey.start_drill_if_needed(page2)
        wait_for_questions(page2)
        page2.wait_for_timeout(800)
        filled2 = answer_first_question(page2)
        submitted2 = submit_drill(page2)
        page2.wait_for_timeout(2500)
        write_row(
            "The signed-out drill was answered and submitted",
            filled2 > 0 and submitted2,
            f"{filled2} input(s) filled, submitted={submitted2}",
        )
        shot(page2, "05-drill-submitted-signed-out")

        out = browser_state(page2)
        anon_record = record_for(out, "anon:")
        account_records = [r for r in out["records"] if "::u:" in r["key"]]
        write_row(
            "Signed-out work is recorded under this device's own anonymous owner",
            bool(anon_record)
            and any(drill_id in (e["activity"] or "") for e in anon_record["events"]),
            f"anonymous record key: {anon_record['key'] if anon_record else 'none'}; "
            f"events: {json.dumps(anon_record['events']) if anon_record else '[]'}",
        )
        write_row(
            "Signed-out work was not filed under any account",
            not account_records and not out["auth"],
            f"account-owned record keys on this device: "
            f"{json.dumps([r['key'] for r in account_records])}; "
            f"sessions in storage: {json.dumps(out['auth'])}",
        )

        rows_after = rows_from_this_run(all_learning_events())
        write_row(
            "The signed-out attempt did not reach the account store",
            not any(
                drill_id in str(r.get("activity_id")) and r.get("user_id") != user_c
                for r in rows_after
            ),
            f"{len(rows_after)} row(s) in the stand-in in total; ids present: "
            f"{json.dumps(sorted({str(r.get('user_id')) for r in rows_after}))}",
        )

        report_diagnostics("Signed out, direct entry", errors2, failed2)
        ctx2.close()

        # ── 4. The menus still sign a student in and out ──────────────────
        write_section(
            "4. The avatar menu after the refactor",
            "The workspace menu and the older account menu no longer start and stop the cloud "
            "sync themselves; they read the app-wide lifecycle. This is the check that they "
            "still show the right thing and that signing out still hands the browser back to "
            "this device's anonymous owner.",
        )
        ctx3 = new_context(browser)
        page3 = ctx3.new_page()
        errors3, failed3 = attach_diagnostics(page3)

        goto(page3, "/dashboard")
        journey.wait_for_dashboard(page3)
        signed_out_menu = journey.ws_menu_state(page3)
        write_row(
            "Signed out, the menu offers Sign in",
            signed_out_menu["shows_sign_in"] and not signed_out_menu["shows_sign_out"],
            json.dumps(signed_out_menu),
        )

        user_d = journey.ws_sign_in(page3, EMAIL_C, PASSWORD_C)
        page3.wait_for_timeout(2000)
        signed_in_menu = journey.ws_menu_state(page3)
        write_row(
            "Signed in through the menu, it names the student and offers Sign out",
            signed_in_menu["shows_sign_out"] and signed_in_menu["identity"] == EMAIL_C,
            f"{json.dumps(signed_in_menu)}; user id from the stand-in: {user_d}",
        )
        in_state = browser_state(page3)
        write_row(
            "Signing in through the menu moves this browser onto that student",
            any("::u:" in r["key"] for r in in_state["records"]),
            "record keys: " + (", ".join(r["key"] for r in in_state["records"]) or "none"),
        )
        shot(page3, "06-menu-signed-in", "/dashboard")

        journey.ws_sign_out(page3)
        page3.wait_for_timeout(2500)
        signed_out_again = journey.ws_menu_state(page3)
        out_state = browser_state(page3)
        write_row(
            "Signing out through the menu offers Sign in again and clears the session",
            signed_out_again["shows_sign_in"]
            and not signed_out_again["shows_sign_out"]
            and not signed_in_user(out_state),
            f"{json.dumps(signed_out_again)}; sessions in storage: {json.dumps(out_state['auth'])}",
        )
        shot(page3, "07-menu-signed-out", "/dashboard")

        report_diagnostics("The avatar menu", errors3, failed3)
        ctx3.close()
        browser.close()

    write_note(
        "**Run complete.** Every check above ran against the local stand-in "
        f"({STANDIN_URL}) and the site at {BASE_URL}, both started for this run and stopped "
        "afterwards. Nothing here is evidence about a real Supabase project, and no paid "
        "model call was made."
    )


if __name__ == "__main__":
    run()
