# Payments: how money becomes access

Written 29 September 2026 for the audit remediation (finding F01; contract in
`docs/paid-access/CONTRACT.md`). **Not deployed. No real provider.** Alex has not
chosen a payment provider, so the only provider here is a SIMULATED one that runs on
the local stand-in and takes no money.

## What is decided (Alex, 29 September 2026)

- Two plans: one month (30 days, 10,000 KZT) and three months (90 days, 25,000 KZT).
  The prices live in the database (`access_plans`) and in `src/lib/access/plans.ts`,
  and a test fails if they differ.
- A purchase is a fixed period that simply ends. No automatic renewal. Buying again
  while access is running adds the new period after the current one.
- No refund after purchase is offered to students. The refund event is still
  handled, because a provider can issue one (for example by error), and the access it
  paid for must then be taken back.
- Paid AI use is "unlimited, fair daily caps": a paying student gets the Workers'
  existing per-student daily limits (Mr EZ's daily turns and help requests, the live
  examiner's daily and concurrent sessions). The essay and speaking graders have no
  per-student daily limit today, so paid grading has none either.

## The rule that matters

The browser can ask for a checkout and read its own orders. It can never say a
payment happened. Paid access is written only when the provider tells this Worker,
in a webhook whose signature it verifies, and the database
(`supabase/migrations/2026-09-30-paid-access.sql`) checks that the amount and
currency are exactly the order's. The price comes from the database, never from the
request, and the student is whoever their access token proves, never a name in the
request.

## Routes

| Route | Who | Does |
|---|---|---|
| `GET /` | anyone | `{provider, simulated, configured}` |
| `POST /checkout` `{planId}` | the signed-in student (Bearer token) | Creates the order as the student (`access_order_create`), opens the provider's checkout, marks the order pending. Answers `{orderId, planId, amount, currency, url, simulated}`; the site sends the browser to `url`. |
| `GET /order/<orderId>` | the student who owns it | The order and its grant (`access_order`), for the return page and for picking up an interrupted purchase. Someone else's order is 404. |
| `POST /webhook/<provider>` | the provider | Its signed event: `paid`, `failed`, `cancelled` or `refunded`. |

Refusal codes: `sign-in-required` (401), `bad-request` (400), `plan-unavailable`
(400), `too-many-open-orders` (429, more than ten unfinished orders in an hour),
`provider-unavailable` (502, nothing charged), `not-configured` / `simulated-refused`
(503), `unavailable` (503, the database could not be reached; nothing changed),
`bad-origin` (403). Webhook: `bad-signature` (401), `not-found` (404),
`amount-mismatch` (422), `ref-mismatch` / `provider-mismatch` / `ref-in-use` /
`refunded` / `not-paid` (409).

## What the database guarantees

- One grant per order, however often the provider repeats the paid event.
- A payment for a different amount or currency is refused and grants nothing.
- A failed or cancelled event never touches a paid order.
- A refund revokes that order's access at once and pulls any later purchase back so
  there is no gap.
- When paid access ends, the trial's own rules apply again and every saved result
  stays.

## Providers

One interface, two jobs (`ProviderAdapter` in `src/index.ts`): `createCheckout(order)`
returns the payment page and the provider's reference, and `verifyWebhook(request,
body)` returns the event or null when the signature does not check out.

Only `simulated` exists. It is refused unless both `PAYMENTS_PROVIDER=simulated` and
`PAYMENTS_ALLOW_SIMULATED=local`, and it also needs `PAYMENTS_WEBHOOK_SECRET` and
`SIMULATED_PAY_URL`. Its webhook is signed with `X-Simulated-Signature`, an HMAC of
the body. A simulated payment proves the order, grant, replay, failure and refund
rules. It proves nothing about any real provider. Adding a real one is one more
adapter, chosen and approved by Alex, plus its secrets.

## Configuration

| Variable | Where | Meaning |
|---|---|---|
| `ALLOWED_ORIGINS` | vars | The site's origins, comma-separated. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | vars | The project, and its public key (orders are created as the student). |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | Moves orders through pending, paid, failed and refunded. |
| `PAYMENTS_PROVIDER` | vars | The adapter. Unset: "Payment is not connected yet". |
| `PAYMENTS_WEBHOOK_SECRET` | secret | Verifies the provider's webhooks. |
| `PAYMENTS_RETURN_URL` | vars | `<site>/ielts-website/plans/return`; `?order=<id>` is added. |
| `PAYMENTS_ALLOW_SIMULATED`, `SIMULATED_PAY_URL` | local only | The simulated provider. Never set on a deployed Worker. |

## Running it locally

`node --import ./tests/ts-extension-loader.mjs tools/mr-ez-dev-server.mjs --trial`
mounts this Worker at `/payments` with the simulated provider, the paid-access
migration in PGlite, and a SIMULATED provider page at `/__pay/<orderId>` with Pay,
Fail and Cancel. Each button sends a signed webhook to this Worker and then returns
the browser to `<site>/ielts-website/plans/return?order=<id>`. Test helpers (local
only): `POST /__pay/refund {orderId}` sends a signed refund, `POST /__pay/expire
{email}` ends a student's paid access now, and `GET /__trial/state` lists orders and
grants.

## Proof

- `tests/paid-sql.test.ts`: the migration's rules in PGlite.
- `tests/paid-worker.test.ts`: this handler end to end with the simulated provider.
- `tests/paid-gates.test.ts`: the content gate, Mr EZ and the graders honour a grant.
