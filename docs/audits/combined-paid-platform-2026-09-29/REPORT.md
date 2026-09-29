# Combined paid-platform audit

29 September 2026. Local worktree `musing-mcclintock-862665`, branch `claude/paid-platform-readiness-03c113`, inspected from commit `1a4c930`. No product code changed.

## Verdict

This is a substantial learning product, close to a useful supervised pilot, but it is not ready to take money. The lessons, account journey, trial controls, practice results and placement flow largely work in the local checks, and the calm workspace already looks credible. The three priorities are **finish the complete purchase-to-access journey**, **make every trial button and promise match what the student actually receives**, and **add the trust and accessibility basics needed by a paying customer**. The clearest unexpected bug is that the main Reading button on Tests can send a new trial student to a locked paper while their included test is still unused. Preserve the working content and approved visual direction; this needs a focused readiness pass, not a redesign from scratch.

## What the evidence establishes

- Trial site: `http://localhost:4481/ielts-website`, simulated backend on port 8881.
- Open site, used as the paying-student stand-in: `http://localhost:4482/ielts-website`, simulated backend on port 8882. This is not a real subscription account or a demonstrated paid entitlement.
- Desktop viewport: **1440 x 900**. Phone viewport: **390 x 844**. Chromium, with separate mobile/touch contexts in the returning-student and full-test checks. This was not a physical-phone or Safari test.
- English and Russian were inspected across the public pages, trial pages, included lessons and test entry screens, locked screens, ended trial, and open workspace. The sales page remains English when Russian is selected elsewhere.
- The broad page pass contains **277 distinct page/state captures**. Extra screenshots cover completed tests, result reviews, returning accounts, actual writing drafts, keyboard behavior and lessons scrolled through to the bottom. See [COVERAGE.md](COVERAGE.md) for individual routes and screenshot links.
- Final automated runs: **2,234/2,234 unit tests**, **89/89 trial journey checks**, **42/42 placement checks**, and **66/66 goal-question checks** passed. The browser suites were copied/adapted in the auditor's temporary folder only to redirect evidence into this audit folder and use the local servers. See [EVIDENCE.md](EVIDENCE.md).
- The trial journey exercised the real local access checks with synthetic accounts: lesson gates, Reading submission and refresh, message exhaustion and retries, Writing failure then simulated grade, simulated Speaking interview and grade, separate accounts, a fresh device and expiry. An additional browser pass submitted the included Listening test.
- The open full Reading test and a Reading drill were started, submitted and reviewed at both widths in both languages. Synthetic answers deliberately produced low scores; these are interface checks, not assessment calibration.
- The broad page pass recorded **no uncaught page errors**. The known local `is_admin` 404 was excluded. The content gate's 403 responses on deliberately locked or expired pages were expected refusals, not missing content. Media requests cancelled during navigation were not counted as playback failures.

### Limits of this audit

All AI replies and grades were simulated. No conclusion here establishes real AI quality, pronunciation accuracy, live voice reliability, production account security, deliverability of password emails, payment behavior or paid access enforcement. The open stand-in intentionally has its graders and live examiner unconfigured: its disabled Speaking entry was inspected, but its real recording/voice flow was not exercised. The trial's simulated voice peer did exercise the interview and results interface. Placement completed Listening and Reading and honestly reported Writing and Speaking as unassessed when their services were unavailable.

The four viewport/language combinations cover page presentation and the returning/full-test flows. The longer failure, allowance and simulated voice journeys were exercised chiefly in desktop English, with selected phone and Russian states, rather than four independent repetitions of every backend failure. No Lighthouse performance scores, full contrast census, screen-reader session, production build/content-leak scan or comprehensive security audit are claimed.

To respect the read-only boundary, development-server generated files were placed in a temporary runtime root. Its stylesheet scanner was explicitly pointed back at the original source. An early setup error omitted utility styles; those affected browser runs were repeated after correction and are not product findings. The final report uses corrected evidence. Full-document screenshots taken before scrolling can show unrevealed lower sections; the `scrolled-*` images show the lesson content after actually scrolling through it.

## Ranked findings

P0 means it blocks taking money. P1 means it materially hurts completion, conversion, accessibility or trust. P2 means a smaller defect or refinement. These are audit priorities, not a claim that every item is newly introduced by this branch.

### F01. P0: Buying access does not yet produce a paying student

**What a student sees:** Both advertised plans have unavailable purchase buttons. After finishing the trial, the student is invited to View plans, but cannot proceed. Account has personal details and results, but no paid-plan status, access-end date or purchase history.

