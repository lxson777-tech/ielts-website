# Site Supervisor (daily)

A daily automated pass over the IELTS Portal that audits code health, suggests
site improvements, and scouts competitor/adjacent IELTS-prep sites for
features we're missing. Runs as a scheduled cloud agent (see `claude.ai/code/routines`),
checked out fresh from `main` each run, no access to local machine state.

## 1. Setup

- `npm install`
- `graphify update .` to build/refresh the knowledge graph (if the `graphify` CLI
  isn't available in this environment, skip graph-assisted lookups and rely on
  Glob/Grep/Read instead, don't fail the run over it).
- Create a branch off `main`: `supervisor/YYYY-MM-DD`.

## 2. Code health audit

Goal: find and fix real bugs, not stylistic nitpicks.

- `npm run build` — treat any build failure as a bug to fix immediately (highest
  priority, blocks deploys).
- `graphify query "orphaned components"` / `graphify query "dead code"` (or
  equivalent) to find unused exports, components never imported, and broken
  internal links. Cross-check anything suspicious with Grep before touching it,
  the graph can be stale.
- Grep for hand-written internal links/redirects missing the `/ielts-website`
  base prefix (see CLAUDE.md "site/base" note), since Astro's static redirects
  don't run back through `base`.
- Skim `src/components/` React islands and recently-touched files (`git log
  --since="14 days ago" --name-only`) for the class of bug this project has hit
  before: animation/CSS state fights (see the vocab word drift-vs-click bug),
  timer/overlay z-index collisions, mobile nav overflow. Don't assume these are
  still present, verify against current code.
- If a fix is non-obvious or touches the AI grading Workers (`workers/`), don't
  guess at request/response shape, read that Worker's README first, and if
  still uncertain, leave it as a suggestion in the report rather than a
  speculative fix.
- **Never touch `workers/*` deploy config, secrets, or run `wrangler deploy`.**
  That's a billable, externally-visible action reserved for the user.
- **Never touch `.github/workflows/*` or anything that changes how `main`
  deploys.**
- Fix what's safe and clearly correct. Leave anything you're not fully
  confident about as a suggestion in the report instead of a speculative patch.

## 3. Content/UX suggestions

- Skim `src/data/lessons.ts`, `src/data/tests/index.ts`, and `/styleguide` for
  gaps: skills or band levels with thin coverage, missing test types, dead-end
  pages, weak calls-to-action.
- Note anything that would materially help IELTS students that isn't a code
  bug, e.g. a missing lesson topic, a confusing flow, an accessibility gap.
  These go in the report as suggestions, not automatic changes, content
  strategy is the user's call.

## 4. Competitor / adjacent-site scouting

Goal: keep discovering IELTS-prep websites (not just one fixed competitor) and
flag features they have that we don't.

- Read `workflows/competitor-landscape.md` (create it if missing) for the
  running list of sites already tracked and their last-known feature set.
- WebSearch for IELTS prep tools/platforms (vary the query each run, e.g.
  "IELTS writing checker AI", "free IELTS mock test online", "IELTS speaking
  practice app" ) to surface sites not yet in the tracked list. Aim for 1-3 new
  sites per run, don't mass-crawl.
- WebFetch each new or previously-tracked site's homepage/feature pages, note
  what they offer (grading, mock tests, band predictors, study plans,
  analytics, pricing, etc.).
- Update `workflows/competitor-landscape.md`: add new sites, update feature
  notes for existing ones, and call out anything that looks like a genuine gap
  for our site (something students would want that we don't have yet).
- This file update is a normal part of the branch's commit, same as code
  fixes.

## 5. Report and delivery

- If any files changed (bug fixes and/or `competitor-landscape.md` updates):
  commit on the `supervisor/YYYY-MM-DD` branch, push, and open a PR against
  `main` via `gh pr create`. Put the full report in the PR description (see
  format below). **Do not merge the PR.**
- If nothing changed at all (no bugs found, nothing new on
  `competitor-landscape.md`) but there are suggestions worth surfacing: open a
  GitHub issue via `gh issue create` titled `Site Supervisor Report -
  YYYY-MM-DD` with the report as the body.
- If truly nothing to report, still open a short issue confirming the clean
  run rather than going silent, so the user knows it ran.

### Report format

```
## Site Supervisor Report - YYYY-MM-DD

### Bugs fixed
- <what was broken, what you changed, file:line>

### Suggestions (not applied)
- <code health items you weren't confident enough to auto-fix>
- <content/UX gaps>

### Competitor scouting
- New sites found: <name, url, one-line on what they offer>
- Feature gaps worth considering: <specific, tied to a site>
```

Keep it scannable, this is read once a day. Bullet points, no fluff, link to
files/lines where relevant.
