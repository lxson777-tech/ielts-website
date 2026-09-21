"""S2 - One hour persists.

Seed a confirmed old-store plan with dailyMinutes=60, defaulted=false.
Reload, reopen Course (/start) and plan settings (/plan-settings): 60
minutes is still the regular time everywhere. Then use "I have less time
today" and choose 15: Today shrinks to fit 15 minutes and says the regular
time is unchanged; reload keeps the short day; plan settings still shows 60.
"""
import re

from playwright.sync_api import sync_playwright

from helpers import (
    BASE_URL,
    DESKTOP,
    attach_diagnostics,
    days_after,
    goto,
    new_context,
    progress_v1,
    reload,
    report_diagnostics,
    saved_plan,
    screenshot,
    seed_context,
    write_note,
    write_row,
    write_section,
)


def budget_minutes(page):
    text = page.locator(".today-budget").inner_text()
    m = re.search(r"(\d+)", text)
    return (int(m.group(1)) if m else None), text


def run(base_url: str = BASE_URL):
    write_section(
        "S2: One hour persists, short-day override",
        "Seed: SavedPlan dailyMinutes=60, defaulted=false, target 7.0, exam date ~60 days out.",
    )
    plan = saved_plan(
        target_band="7.0",
        test_date=days_after(60),
        created_at="2026-08-01T09:00:00.000Z",
        daily_minutes=60,
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
        minutes, text = budget_minutes(page)
        write_row("Today: regular 60 minutes shown on first load", minutes == 60, f'"{text}"')
        screenshot(page, "s2-01-today-60min-desktop")

        reload(page)
        page.wait_for_timeout(300)
        minutes, text = budget_minutes(page)
        write_row("Today: 60 minutes still shown after reload", minutes == 60, f'"{text}"')

        goto(page, "/start")
        page.wait_for_timeout(400)
        summary_text = ""
        candidates = page.locator("span", has_text="min a day")
        if candidates.count():
            summary_text = candidates.first.inner_text()
        write_row(
            "Course ('Your route'): 60 min a day shown in the route summary",
            "60 min a day" in summary_text,
            f'"{summary_text}"',
        )
        screenshot(page, "s2-02-course-your-route-desktop")

        goto(page, "/plan-settings")
        page.wait_for_timeout(400)
        sixty_radio = page.locator(".intake-capsule", has_text="60 minutes").first.locator("input[type=radio]")
        sixty_checked = sixty_radio.is_checked() if sixty_radio.count() else False
        confirm_prompt = page.get_by_text("Can you really give", exact=False)
        write_row(
            "Plan settings: 60 minutes shown as the confirmed regular time",
            sixty_checked and confirm_prompt.count() == 0,
            f"60-radio checked={sixty_checked}, re-confirmation prompt shown={confirm_prompt.count() > 0}",
        )
        screenshot(page, "s2-03-plan-settings-60min-desktop")

        # ── "I have less time today" -> 15 ──────────────────────────────
        goto(page, "/dashboard")
        page.wait_for_timeout(400)
        page.get_by_role("button", name="I have less time today").click()
        page.wait_for_timeout(200)
        note_before = page.locator(".today-less-time p").inner_text() if page.locator(".today-less-time p").count() else ""
        write_row(
            "Less-time panel states the regular day is unchanged before picking",
            "60 minutes" in note_before and "unchanged" in note_before.lower(),
            f'"{note_before}"',
        )
        page.get_by_role("button", name="15 min").click()
        page.wait_for_timeout(400)
        minutes, text = budget_minutes(page)
        note = page.locator(".today-budget-note")
        note_text = note.inner_text() if note.count() else "(missing)"
        write_row(
            "Today shrinks to fit 15 minutes, notes regular day is 60",
            minutes == 15 and "60" in note_text,
            f'budget="{text}", note="{note_text}"',
        )
        screenshot(page, "s2-04-today-shortday-15min-desktop")

        reload(page)
        page.wait_for_timeout(300)
        minutes, text = budget_minutes(page)
        note_text2 = page.locator(".today-budget-note").inner_text() if page.locator(".today-budget-note").count() else "(missing)"
        write_row(
            "Short day (15) persists across reload",
            minutes == 15,
            f'budget="{text}", note="{note_text2}"',
        )
        screenshot(page, "s2-05-today-shortday-after-reload-desktop")

        goto(page, "/plan-settings")
        page.wait_for_timeout(400)
        sixty_radio2 = page.locator(".intake-capsule", has_text="60 minutes").first.locator("input[type=radio]")
        sixty_checked2 = sixty_radio2.is_checked() if sixty_radio2.count() else False
        write_row(
            "Plan settings still shows 60 as the regular time after the short-day override",
            sixty_checked2,
            f"60-radio checked={sixty_checked2}",
        )
        screenshot(page, "s2-06-plan-settings-after-shortday-desktop")

        report_diagnostics("S2", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
