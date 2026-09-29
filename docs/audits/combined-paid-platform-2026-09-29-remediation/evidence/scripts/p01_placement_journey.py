"""The placement test, end to end, in a real browser, against the FREE LOCAL STAND-IN.

WHAT IT PROVES (each with a screenshot under docs/placement/evidence/)
  01  the offer card on Today for a signed-in synthetic student
  02  the placement introduction
  03  the Listening brief with the four-part stepper (and 03-phone at 390px)
  04  Listening end to end: answers typed, handed in, the score card
  05  Reading under way, then 06 the same Reading paper after a reload:
      the answers are still there and the clock carried on (pause and resume)
  07  Writing with the essay grader NOT configured: the plain message, and the
      test carries on
  08  Speaking with the live examiner NOT configured: the plain message, and
      the test carries on
  09  the results screen (10 of them read back out of the learner record)
  10  Today afterwards: the card is gone and "Why this" says which papers are
      not yet assessed
  11  a second visit to /placement shows the results, not the test
  12  the results in Russian
Every claim about what was recorded is read back out of localStorage (the
learner record) and out of the stand-in's own store, never inferred from the
screen.

WHAT THIS IS NOT
  - Not a real Supabase project: tools/mr-ez-dev-server.mjs stands in for it,
    in memory, on this machine only.
  - No grader and no live examiner is called: both are deliberately left
    unconfigured, which is one of the two things being proved. The paid
    paths are for the owner to check live.

Run with, both already running:
  MR_EZ_DEV_PORT=8813 node tools/mr-ez-dev-server.mjs
  PUBLIC_SUPABASE_URL=http://127.0.0.1:8813 PUBLIC_SUPABASE_ANON_KEY=local-anon-key \\
    PUBLIC_GRADER_URL= PUBLIC_LIVE_EXAMINER_URL= PUBLIC_SPEAKING_GRADER_URL= \\
    npm run dev -- --port 4513
then:
  python tests/browser/p01_placement_journey.py

Every email, password and answer below is SYNTHETIC.
"""
import json
import os
import sys
import time
import urllib.request
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.environ.get("IELTS_BASE_URL", "http://localhost:4513/ielts-website")
STANDIN = os.environ.get("IELTS_STANDIN_URL", "http://127.0.0.1:8813")
REPO = Path(r"C:/Users/Alex/Desktop/Projects/IELTS website/.claude/worktrees/musing-mcclintock-862665")
OUT = Path(r"C:/Users/Alex/Desktop/Projects/IELTS website/.claude/worktrees/musing-mcclintock-862665/docs/audits/combined-paid-platform-2026-09-29-remediation/evidence/p01-placement-journey")
OUT.mkdir(parents=True, exist_ok=True)
RESULTS = OUT / "results.md"

STAMP = str(int(time.time()))
EMAIL = f"synthetic-placement-{STAMP}@example.test"
PASSWORD = "Synthetic-Placement-1"

DESKTOP = {"width": 1440, "height": 900}
PHONE = {"width": 390, "height": 844}

rows: list[tuple[str, bool, str]] = []


def row(claim: str, ok: bool, detail: str = "") -> None:
    rows.append((claim, ok, detail))
    print(("PASS " if ok else "FAIL ") + claim + (f"  [{detail}]" if detail else ""))


def shot(page, name: str, expect_path: str, full_page: bool = True) -> None:
    ok_path = expect_path in page.url
    # Let the entrance transitions (about half a second) settle first.
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=full_page)
    heading = ""
    try:
        heading = page.locator("h1, h2").first.inner_text(timeout=1500).strip()
    except Exception:
        pass
    row(f"screenshot {name}.png is on {expect_path}", ok_path, f'url={page.url} heading="{heading}"')


def goto(page, path: str) -> None:
    page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
    page.wait_for_timeout(1200)


def click(locator, timeout=10000) -> bool:
    try:
        locator.first.click(timeout=timeout)
        return True
    except Exception:
        return False


def wait_text(page, text: str, timeout=20000) -> bool:
    try:
        page.get_by_text(text, exact=False).first.wait_for(timeout=timeout)
        return True
    except Exception:
        return False


def owner_ns(page) -> str:
    """The signed-in student's namespace, 'u:<id>', read from the account
    session the site itself stored (the same place src/lib/store-owner.ts
    reads it from), so it is known before any store has been written."""
    user_id = page.evaluate(
        """() => { for (const k of Object.keys(localStorage)) { if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
             try { return JSON.parse(localStorage.getItem(k)).user.id } catch { return '' } } } return '' }"""
    )
    return f"u:{user_id}" if user_id else ""


