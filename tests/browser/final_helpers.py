"""Shared helpers for the FINAL verification run (scenarios 1 to 16).

This reuses everything in helpers.py (seed builders, results writer,
diagnostics, goto/reload work-arounds) and only changes two things:

  1. the evidence folder, which becomes
     docs/personal-learning/evidence/final/ so the stage-2 evidence is left
     exactly as it was, and
  2. the default base URL, which becomes the FROZEN PRODUCTION SNAPSHOT at
     http://127.0.0.1:4340/ielts-website. Nothing on that server can hot
     reload, so unlike stage 2 there is no dev-server dependency-optimizer
     to blame a failure on: every result here is trustworthy.

It also adds the pieces the final run needs that stage 2 did not:

  - `landmark()`, which asserts the URL path AND a landmark heading before
    a screenshot is named, so a screenshot can never be mislabelled;
  - `dual_shot()`, desktop 1440x900 plus phone 390x844, both full page;
  - readers for the NEW owner-namespaced stores
    (`ielts.learning.record.v1::<owner>` and `...plan.v1::<owner>`,
    src/lib/learning/store.browser.ts), so a claim about what was recorded
    is read out of storage rather than inferred from the screen;
  - the labelled SYNTHETIC profiles the sixteen scenarios share, in
    old-store form so the site's own migration runs (the honest returning
    student path), mirroring tests/fixtures/learning-profiles.ts.

Everything seeded by this module is invented. Every profile name starts
with SYNTHETIC so nothing in a screenshot or a log can be mistaken for a
real student's work.
"""
import json
import os
import re
from pathlib import Path

import helpers
from helpers import (  # re-exported for the scenario scripts
    DESKTOP,
    PHONE,
    attach_diagnostics,
    days_after,
    days_before,
    goto,
    new_context,
    progress_v1,
    reload,
    report_diagnostics,
    saved_plan,
    seed_context,
    test_attempt,
    text_or_none,
    write_note,
    write_row,
    write_section,
    writing_attempt,
)

# ── point helpers.py at the final evidence folder and the frozen snapshot ──
BASE_URL = os.environ.get("IELTS_BASE_URL", "http://127.0.0.1:4340/ielts-website")
helpers.BASE_URL = BASE_URL
EVIDENCE_DIR = helpers.REPO_ROOT / "docs" / "personal-learning" / "evidence" / "final"
helpers.EVIDENCE_DIR = EVIDENCE_DIR

# A rerun of this suite must never overwrite the previous run's evidence.
# IELTS_RESULTS_SUFFIX picks the results file name (e.g. "-rerun" for
# results-rerun.md, leaving results.md exactly as it was); IELTS_SHOT_PREFIX
# is prepended to every screenshot filename (e.g. "rerun-") by shot()/
# dual_shot() below. Both default to empty so normal (non-rerun) use is
# unchanged.
RESULTS_SUFFIX = os.environ.get("IELTS_RESULTS_SUFFIX", "")
SHOT_PREFIX = os.environ.get("IELTS_SHOT_PREFIX", "")
helpers.RESULTS_PATH = EVIDENCE_DIR / f"results{RESULTS_SUFFIX}.md"
RESULTS_PATH = helpers.RESULTS_PATH

# The new owner-namespaced stores.
RECORD_KEY = "ielts.learning.record.v1"
PLAN_KEY = "ielts.learning.plan.v1"
DEVICE_KEY = "ielts.device.v1"
ANON_PREFIX = "anon:"
USER_PREFIX = "u:"
NS_SEP = "::"


def reset_results() -> None:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    rerun_note = (
        f"**This is a RERUN** (results{RESULTS_SUFFIX}.md, screenshots prefixed "
        f"\"{SHOT_PREFIX}\") after a fix round on top of the run recorded in results.md. "
        "results.md is left untouched.\n\n"
        if RESULTS_SUFFIX or SHOT_PREFIX else ""
    )
    helpers.RESULTS_PATH.write_text(
        "# Personal learning build: final verification evidence\n\n"
        f"Run against the FROZEN PRODUCTION SNAPSHOT at {BASE_URL} on 2026-09-22.\n\n"
        f"{rerun_note}"
        "Nothing on that server can hot reload, so no result below can be explained away as a "
        "dev-server artifact.\n\n"
        "Every scenario opens its own fresh browser context with empty localStorage and seeds its "
        "own clearly labelled SYNTHETIC data. Seeds are written in OLD-store form "
        "(`ielts.progress.v1` / `ielts.studyplan.v1`) so the site's own migration runs, which is "
        "the honest returning-student path; the new owner-namespaced stores are seeded directly "
        "only where a scenario is specifically about them. **Nothing here is a real student.**\n\n"
        "AI is NOT configured on this snapshot (no Supabase, no Mr EZ Worker, no grader), so every "
        "AI-dependent surface is expected to show its honest deterministic fallback. A simulated "
        "reply presented as a live one would be recorded as a defect.\n",
        encoding="utf-8",
    )


