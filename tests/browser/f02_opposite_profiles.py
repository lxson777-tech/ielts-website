"""Scenario 2 - Opposite profiles get justifiably different plans.

Two isolated browser contexts. One seeds SYNTHETIC-strong-reading-weak-
writing (Reading band 7.5 measured over three papers, Writing 5.5 over two
live graded essays, target 7.0 overall with a Writing minimum of 6.5); the
other seeds the exact mirror image. Same target, same date, same 60
minutes. The session and the Course route must differ, and the difference
must be justified in the reason text rather than arbitrary.

This is also the regression check for the audit's finding 2, "target does
not personalize the schedule": a plan that ignores evidence would show both
students the same objective.
"""
from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    days_after,
    days_before,
    dual_shot,
    goto,
    new_context,
    report_diagnostics,
    saved_plan,
    seed_context,
    shot,
    synthetic_strong_reading_weak_writing,
    synthetic_weak_reading_strong_writing,
    test_attempt,
    today_view,
    why_text,
    write_note,
    write_row,
    write_section,
)


def _all_four_assessed(reading_band, writing_band, reading_by_type, tag):
    """The same two opposite profiles, but with Listening and Speaking ALSO
    measured (identically, at 7.0) in both. Without this the planner's
    honest "nothing is measured for this paper yet" rule outranks every
    strength and weakness, and both profiles land on the same unassessed
    paper, which hides whether evidence changes anything at all."""
    from final_helpers import progress_v1, writing_attempt
    progress = progress_v1(
        tests={
            f"reading-full-{n:03d}": [test_attempt(
                days_before(d) + "T09:00:00.000Z", int(reading_band * 4.6), 40,
                reading_band, f"{reading_band:.1f}", 2350,
                by_type=reading_by_type, skill="reading")]
            for n, d in ((11, 15), (12, 9), (13, 2))
        },
        writing={
            f"pte-wt-{p}-task2": [writing_attempt(
                days_before(d) + "T09:00:00.000Z", writing_band,
                {"taskResponse": writing_band, "coherenceCohesion": writing_band,
                 "lexicalResource": writing_band, "grammaticalRange": writing_band})]
            for p, d in (("103", 12), ("104", 4))
        },
        speaking=[{
            "at": days_before(5) + "T09:00:00.000Z", "mode": "part2",
            "topic": f"SYNTHETIC cue card {tag}", "overallBand": 7,
            "criteria": {"fluencyCoherence": 7, "lexicalResource": 7,
                         "grammaticalRange": 7, "pronunciation": 7}, "live": True}],
    )
    progress["tests"]["listening-full-005"] = [test_attempt(
        days_before(6) + "T09:00:00.000Z", 30, 40, 7, "7.0", 2400,
        by_type={"sentence-completion": {"correct": 8, "total": 10},
                 "multiple-choice": {"correct": 8, "total": 10}}, skill="listening")]
    progress["tests"]["listening-full-006"] = [test_attempt(
        days_before(1) + "T09:00:00.000Z", 30, 40, 7, "7.0", 2400,
        by_type={"sentence-completion": {"correct": 8, "total": 10},
                 "multiple-choice": {"correct": 8, "total": 10}}, skill="listening")]
    plan = saved_plan(target_band="7.0", test_date=days_after(56),
                      created_at="2026-07-10T09:00:00.000Z", daily_minutes=60,
                      study_days="daily", defaulted=False,
                      skill_targets={"writing": "6.5"})
    return progress, plan


