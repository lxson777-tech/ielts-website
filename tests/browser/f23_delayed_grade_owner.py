"""Scenario 23 - A grade that comes back AFTER the account changed, against the FREE LOCAL STAND-IN.

WHY THIS FILE EXISTS
Finding R2-02 of the second Codex inspection (23 September 2026): an essay or
a spoken answer is sent away to be graded and comes back seconds, sometimes a
minute, later. The writing trainer, the speaking trainer and the live examiner
used to write whatever came back into whoever the CURRENT owner was when it
arrived. If student A's grade was still on its way when A signed out and B
signed in, A's band and report landed in B's history and went up to B's
account.

The fix binds every grading request to the owner it was started for
(bindToCurrentOwner / runOwnedGrade in src/lib/store-owner.ts): the grade is
KEPT under that owner whatever has happened since, and SHOWN only while that
owner is still the one on screen. This script proves it in a real browser for
the two trainers that can be driven without a paid service:

  1. Writing: A submits an essay; the grading request is HELD; A signs out and
     B signs up on the same page; the held request is then answered. The
     screen must show B none of it, B's browser store and B's account must
     hold nothing of A's, and A's own store must hold the essay and its grade.
     A then signs back in and finds it, and it reaches A's own account.
  2. Speaking: the same, for a Part 2 answer recorded through a fake
     microphone, with students C and D.

The live examiner cannot be driven here (it needs a paid voice session); it
runs through the same runOwnedGrade and the same writers, and
tests/delayed-grade-owner.test.ts pins both that and the mock's completion
callback deterministically.

AND THE ESSAY BEFORE IT IS SUBMITTED (finding R2B-01, second fresh Codex
inspection of 3fec8f4)
The grade was bound; the editor was not. The writing trainer looked the owner
up only when "Check my essay" was pressed, and its 600 ms draft autosave
looked it up when the timer fired. So student A could type an essay, the page
could change hands, and student B could submit A's text into B's history; a
switch inside the 600 ms saved A's text under the new owner. The fix
(src/components/writing-editor-owner.ts) binds the editing session to the
owner who starts or restores the essay. Two more sections prove it, with
every account change made from a SECOND tab of the same browser:

  3. E types an essay; E signs out and F signs up in the second tab. The
     first tab's editor must empty itself for F, F must not be able to send
     E's text, E's text must stay in E's own draft, F's own typing must stay
     F's, and E, signing back in, must find the draft and be able to submit it.
  4. The same switch made INSIDE the 600 ms autosave wait, with the page
     itself measuring the gap between the last keystroke and the hand-over:
     E's latest text must land under E and nowhere else.

AND THE TWO FINDINGS OF THE THIRD CODEX INSPECTION (of 7c5264a)
  5. R2C-01: the late grade's keep step cleared its student's draft whatever
     the draft held by then. G submits (the grade is held), signs out and back
     in on the SAME page, gets the submitted essay back and revises it; the
     held grade is then answered. G's draft must still be the revision after
     a reload, and G's history must hold the original submission and report.
  6. R2C-04: the speaking attempt was never stopped when the page changed
     hands, so another student could answer the remaining questions and the
     combined recording became the first student's evidence. H answers Part 1
     question 1 and is recording question 2 through the FAKE microphone when
     H signs out and I signs up in a second tab. The first tab must stop at
     once (recorder stopped, microphone released, back at its menu with the
     notice), no grading request may leave, I must see no attempt, and H's
     history must hold nothing from it. The page's own recorder and
     microphone are observed through a small wrapper installed before the
     page loads, so "stopped" is measured, not inferred from the screen.
  The standalone live examiner (/speaking/examiner) needs a paid voice
  session and cannot be started against the stand-in, so its suspension is
  proven only in tests/delayed-grade-owner.test.ts (the same attempt, and a
  source scan of how the examiner uses it), and the results file says so.

AND THE FINDING OF THE FOURTH CODEX INSPECTION (of 1701b97)
  7. R2D-01: the live examiner's START asked nothing after its waits. In the
     mock exam, an account change while the microphone permission was still
     being asked for took the examiner off screen, and when the permission
     came back the examiner still kept the microphone, started recording,
     fetched a token and opened a paid voice session behind the stopped
     screen. The examiner is started here as far as it can go without a
     voice service: its address is INTERCEPTED in the browser (SYNTHETIC
     settings; every request that would create a voice session refused with
     a SYNTHETIC failure, or held and then refused), and a wrapper installed
     before the page loads HOLDS the page's microphone request and counts
     every track, recorder, peer connection and socket the page makes. Three
     races, with every account change made from a second tab: (a) the mock's
     examiner with the microphone request held, answered after the switch;
     (b) the mock's examiner with the voice session request held, refused
     after the switch; (c) the standalone examiner page, as (a).
     Section 7 needs the site started WITH the examiner address, which turns
     /trainers/speaking into the live drills and so breaks sections 2 and 6
     (they drive the recorded speaking trainer). It is therefore run on its
     own, against a second start of the dev server, and appended to the same
     results file (F23_SECTIONS and F23_APPEND below).

AND THE LAST WINDOW OF THAT START (R2D-01, inside the connection setup)
  8. After the fix above one window was left, inside the connection setup
     itself (src/lib/speaking/live/openai-session.ts, and session.ts for the
     Gemini rollback): the connection prepares itself for up to ten seconds
     AFTER the sign-in token has been read, and nothing asked again before
     the request that creates the paid voice session (or, on the rollback,
     before the voice socket). Those functions now take the examiner's own
     "may I continue" check and ask it right before that request and that
     socket. The same wrapper as section 7 can HOLD the page's connection
     preparation (its offer), so the account changes inside exactly that
     window: (a) the mock's examiner and (b) the standalone examiner page,
     both on the paid path, the offer held after the token was read and let
     go after the switch; (c) the standalone page on the Gemini rollback,
     the ephemeral token request held and answered with a SYNTHETIC token
     after the switch. The voice session request must never be sent (it is
     intercepted, and would be refused with a SYNTHETIC failure if it were),
     and no socket may be opened. The wrapper refuses every socket to another
     host outright, so even a failure of the fix could not reach a real
     service. Section 8 needs the examiner address as well and runs with
     section 7.

HOW THE GRADERS ARE STOOD IN FOR
Nothing is graded by any model. The site is started with its grader
addresses pointed at the local stand-in's own port, on paths the stand-in
does not serve, and this script INTERCEPTS those requests in the browser
before they leave: it holds each one, then answers it with a reply that is
labelled SYNTHETIC in every text field. Even if interception failed, the
request would reach a local 404, never a grader.

WHAT THIS IS NOT
  - Not a real Supabase project. `tools/mr-ez-dev-server.mjs` stands in for
    it, in memory, on this machine only.
  - Not the frozen production snapshot other testers use. Its own ports: the
    first run (results-delayed-grade.md, sections 1 and 2) used the stand-in
    on 8815 and the site on 4368; the R2B-01 run (results-delayed-grade-2.md,
    screenshots prefixed "delayed2-", sections 1 to 4) used 8819 and 4372;
    the R2C run (results-delayed-grade-3.md, screenshots prefixed "delayed3-",
    all six sections) used 8831 and 4384; the R2D run (results-delayed-grade-4.md,
    screenshots prefixed "delayed4-", sections 1 to 7) used them again, and
    so does the run for the connection setup (results-delayed-grade-5.md,
    screenshots prefixed "delayed5-", sections 1 to 8). They are the
    defaults.
  - No real account, no real key, no paid API call, no deployment.

Run with, both already running:
  1. the stand-in:
       MR_EZ_DEV_PORT=8831 node tools/mr-ez-dev-server.mjs
  2. the site, with its own Vite dependency cache (see astro.config.f21.mjs
     for why), graders pointed at the intercepted local paths:
       PUBLIC_SUPABASE_URL=http://127.0.0.1:8831 \\
       PUBLIC_SUPABASE_ANON_KEY=local-anon-key \\
       PUBLIC_MR_EZ_URL=http://127.0.0.1:8831/tutor \\
       PUBLIC_GRADER_URL=http://127.0.0.1:8831/SYNTHETIC-intercepted-grade-essay \\
       PUBLIC_SPEAKING_GRADER_URL=http://127.0.0.1:8831/SYNTHETIC-intercepted-grade-speaking \\
       npx astro dev --config <a config like astro.config.f21.mjs> --port 4384
     where that config ALSO sets vite.server.watch.ignored to docs/, tests/
     and .codex/. Without it, every evidence file written mid-run (by this
     script, or by another builder in the same checkout) reloads the page and
     abandons the held grading request; the "same page (no reload)" checks
     below then fail, as they should. The same goes for source files another
     builder is editing in the same checkout during the run: on the first R2C
     run an edit to src/components/TestPlayer.tsx reloaded the pages under
     test, so that run's config also ignores the files that builder owned
     (none of them is part of what this script proves). Astro resolves --config relative to the
     project root, so a config kept outside the project (in a scratch folder,
     say) is passed as a relative path to it.
  then:
       IELTS_STANDIN_URL=http://127.0.0.1:8831 python tests/browser/f23_delayed_grade_owner.py
  which runs sections 1 to 6 and starts a fresh results file. For sections
  7 and 8, stop the site and start it again with ONE more variable,
       PUBLIC_LIVE_EXAMINER_URL=http://127.0.0.1:8831/SYNTHETIC-intercepted-live-examiner
  (a path the stand-in does not serve; the script intercepts it in the
  browser), then:
       F23_SECTIONS=7,8 F23_APPEND=1 F23_EXAMINER_CONFIGURED=1 \\
       IELTS_STANDIN_URL=http://127.0.0.1:8831 python tests/browser/f23_delayed_grade_owner.py
  F23_SECTIONS picks the sections (default 1,2,3,4,5,6), F23_APPEND=1 adds
  to the results file instead of starting it again, and
  F23_EXAMINER_CONFIGURED=1 says the site was started with the examiner
  address (without it sections 7 and 8 report themselves as not run).

Every email, password, essay and band below is SYNTHETIC, made up for this run.
"""
import json
import os
import sys
import time
from datetime import date

sys.path.insert(0, os.path.dirname(__file__))

# Read at IMPORT time by final_helpers and f20, so these come first.
# The run for the connection setup (section 8): its own results file and
# screenshot prefix, so the earlier runs' results-delayed-grade.md, -2.md,
# -3.md and -4.md, and their "delayed-", "delayed2-", "delayed3-" and
# "delayed4-" screenshots, stay exactly as they were.
os.environ.setdefault("IELTS_BASE_URL", "http://localhost:4384/ielts-website")
os.environ.setdefault("IELTS_RESULTS_SUFFIX", "-delayed-grade-5")
os.environ.setdefault("IELTS_SHOT_PREFIX", "delayed5-")
os.environ.setdefault("IELTS_STANDIN_URL", "http://127.0.0.1:8831")

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

STANDIN_URL = os.environ.get("IELTS_STANDIN_URL", "http://127.0.0.1:8831")  # the local stand-in; override per run

RUN = time.strftime("%H%M%S")
EMAIL_A = f"synthetic-student-a-f23-{RUN}@example.test"
EMAIL_B = f"synthetic-student-b-f23-{RUN}@example.test"
EMAIL_C = f"synthetic-student-c-f23-{RUN}@example.test"
EMAIL_D = f"synthetic-student-d-f23-{RUN}@example.test"
PASSWORD = "Synthetic-Pass-F23"

PROMPT_ID = "pte-wt-132-task2"
PROMPT_TITLE = "Primary schools focus too much on formal learning"
ESSAY_MARK = f"SYNTHETIC-F23-ESSAY-OF-A-{RUN}"
ESSAY = (
    f"{ESSAY_MARK} This essay is synthetic and was written by a test script for student A. "
    + " ".join(
        [
            "Children learn a great deal through play, and a primary classroom that only drills formal "
            "lessons may leave them less curious and less confident than they could be."
        ]
        * 9
    )
)

# Sections 3 and 4 (R2B-01): two more students, their own essays, and the
# pieces of text the debounce section types just before and inside the wait.
EMAIL_E = f"synthetic-student-e-f23-{RUN}@example.test"
EMAIL_F = f"synthetic-student-f-f23-{RUN}@example.test"
E_MARK = f"SYNTHETIC-F23-ESSAY-OF-E-{RUN}"
E_ESSAY = (
    f"{E_MARK} This essay is synthetic and was typed by a test script for student E. "
    "Formal lessons have their place, yet a school day built only around them leaves little room "
    "for the curiosity that play and projects encourage in young children."
)
F_MARK = f"SYNTHETIC-F23-ESSAY-OF-F-{RUN}"
F_ESSAY = f"{F_MARK} Student F's own synthetic essay, typed after F took over the page."
EARLY_MARK = f"SYNTHETIC-F23-EARLY-{RUN}"
EARLY_TEXT = f"{EARLY_MARK} E's synthetic opening paragraph, saved before the switch."
LATE_MARK = f"SYNTHETIC-F23-LATE-{RUN}"
LATE_TEXT = f"{EARLY_TEXT} {LATE_MARK} and the sentence E typed a moment before signing out."

DRAFT_PREFIX = "ielts.writing.draft.v1"
ACCOUNT_NOTE = "The account on this page changed. Any essay in progress was kept for the student who was writing it."

# Section 5 (R2C-01): student G, the essay G submits, and the revision G
# types after coming back while that essay is still being graded.
EMAIL_G = f"synthetic-student-g-f23-{RUN}@example.test"
G_MARK = f"SYNTHETIC-F23-ESSAY-OF-G-{RUN}"
G_ESSAY = (
    f"{G_MARK} This essay is synthetic and was submitted by a test script for student G. "
    + " ".join(
        [
            "A primary school that leaves room for play and projects can still teach reading and "
            "number well, and its pupils may carry more curiosity into the years that follow."
        ]
        * 8
    )
)
REVISION_MARK = f"SYNTHETIC-F23-REVISION-OF-G-{RUN}"
G_REVISION = f"{G_ESSAY} {REVISION_MARK} A sentence G added after coming back, while the first grade was on its way."

