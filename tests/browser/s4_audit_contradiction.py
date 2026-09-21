"""S4 - The audit's contradiction.

Seed the audit's Matching Headings student in old-store form: a confirmed
Band 7 goal, two Reading attempts holding 2 of 16 Matching Headings answers
right (matches tests/fixtures/learning-profiles.ts syntheticMatchingHeadings),
plus one Listening/Writing/Speaking attempt each so no paper is left
completely "unknown" (closing diagnosticsOutstanding, the same way the full
fixture does; a lesson-check/drill quiz attempt has no old-store
representation at all - progress.ts keeps no per-question record - so those
two extra fixture entries are left out and the two full Reading papers alone
already give the exact "2 of 16" the brief asks for).

Collect the primary next activity named or linked on: Today, Course "Your
route", the account menu, the account overview page, the progress report
page, and the bottom of a lesson page opened directly from the library.
They must all point at the SAME session and never at competing activities.
Then complete the first step for real and collect them all again.
"""
import re

from playwright.sync_api import sync_playwright

from helpers import (
    BASE_URL,
    attach_diagnostics,
    days_after,
    days_before,
    goto,
    new_context,
    progress_v1,
    report_diagnostics,
    saved_plan,
    screenshot,
    seed_context,
    test_attempt,
    write_note,
    write_row,
    write_section,
    writing_attempt,
)


def today_objective_and_start(page):
    obj = page.locator(".today-objective")
    start = page.locator(".today-start")
    return (
        obj.inner_text() if obj.count() else None,
        start.get_attribute("href") if start.count() else None,
        start.inner_text() if start.count() else None,
    )


def collect_all_surfaces(page, label):
    result = {}

    goto(page, "/dashboard")
    page.wait_for_timeout(400)
    obj, href, start_label = today_objective_and_start(page)
    result["today"] = (obj, href, start_label)

    goto(page, "/start")
    page.wait_for_timeout(400)
    obj, href, start_label = today_objective_and_start(page)
    result["course"] = (obj, href, start_label)

    goto(page, "/account")
    page.wait_for_timeout(400)
    card = page.locator("div.rounded-card", has_text="Course")
    if card.count():
        card_text = card.first.inner_text()
        link = card.first.get_by_role("link")
        result["account_overview"] = (
            card_text,
            link.get_attribute("href") if link.count() else None,
            link.inner_text() if link.count() else None,
        )
    else:
        result["account_overview"] = (None, None, None)

    # A lesson opened directly from the library, unrelated to today's real
    # session (a Speaking overview lesson, while the seeded profile's session
    # is about Listening) - this is exactly the case the old positional
    # "Next in course" footer used to get wrong.
    goto(page, "/lessons/speaking")
    page.wait_for_timeout(400)
    ctrl = page.locator("#lesson-next-control")
    ctrl_hidden = ctrl.get_attribute("hidden") is not None if ctrl.count() else True
    result["lesson_footer"] = (
        page.locator("#lesson-next-label").inner_text() if page.locator("#lesson-next-label").count() else None,
        ctrl.get_attribute("href") if ctrl.count() else None,
        ctrl_hidden,
    )

    write_note(f"**{label} - Today:** objective=\"{result['today'][0]}\", href={result['today'][1]}, button=\"{result['today'][2]}\"")
    write_note(f"**{label} - Course 'Your route':** objective=\"{result['course'][0]}\", href={result['course'][1]}, button=\"{result['course'][2]}\"")
    write_note(f"**{label} - Account overview:** \"{result['account_overview'][0]}\" -> href={result['account_overview'][1]}, link=\"{result['account_overview'][2]}\"")
    write_note(f"**{label} - Lesson footer (/lessons/speaking, unrelated lesson):** label=\"{result['lesson_footer'][0]}\", href={result['lesson_footer'][1]}, hidden={result['lesson_footer'][2]}")

    return result


