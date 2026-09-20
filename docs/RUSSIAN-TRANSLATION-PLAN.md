# Russian translation: audit and plan

Written 2026-09-20, before any translation work starts. Scope: map what exists, decide what should and should not be translated, compare technical approaches for this exact stack, and lay out a phased delivery plan. No code changed for this document.

## 1. Existing internationalisation: none

There is no internationalisation in the codebase today. Specifically:

- `astro.config.mjs` has no `i18n` block at all (Astro 5 supports one; this project does not use it).
- `src/layouts/BaseLayout.astro` line 66 hard-codes `<html lang="en">`. Every page inherits this, including the ones that would need `lang="ru"`.
- No dictionary, locale, or translation file exists anywhere (`grep -rniE "locale|i18n"` across `src` returns only unrelated hits: `Array.localeCompare` calls used for sorting, and one `toLocaleDateString('en-GB', ...)` call in five history components).
- No Cyrillic text exists anywhere under `src` (checked with a Unicode Cyrillic-range search across the whole tree; zero matches). Kazakhstan and Russia appear only as place names inside English reading passages about geography and conservation (`src/data/reading-practice.ts`, `src/data/tests/reading-full-002.ts`), not as translated UI.
- `package.json` confirms Astro `^5.7.0`, which is the version whose built-in i18n routing is being evaluated in section 4.

Conclusion: this is a greenfield i18n project. Nothing to migrate away from, but also nothing to build on.

## 2. Inventory of translatable text, by area

The built site currently emits **519 static HTML files** (counted from a `dist/` build), consistent with the roughly-516-pages figure already in mind for this project. Word counts below are raw `wc -w` on the source files, which counts code syntax as well as prose, so treat them as an upper bound on translation volume, not a literal word count of the visible text.

### Interface chrome

| Area | Location | Files | Notes |
|---|---|---|---|
| Shared header/nav | `src/lib/platform-nav.ts` | 1 | 502 words (mostly code). Five tab labels ("Today", "Course", "Practice", "Tests", "Vocabulary") plus the avatar-menu labels ("Account", "Study plan settings", "Saved and notes", "Progress report", "Lessons library", ...). Small in count, seen on every page. |
| Layouts | `src/layouts/BaseLayout.astro`, `src/layouts/LessonLayout.astro` | 2 | Nav chrome, footer, `<html lang>` attribute (the thing that must actually change). |
| Top-level components | `src/components/*.astro`, `src/components/*.tsx` (excluding subfolders) | 58 files, 13,520 lines total | This is the bulk of interface chrome: buttons, empty states, tooltips, modal copy, the auth modal, history tables, the mock exam UI, `TypeAnalytics`, `WorkspaceHeader`, etc. Mixed JSX string literals and Astro template text. |
| `src/components/home/` | `EzStudent.astro`, `GameStudent.astro` | 2 | Homepage illustration/story components (currently unused per `redirects` in `astro.config.mjs`, since `/` redirects straight to `/dashboard`, but still shipped and reachable). |
| `src/components/plan/` | `PlanToday.tsx`, `WeekView.tsx` | 2 | Study-plan widgets shown on the dashboard. |
| `src/components/tutor/` | `ExplainResult.tsx`, `MrEzAvatar.tsx`, `MrEzMemory.tsx`, `MrEzPanel.tsx`, `MrEzWelcome.tsx` | 5 | Mr EZ's chat UI chrome (not his generated speech, which is covered in section 5). |

Rough size: on the order of 60-70 component files, low thousands of distinct short strings (labels, button text, empty-state copy, tooltips), all as JSX/Astro literals, easy to extract mechanically once a dictionary exists.

### Page-level copy

`src/pages/**/*.astro`: **46 files**, 8,578 words total. This includes the 12 or so genuinely dynamic route templates (`[part].astro`, `[id].astro` variants) whose page-level copy is shared across every generated instance, so translating these 46 files covers all 519 built pages' page-level chrome. This is a manageable, one-time job.

### Data registries (titles, blurbs, labels)

Top-level `src/data/*.ts` files (20 total), word counts from largest to smallest:

