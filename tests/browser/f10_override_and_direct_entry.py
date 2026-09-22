"""Scenario 10 - Student override, and entering a lesson directly.

Part A: on Today, use "Choose another skill" and accept the alternative.
Today must then show THAT session, with no second competing plan on screen,
and the choice must be recorded.

Part B: open an unrelated lesson from "Browse all lessons" and mark it
studied. The record must take the voluntary work, Today must not sprout a
second plan, and the lesson's footer must offer "Back to today's session".
"""
import json

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    dual_shot,
    goto,
    new_context,
    read_plan,
    read_record,
    report_diagnostics,
    seed_context,
    shot,
    synthetic_matching_headings,
    today_view,
    why_text,
    write_note,
    write_row,
    write_section,
)


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 10: Student override and direct entry",
        "Seed SYNTHETIC-matching-headings, then use the real \"Choose another skill\" control and "
        "the real \"Browse all lessons\" library.",
    )
    progress, plan = synthetic_matching_headings()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        seed_context(context, progress=progress, saved_plan=plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        goto(page, "/dashboard")
        page.wait_for_timeout(1600)
        assert_on(page, "Today before any override", "/dashboard", "", "#today-heading")
        before = today_view(page)
        shot(page, "s10-01-today-before-override-desktop", "/dashboard")

        # ── Part A: choose another skill ─────────────────────────────────
        toggle = page.get_by_role("button", name="Choose another skill")
        write_row("A \"Choose another skill\" control exists on Today", toggle.count() > 0,
                  f"{toggle.count()} control(s)")
        alt_label = None
        if toggle.count():
            toggle.first.click()
            page.wait_for_timeout(700)
            panel = page.locator(".today-other-skill")
            panel_text = (panel.first.inner_text().replace("\n", " ") if panel.count()
                          else "(no .today-other-skill panel)")
            alt = panel.locator("button")
            choices = [alt.nth(i).inner_text().strip() for i in range(alt.count())]
            alt_label = choices[0] if choices else None
            write_row(
                "The alternative skills are offered as named choices",
                len(choices) > 0,
                f'choices offered: {choices}; panel text: "{panel_text[:320]}"',
            )
            dual_shot(page, "s10-02-choose-another-skill-panel", "/dashboard")
            # This used to hardcode "Reading" as the override target, back
            # when the seeded student's default focus was Listening. The
            # student's default is now Reading Matching Headings itself
            # (the audit's own weak spot, product fix of 2026-09-22), so
            # "Choose another skill" no longer even offers Reading as an
            # alternative - it offers whatever the OTHER papers are. Picking
            # the first offered choice, whichever paper that turns out to
            # be, is what "an override to a different skill" honestly means
            # now.
            if alt.count():
                alt_label = alt.first.inner_text().strip()
                alt.first.click()
                page.wait_for_timeout(1800)

        after = today_view(page)
        write_row(
            "Today now shows the session the student chose, and only that one",
            after["active_count"] == 1 and after["objective"] != before["objective"],
            f'before="{before["objective"]}" ({before["kicker"]}) -> '
            f'after="{after["objective"]}" ({after["kicker"]}), '
            f'.today-active={after["active_count"]}, Start buttons={after["start_count"]}',
        )
        reason = why_text(page)
        stored = read_plan(page) or {}
        history = [h.get("summary") or "" for h in (stored.get("history") or [])]
        write_row(
            "The override is explained back to the student rather than silently applied",
            any("you chose" in h.lower() for h in history),
            f'reason shown on Today, verbatim: "{reason}" | plan history records: {history}',
        )
        write_note("**Plan overrides recorded in storage:** "
                   + json.dumps(stored.get("overrides"))[:600])
        write_note("**Plan history after the override:** "
                   + json.dumps([h.get("summary") for h in (stored.get("history") or [])])[:700])
        write_row(
            "The choice is recorded on the plan, not just rendered",
            bool(stored.get("overrides")) or any(
                "chose" in (h.get("summary") or "").lower() or "instead" in (h.get("summary") or "").lower()
                for h in (stored.get("history") or [])),
            f'overrides={json.dumps(stored.get("overrides"))[:300]}, '
            f'history summaries={json.dumps([h.get("summary") for h in (stored.get("history") or [])])[:400]}',
        )
        dual_shot(page, "s10-03-today-after-override", "/dashboard")

        goto(page, "/start")
        page.wait_for_timeout(1600)
        course = today_view(page)
        write_row(
            "The Course route follows the override too (no competing second plan)",
            course["objective"] == after["objective"],
            f'today="{after["objective"]}" | course="{course["objective"]}"',
        )
        shot(page, "s10-04-course-after-override-desktop", "/start")

        # ── Part B: an unrelated lesson, entered directly ────────────────
        goto(page, "/learn")
        page.wait_for_timeout(1800)
        assert_on(page, "Browse all lessons", "/learn", "Learn at your pace")
        target = page.locator("a.library-card", has_text="Speaking Overview")
        href = target.first.get_attribute("href") if target.count() else None
        write_row("An unrelated lesson can be opened straight from the library",
                  bool(href), f"library card href={href}")
        shot(page, "s10-05-library-desktop", "/learn")
        if href:
            page.goto(href if href.startswith("http") else base_url.split("/ielts-website")[0] + href,
                      wait_until="load")
            page.wait_for_timeout(1800)
        assert_on(page, "the unrelated lesson", "/lessons/speaking", "")
        complete = page.locator("#lesson-complete-btn")
        marked = False
        if complete.count():
            complete.first.scroll_into_view_if_needed()
            complete.first.click()
            page.wait_for_timeout(1400)
            marked = complete.first.get_attribute("data-done") is not None
        write_row("The unrelated lesson can be marked studied", marked,
                  f"lesson-complete button present={complete.count()}, marked studied={marked}")
        ctrl = page.locator("#lesson-next-control")
        label = (page.locator("#lesson-next-label").inner_text()
                 if page.locator("#lesson-next-label").count() else None)
        write_row(
            'The lesson footer offers "Back to today\'s session" rather than inventing a next lesson',
            label == "Back to today's session"
            and (ctrl.get_attribute("href") or "").endswith("/dashboard"),
            f'footer label="{label}", href={ctrl.get_attribute("href") if ctrl.count() else None}',
        )
        shot(page, "s10-06-unrelated-lesson-footer-desktop", "/lessons/speaking")

        record = read_record(page)
        studied = [e for e in (record or {}).get("events") or []
                   if "speaking" in json.dumps(e).lower()]
        write_row(
            "The voluntary lesson lands on the SAME record (no separate store)",
            len(studied) > 0,
            f"events mentioning the voluntary Speaking lesson: {json.dumps([{k: e.get(k) for k in ('activityId', 'mode', 'completion')} for e in studied])[:500]}",
        )

        goto(page, "/dashboard")
        page.wait_for_timeout(1700)
        final = today_view(page)
        write_row(
            "Today still shows exactly one session after the voluntary detour, and it is still "
            "the overridden one",
            final["active_count"] == 1 and final["start_count"] == 1
            and final["objective"] == after["objective"],
            f'.today-active={final["active_count"]}, Start buttons={final["start_count"]}, '
            f'objective="{final["objective"]}" (the override chose "{after["objective"]}")',
        )
        dual_shot(page, "s10-07-today-after-voluntary-lesson", "/dashboard")

        report_diagnostics("Scenario 10", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
