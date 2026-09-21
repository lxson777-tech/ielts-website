"""S6 - Seven days and fifteen minutes.

Through plan settings, set an exam date seven days ahead and 15 minutes a
day. Expect an honest statement of what will not fit, no day above its own
budget in the Course rolling schedule (read every day's minutes and report
the maximum), and no "255 minute" style overload.
"""
import re

from playwright.sync_api import sync_playwright

from helpers import (
    BASE_URL,
    attach_diagnostics,
    days_after,
    goto,
    new_context,
    report_diagnostics,
    screenshot,
    write_note,
    write_row,
    write_section,
)


def run(base_url: str = BASE_URL):
    write_section(
        "S6: Seven-day deadline, fifteen minutes a day",
        "Fresh storage. Set target 7.0, exam date +7 days, 15 min/day, through plan settings.",
    )
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        goto(page, "/plan-settings")
        page.wait_for_timeout(500)

        band = page.get_by_text("Band 7.0", exact=True)
        if band.count():
            band.first.click(force=True)

        exam_date = page.locator("#intake-exam-date")
        exam_iso = days_after(7)
        exam_date.fill(exam_iso)

        fifteen = page.locator(".intake-capsule", has_text="15 minutes")
        fifteen_ok = fifteen.count() > 0
        if fifteen_ok:
            fifteen.first.click(force=True)
        page.wait_for_timeout(200)
        confirm_btn = page.get_by_role("button", name="Yes, I can commit to this")
        if confirm_btn.count():
            confirm_btn.click()

        screenshot(page, "s6-01-plan-settings-before-save-desktop")
        page.get_by_role("button", name="Save changes").click()
        page.wait_for_timeout(600)

        headline = page.locator(".intake-outcome-headline")
        note = page.locator(".intake-outcome-note")
        dropped = page.locator(".intake-outcome-list li")
        headline_text = headline.inner_text() if headline.count() else "(missing)"
        note_text = note.inner_text() if note.count() else "(none)"
        dropped_texts = [dropped.nth(i).inner_text() for i in range(dropped.count())]
        write_row(
            "An honest outcome statement is shown after saving a 7-day/15-min plan",
            headline.count() > 0,
            f'headline="{headline_text}", note="{note_text}", dropped={dropped_texts}',
        )
        screenshot(page, "s6-02-plan-settings-outcome-desktop")

        goto(page, "/start")
        page.wait_for_timeout(500)
        screenshot(page, "s6-03-course-rolling-schedule-desktop")

        days = page.evaluate(
            """
            () => Array.from(document.querySelectorAll('.plan-week-day')).map((day) => {
              const label = day.querySelector('.plan-week-day-label')?.textContent ?? '';
              const num = day.querySelector('.plan-week-day-num')?.textContent ?? '';
              const budgetSpan = Array.from(day.querySelectorAll(':scope > span')).find(
                (s) => !s.className.includes('plan-week-day-label') && !s.className.includes('plan-week-day-num')
                  && /min/.test(s.textContent || '')
              );
              const budgetText = budgetSpan ? budgetSpan.textContent : null;
              const itemTitles = Array.from(day.querySelectorAll('.plan-week-item')).map((el) => el.getAttribute('title'));
              const emptyLabel = day.querySelector('.plan-week-empty')?.textContent ?? null;
              return { label, num, budgetText, itemTitles, emptyLabel };
            })
            """
        )

        max_budget = 0
        overload_found = False
        detail_lines = []
        for d in days:
            budget_text = d.get("budgetText") or ""
            m = re.search(r"(\d+)", budget_text)
            budget = int(m.group(1)) if m else 0
            max_budget = max(max_budget, budget)
            item_minutes_sum = 0
            for title in d["itemTitles"]:
                if not title:
                    continue
                mm = re.search(r"\((\d+)\s*min\)", title)
                if mm:
                    item_minutes_sum += int(mm.group(1))
            if item_minutes_sum > budget and budget > 0:
                overload_found = True
            detail_lines.append(
                f'{d["label"]} {d["num"]}: budget="{budget_text}", items_sum={item_minutes_sum}min, '
                f'empty="{d["emptyLabel"]}"'
            )

        write_note("**S6 rolling schedule, day by day:** " + " | ".join(detail_lines))

        write_row(
            "No day in the rolling schedule shows an overloaded '255 minute' style budget",
            max_budget <= 30,
            f"maximum day budget observed = {max_budget} min (15 min/day was set; a recovery day may run a bit "
            "higher, but nothing implausible)",
        )
        write_row(
            "No day's listed items exceed that day's own stated budget",
            not overload_found,
            f"overload found = {overload_found}",
        )

        report_diagnostics("S6", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
