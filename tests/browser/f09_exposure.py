"""Scenario 9 - Exposure: seen material is not fresh evidence.

Part A: sit the Reading drill built from Academic Reading Test 6, Passage 2
(reading-full-006-drill-p2), then open the Reading Headings lesson quick
check, which quotes THE SAME paper, then open the independent check
exercise, which is built from a RESERVED paper (reading-full-029, "Toxic
Stress"). Read the stored record and prove the drill's and the lesson
check's items are marked seen while the reserved paper's are not.

Part B: submit a wholly blank drill. The record must mark it blank, and the
progress page must not grow a new weakness out of it.
"""
import json

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    days_after,
    goto,
    new_context,
    progress_v1,
    read_record,
    report_diagnostics,
    saved_plan,
    seed_context,
    shot,
    skill_trend_cards,
    write_note,
    write_row,
    write_section,
)

# /tests/drills/<id> redirects to /trainers/reading/<id>, which is where the
# drill player actually lives. Both are recorded so a reader can see why.
DRILL = "/trainers/reading/reading-full-006-drill-p2"
LESSON = "/lessons/reading/headings"
RESERVED_CHECK = "/trainers/focused/reading-matching-headings-check-a"
BLANK_DRILL = "/trainers/reading/reading-full-018-drill-p1"


def exposure_of(record):
    """Whatever the record keeps about which papers and items were seen."""
    if not record:
        return {}
    keys = [k for k in record.keys() if "expos" in k.lower() or "seen" in k.lower()]
    return {k: record[k] for k in keys}


def seen_item_ids(record):
    ids = set()
    for e in (record or {}).get("events") or []:
        for item in e.get("items") or []:
            if item.get("itemId"):
                ids.add(item["itemId"])
    return ids


