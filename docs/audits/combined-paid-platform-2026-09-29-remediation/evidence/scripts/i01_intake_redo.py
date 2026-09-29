"""The redone goal questions (intake), end to end, in a real browser, against the FREE LOCAL STAND-IN.

WHAT IT PROVES (screenshots under docs/intake-redo/evidence/, results in results.md there)
  A  a new synthetic student signs up and walks every screen on Today:
     a tap on a band moves on by itself and the next question's heading takes
     the focus; the site's calendar opens, marks today, refuses past days,
     answers the keyboard (arrows, Page Down, Escape) and closes on a click
     outside; a date is picked; "Every other day" is chosen; 25 minutes needs
     the explicit "Yes, I can commit to this" before it moves on; Back keeps
     an answer; the summary says what will be saved and "Change" returns to
     it; the plan saved in localStorage has the every-other-day rule anchored
     on today; Today then shows the plan.
  B  /plan-settings: only the exam date is changed, through the calendar,
     and every other answer survives byte for byte (read back from storage).
  C  the calendar in Russian (month and weekday names).
  D  a phone (390px): the calendar is a sheet pinned to the bottom of the
     screen, nothing scrolls sideways, and "Choose my days" works.
  E  reduced motion: no animation runs on a step change, and it still works.
  F  keyboard only: arrow keys change the band without moving on, Enter moves on.
Every claim about what was saved is read back out of localStorage, never
inferred from the screen.

WHAT THIS IS NOT
  Not a real Supabase project: tools/mr-ez-dev-server.mjs stands in for it,
  in memory, on this machine only. No grader, no AI, nothing paid.

Run with, both already running:
  MR_EZ_DEV_PORT=8814 node tools/mr-ez-dev-server.mjs
  PUBLIC_SUPABASE_URL=http://127.0.0.1:8814 PUBLIC_SUPABASE_ANON_KEY=local-anon-key npm run dev -- --port 4514
then:
  python tests/browser/i01_intake_redo.py

Every email, password and answer below is SYNTHETIC.
"""
import json
import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.environ.get("IELTS_BASE_URL", "http://localhost:4514/ielts-website")
REPO = Path(r"C:/Users/Alex/Desktop/Projects/IELTS website/.claude/worktrees/musing-mcclintock-862665")
OUT = Path(r"C:/Users/Alex/Desktop/Projects/IELTS website/.claude/worktrees/musing-mcclintock-862665/docs/audits/combined-paid-platform-2026-09-29-remediation/evidence/i01-intake-journey")
OUT.mkdir(parents=True, exist_ok=True)
RESULTS = OUT / "results.md"

STAMP = str(int(time.time()))
EMAIL = f"synthetic-intake-{STAMP}@example.test"
PASSWORD = "Synthetic-Intake-1"

DESKTOP = {"width": 1440, "height": 900}
PHONE = {"width": 390, "height": 844}

TODAY = date.today()
EXAM = TODAY + timedelta(days=70)
EXAM_LATER = TODAY + timedelta(days=84)

rows: list[tuple[str, bool, str]] = []
known_outside: list[str] = []
shots: list[tuple[str, str]] = []


def row(claim: str, ok: bool, detail: str = "") -> None:
    rows.append((claim, ok, detail))
    print(("PASS " if ok else "FAIL ") + claim + (f"  [{detail}]" if detail else ""))


def shot(target, name: str, what: str, full_page: bool = False) -> None:
    """`target` is a page or a locator. Waits for motion to settle first."""
    page = target.page if hasattr(target, "page") and not hasattr(target, "goto") else target
    page.wait_for_timeout(700)
    kwargs = {"path": str(OUT / f"{name}.png")}
    if hasattr(target, "goto"):
        kwargs["full_page"] = full_page
    target.screenshot(**kwargs)
    shots.append((f"{name}.png", what))


def goto(page, path: str) -> None:
    page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
    page.wait_for_timeout(1200)


def click(locator, timeout=10000) -> bool:
    try:
        locator.first.click(timeout=timeout)
        return True
    except Exception:
        return False


def heading(page) -> str:
    try:
        return page.locator("#intake-step-heading").inner_text(timeout=5000).strip()
    except Exception:
        return ""


