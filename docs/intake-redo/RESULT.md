# The goal questions, redone

24 September 2026. Branch `claude/student-placement-test-af18b3`.

Alex asked: "Redo the whole questionnaire, make it feel more smooth, and let them choose
the time to study like every other day option, also the calendar that's a drop down menu
should be in our style of the website."

## What changed, in plain words

**It feels smoother.**
- One question per screen, with a thin line at the top that fills as you go ("Question 2 of 6").
- Moving between questions is a short fade and slide: forwards slides one way, Back slides
  the other. Anyone whose phone or computer asks for less motion gets no movement at all.
- Tapping an answer shows it as chosen (dark fill and a small tick), and a moment later the
  next question slides in by itself. Back is always there, and so is Next.
- Two places deliberately do not move on by themselves: the daily time (the student must
  still say "Yes, I can commit to this", because 60 minutes is the teacher's advice, never
  set silently) and "Choose my days" (they need to tick their days first).
- The last screen is a summary: "Band 7.0 by 3 December, every other day, 25 minutes a
  day", then each answer on its own line with a Change button. Change jumps to that one
  question and comes straight back to the summary. Then "Save my plan".
- Bigger, better spaced answer buttons with a gentle lift on hover; the study-day and time
  answers are cards with a one-line explanation under each.
- Keyboard and screen reader friendly: each new question's heading takes the focus, so it
  is read out; arrow keys move between answers without jumping ahead; Enter moves on.

**Study days now have four answers.** Every day, Every other day, Weekdays, and Choose my
days (seven round day buttons, Mon to Sun).

**The calendar is ours.** The browser's own date box is gone. The field shows the date in
words ("Thursday, 3 December 2026, in 70 days"); tapping it opens a month grid in the
site's colours with today marked by a small dot and past days greyed out. Arrows, Page Up
and Page Down, Enter and Escape all work. Clicking anywhere else closes it. Month and day
names come out in English or Russian to match the site. On a phone it rises from the bottom
of the screen as a sheet with thumb-sized days. The date it saves is exactly the same as
before, so nothing else in the site had to change.

**Plan settings** uses the same pieces on one page, and still lets a student change one
answer without touching the others.

## How "every other day" works

It is a real rule in the plan, not a label. The day the student picks it is a study day,
the next day is a rest day, the day after is a study day, and so on. It is counted in whole
calendar days, so month ends, New Year, leap days and clock changes cannot shift it.

- The day it started is remembered. Visiting settings and saving again never restarts the
  rhythm; only choosing a different option and coming back to "every other day" does.
- A rest day the student asks for still wins over it.
- The planner uses it everywhere it counts days: the week's schedule shows rest days in
  between, and the honest "how much time is left" note counts them properly. Seven days
  before an exam on "every other day" is 4 study days, not 7.
- Plans saved before today do not have this setting and behave exactly as they did.
- Safety net for old code: an "every other day" plan also lists all seven weekdays in a
  field only old code reads. So a browser tab left open from before the release, or the
  Mr EZ Worker until it is redeployed, reads it as "every day" (a little too generous)
  rather than "no days". The older study-plan copy that some screens still read also says
  "every day", for the same reason.

## What was proven, and where

Browser proof: `python tests/browser/i01_intake_redo.py` against my own dev server (port
4514) and the free local accounts stand-in (port 8814), with a brand-new synthetic student
who signs up first. **66 of 66 checks passed.** Every claim about what was saved is read
back out of the browser's storage (`ielts.learning.plan.v1::u:<id>`), not guessed from the
screen. Full list: `docs/intake-redo/evidence/results.md`.

| What | Screenshot |
|---|---|
| Question 1 on Today; tapping Band 7.0 moves on by itself and the next heading gets the focus; Back keeps the answer | `01-target-band.png` |
| The calendar open: today marked, past days off, focus starts on today; arrows and Page Down move, Escape closes and returns focus, a click outside closes | `02-calendar-open.png` |
| A date picked, shown in words with "In 70 days" | `03-exam-date-picked.png` |
| Four study-day answers; tapping Every other day moves on | `04-study-days.png` |
| 25 minutes chosen, but it waits for "Yes, I can commit to this" | `05-daily-time-confirm.png` |
| The summary; Change goes back to one question and returns | `06-summary.png` |
| Saved | `07-saved.png` |
| Storage holds `studyDays: "alternate"` starting today, 25 minutes confirmed, band 7 and the date; the saved schedule rests every second day | (read from storage, in results.md) |
| Today then shows the plan's session ("70 days to your exam", about 25 minutes) | `08-today-after.png` |
| Plan settings loads "every other day" and the date exactly as saved | `09-settings-before.png` |
| Only the exam date changed in settings: every other answer identical, byte for byte | `10-settings-after.png` |
| The calendar in Russian: "Декабрь 2026", week from Пн to Вс, "Через 84 дня" | `11-calendar-russian.png` |
| Phone, 390px wide: question 1 | `12-phone-target.png` |
| Phone: the calendar is a sheet pinned to the bottom of the screen; tapping the dimmed page closes it; nothing scrolls sideways | `13-phone-calendar-sheet.png` |
| Phone: Choose my days with Mon, Wed, Fri; Next waits until a day is picked | `14-phone-choose-days.png` |
| Reduced motion: no animation runs at all, and it still moves on | `15-reduced-motion.png` |
| Keyboard only: arrows change the band without moving on; Enter moves on | (results.md, section F) |