| File | Words | What it is |
|---|---|---|
| `writing-plans.ts` | 44,597 | Full Task 1/2 writing lesson plans: teaching prose plus model text. |
| `reading-practice.ts` | 32,312 | Reading passages and questions used in lessons (distinct from the 40 full tests in `src/data/tests/`). |
| `listening-practice.ts` | 18,736 | Listening lesson practice content. |
| `speaking-prompts.ts` | 18,379 | Speaking task prompts. |
| `cue-cards.ts` | 17,154 | Part 2 cue cards. |
| `band-guides.ts` | 10,395 | Band descriptor explanations shown to students. |
| `writing-prompts-imported.ts` | 5,404 | Imported Task 2 prompts. |
| `words.ts` | 4,518 | Word-of-the-day / vocabulary quiz data. |
| `writing-structures.ts` | 2,090 | Essay structure guides (technique explanations). |
| `listening-strategies.ts` | 1,411 | Strategy text per listening question type. |
| `reading-strategies.ts` | 1,318 | Strategy text per reading question type. |
| `speaking-structure-guides.ts` | 1,030 | Structure guidance for speaking answers. |
| `lessons.ts` | 773 | Lesson registry: titles + one-line descriptions that drive nav and homepage cards. |
| `reading.ts`, `listening.ts` | 607 / 553 | Lesson-part titles and blurbs. |
| `vocabulary.ts` | 496 | Vocabulary quiz registry. |
| `model-answers.ts` | 484 | Model answer registry (metadata, not the essays themselves, which live in `src/data/models-real/`, see below). |
| `writing.ts` | 474 | Lesson-part titles and blurbs. |
| `speaking.ts` | 167 | Lesson-part titles and blurbs. |
| `writing-prompts.ts` | 93 | Small prompt set. |

Total: about 161,000 words across these 20 files. Most of this is teaching prose and practice content, not just labels; `lessons.ts`, `reading.ts`, `listening.ts`, `writing.ts`, `speaking.ts` are the small, high-value "titles and blurbs that drive navigation" files (roughly 2,900 words combined); the rest is course content proper.

`src/lib/course.ts` (1,390 words): builds `COURSE_UNITS`, the eight-unit course structure, from the registries above. Its own literal content is the eight unit names and blurbs (for example: "Understand the Speaking test, then answer Part 1 questions about familiar topics...") plus stage labels. Small and high-value: this text appears on the main course/dashboard views.

`src/lib/tests/question-types.ts` (282 words): the `QUESTION_TYPE_LABEL` map, twelve short labels such as "Matching Headings", "True / False / Not Given", "Sentence Completion". These are exam terminology and need a Russian-speaking IELTS teacher's sign-off, not a generic translation (see section 3).

### Lesson bodies