def wait_heading(page, text: str, timeout=6000) -> bool:
    try:
        page.wait_for_function(
            "t => { const h = document.querySelector('#intake-step-heading'); return h && h.textContent.trim() === t && !document.querySelector('.intake-stage.is-leaving') }",
            arg=text,
            timeout=timeout,
        )
        return True
    except Exception:
        return False


def focused_id(page) -> str:
    return page.evaluate("document.activeElement ? document.activeElement.id : ''")


def owner_ns(page) -> str:
    user_id = page.evaluate(
        """() => { for (const k of Object.keys(localStorage)) { if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
             try { return JSON.parse(localStorage.getItem(k)).user.id } catch { return '' } } } return '' }"""
    )
    return f"u:{user_id}" if user_id else ""


def stored_plan(page) -> dict | None:
    ns = owner_ns(page)
    raw = page.evaluate(f"localStorage.getItem('ielts.learning.plan.v1::{ns}')")
    return json.loads(raw) if raw else None


def capsule(page, text: str):
    return page.locator(".intake-capsule", has_text=text).first


def pick_in_calendar(page, iso: str) -> bool:
    """Open the calendar, page forward with the month arrow until `iso` is on
    screen, and click it. Returns whether the field then shows a date."""
    click(page.locator("#intake-exam-date"))
    page.wait_for_selector(".dp-popover", timeout=5000)
    for _ in range(14):
        if page.locator(f".dp-day[data-iso='{iso}']").count():
            break
        click(page.get_by_role("button", name="Next month"))
        page.wait_for_timeout(250)
    ok = click(page.locator(f".dp-day[data-iso='{iso}']"))
    page.wait_for_timeout(400)
    return ok and page.locator(".dp-popover").count() == 0


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


