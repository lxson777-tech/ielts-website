# Goal questions redo: browser proof

Run 2026-09-30 against a DEV server at http://localhost:4442/ielts-website with the free local accounts stand-in.
Synthetic student `synthetic-intake-1790708813@example.test`. Nothing here touches a real Supabase project or anything paid.

**66 of 66 checks passed.**

| | Check | Detail |
|---|---|---|
| PASS | a synthetic student signed up through the workspace menu | u:bc6c9870-748f-4cdd-bfd9-b34bde4236f1 |
| PASS | A: the goal questions open on Today for a new student |  |
| PASS | A: the progress line says question 1 of 6 |  |
| PASS | A: the tapped band shows as chosen straight away | checked=7.0 |
| PASS | A: a tap on a band moves on to the exam date by itself |  |
| PASS | A: the new question's heading has the keyboard focus | intake-step-heading |
| PASS | A: Back returns to the band with the answer still chosen | checked=7.0 |
| PASS | A: the calendar opens as a month grid in the site's style |  |
| PASS | A: today is marked |  |
| PASS | A: a past day cannot be chosen |  |
| PASS | A: the keyboard focus starts on today inside the grid | 2026-09-30 |
| PASS | A: the right arrow moves the focus one day | 2026-10-01 |
| PASS | A: Page Down shows the next month and keeps the focus in the grid | October 2026 -> November 2026, focus 2026-11-01 |
| PASS | A: Escape closes the calendar and hands the focus back to the field | intake-exam-date |
| PASS | A: nothing was chosen by just looking |  |
| PASS | A: a click outside closes the calendar |  |
| PASS | A: a date is picked from the calendar and the field shows it in words | Wednesday, 9 December 2026 |
| PASS | A: the field says how far away the exam is | In 70 days |
| PASS | A: Next moves on to the study days |  |
| PASS | A: four study-day choices, including every other day | ['daily', 'alternate', 'weekdays', 'custom'] |
| PASS | A: a tap on Every other day moves on by itself |  |
| PASS | A: 60 minutes is shown first as the teacher's recommendation |  |
| PASS | A: choosing 25 minutes does NOT move on until it is confirmed | How long can you study each day? |
| PASS | A: the explicit yes moves on |  |
| PASS | A: a tap on a language moves on |  |
| PASS | A: the hardest-section question is marked optional |  |
| PASS | A: the last screen is the summary |  |
| PASS | A: the summary says it in one line | Band 7.0 by 9 December, every other day, 25 minutes a day |
| PASS | A: the summary says every other day starts today | Every other day, starting 30 September |
| PASS | A: Change goes back to that one question, answer intact | alternate |
| PASS | A: and comes straight back to the summary |  |
| PASS | A: the plan is saved |  |
| PASS | A: the saved plan has the every-other-day rule, starting today | studyDays=alternate alternateAnchor=2026-09-30 customStudyDays=[0, 1, 2, 3, 4, 5, 6] |
| PASS | A: 25 minutes is saved as the student's own confirmed choice |  |
| PASS | A: the band and the exam date are saved as chosen | {"target": {"band": 7, "status": "confirmed"}, "exam": {"date": "2026-12-09", "status": "confirmed"}} |
| PASS | A: the plan's own schedule rests every second day | [('2026-09-30', 'study'), ('2026-10-01', 'rest'), ('2026-10-02', 'study'), ('2026-10-03', 'rest')] |
| PASS | A: Today then shows the plan's session | Fill a gap with the exact words from the passage, inside the word limit. |
| PASS | B: plan settings loads every other day as the saved answer | alternate |
| PASS | B: plan settings shows the saved exam date in words | Wednesday, 9 December 2026 |
| PASS | B: a new exam date is picked in the same calendar |  |
| PASS | B: saved |  |
| PASS | B: every constraint survives byte for byte (study days, anchor, minutes, language) | {"regularDailyMinutes": 25, "regularDailyMinutesStatus": "confirmed", "studyDays": "alternate", "explanationLocale": "en", "tzOffsetMinutes": 0, "customStudyDays": [0, 1, 2, 3, 4, 5, 6], "alternateAnchor": "2026-09-30"} |
| PASS | B: every other goal survives byte for byte |  |
| PASS | B: only the exam date changed | {"date": "2026-12-23", "status": "confirmed"} |
| PASS | C: the month title is Russian | Декабрь 2026 |
| PASS | C: the week starts on Monday, in Russian | Пн Вт Ср Чт Пт Сб Вс |
| PASS | C: the chosen date is written in Russian | Среда, 23 декабря 2026 г. |
| PASS | C: the calendar controls are Russian |  |
| PASS | C: 'Every other day' reads 'Через день' |  |
| PASS | D: on a phone the calendar is a sheet pinned to the bottom of the screen, full width | {'x': 0, 'y': 397.609375, 'width': 390, 'height': 446.390625} |
| PASS | D: tapping the dimmed page closes the sheet |  |
| PASS | D: nothing scrolls sideways at 390px |  |
| PASS | D: 'Choose my days' does not move on by itself |  |
| PASS | D: Next waits until at least one day is picked |  |
| PASS | D: three days picked |  |
| PASS | D: Next is available once days are picked |  |
| PASS | D: still nothing scrolls sideways |  |
| PASS | E: with reduced motion the step has no animation | none |
| PASS | E: no slide-out is ever drawn |  |
| PASS | E: it still moves on |  |
| PASS | E: no animation is running inside the questions | running=0 |
| PASS | E: the calendar opens without motion | none |
| PASS | F: arrow keys change the band without moving on | checked=7.5 |
| PASS | F: Enter moves on |  |
| PASS | F: and the focus lands on the new question |  |
| PASS | no page errors from the goal questions or the calendar |  |

## Screenshots

- `01-target-band.png`: Question 1, the target band, on Today (desktop)
- `02-calendar-open.png`: The calendar open under the exam-date field, today marked, past days greyed (desktop)
- `03-exam-date-picked.png`: The exam date chosen, shown in words with the days left
- `04-study-days.png`: Question 3: Every day, Every other day, Weekdays, Choose my days
- `05-daily-time-confirm.png`: Question 4: 25 minutes chosen, waiting for the explicit 'Yes, I can commit to this'
- `06-summary.png`: The summary before saving, each answer with Change
- `07-saved.png`: Saved: the honest outcome for this plan
- `08-today-after.png`: Today after saving: the plan's session
- `09-settings-before.png`: Plan settings, loaded exactly as saved
- `10-settings-after.png`: Plan settings after changing only the exam date
- `11-calendar-russian.png`: The calendar in Russian on plan settings
- `12-phone-target.png`: Phone (390px): question 1
- `13-phone-calendar-sheet.png`: Phone: the calendar rises from the bottom as a sheet
- `14-phone-choose-days.png`: Phone: Choose my days with Mon, Wed, Fri picked
- `15-reduced-motion.png`: Reduced motion: calendar open, nothing animated
