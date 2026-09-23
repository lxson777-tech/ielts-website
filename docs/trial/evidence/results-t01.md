# Trial journey (t01), local stand-in

Run 1790162755. Site http://localhost:4331/ielts-website, backend http://127.0.0.1:8795 (--trial: real migration in PGlite, real Workers,
simulated tutor replies, SIMULATED essay assessment). Synthetic accounts only. Nothing billed.

**63 of 63 checks passed.**

| Result | Check | Detail |
|---|---|---|
| PASS | offer: signed-out visitor sees the offer before any account |  |
| PASS | offer: questionnaire answers shown as a suggestion, not a level |  |
| PASS | signed out: included lesson stays covered and asks to sign in |  |
| PASS | join: after sign-up, eligibility shows the explicit start screen |  |
| PASS | join: questionnaire carried through the sign-in round trip |  |
| PASS | join: no trial exists before the student presses start |  |
| PASS | no trial yet: lesson covered with a start invitation |  |
| PASS | start: server recorded the trial with the questionnaire | {"user_id": "b96da43b-a30f-4b9c-9beb-410f2e5e13b5", "started_at": "2026-09-23T11:26:15.938Z", "ends_at": "2026-09-26T11:26:15.938Z", "questionnaire": {"band": " |
| PASS | dashboard: time left from the server clock |  |
| PASS | dashboard: suggested section tab (Writing) opens first |  |
| PASS | keyboard: ArrowRight moves to Speaking and focuses it |  |
| PASS | dashboard: Speaking test shows as not open yet (decision pending) |  |
| PASS | restart: the join page says the trial is already running |  |
| PASS | restart: the stored start time did not move |  |
| PASS | locked lesson by direct link: covered, title kept, View plans offered |  |
| PASS | included lesson opens |  |
| PASS | Mr EZ: section and allowance shown before asking | Reading: 5 of 5 messages left. Only answered messages count. |
| PASS | Mr EZ: a successful reply is labelled simulated |  |
| PASS | Mr EZ: one answered message counted in Reading |  |
| PASS | Mr EZ: note updates to 4 of 5 | Reading: 4 of 5 messages left. Only answered messages count. |
| PASS | Mr EZ: a failed request shows a plain error with Try again |  |
| PASS | Mr EZ: the failed request used nothing (released, not settled) |  |
| PASS | Mr EZ: retry with the same request id is counted once |  |
| PASS | Mr EZ: five answered messages in Reading |  |
| PASS | Mr EZ: exhausted section says so and locks the composer | You have used your five messages for Reading. The other sections have their own. See full access |
| PASS | bypass: a lesson outside the trial is refused by the Worker | {"status": 403, "body": {"error": "This is not included in your trial.", "code": "trial-not-included"}} |
| PASS | bypass: general chat with no section is refused |  |
| PASS | bypass: a sixth Reading message sent directly is refused |  |
| PASS | bypass: the browser cannot call the Workers' reserve function | 403 |
| PASS | dashboard: Reading shows 0 of 5 while Listening keeps 5 of 5 |  |
| PASS | Mr EZ: on the dashboard the chosen section (Listening) is the context | Listening: 5 of 5 messages left. Only answered messages count. |
| PASS | test outside the trial: locked by direct link |  |
| PASS | drill cut from the trial paper: locked (not the section's test) |  |
| PASS | trial test: instructions say starting uses the one Reading test |  |
| PASS | trial test: nothing reserved before Start |  |
| PASS | trial test: Start begins the sitting on the server, then the timer |  |
| PASS | trial test: refresh mid-test resumes the same sitting |  |
| PASS | trial test: result shown after submitting |  |
| PASS | trial test: submission settled the Reading test on the server |  |
| PASS | trial test: reopening says the section's test is used |  |
| PASS | two tabs: one Listening sitting between them | [{"user_id": "b96da43b-a30f-4b9c-9beb-410f2e5e13b5", "kind": "test", "section": "listening", "request_id": "sit-659c0300-d902-45dd-a3ec-b322d6df0157", "activity |
| PASS | writing: checker says it is the one Writing test |  |
| PASS | writing: begun on the server when the task started |  |
| PASS | writing: a failed grade leaves the test available and says so |  |
| PASS | writing: a successful grade uses the test on the server |  |
| PASS | writing: the stand-in's assessment is visibly SIMULATED |  |
| PASS | speaking: examiner page unavailable with a plain reason |  |
| PASS | plans: approved prices shown, payment plainly unavailable |  |
| PASS | second device: the same trial, not a new one |  |
| PASS | second device: Reading shows its used test and no messages left |  |
| PASS | second device: start time and counts unchanged |  |
| PASS | after sign-out: included lesson covered again, trial not restarted |  |
| PASS | student B: no trial inherited from A |  |
| PASS | student B: own fresh allowance (Reading 5 of 5, test available) |  |
| PASS | student B: A's rows untouched |  |
| PASS | server failure: content stays covered with a plain Try again |  |
| PASS | server failure: Try again opens the lesson once the server answers |  |
| PASS | expired: dashboard says the trial has ended |  |
| PASS | expired: the included lesson is locked calmly with View plans |  |
| PASS | expired: Mr EZ says so and the composer is locked | Your trial has ended, so Mr EZ cannot reply to new questions. View plans |
| PASS | expired: a test not begun cannot start |  |
| PASS | phone, Russian: trial home renders in Russian without sideways scroll | overflow=0 |
| PASS | reduced motion: no button transitions and no shimmer | {"button": "0s", "shimmer": "none"} |
