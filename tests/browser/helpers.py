"""Shared helpers for the stage-2 personal-learning browser scripts.

Every scenario script in this folder imports this module. It owns:
  - the base URL / viewport constants
  - building OLD-store (ielts.progress.v1 / ielts.studyplan.v1) seed data,
    so a scenario seeds data the way a real returning student's browser
    would have it, and the site's own migration does the rest
  - a console/network diagnostics collector
  - a results.md writer (PASS/FAIL rows) and a screenshot helper

Nothing here talks to Playwright's browser launcher directly except through
functions the scenario scripts call, so every scenario is free to open its
own fresh browser context (required: every scenario uses a fresh browser
context and seeds its own labelled synthetic data).

All seeded data is synthetic. Nothing here is a real student's work.
"""
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

# Console on this machine is cp1251; without this, any unusual character in
# page text (en dash, checkmark, Cyrillic) crashes a bare print().
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Overridable so this suite can be pointed at a frozen snapshot on another
# port later (this dev server was observed hot-reloading mid-scenario while
# another builder edited src/ concurrently, which resets React island state
# and produces false FAILs unrelated to the product).
BASE_URL = os.environ.get("IELTS_BASE_URL", "http://127.0.0.1:4331/ielts-website")

DESKTOP = {"width": 1440, "height": 900}
PHONE = {"width": 390, "height": 844}

REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_DIR = REPO_ROOT / "docs" / "personal-learning" / "evidence" / "stage2"
RESULTS_PATH = EVIDENCE_DIR / "results.md"

# The fixtures in tests/fixtures/learning-profiles.ts are written against
# this exact date (PROFILE_TODAY). Today's real date matches it, so seed
# data here uses the same day-offset convention for direct comparability.
TODAY = date(2026, 9, 22)


def days_before(n: int, frm: date = TODAY) -> str:
    return (frm - timedelta(days=n)).isoformat()


def days_after(n: int, frm: date = TODAY) -> str:
    return (frm + timedelta(days=n)).isoformat()


# ── results.md ────────────────────────────────────────────────────────────

def reset_results() -> None:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_PATH.write_text(
        "# Stage 2 personal-learning evidence: one shared next step, intake, "
        "one hour, honest budget and deadline\n\n"
        f"Run against {BASE_URL} on 2026-09-22. Every scenario opens a fresh "
        "browser context and seeds its own labelled SYNTHETIC data (old-store "
        "ielts.progress.v1 / ielts.studyplan.v1 form, letting the site's own "
        "migration run) or starts from genuinely empty storage. Nothing here "
        "is a real student.\n",
        encoding="utf-8",
    )


def write_section(title: str, subtitle: str = "") -> None:
    with RESULTS_PATH.open("a", encoding="utf-8") as f:
        f.write(f"\n## {title}\n\n")
        if subtitle:
            f.write(subtitle + "\n\n")
        f.write("| Check | Result | Observed |\n|---|---|---|\n")


def write_row(check: str, passed: bool, observed: str) -> bool:
    status = "PASS" if passed else "FAIL"
    obs = observed.replace("|", "\\|").replace("\n", " ").strip()
    with RESULTS_PATH.open("a", encoding="utf-8") as f:
        f.write(f"| {check} | {status} | {obs} |\n")
    print(f"[{status}] {check}: {obs}")
    return passed


def write_note(text: str) -> None:
    with RESULTS_PATH.open("a", encoding="utf-8") as f:
        f.write(f"\n{text}\n")
    print(f"NOTE: {text}")


# ── screenshots ──────────────────────────────────────────────────────────

def screenshot(page, name: str, expect_path: str | None = None) -> Path:
    """Save a full-page screenshot, and log the REAL url/heading it was taken
    from next to it in results.md, so a mismatch between a screenshot's file
    name and what was actually on screen (e.g. a hot reload mid-scenario
    silently changed the page) is visible on inspection rather than hidden.
    If expect_path is given and the current URL does not contain it, this
    writes a loud FAIL row instead of silently mislabelling the screenshot."""
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    path = EVIDENCE_DIR / f"{name}.png"
    url = page.url
    heading = None
    try:
        h = page.locator("h1, h2#today-heading").first
        if h.count():
            heading = h.inner_text(timeout=1000)
    except Exception:
        heading = None
    page.screenshot(path=str(path), full_page=True)
    print(f"screenshot: {path.name} (url={url}, heading=\"{heading}\")")
    with RESULTS_PATH.open("a", encoding="utf-8") as f:
        f.write(f"\n_screenshot **{path.name}**: url=`{url}`, landmark heading=\"{heading}\"_\n")
    if expect_path is not None and expect_path not in url:
        write_row(
            f"screenshot {name}.png is really on the expected page",
            False,
            f'expected url to contain "{expect_path}", actual url = "{url}" - this screenshot may be '
            "mislabelled (a navigation/reload landed somewhere else before it was taken)",
        )
    return path


# ── diagnostics: console errors + failed/4xx/5xx network ───────────────────