# Section 6 (R2C-04): students H and I, and a Part 1 topic with several
# questions, so there is a "next question" for the second student to reach.
EMAIL_H = f"synthetic-student-h-f23-{RUN}@example.test"
EMAIL_I = f"synthetic-student-i-f23-{RUN}@example.test"
PART1_TOPIC = "p1-work"
PART1_Q1 = "What do you do for work or study?"
PART1_Q2 = "Why did you choose that field?"
PART1_Q3 = "What do you enjoy most about it?"
SESSION_CLOSED = "The account on this page changed, so the speaking session on screen was closed."

# Installed before any page script runs, in section 6 only: records every
# microphone track the page is given and every recorder it starts, and the
# moment each recorder is told to stop, so the run can MEASURE that the
# recording stopped and the microphone was released rather than infer it
# from what the screen shows. It changes nothing the page does.
MEDIA_PROBE = """
(() => {
  const probe = { tracks: [], recorders: [], stopCalls: [] };
  window.__f23Media = probe;
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
    const stop = Recorder.prototype.stop;
    Recorder.prototype.start = function (...args) { probe.recorders.push(this); return start.apply(this, args); };
    Recorder.prototype.stop = function (...args) { probe.stopCalls.push(Date.now()); return stop.apply(this, args); };
  }
})();
"""

CUE_CARD = "p2-journey"
CUE_TOPIC = "Describe a memorable journey or trip you have taken."

GRADER_ESSAY_PATH = "SYNTHETIC-intercepted-grade-essay"
GRADER_SPEAKING_PATH = "SYNTHETIC-intercepted-grade-speaking"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}

NOTICE = "The account on this page changed while this was being graded"

SYNTHETIC_NOTE = "SYNTHETIC intercepted reply from f23: no model was called."


def essay_reply() -> dict:
    criterion = {"band": 7, "comment": SYNTHETIC_NOTE, "tip": SYNTHETIC_NOTE}
    return {
        "criteria": {
            "taskResponse": criterion,
            "coherenceCohesion": criterion,
            "lexicalResource": criterion,
            "grammaticalRange": criterion,
        },
        "moments": [],
        "strengths": [SYNTHETIC_NOTE],
        "improvements": [SYNTHETIC_NOTE],
        "actionPlan": [SYNTHETIC_NOTE],
    }


def speaking_reply() -> dict:
    criterion = {"band": 6, "comment": SYNTHETIC_NOTE, "tip": SYNTHETIC_NOTE}
    return {
        "criteria": {
            "fluencyCoherence": criterion,
            "lexicalResource": criterion,
            "grammaticalRange": criterion,
            "pronunciation": criterion,
        },
        "moments": [],
        "strengths": [SYNTHETIC_NOTE],
        "improvements": [SYNTHETIC_NOTE],
        "actionPlan": [SYNTHETIC_NOTE],
    }


def reset_results() -> None:
    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    header = f"""# When the account changes on an open page: whose grade, and whose essay

Run on {date.today().isoformat()} against a DEV server at {BASE_URL}, with the free local
accounts stand-in (`node tools/mr-ez-dev-server.mjs`) at {STANDIN_URL}. Both were started for
this run and stopped afterwards. This is NOT the frozen production snapshot the `results.md`
suite uses, and it is NOT a real Supabase project: nothing below is evidence about one.

It is the browser half of six fixes. Sections 1 and 2: finding R2-02 of the second Codex
inspection, a grade that came back after the owner changed was written under whoever was signed in
by then. Sections 3 and 4: finding R2B-01 of the second fresh Codex inspection, the essay editor
itself was nobody's, so a student who took over the page could submit the previous student's text,
and a switch inside the 600 ms draft autosave saved it under the newcomer. Section 5: finding R2C-01
of the third Codex inspection, a late grade deleted the draft its student had revised since
submitting. Section 6: finding R2C-04 of the same inspection, a speaking attempt went on after the
page changed hands, so a second student could answer the first student's remaining questions.
Section 7: finding R2D-01 of the Codex inspection of 1701b97, the live examiner's START asked
nothing after its waits, so an account change while the microphone permission was up left the
microphone, a recording and a paid voice session running behind the mock's stopped screen.
Section 8: the last window of that start, inside the connection setup, where the connection
prepared itself for up to ten seconds after the sign-in token was read and then sent the request
that creates the paid voice session without asking again. The deterministic half of sections 1 to
7 is `tests/delayed-grade-owner.test.ts`; of section 8, `tests/live-start-cancel.test.ts`.

**Two starts of the dev server.** Sections 1 to 6 drive the recorded speaking trainer on
`/trainers/speaking`, which the site shows only while no live examiner address is configured.
Sections 7 and 8 need one, so they ran against a second start of the same dev server with
`PUBLIC_LIVE_EXAMINER_URL` pointed at a path on the stand-in that the stand-in does not serve, and was
appended below.

**What this run does not cover, and where it is covered instead.** No live interview runs here: the
examiner needs a paid voice session, and the stand-in has none. Sections 7 and 8 start the examiner
as far as it can go without one (its settings and every voice session request are intercepted in the
browser and answered by the run itself) and race the account change against the microphone request,
the connection setup and the voice session request. What happens once a voice session is up (the suspension mid-interview, the
grading guard after the session is shut down, a grade already requested being kept for its student)
is proven only by `tests/delayed-grade-owner.test.ts`, sections 7 and 8: the same attempt and start
guard the examiner uses, driven with promises resolved by hand, and a source scan of how the examiner
uses them.

**No grader and no model was called.** The essay and speaking grader addresses point at paths the
local stand-in does not serve, and this script intercepts those requests in the browser, holds
them, and answers them with a reply whose every text field reads "{SYNTHETIC_NOTE}". The
browser's own client still labels a grade from its remote grader "AI examiner"; in this run that
label sits on a synthetic reply, for synthetic students, on a local stand-in.

Every student, email, password, essay and band here is SYNTHETIC, invented for this run.
"""
    RESULTS_PATH.write_text(header, encoding="utf-8")


# ── reading the browser's own store ────────────────────────────────────────

def local_items(page) -> dict:
    return journey.settle(
        page,
        lambda p: p.evaluate(
            "() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]))"
        ),
    )


def parsed(items: dict, key: str):
    raw = items.get(key)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def record_activity_ids(items: dict, user_id: str) -> list:
    record = parsed(items, f"ielts.learning.record.v1::u:{user_id}") or {}
    return [e.get("activityId") for e in record.get("events", [])]


def keys_carrying(items: dict, mark: str) -> list:
    return sorted(k for k, v in items.items() if v and mark in v)


# ── the page must not have reloaded ────────────────────────────────────────
#
# A reload abandons the request the run is holding, and would make "B sees
# nothing of A's" true for the wrong reason. So a marker is put on the page's
# own window before the grading starts and read back afterwards: a reload
# (for instance a dev server reacting to a file written mid-run) clears it.

def mark_page(page) -> None:
    page.evaluate("() => { window.__f23SamePage = true; }")


def same_page(page) -> bool:
    try:
        return bool(page.evaluate("() => window.__f23SamePage === true"))
    except Exception:
        return False


# ── the held grader ────────────────────────────────────────────────────────

class HeldGrader:
    """Intercepts one grader path. A preflight is answered straight away;
    a POST is held, never sent anywhere, until release() answers it."""

    def __init__(self, page, path_fragment: str):
        self.page = page
        self.path_fragment = path_fragment
        self.held = []
        self.bodies = []
        page.route(f"**/{path_fragment}**", self._handle)

    def _handle(self, route):
        request = route.request
        if request.method == "OPTIONS":
            route.fulfill(status=204, headers=CORS, body="")
            return
        try:
            self.bodies.append(request.post_data or "")
        except Exception:
            self.bodies.append("")
        self.held.append(route)

    def wait_until_held(self, timeout_ms=45000) -> bool:
        waited = 0
        while not self.held and waited < timeout_ms:
            self.page.wait_for_timeout(250)
            waited += 250
        return bool(self.held)

    def release(self, reply: dict) -> None:
        route = self.held.pop(0)
        route.fulfill(
            status=200,
            content_type="application/json",
            headers=CORS,
            body=json.dumps(reply),
        )

    def refuse(self) -> None:
        """Answer the held request with a failure, so nothing is graded and
        nothing is recorded. Used only by the warm-up below."""
        route = self.held.pop(0)
        route.fulfill(
            status=503,
            content_type="application/json",
            headers=CORS,
            body=json.dumps({"error": "SYNTHETIC warm-up request from f23: not graded."}),
        )


# ── warming the dev server up ─────────────────────────────────────────────
#
# Found on the first run of this script: the first time the speaking trainer
# converts a recording (the MP3 encoder is imported on demand), the DEV
# server discovers a dependency it had not prepared yet, prepares it, and
# reloads the page. That reload lands in the middle of the account switch
# and abandons the held request, so the scenario proves nothing. It is a
# dev-server artefact (a production build has no such step), so the run
# first takes one signed-out recording through the same path, refuses its
# grading request, and only then starts the real scenario. Nothing from the
# warm-up is recorded anywhere: a refused grading request writes nothing.

def warm_up_speaking(browser) -> None:
    ctx = new_context(browser, permissions=["microphone"])
    page = ctx.new_page()
    grader = HeldGrader(page, GRADER_SPEAKING_PATH)
    goto(page, f"/trainers/speaking?part=2&card={CUE_CARD}")
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Start prep time"),
        lambda: page.get_by_role("button", name="Start speaking now").count() > 0,
    )
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Start speaking now"),
        lambda: page.get_by_role("button", name="Stop answering").count() > 0,
    )
    page.wait_for_timeout(2000)
    journey.try_click(page.get_by_role("button", name="Stop answering"))
    if grader.wait_until_held(timeout_ms=30000):
        grader.refuse()
    page.wait_for_timeout(6000)
    ctx.close()


# ── stand-in rows ──────────────────────────────────────────────────────────

def standin_user_state_text(user_id: str) -> str:
    snapshot = journey.settled_store_snapshot(user_id, attempts=6, delay_ms=1000)
    return json.dumps(snapshot.get("user_state") or [])


def standin_event_ids(user_id: str) -> list:
    snapshot = journey.settled_store_snapshot(user_id, attempts=6, delay_ms=1000)
    return [str(r.get("activity_id")) for r in snapshot.get("learning_events") or []]


# ── 1. writing ─────────────────────────────────────────────────────────────