**Where:** Trial `/plans`, sales pricing, ended `/dashboard`; open `/account`. Both widths and languages. [Plans](screenshots/trial-en-1440-plans.png), [Russian phone plans](screenshots/trial-ru-390-plans.png), [ended trial](trial-journey/t13-dashboard-ended.png), [Account](screenshots/open-en-1440-account.png).

**Why it matters:** This is the expected, explicitly disclosed unfinished part, not a deceptive checkout. Nevertheless, a functioning payment button alone will not make the product sellable. A successful purchase must unlock the right account and remain correct after refresh, sign-in on another device, expiry and refunds.

**Recommended change:** Build purchase, confirmation, account-owned paid access, receipt/history, access-end messaging and recovery from interrupted purchases as one batch. Keep the current honest unavailable state until the whole chain works. The open build must not become the way to grant individual subscriptions.

**For builders:** `src/components/trial/TrialPlans.tsx`, `src/components/home/TrialPricing.astro`, `src/components/AccountSettings.tsx`, `src/lib/trial/status.ts`, `src/lib/trial/gate.ts`, and the content/AI workers. **Code-only observation:** the inspected trial status is `none | active | ended`; it is not a paid-subscription state. Extend server-owned access rather than treating the browser's global open/trial setting as proof of purchase. Test payment replay, cancellation/failure, correct-account unlock, expiry and retained results before any release.

### F02. P1: The main test button can lead to a locked test despite unused trial access

**What a student sees:** From Tests, clicking **Start a test** opened **Academic Reading Test 29**, followed by **Available with full access**. The same new account still had its included Reading test available. Today's direct link to Academic Reading Test 1 was correct.

**Where:** Trial `/tests` to `/tests/reading-full-029`, desktop English. The general Tests presentation also appears at both widths in Russian. [Actual destination](screenshots/target-trial-primary-reading.png), [Tests page](screenshots/trial-en-1440-tests.png). The selected locked paper can vary because this is a rotating picker.

**Why it matters:** A normal next step looks like a bait-and-switch. The student can reasonably conclude that the advertised free test is not actually free.

**Recommended change:** Make the main Reading and Listening actions use the student's trial entitlement. Open the included paper, resume its existing sitting, or show its used/ended state. Do not rotate a trial account through the paid bank. Checkpoint links need the same treatment.

**For builders:** `src/pages/tests/index.astro`, particularly `initRotation()` and its `nextInRotation()` call, plus `src/lib/trial/offer.ts` and `src/lib/trial/status.ts`. The current picker receives the full list. Reuse the allowance and state logic already working in `TrialHome`. Browser acceptance: a fresh trial, a refreshed unfinished test, a submitted test and an expired trial must each get the right destination and wording.

### F03. P1: Several surfaces describe more access than this trial provides

**What a student sees:** Trial Tests advertises 40 rotating Reading exams, Task 1 and Task 2 choices, a different Writing prompt each attempt, and a full three-part Speaking interview. Practice offers trainer buttons without an advance lock indication. The sales FAQ says the trial includes a **full test in each section**, although Speaking is Part 1 only. Score-history copy says **no account needed**, while this trial requires one. The open trainer pages also retain **free** wording that would be wrong if used unchanged for paying students.

**Where:** Trial `/tests`, `/trainers`, sales FAQ; open `/trainers/writing` and `/trainers/speaking`. Both widths and languages, except the English-only sales page. [Russian Tests](screenshots/trial-ru-1440-tests.png), [Practice lock after clicking](screenshots/target-trial-practice-locked.png), [expanded sales FAQ](screenshots/trial-en-1440-sales-expanded.png), [Writing entry](screenshots/open-en-1440-trainers-writing.png).

**Why it matters:** The limits themselves are settled and sensible to keep. The problem is discovering them only after an attractive button or a broader promise. The sales pricing bullets also make it easy to read the full product's features as the exact trial contents.

**Recommended change:** Present a consistent trial summary everywhere: three days, one selected lesson and one test per section, one Writing Task 2 essay, Speaking Part 1 for about five minutes, five Mr EZ messages per section, and no card. Label other material as full-access content before the click and offer a useful included alternative. Mark the course as Academic IELTS before account creation. Replace stale free/no-account copy with wording appropriate to the student's access state.

**For builders:** `src/pages/tests/index.astro`, `src/pages/trainers/index.astro`, the trainer page history headings, `src/components/home/NextChapter.astro`, `TrialPricing.astro`, and `src/lib/trial/offer.ts`. Derive descriptions and destinations from the same offer used by the gate. Do not change the agreed trial allowances.

