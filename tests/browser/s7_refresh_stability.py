"""S7 - Refresh stability.

On Today, note the session objective and first step. Reload five times and
navigate away and back: unchanged.
"""
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


def snapshot(page):
    obj = page.locator(".today-objective").inner_text() if page.locator(".today-objective").count() else None
    first_step = page.locator(".today-steps li").first.inner_text() if page.locator(".today-steps li").count() else None
    href = page.locator(".today-start").get_attribute("href") if page.locator(".today-start").count() else None
    return (obj, first_step, href)


def run(base_url: str = BASE_URL):
    write_section(
        "S7: Refresh stability",
        "Seed: SavedPlan target 6.5, dailyMinutes 40, defaulted=false, exam date ~50 days out.",
    )
    plan = saved_plan(
        target_band="6.5",
        test_date=days_after(50),
        created_at="2026-07-15T09:00:00.000Z",
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
        baseline = snapshot(page)
        write_row("Baseline session captured", baseline[0] is not None, f"objective=\"{baseline[0]}\", first step=\"{baseline[1]}\", href={baseline[2]}")
        screenshot(page, "s7-01-today-baseline-desktop")

        all_stable = True
        for i in range(1, 6):
            # page.reload() proved flaky here (net::ERR_ABORTED, reproducibly,
            # against this dev server's HMR/background connections) - a fresh
            # goto() to the same URL is an equally honest "reload".
            goto(page, "/dashboard")
            page.wait_for_timeout(400)
            snap = snapshot(page)
            same = snap == baseline
            all_stable = all_stable and same
            write_row(f"Reload #{i}: session unchanged", same, f"objective=\"{snap[0]}\", first step=\"{snap[1]}\", href={snap[2]}")

        goto(page, "/account")
        page.wait_for_timeout(400)
        goto(page, "/dashboard")
        try:
            page.wait_for_selector(".today-objective", timeout=8000)
        except Exception:
            pass
        page.wait_for_timeout(400)
        snap_after_nav = snapshot(page)
        write_row(
            "Navigate away (/account) and back: session unchanged",
            snap_after_nav == baseline,
            f"objective=\"{snap_after_nav[0]}\", first step=\"{snap_after_nav[1]}\", href={snap_after_nav[2]}",
        )
        screenshot(page, "s7-02-today-after-nav-away-and-back-desktop")

        report_diagnostics("S7", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
