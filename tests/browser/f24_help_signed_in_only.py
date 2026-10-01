"""Scenario 24 - Mr EZ's help buttons are for a signed-in student only, against the FREE LOCAL STAND-IN.

WHY THIS FILE EXISTS
Until 30 September 2026 every lesson page put "Explain this differently" and
"Show me an example" under every teaching block for everybody, and the
focused exercises, the lesson quick check and the written task showed their
"Give me a hint" buttons to everybody too. Mr EZ only ever reads a student's
own record, so a press from a visitor who was not signed in could only
produce the lesson's own sentence under "Mr EZ is unavailable, so this is the
lesson's own answer" plus an invitation to sign in, which confused students.

Now the controls exist only while a student is signed in
(mrEzHelpAvailable in src/components/learning/lesson-help.ts, followed by
src/components/learning/lesson-block-help.ts on the lesson page and by
src/components/learning/LessonHelpControls.tsx everywhere else). They appear
the moment a student signs in, without a reload, and go the moment they sign
out. Nothing is shown in their place. The deterministic half of this proof is
tests/help-signed-in-only.test.ts.

WHAT THIS SCRIPT DRIVES
  1. Signed out, English: the lesson page, the guided focused exercise and
     the guided written task show no help button and no note, while the page
     script has run (the block ids are stamped, the exercise's questions and
     the answer box are there) and the account layer has answered "signed
     out" (the workspace menu offers "Sign in").
  2. Signed out, Russian: the same three pages, the same answer.
  3. Sign in as a SYNTHETIC student from a second tab (the account and its
     profile are made on the stand-in first), while the English lesson page
     stays open: the buttons appear on that same page with no reload, one
     row per teaching block, and the quick check gains its hints. A press of
     "Explain this differently" goes to the stand-in's tutor and comes back
     labelled simulated.
  4. Still signed in, in another tab: the guided exercise offers its hints,
     the independent check still offers none (the assessment boundary holds
     for a signed-in student too), and the guided written task offers its
     hint and example.
  5. Sign out in a second tab: the buttons and the reply leave the open
     lesson page, with no reload and nothing in their place.

WHAT THIS IS NOT
- Not a real Supabase project and not the real tutor. `tools/mr-ez-dev-server.mjs`
  stands in for both, in memory, on this machine only. Every reply below is
  the stand-in's own and is labelled simulated on the page; nothing here is
  evidence that the live tutor works.
- Not the frozen production snapshot the f01-f19 suite uses.
- No real account, no real key, no paid API call, no deployment.

Requires, already running before this script starts:
  1. the stand-in:  MR_EZ_DEV_PORT=8835 node tools/mr-ez-dev-server.mjs
  2. the site, with its own Vite dependency cache (astro.config.f22.mjs):
                    PUBLIC_SUPABASE_URL=http://127.0.0.1:8835
                    PUBLIC_SUPABASE_ANON_KEY=local-anon-key
                    PUBLIC_MR_EZ_URL=http://127.0.0.1:8835/tutor
                    npx astro dev --config astro.config.f22.mjs --port 4388 --host 127.0.0.1

Run with:
  python tests/browser/f24_help_signed_in_only.py

Results: docs/personal-learning/evidence/final/results-help-signed-in-only.md,
screenshots prefixed "helpgate-". Every email, password and student here is
SYNTHETIC, made up for this run.
"""
import json
import os
import sys
import time
from datetime import date

sys.path.insert(0, os.path.dirname(__file__))

# Read at IMPORT time by final_helpers and f20, so these come first.
os.environ.setdefault("IELTS_BASE_URL", "http://127.0.0.1:4388/ielts-website")
os.environ.setdefault("IELTS_RESULTS_SUFFIX", "-help-signed-in-only")
os.environ.setdefault("IELTS_SHOT_PREFIX", "helpgate-")
os.environ.setdefault("IELTS_STANDIN_URL", "http://127.0.0.1:8835")

from playwright.sync_api import sync_playwright  # noqa: E402

import f20_account_journey as journey  # noqa: E402  (its page actions are reused as-is)

