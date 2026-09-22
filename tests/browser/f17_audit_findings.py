"""The audit's five reproduced findings, each one tried again on purpose.

From docs/audits/personal-learning-plan-2026-09-21.md, "Reproduced examples":

1. Contradictory direction: Mr EZ chose Matching Headings, Today chose
   Speaking Overview, Course chose Speaking Overview, all at once.
2. Target does not personalize the schedule: band 6.5 with a Writing
   minimum of 5.5 and band 9 with a Writing minimum of 9 produced identical
   schedules.
3. The budget is not a constraint: a seven-day plan at 15 minutes a day
   generated a calendar day containing 255 minutes.
4. Completion is not understanding: clicking a lesson's completion button
   created a completed record without demonstrating the skill.
5. Deadline is confused with completion: an expired plan returned
   finished: true while still holding unfinished introductory lessons.

Each is attempted here against the frozen production snapshot, with the
observed text written down.
"""
import json
import re

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
    progress_v1,
    read_record,
    report_diagnostics,
    saved_plan,
    seed_context,
    shot,
    skill_trend_cards,
    synthetic_expired,
    synthetic_matching_headings,
    today_view,
    write_note,
    write_row,
    write_section,
)


def schedule_of(page):
    return page.evaluate(
        """() => {
            const key = Object.keys(localStorage).find((k) => k.startsWith('ielts.learning.plan.v1::'));
            if (!key) return null;
            const plan = JSON.parse(localStorage.getItem(key));
            return (plan.schedule || []).map((d) => ({ date: d.date, budget: d.budgetMinutes,
                                                       focus: d.focus, ids: d.activityIds }));
        }"""
    )


