"""Scenario 13 - The assessment boundary.

1. Start a timed full Reading paper. The tutor must be blocked with a calm
   explanation, and NO help control may exist anywhere on the page.
2. Start the independent check exercise. Same rule.
3. Finish the paper. The review must show explanations, and the tutor must
   be available again.
"""
import json

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    days_after,
    dual_shot,
    goto,
    mrez_state,
    new_context,
    progress_v1,
    report_diagnostics,
    saved_plan,
    seed_context,
    shot,
    write_note,
    write_row,
    write_section,
)

PAPER = "/tests/reading-full-030"
CHECK = "/trainers/focused/reading-matching-headings-check-a"


def help_controls(page):
    return page.locator(".help-control, button:has-text('Give me a hint'), "
                        "button:has-text('Explain this differently')").count()


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 13: Assessment boundary",
        "Fresh context, light confirmed plan. Start a real timed full Reading paper, then the "
        "independent check, then finish and open the review.",
    )
    plan = saved_plan(target_band="7.0", test_date=days_after(45),
                      created_at="2026-08-01T09:00:00.000Z", daily_minutes=60,
                      study_days="daily", defaulted=False)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        seed_context(context, progress=progress_v1(), saved_plan=plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        # ── 1. the timed full paper ──────────────────────────────────────
        goto(page, PAPER)
        page.wait_for_timeout(2200)
        assert_on(page, "the full Reading paper's start screen", PAPER, "")
        before = mrez_state(page)
        write_note("**Mr EZ before the clock starts:** " + json.dumps(before)[:500])
        start = page.get_by_role("button", name="Start test").or_(
            page.get_by_role("button", name="Start the test"))
        started = False
        if start.count():
            start.first.click()
            page.wait_for_timeout(2600)
            started = True
        write_row("A real timed Reading paper can be started", started,
                  f"Start control present={start.count()}, started={started}")
        during = mrez_state(page)
        write_note("**Mr EZ during the timed paper:** " + json.dumps(during)[:900])
        write_row(
            "No help control of any kind exists during the timed paper",
            help_controls(page) == 0,
            f"help controls on the page during the exam = {help_controls(page)}",
        )
        blocked_text = during["blocked_text"] or during["note"] or ""
        panel_open_text = ""
        if during["launcher"]:
            page.locator(".mrez-launcher").first.click()
            page.wait_for_timeout(900)
            reopened = mrez_state(page)
            panel_open_text = reopened["panel_text"] or ""
            blocked_text = reopened["blocked_text"] or reopened["note"] or blocked_text
        calm = any(w in (blocked_text + " " + panel_open_text).lower() for w in
                   ("exam", "timed", "on your own", "after", "no help", "closed"))
        write_row(
            "The tutor is blocked during the exam, and says why in a calm sentence",
            (during["launcher"] == 0 and during["panel"] == 0) or calm,
            f'launcher present={during["launcher"]}, panel present={during["panel"]}. '
            f'What it says, verbatim: "{(blocked_text or panel_open_text or "(nothing)")[:420]}"',
        )
        composer_usable = False
        if page.locator("#mrez-input").count():
            composer_usable = page.locator("#mrez-input").first.is_enabled()
        write_row(
            "A direct question cannot be typed to the tutor during the exam",
            not composer_usable,
            f"message box present={page.locator('#mrez-input').count()}, enabled={composer_usable}",
        )
        dual_shot(page, "s13-01-tutor-blocked-during-timed-paper", PAPER)

        # ── 2. the independent check ─────────────────────────────────────
        goto(page, CHECK)
        page.wait_for_timeout(2400)
        assert_on(page, "the independent check", CHECK, "independent check")
        check_state = mrez_state(page)
        write_note("**Mr EZ on the independent check:** " + json.dumps(check_state)[:900])
        write_row(
            "No help control exists on the independent check either",
            help_controls(page) == 0,
            f"help controls on the independent check = {help_controls(page)}",
        )
        check_blocked = check_state["blocked_text"] or check_state["note"] or ""
        if check_state["launcher"]:
            page.locator(".mrez-launcher").first.click()
            page.wait_for_timeout(900)
            re_check = mrez_state(page)
            check_blocked = re_check["blocked_text"] or re_check["panel_text"] or check_blocked
        write_row(
            "The tutor is closed for the duration of the independent check, with an explanation",
            check_state["launcher"] == 0
            or any(w in check_blocked.lower() for w in
                   ("check", "on your own", "no help", "after", "closed", "not switched on")),
            f'launcher present={check_state["launcher"]}. It says: "{check_blocked[:420]}"',
        )
        shot(page, "s13-02-tutor-on-independent-check-desktop", CHECK)

        # answer and finish the check, then look at the review
        selects = page.locator("select.focused-answer")
        for i in range(selects.count()):
            try:
                selects.nth(i).select_option(index=1)
            except Exception:
                pass
        page.wait_for_timeout(400)
        if page.locator(".focused-check").count():
            page.locator(".focused-check").first.click()
            page.wait_for_timeout(2200)
        after_body = page.inner_text("body")
        explanations = page.locator(".focused-explanation, .focused-evidence")
        write_row(
            "After the check is finished, the review shows the explanations it withheld",
            explanations.count() > 0,
            f"{explanations.count()} explanation block(s) now on the page; the summary reads "
            f'"{(page.locator(".focused-summary").first.inner_text().replace(chr(10), " ") if page.locator(".focused-summary").count() else "(missing)")[:300]}"',
        )
        after_state = mrez_state(page)
        write_row(
            "The tutor becomes available again once the check is over",
            after_state["launcher"] > 0,
            f'launcher present after finishing={after_state["launcher"]}, '
            f'note="{after_state["note"]}" (AI is not configured on this snapshot, so the honest '
            "available-again state is the plain unavailable notice, not a reply)",
        )
        dual_shot(page, "s13-03-review-after-check-tutor-available", CHECK)

        report_diagnostics("Scenario 13", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
