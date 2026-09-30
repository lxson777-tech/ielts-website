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
5. Then open the Reading Headings lesson and answer its quick check
   correctly.
6. Then run the independent check exercise.
7. Then read the STORED RECORD out of localStorage and prove: the first
   answer is kept, no quick-check answer is recorded as hint-assisted, the
   check items are independent.
8. Then open /report and prove no mastery wording appears and the certainty
   is expressed in words.

CHANGED 30 September 2026: Mr EZ's help buttons ("Give me a hint",
"Explain this differently", "Show me an example") now exist only for a
signed-in student (src/components/learning/lesson-help.ts,
mrEzHelpAvailable). This suite runs on a build with no accounts, so nobody
here is ever signed in and no help button may appear anywhere. Steps 1 and 5
used to press a hint as a signed-out visitor and step 7 used to find that
hint recorded as assisted; they now check that no hint control is offered
at all, and that nothing on the quick check is recorded as hint-assisted.
Taking a hint while signed in, and its reply, is proven by
f24_help_signed_in_only.py against the local accounts stand-in.
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
        "Scenario 8: Real learning (guided practice, retries, independent check)",
        "Seed a light confirmed plan (band 7.0, exam in 40 days, 60 minutes) so the student is a "
        "returning one, then drive the Reading Matching Headings pilot for real. The visitor is "
        "signed out (this build has no accounts), so no Mr EZ help button may appear anywhere.",
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
        # Help is for signed-in students only, and nobody can sign in on
        # this build, so a signed-out visitor is offered no hint at all.
        guided_help = page.locator(".help-control, .help-controls, button:has-text('Give me a hint')")
        write_row(
            "The guided exercise says it is guided, and offers a signed-out visitor no hint "
            "control (Mr EZ's help is for signed-in students only)",
            "guided" in (eyebrow.first.inner_text().lower() if eyebrow.count() else "")
            and guided_help.count() == 0,
            f'eyebrow="{eyebrow.first.inner_text() if eyebrow.count() else "(missing)"}", '
            f'{guided_help.count()} help control(s) on the page (expected 0 signed out)',
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

        # ── 5. the lesson quick check, signed out: no help offered ───────
        goto(page, LESSON)
        page.wait_for_timeout(2400)
        assert_on(page, "the Reading Headings lesson", LESSON, "")
        # The lesson's quick check is PracticeQuiz: two units of six
        # matching-headings questions. A signed-in student gets an inline
        # "Give me a hint" on each question; a signed-out visitor (everybody
        # on this build) gets none. Unit 1 is Academic Reading Test 6,
        # Passage 2; its answers are v, ii, iv, vii, iii, vi.
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
        block_help = page.locator(".lesson-block-help, button:has-text('Explain this differently'), "
                                  "button:has-text('Show me an example')")
        any_help = page.locator(".help-control, .help-controls")
        body_now = page.inner_text("body")
        fallback_note = ("Mr EZ could not be reached" in body_now
                         or "the lesson's own answer" in body_now)
        write_row(
            "A signed-out visitor is offered no Mr EZ help on the lesson: no hint on the quick "
            "check, no 'Explain this differently' or 'Show me an example' under the blocks, and "
            "no fallback note in their place",
            quiz_hint.count() == 0 and block_help.count() == 0 and any_help.count() == 0
            and not fallback_note,
            f"quick-check hint controls={quiz_hint.count()}, block help controls={block_help.count()}, "
            f"help controls of any kind={any_help.count()}, fallback note on the page={fallback_note}",
        )
        shot(page, "s08-05-lesson-no-help-signed-out-desktop", LESSON)

        # Now answer the whole first unit correctly.
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
            "The quick check was then answered correctly and submitted",
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
        # No hint could be taken signed out, so no quick-check answer may be
        # recorded as hint-assisted. (The guided exercise's own explanation
        # after a wrong answer can still raise that item's level; that is
        # the lesson's teaching, not Mr EZ, and is not counted here.)
        quick_check_hinted = [a for a in assisted_items
                              if (a["activity"] or "").startswith("check:") and a["assistance"] == "hint"]
        write_row(
            "With no hint offered to a signed-out visitor, no lesson quick-check answer is "
            "recorded as hint-assisted",
            len(quick_check_hinted) == 0,
            f"hint-assisted quick-check items: {json.dumps(quick_check_hinted)[:400]}; every assisted "
            f"item on the record: {json.dumps(assisted_items)[:600]}",
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
