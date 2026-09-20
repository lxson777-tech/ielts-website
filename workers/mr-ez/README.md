# Mr EZ — the tutor Worker

Backs the personal AI tutor: the dashboard welcome, the conversation panel,
"explain this result", the weekly review, the two course-unit notes, and going
through a set of wrong answers. Holds the OpenAI key, verifies the student,
reads their own record, enforces the spending limits, and keeps the accounts.

**Read this before changing anything here. Deploying this Worker is a real,
billable, externally-visible action and needs Alex's say-so first.**

---

## The one idea worth understanding

**The browser is not a source of truth.** A request says which task, what the
student typed, which conversation it belongs to, and a few *references* (a
lesson key, a test id, a unit id, a question id, the timestamp of an attempt).
It does not carry the student's bands, goals, weaknesses or history, and if it
did, none of it would be read.

The two review tasks are where that is hardest to hold, so it is worth saying
plainly. A debrief says "this paper, these question ids, and here is what I
put". The **question content** — the prompt, the accepted answer, the official
explanation, the evidence — is fetched here from the site's own published JSON
(`SITE_DATA_URL`) and validated before it is used. The only words the client
supplies are the student's own answers, and those arrive as quoted data inside
a fenced block like every other piece of student text.

Everything about the student is fetched here, from Supabase, against the user id
proved by their access token. There is no code path in which the caller names
whose data to load. That is the whole ownership model, and it is what makes
"student A cannot see student B" a property of the architecture rather than of
remembering to filter.

The same idea covers the model: it has no tools, cannot reach another student's
row, and **cannot produce a link**. Recommendations come back as catalogue ids
which are resolved here; an id that is not in the catalogue is dropped. A model
that hallucinates a URL produces no recommendation at all, not a 404.

---

## Endpoints

| Method | Path | Auth | What it does |
|---|---|---|---|
| `GET` | `/` | none | Config probe: model, daily allowance, whether it is configured. Never returns a key. |
| `POST` | `/` | Bearer | One tutor turn. The body's `task` picks which job. |
| `OPTIONS` | `/` | none | CORS preflight. |

Seven tasks, all through the one endpoint, sharing auth, limits, usage
accounting and context building:

| `task` | What it is | Extra fields | Recommendation |
|---|---|---|---|
| `chat` | A conversation turn | `message` (required), `conversationId`, `place` | The model may choose one; an id outside the catalogue is dropped |
| `welcome` | The dashboard greeting | none | Chosen in code |
| `explain` | One marked result | `attempt` (required) | Chosen in code, from the result |
| `weekly` | Last week, reviewed | `tzOffsetMinutes` | Chosen in code, `recommendNext` |
| `unit` | A course unit's intro or wrap | `unit` (required) | **Always null** |
| `debrief` | A set of wrong answers | `review` (required, 1 to 40 items) | Chosen in code, from the worst question type |
| `item` | One wrong answer | `review` (required, exactly 1 item) | Chosen in code, from that item's type |

The last four are **one-shot**: no conversation row, no history, nothing
appended. They are notes about something that happened, not a dialogue.

`tzOffsetMinutes` is the student's clock in minutes east of UTC (Almaty sends
300). It only affects where a Monday-to-Sunday week is cut. A value that is not
a whole number inside -840 to 840 is dropped and treated as 0 rather than
refused: the worst it can do is move a week boundary by a few hours.

The request and reply shapes live in `src/lib/tutor/schema.ts`, imported by
**both** this Worker and the browser client, the same way the live examiner
shares `src/lib/speaking/live/instructions.ts`. They cannot drift.

---

## What refuses a request, and why