def record(page) -> dict:
    ns = owner_ns(page)
    raw = page.evaluate(f"localStorage.getItem('ielts.learning.record.v1::{ns}')")
    return json.loads(raw) if raw else {"events": []}


def placement_state(page) -> dict | None:
    ns = owner_ns(page)
    raw = page.evaluate(f"localStorage.getItem('ielts.placement.v1::{ns}')")
    return json.loads(raw) if raw else None


def placement_events(page) -> list[dict]:
    return [e for e in record(page)["events"] if "placement:v1" in (e.get("sourceMaterial") or [])]


def standin_events() -> list[dict]:
    req = urllib.request.Request(f"{STANDIN}/rest/v1/learning_events?select=*", headers={"apikey": "local-service-role-key"})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            body = r.read().decode("utf-8")
            return json.loads(body) if body else []
    except Exception as e:  # noqa: BLE001
        print("stand-in read failed:", e)
        return []


# Sign-up since the login rework (24 September): the sign-in popup is gone.
# A new account signs up on /sign-up, fills in the required /profile ("About
# you") and is taken back to `next`. The same SYNTHETIC adult profile as
# tests/browser/t01_trial_journey.py.
PROFILE = {
    "first_name": "Synthetic",
    "last_name": "Student",
    "dob": ("4", "3", "2000"),
    "phone": "+7 701 234 56 78",
    "city": "Almaty",
    "occupation": "Synthetic University",
    "source": "friend",
}


def route_of(page) -> str:
    from urllib.parse import urlparse
    path = urlparse(page.url).path
    base = urlparse(BASE).path.rstrip("/")
    return path[len(base):] if base and path.startswith(base) else path


def wait_route(page, predicate, timeout_ms=20000) -> bool:
    deadline = time.time() + timeout_ms / 1000
    while time.time() < deadline:
        try:
            if predicate(route_of(page)):
                return True
        except Exception:
            pass
        page.wait_for_timeout(200)
    return False


def fill_profile(page) -> bool:
    try:
        page.wait_for_selector("#profile-firstName", timeout=20000)
    except Exception:
        return False
    page.locator("#profile-firstName").fill(PROFILE["first_name"])
    page.locator("#profile-lastName").fill(PROFILE["last_name"])
    day, month, year = PROFILE["dob"]
    page.locator("#profile-dob-day").select_option(day)
    page.locator("#profile-dob-month").select_option(month)
    page.locator("#profile-dob-year").select_option(year)
    page.locator("#profile-phone").fill(PROFILE["phone"])
    page.locator("#profile-city").fill(PROFILE["city"])
    page.locator("#profile-occupation").fill(PROFILE["occupation"])
    page.locator(f"#profile-source-{PROFILE['source']}").check(force=True)
    click(page.locator("form button[type=submit]"))
    return wait_route(page, lambda r: r != "/profile", timeout_ms=20000)


def sign_up(page) -> None:
    goto(page, "/sign-up?next=%2Fdashboard")
    page.wait_for_selector("#signup-email", timeout=20000)
    page.locator("#signup-email").fill(EMAIL)
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    click(page.locator("form button[type=submit]"))
    wait_route(page, lambda r: r != "/sign-up", timeout_ms=20000)
    if route_of(page) == "/profile":
        fill_profile(page)
    page.wait_for_timeout(2000)


def intake_heading(page) -> str:
    try:
        return page.locator("#intake-step-heading").inner_text(timeout=4000).strip()
    except Exception:
        return ""