### F04. P1: The site asks for personal information before establishing who is responsible for it

**What a student sees:** Sign-up leads to a mandatory profile asking for name, birth date, phone, city, school/university/job and referral source. The explanation mentions teachers and “the centre”, but the student is not given an identifiable operator, a data-use explanation or an obvious human contact. Help is a useful FAQ, with no way to report a problem. There are no visible privacy, terms or refund links on the inspected entry, pricing, Help or account surfaces.

**Where:** `/sign-up`, `/profile`, `/help`, `/account`, sales footer and `/plans`, both widths and languages. [Phone profile](screenshots/trial-en-390-profile.png), [Russian profile](screenshots/trial-ru-390-profile.png), [Help](screenshots/open-en-1440-help.png), [sales footer](screenshots/trial-en-1440-sales-bottom.png).

**Why it matters:** A new customer is being asked to trust an unnamed centre with contact details, essays and potentially recordings. When something fails, an FAQ and AI tutor are not a replacement for a reachable person. This is a product trust/readiness finding, not a determination of legal compliance.

**Recommended change:** Name the operator and publish a real support route. Explain why the required profile fields are needed, how essays and recordings are handled, retention/deletion, and where students can request help. Put clear purchase/refund/access-expiry terms beside the plans before enabling purchase. Preserve the required profile flow unless Alex changes that requirement; make its purpose and progress clear instead of silently removing fields.

**For builders:** `src/components/auth/ProfileForm.tsx`, `SignUpForm.tsx`, `src/components/WorkspaceFooter.astro`, `src/pages/help.astro`, `src/components/home/NextChapter.astro`, and `TrialPlans.tsx`. Add a shared, bilingual trust/contact surface. Policy content and the contact destination require Alex's actual answers, not invented details. Ensure support remains reachable after trial expiry and when AI is unavailable.

### F05. P1: Russian mode still leaves complete interface sentences and counts in English

**What a student sees:** Russian Tests still contains **“40 complete exams in rotation, a different one every attempt until you've taken them all.”** Counts such as **“120 drills”**, **“30 Task 1 prompts”**, **“40 questions”** and **“30 tests”** remain English. The vocabulary overview switches back to **“Topic Lists”** and an English explanatory paragraph. These are navigation and instructional copy, not English exam passages.

**Where:** `/tests`, `/trainers`, `/lessons/vocabulary`, RU at 1440 x 900 and 390 x 844. [Tests](screenshots/open-ru-1440-tests.png), [phone Practice](screenshots/open-ru-390-trainers.png), [scrolled vocabulary lesson](screenshots/scrolled-ru-390-vocabulary.png).

**Why it matters:** The half-translated interface looks unfinished, and students who choose Russian must still interpret instructions in English. The passing translation tests did not catch these dynamic or unmarked strings.

**Recommended change:** Translate the remaining interface sentences and use whole-sentence plural-aware translations for counts. Keep IELTS paper names, question-type terminology and actual exam material in English where that is intentional. For example, use “120 упражнений” and “40 вопросов”, rather than treating the entire count badge as an English technical term.

**For builders:** `src/pages/tests/index.astro`, `src/pages/trainers/index.astro`, `src/content/lesson-bodies/ru/vocabulary.html`, the corresponding dictionaries under `src/lib/i18n/dict/ru`, and the components that render catalog counts. Mark dynamic templates explicitly; expand coverage tests to these count-bearing interfaces. Review the rendered Russian page after the dictionary check passes.

### F06. P1: The Russian student journey begins with an English-only sales explanation

**What a student sees:** Even after selecting RU in the workspace, the sales page is English and offers no language switch. Pricing, the questionnaire and FAQ require English comprehension; the next trial screen can then be Russian.

**Where:** Trial front page, all sales sections, especially phone width. [Sales with RU preference](screenshots/trial-ru-390-sales.png), [Russian trial entry](screenshots/trial-ru-390-trial.png).

**Why it matters:** For an English-comfortable pilot audience this can be acceptable. It is a weak default for a broader Kazakhstan audience that needs Russian to understand the offer or is buying for a child. The conversion risk is an inference, not a measured drop-off rate.

**Recommended change:** Before broad local promotion, add Russian sales copy and a language switch using the same gates/campus design. Prioritize the offer, trial limits, pricing, profile explanation and FAQ. Preserve the selected language through trial entry and sign-up. English-only need not block a specifically English-speaking supervised pilot.

