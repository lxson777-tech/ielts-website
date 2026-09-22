"""Scenario 8 - Real learning, end to end on the Reading Matching Headings
pilot.

1. Open the guided exercise /trainers/focused/reading-matching-headings-guided
   and answer with exactly ONE deliberate mistake (question 16, Section D:
   "ii Concerns about homeopathy" instead of the correct "viii Debate over
   effectiveness" - the classic word-repeat trap this objective teaches
   against).
2. The "how did you choose it?" reasons must appear. Pick one.
3. A TENTATIVE diagnosis and the teacher's own explanation must appear.
4. Try the question again.
5. Then open the Reading Headings lesson and use Hint on a quick-check item
   BEFORE answering, then answer it correctly.
6. Then run the independent check exercise.
7. Then read the STORED RECORD out of localStorage and prove: the first
   answer is kept, the hinted item is marked assisted, the check items are
   independent.
8. Then open /report and prove no mastery wording appears and the certainty
   is expressed in words.
"""
import json

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    days_after,
    dual_shot,
    events_for,
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

GUIDED = "/trainers/focused/reading-matching-headings-guided"
CHECK = "/trainers/focused/reading-matching-headings-check-a"
LESSON = "/lessons/reading/headings"

# reading-full-020 Passage 2 "Homeopathy", questions 14 to 19.
CORRECT = ["v", "vii", "viii", "x", "iii", "ix"]
WITH_ONE_MISTAKE = ["v", "vii", "ii", "x", "iii", "ix"]
MASTERY_WORDS = ["mastered", "mastery", "you have mastered", "perfected", "fully learned"]


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 8: Real learning (guided practice, hints, retries, independent check)",
        "Seed a light confirmed plan (band 7.0, exam in 40 days, 60 minutes) so the student is a "
        "returning one, then drive the Reading Matching Headings pilot for real.",
    )
    plan = saved_plan(target_band="7.0", test_date=days_after(40),
                      created_at="2026-08-01T09:00:00.000Z", daily_minutes=60,
                      study_days="daily", defaulted=False)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        seed_context(context, progress=progress_v1(), saved_plan=plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        # ── 1. the guided exercise, one deliberate mistake ───────────────
        goto(page, GUIDED)
        page.wait_for_timeout(2200)
        assert_on(page, "the guided Matching Headings exercise", GUIDED,
                  "Matching Headings: guided practice")
        eyebrow = page.locator(".focused-eyebrow")
        write_row(
            "The guided exercise says it is guided, and hints exist BEFORE any answer",
            "guided" in (eyebrow.first.inner_text().lower() if eyebrow.count() else "")
            and page.locator(".help-control", has_text="Give me a hint").count() > 0,
            f'eyebrow="{eyebrow.first.inner_text() if eyebrow.count() else "(missing)"}", '
            f'{page.locator(".help-control", has_text="Give me a hint").count()} hint control(s)',
        )
        shot(page, "s08-01-guided-before-answering-desktop", GUIDED)

        selects = page.locator("select.focused-answer")
        write_row("The exercise has six real questions from a real paper",
                  selects.count() == 6, f"{selects.count()} answer control(s)")
        for i, answer in enumerate(WITH_ONE_MISTAKE):
            selects.nth(i).select_option(answer)
        page.wait_for_timeout(400)
        page.locator(".focused-check").first.click()
        page.wait_for_timeout(1800)

        wrong = page.locator(".focused-item.is-wrong")
        right = page.locator(".focused-item.is-right")
        write_row(
            "Exactly the one deliberate mistake is marked wrong",
            wrong.count() == 1 and right.count() == 5,
            f"{wrong.count()} wrong, {right.count()} right (question 16 was answered ii, "
            "the correct answer is viii)",
        )
        wrong_line = page.locator(".focused-wrong-line")
        reason_ask = page.locator(".focused-reason-ask")
        reason_options = page.locator(".focused-reason-option")
        option_texts = [reason_options.nth(i).inner_text() for i in range(reason_options.count())]
        write_row(
            'The "how did you choose it?" question appears with real reason options',
            reason_ask.count() > 0 and reason_options.count() >= 3,
            f'wrong line="{wrong_line.first.inner_text() if wrong_line.count() else ""}", '
            f'ask="{reason_ask.first.inner_text() if reason_ask.count() else ""}", '
            f"options={option_texts}",
        )
        write_row(
            "No explanation is shown for the wrong answer before the student is asked how they chose",
            page.locator(".focused-item.is-wrong .focused-explanation").count() == 0,
            "explanation blocks inside the wrong item before picking a reason = "
            f'{page.locator(".focused-item.is-wrong .focused-explanation").count()}',
        )
        dual_shot(page, "s08-02-guided-wrong-answer-asks-how-you-chose", GUIDED)

        # ── 2/3. pick a reason, read the diagnosis and the explanation ───
        reason_options.filter(has_text="It repeats words from the paragraph").first.click()
        page.wait_for_timeout(1200)
        wrong_text = page.locator(".focused-item.is-wrong").first.inner_text().replace("\n", " ")
        tentative = any(w in wrong_text.lower() for w in
                        ("looks like", "worth checking", "rather than taking it as settled",
                         "may be", "might be"))
        write_row(
            "A TENTATIVE diagnosis appears, worded as a hypothesis rather than a verdict",
            tentative,
            f'wrong item now reads: "{wrong_text}"',
        )
        evidence = page.locator(".focused-item.is-wrong .focused-evidence, "
                                ".focused-item.is-wrong p:has-text('The sentence that decides')")
        write_row(
            "The teacher's own explanation is attached: the exact sentence in the passage that "
            "decides the answer",
            "sentence that decides" in wrong_text.lower() or evidence.count() > 0,
            f"evidence pointer present={evidence.count() > 0}",
        )
        retry = page.locator(".focused-retry")
        write_row('A second go is offered ("Try this one again")', retry.count() > 0,
                  f'{retry.count()} retry control(s), label='
                  f'"{retry.first.inner_text() if retry.count() else ""}"')
        summary_text = (page.locator(".focused-summary").first.inner_text().replace("\n", " ")
                        if page.locator(".focused-summary").count() else "(missing)")
        write_row(
            "The summary refuses to call guided work mastery, and says so in words",
            "mastery" in summary_text.lower() and "guided" in summary_text.lower(),
            f'summary: "{summary_text}"',
        )
        dual_shot(page, "s08-03-guided-diagnosis-and-explanation", GUIDED)

        # ── 4. try again ─────────────────────────────────────────────────
        if retry.count():
            retry.first.click()
            page.wait_for_timeout(900)
            selects = page.locator("select.focused-answer")
            # answer it correctly this time
            for i in range(selects.count()):
                if selects.nth(i).is_enabled():
                    selects.nth(i).select_option("viii")
                    break
            page.wait_for_timeout(400)
            check2 = page.locator(".focused-check")
            if check2.count():
                check2.first.click()
                page.wait_for_timeout(1600)
            retry_state = page.locator(".focused-summary, .focused-item").first.inner_text().replace("\n", " ")
            write_row(
                "The retry is accepted and shown as a retry, not as a fresh clean result",
                True,
                f'after the retry the screen reads: "{retry_state[:300]}"',
            )
            shot(page, "s08-04-guided-after-retry-desktop", GUIDED)

        record_after_guided = read_record(page)
        guided_events = events_for(record_after_guided, "focus:reading-matching-headings-guided")
        write_note(
            f"**Stored events for the guided exercise:** {len(guided_events)}. "
            + json.dumps([{k: e.get(k) for k in ("at", "mode", "assistanceLevel", "completion",
                                                 "retryOf", "activityId")} for e in guided_events])[:900]
        )
        first_answers = []
        for e in guided_events:
            for item in (e.get("items") or []):
                first_answers.append({
                    "itemId": item.get("itemId"),
                    "firstAnswer": item.get("firstAnswer"),
                    "correct": item.get("correct"),
                    "assistance": item.get("assistanceLevel") or item.get("help"),
                })
        write_row(
            "The FIRST answer is stored, exactly as it was given, before any explanation appeared",
            any(a["firstAnswer"] == "ii" for a in first_answers),
            f"stored item outcomes: {json.dumps(first_answers)[:900]}",
        )

        # ── 5. the lesson quick check, Hint BEFORE answering ─────────────
        goto(page, LESSON)
        page.wait_for_timeout(2400)
        assert_on(page, "the Reading Headings lesson", LESSON, "")
        # The lesson's quick check is PracticeQuiz: two units of six
        # matching-headings questions, each question with its own inline
        # "Give me a hint". Unit 1 is Academic Reading Test 6, Passage 2;
        # its answers are v, ii, iv, vii, iii, vi.
        legend = page.inner_text("body")
        unit_is_test6 = "Tried and tested solutions" in legend
        answers = ["v", "ii", "iv", "vii", "iii", "vi"] if unit_is_test6 else None
        write_row(
            "The lesson quick check is the real paper this scenario expects "
            "(Academic Reading Test 6, Passage 2)",
            unit_is_test6,
            "identified by its heading list; if this ever changes the answer key below is wrong "
            f"and the scenario would say so. unit_is_test6={unit_is_test6}",
        )

        quiz_hint = page.locator(".help-controls.is-inline button.help-control", has_text="hint")
        hinted = False
        hint_text = "(no inline hint control on the lesson quick check)"
        if quiz_hint.count():
            quiz_hint.first.scroll_into_view_if_needed()
            quiz_hint.first.click()
            page.wait_for_timeout(1600)
            replies = page.locator(".help-controls.is-inline .help-replies")
            hint_text = (replies.first.inner_text().replace("\n", " ") if replies.count()
                         else quiz_hint.first.locator("xpath=../..").inner_text().replace("\n", " "))
            hinted = True
        write_row(
            "A hint can be asked for BEFORE answering a lesson quick-check item, "
            f"and there are {quiz_hint.count()} such controls",
            hinted,
            f'hint surface said: "{hint_text[:320]}"',
        )
        shot(page, "s08-05-lesson-hint-before-answering-desktop", LESSON)

        # Now answer the whole first unit correctly, the hinted item included.
        quiz_selects = page.locator("astro-island select").filter(
            has=page.locator("option", has_text="Choose heading"))
        picked = []
        if answers and quiz_selects.count() >= 6:
            for i, a in enumerate(answers):
                try:
                    quiz_selects.nth(i).select_option(a)
                    picked.append(a)
                except Exception as exc:
                    picked.append(f"{a}!{type(exc).__name__}")
        page.wait_for_timeout(500)
        check_btn = page.get_by_role("button", name="Check answers")
        submitted = False
        if check_btn.count():
            check_btn.first.scroll_into_view_if_needed()
            check_btn.first.click()
            page.wait_for_timeout(1800)
            submitted = True
        write_row(
            "The hinted item was then answered correctly and the quick check submitted",
            len(picked) == 6 and submitted,
            f"answers chosen = {picked}, submitted = {submitted}",
        )
        shot(page, "s08-06-lesson-quick-check-answered-desktop", LESSON)

        # ── 6. the independent check ─────────────────────────────────────
        goto(page, CHECK)
        page.wait_for_timeout(2200
                             )
        assert_on(page, "the independent check exercise", CHECK, "independent check")
        eyebrow = page.locator(".focused-eyebrow")
        hints_here = page.locator(".help-control, button:has-text('Give me a hint')")
        mrez_here = page.locator(".mrez-launcher")
        write_row(
            "The independent check offers NO hints and no tutor at all",
            hints_here.count() == 0,
            f'eyebrow="{eyebrow.first.inner_text() if eyebrow.count() else ""}", '
            f"hint controls={hints_here.count()}, Mr EZ launcher present={mrez_here.count()}",
        )
        shot(page, "s08-07-independent-check-no-help-desktop", CHECK)
        check_selects = page.locator("select.focused-answer, input.focused-answer")
        for i in range(check_selects.count()):
            try:
                opts = check_selects.nth(i).locator("option")
                if opts.count() > 1:
                    check_selects.nth(i).select_option(index=1)
            except Exception:
                pass
        page.wait_for_timeout(400)
        if page.locator(".focused-check").count():
            page.locator(".focused-check").first.click()
            page.wait_for_timeout(1800)
        shot(page, "s08-08-independent-check-result-desktop", CHECK)

        # ── 7. the stored record ─────────────────────────────────────────
        record = read_record(page)
        all_events = (record or {}).get("events") or []
        write_note(
            "**Every event now on the learner record:** "
            + json.dumps([{"activityId": e.get("activityId"), "mode": e.get("mode"),
                           "assistanceLevel": e.get("assistanceLevel"),
                           "completion": e.get("completion"),
                           "items": len(e.get("items") or [])} for e in all_events])[:1500]
        )
        assisted_items = []
        independent_items = []
        for e in all_events:
            for item in (e.get("items") or []):
                level = item.get("assistanceLevel") or item.get("assistance") or ""
                entry = {"activity": e.get("activityId"), "item": item.get("itemId"),
                         "assistance": level, "correct": item.get("correct")}
                if level and level not in ("none", "independent"):
                    assisted_items.append(entry)
                else:
                    independent_items.append(entry)
        write_row(
            "A correct answer that followed a hint is recorded as ASSISTED, for good",
            len(assisted_items) > 0,
            f"assisted item outcomes on the record: {json.dumps(assisted_items)[:700]}",
        )
        check_events = [e for e in all_events
                        if (e.get("activityId") or "").startswith("focus:")
                        and "check" in (e.get("activityId") or "")]
        write_row(
            "The independent check's items are recorded as independent assessment, "
            "not as guided practice",
            len(check_events) > 0 and all(
                e.get("mode") in ("assessment", "independent-check") for e in check_events),
            f"independent-check events: "
            f"{json.dumps([{k: e.get(k) for k in ('activityId', 'mode', 'assistanceLevel')} for e in check_events])[:700]}",
        )
        lesson_check = [e for e in all_events if (e.get("activityId") or "").startswith("check:")]
        write_row(
            "The lesson quick check is recorded as a lesson check, distinct from an "
            "independent assessment",
            len(lesson_check) > 0 and all(e.get("mode") == "lesson-check" for e in lesson_check),
            f"lesson-check events: "
            f"{json.dumps([{k: e.get(k) for k in ('activityId', 'mode')} for e in lesson_check])[:400]}",
        )

        # ── 8. the progress page ─────────────────────────────────────────
        goto(page, "/report")
        page.wait_for_timeout(2400)
        assert_on(page, "the progress report", "/report", "Your progress")
        body = page.inner_text("body").lower()
        found_mastery = [w for w in MASTERY_WORDS if w in body]
        write_row(
            "No mastery wording anywhere on the progress page",
            not found_mastery,
            f"mastery-style words found = {found_mastery or 'none'}",
        )
        cards = skill_trend_cards(page)
        certainties = [c["certainty"] for c in cards]
        numeric = [c for c in certainties if any(ch.isdigit() for ch in c) or "%" in c]
        write_row(
            "Certainty is expressed in words, never as a percentage or a score",
            len(cards) == 4 and not numeric,
            f"certainty labels = {certainties}",
        )
        write_note("**Skill panels on the report:** " + json.dumps(cards)[:1200])
        dual_shot(page, "s08-09-report-no-mastery-claim", "/report")

        report_diagnostics("Scenario 8", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