def journey_a(page) -> None:
    goto(page, "/dashboard")
    page.wait_for_selector(".intake-stage", timeout=20000)
    card = page.locator(".today-intake")
    row("A: the goal questions open on Today for a new student", wait_heading(page, "What overall band are you aiming for?"))
    row("A: the progress line says question 1 of 6", "Question 1 of 6" in page.locator(".intake-progress-label").inner_text())
    shot(card, "01-target-band", "Question 1, the target band, on Today (desktop)")

    # A tap on a band moves on by itself, and the next heading takes the focus.
    click(capsule(page, "Band 7.0"))
    selected = page.evaluate("document.querySelector('input[name=intake-target-band]:checked')?.value")
    row("A: the tapped band shows as chosen straight away", selected == "7.0", f"checked={selected}")
    row("A: a tap on a band moves on to the exam date by itself", wait_heading(page, "When is your exam?"))
    row("A: the new question's heading has the keyboard focus", focused_id(page) == "intake-step-heading", focused_id(page))

    # Back keeps the answer.
    click(page.get_by_role("button", name="Back"))
    wait_heading(page, "What overall band are you aiming for?")
    kept = page.evaluate("document.querySelector('input[name=intake-target-band]:checked')?.value")
    row("A: Back returns to the band with the answer still chosen", kept == "7.0", f"checked={kept}")
    click(page.get_by_role("button", name="Next"))
    wait_heading(page, "When is your exam?")

    # The calendar.
    click(page.locator("#intake-exam-date"))
    page.wait_for_selector(".dp-popover", timeout=5000)
    today_iso = TODAY.isoformat()
    yesterday = (TODAY - timedelta(days=1)).isoformat()
    row("A: the calendar opens as a month grid in the site's style", page.locator(".dp-grid").count() == 1)
    row(
        "A: today is marked",
        page.locator(f".dp-day.is-today[data-iso='{today_iso}']").count() == 1
        and page.locator(f".dp-day[data-iso='{today_iso}']").get_attribute("aria-current") == "date",
    )
    if TODAY.day > 1:
        row("A: a past day cannot be chosen", page.locator(f".dp-day[data-iso='{yesterday}']").is_disabled())
    row(
        "A: the keyboard focus starts on today inside the grid",
        page.evaluate("document.activeElement?.dataset?.iso") == today_iso,
        str(page.evaluate("document.activeElement?.dataset?.iso")),
    )
    shot(page, "02-calendar-open", "The calendar open under the exam-date field, today marked, past days greyed (desktop)")
    page.keyboard.press("ArrowRight")
    moved = page.evaluate("document.activeElement?.dataset?.iso")
    row("A: the right arrow moves the focus one day", moved == (TODAY + timedelta(days=1)).isoformat(), str(moved))
    title_before = page.locator(".dp-title").inner_text()
    page.keyboard.press("PageDown")
    page.wait_for_timeout(300)
    title = page.locator(".dp-title").inner_text()
    focus_after = page.evaluate("document.activeElement?.dataset?.iso") or ""
    row(
        "A: Page Down shows the next month and keeps the focus in the grid",
        title != title_before and focus_after[:7] > moved[:7],
        f"{title_before} -> {title}, focus {focus_after}",
    )
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    row(
        "A: Escape closes the calendar and hands the focus back to the field",
        page.locator(".dp-popover").count() == 0 and focused_id(page) == "intake-exam-date",
        focused_id(page),
    )
    row("A: nothing was chosen by just looking", page.locator("#intake-exam-date.has-value").count() == 0)
    click(page.locator("#intake-exam-date"))
    page.wait_for_selector(".dp-popover", timeout=5000)
    page.mouse.click(1300, 450)  # far outside the card
    page.wait_for_timeout(300)
    row("A: a click outside closes the calendar", page.locator(".dp-popover").count() == 0)

    picked = pick_in_calendar(page, EXAM.isoformat())
    field_text = page.locator("#intake-exam-date .dp-field-value").inner_text()
    row("A: a date is picked from the calendar and the field shows it in words", picked and str(EXAM.day) in field_text, field_text)
    sub = page.locator("#intake-exam-date .dp-field-sub").inner_text() if page.locator("#intake-exam-date .dp-field-sub").count() else ""
    row("A: the field says how far away the exam is", sub == "In 70 days", sub)
    shot(card, "03-exam-date-picked", "The exam date chosen, shown in words with the days left")

    click(page.get_by_role("button", name="Next"))
    row("A: Next moves on to the study days", wait_heading(page, "Which days can you study?"))
    labels = page.locator("input[name=intake-study-days]").evaluate_all("els => els.map(e => e.value)")
    row("A: four study-day choices, including every other day", labels == ["daily", "alternate", "weekdays", "custom"], str(labels))
    shot(card, "04-study-days", "Question 3: Every day, Every other day, Weekdays, Choose my days")

    click(capsule(page, "Every other day"))
    row("A: a tap on Every other day moves on by itself", wait_heading(page, "How long can you study each day?"))

    sixty = page.evaluate("document.querySelector('input[name=intake-daily-minutes]:checked')?.value")
    row("A: 60 minutes is shown first as the teacher's recommendation", sixty == "60" and page.get_by_text("Your teacher's recommendation").count() > 0)
    click(capsule(page, "25 minutes"))
    page.wait_for_timeout(900)
    row(
        "A: choosing 25 minutes does NOT move on until it is confirmed",
        heading(page) == "How long can you study each day?" and page.get_by_role("button", name="Next").is_disabled(),
        heading(page),
    )
    shot(card, "05-daily-time-confirm", "Question 4: 25 minutes chosen, waiting for the explicit 'Yes, I can commit to this'")
    click(page.get_by_role("button", name="Yes, I can commit to this"))
    row("A: the explicit yes moves on", wait_heading(page, "Which language should explanations be in?"))

    click(capsule(page, "English"))
    row("A: a tap on a language moves on", wait_heading(page, "Which section feels hardest right now?"))
    row("A: the hardest-section question is marked optional", page.locator(".intake-optional").count() == 1)
    click(page.get_by_role("button", name="Next"))
    row("A: the last screen is the summary", wait_heading(page, "Here is your plan"))
    headline = page.locator(".intake-review-headline").inner_text()
    from_short = f"{EXAM.day} {EXAM.strftime('%B')}"
    row(
        "A: the summary says it in one line",
        headline.startswith(f"Band 7.0 by {from_short}") and "every other day" in headline and "25 minutes a day" in headline,
        headline,
    )
    days_row = page.locator(".intake-review-row", has_text="Study days").locator("dd").inner_text()
    row("A: the summary says every other day starts today", days_row.startswith("Every other day, starting"), days_row)
    shot(card, "06-summary", "The summary before saving, each answer with Change")

    click(page.locator(".intake-review-row", has_text="Study days").get_by_role("button", name="Change"))
    wait_heading(page, "Which days can you study?")
    still = page.evaluate("document.querySelector('input[name=intake-study-days]:checked')?.value")
    row("A: Change goes back to that one question, answer intact", still == "alternate", str(still))
    click(page.get_by_role("button", name="Back to summary"))
    row("A: and comes straight back to the summary", wait_heading(page, "Here is your plan"))

    click(page.get_by_role("button", name="Save my plan"))
    page.wait_for_timeout(1500)
    row("A: the plan is saved", page.get_by_text("Your plan is saved.").count() > 0)
    shot(card, "07-saved", "Saved: the honest outcome for this plan")

    plan = stored_plan(page)
    c = (plan or {}).get("constraints", {})
    g = (plan or {}).get("goals", {})
    row(
        "A: the saved plan has the every-other-day rule, starting today",
        c.get("studyDays") == "alternate" and c.get("alternateAnchor") == TODAY.isoformat(),
        f"studyDays={c.get('studyDays')} alternateAnchor={c.get('alternateAnchor')} customStudyDays={c.get('customStudyDays')}",
    )
    row(
        "A: 25 minutes is saved as the student's own confirmed choice",
        c.get("regularDailyMinutes") == 25 and c.get("regularDailyMinutesStatus") == "confirmed",
    )
    row(
        "A: the band and the exam date are saved as chosen",
        (g.get("overallTarget") or {}).get("band") == 7 and (g.get("examDate") or {}).get("date") == EXAM.isoformat(),
        json.dumps({"target": g.get("overallTarget"), "exam": g.get("examDate")}),
    )
    schedule = (plan or {}).get("schedule", [])
    pattern = [(d.get("date"), d.get("kind")) for d in schedule[:6]]
    rests = [d for d, k in pattern[:4] if k == "rest"]
    row(
        "A: the plan's own schedule rests every second day",
        len(pattern) >= 4 and pattern[0][1] != "rest" and pattern[1][1] == "rest" and pattern[2][1] != "rest" and pattern[3][1] == "rest",
        str(pattern[:4]),
    )

    click(page.get_by_role("button", name="Continue"))
    page.wait_for_timeout(1500)
    active = page.locator(".today-active")
    row("A: Today then shows the plan's session", active.count() == 1, page.locator("#today-heading").inner_text() if page.locator("#today-heading").count() else "")
    shot(page, "08-today-after", "Today after saving: the plan's session", full_page=False)


