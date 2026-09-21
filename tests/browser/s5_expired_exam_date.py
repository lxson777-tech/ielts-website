"""S5 - Expired exam date.

Seed an old plan whose exam date is in the past. Today must ask for a new
date or goal and must NEVER show a completion or congratulation message.
"""
from playwright.sync_api import sync_playwright

from helpers import (
    BASE_URL,
    DESKTOP,
    PHONE,
    attach_diagnostics,
    days_before,
    goto,
    new_context,
    progress_v1,
    report_diagnostics,
    saved_plan,
    screenshot,
    seed_context,
    write_row,
    write_section,
)


def run(base_url: str = BASE_URL):
    write_section(
        "S5: Expired exam date",
        "Seed: SavedPlan targetBand 7.0, testDate 10 days in the past, defaulted=false, dailyMinutes=40.",
    )
    plan = saved_plan(
        target_band="7.0",
        test_date=days_before(10),
        created_at="2026-06-01T09:00:00.000Z",
        daily_minutes=40,
        study_days="daily",
        defaulted=False,
    )
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        seed_context(context, progress=progress_v1(), saved_plan=plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        goto(page, "/dashboard")
        page.wait_for_timeout(400)

        planning = page.locator(".today-planning")
        heading = page.locator("#today-heading").inner_text() if page.locator("#today-heading").count() else ""
        write_row(
            "Today asks for a new date or goal on an expired plan",
            planning.count() > 0 and "exam date has passed" in heading.lower(),
            f'.today-planning present={planning.count() > 0}, heading="{heading}"',
        )

        set_date_link = page.get_by_role("link", name="Set a new date or goal")
        write_row(
            "A clear link to fix it (plan settings) is offered",
            set_date_link.count() > 0 and "/plan-settings" in (set_date_link.get_attribute("href") or ""),
            f'link present={set_date_link.count() > 0}, href={set_date_link.get_attribute("href") if set_date_link.count() else None}',
        )

        finished = page.locator(".today-finished")
        celebration = page.get_by_text("🎉")
        done_heading = "today, done" in heading.lower()
        write_row(
            "Never shows a completion or congratulation message",
            finished.count() == 0 and celebration.count() == 0 and not done_heading,
            f'.today-finished present={finished.count() > 0}, celebration emoji present={celebration.count() > 0}, '
            f'heading contains "done"={done_heading}',
        )

        screenshot(page, "s5-01-expired-exam-date-desktop")
        page.set_viewport_size(PHONE)
        screenshot(page, "s5-01-expired-exam-date-phone")
        page.set_viewport_size(DESKTOP)

        report_diagnostics("S5", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
