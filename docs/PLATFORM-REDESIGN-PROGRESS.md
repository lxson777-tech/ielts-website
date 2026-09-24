# Platform redesign, 24 September 2026

Isolated branch: codex/platform-redesign-20260924, based on production32cdeb4. No trial, marketing gates, service deployment, database or account ownership changes.

## Implemented first batch

- Today: flatter intake, quiet unchosen goal, no zero streak or repeated unknown focus entries. Start/Continue above supporting details. Today's activities is an expandable list retaining all original actions and data.
- Course: selectively reused Claude's courseAgenda contract and selected-day view. All days selectable; future rows remain unlinked; current day's rows use the shared session. Plan history translates without changing stored data.
- Mobile shell: Mr EZ entry shares the bottom navigation footprint, with original open/close/focus/account behavior preserved. Clear reserved space, panel above dock.
- Progress: confirmed goals rather than fabricated defaults, meaningful new-student empty state, expandable paper details and preserved print expansion/restoration.
- Account: same confirmed-goal rule, no auth handling changes.
- Library: reused deduplication and bilingual filtering, 12 initial results, Show more in increments of12, filters/search operate on entire collection. No lesson deletion.
- Lessons: smaller header/spacing and optional word quiz after teaching content. Content fragments, exercise identities and teaching-block IDs unchanged.

## Verification

Tests: 2032 passed. Initial Astro build/check launched together collided over .astro/content-assets.mjs.tmp on Windows; use sequential Astro operations in the same checkout. No directories deleted. Type check and final build rerun sequentially. Browser script .codex-browser.py proves mobile tutor placement/open-close, intake deferral, all agenda dates, future-day non-links, lesson filtering/pagination, empty report, responsive pages and no page errors.

No external AI or signed-in student data exercised. Auth/paid service behavior remains the production implementation. Private admin, trial and marketing not part of this batch.

## Next batches

Searchable Reading/Listening banks, models/cue cards/vocabulary topic discovery; deeper active study/feedback states; Account/settings/auth finishing. Follow docs/audits/platform-design-2026-09-24/redesign-plan.md in the root workspace. Do not declare the entire redesign complete from this first batch.

Final local proof: 2032 tests passed; Astro check has zero errors/warnings (20 existing hints); build662pages. Browser verified original and Russian390px layouts, all agenda selections, library search/empty/filter/pagination, tutor opening/closing within the navigation dock, and zero page errors. A real local lesson was marked studied to verify populated Progress; print opened all paper disclosures and restored the one previously open. Lesson first teaching card starts at523px in the sampled phone viewport. Optional vocabulary quiz still opens. The first populated-report fixture used the obsolete device-wide storage key and was correctly ignored by current account-scoped storage; verification was rerun through the real lesson control instead.
