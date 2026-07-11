# Workflow: Generate Blog Post

## Objective
Draft one SEO-oriented IELTS blog post and open it as a **draft PR** for
human review. This agent never publishes directly — nothing reaches the
live site until a human merges the PR and flips `draft: false`.

## When to Run
- Manually, whenever you want a new draft: `python tools/blog_agent.py`
- Optionally with a specific topic: `python tools/blog_agent.py --topic "..."`
- Via GitHub Actions `workflow_dispatch` (see `.github/workflows/blog-content-agent.yml`)
- Ideally after `seo_growth_report.md` has run at least once, so there's a
  backlog of topic ideas to pull from instead of the small seed list.

## Prerequisites
```
pip install -r requirements.txt
```
- `ANTHROPIC_API_KEY` in `.env` (already configured)
- `gh` CLI installed and authenticated (`gh auth login`) for local runs;
  in GitHub Actions this is automatic via `GITHUB_TOKEN`.
- **Until `rebuild/astro` merges to `main`**: draft PRs target `rebuild/astro`
  (see `MARKETING_PR_BASE` in `tools/utils.py`), not `main` — otherwise the
  PR diff would include every unmerged commit from the Astro rebuild, not
  just the new post. When triggering via GitHub Actions
  `workflow_dispatch`, explicitly select the `rebuild/astro` branch in the
  "Use workflow from" dropdown (the workflow file itself only exists on
  that branch until it merges). Flip `MARKETING_PR_BASE` to `"main"` once
  `rebuild/astro` is merged.

## Run
```
python tools/blog_agent.py
python tools/blog_agent.py --topic "IELTS Writing Task 2 time management"
```

## What It Does
1. Picks a topic: `--topic` override, else the first open item in
   `marketing/backlog.md`, else a hardcoded seed topic.
2. Runs a Claude agent (`tools/agent_runner.py`) with tools to:
   - `list_existing_posts` — avoid duplicate topics/slugs
   - `read_site_content` — sample the site's existing voice/terminology
   - `web_search` (Anthropic-hosted) — verify facts sparingly
   - `write_draft` — the only write tool; saves one file to
     `src/content/blog/<slug>.md` with `draft: true` forced regardless of
     what the model outputs
3. Deterministic Python (not the model) then: creates a branch, commits the
   one new file, pushes, and opens a **draft PR** labeled
   `marketing-agent, needs-human-review` with a review checklist.

## Draft-Only Guarantee
- The model's only write tool touches one file in a working tree — it has
  no ability to push to `main` or call a publish API.
- `open_marketing_pr()` (in `tools/utils.py`) only ever creates a PR, never
  merges one.
- `.github/workflows/deploy.yml` only builds/deploys on push to `main`, so
  even a stray direct push to a branch doesn't go live.
- The blog post's `draft: true` frontmatter is a second, independent gate —
  even a mistakenly-merged post stays invisible on `/blog` until a human
  flips it to `false`.

## Reviewing a Draft PR
1. Read the post for factual accuracy (band-score claims, exam format
   details) and voice.
2. Check internal links resolve to real pages.
3. Flip `draft: false` in the frontmatter when ready to publish.
4. Merge.

## Edge Cases
- **Topic already covered**: the model is instructed to check via
  `list_existing_posts` and pick something else; if it still produces a
  near-duplicate, catch it in review and close the PR.
- **`web_search` yields little**: the model still drafts from its own
  knowledge; spot-check factual claims more carefully in review.
- **`gh` not authenticated**: the script exits with a clear error rather
  than silently skipping the PR — run `gh auth login` and retry.
- **Slug collision**: `write_draft` appends today's date to the slug
  automatically.
- **Model doesn't call `write_draft`**: the script exits non-zero with
  "no draft produced" instead of opening an empty PR.