**For builders:** `src/layouts/StoryLayout.astro`, `src/components/home/NextChapter.astro`, `QuestionJourney.astro`, `TrialPricing.astro`, `SalesDemo.astro`, and `src/scripts/question-journey.ts`. The current layout declares English and the questionnaire writes English sentences directly. Translate complete sentences and the generated plan, not just headings.

### F07. P1: Keyboard users can move behind the test-result dialog

**What a student sees:** After submitting a full test or drill, the score dialog covers the page. Pressing Tab moves focus to the passage, question navigation and review controls behind it instead of into the score actions. Escape leaves the dialog open. The dialog also has no explicit accessible name tied to “Your Score”.

**Where:** Open `/tests/reading-full-002` and the Reading drill, both widths and languages. [Desktop focus behind result](screenshots/practice-en-1440-full-keyboard-focus.png), [phone result](screenshots/practice-en-390-full-results.png), [Russian phone drill](screenshots/practice-ru-390-drill-keyboard-focus.png). The exact focus sequence is retained in [keyboard log](logs/keyboard.log).

**Why it matters:** Mouse users can select Review Answers, but a keyboard user has to navigate unseen content to reach the visible result controls. The next step after completing a test becomes difficult precisely when the student expects feedback.

**Recommended change:** Give the result dialog a name, move focus into it when it opens, keep Tab within it, let Escape dismiss it into review, and restore focus to the appropriate result/review control. Also give the Writing answer area a persistent visible label; the inspected textarea currently relies on its placeholder.

**For builders:** `src/components/TestPlayer.tsx`, the `showScore` overlay, and `src/components/WritingTester.tsx` for the textarea label. Reuse an existing accessible dialog primitive if present. Acceptance: keyboard-only submission, Shift+Tab/Tab, Escape and reopening Score must work without entering the background. Do not turn the separate inline unanswered-question warning into a modal; that warning already uses an alert appropriately.

### F08. P2: The promised three-day routine becomes only a preference summary inside the trial

**What a student sees:** The sales questionnaire gives a Day 1, Day 2 and Day 3 routine. Its choices do survive sign-up: Today opens the chosen section and repeats the target band and daily minutes. But the daily steps themselves are not present as an actionable routine there. The student is back to choosing a lesson or full test, and some suggested fresh practice lives in trainers that the trial locks.

**Where:** Sales questionnaire to trial `/dashboard`, desktop English; the same sales plan appears on phone. [Generated routine](screenshots/trial-en-1440-questionnaire.png), [Today after questionnaire](trial-journey/t03-dashboard-desktop.png).

**Why it matters:** This is not lost questionnaire data. It is a gap between a personalized promise and the next usable action. Someone choosing 15 minutes also needs to know that a full Reading test requires a separate 60-minute sitting.

**Recommended change:** Keep a compact “Your suggested three days” disclosure on Today, with links into the included lesson, its small exercise and the permitted test. Distinguish a short daily practice routine from the longer timed test. Make every suggested activity possible with the agreed trial contents; do not add a second test allowance.

**For builders:** `src/lib/journey-plan.ts`, `src/scripts/question-journey.ts`, `src/components/trial/TrialHome.tsx`. Reuse the saved questionnaire and shared routine generator. A lightweight linked checklist is enough; this does not require building a second study scheduler.

### F09. P2: The desktop Mr EZ launcher partially covers lesson and test actions

**What a student sees:** At the initial desktop trial Today position, the floating launcher overlaps the right edge of Open lesson and the upper part of Start test. The buttons can be brought clear by scrolling, so this is not a complete block, but the initial layout looks accidental.

**Where:** Trial `/dashboard`, 1440 x 900, English. [Measured overlap](screenshots/target-trial-dashboard-overlap.png). In the measured state the launcher overlapped both action rectangles; details are in [targeted observations](targeted-observations.json).

**Why it matters:** The helper competes with the main learning actions. It also makes the page feel less considered. I did not find the same separate-launcher defect on the phone layouts, where the tutor is integrated with the dock.

**Recommended change:** Reserve a desktop launcher area outside the action column or use a compact launcher where the two would collide. Check several scroll positions, not just the bottom of the page.

**For builders:** `src/styles/mr-ez.css`, `src/components/tutor/MrEzPanel.tsx`, and `src/styles/trial.css`. Recheck pointer hit areas at 1440 x 900 and intermediate laptop widths while preserving the working phone dock.

### F10. P2: Long Russian topic cards cause a small sideways scroll

**What a student sees:** The Russian vocabulary overview is wider than the phone screen. At 390 pixels, the document measured 404 pixels wide. The second column of topic cards extends past the intended content area.

