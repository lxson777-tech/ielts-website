"""S1 - New student: fresh storage, open Today.

Expect: no invented level, no invented goal, the intake is offered, a
provisional useful session exists or is reachable via "Answer later", all
four papers shown as not yet assessed. Then walk the whole intake in English
choosing band 7.0, an exam date about ten weeks ahead, daily study, confirm
60 minutes is preselected and labelled as the recommendation, confirm
availability, finish. Expect Today to show ONE session with an objective, a
reason, a time estimate within 60 minutes, steps, and exactly one primary
Start button.
"""
import re

from playwright.sync_api import sync_playwright

from helpers import (
    BASE_URL,
    DESKTOP,
    PHONE,
    attach_diagnostics,
    days_after,
    goto,
    new_context,
    reload,
    report_diagnostics,
    screenshot,
    write_note,
    write_row,
    write_section,
)


def dual_shot(page, name):
    screenshot(page, f"{name}-desktop")
    page.set_viewport_size(PHONE)
    screenshot(page, f"{name}-phone")
    page.set_viewport_size(DESKTOP)


def wait_for_text(page, text, timeout=8000):
    """Wait for text to actually render rather than guessing a fixed delay.
    This dev server/session was observed to occasionally render the next
    intake step slowly (especially right after a dual_shot's two full-page
    screenshots + viewport resizes); a bare wait_for_timeout(200) was not
    always enough. Degrades to a no-op on timeout so the next check still
    reports the real (absent) state rather than raising."""
    try:
        page.wait_for_selector(f"text={text}", timeout=timeout)
    except Exception:
        pass


