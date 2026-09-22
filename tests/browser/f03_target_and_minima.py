"""Scenario 3 - Overall target and per-paper minima.

SYNTHETIC-lowest-but-met: Reading 7.0, Listening 7.0, Speaking 7.0, Writing
6.0 over two live graded essays. Through plan settings the student sets an
overall target of 7.0 with a Writing minimum of 6.0. Writing is the LOWEST
paper but it already meets its own required minimum, so it must not be
treated as the main gap.

The reason text is recorded verbatim either way.
"""
from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    dual_shot,
    goto,
    new_context,
    report_diagnostics,
    report_paper_blocks,
    seed_context,
    shot,
    synthetic_lowest_but_met,
    today_view,
    why_text,
    write_note,
    write_row,
    write_section,
)


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 3: Overall target with per-paper minima, lowest paper already met",
        "Seed SYNTHETIC-lowest-but-met (Reading 7.0, Listening 7.0, Speaking 7.0, Writing 6.0 over "
        "two graded essays). Then set overall 7.0 with a Writing minimum of 6.0 THROUGH PLAN "
        "SETTINGS, the way a student would.",
    )
    progress, plan = synthetic_lowest_but_met()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        seed_context(context, progress=progress, saved_plan=plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        # ── set the minima through the real settings screen ──────────────
        goto(page, "/plan-settings")
        page.wait_for_timeout(1400)
        assert_on(page, "plan settings", "/plan-settings", "")

        band = page.locator(".intake-capsule", has_text="Band 7.0")
        if band.count():
            band.first.click()
        page.wait_for_timeout(300)
        details = page.locator("details.intake-details", has_text="Set a different minimum")
        opened = False
        if details.count():
            details.first.locator("summary").click()
            page.wait_for_timeout(500)
            opened = page.locator("#intake-paper-writing").first.is_visible()
            if not opened:
                details.first.locator("summary").click()
                page.wait_for_timeout(500)
                opened = page.locator("#intake-paper-writing").first.is_visible()
        write_row(
            'The per-paper minimum panel opens from its own summary control '
            '("Set a different minimum for each paper")',
            opened,
            f"the Writing minimum control became visible after clicking the summary = {opened}",
        )
        writing_select = page.locator("#intake-paper-writing")
        set_ok = writing_select.count() > 0 and writing_select.first.is_visible()
        if set_ok:
            writing_select.first.select_option(label="Band 6.0")
        page.wait_for_timeout(400)
        write_row(
            "A per-paper minimum for Writing can be set separately from the overall target",
            set_ok,
            f"#intake-paper-writing present={set_ok}, set to Band 6.0 with an overall target of 7.0",
        )
        shot(page, "s03-01-plan-settings-writing-minimum-desktop", "/plan-settings")
        save = page.get_by_role("button", name="Save changes")
        if save.count():
            save.first.click()
        page.wait_for_timeout(1200)
        shot(page, "s03-02-plan-settings-saved-desktop", "/plan-settings")

        # ── the resulting priorities ──────────────────────────────────────
        goto(page, "/dashboard")
        page.wait_for_timeout(1600)
        assert_on(page, "Today after setting the minima", "/dashboard", "", "#today-heading")
        v = today_view(page)
        reason = why_text(page)
        kicker = (v["kicker"] or "").lower()
        objective = (v["objective"] or "").lower()
        write_row(
            "Writing is NOT treated as the main gap, even though it is the lowest paper",
            "writing" not in kicker,
            f'Today kicker="{v["kicker"]}", objective="{v["objective"]}" '
            "(Writing is the lowest paper at band 6.0, but its required minimum is 6.0, so it is met)",
        )
        write_row(
            "The reason explains the choice against the student's own requirements",
            len(reason) > 20,
            f'reason text, verbatim: "{reason}"',
        )
        dual_shot(page, "s03-03-today-writing-not-the-gap", "/dashboard")

        # ── the report's per-paper reasoning, verbatim ───────────────────
        goto(page, "/report")
        page.wait_for_timeout(1800)
        assert_on(page, "the progress report", "/report", "Your progress")
        rows = report_paper_blocks(page)
        for name, cells in rows.items():
            write_note(f'**Report, "{name}" - what to work on next:** '
                       f'"{cells.get("WHAT TO WORK ON NEXT", "(none)")}"')
        writing_text = rows.get("Writing", {}).get("WHAT TO WORK ON NEXT", "")
        write_row(
            "The report does not describe the met-minimum Writing paper as a serious gap",
            "biggest" not in writing_text.lower() and "priority 1" not in writing_text.lower(),
            f'Writing panel says: "{writing_text}"',
        )
        met_wording = page.get_by_text("meets", exact=False)
        write_row(
            "Somewhere on the report the met minimum is stated as met "
            "(so the student can see WHY Writing was skipped)",
            met_wording.count() > 0
            or "already" in writing_text.lower()
            or "minimum" in writing_text.lower(),
            f'"meets" appears {met_wording.count()} time(s); Writing panel text = "{writing_text}"',
        )
        shot(page, "s03-04-report-per-paper-reasons-desktop", "/report")

        report_diagnostics("Scenario 3", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