def writing_scenario(browser) -> None:
    write_section(
        "1. Writing: A's essay is graded after A signed out and B signed in on the same page",
        "A submits an essay on the writing trainer. The grading request is held in the browser. "
        "A signs out and B signs up from the avatar menu of the SAME page, while the grading "
        "progress is still on screen. Then the held request is answered with a synthetic reply.",
    )
    ctx = new_context(browser)
    page = ctx.new_page()
    errors, failed = attach_diagnostics(page)

    goto(page, "/dashboard")
    journey.wait_for_dashboard(page)
    user_a = journey.ws_sign_up(page, EMAIL_A, PASSWORD)
    write_row("Student A signed up on the local stand-in", bool(user_a), f"user id {user_a}")

    grader = HeldGrader(page, GRADER_ESSAY_PATH)
    goto(page, f"/trainers/writing?task={PROMPT_ID}")
    textarea = page.locator("textarea").first
    textarea.wait_for(timeout=20000)
    journey.click_until(
        page,
        lambda: page.locator("textarea"),
        lambda: page.locator("textarea").first.is_editable(),
    )
    textarea.fill(ESSAY)
    page.wait_for_timeout(900)
    mark_page(page)
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Check my essay"),
        lambda: bool(grader.held),
        attempts=6,
        delay=1500,
    )
    held = grader.wait_until_held()
    write_row(
        "A's grading request went out and is being held (nothing reached any grader)",
        held and ESSAY_MARK in (grader.bodies[0] if grader.bodies else ""),
        f"held={len(grader.held)}, request body carries A's essay: "
        f"{bool(grader.bodies and ESSAY_MARK in grader.bodies[0])}",
    )
    shot(page, "01-essay-grading-held-for-a", "/trainers/writing")

    journey.ws_sign_out(page)
    user_b = journey.ws_sign_up(page, EMAIL_B, PASSWORD)
    page.wait_for_timeout(1500)
    state = journey.ws_menu_state(page)
    write_row(
        "B is signed in on the same page, never reloaded, while A's essay is still being graded",
        bool(user_b) and bool(state.get("shows_sign_out")) and bool(grader.held) and same_page(page),
        f"user id {user_b}, menu identity {state.get('identity')!r}, request still held: {bool(grader.held)}, "
        f"same page as the submission (no reload): {same_page(page)}",
    )
    shot(page, "02-essay-b-signed-in-while-grading", "/trainers/writing")

    grader.release(essay_reply())
    try:
        page.wait_for_selector(f"text={NOTICE}", timeout=15000)
    except Exception:
        pass
    page.wait_for_timeout(800)
    body = page.locator("body").inner_text()
    textarea_value = page.locator("textarea").first.input_value() if page.locator("textarea").count() else ""
    write_row(
        "The page B is using says the attempt went elsewhere, and shows none of A's result or essay",
        NOTICE in body and SYNTHETIC_NOTE not in body and ESSAY_MARK not in textarea_value and same_page(page),
        f"notice shown: {NOTICE in body}; synthetic report text on screen: {SYNTHETIC_NOTE in body}; "
        f"A's essay still in the text box: {ESSAY_MARK in textarea_value}; same page: {same_page(page)}",
    )
    shot(page, "03-essay-grade-arrived-b-sees-notice", "/trainers/writing")

    items = local_items(page)
    progress_a = parsed(items, f"ielts.progress.v1::u:{user_a}") or {}
    progress_b = parsed(items, f"ielts.progress.v1::u:{user_b}") or {}
    a_rows = (progress_a.get("writing") or {}).get(PROMPT_ID) or []
    b_rows = (progress_b.get("writing") or {}).get(PROMPT_ID) or []
    write_row(
        "A's essay and its grade are kept in A's own history on this device",
        any(ESSAY_MARK in (r.get("essay") or "") for r in a_rows)
        and f"write:{PROMPT_ID}" in record_activity_ids(items, user_a),
        f"A's writing rows for the prompt: {len(a_rows)}, band {[r.get('overallBand') for r in a_rows]}; "
        f"A's record: {record_activity_ids(items, user_a)}",
    )
    carrying = keys_carrying(items, ESSAY_MARK)
    write_row(
        "Nothing of A's essay is under B, or under anybody but A, on this device",
        not b_rows
        and f"write:{PROMPT_ID}" not in record_activity_ids(items, user_b)
        and all(f"u:{user_a}" in k for k in carrying),
        f"B's writing rows for the prompt: {len(b_rows)}; B's record: {record_activity_ids(items, user_b)}; "
        f"keys carrying A's essay: {carrying}",
    )
    page.wait_for_timeout(3000)
    b_state = standin_user_state_text(user_b)
    b_events = standin_event_ids(user_b)
    write_row(
        "B's account on the stand-in received nothing of A's",
        ESSAY_MARK not in b_state and not any(PROMPT_ID in e for e in b_events),
        f"B's user_state carries A's essay: {ESSAY_MARK in b_state}; B's events: {b_events}",
    )

    journey.ws_sign_out(page)
    signed_in = journey.ws_sign_in(page, EMAIL_A, PASSWORD)
    goto(page, "/trainers/writing")
    try:
        page.wait_for_selector(f"#history >> text={PROMPT_TITLE}", timeout=20000)
    except Exception:
        pass
    page.wait_for_timeout(1200)
    history = page.locator("#history").inner_text() if page.locator("#history").count() else ""
    write_row(
        "A signs back in and finds the essay in their own writing history",
        bool(signed_in) and PROMPT_TITLE in history,
        f"signed in as {signed_in}; history lists the prompt: {PROMPT_TITLE in history}",
    )
    page.locator("#history").scroll_into_view_if_needed()
    shot(page, "04-essay-a-back-finds-it", "/trainers/writing")

    page.wait_for_timeout(3000)
    a_state = standin_user_state_text(user_a)
    a_events = standin_event_ids(user_a)
    write_row(
        "It reached A's own account on the stand-in once A was signed in again",
        ESSAY_MARK in a_state and any(f"write:{PROMPT_ID}" in e for e in a_events),
        f"A's user_state carries the essay: {ESSAY_MARK in a_state}; A's events: {a_events}",
    )
    b_state_after = standin_user_state_text(user_b)
    write_row(
        "B's account still holds nothing of A's after A's sync",
        ESSAY_MARK not in b_state_after and not any(PROMPT_ID in e for e in standin_event_ids(user_b)),
        f"B's user_state carries A's essay: {ESSAY_MARK in b_state_after}",
    )
    report_diagnostics("Writing", errors, failed)
    ctx.close()


# ── 2. speaking ────────────────────────────────────────────────────────────

def speaking_scenario(browser) -> None:
    warm_up_speaking(browser)
    write_section(
        "2. Speaking: C's recorded answer is graded after C signed out and D signed in",
        "The speaking trainer (the recorded checker, which is what /trainers/speaking shows when the "
        "live examiner is not configured) opens a Part 2 cue card by its exact link. C records a few "
        "seconds through the browser's FAKE microphone (a test tone, no real voice). The grading "
        "request is held; C signs out and D signs up on the same page; then it is answered.",
    )
    write_note(
        "Before this section a signed-out warm-up recording went through the same page and its grading "
        "request was answered with a synthetic failure, so nothing was graded or recorded. It exists "
        "because the dev server prepares the MP3 encoder on first use and reloads the page when it has, "
        "which on the first run of this script landed in the middle of the account switch."
    )
    ctx = new_context(browser, permissions=["microphone"])
    page = ctx.new_page()
    errors, failed = attach_diagnostics(page)

    goto(page, "/dashboard")
    journey.wait_for_dashboard(page)
    user_c = journey.ws_sign_up(page, EMAIL_C, PASSWORD)
    write_row("Student C signed up on the local stand-in", bool(user_c), f"user id {user_c}")

    grader = HeldGrader(page, GRADER_SPEAKING_PATH)
    goto(page, f"/trainers/speaking?part=2&card={CUE_CARD}")
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Start prep time"),
        lambda: page.get_by_role("button", name="Start speaking now").count() > 0,
    )
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Start speaking now"),
        lambda: page.get_by_role("button", name="Stop answering").count() > 0,
    )
    mark_page(page)
    page.wait_for_timeout(3500)
    journey.try_click(page.get_by_role("button", name="Stop answering"))
    held = grader.wait_until_held()
    write_row(
        "C's recorded answer went out for grading and is being held (nothing reached any grader)",
        held,
        f"held={len(grader.held)}",
    )
    shot(page, "05-speaking-grading-held-for-c", "/trainers/speaking")

    journey.ws_sign_out(page)
    user_d = journey.ws_sign_up(page, EMAIL_D, PASSWORD)
    page.wait_for_timeout(1500)
    write_row(
        "D is signed in on the same page, never reloaded, while C's answer is still being graded",
        bool(user_d) and bool(grader.held) and same_page(page),
        f"user id {user_d}, request still held: {bool(grader.held)}, same page (no reload): {same_page(page)}",
    )

    grader.release(speaking_reply())
    try:
        page.wait_for_selector(f"text={NOTICE}", timeout=15000)
    except Exception:
        pass
    page.wait_for_timeout(800)
    body = page.locator("body").inner_text()
    write_row(
        "The page D is using says the attempt went elsewhere, and shows none of C's result",
        NOTICE in body and SYNTHETIC_NOTE not in body and same_page(page),
        f"notice shown: {NOTICE in body}; synthetic report text on screen: {SYNTHETIC_NOTE in body}; "
        f"same page: {same_page(page)}",
    )
    shot(page, "06-speaking-grade-arrived-d-sees-notice", "/trainers/speaking")

    items = local_items(page)
    progress_c = parsed(items, f"ielts.progress.v1::u:{user_c}") or {}
    progress_d = parsed(items, f"ielts.progress.v1::u:{user_d}") or {}
    c_rows = [r for r in progress_c.get("speaking") or [] if r.get("topic") == CUE_TOPIC]
    d_rows = progress_d.get("speaking") or []
    speak_id = f"speak:{CUE_CARD}"
    write_row(
        "C's speaking grade is kept in C's own history on this device",
        len(c_rows) == 1 and speak_id in record_activity_ids(items, user_c),
        f"C's speaking rows: {len(c_rows)}, band {[r.get('overallBand') for r in c_rows]}; "
        f"C's record: {record_activity_ids(items, user_c)}",
    )
    write_row(
        "Nothing of C's answer is under D on this device",
        not d_rows and speak_id not in record_activity_ids(items, user_d),
        f"D's speaking rows: {len(d_rows)}; D's record: {record_activity_ids(items, user_d)}",
    )
    page.wait_for_timeout(3000)
    d_events = standin_event_ids(user_d)
    d_state = standin_user_state_text(user_d)
    write_row(
        "D's account on the stand-in received nothing of C's",
        speak_id not in d_events and CUE_TOPIC not in d_state,
        f"D's events: {d_events}; D's user_state carries C's cue card: {CUE_TOPIC in d_state}",
    )

    journey.ws_sign_out(page)
    signed_in = journey.ws_sign_in(page, EMAIL_C, PASSWORD)
    page.wait_for_timeout(3000)
    c_events = standin_event_ids(user_c)
    c_state = standin_user_state_text(user_c)
    write_row(
        "C signs back in and the grade reaches C's own account on the stand-in",
        bool(signed_in) and speak_id in c_events and CUE_TOPIC in c_state,
        f"signed in as {signed_in}; C's events: {c_events}; C's user_state carries the cue card: "
        f"{CUE_TOPIC in c_state}",
    )
    goto(page, "/account")
    page.wait_for_timeout(2500)
    shot(page, "07-speaking-c-back-account", "/account")
    report_diagnostics("Speaking", errors, failed)
    ctx.close()


# ── 3 and 4. the editor itself (R2B-01) ───────────────────────────────────
#
# Found by the second fresh Codex inspection: the grade was bound to its
# student, the editor was not. The owner was looked up only at submit, and
# the 600 ms draft autosave looked it up when its timer fired. These two
# sections drive the fix in a real browser: two tabs of ONE browser (so they
# share this device's storage and its account session, exactly like a
# student's own browser), the essay open in the first, every account change
# made from the second.

def draft_key(namespace: str, prompt_id: str = PROMPT_ID) -> str:
    return f"{DRAFT_PREFIX}::{namespace}::{prompt_id}"


def draft_keys(items: dict, prompt_id: str = PROMPT_ID) -> list:
    return sorted(k for k in items if k.startswith(DRAFT_PREFIX) and k.endswith(f"::{prompt_id}"))


def textarea_value(page) -> str:
    try:
        box = page.locator("textarea").first
        return box.input_value(timeout=5000) if page.locator("textarea").count() else ""
    except Exception:
        return ""


def check_button_disabled(page) -> bool:
    try:
        return page.get_by_role("button", name="Check my essay").first.is_disabled(timeout=5000)
    except Exception:
        return False


def body_text(page) -> str:
    try:
        return page.locator("body").inner_text(timeout=5000)
    except Exception:
        return ""


def open_writing_task(page) -> None:
    goto(page, f"/trainers/writing?task={PROMPT_ID}")
    page.locator("textarea").first.wait_for(timeout=20000)
    journey.click_until(
        page,
        lambda: page.locator("textarea"),
        lambda: page.locator("textarea").first.is_editable(),
    )


