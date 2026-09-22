# Independent review of Claude's personal learning build

Reviewed on 22 September 2026 against `docs/CLAUDE-PERSONAL-LEARNING-BUILD.md`.

Verdict: substantial progress, but not ready for approval or release. Fix the account mixing and Writing evidence defects before considering deployment. Three Speaking objectives also remain incomplete.

Reviewed branch: `claude/todays-tab-ai-tutor-rework-8af4cd`, commit `8ca6014487b22961c0523d526e8a85a6afb4e1ef`, based on the published `e2bf9e6`. Source paths below are relative to `.claude/worktrees/todays-tab-ai-tutor-rework-8af4cd`, not the older root checkout. No product code was changed during this review.

## Confirmed findings and instructions for Claude

### 1. P1: signing in can copy another student's essays and goal into the account

Location: `src/lib/auth/sync.ts:157`, the merge and push in `startSyncForUser`, before `startLearningFor`; also the legacy-state retention in `stopSync`.

The new learner records have account-specific storage, but the older progress and study-plan stores remain shared. On sign-in, the actual sync function merges those browser stores with the incoming user's remote record and uploads the result. Signing out does not remove or isolate the older stores. This defeats the new account isolation before it even starts.

Reproduced by executing the real exported sign-in function with a local simulated Supabase transport. With a synthetic student A essay and band 8 target in browser storage, signing in as synthetic student B with an empty remote record uploaded A's essay and target under B's ID. No real accounts or network calls were used.

Fix: establish the owner before any legacy read, merge, migration or upload. Isolate every remaining legacy consumer as well as the new stores. Claim genuinely anonymous work only through the approved explicit choice; never treat the previous account's cached work as anonymous work. Preserve pending work safely rather than deleting it.

Acceptance: exercise the real auth lifecycle with A sign-in, saved work, sign-out, B sign-in, and A sign-in again. Assert both the visible history and every outgoing write belong only to the active owner. Include delayed network responses, pending uploads, and explicit anonymous-claim accept/decline. Existing tests that only change the new storage owner are insufficient.

Proof script: `claude-review-2026-09-22/account-repro.mjs`.

### 2. P1: successful Writing evaluation disqualifies the answer it just evaluated

Location: `src/components/learning/WritingFocusedTask.tsx:279` to `282`; `written-focused-task.ts:838` to `848`.

The submit handler receives an evaluation, sets `tutorJudged: true`, then saves the submitted answer with that updated help state. `withWrittenHelp` turns that flag into `tutor-explained`. The central evidence classifier consequently labels the original unaided answer assisted. Feedback received after submission is being treated as help used to produce the submission. This prevents a successfully judged independent Writing check from supplying the intended independent evidence.

Executed the same data path with the real help-state, evidence-construction and classification functions, using a labelled synthetic successful evaluation. Result: assistance before submission `none`, recorded assistance `tutor-explained`, evidence use `assisted`, reason `assistance-used`. This proves the bookkeeping defect, not live model quality.

Fix: capture and record the assistance actually received before the submitted answer. Apply the new feedback state to subsequent revisions. Persist assistance across reloads and resumed drafts so an assisted attempt cannot become unaided after refreshing. Keep the existing protections for repeated prompts and retries.

Acceptance: drive the actual component with an intercepted successful evaluation. A fresh unaided first answer must remain independent; a revision after feedback must be assisted and linked to the original. A first answer written after a hint or model must remain assisted. Test both Task 1 and Task 2.

Proof script: `claude-review-2026-09-22/writing-repro.mjs`.

### 3. P2: Task 2 focused exercises save Task 1 evidence

Location: `src/components/learning/WritingFocusedTask.tsx:217`.

The shared component passes the literal `task: 'task1'` for every submission. It also renders the new Task 2 exercises. This contradicts the evidence policy's requirement to keep Task 1 and Task 2 results separate.

Reproduced in the running browser at `/trainers/focused/writing-lexical-topic-vocabulary-check`. Submitted a synthetic paragraph. The saved event identifies prompt `pte-wt-106-task2` but its task scope is `{ kind: 'writing-task', task: 'task1' }`. This was a signed-out, unjudged submission, with no paid AI call.

Fix: carry the trusted source task from the exercise registry through `WrittenTaskView` into the evidence builder. Do not infer task from a title or let a generic form default everything to Task 1. If repairing records created during testing, derive corrections only from trustworthy activity metadata.

Acceptance: submit one real registered Task 1 and one Task 2 focused activity through the component. Verify saved event scopes, aggregation and resulting plan inputs. Also use task-appropriate interface wording: Task 2 paragraph work currently offers "Check my overview".