# The lesson page must stay open, unreloaded, while a student signs in and
# out. The shared helpers do that from a second tab of the same browser in
# this mode (see SIGN_IN_IN_PLACE in f20_account_journey.py).
journey.SIGN_IN_IN_PLACE = True

from final_helpers import (  # noqa: E402
    BASE_URL,
    EVIDENCE_DIR,
    RESULTS_PATH,
    SHOT_PREFIX,
    attach_diagnostics,
    dual_shot,
    goto,
    new_context,
    report_diagnostics,
    shot,
    write_note,
    write_row,
    write_section,
)

STANDIN_URL = os.environ.get("IELTS_STANDIN_URL", "http://127.0.0.1:8835")

RUN = time.strftime("%H%M%S")
EMAIL = f"synthetic-student-f24-{RUN}@example.test"
PASSWORD = "Synthetic-Pass-F24"

LESSON = "/lessons/reading/headings"
GUIDED = "/trainers/focused/reading-matching-headings-guided"
CHECK = "/trainers/focused/reading-matching-headings-check-a"
WRITTEN = "/trainers/focused/writing-task1-overview-guided"

# Every way a help control, or the note that used to stand in for one, can
# show up on a page, in both languages.
HELP_SELECTOR = (
    ".help-control, .help-controls, .lesson-block-help, .help-reply, "
    "button:has-text('Give me a hint'), button:has-text('Explain this differently'), "
    "button:has-text('Show me an example'), "
    "button:has-text('Дайте подсказку'), button:has-text('Объясните это иначе'), "
    "button:has-text('Покажите пример')"
)
FALLBACK_NOTES = (
    "Mr EZ could not be reached",
    "the lesson's own answer",
    "Mr EZ недоступен",
    "ответ самого урока",
)
SIMULATED_NOTE = "Simulated, not a real Mr EZ reply."
SAME_PAGE_MARK = f"f24-same-page-{RUN}"


def reset_results() -> None:
    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    header = f"""# Mr EZ's help buttons: signed-in students only

Run on {date.today().isoformat()} against a DEV server at {BASE_URL}, with the free local
accounts stand-in (`node tools/mr-ez-dev-server.mjs`) at {STANDIN_URL}. Both were started for
this run and stopped afterwards. This is NOT the frozen production snapshot the `results.md`
suite uses, and it is NOT a real Supabase project or the real tutor: nothing below is evidence
about either. Every tutor reply here is the stand-in's own, and the page labels it simulated.

What changed (30 September 2026): "Explain this differently", "Show me an example" and
"Give me a hint" now exist only while a student is signed in. A visitor who is not signed in gets
no button and no note in their place; a sign-in shows them on the open page without a reload, and
a sign-out takes them away. The deterministic half is `tests/help-signed-in-only.test.ts`.

Every student, email and password here is SYNTHETIC, invented for this run.
"""
    RESULTS_PATH.write_text(header, encoding="utf-8")


# ── small page readers ─────────────────────────────────────────────────────


def help_count(page) -> int:
    return page.locator(HELP_SELECTOR).count()


def fallback_on_page(page) -> list:
    body = page.inner_text("body")
    return [note for note in FALLBACK_NOTES if note in body]


def stamped_blocks(page) -> int:
    return page.locator("[data-lesson-body] [data-lesson-block]").count()


def block_rows(page) -> int:
    return page.locator(".lesson-block-help").count()


def quiz_hints(page) -> int:
    return page.locator(".help-controls.is-inline button.help-control").count()


def mark_page(page) -> None:
    """A value that lives only as long as this document does: a reload or a
    navigation wipes it, so finding it again proves the page never moved."""
    page.evaluate(f"() => {{ window.__f24SamePage = '{SAME_PAGE_MARK}'; }}")


def same_page(page) -> bool:
    try:
        return page.evaluate("() => window.__f24SamePage || null") == SAME_PAGE_MARK
    except Exception:
        return False


def wait_until(page, predicate, timeout_ms=15000, step_ms=250) -> bool:
    deadline = time.time() + timeout_ms / 1000
    while time.time() < deadline:
        try:
            if predicate():
                return True
        except Exception:
            pass
        page.wait_for_timeout(step_ms)
    return False


