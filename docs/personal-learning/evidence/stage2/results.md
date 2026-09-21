# Stage 2 personal-learning browser evidence

Run against http://127.0.0.1:4331/ielts-website on 2026-09-22. Every scenario opened a
fresh browser context and seeded its own labelled SYNTHETIC data (old-store
`ielts.progress.v1` / `ielts.studyplan.v1`, letting the site's own migration run) or
started from genuinely empty storage.

**Environment note (read this first):** partway through this session another builder
began editing files under `src/` while these scripts were still running against the
live dev server on port 4331. Astro/Vite hot-reloads the page on every save, which
remounts React islands and silently resets their state (confirmed independently by
the lead). One screenshot proves this directly: `s1-05-intake-step3-studydays-desktop.png`
is named "step 3" but its own progress bar and heading show it is actually still on
**step 2** ("When is your exam?") - the wizard was reset between the "Next" click and
the check, not a selector bug. All FAILs below that fit this pattern are bucketed as
UNRELIABLE, not treated as product defects. `helpers.BASE_URL` now reads
`IELTS_BASE_URL` so this suite can be rerun against a frozen snapshot later.

## A. CONFIDENT results

| Scenario | Check | Result |
|---|---|---|
| S1 | Intake offered on first visit, no invented goal, all 4 papers "Not yet assessed" | PASS |
| S1 | "Answer later" reaches a provisional active session (not forced into intake) | PASS |
| S1 | Deferral is not persisted; intake is asked again on reload | PASS |
| S1 | Step 1 (band) and Step 2 (exam date) render and accept input correctly | PASS |
| S1 | 60 minutes preselected, labelled "Your teacher's recommendation", confirm-availability flow works | PASS (seen consistently pre-hot-reload) |
| S1 | **DEFECT**: after "Save my plan", the "Your plan is saved" confirmation + outcome panel + explicit Continue button never renders, not even for one frame | FAIL, confirmed by polling every 60ms post-click in an isolated, non-hot-reloaded run. Root cause: `TodaySession`'s `onPersonalPlanChange` listener fires synchronously inside `Intake.save()` and re-renders the parent with `screen='active'` first, unmounting `<Intake>` before its own `justSaved` state can paint. Repro: fresh storage -> `/dashboard` -> complete intake -> click "Save my plan". Student lands straight on the full Today session; the confirmation screen is effectively dead code. |
| S1 | End state (post-intake): Today shows one objective, a reason (via "Why this"), time <=60 min, a step list, exactly one Start button | PASS |
| S2 | 60 min persists across reload, on Course ("Your route"), and on plan settings; "I have less time today" -> 15 shrinks Today, keeps the regular-day note, persists across reload, and plan settings still shows 60 | ALL PASS |
| S3 | An explicit 25 min/defaulted=false plan is kept as-is; 60 appears only as an advisory hint; no forced intake | ALL PASS |
| S4 | Today, Course "Your route", and the Account overview page all name the exact same session (same objective text, same href) | PASS |
| S4 | A lesson opened directly from the library, unrelated to the active session, shows "Back to today's session" -> /dashboard rather than inventing a competing next step | PASS |
| S4 | Account menu (workspace avatar) is a static link list with no dynamic next-step claim; Progress report makes no next-activity claim either - neither can contradict Today by construction | Observed, not a defect |
| S4 | Worth a product read (not pass/fail): with the audit's Matching-Headings profile seeded (confirmed Band 7, 2 Reading papers at 1/8 Matching Headings each), Today recommended a Listening session over the demonstrated Reading weakness, citing spaced review. May be intentional (closing unknowns/due review first) - flag for Alex's judgement. | Note |
| S5 | Expired exam date asks for a new date/goal, never shows completion/celebration | PASS |
| S6 | 7-day/15-min plan produces an honest "will not fit" statement; every day in the rolling schedule showed exactly 15 min, no overload, no "255 minute" bug | PASS. Minor: the outcome sentence is a long, comma-less run-on listing every dropped activity - reads clunky, worth a copy pass. |
| S7 | Today's objective/first-step/href identical across 5 reloads and a navigate-away-and-back | PASS |
| S8 | Russian interface: nav tabs, Start button, and the TEACH/PRACTISE/etc. role labels all translate; no horizontal scroll at 390px on Today or Course | PASS |
| S8 | **DEFECT**: the step "purpose" sentences (the text under each role label, e.g. "Start with what this question type actually asks you for.") stay in English in the Russian view. This is separate from the pre-excused objective/reason sentences and was not called out as known - a real, deterministic i18n gap. | FAIL |
| S8 | Screenshot note: the sticky header and floating "Ask Mr EZ" button appear twice in the full-page screenshot - a stitching artifact of their fixed CSS position, not a live bug | Note |
| S9 | Tab order reaches Start, Why this, I have less time today, Choose another skill, every stop shows a visible focus ring; "Why this" activates with Enter | PASS |

## B. UNRELIABLE (hot-reload artifact, not a product finding)

- S1: Steps 3-6 of the intake (study days, 60-min preselection re-check, confirm prompt,
  language, Save my plan) all read as "not found" in the runs affected - proven caused by
  a mid-flow reset back to step 2 (see `s1-05-intake-step3-studydays-desktop.png`), not a
  broken selector. The mechanism was independently verified working pre-reset (row above).
- S4: "a step ticked done, button reads Continue" after completing the first step - the
  href itself correctly advanced across runs (proving storage was written correctly); the
  visible tick/label lagged only in runs carrying `504 Outdated Optimize Dep` console errors.
- S9: Space-key activation of "I have less time today" and the final reduced-motion render
  check - both failed only alongside a burst of aborted resource loads (the reload
  signature). Enter-key activation on the same page, moments earlier, worked.

## C. Script problems found

None confirmed. Every selector that looked broken was verified correct via a matching
screenshot or an isolated clean rerun before this report was written (see bucket B).

## Most informative screenshots

1. `s1-05-intake-step3-studydays-desktop.png` - proves the hot-reload reset (mislabelled by definition)
2. `s1-11-today-result-desktop.png` - clean post-intake Today (one objective, one Start button)
3. `s4-01-today-before-desktop.png` / `s4-08-today-after-desktop.png` - the cross-surface consistency evidence
4. `s5-01-expired-exam-date-desktop.png` - expired-date handling, no celebration
5. `s6-03-course-rolling-schedule-desktop.png` - the 7-day/15-min schedule, no overload
6. `s8-01-today-ru-phone.png` - Russian phone view, shows both the translated UI and the step-purpose leak