def editor_scenario(browser) -> None:
    write_section(
        "3. The essay editor belongs to the student who started it (Codex R2B-01)",
        "Student E opens a Task 2 essay in the first tab and types. From a SECOND tab of the same "
        "browser, E signs out and student F signs up. The first tab is never reloaded by the script. "
        "F must get an empty editor and must not be able to send E's text; E's text must stay in E's "
        "own draft; E, signing back in, must find it and be able to submit it.",
    )
    ctx = new_context(browser)
    page_a = ctx.new_page()
    errors, failed = attach_diagnostics(page_a)
    grader_a = HeldGrader(page_a, GRADER_ESSAY_PATH)

    goto(page_a, "/dashboard")
    journey.wait_for_dashboard(page_a)
    user_e = journey.ws_sign_up(page_a, EMAIL_E, PASSWORD)
    write_row("Student E signed up on the local stand-in", bool(user_e), f"user id {user_e}")
    e_ns, e_key = f"u:{user_e}", draft_key(f"u:{user_e}")

    open_writing_task(page_a)
    page_a.locator("textarea").first.fill(E_ESSAY)
    page_a.wait_for_timeout(1500)
    mark_page(page_a)
    items = local_items(page_a)
    write_row(
        "E's essay is on screen and kept as E's own draft",
        E_MARK in textarea_value(page_a) and E_MARK in (items.get(e_key) or ""),
        f"{e_key} carries E's essay: {E_MARK in (items.get(e_key) or '')}",
    )
    shot(page_a, "08-editor-e-typing", "/trainers/writing")

    page_b = ctx.new_page()
    errors_b, failed_b = attach_diagnostics(page_b)
    grader_b = HeldGrader(page_b, GRADER_ESSAY_PATH)
    goto(page_b, "/dashboard")
    journey.wait_for_dashboard(page_b)
    journey.ws_sign_out(page_b)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2000)
    value = textarea_value(page_a)
    body = body_text(page_a)
    write_row(
        "E signs out in the second tab: the first tab's editor empties itself and says the account changed",
        E_MARK not in value and ACCOUNT_NOTE in body and same_page(page_a),
        f"E's essay still in the text box: {E_MARK in value}; note shown: {ACCOUNT_NOTE in body}; "
        f"same page (no reload): {same_page(page_a)}",
    )

    user_f = journey.ws_sign_up(page_b, EMAIL_F, PASSWORD)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2500)
    value = textarea_value(page_a)
    body = body_text(page_a)
    disabled = check_button_disabled(page_a)
    write_row(
        "F signs up in the second tab: the first tab's editor is F's now, empty, with the note, never reloaded",
        bool(user_f) and value == "" and ACCOUNT_NOTE in body and E_MARK not in body and same_page(page_a),
        f"user id {user_f}; text box empty: {value == ''}; note shown: {ACCOUNT_NOTE in body}; "
        f"E's essay anywhere on the page: {E_MARK in body}; same page: {same_page(page_a)}",
    )
    write_row(
        "F cannot submit E's text: the text box is empty and 'Check my essay' is disabled",
        value == "" and disabled,
        f"text box empty: {value == ''}; button disabled: {disabled}",
    )
    shot(page_a, "09-editor-f-empty-after-switch", "/trainers/writing")

    journey.try_click(page_a.get_by_role("button", name="Check my essay"), timeout=2000, force=True)
    page_a.wait_for_timeout(1500)
    sent = grader_a.bodies + grader_b.bodies
    write_row(
        "No grading request left either tab after the switch, even with the button pressed by force",
        not sent,
        f"grading requests seen: {len(sent)}",
    )

    open_writing_task(page_b)
    page_b.wait_for_timeout(800)
    value_b = textarea_value(page_b)
    write_row(
        "F opening the same task in the second tab also gets an empty editor",
        value_b == "",
        f"text box empty: {value_b == ''}",
    )
    items = local_items(page_a)
    carrying = keys_carrying(items, E_MARK)
    write_row(
        "E's essay is still in E's own draft, and in no other key on this device",
        carrying == [e_key],
        f"keys carrying E's essay: {carrying}",
    )

    page_a.bring_to_front()
    page_a.locator("textarea").first.fill(F_ESSAY)
    page_a.wait_for_timeout(1500)
    f_key = draft_key(f"u:{user_f}")
    items = local_items(page_a)
    write_row(
        "F types an essay of their own in the first tab, and it is kept as F's own draft",
        F_MARK in (items.get(f_key) or "") and E_MARK not in (items.get(f_key) or ""),
        f"{f_key} carries F's essay: {F_MARK in (items.get(f_key) or '')}, E's: {E_MARK in (items.get(f_key) or '')}",
    )

    journey.ws_sign_out(page_b)
    signed_in = journey.ws_sign_in(page_b, EMAIL_E, PASSWORD)
    page_a.bring_to_front()
    try:
        page_a.wait_for_function(
            "(mark) => { const t = document.querySelector('textarea'); return !!t && t.value.includes(mark); }",
            arg=E_MARK,
            timeout=15000,
        )
    except Exception:
        pass
    page_a.wait_for_timeout(800)
    value = textarea_value(page_a)
    write_row(
        "E signs back in (second tab): the first tab's editor shows E's own draft again, never reloaded",
        bool(signed_in) and E_MARK in value and F_MARK not in value and same_page(page_a),
        f"signed in as {signed_in}; E's essay in the text box: {E_MARK in value}; F's: {F_MARK in value}; "
        f"same page: {same_page(page_a)}",
    )
    items = local_items(page_a)
    write_row(
        "F's essay stays in F's own draft, untouched by E's return",
        F_MARK in (items.get(f_key) or "") and keys_carrying(items, F_MARK) == [f_key],
        f"keys carrying F's essay: {keys_carrying(items, F_MARK)}",
    )
    shot(page_a, "10-editor-e-back-finds-draft", "/trainers/writing")

    journey.click_until(
        page_a,
        lambda: page_a.get_by_role("button", name="Check my essay"),
        lambda: bool(grader_a.held),
        attempts=6,
        delay=1500,
    )
    held = grader_a.wait_until_held(timeout_ms=20000)
    body_sent = grader_a.bodies[-1] if grader_a.bodies else ""
    write_row(
        "E submits the restored essay: the request carries E's text and nothing of F's (held, reaches no grader)",
        held and E_MARK in body_sent and F_MARK not in body_sent,
        f"held: {held}; carries E's essay: {E_MARK in body_sent}; carries F's: {F_MARK in body_sent}",
    )
    if held:
        grader_a.release(essay_reply())
    try:
        page_a.wait_for_selector("text=Mechanics check", timeout=20000)
    except Exception:
        pass
    page_a.wait_for_timeout(1200)
    body = body_text(page_a)
    items = local_items(page_a)
    rows_e = ((parsed(items, f"ielts.progress.v1::{e_ns}") or {}).get("writing") or {}).get(PROMPT_ID) or []
    rows_f = ((parsed(items, f"ielts.progress.v1::u:{user_f}") or {}).get("writing") or {}).get(PROMPT_ID) or []
    write_row(
        "E's report shows (synthetic reply) and the attempt is kept in E's history only; E's draft is cleared",
        SYNTHETIC_NOTE in body
        and any(E_MARK in (r.get("essay") or "") for r in rows_e)
        and not rows_f
        and e_key not in items,
        f"report on screen: {SYNTHETIC_NOTE in body}; E's rows: {len(rows_e)}; F's rows: {len(rows_f)}; "
        f"E's draft still there: {e_key in items}",
    )
    shot(page_a, "11-editor-e-report", "/trainers/writing")

    debounce_scenario(page_a, page_b, grader_a, user_e)

    report_diagnostics("Editor, first tab", errors, failed)
    report_diagnostics("Editor, second tab", errors_b, failed_b)
    ctx.close()


def debounce_scenario(page_a, page_b, grader_a, user_e) -> None:
    write_section(
        "4. A switch inside the 600 ms autosave wait (Codex R2B-01)",
        "E types in the first tab and, within the 600 ms the autosave waits for typing to pause, "
        "signs out from the second tab (its account menu already open, so the click is immediate). "
        "The page itself records when the last keystroke landed and when the editor was handed "
        "over, so the timing below is measured, not assumed. Before the fix, the autosave fired "
        "after the switch and saved E's latest text under whoever had just taken over.",
    )
    e_key = draft_key(f"u:{user_e}")
    timing = {}
    for attempt in range(1, 4):
        if attempt > 1:
            journey.ws_sign_in(page_b, EMAIL_E, PASSWORD)
            page_a.bring_to_front()
            page_a.wait_for_timeout(2000)
        open_writing_task(page_a)
        page_a.locator("textarea").first.fill(EARLY_TEXT)
        page_a.wait_for_timeout(1500)
        page_a.evaluate(
            """(mark) => {
                const state = { lastInput: 0, sawLate: false, replacedAt: 0 };
                window.__f23Timing = state;
                document.addEventListener('input', () => { state.lastInput = performance.now(); }, true);
                const tick = () => {
                    const box = document.querySelector('textarea');
                    const value = box ? box.value : '';
                    if (value.includes(mark)) state.sawLate = true;
                    else if (state.sawLate && !state.replacedAt) state.replacedAt = performance.now();
                    if (!state.replacedAt) setTimeout(tick, 2);
                };
                tick();
            }""",
            LATE_MARK,
        )
        journey.open_workspace_menu(page_b)
        sign_out = page_b.get_by_role("menuitem", name="Sign out").first
        try:
            sign_out.wait_for(timeout=8000)
        except Exception:
            pass
        page_a.locator("textarea").first.fill(LATE_TEXT)
        try:
            sign_out.click(timeout=4000)
        except Exception:
            pass
        page_a.wait_for_timeout(2500)
        timing = page_a.evaluate("() => window.__f23Timing") or {}
        gap = (timing.get("replacedAt") or 0) - (timing.get("lastInput") or 0)
        timing["gap"] = gap
        timing["attempt"] = attempt
        if timing.get("replacedAt") and 0 < gap < 600:
            break

    gap = timing.get("gap") or 0
    inside = bool(timing.get("replacedAt")) and 0 < gap < 600
    write_row(
        "The switch landed inside the 600 ms autosave wait (measured in the page)",
        inside,
        f"last keystroke to hand-over: {gap:.0f} ms, on attempt {timing.get('attempt')}",
    )
    page_a.wait_for_timeout(1500)
    items = local_items(page_a)
    value = textarea_value(page_a)
    write_row(
        "E's latest text, typed just before the switch, is saved under E",
        LATE_MARK in (items.get(e_key) or ""),
        f"{e_key} carries the latest text: {LATE_MARK in (items.get(e_key) or '')}",
    )
    carrying = sorted(set(keys_carrying(items, LATE_MARK) + keys_carrying(items, EARLY_MARK)))
    write_row(
        "Nothing of it is saved under the signed-out device owner or anybody else, even after the wait ran out",
        carrying == [e_key],
        f"keys carrying E's text: {carrying}; draft keys for this task: {draft_keys(items)}",
    )
    write_row(
        "The first tab's editor emptied at the switch and says the account changed",
        LATE_MARK not in value and ACCOUNT_NOTE in body_text(page_a),
        f"E's text still in the text box: {LATE_MARK in value}; note shown: {ACCOUNT_NOTE in body_text(page_a)}",
    )
    shot(page_a, "12-debounce-switched-mid-wait", "/trainers/writing")

    journey.ws_sign_in(page_b, EMAIL_E, PASSWORD)
    page_a.bring_to_front()
    try:
        page_a.wait_for_function(
            "(mark) => { const t = document.querySelector('textarea'); return !!t && t.value.includes(mark); }",
            arg=LATE_MARK,
            timeout=15000,
        )
    except Exception:
        pass
    value = textarea_value(page_a)
    write_row(
        "E signs back in and the first tab's editor shows the latest text E typed before the switch",
        LATE_MARK in value,
        f"latest text in the text box: {LATE_MARK in value}",
    )
    shot(page_a, "13-debounce-e-back-latest-text", "/trainers/writing")
    write_row(
        "No grading request went out during either switch",
        len(grader_a.bodies) == 1,
        f"grading requests seen in the first tab: {len(grader_a.bodies)} (the one E sent in section 3)",
    )


# ── 5. a late grade and a revised draft (R2C-01) ──────────────────────────
#
# Found by the third Codex inspection: the grade's keep step cleared its
# student's draft whatever the draft held by then. The fix clears it only
# while it still holds exactly the text that was graded.

def revision_scenario(browser) -> None:
    write_section(
        "5. A late grade leaves a later revision alone (Codex R2C-01)",
        "Student G submits an essay; the grading request is held. G signs out and back in from the "
        "avatar menu of the SAME page, gets the submitted essay back in the editor, and revises it; the "
        "revision autosaves. Only then is the held request answered. Before the fix, that older grade "
        "deleted G's draft, so a reload lost the revision.",
    )
    ctx = new_context(browser)
    page = ctx.new_page()
    errors, failed = attach_diagnostics(page)

    goto(page, "/dashboard")
    journey.wait_for_dashboard(page)
    user_g = journey.ws_sign_up(page, EMAIL_G, PASSWORD)
    write_row("Student G signed up on the local stand-in", bool(user_g), f"user id {user_g}")
    g_key = draft_key(f"u:{user_g}")

    grader = HeldGrader(page, GRADER_ESSAY_PATH)
    open_writing_task(page)
    page.locator("textarea").first.fill(G_ESSAY)
    page.wait_for_timeout(900)
    mark_page(page)
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name="Check my essay"),
        lambda: bool(grader.held),
        attempts=6,
        delay=1500,
    )
    held = grader.wait_until_held()
    sent = grader.bodies[0] if grader.bodies else ""
    write_row(
        "G's grading request went out and is being held (nothing reached any grader)",
        held and G_MARK in sent and REVISION_MARK not in sent,
        f"held={len(grader.held)}; request carries G's essay: {G_MARK in sent}",
    )
    shot(page, "14-revision-g-grading-held", "/trainers/writing")

    journey.ws_sign_out(page)
    signed_in = journey.ws_sign_in(page, EMAIL_G, PASSWORD)
    try:
        page.wait_for_function(
            "(mark) => { const t = document.querySelector('textarea'); return !!t && t.value.includes(mark); }",
            arg=G_MARK,
            timeout=15000,
        )
    except Exception:
        pass
    value = textarea_value(page)
    write_row(
        "G signs out and back in on the same page: the submitted essay is back in G's editor, grade still held",
        bool(signed_in) and G_MARK in value and bool(grader.held) and same_page(page),
        f"signed in as {signed_in}; essay in the text box: {G_MARK in value}; request still held: "
        f"{bool(grader.held)}; same page (no reload): {same_page(page)}",
    )

    page.locator("textarea").first.fill(G_REVISION)
    page.wait_for_timeout(1500)
    items = local_items(page)
    write_row(
        "G revises the essay and the revision autosaves as G's draft",
        REVISION_MARK in (items.get(g_key) or ""),
        f"{g_key} carries the revision: {REVISION_MARK in (items.get(g_key) or '')}",
    )
    shot(page, "15-revision-g-revised-while-grading", "/trainers/writing")

    grader.release(essay_reply())
    page.wait_for_timeout(3000)
    items = local_items(page)
    rows = ((parsed(items, f"ielts.progress.v1::u:{user_g}") or {}).get("writing") or {}).get(PROMPT_ID) or []
    body = body_text(page)
    write_row(
        "The earlier grade arrives: it is kept in G's history (the original essay), and not painted over the editor",
        len(rows) == 1
        and G_MARK in (rows[0].get("essay") or "")
        and REVISION_MARK not in (rows[0].get("essay") or "")
        and f"write:{PROMPT_ID}" in record_activity_ids(items, user_g)
        and SYNTHETIC_NOTE not in body
        and same_page(page),
        f"G's writing rows: {len(rows)}; row is the original essay: "
        f"{bool(rows) and G_MARK in (rows[0].get('essay') or '') and REVISION_MARK not in (rows[0].get('essay') or '')}; "
        f"G's record: {record_activity_ids(items, user_g)}; report text on screen: {SYNTHETIC_NOTE in body}; "
        f"same page: {same_page(page)}",
    )
    write_row(
        "G's draft still holds the revision after the earlier grade was kept (before the fix it was deleted here)",
        REVISION_MARK in (items.get(g_key) or "") and REVISION_MARK in textarea_value(page),
        f"{g_key} carries the revision: {REVISION_MARK in (items.get(g_key) or '')}; "
        f"revision in the text box: {REVISION_MARK in textarea_value(page)}",
    )
    shot(page, "16-revision-grade-arrived-revision-kept", "/trainers/writing")

    open_writing_task(page)
    try:
        page.wait_for_function(
            "(mark) => { const t = document.querySelector('textarea'); return !!t && t.value.includes(mark); }",
            arg=REVISION_MARK,
            timeout=15000,
        )
    except Exception:
        pass
    value = textarea_value(page)
    write_row(
        "After a reload the editor opens G's revision",
        REVISION_MARK in value and not same_page(page),
        f"revision in the text box: {REVISION_MARK in value}; the page really was reloaded: {not same_page(page)}",
    )
    try:
        page.wait_for_selector(f"#history >> text={PROMPT_TITLE}", timeout=15000)
    except Exception:
        pass
    history = page.locator("#history").inner_text() if page.locator("#history").count() else ""
    write_row(
        "G's writing history on the page lists the graded attempt",
        PROMPT_TITLE in history,
        f"history lists the prompt: {PROMPT_TITLE in history}",
    )
    shot(page, "17-revision-after-reload", "/trainers/writing")

    page.wait_for_timeout(3000)
    g_events = standin_event_ids(user_g)
    g_state = standin_user_state_text(user_g)
    write_row(
        "G's account on the stand-in received the original essay's grade, and never the unsubmitted revision",
        any(f"write:{PROMPT_ID}" in e for e in g_events) and G_MARK in g_state and REVISION_MARK not in g_state,
        f"G's events: {g_events}; user_state carries the essay: {G_MARK in g_state}, the revision: "
        f"{REVISION_MARK in g_state}",
    )
    write_row(
        "Exactly one grading request left the page",
        len(grader.bodies) == 1,
        f"grading requests seen: {len(grader.bodies)}",
    )
    report_diagnostics("Revision", errors, failed)
    ctx.close()