def run(base_url: str = BASE_URL):
    write_section(
        "S4: The audit's contradiction (Matching Headings student)",
        "Seed: old-store form, confirmed Band 7 goal, two Reading papers each with 1/8 Matching "
        "Headings correct (2/16 total), one Listening/Writing/Speaking attempt each. Matches "
        "tests/fixtures/learning-profiles.ts syntheticMatchingHeadings as closely as the old store "
        "can represent it.",
    )

    progress = progress_v1(
        tests={
            "reading-full-001": [
                test_attempt(
                    days_before(11) + "T09:00:00.000Z", 24, 40, 6, "6.0", 2400,
                    by_type={"matching-headings": {"correct": 1, "total": 8}, "multiple-choice": {"correct": 8, "total": 10}},
                )
            ],
            "reading-full-002": [
                test_attempt(
                    days_before(3) + "T09:00:00.000Z", 24, 40, 6, "6.0", 2400,
                    by_type={"matching-headings": {"correct": 1, "total": 8}, "multiple-choice": {"correct": 8, "total": 10}},
                )
            ],
            "listening-full-001": [
                test_attempt(
                    days_before(9) + "T09:00:00.000Z", 29, 40, 6.5, "6.5", 2400,
                    by_type={"sentence-completion": {"correct": 7, "total": 10}}, skill="listening",
                )
            ],
        },
        writing={
            "pte-wt-103-task2": [
                writing_attempt(
                    days_before(8) + "T09:00:00.000Z", 6,
                    {"taskResponse": 6, "coherenceCohesion": 6, "lexicalResource": 5.5, "grammaticalRange": 6},
                )
            ]
        },
        speaking=[
            {
                "at": days_before(7) + "T09:00:00.000Z",
                "mode": "part2",
                "topic": "SYNTHETIC cue card",
                "overallBand": 6.5,
                "criteria": {"fluencyCoherence": 6.5, "lexicalResource": 6.5, "grammaticalRange": 6.5, "pronunciation": 6.5},
                "live": True,
            }
        ],
    )
    plan = saved_plan(
        target_band="7.0",
        test_date=days_after(35),
        created_at="2026-07-01T09:00:00.000Z",
        daily_minutes=60,
        study_days="daily",
        defaulted=False,
    )

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        seed_context(context, progress=progress, saved_plan=plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        before = collect_all_surfaces(page, "BEFORE")
        screenshot(page, "s4-01-today-before-desktop")
        goto(page, "/start")
        page.wait_for_timeout(300)
        screenshot(page, "s4-02-course-before-desktop")
        goto(page, "/account")
        page.wait_for_timeout(300)
        screenshot(page, "s4-03-account-overview-before-desktop")
        goto(page, "/lessons/speaking")
        page.wait_for_timeout(300)
        screenshot(page, "s4-04-lesson-footer-unrelated-desktop")

        objectives = {before["today"][0], before["course"][0], before["account_overview"][0] and None}
        # account_overview's card text includes extra surrounding copy, so
        # check containment rather than equality.
        today_obj = before["today"][0]
        today_href = before["today"][1]
        course_matches = before["course"][0] == today_obj and before["course"][1] == today_href
        write_row(
            "Today and Course 'Your route' name the exact same session",
            course_matches,
            f'today="{today_obj}" href={today_href} | course="{before["course"][0]}" href={before["course"][1]}',
        )

        account_text = before["account_overview"][0] or ""
        account_href = before["account_overview"][1]
        account_matches = (today_obj or "") in account_text and account_href == today_href
        write_row(
            "Account overview names the same session and links the same href",
            account_matches,
            f'account overview contains objective={((today_obj or "") in account_text)}, href match={account_href == today_href} (account href={account_href})',
        )

        lesson_label, lesson_href, lesson_hidden = before["lesson_footer"]
        lesson_ok = (not lesson_hidden) and lesson_label == "Back to today's session" and lesson_href and lesson_href.endswith("/dashboard")
        write_row(
            "A lesson opened directly from the library (unrelated to the session) never invents a competing next step",
            lesson_ok,
            f'label="{lesson_label}", href={lesson_href}, hidden={lesson_hidden} (expected "Back to today\'s session" -> /dashboard, since this lesson is not part of today\'s session)',
        )

        write_row(
            "The recommended activity itself (worth a product read, not a pass/fail on its own)",
            True,
            f'Today recommends: "{today_obj}" - a Listening session - over the seeded Reading Matching Headings '
            "weakness (2/16 correct against a confirmed Band 7 goal). All three other papers had exactly one "
            "attempt each, so this may be intentional (closing an unknown/due-review paper before drilling a "
            "known-weak one) rather than a bug; flagged for Alex's product judgement, not graded PASS/FAIL.",
        )

        # ── Account menu: static, no dynamic next-activity claim ──────────
        goto(page, "/dashboard")
        page.wait_for_timeout(300)
        avatar = page.locator(".ws-avatar")
        if avatar.count():
            avatar.click()
            page.wait_for_timeout(250)
            items = page.locator(".ws-menu a[role=menuitem]")
            item_texts = [items.nth(i).inner_text() for i in range(items.count())]
            write_note(
                "**Account menu (workspace avatar on app pages):** static link list only, no session objective or "
                f"Continue link shown: {item_texts}. The OTHER account menu (marketing Nav's AccountMenu, used on "
                "non-app pages) DOES read the shared session when signed in, but verifying that requires a real "
                "account and sign-in is prohibited for this test run - noted as an untestable surface here rather "
                "than skipped silently."
            )
            screenshot(page, "s4-05-account-menu-desktop")
        else:
            write_note("Account menu (.ws-avatar) not found on /dashboard.")

        # ── Progress report: makes no next-activity claim at all ─────────
        goto(page, "/report")
        page.wait_for_timeout(300)
        claim = page.get_by_text(today_obj, exact=False) if today_obj else None
        write_note(
            f"**Progress report (/report):** contains the session objective text = "
            f"{claim.count() > 0 if claim else 'n/a'}. It shows no next-activity link at all (by design, per "
            "ProgressReport.tsx - a printable historical summary), so it cannot contradict Today either."
        )
        screenshot(page, "s4-06-progress-report-desktop")

        # ── Complete the first step for real ──────────────────────────────
        goto(page, "/dashboard")
        page.wait_for_timeout(400)
        start_btn = page.locator(".today-start")
        start_href = start_btn.get_attribute("href")
        start_btn.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(400)
        landed_url = page.url
        complete_btn = page.locator("#lesson-complete-btn")
        completed_for_real = False
        if complete_btn.count():
            complete_btn.click()
            page.wait_for_timeout(400)
            completed_for_real = complete_btn.get_attribute("data-done") is not None
        write_row(
            "Completed the session's first step for real (opened its link, marked it studied)",
            landed_url.endswith(start_href.replace("/ielts-website", "")) if start_href else False,
            f'start href="{start_href}", landed on "{landed_url}", lesson marked studied={completed_for_real}',
        )
        screenshot(page, "s4-07-first-step-completed-desktop")
        goto(page, "/dashboard")
        page.wait_for_timeout(400)

        after = collect_all_surfaces(page, "AFTER")
        screenshot(page, "s4-08-today-after-desktop")

        after_today_obj, after_today_href, after_start_label = after["today"]
        still_consistent = after["course"][0] == after_today_obj and after["course"][1] == after_today_href
        write_row(
            "After progress: Today and Course still agree on ONE session",
            still_consistent,
            f'today="{after_today_obj}" href={after_today_href} | course="{after["course"][0]}" href={after["course"][1]}',
        )

        steps_done = page.locator(".today-step.is-done")
        write_row(
            "Session shows real progress (a step ticked done, button reads Continue)",
            steps_done.count() >= 1 and after_start_label == "Continue",
            f"{steps_done.count()} step(s) marked done, start button label=\"{after_start_label}\"",
        )
        write_note(
            "The underlying data is right either way (the href correctly advanced from the Listening "
            "overview lesson to the Listening sentence-completion lesson on every run, proving the step "
            "really was marked done and the session really progressed in storage), but the visible tick/"
            "Continue label was inconsistent across repeated runs of this exact script: reproduced as FAIL "
            "(0 done, 'Start') twice back-to-back in this full multi-page flow, but a shorter isolated repro "
            "of the identical seed + complete-the-lesson action (skipping the earlier /account and /report "
            "visits) showed the correct 'Continue' + 1 step done every time. The failing runs both carry "
            "'504 Outdated Optimize Dep' / 'Failed to fetch dynamically imported module' console errors for "
            "TypeAnalytics.tsx, WritingHistory.tsx and ProgressReport.tsx right after visiting /account and "
            "/report - a Vite dev-server dependency-reoptimization artifact from loading many chart-heavy "
            "islands in one session, not present in a production static build. Worth a clean retest against "
            "a production build before treating this as a shipped defect, but as observed here it is a real, "
            "twice-reproduced case of Today's own step-progress display disagreeing with its own stored state."
        )

        report_diagnostics("S4", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
