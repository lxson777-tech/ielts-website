# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## What this is

**IELTS Portal**, a free IELTS prep site for an English language teaching centre in Almaty:
lessons for every paper, interactive quizzes, timed practice tests with band estimates, and
AI-graded writing/speaking feedback. Built with **Astro 5 + React islands + Tailwind CSS v4**,
deployed to **GitHub Pages**.

Live: https://lxson777-tech.github.io/ielts-website/

```
npm install
npm run dev        # http://localhost:4321/ielts-website/
npm run build      # static output in dist/
npm run preview    # serve dist/ locally
```

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to
GitHub Pages automatically. **Treat `main` as production** — check changes with `npm run dev`
locally first and don't push until the user has confirmed the change looks right. This is a
live site for real students; a broken push is visible immediately.

## How you're expected to work

- **Fix root causes, not symptoms.** If a bug is due to a missing type, a stale schema, or a
  wrong assumption, fix that thing, don't patch around it.
- **Never mark something done without proving it works.** For code with a runtime surface
  (a component, a page, a Worker, a script), actually exercise it, run the dev server and use
  the feature, run the script, hit the Worker, before saying it's fixed. Passing a type-check
  is not the same as confirming behavior. Use the `/verify` skill for this when appropriate.
- **When something breaks, learn from it.** Read the full error, fix it, re-verify, and if the
  failure reveals a rate limit, timing quirk, or gotcha worth remembering, update the relevant
  workflow doc in `workflows/` or a comment at the point of the fix, not a new abstraction.
- **Look for existing tools before writing new ones.** Check `tools/` and `src/lib/` for
  something that already does what you need.

## Architecture

```
src/
  styles/global.css        Design tokens (Tailwind @theme) + base styles
  styles/lesson.css        Restyles the legacy lesson-content class vocabulary
  layouts/                 BaseLayout (nav/footer), LessonLayout (lesson chrome)
  components/              Astro components + React islands (TestPlayer, ScoreHistory,
                            WritingTester, SpeakingTester, LiveExaminer, ...)
  data/
    lessons.ts             Lesson registry — drives homepage cards, nav, progress keys
    words.ts               Word-of-the-Day + vocabulary quiz data
    tests/                 Practice tests (one file per test, registered in index.ts)
    writing-prompts.ts, speaking-prompts.ts, writing-structures.ts,
    speaking-structure-guides.ts, reading-strategies.ts, reading-practice.ts
  content/lesson-bodies/   Lesson body HTML fragments (scraper writes into these)
  lib/
    tests/schema.ts        PracticeTest types, scoring, band estimate
    progress.ts            localStorage progress store (lessons + test attempts)
    url.ts                 withBase() helper for the GitHub Pages base path
    writing/               EssayGrader schema, grader (RemoteGrader → Worker), mechanics
    speaking/               SpeakingGrader schema, grader, recorder, live/ (session, script, grade)
  pages/                   Routes: /, /lessons/<slug>, /tests, /tests/<id>, /trainers/*,
                            /speaking/examiner, /blog, /styleguide
tools/                     Python content-automation scripts (see below)
workflows/                 Markdown SOPs for those scripts
workers/                   Cloudflare Workers backing the AI features (see below)
```

`site`/`base` in `astro.config.mjs` are `https://lxson777-tech.github.io` / `/ielts-website`.
Any hand-written internal link or redirect target needs the `/ielts-website` prefix spelled
out (Astro's static redirects aren't run back through `base`); use `withBase()` in
`src/lib/url.ts` elsewhere.

### Design system

Modern EdTech look: white surfaces, indigo brand `#4f46e5`, per-skill accent colors, Plus
Jakarta Sans (headings) + Inter (body), 16px rounded cards. All tokens live in
`src/styles/global.css`; every core component is showcased on `/styleguide`. Lesson bodies
keep their original class names (`.section`, `.card`, `.exercise-box`, …), restyled by
`src/styles/lesson.css`, so migrated content stays diffable against the scraper's output and
the scraper can keep injecting into the same markers.

Relevant skills for UI work: `a11y-audit`, `web-quality-audit`, `ui-styling`,
`modern-web-design`, `css-animation-creator`, `typography`, `hover-interactions`,
`aceternity-ui`. Use `/verify` or a dev-server check after visual changes, don't just eyeball
the diff.

### Adding content

- **New lesson**: create `src/content/lesson-bodies/<slug>.html`, a wrapper page in
  `src/pages/lessons/<slug>.astro`, and register it in `src/data/lessons.ts`. Nav, homepage
  cards, and progress tracking pick it up automatically.