| Situation | Response | Reasoning |
|---|---|---|
| No or invalid token | `401 sign-in-required` | Per-student spending cannot be limited without knowing the student. |
| Missing `OPENAI_API_KEY`, `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` | `503 not-configured` | Fail closed. A missing security check is never a reason to proceed. |
| A limits or ownership query fails | `503 unavailable` | Fail closed. Falling open here would let a Supabase outage uncap spending. |
| Origin not in the allow list | `400` | A bar-raiser, not authentication: the header is forgeable. |
| Message over 2,000 characters, or body over 32 KB | `413 too-long` | Checked before anything billable runs. |
| Daily per-student cap reached | `429 limit-reached` | Counted in `mr_ez_turns`, shared across every Worker instance. |
| Whole-site daily cap reached | `429 site-limit-reached` | The backstop against a single bad day. |
| Conversation or attempt not the caller's | `404 not-found` | "Not yours" and "does not exist" are the same answer, which leaks nothing. |
| `weekly` with no completed week, or an empty one | `400 bad-request` | The browser shows deterministic text for those and should never have asked. |
| `unit` before the student has set a target band | `400 bad-request` | Mr EZ must not say what a unit is worth to someone who has not said what they are aiming at. |
| `unit` intro with nothing in the record pointing at it | `400 bad-request` | Nothing to say beats filler. |
| `unit` wrap on an unfinished unit | `400 bad-request` | Congratulating someone for what they have not done. |
| `review.testId` that is not a published paper | `400 bad-request` | Refused **before** any fetch, so the id never reaches a URL. |
| None of the question ids are in that paper | `404 not-found` | Nothing to explain means nothing to pay for. |
| The published test JSON is missing, unreadable, invalid, or about another paper | `503 unavailable` | Explaining the wrong paper's questions is worse than explaining none. |
| OpenAI rate-limits us | `429 busy` with `retryAfter` | Worth retrying; the UI offers a button. |
| OpenAI unreachable, or rejects our key | `503 unavailable` | An upstream key problem is never reported to a student as their problem. |

The **auth check is the one deliberate asymmetry**: every failure in
`verifyUser` is treated as "not signed in" (401) rather than 503, because an
auth check that failed open would be far worse than a false "please sign in".

---

## Not paying twice

Three separate guards, all cheaper than a model call:

1. **Idempotency.** Every request carries a key generated once per user action.
   A repeat (double-click, retry after a timeout) replays the stored reply.
   Enforced by a unique index, not application logic, so two racing requests
   cannot both win. The stored reply expires after ten minutes
   (`IDEMPOTENCY_WINDOW_MS`) and is blanked entirely when a student clears
   their history.
2. **Welcome caching.** The dashboard welcome is stored against a fingerprint
   of everything it depends on (`insightsFingerprint` in
   `src/lib/tutor/insights.ts`). Reopening the dashboard is free until the
   student actually does something that changes the advice.
2b. **Note caching.** The weekly review and the two unit notes work the same
   way, one level up, in `mr_ez_notes`: keyed by (student, kind, week or unit)
   and stored against `weekFingerprint` / `unitFingerprint`. Re-opening the
   page is free, and the moment the facts move the old note is **replaced**
   rather than kept beside the new one, because a superseded review is not
   history, it is a stale claim about the student. The lookup sits above the
   limits check, so a cache hit does not burn a turn.
3. **Conversation summarisation.** Past sixteen messages the older half is
   folded into a rolling précis, so a long conversation costs roughly a
   constant amount per turn instead of more every time.

None of these run after the limits check, so a capped student cannot spend
anything at all.

---

## Configuration

Everything in `wrangler.jsonc` under `vars`, with two secrets:

```sh
cd workers/mr-ez
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler deploy          # confirm with Alex first
```

`.dev.vars` (gitignored) holds the same two names for `wrangler dev`.

