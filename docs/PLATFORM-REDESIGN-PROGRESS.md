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


## Final local implementation, 24 September 2026

The remaining design pass is implemented in this isolated checkout. Preview: http://127.0.0.1:4372/ielts-website/dashboard. Not deployed.

### Discovery and reference pages

- Reading and Listening banks: shared search, question-type and duration controls, 12 initial results, progressive reveal, honest empty state and existing ?type links retained. Phone rows use full width and readable titles.
- Full tests: searchable bank with progressive reveal, original rotation/resume handlers unchanged.
- Practice hub: shorter purpose-first descriptions across all four skills.
- Vocabulary: searchable topics and progressive reveal; vocabulary lesson terms searchable, phone tables restyled as readable rows/cards without editing source lesson content.
- Models: searchable Task 1/2 selection, compact phone picker, optional full question, essay visible earlier. Write this one now uses the existing exact-task route.
- Cue cards: search, family filters, progressive reveal, translated family labels and concise translated introduction. Existing rehearsal timer retained.
- Missing H1s fixed on trainers, models, cue cards, band guide and password reset.

### Study and feedback

- Single-paper instructions and mock details are expandable, with the running-clock/no-pause rule visible before starting. Listening distinguishes replayable practice from one-play exam conditions.
- Active test navigation has a visible, named Tests link on phones.
- Speaking entry is shorter, with preparation tips optional. No voice lifecycle or service changes.
- BandReport puts strengths and the next action plan before criterion detail; improvement guidance opens on demand.
- Writing preserves the selected prompt in the URL. Immediate refresh flushes the existing owner-bound draft, fixing an autosave timing gap without changing the ownership system.
- Real browser use exposed seven unusable imported Listening exercises: three categorisation menus had no choices, four diagram exercises had neither diagram nor typed answer field. A tested adapter now reads the relevant legend/image from the original numbered question sheet, never from answer keys, and renders the appropriate input. Original scoring and evidence identities retained.
- Existing focused task layouts already support stimulus, answer, check/retry and account-bound recording. Kept that structure and exercised representative Reading/Listening answer-feedback flows instead of introducing a second player.

### Account, settings and help

- Account leads with identity/sync and saved work; paper histories are expandable and direct section links open the right history. Deeper progress analysis remains on Progress.
- Study settings group goal and schedule, disclose preferences/memory, and show unsaved/saved states.
- Sign-in and reset share password visibility; sign-in has a named dialog, keyboard focus loop, Escape dismissal and focus restoration. Expired links offer direct reset-request entry.
- Help restored selectively from reviewed bb298d4, with bilingual collapsible answers and actual footer/menu links. No invented support address.
- Admin signed-out entry translated and given a direct sign-in action. Owner-only data access, list, search/sort and expandable rows remain production's implementation. Private owner data was not accessed.

### Plan decisions and boundaries

Kept one compact library layout rather than adding an extra list/card toggle. It satisfies the search/readability goal with fewer controls. Existing band-guide selected styles remained readable in the hydrated browser, so no speculative contrast rewrite. Vocabulary examples remain directly readable in each phone card rather than adding a button to every word. Authenticated voice, real grading and private admin interiors remain external verification boundaries, not claims of live service validation. No accounts created, messages sent, recordings made, paid calls or deployment.

### Final proof

- 2033 tests passed, including a new regression over all seven affected imported Listening exercises.
- Astro check: 0 errors, 0 warnings, 18 existing hints. Build: 663 pages.
- Browser: phone/desktop discovery search, empty states, pagination, question-type deep links, model task filter, cue cards and vocab topics, lesson word search, account anchors, settings save/reload, Help, reset request and admin sign-in.
- Browser: writing survives Help, resize and immediate refresh; keyboard focus/password visibility/Escape restoration; actual local Reading drill submit and answer review; representative focused practice feedback; restored diagram loads and typed answers work.
- English/Russian phone layouts have no horizontal overflow in tested routes. No page errors in the route pass. Prior batch's tutor dock, Course navigation and Progress print/local lesson checks remain recorded above.
- BandReport rendered from the actual component with clearly labelled simulated data, styled with the final built CSS; criterion disclosure exercised at phone width. No synthetic assessment entered into student data.
- graphify update completed. Build and check run sequentially to avoid their shared Astro cache collision. Preview verification waits for hydration after client-side navigation.


## Platform motion pass

Added a platform-only motion layer for buttons/links, field focus, selectable cards, dialogs, tabs, Course day content and native disclosures. Existing click handlers, editor instances, account ownership and Astro navigation remain unchanged. Native disclosure size interpolation provides real smooth opening and closing without JavaScript measurement loops, with a fade fallback on older browsers. Reduced-motion and print rules included. Verified actual intermediate open/close heights in browser, card hover, modal entry/dismissal, writing draft retention through mobile tabs, phone layouts and reduced-motion overrides. All2033tests pass. Build663pages. Local only, gates/trial excluded.


## Controlled disclosure follow-up

The first motion pass did not fix conditional React content, which still unmounted immediately on close. Added a shared SmoothReveal with animated flow height and opacity, immediate inert state on closing, lazy mounting and live reduced-motion preference handling. Applied to Today's three secondary options, scope notes, Course skill sections, writing-history rows and admin student details. Account menu now retains its closing transition; Mr EZ uses a discrete display transition. Existing coach accordions share the same pacing. Mobile model picker and reading passage animate their bounded visible height rather than the entire hidden scroll content.

Runtime checks measured intermediate opening and closing heights on Today, Course, writing history (isolated local fixture), mobile model picker and reading passage. Checked menu exit, tutor close, reduced motion, native details, cards, retained writing draft across tabs and phone layouts. Admin interior remains unverified with a real signed-in administrator. Tests: 2033 passing; check: no errors or warnings (18 existing hints); build: 663 pages. No paid requests or deployment.


Course view switch follow-up: both route and lesson panels now remain mounted, with a crossfade and measured outer-height transition. Inactive content is inert and hidden from assistive navigation. Keeping both panels mounted also prepares the phone lesson layout before switching and preserves expanded sections. Verified 1440px and 390px intermediate heights, rapid switching, retained section state, no horizontal overflow, live reduced-motion changes and no browser errors. Existing 2033 tests pass; build succeeds.
