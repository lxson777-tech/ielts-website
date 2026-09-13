# Workflow: Social Marketing Agent

## Objective
Produce short-form IELTS videos for Instagram Reels and TikTok, staged for
human approval. **Nothing this agent does can make a post public.** Going
live is a separate, human-run command.

## Why it's staged, not autonomous
Two independent reasons, one policy and one structural:

1. **Policy** — same rule as `generate_blog_post.md`. Outward-facing content
   under the centre's name gets a human read before it ships.
2. **Structural** — neither platform actually permits unattended public
   posting yet:
   - **TikTok**: un-audited apps are forced to `SELF_ONLY`. Public
     direct-posting requires passing TikTok's Content Posting audit (2-4
     weeks, multiple review rounds, hard UX requirements).
   - **Instagram**: `/media` only creates an inert *container*. It is
     invisible to everyone until a separate `/media_publish` call.

So the pipeline stops at "staged" because that's both the safe design and
the only thing the platforms allow.

## The pipeline

```
social_agent.py    ->  social_render.py  ->  social_publish.py --stage
   (plan)                 (video)              (upload, non-public)
                                                      |
                                            human review + approval
                                                      |
                                         social_publish.py --approve
                                                 (goes live)
```

Job state lives in one JSON file per video under `marketing/queue/`, moving
`planned -> rendered -> staged -> published` (or `failed`).

## Prerequisites

```
pip install -r requirements.txt
```

- `ANTHROPIC_API_KEY` in `.env` — **currently blank**, the planning agent
  will not run until it's filled in. (`blog_agent.py` and
  `growth_report_agent.py` are blocked on the same thing.)
- Platform credentials — see `workflows/setup_social_apis.md`. Staging fails
  cleanly per-platform if these are missing, so you can bring Instagram
  online before TikTok's audit clears.

## Step 1 — Plan

```
python tools/social_agent.py                      # agent picks the topic
python tools/social_agent.py --topic "Task 2 conclusions" --format mistake
```

Formats: `tip` (a usable technique), `mistake` (an error and its fix),
`structure` (a repeatable template).

The agent reads the site's own lesson bodies and is instructed to ground
every exam claim in them, rather than inventing band descriptors. It writes
the script, the Higgsfield video prompt, and separate Instagram/TikTok
captions into a job file. It checks `recent_topics()` to avoid repeats.

## Step 2 — Render

Higgsfield is reachable two ways, and **they are not interchangeable**:

### Provider `mcp` (default)
The Higgsfield MCP connector lives in a Claude session. A cron job cannot
call it — MCP connectors are client-side. So this provider writes a render
request and stops:

```
python tools/social_render.py --job <id>
```

Then, in a Claude session with the Higgsfield connector: read
`marketing/render-requests/<id>.json`, call `generate_video` with that
prompt at 9:16, poll `job_status`, and feed the result back:

```
python tools/social_render.py --job <id> --ingest-url <mp4-url>
```

### Provider `api`
Higgsfield's first-party REST API, which cron *can* call. This is the only
route to a genuinely unattended pipeline.

```
python tools/social_render.py --job <id> --provider api
```

> **The request/response shape in `_render_via_api()` is unverified.** The
> Higgsfield MCP connector dropped mid-build and `cloud.higgsfield.ai`
> redirects to a gated page, so it was written from third-party reseller
> docs, not first-party ones. Correct that one function against the real
> API before trusting it. It is deliberately the only place with guesswork.

## Step 3 — Stage

```
python tools/social_publish.py --job <id> --preview   # free, no API calls
python tools/social_publish.py --job <id> --stage
```

`--preview` prints the exact captions and hashtags without touching any API.
Use it before spending a staging call.

Staging uploads to both platforms in a non-public state. Each platform is
attempted in isolation: a missing TikTok token does not prevent Instagram
from staging, and vice versa. Per-platform errors land in the job file.

## Step 4 — Approve (human only)

```
python tools/social_publish.py --job <id> --approve
```

Prints the full preview, then requires you to **type the job id** to
confirm. Publishing the Instagram container is irreversible.

TikTok stays `SELF_ONLY` regardless — until the audit clears, flip it to
public by hand in the TikTok app.

## Safety guarantees
- `--stage` has no code path to `/media_publish`. Staging literally cannot
  publish.
- `--approve` requires an interactive typed confirmation, so it cannot run
  unattended in CI even if wired up by mistake.
- TikTok privacy is pinned to `SELF_ONLY` in the request body, not just
  inherited from the un-audited default.
- A failed render marks the job `failed` with the reason recorded, rather
  than leaving it stuck mid-status.

## Rate limits and ceilings
- Instagram: 100 API-published posts / rolling 24h; Reels capped at **90s**
  via the API even though the app allows 3 min.
- TikTok: 6 requests/minute per access token.
- Instagram containers **expire 24h after creation** — a job staged and left
  unapproved for a day must be re-staged, not approved.

## Edge cases
- **Model doesn't call `save_plan`** — exits non-zero, no job written.
- **Job already rendered** — re-rendering is refused; use `--ingest-url` or
  reset the status in the job file deliberately.
- **Both platforms fail to stage** — job goes to `failed`, exits non-zero.
- **Video URL not public** — staging refuses. Both platforms *fetch* the
  video over HTTPS; neither accepts a local file upload from this script.
  The rendered file in `marketing/assets/` must be hosted somewhere
  publicly reachable before staging.