- **New practice test**: create `src/data/tests/<skill>-<nnn>.ts` following the `PracticeTest`
  schema in `src/lib/tests/schema.ts` and append it in `src/data/tests/index.ts`. The hub, the
  player route, and the reading lesson's test grid update automatically. Reading tests use a
  `passage` stimulus; listening tests use an `audio` stimulus, `TestPlayer` supports both.
- **Refresh scraped materials**: `python tools/scrape_ielts_materials.py` (see
  `workflows/update_ielts_materials.md`), then commit and push.

### Student progress

Stored client-side in `localStorage` (`ielts.progress.v1`): completed lessons and test
attempts (score, band, time used). Shown on the homepage strip, as checkmarks on lesson
cards, and as the score history table/chart on `/tests`. No accounts yet, the store is
versioned so a future account sync can migrate it.

## AI grading subsystem

Three independent Cloudflare Workers back the AI-graded features, each Gemini-backed, each
deployed and configured separately from the Astro site itself:

| Feature | Route | Worker | Env var (site side) |
|---|---|---|---|
| Essay grading | `/trainers/writing` (`WritingTester`) | `workers/grade-essay` | `PUBLIC_GRADER_URL` |
| Speaking grading | `/trainers/speaking` (`SpeakingTester`) | `workers/grade-speaking` | `PUBLIC_SPEAKING_GRADER_URL` |
| Live voice examiner | `/speaking/examiner` (`LiveExaminer`) | `workers/live-examiner` | `PUBLIC_LIVE_EXAMINER_URL` |

- `grade-essay` / `grade-speaking` take the submission, call Gemini, return a structured band
  result (`RemoteGrader` / `RemoteSpeakingGrader` in `src/lib/{writing,speaking}/grader.ts`).
  If unconfigured or unreachable, both fall back to the local stub grader rather than failing.
- `live-examiner` doesn't grade directly, it mints short-lived Gemini Live API ephemeral
  tokens so the browser can hold a real-time voice conversation with Gemini directly over
  WebSocket, the Worker never sees the audio. If `PUBLIC_LIVE_EXAMINER_URL` is unset,
  `/speaking/examiner` shows a "not configured" notice and disables the start button instead
  of breaking.
- Each Worker has its own README under `workers/<name>/README.md` with deploy steps
  (`npx wrangler secret put ...`, `npx wrangler deploy`) and calibration notes. Read that
  before touching a Worker; don't guess at its request/response shape from the frontend code
  alone.
- Deploying a Worker is a real, billable, externally-visible action, confirm with the user
  before running `wrangler deploy` or rotating secrets.

## Content-automation tools (WAT: Workflows, Agents, Tools)

`tools/` and `workflows/` are a separate subsystem from the site: Python scripts that generate
blog posts and SEO growth reports, run by GitHub Actions
(`blog-content-agent.yml`, `seo-growth-report.yml`) or manually. This is the one place in the
repo with a strict separation of concerns: **workflows** (`workflows/*.md`) are the plain-
language SOPs, **you** are the decision-maker that reads a workflow and calls the right
**tool**, and **tools** (`tools/*.py`) are deterministic scripts that do the actual work.
Don't collapse the layers, don't hand-roll what a workflow says to do with a tool.

- Tools run as `python tools/<script_name>.py`. Install deps once with
  `pip install -r requirements.txt`.
- All tools import `tools/utils.py`, which auto-loads `.env` and provides `require_env(*keys)`
  (exits with a clear message if a key is missing), `tmp_path(filename)` (resolves a `.tmp/`
  path), and `get_google_service(api, version)` (Google OAuth client). If a script fails with
  a missing-key error, add the key to `.env`, don't work around it.
- `tools/agent_runner.py` owns the Claude agentic loop (tool-use dispatch, prompt caching via
  `cache_control`, retry on `RateLimitError`/529). Call `run_agent()` from a workflow tool,
  don't reimplement the loop. Tools passed to it follow the standard
  `{name, description, input_schema}` shape with a matching entry in `tool_registry`.
- Current scripts: `scrape_ielts_materials.py`, `extract_lesson_bodies.py`,
  `add_quiz_markers.py`, `blog_agent.py`, `growth_report_agent.py`, `pilot_listening_audio.py`.
- Existing workflows: `update_ielts_materials.md`, `generate_blog_post.md`,
  `seo_growth_report.md`. Don't create or overwrite a workflow without asking, these are the
  user's instructions; do update one when you learn something new about how a tool behaves
  (rate limits, timing quirks, edge cases).
- `.tmp/` is disposable scratch output, regenerated on demand, never a deliverable.

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure,
and cross-file relationships.

- For codebase questions, run `graphify query "<question>"` first when `graphify-out/graph.json`
  exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"`
  for focused concepts, these return a scoped subgraph, usually much smaller than
  `GRAPH_REPORT.md` or raw grep output.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source
  browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when
  query/path/explain don't surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API
  cost).
