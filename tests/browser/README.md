# Personal-learning browser scripts

Two suites live here.

- **`f01_*.py` to `f17_*.py` plus `run_final.py` and `final_helpers.py`** are the
  FINAL verification suite: the sixteen scenarios in
  `docs/CLAUDE-PERSONAL-LEARNING-BUILD.md` section 11, plus the audit's five
  reproduced findings as `f17`. They run against the **frozen production
  snapshot**, by default `http://127.0.0.1:4340/ielts-website` (override with
  the `IELTS_BASE_URL` environment variable, no trailing slash). Nothing on
  that server can hot reload, so unlike the stage-2 suite below there is no
  dev-server dependency-optimizer to blame a failure on. Run them with
  `python run_final.py`; evidence lands in
  `docs/personal-learning/evidence/final/` (`results.md` plus full-page
  screenshots at 1440x900 and 390x844).
  Every scenario asserts the URL path AND a landmark heading before it names a
  screenshot, so a screenshot cannot be mislabelled, and every claim about what
  was recorded is read back out of `localStorage` rather than inferred from the
  screen.
- **`f20_account_journey.py`** is a one-off, self-contained script, not part of
  either suite above: it starts its OWN dev server and its OWN free local
  accounts stand-in (`node tools/mr-ez-dev-server.mjs`), then drives a real
  sign-in / sign-out / sign-in journey with two synthetic students to verify,
  in a real browser, the account-isolation fix in `src/lib/store-owner.ts` and
  `src/lib/auth/sync.ts` (see `tests/account-isolation.test.ts` for the
  deterministic half of that proof). Run it with `python
  f20_account_journey.py` once both servers are up; it reuses
  `final_helpers.py` only for its seed builders, screenshot and results-row
  helpers, pointed at its own base URL and its own results file
  (`docs/personal-learning/evidence/final/results-account-journey.md`,
  screenshots prefixed `account-`) via `IELTS_BASE_URL` / `IELTS_RESULTS_SUFFIX`
  / `IELTS_SHOT_PREFIX`, never touching `results.md` or the `s01-*`/`s09-*`
  screenshots the frozen-snapshot suite owns. It found that the "Work saved on
  this device" claim offer (`AnonymousWorkClaim.tsx`) is unreachable from any
  page in this build - see that file's own header comment for the full
  reproduction.
- **`s1_*.py` to `s9_*.py` plus `run_all.py` and `helpers.py`** are the older
  stage-2 suite, described below. `final_helpers.py` reuses `helpers.py` and
  only redirects the evidence folder and the base URL, so the stage-2 evidence
  is left exactly as it was.

## Stage 2 personal-learning browser scripts

Python Playwright scripts that drive the real running site (no mocking) to verify
stage 2 of the personal-learning build: one shared next step, intake, one hour,
honest budget and deadline. See `docs/CLAUDE-PERSONAL-LEARNING-BUILD.md` section 11
and `docs/personal-learning/ARCHITECTURE.md` for the contract these check against.

## Running

The site must already be running (see the project's `verify` skill). Then, from
this folder:

```
python run_all.py [base_url]
```

`base_url` defaults to `http://127.0.0.1:4331/ielts-website` (no trailing slash -
the site 404s on one). This runs every `sN_*.py` scenario script in order and
writes one combined `docs/personal-learning/evidence/stage2/results.md`.

A single scenario can also be run on its own, e.g.:

```
python s4_audit_contradiction.py
```

Note: running a single scenario file directly does NOT reset `results.md` first
(only `run_all.py`/`helpers.reset_results()` does) - it appends its own section,
so re-running one scenario after `run_all.py` has completed leaves the other
scenarios' sections in place plus a second copy of the one you re-ran.

## Layout

- `helpers.py` - shared: constants, old-store (`ielts.progress.v1` /
  `ielts.studyplan.v1`) seed builders, a `results.md` writer, screenshot and
  console/network diagnostics helpers. Every scenario imports this.
- `s1_new_student_intake.py` ... `s9_keyboard_accessibility.py` - one file per
  scenario, each with a `run(base_url=...)` and a `if __name__ == "__main__"`
  so it can run standalone.
- `run_all.py` - runs all nine in order, resets `results.md` first.

## Conventions

- Every scenario opens its own fresh Playwright browser context (isolated
  `localStorage`) and seeds its own labelled SYNTHETIC data, or starts from
  genuinely empty storage. Nothing here is a real student's data.
- Seeding writes the OLD stores (`ielts.progress.v1`, `ielts.studyplan.v1`)
  and lets the site's own migration turn them into the new learner record and
  plan - the same thing a real returning student's browser would go through.
  See `helpers.seed_context()`.
- Context locale defaults to `en-US` (`helpers.new_context`). This machine's
  own OS/browser locale is Russian, and the site auto-detects a Russian
  device into the Russian interface (by design - see
  `src/lib/i18n/locale.ts`), which would otherwise silently break every
  English-text selector in these scripts.
- `helpers.goto()` uses `wait_until="load"` rather than `"networkidle"`: this
  app keeps live background connections open (dev-server HMR, Mr EZ), so
  `networkidle` either hangs or aborts the navigation outright against this
  dev server.
- Screenshots go to `docs/personal-learning/evidence/stage2/*.png`, full page,
  at 1440x900 (desktop) and 390x844 (phone, `helpers.PHONE`).
- This project's Vite DEV server was observed, several times while writing
  these scripts, to issue a full client reload mid-session (dependency
  optimizer restart: `504 Outdated Optimize Dep` / failed dynamic imports),
  which resets in-page component state and can make an otherwise-correct
  interaction look like a failure. `results.md` calls this out inline wherever
  it was seen. It does not exist in a production static build.