def journey_b(page) -> None:
    goto(page, "/plan-settings")
    page.wait_for_selector(".intake-settings", timeout=20000)
    before = stored_plan(page)
    checked = page.evaluate("document.querySelector('input[name=intake-study-days]:checked')?.value")
    row("B: plan settings loads every other day as the saved answer", checked == "alternate", str(checked))
    field = page.locator("#intake-exam-date .dp-field-value").inner_text()
    row("B: plan settings shows the saved exam date in words", str(EXAM.day) in field, field)
    shot(page, "09-settings-before", "Plan settings, loaded exactly as saved", full_page=True)

    picked = pick_in_calendar(page, EXAM_LATER.isoformat())
    row("B: a new exam date is picked in the same calendar", picked)
    click(page.get_by_role("button", name="Save changes"))
    page.wait_for_timeout(1500)
    row("B: saved", page.get_by_text("Your changes are saved.").count() > 0)
    after = stored_plan(page)
    bc, ac = (before or {}).get("constraints"), (after or {}).get("constraints")
    row(
        "B: every constraint survives byte for byte (study days, anchor, minutes, language)",
        json.dumps(bc, sort_keys=False) == json.dumps(ac, sort_keys=False),
        json.dumps(ac),
    )
    bg = dict((before or {}).get("goals", {}))
    ag = dict((after or {}).get("goals", {}))
    moved = ag.pop("examDate", None)
    bg.pop("examDate", None)
    row("B: every other goal survives byte for byte", json.dumps(bg) == json.dumps(ag))
    row("B: only the exam date changed", (moved or {}).get("date") == EXAM_LATER.isoformat(), json.dumps(moved))
    shot(page, "10-settings-after", "Plan settings after changing only the exam date", full_page=True)