**Where:** Open `/lessons/vocabulary`, RU, 390 x 844. Reproduced after scrolling through the lesson. [Actual topic cards](screenshots/scrolled-ru-390-vocabulary-cards.png), [measurement](scroll-observations.json).

**Why it matters:** The page can move sideways during a vertical scroll, and long Russian titles look squeezed. Other pages in the broad matrix did not show document-wide horizontal overflow.

**Recommended change:** Stack these overview cards on narrow screens, or make each grid track and card shrink and wrap safely. Keep the full title visible.

**For builders:** `src/styles/lesson.css` (`.sample-card` and its grid), vocabulary overview content, and any workspace overrides. Use shrinkable grid tracks and `min-width: 0` where needed. Verify Russian text at 390 pixels and a narrower phone width.

### F11. P2: Vocabulary overview offers a search that cannot search its contents

**What a student sees:** “Find a word in this lesson” is followed immediately by “No matches. Try another search.” Typing an actual listed topic such as Ecology or экология still gives no matches. The page is a directory of topic cards, not a word table.

**Where:** Open `/lessons/vocabulary`, both widths and languages. [English empty search](screenshots/scrolled-en-1440-vocabulary-search.png), [Russian phone](screenshots/scrolled-ru-390-vocabulary-search.png).

**Why it matters:** The page appears broken before the student has searched, and the offered control cannot help them find the visible topics.

**Recommended change:** Use a topic search on the overview, or omit the word-search control there. Show word search only on lessons with word tables, and show the no-match message only after a relevant query has actually found nothing.

**For builders:** `src/components/LessonVocabularySearch.astro` and its inclusion in the lesson layout. The current updater searches only `.vocab-table tbody tr`; the inspected overview has zero such rows, so its empty-query count is always zero. Add a browser case for the overview as well as a real word-table lesson.

### F12. P2: The first paid-style Today screen gives two large competing next steps

**What a student sees:** A large 40-minute placement offer appears above the main daily activity. On a phone, the daily Start action sits much lower and the student must decide whether to take placement, defer it, or begin the planned activity.

**Where:** Open `/dashboard`, especially 390 x 844, both languages. [Phone Today](screenshots/open-en-390-dashboard.png), [desktop Today](screenshots/open-en-1440-dashboard.png).

**Why it matters:** Both activities are valid, and the existing Not now option is useful. Their equal visual weight weakens the approved “one clear next step” direction. This is a design judgment, not an observed broken flow.

**Recommended change:** Explain the relationship in one sentence and make the placement offer more compact until expanded, or choose one primary first-session action with the other as a clear secondary option. Keep placement outside the trial and retain its one-sitting design.

**For builders:** `src/components/placement/PlacementOffer.tsx`, `src/components/learning/today/TodaySession.tsx`, and the Today page composition. Test the first viewport at phone size. Do not use the length of the simulated Mr EZ paragraph as evidence about production copy.

## Page-by-page assessment

“Four combinations” means EN/RU at 1440 x 900 and 390 x 844. Individual links for those combinations are in [COVERAGE.md](COVERAGE.md); the examples below are representative, not the only captures.

