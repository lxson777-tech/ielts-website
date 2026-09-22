"""Scenario 4 - One hour.

Part A: a confirmed 60-minute plan. 60 persists across a reload, and the
same 60 appears on Today, on the Course route summary and in plan settings.

Part B: a returning student whose OLD store already holds an explicit 25
minutes with `defaulted: false`. Migration must keep the 25 they chose, and
60 must appear only as advice, never applied behind their back.
"""
from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    budget_minutes,
    days_after,
    goto,
    new_context,
    progress_v1,
    read_plan,
    reload,
    report_diagnostics,
    saved_plan,
    seed_context,
    shot,
    today_view,
    write_note,
    write_row,
    write_section,
)


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 4: One hour",
        "Part A seeds a confirmed 60-minute plan (SavedPlan dailyMinutes=60, defaulted=false). "
        "Part B seeds an explicitly chosen 25 minutes (dailyMinutes=25, defaulted=false) in a "
        "separate context, which migration must not overwrite.",
    )
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ── Part A: 60 minutes, everywhere, across a reload ──────────────
        context = new_context(browser)
        seed_context(context, progress=progress_v1(),
                     saved_plan=saved_plan(target_band="7.0", test_date=days_after(60),
                                           created_at="2026-08-01T09:00:00.000Z",
                                           daily_minutes=60, study_days="daily", defaulted=False))
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        goto(page, "/dashboard")
        page.wait_for_timeout(1400)
        assert_on(page, "Today with a confirmed 60-minute plan", "/dashboard", "", "#today-heading")
        minutes, text = budget_minutes(page)
        write_row("Today shows the 60-minute day", minutes == 60, f'"{text}"')
        shot(page, "s04-01-today-sixty-desktop", "/dashboard")

        reload(page)
        page.wait_for_timeout(1400)
        minutes2, text2 = budget_minutes(page)
        write_row("60 minutes survives a reload", minutes2 == 60, f'"{text2}"')

        goto(page, "/start")
        page.wait_for_timeout(1400)
        assert_on(page, "the Course route", "/start", "The IELTS course")
        summary = page.locator("span", has_text="min a day")
        summary_text = summary.first.inner_text() if summary.count() else "(missing)"
        write_row("The Course route summary states the same 60 minutes",
                  "60 min a day" in summary_text, f'"{summary_text}"')
        shot(page, "s04-02-course-route-sixty-desktop", "/start")

        goto(page, "/plan-settings")
        page.wait_for_timeout(1400)
        assert_on(page, "plan settings", "/plan-settings", "Your study plan")
        sixty = page.locator(".intake-capsule", has_text="60 minutes")
        sixty_checked = sixty.first.locator("input[type=radio]").is_checked() if sixty.count() else False
        nag = page.get_by_text("Can you really give", exact=False)
        write_row("Plan settings shows 60 as the confirmed regular time, with no re-nagging",
                  sixty_checked and nag.count() == 0,
                  f"60-minute radio checked={sixty_checked}, re-confirmation prompt shown={nag.count() > 0}")
        shot(page, "s04-03-plan-settings-sixty-desktop", "/plan-settings")
        plan = read_plan(page)
        write_note(
            "**Stored plan constraints (read out of localStorage, not off the screen):** "
            f"{(plan or {}).get('constraints')}"
        )
        report_diagnostics("Scenario 4 part A", errors, failed)
        context.close()

        # ── Part B: an explicit 25 survives, 60 is only advice ───────────
        context = new_context(browser)
        seed_context(context, progress=progress_v1(),
                     saved_plan=saved_plan(target_band="6.5", test_date=days_after(90),
                                           created_at="2026-07-01T09:00:00.000Z",
                                           daily_minutes=25, study_days="daily", defaulted=False))
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        goto(page, "/dashboard")
        page.wait_for_timeout(1400)
        assert_on(page, "Today for a returning student with an explicit 25 minutes",
                  "/dashboard", "", "#today-heading")
        v = today_view(page)
        minutes, text = budget_minutes(page)
        write_row("The explicitly chosen 25 minutes survives migration, unchanged",
                  minutes == 25, f'"{text}"')
        write_row("No intake is forced on a student who already confirmed their settings",
                  v["active_count"] == 1 and v["intake_count"] == 0,
                  f'.today-active={v["active_count"]}, .today-intake={v["intake_count"]}')
        shot(page, "s04-04-today-explicit-twentyfive-desktop", "/dashboard")

        goto(page, "/plan-settings")
        page.wait_for_timeout(1400)
        c25 = page.locator(".intake-capsule", has_text="25 minutes")
        c60 = page.locator(".intake-capsule", has_text="60 minutes")
        checked25 = c25.first.locator("input[type=radio]").is_checked() if c25.count() else False
        checked60 = c60.first.locator("input[type=radio]").is_checked() if c60.count() else False
        hint60 = ""
        if c60.count() and c60.first.locator(".intake-capsule-hint").count():
            hint60 = c60.first.locator(".intake-capsule-hint").inner_text()
        write_row("Plan settings keeps 25 selected", checked25 and not checked60,
                  f"25 checked={checked25}, 60 checked={checked60}")
        write_row("60 minutes is shown as advice only, never applied",
                  "recommend" in hint60.lower() and not checked60,
                  f'60-minute hint reads "{hint60}", 60 selected={checked60}')
        shot(page, "s04-05-plan-settings-twentyfive-kept-desktop", "/plan-settings")

        report_diagnostics("Scenario 4 part B", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