| Var | Default | Notes |
|---|---|---|
| `TUTOR_MODEL` | `gpt-5.6-luna` | Verified 2026-09-19: Responses API, strict structured outputs, prompt caching, reasoning effort, 1.05M context, 128K max output. **Deliberately not a grading model.** |
| `TUTOR_REASONING_EFFORT` | `low` | Tutoring is explanation, not assessment. |
| `TUTOR_MAX_OUTPUT_TOKENS` | `700` | A hard ceiling on a reply; also a personality setting. |
| `TUTOR_MAX_TURNS_PER_USER_PER_DAY` | `40` | |
| `TUTOR_MAX_SITE_PER_DAY` | `600` | |
| `TUTOR_INPUT_USD_PER_M` | `0.20` | What the recorded cost column is computed from. |
| `TUTOR_CACHED_INPUT_USD_PER_M` | `0.02` | |
| `TUTOR_OUTPUT_USD_PER_M` | `1.20` | |
| `TUTOR_SIMULATE` | `off` | `on` skips OpenAI and returns a clearly-labelled simulation through the full real pipeline. Local development only. |
| `SITE_DATA_URL` | the deployed site's `/data/tests` | Where each practice paper's compact JSON lives (`src/pages/data/tests/[id].json.ts`). The tutor needs every question's prompt, accepted answer, explanation and evidence to walk a student through their wrong answers, and fetches them from here rather than trusting the browser. `src/data/tests` is 3.9 MB, far past a Worker's bundle limit, which is why this is a fetch and not an import. Point it at `http://localhost:4321/ielts-website/data/tests` to work against the Astro dev server. |

**If OpenAI changes its prices, change these three numbers.** Otherwise the
cost column in `mr_ez_turns` quietly becomes fiction, and so does every spending
report built on it.

### The grading models are not ours to touch

This Worker is separate from `grade-essay`, `grade-speaking` and
`live-examiner`. Those run their own calibrated models and **must not be changed
as a side effect of tutoring work**. As of 2026-09-15 they are on
`gpt-5.6-sol` (essay grading and speaking text grading, after a calibration run
found `gpt-5.6-terra` scored a full band low from band 6 upward),
`gpt-4o-transcribe-diarize` for transcription, `gpt-audio-1.5` for
pronunciation and `gpt-live-1` for the voice examiner.

---

## What it costs

**Measured, not estimated.** A live calibration run on 2026-09-19 against the
real API cost **$0.008 for sixteen calls**. Full write-up in
`docs/MR-EZ-CALIBRATION.md`.

| Task | Input tokens | Output tokens | Cost |
|---|---|---|---|
| Chat turn (typical) | 1,650 to 1,700 | 86 to 202 | **$0.00044 to $0.00057** |
| Dashboard welcome | 1,369 to 1,729 | 89 to 130 | $0.00038 to $0.00050 |
| Explain a result | 1,944 | 200 | $0.00063 |

Latency 1.4 to 2.6 seconds.

At **$0.0005 per turn**, a student spending their entire 40-turn daily
allowance every day of a month costs about **$0.61**. A realistic five
questions a day is about **$0.08 a month**. The $1 per active student per month
planning allowance holds comfortably.

**Prompt caching does not fire, and chasing it is not worth it.** The persona
plus task rules are byte-identical across students but only ~800 tokens, and
OpenAI's caching has a 1,024-token minimum on the shared prefix. Measured
`cached_tokens` was 0 on every call with a different student context; only an
identical repeat of a whole prompt hit the cache. Padding the block past the
threshold would be adding tokens to save tokens, on the cheaper half of a turn.
Recorded so nobody assumes a discount that is not arriving.

These figures are the model cost only, and they assume OpenAI's published
prices. Those live in `wrangler.jsonc`, so a price change is a redeploy rather
than a code change. **If they are wrong, the cost column in `mr_ez_turns`
becomes fiction, and so does every spending report built on it.** The number to
trust once real students exist is that column:

```sql
select date_trunc('day', created_at) as day,
       count(*) as turns,
       round(sum(cost_usd), 4) as usd,
       count(distinct user_id) as students
from mr_ez_turns
group by 1 order by 1 desc;
```

## Calibrating it