def run(base_url: str = BASE_URL):
    write_section(
        "The audit's five reproduced findings, retried on the frozen snapshot",
        "Each finding from docs/audits/personal-learning-plan-2026-09-21.md is deliberately "
        "reproduced here, with the observed text recorded.",
    )
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ── Finding 1: contradictory direction ───────────────────────────
        progress, plan = synthetic_matching_headings()
        context = new_context(browser)
        seed_context(context, progress=progress, saved_plan=plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)
        goto(page, "/dashboard")
        page.wait_for_timeout(2000)
        assert_on(page, "Today, the audit's Matching Headings student", "/dashboard", "", "#today-heading")
        today = today_view(page)
        voice = today["voice"]
        goto(page, "/start")
        page.wait_for_timeout(1800)
        course = today_view(page)
        goto(page, "/account")
        page.wait_for_timeout(1800)
        card = page.locator("div.rounded-card", has_text="Course")
        account_href = (card.first.get_by_role("link").first.get_attribute("href")
                        if card.count() and card.first.get_by_role("link").count() else None)
        write_row(
            "FINDING 1 (contradictory direction) is impossible: Today, the Course route, the "
            "tutor's own line and the account overview all name the SAME activity",
            today["objective"] == course["objective"]
            and today["start_href"] == course["start_href"] == account_href,
            f'Today: "{today["objective"]}" -> {today["start_href"]} | '
            f'Course: "{course["objective"]}" -> {course["start_href"]} | '
            f'Account overview -> {account_href} | Mr EZ\'s line on the card: "{voice}"',
        )
        dual_shot(page, "a1-finding1-one-direction", "/account")
        report_diagnostics("Finding 1", errors, failed)
        context.close()

        # ── Finding 2: target-insensitive schedule ───────────────────────
        schedules = {}
        for label, target, writing_min, slug in (
                ("band 6.5 with a Writing minimum of 5.5", "6.5", "5.5", "low"),
                ("band 9.0 with a Writing minimum of 9.0", "9.0", "9.0", "high")):
            context = new_context(browser)
            prog, _ = synthetic_matching_headings()
            seed_context(context, progress=prog,
                         saved_plan=saved_plan(target_band=target, test_date=days_after(56),
                                               created_at="2026-07-01T09:00:00.000Z",
                                               daily_minutes=60, study_days="daily",
                                               defaulted=False,
                                               skill_targets={"writing": writing_min}))
            page = context.new_page()
            errs, fails = attach_diagnostics(page)
            goto(page, "/dashboard")
            page.wait_for_timeout(2200)
            v = today_view(page)
            sched = schedule_of(page)
            goals = page.evaluate(
                """() => { const k = Object.keys(localStorage).find((x) => x.startsWith('ielts.learning.plan.v1::'));
                           if (!k) return null; return JSON.parse(localStorage.getItem(k)).goals; }"""
            )
            schedules[label] = {"today": v["objective"], "kicker": v["kicker"],
                                "storedGoals": goals,
                                "schedule": [(d["date"], d["focus"]) for d in (sched or [])],
                                "activityIds": [d["ids"] for d in (sched or [])]}
            shot(page, f"a1-finding2-{slug}-target-desktop", "/dashboard")
            report_diagnostics(f"Finding 2 ({label})", errs, fails)
            context.close()
        low, high = list(schedules.values())
        write_note("**Finding 2, the two schedules:** " + json.dumps(schedules)[:2000])
        write_row(
            "The two different targets really were stored (so the comparison below is fair)",
            json.dumps(low["storedGoals"]) != json.dumps(high["storedGoals"]),
            f'stored goals at band 6.5 / Writing 5.5 = {json.dumps(low["storedGoals"])}; '
            f'at band 9.0 / Writing 9.0 = {json.dumps(high["storedGoals"])}',
        )
        # "schedule" here is only (date, one-line focus text) - the focus
        # SENTENCE can legitimately read the same on both plans (the same
        # question type is still the nearest weakness either way) while the
        # actual underlying activities scheduled for it differ, which is
        # real personalisation the old (date, focus)-only comparison could
        # not see. activityIds is the actual content the student would be
        # given, so it belongs in this check too.
        write_row(
            "FINDING 2 (target does not personalize the schedule) is impossible: changing the "
            "target and the per-paper minimum changes the schedule",
            low["schedule"] != high["schedule"] or low["today"] != high["today"]
            or low["activityIds"] != high["activityIds"],
            f'band 6.5 / Writing 5.5 -> today "{low["today"]}" ({low["kicker"]}), '
            f'{len(low["schedule"])} scheduled day(s); '
            f'band 9.0 / Writing 9.0 -> today "{high["today"]}" ({high["kicker"]}), '
            f'{len(high["schedule"])} scheduled day(s). Day-by-day focus identical='
            f'{low["schedule"] == high["schedule"]}; activity ids identical='
            f'{low["activityIds"] == high["activityIds"]}',
        )

        # ── Finding 3: the 255-minute day ────────────────────────────────
        context = new_context(browser)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)
        goto(page, "/plan-settings")
        page.wait_for_timeout(2000)
        page.locator(".intake-capsule", has_text="Band 7.0").first.click()
        page.locator("#intake-exam-date").fill(days_after(7))
        page.locator(".intake-capsule", has_text="15 minutes").first.click()
        page.wait_for_timeout(400)
        confirm = page.get_by_role("button", name="Yes, I can commit to this")
        if confirm.count():
            confirm.first.click()
        page.get_by_role("button", name="Save changes").first.click()
        page.wait_for_timeout(1600)
        goto(page, "/dashboard")
        page.wait_for_timeout(2000)
        sched = schedule_of(page) or []
        budgets = [d["budget"] for d in sched]
        worst = max(budgets) if budgets else None
        write_note("**Finding 3, every scheduled day in storage:** " + json.dumps(sched)[:1400])
        write_row(
            "FINDING 3 (a 255-minute day on a 15-minute budget) is impossible",
            worst is not None and worst <= 30,
            f"the plan stored {len(sched)} day(s) with budgets {budgets}; the largest is {worst} "
            "minutes against the 15 minutes the student chose (the audit reproduced 255)",
        )
        shot(page, "a1-finding3-no-overloaded-day-desktop", "/dashboard")
        report_diagnostics("Finding 3", errors, failed)
        context.close()

        # ── Finding 4: completion is not understanding ───────────────────
        context = new_context(browser)
        seed_context(context, progress=progress_v1(),
                     saved_plan=saved_plan(target_band="7.0", test_date=days_after(45),
                                           created_at="2026-08-01T09:00:00.000Z",
                                           daily_minutes=60, study_days="daily", defaulted=False))
        page = context.new_page()
        errors, failed = attach_diagnostics(page)
        goto(page, "/lessons/speaking")
        page.wait_for_timeout(2000)
        assert_on(page, "the Speaking Overview lesson", "/lessons/speaking", "Speaking Overview")
        btn = page.locator("#lesson-complete-btn")
        if btn.count():
            btn.first.scroll_into_view_if_needed()
            btn.first.click()
            page.wait_for_timeout(1400)
        record = read_record(page)
        events = [e for e in (record or {}).get("events") or []
                  if (e.get("activityId") or "").startswith("lesson:")]
        write_note("**Finding 4, what the completion click recorded:** "
                   + json.dumps([{k: e.get(k) for k in ("activityId", "mode", "completion",
                                                        "assistanceLevel", "items")}
                                 for e in events])[:800])
        modes = {e.get("mode") for e in events}
        write_row(
            "FINDING 4 (a completion click counting as understanding) is impossible: the click is "
            "recorded as studied, never as a measured result",
            bool(events) and "assessment" not in modes,
            f"the completion click produced {len(events)} event(s) with mode(s) {modes} and "
            f"{sum(len(e.get('items') or []) for e in events)} item outcome(s); an assessment "
            f"mode would mean it had been treated as a measurement",
        )
        goto(page, "/report")
        page.wait_for_timeout(2400)
        cards = skill_trend_cards(page)
        speaking = next((c for c in cards if c["paper"] == "Speaking"), {})
        body = page.inner_text("body").lower()
        write_row(
            "And the report claims no Speaking ability from that click",
            "unknown" in (speaking.get("certainty") or "").lower()
            and "master" not in body,
            f'the Speaking panel after clicking the completion button: {json.dumps(speaking)}',
        )
        dual_shot(page, "a1-finding4-completion-is-studied-not-measured", "/report")
        report_diagnostics("Finding 4", errors, failed)
        context.close()

        # ── Finding 5: expired plan read as finished ─────────────────────
        context = new_context(browser)
        exp_progress, exp_plan = synthetic_expired()
        seed_context(context, progress=exp_progress, saved_plan=exp_plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)
        goto(page, "/dashboard")
        page.wait_for_timeout(2200)
        assert_on(page, "Today on an expired plan", "/dashboard", "", "#today-heading")
        v = today_view(page)
        stored = page.evaluate(
            """() => {
                const key = Object.keys(localStorage).find((k) => k.startsWith('ielts.learning.plan.v1::'));
                if (!key) return null;
                const plan = JSON.parse(localStorage.getItem(key));
                return { status: plan.status, confirmed: plan.confirmed,
                         examDate: plan.goals && plan.goals.examDate };
            }"""
        )
        celebration = page.get_by_text("\U0001F389")
        link = page.get_by_role("link", name=re.compile("new date|set a new", re.I))
        write_note("**Finding 5, the stored plan status on an expired date:** " + json.dumps(stored))
        write_row(
            "FINDING 5 (an expired plan reading as finished) is impossible: the plan reports the "
            "date has passed and asks for a new one, and never reports completion",
            v["finished_count"] == 0 and celebration.count() == 0
            and "done" not in (v["heading"] or "").lower()
            and (stored or {}).get("status") != "complete",
            f'heading="{v["heading"]}", .today-finished={v["finished_count"]}, '
            f'celebration emoji={celebration.count()}, stored plan status='
            f'"{(stored or {}).get("status")}", a "set a new date" link is offered='
            f'{link.count() > 0}',
        )
        dual_shot(page, "a1-finding5-expired-is-not-complete", "/dashboard")
        report_diagnostics("Finding 5", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
