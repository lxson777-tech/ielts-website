# Stage 2 personal-learning browser scripts

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