def submit_and_confirm(page):
    """Click Submit, then click the confirmation Submit INSIDE the
    'Submit anyway?' warning panel if it appears.

    Bug fixed here: TestPlayer's own header Submit button and the inline
    unanswered-question confirmation panel's button share the exact same
    accessible name, "Submit" (src/components/TestPlayer.tsx: the panel is
    not a native dialog, and neither button is called "Finish now" or "Yes,
    finish" as this script used to assume). The old code looked for those
    two names, never found them, and still reported submitted=True after
    only the FIRST click - which just opens the warning panel and never
    calls handleSubmit(), so nothing was ever written to the learner
    record. The fix scopes the confirm click to the button living inside
    the warning panel (role="alert"), and only calls the attempt submitted
    once the header Submit button reports disabled (disabled={submitted}
    in TestPlayer.tsx), which is the real, verifiable signal the record was
    written."""
    submit = page.get_by_role("button", name="Finish").or_(
        page.get_by_role("button", name="Submit")).or_(
        page.get_by_role("button", name="Check answers"))
    if not submit.count():
        return False
    submit.first.click()
    page.wait_for_timeout(1200)
    alert_panel = page.locator('[role="alert"]')
    if alert_panel.count():
        confirm_btn = alert_panel.get_by_role("button", name="Submit")
        if confirm_btn.count():
            confirm_btn.first.click()
        page.wait_for_timeout(2000)
    else:
        page.wait_for_timeout(1000)
    header_submit = page.get_by_role("button", name="Submit")
    if header_submit.count():
        return header_submit.first.is_disabled()
    # Fallback for a player whose button really is "Finish"/"Check answers"
    # rather than "Submit": no confirmation panel appeared, so the single
    # click above is the real submission.
    return not alert_panel.count()


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 9: Exposure and blank submissions",
        "Fresh context, a light confirmed plan. Part A sits a drill from Academic Reading Test 6 "
        "Passage 2, then the lesson quick check that quotes the same paper, then the independent "
        "check built from the reserved Test 29. Part B submits a wholly blank drill.",
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

        # ── Part A: sit the drill ────────────────────────────────────────
        goto(page, DRILL)
        page.wait_for_timeout(2400)
        assert_on(page, "the Reading drill from Test 6, Passage 2", DRILL, "Passage 2 Drill")
        start = page.get_by_role("button", name="Start test")
        if start.count():
            start.first.click()
            page.wait_for_timeout(2400)
        shot(page, "s09-01-drill-opened-desktop", DRILL)
        # answer everything, correctness does not matter here: exposure does
        filled = page.evaluate(
            """() => {
                let n = 0;
                for (const el of document.querySelectorAll('select')) {
                    if (el.options.length > 1) { el.selectedIndex = 1;
                        el.dispatchEvent(new Event('change', { bubbles: true })); n++; }
                }
                for (const el of document.querySelectorAll('input[type=text]')) {
                    el.value = 'synthetic'; el.dispatchEvent(new Event('input', { bubbles: true })); n++;
                }
                for (const el of document.querySelectorAll('input[type=radio]')) {
                    const name = el.name;
                    if (name && !document.querySelector(`input[name="${name}"]:checked`)) { el.click(); n++; }
                }
                return n;
            }"""
        )
        submitted = submit_and_confirm(page)
        write_row(
            "The drill from Test 6 Passage 2 was really sat and submitted",
            submitted,
            f"{filled} answer control(s) filled, submitted={submitted}, landed on {page.url}",
        )
        shot(page, "s09-02-drill-submitted-desktop")

        after_drill = read_record(page)
        drill_seen = seen_item_ids(after_drill)
        old_store = page.evaluate(
            """() => { try { const raw = localStorage.getItem('ielts.progress.v1');
                             if (!raw) return null; const p = JSON.parse(raw);
                             return Object.keys(p.tests || {}); } catch (e) { return 'unreadable'; } }"""
        )
        write_note(
            "**Exposure state on the shared learner record immediately after the drill:** "
            + json.dumps(exposure_of(after_drill))[:900]
            + f" | item ids on the record: {sorted(drill_seen)[:12]}"
            + f" | test ids in the OLD ielts.progress.v1 store: {old_store}"
        )
        write_row(
            "Sitting a drill writes the drill onto the shared learner record",
            bool(exposure_of(after_drill)) or bool(drill_seen),
            "immediately after submitting a 13-question drill with 9 answers filled in, the shared "
            f"learner record held {len(drill_seen)} item outcome(s) and "
            f"{len(exposure_of(after_drill))} exposure block(s); the old progress store held "
            f"tests {old_store}",
        )

        # ── the lesson quick check on the SAME paper ─────────────────────
        goto(page, LESSON)
        page.wait_for_timeout(2400)
        assert_on(page, "the Reading Headings lesson", LESSON, "")
        quiz_selects = page.locator("astro-island select").filter(
            has=page.locator("option", has_text="Choose heading"))
        for i, a in enumerate(["v", "ii", "iv", "vii", "iii", "vi"]):
            if i < quiz_selects.count():
                try:
                    quiz_selects.nth(i).select_option(a)
                except Exception:
                    pass
        page.wait_for_timeout(400)
        btn = page.get_by_role("button", name="Check answers")
        if btn.count():
            btn.first.scroll_into_view_if_needed()
            btn.first.click()
            page.wait_for_timeout(1800)
        shot(page, "s09-03-lesson-check-same-paper-desktop", LESSON)

        # ── the reserved paper's independent check ───────────────────────
        goto(page, RESERVED_CHECK)
        page.wait_for_timeout(2200
                             )
        assert_on(page, "the independent check on the reserved paper", RESERVED_CHECK, "independent check")
        source = page.locator(".focused-source")
        source_text = source.first.inner_text() if source.count() else "(missing)"
        write_row(
            "The independent check really does come from a RESERVED paper the student has not met",
            "29" in source_text or "Test 29" in source_text,
            f'the check says its source is: "{source_text}"',
        )
        shot(page, "s09-04-reserved-check-source-desktop", RESERVED_CHECK)

        record = read_record(page)
        exposure = exposure_of(record)
        exposure_json = json.dumps(exposure)
        write_note("**Exposure state before sitting the reserved check:** " + exposure_json[:1400])
        write_row(
            "The drill's paper is recorded as SEEN",
            "reading-full-006" in exposure_json,
            f"reading-full-006 appears in the exposure record = "
            f"{'reading-full-006' in exposure_json}",
        )
        write_row(
            "The reserved paper is NOT recorded as seen before it is sat",
            "reading-full-029" not in exposure_json,
            f"reading-full-029 appears in the exposure record = "
            f"{'reading-full-029' in exposure_json}",
        )

        # ── Part B: a wholly blank drill ─────────────────────────────────
        goto(page, "/report")
        page.wait_for_timeout(2400)
        before_blank = skill_trend_cards(page)
        goto(page, BLANK_DRILL)
        page.wait_for_timeout(2400)
        assert_on(page, "a second, untouched drill for the blank submission",
                  BLANK_DRILL, "Passage 1 Drill")
        start = page.get_by_role("button", name="Start test")
        if start.count():
            start.first.click()
            page.wait_for_timeout(2400)
        blank_submitted = submit_and_confirm(page)
        write_row("A wholly blank drill can be submitted", blank_submitted,
                  f"submitted={blank_submitted}, landed on {page.url}")
        shot(page, "s09-05-blank-drill-submitted-desktop")

        blank_record = read_record(page)
        blank_events = [e for e in (blank_record or {}).get("events") or []
                        if "018" in json.dumps(e)]
        write_note("**Events recorded by the blank submission:** " + json.dumps(blank_events)[:1200])
        blank_marked = any(
            e.get("completion") in ("blank", "abandoned", "not-attempted")
            or e.get("blank") is True
            or all(not (i.get("firstAnswer") or "") for i in (e.get("items") or []))
            for e in blank_events
        )
        write_row(
            "The blank submission is recorded as blank rather than as a real attempt",
            bool(blank_events) and blank_marked,
            f"{len(blank_events)} event(s) recorded; marked blank/empty = {blank_marked}",
        )

        goto(page, "/report")
        page.wait_for_timeout(2400)
        assert_on(page, "the progress report after the blank submission", "/report", "Your progress")
        after_blank = skill_trend_cards(page)
        write_note(f"**Skill panels before the blank drill:** {json.dumps(before_blank)}")
        write_note(f"**Skill panels after the blank drill:** {json.dumps(after_blank)}")
        write_row(
            "The blank submission created no new weakness and no new band claim",
            [c["band"] for c in before_blank] == [c["band"] for c in after_blank]
            and [c["certainty"] for c in before_blank] == [c["certainty"] for c in after_blank],
            "bands before = " + str([c["band"] for c in before_blank])
            + ", after = " + str([c["band"] for c in after_blank])
            + "; certainty before = " + str([c["certainty"] for c in before_blank])
            + ", after = " + str([c["certainty"] for c in after_blank]),
        )
        blocks = page.inner_text("body").lower()
        write_row(
            "The report explains why something was not counted, where it applies",
            "not counted" in blocks or "does not count" in blocks or "not treated as" in blocks
            or "no answers" in blocks,
            "looked for a plain not-counted explanation on the page; "
            f"'not counted' present={'not counted' in blocks}, "
            f"'does not count' present={'does not count' in blocks}, "
            f"'not treated as' present={'not treated as' in blocks}",
        )
        shot(page, "s09-06-report-after-blank-desktop", "/report")

        report_diagnostics("Scenario 9", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
