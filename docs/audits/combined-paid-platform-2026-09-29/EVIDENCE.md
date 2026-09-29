# Evidence and reproduction notes

This folder is the audit deliverable. REPORT.md separates browser observations, source-only conclusions, design judgments and unverified production behavior.

## Environment

- Source checkout: `C:/Users/Alex/Desktop/Projects/IELTS website/.claude/worktrees/musing-mcclintock-862665`.
- Branch: `claude/paid-platform-readiness-03c113`.
- HEAD at start and final check: `1a4c930`.
- Trial site: `http://localhost:4481/ielts-website`; backend: `http://127.0.0.1:8881`.
- Open site: `http://localhost:4482/ielts-website`; backend: `http://127.0.0.1:8882`.
- Only synthetic `@example.test` accounts and local simulated services were used.
- Main viewport matrix: 1440 x 900 and 390 x 844, EN and RU. Separate mobile/touch contexts were also used for returning accounts and completed tests.
- Temporary scripts and generated runtime files: `C:/Users/Alex/AppData/Local/Temp/ielts-combined-audit-20260929`.

The local servers used the supplied stand-in configuration. Open-build grader and live-examiner URLs were explicitly empty, avoiding accidental use of production values. The trial stand-in ran `--trial`, without `--live`, under the existing TypeScript loader. Its AI replies, session and assessments were simulated. The existing simulated browser journeys also blocked nonlocal network requests, with their own local voice-peer interception handling the simulated interview.

Astro was started programmatically against the original config and original source, with a separate temporary root/cache for each mode. A temporary configuration wrapper pointed the stylesheet scanner at the original `src` directory. This was required because isolating the runtime root initially prevented utility classes from being generated. The affected trial/placement and matrix captures were rerun after that correction. No source or installed dependency was edited to achieve it. This is a local development audit, not a fresh production build.

## Final automated checks

| Check | Final result | Evidence |
|---|---|---|
| `npm test` from the audited worktree | 2,234 passed; 0 failed | [Log](logs/unit-tests.log) |
| `tests/browser/t01_trial_journey.py`, adapted only in temporary execution to use audit output/local URLs | 89 of 89 passed | [Result table](trial-journey/results-t01.md), [log](logs/trial-journey.log) |
| `tests/browser/p01_placement_journey.py`, same output/local-URL adaptation | 42 of 42 passed | [Result table](placement-journey/results.md), [log](logs/placement-journey.log) |
| `tests/browser/i01_intake_redo.py`, same output/local-URL adaptation | 66 of 66 passed | [Result table](intake-journey/results.md), [log](logs/intake-journey.log) |

These are final successful runs, not the historical counts quoted in project documentation. The existing browser suites' comments and headings may describe their original output locations; the files here are the newly generated evidence.

## Additional browser work

| Area | Evidence | What it proves |
|---|---|---|
| Broad page/state matrix | [Index](COVERAGE.md), [observations](browser-observations.json), [network/page events](browser-events.json) | 277 distinct route/state captures; visible copy, headings, links, input/button geometry and document width. Duplicate raw records can occur where a setup capture was repeated; the index uses the final record per label. |
| Returning student | [Observations](returning-observations.json), [log](logs/returning.log) | Same synthetic account signs in from a lesson and returns there in all four combinations; account details on fresh contexts; local forgot-password response. |
| Full test and drill | [Observations](practice-observations.json), [keyboard log](logs/keyboard.log) | Started, submitted with synthetic answers, result and review at both widths in both languages. Tab focus is outside the result dialog and Escape leaves it present. |
| Trial targeted interactions | [Observations](targeted-observations.json), [log](logs/targeted-extra.log) | Wrong rotating Reading destination, trainer gate, expanded Help, visible tab focus, lesson quiz controls, included Listening submission and used state. |
| Writing, vocabulary and report | [Observations](trainer-observations.json) | Active Writing editor, draft screenshots before/after refresh, topic detail, populated report and lesson-study state. These exploratory captures are not counted as an assertion suite. |
| Focused Writing follow-up | [DOM observations](accessibility-observations.json), [log](logs/accessibility.log) | Main textarea has no associated label or aria-label. A separately entered draft survives reload exactly. Coach text opacity was 1 after settling; its pale mid-animation screenshot is not a contrast finding. |
| Lessons scrolled fully | [Observations](scroll-observations.json), `screenshots/scrolled-*.png` | Four representative skill lessons plus vocabulary overview at both widths/languages. Russian vocabulary overview remains 14 pixels wider than the 390-pixel viewport after scrolling. Its word-search control has no word-table rows to search. |
| Sales controls, reduced motion | [Checks](sales-controls.json), [log](logs/sales-controls.log) | 44 observations/checks with no failed entry: all three demo tabs, all four skill tabs at both widths, demo arrow-key focus/selection, in-page anchor targets and local link responses. Local links returned success. |

The observations are evidence rather than product data. A low score from intentionally incomplete synthetic answers is not evidence of grading quality. A failed request for locked content is not evidence that paid content leaked.

## Boundaries and exclusions

- No real payment, paid subscriber, real AI response, real voice service, production email delivery or production database was tested.
- The open Speaking entry is unavailable by the deliberately empty local configuration. The trial voice journey uses the local simulated peer. Those are separate claims.
- The first placement attempt under incomplete audit-runtime styles timed out on a hidden field. After the runtime stylesheet correction, the unchanged product passed all 42 placement checks. It is not reported as a product defect.
- A generic shell command for supplemental browser work was blocked without a specific substantive reason. The same authorized local checks were then written as small, explicit temporary scripts and ran successfully. No approval bypass or external action was needed.
- Some exploratory scripts required selector corrections, for example the inline unanswered-question alert is not a dialog, and a lesson already marked studied has a different button label. Those are not product failures and are not included in the passing assertion totals.
- Some initial long-document screenshots capture scroll-reveal animations before their lower sections are visited. Use the later `scrolled-*` evidence to inspect full lessons. A full screenshot alone is not a substitute for the scroll pass.
- No production performance score, full WCAG conformance claim, exhaustive screen-reader review or security certification is made.

## Final preservation and shutdown

The final Git check still showed HEAD `1a4c930`, no tracked-file diff, and only the new `docs/audits/combined-paid-platform-2026-09-29/` directory as untracked. No commit, merge, stash, rebase, push or deployment was performed. No product code was changed. No recursive delete, mirror command or cleanup deletion was used.

The original owned preview processes had already exited by the final focused follow-ups; only the auditor's replacement instances were restarted. Their process identities were checked as `node.exe` with the matching temporary server/stand-in commands before shutdown. Other sessions' ports 4441/4442/8841/8842 were not stopped. The shutdown result is recorded in [server-shutdown.txt](server-shutdown.txt). Temporary scripts, logs and runtime files were left in place.
