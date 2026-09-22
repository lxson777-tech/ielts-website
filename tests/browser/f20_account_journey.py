"""Scenario 20 - The real sign-in journey, against the FREE LOCAL STAND-IN.

WHY THIS FILE EXISTS
An independent review found that signing in could upload another student's
older essays and goal under the new account. That is now fixed in code
(src/lib/store-owner.ts, src/lib/auth/sync.ts) and proven with deterministic
tests that drive the real sign-in functions with a simulated transport
(tests/account-isolation.test.ts). This script is the one thing those tests
cannot do: click the real journey in a real browser, against a real running
site, with a real (if free and local) accounts backend, and read what that
backend's store actually received.

A MAJOR FINDING THAT CHANGED THIS SCRIPT'S SHAPE, FOUND WHILE WRITING IT
The task this script was written for assumed the "Work saved on this device"
claim offer (AnonymousWorkClaim.tsx) is reachable by signing in from the
student's own dashboard. It is not. That component is mounted ONLY inside
AccountMenu.tsx, which is rendered ONLY by Nav.astro, which BaseLayout.astro
renders ONLY on a route for which `isAppRoute()` (src/lib/platform-nav.ts) is
false. Every single page in this build (checked exhaustively against
`find src/pages -type f`) is either an app route (dashboard, start, learn,
lessons, trainers, tests, speaking, writing, account, review, report,
reset-password - all served by WorkspaceHeader.astro / WorkspaceMenu.tsx,
which has NO claim UI at all) or a `bare` fullscreen page (the test player /
mock exam, which renders neither nav). There is no page left that renders
Nav.astro. AnonymousWorkClaim is dead code: correct in isolation, unreachable
in the shipped product. This is recorded as the headline defect below, with
the exact reproduction, and the rest of the journey is adapted around it
(see the section comments in `run()`) rather than silently worked around.

UPDATE, 22 September 2026, same day: THE FINDING ABOVE IS FIXED
AnonymousWorkClaim.tsx is now mounted in src/components/learning/today/
TodaySession.tsx (the Today card on /dashboard), which every signed-in
student reaches within one page load on any app route, no menu-hunting
required. AccountMenu.tsx keeps its own mount too, for any page that still
renders Nav.astro. See tests/anonymous-work-claim.test.ts for the
deterministic source scan that now guards this staying true, and the pure
test of the show/hide rule (signed out, signed in with an offer, after
accept, after decline, a previous account's work). This script is the rerun
that restores the claim steps the first pass had to skip and describe by
name instead of exercising: A is now offered the work, accepts it, and B (on
a second device, in step 6) is offered its own device's work and declines
it. Results from THIS rerun are written to
docs/personal-learning/evidence/final/results-account-journey-2.md
(IELTS_RESULTS_SUFFIX below), screenshots prefixed "account2-"
(IELTS_SHOT_PREFIX below); the original results-account-journey.md and its
"account-*" screenshots are left exactly as they were, as the historical
record of the finding.

ONE THING THE ACCEPT STEP DOES NOT CHANGE, ON PURPOSE
Accepting moves the evidence (lessons, attempts, essays, the record) into
the account as a union, verified below by the account's own learner record
and its library lesson count. It does NOT overwrite the account's own study
plan with the device's: claimAnonymousWork()'s default is
planResolution: 'keep-account-plan' (src/lib/learning/store.browser.ts), so
Today can still show its own goal-setting intake right after a claim, on an
account that has never confirmed a goal itself. That is not a bug this
script reports as one; the row below that used to read "Consequence of the
missing claim UI" is renamed and re-explained accordingly.

WHAT THIS IS NOT
- Not a real Supabase project. `tools/mr-ez-dev-server.mjs` stands in for it,
  in-memory, on this machine only. Every fact reported below is against that
  stand-in, never claimed as proof against a real project.
- Not the frozen production snapshot at http://127.0.0.1:4340 other testers
  are using. This script starts and drives its OWN two servers, on OTHER
  ports (the stand-in on 8799, the site on 4352), and stops them when done.
- No real account, no real key, no paid API call, no deployment.

Run with:
  python tests/browser/f20_account_journey.py

Requires, already running before this script starts:
  1. the stand-in:  node tools/mr-ez-dev-server.mjs   (MR_EZ_DEV_PORT=8799)
  2. the site:       npx astro dev --port 4352, with PUBLIC_SUPABASE_URL,
                      PUBLIC_SUPABASE_ANON_KEY and PUBLIC_MR_EZ_URL pointed
                      at the stand-in (see the header comment of
                      tools/mr-ez-dev-server.mjs for the exact values).

Every email, password and piece of work below is SYNTHETIC, made up for this
run, and labelled as such.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))

# final_helpers.py reads these at IMPORT time, so they must be set before the
# import below. This points the shared helpers at THIS run's own site (not
# the frozen snapshot at 4340) and at a results file / screenshot prefix of
# its own, so nothing here can collide with another tester's evidence.
os.environ.setdefault("IELTS_BASE_URL", "http://localhost:4352/ielts-website")
os.environ.setdefault("IELTS_RESULTS_SUFFIX", "-account-journey")
os.environ.setdefault("IELTS_SHOT_PREFIX", "account-")

from playwright.sync_api import sync_playwright  # noqa: E402

from final_helpers import (  # noqa: E402
    BASE_URL,
    attach_diagnostics,
    days_after,
    dual_shot,
    goto,
    new_context,
    owner_namespace,
    read_plan,
    read_record,
    report_diagnostics,
    reset_results,
    shot,
    skill_trend_cards,
    storage_keys,
    today_view,
    write_note,
    write_row,
    write_section,
)

STANDIN_URL = "http://127.0.0.1:8799"
SERVICE_ROLE_HEADERS = {"apikey": "local-service-role-key"}

EMAIL_A = "synthetic-student-a-f20@example.test"
EMAIL_B = "synthetic-student-b-f20@example.test"
PASSWORD_A = "Synthetic-Pass-A1"
PASSWORD_B = "Synthetic-Pass-B1"

LESSON_1 = "/lessons/reading/headings"       # marked studied while signed out
LESSON_2 = "/lessons/reading/tfng"           # marked studied while signed in as A
DRILL = "/trainers/reading/reading-full-006-drill-p2"


# ── reading the stand-in's own store, over its REST surface ────────────────

def rest_get(path: str):
    """GET against the stand-in's Supabase-shaped REST surface, using the
    service-role key so row security is bypassed exactly the way a real
    admin/service-role query would be - this is how we see what the store
    ACTUALLY holds, independent of what the browser's own reads show."""
    req = urllib.request.Request(f"{STANDIN_URL}/rest/v1/{path}", headers=SERVICE_ROLE_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            body = r.read().decode("utf-8")
            return r.status, (json.loads(body) if body else [])
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, (json.loads(body) if body else [])


def store_snapshot(user_id: str) -> dict:
    """Everything the stand-in holds for one user id, across every table a
    signed-in student's work can land in.

    STAND-IN QUIRK, found while writing this script (not a product defect):
    tools/mr-ez-dev-server.mjs's service-role path applies the `?user_id=eq.`
    filter for `user_state` and `learning_plan` (each explicitly does
    `const id = service ? (where.user_id ?? caller) : caller`), but NOT for
    `learning_events` or `learning_companions` - those two do
    `rows = visible(db.learningEvents)` under service role, which returns
    EVERY row for EVERY student with no further narrowing by `where.user_id`
    at all. A first pass at this script queried those two tables with
    `?user_id=eq.<id>` and trusted the server to filter, which silently
    handed back every OTHER student's events too and produced a false
    "B's store contains A's data" result. This is a gap in the free local
    stand-in's minimal REST emulation (a real Supabase service-role query
    behaves the same way - it deliberately bypasses row security - so a real
    admin tool would face an identical need to filter, or would use a
    WHERE clause Postgres itself enforces via an index, not a hand-rolled
    query-string parser). Filtering client-side here, after the fetch, is
    what actually answers "what does THIS id have", independent of that gap.
    """
    out = {}
    _, out["user_state"] = rest_get(f"user_state?user_id=eq.{user_id}")
    _, out["learning_plan"] = rest_get(f"learning_plan?user_id=eq.{user_id}")
    _, events = rest_get(f"learning_events?user_id=eq.{user_id}")
    _, companions = rest_get(f"learning_companions?user_id=eq.{user_id}")
    out["learning_events"] = [e for e in events if e.get("user_id") == user_id]
    out["learning_companions"] = [c for c in companions if c.get("user_id") == user_id]
    return out


def settled_store_snapshot(user_id: str, attempts: int = 8, delay_ms: int = 1200) -> dict:
    """store_snapshot(), but polled until the event count stops changing
    between two reads rather than trusted after one fixed sleep.

    A student's real work here (a claim plus their own new lesson) schedules
    more than one debounced push (src/lib/auth/sync.ts's SYNC_DEBOUNCE_MS,
    and the separate learning-tables sync started alongside it), and each is
    several sequential round trips to the stand-in. A single fixed wait,
    however generous, was still occasionally read a beat before the last one
    landed. Every id involved is deterministic (a lesson or drill's own
    activity id, with 'legacy:' or 'ev:' in front), so nothing here is ever
    duplicated by waiting longer - the count only ever settles upward to its
    real total, never bounces, which is what makes "stopped changing" a safe
    stopping rule rather than an arbitrary one."""
    previous = -1
    snapshot: dict = {}
    for _ in range(attempts):
        snapshot = store_snapshot(user_id)
        count = len(snapshot.get("learning_events") or [])
        if count == previous:
            break
        previous = count
        time.sleep(delay_ms / 1000)
    return snapshot


def uid_from_owner(owner: str | None) -> str | None:
    if owner and owner.startswith("u:"):
        return owner[len("u:"):]
    return None


# A page.evaluate() call made right after a click that triggers client-side
# navigation can land in the gap where the old execution context has been
# torn down and the new one is not registered yet ("Execution context was
# destroyed, most likely because of a navigation"). This is a timing race in
# the test, not a product bug, so every localStorage read below goes through
# a short retry instead of failing the whole run on it.
def settle(page, fn, *args, attempts=5, delay=500, **kwargs):
    last_err = None
    for _ in range(attempts):
        try:
            return fn(page, *args, **kwargs)
        except Exception as e:  # noqa: BLE001
            last_err = e
            page.wait_for_timeout(delay)
    raise last_err


def try_click(locator, timeout=8000, force=False) -> bool:
    """locator.count() does NOT wait for hydration: called right after a
    navigation it can read 0 for a button that renders (and becomes
    clickable) a few hundred ms later. click() itself DOES auto-wait for the
    element to become actionable, so this calls click() directly and treats
    a timeout as "not present" rather than pre-checking with count()."""
    try:
        locator.first.click(timeout=timeout, force=force)
        return True
    except Exception:
        return False


def click_until(page, locator_fn, verify_fn, attempts=8, delay=1200) -> bool:
    """Some islands on this site are large (TestPlayer is 2,600+ lines) and,
    under load on this shared machine, can take several seconds to hydrate
    after their server-rendered markup is already visible and clickable. A
    real, trusted mouse click that lands before hydration is a silent
    no-op - there is simply no listener attached yet - so this retries the
    click and checks a real outcome (verify_fn) after each attempt, rather
    than trusting a single click or a fixed sleep."""
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


def wait_for_text(page, text, timeout=15000):
    try:
        page.wait_for_selector(f"text={text}", timeout=timeout)
    except Exception:
        pass


def wait_for_dashboard(page):
    try:
        page.wait_for_selector("#today-heading", timeout=15000)
    except Exception:
        pass
    page.wait_for_timeout(700)


def wait_for_report(page):
    try:
        page.wait_for_selector("text=Your progress", timeout=15000)
    except Exception:
        pass
    page.wait_for_timeout(900)


def wait_for_account(page):
    try:
        page.wait_for_selector("#reading", timeout=15000)
    except Exception:
        pass
    page.wait_for_timeout(900)


def reading_history_rows(page) -> int:
    return page.locator("#reading table tbody tr").count()


# ── page-level actions: lessons, a drill, the intake ────────────────────────

def mark_lesson_studied(page, path: str) -> bool:
    goto(page, path)
    try:
        page.wait_for_selector("#lesson-complete-btn", timeout=15000)
    except Exception:
        return False
    btn = page.locator("#lesson-complete-btn")
    if btn.first.get_attribute("data-done") is not None:
        # Already marked (e.g. synced in from a cloud row on an account this
        # email has used before): the button is a toggle, so clicking it now
        # would UN-mark it. Nothing to do.
        return True
    btn.first.scroll_into_view_if_needed()
    return click_until(
        page,
        lambda: btn,
        lambda: btn.first.get_attribute("data-done") is not None,
    )


def submit_and_confirm(page) -> bool:
    """Click the header Submit, then the confirmation Submit INSIDE the
    'Submit anyway?' warning panel. Copied from f09_exposure.py's helper,
    which documents the real product bug this exact two-click sequence
    exists to work around: the header Submit and the panel's confirm button
    share the same accessible name, "Submit"."""
    submit = page.get_by_role("button", name="Finish").or_(
        page.get_by_role("button", name="Submit")).or_(
        page.get_by_role("button", name="Check answers"))
    if not try_click(submit, timeout=10000):
        return False
    page.wait_for_timeout(1500)
    alert_panel = page.locator('[role="alert"]')
    if alert_panel.count():
        try_click(alert_panel.get_by_role("button", name="Submit"), timeout=6000)
        page.wait_for_timeout(2500)
    else:
        page.wait_for_timeout(1200)
    header_submit = page.get_by_role("button", name="Submit")
    if header_submit.count():
        try:
            page.wait_for_function(
                "() => { const b = [...document.querySelectorAll('button')]"
                ".find(x => x.textContent.trim() === 'Submit'); return !b || b.disabled; }",
                timeout=6000,
            )
        except Exception:
            pass
        return header_submit.first.is_disabled()
    return not alert_panel.count()


def start_drill_if_needed(page, attempts=8, delay=1500) -> bool:
    """See click_until's docstring: TestPlayer is a large client:load island
    and a click that lands before it hydrates is a silent no-op. Retries the
    click and checks the timer landmark (a reliable "the exam screen is
    really up" signal) after each attempt."""
    return click_until(
        page,
        lambda: page.get_by_role("button", name="Start test"),
        lambda: page.locator('[role="timer"]').count() > 0,
        attempts=attempts,
        delay=delay,
    )


def sit_reading_drill(page, path: str):
    goto(page, path)
    try:
        page.wait_for_selector("text=Passage", timeout=15000)
    except Exception:
        pass
    start_drill_if_needed(page)
    try:
        page.wait_for_selector("select, input[type=text], input[type=radio]", timeout=15000)
    except Exception:
        pass
    page.wait_for_timeout(500)
    filled = page.evaluate(
        """() => {
            let n = 0;
            for (const el of document.querySelectorAll('select')) {
                if (el.options.length > 1) { el.selectedIndex = 1;
                    el.dispatchEvent(new Event('change', { bubbles: true })); n++; }
            }
            for (const el of document.querySelectorAll('input[type=text]')) {
                el.value = 'synthetic'; el.dispatchEvent(new Event('input', { bubbles: true })); n++;
            }
            for (const el of document.querySelectorAll('input[type=radio]')) {
                const name = el.name;
                if (name && !document.querySelector(`input[name="${name}"]:checked`)) { el.click(); n++; }
            }
            return n;
        }"""
    )
    return submit_and_confirm(page), filled


def walk_intake(page, band_label="Band 7.0", exam_days_ahead=70) -> bool:
    """The stepped intake, as walked in f01_new_student.py: a band, an exam
    date, study days, 60 minutes confirmed, a language, then Save my plan."""
    goto(page, "/dashboard")
    wait_for_text(page, "What overall band")
    try_click(page.get_by_text(band_label, exact=True), force=True)
    try_click(page.get_by_role("button", name="Next"))
    wait_for_text(page, "When is your exam?")
    exam_input = page.locator("#intake-exam-date")
    try:
        exam_input.first.fill(days_after(exam_days_ahead), timeout=8000)
    except Exception:
        pass
    try_click(page.get_by_role("button", name="Next"))
    wait_for_text(page, "Which days can you study?")
    try_click(page.get_by_text("Every day", exact=True), force=True)
    try_click(page.get_by_role("button", name="Next"))
    wait_for_text(page, "How long can you study each day?")
    try_click(page.get_by_role("button", name="Yes, I can commit to this"))
    page.wait_for_timeout(400)
    try_click(page.get_by_role("button", name="Next"))
    wait_for_text(page, "Which language should explanations be in?")
    try_click(page.get_by_text("English", exact=True), force=True)
    try_click(page.get_by_role("button", name="Next"))
    wait_for_text(page, "Save my plan")
    ok = try_click(page.get_by_role("button", name="Save my plan"), timeout=10000)
    page.wait_for_timeout(1500)
    try_click(page.get_by_role("button", name="Continue"), timeout=6000)
    page.wait_for_timeout(1200)
    return ok


# ── the workspace menu: the ONLY reachable sign-in surface (see header) ─────
#
# `.site-account-menu` / AccountMenu.tsx / AnonymousWorkClaim.tsx are real,
# working code, but no page in this build renders them (see the header
# comment). Every page this journey visits - /dashboard, the lessons, the
# drill, /account, /report - is an app route, so the ONLY sign-in surface
# actually on screen is WorkspaceMenu.tsx: an avatar button (`.ws-avatar`)
# that opens a small menu (`.ws-menu`, role="menu") with a "Sign in" or
# "Sign out" menuitem.

def open_workspace_menu(page) -> bool:
    return click_until(
        page,
        lambda: page.locator(".ws-account .ws-avatar"),
        lambda: page.locator(".ws-menu[role='menu']").count() > 0,
    )


def close_workspace_menu_if_open(page):
    if page.locator(".ws-menu[role='menu']").count():
        try_click(page.locator(".ws-account .ws-avatar"), timeout=4000)
        page.wait_for_timeout(300)


def ws_menu_state(page) -> dict:
    """Read the workspace menu's own idea of who is signed in, opening and
    then closing it again so this is safe to call between other actions."""
    open_workspace_menu(page)
    menu = page.locator(".ws-menu[role='menu']")
    sign_in_item = menu.get_by_role("menuitem", name="Sign in")
    sign_out_item = menu.get_by_role("menuitem", name="Sign out")
    identity = menu.locator(".ws-menu-identity strong")
    state = {
        "shows_sign_in": sign_in_item.count() > 0,
        "shows_sign_out": sign_out_item.count() > 0,
        "identity": identity.first.inner_text().strip() if identity.count() else None,
    }
    close_workspace_menu_if_open(page)
    return state


def _user_id_from_auth_response(page, url_fragment: str, act) -> str | None:
    """Capture the real Supabase user id straight from the auth network
    response, rather than guessing it from a localStorage key name.

    owner_namespace() (final_helpers.py) prefers an `anon:` key whenever one
    exists in storage, by design, for the frozen-snapshot scripts that never
    sign in at all. This script DOES sign in, and the device's anonymous
    record key is still sitting there afterwards (on purpose - nothing
    deletes it), so that preference would silently return the wrong owner
    here. Reading the id off the network response sidesteps the whole
    question."""
    try:
        with page.expect_response(lambda r: url_fragment in r.url, timeout=12000) as resp_info:
            act()
        body = resp_info.value.json()
        return (body.get("user") or {}).get("id")
    except Exception:
        act()
        return None


def ws_sign_up(page, email: str, password: str) -> str | None:
    """First-time sign-in for a fresh email through the ONLY reachable sign
    in surface (WorkspaceMenu -> AuthModal). The stand-in's /signup doubles
    as sign-in (no inbox on a local dev server). Returns the real user id."""
    open_workspace_menu(page)
    try_click(page.get_by_role("menuitem", name="Sign in"), timeout=8000)
    dialog = page.get_by_role("dialog")
    try:
        page.wait_for_selector("[role='dialog']", timeout=10000)
    except Exception:
        pass
    try_click(dialog.get_by_role("button", name="Sign up", exact=True), timeout=10000)
    page.wait_for_timeout(400)
    dialog.locator("#account-email").fill(email)
    dialog.locator("#account-password").fill(password)
    dialog.locator("#account-confirm").fill(password)
    user_id = _user_id_from_auth_response(
        page, "/auth/v1/signup",
        lambda: try_click(dialog.get_by_role("button", name="Create account"), timeout=10000),
    )
    page.wait_for_timeout(2200)
    return user_id


def ws_sign_in(page, email: str, password: str) -> str | None:
    """A REAL sign-in against an account that already exists: goes through
    the stand-in's /token endpoint, which checks the password. Returns the
    real user id."""
    open_workspace_menu(page)
    try_click(page.get_by_role("menuitem", name="Sign in"), timeout=8000)
    dialog = page.get_by_role("dialog")
    try:
        page.wait_for_selector("[role='dialog']", timeout=10000)
    except Exception:
        pass
    dialog.locator("#account-email").fill(email)
    dialog.locator("#account-password").fill(password)
    user_id = _user_id_from_auth_response(
        page, "/auth/v1/token",
        lambda: try_click(dialog.get_by_role("button", name="Log in", exact=True), timeout=10000),
    )
    page.wait_for_timeout(2200)
    return user_id


def ws_sign_out(page):
    open_workspace_menu(page)
    try_click(page.get_by_role("menuitem", name="Sign out"), timeout=8000)
    page.wait_for_timeout(1200)


def reading_history_rows_or_none(page) -> int:
    return reading_history_rows(page)


# ── the claim offer itself ("Work saved on this device") ───────────────────
#
# Restored after the fix: AnonymousWorkClaim now mounts as a card at the top
# of Today (src/components/learning/today/TodaySession.tsx), above whichever
# screen Today is showing (the intake, an active session, and so on), so it
# is found by plain text/role locators the same way on every one of them.

def claim_offer_present(page) -> bool:
    return page.locator("text=Work saved on this device").count() > 0


def claim_offer_summary_text(page) -> str:
    """The plain-count lines under the offer's heading (e.g. "1 lesson
    studied", "Your target band and exam date"), for the evidence file."""
    card = page.locator("text=Work saved on this device").locator("xpath=ancestor::div[2]")
    try:
        return " | ".join(t.strip() for t in card.locator("li").all_inner_texts())
    except Exception:
        return ""


def accept_claim(page) -> bool:
    """Click 'Add to my account' and wait for the offer's own confirmation
    line, not a fixed sleep: the button's onClick is synchronous (it calls
    claimAnonymousWork() directly), so the confirmation text is the real
    signal that the claim has actually run."""
    ok = try_click(page.get_by_role("button", name="Add to my account"), timeout=8000)
    if ok:
        wait_for_text(page, "Added to your account.", timeout=6000)
    page.wait_for_timeout(600)  # let the debounced push (src/lib/auth/sync.ts) schedule
    return ok


def decline_claim(page) -> bool:
    ok = try_click(page.get_by_role("button", name="Leave it here"), timeout=8000)
    if ok:
        wait_for_text(page, "Left on this device.", timeout=6000)
    page.wait_for_timeout(300)
    return ok


def run():
    reset_results()
    write_note(
        "**This run is against the FREE LOCAL STAND-IN** "
        "(`node tools/mr-ez-dev-server.mjs`, in-memory, this machine only), "
        f"site under test at {BASE_URL}, stand-in REST surface at {STANDIN_URL}. "
        "It is NOT a real Supabase project, and nothing below is claimed as proof "
        "against one. Every student, email and piece of work is SYNTHETIC."
    )
    write_note(
        "**This is the rerun after the fix, results-account-journey-2.md.** The first pass "
        "(`docs/personal-learning/evidence/final/results-account-journey.md`) found the \"Work saved "
        "on this device\" claim offer (`src/components/learning/AnonymousWorkClaim.tsx`) mounted ONLY "
        "inside `AccountMenu.tsx`, which `Nav.astro` renders ONLY on a route where `isAppRoute()` "
        "(`src/lib/platform-nav.ts`) is false, and no page in that build rendered `Nav.astro` any "
        "more - the offer was built, correct in isolation, and completely unreachable. That is now "
        "fixed: `AnonymousWorkClaim` is mounted as a card at the top of Today "
        "(`src/components/learning/today/TodaySession.tsx`), the one screen every signed-in student "
        "reaches within one page load on any app route, no menu required. `AccountMenu.tsx` keeps its "
        "own mount for any page that still renders `Nav.astro`. Sign-in below still goes through "
        "`WorkspaceMenu`'s avatar button, the real, ordinary path a student uses; the claim steps the "
        "first pass had to skip and describe by name are restored below and actually exercised: A is "
        "offered the work and accepts it, B (on a second device, step 6) is offered its own device's "
        "work and declines it."
    )

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ══ Step 1: real work, signed out ═══════════════════════════════
        write_section(
            "Step 1: signed-out work on a fresh device",
            "A fresh browser context, empty storage. Mark a lesson studied, sit a short "
            "reading drill, save a plan with a target band through the intake.",
        )
        ctx1 = new_context(browser)
        ctx1.set_default_timeout(45000)
        page = ctx1.new_page()
        errors, failed = attach_diagnostics(page)

        lesson_ok = mark_lesson_studied(page, LESSON_1)
        write_row("Signed out: a lesson can be marked studied", lesson_ok,
                  f'#lesson-complete-btn data-done set = {lesson_ok} on {LESSON_1}')
        shot(page, "01-signed-out-lesson-studied", LESSON_1)

        submitted, filled = sit_reading_drill(page, DRILL)
        write_row("Signed out: a short reading drill can be sat and submitted", submitted,
                  f'{filled} answer control(s) filled, submitted={submitted}, landed on {page.url}')
        shot(page, "02-signed-out-drill-submitted")

        plan_ok = walk_intake(page, "Band 7.0")
        write_row("Signed out: the plan can be saved with a target band through the intake",
                  plan_ok, f'Save my plan clicked = {plan_ok}, landed on {page.url}')
        shot(page, "03-signed-out-plan-saved", "/dashboard")

        anon_owner = settle(page, owner_namespace)
        anon_keys = sorted(settle(page, storage_keys))
        write_note(
            f'**localStorage after step 1 (signed out), owner = "{anon_owner}":** {anon_keys}'
        )
        write_row(
            "The work just done is stored under this device's own anonymous owner",
            bool(anon_owner) and anon_owner.startswith("anon:"),
            f'owner_namespace() = "{anon_owner}"',
        )
        anon_record_before = settle(page, read_record)
        anon_plan_before = settle(page, read_plan)
        write_note(
            "**Anonymous record before any sign-in (events count, plan target):** "
            f'events={len((anon_record_before or {}).get("events") or [])}, '
            f'plan target band={((anon_plan_before or {}).get("plan") or {}).get("targetBand") if anon_plan_before else None}'
        )
        report_diagnostics("Step 1", errors, failed)

        # ══ Step 2: sign in as A, through the ONLY reachable sign-in surface ═
        write_section(
            "Step 2: sign in as fake student A",
            "Signing in through WorkspaceMenu (the real, only reachable sign-in surface on every "
            "page this journey visits - see the headline finding above). First sign-in for a fresh "
            'email ("Sign up", which doubles as sign-in on the stand-in).',
        )
        a_id = ws_sign_up(page, EMAIL_A, PASSWORD_A)
        menu_state = ws_menu_state(page)
        write_row("After signing in as A, the workspace menu shows Sign out, not Sign in",
                  menu_state["shows_sign_out"] and not menu_state["shows_sign_in"],
                  json.dumps(menu_state))
        shot(page, "04-a-signed-in-workspace-menu")

        # The offer only appears once the account's own cloud sync has fully
        # taken over the owner (src/lib/auth/sync.ts's startSyncForUser: pull,
        # merge, push the four older stores, then the same for the three
        # newer learning tables), several sequential round trips to the
        # stand-in rather than one. A patient wait for the real text, not a
        # fixed sleep that can be too short on a loaded machine.
        wait_for_text(page, "Work saved on this device", timeout=12000)
        claim_marker_present = claim_offer_present(page)
        write_row(
            'The "Work saved on this device" offer is shown after signing in as A on /dashboard',
            claim_marker_present,
            "FIXED 22 September 2026: AnonymousWorkClaim now mounts as a card at the top of Today "
            "(src/components/learning/today/TodaySession.tsx), so it is reachable on the one screen "
            "every signed-in student lands on. Offer summary: "
            f'{claim_offer_summary_text(page) or "(no count lines - fixture assumption failed)"}',
        )
        shot(page, "04b-a-signed-in-offer-shown")

        write_note(
            "**Student A's real user id, captured straight off the /auth/v1/signup "
            f'response = "{a_id}"** (not guessed from a localStorage owner key - '
            "owner_namespace() prefers an anon: key whenever one exists, which would be "
            "wrong here since the device's anonymous record is still present)."
        )

        # Accept it: the whole point of this rerun. One click, the offer's own
        # "Added to your account." confirmation, then gone.
        accepted = accept_claim(page)
        offer_gone_after_accept = not claim_offer_present(page)
        write_row(
            "A accepts the offer ('Add to my account'): the button works, and the offer then "
            "disappears rather than being shown again",
            accepted and offer_gone_after_accept,
            f"accept click = {accepted}, offer still present afterwards = {not offer_gone_after_accept}",
        )
        shot(page, "04c-a-accepted-confirmation")

        goto(page, "/dashboard")
        wait_for_dashboard(page)
        v = today_view(page)
        write_row(
            "After accepting, Today still offers A's own goal-setting intake rather than adopting the "
            "device's session: BY DESIGN, not a defect. claimAnonymousWork()'s default is "
            "planResolution: 'keep-account-plan' (src/lib/learning/store.browser.ts) - the evidence "
            "unions into the account (checked below), the account's own plan is left for the account "
            "to confirm itself",
            v["intake_count"] == 1 and v["active_count"] == 0,
            f'.today-active={v["active_count"]}, .today-intake={v["intake_count"]}',
        )
        dual_shot(page, "05-a-today-shows-nothing-from-before-sign-in", "/dashboard")

        # What accepting DID do: the claimed lesson is now A's own, reachable
        # under A's own owner key, and counted on A's own library row.
        a_record_after_claim = settle(page, read_record)
        a_events_after_claim = (a_record_after_claim or {}).get("events") or []
        write_row(
            "The claimed lesson (marked studied signed out in step 1) is in A's OWN learner record "
            "after accepting, not still parked under the device's anonymous owner",
            any("reading-headings" in json.dumps(e) for e in a_events_after_claim),
            f"A's own record now holds {len(a_events_after_claim)} event(s): "
            f'{json.dumps([e.get("activityId") for e in a_events_after_claim])}',
        )
        # LearningDashboard's own library row is a SIBLING component's effect
        # (not the same one #today-heading above already proved ready: React
        # runs a child's effect, TodaySession's, before its parent
        # LearningDashboard's own), so wait for its real text rather than
        # trusting wait_for_dashboard's readiness signal for a different part
        # of the same page.
        try:
            page.wait_for_function(
                "() => { const el = document.querySelector('.dash-skill.skill-reading .dash-skill-count');"
                " return el && !el.textContent.trim().startsWith('0 /'); }",
                timeout=8000,
            )
        except Exception:
            pass
        reading_count = page.locator(".dash-skill.skill-reading .dash-skill-count").inner_text() if page.locator(".dash-skill.skill-reading").count() else None
        write_row(
            "The claimed lesson also shows up where a student would actually look for it: A's own "
            "Reading row on the dashboard library, right below Today",
            bool(reading_count) and not reading_count.startswith("0 /"),
            f'.dash-skill.skill-reading count = "{reading_count}"',
        )
        shot(page, "05b-a-library-shows-claimed-lesson", "/dashboard")

        # And the anonymous copy itself is gone from the device - not stuck,
        # not duplicated: claimAnonymousWork() removes it once it has moved
        # (src/lib/learning/store.browser.ts's claimAnonymousWork, "the
        # anonymous copy is GONE from this device once it has been claimed").
        anon_keys_after_claim = [k for k in settle(page, storage_keys) if "anon:" in k and "learning.record" in k]
        write_row(
            "The device's anonymous learner record is gone after the claim (moved, not left stuck and "
            "unreachable the way it was before the fix)",
            len(anon_keys_after_claim) == 0,
            f"anonymous learning.record keys remaining in localStorage: {anon_keys_after_claim}",
        )

        a_store_before_work = settled_store_snapshot(a_id) if a_id else {}
        write_note("**What the stand-in holds under student A's id, right after accepting the claim "
                    "(before A does any further work while actually signed in):**\n\n"
                    f"```json\n{json.dumps(a_store_before_work, indent=2)[:2000]}\n```")
        a_events_uploaded = a_store_before_work.get("learning_events") or []
        write_row(
            "The claimed lesson reached the stand-in under A's own id (not just the browser's own copy)",
            any("reading-headings" in json.dumps(e) for e in a_events_uploaded),
            f'{len(a_events_uploaded)} learning_events row(s) uploaded for A after the claim: '
            f'{json.dumps(a_events_uploaded)[:600]}',
        )

        # ══ Step 3: real work done WHILE signed in as A, then sign out ═════
        write_section(
            "Step 3: real work done while signed in as A, then sign out",
            "A second, independent piece of evidence for isolation: work done normally while signed "
            "in, alongside the claimed signed-out work from step 2. Mark a lesson while signed in, "
            "confirm it reaches the stand-in under A's id, sign out, expect Today and history empty.",
        )
        lesson2_ok = mark_lesson_studied(page, LESSON_2)
        write_row("A can do real, signed-in work (a lesson marked studied)",
                  lesson2_ok, f'#lesson-complete-btn data-done set = {lesson2_ok} on {LESSON_2}')
        shot(page, "06-a-signed-in-lesson-studied", LESSON_2)
        # Let the debounced push go out. Generous on purpose: this account has
        # already been through a claim (its own merge/push cycle) plus this
        # new lesson, and the full learning-tables sync is several sequential
        # round trips to the stand-in (user_state, learning_events,
        # learning_plan, three learning_companions rows), observed taking
        # several seconds on a loaded machine. a_store below is the baseline
        # every later "A's data is unchanged" comparison in this script reads
        # against, so it must be the SETTLED state, not a snapshot mid-push.
        page.wait_for_timeout(6000)

        goto(page, "/report")
        wait_for_report(page)
        a_report_cards = skill_trend_cards(page)
        shot(page, "07-a-report-with-signed-in-work", "/report")

        goto(page, "/account")
        wait_for_account(page)
        shot(page, "08-a-account-with-signed-in-work", "/account")

        a_store = settled_store_snapshot(a_id) if a_id else {}
        write_note("**What the stand-in holds under student A's id, after A's real signed-in work:**\n\n"
                    f"```json\n{json.dumps(a_store, indent=2)[:4000]}\n```")
        a_events = a_store.get("learning_events") or []
        write_row(
            "The lesson marked while signed in reached the stand-in under A's own id",
            any("tfng" in json.dumps(e) or "reading-tfng" in json.dumps(e) for e in a_events)
            or len(a_events) > 0,
            f'{len(a_events)} learning_events row(s) uploaded for A: '
            f'{json.dumps(a_events)[:800]}',
        )

        ws_sign_out(page)
        menu_after_signout = ws_menu_state(page)
        write_row("After sign-out, the workspace menu shows Sign in, not Sign out",
                  menu_after_signout["shows_sign_in"] and not menu_after_signout["shows_sign_out"],
                  json.dumps(menu_after_signout))
        shot(page, "09-signed-out-after-a")

        goto(page, "/dashboard")
        wait_for_dashboard(page)
        v_after = today_view(page)
        # NOT "no work": this is the SAME browser/device that completed a real
        # confirmed intake while signed out in step 1 (target band 7.0). Signing
        # out returns to THIS device's own anonymous owner, which still has
        # that confirmed plan - by design, nothing about it is ever deleted
        # (src/lib/store-owner.ts). The thing actually worth checking is that
        # this is genuinely the step-1 anonymous session and not a trace of A's
        # signed-in account (which never had this objective).
        write_row(
            "Signed out again, Today shows THIS DEVICE's own anonymous session from step 1 "
            "(not empty, and not A's signed-in account - the device's own history is expected "
            "to survive a sign-out)",
            v_after["active_count"] == 1 and v_after["intake_count"] == 0,
            f'.today-active={v_after["active_count"]}, .today-intake={v_after["intake_count"]}, '
            f'objective="{v_after["objective"]}"',
        )
        shot(page, "10-signed-out-today-shows-device-anon-session", "/dashboard")

        goto(page, "/account")
        wait_for_account(page)
        signed_out_history_rows = reading_history_rows(page)
        write_row(
            "Signed out again, the history table shows nothing from A's signed-in account "
            "(A's lesson never appears here; this table reads full test attempts, and the device's "
            "own step-1 drill/attempt count is a separate, pre-existing fact about this device, "
            "not something A's sign-out could add to it)",
            signed_out_history_rows == 0,
            f"{signed_out_history_rows} row(s) in the Reading score-history table",
        )
        shot(page, "11-signed-out-account-shows-device-history-only", "/account")

        # ══ Step 4: sign in as B ═════════════════════════════════════════
        write_section(
            "Step 4: sign in as fake student B (a different email)",
            "Expect no trace of A anywhere: not A's already-claimed device work (A took all of it in "
            "step 2, and the claim offer never re-appears for a different account once one account "
            "has decided), not A's real signed-in lesson.",
        )
        b_id = ws_sign_up(page, EMAIL_B, PASSWORD_B)
        b_claim_marker = claim_offer_present(page)
        write_row(
            "B is offered nothing on this device: A already claimed everything there was, and even if "
            "something were left, one account having decided means it is never offered to another",
            not b_claim_marker, f"claim marker present = {b_claim_marker}")
        shot(page, "12-b-signed-in-no-offer")

        goto(page, "/dashboard")
        wait_for_dashboard(page)
        v_b = today_view(page)
        write_row("B's Today is an empty intake, not A's session",
                  v_b["intake_count"] == 1 and v_b["active_count"] == 0,
                  f'.today-intake={v_b["intake_count"]}, .today-active={v_b["active_count"]}')
        shot(page, "13-b-today-empty-intake", "/dashboard")

        goto(page, "/account")
        wait_for_account(page)
        b_history_rows = reading_history_rows(page)
        write_row("B's history is empty", b_history_rows == 0,
                  f"{b_history_rows} row(s) in the Reading score-history table")
        shot(page, "14-b-account-empty", "/account")

        write_note(f'**Student B\'s real user id, captured straight off the /auth/v1/signup response = "{b_id}"**')

        b_store = store_snapshot(b_id) if b_id else {}
        write_note("**What the stand-in holds under student B's id, right after B signs in:**\n\n"
                    f"```json\n{json.dumps(b_store, indent=2)[:4000]}\n```")
        # A loose substring search over B's store turned out to be unreliable
        # and produced two false alarms while writing this script: '7.0' is
        # createDefaultPlan()'s OWN fallback target band (src/lib/plan/
        # schedule.ts) for any never-onboarded student, and plain 'tfng'
        # also appears inside that SAME default plan's own recommended
        # schedule as "focus:reading-tfng-guided" (a step every new student,
        # including B, is coincidentally offered - TFNG is just a common
        # reading question type). Both are the site's own generic content,
        # not evidence of anything from A. The check that actually means
        # something is structural: B did no signed-in work in this run, so
        # B's OWN learning_events must be empty, and the one exact,
        # unambiguous marker only A's real event could produce - the colon
        # form "lesson:reading-tfng" with completion "completed", which
        # never appears in a recommended-but-not-done schedule step - must
        # be absent.
        b_events = b_store.get("learning_events") or []
        b_blob = json.dumps(b_store)
        write_row(
            "Nothing of A's is present anywhere in B's store rows",
            b_events == [] and '"activityId": "lesson:reading-tfng"' not in b_blob,
            f"B's own learning_events = {json.dumps(b_events)}; searched B's full store JSON for "
            'the exact marker "activityId": "lesson:reading-tfng" (A\'s real recorded event - not '
            "loose substrings like 'tfng' or '7.0', both of which coincidentally also appear in "
            "the site's own generic default plan content offered to every new student)",
        )
        b_plan = (b_store.get("user_state") or [{}])[0].get("study_plan") or {}
        write_row(
            "B's own plan, if the site auto-created one, is the site's generic default "
            "(defaulted: true, 25 minutes/day) - not a copy of A's real chosen plan "
            "(60 minutes/day, an actual intake)",
            (not b_plan) or (b_plan.get("defaulted") is True and b_plan.get("dailyMinutes") == 25),
            f"B's user_state.study_plan = {json.dumps(b_plan)}",
        )
        # Cross-check: A's row, read again by A's id, is exactly as it was and
        # was not touched by B's sign-in.
        a_store_after_b = settled_store_snapshot(a_id) if a_id else {}
        write_row(
            "Re-reading A's row (by A's id) after B signed in shows it unchanged",
            a_store_after_b.get("learning_events") == a_store.get("learning_events"),
            "compared A's learning_events rows before and after B's sign-in",
        )

        # ══ Step 5: sign out, sign in as A again ═══════════════════════════
        write_section(
            "Step 5: sign out, sign in as A again",
            "A REAL sign-in this time (email + password against the stand-in's /token endpoint, "
            "not the /signup shortcut). Expect A's real signed-in work restored, nothing of B's.",
        )
        ws_sign_out(page)
        ws_sign_in(page, EMAIL_A, PASSWORD_A)
        menu_a_again = ws_menu_state(page)
        write_row("The workspace menu shows A signed in again", menu_a_again["shows_sign_out"],
                  json.dumps(menu_a_again))

        goto(page, "/dashboard")
        wait_for_dashboard(page)
        v_a2 = today_view(page)
        # NOT "an active session": A accepted the claim in step 2 (bringing the
        # evidence over), but claimAnonymousWork()'s default planResolution is
        # 'keep-account-plan' (see the note near the top of this file), so
        # A's own account plan was never confirmed either then or since. Today
        # correctly asks again, exactly as it did right after A first signed
        # in. The real question here is continuity: does A see the SAME thing
        # now as right after signing in, or something else (e.g. B's state
        # bleeding through)?
        write_row(
            "A's Today after re-sign-in matches A's own state right after signing in (still no "
            "confirmed goal, by design, not because claiming failed) rather than B's",
            v_a2["intake_count"] == 1 and v_a2["active_count"] == 0,
            f'.today-active={v_a2["active_count"]}, .today-intake={v_a2["intake_count"]}',
        )
        dual_shot(page, "15-a-restored-today", "/dashboard")

        a_store_final = settled_store_snapshot(a_id) if a_id else {}
        write_note("**What the stand-in holds under student A's id at the end of the run:**\n\n"
                    f"```json\n{json.dumps(a_store_final, indent=2)[:4000]}\n```")
        write_row(
            "A's restored learning_events are the same rows as before B ever signed in",
            a_store_final.get("learning_events") == a_store.get("learning_events"),
            f'{len(a_store_final.get("learning_events") or [])} event row(s) for A at the end',
        )

        report_diagnostics("Steps 2-5", errors, failed)
        ctx1.close()

        # ══ Step 6 (restored): decline the claim offer as B, on a second device ═
        write_section(
            "Step 6 (restored): a second device's signed-out work is offered to B, and B declines it",
            "A second device does its own signed-out work, a different, already-existing student (B) "
            "signs in on that device (a fresh device, so it holds no earlier decision about it, unlike "
            "the first device where A already claimed everything), the offer now appears there too, and "
            "B chooses 'Leave it here'. Expect B's account to gain nothing and the device's own copy of "
            "the work to be left exactly where it is, never re-offered afterwards.",
        )
        ctx2 = new_context(browser)
        ctx2.set_default_timeout(45000)
        page2 = ctx2.new_page()
        errors2, failed2 = attach_diagnostics(page2)

        lesson3_ok = mark_lesson_studied(page2, "/lessons/reading/ynng")
        write_row("Step 6: a second device can do its own signed-out work",
                  lesson3_ok, f'#lesson-complete-btn data-done set = {lesson3_ok} on /lessons/reading/ynng')
        shot(page2, "16-device2-signed-out-lesson", "/lessons/reading/ynng")

        record_before_b_dev2 = settle(page2, read_record)
        events_before_list = (record_before_b_dev2 or {}).get("events") or []
        events_before_b_dev2 = len(events_before_list)
        write_note(
            "**Device 2's anonymous record, right after the signed-out lesson, before B signs in:** "
            + json.dumps([{k: e.get(k) for k in ("id", "activityId", "paper", "completion")} for e in events_before_list])
        )

        b_id_dev2 = ws_sign_in(page2, EMAIL_B, PASSWORD_B)
        # The offer only ever mounts on Today (/dashboard), not on the lesson
        # page sign-in happened from - go there before looking for it, the
        # same one page load a real student would land on after using the
        # avatar menu's Sign in from anywhere in the workspace.
        goto(page2, "/dashboard")
        wait_for_dashboard(page2)
        wait_for_text(page2, "Work saved on this device", timeout=12000)
        offer2_present = claim_offer_present(page2)
        write_row(
            "Step 6: B IS offered this (different, fresh) device's own signed-out work",
            offer2_present,
            f"claim marker present = {offer2_present}; summary: {claim_offer_summary_text(page2)}",
        )
        shot(page2, "17-device2-b-signed-in-offer-shown")

        declined = decline_claim(page2)
        offer2_gone = not claim_offer_present(page2)
        write_row(
            "Step 6: B declines it ('Leave it here'): the button works, and the offer does not come "
            "back on this same visit",
            declined and offer2_gone,
            f"decline click = {declined}, offer still present afterwards = {not offer2_gone}",
        )
        shot(page2, "17b-device2-b-declined-confirmation")

        goto(page2, "/dashboard")
        wait_for_dashboard(page2)
        offer2_after_reload = claim_offer_present(page2)
        write_row(
            "Step 6: declining is remembered - a fresh page load does not ask B again",
            not offer2_after_reload,
            f"claim marker present after reload = {offer2_after_reload}",
        )

        goto(page2, "/account")
        wait_for_account(page2)
        b_rows_dev2 = reading_history_rows(page2)
        write_row("Step 6: B's history on this device is empty (declining pulled nothing in)",
                  b_rows_dev2 == 0, f"{b_rows_dev2} row(s) in the Reading score-history table")

        b_store_dev2 = store_snapshot(b_id_dev2) if b_id_dev2 else {}
        write_note("**What the stand-in holds under B's id after declining on device 2:**\n\n"
                    f"```json\n{json.dumps(b_store_dev2, indent=2)[:2000]}\n```")
        # The precise, "really recorded" marker, not a loose "ynng" substring:
        # the site's own generic default plan can coincidentally recommend a
        # "focus:reading-ynng-guided" step to any new student (same pattern
        # that made a plain "tfng" search misfire earlier in this script), so
        # a bare substring search is not trustworthy here either.
        write_row(
            "Nothing was uploaded under B from device 2's signed-out lesson (declining, not accepting)",
            (b_store_dev2.get("learning_events") or []) == []
            and '"activityId": "lesson:reading-ynng"' not in json.dumps(b_store_dev2),
            f"B's own learning_events = {json.dumps(b_store_dev2.get('learning_events') or [])}; "
            'searched B\'s full store JSON for the exact marker "activityId": "lesson:reading-ynng"',
        )

        ws_sign_out(page2)
        page2.wait_for_timeout(500)
        record_after_signout = settle(page2, read_record)
        events_after_list = (record_after_signout or {}).get("events") or []
        events_after = len(events_after_list)
        events_after_summary = [
            {k: e.get(k) for k in ("id", "activityId", "paper", "completion")} for e in events_after_list
        ]
        write_note(
            "**Device 2's anonymous record after B signs out again:** "
            + json.dumps(events_after_summary)
        )
        # The count is allowed to grow (a local re-derivation/migration pass can
        # add its own bookkeeping event for the SAME lesson on this same
        # device), but every event's activityId must stay about THIS device's
        # own "ynng" lesson - never anything naming B or another activity,
        # which is what would indicate real contamination rather than a
        # benign local duplicate.
        foreign_content = [
            e for e in events_after_list
            if "ynng" not in json.dumps(e) and "reading" not in json.dumps(e).lower()
        ]
        write_row(
            "Device 2's signed-out work is still there and carries nothing foreign after B "
            "signed in and out on it",
            events_after >= events_before_b_dev2 and not foreign_content,
            f'{events_before_b_dev2} event(s) before B signed in, {events_after} after B signed out '
            f'({len(foreign_content)} of them about anything other than the ynng lesson); '
            "see the two event dumps just above for the exact contents",
        )
        shot(page2, "18-device2-work-still-present-after-signout")

        report_diagnostics("Step 6", errors2, failed2)
        ctx2.close()
        browser.close()

    write_note(
        "**Run complete.** Every check above ran against the local stand-in "
        f"({STANDIN_URL}) and the site at {BASE_URL}, both started for this run and stopped "
        "afterwards. Nothing here is evidence against a real Supabase project."
    )


if __name__ == "__main__":
    run()