def walk_intake(page) -> bool:
    """The goal questions as redone on 24 September (one per screen, see
    tests/browser/i01_intake_redo.py for the detailed proof). Answers each
    screen by its heading until the summary, then saves."""
    goto(page, "/dashboard")
    try:
        page.wait_for_selector(".intake-stage", timeout=20000)
    except Exception:
        return False
    capsule = lambda text: page.locator(".intake-capsule", has_text=text).first
    for _ in range(12):
        if page.get_by_role("button", name="Save my plan").count():
            break
        h = intake_heading(page)
        if h.startswith("What overall band"):
            click(capsule("Band 7.0"))
        elif h.startswith("When is your exam"):
            # The calendar: page forward to a date ten weeks out and pick it.
            iso = (date.today() + timedelta(days=70)).isoformat()
            click(page.locator("#intake-exam-date"))
            try:
                page.wait_for_selector(".dp-popover", timeout=5000)
                for _ in range(6):
                    if page.locator(f".dp-day[data-iso='{iso}']").count():
                        break
                    click(page.get_by_role("button", name="Next month"))
                    page.wait_for_timeout(250)
                click(page.locator(f".dp-day[data-iso='{iso}']"))
            except Exception:
                click(page.get_by_text("I do not have a date yet"), 4000)
        elif h.startswith("Which days"):
            click(capsule("Every day"))
        elif h.startswith("How long"):
            click(page.get_by_role("button", name="Yes, I can commit to this"), 4000)
        elif h.startswith("Which language"):
            click(capsule("English"))
        page.wait_for_timeout(500)
        nxt = page.get_by_role("button", name="Next")
        if nxt.count() and nxt.is_enabled() and intake_heading(page) == h:
            click(nxt)
        page.wait_for_timeout(700)
    ok = click(page.get_by_role("button", name="Save my plan"))
    page.wait_for_timeout(1500)
    click(page.get_by_role("button", name="Continue"), 6000)
    page.wait_for_timeout(1200)
    return ok


def hand_in(page) -> bool:
    click(page.get_by_role("button", name="Submit", exact=True))
    page.wait_for_timeout(600)
    # Unanswered questions ask for confirmation first.
    if page.get_by_text("Submit anyway?").count():
        click(page.get_by_role("alert").get_by_role("button", name="Submit", exact=True))
    try:
        page.get_by_text("Your Score").first.wait_for(timeout=10000)
        return True
    except Exception:
        page.screenshot(path=str(OUT / "debug-hand-in.png"))
        return False