`src/content/lesson-bodies/*.html`: **54 files, 456 KB total, about 40,355 words**. These are pre-rendered HTML fragments (the scraper's output, restyled by `src/styles/lesson.css`, injected via marker classes like `.section`, `.card`, `.exercise-box`). Inspecting a sample (`listening-part1.html`) shows the pattern that holds across the set: teaching prose in English ("Most common question types here...", "Why People Still Lose Marks Here") interleaved, often in the same `<li>` or paragraph, with English example sentences and exercise text ("fourteen (14) sounds like 'forTEEN'; forty (40) sounds like 'FORty'"). This is the largest single grey area in the whole inventory (see section 3): the teaching explanation is what a Russian-speaking learner would benefit from in Russian, but it is not cleanly separable from the English language examples it is explaining.

### Blog

`src/content/blog/` currently holds only a `.gitkeep`, no posts. The blog content-automation tool (`tools/blog_agent.py`, driven by `workflows/generate_blog_post.md`) generates posts on a schedule via GitHub Actions but none exist in this checkout yet. Zero current translation burden; future posts would need a per-post decision (marketing content is arguably fine machine-translated, unlike exam material).

### Practice material

`src/data/tests/`: **71 files** (1 index + 30 `listening-full-*.ts` + 40 `reading-full-*.ts`), **452,069 words total**. Each file holds a full test: passages/transcripts, questions, correct answers, and per-question `"explanation"` fields written in English (e.g. "The passage names Russian, British, US and Danish researchers... but never states that Russia coordinates the overall exploration effort."). The explanations are the one part of this enormous file set that is a genuine, defensible translation candidate; the passages, transcripts and questions themselves must stay in English (section 3).

Speaking and writing practice material lives in the top-level `src/data/*.ts` files already counted above (`speaking-prompts.ts`, `cue-cards.ts`, `writing-prompts.ts`, `writing-prompts-imported.ts`), plus:
- `src/data/model-answers.ts` (484 words, metadata/registry only)
- `src/data/models-real/`: model essay text itself. (Not separately counted above; folder exists alongside `model-answers.ts` and holds the actual model answer bodies students read as writing exemplars.)

### Text produced in code (the tutor and deterministic layers)

`src/lib/tutor/*.ts` (11 files, ~13,700 words total): this is where English string templates with embedded logic live, not static prose.
- `prompt.ts` (2,119 words): Mr EZ's system prompt/persona. Line 48 already says "Adapt to the student. If their message is simple English, answer in simple English" -- the prompt currently assumes an English-speaking student throughout.
- `insights.ts` (2,415 words) and `recommend.ts` (1,009 words): the deterministic fact-and-recommendation layer. Confirmed by direct inspection: these build sentences with JS template literals that interpolate counted nouns and manual singular/plural branching already, e.g. `` `${t.correct} of ${t.total} correct across ${t.sittings} ${t.sittings === 1 ? 'sitting' : 'sittings'}` `` in `insights.ts`, and similar ternaries in `week.ts` and `schedule.ts`. This existing pattern (hand-written English plural branch per string) is exactly what breaks for Russian, which needs three plural forms, not two (see section 5).
- `local.ts` (383 words), `catalog.ts` (994 words), `schema.ts`, `client.ts`, `conversation.ts`, `avatar.ts`, `assessment.ts`, `week.ts`: supporting fallback sentences, the activity catalogue (titles/labels for recommendations), and browser-only helpers.

`src/lib/plan/*.ts` (4 files, ~3,550 words) and `src/lib/level.ts` (1,405 words): study-plan scheduling and level-estimate logic with similar English sentence-building.

Error and status messages scattered through `src/lib/**`: not separately inventoried file-by-file here, but the pattern in `AuthModal.tsx` and `ResetPassword.tsx` (below) is representative: short, hand-written English strings attached to specific failure conditions, not centralised.

### The four Cloudflare Workers

| Worker | Student-visible output |
|---|---|
| `workers/grade-essay` | Yes. Per-criterion `comment` fields (1-3 sentences of feedback, addressed to "you") are shown directly to the student, generated fresh by the model on every grading call. The prompt (`workers/grade-essay/src/index.ts` lines 59, 138-159) explicitly quotes the official public IELTS Writing Band Descriptors verbatim as grading input; this text is never itself shown back to the student verbatim as far as the response schema goes, but it does anchor the model's English-language feedback. |
| `workers/grade-speaking` | Yes, same shape: per-criterion feedback comments generated live. |
| `workers/live-examiner` | Indirectly: it brokers a live voice conversation; the model's spoken turns are the "output" and are generated live, not stored strings. |
| `workers/mr-ez` | Yes: every chat reply is generated live from `prompt.ts`'s persona. |

None of the four Workers have a static, translatable string table of their own; all of their user-facing text is model-generated at request time from an English-language system prompt. Translating them is a prompt-engineering change (section 5), not a string-extraction job.

### Supabase-driven auth screens

`src/components/AuthModal.tsx`: contains the sign-in/sign-up/forgot-password/magic-link copy directly as JSX/object literals, e.g. `forgot: { title: 'Reset your password', subtitle: "We'll email you a link to set a new one.", cta: 'Send reset link' }`. `src/components/ResetPassword.tsx`: has one user-facing validation string, `"Passwords don't match."`. Both are small (a few dozen short strings combined) but high-value, since every student hits them, and the actual account-recovery emails are sent by Supabase's own templates, which live in the Supabase project dashboard, not in this repository, and are out of scope for a code change (a separate, non-technical task: the owner or whoever administers Supabase would set the Russian email template there).

## 3. What must stay in English, and what is worth translating

### Must stay in English (with reasons)

- **Reading passages and questions** (`src/data/tests/reading-full-*.ts`, `src/data/reading-practice.ts`): the exam itself is in English. Translating the passage would make the practice worthless; a student who can read the Russian version has not practised the skill being tested.
- **Listening transcripts and audio** (`src/data/tests/listening-full-*.ts`, `src/data/listening-practice.ts`): same reasoning, and the transcripts are explicitly marked as machine-generated and secondary to the audio ("Automatic transcript... the answer key is authoritative"), so they are a study aid for an English listening skill, not prose to localise.
- **Essay prompts and Task 1/2 questions** (`writing-prompts.ts`, `writing-prompts-imported.ts`, `writing-plans.ts` prompt fields): the student must read and respond to the actual exam-format prompt in English.
- **Speaking prompts and cue cards** (`speaking-prompts.ts`, `cue-cards.ts`): same; the exam asks these questions in English.
- **Model answers** (`src/data/models-real/`, `model-answers.ts`): these are exemplars of English writing at a target band; translating them defeats their purpose.
- **Vocabulary items being taught** (`words.ts`, `vocabulary.ts` headwords): the English word is the thing being learned. (Definitions/example glosses are a grey area, below.)
- **English example sentences embedded in lessons**: e.g. "fourteen (14) sounds like 'forTEEN'" -- these are the object of study, not an explanation about it.
- **Official IELTS band descriptors quoted verbatim** (`workers/grade-essay/src/index.ts`, and the descriptor text surfaced in `band-guides.ts` if it quotes the same source): the repo's own comments say these are quoted verbatim from the official public source; paraphrasing or translating them risks misrepresenting the actual marking criteria a real examiner uses, and the workers rely on the exact wording for grading consistency.

### Genuinely useful to translate

- **Interface chrome**: nav labels, buttons, empty states, tooltips, account/auth screens, dashboard headings (`src/lib/platform-nav.ts`, most of `src/components/*.tsx`/`*.astro`, `AuthModal.tsx`, `ResetPassword.tsx`). This is pure navigation and instruction, no exam content risk.
- **Course and lesson titles/blurbs** (`lessons.ts`, `reading.ts`, `listening.ts`, `writing.ts`, `speaking.ts`, `course.ts`'s `COURSE_UNITS`): these tell the student what a lesson is about before they open it; translating them lowers the barrier to choosing what to study without touching exam content.
- **Technique explanations, as prose, separated from the English examples they analyse**: the "Strategy" and "Why People Still Lose Marks Here" sections in lesson bodies, the strategy files (`reading-strategies.ts`, `listening-strategies.ts`, `writing-structures.ts`, `speaking-structure-guides.ts`), and `band-guides.ts`'s explanatory prose (not the descriptor quotes themselves). This is exactly the kind of "how the exam works" content a Russian speaker studying for an English exam most needs in their own language.
- **The AI tutor's own speech** (Mr EZ's chat replies) and the **deterministic insight/recommendation sentences** (`insights.ts`, `recommend.ts`, `local.ts`): these describe the student's own results and next steps; understanding them correctly matters more than practising English while reading them.
- **Grader feedback comments** (`grade-essay`, `grade-speaking` Worker `comment` fields): feedback the student needs to act on. Understanding *why* they lost marks matters more than the feedback being an extra dose of English reading practice.
- **Answer explanations in `src/data/tests/*.ts`**: same reasoning as grader feedback, one level down, this is a grey area (below) but leans toward "translate."

### Grey areas (owner decision needed)

1. **Answer explanations in `src/data/tests/*.ts`** (the `"explanation"` field on every question, all 70 test files). Leaning to translate: explaining *why* an answer is right or wrong is exam technique, not exam content, and a wrong reading of the explanation defeats its purpose more than a wrong reading of the question would. Cost: these are deeply nested inside large files that also hold English content that must not be translated, so this needs field-level, not file-level, translation, and 70 files is real volume. **Decision needed:** translate these, leave them English, or make them switchable (student toggles per-question)?

2. **Lesson body teaching prose mixed with English examples in the same HTML paragraph** (`src/content/lesson-bodies/*.html`, 54 files). The "-teen vs -ty" example above shows prose and example sitting in one sentence. Cleanly splitting them means rewriting each lesson body's HTML structure, not just adding a parallel string, which is a much bigger job than translating flat text. **Decision needed:** is a partial, sentence-level rewrite of 54 lesson files acceptable effort, or should lesson bodies stay English-only for now (with only their surrounding chrome and the standalone strategy files translated)? This is the single biggest cost driver in this whole plan and the recommendation in section 6 is to defer it.

3. **AI-generated feedback from the graders** (`grade-essay`, `grade-speaking`). Leaning to translate (student benefit), but every model call becomes bilingual-aware, which the calibration docs (`docs/GRADING-OPENAI-RESULT.md`, `docs/SPEAKING-GRADING-CALIBRATION.md`) show was tuned carefully against specific model behaviour in English. **Decision needed:** is a re-calibration pass (small, real cost in paid API calls) acceptable to confirm Russian feedback is still accurate and well-calibrated, not just fluent?

4. **Vocabulary item glosses/definitions** (`words.ts`, `vocabulary.ts`): the headword must stay English, but is the definition shown in English (so the student also practises reading an English definition) or in Russian (faster comprehension, more like a bilingual dictionary)? **Decision needed:** which one; this is a product-feel choice, not a technical one.

5. **Band descriptor explanatory prose in `band-guides.ts`**, if and where it paraphrases rather than quotes the official descriptors: needs a line-by-line check (not done as part of this audit) to separate verbatim-quoted material (must stay English, or need an official Russian IELTS descriptor translation, which exists publicly and could be sourced rather than machine-translated) from original explanatory prose (safe to translate normally).

## 4. Technical approach options

### Option A: Astro i18n routing with a `/ru/` prefix

Astro 5's built-in i18n (`i18n: { locales: ['en','ru'], defaultLocale: 'en', routing: {...} }`) generates a parallel page tree under `/ru/...`.

What changes: every one of the 46 `src/pages/**/*.astro` files needs a Russian counterpart or a shared template driven by the detected locale; `astro.config.mjs`'s `build.format: 'file'` (chosen specifically to keep old GitHub Pages URLs like `lessons/reading-task1.html` resolving) and the hand-written `redirects` block (whose targets are written with the literal `/ielts-website` prefix, because "Astro's static redirect targets are emitted verbatim, not run back through `base`", per the comment in `astro.config.mjs` itself) both need every target re-checked for a second locale prefix layered on top of the existing base path, e.g. `/ielts-website/ru/dashboard`. That comment is a direct warning that this exact class of bug (a redirect or link that silently skips the prefix) has already bitten this project once, before locales even existed.

What breaks or gets harder: the page count roughly doubles from ~519 to ~1,000+ built files, GitHub Pages sitemap/robots need regenerating for both trees, and every internal `withBase()` call (`src/lib/url.ts`) needs a matching `withLocale()` layered on top, in every one of the dozens of files that call it. `tests/platform-nav.test.ts` and the reading/listening catalog tests would need locale-aware duplicates or parametrisation. This is the option best suited to genuinely different content per locale and to SEO (a `/ru/` page is a real, crawlable, linkable URL) but the site is described in its own `PRODUCT.md` as "a calm workspace for doing the work," almost entirely a signed-in student workspace behind `/dashboard`, not a marketing site competing for Russian-language search traffic. The SEO upside this option is built for barely applies here.

### Option B: client-side language toggle (recommended)

One set of URLs (no route duplication), a dictionary object per locale, the student's choice stored in `localStorage` (mirroring the existing pattern in `src/lib/progress.ts`, which already keys everything under a versioned `ielts.progress.v1` key, so a `ielts.locale.v1` key sitting next to it is a natural, low-risk addition) and, once accounts exist meaningfully, synced via the same Supabase sync path used for progress (`src/lib/auth/sync.ts`). React islands read a shared `t()` helper from context; Astro templates call the same helper at render time server-side (Astro components run at build time for static output, so they can read a request-time or default locale and render the matching string directly, no client swap needed for server-rendered text) and only client components need special handling for a runtime switch.

What changes: a new `src/lib/i18n/` module (dictionary loader, `t()` helper, locale detection/storage), one dictionary file per locale per translated area (mirroring the file boundaries in section 2, so the dictionary chunks stay reviewable per-area), and every touched component/page swapping a literal string for a `t('key')` call. `src/layouts/BaseLayout.astro`'s `<html lang="en">` becomes `<html lang={locale}>`, driven by the same stored choice, which also fixes a real, separate problem (a hard-coded `lang="en"` is already wrong for accessibility/screen readers today, independent of any Russian work).

What breaks or gets harder: the flash of English before hydration is real for React islands that read `localStorage` client-side (a signed-out student on a fresh tab sees English for one paint before the stored locale applies); it is avoidable for anything rendered by Astro itself, since Astro can read a cookie or Accept-Language-derived default at request/build time and never show English if the choice is already known, but GitHub Pages serves a fully static site with no request-time logic, so the very first visit before any preference is stored has to pick a default (English, honestly, or detect the browser's `navigator.language` client-side and accept a one-frame flash, which is the standard trade-off for this exact hosting setup). SEO is a non-issue by the reasoning in Option A. `transition:persist` islands (`ClientRouter`/view-transition usage is present in `src/components/tutor/MrEzPanel.tsx`, `src/components/WorkspaceHeader.astro`, `src/layouts/BaseLayout.astro`, `src/styles/global.css`, `src/styles/platform.css`) need the locale to survive a persisted island's identity across a transition, which it does automatically if locale lives in a shared module/context rather than component-local state, so this is a "get the architecture right once" risk, not a per-page risk. Progress keys (`ielts.progress.v1` and friends) are completely unaffected, since locale is a new, separate key, never touched.

Effort is materially lower than Option A because it touches string literals in place rather than duplicating the page tree, and risk to the live site is lower because there is no new route surface to misconfigure against the existing base-path and redirect fragility already on record.

### Option C: hybrid (not recommended as the starting point)

A hybrid where marketing/SEO-relevant pages (there are effectively none live right now, since `/` redirects straight to `/dashboard` per `astro.config.mjs`) use Option A's routing and the student workspace uses Option B, is the "best of both" answer in the abstract, but building two i18n mechanisms in one codebase is more code than either option alone for a site that is currently 100% workspace and 0% public marketing. Worth revisiting only if the owner later publishes a public marketing homepage that needs to rank in Russian-language search, at which point that one surface can adopt Option A locally without disturbing the workspace's Option B.

### Recommendation

Option B. It fits a signed-in workspace, costs less, risks less against the specific fragilities already documented in this repo's own `astro.config.mjs` comments, and does not require re-deriving the page tree for every future content change.

### Making a third language (Kazakh) cheap later

Design the dictionary loader in Option B as `Record<string, Record<localeCode, string>>` keyed by string id, not as one file per locale hardwired into the loader's code. Adding Kazakh becomes: add a `kk` column to each dictionary object (or a third file if dictionaries are split by locale rather than by key), add `'kk'` to a `SUPPORTED_LOCALES` list, and add it to the account-settings/toggle UI. No component changes, no new route surface, no schema change. The one part of this plan genuinely locale-count-sensitive is the plural-forms handling in section 5 (`Intl.PluralRules` already generalises across locale count for free) and the lesson-body HTML rewrite in grey area 2, which would need a third pass whenever it happens, regardless of how many languages came before it.

## 5. How the AI pieces should behave

**Mr EZ's persona** (`src/lib/tutor/prompt.ts`): the smallest correct change is not "translate the prompt," it is adding one instruction, near the existing line 48 ("Adapt to the student. If their message is simple English, answer in simple English"), telling the model to reply in the student's interface language by default and to mirror the language the student writes in if they write in Russian regardless of the interface setting (a student may keep the interface in English but type a question in Russian, and the natural, least-surprising behaviour is to answer in Russian to that specific message). This is a prompt edit, not a code restructure, and should ship with a recalibration pass against `tools/mr-ez-live-check.mjs`'s sixteen scenarios, run once in Russian, at the roughly $0.0005/message cost already documented in `CLAUDE.md`, to confirm tone and recommendation-id resolution still work (the model choosing wording is fine to vary by language; the deterministic recommendation ids it must resolve, per `docs/`'s own description of the "no hallucinated links" rule, are not language-dependent and should not be affected, but that is a claim worth verifying once rather than assuming).

**Deterministic fallback sentences** (`insights.ts`, `recommend.ts`, `local.ts`): these currently hand-roll English singular/plural with inline ternaries, e.g. `` `${t.sittings} ${t.sittings === 1 ? 'sitting' : 'sittings'}` ``. Russian needs three plural cases (1 урок, 2-4 урока, 5+ уроков, plus edge cases for numbers ending in 1 but not 11, etc.), which a hand-written ternary cannot express correctly. The correct fix is `Intl.PluralRules('ru').select(n)`, which returns `'one' | 'few' | 'many' | 'other'` for Russian and feeds a small per-string lookup table (e.g. `{ one: 'урок', few: 'урока', many: 'уроков' }`), wrapped in a tiny shared helper (`pluralize(n, locale, forms)`) used everywhere a count is interpolated, in both `insights.ts`/`recommend.ts`/`local.ts` and the similar counting logic already present in `week.ts` and `plan/schedule.ts`. This is a self-contained, mechanical change once the helper exists; the number of call sites to update (rough count from the template-literal search done for section 2) is in the dozens, not hundreds.

**Grader feedback** (`grade-essay`, `grade-speaking`): the model already writes free-form feedback sentences from a prompt; the same "reply in the student's language" instruction added to Mr EZ's prompt applies here, added near the existing "Address the writer as 'you'" instruction (`workers/grade-essay/src/index.ts` line 378). Because these two Workers are calibrated against real IELTS examiner sample scripts in English (`docs/GRADING-OPENAI-RESULT.md`, `docs/SPEAKING-GRADING-CALIBRATION.md`), the band the model assigns should not change (it is still judging English writing/speech against English descriptors), only the language of the `comment` field explaining that band. This needs its own small calibration check for the same reason as Mr EZ: confirm Russian feedback describes the same band correctly, not just fluently, before trusting it live.

## 6. Phased delivery plan

Every phase keeps the current English site fully working throughout (Option B never removes an English string, it adds a Russian one behind a toggle), so there is no phase where the live site is broken for existing students.

**Phase 0 -- Foundation (no visible change).** Build the `src/lib/i18n/` module (locale storage key, `t()` helper, `Intl.PluralRules` wrapper), fix `BaseLayout.astro`'s hard-coded `lang="en"` to read the stored locale, and add the locale toggle to `AuthModal.tsx`/account settings. Files touched: roughly 4-6. Strings: none translated yet, this phase is infrastructure. Verification: a test asserting every dictionary key that will exist in English also exists in Russian once phase 1 lands (write the test now, it stays red until phase 1, which is fine and catches missing keys immediately), plus a manual check that `<html lang>` actually flips.

**Phase 1 -- Interface chrome.** Translate `src/lib/platform-nav.ts`, the ~58 top-level components, `AuthModal.tsx`, `ResetPassword.tsx`, and the 46 page files' page-level copy. This is the highest-value, lowest-risk phase: every student sees it immediately, and none of it touches exam content, so it can go entirely to an AI model in bulk with a light human read-through (a Russian speaker skimming for tone, not an IELTS teacher checking terminology). Estimated volume: a few thousand short strings, on the order of the 8,578 (page files) + a comparable chrome count from the 13,520-line component set, so call it 2,000-4,000 distinct strings once code syntax is excluded. Verification: the missing-key test from phase 0 now runs for real; add a visual pass at 768px and 375px widths specifically checking for overflow, since Russian runs roughly 15-30% longer than English and the capsule nav / phone dock are already tight, per `DESIGN.md`'s spacing description.

**Phase 2 -- Course and lesson metadata.** Translate `lessons.ts`, `reading.ts`, `listening.ts`, `writing.ts`, `speaking.ts` (titles/blurbs, ~2,900 words combined) and `course.ts`'s `COURSE_UNITS` (eight unit names/blurbs). Still AI-bulk-translatable with a light review, still zero exam-content risk, this is what a student reads to decide what to study next. Verification: same missing-key test, plus a manual read of all eight unit blurbs by the owner or a Russian-speaking teacher, since this is the first phase where exam terminology ("Matching Headings," "paraphrase") starts appearing and needs to match what Russian-speaking IELTS teachers actually call these things (this is the one place in this phase that is not purely mechanical).

**Phase 3 -- Technique explanations (the standalone strategy/structure files).** Translate `reading-strategies.ts`, `listening-strategies.ts`, `writing-structures.ts`, `speaking-structure-guides.ts`, `band-guides.ts`'s explanatory prose (excluding verbatim descriptor quotes, per grey area 5), and `src/lib/tests/question-types.ts`'s twelve labels. This is the first phase requiring a human Russian-speaking IELTS teacher's review before publishing, not just a skim, because exam terminology here is load-bearing (a mistranslated question-type name actively confuses a student mid-test). Estimate: roughly 6,000-7,000 words across these files. Verification: missing-key test, terminology sign-off checklist against the twelve `QUESTION_TYPE_LABEL` entries specifically (these appear in the tutor's recommendations too, so a mismatch here would surface confusingly in Phase 5).

