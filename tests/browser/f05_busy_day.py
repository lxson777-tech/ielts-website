"""Scenario 5 - Busy day.

A confirmed 60-minute plan. "I have less time today" offers short days; 15
and 25 are both honoured; Today says the regular time is unchanged; a
reload keeps the short day; and plan settings still shows 60 as the regular
time afterwards.
"""
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


def pick_short_day(page, label):
    btn = page.get_by_role("button", name="I have less time today")
    if not btn.count():
        return None, "(no 'I have less time today' control)"
    btn.first.click()
    page.wait_for_timeout(500)
    panel = page.locator(".today-less-time")
    panel_text = panel.first.inner_text().replace("\n", " ") if panel.count() else "(panel absent)"
    choice = page.get_by_role("button", name=label)
    if not choice.count():
        return None, f"(no '{label}' choice; panel said: {panel_text})"
    choice.first.click()
    page.wait_for_timeout(900)
    return panel_text, None


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 5: Busy day",
        "Seed a confirmed 60-minute plan (dailyMinutes=60, defaulted=false, target 7.0, exam in "
        "60 days). Use the real \"I have less time today\" control.",
    )
    plan = saved_plan(target_band="7.0", test_date=days_after(60),
                      created_at="2026-08-01T09:00:00.000Z", daily_minutes=60,
                      study_days="daily", defaulted=False)
    with sync_playwright() as p:
        browser = p.chromium.launch()

        for short_label, short_value, slug in (("15 min", 15, "fifteen"), ("25 min", 25, "twentyfive")):
            context = new_context(browser)
            seed_context(context, progress=progress_v1(), saved_plan=plan)
            page = context.new_page()
            errors, failed = attach_diagnostics(page)

            goto(page, "/dashboard")
            page.wait_for_timeout(1400)
            assert_on(page, f"Today before asking for {short_label}", "/dashboard", "", "#today-heading")
            before_minutes, before_text = budget_minutes(page)
            write_row(f"[{short_label}] the regular day starts at 60 minutes",
                      before_minutes == 60, f'"{before_text}"')

            panel_text, problem = pick_short_day(page, short_label)
            if problem:
                write_row(f"[{short_label}] the short-day choice exists", False, problem)
                context.close()
                continue
            write_row(
                f"[{short_label}] the panel says the regular day is unchanged BEFORE the student picks",
                "60" in (panel_text or "") and "unchanged" in (panel_text or "").lower(),
                f'panel text: "{panel_text}"',
            )

            minutes, text = budget_minutes(page)
            note = page.locator(".today-budget-note")
            note_text = note.first.inner_text().replace("\n", " ") if note.count() else "(missing)"
            v = today_view(page)
            step_sum = 0
            for s in v["steps"]:
                digits = "".join(ch for ch in (s["minutes"] or "") if ch.isdigit())
                step_sum += int(digits) if digits else 0
            write_row(
                f"[{short_label}] the {short_value}-minute day is honoured and the session fits it",
                minutes == short_value and step_sum <= short_value,
                f'budget="{text}", steps sum to {step_sum} min: '
                + "; ".join(f'{s["role"]}/{s["minutes"]}' for s in v["steps"]),
            )
            write_row(
                f"[{short_label}] Today states that the regular time is unchanged",
                "60" in note_text,
                f'note="{note_text}"',
            )
            dual_shot(page, f"s05-{slug}-short-day", "/dashboard")

            reload(page)
            page.wait_for_timeout(1400)
            minutes_after, text_after = budget_minutes(page)
            note_after = page.locator(".today-budget-note")
            write_row(
                f"[{short_label}] the short day survives a reload",
                minutes_after == short_value,
                f'budget after reload="{text_after}", '
                f'note="{note_after.first.inner_text() if note_after.count() else "(missing)"}"',
            )

            goto(page, "/plan-settings")
            page.wait_for_timeout(1400)
            c60 = page.locator(".intake-capsule", has_text="60 minutes")
            checked60 = c60.first.locator("input[type=radio]").is_checked() if c60.count() else False
            write_row(
                f"[{short_label}] plan settings still shows 60 as the REGULAR time "
                "(the short day did not overwrite it)",
                checked60,
                f"60-minute radio checked={checked60}",
            )
            stored = read_plan(page) or {}
            write_note(
                f'**[{short_label}] stored plan constraints after the override:** '
                f'{stored.get("constraints")}; today override = '
                f'{stored.get("todayOverride") or stored.get("shortDay") or "(not under those names)"}'
            )
            shot(page, f"s05-{slug}-plan-settings-still-sixty-desktop", "/plan-settings")

            report_diagnostics(f"Scenario 5 ({short_label})", errors, failed)
            context.close()

        browser.close()


if __name__ == "__main__":
    run()