| Journey / page | What was checked and outcome | Evidence / follow-up |
|---|---|---|
| Visitor: sales gates and campus | Scrolled from hero to footer at both widths with EN and RU preferences. The gate story and page remain usable and have no measured sideways overflow. Keep the approved direction. | [Sales](screenshots/trial-en-1440-sales.png). RU remains English, F06. |
| Visitor: questionnaire | Answered all four questions, saw the generated three-day plan and copyable routine. Distinct skill/focus/time choices are reflected. Trial suite confirmed choices survive sign-up. | [Plan](screenshots/trial-en-1440-questionnaire.png), F08. |
| Visitor: product demos and Mr EZ sample | Screenshots and illustrative feedback are explicitly labeled. They are not presented as a live AI session or a real student testimonial. | [Expanded sales page](screenshots/trial-en-1440-sales-expanded.png). Preserve labels. |
| Visitor: pricing | Correct 10,000 KZT monthly and 25,000 KZT three-month totals, with saving explained. Purchase buttons are unavailable and the reason is disclosed. | [Phone plans](screenshots/trial-en-390-plans.png), F01/F03/F04. |
| Visitor: FAQ and sign-in link | FAQ disclosures open. Sign-in is a real local route, separate from starting a trial. “Full test in each section” needs correction. | [FAQ](screenshots/trial-en-1440-sales-expanded.png), F03. |
| Trial: `/trial`, signed out | Explains three days, no card, four tests and tutor allowance before account creation. Both sign-up and existing-account options are present. | [Offer](trial-journey/t01-offer-signed-out.png). Four combinations captured. |
| Trial: `/sign-up` | Email/password/confirmation entry works with a synthetic account and proceeds to profile. No real Google sign-in was attempted. | [Phone sign-up](screenshots/trial-en-390-sign-up.png), F04. |
| Trial: `/profile` | Required adult profile saved and returned to the requested trial route. All fields fit phone width in both languages. Long form and purpose need trust context. | [Profile](screenshots/trial-ru-390-profile.png), F04. |
| Trial: Before you begin and Start | The clock starts only on the explicit Start action. Returning to entry does not reset it. Allowance wording is useful. | [Before Start](trial-journey/t02-before-you-begin.png), four combinations captured. |
| Trial: Today | Section tabs, included content, separate message counts and available/used/ended states work. Keyboard arrow selection moved focus to Listening with a visible outline. | [Today](trial-journey/t03-dashboard-desktop.png), F08/F09. |
| Trial: Reading lesson | Included paraphrase lesson loads through the gate; teaching, checks and tutor controls appear. Additional pass answered lesson quiz choices and checked them. | [Scrolled lesson](screenshots/scrolled-en-1440-reading-paraphrase.png), [quiz](screenshots/target-trial-reading-quiz.png). Open scrolled view supplements trial lesson captures. |
| Trial: Listening lesson | Included Part 1 lesson opens in EN/RU at both widths; recording delivery and seeking were exercised through signed local links. | [Trial phone lesson](screenshots/trial-en-390-lessons-listening-part1.png), trial suite. |
| Trial: Writing lesson | Method, teaching content and one permitted model example load. A second example is not offered. | [Allowed model](trial-journey/t19-writing-lesson-one-example.png). |
| Trial: Speaking lesson | Included Part 1 teaching opens; locked trainer/cue-card routes remain separate from the trial interview. | [Trial lesson](screenshots/trial-ru-390-lessons-speaking-part1.png). |
| Trial: Reading test | Instructions, Start, refresh/resume, submit, result and used state passed. Direct included route works. Main Tests picker is wrong. | [Result](trial-journey/t07-reading-result.png), [used](trial-journey/t08-reading-used.png), F02. |
| Trial: Listening test | Concurrent starts shared one sitting in the trial suite, which also verified signed recording playback and seeking. An additional pass opened the included test, submitted and inspected its result/used state. | [Result](screenshots/target-trial-listening-result.png), [used](screenshots/target-trial-listening-used.png). |
| Trial: Writing essay | Fixed Task 2 question, failed grade and successful simulated grade exercised. Failure retains the allowance; successful assessment uses it. | [Failure](trial-journey/t09-writing-grade-failed.png), [simulated result](trial-journey/t10-writing-graded-simulated.png). |
| Trial: Speaking Part 1 | Local voice peer exercised interview, failed start, retry, simulated grade and used state. Part 1 and approximate five minutes are stated on this screen. | [Interview](trial-journey/t16-speaking-interview.png), [simulated result](trial-journey/t17-speaking-graded-simulated.png). |
| Trial: Mr EZ | Five Reading replies, exhaustion, retry without wasting allowance, separate section counts and refusal of general chat passed. AI wording/quality not assessed. | [Limit](trial-journey/t06-mrez-exhausted.png), [retry](trial-journey/t05-mrez-failed-retry.png). |
| Trial: locked lesson | Title, clear reason, View plans and return path are present. Protected body is not delivered. | [Lock](trial-journey/t04-locked-lesson.png). |
| Trial: locked test | Direct unentitled paper is refused correctly. The problem is that the generic primary picker sends students here. | [Wrong primary destination](screenshots/target-trial-primary-reading.png), F02. |
| Trial: locked trainer | Lock works, but Practice should communicate this before inviting the student to start. | [Trainer gate](screenshots/target-trial-practice-locked.png), F03. |
| Trial: `/plans` | Correct prices and honest no-payment state. No actual purchase, paid access or receipt exists to verify. | [Plans](trial-journey/t11-plans.png), F01. |
| Trial: ended state | New lessons, tests and tutor requests stop; the message says saved results remain. A fresh device sees the same account-owned trial. | [Ended](trial-journey/t13-dashboard-ended.png), [RU phone ended](screenshots/trial-ru-390-ended-dashboard.png). |
| Paying stand-in: Today | Main task, reason controls, target and library appear. First-session placement prominence needs refinement. | [Today](screenshots/open-en-390-dashboard.png), F12. |
| Paying stand-in: goal questions | Full journey passed, including keyboard progression, date picker, commitment step, custom days and reduced motion. | [66-check report](intake-journey/results.md). |
| Paying stand-in: plan settings | Changing only the exam date preserved the other answers in the browser test. Russian calendar and schedule choices work. | [Plan settings](screenshots/open-ru-390-plan-settings.png), intake report. |
| Paying stand-in: Course `/start` | Week, today's session and future work render in all four combinations. No additional blocker found in the inspected view. | [Course](screenshots/open-en-1440-start.png). |
| Paying stand-in: lesson library `/learn` and lessons | Library and all four representative lessons render; pages were scrolled through in both languages and widths. Marking a lesson studied and refresh were exercised. | [Library](screenshots/open-en-1440-learn.png), `scrolled-*` evidence. |
| Paying stand-in: Practice `/trainers` | Skill choices and explanatory disclosure are clear in English. Dynamic counts remain English in RU. | [Practice](screenshots/open-ru-390-trainers.png), F05. |
| Paying stand-in: drill | Started, submitted and reviewed in all four combinations. Result correctly says a drill is too short for a band. | [Drill result](screenshots/practice-en-1440-drill-results.png), F07. |
| Paying stand-in: full test, results and review | Full Reading test, estimated band, review and wrong-answer explanations exercised in all four combinations. Test refresh behavior also passed in trial/placement. | [Phone result](screenshots/practice-en-390-full-results.png), [review](screenshots/practice-ru-1440-full-review.png), F07. |
| Paying stand-in: Writing Trainer | Task 2 opens, editable draft and coach appear, mobile Writing/Help controls are present. Draft survived reload in a focused check. Grade unavailable by intentional local configuration. | [Saved draft](screenshots/detail-en-1440-writing-reloaded.png), [focused check](logs/accessibility.log). |
| Paying stand-in: Speaking Trainer | Entry, part choices and honest service-unavailable state inspected in all four combinations. Real recording/voice not tested in this unconfigured open stand-in. | [Speaking entry](screenshots/open-en-1440-trainers-speaking.png). Do not treat the setup notice as a production outage. |
| Paying stand-in: Vocabulary `/review` | Topic directory and a topic's word detail opened in both languages and widths. Vocabulary overview has separate search/overflow defects. | [Topic detail](screenshots/detail-ru-390-vocabulary-topic.png), F10/F11. |
| Paying stand-in: Report | Empty state directs to practice; another synthetic account's populated report was inspected after test submissions. No claim made about print pagination. | [Populated report](screenshots/detail-en-1440-report-with-results.png). |
| Paying stand-in: Account | Profile details and security controls are present. A fresh browser signed into the same account sees its profile. No destructive account action was invoked. | [Second device](screenshots/return-en-390-second-device.png), F01/F04. |
| Paying stand-in: Help | FAQ disclosures work. Core score/timer explanations are useful. Its trial-sensitive explanations and missing human contact need attention. | [Expanded Help](screenshots/target-trial-help-expanded.png), F03/F04. |
| Paying stand-in: Mr EZ panel | Panel opens on lessons in all four combinations; sign-in handoff returns to the lesson. Local replies are labeled simulated. | [Panel](screenshots/open-ru-390-mrez-panel.png), F09. |
| Paying stand-in: placement offer to results | Offer, intro, stepper, Listening, Reading, saved answers, unavailable Writing/Speaking, results, return visit and plan response passed. Short parts do not invent a band. | [42-check report](placement-journey/results.md), [results](placement-journey/09-results.png), [RU results](placement-journey/12-results-russian.png). |
| Returning: sign-in page | Signed in through normal email/password forms at both widths in both languages. | [RU phone sign-in](screenshots/return-ru-390-sign-in.png). |
| Returning: forgot password | Local request produces the confirmation screen with the correct synthetic email and generic account-existence wording. Actual email arrival and reset-link completion are not verified. | [Reset response](screenshots/return-ru-390-reset-response.png). |
| Returning: sign in from lesson | Mr EZ sign-in link retained `/lessons/reading/paraphrase`; all four checks returned there. | [Returned](screenshots/return-en-390-returned.png). |
| Returning: second device | Fresh browser context, normal sign-in, same account details. Separate trial suite also verified shared trial clock/counts on a fresh device. This is not a physical second-device or production sync test. | [Account](screenshots/return-ru-1440-second-device.png), trial report. |