def run(base_url: str = BASE_URL):
    write_section(
        "S1: New student, intake walkthrough",
        "Fresh storage, no seed. New browser context.",
    )
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        goto(page, "/dashboard")
        page.wait_for_timeout(500)

        # ── No invented goal / level, intake offered ──────────────────────
        heading = page.locator("#today-heading")
        heading_text = heading.inner_text() if heading.count() else ""
        write_row(
            "Intake offered on first visit",
            "let's set your goal" in heading_text.lower() or "let's set your goal" in heading_text.lower(),
            f'heading = "{heading_text}"',
        )

        goal_strong = page.locator(".dash-target strong")
        goal_text = goal_strong.inner_text() if goal_strong.count() else "(missing)"
        write_row(
            "No invented goal shown on dashboard",
            "not set yet" in goal_text.lower(),
            f'"Your goal" = "{goal_text}"',
        )

        focus_items = page.locator(".dash-focus-item")
        focus_texts = [focus_items.nth(i).inner_text().replace("\n", " ") for i in range(focus_items.count())]
        all_not_assessed = len(focus_texts) == 4 and all("not yet assessed" in t.lower() for t in focus_texts)
        write_row(
            "All four papers shown as not yet assessed",
            all_not_assessed,
            " | ".join(focus_texts) if focus_texts else "(no .dash-focus-item found)",
        )

        dual_shot(page, "s1-01-new-student-dashboard")

        # ── "Answer later" reaches a provisional useful session ──────────
        try:
            page.wait_for_selector(".intake-link-defer", timeout=8000)
        except Exception:
            pass  # the very next check reports absence explicitly either way
        defer_link = page.locator(".intake-link-defer")
        if defer_link.count():
            defer_link.click()
            page.wait_for_timeout(400)
            active = page.locator(".today-active")
            starts = page.locator(".today-start")
            write_row(
                'Provisional session reachable via "Answer later"',
                active.count() > 0 and starts.count() == 1,
                f".today-active present={active.count() > 0}, .today-start count={starts.count()}",
            )
            dual_shot(page, "s1-02-after-answer-later")
        else:
            write_row('"Answer later" control found', False, "no .intake-link-defer on the page")

        # Reload: deferral is component state, not persisted, so the intake
        # must be offered again on a fresh mount (goals are still unconfirmed).
        reload(page)
        page.wait_for_timeout(400)
        heading_text2 = page.locator("#today-heading").inner_text()
        write_row(
            "Intake is asked again after reload (defer is not permanent)",
            "let's set your goal" in heading_text2.lower(),
            f'heading after reload = "{heading_text2}"',
        )

        # ── Walk the real intake: band 7.0, exam ~10 weeks out, daily,
        #    60 minutes preselected + labelled as the recommendation ──────
        band_label = page.get_by_text("Band 7.0", exact=True)
        band_ok = band_label.count() > 0
        if band_ok:
            band_label.first.click(force=True)
        write_row("Step 1: Band 7.0 option present and selectable", band_ok, f'found {band_label.count()} match(es)')
        dual_shot(page, "s1-03-intake-step1-band")
        page.get_by_role("button", name="Next").click()
        wait_for_text(page, "When is your exam?")

        exam_date_input = page.locator("#intake-exam-date")
        exam_iso = days_after(70)  # about ten weeks ahead
        exam_input_ok = exam_date_input.count() > 0
        if exam_input_ok:
            exam_date_input.fill(exam_iso)
        write_row("Step 2: exam date field present, filled ~10 weeks ahead", exam_input_ok, f"filled {exam_iso}")
        dual_shot(page, "s1-04-intake-step2-examdate")
        page.get_by_role("button", name="Next").click()
        wait_for_text(page, "Which days can you study?")

        every_day = page.get_by_text("Every day", exact=True)
        write_row("Step 3: 'Every day' study-days option present", every_day.count() > 0, f"found {every_day.count()}")
        if every_day.count():
            every_day.first.click(force=True)
        dual_shot(page, "s1-05-intake-step3-studydays")
        page.get_by_role("button", name="Next").click()
        wait_for_text(page, "How long can you study each day?")

        sixty_capsule = page.locator(".intake-capsule", has_text="60 minutes")
        sixty_checked = False
        sixty_hint_text = ""
        if sixty_capsule.count():
            radio = sixty_capsule.first.locator("input[type=radio]")
            sixty_checked = radio.is_checked()
            hint = sixty_capsule.first.locator(".intake-capsule-hint")
            sixty_hint_text = hint.inner_text() if hint.count() else "(no hint)"
        write_row(
            "Step 4: 60 minutes preselected by default",
            sixty_checked,
            f"60-minute radio checked = {sixty_checked}",
        )
        write_row(
            "Step 4: 60 minutes labelled as the recommendation",
            "recommend" in sixty_hint_text.lower(),
            f'hint text = "{sixty_hint_text}"',
        )
        dual_shot(page, "s1-06-intake-step4-dailytime-before-confirm")

        confirm_btn = page.get_by_role("button", name="Yes, I can commit to this")
        confirm_present = confirm_btn.count() > 0
        write_row("Step 4: availability confirmation prompt shown", confirm_present, f"found {confirm_btn.count()}")
        if confirm_present:
            confirm_btn.click()
        page.wait_for_timeout(200)
        dual_shot(page, "s1-07-intake-step4-dailytime-confirmed")
        page.get_by_role("button", name="Next").click()
        wait_for_text(page, "Which language should explanations be in?")

        english_opt = page.get_by_text("English", exact=True)
        if english_opt.count():
            english_opt.first.click(force=True)
        dual_shot(page, "s1-08-intake-step5-language")
        page.get_by_role("button", name="Next").click()
        wait_for_text(page, "Save my plan")

        dual_shot(page, "s1-09-intake-step6-optional")
        save_btn = page.get_by_role("button", name="Save my plan")
        save_ok = save_btn.count() > 0
        write_row("Step 6: 'Save my plan' control present", save_ok, f"found {save_btn.count()}")
        if save_ok:
            save_btn.click()
        page.wait_for_timeout(500)

        # DEFECT: TodaySession subscribes to plan changes (onPersonalPlanChange)
        # and updateGoalsAndConstraints() fires that listener synchronously
        # inside save(), before Intake's own setJustSaved/setSavedPlan state
        # is rendered. The parent re-renders with screen='active' first and
        # unmounts <Intake>, so the "Your plan is saved" confirmation +
        # OutcomePanel + explicit Continue button never appears, not even
        # for one frame (confirmed by polling every 60ms immediately after
        # the click). The student lands straight on the full Today session.
        saved_status = page.locator('[role="status"]', has_text="Your plan is saved.")
        write_row(
            "Plan-saved confirmation screen (headline/outcome/Continue) is shown before Today",
            saved_status.count() > 0,
            f"found {saved_status.count()} - it is skipped: TodaySession's onPersonalPlanChange listener "
            "unmounts <Intake> (screen flips to 'active') before Intake's own justSaved render can appear, "
            "confirmed by polling every 60ms post-click",
        )
        dual_shot(page, "s1-10-intake-saved-outcome")

        continue_btn = page.get_by_role("button", name="Continue")
        if continue_btn.count():
            continue_btn.first.click()
        try:
            page.wait_for_selector(".today-objective", timeout=8000)
        except Exception:
            pass
        page.wait_for_timeout(300)

        # ── The resulting Today ───────────────────────────────────────────
        active = page.locator(".today-active")
        objective = page.locator(".today-objective")
        objective_text = objective.inner_text() if objective.count() else "(missing)"
        write_row(
            "Today shows one active session with an objective",
            active.count() == 1 and objective.count() == 1 and len(objective_text.strip()) > 0,
            f'objective = "{objective_text}"',
        )

        budget_text = page.locator(".today-budget").inner_text() if page.locator(".today-budget").count() else ""
        m = re.search(r"(\d+)", budget_text)
        minutes = int(m.group(1)) if m else None
        write_row(
            "Time estimate is within 60 minutes",
            minutes is not None and minutes <= 60,
            f'budget text = "{budget_text}"',
        )

        steps = page.locator(".today-steps li")
        write_row("Session has steps listed", steps.count() > 0, f"{steps.count()} step(s)")

        starts = page.locator(".today-start")
        write_row("Exactly one primary Start button", starts.count() == 1, f"{starts.count()} .today-start element(s)")

        why_btn = page.get_by_role("button", name="Why this")
        reason_text = "(not opened)"
        if why_btn.count():
            why_btn.click()
            page.wait_for_timeout(200)
            reason_p = page.locator(".today-why p").first
            reason_text = reason_p.inner_text() if reason_p.count() else "(missing)"
        write_row("A reason is available via 'Why this'", len(reason_text) > 0 and reason_text != "(not opened)", f'reason = "{reason_text}"')

        dual_shot(page, "s1-11-today-result")

        report_diagnostics("S1", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