# ── screenshots that cannot lie ───────────────────────────────────────────

def landmark(page, expect_path: str, heading_selector: str = "h1, h2") -> tuple[str, str]:
    """Return (url, first landmark heading text) for the page as it stands."""
    url = page.url
    heading = ""
    try:
        h = page.locator(heading_selector).first
        if h.count():
            heading = h.inner_text(timeout=2000).replace("\n", " ").strip()
    except Exception:
        heading = ""
    return url, heading


def assert_on(page, check_label: str, expect_path: str, expect_heading_part: str = "",
              heading_selector: str = "h1, h2") -> bool:
    """Write a PASS/FAIL row proving the browser really is where the script
    thinks it is, BEFORE anything on this page gets named in a screenshot."""
    url, heading = landmark(page, expect_path, heading_selector)
    path_ok = expect_path in url
    head_ok = (expect_heading_part.lower() in heading.lower()) if expect_heading_part else bool(heading)
    return write_row(
        f"On the right page: {check_label}",
        path_ok and head_ok,
        f'url="{url}" (expected to contain "{expect_path}"), landmark heading="{heading}"'
        + (f' (expected to contain "{expect_heading_part}")' if expect_heading_part else ""),
    )


def shot(page, name: str, expect_path: str | None = None) -> Path:
    return helpers.screenshot(page, f"{SHOT_PREFIX}{name}", expect_path)


def dual_shot(page, name: str, expect_path: str | None = None) -> None:
    """Full-page desktop 1440x900 then phone 390x844, then back to desktop."""
    name = f"{SHOT_PREFIX}{name}"
    helpers.screenshot(page, f"{name}-desktop", expect_path)
    page.set_viewport_size(PHONE)
    page.wait_for_timeout(350)
    helpers.screenshot(page, f"{name}-phone", expect_path)
    page.set_viewport_size(DESKTOP)
    page.wait_for_timeout(250)


# ── reading the stored record / plan straight out of localStorage ──────────

def storage_keys(page):
    return page.evaluate("() => Object.keys(window.localStorage)")


def _own_key(keys, prefix):
    """The ONE key under `prefix` that is really this browser's own, not
    just "whichever matching key `Object.keys()` happens to list first".

    This suite never signs in (no Supabase on the frozen snapshot, and
    signing in to a real account is prohibited for this run), so this
    browser's own identity is always anonymous (`anon:<deviceId>`), never
    `u:<userId>`. Scenario 12 (f12_accounts.py) deliberately plants a
    SECOND, foreign owner's record under a `u:` key alongside the real
    anon one to test isolation - `Object.keys()` returns keys in insertion
    order, and the foreign key is written by the seeding init script
    BEFORE the page's own migration ever runs, so it can land first in
    that order. Picking "the first match" is then a coin flip on which
    key happened to be inserted first, and reads back as this session's
    OWN record only by luck: one rerun in this session read the seeded
    foreign record and reported it as "leaking", when the real anon
    record was sitting right there under a different key. Preferring the
    anon: owner is the fix; the plain first-match fallback stays for
    every other scenario, where there is only ever one key to find
    anyway."""
    anon_matches = [k for k in keys if k.startswith(prefix + ANON_PREFIX)]
    if anon_matches:
        return anon_matches[0]
    for k in keys:
        if k.startswith(prefix):
            return k
    return None


def owner_namespace(page) -> str | None:
    keys = storage_keys(page)
    key = _own_key(keys, RECORD_KEY + NS_SEP)
    if key:
        return key[len(RECORD_KEY + NS_SEP):]
    key = _own_key(keys, PLAN_KEY + NS_SEP)
    if key:
        return key[len(PLAN_KEY + NS_SEP):]
    return None


def read_record(page):
    """The learner record as the browser has it, or None."""
    key = _own_key(storage_keys(page), RECORD_KEY + NS_SEP)
    if not key:
        return None
    return page.evaluate(
        """(key) => {
            try { return JSON.parse(window.localStorage.getItem(key)); } catch (e) { return null; }
        }""",
        key,
    )


def read_plan(page):
    key = _own_key(storage_keys(page), PLAN_KEY + NS_SEP)
    if not key:
        return None
    return page.evaluate(
        """(key) => {
            try { return JSON.parse(window.localStorage.getItem(key)); } catch (e) { return null; }
        }""",
        key,
    )


