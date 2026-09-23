# Personal learning build: final verification evidence

Run against the FROZEN PRODUCTION SNAPSHOT at http://127.0.0.1:4340/ielts-website on 2026-09-23.

**This is a RERUN** (results-round2.md, screenshots prefixed "round2-") after a fix round on top of the run recorded in results.md. results.md is left untouched.

Nothing on that server can hot reload, so no result below can be explained away as a dev-server artifact.

Every scenario opens its own fresh browser context with empty localStorage and seeds its own clearly labelled SYNTHETIC data. Seeds are written in OLD-store form (`ielts.progress.v1` / `ielts.studyplan.v1`) so the site's own migration runs, which is the honest returning-student path; the new owner-namespaced stores are seeded directly only where a scenario is specifically about them. **Nothing here is a real student.**

AI is NOT configured on this snapshot (no Supabase, no Mr EZ Worker, no grader), so every AI-dependent surface is expected to show its honest deterministic fallback. A simulated reply presented as a live one would be recorded as a defect.

## Scenario 1: New student

Fresh browser context, genuinely empty localStorage, nothing seeded.

| Check | Result | Observed |
|---|---|---|
| On the right page: Today, first ever visit | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Let's set your goal" (expected to contain "Let's set your goal") |
| The intake is offered instead of a fabricated plan | PASS | heading="Let's set your goal", .today-intake=1, .today-active=0 |
| No invented goal | PASS | "Your goal" reads "Not set yet" |
| No invented level: all four papers read as not yet assessed | PASS | Reading Unknown \| Listening Unknown \| Writing Unknown \| Speaking Unknown |
| The intake is short (a small fixed number of steps, shown up front) | PASS | 6 step markers in .intake-progress |

_screenshot **round2-s01-01-new-student-today-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s01-01-new-student-today-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| "Answer later" gives a useful provisional session | PASS | objective="Fill a gap with the exact words from the passage, inside the word limit.", kicker="READING, SENTENCE COMPLETION", 6 step(s), 1 Start button, budget="About 60 minutes today." |
| The provisional session is visibly marked provisional | PASS | Your plan is provisional until you set a goal. Set your goal / There is no exam date on this plan, so the pacing is provisional. Add a date and the plan will pace itself to it. |
| There is a visible route to assessing the other papers (a short first-look step, explicitly too short to be a band) | PASS | step roles observed = ['TEACH', 'TEACH', 'PRACTISE', 'INDEPENDENT CHECK', 'FIRST LOOK · Listening', ' · Listening', 'RECAP'] |

_screenshot **round2-s01-02-answer-later-provisional-session-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s01-02-answer-later-provisional-session-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| The "Answer later" choice is remembered across a reload (the student is not asked the same questions again) | PASS | after reload: heading="Fill a gap with the exact words from the passage, inside the word limit.", .today-intake=0, .today-active=1, objective="Fill a gap with the exact words from the passage, inside the word limit." (before reload the provisional objective was "Fill a gap with the exact words from the passage, inside the word limit.") |

_screenshot **round2-s01-03-after-reload-following-answer-later-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

The stepped intake below is walked in a **second fresh browser context** with empty storage. The first context had already deferred, and that deferral is correctly remembered, so Today no longer offers the stepped questions there.
| On the right page: the intake questions | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="What overall band are you aiming for?" (expected to contain "What overall band") |
| Step 1: band 7.0 is offered and selectable | PASS | 5 match(es) |

_screenshot **round2-s01-04-intake-band-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| Step 2: an exam date about ten weeks ahead can be entered | PASS | filled 2026-12-02 |
| Step 3: 'Every day' can be chosen | PASS | 1 match(es) |
| Step 4: 60 minutes is preselected | PASS | 60-minute radio checked=True |
| Step 4: 60 minutes is labelled as the recommendation, not imposed silently | PASS | hint="Your teacher's recommendation" |

_screenshot **round2-s01-05-intake-sixty-minutes-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| Step 4: availability is explicitly confirmed | PASS | 1 confirmation control(s) |

_screenshot **round2-s01-06-intake-last-step-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| A single explicit 'Save my plan' finishes the intake | PASS | 1 control(s) |
| The honest outcome panel is shown BEFORE Today (what the plan can and cannot fit, with an explicit Continue) | PASS | .intake-outcome-headline=1 ("60 minutes a day is enough to make steady, honest progress toward your goal."), .intake-outcome-note="", [role=status]="Your plan is saved.", Continue button=1 |

_screenshot **round2-s01-07-intake-saved-outcome-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s01-07-intake-saved-outcome-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| On the right page: Today after the intake | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Fill a gap with the exact words from the passage, inside the word limit." |
| Today shows exactly one session | PASS | .today-active=1, .today-intake=0 |
| The session names its paper (a kicker above the objective) | PASS | kicker="READING, SENTENCE COMPLETION" |
| The session states an objective | PASS | objective="Fill a gap with the exact words from the passage, inside the word limit." |
| The stated time is inside the 60-minute budget | PASS | budget="About 60 minutes today." |
| Steps carry real titles and real minutes, and they add up inside the budget | PASS | 6 steps: TEACH/"Reading Overview"/8 min; TEACH/"Sentence Completion"/10 min; PRACTISE/"Reading focused practice, sentence completion"/11 min; INDEPENDENT CHECK/"Reading focused practice, sentence completion"/9 min; FIRST LOOK · Listening/"Plan, Map & Diagram Labelling"/4 min; RECAP/"Reading focused practice, sentence completion"/5 min \| sum=47 min against a stated budget of 60 min |
| Exactly one primary Start button | PASS | 1 .today-start element(s), label="Start", href=/ielts-website/lessons/reading-task1 |
| A reason for this session is available and is a real sentence | PASS | "WHAT THIS RESTS ON  You need at least band 7 in Reading.  WHAT IS STILL UNKNOWN  Not yet assessed: Reading, Listening, Writing, Speaking." |

**Mr EZ line on the card (deterministic, AI off):** "Nothing has been recorded yet, so this starts with how the paper works rather than with a level nobody has measured."

_screenshot **round2-s01-08-today-after-intake-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s01-08-today-after-intake-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

**Scenario 1:** no console errors, no failed/4xx/5xx requests.

## Scenario 2: Opposite profiles

Two fresh contexts. SYNTHETIC-strong-reading-weak-writing versus SYNTHETIC-weak-reading-strong-writing. Identical target (7.0), identical exam date (+56 days), identical 60 minutes a day, identical Writing minimum (6.5). Only the evidence differs.

| Check | Result | Observed |
|---|---|---|
| On the right page: Today for strong Reading / weak Writing | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Complete a sentence with the exact words you hear, inside the word limit." |

_screenshot **round2-s02-strong-reading-weak-writing-today-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s02-strong-reading-weak-writing-today-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| On the right page: Course route for strong Reading / weak Writing | PASS | url="http://127.0.0.1:4340/ielts-website/start" (expected to contain "/start"), landmark heading="The IELTS course" (expected to contain "The IELTS course") |

_screenshot **round2-s02-strong-reading-weak-writing-course-route-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/start`, landmark heading="Complete a sentence with the exact words you hear, inside the word limit."_

**Scenario 2 (strong Reading / weak Writing):** no console errors, no failed/4xx/5xx requests.
| On the right page: Today for weak Reading / strong Writing | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Fill a gap with the exact words from the passage, inside the word limit." |

_screenshot **round2-s02-weak-reading-strong-writing-today-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s02-weak-reading-strong-writing-today-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| On the right page: Course route for weak Reading / strong Writing | PASS | url="http://127.0.0.1:4340/ielts-website/start" (expected to contain "/start"), landmark heading="The IELTS course" (expected to contain "The IELTS course") |

_screenshot **round2-s02-weak-reading-strong-writing-course-route-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/start`, landmark heading="Fill a gap with the exact words from the passage, inside the word limit."_

**Scenario 2 (weak Reading / strong Writing):** no console errors, no failed/4xx/5xx requests.
| On the right page: Today for strong Reading / weak Writing, all four papers measured | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Connect two sentences so the second genuinely follows from the first, without opening it with a mechanical linker such as Firstly, Moreover or In addition." |

_screenshot **round2-s02-all-measured-strong-reading-today-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s02-all-measured-strong-reading-today-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| On the right page: Course route for strong Reading / weak Writing, all four papers measured | PASS | url="http://127.0.0.1:4340/ielts-website/start" (expected to contain "/start"), landmark heading="The IELTS course" (expected to contain "The IELTS course") |

_screenshot **round2-s02-all-measured-strong-reading-course-route-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/start`, landmark heading="Connect two sentences so the second genuinely follows from the first, without opening it with a mechanical linker such as Firstly, Moreover or In addition."_

**Scenario 2 (strong Reading / weak Writing, all four papers measured):** no console errors, no failed/4xx/5xx requests.
| On the right page: Today for weak Reading / strong Writing, all four papers measured | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Fill a gap with the exact words from the passage, inside the word limit." |

_screenshot **round2-s02-all-measured-weak-reading-today-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s02-all-measured-weak-reading-today-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| On the right page: Course route for weak Reading / strong Writing, all four papers measured | PASS | url="http://127.0.0.1:4340/ielts-website/start" (expected to contain "/start"), landmark heading="The IELTS course" (expected to contain "The IELTS course") |

_screenshot **round2-s02-all-measured-weak-reading-course-route-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/start`, landmark heading="Fill a gap with the exact words from the passage, inside the word limit."_

**Scenario 2 (weak Reading / strong Writing, all four papers measured):** no console errors, no failed/4xx/5xx requests.

**Strong Reading / weak Writing** - Today: kicker="LISTENING, SENTENCE COMPLETION", objective="Complete a sentence with the exact words you hear, inside the word limit."; reason="WHAT THIS RESTS ON  You need at least band 7 in Listening.  WHAT IS STILL UNKNOWN  Not yet assessed: Listening, Speaking."; start href=/ielts-website/lessons/listening

**Weak Reading / strong Writing** - Today: kicker="READING, SENTENCE COMPLETION", objective="Fill a gap with the exact words from the passage, inside the word limit."; reason="WHAT THIS RESTS ON  60 of 120 answered on your own across 3 sittings, most recently 1 days ago. You need at least band 7 in Reading.  WHAT IS STILL UNKNOWN  Not yet assessed: Listening, Speaking."; start href=/ielts-website/lessons/reading-task1

**Strong Reading / weak Writing, all four papers measured** - Today: kicker="WRITING, COHESION AND LINKING", objective="Connect two sentences so the second genuinely follows from the first, without opening it with a mechanical linker such as Firstly, Moreover or In addition."; reason="WHAT THIS RESTS ON  0 of 0 answered on your own across 2 sittings, most recently 3 days ago. You need at least band 6.5 in Writing.  WHAT IS STILL UNKNOWN  Every paper has at least a first look recorded."