Automated tests:
- Full suite (`npm test`): **2,071 tests, 2,070 pass, 1 fails.** The one failure is the known
  one, "the committed index is exactly what the generator produces today" (Windows line
  endings), unrelated to this work.
- New: `tests/study-days-alternate.test.ts` (13 tests: the rule, month/year/leap-day and
  clock-change boundaries, rest-day overrides winning, no-start-day safety, old plans
  behaving exactly as before for every day / weekdays / chosen days, an old plan
  round-tripping through the real store unchanged, the deadline maths, the schedule,
  the older study-plan copy, and sync conflicts). `tests/date-picker.test.ts` (12 tests:
  the month grid, leap years, keyboard movement, month paging, the limits, English and
  Russian words). `tests/intake.test.ts` gained 7 tests on what the questions save
  (36 in that file now).
- `npx astro check`: 0 errors, 0 warnings (20 hints, all in files not touched here).

## The server side (checked, nothing applied)

`supabase/migrations/2026-09-21-learning.sql` stores the whole plan as one block of data in
`learning_plan.plan`, with no rule about what is inside it. The only guard reads three
separate columns (confirmed, revision, updated at). So the new setting needs **no database
change**. The plan's version number is unchanged and no stored plan is converted. When two
devices disagree, the existing rule still decides (confirmed beats unconfirmed, then the
higher revision, then the later time), and a device that lost takes the account's copy from
the server's reply; a test pins that this holds with and without the new setting.

## What I could not prove

- **The real account server.** Everything ran against the local stand-in. The field travels
  inside the plan the same way every other setting does, but it has not been through the
  real Supabase project.
- **The Mr EZ Worker.** It uses the same planner code, so it only learns "every other day"
  when it is next deployed (that is Alex's call; I did not deploy). Until then it reads
  such a plan as every day, as described above.
- **A real phone and a real screen reader.** The phone runs were an emulated 390px touch
  screen; the screen-reader behaviour was proven by where the focus goes, not by listening.

## Things the owner should know

1. **"Every other day" starts on the day it is chosen.** So the first day is always a study
   day. If a student would rather start tomorrow, that is not offered yet.
2. **The exam calendar will not accept a past date**, and the recent-score calendar will not
   accept a future one.
3. **Weeks start on Monday** in both languages.
4. **A known problem elsewhere, not caused by this:** with Russian switched on, Mr EZ's panel
   says "Mr EZ is not switched on for this build yet" in English on the server and in
   Russian in the browser, and the browser reports a mismatch (details in
   `evidence/page-errors.txt`). It happens on /dashboard and /plan-settings even signed out.
   Harmless to students, but worth a small fix in `src/components/tutor/MrEzPanel.tsx`.
5. **Older browser scripts use the old flow.** `tests/browser/s1_*`, `f01_*` and the placement
   session's `p01_placement_journey.py` (`walk_intake`) type a date into the old browser date
   box and click Next after the band. They will need the new steps (the band moves on by
   itself; the date comes from the calendar). I did not edit them because p01 belongs to the
   placement work.
6. **Merge note:** another unmerged branch (`claude/ielts-platform-improvement-a44962`)
   changes the target band to an account-level band with a "not chosen yet" state. Everything
   about the target band is now in its own file, `src/components/plan/IntakeTargetBand.tsx`,
   so that merge should replace one file rather than thread through the whole questionnaire.
7. **Other fix along the way:** the old questions showed a student with custom study days as
   "Every day" and would have overwritten their days on save. They now load as themselves.

## Where things are

- Questions: `src/components/plan/Intake.tsx`; target band: `src/components/plan/IntakeTargetBand.tsx`
- Calendar: `src/components/plan/DatePicker.tsx`, its maths `src/components/plan/calendar.ts`,
  its look `src/styles/date-picker.css`
- Answer buttons and progress line: `src/components/learning/intake/ui.tsx`; look:
  `src/styles/learning-intake.css`
- What gets saved: `src/components/learning/intake/logic.ts`
- The rule: `isStudyDay` in `src/lib/learning/planner.ts`; the setting:
  `src/lib/learning/contracts/plan.ts`
- Russian: `src/lib/i18n/dict/ru/learning-intake.ts`