# ── 6. a speaking attempt stops the moment its student leaves (R2C-04) ────
#
# Found by the third Codex inspection: nothing stopped the speaking attempt
# when the page changed hands, so the next student could answer the first
# student's remaining questions and the combined recording became the first
# student's evidence. The fix suspends the attempt at the switch.

def media_state(page) -> dict:
    try:
        return page.evaluate(
            """() => {
                const probe = window.__f23Media || { tracks: [], recorders: [], stopCalls: [] };
                return {
                    tracks: probe.tracks.length,
                    liveTracks: probe.tracks.filter((t) => t.readyState === 'live').length,
                    recorders: probe.recorders.length,
                    activeRecorders: probe.recorders.filter((r) => r.state !== 'inactive').length,
                    stopCalls: probe.stopCalls.slice(),
                };
            }"""
        )
    except Exception:
        return {}


def speaking_switch_scenario(browser) -> None:
    write_section(
        "6. A speaking attempt stops the moment its student leaves (Codex R2C-04)",
        "Student H opens a Part 1 topic on the speaking trainer (the recorded checker) by its exact "
        "link, answers question 1 through the browser's FAKE microphone (a test tone, no real voice), "
        "and is recording question 2 when H signs out and student I signs up in a SECOND tab of the same "
        "browser. Before the fix the first tab carried on: I could answer the remaining questions, and "
        "the whole recording was then graded as H's.",
    )
    ctx = new_context(browser, permissions=["microphone"])
    ctx.add_init_script(MEDIA_PROBE)
    page_a = ctx.new_page()
    errors, failed = attach_diagnostics(page_a)
    grader_a = HeldGrader(page_a, GRADER_SPEAKING_PATH)

    goto(page_a, "/dashboard")
    journey.wait_for_dashboard(page_a)
    user_h = journey.ws_sign_up(page_a, EMAIL_H, PASSWORD)
    write_row("Student H signed up on the local stand-in", bool(user_h), f"user id {user_h}")

    goto(page_a, f"/trainers/speaking?part=1&topic={PART1_TOPIC}")
    journey.click_until(
        page_a,
        lambda: page_a.get_by_role("button", name="Start answering"),
        lambda: page_a.get_by_role("button", name="Stop answering").count() > 0,
    )
    page_a.wait_for_timeout(2500)
    journey.try_click(page_a.get_by_role("button", name="Stop answering"))
    try:
        page_a.wait_for_selector(f"text={PART1_Q2}", timeout=15000)
    except Exception:
        pass
    journey.click_until(
        page_a,
        lambda: page_a.get_by_role("button", name="Start answering"),
        lambda: page_a.get_by_role("button", name="Stop answering").count() > 0,
    )
    page_a.wait_for_timeout(1500)
    mark_page(page_a)
    before_switch = media_state(page_a)
    body = body_text(page_a)
    write_row(
        "H answered question 1 and is recording question 2 through the fake microphone",
        PART1_Q2 in body
        and page_a.get_by_role("button", name="Stop answering").count() > 0
        and before_switch.get("activeRecorders") == 1
        and (before_switch.get("liveTracks") or 0) >= 1,
        f"question 2 on screen: {PART1_Q2 in body}; recorders started: {before_switch.get('recorders')}, "
        f"recording now: {before_switch.get('activeRecorders')}; live microphone tracks: "
        f"{before_switch.get('liveTracks')}",
    )
    shot(page_a, "18-speaking-h-recording-question-2", "/trainers/speaking")

    page_b = ctx.new_page()
    errors_b, failed_b = attach_diagnostics(page_b)
    grader_b = HeldGrader(page_b, GRADER_SPEAKING_PATH)
    goto(page_b, "/dashboard")
    journey.wait_for_dashboard(page_b)
    journey.open_workspace_menu(page_b)
    sign_out = page_b.get_by_role("menuitem", name="Sign out").first
    try:
        sign_out.wait_for(timeout=8000)
    except Exception:
        pass
    clicked_at = time.time() * 1000
    try:
        sign_out.click(timeout=4000)
    except Exception:
        pass
    page_a.bring_to_front()
    page_a.wait_for_timeout(2000)
    after_switch = media_state(page_a)
    stops = [t for t in (after_switch.get("stopCalls") or []) if t >= clicked_at - 50]
    stop_gap = (stops[0] - clicked_at) if stops else None
    body = body_text(page_a)
    write_row(
        "H signs out in the second tab: the first tab's recording stops and its microphone is released at once",
        after_switch.get("activeRecorders") == 0
        and after_switch.get("liveTracks") == 0
        and stop_gap is not None
        and stop_gap < 3000
        and same_page(page_a),
        f"recording now: {after_switch.get('activeRecorders')}; live microphone tracks: "
        f"{after_switch.get('liveTracks')}; recorder told to stop "
        f"{'%.0f ms' % stop_gap if stop_gap is not None else 'never'} after the sign-out click "
        f"(the other tab hears of it through the browser's shared storage); same page (no reload): {same_page(page_a)}",
    )
    write_row(
        "The first tab is back at its menu with the one-line notice, and nothing of the attempt is left on it",
        SESSION_CLOSED in body
        and PART1_Q2 not in body
        and page_a.get_by_role("button", name="Stop answering").count() == 0
        and page_a.get_by_role("button", name="Start answering").count() == 0,
        f"notice shown: {SESSION_CLOSED in body}; question 2 still on screen: {PART1_Q2 in body}; "
        f"answer buttons left: {page_a.get_by_role('button', name='Stop answering').count() + page_a.get_by_role('button', name='Start answering').count()}",
    )
    shot(page_a, "19-speaking-stopped-at-switch", "/trainers/speaking")

    user_i = journey.ws_sign_up(page_b, EMAIL_I, PASSWORD)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2500)
    body = body_text(page_a)
    state_i = media_state(page_a)
    write_row(
        "I signs up in the second tab: the first tab shows I no attempt and no way to answer H's remaining questions",
        bool(user_i)
        and PART1_Q2 not in body
        and PART1_Q3 not in body
        and page_a.get_by_role("button", name="Stop answering").count() == 0
        and page_a.get_by_role("button", name="Start answering").count() == 0
        and state_i.get("activeRecorders") == 0
        and state_i.get("liveTracks") == 0
        and same_page(page_a),
        f"user id {user_i}; question 2 or 3 on screen: {PART1_Q2 in body or PART1_Q3 in body}; recording now: "
        f"{state_i.get('activeRecorders')}; live microphone tracks: {state_i.get('liveTracks')}; same page: {same_page(page_a)}",
    )
    shot(page_a, "20-speaking-i-sees-no-attempt", "/trainers/speaking")

    page_a.wait_for_timeout(3000)
    sent = grader_a.bodies + grader_b.bodies
    write_row(
        "No grading request left either tab (nothing was graded or paid for)",
        not sent and not grader_a.held and not grader_b.held,
        f"grading requests seen: {len(sent)}",
    )
    items = local_items(page_a)
    speak_id = f"speak:{PART1_TOPIC}"
    rows_h = (parsed(items, f"ielts.progress.v1::u:{user_h}") or {}).get("speaking") or []
    rows_i = (parsed(items, f"ielts.progress.v1::u:{user_i}") or {}).get("speaking") or []
    write_row(
        "Nothing from the attempt was recorded for H, or for I, on this device",
        not rows_h
        and not rows_i
        and speak_id not in record_activity_ids(items, user_h)
        and speak_id not in record_activity_ids(items, user_i),
        f"H's speaking rows: {len(rows_h)}; I's: {len(rows_i)}; H's record: {record_activity_ids(items, user_h)}; "
        f"I's record: {record_activity_ids(items, user_i)}",
    )
    h_events = standin_event_ids(user_h)
    i_events = standin_event_ids(user_i)
    write_row(
        "Nothing from the attempt reached H's or I's account on the stand-in",
        not any(e.startswith("speak:") for e in h_events) and not any(e.startswith("speak:") for e in i_events),
        f"H's events: {h_events}; I's events: {i_events}",
    )

    journey.ws_sign_out(page_b)
    signed_in = journey.ws_sign_in(page_b, EMAIL_H, PASSWORD)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2500)
    body = body_text(page_a)
    state_h = media_state(page_a)
    write_row(
        "H signs back in (second tab): the stopped attempt does not come back to life, and nothing records",
        bool(signed_in)
        and PART1_Q2 not in body
        and page_a.get_by_role("button", name="Stop answering").count() == 0
        and state_h.get("activeRecorders") == 0
        and state_h.get("liveTracks") == 0
        and not (grader_a.bodies + grader_b.bodies)
        and same_page(page_a),
        f"signed in as {signed_in}; question 2 on screen: {PART1_Q2 in body}; recording now: "
        f"{state_h.get('activeRecorders')}; grading requests: {len(grader_a.bodies + grader_b.bodies)}; "
        f"same page (no reload): {same_page(page_a)}",
    )
    report_diagnostics("Speaking switch, first tab", errors, failed)
    report_diagnostics("Speaking switch, second tab", errors_b, failed_b)
    ctx.close()


# ── Section 7 (R2D-01): the live examiner's start, raced by an account change ──
#
# The live examiner is started here as far as it can go without a voice
# service, and no further. Its address points at a path on the local stand-in
# that the stand-in does not serve, and every request to it is INTERCEPTED in
# the browser before it leaves: the settings request is answered with
# SYNTHETIC settings (the paid provider, sign-in required), so the examiner
# goes on to ask for the microphone; the request that would create a paid
# voice session is never sent anywhere, it is counted and refused (or held,
# then refused) with a SYNTHETIC failure. No token that could reach a real
# service exists in this run.
#
# The microphone is the browser's FAKE one (a test tone). A small wrapper
# installed before the page loads can HOLD the page's microphone request, so
# the account can change while the permission is "still being asked for",
# exactly the window finding R2D-01 describes, and it records every track,
# recorder, peer connection and socket the page makes, so what is left
# running is measured, not inferred from the screen.

EMAIL_J = f"synthetic-student-j-f23-{RUN}@example.test"
EMAIL_K = f"synthetic-student-k-f23-{RUN}@example.test"
EMAIL_L = f"synthetic-student-l-f23-{RUN}@example.test"
EMAIL_M = f"synthetic-student-m-f23-{RUN}@example.test"

EXAMINER_PATH = "SYNTHETIC-intercepted-live-examiner"
EXAMINER_SETTINGS = {
    "provider": "openai",
    "model": "SYNTHETIC-no-model",
    "backendModel": None,
    "requiresSignIn": True,
}
EXAMINER_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}
MOCK_PATH = "/tests/mock"
MOCK_STOPPED = "Mock exam stopped"
MOCK_RESUME = "Continue where you left off"
SPEAKING_START = "Start speaking test"
SPEAKING_INTERRUPTED = "Your speaking test was interrupted before it finished"
EXAMINER_CONNECTING = "Connecting you to"
EXAMINER_START = "Start the interview"

EXAMINER_PROBE = """
(() => {
  const probe = {
    hold: false,
    held: [],
    micRequests: 0,
    tracks: [],
    recorders: [],
    recorderStops: 0,
    peers: [],
    sockets: [],
    // Section 8: the connection setup's offer, held while it is prepared.
    offers: 0,
    holdOffer: false,
    heldOffers: [],
    blockedSockets: 0,
  };
  window.__f23Examiner = probe;
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) {
    const original = md.getUserMedia.bind(md);
    md.getUserMedia = (constraints) => {
      probe.micRequests += 1;
      const answer = () =>
        original(constraints).then((stream) => {
          stream.getTracks().forEach((track) => probe.tracks.push(track));
          return stream;
        });
      if (!probe.hold) return answer();
      return new Promise((resolve, reject) => {
        probe.held.push(() => answer().then(resolve, reject));
      });
    };
  }
  window.__f23ReleaseOffer = () => {
    probe.holdOffer = false;
    const waiting = probe.heldOffers.splice(0);
    waiting.forEach((run) => run());
    return waiting.length;
  };
  window.__f23ReleaseMicrophone = () => {
    probe.hold = false;
    const waiting = probe.held.splice(0);
    waiting.forEach((run) => run());
    return waiting.length;
  };
  const Recorder = window.MediaRecorder;
  if (Recorder) {
    const start = Recorder.prototype.start;
    const stop = Recorder.prototype.stop;
    Recorder.prototype.start = function (...args) { probe.recorders.push(this); return start.apply(this, args); };
    Recorder.prototype.stop = function (...args) { probe.recorderStops += 1; return stop.apply(this, args); };
  }
  const Peer = window.RTCPeerConnection;
  if (Peer) {
    const createOffer = Peer.prototype.createOffer;
    Peer.prototype.createOffer = function (...args) {
      probe.offers += 1;
      const run = () => createOffer.apply(this, args);
      if (!probe.holdOffer) return run();
      return new Promise((resolve, reject) => {
        probe.heldOffers.push(() => run().then(resolve, reject));
      });
    };
    window.RTCPeerConnection = new Proxy(Peer, {
      construct(target, args) {
        const peer = new target(...args);
        probe.peers.push(peer);
        return peer;
      },
    });
  }
  const Socket = window.WebSocket;
  if (Socket) {
    window.WebSocket = new Proxy(Socket, {
      construct(target, args) {
        const url = String(args[0]);
        probe.sockets.push(url);
        // No socket of this run may leave this machine: a voice socket would
        // go to a real service. Only the dev server's own is let through.
        if (!url.includes(location.host)) {
          probe.blockedSockets += 1;
          throw new DOMException('SYNTHETIC: f23 refuses every socket to another host.', 'SecurityError');
        }
        return new target(...args);
      },
    });
  }
})();
"""


