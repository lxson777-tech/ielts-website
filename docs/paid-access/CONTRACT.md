# Paid access and the audit remediation: shared contract

Written 29 September 2026 for the remediation of
`docs/audits/combined-paid-platform-2026-09-29/REPORT.md` (findings F01 to F12).
Every builder reads this before touching code. Nothing here is deployed, pushed,
applied to a real database, or connected to a real payment provider.

## The model in one paragraph

There is one gated build (`PUBLIC_ACCESS_MODE=trial`, the name stays). What an
account may open is decided by the server, per account: nothing, the three-day
trial, or **paid access**. Paid access is a set of grants recorded only when the
payments Worker confirms a payment (or refund) with the provider. The browser
never grants access, and the build's access mode is never a subscription. A paid
student opens everything the trial locks, through the same door
(`workers/content-gate`), on any device, because the grant belongs to the
account. When paid access ends, the student keeps every saved result and falls
back to what an ended trial may open.

## Data (new migration `supabase/migrations/2026-09-30-paid-access.sql`)

Local only: proven in PGlite (`tools/trial-db.mjs`), never applied to production
without Alex's yes. Idempotent, touches no existing table's data, commented
rollback at the bottom, same revoke-then-grant discipline as the trial file.

- `access_plans(id text pk, days int, amount int, currency text, enabled bool)`:
  rows `month-1` (30 days, 10000, 'KZT') and `month-3` (90 days, 25000, 'KZT').
  Mirrors `PAID_PLANS` in `src/lib/access/plans.ts`; a test fails if they drift.
- `payment_orders(id uuid pk, user_id, plan_id, amount, currency, provider,
  provider_ref unique null, status, created_at, updated_at, paid_at,
  refunded_at, receipt_number unique null)`. Status is one of
  `created | pending | paid | failed | cancelled | refunded`.
  Only the database functions write it; row security lets a student read their
  own orders and nothing else.
- `access_grants(id uuid pk, user_id, order_id unique, plan_id, starts_at,
  ends_at, revoked_at null)`. One grant per paid order. A new grant starts when
  the account's latest unrevoked grant ends (or now, if that is earlier), so
  buying again while active extends rather than overlaps.

Functions (security definer, `set search_path = public, pg_temp`):

| Function | Caller | Does |
|---|---|---|
| `access_order_create(p_plan text)` | authenticated | Creates a `created` order for `auth.uid()` at the plan's server-side price. Returns `{orderId, planId, amount, currency}`. The browser never names a price or a user. |
| `access_orders()` | authenticated | The caller's orders, newest first, for purchase history and receipts. |
| `access_order_mark_pending(p_order uuid, p_provider text, p_ref text)` | service_role | Checkout opened with the provider. |
| `access_order_paid(p_order uuid, p_provider text, p_ref text, p_amount int, p_currency text)` | service_role | Idempotent. Refuses an amount or currency that differs from the order. Sets `paid`, assigns a receipt number, inserts the grant. A replayed confirmation returns the same result and never a second grant. |
| `access_order_failed(p_order uuid, p_reason text)` | service_role | `failed` or `cancelled`. Never touches a `paid` order. |
| `access_order_refunded(p_order uuid, p_provider_ref text)` | service_role | `refunded`, and revokes that order's grant (`revoked_at = now()`). Later grants are pulled back so there is no gap. |
| `trial_state(p_user)` | existing | Gains a top-level `paid` key: `null`, or `{planId, startsAt, endsAt}` for the unrevoked grants taken together (earliest counting start, latest end). |
| `trial_can_open(p_user, p_item)` | existing | Returns ok first if the account has a running grant, for any `lesson:`, `test:`, `practice:` or `pack:` item. Otherwise the trial rules exactly as today. |

## Shared code

- `src/lib/trial/status.ts` (DONE in the contract commit): `PaidAccess`,
  `TrialStatus.paid`, `hasPaidAccess(status, nowMs)`, `paidAccessEnded(...)`.
  Every screen that decides lesson/test/tutor wording checks `hasPaidAccess`
  first.
- `src/lib/access/plans.ts` (Builder A1 creates): `PAID_PLANS` with id, days,
  amount, currency and the sentences the pricing surfaces use. The sales page,
  `/plans` and the migration all read these numbers from here or are tested
  against it.
- Paid Mr EZ and grading allowance: **decided by Alex on 29 September 2026**:
  unlimited normal study with fair daily limits, i.e. a paid account is treated
  like a student on the open site today: the Workers' existing per-student
  daily limits apply (Mr EZ, live examiner; essay and speaking grading have
  none), and the trial allowance does not.

## Payments Worker (`workers/payments`, new, Builder A1)

- `POST /checkout` with the student's access token and `{planId}`: calls
  `access_order_create` as the student, then the provider adapter's
  `createCheckout(order)`, marks the order pending, returns `{orderId, url}`.
- `POST /webhook/<provider>`: the adapter verifies the provider's signature and
  maps the event to paid / failed / refunded, which call the functions above.
- `GET /order/<id>` with the student's token: the order's status, for the
  return page and interrupted-payment recovery.