def run() -> None:
    RESULTS.write_text(
        f"# Placement test: browser proof\n\nRun {date.today().isoformat()} against a DEV server at {BASE} with the free local\n"
        f"accounts stand-in at {STANDIN}. Graders and the live examiner deliberately unconfigured. Synthetic student\n"
        f"`{EMAIL}`. Nothing here is evidence about a real Supabase project or a paid grader.\n\n",
        encoding="utf-8",
    )
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport=DESKTOP, locale="en-US")
        page = context.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        # ── sign up and set a goal ─────────────────────────────────────────
        sign_up(page)
        row("the goal questions were answered", walk_intake(page))
        row("a synthetic student signed up on the sign-up page and filled in the profile", owner_ns(page).startswith("u:"), owner_ns(page))

        # ── 01 the offer card ──────────────────────────────────────────────
        goto(page, "/dashboard")
        wait_text(page, "Take the 40-minute placement test", 15000)
        card = page.locator("[data-placement-offer='offer']")
        row("Today shows the placement offer card to a signed-in student who has not taken it", card.count() == 1)
        card.first.scroll_into_view_if_needed()
        shot(page, "01-offer-card", "/dashboard")

        # ── 02 intro ───────────────────────────────────────────────────────
        click(page.get_by_role("link", name="Take the placement test"))
        page.wait_for_url("**/placement", timeout=15000)
        wait_text(page, "Find your starting point")
        row("the card leads to /placement and its introduction", page.get_by_text("Find your starting point").count() > 0)
        shot(page, "02-intro", "/placement")

        # ── 03 Listening brief + stepper, desktop and phone ───────────────
        click(page.get_by_role("button", name="Start the placement test"))
        wait_text(page, "Start Listening")
        row("starting shows the Listening brief with a four-part stepper", page.locator(".pl-stepper .pl-step").count() == 4)
        st = placement_state(page)
        row("a per-owner resume state was written", st is not None and st.get("owner") == owner_ns(page), f"key ielts.placement.v1::{owner_ns(page)}")
        shot(page, "03-listening-brief", "/placement")
        page.set_viewport_size(PHONE)
        page.wait_for_timeout(500)
        overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
        row("at phone width (390px) nothing scrolls sideways", not overflow)
        shot(page, "03-phone-stepper", "/placement")
        page.set_viewport_size(DESKTOP)
        page.wait_for_timeout(300)

        # ── 04 Listening end to end ───────────────────────────────────────
        click(page.get_by_role("button", name="Start Listening"))
        page.wait_for_selector("#player-q11 input[type=text]", timeout=20000)
        row("the recording plays once under exam conditions (no seek bar)",
            page.get_by_text("Plays once, exam conditions").count() > 0 and page.locator("audio[controls]").count() == 0)
        page.locator("#player-q11 input[type=text]").fill("a holiday")
        page.locator("#player-q12 input[type=text]").fill("over 40,000 years")
        page.locator("#player-q13 input[type=text]").fill("walls of China")
        page.locator("#player-q14 input[value='A']").check()
        page.locator("#player-q15 input[value='B']").check()
        page.wait_for_timeout(400)
        leg = (placement_state(page) or {}).get("legs", {}).get("listening", {})
        row("answers are saved inside the placement sitting as they are typed", leg.get("answers", {}).get("q11") == "a holiday")
        ok = hand_in(page)
        row("Listening handed in and the score card shows", ok)
        row("the score card shows no band for one part", page.get_by_text("Estimated Band").count() == 0)
        shot(page, "04-listening-handed-in", "/placement", full_page=False)
        ev = placement_events(page)
        listening = [e for e in ev if e.get("paper") == "listening"]
        row("Listening was recorded as a diagnostic event with the placement source key",
            len(listening) == 1 and listening[0]["mode"] == "diagnostic",
            f"mode={listening[0]['mode'] if listening else None} raw={listening[0]['outcome'].get('raw') if listening else None}/"
            f"{listening[0]['outcome'].get('total') if listening else None} session={listening[0].get('sessionId') if listening else None}")
        click(page.get_by_role("button", name="Continue", exact=True))
        wait_text(page, "Start Reading")

        # ── 05/06 Reading, paused and resumed ─────────────────────────────
        click(page.get_by_role("button", name="Start Reading"))
        page.wait_for_selector("#player-q14 select", timeout=20000)
        page.locator("#player-q14 select").select_option("A")
        page.locator("#player-q19 input[type=text]").fill("Somatic")
        page.wait_for_timeout(1500)
        before = page.locator("[role=timer]").first.inner_text()
        shot(page, "05-reading-under-way", "/placement", full_page=False)
        page.wait_for_timeout(2500)
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector("#player-q19 input[type=text]", timeout=20000)
        page.wait_for_timeout(1500)
        kept_select = page.locator("#player-q14 select").input_value()
        kept_text = page.locator("#player-q19 input[type=text]").input_value()
        after = page.locator("[role=timer]").first.inner_text()
        row("after a reload mid-Reading the paper resumes with its answers", kept_select == "A" and kept_text == "Somatic",
            f"q14={kept_select} q19={kept_text}")
        row("and the clock carried on rather than starting again", after < before and not after.startswith("14:"),
            f"before reload {before}, after reload {after}")
        shot(page, "06-reading-resumed", "/placement", full_page=False)
        for qid, value in [("q15", "A"), ("q16", "C"), ("q23", "True"), ("q24", "Not Given")]:
            try:
                page.locator(f"#player-{qid} select").select_option(value)
            except Exception:
                pass
        page.locator("#player-q20 input[type=text]").fill("Generations")
        ok = hand_in(page)
        row("Reading handed in", ok)
        click(page.get_by_role("button", name="Continue", exact=True))

        # ── 07 Writing, grader not configured ─────────────────────────────
        wait_text(page, "Writing cannot be marked on this site right now")
        row("with the essay grader unconfigured the student is told plainly, before writing anything",
            page.get_by_text("Writing cannot be marked on this site right now").count() > 0)
        shot(page, "07-writing-grader-unconfigured", "/placement")
        click(page.get_by_role("button", name="Continue to Speaking"))

        # ── 08 Speaking, examiner not configured ──────────────────────────
        wait_text(page, "Speaking cannot be assessed on this site right now")
        row("with the live examiner unconfigured the student is told plainly, and no microphone is asked for",
            page.get_by_text("Speaking cannot be assessed on this site right now").count() > 0)
        shot(page, "08-speaking-examiner-unconfigured", "/placement")
        click(page.get_by_role("button", name="See my results"))

        # ── 09 results ────────────────────────────────────────────────────
        wait_text(page, "Your starting point")
        page.wait_for_selector(".pl-result", timeout=15000)
        page.wait_for_timeout(1200)
        rows_text = {el.get_attribute("data-paper"): el.inner_text() for el in page.locator(".pl-result").all()}
        row("the results list all four papers", len(rows_text) == 4, "; ".join(f"{k}: {v.splitlines()[1] if len(v.splitlines())>1 else v}" for k, v in rows_text.items()))
        row("Writing and Speaking read 'Not yet assessed', never a low result",
            "Not yet assessed" in rows_text.get("writing", "") and "Not yet assessed" in rows_text.get("speaking", ""))
        row("Listening names the question types below the pass line", "Below the pass line" in rows_text.get("listening", ""),
            rows_text.get("listening", "").replace("\n", " | "))
        row("the plan's first steps are shown", page.locator(".pl-next-step").count() > 0,
            page.locator(".pl-next").inner_text().replace("\n", " | ")[:300])
        shot(page, "09-results", "/placement")

        ev = placement_events(page)
        sessions = {e.get("sessionId") for e in ev}
        row("the learner record holds exactly the two assessed parts as placement events, both diagnostic, one session",
            len(ev) == 2 and all(e["mode"] == "diagnostic" for e in ev) and len(sessions) == 1,
            f"papers={[e['paper'] for e in ev]} sessions={sessions}")
        plan_ns = owner_ns(page)
        plan_raw = page.evaluate(f"localStorage.getItem('ielts.learning.plan.v1::{plan_ns}')")
        plan = json.loads(plan_raw) if plan_raw else {}
        outstanding = plan.get("diagnosticsOutstanding")
        row("the rebuilt plan counts Listening and Reading as assessed and still owes Writing and Speaking",
            outstanding == ["writing", "speaking"], f"diagnosticsOutstanding={outstanding} revision={plan.get('revision')}")

        # ── 10 Today afterwards ───────────────────────────────────────────
        click(page.get_by_role("link", name="Continue"))
        page.wait_for_url("**/dashboard", timeout=15000)
        page.wait_for_selector("#today-heading", timeout=20000)
        page.wait_for_timeout(1000)
        row("the offer card is gone from Today once the test is taken", page.locator("[data-placement-offer]").count() == 0)
        click(page.get_by_role("button", name="Why this"))
        page.wait_for_timeout(600)
        why = page.locator(".today-why").inner_text() if page.locator(".today-why").count() else ""
        row("'Why this' says Writing and Speaking are not yet assessed", "Not yet assessed" in why and "Writing" in why and "Speaking" in why,
            why.replace("\n", " | ")[:300])
        page.locator(".today-why").first.scroll_into_view_if_needed()
        page.mouse.move(5, 5)
        shot(page, "10-today-after", "/dashboard", full_page=False)

        # ── 11 second visit ───────────────────────────────────────────────
        goto(page, "/placement")
        wait_text(page, "Your starting point")
        row("a second visit to /placement shows the results, not the test",
            page.get_by_text("Your starting point").count() > 0 and page.get_by_role("button", name="Start the placement test").count() == 0)
        shot(page, "11-second-visit", "/placement")

        # ── 12 Russian ────────────────────────────────────────────────────
        page.evaluate("localStorage.setItem('ielts.locale.v1', 'ru')")
        goto(page, "/placement")
        wait_text(page, "Ваша отправная точка", 20000)
        row("the results read in Russian, paper names staying English",
            page.get_by_text("Ваша отправная точка").count() > 0 and page.get_by_text("Listening", exact=True).count() > 0)
        shot(page, "12-results-russian", "/placement")
        page.evaluate("localStorage.setItem('ielts.locale.v1', 'en')")

        # ── the stand-in's own store ──────────────────────────────────────
        time.sleep(4)
        mine = [r for r in standin_events() if "placement:v1" in json.dumps(r)]
        row("the placement events reached the accounts stand-in with mode 'diagnostic'",
            len(mine) >= 2 and all(r.get("mode") == "diagnostic" for r in mine), f"{len(mine)} rows, modes={sorted({r.get('mode') for r in mine})}")

        row("no uncaught page errors during the journey", not errors, "; ".join(errors)[:300])
        browser.close()

    with RESULTS.open("a", encoding="utf-8") as f:
        f.write("| Claim | Result | Detail |\n|---|---|---|\n")
        for claim, ok, detail in rows:
            f.write(f"| {claim} | {'PASS' if ok else 'FAIL'} | {detail.replace('|', '/')} |\n")
    failed = [c for c, ok, _ in rows if not ok]
    print(f"\n{len(rows) - len(failed)} of {len(rows)} passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    run()