def events_for(record, activity_id: str | None = None):
    if not record:
        return []
    evs = record.get("events") or []
    if activity_id is None:
        return evs
    return [e for e in evs if e.get("activityId") == activity_id]


# ── Today-surface readers every scenario uses ─────────────────────────────

def today_view(page) -> dict:
    """Everything the shared session says on whichever surface renders it."""
    def first(sel):
        loc = page.locator(sel)
        return loc.first.inner_text().replace("\n", " ").strip() if loc.count() else None

    steps = page.locator(".today-steps li")
    step_rows = []
    for i in range(steps.count()):
        li = steps.nth(i)
        step_rows.append({
            "role": text_or_none(li.locator(".today-step-role")),
            "title": text_or_none(li.locator(".today-step-title")),
            "minutes": text_or_none(li.locator(".today-step-minutes")),
            "done": "is-done" in (li.get_attribute("class") or ""),
        })
    start = page.locator(".today-start")
    return {
        "heading": first("#today-heading"),
        "kicker": first(".today-kicker"),
        "objective": first(".today-objective"),
        "voice": first(".today-voice-text"),
        "budget": first(".today-budget"),
        "budget_note": first(".today-budget-note"),
        "countdown": first(".today-countdown"),
        "scope": first(".today-scope"),
        "steps": step_rows,
        "start_href": start.get_attribute("href") if start.count() else None,
        "start_label": start.inner_text().strip() if start.count() else None,
        "start_count": start.count(),
        "active_count": page.locator(".today-active").count(),
        "intake_count": page.locator(".today-intake").count(),
        "planning_count": page.locator(".today-planning").count(),
        "finished_count": page.locator(".today-finished").count(),
    }


def budget_minutes(page):
    loc = page.locator(".today-budget")
    text = loc.first.inner_text() if loc.count() else ""
    m = re.search(r"(\d+)", text)
    return (int(m.group(1)) if m else None), text


def why_text(page) -> str:
    btn = page.get_by_role("button", name="Why this")
    if not btn.count():
        return "(no 'Why this' control)"
    try:
        btn.first.click()
        page.wait_for_timeout(300)
    except Exception:
        return "(could not open 'Why this')"
    panel = page.locator(".today-why")
    return panel.first.inner_text().replace("\n", " ").strip() if panel.count() else "(panel absent)"


def mrez_state(page) -> dict:
    """What Mr EZ says for himself on the page as it stands. No AI is
    configured on this snapshot, so the honest answer is an unavailable
    state and a plain deterministic next step."""
    launcher = page.locator(".mrez-launcher")
    panel = page.locator("#mrez-panel")
    note = page.locator(".mrez-note")
    blocked = page.locator(".mrez-blocked, .mrez-exam, .mrez-assessment")
    return {
        "launcher": launcher.count(),
        "launcher_class": launcher.first.get_attribute("class") if launcher.count() else None,
        "avatar_class": (page.locator(".mrez-launcher .mrez-avatar").first.get_attribute("class")
                         if page.locator(".mrez-launcher .mrez-avatar").count() else None),
        "panel": panel.count(),
        "note": note.first.inner_text().replace("\n", " ").strip() if note.count() else None,
        "composer": page.locator("#mrez-input").count(),
        "blocked_text": blocked.first.inner_text().replace("\n", " ").strip() if blocked.count() else None,
        "panel_text": panel.first.inner_text().replace("\n", " ").strip() if panel.count() else None,
    }


def report_paper_blocks(page) -> dict:
    """The /report page's four per-paper panels, as
    {paper: {heading: body}}. Read straight out of the DOM structure rather
    than by sibling selector, because the panels are <details> and a
    selector that silently matches the wrong node would report a passing
    empty string."""
    return page.evaluate(
        """() => {
            const out = {};
            for (const el of document.querySelectorAll('details.report-detail')) {
                const name = (el.querySelector('summary')?.innerText || '').trim();
                const cells = {};
                for (const h of el.querySelectorAll('p.report-detail-heading')) {
                    const parent = h.parentElement;
                    const body = Array.from(parent.children)
                        .filter((c) => c !== h)
                        .map((c) => c.innerText.replace(/\\s+/g, ' ').trim())
                        .join(' ');
                    cells[h.innerText.trim().toUpperCase()] = body;
                }
                out[name] = cells;
            }
            return out;
        }"""
    )


