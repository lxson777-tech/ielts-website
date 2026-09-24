# Trial journey (t01), local stand-in

Run 1790238523. Site http://localhost:4331/ielts-website, backend http://127.0.0.1:8795 (--trial: real migration in PGlite, real Workers,
simulated tutor replies, SIMULATED essay assessment). Synthetic accounts only. Nothing billed.

**86 of 86 checks passed.**

| Result | Check | Detail |
|---|---|---|
| PASS | offer: signed-out visitor sees the offer before any account |  |
| PASS | offer: questionnaire answers shown as a suggestion, not a level |  |
| PASS | signed out: included lesson stays covered and asks to sign in |  |
| PASS | join: after sign-up, eligibility shows the explicit start screen |  |
| PASS | join: questionnaire carried through the sign-in round trip |  |
| PASS | join: no trial exists before the student presses start |  |
| PASS | no trial yet: lesson covered with a start invitation |  |
| PASS | start: server recorded the trial with the questionnaire | {"user_id": "967e5199-f355-493e-bb9a-418a12cd9653", "started_at": "2026-09-24T08:29:05.987Z", "ends_at": "2026-09-27T08:29:05.987Z", "questionnaire": {"band": " |
| PASS | dashboard: time left from the server clock |  |
| PASS | dashboard: suggested section tab (Writing) opens first |  |
| PASS | keyboard: ArrowRight moves to Speaking and focuses it |  |
| PASS | dashboard: the Speaking test is available (Part 1, Alex's decision) |  |
| PASS | restart: the join page says the trial is already running |  |
| PASS | restart: the stored start time did not move |  |
| PASS | door: a locked lesson's text never reaches the browser | The official name for this task |
| PASS | locked lesson by direct link: covered, title kept, View plans offered |  |
| PASS | included lesson opens |  |
| PASS | door: the lesson page's source carries none of the lesson text | question type you will see printed |
| PASS | door: a locked lesson's source carries none of its text either | The official name for this task |
| PASS | door: the paper's page source carries none of the paper | an aquatic plant native to South |
| PASS | door: the allowed student sees the lesson text on screen (fetched through the door) | question type you will see printed |
| PASS | door: the old public data files are not published | [404, 404, 404, 404] |
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
| PASS | door: the locked paper never reaches the browser | a species of antelope native to |
| PASS | drill cut from the trial paper: locked (not the section's test) |  |
| PASS | trial test: instructions say starting uses the one Reading test |  |
| PASS | trial test: nothing reserved before Start |  |
| PASS | trial test: Start begins the sitting on the server, then the timer |  |
| PASS | trial test: refresh mid-test resumes the same sitting |  |
| PASS | trial test: result shown after submitting |  |
| PASS | trial test: submission settled the Reading test on the server |  |
| PASS | trial test: reopening says the section's test is used |  |
| PASS | two tabs: one Listening sitting between them | [{"user_id": "967e5199-f355-493e-bb9a-418a12cd9653", "kind": "test", "section": "listening", "request_id": "sit-9dff31db-8a7c-46c0-908a-9282bb880704", "activity |
| PASS | writing lesson: one Band 8 example, fetched through the door, and no 'Another example' |  |
| PASS | writing: checker says it is the one Writing test |  |
| PASS | writing: only the trial's Task 2 question is offered (no Task 1) |  |
| PASS | writing: begun on the server when the task started |  |
| PASS | writing: the question is the trial's fixed one, fetched through the door |  |
| PASS | writing: a failed grade leaves the test available and says so |  |
| PASS | writing: a successful grade uses the test on the server |  |
| PASS | writing: the stand-in's assessment is visibly SIMULATED |  |
| PASS | writing: the report shows the band guide steps the grader returned |  |
| PASS | speaking: the part-by-part Speaking trainer is not in the trial |  |
| PASS | speaking: the examiner page opens as the trial's Part 1 test |  |
| PASS | speaking: the cue-card bank (not in the trial) is not offered |  |
| PASS | speaking: nothing reserved before Start |  |
| PASS | speaking: Start begins the test on the server; a voice session that failed to open is given back | [{"user_id": "967e5199-f355-493e-bb9a-418a12cd9653", "kind": "test", "section": "speaking", "request_id": "sit-7b14c0af-25e0-47ec-a433-9321c751d03d", "activity_ |
| PASS | speaking: a session that opened but never connected gives the interview back | {"created": {"plan": {"mode": "part1", "part1TopicIds": ["p1-2026-11"]}, "trialSitting": "sit-7b14c0af-25e0-47ec-a433-9321c751d03d", "status": 201}, "rows": [{" |
| PASS | speaking: the interview runs as Part 1 |  |
| PASS | speaking: the session request carries the begun test and a Part 1 plan | {"plan": {"mode": "part1", "part1TopicIds": ["p1-2026-30"]}, "trialSitting": "sit-7b14c0af-25e0-47ec-a433-9321c751d03d", "status": 201} |
| PASS | speaking: a grade that fails on our side keeps the test (one interview counted) | [{"user_id": "967e5199-f355-493e-bb9a-418a12cd9653", "kind": "test", "section": "speaking", "request_id": "sit-7b14c0af-25e0-47ec-a433-9321c751d03d", "activity_ |
| PASS | speaking: after the failure the test can be started again |  |
| PASS | speaking: a graded interview uses the test on the server (two interviews in all) | [{"user_id": "967e5199-f355-493e-bb9a-418a12cd9653", "kind": "test", "section": "speaking", "request_id": "sit-7b14c0af-25e0-47ec-a433-9321c751d03d", "activity_ |
| PASS | speaking: the stand-in's report is visibly SIMULATED |  |
| PASS | speaking: back on the page, the Speaking test is used | Live AI Examiner /  / Speaking /  / Part 1 of the Speaking test as a real conversation: the examiner speaks, listens, and asks follow-up questions based on what |
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