def element_shot(locator, name: str) -> None:
    """A close-up of one element, for a reply that would be a speck on a
    full-page shot of a long lesson."""
    path = EVIDENCE_DIR / f"{SHOT_PREFIX}{name}.png"
    try:
        locator.scroll_into_view_if_needed(timeout=5000)
        locator.screenshot(path=str(path))
        write_note(f"_close-up screenshot **{path.name}**_")
    except Exception as exc:
        write_note(f"_close-up screenshot {path.name} could not be taken: {type(exc).__name__}_")


def signed_out_by_menu(page) -> bool:
    """The workspace menu waits for the account layer to answer before it
    offers "Sign in" ("Войти" in Russian), so this is proof the answer is
    in, not merely early. Opens the menu and closes it again."""
    journey.open_workspace_menu(page)
    menu = page.locator(".ws-menu[role='menu']")
    offers = (menu.get_by_role("menuitem", name="Sign in").count()
              + menu.get_by_role("menuitem", name="Войти").count()) > 0
    journey.close_workspace_menu_if_open(page)
    return offers


# ── the journey ────────────────────────────────────────────────────────────


def signed_out_checks(browser, language: str) -> None:
    ru = language == "ru"
    suffix = "?lang=ru" if ru else ""
    label = "Russian" if ru else "English"
    context = new_context(browser, locale="ru-RU" if ru else "en-US")
    page = context.new_page()
    errors, failed = attach_diagnostics(page)

    goto(page, LESSON + suffix)
    page.wait_for_timeout(2500)
    lang = page.get_attribute("html", "lang")
    answered = wait_until(page, lambda: signed_out_by_menu(page), timeout_ms=15000, step_ms=800)
    write_row(
        f"[{label}, signed out] the lesson page has run its script and the account has answered",
        stamped_blocks(page) > 0 and answered and lang == ("ru" if ru else "en"),
        f'html lang="{lang}", teaching blocks stamped={stamped_blocks(page)}, '
        f"workspace menu offers Sign in={answered}",
    )
    write_row(
        f"[{label}, signed out] the lesson page shows no help button under any block, none on the "
        "quick check, and no note in their place",
        help_count(page) == 0 and not fallback_on_page(page),
        f"help controls of any kind={help_count(page)}, block rows={block_rows(page)}, "
        f"quick-check hints={quiz_hints(page)}, fallback note text found={fallback_on_page(page) or 'none'}",
    )
    dual_shot(page, f"0{1 if not ru else 3}-lesson-signed-out-{language}", LESSON)

    goto(page, GUIDED + suffix)
    page.wait_for_timeout(2500)
    wait_until(page, lambda: page.locator("select.focused-answer").count() == 6, timeout_ms=15000)
    answers = page.locator("select.focused-answer").count()
    write_row(
        f"[{label}, signed out] the guided exercise has loaded its six questions and shows no hint "
        "button and no note",
        answers == 6 and help_count(page) == 0 and not fallback_on_page(page),
        f"answer controls={answers}, help controls of any kind={help_count(page)}, "
        f"fallback note text found={fallback_on_page(page) or 'none'}",
    )
    dual_shot(page, f"0{2 if not ru else 4}-exercise-signed-out-{language}", GUIDED)

    goto(page, WRITTEN + suffix)
    page.wait_for_timeout(2500)
    wait_until(page, lambda: page.locator("#written-answer").count() > 0, timeout_ms=15000)
    box = page.locator("#written-answer").count()
    write_row(
        f"[{label}, signed out] the guided written task has loaded and shows no hint or example "
        "button and no note",
        box > 0 and help_count(page) == 0 and not fallback_on_page(page),
        f"answer box present={box > 0}, help controls of any kind={help_count(page)}, "
        f"fallback note text found={fallback_on_page(page) or 'none'}",
    )
    shot(page, f"0{2 if not ru else 4}b-written-task-signed-out-{language}-desktop", WRITTEN)

    report_diagnostics(f"Signed out, {label}", errors, failed)
    context.close()