def skill_trend_cards(page) -> list:
    """The /report page's four separate skill panels."""
    return page.evaluate(
        """() => Array.from(document.querySelectorAll('.skill-trend-card')).map((el) => ({
            paper: (el.querySelector('.skill-trend-paper')?.innerText || '').trim(),
            certainty: (el.querySelector('.skill-trend-certainty')?.innerText || '').trim(),
            band: (el.querySelector('.skill-trend-band')?.innerText || '').replace(/\\s+/g, ' ').trim(),
            meta: Array.from(el.querySelectorAll('.skill-trend-meta span')).map((s) => s.innerText.trim()),
        }))"""
    )


def no_horizontal_scroll(page) -> bool:
    return page.evaluate(
        "() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"
    )


# ── the labelled SYNTHETIC profiles ──────────────────────────────────────
# Old-store form so the site's own migration runs. Mirrors the shapes in
# tests/fixtures/learning-profiles.ts as closely as ProgressV1 can express
# them (ProgressV1 keeps no per-question record, so a drill/lesson-check
# attempt has no old-store representation and is left out).

def reading_paper(at_days_ago, by_type, band=6.0, raw=24, test_id="reading-full-001"):
    return test_id, [test_attempt(
        days_before(at_days_ago) + "T09:00:00.000Z", raw, 40, band, f"{band:.1f}", 2400,
        by_type=by_type, skill="reading",
    )]


def synthetic_matching_headings():
    """SYNTHETIC-matching-headings: the audit's student. Confirmed band 7
    goal, two Reading papers with 1 of 8 Matching Headings right each
    (2 of 16), one attempt in each other paper so no paper is unknown."""
    progress = progress_v1(
        tests={
            "reading-full-001": [test_attempt(
                days_before(11) + "T09:00:00.000Z", 24, 40, 6, "6.0", 2400,
                by_type={"matching-headings": {"correct": 1, "total": 8},
                         "multiple-choice": {"correct": 8, "total": 10}}, skill="reading")],
            "reading-full-002": [test_attempt(
                days_before(3) + "T09:00:00.000Z", 24, 40, 6, "6.0", 2400,
                by_type={"matching-headings": {"correct": 1, "total": 8},
                         "multiple-choice": {"correct": 8, "total": 10}}, skill="reading")],
            "listening-full-001": [test_attempt(
                days_before(9) + "T09:00:00.000Z", 29, 40, 6.5, "6.5", 2400,
                by_type={"sentence-completion": {"correct": 7, "total": 10}}, skill="listening")],
        },
        writing={"pte-wt-103-task2": [writing_attempt(
            days_before(8) + "T09:00:00.000Z", 6,
            {"taskResponse": 6, "coherenceCohesion": 6, "lexicalResource": 5.5, "grammaticalRange": 6})]},
        speaking=[{
            "at": days_before(7) + "T09:00:00.000Z", "mode": "part2",
            "topic": "SYNTHETIC cue card", "overallBand": 6.5,
            "criteria": {"fluencyCoherence": 6.5, "lexicalResource": 6.5,
                         "grammaticalRange": 6.5, "pronunciation": 6.5}, "live": True}],
    )
    plan = saved_plan(target_band="7.0", test_date=days_after(35),
                      created_at="2026-07-01T09:00:00.000Z", daily_minutes=60,
                      study_days="daily", defaulted=False)
    return progress, plan


def synthetic_strong_reading_weak_writing():
    """SYNTHETIC-strong-reading-weak-writing: Reading measured high over
    three papers, Writing low over two live graded essays."""
    progress = progress_v1(
        tests={
            f"reading-full-{n:03d}": [test_attempt(
                days_before(d) + "T09:00:00.000Z", 34, 40, 7.5, "7.5", 2300,
                by_type={"matching-headings": {"correct": 7, "total": 8},
                         "multiple-choice": {"correct": 9, "total": 10},
                         "tfng": {"correct": 8, "total": 9}}, skill="reading")]
            for n, d in ((3, 14), (4, 8), (5, 2))
        },
        writing={
            "pte-wt-103-task2": [writing_attempt(
                days_before(12) + "T09:00:00.000Z", 5.5,
                {"taskResponse": 5.5, "coherenceCohesion": 5.5, "lexicalResource": 5.5,
                 "grammaticalRange": 5.5})],
            "pte-wt-104-task2": [writing_attempt(
                days_before(4) + "T09:00:00.000Z", 5.5,
                {"taskResponse": 5.5, "coherenceCohesion": 6, "lexicalResource": 5,
                 "grammaticalRange": 5.5})],
        },
    )
    plan = saved_plan(target_band="7.0", test_date=days_after(56),
                      created_at="2026-07-10T09:00:00.000Z", daily_minutes=60,
                      study_days="daily", defaulted=False,
                      skill_targets={"writing": "6.5"})
    return progress, plan


