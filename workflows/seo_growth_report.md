# Workflow: SEO & Growth Report

## Objective
Audit the live site's technical SEO health, identify content gaps versus
competitors, and produce a prioritized topic backlog for the blog agent —
as a **draft PR**, never writing directly to `src/`.

## When to Run
- Manually: `python tools/growth_report_agent.py`
- Via GitHub Actions `workflow_dispatch` (see `.github/workflows/seo-growth-report.yml`)
- Run this before `generate_blog_post.md` when both are eventually
  scheduled — it seeds the blog agent's backlog.

## Prerequisites
```
pip install -r requirements.txt
```
- `ANTHROPIC_API_KEY` in `.env` (already configured)
- `gh` CLI installed and authenticated for local runs; automatic in CI.
- **Until `rebuild/astro` merges to `main`**: same PR-base caveat as
  `generate_blog_post.md` — see that doc's Prerequisites section.
- **Optional, not yet configured**: `GA4_PROPERTY_ID`, `GSC_SITE_URL` — if
  absent, the report explicitly states "no traffic data — see setup note"
  rather than fabricating numbers. Set these up in Google Analytics /
  Search Console once you want real traffic data in the report.

## Run
```
python tools/growth_report_agent.py
```

## What It Does
1. `crawl_own_site()` — fetches a fixed set of live pages
   (`https://lxson777-tech.github.io/ielts-website/...`) and checks titles,
   meta descriptions, canonical/OG/JSON-LD tags, `robots.txt` /
   `sitemap-index.xml` presence, broken internal links, image alt-text
   coverage.
2. `list_content_inventory()` — reads `src/data/lessons.ts` and
   `src/content/blog/` for what topics already exist.
3. `web_search` (Anthropic-hosted) — a handful of queries comparing topic
   coverage against competitors like ielts.gg.
4. `write_report()` — saves `marketing/reports/<date>.md`.
5. `write_backlog_items()` — appends new topic ideas to
   `marketing/backlog.md` (skips anything already listed).
6. Deterministic Python opens a draft PR with both files, labeled
   `marketing-agent`.

## Draft-Only Guarantee
This agent has **no write tool that touches `src/`** — only
`write_report` and `write_backlog_items`, both scoped to `marketing/`. It
can recommend fixes (e.g. "add OG tags to `/blog`") but cannot apply them
itself.

## Edge Cases
- **No GA4/Search Console configured**: report says so plainly instead of
  guessing at traffic numbers.
- **Competitor site blocks scraping / search yields nothing**: that source
  is skipped and noted, the rest of the report still runs.
- **Site unreachable during crawl**: `crawl_own_site()` reports the fetch
  error per-page rather than failing the whole run.
- **Backlog topic already exists**: `write_backlog_items` deduplicates
  against existing (checked or unchecked) backlog lines automatically.

## Using the Backlog
`marketing/backlog.md` is a plain checklist:
```
- [ ] Topic — rationale (priority: high)
```
`tools/blog_agent.py` reads the first unchecked item as its next topic.
Check a box off manually once you're happy a topic has been covered (the
blog agent doesn't do this automatically — keeping backlog curation a
human step).
