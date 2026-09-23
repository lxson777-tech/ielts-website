"""Scenario 6 - Seven days, and missed days.

Part A: through plan settings, an exam in seven days with 15 minutes a day.
Expect an honest scope note (a short sentence with a collapsed list of what
will not fit), every day in the Course rolling schedule inside its own
budget (the maximum is reported), and no completion wording anywhere. This
is the regression check for the audit's finding 3, the 255-minute day.

Part B: several missed days. A plan whose active session date is five days
ago is seeded directly into the new plan store, then Today is opened.
Expect a bounded recovery with ONE explained change, not a growing backlog.
This is the regression check for "no infinite backlog".
"""
import re

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    budget_minutes,
    days_after,
    days_before,
    dual_shot,
    goto,
    new_context,
    progress_v1,
    read_plan,
    report_diagnostics,
    saved_plan,
    seed_context,
    seed_new_stores,
    shot,
    synthetic_matching_headings,
    today_view,
    why_text,
    write_note,
    write_row,
    write_section,
)


def rolling_days(page):
    return page.evaluate(
        """() => Array.from(document.querySelectorAll('.plan-week-day')).map((day) => {
            const label = day.querySelector('.plan-week-day-label')?.textContent ?? '';
            const num = day.querySelector('.plan-week-day-num')?.textContent ?? '';
            const budgetSpan = Array.from(day.querySelectorAll(':scope > span')).find(
                (s) => !String(s.className).includes('plan-week-day-label')
                    && !String(s.className).includes('plan-week-day-num')
                    && /min/.test(s.textContent || ''));
            return {
                label, num,
                budgetText: budgetSpan ? budgetSpan.textContent.trim() : null,
                itemTitles: Array.from(day.querySelectorAll('.plan-week-item')).map((el) => el.getAttribute('title')),
                empty: day.querySelector('.plan-week-empty')?.textContent ?? null,
            };
        })"""
    )


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 6: Seven-day deadline and missed days",
        "Part A: fresh storage, then set target 7.0, exam in 7 days, 15 minutes a day through the "
        "real plan-settings screen. Part B: a separate context whose PersonalPlan already carries "
        "an active session dated five days ago.",
    )
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ── Part A: seven days, fifteen minutes ──────────────────────────
        context = new_context(browser)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        goto(page, "/plan-settings")
        page.wait_for_timeout(1600)
        assert_on(page, "plan settings before setting a 7-day deadline", "/plan-settings",
                  "Your study plan")
        band = page.locator(".intake-capsule", has_text="Band 7.0")
        if band.count():
            band.first.click()
        page.locator("#intake-exam-date").fill(days_after(7))
        fifteen = page.locator(".intake-capsule", has_text="15 minutes")
        if fifteen.count():
            fifteen.first.click()
        page.wait_for_timeout(400)
        confirm = page.get_by_role("button", name="Yes, I can commit to this")
        if confirm.count():
            confirm.first.click()
        page.wait_for_timeout(300)
        shot(page, "s06-01-plan-settings-seven-days-desktop", "/plan-settings")
        page.get_by_role("button", name="Save changes").first.click()
        page.wait_for_timeout(1400)

        headline = page.locator(".intake-outcome-headline")
        note = page.locator(".intake-outcome-note")
        dropped_list = page.locator(".intake-outcome-list")
        dropped = page.locator(".intake-outcome-list li")
        # text_content(), not inner_text(): the dropped list now lives inside
        # a closed <details> (intake-outcome-dropped), and inner_text() only
        # returns rendered/visible text, so it reads back "" for every item
        # while the panel is collapsed. text_content() reads the real DOM
        # text regardless of visibility, which is the honest way to check
        # content the UI deliberately keeps collapsed rather than hidden.
        dropped_texts = [(dropped.nth(i).text_content() or "").replace("\n", " ").strip()
                         for i in range(dropped.count())]
        headline_text = headline.first.inner_text().replace("\n", " ") if headline.count() else "(missing)"
        note_text = note.first.inner_text().replace("\n", " ") if note.count() else "(missing)"
        write_row(
            "An honest scope statement is shown at all",
            headline.count() > 0 and note.count() > 0,
            f'headline="{headline_text}"',
        )
        write_row(
            "The scope note on plan settings is a SHORT sentence, not a wall of text",
            len(note_text) <= 220,
            f'the scope paragraph is {len(note_text)} characters and is shown in full: "{note_text}"',
        )
        collapsed = False
        if dropped_list.count():
            collapsed = page.evaluate(
                """() => { const l = document.querySelector('.intake-outcome-list');
                           if (!l) return false;
                           const d = l.closest('details');
                           return Boolean(d); }"""
            )
        write_row(
            "What will not fit is in a COLLAPSED list, not dumped on the screen",
            collapsed or dropped.count() == 0,
            f"{dropped.count()} dropped item(s), inside a <details>={collapsed}. "
            f"Items: {dropped_texts[:6]}",
        )
        write_row(
            "The scope panel does not contradict itself",
            not ("enough to make steady, honest progress toward your goal" in headline_text
                 and any("not enough" in t for t in dropped_texts)),
            f'headline says "{headline_text}" while the line directly beneath it says '
            f'{dropped_texts}',
        )
        write_note(f'**Scope note, verbatim:** "{note_text}"')
        shot(page, "s06-02-plan-settings-outcome-desktop", "/plan-settings")

        goto(page, "/dashboard")
        page.wait_for_timeout(1600)
        assert_on(page, "Today on a 7-day/15-minute plan", "/dashboard", "", "#today-heading")
        v = today_view(page)
        minutes, budget_text = budget_minutes(page)
        step_sum = sum(int("".join(c for c in (s["minutes"] or "") if c.isdigit()) or 0)
                       for s in v["steps"])
        write_row(
            "Today's own session fits the 15-minute budget",
            minutes == 15 and step_sum <= 15,
            f'budget="{budget_text}", steps sum to {step_sum} min: '
            + "; ".join(f'{s["role"]}/{s["title"]}/{s["minutes"]}' for s in v["steps"]),
        )
        write_row(
            "No completion or congratulation wording on a 7-day plan with an unfinished library",
            v["finished_count"] == 0 and "done" not in (v["heading"] or "").lower(),
            f'.today-finished={v["finished_count"]}, heading="{v["heading"]}"',
        )
        today_scope = page.locator(".today-scope-note, .today-scope")
        today_scope_texts = [today_scope.nth(i).inner_text().replace("\n", " ")
                             for i in range(today_scope.count())]
        today_details = page.evaluate(
            """() => Array.from(document.querySelectorAll('.today-card details')).map((d) => ({
                open: d.open, summary: (d.querySelector('summary')?.innerText || '').trim(),
                items: Array.from(d.querySelectorAll('li')).map((li) => li.innerText.trim()),
            }))"""
        )
        write_row(
            "Today itself states the honest scope for a seven-day deadline",
            len(today_scope_texts) > 0 or len(today_details) > 0,
            f"scope notes on the Today card = {today_scope_texts}; "
            f"collapsible blocks on the Today card = {today_details}",
        )
        dual_shot(page, "s06-03-today-seven-days-fifteen-minutes", "/dashboard")

        goto(page, "/start")
        page.wait_for_timeout(1700)
        assert_on(page, "the Course rolling schedule", "/start", "The IELTS course")
        days = rolling_days(page)
        max_budget = 0
        overloaded = []
        detail = []
        for d in days:
            m = re.search(r"(\d+)", d["budgetText"] or "")
            budget = int(m.group(1)) if m else 0
            max_budget = max(max_budget, budget)
            items_sum = sum(int(mm.group(1)) for t in d["itemTitles"] if t
                            for mm in re.finditer(r"\((\d+)\s*min\)", t))
            if budget and items_sum > budget:
                overloaded.append(f'{d["label"]} {d["num"]}: {items_sum} min against {budget} min')
            detail.append(f'{d["label"]} {d["num"]}: budget={d["budgetText"]}, items={items_sum} min'
                          + (f', empty="{d["empty"]}"' if d["empty"] else ""))
        write_note("**Rolling schedule, day by day:** " + " | ".join(detail))
        write_row(
            "The audit's 255-minute day is impossible: no day's budget exceeds the chosen 15 minutes "
            "by more than a plausible recovery margin",
            0 < max_budget <= 30,
            f"maximum day budget observed across the rolling schedule = {max_budget} min "
            f"(15 min/day was chosen; the audit reproduced a 255-minute day on the old planner)",
        )
        write_row(
            "No day's listed work exceeds that day's own stated budget",
            not overloaded,
            f"overloaded days = {overloaded or 'none'}",
        )
        shot(page, "s06-04-course-rolling-schedule-seven-days-desktop", "/start")
        report_diagnostics("Scenario 6 part A", errors, failed)
        context.close()

        # ── Part B: several missed days ──────────────────────────────────
        context = new_context(browser)
        progress, old_plan = synthetic_matching_headings()
        seed_context(context, progress=progress, saved_plan=old_plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        # Let the site build its own plan first, then age the active session
        # by five days in storage and reopen. Rewriting the site's own plan
        # object is the only way to produce "five days of missed sessions"
        # without waiting five days.
        goto(page, "/dashboard")
        page.wait_for_timeout(1600)
        before = today_view(page)
        aged = page.evaluate(
            """(shiftDays) => {
                const key = Object.keys(localStorage).find((k) => k.startsWith('ielts.learning.plan.v1::'));
                if (!key) return null;
                const plan = JSON.parse(localStorage.getItem(key));
                const back = (iso) => {
                    const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
                    d.setUTCDate(d.getUTCDate() - shiftDays);
                    return iso.length === 10 ? d.toISOString().slice(0, 10) : d.toISOString();
                };
                const before = { active: plan.activeSession && plan.activeSession.date,
                                 first: plan.schedule && plan.schedule[0] && plan.schedule[0].date,
                                 createdAt: plan.createdAt };
                if (plan.activeSession) plan.activeSession.date = back(plan.activeSession.date);
                if (Array.isArray(plan.schedule)) {
                    for (const day of plan.schedule) day.date = back(day.date);
                }
                plan.createdAt = back(plan.createdAt);
                plan.updatedAt = back(plan.updatedAt);
                if (Array.isArray(plan.history)) {
                    for (const h of plan.history) if (h.at) h.at = back(h.at);
                }
                localStorage.setItem(key, JSON.stringify(plan));
                return { before, after: { active: plan.activeSession && plan.activeSession.date,
                                          first: plan.schedule && plan.schedule[0] && plan.schedule[0].date,
                                          createdAt: plan.createdAt } };
            }""",
            5,
        )
        write_row(
            "The stored plan could be aged by five days, so 'several missed days' is really simulated",
            bool(aged) and aged.get("after", {}).get("active") == days_before(5),
            f"activeSession.date and every schedule day moved back five days: {aged}",
        )
        goto(page, "/dashboard")
        page.wait_for_timeout(1700)
        assert_on(page, "Today after five missed days", "/dashboard", "", "#today-heading")
        after = today_view(page)
        reason = why_text(page)
        minutes, budget_text = budget_minutes(page)
        step_sum = sum(int("".join(c for c in (s["minutes"] or "") if c.isdigit()) or 0)
                       for s in after["steps"])
        write_row(
            "After five missed days the session is still bounded: one session, inside the budget, "
            "no piled-up backlog",
            after["active_count"] == 1 and minutes is not None and step_sum <= minutes,
            f'.today-active={after["active_count"]}, budget="{budget_text}", '
            f"steps sum to {step_sum} min across {len(after['steps'])} steps",
        )
        write_row(
            "The recovery is explained in one sentence rather than silently reshuffled",
            "miss" in reason.lower() or "rebuilt" in reason.lower() or "behind" in reason.lower(),
            f'reason text, verbatim: "{reason}"',
        )
        write_row(
            "Missed days never read as completion",
            after["finished_count"] == 0 and "done" not in (after["heading"] or "").lower(),
            f'.today-finished={after["finished_count"]}, heading="{after["heading"]}"',
        )
        write_note(
            f'**Before ageing:** objective="{before["objective"]}", budget="{before["budget"]}". '
            f'**After:** objective="{after["objective"]}", budget="{after["budget"]}".'
        )
        dual_shot(page, "s06-05-today-after-five-missed-days", "/dashboard")

        goto(page, "/start")
        page.wait_for_timeout(1700)
        changes = page.locator("h3:has-text('Why your plan changed recently') + ul li")
        change_texts = [changes.nth(i).inner_text().replace("\n", " ") for i in range(changes.count())]
        write_row(
            "The plan records the change, and records it once rather than as a growing list",
            0 < len(change_texts) <= 5,
            f"{len(change_texts)} recorded change(s): {change_texts}",
        )
        counted = re.search(r"missed (\d+) study day", " ".join(change_texts) + " " + reason)
        counted_n = int(counted.group(1)) if counted else None
        # The naive expectation is "aged by 5 days -> 5 missed", but
        # SYNTHETIC-matching-headings (synthetic_matching_headings() in
        # final_helpers.py) is NOT actually empty in the aged window: it has
        # a genuine Reading attempt at days_before(3), which lands inside
        # the five days [days_before(5), days_before(1)] once the plan is
        # aged back. The planner correctly does not count a day the student
        # really worked as missed (missedStudyDays() in
        # src/lib/learning/planner.ts skips any day in facts.activeDates),
        # so the honest expected count excludes that one day. Computing it
        # from the same seed dates, rather than hardcoding 5, is what
        # actually checks "the count matches what was really missed" against
        # THIS profile's real activity, instead of assuming a clean scenario
        # this profile does not provide. days_before() itself is anchored to
        # the real "today" this run happens on (final_helpers._runtime_today,
        # not a frozen calendar date), so this stays correct on any day the
        # suite runs rather than only on the day it was written.
        activity_days = {days_before(11), days_before(3), days_before(9),
                         days_before(8), days_before(7)}
        window_days = {days_before(n) for n in range(1, 6)}
        expected_missed = len(window_days - activity_days)
        # The before/after dates named below are the browser's OWN observed
        # values from the ageing step above (`aged`), not a recomputed or
        # hardcoded guess, so the message stays accurate regardless of what
        # day this runs on.
        aged_before_active = (aged or {}).get("before", {}).get("active", "?")
        aged_after_active = (aged or {}).get("after", {}).get("active", "?")
        write_row(
            "The number of missed days it tells the student matches the number actually missed",
            counted_n == expected_missed,
            f"the plan was aged by exactly 5 days (active session and every scheduled day moved from "
            f"{aged_before_active} to {aged_after_active}); of those 5 days, "
            f"{len(window_days & activity_days)} "
            f"(days_before(3), a real Reading attempt in the SYNTHETIC-matching-headings seed) was "
            f"actually worked, so the honestly expected count is {expected_missed}, and the wording says "
            f"{counted_n} missed study day(s)",
        )
        shot(page, "s06-06-course-plan-changes-after-missed-days-desktop", "/start")

        report_diagnostics("Scenario 6 part B", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