def synthetic_weak_reading_strong_writing():
    """SYNTHETIC-weak-reading-strong-writing: the mirror image."""
    progress = progress_v1(
        tests={
            f"reading-full-{n:03d}": [test_attempt(
                days_before(d) + "T09:00:00.000Z", 20, 40, 5.5, "5.5", 2400,
                by_type={"matching-headings": {"correct": 2, "total": 8},
                         "multiple-choice": {"correct": 5, "total": 10},
                         "tfng": {"correct": 4, "total": 9}}, skill="reading")]
            for n, d in ((6, 13), (7, 7), (8, 2))
        },
        writing={
            "pte-wt-103-task2": [writing_attempt(
                days_before(11) + "T09:00:00.000Z", 7.5,
                {"taskResponse": 7.5, "coherenceCohesion": 7.5, "lexicalResource": 7.5,
                 "grammaticalRange": 7.5})],
            "pte-wt-104-task2": [writing_attempt(
                days_before(3) + "T09:00:00.000Z", 7.5,
                {"taskResponse": 7.5, "coherenceCohesion": 8, "lexicalResource": 7,
                 "grammaticalRange": 7.5})],
        },
    )
    plan = saved_plan(target_band="7.0", test_date=days_after(56),
                      created_at="2026-07-10T09:00:00.000Z", daily_minutes=60,
                      study_days="daily", defaulted=False,
                      skill_targets={"writing": "6.5"})
    return progress, plan


def synthetic_lowest_but_met():
    """SYNTHETIC-lowest-but-met: overall target 7.0 with a Writing minimum
    of 6.0. Writing is the lowest paper but is already AT 6.0, so it must
    not be treated as the main gap."""
    progress = progress_v1(
        tests={
            "reading-full-009": [test_attempt(
                days_before(9) + "T09:00:00.000Z", 31, 40, 7, "7.0", 2300,
                by_type={"matching-headings": {"correct": 6, "total": 8}}, skill="reading")],
            "reading-full-010": [test_attempt(
                days_before(2) + "T09:00:00.000Z", 31, 40, 7, "7.0", 2300,
                by_type={"matching-headings": {"correct": 6, "total": 8}}, skill="reading")],
            "listening-full-002": [test_attempt(
                days_before(6) + "T09:00:00.000Z", 30, 40, 7, "7.0", 2400,
                by_type={"sentence-completion": {"correct": 8, "total": 10}}, skill="listening")],
        },
        writing={
            "pte-wt-103-task2": [writing_attempt(
                days_before(10) + "T09:00:00.000Z", 6,
                {"taskResponse": 6, "coherenceCohesion": 6, "lexicalResource": 6,
                 "grammaticalRange": 6})],
            "pte-wt-104-task2": [writing_attempt(
                days_before(3) + "T09:00:00.000Z", 6,
                {"taskResponse": 6, "coherenceCohesion": 6, "lexicalResource": 6,
                 "grammaticalRange": 6})],
        },
        speaking=[{
            "at": days_before(5) + "T09:00:00.000Z", "mode": "part2",
            "topic": "SYNTHETIC cue card", "overallBand": 7,
            "criteria": {"fluencyCoherence": 7, "lexicalResource": 7,
                         "grammaticalRange": 7, "pronunciation": 7}, "live": True}],
    )
    plan = saved_plan(target_band="7.0", test_date=days_after(49),
                      created_at="2026-07-05T09:00:00.000Z", daily_minutes=60,
                      study_days="daily", defaulted=False,
                      skill_targets={"writing": "6.0"})
    return progress, plan


def synthetic_expired():
    """SYNTHETIC-expired: the exam date is ten days in the past and half the
    course is unfinished. Must never read as completion."""
    return progress_v1(), saved_plan(
        target_band="7.0", test_date=days_before(10),
        created_at="2026-06-01T09:00:00.000Z", daily_minutes=40,
        study_days="daily", defaulted=False)


def seed_new_stores(context, record=None, plan=None, device_id="SYNTHETIC-device-1", owner=None):
    """Seed the NEW owner-namespaced stores directly. Only for scenarios
    that are specifically about those stores (owner isolation, a plan whose
    active session is days old); everywhere else the old-store path above is
    the honest one."""
    owner = owner or (ANON_PREFIX + device_id)
    extra = {DEVICE_KEY: device_id}
    if record is not None:
        extra[f"{RECORD_KEY}{NS_SEP}{owner}"] = json.dumps(record)
    if plan is not None:
        extra[f"{PLAN_KEY}{NS_SEP}{owner}"] = json.dumps(plan)
    seed_context(context, extra=extra)
    return owner