## Design and accessibility assessment

The workspace mostly meets the approved direction: warm background, forest text, a capsule header, restrained skill accents, spacious lesson documents and a useful phone dock. The sales page can keep its separate campus presentation. Trial surfaces use orange actions and Manrope headings from their own recorded preview; that is a visible seam, but not a reason to discard an approved design. Prioritize the concrete overlap, overflow and competing-action findings above.

The selected workspace color tokens are strong: forest text `#263c35` on `#fffefa` is approximately **11.69:1**, and muted text `#616c64` on `#f5f5f0` is approximately **5.00:1**. These are calculations from declared tokens, not proof that every badge, image overlay and disabled state passes contrast. Normal headings and form labels were generally present. The writing textbox needs a persistent label, and the result dialog has the verified keyboard defect in F07. Goal-question focus movement, calendar keyboard operation, trial tab arrows and sampled reduced-motion behavior passed. A full screen-reader/contrast audit should follow the fixes rather than being claimed from this sample.

## Improvement plan, in build order

| Batch | Size | Scope | Evidence needed before calling it complete |
|---|---|---|---|
| 1. Make the current trial honest and navigable | Medium | F02/F03: entitlement-aware Tests actions, clear locked choices, accurate Speaking/Writing limits, Academic-course wording, remove stale free/no-account claims. | Fresh trial reaches the included test from every entry; resumed/used/ended states behave correctly in EN/RU at both widths. |
| 2. Establish who runs the product and how help works | Medium | F04: operator, support destination, profile explanation, privacy/data handling and purchase/refund/access-expiry terms. | A new visitor can find these before sign-up and purchase; an expired student can still contact a person. Alex approves actual business facts. |
| 3. Build the paid lifecycle | Large | F01: payment integration plus server-owned paid access, successful/failed purchase handling, account status, receipt/history, expiry and refund behavior. | Sandbox purchase unlocks only the correct account across devices; duplicate or failed events do not misgrant access; expiry retains results. Production activation is a separate approval. |
| 4. Repair completion and accessibility defects | Medium | F07/F09/F10/F11: result-dialog focus, visible writing label, launcher placement, Russian card wrapping, appropriate vocabulary search. | Keyboard-only completion and review, no hidden-background focus, no phone overflow, useful search, and unobscured primary controls. |
| 5. Finish Russian and the trial's suggested routine | Medium | F05/F06/F08: remaining UI translations, Russian sales path, accessible linked three-day routine. | A Russian-speaking student can understand the offer and follow the suggested plan without an unexpected English explanation or locked suggested activity. |
| 6. Refine the first paid session | Small | F12: compact placement invitation and one visually primary next step. | On phone, the student understands whether to assess first or start today's work, with both choices still reachable. |
| 7. Release rehearsal after the above | Medium | Run the corrected combined build through the three complete journeys; verify production configuration separately. | Full purchase/access/refund rehearsal, real email delivery, authorized small real-AI/voice check, content-protection build check, keyboard/phone review and owner sign-off. None of those external actions was performed in this audit. |

