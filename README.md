# IELTS Portal

Free IELTS preparation site for an English language teaching centre in Almaty:
lessons for every paper, interactive quizzes, and timed practice tests with
band estimates. Built with **Astro + React islands + Tailwind CSS v4** and
deployed to **GitHub Pages**.

Live: https://lxson777-tech.github.io/ielts-website/

## Develop

```
npm install
npm run dev        # http://localhost:4321/ielts-website/
npm run build      # static output in dist/
npm run preview    # serve dist/ locally
```

Deployment is automatic: pushing to `main` triggers `.github/workflows/deploy.yml`,
which builds the site and publishes to GitHub Pages. (Repo setting
**Pages → Source** must be "GitHub Actions".)

## Architecture

```
src/
  styles/global.css        Design tokens (Tailwind @theme) + base styles
  styles/lesson.css        Restyles the legacy lesson-content class vocabulary
  layouts/                 BaseLayout (nav/footer), LessonLayout (lesson chrome)
  components/              Astro components + React islands (TestPlayer, ScoreHistory)
  data/
    lessons.ts             Lesson registry — drives homepage cards, nav, progress keys
    words.ts               Word-of-the-Day + vocabulary quiz data
    tests/                 Practice tests (one file per test, registered in index.ts)
  content/lesson-bodies/   Lesson body HTML fragments (scraper writes into these)
  lib/
    tests/schema.ts        PracticeTest types, scoring, band estimate
    progress.ts            localStorage progress store (lessons + test attempts)
    url.ts                 withBase() helper for the GitHub Pages base path
  pages/                   Routes: /, /lessons/<slug>, /tests, /tests/<id>, /styleguide
tools/                     Python authoring tools (content scraper etc.)
workflows/                 Markdown SOPs for the tools
```

### Design system

Modern EdTech look: white surfaces, indigo brand `#4f46e5`, per-skill accent
colors, Plus Jakarta Sans (headings) + Inter (body), 16px rounded cards.
All tokens live in `src/styles/global.css`; every core component is showcased
on the internal `/styleguide` page.

Lesson bodies keep their original class names (`.section`, `.card`,
`.exercise-box`, …) and are restyled by `src/styles/lesson.css` — this keeps
migrated content diffable against the originals and lets the Python scraper
keep injecting into the same markers.

### Adding content

- **New lesson:** create `src/content/lesson-bodies/<slug>.html`, a wrapper
  page in `src/pages/lessons/<slug>.astro`, and register it in
  `src/data/lessons.ts`. Nav, homepage cards and progress tracking pick it up
  automatically.
- **New practice test:** create `src/data/tests/<skill>-<nnn>.ts` following
  the `PracticeTest` schema and append it in `src/data/tests/index.ts`.
  The hub, the player route and the reading lesson's test grid update
  automatically. Reading tests use a `passage` stimulus; listening tests use
  an `audio` stimulus — the player supports both.
- **Refresh scraped materials:** `python tools/scrape_ielts_materials.py`
  (see `workflows/update_ielts_materials.md`), then commit and push.

### Student progress

Stored client-side in `localStorage` (`ielts.progress.v1`): completed lessons
and test attempts (score, band, time used). Shown on the homepage strip, as
checkmarks on lesson cards, and as the score history table/chart on `/tests`.
No accounts yet — the store is versioned so a future account sync can migrate it.