Proof: `claude-review-2026-09-22/task2-browser.py`, `task2-browser-storage.json`, and `task2-browser.png`.

### 4. P2: three Speaking objectives do not complete the agreed learning loop

Locations: `src/data/focused/speaking-part1-extend-an-answer.ts`, `speaking-part2-plan-in-one-minute.ts`, and `speaking-fluency-repair.ts`; requirement R7.20 in Claude's checklist.

These objectives provide guided self-check and same-prompt retry, but lack a different-question independent check. Rehearsing the same answer cannot establish that the student can apply the skill to a new question. Claude's own handoff correctly labels this partial. The presence of newer complete Speaking flows does not complete these three.

Fix: finish all three with a different, unexposed question, record the appropriate assistance and evidence provenance, and connect the result back to the personal plan. Self-reported checklist ticks must not become examiner-graded evidence. If valid fresh material is exhausted, state that limitation instead of recycling a known question as unseen.

Acceptance: demonstrate guided practice, feedback, retry, fresh question, and the recorded outcome for each of the three objectives. Test unavailable grading honestly without inventing a score; separately verify live grading only with approval.

### 5. P2: the Russian progress report overflows a phone screen

Locations: `src/components/SkillTrendGrid.tsx:60` and the card header/badge rules around `src/styles/learning-progress.css:99`.

At a 390px viewport with the suite's synthetic matching-headings profile, `/report?lang=ru` has a document width of 417px. The translated "МАЛО ДАННЫХ" certainty badges extend outside their two-column cards. Independently measured the overflowing elements and inspected the screenshot. This is document-level overflow, separate from the intentionally scrollable results table.

Fix: let the title and certainty label wrap or stack, or use a single column at narrow widths. Preserve readable text and keyboard access. Do not hide document overflow to conceal the content.

Acceptance: populated and empty reports at 320px, 390px and desktop widths in English and Russian, with no document-level horizontal scroll and no clipped badge text.

Proof: `claude-review-2026-09-22/report-overflow.py` and `s15-05-report-ru-phone.png`.

## What passed

I independently ran these against Claude's checkout, rather than relying on the handoff:

- Automated tests: 1,697 passed, zero failed.
- Production build: 658 pages generated successfully.
- Astro check: zero errors, zero warnings, 19 hints.
- The full 17-scenario browser suite on a freshly built frozen preview: 248 PASS rows, 3 FAIL rows. The suite includes desktop and phone screenshots, saved evidence inspection, personal plans, a recommended 60-minute commitment, overrides, missed days, stable sessions, lesson/practice/check flows, exposure handling and offline behavior.
- Additional independent reproductions for account mixing, Writing evidence classification, Task 2 storage, and mobile report overflow.

Interpret the three browser FAIL rows precisely: one explicitly marks real accounts/two devices as untested; one detects the visible language option "English" in Russian intake and needs a narrow language-selector allowance rather than blindly translating every Latin word; one is the confirmed report overflow above. These counts are assertions in Claude's own browser suite, not 251 independently authored tests. The extra defects above were not caught by that suite.

The implementation materially improves the original experience: one current session, editable personal goals, one-hour setup, plan-aware navigation and reports that distinguish study from stronger evidence. Those improvements do not resolve the confirmed defects in the underlying evidence and account paths.

## Verification still required before release

The frozen build has no configured live tutor or account backend. Browser screenshots of an unavailable tutor do not verify AI tutoring. The review made no paid AI requests, signed into no real accounts, changed no production database and deployed nothing.

After the defects are fixed, verify the real configured tutor, practice evaluation, next-step proposal, Russian replies, actual account isolation and two-device reconciliation in an approved test environment. Test the complete journey from new student intake through fresh independent work to the next plan decision. Live-service actions and costs still need Alex's approval under the project rules.

Passing software tests also does not establish that students achieve their target band on schedule. Keep readiness claims tied to the strength of available assessment evidence and validate the teaching with real student use.

## Handoff back to Claude

Fix findings 1 through 5 on the existing branch. Add regression coverage at the actual integration boundaries described above, not only helper-function tests. Update the requirement checklist and implementation handoff to reflect the remaining live-verification limits. Return a commit ID, test results and browser evidence for the repaired journeys. Do not publish or mark the whole brief complete while Speaking requirements or required live verification remain open.

Reproduction scripts and verification logs are preserved beside this report in `claude-review-2026-09-22/`. Run the Node scripts from the reviewed checkout with `node --import ./tests/ts-extension-loader.mjs <script-path>`. The browser scripts expect the frozen preview on port 4347 and installed Python Playwright. The account and Writing scripts deliberately reproduce the current defects; their observed outputs are failure evidence, not passing product acceptance tests.