def journey_c(page) -> None:
    page.evaluate("localStorage.setItem('ielts.locale.v1', 'ru')")
    goto(page, "/plan-settings")
    page.wait_for_selector(".intake-settings", timeout=20000)
    page.wait_for_timeout(1200)
    click(page.locator("#intake-exam-date"))
    page.wait_for_selector(".dp-popover", timeout=5000)
    page.wait_for_timeout(500)
    title = page.locator(".dp-title").inner_text()
    heads = page.locator(".dp-grid th").all_inner_texts()
    field = page.locator("#intake-exam-date .dp-field-value").inner_text()
    import re

    row("C: the month title is Russian", bool(re.match(r"^[А-ЯЁ][а-яё]+ \d{4}$", title)), title)
    row("C: the week starts on Monday, in Russian", heads[:1] == ["Пн"] and heads[-1:] == ["Вс"], " ".join(heads))
    row("C: the chosen date is written in Russian", bool(re.search(r"[а-яё]", field)), field)
    row("C: the calendar controls are Russian", page.get_by_role("button", name="Следующий месяц").count() == 1)
    shot(page, "11-calendar-russian", "The calendar in Russian on plan settings")
    page.keyboard.press("Escape")
    days = page.locator(".intake-capsule", has_text="Через день").count()
    row("C: 'Every other day' reads 'Через день'", days == 1)
    page.evaluate("localStorage.setItem('ielts.locale.v1', 'en')")


def journey_d(browser) -> None:
    ctx = browser.new_context(viewport=PHONE, locale="en-US", has_touch=True, is_mobile=True, device_scale_factor=2)
    page = ctx.new_page()
    goto(page, "/dashboard")
    page.wait_for_selector(".intake-stage", timeout=20000)
    page.locator(".today-intake").scroll_into_view_if_needed()
    shot(page, "12-phone-target", "Phone (390px): question 1")
    capsule(page, "Band 7.0").tap()
    wait_heading(page, "When is your exam?")
    page.locator("#intake-exam-date").tap()
    page.wait_for_selector(".dp-popover", timeout=5000)
    page.wait_for_timeout(500)
    box = page.locator(".dp-popover").bounding_box()
    row(
        "D: on a phone the calendar is a sheet pinned to the bottom of the screen, full width",
        box is not None and abs((box["y"] + box["height"]) - PHONE["height"]) <= 2 and box["width"] >= PHONE["width"] - 2,
        str(box),
    )
    shot(page, "13-phone-calendar-sheet", "Phone: the calendar rises from the bottom as a sheet")
    page.locator(".dp-backdrop").tap(position={"x": 20, "y": 20})
    page.wait_for_timeout(400)
    row("D: tapping the dimmed page closes the sheet", page.locator(".dp-popover").count() == 0)
    overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
    row("D: nothing scrolls sideways at 390px", not overflow)
    page.get_by_role("button", name="Next").tap()
    wait_heading(page, "Which days can you study?")
    capsule(page, "Choose my days").tap()
    page.wait_for_timeout(700)
    row("D: 'Choose my days' does not move on by itself", heading(page) == "Which days can you study?")
    row("D: Next waits until at least one day is picked", page.get_by_role("button", name="Next").is_disabled())
    for name in ["Monday", "Wednesday", "Friday"]:
        page.get_by_role("button", name=name, exact=True).tap()
    pressed = page.locator(".intake-weekday[aria-pressed='true']").count()
    row("D: three days picked", pressed == 3)
    row("D: Next is available once days are picked", not page.get_by_role("button", name="Next").is_disabled())
    page.locator("#intake-step-heading").evaluate("e => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 110)")
    shot(page, "14-phone-choose-days", "Phone: Choose my days with Mon, Wed, Fri picked")
    overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
    row("D: still nothing scrolls sideways", not overflow)
    ctx.close()


def journey_e(browser) -> None:
    ctx = browser.new_context(viewport=DESKTOP, locale="en-US", reduced_motion="reduce")
    page = ctx.new_page()
    goto(page, "/dashboard")
    page.wait_for_selector(".intake-stage", timeout=20000)
    anim = page.evaluate("getComputedStyle(document.querySelector('.intake-stage')).animationName")
    row("E: with reduced motion the step has no animation", anim == "none", anim)
    click(capsule(page, "Band 7.0"))
    saw_leaving = page.evaluate(
        """() => new Promise(res => { let seen = false; const t0 = performance.now();
             const tick = () => { if (document.querySelector('.intake-stage.is-leaving')) seen = true;
               if (performance.now() - t0 > 600) return res(seen); requestAnimationFrame(tick); }; tick(); })"""
    )
    row("E: no slide-out is ever drawn", not saw_leaving)
    row("E: it still moves on", wait_heading(page, "When is your exam?", 2000))
    running = page.evaluate("document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.intake')).length")
    row("E: no animation is running inside the questions", running == 0, f"running={running}")
    click(page.locator("#intake-exam-date"))
    page.wait_for_selector(".dp-popover", timeout=5000)
    pop_anim = page.evaluate("getComputedStyle(document.querySelector('.dp-popover')).animationName")
    row("E: the calendar opens without motion", pop_anim == "none", pop_anim)
    shot(page.locator(".today-intake"), "15-reduced-motion", "Reduced motion: calendar open, nothing animated")
    ctx.close()


