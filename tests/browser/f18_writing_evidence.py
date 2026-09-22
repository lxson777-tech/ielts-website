"""Scenario 18 - What a written task actually saves, read out of storage.

The 22 September 2026 independent review found two defects in the join
between the Writing focused task and the evidence layer, and neither was
visible on the screen. So every claim here is read back out of
localStorage rather than inferred from what the page says.

1. A Task 2 exercise saves Task 2 evidence. The review submitted a
   paragraph at /trainers/focused/writing-lexical-topic-vocabulary-check
   and found the saved event scoped `{ kind: 'writing-task', task:
   'task1' }`. It must now be task2, and the screen must stop calling a
   Task 2 paragraph an overview.
2. A Task 1 exercise still saves Task 1 evidence, unaided.
3. Help taken BEFORE the answer is recorded as help, and survives a
   reload: the guiding questions are opened on the guided Task 1
   overview, the page is reloaded, the answer is written, and the saved
   event must be assisted.

Nothing here needs AI. This snapshot has no tutor configured, so every
submission falls back to the honest automatic checks; what is being
checked is the bookkeeping, which does not depend on a model. Every
paragraph typed below is labelled SYNTHETIC.

Run it like every other final scenario (the frozen snapshot must already
be serving at IELTS_BASE_URL):

    python f18_writing_evidence.py
"""
import json

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    days_after,
    dual_shot,
    events_for,
    goto,
    new_context,
    owner_namespace,
    progress_v1,
    read_record,
    reload,
    report_diagnostics,
    saved_plan,
    seed_context,
    shot,
    storage_keys,
    write_note,
    write_row,
    write_section,
)

TASK2_CHECK = "writing-lexical-topic-vocabulary-check"
TASK1_CHECK = "writing-task1-overview-check-a"
TASK1_GUIDED = "writing-task1-overview-guided"

DRAFT_PREFIX = "ielts.learning.written.v1"

TASK2_PARAGRAPH = (
    "SYNTHETIC: Driverless vehicles rely on sensors, machine learning and real time "
    "navigation software, and public investment in that infrastructure is what makes "
    "widespread adoption realistic rather than experimental."
)
TASK1_OVERVIEW = (
    "SYNTHETIC: Overall, the urban share rose in every country over the period, while "
    "the rural share fell steadily throughout."
)
TASK1_GUIDED_OVERVIEW = (
    "SYNTHETIC: Overall, participation grew in almost every activity, although one of "
    "them fell away sharply by the end of the period."
)


def path_for(exercise_id: str) -> str:
    return f"/trainers/focused/{exercise_id}"


def submit(page, text: str) -> str:
    """Type the answer and press the page's own primary button. Returns the
    button's label, because the label is itself one of the things under
    test (a Task 2 paragraph must not be called an overview)."""
    box = page.locator("#written-answer")
    box.fill(text)
    page.wait_for_timeout(900)  # the draft is written on a 500ms debounce
    button = page.locator(".focused-check").first
    label = button.inner_text().replace("\n", " ").strip()
    button.click()
    page.wait_for_timeout(2600)
    return label


def saved_event(page, exercise_id: str):
    """The LAST event this browser saved against this exercise, straight out
    of the learner record."""
    record = read_record(page)
    events = events_for(record, f"focus:{exercise_id}")
    return events[-1] if events else None