**Phase 4 -- Answer explanations in practice tests.** Resolves grey area 1: translate the `"explanation"` field only, across all 70 files in `src/data/tests/`, leaving passages/transcripts/questions untouched. This needs per-field extraction tooling (a small script, not manual editing of 70 files) and is large: 70 files' worth of explanation fields, likely several thousand words once isolated from the ~452,000-word files they live in. AI-bulk-translatable for a first pass, but needs teacher review given the exam-technique reasoning embedded in explanations. Verification: an automated check that the script touched only `"explanation"` fields and left every other field byte-identical (a diff-based test, not just a visual check, given the size and risk of the source files), run before this phase is considered mergeable.

**Phase 5 -- The AI tutor and graders.** Ship the prompt changes from section 5 (Mr EZ language-mirroring instruction, grader feedback language instruction, `Intl.PluralRules`-based rewrite of the hand-rolled plurals in `insights.ts`/`recommend.ts`/`local.ts`/`week.ts`/`plan/schedule.ts`). This is code, not bulk string translation, done by an engineer, with the recalibration checks described in section 5 (`tools/mr-ez-live-check.mjs` in Russian, a small paid-API run; a similar spot-check against grader sample essays in Russian). Verification: the sixteen Mr EZ calibration scenarios re-run in Russian with results logged the same way `docs/MR-EZ-CALIBRATION.md` already does; a handful of grader test essays re-graded to confirm bands match their English-graded bands.