def signed_in_journey(browser) -> None:
    context = new_context(browser)
    page = context.new_page()
    errors, failed = attach_diagnostics(page)
    tutor_requests = []

    def on_request(request):
        if request.url.startswith(STANDIN_URL + "/tutor") and request.method == "POST":
            try:
                body = json.loads(request.post_data or "{}")
            except Exception:
                body = {}
            tutor_requests.append({
                "task": body.get("task"),
                "kind": body.get("kind"),
                "blockId": body.get("blockId"),
                "bearer": (request.headers.get("authorization") or "").startswith("Bearer "),
            })

    page.on("request", on_request)

    goto(page, LESSON)
    page.wait_for_timeout(2500)
    wait_until(page, lambda: signed_out_by_menu(page), timeout_ms=15000, step_ms=800)
    blocks = stamped_blocks(page)
    write_row(
        "Before signing in, the open lesson page shows no help button",
        blocks > 0 and help_count(page) == 0,
        f"teaching blocks stamped={blocks}, help controls={help_count(page)}",
    )
    mark_page(page)

    # ── sign in from a second tab; this page stays where it is ───────────
    user_id = journey.ws_sign_up(page, EMAIL, PASSWORD)
    write_note(f"**Signed in from a second tab** as a synthetic student (stand-in user id `{user_id}`).")
    appeared = wait_until(page, lambda: block_rows(page) > 0, timeout_ms=15000)
    write_row(
        "The help buttons appear on the SAME open lesson page the moment the student signs in, "
        "with no reload",
        appeared and same_page(page),
        f"block help rows={block_rows(page)} for {blocks} stamped blocks, "
        f"same document (never reloaded)={same_page(page)}",
    )
    write_row(
        "One help row per teaching block, each with 'Explain this differently' and 'Show me an example'",
        block_rows(page) == blocks
        and page.locator(".lesson-block-help button", has_text="Explain this differently").count() == blocks
        and page.locator(".lesson-block-help button", has_text="Show me an example").count() == blocks,
        f"rows={block_rows(page)}, explain buttons="
        f'{page.locator(".lesson-block-help button", has_text="Explain this differently").count()}, '
        f'example buttons={page.locator(".lesson-block-help button", has_text="Show me an example").count()}',
    )
    write_row(
        "The lesson quick check gains its hint buttons on the same page",
        wait_until(page, lambda: quiz_hints(page) > 0, timeout_ms=8000) and same_page(page),
        f"quick-check hint buttons={quiz_hints(page)}",
    )
    shot(page, "05-lesson-signed-in-no-reload-desktop", LESSON)

    # ── press one, and read what comes back ──────────────────────────────
    first_row = page.locator(".lesson-block-help").first
    explain = first_row.locator("button", has_text="Explain this differently")
    explain.scroll_into_view_if_needed()
    explain.click()
    replied = wait_until(page, lambda: first_row.locator(".help-reply").count() > 0, timeout_ms=15000)
    reply_text = first_row.locator(".help-reply-text").first.inner_text() if replied else ""
    note_text = first_row.locator(".help-reply-note").first.inner_text() if replied else ""
    simulated = first_row.locator(".help-reply.is-simulated").count() > 0
    write_row(
        "A press of 'Explain this differently' gets a reply from the stand-in, labelled simulated "
        "(never shown as a live one)",
        replied and simulated and note_text.strip() == SIMULATED_NOTE,
        f'reply="{reply_text[:220]}", note="{note_text}", labelled simulated={simulated}',
    )
    lesson_help_requests = [r for r in tutor_requests if r["task"] == "lesson-help"]
    write_row(
        "The press went to the tutor as one lesson-help request, sent with the student's own token",
        len(lesson_help_requests) == 1 and lesson_help_requests[0]["bearer"],
        f"tutor requests seen: {json.dumps(tutor_requests)}",
    )
    element_shot(first_row, "06-lesson-simulated-reply-closeup")

    # ── the exercise pages, signed in, in another tab ────────────────────
    other = context.new_page()
    goto(other, GUIDED)
    other.wait_for_timeout(2500)
    wait_until(other, lambda: other.locator(".help-control", has_text="Give me a hint").count() > 0,
               timeout_ms=15000)
    hints = other.locator(".help-control", has_text="Give me a hint").count()
    write_row(
        "Signed in, the guided exercise offers its hint buttons (one per question before answering)",
        hints == 6,
        f"hint buttons={hints}",
    )
    dual_shot(other, "07-exercise-signed-in", GUIDED)
    goto(other, CHECK)
    other.wait_for_timeout(2500)
    wait_until(other, lambda: other.locator("select.focused-answer").count() > 0, timeout_ms=15000)
    write_row(
        "Signed in, the independent check still offers no help button at all (the assessment "
        "boundary is unchanged)",
        other.locator("select.focused-answer").count() > 0 and help_count(other) == 0,
        f"answer controls={other.locator('select.focused-answer').count()}, help controls={help_count(other)}",
    )
    shot(other, "08-check-signed-in-no-help-desktop", CHECK)
    goto(other, WRITTEN)
    other.wait_for_timeout(2500)
    wait_until(other, lambda: other.locator(".help-controls.is-inline .help-control").count() > 0,
               timeout_ms=15000)
    written_hint = other.locator(".help-controls.is-inline .help-control", has_text="Give me a hint").count()
    written_example = other.locator(".help-controls.is-inline .help-control", has_text="Show me an example").count()
    write_row(
        "Signed in, the guided written task offers its hint and example buttons before an attempt",
        written_hint == 1 and written_example == 1,
        f"hint buttons={written_hint}, example buttons={written_example}",
    )
    shot(other, "08b-written-task-signed-in-desktop", WRITTEN)
    other.close()

    # ── sign out in a second tab; the open lesson page lets go ───────────
    helper = context.new_page()
    goto(helper, "/dashboard")
    helper.wait_for_timeout(2500)
    journey.ws_sign_out(helper)
    signed_out_there = wait_until(helper, lambda: signed_out_by_menu(helper), timeout_ms=15000, step_ms=800)
    helper.close()
    vanished = wait_until(page, lambda: help_count(page) == 0, timeout_ms=15000)
    write_row(
        "Signed out in a second tab: every help button, and the reply, leave the open lesson page, "
        "with no reload",
        signed_out_there and vanished and same_page(page),
        f"second tab shows Sign in={signed_out_there}, help controls left on the open page="
        f"{help_count(page)} (block rows={block_rows(page)}, quick-check hints={quiz_hints(page)}, "
        f"replies={page.locator('.help-reply').count()}), same document={same_page(page)}",
    )
    write_row(
        "Nothing is put in their place, and the lesson itself is untouched",
        not fallback_on_page(page) and stamped_blocks(page) == blocks,
        f"fallback note text found={fallback_on_page(page) or 'none'}, teaching blocks still stamped="
        f"{stamped_blocks(page)} of {blocks}",
    )
    write_row(
        "The open page's own menu agrees the student is signed out",
        signed_out_by_menu(page),
        "workspace menu offers Sign in on the lesson page",
    )
    shot(page, "09-lesson-after-sign-out-desktop", LESSON)

    page.remove_listener("request", on_request)
    report_diagnostics("Signed-in journey", errors, failed)
    context.close()


def run():
    reset_results()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            write_section(
                "1. Signed out, English",
                "A fresh browser, nobody signed in, on a build where accounts ARE configured (the "
                "stand-in), which is the production situation for a visitor.",
            )
            signed_out_checks(browser, "en")
            write_section("2. Signed out, Russian", "The same three pages, requested with ?lang=ru.")
            signed_out_checks(browser, "ru")
            write_section(
                "3. Sign in and out on an open lesson page",
                "The lesson page stays open throughout; the student signs in, and later out, from a "
                "second tab of the same browser, the way a student's other tab would.",
            )
            signed_in_journey(browser)
        finally:
            browser.close()
    text = RESULTS_PATH.read_text(encoding="utf-8")
    passes, fails = text.count("| PASS |"), text.count("| FAIL |")
    write_note(f"**Totals:** {passes} PASS, {fails} FAIL.")
    print(f"done: {passes} PASS, {fails} FAIL -> {RESULTS_PATH}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(run())
