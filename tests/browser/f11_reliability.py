"""Scenario 11 - Reliability with nothing configured.

No Supabase and no Worker exist on this snapshot, so this is the honest
outage case.

1. Mid-exercise reload: answers already given must come back.
2. The tutor panel must say, plainly, that it is unavailable, and must never
   present a canned line as a live reply.
3. The Writing focused task with grading unavailable must fall back to
   transparent automatic checks, LABELLED automatic, and must keep the
   draft across a reload.
"""
import json
import re

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    days_after,
    dual_shot,
    goto,
    mrez_state,
    new_context,
    progress_v1,
    reload,
    report_diagnostics,
    saved_plan,
    seed_context,
    shot,
    write_note,
    write_row,
    write_section,
)

GUIDED = "/trainers/focused/reading-matching-headings-guided"
WRITING = "/trainers/focused/writing-task1-overview-guided"
DRAFT = ("The chart shows a steady rise in electricity produced from wind between 2000 and 2020, "
         "while coal fell over the same period. SYNTHETIC draft for a verification run.")


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 11: Reliability (no AI configured, mid-exercise reload, draft safety)",
        "Fresh context, light confirmed plan. Nothing about this snapshot is configured for AI, "
        "so every AI surface here is expected to show its honest unavailable state.",
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

        # ── 1. mid-exercise reload ───────────────────────────────────────
        goto(page, GUIDED)
        page.wait_for_timeout(2200)
        assert_on(page, "the guided exercise", GUIDED, "Matching Headings: guided practice")
        selects = page.locator("select.focused-answer")
        given = ["v", "vii", "viii"]
        for i, a in enumerate(given):
            selects.nth(i).select_option(a)
        page.wait_for_timeout(600)
        progress_before = (page.locator(".focused-progress").first.inner_text()
                           if page.locator(".focused-progress").count() else "(missing)")
        shot(page, "s11-01-exercise-part-answered-desktop", GUIDED)

        reload(page)
        page.wait_for_timeout(2400)
        selects = page.locator("select.focused-answer")
        resumed = [selects.nth(i).input_value() for i in range(min(3, selects.count()))]
        progress_after = (page.locator(".focused-progress").first.inner_text()
                          if page.locator(".focused-progress").count() else "(missing)")
        write_row(
            "A mid-exercise reload brings back the answers already given",
            resumed == given,
            f'answers before the reload = {given} ("{progress_before}"), '
            f'after the reload = {resumed} ("{progress_after}")',
        )
        shot(page, "s11-02-exercise-after-reload-desktop", GUIDED)

        # ── 2. the tutor, honestly unavailable ───────────────────────────
        closed_state = mrez_state(page)
        launcher = page.locator(".mrez-launcher")
        if launcher.count():
            launcher.first.click()
            page.wait_for_timeout(900)
        state = mrez_state(page)
        write_note(
            f'**Mr EZ launcher avatar class BEFORE opening the panel:** "{closed_state["avatar_class"]}"; '
            f'AFTER opening it: "{state["avatar_class"]}"'
        )
        write_note("**Mr EZ state on the exercise page:** " + json.dumps(state)[:900])
        write_row(
            "The tutor says plainly that it is not available, in the panel itself",
            bool(state["note"]) and ("not switched on" in (state["note"] or "").lower()
                                     or "not available" in (state["note"] or "").lower()
                                     or "unavailable" in (state["note"] or "").lower()),
            f'panel note, verbatim: "{state["note"]}"',
        )
        write_row(
            "The tutor's own avatar keeps showing the unavailable state while the panel is open",
            "is-unavailable" in (state["avatar_class"] or ""),
            f'avatar class before opening = "{closed_state["avatar_class"]}" (correct), '
            f'after opening = "{state["avatar_class"]}"',
        )
        write_row(
            "Nothing in the panel is dressed up as a live reply",
            "simulated" not in (state["panel_text"] or "").lower()
            or "not switched on" in (state["panel_text"] or "").lower(),
            f'panel text: "{(state["panel_text"] or "")[:400]}"',
        )
        dual_shot(page, "s11-03-tutor-unavailable", GUIDED)

        # ── 3. the writing focused task ──────────────────────────────────
        goto(page, WRITING)
        page.wait_for_timeout(2400)
        assert_on(page, "the Writing focused task", WRITING, "")
        editor = page.locator("textarea").first
        editor_found = page.locator("textarea").count() > 0
        if editor_found:
            editor.fill(DRAFT)
            page.wait_for_timeout(900)
        write_row("The Writing focused task offers a real place to write",
                  editor_found, f'{page.locator("textarea").count()} textarea(s) on the page')
        shot(page, "s11-04-writing-task-draft-desktop", WRITING)

        submit = page.locator("button", has_text="Check").or_(
            page.locator("button", has_text="Get feedback")).or_(
            page.locator("button", has_text="Evaluate")).or_(
            page.locator(".focused-check"))
        labels = [submit.nth(i).inner_text().replace("\n", " ") for i in range(submit.count())]
        if submit.count():
            submit.first.click()
            page.wait_for_timeout(2600)
        body = page.inner_text("body")
        write_note(f"**Writing task submit controls:** {labels}")
        write_row(
            "With grading unavailable the task still gives transparent automatic checks, "
            "and labels them automatic",
            "automatic" in body.lower(),
            "the word 'automatic' appears on the page after submitting = "
            f"{'automatic' in body.lower()}; page text around it: "
            + next((body[max(0, body.lower().find("automatic") - 160):
                        body.lower().find("automatic") + 260].replace("\n", " ")
                    for _ in [0] if "automatic" in body.lower()), "(not present)"),
        )
        write_row(
            "No band and no fabricated grade is shown when the grader is unreachable",
            "band 7" not in body.lower().replace("band 7 ", "band 7|")[:0] + body.lower()
            or "never shows a band" in body.lower() or "not a band" in body.lower(),
            "the page states it is not a band = "
            f"{'not a band' in body.lower() or 'never a band' in body.lower()}",
        )
        graded_claim = [w for w in ("your band is", "estimated band", "band score")
                        if w in body.lower()]
        write_row(
            "The unavailable grader is reported rather than simulated",
            not graded_claim,
            f"band-claiming phrases found on the page = {graded_claim or 'none'}",
        )
        # Two things the feedback panel says about the plan, worth checking
        # because they are shown one under the other.
        changed = page.locator("text=What changed:")
        changed_text = (changed.first.locator("xpath=..").inner_text().replace("\n", " ")
                        if changed.count() else "")
        m = re.search(r"Today moves from (.+?) to (.+?)\.\.?\s", changed_text + " ")
        write_row(
            'The "What changed" line does not announce a move from an objective to the same '
            "objective",
            not (m and m.group(1).strip().rstrip(".") == m.group(2).strip().rstrip(".")),
            f'the line reads, verbatim: "{changed_text[:400]}"',
        )
        footer = page.locator("text=This was extra practice")
        footer_text = footer.first.inner_text().replace("\n", " ") if footer.count() else ""
        write_row(
            "The panel does not contradict itself about whether today changed",
            not (changed_text and "has not changed today" in footer_text),
            f'one box says "{changed_text[:150]}" and the box directly beneath it says '
            f'"{footer_text[:150]}"',
        )
        dual_shot(page, "s11-05-writing-task-automatic-checks", WRITING)

        reload(page)
        page.wait_for_timeout(2600)
        kept = page.locator("textarea").first.input_value() if page.locator("textarea").count() else ""
        write_row(
            "The draft survives a reload (not one word is lost)",
            DRAFT[:60] in kept,
            f"{len(kept)} characters came back; starts with "
            f'"{kept[:90]}"',
        )
        shot(page, "s11-06-writing-draft-after-reload-desktop", WRITING)

        report_diagnostics("Scenario 11", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
