# The three frozen-suite scenarios whose expectations changed with the signed-in-only help buttons

Run on 2026-09-30 against a DEV server at http://127.0.0.1:4388/ielts-website with NO accounts and no tutor configured (no PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY or PUBLIC_MR_EZ_URL), which is the situation of the frozen production snapshot the full suite runs on: nobody can sign in, so no Mr EZ help button may appear anywhere. It is NOT the frozen snapshot itself (that one was built before this change and is not this run's to rebuild). Scenarios 8, 13 and 15 are the ones whose expectations were edited; the other sixteen do not look at a help button.

Every scenario opens its own fresh browser context and seeds its own SYNTHETIC data. **Nothing here is a real student.**

## Scenario 8: Real learning (guided practice, retries, independent check)

Seed a light confirmed plan (band 7.0, exam in 40 days, 60 minutes) so the student is a returning one, then drive the Reading Matching Headings pilot for real. The visitor is signed out (this build has no accounts), so no Mr EZ help button may appear anywhere.

| Check | Result | Observed |
|---|---|---|
| On the right page: the guided Matching Headings exercise | PASS | url="http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided" (expected to contain "/trainers/focused/reading-matching-headings-guided"), landmark heading="Matching Headings: guided practice" (expected to contain "Matching Headings: guided practice") |
| The guided exercise says it is guided, and offers a signed-out visitor no hint control (Mr EZ's help is for signed-in students only) | PASS | eyebrow="GUIDED PRACTICE · 12 MIN", 0 help control(s) on the page (expected 0 signed out) |

_screenshot **helpgate-suite-s08-01-guided-before-answering-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_
| The exercise has six real questions from a real paper | PASS | 6 answer control(s) |
| Exactly the one deliberate mistake is marked wrong | PASS | 1 wrong, 5 right (question 16 was answered ii, the correct answer is viii) |
| The "how did you choose it?" question appears with real reason options | PASS | wrong line="You chose ii. That is not the one.", ask="How did you choose it?", options=['It repeats words from the paragraph', 'It matches the first sentence', 'It fits one detail in the paragraph', 'Two headings looked the same to me', 'I ran out of time', 'I guessed'] |
| No explanation is shown for the wrong answer before the student is asked how they chose | PASS | explanation blocks inside the wrong item before picking a reason = 0 |

_screenshot **helpgate-suite-s08-02-guided-wrong-answer-asks-how-you-chose-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_

_screenshot **helpgate-suite-s08-02-guided-wrong-answer-asks-how-you-chose-phone.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_
| A TENTATIVE diagnosis appears, worded as a hypothesis rather than a verdict | PASS | wrong item now reads: "16 Section D Choose a heading i ii iii iv v vi vii viii ix x  You chose ii. That is not the one.  This looks like choosing a heading because its words appear in the paragraph, rather than because it says what the paragraph is about, going by what you told us. It is worth checking against the next one rather than taking it as settled.  The sentence that decides this one: given rise to controversy  Try this one again" |
| The teacher's own explanation is attached: the exact sentence in the passage that decides the answer | PASS | evidence pointer present=True |
| A second go is offered ("Try this one again") | PASS | 1 retry control(s), label="Try this one again" |
| The summary refuses to call guided work mastery, and says so in words | PASS | summary: "5 / 6  You worked 6 questions and got 5 right, 0 of them with help.  This was practice with help available, so it shows guided work rather than what you can do on your own. The check that follows is what shows that.  Nothing here is a band, and one set is never mastery.  What changed: Today moves from Fill a gap with the exact words from the passage, inside the word limit to Complete a sentence with the exact words you hear, inside the word limit. Nothing has been measured for Listening yet, so the plan cannot say where you are. A short sample changes that.  Read the method again  This was extra practice. It has been recorded, and the plan has been worked out again around it.  Back to today's session →" |

_screenshot **helpgate-suite-s08-03-guided-diagnosis-and-explanation-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_

_screenshot **helpgate-suite-s08-03-guided-diagnosis-and-explanation-phone.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_
| The retry is accepted and shown as a retry, not as a fresh clean result | PASS | after the retry the screen reads: "14 Section B Choose a heading i ii iii iv v vi vii viii ix x  Section B explains Hahnemann's accidental discovery and his experiments that formed the theoretical basis of homeopathy, matching v.  condensed his theory into a single Latin phrase" |

_screenshot **helpgate-suite-s08-04-guided-after-retry-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_

**Stored events for the guided exercise:** 2. [{"at": "2026-09-30T17:08:54.613Z", "mode": "practice", "assistanceLevel": null, "completion": "completed", "retryOf": null, "activityId": "focus:reading-matching-headings-guided"}, {"at": "2026-09-30T17:08:57.478Z", "mode": "practice", "assistanceLevel": null, "completion": "completed", "retryOf": "ev:28e494f75a3b6dd05e04805d45780371", "activityId": "focus:reading-matching-headings-guided"}]
| The FIRST answer is stored, exactly as it was given, before any explanation appeared | PASS | stored item outcomes: [{"itemId": "reading-full-020:q14", "firstAnswer": "v", "correct": true, "assistance": null}, {"itemId": "reading-full-020:q15", "firstAnswer": "vii", "correct": true, "assistance": null}, {"itemId": "reading-full-020:q16", "firstAnswer": "ii", "correct": false, "assistance": null}, {"itemId": "reading-full-020:q17", "firstAnswer": "x", "correct": true, "assistance": null}, {"itemId": "reading-full-020:q18", "firstAnswer": "iii", "correct": true, "assistance": null}, {"itemId": "reading-full-020:q19", "firstAnswer": "ix", "correct": true, "assistance": null}, {"itemId": "reading-full-020:q16", "firstAnswer": "ii", "correct": false, "assistance": null}] |
| On the right page: the Reading Headings lesson | PASS | url="http://127.0.0.1:4388/ielts-website/lessons/reading/headings" (expected to contain "/lessons/reading/headings"), landmark heading="Matching Headings" |
| The lesson quick check is the real paper this scenario expects (Academic Reading Test 6, Passage 2) | PASS | identified by its heading list; if this ever changes the answer key below is wrong and the scenario would say so. unit_is_test6=True |
| A signed-out visitor is offered no Mr EZ help on the lesson: no hint on the quick check, no 'Explain this differently' or 'Show me an example' under the blocks, and no fallback note in their place | PASS | quick-check hint controls=0, block help controls=0, help controls of any kind=0, fallback note on the page=False |

_screenshot **helpgate-suite-s08-05-lesson-no-help-signed-out-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_
| The quick check was then answered correctly and submitted | PASS | answers chosen = ['v', 'ii', 'iv', 'vii', 'iii', 'vi'], submitted = True |

_screenshot **helpgate-suite-s08-06-lesson-quick-check-answered-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_
| On the right page: the independent check exercise | PASS | url="http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-check-a" (expected to contain "/trainers/focused/reading-matching-headings-check-a"), landmark heading="Matching Headings: independent check" (expected to contain "independent check") |
| The independent check offers NO hints and no tutor at all | PASS | eyebrow="INDEPENDENT CHECK · 8 MIN", hint controls=0, Mr EZ launcher present=1 |

_screenshot **helpgate-suite-s08-07-independent-check-no-help-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-check-a`, landmark heading="Matching Headings: independent check"_

_screenshot **helpgate-suite-s08-08-independent-check-result-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-check-a`, landmark heading="Matching Headings: independent check"_

**Every event now on the learner record:** [{"activityId": "focus:reading-matching-headings-guided", "mode": "practice", "assistanceLevel": null, "completion": "completed", "items": 6}, {"activityId": "focus:reading-matching-headings-guided", "mode": "practice", "assistanceLevel": null, "completion": "completed", "items": 1}, {"activityId": "check:practice-reading-headings", "mode": "lesson-check", "assistanceLevel": null, "completion": "completed", "items": 6}, {"activityId": "focus:reading-matching-headings-check-a", "mode": "assessment", "assistanceLevel": null, "completion": "completed", "items": 6}]
| With no hint offered to a signed-out visitor, no lesson quick-check answer is recorded as hint-assisted | PASS | hint-assisted quick-check items: []; every assisted item on the record: [] |
| The independent check's items are recorded as independent assessment, not as guided practice | PASS | independent-check events: [{"activityId": "focus:reading-matching-headings-check-a", "mode": "assessment", "assistanceLevel": null}] |
| The lesson quick check is recorded as a lesson check, distinct from an independent assessment | PASS | lesson-check events: [{"activityId": "check:practice-reading-headings", "mode": "lesson-check"}] |
| On the right page: the progress report | PASS | url="http://127.0.0.1:4388/ielts-website/report" (expected to contain "/report"), landmark heading="Your progress, one page." (expected to contain "Your progress") |
| No mastery wording anywhere on the progress page | PASS | mastery-style words found = none |
| Certainty is expressed in words, never as a percentage or a score | PASS | certainty labels = ['LIMITED EVIDENCE', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN'] |

**Skill panels on the report:** [{"paper": "Reading", "certainty": "LIMITED EVIDENCE", "band": "", "meta": ["Checked 0 days ago", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Listening", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Writing", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]}, {"paper": "Speaking", "certainty": "UNKNOWN", "band": "", "meta": ["No evidence yet", "0 lessons or drills studied", "Needs band 7 for your target"]}]

_screenshot **helpgate-suite-s08-09-report-no-mastery-claim-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/report`, landmark heading="Your progress, one page."_

_screenshot **helpgate-suite-s08-09-report-no-mastery-claim-phone.png**: url=`http://127.0.0.1:4388/ielts-website/report`, landmark heading="Your progress, one page."_

**Scenario 8:** no console errors, no failed/4xx/5xx requests.

## Scenario 13: Assessment boundary

Fresh context, light confirmed plan. Start a real timed full Reading paper, then the independent check, then finish and open the review.

| Check | Result | Observed |
|---|---|---|
| On the right page: the full Reading paper's start screen | PASS | url="http://127.0.0.1:4388/ielts-website/tests/reading-full-030" (expected to contain "/tests/reading-full-030"), landmark heading="Academic Reading Test 30" |

**Mr EZ before the clock starts:** {"launcher": 0, "launcher_class": null, "avatar_class": null, "panel": 0, "note": null, "composer": 0, "blocked_text": null, "panel_text": null}
| A real timed Reading paper can be started | PASS | Start control present=0, started=True |

**Mr EZ during the timed paper:** {"launcher": 0, "launcher_class": null, "avatar_class": null, "panel": 0, "note": null, "composer": 0, "blocked_text": null, "panel_text": null}
| No help control of any kind exists during the timed paper | PASS | help controls on the page during the exam = 0 |
| The tutor is blocked during the exam, and says why in a calm sentence | PASS | launcher present=0, panel present=0. What it says, verbatim: "(nothing)" |
| A direct question cannot be typed to the tutor during the exam | PASS | message box present=0, enabled=False |

_screenshot **helpgate-suite-s13-01-tutor-blocked-during-timed-paper-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/tests/reading-full-030`, landmark heading="None"_

_screenshot **helpgate-suite-s13-01-tutor-blocked-during-timed-paper-phone.png**: url=`http://127.0.0.1:4388/ielts-website/tests/reading-full-030`, landmark heading="None"_
| On the right page: the independent check | PASS | url="http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-check-a" (expected to contain "/trainers/focused/reading-matching-headings-check-a"), landmark heading="Matching Headings: independent check" (expected to contain "independent check") |

**Mr EZ on the independent check:** {"launcher": 1, "launcher_class": "mrez-launcher", "avatar_class": "mrez-avatar is-unavailable has-approved-art", "panel": 1, "note": "No hints, examples or answers while the clock is running. Ask me again once you submit, this conversation will still be here.", "composer": 1, "blocked_text": null, "panel_text": "Mr EZInvigilating: no answers until the timer stopsClose Mr EZ\u00d7No hints, examples or answers while the clock is running. Ask me again once you submit, this conversation will still be here.Mr EZ is not switched on for this build yet. Your next step on the dashboard still works, it just comes with a plain explanation instead of his.Your message to Mr EZSend"}
| No help control exists on the independent check either | PASS | help controls on the independent check = 0 |
| The tutor is closed for the duration of the independent check, with an explanation | PASS | launcher present=1. It says: "Mr EZ Invigilating: no answers until the timer stops Close Mr EZ ×  No hints, examples or answers while the clock is running. Ask me again once you submit, this conversation will still be here.  Mr EZ is not switched on for this build yet. Your next step on the dashboard still works, it just comes with a plain explanation instead of his.  Your message to Mr EZ Send" |

_screenshot **helpgate-suite-s13-02-tutor-on-independent-check-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-check-a`, landmark heading="Matching Headings: independent check"_
| After the check is finished, the review shows the explanations it withheld | PASS | 7 explanation block(s) now on the page; the summary reads "1 / 6  On questions you had not seen, with no help, you matched 1 of 6.  That is one independent set. It is enough to move what your plan works on next, and it is not a band and not a final answer about this question type.  What a short set cannot show is how this holds up under exam timing on a who" |
| The tutor becomes available again once the check is over | PASS | launcher present after finishing=1, note="Mr EZ is not switched on for this build yet. Your next step on the dashboard still works, it just comes with a plain explanation instead of his." (AI is not configured on this snapshot, so the honest available-again state is the plain unavailable notice, not a reply) |

_screenshot **helpgate-suite-s13-03-review-after-check-tutor-available-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-check-a`, landmark heading="Matching Headings: independent check"_

_screenshot **helpgate-suite-s13-03-review-after-check-tutor-available-phone.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-check-a`, landmark heading="Matching Headings: independent check"_

**Scenario 13:** no console errors, no failed/4xx/5xx requests.

## Scenario 15: Language and access

Seed SYNTHETIC-matching-headings. Russian is requested with ?lang=ru, which always wins over the device language. Phone viewport is 390x844.

| Check | Result | Observed |
|---|---|---|
| [RU 390px] Today is served in Russian | PASS | html lang="ru", url=http://127.0.0.1:4388/ielts-website/dashboard |
| [RU 390px] Today has no horizontal scroll | PASS | documentElement.scrollWidth <= clientWidth: True |
| [RU 390px] Today: no English interface string is left on screen | PASS | 0 English line(s) still shown: [] |

_screenshot **helpgate-suite-s15-01-today-ru-phone.png**: url=`http://127.0.0.1:4388/ielts-website/dashboard`, landmark heading="Добрый вечер.
Немного практики. Ещё один шаг вперёд."_
| [RU 390px] the Course route is served in Russian | PASS | html lang="ru", url=http://127.0.0.1:4388/ielts-website/start |
| [RU 390px] the Course route has no horizontal scroll | PASS | documentElement.scrollWidth <= clientWidth: True |
| [RU 390px] the Course route: no English interface string is left on screen | FAIL | 10 English line(s) still shown: ["Short-answer Questions", "Sentence Completion", "Summary, Note, Table & Flow-chart Completion", "Diagram Label Completion", "Multiple Choice", "True / False / Not Given", "Yes / No / Not Given", "Matching Information", "Matching Features", "Matching Sentence Endings"] |

_screenshot **helpgate-suite-s15-02-course-ru-phone.png**: url=`http://127.0.0.1:4388/ielts-website/start`, landmark heading="Курс IELTS"_
| [RU 390px] the intake / plan settings is served in Russian | PASS | html lang="ru", url=http://127.0.0.1:4388/ielts-website/plan-settings |
| [RU 390px] the intake / plan settings has no horizontal scroll | PASS | documentElement.scrollWidth <= clientWidth: True |
| [RU 390px] the intake / plan settings: no English interface string is left on screen | PASS | 0 English line(s) still shown: [] |

_screenshot **helpgate-suite-s15-03-plan-settings-ru-phone.png**: url=`http://127.0.0.1:4388/ielts-website/plan-settings`, landmark heading="Ваш учебный план"_
| [RU 390px] a focused exercise is served in Russian | PASS | html lang="ru", url=http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided |
| [RU 390px] a focused exercise has no horizontal scroll | PASS | documentElement.scrollWidth <= clientWidth: True |
| [RU 390px] a focused exercise: no English interface string is left on screen | PASS | 0 English line(s) still shown: [] |

_screenshot **helpgate-suite-s15-04-focused-exercise-ru-phone.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: практика с подсказками"_
| [RU 390px] the progress report is served in Russian | PASS | html lang="ru", url=http://127.0.0.1:4388/ielts-website/report |
| [RU 390px] the progress report has no horizontal scroll | PASS | documentElement.scrollWidth <= clientWidth: True |
| [RU 390px] the progress report: no English interface string is left on screen | PASS | 0 English line(s) still shown: [] |

_screenshot **helpgate-suite-s15-05-report-ru-phone.png**: url=`http://127.0.0.1:4388/ielts-website/report`, landmark heading="Ваш прогресс на одной странице."_
| On the right page: the focused exercise in Russian | PASS | url="http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided" (expected to contain "/trainers/focused/reading-matching-headings-guided"), landmark heading="Matching Headings: практика с подсказками" |
| Exam content stays English in the Russian interface | PASS | passage begins "A. Homeopathy is an alternative system of medicine, founded in the early 19th century by a German physician, D"; heading list begins "There are more headings than sections so you will not use all of them.  i. The future of homeopathy ii. Concer" |

_screenshot **helpgate-suite-s15-06-exam-content-stays-english-phone.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: практика с подсказками"_

**Every English interface line still shown in the Russian view, by surface:** {"Today": [], "the Course route": ["Short-answer Questions", "Sentence Completion", "Summary, Note, Table & Flow-chart Completion", "Diagram Label Completion", "Multiple Choice", "True / False / Not Given", "Yes / No / Not Given", "Matching Information", "Matching Features", "Matching Sentence Endings"], "the intake / plan settings": [], "a focused exercise": [], "the progress report": []}

Two of these groups are pre-excused by the project's own CLAUDE.md as known and scheduled (the session objective sentences and the reason sentences). Everything else in the lists above is a genuine untranslated interface string: the step purpose sentences, the Mr EZ panel's whole introduction, the milestone labels, the report's page chrome, its paper names, its date stamps and its subskill labels.

**Scenario 15 part A:** no console errors, no failed/4xx/5xx requests.
| On the right page: Today for the keyboard walk | PASS | url="http://127.0.0.1:4388/ielts-website/dashboard" (expected to contain "/dashboard"), landmark heading="Match a heading to a paragraph by its main idea rather than by a repeated word." |

**Keyboard trail on Today:** A:"IELTS is EZ" ring=True -> A:"Today" ring=True -> A:"Course" ring=True -> A:"Practice" ring=True -> A:"Tests" ring=True -> A:"Vocabulary" ring=True -> BUTTON:"EN" ring=True -> BUTTON:"RU" ring=True -> BUTTON:"" ring=True -> A:"Skip to content" ring=True -> A:"Start" ring=True -> SUMMARY:"Today’s activities" ring=True -> BUTTON:"Why this" ring=True -> BUTTON:"I have less time today" ring=True -> BUTTON:"Choose another skill" ring=True
| [keyboard] every control on Today is reachable by Tab | PASS | reached = {'start': True, 'why this': True, 'less time': True, 'another skill': True} |
| [keyboard] every control focused along the way shows a visible ring | PASS | controls with no visible ring: none |

_screenshot **helpgate-suite-s15-07-keyboard-focus-today-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_
| [keyboard] 'Why this' opens with Enter | PASS | .today-why present after Enter = True |
| [keyboard] 'I have less time today' opens with Space | PASS | .today-less-time present after Space = True |
| [keyboard] 'Choose another skill' opens with Enter | PASS | .today-other-skill present after Enter = True |

_screenshot **helpgate-suite-s15-08-keyboard-activated-panels-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_
| On the right page: the focused exercise for the keyboard walk | PASS | url="http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided" (expected to contain "/trainers/focused/reading-matching-headings-guided"), landmark heading="Matching Headings: guided practice" (expected to contain "guided practice") |

**Keyboard trail on the focused exercise:** A:"IELTS is EZ" ring=True -> A:"Today" ring=True -> A:"Course" ring=True -> A:"Practice" ring=True -> A:"Tests" ring=True -> A:"Vocabulary" ring=True -> BUTTON:"EN" ring=True -> BUTTON:"RU" ring=True -> BUTTON:"" ring=True -> A:"Skip to content" ring=True -> DIV:"A. Homeopathy is an alternative system of medicine" ring=True -> SELECT:"Choose a headingiiiiiiivvviviiviiiixx" ring=True -> SELECT:"Choose a headingiiiiiiivvviviiviiiixx" ring=True -> SELECT:"Choose a headingiiiiiiivvviviiviiiixx" ring=True -> SELECT:"Choose a headingiiiiiiivvviviiviiiixx" ring=True -> SELECT:"Choose a headingiiiiiiivvviviiviiiixx" ring=True -> SELECT:"Choose a headingiiiiiiivvviviiviiiixx" ring=True -> BUTTON:"Check my answers" ring=True
| [keyboard] the exercise's answer controls and Check button are all reachable by Tab | PASS | reached the Check button = True after 18 stops |
| [keyboard] every control in the exercise shows a visible ring | PASS | controls with no visible ring: none |
| [keyboard] a signed-out visitor meets no hint control on the way, and none is on the page | PASS | help controls on the page = 0, tab stops mentioning a hint = none |

_screenshot **helpgate-suite-s15-09-keyboard-focus-exercise-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_
| Reduced motion is honoured: the page still renders, and long animations are gone | PASS | matchMedia reduce = True, elements with an animation or transition longer than 0.35s = 0, Today still renders one session = True |

_screenshot **helpgate-suite-s15-10-reduced-motion-today-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_

**Scenario 15 parts B and C:** no console errors, no failed/4xx/5xx requests.

**Totals:** 61 PASS, 1 FAIL.