**Weak Reading / strong Writing, all four papers measured** - Today: kicker="READING, SENTENCE COMPLETION", objective="Fill a gap with the exact words from the passage, inside the word limit."; reason="WHAT THIS RESTS ON  75 of 120 answered on your own across 3 sittings, most recently 1 days ago. You need at least band 7 in Reading.  WHAT IS STILL UNKNOWN  Every paper has at least a first look recorded."
| Pair 1 (Listening and Speaking left unassessed in both): the two profiles get different objectives on Today | PASS | A="Complete a sentence with the exact words you hear, inside the word limit." (LISTENING, SENTENCE COMPLETION) vs B="Fill a gap with the exact words from the passage, inside the word limit." (READING, SENTENCE COMPLETION). Both reasons read: "WHAT THIS RESTS ON  You need at least band 7 in Listening.  WHAT IS STILL UNKNOWN  Not yet assessed: Listening, Speaking." / "WHAT THIS RESTS ON  60 of 120 answered on your own across 3 sittings, most recently 1 days ago. You need at least band 7 in Reading.  WHAT IS STILL UNKNOWN  Not yet assessed: Listening, Speaking." |
| Pair 1: the Course route differs (the whole plan, not just today's card) | PASS | milestones identical=False, week ahead identical=False |

**Pair 1, a week ahead, strong Reading / weak Writing:** ['Start with what this question type actually asks you for.', 'Start with what this question type actually asks you for.', 'Work through real questions with help available when you get stuck.', 'Answer a short set you have not seen, with no help, so the result mean', 'A short sample to find out where you are. It is too short to be a band', 'Go back over what you got wrong and say the rule in your own words.', 'Record a full Speaking answer and get a band on the four official crit', 'Complete a table, form or set of notes with the exact words you hear, ']

**Pair 1, a week ahead, weak Reading / strong Writing:** ['Start with what this question type actually asks you for.', 'Start with what this question type actually asks you for.', 'Work through real questions with help available when you get stuck.', 'Answer a short set you have not seen, with no help, so the result mean', 'A short sample to find out where you are. It is too short to be a band', 'Go back over what you got wrong and say the rule in your own words.', 'Fill each gap with the exact words you hear, and catch it when the spe', 'Record a full Speaking answer and get a band on the four official crit']
| Pair 2 (all four papers measured, only Reading and Writing swapped): the two profiles get different objectives on Today | PASS | C="Connect two sentences so the second genuinely follows from the first, without opening it with a mechanical linker such as Firstly, Moreover or In addition." (WRITING, COHESION AND LINKING) vs D="Fill a gap with the exact words from the passage, inside the word limit." (READING, SENTENCE COMPLETION) |
| Pair 2: the two profiles get different papers on Today | PASS | C kicker="WRITING, COHESION AND LINKING" vs D kicker="READING, SENTENCE COMPLETION" |
| Pair 2: each reason names that student's own evidence, so the difference is justified | PASS | C reason="WHAT THIS RESTS ON  0 of 0 answered on your own across 2 sittings, most recently 3 days ago. You need at least band 6.5 in Writing.  WHAT IS STILL UNKNOWN  Every paper has at least a first look recorded." \| D reason="WHAT THIS RESTS ON  75 of 120 answered on your own across 3 sittings, most recently 1 days ago. You need at least band 7 in Reading.  WHAT IS STILL UNKNOWN  Every paper has at least a first look recorded." |
| Pair 2: the Course route differs too | PASS | milestones identical=False, week ahead identical=False |

**Pair 2 milestones, strong Reading / weak Writing:** ['Connect two sentences so the second genuinely follows from the first, without opening it with a mechanical linker such as Firstly, Moreover or In addition shown on questions you have not seen', 'Correct a sentence with two do/make collocation slips, then write your own sentence using one of the same collocations correctly shown on questions you have not seen', 'Write a paragraph that uses more than one kind of sentence structure (a relative clause, a subordinate clause, a passive, a conditional), not the same simple shape repeated shown on questions you have not seen', 'Combine two simple sentences into one accurate complex sentence, using a subordinate clause (because, although, since, while, when, if) shown on questions you have not seen', 'Write a Task 2 body paragraph using precise topic vocabulary for the subject, rather than generic words that could belong to any essay shown on questions you have not seen']

**Pair 2 milestones, weak Reading / strong Writing:** ['Fill a gap with the exact words from the passage, inside the word limit shown on questions you have not seen', 'Match each statement to the person, place or thing it belongs to shown on questions you have not seen', 'Find which paragraph holds one specific piece of information shown on questions you have not seen', "Decide whether a claim matches the writer's view, or is simply not given shown on questions you have not seen", 'Complete a sentence with the ending the passage supports, in correct grammar shown on questions you have not seen']
| Course and Today still agree WITHIN each of the four profiles (one session, never two opinions) | PASS | A: today="Complete a sentence with the exact words you hear, inside the word limit." course="Complete a sentence with the exact words you hear, inside the word limit." \| B: today="Fill a gap with the exact words from the passage, inside the word limit." course="Fill a gap with the exact words from the passage, inside the word limit." \| C: today="Connect two sentences so the second genuinely follows from the first, without opening it with a mechanical linker such as Firstly, Moreover or In addition." course="Connect two sentences so the second genuinely follows from the first, without opening it with a mechanical linker such as Firstly, Moreover or In addition." \| D: today="Fill a gap with the exact words from the passage, inside the word limit." course="Fill a gap with the exact words from the passage, inside the word limit." |

## Scenario 3: Overall target with per-paper minima, lowest paper already met

Seed SYNTHETIC-lowest-but-met (Reading 7.0, Listening 7.0, Speaking 7.0, Writing 6.0 over two graded essays). Then set overall 7.0 with a Writing minimum of 6.0 THROUGH PLAN SETTINGS, the way a student would.

| Check | Result | Observed |
|---|---|---|
| On the right page: plan settings | PASS | url="http://127.0.0.1:4340/ielts-website/plan-settings" (expected to contain "/plan-settings"), landmark heading="Your study plan" |
| The per-paper minimum panel opens from its own summary control ("Set a different minimum for each paper") | PASS | the Writing minimum control became visible after clicking the summary = True |
| A per-paper minimum for Writing can be set separately from the overall target | PASS | #intake-paper-writing present=True, set to Band 6.0 with an overall target of 7.0 |

_screenshot **round2-s03-01-plan-settings-writing-minimum-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/plan-settings`, landmark heading="None"_

_screenshot **round2-s03-02-plan-settings-saved-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/plan-settings`, landmark heading="None"_
| On the right page: Today after setting the minima | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Complete a sentence with the exact words you hear, inside the word limit." |
| Writing is NOT treated as the main gap, even though it is the lowest paper | PASS | Today kicker="LISTENING, SENTENCE COMPLETION", objective="Complete a sentence with the exact words you hear, inside the word limit." (Writing is the lowest paper at band 6.0, but its required minimum is 6.0, so it is met) |
| The reason explains the choice against the student's own requirements | PASS | reason text, verbatim: "WHAT THIS RESTS ON  8 of 10 answered on your own across 1 sittings, most recently 5 days ago. You need at least band 7 in Listening. Due for review since 2026-09-20.  WHAT IS STILL UNKNOWN  Every paper has at least a first look recorded." |

_screenshot **round2-s03-03-today-writing-not-the-gap-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s03-03-today-writing-not-the-gap-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| On the right page: the progress report | PASS | url="http://127.0.0.1:4340/ielts-website/report" (expected to contain "/report"), landmark heading="Your progress, one page." (expected to contain "Your progress") |

**Report, "Reading" - what to work on next:** "Reading already meets your goal. It stays in rotation for review, not because it is a gap."

**Report, "Listening" - what to work on next:** "This is today's focus: Complete a sentence with the exact words you hear, inside the word limit."

**Report, "Writing" - what to work on next:** "Writing already meets your goal. It stays in rotation for review, not because it is a gap."

**Report, "Speaking" - what to work on next:** "Speaking already meets your goal. It stays in rotation for review, not because it is a gap."
| The report does not describe the met-minimum Writing paper as a serious gap | PASS | Writing panel says: "Writing already meets your goal. It stays in rotation for review, not because it is a gap." |
| Somewhere on the report the met minimum is stated as met (so the student can see WHY Writing was skipped) | PASS | "meets" appears 7 time(s); Writing panel text = "Writing already meets your goal. It stays in rotation for review, not because it is a gap." |

_screenshot **round2-s03-04-report-per-paper-reasons-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_

**Scenario 3:** no console errors, no failed/4xx/5xx requests.

## Scenario 4: One hour

Part A seeds a confirmed 60-minute plan (SavedPlan dailyMinutes=60, defaulted=false). Part B seeds an explicitly chosen 25 minutes (dailyMinutes=25, defaulted=false) in a separate context, which migration must not overwrite.

| Check | Result | Observed |
|---|---|---|
| On the right page: Today with a confirmed 60-minute plan | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Fill a gap with the exact words from the passage, inside the word limit." |
| Today shows the 60-minute day | PASS | "About 60 minutes today." |

_screenshot **round2-s04-01-today-sixty-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| 60 minutes survives a reload | PASS | "About 60 minutes today." |
| On the right page: the Course route | PASS | url="http://127.0.0.1:4340/ielts-website/start" (expected to contain "/start"), landmark heading="The IELTS course" (expected to contain "The IELTS course") |
| The Course route summary states the same 60 minutes | PASS | "Band 7.0 target, 60 days to go, 60 min a day" |

_screenshot **round2-s04-02-course-route-sixty-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/start`, landmark heading="Fill a gap with the exact words from the passage, inside the word limit."_
| On the right page: plan settings | PASS | url="http://127.0.0.1:4340/ielts-website/plan-settings" (expected to contain "/plan-settings"), landmark heading="Your study plan" (expected to contain "Your study plan") |
| Plan settings shows 60 as the confirmed regular time, with no re-nagging | PASS | 60-minute radio checked=True, re-confirmation prompt shown=False |

_screenshot **round2-s04-03-plan-settings-sixty-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/plan-settings`, landmark heading="None"_

**Stored plan constraints (read out of localStorage, not off the screen):** {'regularDailyMinutes': 60, 'regularDailyMinutesStatus': 'confirmed', 'studyDays': 'daily', 'explanationLocale': 'en', 'tzOffsetMinutes': 0}

**Scenario 4 part A:** no console errors, no failed/4xx/5xx requests.
| On the right page: Today for a returning student with an explicit 25 minutes | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Fill a gap with the exact words from the passage, inside the word limit." |
| The explicitly chosen 25 minutes survives migration, unchanged | PASS | "About 25 minutes today." |
| No intake is forced on a student who already confirmed their settings | PASS | .today-active=1, .today-intake=0 |

_screenshot **round2-s04-04-today-explicit-twentyfive-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| Plan settings keeps 25 selected | PASS | 25 checked=True, 60 checked=False |
| 60 minutes is shown as advice only, never applied | PASS | 60-minute hint reads "Your teacher's recommendation", 60 selected=False |

_screenshot **round2-s04-05-plan-settings-twentyfive-kept-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/plan-settings`, landmark heading="None"_

**Scenario 4 part B:** no console errors, no failed/4xx/5xx requests.

## Scenario 5: Busy day

Seed a confirmed 60-minute plan (dailyMinutes=60, defaulted=false, target 7.0, exam in 60 days). Use the real "I have less time today" control.

| Check | Result | Observed |
|---|---|---|
| On the right page: Today before asking for 15 min | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Fill a gap with the exact words from the passage, inside the word limit." |
| [15 min] the regular day starts at 60 minutes | PASS | "About 60 minutes today." |
| [15 min] the panel says the regular day is unchanged BEFORE the student picks | PASS | panel text: "Your regular 60 minutes a day is unchanged. This only shortens today.  15 min 25 min" |
| [15 min] the 15-minute day is honoured and the session fits it | PASS | budget="About 15 minutes today. Your regular day is 60 minutes.", steps sum to 15 min: TEACH/3 min; TEACH/3 min; FIRST LOOK · Listening/4 min; RECAP/5 min |
| [15 min] Today states that the regular time is unchanged | PASS | note=" Your regular day is 60 minutes." |

_screenshot **round2-s05-fifteen-short-day-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s05-fifteen-short-day-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| [15 min] the short day survives a reload | PASS | budget after reload="About 15 minutes today. Your regular day is 60 minutes.", note=" Your regular day is 60 minutes." |
| [15 min] plan settings still shows 60 as the REGULAR time (the short day did not overwrite it) | PASS | 60-minute radio checked=True |

**[15 min] stored plan constraints after the override:** {'regularDailyMinutes': 60, 'regularDailyMinutesStatus': 'confirmed', 'studyDays': 'daily', 'explanationLocale': 'en', 'tzOffsetMinutes': 0}; today override = (not under those names)

_screenshot **round2-s05-fifteen-plan-settings-still-sixty-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/plan-settings`, landmark heading="None"_

**Scenario 5 (15 min):** no console errors, no failed/4xx/5xx requests.
| On the right page: Today before asking for 25 min | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Fill a gap with the exact words from the passage, inside the word limit." |
| [25 min] the regular day starts at 60 minutes | PASS | "About 60 minutes today." |
| [25 min] the panel says the regular day is unchanged BEFORE the student picks | PASS | panel text: "Your regular 60 minutes a day is unchanged. This only shortens today.  15 min 25 min" |
| [25 min] the 25-minute day is honoured and the session fits it | PASS | budget="About 25 minutes today. Your regular day is 60 minutes.", steps sum to 20 min: TEACH/8 min; TEACH/3 min; FIRST LOOK · Listening/4 min; RECAP/5 min |
| [25 min] Today states that the regular time is unchanged | PASS | note=" Your regular day is 60 minutes." |

_screenshot **round2-s05-twentyfive-short-day-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s05-twentyfive-short-day-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| [25 min] the short day survives a reload | PASS | budget after reload="About 25 minutes today. Your regular day is 60 minutes.", note=" Your regular day is 60 minutes." |
| [25 min] plan settings still shows 60 as the REGULAR time (the short day did not overwrite it) | PASS | 60-minute radio checked=True |

**[25 min] stored plan constraints after the override:** {'regularDailyMinutes': 60, 'regularDailyMinutesStatus': 'confirmed', 'studyDays': 'daily', 'explanationLocale': 'en', 'tzOffsetMinutes': 0}; today override = (not under those names)

_screenshot **round2-s05-twentyfive-plan-settings-still-sixty-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/plan-settings`, landmark heading="None"_

**Scenario 5 (25 min):** no console errors, no failed/4xx/5xx requests.

## Scenario 6: Seven-day deadline and missed days

Part A: fresh storage, then set target 7.0, exam in 7 days, 15 minutes a day through the real plan-settings screen. Part B: a separate context whose PersonalPlan already carries an active session dated five days ago.

| Check | Result | Observed |
|---|---|---|
| On the right page: plan settings before setting a 7-day deadline | PASS | url="http://127.0.0.1:4340/ielts-website/plan-settings" (expected to contain "/plan-settings"), landmark heading="Your study plan" (expected to contain "Your study plan") |

_screenshot **round2-s06-01-plan-settings-seven-days-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/plan-settings`, landmark heading="None"_
| An honest scope statement is shown at all | PASS | headline="With 7 days until the exam, 15 minutes a day can cover a few priorities properly. It cannot cover everything your goal needs, and it cannot promise a band." |
| The scope note on plan settings is a SHORT sentence, not a wall of text | PASS | the scope paragraph is 97 characters and is shown in full: "There are 7 study days left and 15 minutes a day, which is about 105 minutes in total. and 3 more" |
| What will not fit is in a COLLAPSED list, not dumped on the screen | PASS | 1 dropped item(s), inside a <details>=True. Items: ['There are not enough study days left before the exam to reach this.'] |
| The scope panel does not contradict itself | PASS | headline says "With 7 days until the exam, 15 minutes a day can cover a few priorities properly. It cannot cover everything your goal needs, and it cannot promise a band." while the line directly beneath it says ['There are not enough study days left before the exam to reach this.'] |

**Scope note, verbatim:** "There are 7 study days left and 15 minutes a day, which is about 105 minutes in total. and 3 more"

_screenshot **round2-s06-02-plan-settings-outcome-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/plan-settings`, landmark heading="None"_
| On the right page: Today on a 7-day/15-minute plan | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Fill a gap with the exact words from the passage, inside the word limit." |
| Today's own session fits the 15-minute budget | PASS | budget="About 15 minutes today.", steps sum to 15 min: TEACH/Reading Overview/3 min; TEACH/Sentence Completion/3 min; FIRST LOOK · Listening/Plan, Map & Diagram Labelling/4 min; RECAP/Reading Overview/5 min |
| No completion or congratulation wording on a 7-day plan with an unfinished library | PASS | .today-finished=0, heading="Fill a gap with the exact words from the passage, inside the word limit." |
| Today itself states the honest scope for a seven-day deadline | PASS | scope notes on the Today card = ['There are 7 study days left and 15 minutes a day, which is about 105 minutes in total. and 3 more']; collapsible blocks on the Today card = [] |

_screenshot **round2-s06-03-today-seven-days-fifteen-minutes-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s06-03-today-seven-days-fifteen-minutes-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| On the right page: the Course rolling schedule | PASS | url="http://127.0.0.1:4340/ielts-website/start" (expected to contain "/start"), landmark heading="The IELTS course" (expected to contain "The IELTS course") |

**Rolling schedule, day by day:** Wed 23: budget=15 min, items=15 min | Thu 24: budget=15 min, items=0 min | Fri 25: budget=15 min, items=0 min | Sat 26: budget=15 min, items=0 min | Sun 27: budget=15 min, items=0 min | Mon 28: budget=15 min, items=0 min | Tue 29: budget=15 min, items=0 min
| The audit's 255-minute day is impossible: no day's budget exceeds the chosen 15 minutes by more than a plausible recovery margin | PASS | maximum day budget observed across the rolling schedule = 15 min (15 min/day was chosen; the audit reproduced a 255-minute day on the old planner) |
| No day's listed work exceeds that day's own stated budget | PASS | overloaded days = none |

_screenshot **round2-s06-04-course-rolling-schedule-seven-days-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/start`, landmark heading="Fill a gap with the exact words from the passage, inside the word limit."_

**Scenario 6 part A:** no console errors, no failed/4xx/5xx requests.
| The stored plan could be aged by five days, so 'several missed days' is really simulated | PASS | activeSession.date and every schedule day moved back five days: {'before': {'active': '2026-09-23', 'first': '2026-09-23', 'createdAt': '2026-09-23T05:30:57.103Z'}, 'after': {'active': '2026-09-18', 'first': '2026-09-18', 'createdAt': '2026-09-18T05:30:57.103Z'}} |
| On the right page: Today after five missed days | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Match a heading to a paragraph by its main idea rather than by a repeated word." |
| After five missed days the session is still bounded: one session, inside the budget, no piled-up backlog | PASS | .today-active=1, budget="About 60 minutes today.", steps sum to 44 min across 5 steps |
| The recovery is explained in one sentence rather than silently reshuffled | PASS | reason text, verbatim: "WHAT THIS RESTS ON  2 of 16 answered on your own across 2 sittings, most recently 2 days ago. You need at least band 7 in Reading.  WHAT IS STILL UNKNOWN  Every paper has at least a first look recorded.  4 planned study days were missed recently; this session was rebuilt around that." |
| Missed days never read as completion | PASS | .today-finished=0, heading="Match a heading to a paragraph by its main idea rather than by a repeated word." |

**Before ageing:** objective="Match a heading to a paragraph by its main idea rather than by a repeated word.", budget="About 60 minutes today.". **After:** objective="Match a heading to a paragraph by its main idea rather than by a repeated word.", budget="About 60 minutes today.".

_screenshot **round2-s06-05-today-after-five-missed-days-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s06-05-today-after-five-missed-days-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| The plan records the change, and records it once rather than as a growing list | PASS | 2 recorded change(s): ['You missed 4 study days, so the week was rebuilt from where you actually are rather than piling the old days on top. Nothing had to be dropped.2026-09-23', 'Your plan is set up. Today is Match a heading to a paragraph by its main idea rather than by a repeated word.2026-09-18'] |
| The number of missed days it tells the student matches the number actually missed | PASS | the plan was aged by exactly 5 days (active session and every scheduled day moved from 2026-09-23 to 2026-09-18); of those 5 days, 1 (days_before(3), a real Reading attempt in the SYNTHETIC-matching-headings seed) was actually worked, so the honestly expected count is 4, and the wording says 4 missed study day(s) |

_screenshot **round2-s06-06-course-plan-changes-after-missed-days-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/start`, landmark heading="Match a heading to a paragraph by its main idea rather than by a repeated word."_

**Scenario 6 part B:** no console errors, no failed/4xx/5xx requests.

## Scenario 7: One current session, on every surface

Seed SYNTHETIC-matching-headings (the audit's student: confirmed band 7 goal, two Reading papers with 2 of 16 Matching Headings correct, one attempt in each other paper, 60 minutes a day, exam in 35 days).

| Check | Result | Observed |
|---|---|---|

**BEFORE - Today:** objective="Match a heading to a paragraph by its main idea rather than by a repeated word.", href=/ielts-website/lessons/reading-task1, button="Start", first step="Reading Overview", steps already done=0; step list = ['TEACH/"Reading Overview"/8 min/done=False', 'TEACH/"Matching Headings"/12 min/done=False', 'PRACTISE/"Reading focused practice, matching headings"/12 min/done=False', 'INDEPENDENT CHECK/"Matching Headings"/7 min/done=False', 'RECAP/"Reading focused practice, matching headings"/5 min/done=False']

**BEFORE - Course route:** objective="Match a heading to a paragraph by its main idea rather than by a repeated word.", href=/ielts-website/lessons/reading-task1

**BEFORE - Account menu (workspace avatar):** ['Account', 'Study plan settings', 'Saved and notes', 'Progress report', 'Lessons library', 'What each band needs', 'Model answers', 'Cue cards', 'English', 'Русский']

**BEFORE - Account overview:** href=/ielts-website/lessons/reading-task1, link="Continue"

**BEFORE - Report, what to work on next, per paper:** {'Reading': "This is today's focus: Match a heading to a paragraph by its main idea rather than by a repeated word.", 'Listening': "Listening is priority 3 of the papers with a gap left, behind today's focus.", 'Writing': "Writing is priority 2 of the papers with a gap left, behind today's focus.", 'Speaking': "Speaking is priority 4 of the papers with a gap left, behind today's focus."}

**BEFORE - Report CTA:** {'label': 'Reading Overview · 8 min', 'reason': 'Matching Headings in Reading is consistently the weakest question type. You have not worked through the lesson on it yet (2 of 16 correct across 2 sittings).', 'href': '/ielts-website/lessons/reading-task1'}

**BEFORE - Tests hub checkpoint cards:** [{'head': 'READING CHECKPOINT', 'text': 'READING CHECKPOINT Unseen A paper you have not met yet shows where you really stand. One you have already drilled or sat mostly shows what you remember. None of this paper has come up before, so a result here is about where you really stand, not what you remem', 'hrefs': ['/ielts-website/tests/reading-full-004']}, {'head': 'LISTENING CHECKPOINT', 'text': 'LISTENING CHECKPOINT Unseen A paper you have not met yet shows where you really stand. One you have already drilled or sat mostly shows what you remember. None of this paper has come up before, so a result here is about where you really stand, not what you rem', 'hrefs': ['/ielts-website/tests/listening-full-002']}]

**BEFORE - Unrelated lesson footer (/lessons/speaking):** {'label': "Back to today's session", 'href': '/ielts-website/dashboard', 'hidden': False}
| [before] Course route names the exact same session as Today | PASS | today="Match a heading to a paragraph by its main idea rather than by a repeated word." (/ielts-website/lessons/reading-task1) \| course="Match a heading to a paragraph by its main idea rather than by a repeated word." (/ielts-website/lessons/reading-task1) |
| [before] Account overview links the same next step | PASS | account overview href=/ielts-website/lessons/reading-task1 against Today href=/ielts-website/lessons/reading-task1 |
| [before] The workspace account menu makes no competing next-step claim | PASS | menu items = ['Account', 'Study plan settings', 'Saved and notes', 'Progress report', 'Lessons library', 'What each band needs', 'Model answers', 'Cue cards', 'English', 'Русский'] |
| [before] The progress report's "what to work on next" names today's session, and contradicts nothing | PASS | report mentions today's objective=True. Per paper: {'Reading': "This is today's focus: Match a heading to a paragraph by its main idea rather than by a repeated word.", 'Listening': "Listening is priority 3 of the papers with a gap left, behind today's focus.", 'Writing': "Writing is priority 2 of the papers with a gap left, behind today's focus.", 'Speaking': "Speaking is priority 4 of the papers with a gap left, behind today's focus."} |
| [before] The report's own call to action points at today's session, not a second opinion | PASS | report CTA label="Reading Overview · 8 min" href=/ielts-website/lessons/reading-task1 against Today's current step "Reading Overview" href=/ielts-website/lessons/reading-task1 |
| [before] The tests hub offers full papers as independent browsing and never as a competing plan step | PASS | checkpoint card text: READING CHECKPOINT Unseen A paper you have not met yet shows where you really stand. One you have already drilled or sat mostly shows what you remember. None of this paper has come up before, so a result here is about where you really stand, not what you remem LISTENING CHECKPOINT Unseen A paper you have not met yet shows where you really stand. One you have already drilled or sat mostly shows wha |
| [before] An unrelated lesson opened straight from the library sends the student back to the one session instead of inventing a next lesson | PASS | footer label="Back to today's session", href=/ielts-website/dashboard, hidden=False |
| On the right page: Today before any progress | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Match a heading to a paragraph by its main idea rather than by a repeated word." |

_screenshot **round2-s07-01-today-before-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s07-02-course-before-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/start`, landmark heading="Match a heading to a paragraph by its main idea rather than by a repeated word."_

_screenshot **round2-s07-03-report-before-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_

_screenshot **round2-s07-04-tests-hub-before-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/tests`, landmark heading="Put your skills to the test."_

_screenshot **round2-s07-05-unrelated-lesson-footer-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/lessons/speaking`, landmark heading="Speaking Overview"_
| The session's first step was really opened and really marked studied | PASS | Start href="/ielts-website/lessons/reading-task1", landed on "http://127.0.0.1:4340/ielts-website/lessons/reading-task1", lesson marked studied=True |

_screenshot **round2-s07-06-first-step-completed-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/lessons/reading-task1`, landmark heading="Reading Overview"_

**AFTER - Today:** objective="Match a heading to a paragraph by its main idea rather than by a repeated word.", href=/ielts-website/lessons/reading/headings#b3-4bc13cd8, button="Continue", first step="Reading Overview", steps already done=1; step list = ['TEACH/"Reading Overview"/8 min/done=True', 'TEACH/"Matching Headings"/12 min/done=False', 'PRACTISE/"Reading focused practice, matching headings"/12 min/done=False', 'INDEPENDENT CHECK/"Matching Headings"/7 min/done=False', 'RECAP/"Reading focused practice, matching headings"/5 min/done=False']

**AFTER - Course route:** objective="Match a heading to a paragraph by its main idea rather than by a repeated word.", href=/ielts-website/lessons/reading/headings#b3-4bc13cd8

**AFTER - Account menu (workspace avatar):** ['Account', 'Study plan settings', 'Saved and notes', 'Progress report', 'Lessons library', 'What each band needs', 'Model answers', 'Cue cards', 'English', 'Русский']

**AFTER - Account overview:** href=/ielts-website/lessons/reading/headings#b3-4bc13cd8, link="Continue"

**AFTER - Report, what to work on next, per paper:** {'Reading': "This is today's focus: Match a heading to a paragraph by its main idea rather than by a repeated word.", 'Listening': "Listening is priority 3 of the papers with a gap left, behind today's focus.", 'Writing': "Writing is priority 2 of the papers with a gap left, behind today's focus.", 'Speaking': "Speaking is priority 4 of the papers with a gap left, behind today's focus."}

**AFTER - Report CTA:** {'label': 'Matching Headings · 14 min', 'reason': 'Matching Headings in Reading is consistently the weakest question type. You have not worked through the lesson on it yet (2 of 16 correct across 2 sittings).', 'href': '/ielts-website/lessons/reading/headings'}

**AFTER - Tests hub checkpoint cards:** [{'head': 'READING CHECKPOINT', 'text': 'READING CHECKPOINT Unseen A paper you have not met yet shows where you really stand. One you have already drilled or sat mostly shows what you remember. None of this paper has come up before, so a result here is about where you really stand, not what you remem', 'hrefs': ['/ielts-website/tests/reading-full-004']}, {'head': 'LISTENING CHECKPOINT', 'text': 'LISTENING CHECKPOINT Unseen A paper you have not met yet shows where you really stand. One you have already drilled or sat mostly shows what you remember. None of this paper has come up before, so a result here is about where you really stand, not what you rem', 'hrefs': ['/ielts-website/tests/listening-full-002']}]

**AFTER - Unrelated lesson footer (/lessons/speaking):** {'label': "Back to today's session", 'href': '/ielts-website/dashboard', 'hidden': False}
| [after] Course route names the exact same session as Today | PASS | today="Match a heading to a paragraph by its main idea rather than by a repeated word." (/ielts-website/lessons/reading/headings#b3-4bc13cd8) \| course="Match a heading to a paragraph by its main idea rather than by a repeated word." (/ielts-website/lessons/reading/headings#b3-4bc13cd8) |
| [after] Account overview links the same next step | PASS | account overview href=/ielts-website/lessons/reading/headings#b3-4bc13cd8 against Today href=/ielts-website/lessons/reading/headings#b3-4bc13cd8 |
| [after] The workspace account menu makes no competing next-step claim | PASS | menu items = ['Account', 'Study plan settings', 'Saved and notes', 'Progress report', 'Lessons library', 'What each band needs', 'Model answers', 'Cue cards', 'English', 'Русский'] |
| [after] The progress report's "what to work on next" names today's session, and contradicts nothing | PASS | report mentions today's objective=True. Per paper: {'Reading': "This is today's focus: Match a heading to a paragraph by its main idea rather than by a repeated word.", 'Listening': "Listening is priority 3 of the papers with a gap left, behind today's focus.", 'Writing': "Writing is priority 2 of the papers with a gap left, behind today's focus.", 'Speaking': "Speaking is priority 4 of the papers with a gap left, behind today's focus."} |
| [after] The report's own call to action points at today's session, not a second opinion | PASS | report CTA label="Matching Headings · 14 min" href=/ielts-website/lessons/reading/headings against Today's current step "Matching Headings" href=/ielts-website/lessons/reading/headings#b3-4bc13cd8 |
| [after] The tests hub offers full papers as independent browsing and never as a competing plan step | PASS | checkpoint card text: READING CHECKPOINT Unseen A paper you have not met yet shows where you really stand. One you have already drilled or sat mostly shows what you remember. None of this paper has come up before, so a result here is about where you really stand, not what you remem LISTENING CHECKPOINT Unseen A paper you have not met yet shows where you really stand. One you have already drilled or sat mostly shows wha |
| [after] An unrelated lesson opened straight from the library sends the student back to the one session instead of inventing a next lesson | PASS | footer label="Back to today's session", href=/ielts-website/dashboard, hidden=False |

_screenshot **round2-s07-07-today-after-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| Today shows the real progress it stored (a step ticked, the button becomes Continue) | PASS | 1 step(s) ticked done, Start button label="Continue", href=/ielts-website/lessons/reading/headings#b3-4bc13cd8 (was /ielts-website/lessons/reading-task1). Step list BEFORE = ['TEACH/"Reading Overview"/8 min/done=False', 'TEACH/"Matching Headings"/12 min/done=False', 'PRACTISE/"Reading focused practice, matching headings"/12 min/done=False', 'INDEPENDENT CHECK/"Matching Headings"/7 min/done=False', 'RECAP/"Reading focused practice, matching headings"/5 min/done=False']; AFTER = ['TEACH/"Reading Overview"/8 min/done=True', 'TEACH/"Matching Headings"/12 min/done=False', 'PRACTISE/"Reading focused practice, matching headings"/12 min/done=False', 'INDEPENDENT CHECK/"Matching Headings"/7 min/done=False', 'RECAP/"Reading focused practice, matching headings"/5 min/done=False'] |
| Completing a step did not silently replace the session with a different objective | PASS | before="Match a heading to a paragraph by its main idea rather than by a repeated word." \| after="Match a heading to a paragraph by its main idea rather than by a repeated word." |

**Scenario 7:** no console errors, no failed/4xx/5xx requests.

## Scenario 8: Real learning (guided practice, hints, retries, independent check)

Seed a light confirmed plan (band 7.0, exam in 40 days, 60 minutes) so the student is a returning one, then drive the Reading Matching Headings pilot for real.

| Check | Result | Observed |
|---|---|---|
| On the right page: the guided Matching Headings exercise | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided" (expected to contain "/trainers/focused/reading-matching-headings-guided"), landmark heading="Matching Headings: guided practice" (expected to contain "Matching Headings: guided practice") |
| The guided exercise says it is guided, and hints exist BEFORE any answer | PASS | eyebrow="GUIDED PRACTICE · 12 MIN", 6 hint control(s) |

_screenshot **round2-s08-01-guided-before-answering-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_
| The exercise has six real questions from a real paper | PASS | 6 answer control(s) |
| Exactly the one deliberate mistake is marked wrong | PASS | 1 wrong, 5 right (question 16 was answered ii, the correct answer is viii) |
| The "how did you choose it?" question appears with real reason options | PASS | wrong line="You chose ii. That is not the one.", ask="How did you choose it?", options=['It repeats words from the paragraph', 'It matches the first sentence', 'It fits one detail in the paragraph', 'Two headings looked the same to me', 'I ran out of time', 'I guessed'] |
| No explanation is shown for the wrong answer before the student is asked how they chose | PASS | explanation blocks inside the wrong item before picking a reason = 0 |

_screenshot **round2-s08-02-guided-wrong-answer-asks-how-you-chose-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_

_screenshot **round2-s08-02-guided-wrong-answer-asks-how-you-chose-phone.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_
| A TENTATIVE diagnosis appears, worded as a hypothesis rather than a verdict | PASS | wrong item now reads: "16 Section D Choose a heading i ii iii iv v vi vii viii ix x  You chose ii. That is not the one.  This looks like choosing a heading because its words appear in the paragraph, rather than because it says what the paragraph is about, going by what you told us. It is worth checking against the next one rather than taking it as settled.  The sentence that decides this one: given rise to controversy  Try this one again" |
| The teacher's own explanation is attached: the exact sentence in the passage that decides the answer | PASS | evidence pointer present=True |
| A second go is offered ("Try this one again") | PASS | 1 retry control(s), label="Try this one again" |
| The summary refuses to call guided work mastery, and says so in words | PASS | summary: "5 / 6  You worked 6 questions and got 5 right, 0 of them with help.  This was practice with help available, so it shows guided work rather than what you can do on your own. The check that follows is what shows that.  Nothing here is a band, and one set is never mastery.  What changed: Today moves from Fill a gap with the exact words from the passage, inside the word limit to Complete a sentence with the exact words you hear, inside the word limit. Nothing has been measured for Listening yet, so the plan cannot say where you are. A short sample changes that.  Read the method again  This was extra practice. It has been recorded, and the plan has been worked out again around it.  Back to today's session →" |

_screenshot **round2-s08-03-guided-diagnosis-and-explanation-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_

_screenshot **round2-s08-03-guided-diagnosis-and-explanation-phone.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_
| The retry is accepted and shown as a retry, not as a fresh clean result | PASS | after the retry the screen reads: "14 Section B Choose a heading i ii iii iv v vi vii viii ix x  Section B explains Hahnemann's accidental discovery and his experiments that formed the theoretical basis of homeopathy, matching v.  condensed his theory into a single Latin phrase" |

_screenshot **round2-s08-04-guided-after-retry-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_

**Stored events for the guided exercise:** 2. [{"at": "2026-09-23T05:31:50.146Z", "mode": "practice", "assistanceLevel": null, "completion": "completed", "retryOf": null, "activityId": "focus:reading-matching-headings-guided"}, {"at": "2026-09-23T05:31:53.076Z", "mode": "practice", "assistanceLevel": null, "completion": "completed", "retryOf": "ev:bd3e7a394b88fe94c3886c6ae7b0c6cd", "activityId": "focus:reading-matching-headings-guided"}]
| The FIRST answer is stored, exactly as it was given, before any explanation appeared | PASS | stored item outcomes: [{"itemId": "reading-full-020:q14", "firstAnswer": "v", "correct": true, "assistance": null}, {"itemId": "reading-full-020:q15", "firstAnswer": "vii", "correct": true, "assistance": null}, {"itemId": "reading-full-020:q16", "firstAnswer": "ii", "correct": false, "assistance": null}, {"itemId": "reading-full-020:q17", "firstAnswer": "x", "correct": true, "assistance": null}, {"itemId": "reading-full-020:q18", "firstAnswer": "iii", "correct": true, "assistance": null}, {"itemId": "reading-full-020:q19", "firstAnswer": "ix", "correct": true, "assistance": null}, {"itemId": "reading-full-020:q16", "firstAnswer": "ii", "correct": false, "assistance": null}] |
| On the right page: the Reading Headings lesson | PASS | url="http://127.0.0.1:4340/ielts-website/lessons/reading/headings" (expected to contain "/lessons/reading/headings"), landmark heading="Matching Headings" |
| The lesson quick check is the real paper this scenario expects (Academic Reading Test 6, Passage 2) | PASS | identified by its heading list; if this ever changes the answer key below is wrong and the scenario would say so. unit_is_test6=True |
| A hint can be asked for BEFORE answering a lesson quick-check item, and there are 12 such controls | PASS | hint surface said: "Mr EZ is not answering right now, so here is the sentence from "How to Approach It" that decides this one: For each paragraph, read to find its central aim: what is the paragraph mainly about?  Mr EZ could not be reached, so this is the lesson's own answer. Mr EZ is not switched on for this build yet." |

_screenshot **round2-s08-05-lesson-hint-before-answering-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_
| The hinted item was then answered correctly and the quick check submitted | PASS | answers chosen = ['v', 'ii', 'iv', 'vii', 'iii', 'vi'], submitted = True |

_screenshot **round2-s08-06-lesson-quick-check-answered-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_
| On the right page: the independent check exercise | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-check-a" (expected to contain "/trainers/focused/reading-matching-headings-check-a"), landmark heading="Matching Headings: independent check" (expected to contain "independent check") |
| The independent check offers NO hints and no tutor at all | PASS | eyebrow="INDEPENDENT CHECK · 8 MIN", hint controls=0, Mr EZ launcher present=1 |

_screenshot **round2-s08-07-independent-check-no-help-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-check-a`, landmark heading="Matching Headings: independent check"_

_screenshot **round2-s08-08-independent-check-result-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-check-a`, landmark heading="Matching Headings: independent check"_

**Every event now on the learner record:** [{"activityId": "focus:reading-matching-headings-guided", "mode": "practice", "assistanceLevel": null, "completion": "completed", "items": 6}, {"activityId": "focus:reading-matching-headings-guided", "mode": "practice", "assistanceLevel": null, "completion": "completed", "items": 1}, {"activityId": "check:practice-reading-headings", "mode": "lesson-check", "assistanceLevel": null, "completion": "completed", "items": 6}, {"activityId": "focus:reading-matching-headings-check-a", "mode": "assessment", "assistanceLevel": null, "completion": "completed", "items": 6}]
| A correct answer that followed a hint is recorded as ASSISTED, for good | PASS | assisted item outcomes on the record: [{"activity": "check:practice-reading-headings", "item": "reading-full-006:q14", "assistance": "hint", "correct": true}] |
| The independent check's items are recorded as independent assessment, not as guided practice | PASS | independent-check events: [{"activityId": "focus:reading-matching-headings-check-a", "mode": "assessment", "assistanceLevel": null}] |
| The lesson quick check is recorded as a lesson check, distinct from an independent assessment | PASS | lesson-check events: [{"activityId": "check:practice-reading-headings", "mode": "lesson-check"}] |
| On the right page: the progress report | PASS | url="http://127.0.0.1:4340/ielts-website/report" (expected to contain "/report"), landmark heading="Your progress, one page." (expected to contain "Your progress") |
| No mastery wording anywhere on the progress page | PASS | mastery-style words found = none |
| Certainty is expressed in words, never as a percentage or a score | PASS | certainty labels = ['LIMITED EVIDENCE', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN'] |

**Skill panels on the report:** [{"paper": "Reading", "certainty": "LIMITED EVIDENCE", "band": "", "meta": ["Checked 0 days ago", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Listening", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Writing", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Speaking", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]}]

_screenshot **round2-s08-09-report-no-mastery-claim-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_

_screenshot **round2-s08-09-report-no-mastery-claim-phone.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_

**Scenario 8:** no console errors, no failed/4xx/5xx requests.

## Scenario 9: Exposure and blank submissions

Fresh context, a light confirmed plan. Part A sits a drill from Academic Reading Test 6 Passage 2, then the lesson quick check that quotes the same paper, then the independent check built from the reserved Test 29. Part B submits a wholly blank drill.

| Check | Result | Observed |
|---|---|---|
| On the right page: the Reading drill from Test 6, Passage 2 | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/reading/reading-full-006-drill-p2" (expected to contain "/trainers/reading/reading-full-006-drill-p2"), landmark heading="Passage 2 Drill: Can the planet’s coral reefs be saved?" (expected to contain "Passage 2 Drill") |

_screenshot **round2-s09-01-drill-opened-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| The drill from Test 6 Passage 2 was really sat and submitted | PASS | 9 answer control(s) filled, submitted=True, landed on http://127.0.0.1:4340/ielts-website/trainers/reading/reading-full-006-drill-p2 |

_screenshot **round2-s09-02-drill-submitted-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

**Exposure state on the shared learner record immediately after the drill:** {"exposure": [{"key": "item:reading-full-006-drill-p2:q14", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q15", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q16", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q17", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q18", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q19", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1} | item ids on the record: ['reading-full-006-drill-p2:q14', 'reading-full-006-drill-p2:q15', 'reading-full-006-drill-p2:q16', 'reading-full-006-drill-p2:q17', 'reading-full-006-drill-p2:q18', 'reading-full-006-drill-p2:q19', 'reading-full-006-drill-p2:q20', 'reading-full-006-drill-p2:q21', 'reading-full-006-drill-p2:q22', 'reading-full-006-drill-p2:q23', 'reading-full-006-drill-p2:q24', 'reading-full-006-drill-p2:q25'] | test ids in the OLD ielts.progress.v1 store: []
| Sitting a drill writes the drill onto the shared learner record | PASS | immediately after submitting a 13-question drill with 9 answers filled in, the shared learner record held 13 item outcome(s) and 1 exposure block(s); the old progress store held tests [] |
| On the right page: the Reading Headings lesson | PASS | url="http://127.0.0.1:4340/ielts-website/lessons/reading/headings" (expected to contain "/lessons/reading/headings"), landmark heading="Matching Headings" |

_screenshot **round2-s09-03-lesson-check-same-paper-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_
| On the right page: the independent check on the reserved paper | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-check-a" (expected to contain "/trainers/focused/reading-matching-headings-check-a"), landmark heading="Matching Headings: independent check" (expected to contain "independent check") |
| The independent check really does come from a RESERVED paper the student has not met | PASS | the check says its source is: "Real exam material. Academic Reading Test 29, Passage 1, Questions 1 to 6." |

_screenshot **round2-s09-04-reserved-check-source-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-check-a`, landmark heading="Matching Headings: independent check"_

**Exposure state before sitting the reserved check:** {"exposure": [{"key": "item:reading-full-006-drill-p2:q14", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q15", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q16", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q17", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q18", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q19", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q20", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q21", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q22", "firstSeenAt": "2026-09-23T05:32:21.458Z", "lastSeenAt": "2026-09-23T05:32:21.458Z", "occasions": 1}, {"key": "item:reading-full-006-drill-p2:q23", "firstSe
| The drill's paper is recorded as SEEN | PASS | reading-full-006 appears in the exposure record = True |
| The reserved paper is NOT recorded as seen before it is sat | PASS | reading-full-029 appears in the exposure record = False |
| On the right page: a second, untouched drill for the blank submission | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/reading/reading-full-018-drill-p1" (expected to contain "/trainers/reading/reading-full-018-drill-p1"), landmark heading="Passage 1 Drill: Wolves, dogs and humans" (expected to contain "Passage 1 Drill") |
| A wholly blank drill can be submitted | PASS | submitted=True, landed on http://127.0.0.1:4340/ielts-website/trainers/reading/reading-full-018-drill-p1 |

_screenshot **round2-s09-05-blank-drill-submitted-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/reading/reading-full-018-drill-p1`, landmark heading="None"_

**Events recorded by the blank submission:** [{"id": "ev:4568ca4a4213b2bd7aeb536834651c8a", "activityId": "drill:reading-full-018-drill-p1", "contentVersion": 0, "at": "2026-09-23T05:32:40.775Z", "localDate": "2026-09-23", "paper": "reading", "subskill": "timing-strategy", "mode": "practice", "completion": "blank", "assistance": "none", "seenBefore": false, "outcome": {"kind": "scored", "raw": 0, "total": 14, "bySubskill": {"yes-no-notgiven": {"correct": 0, "total": 5}, "multiple-choice": {"correct": 0, "total": 3}, "sentence-completion": {"correct": 0, "total": 1}, "matching-features": {"correct": 0, "total": 5}}, "secondsUsed": 3}, "items": [{"itemId": "reading-full-018-drill-p1:q1", "firstAnswer": "", "correct": false, "assistance": "none", "subskill": "yes-no-notgiven", "seenBefore": false}, {"itemId": "reading-full-018-drill-p1:q2", "firstAnswer": "", "correct": false, "assistance": "none", "subskill": "yes-no-notgiven", "seenBefore": false}, {"itemId": "reading-full-018-drill-p1:q3", "firstAnswer": "", "correct": false, "assistance": "none", "subskill": "yes-no-notgiven", "seenBefore": false}, {"itemId": "reading-full-018-drill-p1:q4", "firstAnswer": "", "correct": false, "assistance": "none", "subskill": "yes-no-notgiv
| The blank submission is recorded as blank rather than as a real attempt | PASS | 1 event(s) recorded; marked blank/empty = True |
| On the right page: the progress report after the blank submission | PASS | url="http://127.0.0.1:4340/ielts-website/report" (expected to contain "/report"), landmark heading="Your progress, one page." (expected to contain "Your progress") |

**Skill panels before the blank drill:** [{"paper": "Reading", "certainty": "LIMITED EVIDENCE", "band": "", "meta": ["Checked 0 days ago", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Listening", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Writing", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Speaking", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]}]

**Skill panels after the blank drill:** [{"paper": "Reading", "certainty": "LIMITED EVIDENCE", "band": "", "meta": ["Checked 0 days ago", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Listening", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Writing", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Speaking", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]}]
| The blank submission created no new weakness and no new band claim | PASS | bands before = ['', '', '', ''], after = ['', '', '', '']; certainty before = ['LIMITED EVIDENCE', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN'], after = ['LIMITED EVIDENCE', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN'] |
| The report explains why something was not counted, where it applies | PASS | looked for a plain not-counted explanation on the page; 'not counted' present=True, 'does not count' present=False, 'not treated as' present=False |

_screenshot **round2-s09-06-report-after-blank-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_

**Scenario 9:** no console errors, no failed/4xx/5xx requests.

## Scenario 10: Student override and direct entry

Seed SYNTHETIC-matching-headings, then use the real "Choose another skill" control and the real "Browse all lessons" library.

| Check | Result | Observed |
|---|---|---|
| On the right page: Today before any override | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Match a heading to a paragraph by its main idea rather than by a repeated word." |

_screenshot **round2-s10-01-today-before-override-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| A "Choose another skill" control exists on Today | PASS | 1 control(s) |
| The alternative skills are offered as named choices | PASS | choices offered: ['Listening', 'Writing', 'Speaking']; panel text: "Listening Writing Speaking" |

_screenshot **round2-s10-02-choose-another-skill-panel-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s10-02-choose-another-skill-panel-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| Today now shows the session the student chose, and only that one | PASS | before="Match a heading to a paragraph by its main idea rather than by a repeated word." (READING, MATCHING HEADINGS) -> after="Complete a sentence with the exact words you hear, inside the word limit." (LISTENING, SENTENCE COMPLETION), .today-active=1, Start buttons=1 |
| The override is explained back to the student rather than silently applied | PASS | reason shown on Today, verbatim: "WHAT THIS RESTS ON  7 of 10 answered on your own across 1 sittings, most recently 8 days ago. You need at least band 7 in Listening. Due for review since 2026-09-17.  WHAT IS STILL UNKNOWN  Every paper has at least a first look recorded." \| plan history records: ['Your plan is set up. Today is Match a heading to a paragraph by its main idea rather than by a repeated word.', 'You chose Listening today, so the plan follows that and uses whatever it shows.', 'Today moves from Match a heading to a paragraph by its main idea rather than by a repeated word to Complete a sentence with the exact words you hear, inside the word limit. You last showed this 8 days ago. Spacing says it is time to prove it again rather than let it fade.'] |

**Plan overrides recorded in storage:** [{"kind": "chose-other-skill", "date": "2026-09-23", "paper": "listening", "createdAt": "2026-09-23T05:32:50.091Z"}]

**Plan history after the override:** ["Your plan is set up. Today is Match a heading to a paragraph by its main idea rather than by a repeated word.", "You chose Listening today, so the plan follows that and uses whatever it shows.", "Today moves from Match a heading to a paragraph by its main idea rather than by a repeated word to Complete a sentence with the exact words you hear, inside the word limit. You last showed this 8 days ago. Spacing says it is time to prove it again rather than let it fade."]
| The choice is recorded on the plan, not just rendered | PASS | overrides=[{"kind": "chose-other-skill", "date": "2026-09-23", "paper": "listening", "createdAt": "2026-09-23T05:32:50.091Z"}], history summaries=["Your plan is set up. Today is Match a heading to a paragraph by its main idea rather than by a repeated word.", "You chose Listening today, so the plan follows that and uses whatever it shows.", "Today moves from Match a heading to a paragraph by its main idea rather than by a repeated word to Complete a sentence with the exact words you hear, inside the word limit. You last showed this 8 days a |

_screenshot **round2-s10-03-today-after-override-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s10-03-today-after-override-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| The Course route follows the override too (no competing second plan) | PASS | today="Complete a sentence with the exact words you hear, inside the word limit." \| course="Complete a sentence with the exact words you hear, inside the word limit." |

_screenshot **round2-s10-04-course-after-override-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/start`, landmark heading="Complete a sentence with the exact words you hear, inside the word limit."_
| On the right page: Browse all lessons | PASS | url="http://127.0.0.1:4340/ielts-website/learn" (expected to contain "/learn"), landmark heading="Learn at your pace." (expected to contain "Learn at your pace") |
| An unrelated lesson can be opened straight from the library | PASS | library card href=/ielts-website/lessons/speaking |

_screenshot **round2-s10-05-library-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/learn`, landmark heading="Learn at your pace."_
| On the right page: the unrelated lesson | PASS | url="http://127.0.0.1:4340/ielts-website/lessons/speaking" (expected to contain "/lessons/speaking"), landmark heading="Speaking Overview" |
| The unrelated lesson can be marked studied | PASS | lesson-complete button present=1, marked studied=True |
| The lesson footer offers "Back to today's session" rather than inventing a next lesson | PASS | footer label="Back to today's session", href=/ielts-website/dashboard |

_screenshot **round2-s10-06-unrelated-lesson-footer-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/lessons/speaking`, landmark heading="Speaking Overview"_
| The voluntary lesson lands on the SAME record (no separate store) | PASS | events mentioning the voluntary Speaking lesson: [{"activityId": "trainer:speaking", "mode": "practice", "completion": "completed"}, {"activityId": "lesson:speaking", "mode": "practice", "completion": "completed"}] |
| Today still shows exactly one session after the voluntary detour, and it is still the overridden one | PASS | .today-active=1, Start buttons=1, objective="Complete a sentence with the exact words you hear, inside the word limit." (the override chose "Complete a sentence with the exact words you hear, inside the word limit.") |

_screenshot **round2-s10-07-today-after-voluntary-lesson-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-s10-07-today-after-voluntary-lesson-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

**Scenario 10:** no console errors, no failed/4xx/5xx requests.

## Scenario 11: Reliability (no AI configured, mid-exercise reload, draft safety)

Fresh context, light confirmed plan. Nothing about this snapshot is configured for AI, so every AI surface here is expected to show its honest unavailable state.

| Check | Result | Observed |
|---|---|---|
| On the right page: the guided exercise | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided" (expected to contain "/trainers/focused/reading-matching-headings-guided"), landmark heading="Matching Headings: guided practice" (expected to contain "Matching Headings: guided practice") |

_screenshot **round2-s11-01-exercise-part-answered-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_
| A mid-exercise reload brings back the answers already given | PASS | answers before the reload = ['v', 'vii', 'viii'] ("3 of 6 answered"), after the reload = ['v', 'vii', 'viii'] ("3 of 6 answered") |

_screenshot **round2-s11-02-exercise-after-reload-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_

**Mr EZ launcher avatar class BEFORE opening the panel:** "mrez-avatar is-unavailable has-approved-art"; AFTER opening it: "mrez-avatar is-unavailable has-approved-art"

**Mr EZ state on the exercise page:** {"launcher": 1, "launcher_class": "mrez-launcher", "avatar_class": "mrez-avatar is-unavailable has-approved-art", "panel": 1, "note": "Mr EZ is not switched on for this build yet. Your next step on the dashboard still works, it just comes with a plain explanation instead of his.", "composer": 1, "blocked_text": null, "panel_text": "Mr EZ Mr EZ is not available on this build Close Mr EZ \u00d7 A little guidance. A lot of progress. Let\u2019s figure it out together.  Understand a tricky question, learn from your results, or find your next step.  Mr EZ is not switched on for this build yet. Your next step on the dashboard still works, it just comes with a plain explanation instead of his.  Your message to Mr EZ Send"}
| The tutor says plainly that it is not available, in the panel itself | PASS | panel note, verbatim: "Mr EZ is not switched on for this build yet. Your next step on the dashboard still works, it just comes with a plain explanation instead of his." |
| The tutor's own avatar keeps showing the unavailable state while the panel is open | PASS | avatar class before opening = "mrez-avatar is-unavailable has-approved-art" (correct), after opening = "mrez-avatar is-unavailable has-approved-art" |
| Nothing in the panel is dressed up as a live reply | PASS | panel text: "Mr EZ Mr EZ is not available on this build Close Mr EZ × A little guidance. A lot of progress. Let’s figure it out together.  Understand a tricky question, learn from your results, or find your next step.  Mr EZ is not switched on for this build yet. Your next step on the dashboard still works, it just comes with a plain explanation instead of his.  Your message to Mr EZ Send" |

_screenshot **round2-s11-03-tutor-unavailable-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_

_screenshot **round2-s11-03-tutor-unavailable-phone.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_
| On the right page: the Writing focused task | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/focused/writing-task1-overview-guided" (expected to contain "/trainers/focused/writing-task1-overview-guided"), landmark heading="Task 1 overview: guided practice" |
| The Writing focused task offers a real place to write | PASS | 2 textarea(s) on the page |

_screenshot **round2-s11-04-writing-task-draft-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: guided practice"_

**Writing task submit controls:** ['Check my overview']
| With grading unavailable the task still gives transparent automatic checks, and labels them automatic | PASS | the word 'automatic' appears on the page after submitting = True; page text around it: d an overview YOUR OVERVIEW  26 words, aiming for 25 to 70  Nothing looked at your writing this time, so there is no judgement of it here. The checks below are automatic: they look at the words you typed and nothing else.  Does it open as a summary? No sentence starts with a summarising word such as "Overall". An examiner looks for the overview first, so it is worth signalling. Does it make more than one point? Count |
| No band and no fabricated grade is shown when the grader is unreachable | PASS | the page states it is not a band = True |
| The unavailable grader is reported rather than simulated | PASS | band-claiming phrases found on the page = none |
| The "What changed" line does not announce a move from an objective to the same objective | PASS | the line reads, verbatim: "" |
| The panel does not contradict itself about whether today changed | PASS | one box says "" and the box directly beneath it says "This was extra practice. It has been recorded, and it has not changed today." |

_screenshot **round2-s11-05-writing-task-automatic-checks-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: guided practice"_

_screenshot **round2-s11-05-writing-task-automatic-checks-phone.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: guided practice"_
| The draft survives a reload (not one word is lost) | PASS | 164 characters came back; starts with "The chart shows a steady rise in electricity produced from wind between 2000 and 2020, whi" |

_screenshot **round2-s11-06-writing-draft-after-reload-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: guided practice"_

**Scenario 11:** no console errors, no failed/4xx/5xx requests.

## Scenario 12: Accounts and owner isolation

**Real-account behaviour is NOT verified on this run and is not claimed.** No Supabase exists on this snapshot and signing in is prohibited for this test run. What is tested here is the local owner-namespacing guarantee: a foreign signed-in student's record is planted in the same browser and must never be read by the signed-out session.

| Check | Result | Observed |
|---|---|---|
| On the right page: Today as the anonymous owner of this browser | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Match a heading to a paragraph by its main idea rather than by a repeated word." |

**localStorage keys in this browser:** ['ielts.device.v1', 'ielts.learning.legacy.adopted.v1', 'ielts.learning.legacy.v1', 'ielts.learning.plan.v1::anon:93052724-0db2-49f5-a2d0-74ef71cbb248', 'ielts.learning.record.v1::anon:93052724-0db2-49f5-a2d0-74ef71cbb248', 'ielts.learning.record.v1::u:SYNTHETIC-other-student', 'ielts.progress.v1', 'ielts.progress.v1::anon:93052724-0db2-49f5-a2d0-74ef71cbb248', 'ielts.studyplan.v1', 'ielts.studyplan.v1::anon:93052724-0db2-49f5-a2d0-74ef71cbb248']
| The learner record is stored under a key that names its owner | PASS | the record namespace this session loaded = "anon:93052724-0db2-49f5-a2d0-74ef71cbb248", and a foreign record is sitting beside it under "ielts.learning.record.v1::u:SYNTHETIC-other-student" |
| The foreign student's record is still physically present in the browser (so the check below means something) | PASS | foreign key present = True |
| The session reads ONLY its own record: nothing from the foreign student leaks in | PASS | the foreign marker string appears in the record this session loaded = False |
| Nothing from the foreign student appears anywhere on Today | PASS | foreign marker on the page = False; Today reads kicker="READING, MATCHING HEADINGS", objective="Match a heading to a paragraph by its main idea rather than by a repeated word." |

_screenshot **round2-s12-01-today-owner-isolated-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| On the right page: the progress report | PASS | url="http://127.0.0.1:4340/ielts-website/report" (expected to contain "/report"), landmark heading="Your progress, one page." (expected to contain "Your progress") |
| The report shows no trace of the foreign student, including their self-reported Speaking 8.5 | PASS | foreign marker on the report = False; the Speaking panel reads {"paper": "Speaking", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]} |

_screenshot **round2-s12-02-report-owner-isolated-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_
| Real two-account and two-device behaviour was verified | FAIL | NOT TESTED AND NOT CLAIMED. There is no Supabase on this frozen snapshot and signing in to a real account is prohibited for this run, so two students on one browser, two devices reconciling, duplicate pushes and stale-plan overwrites were not exercised. The local owner-namespacing above is the only part of scenario 12 this run can show. |

**Scenario 12:** no console errors, no failed/4xx/5xx requests.

## Scenario 13: Assessment boundary

Fresh context, light confirmed plan. Start a real timed full Reading paper, then the independent check, then finish and open the review.

| Check | Result | Observed |
|---|---|---|
| On the right page: the full Reading paper's start screen | PASS | url="http://127.0.0.1:4340/ielts-website/tests/reading-full-030" (expected to contain "/tests/reading-full-030"), landmark heading="Academic Reading Test 30" |

**Mr EZ before the clock starts:** {"launcher": 0, "launcher_class": null, "avatar_class": null, "panel": 0, "note": null, "composer": 0, "blocked_text": null, "panel_text": null}
| A real timed Reading paper can be started | PASS | Start control present=0, started=True |

**Mr EZ during the timed paper:** {"launcher": 0, "launcher_class": null, "avatar_class": null, "panel": 0, "note": null, "composer": 0, "blocked_text": null, "panel_text": null}
| No help control of any kind exists during the timed paper | PASS | help controls on the page during the exam = 0 |
| The tutor is blocked during the exam, and says why in a calm sentence | PASS | launcher present=0, panel present=0. What it says, verbatim: "(nothing)" |
| A direct question cannot be typed to the tutor during the exam | PASS | message box present=0, enabled=False |

_screenshot **round2-s13-01-tutor-blocked-during-timed-paper-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/tests/reading-full-030`, landmark heading="None"_

_screenshot **round2-s13-01-tutor-blocked-during-timed-paper-phone.png**: url=`http://127.0.0.1:4340/ielts-website/tests/reading-full-030`, landmark heading="None"_
| On the right page: the independent check | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-check-a" (expected to contain "/trainers/focused/reading-matching-headings-check-a"), landmark heading="Matching Headings: independent check" (expected to contain "independent check") |

**Mr EZ on the independent check:** {"launcher": 1, "launcher_class": "mrez-launcher", "avatar_class": "mrez-avatar is-unavailable has-approved-art", "panel": 1, "note": "No hints, examples or answers while the clock is running. Ask me again once you submit, this conversation will still be here.", "composer": 1, "blocked_text": null, "panel_text": "Mr EZInvigilating: no answers until the timer stopsClose Mr EZ\u00d7No hints, examples or answers while the clock is running. Ask me again once you submit, this conversation will still be here.Mr EZ is not switched on for this build yet. Your next step on the dashboard still works, it just comes with a plain explanation instead of his.Your message to Mr EZSend"}
| No help control exists on the independent check either | PASS | help controls on the independent check = 0 |
| The tutor is closed for the duration of the independent check, with an explanation | PASS | launcher present=1. It says: "Mr EZ Invigilating: no answers until the timer stops Close Mr EZ ×  No hints, examples or answers while the clock is running. Ask me again once you submit, this conversation will still be here.  Mr EZ is not switched on for this build yet. Your next step on the dashboard still works, it just comes with a plain explanation instead of his.  Your message to Mr EZ Send" |

_screenshot **round2-s13-02-tutor-on-independent-check-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-check-a`, landmark heading="Matching Headings: independent check"_
| After the check is finished, the review shows the explanations it withheld | PASS | 7 explanation block(s) now on the page; the summary reads "1 / 6  On questions you had not seen, with no help, you matched 1 of 6.  That is one independent set. It is enough to move what your plan works on next, and it is not a band and not a final answer about this question type.  What a short set cannot show is how this holds up under exam timing on a who" |
| The tutor becomes available again once the check is over | PASS | launcher present after finishing=1, note="Mr EZ is not switched on for this build yet. Your next step on the dashboard still works, it just comes with a plain explanation instead of his." (AI is not configured on this snapshot, so the honest available-again state is the plain unavailable notice, not a reply) |

_screenshot **round2-s13-03-review-after-check-tutor-available-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-check-a`, landmark heading="Matching Headings: independent check"_

_screenshot **round2-s13-03-review-after-check-tutor-available-phone.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-check-a`, landmark heading="Matching Headings: independent check"_

**Scenario 13:** no console errors, no failed/4xx/5xx requests.

## Scenario 14: Coverage and orphans

Every link the Course library, the practice hub, the tests hub, /review and the generated activity index offer, fetched and checked. A representative page from every family is also rendered so console errors can be caught.

| Check | Result | Observed |
|---|---|---|
| The generated activity index is served | PASS | GET /data/learning-index.json -> 200 |

**Index contents:** 105 focused exercises, 70 full papers, 240 drills, 22 lesson checks, 83 speaking prompts, 36 vocabulary topics. Separately, 18 speaking-focus task routes: ['speaking-fluency-repair', 'speaking-fluency-repair-check', 'speaking-part1-extend-an-answer', 'speaking-part1-extend-an-answer-check', 'speaking-part2-plan-in-one-minute', 'speaking-part2-plan-in-one-minute-check', 'speaking-part2-tense-range-check', 'speaking-part2-tense-range-guided', 'speaking-part3-abstract-opinion-check', 'speaking-part3-abstract-opinion-guided', 'speaking-part3-complex-sentences-check', 'speaking-part3-complex-sentences-guided', 'speaking-part3-paraphrase-the-question-check', 'speaking-part3-paraphrase-the-question-guided', 'speaking-part3-speculate-and-compare-check', 'speaking-part3-speculate-and-compare-guided', 'speaking-topic-vocabulary-check', 'speaking-topic-vocabulary-guided']
| Every hub page was reachable to crawl | PASS | /dashboard: 11 link(s), /start: 88 link(s), /learn: 82 link(s), /trainers: 10 link(s), /tests: 84 link(s), /review: 6 link(s), /report: 8 link(s), /plan-settings: 7 link(s), /account: 8 link(s), /trainers/reading: 127 link(s), /trainers/listening: 127 link(s), /trainers/writing: 8 link(s), /trainers/speaking: 7 link(s), /speaking/cue-cards: 6 link(s), /writing/models: 7 link(s), /writing/checker: 7 link(s), /learn/bands: 6 link(s), /tests/mock: 1 link(s), /speaking/examiner: 7 link(s) |

**411 distinct internal links collected from the hubs.**
| All 534 routes answer 200 | PASS | non-200 or failed routes: none |

**Routes that exist and work but are not linked from any hub page crawled here** (they are reached from inside a session step or a lesson, which is by design for focused practice): 103 focused exercises, 18 speaking-focus prompts. First few focused: ['listening-categorisation-check-a', 'listening-categorisation-check-b', 'listening-categorisation-guided', 'listening-categorisation-guided-2', 'listening-diagram-labelling-check-a', 'listening-diagram-labelling-check-b']
| No link in the interface points at a route that does not exist (the reverse direction, which is the one that breaks students) | PASS | broken interface links = none |

**Scenario 14 (crawl):** no console errors, no failed/4xx/5xx requests.
| None of the 45 rendered pages produced a console error or a failed request | PASS | clean |

**Pages rendered for the console check:** /dashboard, /start, /learn, /trainers, /tests, /review, /report, /plan-settings, /account, /trainers/reading, /trainers/listening, /trainers/writing, /trainers/speaking, /speaking/cue-cards, /writing/models, /writing/checker, /learn/bands, /tests/mock, /speaking/examiner, /trainers/focused/listening-categorisation-check-a, /trainers/focused/listening-categorisation-check-b, /trainers/focused/listening-categorisation-guided, /trainers/focused/listening-categorisation-guided-2, /trainers/focused/listening-diagram-labelling-check-a, /trainers/focused/listening-diagram-labelling-check-b, /trainers/focused/writing-task2-position-and-thesis-check, /trainers/focused/writing-task2-position-and-thesis-guided, /trainers/focused/writing-task2-structure-range-check, /trainers/focused/writing-task2-structure-range-guided, /trainers/focused/writing-task2-support-a-claim-check, /trainers/focused/writing-task2-support-a-claim-guided, /trainers/speaking-focus/speaking-fluency-repair, /trainers/speaking-focus/speaking-fluency-repair-check, /trainers/speaking-focus/speaking-part1-extend-an-answer, /trainers/speaking-focus/speaking-part1-extend-an-answer-check, /trainers/speaking-focus/speaking-part2-plan-in-one-minute-check, /tests/listening-full-001, /tests/reading-full-040, /trainers/reading/reading-full-006-drill-p2, /lessons/reading/headings, /lessons/writing/opinion, /lessons/listening/section1, /lessons/speaking-part1, /lessons/vocabulary, /lessons/vocabulary/ageing

## Scenario 15: Language and access

Seed SYNTHETIC-matching-headings. Russian is requested with ?lang=ru, which always wins over the device language. Phone viewport is 390x844.

| Check | Result | Observed |
|---|---|---|
| [RU 390px] Today is served in Russian | PASS | html lang="ru", url=http://127.0.0.1:4340/ielts-website/dashboard |
| [RU 390px] Today has no horizontal scroll | PASS | documentElement.scrollWidth <= clientWidth: True |
| [RU 390px] Today: no English interface string is left on screen | PASS | 0 English line(s) still shown: [] |

_screenshot **round2-s15-01-today-ru-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Доброе утро.
Немного практики. Ещё один шаг вперёд."_
| [RU 390px] the Course route is served in Russian | PASS | html lang="ru", url=http://127.0.0.1:4340/ielts-website/start |
| [RU 390px] the Course route has no horizontal scroll | PASS | documentElement.scrollWidth <= clientWidth: True |
| [RU 390px] the Course route: no English interface string is left on screen | PASS | 0 English line(s) still shown: [] |

_screenshot **round2-s15-02-course-ru-phone.png**: url=`http://127.0.0.1:4340/ielts-website/start`, landmark heading="Подбирать заголовок к абзацу по его главной мысли, а не по повторяющемуся слову."_
| [RU 390px] the intake / plan settings is served in Russian | PASS | html lang="ru", url=http://127.0.0.1:4340/ielts-website/plan-settings |
| [RU 390px] the intake / plan settings has no horizontal scroll | PASS | documentElement.scrollWidth <= clientWidth: True |
| [RU 390px] the intake / plan settings: no English interface string is left on screen | PASS | 0 English line(s) still shown: [] |

_screenshot **round2-s15-03-plan-settings-ru-phone.png**: url=`http://127.0.0.1:4340/ielts-website/plan-settings`, landmark heading="None"_
| [RU 390px] a focused exercise is served in Russian | PASS | html lang="ru", url=http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided |
| [RU 390px] a focused exercise has no horizontal scroll | PASS | documentElement.scrollWidth <= clientWidth: True |
| [RU 390px] a focused exercise: no English interface string is left on screen | PASS | 0 English line(s) still shown: [] |

_screenshot **round2-s15-04-focused-exercise-ru-phone.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: практика с подсказками"_
| [RU 390px] the progress report is served in Russian | PASS | html lang="ru", url=http://127.0.0.1:4340/ielts-website/report |
| [RU 390px] the progress report has no horizontal scroll | PASS | documentElement.scrollWidth <= clientWidth: True |
| [RU 390px] the progress report: no English interface string is left on screen | PASS | 0 English line(s) still shown: [] |

_screenshot **round2-s15-05-report-ru-phone.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Ваш прогресс на одной странице."_
| On the right page: the focused exercise in Russian | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided" (expected to contain "/trainers/focused/reading-matching-headings-guided"), landmark heading="Matching Headings: практика с подсказками" |
| Exam content stays English in the Russian interface | PASS | passage begins "A. Homeopathy is an alternative system of medicine, founded in the early 19th century by a German physician, D"; heading list begins "There are more headings than sections so you will not use all of them.  i. The future of homeopathy ii. Concer" |

_screenshot **round2-s15-06-exam-content-stays-english-phone.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: практика с подсказками"_

**Every English interface line still shown in the Russian view, by surface:** {"Today": [], "the Course route": [], "the intake / plan settings": [], "a focused exercise": [], "the progress report": []}

Two of these groups are pre-excused by the project's own CLAUDE.md as known and scheduled (the session objective sentences and the reason sentences). Everything else in the lists above is a genuine untranslated interface string: the step purpose sentences, the Mr EZ panel's whole introduction, the milestone labels, the report's page chrome, its paper names, its date stamps and its subskill labels.

**Scenario 15 part A:** no console errors, no failed/4xx/5xx requests.
| On the right page: Today for the keyboard walk | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Match a heading to a paragraph by its main idea rather than by a repeated word." |

**Keyboard trail on Today:** A:"IELTS is EZ" ring=True -> A:"Today" ring=True -> A:"Course" ring=True -> A:"Practice" ring=True -> A:"Tests" ring=True -> A:"Vocabulary" ring=True -> BUTTON:"EN" ring=True -> BUTTON:"RU" ring=True -> BUTTON:"" ring=True -> A:"Skip to content" ring=True -> A:"Start" ring=True -> BUTTON:"Why this" ring=True -> BUTTON:"I have less time today" ring=True -> BUTTON:"Choose another skill" ring=True
| [keyboard] every control on Today is reachable by Tab | PASS | reached = {'start': True, 'why this': True, 'less time': True, 'another skill': True} |
| [keyboard] every control focused along the way shows a visible ring | PASS | controls with no visible ring: none |

_screenshot **round2-s15-07-keyboard-focus-today-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| [keyboard] 'Why this' opens with Enter | PASS | .today-why present after Enter = True |
| [keyboard] 'I have less time today' opens with Space | PASS | .today-less-time present after Space = True |
| [keyboard] 'Choose another skill' opens with Enter | PASS | .today-other-skill present after Enter = True |

_screenshot **round2-s15-08-keyboard-activated-panels-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| On the right page: the focused exercise for the keyboard walk | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided" (expected to contain "/trainers/focused/reading-matching-headings-guided"), landmark heading="Matching Headings: guided practice" (expected to contain "guided practice") |

**Keyboard trail on the focused exercise:** A:"IELTS is EZ" ring=True -> A:"Today" ring=True -> A:"Course" ring=True -> A:"Practice" ring=True -> A:"Tests" ring=True -> A:"Vocabulary" ring=True -> BUTTON:"EN" ring=True -> BUTTON:"RU" ring=True -> BUTTON:"" ring=True -> A:"Skip to content" ring=True -> DIV:"A. Homeopathy is an alternative system of medicine" ring=True -> SELECT:"Choose a headingiiiiiiivvviviiviiiixx" ring=True -> BUTTON:"Give me a hint" ring=True -> SELECT:"Choose a headingiiiiiiivvviviiviiiixx" ring=True -> BUTTON:"Give me a hint" ring=True -> SELECT:"Choose a headingiiiiiiivvviviiviiiixx" ring=True -> BUTTON:"Give me a hint" ring=True -> SELECT:"Choose a headingiiiiiiivvviviiviiiixx" ring=True -> BUTTON:"Give me a hint" ring=True -> SELECT:"Choose a headingiiiiiiivvviviiviiiixx" ring=True -> BUTTON:"Give me a hint" ring=True -> SELECT:"Choose a headingiiiiiiivvviviiviiiixx" ring=True -> BUTTON:"Give me a hint" ring=True -> BUTTON:"Check my answers" ring=True
| [keyboard] the exercise's answer controls, hints and Check button are all reachable by Tab | PASS | reached the Check button = True after 24 stops |
| [keyboard] every control in the exercise shows a visible ring | PASS | controls with no visible ring: none |
| [keyboard] a hint can be asked for with Enter | PASS | .help-replies present after Enter = 1 |

_screenshot **round2-s15-09-keyboard-focus-exercise-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_
| Reduced motion is honoured: the page still renders, and long animations are gone | PASS | matchMedia reduce = True, elements with an animation or transition longer than 0.35s = 0, Today still renders one session = True |

_screenshot **round2-s15-10-reduced-motion-today-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

**Scenario 15 parts B and C:** no console errors, no failed/4xx/5xx requests.

## Scenario 16: Progress reporting

Seed SYNTHETIC-matching-headings, then add a self-reported band through the real "Add a recent score, if you have one" control in plan settings.

| Check | Result | Observed |
|---|---|---|
| On the right page: plan settings | PASS | url="http://127.0.0.1:4340/ielts-website/plan-settings" (expected to contain "/plan-settings"), landmark heading="Your study plan" (expected to contain "Your study plan") |
| The "Add a recent score" control exists and opens | PASS | details present=1, fields visible=True |

**Self-report form fields:** {"selects": [{"id": "intake-self-band", "options": ["", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0"]}, {"id": "intake-self-paper", "options": ["", "reading", "listening", "writing", "speaking"]}], "inputs": [{"id": "intake-self-date", "type": "date"}], "buttons": ["Add this score"], "helper": "This is self-reported. It helps us get started, but it is never treated as a measured result."}
| A self-reported score can be recorded, and is labelled self-reported when saved | PASS | save attempted=True, confirmation "Saved as self-reported" shown=True |

_screenshot **round2-s16-01-self-reported-score-saved-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/plan-settings`, landmark heading="None"_

**Self-reported entries on the record:** [{"paper": "speaking", "band": 6.5, "takenOn": "2026-08-15", "reportedAt": "2026-09-23T05:35:55.598Z", "id": "self:eb60063801bba76245a04b7a37647eb6"}]
| On the right page: the progress report | PASS | url="http://127.0.0.1:4340/ielts-website/report" (expected to contain "/report"), landmark heading="Your progress, one page." (expected to contain "Your progress") |

**Four skill panels:** [{"paper": "Reading", "certainty": "LIMITED EVIDENCE", "band": "4.5 to 7.5band", "meta": ["Checked 2 days ago", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Listening", "certainty": "LIMITED EVIDENCE", "band": "5.0 to 8.0band", "meta": ["Checked 8 days ago", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Writing", "certainty": "LIMITED EVIDENCE", "band": "4.5 to 7.5band", "meta": ["Checked 7 days ago", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Speaking", "certainty": "LIMITED EVIDENCE", "band": "5.0 to 8.0band", "meta": ["Checked 6 days ago", "0 lessons or drills studied", "Needs band 7 for your target"]}]
| Four separate skill panels, one per paper | PASS | panels found = ['Reading', 'Listening', 'Writing', 'Speaking'] |
| The report says outright that the four are never averaged into one line | PASS | looked for the no-single-trend-line statement; present = True |
| Certainty is in words, with no number or percentage | PASS | certainty labels = ['LIMITED EVIDENCE', 'LIMITED EVIDENCE', 'LIMITED EVIDENCE', 'LIMITED EVIDENCE'] |
| Unknown is shown as unknown, never as zero | PASS | panels claiming a zero band while certainty is unknown = none; band lines = ['4.5 to 7.5band', '5.0 to 8.0band', '4.5 to 7.5band', '5.0 to 8.0band'] |
| The self-reported score is labelled self-reported AND carries its date | PASS | 2 occurrence(s) of the words 'self-reported' on the report: ["SELF-REPORTED SCORES", "These are self-reported: your own account of a score from somewhere else, on the date you gave, kept apart from everything measured here and never counted toward a target."]. Self-reported block text: "SELF-REPORTED SCORES  These are self-reported: your own account of a score from somewhere else, on the date you gave, kept apart from everything measured here and never counted toward a target.  Speaking: band 6.5, taken 15 August 2026". The band 6.5 appears anywhere on the page=True; its date (15 August 2026) appears=True. |

**Per-paper panels on the report:** {"Reading": {"WHAT IMPROVED": "Nothing to report yet from independent evidence alone.", "WHAT REMAINS UNCERTAIN": "Reading evidence is real but coarse: older, migrated results with no per-question detail, so it is kept to limited confidence.", "WHAT TO WORK ON NEXT": "This is today's focus: Match a heading to a paragraph by its main idea rather than by a repeated word.", "WHAT CHANGED IN THE SCHEDULE, AND WHY": "\u201cYour plan is set up. Today is Match a heading to a paragraph by its main idea rather than by a repeated word.\u201d"}, "Listening": {"WHAT IMPROVED": "Nothing to report yet from independent evidence alone.", "WHAT REMAINS UNCERTAIN": "Listening evidence is real but coarse: older, migrated results with no per-question detail, so it is kept to limited confidence.", "WHAT TO WORK ON NEXT": "Listening is priority 3 of the papers with a gap left, behind today's focus.", "WHAT CHANGED IN THE SCHEDULE, AND WHY": "No change to the schedule for this paper recently."}, "Writing": {"WHAT IMPROVED": "Nothing to report yet from independent evidence alone.", "WHAT REMAINS UNCERTAIN": "Writing evidence is real but coarse: older, migrated results with no per-question detail, so it is kept to limited confidence.", "WHAT TO WORK ON NEXT": "Writing is priority 2 of the papers with a gap left, behind today's focus.", "WHAT CHANGED IN THE SCHEDULE, AND WHY": "No change to the schedule for this paper recently."}, "Speaking": {"WHAT IMPROVED": "Nothing to report yet from independent evidence alone.", "WHAT REMAINS UNCERTAIN": "Speaking evidence is real but coarse: older, migrated results with no per-question detail, so it is kept to limited confidence.", "WHAT TO WORK ON NEXT": "Speaking is priority 4 of the papers with a gap left, behind today's focus.", "WHAT CHANGED IN THE SCHEDULE, AND WHY": "No change to the schedule for this paper recently."}}
| Where something was not counted, the report says so and says why | PASS | "not counted" on the page = False; the uncertainty column reads: "Reading evidence is real but coarse: older, migrated results with no per-question detail, so it is kept to limited confidence. Listening evidence is real but coarse: older, migrated results with no per-question detail, so it is kept to limited confidence. Writing evidence is real but coarse: older, migrated results with no per-question detail, so it is kept to limited confidence. Speaking evidence is real but coarse:" |
| What changed in the plan is quoted back, not paraphrased | PASS | quoted change lines = ["\u201cYour plan is set up. Today is Match a heading to a paragraph by its main idea rather than by a repeated word.\u201d"] |
| No percentage of the library is presented as readiness | PASS | percentage strings anywhere on the report = none. Library counts are shown as plain 'n of m' pairs instead: ['0 / 13', '0 / 11', '0 / 11', '0 / 4', '0 / 37', '0 / 76'] |

_screenshot **round2-s16-02-report-four-skill-panels-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_

_screenshot **round2-s16-02-report-four-skill-panels-phone.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_

_screenshot **round2-s16-03-report-per-paper-detail-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_

**Scenario 16:** no console errors, no failed/4xx/5xx requests.

## The audit's five reproduced findings, retried on the frozen snapshot

Each finding from docs/audits/personal-learning-plan-2026-09-21.md is deliberately reproduced here, with the observed text recorded.

| Check | Result | Observed |
|---|---|---|
| On the right page: Today, the audit's Matching Headings student | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Match a heading to a paragraph by its main idea rather than by a repeated word." |
| FINDING 1 (contradictory direction) is impossible: Today, the Course route, the tutor's own line and the account overview all name the SAME activity | PASS | Today: "Match a heading to a paragraph by its main idea rather than by a repeated word." -> /ielts-website/lessons/reading-task1 \| Course: "Match a heading to a paragraph by its main idea rather than by a repeated word." -> /ielts-website/lessons/reading-task1 \| Account overview -> /ielts-website/lessons/reading-task1 \| Mr EZ's line on the card: "You answered 2 of 16 of these on your own across 2 sittings. That is below what Reading needs for your target, so it is the most useful hour you have." |

_screenshot **round2-a1-finding1-one-direction-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/account`, landmark heading="Account & progress"_

_screenshot **round2-a1-finding1-one-direction-phone.png**: url=`http://127.0.0.1:4340/ielts-website/account`, landmark heading="Account & progress"_

**Finding 1:** no console errors, no failed/4xx/5xx requests.

_screenshot **round2-a1-finding2-low-target-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

**Finding 2 (band 6.5 with a Writing minimum of 5.5):** no console errors, no failed/4xx/5xx requests.

_screenshot **round2-a1-finding2-high-target-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

**Finding 2 (band 9.0 with a Writing minimum of 9.0):** no console errors, no failed/4xx/5xx requests.

**Finding 2, the two schedules:** {"band 6.5 with a Writing minimum of 5.5": {"today": "Match a heading to a paragraph by its main idea rather than by a repeated word.", "kicker": "READING, MATCHING HEADINGS", "storedGoals": {"overallTarget": {"band": 6.5, "status": "confirmed"}, "perPaperMinimums": {"writing": {"band": 5.5, "status": "confirmed"}}, "examDate": {"date": "2026-11-18", "status": "confirmed"}, "route": "academic", "selfReported": []}, "schedule": [["2026-09-23", "Match a heading to a paragraph by its main idea rather than by a repeated word."], ["2026-09-24", "Complete a sentence with the exact words you hear, inside the word limit."], ["2026-09-25", "Decide whether a statement is True, False or Not Given, and know the difference."], ["2026-09-26", "Correct a sentence with two do/make collocation slips, then write your own sentence using one of the same collocations correctly."], ["2026-09-27", "Match each statement to the person, place or thing it belongs to."], ["2026-09-28", "Combine two simple sentences into one accurate complex sentence, using a subordinate clause (because, although, since, while, when, if)."], ["2026-09-29", "Find which paragraph holds one specific piece of information."]], "activityIds": [["lesson:reading-task1", "lesson:reading-headings", "focus:reading-matching-headings-guided", "check:practice-reading-headings"], ["focus:listening-sentence-completion-guided", "focus:reading-sentence-completion-guided"], ["focus:reading-tfng-guided", "focus:writing-task2-cohesion-and-linking-guided"], ["focus:writing-collocation-accuracy-guided", "focus:listening-multiple-choice-guided-2"], ["focus:reading-matching-features-guided", "focus:writing-task2-structure-range-guided"], ["focus:writing-task2-complex-sentences-guided", "focus:listening-matching-features-guided"], ["focus:reading-paragraph-matching-guided", "focus:writing-lexical-topic-vocabulary-guided"]]}, "band 9.0 with a Writing minimum of 9.0": {"today": "Match a heading to a paragraph by its main idea rather than 
| The two different targets really were stored (so the comparison below is fair) | PASS | stored goals at band 6.5 / Writing 5.5 = {"overallTarget": {"band": 6.5, "status": "confirmed"}, "perPaperMinimums": {"writing": {"band": 5.5, "status": "confirmed"}}, "examDate": {"date": "2026-11-18", "status": "confirmed"}, "route": "academic", "selfReported": []}; at band 9.0 / Writing 9.0 = {"overallTarget": {"band": 9, "status": "confirmed"}, "perPaperMinimums": {"writing": {"band": 9, "status": "confirmed"}}, "examDate": {"date": "2026-11-18", "status": "confirmed"}, "route": "academic", "selfReported": []} |
| FINDING 2 (target does not personalize the schedule) is impossible: changing the target and the per-paper minimum changes the schedule | PASS | band 6.5 / Writing 5.5 -> today "Match a heading to a paragraph by its main idea rather than by a repeated word." (READING, MATCHING HEADINGS), 7 scheduled day(s); band 9.0 / Writing 9.0 -> today "Match a heading to a paragraph by its main idea rather than by a repeated word." (READING, MATCHING HEADINGS), 7 scheduled day(s). Day-by-day focus identical=True; activity ids identical=False |

**Finding 3, every scheduled day in storage:** [{"date": "2026-09-23", "budget": 15, "focus": "Fill a gap with the exact words from the passage, inside the word limit.", "ids": ["lesson:reading-task1", "lesson:reading-sentence", "check:practice-listening-map-labelling"]}, {"date": "2026-09-24", "budget": 15, "focus": "Complete a sentence with the exact words you hear, inside the word limit.", "ids": ["focus:listening-sentence-completion-guided", "focus:writing-collocation-accuracy-guided"]}, {"date": "2026-09-25", "budget": 15, "focus": "Decide whether a statement is True, False or Not Given, and know the difference.", "ids": ["focus:reading-tfng-guided", "speak:cc-2026-04"]}, {"date": "2026-09-26", "budget": 15, "focus": "Choose the option the recording supports and let the distractors go past.", "ids": ["focus:listening-multiple-choice-guided-2", "focus:writing-task2-cohesion-and-linking-guided"]}, {"date": "2026-09-27", "budget": 15, "focus": "Match each statement to the person, place or thing it belongs to.", "ids": ["focus:reading-matching-features-guided", "focus:speaking-part2-plan-in-one-minute"]}, {"date": "2026-09-28", "budget": 15, "focus": "Match each item to the person, place or category the speaker gives it.", "ids": ["focus:listening-matching-features-guided", "focus:writing-task2-complex-sentences-guided"]}, {"date": "2026-09-29", "budget": 15, "focus": "Find which paragraph holds one specific piece of infor
| FINDING 3 (a 255-minute day on a 15-minute budget) is impossible | PASS | the plan stored 7 day(s) with budgets [15, 15, 15, 15, 15, 15, 15]; the largest is 15 minutes against the 15 minutes the student chose (the audit reproduced 255) |

_screenshot **round2-a1-finding3-no-overloaded-day-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

**Finding 3:** no console errors, no failed/4xx/5xx requests.
| On the right page: the Speaking Overview lesson | PASS | url="http://127.0.0.1:4340/ielts-website/lessons/speaking" (expected to contain "/lessons/speaking"), landmark heading="Speaking Overview" (expected to contain "Speaking Overview") |

**Finding 4, what the completion click recorded:** [{"activityId": "lesson:speaking", "mode": "practice", "completion": "completed", "assistanceLevel": null, "items": null}]
| FINDING 4 (a completion click counting as understanding) is impossible: the click is recorded as studied, never as a measured result | PASS | the completion click produced 1 event(s) with mode(s) {'practice'} and 0 item outcome(s); an assessment mode would mean it had been treated as a measurement |
| And the report claims no Speaking ability from that click | PASS | the Speaking panel after clicking the completion button: {"paper": "Speaking", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]} |

_screenshot **round2-a1-finding4-completion-is-studied-not-measured-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_

_screenshot **round2-a1-finding4-completion-is-studied-not-measured-phone.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_

**Finding 4:** no console errors, no failed/4xx/5xx requests.
| On the right page: Today on an expired plan | PASS | url="http://127.0.0.1:4340/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Your exam date has passed" |

**Finding 5, the stored plan status on an expired date:** {"status": "date-passed", "confirmed": true, "examDate": {"date": "2026-09-13", "status": "confirmed"}}
| FINDING 5 (an expired plan reading as finished) is impossible: the plan reports the date has passed and asks for a new one, and never reports completion | PASS | heading="Your exam date has passed", .today-finished=0, celebration emoji=0, stored plan status="date-passed", a "set a new date" link is offered=True |

_screenshot **round2-a1-finding5-expired-is-not-complete-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **round2-a1-finding5-expired-is-not-complete-phone.png**: url=`http://127.0.0.1:4340/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

**Finding 5:** no console errors, no failed/4xx/5xx requests.

## Scenario 18: Written evidence (which task it is saved against, and what counts as help)

Fresh context, light confirmed plan, no AI configured. Every assertion below is read out of localStorage, because both defects this scenario covers were invisible on the screen. Reproduces findings 2 and 3 of the independent review of 22 September 2026.

| Check | Result | Observed |
|---|---|---|
| On the right page: the Task 2 focused exercise | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/focused/writing-lexical-topic-vocabulary-check" (expected to contain "/trainers/focused/writing-lexical-topic-vocabulary-check"), landmark heading="Task 2 topic vocabulary: independent check" |

**Saved Task 2 event:** {"id": "ev:aad83451a98200b4af654b65595ac22b", "activityId": "focus:writing-lexical-topic-vocabulary-check", "contentVersion": 1, "at": "2026-09-23T05:36:38.003Z", "localDate": "2026-09-23", "paper": "writing", "subskill": "lexical-precision", "mode": "assessment", "completion": "completed", "assistance": "none", "seenBefore": false, "outcome": {"kind": "objective", "met": false, "subskill": "lexical-precision", "byModel": false}, "items": [{"itemId": "prompt:pte-wt-106-task2", "firstAnswer": "SYNTHETIC: Driverless vehicles rely on sensors, machine learning and real time navigation software, and public investment in that infrastructure is what makes widespread adoption realistic rather than experimental.", "written": true, "correct": false, "assistance": "none", "subskill": "lexical-precision", "seenBefore": false}], "taskScope": {"kind": "writing-task", "task": "task2"}, "sourceMaterial"
| A Task 2 exercise saves its work in the Task 2 scope | PASS | saved taskScope = {"kind": "writing-task", "task": "task2"}, activityId = "focus:writing-lexical-topic-vocabulary-check" |
| An unaided Task 2 answer is saved as unaided | PASS | saved assistance = "none" (nothing was opened before writing) |
| The screen calls a Task 2 paragraph a paragraph, not an overview | PASS | the primary button reads, verbatim: "Check my paragraph" |
| The prompt is labelled Writing Task 2 | PASS | the label above the prompt reads: "WRITING TASK 2 · IN THE FUTURE NOBODY WILL BUY PRINTED NEWSPAPERS" |

_screenshot **round2-s18-01-task2-paragraph-saved-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/writing-lexical-topic-vocabulary-check`, landmark heading="Task 2 topic vocabulary: independent check"_

_screenshot **round2-s18-01-task2-paragraph-saved-phone.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/writing-lexical-topic-vocabulary-check`, landmark heading="Task 2 topic vocabulary: independent check"_
| On the right page: the Task 1 focused exercise | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/focused/writing-task1-overview-check-a" (expected to contain "/trainers/focused/writing-task1-overview-check-a"), landmark heading="Task 1 overview: independent check" |

**Saved Task 1 event:** {"id": "ev:6ba7641adb16711856a25ef437a25f53", "activityId": "focus:writing-task1-overview-check-a", "contentVersion": 1, "at": "2026-09-23T05:36:44.931Z", "localDate": "2026-09-23", "paper": "writing", "subskill": "task1-overview", "mode": "assessment", "completion": "completed", "assistance": "none", "seenBefore": false, "outcome": {"kind": "objective", "met": false, "subskill": "task1-overview", "byModel": false}, "items": [{"itemId": "prompt:pte-wt-117-task1", "firstAnswer": "SYNTHETIC: Overall, the urban share rose in every country over the period, while the rural share fell steadily throughout.", "written": true, "correct": false, "assistance": "none", "subskill": "task1-overview", "seenBefore": false}], "taskScope": {"kind": "writing-task", "task": "task1"}, "sourceMaterial": ["prompt:pte-wt-117-task1"], "provenance": "recorded", "sessionId": "sess:ca298397ce466e460ce05cdbaa18393a"
| A Task 1 exercise saves its work in the Task 1 scope | PASS | saved taskScope = {"kind": "writing-task", "task": "task1"} |
| An unaided Task 1 answer is saved as unaided, even once it has been looked at | PASS | saved assistance = "none" |
| The two tasks are kept apart in the record | PASS | the Task 2 event and the Task 1 event carry different scopes |

_screenshot **round2-s18-02-task1-overview-saved-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/writing-task1-overview-check-a`, landmark heading="Task 1 overview: independent check"_
| On the right page: the guided Task 1 overview | PASS | url="http://127.0.0.1:4340/ielts-website/trainers/focused/writing-task1-overview-guided" (expected to contain "/trainers/focused/writing-task1-overview-guided"), landmark heading="Task 1 overview: guided practice" |
| The guided task offers its guiding questions before the answer | PASS | the questions panel is open = True |

_screenshot **round2-s18-03-guiding-questions-opened-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: guided practice"_

**Saved draft after the reload:** {"draft": "", "help": {"guidingQuestionsOpened": true, "modelShown": false, "tutorJudged": false, "assistance": "hint"}, "attempts": []}
| Opening the guiding questions survives a reload | PASS | the saved draft help = {"guidingQuestionsOpened": true, "modelShown": false, "tutorJudged": false, "assistance": "hint"} |

**Saved guided event:** {"id": "ev:9488cbb966ee4e061a3bea6167fcd3a1", "activityId": "focus:writing-task1-overview-guided", "contentVersion": 1, "at": "2026-09-23T05:36:54.698Z", "localDate": "2026-09-23", "paper": "writing", "subskill": "task1-overview", "mode": "practice", "completion": "completed", "assistance": "hint", "seenBefore": false, "outcome": {"kind": "objective", "met": false, "subskill": "task1-overview", "byModel": false}, "items": [{"itemId": "prompt:pte-wt-129-task1", "firstAnswer": "SYNTHETIC: Overall, participation grew in almost every activity, although one of them fell away sharply by the end of the period.", "written": true, "correct": false, "assistance": "hint", "subskill": "task1-overview", "seenBefore": false}], "taskScope": {"kind": "writing-task", "task": "task1"}, "sourceMaterial": ["prompt:pte-wt-129-task1"], "provenance": "recorded", "sessionId": "sess:ca298397ce466e460ce05cdbaa183
| An answer written after a hint is saved as assisted, even across the reload | PASS | saved assistance = "hint" (expected a level above "none"); the button read "Check my overview" |
| Nothing on the page claims a band for a short piece of writing | PASS | the page states plainly that this is not a band = True |

_screenshot **round2-s18-04-assisted-after-reload-desktop.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: guided practice"_

_screenshot **round2-s18-04-assisted-after-reload-phone.png**: url=`http://127.0.0.1:4340/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: guided practice"_

**Scenario 18:** no console errors, no failed/4xx/5xx requests.

## Scenario 19: /report document width and certainty badge containment (finding 5)

A populated report (SYNTHETIC-matching-headings, seeded the way f16_progress.py does) and an empty one (no progress, no saved plan), at 320px, 390px and 1440px, in English and Russian. Two independent checks per width: no document-level horizontal overflow, and no certainty badge breaking its own card's edge.

| Check | Result | Observed |
|---|---|---|
| On the right page: the populated report (en) | PASS | url="http://127.0.0.1:4340/ielts-website/report" (expected to contain "/report"), landmark heading="Your progress, one page." |

**populated report, en: skill panels found:** [{"paper": "Reading", "certainty": "LIMITED EVIDENCE", "band": "4.5 to 7.5band", "meta": ["Checked 2 days ago", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Listening", "certainty": "LIMITED EVIDENCE", "band": "5.0 to 8.0band", "meta": ["Checked 8 days ago", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Writing", "certainty": "LIMITED EVIDENCE", "band": "4.5 to 7.5band", "meta": ["Checked 7 days ago", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Speaking", "certainty": "LIMITED EVIDENCE", "band": "5.0 to 8.0band", "meta": ["Checked 6 days ago", "0 lessons or drills studied", "Needs band 7 for your target"]}]
| [EN] populated report: four skill panels rendered (the certainty badges being checked actually exist) | PASS | panels found = ['Reading', 'Listening', 'Writing', 'Speaking'] |
| [EN 320px] populated report: document is never wider than the viewport | PASS | documentElement.scrollWidth=320, clientWidth=320 (viewport set to 320px) |
| [EN 320px] populated report: no certainty badge extends past its own card | PASS | 4 badge(s) checked, 0 overflowing their card: [] |

_screenshot **round2-f19-populated-en-320.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_
| [EN 390px] populated report: document is never wider than the viewport | PASS | documentElement.scrollWidth=390, clientWidth=390 (viewport set to 390px) |
| [EN 390px] populated report: no certainty badge extends past its own card | PASS | 4 badge(s) checked, 0 overflowing their card: [] |

_screenshot **round2-f19-populated-en-390.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_
| [EN 1440px] populated report: document is never wider than the viewport | PASS | documentElement.scrollWidth=1440, clientWidth=1440 (viewport set to 1440px) |
| [EN 1440px] populated report: no certainty badge extends past its own card | PASS | 4 badge(s) checked, 0 overflowing their card: [] |

_screenshot **round2-f19-populated-en-1440.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_

**Scenario 19 (populated, en):** no console errors, no failed/4xx/5xx requests.
| On the right page: the populated report (ru) | PASS | url="http://127.0.0.1:4340/ielts-website/report" (expected to contain "/report"), landmark heading="Ваш прогресс на одной странице." |

**populated report, ru: skill panels found:** [{"paper": "Чтение", "certainty": "МАЛО ДАННЫХ", "band": "от 4.5 до 7.5балл", "meta": ["Проверено 2 дня назад", "изучено 0 занятий", "Для вашей цели нужен балл 7"]}, {"paper": "Аудирование", "certainty": "МАЛО ДАННЫХ", "band": "от 5.0 до 8.0балл", "meta": ["Проверено 8 дней назад", "изучено 0 занятий", "Для вашей цели нужен балл 7"]}, {"paper": "Письмо", "certainty": "МАЛО ДАННЫХ", "band": "от 4.5 до 7.5балл", "meta": ["Проверено 7 дней назад", "изучено 0 занятий", "Для вашей цели нужен балл 7"]}, {"paper": "Говорение", "certainty": "МАЛО ДАННЫХ", "band": "от 5.0 до 8.0балл", "meta": ["Проверено 6 дней назад", "изучено 0 занятий", "Для вашей цели нужен балл 7"]}]
| [RU] populated report: four skill panels rendered (the certainty badges being checked actually exist) | PASS | panels found = ['Чтение', 'Аудирование', 'Письмо', 'Говорение'] |
| [RU 320px] populated report: document is never wider than the viewport | PASS | documentElement.scrollWidth=320, clientWidth=320 (viewport set to 320px) |
| [RU 320px] populated report: no certainty badge extends past its own card | PASS | 4 badge(s) checked, 0 overflowing their card: [] |

_screenshot **round2-f19-populated-ru-320.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Ваш прогресс на одной странице."_
| [RU 390px] populated report: document is never wider than the viewport | PASS | documentElement.scrollWidth=390, clientWidth=390 (viewport set to 390px) |
| [RU 390px] populated report: no certainty badge extends past its own card | PASS | 4 badge(s) checked, 0 overflowing their card: [] |

_screenshot **round2-f19-populated-ru-390.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Ваш прогресс на одной странице."_
| [RU 1440px] populated report: document is never wider than the viewport | PASS | documentElement.scrollWidth=1440, clientWidth=1440 (viewport set to 1440px) |
| [RU 1440px] populated report: no certainty badge extends past its own card | PASS | 4 badge(s) checked, 0 overflowing their card: [] |

_screenshot **round2-f19-populated-ru-1440.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Ваш прогресс на одной странице."_

**Scenario 19 (populated, ru):** no console errors, no failed/4xx/5xx requests.
| On the right page: the empty report (en) | PASS | url="http://127.0.0.1:4340/ielts-website/report" (expected to contain "/report"), landmark heading="Your progress, one page." |

**empty report, en: skill panels found:** [{"paper": "Reading", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied"]}, {"paper": "Listening", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied"]}, {"paper": "Writing", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied"]}, {"paper": "Speaking", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied"]}]
| [EN] empty report: four skill panels rendered (the certainty badges being checked actually exist) | PASS | panels found = ['Reading', 'Listening', 'Writing', 'Speaking'] |
| [EN 320px] empty report: document is never wider than the viewport | PASS | documentElement.scrollWidth=320, clientWidth=320 (viewport set to 320px) |
| [EN 320px] empty report: no certainty badge extends past its own card | PASS | 4 badge(s) checked, 0 overflowing their card: [] |

_screenshot **round2-f19-empty-en-320.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_
| [EN 390px] empty report: document is never wider than the viewport | PASS | documentElement.scrollWidth=390, clientWidth=390 (viewport set to 390px) |
| [EN 390px] empty report: no certainty badge extends past its own card | PASS | 4 badge(s) checked, 0 overflowing their card: [] |

_screenshot **round2-f19-empty-en-390.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_
| [EN 1440px] empty report: document is never wider than the viewport | PASS | documentElement.scrollWidth=1440, clientWidth=1440 (viewport set to 1440px) |
| [EN 1440px] empty report: no certainty badge extends past its own card | PASS | 4 badge(s) checked, 0 overflowing their card: [] |

_screenshot **round2-f19-empty-en-1440.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Your progress, one page."_

**Scenario 19 (empty, en):** no console errors, no failed/4xx/5xx requests.
| On the right page: the empty report (ru) | PASS | url="http://127.0.0.1:4340/ielts-website/report" (expected to contain "/report"), landmark heading="Ваш прогресс на одной странице." |

**empty report, ru: skill panels found:** [{"paper": "Чтение", "certainty": "НЕИЗВЕСТНО", "band": "", "meta": ["Пока нет данных", "изучено 0 занятий"]}, {"paper": "Аудирование", "certainty": "НЕИЗВЕСТНО", "band": "", "meta": ["Пока нет данных", "изучено 0 занятий"]}, {"paper": "Письмо", "certainty": "НЕИЗВЕСТНО", "band": "", "meta": ["Пока нет данных", "изучено 0 занятий"]}, {"paper": "Говорение", "certainty": "НЕИЗВЕСТНО", "band": "", "meta": ["Пока нет данных", "изучено 0 занятий"]}]
| [RU] empty report: four skill panels rendered (the certainty badges being checked actually exist) | PASS | panels found = ['Чтение', 'Аудирование', 'Письмо', 'Говорение'] |
| [RU 320px] empty report: document is never wider than the viewport | PASS | documentElement.scrollWidth=320, clientWidth=320 (viewport set to 320px) |
| [RU 320px] empty report: no certainty badge extends past its own card | PASS | 4 badge(s) checked, 0 overflowing their card: [] |

_screenshot **round2-f19-empty-ru-320.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Ваш прогресс на одной странице."_
| [RU 390px] empty report: document is never wider than the viewport | PASS | documentElement.scrollWidth=390, clientWidth=390 (viewport set to 390px) |
| [RU 390px] empty report: no certainty badge extends past its own card | PASS | 4 badge(s) checked, 0 overflowing their card: [] |

_screenshot **round2-f19-empty-ru-390.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Ваш прогресс на одной странице."_
| [RU 1440px] empty report: document is never wider than the viewport | PASS | documentElement.scrollWidth=1440, clientWidth=1440 (viewport set to 1440px) |
| [RU 1440px] empty report: no certainty badge extends past its own card | PASS | 4 badge(s) checked, 0 overflowing their card: [] |

_screenshot **round2-f19-empty-ru-1440.png**: url=`http://127.0.0.1:4340/ielts-website/report`, landmark heading="Ваш прогресс на одной странице."_

**Scenario 19 (empty, ru):** no console errors, no failed/4xx/5xx requests.
