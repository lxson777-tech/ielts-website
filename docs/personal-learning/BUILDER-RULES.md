# Rules for every builder working on the personal learning build

Read this file, then `docs/personal-learning/LEAD-DECISIONS.md`, then
`docs/personal-learning/ARCHITECTURE.md` (your work package in section 7, plus
every section it refers to), then the contracts in
`src/lib/learning/contracts/`. Where the lead decisions and the architecture
differ, the lead decisions win.

## Safety (not negotiable)

- Write only inside this git worktree. Nothing outside it is yours to change.
- Never run a recursive delete or a mirror/sync command (`rm -rf`, `rmdir /s`,
  `Remove-Item -Recurse`, `robocopy /MIR`, `rsync --delete`, `git clean`).
  Never touch `.git`. If something resists deletion, leave it and report it.
- Delete only single files that you created yourself in this task.
- Do not run `git commit`, `push`, `merge`, `rebase`, `reset`, `checkout`,
  `restore`, `stash` or `worktree`. The lead commits. Never revert someone
  else's edits. If a file you need is owned by another package, stop and
  report it.
- No deployment, no `wrangler deploy`, no production database change, no paid
  API call (OpenAI, production Supabase, anything billable). Simulated AI only,
  and always labelled simulated.
- Do not install new dependencies or skills without the lead's say-so.

## Scope

- Touch only the files your work package owns. Read anything you like.
- The contracts are binding. If a contract is wrong or is missing something,
  make the smallest additive change and list it in your report under "Contract
  changes". Never rename or remove an existing catalogue id, progress key or
  localStorage key.
- Preserve all lessons, real test content, answer keys, recordings,
  translations, student history, calibrated graders and their models, sign-in
  boundaries, spending limits, the approved design (see `DESIGN.md` and
  `src/styles/workspace-redesign.css`) and the approved Mr EZ artwork.
- Exam material stays English. Every new interface string goes through the
  existing English and Russian system (architecture section 1.6). Add the
  English string and a Russian one. If you are unsure of the Russian, add your
  best version and list the key in your report under "Russian to review".
- Never use an em dash or an en dash in any text, comment or document. Use a
  comma, a period or parentheses.
- Honest wording everywhere. A completion click is "studied". Help used means
  "assisted". A short sample never yields a band. Nothing claims mastery.
  No guaranteed score. Simulated AI is never shown as live.

## Quality

- Match the surrounding code: naming, comment density, idiom.
- Pure logic gets deterministic tests under `tests/*.test.ts` (node:test, run
  with `npm test`). Synthetic learner data is labelled synthetic.
- Before you report, run your new tests, then the FULL suite (`npm test`), and
  for anything that touches pages, components, layouts or data endpoints also
  `npm run build`. Both must pass. Read failures fully and fix root causes. If
  an existing test must change because behaviour legitimately changed, change
  it and record why.
- If another builder is working at the same time, a test file of theirs may be
  failing through no fault of yours. Report it, do not edit it.
- Do not start a dev server unless your package says to. The lead verifies in
  the browser.

## Your final report (under 400 words)

1. Files created and files modified.
2. What now works, stated as behaviour.
3. Test totals (tests, pass, fail) and the build result, copied from real output.
4. Contract changes, if any.
5. Russian to review, if any.
6. Anything unfinished, any assumption you made, anything the next package
   needs to know. No hidden TODOs.