```bash
node --import ./tests/ts-extension-loader.mjs tools/mr-ez-live-check.mjs
```

Runs this Worker's real handler against the real API with Supabase stubbed:
twenty-one scenarios covering the persona, the evidence thresholds, prompt
injection, exam conditions, the refusal to promise a band, and the four
one-shot tasks. **It spends real money**, guarded at $0.50 per run inside the
script. The key is read out of the Workers' gitignored `.dev.vars` by the
script and never printed.

The two review scenarios need real question content, and the script serves it
to the handler from this process: it imports the real test bank (which the
Worker itself may not) and answers the `SITE_DATA_URL` fetch with exactly the
bytes the site would publish. No network beyond OpenAI, no second service to
keep running.

Re-run it whenever the persona, the task rules, the evidence thresholds or the
model change. The `tentative`, `promise`, `injection`, `exam` and
`debrief-injection` scenarios are the five that must never regress.

To talk to the real Mr EZ through the actual interface:

```bash
node --import ./tests/ts-extension-loader.mjs tools/mr-ez-dev-server.mjs --live
```

Same handler, same model, this server's in-memory store instead of Supabase.
About $0.0005 a message. In `--live` mode `SITE_DATA_URL` points at the Astro
dev server, so run `npm run dev` alongside it if you want to exercise the
debrief and item tasks. Without `--live` the same server returns clearly
labelled simulations and cannot spend anything.

## Database

Five tables in `supabase/schema.sql`: `mr_ez_conversations`, `mr_ez_messages`,
`mr_ez_turns`, `mr_ez_recommendations`, `mr_ez_notes`. Writes are Worker-only (service role);
students may read and delete their own conversations directly under row-level
security, so restoring a conversation costs nothing and "clear my history" is an
immediate delete rather than a request they have to trust us to honour.

`mr_ez_turns` is the exception: it is what the daily cap is counted from, so a
student cannot delete or edit it. A **column-scoped grant** lets them blank the
one column that carries conversation content (`reply`) and nothing else.

Assessment records are elsewhere entirely (`user_state.progress`) and are never
touched by any of this. "Clear my history" (`clearTutorMemory` in
`src/lib/tutor/conversation.ts`) removes the conversations, their messages and
summaries, the cached welcome and every note in `mr_ez_notes`, and blanks the
stored reply on the usage rows. Everything that is Mr EZ's words about the
student goes; the student's own record stays.

`tools/apply-mr-ez-schema.mjs` cuts the Mr EZ section out of
`supabase/schema.sql` at run time (from the "Mr EZ, the AI tutor" banner to the
end of the file) and refuses to send anything that names an object outside the
`mr_ez_*` family. `--check` is read-only; `--apply` runs the DDL and needs
Alex's say-so.

---

## Testing

```sh
npm test
```

`tests/mr-ez-worker.test.ts` runs the real handler under plain Node with the
network stubbed (`tests/mr-ez-harness.ts`): auth, ownership, isolation between
two students, fail-closed behaviour, both spending caps, idempotency and its
expiry, input caps, injection containment, upstream failures, and the cost
arithmetic. No Cloudflare runtime, no Supabase project, no key, no money.

`tests/mr-ez-tasks.test.ts` covers the four one-shot tasks against the same
harness: every refusal above, the note cache going stale and one student never
reading another's note, and the thing that most needs pinning down — that a
debrief's question content comes from the fetched JSON and never from the
request, however much question content the request tries to carry.

`tests/tutor-insights.test.ts` covers the deterministic layer: the evidence
thresholds that decide what may be called a pattern, and a filesystem check that
every recommendable link is a page that exists in this repo.

For clicking through the interface without a Supabase project or an API key,
`node tools/mr-ez-dev-server.mjs` stands in for both backends. Everything it
returns is flagged simulated and the interface labels it as such. It is a
convenience, not evidence: never present it as a working live integration.