def attach_diagnostics(page):
    errors = []
    failed = []

    def on_console(msg):
        if msg.type == "error":
            errors.append(msg.text)

    def on_response(resp):
        try:
            if resp.status >= 400:
                failed.append(f"{resp.status} {resp.url}")
        except Exception:
            pass

    def on_request_failed(req):
        # A top-level document request that gets aborted because the script
        # already started a NEW navigation before the old one settled is a
        # routine artifact of goto()-ing quickly between pages, not a real
        # failure - only report it for sub-resources (script/fetch/xhr/img/...).
        if req.resource_type == "document":
            return
        failed.append(f"FAILED {req.url} ({req.failure})")

    page.on("console", on_console)
    page.on("response", on_response)
    page.on("requestfailed", on_request_failed)
    return errors, failed


def report_diagnostics(scenario: str, errors, failed) -> None:
    if errors:
        write_note(f"**{scenario} console errors:** " + "; ".join(errors[:10]))
    if failed:
        write_note(f"**{scenario} failed/4xx/5xx requests:** " + "; ".join(failed[:10]))
    if not errors and not failed:
        write_note(f"**{scenario}:** no console errors, no failed/4xx/5xx requests.")


# ── localStorage seeding (old-store form) ───────────────────────────────────

def seed_context(context, progress=None, saved_plan=None, locale=None, extra=None):
    """Register an init script that writes the OLD stores into localStorage
    before any page script on this context runs, on every navigation. This
    is what lets the site's own migration (not this script) turn old
    ielts.progress.v1 / ielts.studyplan.v1 data into the new learner record
    and plan, which is the honest way to test a returning student."""
    items = {}
    if progress is not None:
        items["ielts.progress.v1"] = json.dumps(progress)
    if saved_plan is not None:
        items["ielts.studyplan.v1"] = json.dumps(saved_plan)
    if locale is not None:
        items["ielts.locale.v1"] = locale
    if extra:
        for k, v in extra.items():
            items[k] = v if isinstance(v, str) else json.dumps(v)
    if not items:
        return
    sets = " ".join(
        f"try {{ window.localStorage.setItem({json.dumps(k)}, {json.dumps(v)}); }} catch (e) {{}}"
        for k, v in items.items()
    )
    context.add_init_script(f"(() => {{ {sets} }})();")


def test_attempt(at, raw, total, band, band_label, seconds_used, by_type=None, kind="full", skill="reading"):
    d = {
        "at": at,
        "raw": raw,
        "total": total,
        "band": band,
        "bandLabel": band_label,
        "secondsUsed": seconds_used,
        "kind": kind,
        "skill": skill,
    }
    if by_type is not None:
        d["byType"] = by_type
    return d


def writing_attempt(at, overall_band, criteria, word_count=270, live=True, task="task2"):
    return {
        "at": at,
        "overallBand": overall_band,
        "criteria": criteria,
        "wordCount": word_count,
        "live": live,
        "task": task,
    }


def saved_plan(
    target_band,
    test_date="",
    created_at="2026-08-01T09:00:00.000Z",
    done=None,
    done_keys=None,
    start_date=None,
    daily_minutes=None,
    study_days=None,
    defaulted=None,
    skill_targets=None,
):
    p = {
        "targetBand": target_band,
        "testDate": test_date,
        "createdAt": created_at,
        "done": done or [],
    }
    if done_keys is not None:
        p["doneKeys"] = done_keys
    if start_date is not None:
        p["startDate"] = start_date
    if daily_minutes is not None:
        p["dailyMinutes"] = daily_minutes
    if study_days is not None:
        p["studyDays"] = study_days
    if defaulted is not None:
        p["defaulted"] = defaulted
    if skill_targets is not None:
        p["skillTargets"] = skill_targets
    return p


def progress_v1(lessons=None, tests=None, writing=None, speaking=None, activity=None):
    return {
        "version": 1,
        "lessons": lessons or {},
        "tests": tests or {},
        "writing": writing or {},
        "speaking": speaking or [],
        "activity": activity or {},
    }


# ── small DOM helpers ───────────────────────────────────────────────────────

def text_or_none(locator):
    try:
        if locator.count() == 0:
            return None
        return locator.first.inner_text()
    except Exception:
        return None


def goto(page, path=""):
    """Navigate to BASE_URL + path. Uses wait_until='load' rather than
    'networkidle': this app keeps a live dev-server HMR socket (and pages
    like /dashboard poll Mr EZ / Supabase-backed state), so 'networkidle'
    either hangs or, observed repeatedly against this dev server, aborts the
    navigation outright (net::ERR_ABORTED) once a background connection is
    open. 'load' plus a short settle wait is what every scenario script
    calls this for anyway."""
    url = BASE_URL + path
    try:
        page.goto(url, wait_until="load")
    except Exception:
        page.goto(url, wait_until="load")
    return url


def reload(page):
    """A real reload, done as a fresh goto() to the current URL.
    page.reload() itself proved reproducibly flaky against this dev server
    (net::ERR_ABORTED - see README.md), so every scenario reloads this way."""
    url = page.url
    try:
        page.goto(url, wait_until="load")
    except Exception:
        page.goto(url, wait_until="load")


def new_context(browser, viewport=None, locale="en-US", **kwargs):
    """A fresh, isolated context. Defaults to an English browser locale so
    the site's own device-language auto-detect (Russian for a ru/kk device)
    does not silently switch scenarios that expect English text into
    Russian - this machine's own OS locale is Russian, which was exactly
    that trap. Scenarios that want Russian pass locale='ru-RU' explicitly,
    or rely on the ?lang=ru query parameter, which always wins."""
    return browser.new_context(viewport=viewport or DESKTOP, locale=locale, **kwargs)
