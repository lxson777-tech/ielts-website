# Remediation of the 30 September re-audit (R01 to R06)

30 September 2026. Branch `claude/paid-platform-readiness-03c113`, from the
re-audited commit `85837da` to `fe4ebdb`. Local only: nothing pushed, merged
to main, deployed or applied to a real database. Every payment, voice
exchange and AI grade in the evidence is **SIMULATED** (local stand-ins,
synthetic `@example.test` accounts). Answers
[the re-audit](../combined-paid-platform-2026-09-30-recheck/REPORT.md).

## Summary

| # | Finding | Status | What changed for students |
|---|---|---|---|
| R01 | One sender could block signed-out support for everyone | **Fixed locally** (goes live only after the new Worker is deployed) | A person who cannot sign in can always ask for help. One sender is limited to 3 messages an hour (6 a day); a different visitor still gets through straight after a flood. |
| R02 | Privacy omitted payment records and the deletion limit | **Fixed** | Privacy says exactly what a purchase records, that card details never reach the site, that an account with any purchase record (even an unpaid one) cannot be deleted today, and what signed-out support keeps. Undecided matters are listed separately. |
| R03 | Paid Speaking still said "free" | **Fixed** | "free" appears only on the open site; paid and trial pages no longer say it. |
| R04 | Russian Writing overview overflowed at 320px | **Fixed** | On a small phone the featured lesson card stacks; the whole title and the "Открыть урок" button stay on screen. Nothing is clipped. |
| R05 | Translation checks missed Russian lesson-body text | **Fixed** | A new rule fails any heading, paragraph, label or link left entirely in English in a Russian lesson, unless it is listed exam material or an IELTS term. |
| R06 | React error 418 (flicker on load) | **Fixed** (by the separate hydration session; verified here) | Pages no longer redraw themselves on load or navigation: 0 errors in 896 visits, against 146 of 448 on the re-audited code. |

## The fixes

**R01, support abuse** (`d28d6fe`, `3807d34`, builder in its own worktree).
Reproduced first on the unmodified code: 30 made-up emails were accepted and a
fresh visitor was then blocked in English and Russian.
- The database no longer accepts anonymous support requests at all
  (`supabase/migrations/2026-09-30-support.sql`): anon's grant is revoked, so a
  direct database call cannot bypass the protection. Signed-in students are
  unchanged (5 a day per account).
- Signed-out messages go through a new Worker, `workers/support`. It
  identifies the sender only by Cloudflare's `CF-Connecting-IP` (forwarded
  headers and the body are ignored), stores only a keyed hash of it (the /64
  network for IPv6), and erases the hash after 24 hours. It verifies a
  Turnstile token on the server when `TURNSTILE_SECRET_KEY` is set.
- Checks, in order, and a refusal stores nothing: sender 3 an hour, sender
  6 a day, reply address 3 a day, then a shared breaker of 300 accepted
  unchallenged messages an hour. A request that passed Turnstile is never
  stopped by the breaker, so a real person always has a route.
- Without `PUBLIC_SUPPORT_URL` the form says plainly that signed-out messages
  are not switched on here and offers sign-in (no fake success).
- After the fix: 40 requests from one sender with 40 different emails and
  forged forwarding headers gave 3 accepted and 37 refused. A different
  visitor then sent through the real form in English (1440x900) and Russian
  (390x844). Direct anonymous calls to all three support functions were
  refused. Signed-in messages still reach the admin panel.

**R02, privacy** (`a419b55`, `fe4ebdb`). `src/pages/privacy.astro`, Russian in
`dict/ru/e-remediation.ts`. Checked against `2026-09-30-paid-access.sql` (the
`payment_orders` and `access_grants` columns, `ON DELETE RESTRICT`),
`workers/payments` (card details never reach it) and `workers/support`. The
purchases section appears only on the gated build, because the open site
sells nothing. No provider, retention period or operator is invented.

**R03, "free"** (`a419b55`). `LiveExaminer.tsx` (the drills menu Codex found),
`EssayCheckerCta.astro` (the Writing lessons' "Check Your Writing" card, same
mistake) and `BaseLayout.astro` (the default page description), all now
conditional on the open build.

**R04, 320px** (`a419b55`). `src/styles/lesson.css`: the featured card may
wrap, and stacks under 480px with its button on its own line.

**R05, translation guard** (`a419b55`). Rule 8 in `tools/lesson-ru-lib.mjs`,
the approved list `tools/lesson-ru-english-allowed.json` (15 IELTS terms plus
49 pieces of quoted exam material in 6 lessons; every current entry was
reviewed, and no real leftover was found), tests in
`tests/lesson-bodies-ru.test.ts`. The list is kept tidy by its own test.
[Mutation probe](evidence/r05/mutation-probe.log), all in memory:
- the old checker **passed** the original English note in the Russian
  vocabulary lesson;