def saved_draft(page, exercise_id: str):
    """The per owner, per exercise draft, which is where the help state has
    to survive a reload."""
    owner = owner_namespace(page)
    key = f"{DRAFT_PREFIX}::{owner}::{exercise_id}"
    if key not in storage_keys(page):
        return None
    return page.evaluate(
        """(key) => { try { return JSON.parse(window.localStorage.getItem(key)); } catch (e) { return null; } }""",
        key,
    )


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 18: Written evidence (which task it is saved against, and what counts as help)",
        "Fresh context, light confirmed plan, no AI configured. Every assertion below is read out of "
        "localStorage, because both defects this scenario covers were invisible on the screen. "
        "Reproduces findings 2 and 3 of the independent review of 22 September 2026.",
    )
    plan = saved_plan(target_band="7.0", test_date=days_after(45),
                      created_at="2026-08-01T09:00:00.000Z", daily_minutes=60,
                      study_days="daily", defaulted=False)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        seed_context(context, progress=progress_v1(), saved_plan=plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        # ── 1. a Task 2 exercise saves Task 2 evidence ───────────────────
        goto(page, path_for(TASK2_CHECK))
        page.wait_for_timeout(2400)
        assert_on(page, "the Task 2 focused exercise", path_for(TASK2_CHECK), "")
        prompt_label = (page.locator(".written-prompt-label").first.inner_text().replace("\n", " ").strip()
                        if page.locator(".written-prompt-label").count() else "(missing)")
        label = submit(page, TASK2_PARAGRAPH)
        event = saved_event(page, TASK2_CHECK)
        write_note("**Saved Task 2 event:** " + json.dumps(event)[:900])
        write_row(
            "A Task 2 exercise saves its work in the Task 2 scope",
            bool(event) and (event.get("taskScope") or {}).get("task") == "task2",
            f'saved taskScope = {json.dumps((event or {}).get("taskScope"))}, '
            f'activityId = "{(event or {}).get("activityId")}"',
        )
        write_row(
            "An unaided Task 2 answer is saved as unaided",
            bool(event) and event.get("assistance") == "none",
            f'saved assistance = "{(event or {}).get("assistance")}" (nothing was opened before writing)',
        )
        write_row(
            "The screen calls a Task 2 paragraph a paragraph, not an overview",
            "overview" not in label.lower() and "paragraph" in label.lower(),
            f'the primary button reads, verbatim: "{label}"',
        )
        write_row(
            "The prompt is labelled Writing Task 2",
            "Task 2" in prompt_label,
            f'the label above the prompt reads: "{prompt_label}"',
        )
        dual_shot(page, "s18-01-task2-paragraph-saved", path_for(TASK2_CHECK))

        # ── 2. a Task 1 exercise still saves Task 1 evidence ─────────────
        goto(page, path_for(TASK1_CHECK))
        page.wait_for_timeout(2400)
        assert_on(page, "the Task 1 focused exercise", path_for(TASK1_CHECK), "")
        task1_label = submit(page, TASK1_OVERVIEW)
        task1_event = saved_event(page, TASK1_CHECK)
        write_note("**Saved Task 1 event:** " + json.dumps(task1_event)[:900])
        write_row(
            "A Task 1 exercise saves its work in the Task 1 scope",
            bool(task1_event) and (task1_event.get("taskScope") or {}).get("task") == "task1",
            f'saved taskScope = {json.dumps((task1_event or {}).get("taskScope"))}',
        )
        write_row(
            "An unaided Task 1 answer is saved as unaided, even once it has been looked at",
            bool(task1_event) and task1_event.get("assistance") == "none",
            f'saved assistance = "{(task1_event or {}).get("assistance")}"',
        )
        write_row(
            "The two tasks are kept apart in the record",
            bool(event) and bool(task1_event)
            and (event.get("taskScope") or {}).get("task") != (task1_event.get("taskScope") or {}).get("task"),
            "the Task 2 event and the Task 1 event carry different scopes",
        )
        shot(page, "s18-02-task1-overview-saved-desktop", path_for(TASK1_CHECK))

        # ── 3. a hint taken before the answer is help, and survives a
        #      reload ─────────────────────────────────────────────────────
        goto(page, path_for(TASK1_GUIDED))
        page.wait_for_timeout(2400)
        assert_on(page, "the guided Task 1 overview", path_for(TASK1_GUIDED), "")
        opener = page.locator(".written-guide-open")
        opened = opener.count() > 0
        if opened:
            opener.first.click()
            page.wait_for_timeout(700)
        write_row(
            "The guided task offers its guiding questions before the answer",
            opened and page.locator(".written-guide-open-panel").count() > 0,
            f"the questions panel is open = {page.locator('.written-guide-open-panel').count() > 0}",
        )
        shot(page, "s18-03-guiding-questions-opened-desktop", path_for(TASK1_GUIDED))

        reload(page)
        page.wait_for_timeout(2600)
        draft = saved_draft(page, TASK1_GUIDED)
        write_note("**Saved draft after the reload:** " + json.dumps(draft)[:600])
        write_row(
            "Opening the guiding questions survives a reload",
            bool(draft) and bool((draft.get("help") or {}).get("guidingQuestionsOpened")),
            f'the saved draft help = {json.dumps((draft or {}).get("help"))}',
        )
        guided_label = submit(page, TASK1_GUIDED_OVERVIEW)
        guided_event = saved_event(page, TASK1_GUIDED)
        write_note("**Saved guided event:** " + json.dumps(guided_event)[:900])
        write_row(
            "An answer written after a hint is saved as assisted, even across the reload",
            bool(guided_event) and guided_event.get("assistance") not in (None, "none"),
            f'saved assistance = "{(guided_event or {}).get("assistance")}" '
            f'(expected a level above "none"); the button read "{guided_label}"',
        )
        body = page.inner_text("body")
        write_row(
            "Nothing on the page claims a band for a short piece of writing",
            "not a band" in body.lower(),
            "the page states plainly that this is not a band = "
            f"{'not a band' in body.lower()}",
        )
        dual_shot(page, "s18-04-assisted-after-reload", path_for(TASK1_GUIDED))

        report_diagnostics("Scenario 18", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