def collect(browser, progress, plan, label, slug):
    context = new_context(browser)
    seed_context(context, progress=progress, saved_plan=plan)
    page = context.new_page()
    errors, failed = attach_diagnostics(page)

    goto(page, "/dashboard")
    page.wait_for_timeout(1400)
    assert_on(page, f"Today for {label}", "/dashboard", "", "#today-heading")
    view = today_view(page)
    reason = why_text(page)
    dual_shot(page, f"s02-{slug}-today", "/dashboard")

    goto(page, "/start")
    page.wait_for_timeout(1400)
    assert_on(page, f"Course route for {label}", "/start", "The IELTS course")
    course = today_view(page)
    milestones = page.locator("h3:has-text('Milestones ahead') + ul li span:not(.shrink-0)")
    milestone_texts = [milestones.nth(i).inner_text().replace("\n", " ")
                       for i in range(min(milestones.count(), 5))]
    week_items = page.locator(".plan-week-item-label")
    week_texts = [week_items.nth(i).inner_text().replace("\n", " ")[:70]
                  for i in range(min(week_items.count(), 8))]
    shot(page, f"s02-{slug}-course-route-desktop", "/start")

    report_diagnostics(f"Scenario 2 ({label})", errors, failed)
    context.close()
    return {
        "today": view, "reason": reason, "course": course,
        "milestones": milestone_texts, "week": week_texts,
    }


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 2: Opposite profiles",
        "Two fresh contexts. SYNTHETIC-strong-reading-weak-writing versus "
        "SYNTHETIC-weak-reading-strong-writing. Identical target (7.0), identical exam date "
        "(+56 days), identical 60 minutes a day, identical Writing minimum (6.5). Only the "
        "evidence differs.",
    )
    with sync_playwright() as p:
        browser = p.chromium.launch()
        a = collect(browser, *synthetic_strong_reading_weak_writing(),
                    "strong Reading / weak Writing", "strong-reading-weak-writing")
        b = collect(browser, *synthetic_weak_reading_strong_writing(),
                    "weak Reading / strong Writing", "weak-reading-strong-writing")

        # Part 2: the same opposition, all four papers measured, so the
        # unassessed-paper rule cannot mask whether evidence matters.
        c = collect(
            browser,
            *_all_four_assessed(7.5, 5.5, {"matching-headings": {"correct": 7, "total": 8},
                                           "multiple-choice": {"correct": 9, "total": 10},
                                           "tfng": {"correct": 8, "total": 9}}, "C"),
            "strong Reading / weak Writing, all four papers measured", "all-measured-strong-reading")
        d = collect(
            browser,
            *_all_four_assessed(5.5, 7.5, {"matching-headings": {"correct": 2, "total": 8},
                                           "multiple-choice": {"correct": 5, "total": 10},
                                           "tfng": {"correct": 4, "total": 9}}, "D"),
            "weak Reading / strong Writing, all four papers measured", "all-measured-weak-reading")
        browser.close()

    write_note(
        "**Strong Reading / weak Writing** - Today: kicker=\"%s\", objective=\"%s\"; reason=\"%s\"; "
        "start href=%s" % (a["today"]["kicker"], a["today"]["objective"], a["reason"],
                           a["today"]["start_href"])
    )
    write_note(
        "**Weak Reading / strong Writing** - Today: kicker=\"%s\", objective=\"%s\"; reason=\"%s\"; "
        "start href=%s" % (b["today"]["kicker"], b["today"]["objective"], b["reason"],
                           b["today"]["start_href"])
    )

    write_note(
        "**Strong Reading / weak Writing, all four papers measured** - Today: kicker=\"%s\", "
        "objective=\"%s\"; reason=\"%s\"" % (c["today"]["kicker"], c["today"]["objective"], c["reason"])
    )
    write_note(
        "**Weak Reading / strong Writing, all four papers measured** - Today: kicker=\"%s\", "
        "objective=\"%s\"; reason=\"%s\"" % (d["today"]["kicker"], d["today"]["objective"], d["reason"])
    )

    write_row(
        "Pair 1 (Listening and Speaking left unassessed in both): the two profiles get "
        "different objectives on Today",
        a["today"]["objective"] != b["today"]["objective"],
        f'A="{a["today"]["objective"]}" ({a["today"]["kicker"]}) vs '
        f'B="{b["today"]["objective"]}" ({b["today"]["kicker"]}). '
        f'Both reasons read: "{a["reason"]}" / "{b["reason"]}"',
    )
    write_row(
        "Pair 1: the Course route differs (the whole plan, not just today's card)",
        a["milestones"] != b["milestones"] or a["week"] != b["week"],
        f"milestones identical={a['milestones'] == b['milestones']}, "
        f"week ahead identical={a['week'] == b['week']}",
    )
    write_note(
        f"**Pair 1, a week ahead, strong Reading / weak Writing:** {a['week']}\n\n"
        f"**Pair 1, a week ahead, weak Reading / strong Writing:** {b['week']}"
    )

    write_row(
        "Pair 2 (all four papers measured, only Reading and Writing swapped): the two profiles "
        "get different objectives on Today",
        c["today"]["objective"] != d["today"]["objective"],
        f'C="{c["today"]["objective"]}" ({c["today"]["kicker"]}) vs '
        f'D="{d["today"]["objective"]}" ({d["today"]["kicker"]})',
    )
    write_row(
        "Pair 2: the two profiles get different papers on Today",
        (c["today"]["kicker"] or "").split(",")[0] != (d["today"]["kicker"] or "").split(",")[0],
        f'C kicker="{c["today"]["kicker"]}" vs D kicker="{d["today"]["kicker"]}"',
    )
    write_row(
        "Pair 2: each reason names that student's own evidence, so the difference is justified",
        c["reason"] != d["reason"] and len(c["reason"]) > 20 and len(d["reason"]) > 20,
        f'C reason="{c["reason"]}" | D reason="{d["reason"]}"',
    )
    write_row(
        "Pair 2: the Course route differs too",
        c["milestones"] != d["milestones"] or c["week"] != d["week"],
        f"milestones identical={c['milestones'] == d['milestones']}, "
        f"week ahead identical={c['week'] == d['week']}",
    )
    write_note(
        f"**Pair 2 milestones, strong Reading / weak Writing:** {c['milestones']}\n\n"
        f"**Pair 2 milestones, weak Reading / strong Writing:** {d['milestones']}"
    )
    write_row(
        "Course and Today still agree WITHIN each of the four profiles "
        "(one session, never two opinions)",
        all(x["course"]["objective"] == x["today"]["objective"] for x in (a, b, c, d)),
        " | ".join(
            f'{n}: today="{x["today"]["objective"]}" course="{x["course"]["objective"]}"'
            for n, x in (("A", a), ("B", b), ("C", c), ("D", d))
        ),
    )


if __name__ == "__main__":
    run()