class InterceptedExaminer:
    """Stands in for the live examiner's address, for every page of one
    browser context. Nothing it answers can reach a voice service."""

    def __init__(self, ctx, hold_connections: bool = False, settings: dict | None = None):
        self.hold_connections = hold_connections
        self.settings = settings or EXAMINER_SETTINGS
        self.settings_requests = 0
        self.connection_requests = 0
        # The sign-in token each voice session request carried, so the run
        # can ask the local stand-in whose it was.
        self.bearers = []
        self.held = []
        self.other_requests = []
        ctx.route(f"**/{EXAMINER_PATH}**", self._handle)

    def _handle(self, route):
        request = route.request
        if request.method == "OPTIONS":
            route.fulfill(status=204, headers=EXAMINER_CORS, body="")
            return
        path = request.url.split("?")[0].rstrip("/")
        if path.endswith(EXAMINER_PATH) and request.method == "GET":
            self.settings_requests += 1
            route.fulfill(
                status=200, content_type="application/json", headers=EXAMINER_CORS, body=json.dumps(self.settings)
            )
            return
        if path.endswith(EXAMINER_PATH) and request.method == "POST":
            # The request that would create a paid voice session.
            self.connection_requests += 1
            auth = request.headers.get("authorization") or ""
            self.bearers.append(auth[7:].strip() if auth.lower().startswith("bearer ") else "")
            if self.hold_connections:
                self.held.append(route)
                return
            self._refuse(route)
            return
        self.other_requests.append(f"{request.method} {path.rsplit('/', 1)[-1]}")
        route.fulfill(status=204, headers=EXAMINER_CORS, body="")

    @staticmethod
    def _refuse(route) -> None:
        route.fulfill(
            status=503,
            content_type="application/json",
            headers=EXAMINER_CORS,
            body=json.dumps({"error": "SYNTHETIC: there is no voice service in this run (f23)."}),
        )

    def wait_until_held(self, page, timeout_ms: int = 30000) -> bool:
        waited = 0
        while not self.held and waited < timeout_ms:
            page.wait_for_timeout(250)
            waited += 250
        return bool(self.held)

    def refuse_held(self) -> int:
        refused = 0
        while self.held:
            self._refuse(self.held.pop(0))
            refused += 1
        return refused

    def answer_held_with_token(self) -> int:
        """Section 8, the Gemini rollback: the held request is the one for an
        ephemeral voice token. It is answered with a SYNTHETIC value that is
        no token at all, so that what the page does NEXT (open the voice
        socket, or not) can be seen."""
        answered = 0
        while self.held:
            self.held.pop(0).fulfill(
                status=200,
                content_type="application/json",
                headers=EXAMINER_CORS,
                body=json.dumps(SYNTHETIC_GEMINI_TOKEN),
            )
            answered += 1
        return answered


def token_owner(bearer: str) -> str | None:
    """Whose sign-in token this is, asked of the LOCAL stand-in (the only
    place these tokens mean anything)."""
    if not bearer:
        return None
    import urllib.request

    request = urllib.request.Request(
        f"{STANDIN_URL}/auth/v1/user",
        headers={"Authorization": f"Bearer {bearer}", "apikey": "local-anon-key"},
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8")).get("id")
    except Exception:
        return None


def carried_by(examiner, names: dict) -> str:
    owners = [token_owner(b) for b in examiner.bearers]
    if not owners:
        return "none"
    return ", ".join(names.get(o, o or "no token") for o in owners)


def examiner_state(page) -> dict:
    try:
        return page.evaluate(
            """() => {
                const p = window.__f23Examiner;
                if (!p) return { probe: false };
                return {
                    probe: true,
                    micRequests: p.micRequests,
                    heldMicrophone: p.held.length,
                    tracks: p.tracks.length,
                    liveTracks: p.tracks.filter((t) => t.readyState === 'live').length,
                    recorders: p.recorders.length,
                    activeRecorders: p.recorders.filter((r) => r.state !== 'inactive').length,
                    peers: p.peers.length,
                    openPeers: p.peers.filter((pc) => pc.signalingState !== 'closed').length,
                    // The dev server's own live-reload socket (to this page's
                    // host) is not the examiner's, so it is counted apart.
                    sockets: p.sockets.filter((url) => !url.includes(location.host)).length,
                    devServerSockets: p.sockets.filter((url) => url.includes(location.host)).length,
                    offers: p.offers || 0,
                    heldOffers: (p.heldOffers || []).length,
                    blockedSockets: p.blockedSockets || 0,
                };
            }"""
        )
    except Exception:
        return {}


def wait_for_state(page, predicate, timeout_ms: int = 20000) -> dict:
    waited = 0
    state = examiner_state(page)
    while not predicate(state) and waited < timeout_ms:
        page.wait_for_timeout(250)
        waited += 250
        state = examiner_state(page)
    return state


def state_text(state: dict) -> str:
    return (
        f"microphone requests {state.get('micRequests')}, held {state.get('heldMicrophone')}; tracks handed back "
        f"{state.get('tracks')}, still live {state.get('liveTracks')}; recorders started {state.get('recorders')}, "
        f"still recording {state.get('activeRecorders')}; peer connections made {state.get('peers')}, still open "
        f"{state.get('openPeers')}; sockets other than the dev server's own live-reload one {state.get('sockets')}"
    )


def shows(body: str, text: str) -> bool:
    """Screen text as the student reads it: some labels are upper-cased by
    the page's styling, so the comparison ignores case."""
    return text.lower() in body.lower()


def wait_for_text(page, text: str, timeout_ms: int = 15000) -> bool:
    waited = 0
    while not shows(body_text(page), text) and waited < timeout_ms:
        page.wait_for_timeout(250)
        waited += 250
    return shows(body_text(page), text)


def seed_speaking_brief(page, user_id: str) -> str:
    """The precondition, written straight into this student's own store: a
    SYNTHETIC mock sitting that has reached the Speaking brief (Listening,
    Reading and Writing already done). Driving three whole papers first
    would prove nothing more about the examiner; f22 does that journey."""
    now_ms = int(time.time() * 1000)
    key = f"ielts.mock.active.v1::u:{user_id}"
    leg = {"raw": 30, "total": 40, "band": 7, "bandLabel": "7", "secondsUsed": 1800}
    sitting = {
        "version": 1,
        "owner": f"u:{user_id}",
        "sittingId": f"sitting-SYNTHETIC-f23-{RUN}-{user_id[:8]}",
        "mockId": f"mock-SYNTHETIC-f23-{RUN}",
        "startedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(now_ms / 1000 - 3 * 3600)),
        "stage": "speaking-brief",
        "listeningTestId": "",
        "readingTestId": "",
        "task1PromptId": None,
        "task2PromptId": None,
        "listening": leg,
        "reading": leg,
        "essay1": "SYNTHETIC Task 1 answer written for the f23 run.",
        "essay2": "SYNTHETIC Task 2 answer written for the f23 run.",
        "writingEndsAt": now_ms - 60_000,
        "speakingBand": None,
        "speakingCriteria": None,
        "speakingSkipped": False,
        "legSittings": {},
        "savedAt": now_ms,
    }
    page.evaluate("([k, v]) => localStorage.setItem(k, v)", [key, json.dumps(sitting)])
    return key


def button_enabled(page, name: str) -> bool:
    try:
        button = page.get_by_role("button", name=name)
        return button.count() > 0 and button.first.is_enabled()
    except Exception:
        return False


def wait_until_enabled(page, name: str, timeout_ms: int = 20000) -> bool:
    waited = 0
    while not button_enabled(page, name) and waited < timeout_ms:
        page.wait_for_timeout(250)
        waited += 250
    return button_enabled(page, name)


def open_speaking_brief(page) -> bool:
    goto(page, MOCK_PATH)
    try:
        page.wait_for_selector('astro-island[component-url*="MockExam"]:not([ssr])', state="attached", timeout=20000)
    except Exception:
        pass
    page.wait_for_timeout(1200)
    journey.click_until(
        page,
        lambda: page.get_by_role("button", name=MOCK_RESUME),
        lambda: page.get_by_role("button", name=SPEAKING_START).count() > 0,
    )
    return wait_until_enabled(page, SPEAKING_START)


def sign_out_in_second_tab(page_b) -> None:
    goto(page_b, "/dashboard")
    journey.wait_for_dashboard(page_b)
    journey.open_workspace_menu(page_b)
    sign_out = page_b.get_by_role("menuitem", name="Sign out").first
    try:
        sign_out.wait_for(timeout=8000)
        sign_out.click(timeout=4000)
    except Exception:
        pass


def examiner_scenario(browser) -> None:
    write_section(
        "7. The live examiner's start asks after every wait (Codex R2D-01)",
        "Starting the examiner waits for its settings, for the microphone permission, for a sign-in token "
        "and for the voice connection. Before the fix the mock exam's embedded examiner asked nothing "
        "after those waits: if the account changed while the permission was still being asked for, the "
        "mock took the examiner off screen, and when the permission came back the examiner still kept the "
        "microphone, started recording, fetched a token and opened a paid voice session behind the stopped "
        "screen. Student J's SYNTHETIC mock sitting is put on its Speaking brief (written straight into J's "
        "own store; driving three whole papers first proves nothing more here), the examiner is started "
        "against an INTERCEPTED address with no voice service behind it, and the account is changed from a "
        "second tab at the two waits that matter: (a) the microphone request held unanswered while J signs "
        "out and student K signs up, then answered, with any voice session request that follows HELD so it "
        "would stay visible (before the fix that request carried K's token); (b) the voice session request "
        "held, then refused with a SYNTHETIC failure after J signs out. (c) repeats (a) on the standalone "
        "examiner page with students L and M.",
    )
    if not os.environ.get("F23_EXAMINER_CONFIGURED"):
        write_note(
            "**Section 7 not run:** it needs the site started with PUBLIC_LIVE_EXAMINER_URL pointed at the "
            f"intercepted path `{EXAMINER_PATH}` and F23_EXAMINER_CONFIGURED=1 (see the header)."
        )
        write_row("The examiner could be started against the intercepted address", False, "not configured for this run")
        return

    ctx = new_context(browser, permissions=["microphone"])
    ctx.add_init_script(EXAMINER_PROBE)
    examiner = InterceptedExaminer(ctx)
    page_a = ctx.new_page()
    errors, failed = attach_diagnostics(page_a)

    goto(page_a, "/dashboard")
    journey.wait_for_dashboard(page_a)
    user_j = journey.ws_sign_up(page_a, EMAIL_J, PASSWORD)
    write_row("Student J signed up on the local stand-in", bool(user_j), f"user id {user_j}")
    if not user_j:
        report_diagnostics("Examiner, first tab", errors, failed)
        ctx.close()
        return
    seed_speaking_brief(page_a, user_j)
    ready = open_speaking_brief(page_a)
    write_row(
        "J's sitting is on the Speaking brief and Start is enabled (the settings answered by the intercept)",
        ready and examiner.settings_requests >= 1,
        f"Start enabled: {ready}; settings requests answered: {examiner.settings_requests}",
    )

    # ── (a) the microphone request held, the switch, then the answer ──
    # Any voice session request is HELD from here on (none should come): a
    # start that went on would then still have its microphone and its
    # recording running while the request waits, where the run can see them.
    examiner.hold_connections = True
    page_a.evaluate("() => { window.__f23Examiner.hold = true; }")
    mark_page(page_a)
    journey.try_click(page_a.get_by_role("button", name=SPEAKING_START))
    pending = wait_for_state(page_a, lambda s: (s.get("heldMicrophone") or 0) >= 1)
    connecting = wait_for_text(page_a, EXAMINER_CONNECTING)
    pending = examiner_state(page_a)
    write_row(
        "(a) J presses Start: the examiner asks for the microphone, and the page's request is held unanswered",
        pending.get("heldMicrophone") == 1
        and pending.get("tracks") == 0
        and pending.get("recorders") == 0
        and connecting,
        f"{state_text(pending)}; connecting screen: {connecting}",
    )
    shot(page_a, "21-examiner-mock-microphone-pending", MOCK_PATH)

    page_b = ctx.new_page()
    errors_b, failed_b = attach_diagnostics(page_b)
    sign_out_in_second_tab(page_b)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2500)
    body = body_text(page_a)
    stopped = examiner_state(page_a)
    write_row(
        "(a) J signs out in the second tab: the mock stops and takes the examiner off screen while the "
        "microphone request is still unanswered",
        shows(body, MOCK_STOPPED)
        and not shows(body, EXAMINER_CONNECTING)
        and stopped.get("heldMicrophone") == 1
        and stopped.get("tracks") == 0
        and same_page(page_a),
        f"stopped screen: {shows(body, MOCK_STOPPED)}; examiner still on screen: {shows(body, EXAMINER_CONNECTING)}; "
        f"{state_text(stopped)}; same page (no reload): {same_page(page_a)}",
    )
    shot(page_a, "22-examiner-mock-stopped-microphone-pending", MOCK_PATH)

    # A different student is signed in on the browser before the microphone
    # answers: whoever's token a start that went on would use.
    user_k = journey.ws_sign_up(page_b, EMAIL_K, PASSWORD)
    page_a.bring_to_front()
    page_a.wait_for_timeout(1500)
    write_row(
        "(a) Student K signs up in the second tab while J's microphone request is still unanswered",
        bool(user_k) and examiner_state(page_a).get("heldMicrophone") == 1,
        f"user id {user_k}; held microphone requests: {examiner_state(page_a).get('heldMicrophone')}",
    )

    released = page_a.evaluate("() => window.__f23ReleaseMicrophone()")
    # A start that went on would request its voice session only after the
    # connection has prepared itself (up to 10 s), so watch for 12 s.
    waited = 0
    while examiner.connection_requests == 0 and waited < 12000:
        page_a.wait_for_timeout(500)
        waited += 500
    late = examiner_state(page_a)
    write_row(
        "(a) The microphone answers after the switch: the stream it hands back is stopped at once",
        released == 1 and (late.get("tracks") or 0) >= 1 and late.get("liveTracks") == 0,
        f"held requests answered now: {released}; {state_text(late)}",
    )
    write_row(
        "(a) Nothing follows the late microphone: no recording, no voice session requested (with K's token "
        "or anybody's), nothing opened",
        late.get("recorders") == 0
        and examiner.connection_requests == 0
        and late.get("peers") == 0
        and late.get("sockets") == 0
        and same_page(page_a),
        f"recorders started: {late.get('recorders')}; voice session requests: {examiner.connection_requests} "
        f"(whose token: {carried_by(examiner, {user_j: 'J', user_k: 'K'})}); peer connections: {late.get('peers')}; "
        f"sockets: {late.get('sockets')}; same page: {same_page(page_a)}",
    )
    shot(page_a, "23-examiner-mock-after-late-microphone", MOCK_PATH)
    examiner.refuse_held()
    examiner.hold_connections = False

    journey.ws_sign_out(page_b)
    signed_in = journey.ws_sign_in(page_b, EMAIL_J, PASSWORD)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2500)
    body = body_text(page_a)
    back = examiner_state(page_a)
    write_row(
        "(a) J signs back in: the first tab is back on the Speaking brief with the interview marked "
        "interrupted (the mock's own suspension, unchanged), and nothing is recording",
        bool(signed_in)
        and page_a.get_by_role("button", name=SPEAKING_START).count() > 0
        and shows(body, SPEAKING_INTERRUPTED)
        and back.get("activeRecorders") == 0
        and back.get("liveTracks") == 0
        and same_page(page_a),
        f"signed in as {signed_in}; brief shown: {page_a.get_by_role('button', name=SPEAKING_START).count() > 0}; "
        f"interrupted note: {shows(body, SPEAKING_INTERRUPTED)}; {state_text(back)}; same page: {same_page(page_a)}",
    )
    shot(page_a, "24-examiner-mock-back-on-brief", MOCK_PATH)

    # ── (b) the voice session request held, the switch, then a refusal ──
    examiner.hold_connections = True
    enabled = wait_until_enabled(page_a, SPEAKING_START)
    journey.try_click(page_a.get_by_role("button", name=SPEAKING_START))
    held = examiner.wait_until_held(page_a)
    before = examiner_state(page_a)
    write_row(
        "(b) J starts again: the microphone is granted, the recording starts, and the voice session request "
        "is held in the browser",
        enabled
        and held
        and examiner.connection_requests == 1
        and before.get("activeRecorders") == 1
        and (before.get("liveTracks") or 0) >= 1,
        f"Start enabled: {enabled}; request held: {held}; voice session requests: {examiner.connection_requests}; "
        f"{state_text(before)}",
    )
    shot(page_a, "25-examiner-mock-session-request-held", MOCK_PATH)

    sign_out_in_second_tab(page_b)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2500)
    body = body_text(page_a)
    mid = examiner_state(page_a)
    write_row(
        "(b) J signs out in the second tab while the request is held: the mock stops, the recording stops "
        "and the microphone is released at once",
        shows(body, MOCK_STOPPED) and mid.get("activeRecorders") == 0 and mid.get("liveTracks") == 0 and same_page(page_a),
        f"stopped screen: {shows(body, MOCK_STOPPED)}; {state_text(mid)}; same page: {same_page(page_a)}",
    )
    refused = examiner.refuse_held()
    page_a.wait_for_timeout(4000)
    after = examiner_state(page_a)
    write_row(
        "(b) The held request is then refused with a SYNTHETIC failure: nothing more starts (no second "
        "request, no socket, the peer connection closed, no new recording, no new microphone request)",
        refused == 1
        and examiner.connection_requests == 1
        and after.get("sockets") == 0
        and after.get("openPeers") == 0
        and after.get("recorders") == before.get("recorders")
        and after.get("micRequests") == before.get("micRequests")
        and after.get("activeRecorders") == 0
        and after.get("liveTracks") == 0
        and same_page(page_a),
        f"refused: {refused}; voice session requests in all: {examiner.connection_requests}; {state_text(after)}; "
        f"same page: {same_page(page_a)}",
    )
    shot(page_a, "26-examiner-mock-after-refused-request", MOCK_PATH)
    journey.ws_sign_in(page_b, EMAIL_J, PASSWORD)
    report_diagnostics("Examiner (mock), first tab", errors, failed)
    report_diagnostics("Examiner (mock), second tab", errors_b, failed_b)
    ctx.close()

    # ── (c) the standalone examiner page, the microphone request held ──
    ctx = new_context(browser, permissions=["microphone"])
    ctx.add_init_script(EXAMINER_PROBE)
    standalone = InterceptedExaminer(ctx)
    page_a = ctx.new_page()
    errors, failed = attach_diagnostics(page_a)
    goto(page_a, "/dashboard")
    journey.wait_for_dashboard(page_a)
    user_l = journey.ws_sign_up(page_a, EMAIL_L, PASSWORD)
    goto(page_a, "/speaking/examiner")
    # The start button is already drawn, enabled, by the server; a press
    # before the page has come alive does nothing. So wait for the examiner
    # to be live on the page and to have its (intercepted) settings.
    try:
        page_a.wait_for_selector('astro-island[component-url*="LiveExaminer"]:not([ssr])', state="attached", timeout=20000)
    except Exception:
        pass
    waited = 0
    while standalone.settings_requests < 1 and waited < 15000:
        page_a.wait_for_timeout(250)
        waited += 250
    page_a.wait_for_timeout(1500)
    ready = wait_until_enabled(page_a, EXAMINER_START)
    write_row(
        "(c) Student L opens the standalone examiner, signed in; Start is enabled (the settings answered by "
        "the intercept)",
        bool(user_l) and ready and standalone.settings_requests >= 1,
        f"user id {user_l}; Start enabled: {ready}; settings requests answered: {standalone.settings_requests}",
    )
    page_a.evaluate("() => { window.__f23Examiner.hold = true; }")
    mark_page(page_a)
    journey.try_click(page_a.get_by_role("button", name=EXAMINER_START))
    pending = wait_for_state(page_a, lambda s: (s.get("heldMicrophone") or 0) >= 1)
    write_row(
        "(c) L presses Start: the microphone request is held unanswered",
        pending.get("heldMicrophone") == 1 and pending.get("tracks") == 0,
        state_text(pending),
    )
    standalone.hold_connections = True
    page_b = ctx.new_page()
    errors_b, failed_b = attach_diagnostics(page_b)
    sign_out_in_second_tab(page_b)
    user_m = journey.ws_sign_up(page_b, EMAIL_M, PASSWORD)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2500)
    released = page_a.evaluate("() => window.__f23ReleaseMicrophone()")
    page_a.wait_for_timeout(4000)
    body = body_text(page_a)
    late = examiner_state(page_a)
    write_row(
        "(c) L signs out and student M signs up in the second tab, then the microphone answers: the stream "
        "is stopped at once, nothing records, no voice session is requested, and the page says the session "
        "was closed",
        bool(user_m)
        and released == 1
        and (late.get("tracks") or 0) >= 1
        and late.get("liveTracks") == 0
        and late.get("recorders") == 0
        and standalone.connection_requests == 0
        and late.get("peers") == 0
        and late.get("sockets") == 0
        and shows(body, SESSION_CLOSED)
        and same_page(page_a),
        f"held requests answered after the switch: {released}; {state_text(late)}; voice session requests: "
        f"{standalone.connection_requests}; notice shown: {shows(body, SESSION_CLOSED)}; same page: {same_page(page_a)}",
    )
    shot(page_a, "27-examiner-standalone-after-late-microphone", "/speaking/examiner")
    standalone.refuse_held()
    report_diagnostics("Examiner (standalone), first tab", errors, failed)
    report_diagnostics("Examiner (standalone), second tab", errors_b, failed_b)
    write_note(
        "Every request to the examiner address in this section was answered inside the browser by the run "
        "itself: settings with SYNTHETIC values, and every voice session request refused with a SYNTHETIC "
        "503 (at once, or after being held). The 503 lines in the diagnostics above are those refusals. No "
        "voice service, model or token service was reached."
    )
    ctx.close()


