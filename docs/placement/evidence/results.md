# Placement test: browser proof

Run 2026-09-29 against a DEV server at http://localhost:4442/ielts-website with the free local
accounts stand-in at http://127.0.0.1:8842. Graders and the live examiner deliberately unconfigured. Synthetic student
`synthetic-placement-1790692266@example.test`. Nothing here is evidence about a real Supabase project or a paid grader.

| Claim | Result | Detail |
|---|---|---|
| the goal questions were answered | PASS |  |
| a synthetic student signed up on the sign-up page and filled in the profile | PASS | u:8762eb07-d5c0-4723-b24a-70bfe563d734 |
| Today shows the placement offer card to a signed-in student who has not taken it | PASS |  |
| screenshot 01-offer-card.png is on /dashboard | PASS | url=http://localhost:4442/ielts-website/dashboard heading="Good evening, Synthetic.
A little practice. A step closer." |
| the card leads to /placement and its introduction | PASS |  |
| screenshot 02-intro.png is on /placement | PASS | url=http://localhost:4442/ielts-website/placement heading="Find your starting point" |
| starting shows the Listening brief with a four-part stepper | PASS |  |
| a per-owner resume state was written | PASS | key ielts.placement.v1::u:8762eb07-d5c0-4723-b24a-70bfe563d734 |
| screenshot 03-listening-brief.png is on /placement | PASS | url=http://localhost:4442/ielts-website/placement heading="Listening" |
| at phone width (390px) nothing scrolls sideways | PASS |  |
| screenshot 03-phone-stepper.png is on /placement | PASS | url=http://localhost:4442/ielts-website/placement heading="Listening" |
| the recording plays once under exam conditions (no seek bar) | PASS |  |
| answers are saved inside the placement sitting as they are typed | PASS |  |
| Listening handed in and the score card shows | PASS |  |
| the score card shows no band for one part | PASS |  |
| screenshot 04-listening-handed-in.png is on /placement | PASS | url=http://localhost:4442/ielts-website/placement heading="Question paper" |
| Listening was recorded as a diagnostic event with the placement source key | PASS | mode=diagnostic raw=4/10 session=placement:placement-a87545a3-eeb1-4363-98b9-a88d1dff15ea |
| screenshot 05-reading-under-way.png is on /placement | PASS | url=http://localhost:4442/ielts-website/placement heading="GENE THERAPY" |
| after a reload mid-Reading the paper resumes with its answers | PASS | q14=A q19=Somatic |
| and the clock carried on rather than starting again | PASS | before reload ⏱
13:59, after reload ⏱
13:54 |
| screenshot 06-reading-resumed.png is on /placement | PASS | url=http://localhost:4442/ielts-website/placement heading="GENE THERAPY" |
| Reading handed in | PASS |  |
| with the essay grader unconfigured the student is told plainly, before writing anything | PASS |  |
| screenshot 07-writing-grader-unconfigured.png is on /placement | PASS | url=http://localhost:4442/ielts-website/placement heading="Writing" |
| with the live examiner unconfigured the student is told plainly, and no microphone is asked for | PASS |  |
| screenshot 08-speaking-examiner-unconfigured.png is on /placement | PASS | url=http://localhost:4442/ielts-website/placement heading="Speaking" |
| the results list all four papers | PASS | listening: Weak; reading: Weak; writing: Not yet assessed; speaking: Not yet assessed |
| Writing and Speaking read 'Not yet assessed', never a low result | PASS |  |
| Listening names the question types below the pass line | PASS | Listening / Weak /  / 4 of 10 right in this sitting. Below the pass line: Multiple Answer (0/5), Multiple Choice (1/2). |
| the plan's first steps are shown | PASS | WHAT YOUR PLAN DOES NEXT /  / Choose the option the recording supports and let the distractors go past. /  / Teach: Listening Overview / 8 min / Teach: Multiple Choice / 12 min / Practise: Work through real questions with help available when you get stuck. / 6 min / Continue |
| screenshot 09-results.png is on /placement | PASS | url=http://localhost:4442/ielts-website/placement heading="Your starting point" |
| the learner record holds exactly the two assessed parts as placement events, both diagnostic, one session | PASS | papers=['listening', 'reading'] sessions={'placement:placement-a87545a3-eeb1-4363-98b9-a88d1dff15ea'} |
| the rebuilt plan counts Listening and Reading as assessed and still owes Writing and Speaking | PASS | diagnosticsOutstanding=['writing', 'speaking'] revision=4 |
| the offer card is gone from Today once the test is taken | PASS |  |
| 'Why this' says Writing and Speaking are not yet assessed | PASS | WHAT THIS RESTS ON /  / 0 of 5 answered on your own across 1 sittings, most recently 0 days ago. / You need at least band 7 in Listening. /  / WHAT IS STILL UNKNOWN /  / Not yet assessed: Writing, Speaking. |
| screenshot 10-today-after.png is on /dashboard | PASS | url=http://localhost:4442/ielts-website/dashboard heading="Good evening, Synthetic.
A little practice. A step closer." |
| a second visit to /placement shows the results, not the test | PASS |  |
| screenshot 11-second-visit.png is on /placement | PASS | url=http://localhost:4442/ielts-website/placement heading="Your starting point" |
| the results read in Russian, paper names staying English | PASS |  |
| screenshot 12-results-russian.png is on /placement | PASS | url=http://localhost:4442/ielts-website/placement heading="Ваша отправная точка" |
| the placement events reached the accounts stand-in with mode 'diagnostic' | PASS | 2 rows, modes=['diagnostic'] |
| no uncaught page errors during the journey | PASS |  |