- Provider adapters implement one interface (`createCheckout`, `verifyWebhook`).
  Only `simulated` exists. It is refused unless the Worker's
  `PAYMENTS_PROVIDER=simulated` and `PAYMENTS_ALLOW_SIMULATED=local`, and every
  page it produces says SIMULATED. No real provider is implemented until Alex
  chooses one. A simulated payment proves the lifecycle, never an integration.

## Site switches

| Variable | Meaning |
|---|---|
| `PUBLIC_PAYMENTS_URL` | The payments Worker. Unset: purchase stays disabled with "Payment not connected yet" (today's behaviour). |
| `PUBLIC_PAYMENTS_SIMULATED` | `1` only with the local stand-in: the purchase screens show a SIMULATED banner. |

## Paid content in the gated build (Builder A3)

The trial build replaces some modules with empty stand-ins in the browser
(`src/lib/trial/light/`). For a paid account the door serves their real content
as **packs** (`pack:<name>`, JSON written by `tools/build-gated-content.mjs`),
and the page loads the pack before rendering its tool. A signed-out, trial or
ended account never receives a pack, and the leak audit still passes.

## Local stand-in

`tools/mr-ez-dev-server.mjs --trial` gains the new tables and functions (through
`tools/trial-db.mjs`), mounts the real payments Worker at `/payments` with the
simulated adapter, and a simulated provider page at `/__pay/<orderId>` with
Pay, Fail and Cancel buttons, plus `POST /__pay/refund` and `POST
/__pay/expire` (moves a grant's end into the past) for tests. All labelled
SIMULATED.

## File ownership (disjoint; ask the orchestrator before touching another's)

| Builder | Findings | Owns |
|---|---|---|
| A1 server | F01 | the new migration, `tools/trial-db.mjs`, `tools/mr-ez-dev-server.mjs`, `workers/payments/**`, `workers/content-gate/**`, the trial checks in `workers/mr-ez`, `workers/grade-essay`, `workers/grade-speaking`, `workers/live-examiner`, `src/lib/trial/gate.ts`, `src/lib/access/**`, `tests/paid-*.test.ts` |
| A2 purchase UI | F01 | `src/components/trial/TrialPlans.tsx`, new `src/components/access/**`, `src/pages/plans*.astro`, `src/pages/account/receipt.astro`, the access section of `src/components/AccountOverview.tsx` / `AccountSettings.tsx`, `src/lib/trial/client.ts` |
| A3 paid content | F01 | `src/lib/trial/light/**`, `tools/build-gated-content.mjs`, the locked trainer/model-answer/cue-card/band-guide/focused pages' data loading, `src/components/trial/TrialGate.tsx`, `TrialBlock.tsx` |
| B trial honesty | F02, F03, F08 | `src/pages/tests/index.astro`, `src/pages/trainers/index.astro`, `src/lib/trial/offer.ts`, `src/components/trial/TrialHome.tsx`, `TrialJoin.tsx`, score-history copy, trainer "free" wording |
| C Russian | F05, F06 | `src/components/home/**`, `src/marketing/**`, `src/layouts/StoryLayout.astro`, `src/scripts/question-journey.ts`, `src/lib/journey-plan.ts` (strings only), `src/content/lesson-bodies/ru/vocabulary.html`, catalog count rendering, i18n coverage tests |
| D accessibility and layout | F07, F09, F10, F11, F12 | `src/components/TestPlayer.tsx` (score dialog only), `WritingTester.tsx` (label only), `src/styles/mr-ez.css`, `src/styles/lesson.css`, `LessonVocabularySearch.astro`, `src/components/placement/PlacementOffer.tsx`, `TodaySession.tsx` composition |
| E trust | F04 | `src/pages/help.astro`, new `src/pages/privacy.astro`, `terms.astro`, `src/components/WorkspaceFooter.astro`, `src/components/auth/ProfileForm.tsx`, `SignUpForm.tsx`, new `src/lib/operator.ts` |

Hot spots: each builder adds its own Russian batch file
(`src/lib/i18n/dict/ru/<builder>-remediation.ts`) and registers it in
`dict/ru/index.ts` and the `BATCH_FILES` list of `tests/i18n.test.ts`; the
orchestrator resolves those one-line merge conflicts. Nobody edits
`astro.config.mjs` except C (sales-page language) and A3 (packs), and each says
exactly what changed.

## Rules for every builder

- Local only: no push, deploy, wrangler, real Supabase, real accounts, secrets,
  paid AI calls or real payments. Synthetic `@example.test` accounts.
- Never run a recursive delete or mirror command (`rm -rf`, `rmdir /s`,
  `Remove-Item -Recurse`, `robocopy /MIR`, `rsync --delete`, `git clean`). If
  something needs removing, leave it and say so. Never touch `.git`.
- Write only in your own worktree and your own scratch folder. Do not stop
  servers you did not start (4441, 4442, 8841 and 8842 are Alex's review
  servers).
- Never invent operator details, contacts, policies, payment behaviour or paid
  allowances. Where Alex has not decided, build the structure, keep it hidden
  or clearly marked, and report it as blocked.
- Proof is the running app: unit tests, `npx astro check`, both builds, the
  leak audit on the trial build, and your own browser checks at 1440x900 and
  390x844 in English and Russian. Existing journeys (t01 trial, p01 placement,
  i01 goal questions) must still pass.