# -- Section 8 (R2D-01, inside the connection setup): the last window --------
#
# Section 7 races the account change against the microphone request and
# against the voice session request itself. Between the two there is one
# more wait, inside the connection setup (src/lib/speaking/live/
# openai-session.ts): once the sign-in token has been read, the connection
# prepares its offer for up to ten seconds and then sends the request that
# creates the paid voice session. On the Gemini rollback (session.ts) the
# same window is the request for an ephemeral voice token, followed by the
# voice socket. The setup now asks the examiner's own "may I continue" check
# right before that request and that socket. Here the probe HOLDS the page's
# offer (or the run holds the token request), the account changes from a
# second tab, and only then is the wait let go.

EMAIL_N = f"synthetic-student-n-f23-{RUN}@example.test"
EMAIL_O = f"synthetic-student-o-f23-{RUN}@example.test"
EMAIL_P = f"synthetic-student-p-f23-{RUN}@example.test"
EMAIL_Q = f"synthetic-student-q-f23-{RUN}@example.test"
EMAIL_R = f"synthetic-student-r-f23-{RUN}@example.test"
EMAIL_S = f"synthetic-student-s-f23-{RUN}@example.test"

# The Gemini rollback: free, no sign-in required. SYNTHETIC values only.
GEMINI_SETTINGS = {
    "provider": "gemini",
    "model": "SYNTHETIC-no-model",
    "backendModel": None,
    "requiresSignIn": False,
}
SYNTHETIC_GEMINI_TOKEN = {"token": "SYNTHETIC-f23-not-a-token", "model": "SYNTHETIC-no-model"}

# Once let go, the connection may prepare itself for up to ten seconds
# before it would send its request, so the run watches for longer.
SETUP_WATCH_MS = 13000


def link_state_text(state: dict) -> str:
    return (
        f"{state_text(state)}; connection offers prepared {state.get('offers')}, held {state.get('heldOffers')}; "
        f"sockets refused by the run's wrapper {state.get('blockedSockets')}"
    )


def bearers_text(examiner, names: dict) -> str:
    """Whose sign-in token each voice session request carried. A token the
    stand-in no longer accepts belongs to a student who has signed out since
    (the token is read BEFORE the window this section races)."""
    if not examiner.bearers:
        return "none sent"
    labels = []
    for bearer in examiner.bearers:
        if not bearer:
            labels.append("no token")
            continue
        owner = token_owner(bearer)
        labels.append(names.get(owner, owner) if owner else "a token the stand-in no longer accepts (its student signed out)")
    return ", ".join(labels)


def watch_for_requests(page, examiner, ms: int) -> None:
    waited = 0
    while examiner.connection_requests == 0 and waited < ms:
        page.wait_for_timeout(500)
        waited += 500


def open_standalone_examiner(page, examiner) -> bool:
    goto(page, "/speaking/examiner")
    # The start button is drawn, enabled, by the server; a press before the
    # page has come alive does nothing (see section 7 (c)).
    try:
        page.wait_for_selector('astro-island[component-url*="LiveExaminer"]:not([ssr])', state="attached", timeout=20000)
    except Exception:
        pass
    waited = 0
    while examiner.settings_requests < 1 and waited < 15000:
        page.wait_for_timeout(250)
        waited += 250
    page.wait_for_timeout(1500)
    return wait_until_enabled(page, EXAMINER_START)