**Phase 6 (deferred, not scheduled) -- Lesson body prose.** Grey area 2: the 54 `lesson-bodies/*.html` files, ~40,000 words, teaching prose interleaved with English examples in the same paragraphs. This needs an HTML-structure rewrite (splitting explanation from example) before it can be a clean translation job at all, which is a materially bigger and slower undertaking than every phase above combined, and it competes least well against interface/technique/tutor work for value per hour. Recommend explicitly deferring this until phases 1-5 are live and the owner has real usage signal on whether students who prefer Russian are actually reaching the lesson pages, versus stopping at the dashboard/tests/tutor surfaces already translated.

## 7. Open questions for the owner

1. **Should the practice test answer explanations (the notes that say why an answer is right or wrong, in all 70 practice tests) be translated into Russian, or stay in English?** My recommendation: translate them. Understanding why an answer is correct matters more than getting extra English reading practice from the explanation itself.

2. **Should the AI tutor and the essay/speaking feedback reply in Russian automatically, or only when the student asks in Russian?** My recommendation: automatically, matching whichever language the student has the interface set to, but always matching Russian back if the student types a question in Russian regardless of the interface setting.

3. **In the vocabulary and word-of-the-day features, should the word's definition be shown in English (so students also practise reading an English definition) or in Russian (faster to understand)?** My recommendation: Russian for the definition, keeping the English word itself as the thing being learned, similar to a bilingual dictionary.

4. **The lesson pages themselves (the long teaching pages with strategy explanations and examples) are the single biggest and slowest part of this whole project to translate properly, because the explanation and the English example are often written in the same sentence.** My recommendation: do this last, after everything else is live, and revisit once we can see whether Russian-preferring students are actually spending time on lesson pages or mostly using the dashboard, tests and AI tutor, which would tell us if this large effort is worth it yet.

5. **Do you want a native Russian-speaking IELTS teacher to review the exam-technique wording (the names of question types, the explanations of strategy) before it goes live, or is an AI-quality first pass acceptable to start with and refine later?** My recommendation: get a teacher's review before publishing anything a student would use to prepare for the actual exam (this is Phase 3 and Phase 4 above); everyday interface text (buttons, menus) does not need this level of review.

6. **Is a Kazakh version something to plan for now, or purely hypothetical?** My recommendation: no extra work is needed now either way, because the technical approach recommended here (a dictionary keyed by string id, not hardwired per language) already makes adding Kazakh later a small, contained job rather than a rebuild; this only becomes a live decision when and if you want to actually add it.