- the new one fails it and names it, fails the re-audit's appended English
  paragraph, and passes the lesson again once the Russian is restored.

**R06, hydration** (`a40bf5d`, `901247e`, `f3a8122`, by a separate session;
[its write-up](../combined-paid-platform-2026-09-29-remediation/HYDRATION-FIX.md)).
The trial hook was one cause among four: the account store, links naming an
item, a resumed practice test, and one notice translated with the wrong
translator. Verified independently with a new probe
([script](scripts/r06_hydration_navigation.py)). It covers fresh visits,
refresh, clicking the site's own navigation, back/forward and Today to a
lesson, for a saved English or Russian preference, desktop and phone, signed
out, trial and paid, in plain and "stress" mode. Every page is judged only
after React has taken it over, and any page error counts:

| Code | Visits | With an error |
|---|---|---|
| Re-audited `85837da`, same probe | 448 | **146** ([results](evidence/r06-before-fix-85837da/results.md)) |
| Fixed, first run | 896 | **0** ([results](evidence/r06-after-fix/results.md)) |
| Fixed, final regression | 896 | **0** ([results](evidence/r06-final/results.md)) |

**Also fixed:** a source-scan test (`tests/tutor-request-owner.test.ts`) that
timed out whenever the whole suite ran on a busy machine. It now skips files
that cannot match and reads the rest together.

## Proof

| Check | Result |
|---|---|
| `npm test` | 2,397 / 2,397 |
| `npx astro check` | 0 errors, 0 warnings |
| Builds | open 675 pages (`/` still goes to the dashboard); gated 676, with and without payments |
| Trial content-leak scan | 0 files leak, both gated builds |
| t01 trial journey | 89 / 89 (see note below) |
| p01 placement / i01 goal questions / e01 trust and support | 42 / 42, 66 / 66, 107 / 107 |
| Paid lifecycle, SIMULATED (buy, locked material opens, second device, receipt, extend, fail, cancel, interrupted, refund, expiry with results kept; zero packs for trial/signed-out) | 114 / 114, twice |
| Buying unavailable without a payments address, and open-build checks | 64 / 64 |
| Keyboard score dialog and cross-checks | 219 / 219 |
| R02 / R03 / R04 browser checks, EN and RU, 1440, 390 and 320 | 118 / 118 ([results](evidence/r02-r03-r04/results.md)) |
| R01 runtime proofs | 30 / 30 after fix, 11 / 11 no-Worker notice, 18 / 18 stubbed Turnstile |

Independent regression: [REGRESSION.md](REGRESSION.md).

**Honest notes:**
- **t01's first regression run stalled.** It happened once, while four other
  browser suites ran at once, and it stalled at "Connecting you to
  Ms. Taylor…". That is the test's own in-page stand-in for OpenAI's voice
  service. The run was not reproduced, alone or under similar load (89 / 89
  both times), and is classified as a simulated-service limitation. A timing
  weakness under heavy load cannot be ruled out entirely.
- **Harness mistakes, fixed in the scripts only.** Short sleeps and
  English-only matchers in the harness are now readiness waits and
  language-aware matchers. Raw first results are kept next to the corrected
  ones.
- **Audio links, a known boundary.** The documented 120-minute signed audio
  link is unchanged: a link issued before a refund or expiry keeps working
  until it runs out.

## Still needed from Alex, or a real-service check

1. **Deploy the new support Worker** (`workers/support`) with the secrets
   `SUPABASE_SERVICE_ROLE_KEY` and `SUPPORT_SOURCE_SALT`. Add
   `PUBLIC_SUPPORT_URL` to the site build (`.github/workflows/deploy.yml` does
   not pass it yet).
2. **A Turnstile site key and secret.** Set both or neither: one without the
   other refuses every signed-out message. This is strongly recommended.
   Without it, someone with 100+ different addresses could still trip the
   shared breaker for up to an hour.
3. **Apply the two new database changes** (`2026-09-30-paid-access.sql`,
   `2026-09-30-support.sql`) with release approval.
4. **Choose a payment company.** Its real data handling then goes on the
   privacy page.
5. **Decide retention and deletion** for profiles, study work, support
   messages and purchase records, including unpaid orders.
6. **Publish the operator's name and contact** (`src/lib/operator.ts`, held
   back by decision).
7. **Decide who reads the support inbox**, then test one real signed-out
   message and reply.
8. **A small, approved real AI and voice check** on the browsers students use.

## Local review

Production builds, SIMULATED payments and support, left running:

- **Visitor, trial and paid student:** `http://localhost:4441/ielts-website`
  (stand-in `8841`)
- **Open site, as live today:** `http://localhost:4442/ielts-website/dashboard`
  (stand-in `8842`)