def link_window_scenario(browser) -> None:
    write_section(
        "8. The connection setup asks before the paid request (Codex R2D-01, the last window)",
        "After section 7's fix one window was left inside the connection setup: once the sign-in token has "
        "been read, the connection prepares itself for up to ten seconds and then sends the request that "
        "creates the paid voice session, and nothing asked again in between (on the Gemini rollback, the "
        "same window lies between the ephemeral token request and the voice socket). The setup now asks the "
        "examiner's own check right before that request and that socket. A wrapper installed before the "
        "page loads HOLDS the connection's offer while it is being prepared, so the account changes inside "
        "exactly that window: (a) student N in the mock's examiner, (b) student P on the standalone examiner "
        "page, both on the paid path; (c) student R on the standalone page with the Gemini rollback, where "
        "the run holds the ephemeral token request instead and answers it with a SYNTHETIC value after the "
        "switch. Every voice session request is intercepted in the browser (held, then refused with a "
        "SYNTHETIC failure if one ever came), and the wrapper refuses every socket to another host, so "
        "nothing in this section can reach a real service even if the fix failed.",
    )
    if not os.environ.get("F23_EXAMINER_CONFIGURED"):
        write_note(
            "**Section 8 not run:** it needs the site started with PUBLIC_LIVE_EXAMINER_URL pointed at the "
            f"intercepted path `{EXAMINER_PATH}` and F23_EXAMINER_CONFIGURED=1 (see the header)."
        )
        write_row("The examiner could be started against the intercepted address", False, "not configured for this run")
        return

    # -- (a) the mock's examiner, paid path, the offer held after the token --
    ctx = new_context(browser, permissions=["microphone"])
    ctx.add_init_script(EXAMINER_PROBE)
    # Held from the start: a request that did go out would stay visible.
    examiner = InterceptedExaminer(ctx, hold_connections=True)
    page_a = ctx.new_page()
    errors, failed = attach_diagnostics(page_a)
    goto(page_a, "/dashboard")
    journey.wait_for_dashboard(page_a)
    user_n = journey.ws_sign_up(page_a, EMAIL_N, PASSWORD)
    write_row("Student N signed up on the local stand-in", bool(user_n), f"user id {user_n}")
    if not user_n:
        report_diagnostics("Connection setup (mock), first tab", errors, failed)
        ctx.close()
        return
    seed_speaking_brief(page_a, user_n)
    ready = open_speaking_brief(page_a)
    page_a.evaluate("() => { window.__f23Examiner.holdOffer = true; }")
    mark_page(page_a)
    journey.try_click(page_a.get_by_role("button", name=SPEAKING_START))
    held = wait_for_state(page_a, lambda s: (s.get("heldOffers") or 0) >= 1, timeout_ms=30000)
    write_row(
        "(a) N presses Start in the mock: the microphone is granted, the recording starts, the sign-in token "
        "is read, and the connection's offer is held while it is prepared (no voice session request yet)",
        ready
        and held.get("heldOffers") == 1
        and held.get("peers") == 1
        and held.get("activeRecorders") == 1
        and (held.get("liveTracks") or 0) >= 1
        and examiner.connection_requests == 0,
        f"Start enabled: {ready}; {link_state_text(held)}; voice session requests: {examiner.connection_requests}",
    )
    shot(page_a, "28-link-mock-offer-held", MOCK_PATH)

    page_b = ctx.new_page()
    errors_b, failed_b = attach_diagnostics(page_b)
    sign_out_in_second_tab(page_b)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2500)
    body = body_text(page_a)
    mid = examiner_state(page_a)
    write_row(
        "(a) N signs out in the second tab while the offer is still held: the mock stops, the recording stops "
        "and the microphone is released",
        shows(body, MOCK_STOPPED)
        and mid.get("heldOffers") == 1
        and mid.get("activeRecorders") == 0
        and mid.get("liveTracks") == 0
        and examiner.connection_requests == 0
        and same_page(page_a),
        f"stopped screen: {shows(body, MOCK_STOPPED)}; {link_state_text(mid)}; voice session requests: "
        f"{examiner.connection_requests}; same page: {same_page(page_a)}",
    )
    user_o = journey.ws_sign_up(page_b, EMAIL_O, PASSWORD)
    page_a.bring_to_front()
    page_a.wait_for_timeout(1500)
    write_row(
        "(a) Student O signs up in the second tab while N's offer is still held",
        bool(user_o) and examiner_state(page_a).get("heldOffers") == 1,
        f"user id {user_o}; held offers: {examiner_state(page_a).get('heldOffers')}",
    )

    released = page_a.evaluate("() => window.__f23ReleaseOffer()")
    watch_for_requests(page_a, examiner, SETUP_WATCH_MS)
    after = examiner_state(page_a)
    write_row(
        "(a) The offer is let go after the switch: the setup asks before its request, so NO voice session "
        "request is sent (with N's token or anybody's), the peer connection is closed, and no socket, "
        "recording or microphone request follows",
        released == 1
        and examiner.connection_requests == 0
        and after.get("peers") == 1
        and after.get("openPeers") == 0
        and after.get("sockets") == 0
        and after.get("recorders") == held.get("recorders")
        and after.get("micRequests") == held.get("micRequests")
        and after.get("activeRecorders") == 0
        and after.get("liveTracks") == 0
        and same_page(page_a),
        f"offers let go now: {released}; voice session requests: {examiner.connection_requests} (whose token: "
        f"{bearers_text(examiner, {user_n: 'N', user_o: 'O'})}); {link_state_text(after)}; same page: {same_page(page_a)}",
    )
    shot(page_a, "29-link-mock-after-offer-let-go", MOCK_PATH)
    paid_requests = examiner.connection_requests
    examiner.refuse_held()
    report_diagnostics("Connection setup (mock), first tab", errors, failed)
    report_diagnostics("Connection setup (mock), second tab", errors_b, failed_b)
    ctx.close()

    # -- (b) the standalone examiner page, paid path, the offer held --
    ctx = new_context(browser, permissions=["microphone"])
    ctx.add_init_script(EXAMINER_PROBE)
    standalone = InterceptedExaminer(ctx, hold_connections=True)
    page_a = ctx.new_page()
    errors, failed = attach_diagnostics(page_a)
    goto(page_a, "/dashboard")
    journey.wait_for_dashboard(page_a)
    user_p = journey.ws_sign_up(page_a, EMAIL_P, PASSWORD)
    ready = open_standalone_examiner(page_a, standalone)
    page_a.evaluate("() => { window.__f23Examiner.holdOffer = true; }")
    mark_page(page_a)
    journey.try_click(page_a.get_by_role("button", name=EXAMINER_START))
    held = wait_for_state(page_a, lambda s: (s.get("heldOffers") or 0) >= 1, timeout_ms=30000)
    write_row(
        "(b) Student P presses Start on the standalone examiner: recording, the token read, and the "
        "connection's offer held (no voice session request yet)",
        bool(user_p)
        and ready
        and held.get("heldOffers") == 1
        and held.get("peers") == 1
        and held.get("activeRecorders") == 1
        and (held.get("liveTracks") or 0) >= 1
        and standalone.connection_requests == 0,
        f"user id {user_p}; Start enabled: {ready}; {link_state_text(held)}; voice session requests: "
        f"{standalone.connection_requests}",
    )
    page_b = ctx.new_page()
    errors_b, failed_b = attach_diagnostics(page_b)
    sign_out_in_second_tab(page_b)
    user_q = journey.ws_sign_up(page_b, EMAIL_Q, PASSWORD)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2500)
    body = body_text(page_a)
    mid = examiner_state(page_a)
    write_row(
        "(b) P signs out and student Q signs up in the second tab while the offer is held: the page stops "
        "the session and says so, the recording stops and the microphone is released",
        bool(user_q)
        and shows(body, SESSION_CLOSED)
        and mid.get("heldOffers") == 1
        and mid.get("activeRecorders") == 0
        and mid.get("liveTracks") == 0
        and standalone.connection_requests == 0
        and same_page(page_a),
        f"user id {user_q}; notice shown: {shows(body, SESSION_CLOSED)}; {link_state_text(mid)}; same page: "
        f"{same_page(page_a)}",
    )
    released = page_a.evaluate("() => window.__f23ReleaseOffer()")
    watch_for_requests(page_a, standalone, SETUP_WATCH_MS)
    body = body_text(page_a)
    after = examiner_state(page_a)
    write_row(
        "(b) The offer is let go after the switch: NO voice session request is sent, the peer connection is "
        "closed, no socket opens, nothing records, and the notice stays",
        released == 1
        and standalone.connection_requests == 0
        and after.get("peers") == 1
        and after.get("openPeers") == 0
        and after.get("sockets") == 0
        and after.get("recorders") == held.get("recorders")
        and after.get("activeRecorders") == 0
        and after.get("liveTracks") == 0
        and shows(body, SESSION_CLOSED)
        and same_page(page_a),
        f"offers let go now: {released}; voice session requests: {standalone.connection_requests} (whose token: "
        f"{bearers_text(standalone, {user_p: 'P', user_q: 'Q'})}); {link_state_text(after)}; notice shown: "
        f"{shows(body, SESSION_CLOSED)}; same page: {same_page(page_a)}",
    )
    shot(page_a, "30-link-standalone-after-offer-let-go", "/speaking/examiner")
    paid_requests += standalone.connection_requests
    standalone.refuse_held()
    report_diagnostics("Connection setup (standalone), first tab", errors, failed)
    report_diagnostics("Connection setup (standalone), second tab", errors_b, failed_b)
    ctx.close()

    # -- (c) the standalone page on the Gemini rollback, the token request held --
    ctx = new_context(browser, permissions=["microphone"])
    ctx.add_init_script(EXAMINER_PROBE)
    rollback = InterceptedExaminer(ctx, hold_connections=True, settings=GEMINI_SETTINGS)
    page_a = ctx.new_page()
    errors, failed = attach_diagnostics(page_a)
    goto(page_a, "/dashboard")
    journey.wait_for_dashboard(page_a)
    user_r = journey.ws_sign_up(page_a, EMAIL_R, PASSWORD)
    ready = open_standalone_examiner(page_a, rollback)
    mark_page(page_a)
    journey.try_click(page_a.get_by_role("button", name=EXAMINER_START))
    held_request = rollback.wait_until_held(page_a)
    before = examiner_state(page_a)
    write_row(
        "(c) Student R presses Start on the Gemini rollback: recording, and the request for an ephemeral "
        "voice token held in the browser (no socket yet)",
        bool(user_r)
        and ready
        and held_request
        and rollback.connection_requests == 1
        and before.get("activeRecorders") == 1
        and (before.get("liveTracks") or 0) >= 1
        and before.get("peers") == 0
        and before.get("sockets") == 0,
        f"user id {user_r}; Start enabled: {ready}; token request held: {held_request}; {link_state_text(before)}",
    )
    shot(page_a, "31-link-gemini-token-request-held", "/speaking/examiner")
    page_b = ctx.new_page()
    errors_b, failed_b = attach_diagnostics(page_b)
    sign_out_in_second_tab(page_b)
    user_s = journey.ws_sign_up(page_b, EMAIL_S, PASSWORD)
    page_a.bring_to_front()
    page_a.wait_for_timeout(2500)
    body = body_text(page_a)
    mid = examiner_state(page_a)
    write_row(
        "(c) R signs out and student S signs up in the second tab while the token request is held: the page "
        "stops the session and says so, the recording stops and the microphone is released",
        bool(user_s)
        and shows(body, SESSION_CLOSED)
        and mid.get("activeRecorders") == 0
        and mid.get("liveTracks") == 0
        and mid.get("sockets") == 0
        and same_page(page_a),
        f"user id {user_s}; notice shown: {shows(body, SESSION_CLOSED)}; {link_state_text(mid)}; same page: "
        f"{same_page(page_a)}",
    )
    answered = rollback.answer_held_with_token()
    page_a.wait_for_timeout(4000)
    body = body_text(page_a)
    after = examiner_state(page_a)
    write_row(
        "(c) The token request is then answered with a SYNTHETIC value: the setup asks before its socket, so "
        "NO voice socket is even attempted (the wrapper, which would refuse it, saw none), nothing records, "
        "and the notice stays",
        answered == 1
        and after.get("sockets") == 0
        and after.get("blockedSockets") == 0
        and after.get("peers") == 0
        and after.get("activeRecorders") == 0
        and after.get("liveTracks") == 0
        and rollback.connection_requests == 1
        and shows(body, SESSION_CLOSED)
        and same_page(page_a),
        f"answered: {answered}; token requests in all: {rollback.connection_requests}; {link_state_text(after)}; "
        f"notice shown: {shows(body, SESSION_CLOSED)}; same page: {same_page(page_a)}",
    )
    shot(page_a, "32-link-gemini-after-token", "/speaking/examiner")
    report_diagnostics("Connection setup (Gemini rollback), first tab", errors, failed)
    report_diagnostics("Connection setup (Gemini rollback), second tab", errors_b, failed_b)
    write_note(
        "Every request to the examiner address in section 8 was answered inside the browser by the run "
        "itself: settings with SYNTHETIC values, every paid voice session request held and then refused with a "
        f"SYNTHETIC 503 ({paid_requests} came in this section), and the Gemini token request answered with a "
        "SYNTHETIC value that is no token. The wrapper refuses every socket to another host "
        f"({after.get('blockedSockets')} attempted in (c)), so no voice service, model or token service could "
        "be reached."
    )
    ctx.close()


def run():
    sections = selected_sections()
    if os.environ.get("F23_APPEND") == "1" and RESULTS_PATH.exists():
        write_note(
            f"**A second run of this script, appended:** sections {', '.join(sorted(sections))}, against a "
            f"fresh start of the dev server at {BASE_URL}"
            + (" with the live examiner address set to the intercepted path." if os.environ.get("F23_EXAMINER_CONFIGURED") else ".")
        )
    else:
        reset_results()
    with sync_playwright() as p:
        browser = p.chromium.launch(
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
        )
        try:
            if "1" in sections:
                writing_scenario(browser)
            if "2" in sections:
                speaking_scenario(browser)
            if sections & {"3", "4"}:
                # Sections 3 and 4 share one journey (the editor, then the debounce).
                editor_scenario(browser)
            if "5" in sections:
                revision_scenario(browser)
            if "6" in sections:
                speaking_switch_scenario(browser)
            if "7" in sections:
                examiner_scenario(browser)
            if "8" in sections:
                link_window_scenario(browser)
        finally:
            browser.close()
    text = RESULTS_PATH.read_text(encoding="utf-8")
    passes, fails = text.count("| PASS |"), text.count("| FAIL |")
    write_note(f"**Totals:** {passes} PASS, {fails} FAIL.")
    print(f"done: {passes} PASS, {fails} FAIL -> {RESULTS_PATH}")
    return 1 if fails else 0


def selected_sections() -> set:
    """F23_SECTIONS, for example "7,8" or "1,2,3,4,5,6" (the default)."""
    raw = os.environ.get("F23_SECTIONS", "1,2,3,4,5,6")
    return {part.strip() for part in raw.split(",") if part.strip()}


if __name__ == "__main__":
    sys.exit(run())
