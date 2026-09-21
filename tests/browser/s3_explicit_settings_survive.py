"""S3 - Existing explicit settings survive.

Seed an OLD-style study plan with dailyMinutes 25 and defaulted false (and a
target band). Open Today and plan settings: 25 is kept, 60 appears only as
advice, no intake is forced.
"""
import re

from playwright.sync_api import sync_playwright

from helpers import (
    BASE_URL,
    attach_diagnostics,
    days_after,
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
        "S3: Existing explicit settings survive migration",
        "Seed: SavedPlan dailyMinutes=25, defaulted=false, target 6.5, exam date ~90 days out.",
    )
    plan = saved_plan(
        target_band="6.5",
        test_date=days_after(90),
        created_at="2026-07-01T09:00:00.000Z",
        daily_minutes=25,
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

        intake_shown = page.locator(".today-intake").count() > 0
        active_shown = page.locator(".today-active").count() > 0
        write_row(
            "No intake forced on a student with explicit confirmed settings",
            active_shown and not intake_shown,
            f".today-intake present={intake_shown}, .today-active present={active_shown}",
        )

        budget_text = page.locator(".today-budget").inner_text() if page.locator(".today-budget").count() else ""
        m = re.search(r"(\d+)", budget_text)
        minutes = int(m.group(1)) if m else None
        write_row("Today keeps the explicit 25 minutes, not 60", minutes == 25, f'"{budget_text}"')
        screenshot(page, "s3-01-today-25min-desktop")

        goto(page, "/plan-settings")
        page.wait_for_timeout(400)
        capsule_25 = page.locator(".intake-capsule", has_text="25 minutes")
        capsule_60 = page.locator(".intake-capsule", has_text="60 minutes")
        radio_25_checked = capsule_25.first.locator("input[type=radio]").is_checked() if capsule_25.count() else False
        radio_60_checked = capsule_60.first.locator("input[type=radio]").is_checked() if capsule_60.count() else False
        hint_60 = capsule_60.first.locator(".intake-capsule-hint").inner_text() if capsule_60.count() and capsule_60.first.locator(".intake-capsule-hint").count() else ""
        write_row(
            "Plan settings: 25 is the selected/kept value",
            radio_25_checked and not radio_60_checked,
            f"25 checked={radio_25_checked}, 60 checked={radio_60_checked}",
        )
        write_row(
            "Plan settings: 60 is offered only as advice (recommendation hint), not applied",
            "recommend" in hint_60.lower() and not radio_60_checked,
            f'60-minute hint = "{hint_60}"',
        )
        confirm_prompt = page.get_by_text("Can you really give", exact=False)
        write_row(
            "No re-confirmation nagging on load (settings already confirmed)",
            confirm_prompt.count() == 0,
            f"confirm prompt present={confirm_prompt.count() > 0}",
        )
        screenshot(page, "s3-02-plan-settings-25min-desktop")

        report_diagnostics("S3", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