def journey_f(browser) -> None:
    ctx = browser.new_context(viewport=DESKTOP, locale="en-US")
    page = ctx.new_page()
    goto(page, "/dashboard")
    page.wait_for_selector(".intake-stage", timeout=20000)
    page.locator("input[name=intake-target-band]").first.focus()
    page.keyboard.press("Space")
    page.keyboard.press("ArrowRight")
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(900)
    val = page.evaluate("document.querySelector('input[name=intake-target-band]:checked')?.value")
    row("F: arrow keys change the band without moving on", heading(page) == "What overall band are you aiming for?" and val == "7.5", f"checked={val}")
    page.keyboard.press("Enter")
    row("F: Enter moves on", wait_heading(page, "When is your exam?"))
    row("F: and the focus lands on the new question", focused_id(page) == "intake-step-heading")
    ctx.close()


def run() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport=DESKTOP, locale="en-US")
        page = context.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(f"{page.url}: {str(e)[:900]}"))

        sign_up(page)
        row("a synthetic student signed up through the workspace menu", owner_ns(page).startswith("u:"), owner_ns(page))
        for name, fn in [("A", journey_a), ("B", journey_b), ("C", journey_c)]:
            try:
                fn(page)
            except Exception as e:  # noqa: BLE001
                row(f"{name}: journey ran to the end", False, repr(e)[:300])
                page.screenshot(path=str(OUT / f"debug-{name}.png"))
        for name, fn in [("D", journey_d), ("E", journey_e), ("F", journey_f)]:
            try:
                fn(browser)
            except Exception as e:  # noqa: BLE001
                row(f"{name}: journey ran to the end", False, repr(e)[:300])
        # One page error is known and has nothing to do with this change:
        # Mr EZ's panel (src/components/tutor/MrEzPanel.tsx) renders its "not
        # switched on for this build" note in English on the server and in
        # Russian in the browser whenever Russian is set, on every page. It
        # is recorded below, not counted against the questions.
        outside = [e for e in errors if "MrEzPanel" in e]
        ours = [e for e in errors if "MrEzPanel" not in e]
        row("no page errors from the goal questions or the calendar", not ours, "; ".join(ours)[:300])
        known_outside.extend(outside)
        (OUT / "page-errors.txt").write_text("\n\n".join(errors) or "none", encoding="utf-8")
        browser.close()

    passed = sum(1 for _, ok, _ in rows if ok)
    lines = [
        "# Goal questions redo: browser proof",
        "",
        f"Run {date.today().isoformat()} against a DEV server at {BASE} with the free local accounts stand-in.",
        f"Synthetic student `{EMAIL}`. Nothing here touches a real Supabase project or anything paid.",
        "",
        f"**{passed} of {len(rows)} checks passed.**",
        "",
        "| | Check | Detail |",
        "|---|---|---|",
    ]
    for claim, ok, detail in rows:
        lines.append(f"| {'PASS' if ok else 'FAIL'} | {claim} | {detail.replace('|', '/')[:220]} |")
    if known_outside:
        lines += [
            "",
            "## Known, outside this change",
            "",
            f"{len(known_outside)} page error(s) from Mr EZ's panel, not from the goal questions: with Russian set, the",
            "panel's 'Mr EZ is not switched on for this build yet' note is English in the server HTML and Russian in",
            "the browser, so React reports a hydration mismatch. It happens on /dashboard and /plan-settings for a",
            "signed-out visitor too, whenever Russian is chosen. Full text in page-errors.txt.",
        ]
    lines += ["", "## Screenshots", ""]
    for name, what in shots:
        lines.append(f"- `{name}`: {what}")
    RESULTS.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n{passed} of {len(rows)} checks passed. Results: {RESULTS}")


if __name__ == "__main__":
    run()