Batches 1, 2 and 4 make a controlled local pilot much more credible. Batch 3 and the release rehearsal are essential before charging. Do not remove preview or simulated-output notices merely to make the site look finished.

## Questions only Alex can answer

1. What exact person/company name and public support contact should students see, and who will answer support requests?
2. Which payment provider and purchase model will be used: a fixed access period or automatic renewal? The displayed prices stay as instructed; renewal, expiry and refund behavior still need explicit terms.
3. What exactly does a paid customer receive for AI use, and what happens when a limit or service failure is reached? The current page correctly says those allowances are not finalized.
4. What are the real retention/deletion arrangements for profiles, essays, recordings and AI feedback, including the handling of younger students? The published explanation must match the actual services.
5. Is the first launch a supervised, English-comfortable group, or a public offer aimed at Russian-speaking students and parents? That determines whether Russian sales copy is a pilot follow-up or a prelaunch requirement.
6. Does the permission for adapted learning material and recordings cover the intended paid subscription use? The UI says permission exists; this audit did not verify its commercial scope.
7. Is there an approved anonymized real feedback example or student result that can replace an illustrative demo later? Keep the current labels until such evidence exists.

These questions do not reopen the agreed three-day trial, account requirement, four test allowances, Part 1 Speaking limit, tutor allowance, locked material, public word sampler, placement exclusion or decision to keep the current live site open.

## Handoff boundary

Only this audit folder and the auditor's temporary scripts/runtime were written. No product fix, commit, merge, rebase, stash, push, deployment, real account, real Supabase operation or paid AI call was made. No recursive deletion or mirror command was used. No second-brain note was changed because the request restricted writes to the audit and temporary folders. Temporary files were left in place. Local-server shutdown and the final working-tree check are recorded in [EVIDENCE.md](EVIDENCE.md).
