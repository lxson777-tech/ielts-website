"""Scenario 1 - New student.

Fresh storage, nothing seeded. Expect: no invented level and no invented
goal, a short intake, "Answer later" giving a useful provisional session
that is REMEMBERED ACROSS RELOAD, all four papers shown as not yet
assessed. Then walk the real intake (band 7.0, exam about ten weeks ahead,
every day, 60 minutes preselected and labelled as the recommendation,
availability confirmed), expect the honest outcome panel BEFORE Today, and
expect Today to show exactly one session with a paper kicker, an objective,
a reason, steps with real titles and minutes inside the budget, and one
Start button.
"""
import re

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    budget_minutes,
    days_after,
    dual_shot,
    goto,
    new_context,
    reload,
    report_diagnostics,
    shot,
    today_view,
    why_text,
    write_note,
    write_row,
    write_section,
)


def wait_for_text(page, text, timeout=8000):
    try:
        page.wait_for_selector(f"text={text}", timeout=timeout)
    except Exception:
        pass


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 1: New student",
        "Fresh browser context, genuinely empty localStorage, nothing seeded.",
    )
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        goto(page, "/dashboard")
        page.wait_for_timeout(1200)
        assert_on(page, "Today, first ever visit", "/dashboard", "Let's set your goal", "#today-heading")

        v = today_view(page)
        write_row(
            "The intake is offered instead of a fabricated plan",
            v["intake_count"] == 1 and v["active_count"] == 0,
            f'heading="{v["heading"]}", .today-intake={v["intake_count"]}, .today-active={v["active_count"]}',
        )

        goal = page.locator(".dash-target strong")
        goal_text = goal.first.inner_text() if goal.count() else "(missing)"
        write_row(
            "No invented goal",
            "not set yet" in goal_text.lower(),
            f'"Your goal" reads "{goal_text}"',
        )

        focus = page.locator(".dash-focus-item")
        focus_texts = [focus.nth(i).inner_text().replace("\n", " ") for i in range(focus.count())]
        # Product fix of 2026-09-22 (LearningDashboard.tsx): the dashboard's
        # focus-area word now comes straight from the SAME certainty
        # vocabulary /report uses (CERTAINTY_LABEL in reportTrends.ts),
        # which spells this "Unknown", not "Not yet assessed" - the old
        # per-surface wording it replaced ("It used to read 'Has evidence
        # recorded' for every paper that was not outstanding" per the
        # component's own comment). Either wording is equally honest (no
        # invented level either way); what matters is that all four papers
        # agree and none of them claims a measured level.
        write_row(
            "No invented level: all four papers read as not yet assessed",
            len(focus_texts) == 4 and all(
                "unknown" in t.lower() or "not yet assessed" in t.lower() for t in focus_texts),
            " | ".join(focus_texts) or "(no .dash-focus-item found)",
        )

        steps_count = page.locator(".intake-progress span").count()
        write_row(
            "The intake is short (a small fixed number of steps, shown up front)",
            0 < steps_count <= 8,
            f"{steps_count} step markers in .intake-progress",
        )
        dual_shot(page, "s01-01-new-student-today", "/dashboard")

        # ── "Answer later" ────────────────────────────────────────────────
        defer = page.locator(".intake-link-defer")
        if defer.count():
            defer.first.click()
            page.wait_for_timeout(900)
            v = today_view(page)
            useful = (
                v["active_count"] == 1
                and v["start_count"] == 1
                and bool(v["objective"])
                and len(v["steps"]) > 0
            )
            write_row(
                '"Answer later" gives a useful provisional session',
                useful,
                f'objective="{v["objective"]}", kicker="{v["kicker"]}", {len(v["steps"])} step(s), '
                f'{v["start_count"]} Start button, budget="{v["budget"]}"',
            )
            provisional_note = page.locator(".today-provisional-note, .today-scope-note")
            notes = [provisional_note.nth(i).inner_text().replace("\n", " ")
                     for i in range(provisional_note.count())]
            write_row(
                "The provisional session is visibly marked provisional",
                provisional_note.count() > 0,
                " / ".join(notes) or "(no provisional/scope note found on the card)",
            )
            first_look = page.locator(".today-step-foreign-paper, .today-step-role")
            fl_texts = [first_look.nth(i).inner_text() for i in range(first_look.count())]
            write_row(
                "There is a visible route to assessing the other papers "
                "(a short first-look step, explicitly too short to be a band)",
                any("first look" in t.lower() for t in fl_texts),
                f"step roles observed = {fl_texts}",
            )
            dual_shot(page, "s01-02-answer-later-provisional-session", "/dashboard")
            deferred_objective = v["objective"]

            reload(page)
            page.wait_for_timeout(1200)
            after = today_view(page)
            remembered = after["active_count"] == 1 and after["intake_count"] == 0
            write_row(
                'The "Answer later" choice is remembered across a reload '
                "(the student is not asked the same questions again)",
                remembered,
                f'after reload: heading="{after["heading"]}", .today-intake={after["intake_count"]}, '
                f'.today-active={after["active_count"]}, objective="{after["objective"]}" '
                f'(before reload the provisional objective was "{deferred_objective}")',
            )
            shot(page, "s01-03-after-reload-following-answer-later-desktop", "/dashboard")
        else:
            write_row('"Answer later" control exists', False, "no .intake-link-defer on the page")

        context.close()

        # ── Walk the real intake ──────────────────────────────────────────
        # The deferral above is now REMEMBERED (which is what the brief
        # asks for), so the stepped intake is no longer offered on Today in
        # that browser. To walk the stepped intake as a brand-new student
        # really meets it, this opens a SECOND fresh context with empty
        # storage. Said plainly rather than quietly reusing the first one.
        write_note(
            "The stepped intake below is walked in a **second fresh browser context** with empty "
            "storage. The first context had already deferred, and that deferral is correctly "
            "remembered, so Today no longer offers the stepped questions there."
        )
        context = new_context(browser)
        page = context.new_page()
        errors2, failed2 = attach_diagnostics(page)
        errors, failed = errors2, failed2
        goto(page, "/dashboard")
        page.wait_for_timeout(1200)
        assert_on(page, "the intake questions", "/dashboard", "What overall band", ".intake-question")

        band = page.get_by_text("Band 7.0", exact=True)
        if band.count():
            band.first.click(force=True)
        write_row("Step 1: band 7.0 is offered and selectable", band.count() > 0, f"{band.count()} match(es)")
        shot(page, "s01-04-intake-band-desktop")
        page.get_by_role("button", name="Next").first.click()
        wait_for_text(page, "When is your exam?")

        exam_input = page.locator("#intake-exam-date")
        exam_iso = days_after(70)
        if exam_input.count():
            exam_input.fill(exam_iso)
        write_row("Step 2: an exam date about ten weeks ahead can be entered",
                  exam_input.count() > 0, f"filled {exam_iso}")
        page.get_by_role("button", name="Next").first.click()
        wait_for_text(page, "Which days can you study?")

        every = page.get_by_text("Every day", exact=True)
        if every.count():
            every.first.click(force=True)
        write_row("Step 3: 'Every day' can be chosen", every.count() > 0, f"{every.count()} match(es)")
        page.get_by_role("button", name="Next").first.click()
        wait_for_text(page, "How long can you study each day?")

        sixty = page.locator(".intake-capsule", has_text="60 minutes")
        checked = False
        hint = "(no hint)"
        if sixty.count():
            checked = sixty.first.locator("input[type=radio]").is_checked()
            h = sixty.first.locator(".intake-capsule-hint")
            hint = h.inner_text() if h.count() else "(no hint)"
        write_row("Step 4: 60 minutes is preselected", checked, f"60-minute radio checked={checked}")
        write_row("Step 4: 60 minutes is labelled as the recommendation, not imposed silently",
                  "recommend" in hint.lower(), f'hint="{hint}"')
        shot(page, "s01-05-intake-sixty-minutes-desktop")

        confirm = page.get_by_role("button", name="Yes, I can commit to this")
        write_row("Step 4: availability is explicitly confirmed", confirm.count() > 0,
                  f"{confirm.count()} confirmation control(s)")
        if confirm.count():
            confirm.first.click()
        page.wait_for_timeout(300)
        page.get_by_role("button", name="Next").first.click()
        wait_for_text(page, "Which language should explanations be in?")
        eng = page.get_by_text("English", exact=True)
        if eng.count():
            eng.first.click(force=True)
        page.get_by_role("button", name="Next").first.click()
        wait_for_text(page, "Save my plan")
        shot(page, "s01-06-intake-last-step-desktop")

        save = page.get_by_role("button", name="Save my plan")
        write_row("A single explicit 'Save my plan' finishes the intake", save.count() > 0,
                  f"{save.count()} control(s)")
        if save.count():
            save.first.click()
        page.wait_for_timeout(1200)

        # ── the honest outcome panel, BEFORE Today ───────────────────────
        saved_status = page.locator('[role="status"]')
        outcome_headline = page.locator(".intake-outcome-headline")
        outcome_note = page.locator(".intake-outcome-note")
        continue_btn = page.get_by_role("button", name="Continue")
        saved_text = saved_status.first.inner_text().replace("\n", " ") if saved_status.count() else "(none)"
        write_row(
            "The honest outcome panel is shown BEFORE Today "
            "(what the plan can and cannot fit, with an explicit Continue)",
            outcome_headline.count() > 0,
            f'.intake-outcome-headline={outcome_headline.count()} '
            f'("{outcome_headline.first.inner_text() if outcome_headline.count() else ""}"), '
            f'.intake-outcome-note="{outcome_note.first.inner_text() if outcome_note.count() else ""}", '
            f'[role=status]="{saved_text}", Continue button={continue_btn.count()}',
        )
        dual_shot(page, "s01-07-intake-saved-outcome", "/dashboard")
        if continue_btn.count():
            continue_btn.first.click()
        try:
            page.wait_for_selector(".today-objective", timeout=8000)
        except Exception:
            pass
        page.wait_for_timeout(700)

        # ── the resulting Today ──────────────────────────────────────────
        assert_on(page, "Today after the intake", "/dashboard", "", "#today-heading")
        v = today_view(page)
        write_row("Today shows exactly one session", v["active_count"] == 1,
                  f'.today-active={v["active_count"]}, .today-intake={v["intake_count"]}')
        write_row("The session names its paper (a kicker above the objective)",
                  bool(v["kicker"]), f'kicker="{v["kicker"]}"')
        write_row("The session states an objective", bool(v["objective"]),
                  f'objective="{v["objective"]}"')
        minutes, budget_text = budget_minutes(page)
        write_row("The stated time is inside the 60-minute budget",
                  minutes is not None and minutes <= 60, f'budget="{budget_text}"')
        titles = [s["title"] for s in v["steps"]]
        real_titles = all(t and len(t.strip()) > 2 for t in titles)
        step_minutes = []
        for s in v["steps"]:
            m = re.search(r"(\d+)", s["minutes"] or "")
            step_minutes.append(int(m.group(1)) if m else 0)
        write_row(
            "Steps carry real titles and real minutes, and they add up inside the budget",
            len(titles) > 0 and real_titles and sum(step_minutes) <= (minutes or 60),
            f"{len(titles)} steps: " + "; ".join(
                f'{s["role"]}/"{s["title"]}"/{s["minutes"]}' for s in v["steps"]
            ) + f" | sum={sum(step_minutes)} min against a stated budget of {minutes} min",
        )
        write_row("Exactly one primary Start button", v["start_count"] == 1,
                  f'{v["start_count"]} .today-start element(s), label="{v["start_label"]}", href={v["start_href"]}')
        reason = why_text(page)
        write_row("A reason for this session is available and is a real sentence",
                  len(reason) > 20 and "no 'Why this'" not in reason, f'"{reason}"')
        write_note(f'**Mr EZ line on the card (deterministic, AI off):** "{v["voice"]}"')
        dual_shot(page, "s01-08-today-after-intake", "/dashboard")

        report_diagnostics("Scenario 1", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
