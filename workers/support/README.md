# Support: a signed-out visitor's way to a person

Written 30 September 2026 for the re-audit (finding R01). **Not deployed.** The
database side is `supabase/migrations/2026-09-30-support.sql`, which has never been
applied to a real project either.

## The problem this fixes

The support form (`/support`) works signed in and signed out. Signed out, the browser
used to call the database directly. The database could limit a visitor only by the
email they typed, which costs nothing to invent, and then by one allowance shared by
everyone: thirty an hour. Thirty requests with made-up addresses used it up, and every
other signed-out visitor was told to come back in an hour. One person could switch off
support for everyone who cannot sign in.

## The rule that matters

A signed-out request is limited by **where it really came from**, and that is decided
on the server, never by anything the browser says about itself.

- The database refuses anonymous callers outright. `support_request_create` is for
  signed-in students only, and `support_request_visitor` can be called only with the
  service role key, which only this Worker holds. A direct call to the database with
  the public key is refused, so the Worker cannot be bypassed.
- The Worker reads the sender's network address from `CF-Connecting-IP` and nothing
  else. Cloudflare sets that header itself on every request that reaches a Worker and
  overwrites whatever the client sent. `X-Forwarded-For`, other headers and the request
  body are ignored. A request with no usable address is refused.
- An IPv4 sender is counted by its address. An IPv6 sender is counted by its /64
  network, because one subscriber owns that whole range and could otherwise use a new
  address for every request.

## The limits, and the order they run in

All numbers live in one place, `support_limits()` at the top of the migration.

| Step | Limit | Refusal code |
|---|---|---|
| 1 | The request is well formed | `email-required`, `email-invalid`, `topic`, `message-length` |
| 2 | 3 an hour from one sender | `source-hour` |
| 3 | 6 a day from one sender | `source-day` |
| 4 | 3 a day to one reply address | `email-day` |
| 5 | 300 an hour from all signed-out visitors together, **only for requests that did not pass the bot check** | `busy` |

A refusal stores nothing, so it uses up nobody's allowance. The sender's own limits
come first on purpose: a flood from one sender stops at step 2 and never reaches the
shared count in step 5. Tripping step 5 now takes a hundred different network
addresses inside one hour instead of thirty requests from one machine.

Signed-in students are separate: five a day per account, straight to the database as
themselves. Nothing a signed-out sender does can affect them.

## The bot check (Cloudflare Turnstile)

- With `TURNSTILE_SECRET_KEY` set on the Worker, every signed-out request must carry
  a Turnstile token, and the Worker checks it with Cloudflare (`siteverify`) before
  anything is stored. A missing, invalid or already used token is refused
  (`challenge-required`, `challenge-failed`), and if Cloudflare cannot be reached the
  request is refused too (`challenge-unavailable`). A request that passes is never
  stopped by the shared circuit breaker, so a real person always has a way in.
- Without it, requests go ahead on the sender limits alone. That already fixes the
  audit's attack (one sender gets three an hour), but a determined attacker with a
  hundred or more addresses could still trip the shared breaker for up to an hour.
  **Setting the Turnstile secret is what closes that last gap**, so it is recommended
  for the real site.
- The site shows the check on the signed-out form when `PUBLIC_TURNSTILE_SITE_KEY` is
  set (the same key the sign-in forms already use). Set both or neither: a Worker with
  the secret and a site without the key would refuse every signed-out message.

## What is stored about a signed-out sender, and for how long

- The email address they typed, their message, the topic, the language, and (when a
  link said so) which page they came from. These stay until Alex removes them.
- A **keyed hash** of their network address (HMAC-SHA-256 with `SUPPORT_SOURCE_SALT`).
  The address itself is never stored and never written to a log. Without the secret
  the hash cannot be turned back into an address, and the secret lives only in this
  Worker. For IPv6 the hash is of the /64 network, not the full address.
- The hash is used for the per-sender limits and nothing else. It is never shown in
  the admin page.
- **The hash is erased after 24 hours** (the request itself stays). The erasing runs
  at the start of every signed-out request and once an hour on the Worker's schedule
  (`triggers` in `wrangler.jsonc`), so in practice a hash is gone within 25 hours.
- When the bot check is on, the Turnstile token and the sender's address are sent to
  Cloudflare to be verified. Neither is stored here.

## Routes

| Route | Who | Does |
|---|---|---|
| `GET /` | anyone | `{configured, challenge}` |
| `POST /request` `{email, topic, message, context?, page?, locale?, challengeToken?, trap?}` | a signed-out visitor, from the site | Stores the request and answers `{ok: true, id}`, or `{error, code}`. |

Other refusal codes: `bad-origin` (403, the request did not come from the site),
`no-source` (400, no usable `CF-Connecting-IP`), `not-configured` (503, a secret or
the database address is missing), `unavailable` (503, the database could not be
reached; nothing was stored), `bad-request` (400 or 413).

`trap` is the form's hidden field. A person never sees it; a form-filling script fills
it in. Such a request is answered as if it worked, and nothing is stored or counted.

## Configuration

| Variable | Where | Meaning |
|---|---|---|
| `ALLOWED_ORIGINS` | vars | The site's origins, comma-separated. |
| `SUPABASE_URL` | vars | The project. |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | The only key that may call `support_request_visitor`. |
| `SUPPORT_SOURCE_SALT` | secret | Keys the hash of a sender's address. Any long random value, at least 16 characters. Without it the Worker accepts nothing. |
| `TURNSTILE_SECRET_KEY` | secret, optional | Switches the bot check on. The pair of the site's `PUBLIC_TURNSTILE_SITE_KEY`. |

On the site (build time):

| Variable | Meaning |
|---|---|
| `PUBLIC_SUPPORT_URL` | This Worker's address. Unset: the signed-out form says messages from signed-out visitors are not switched on and points at signing in. It never pretends to send, and it never falls back to the database. |
| `PUBLIC_TURNSTILE_SITE_KEY` | Shows the bot check on the signed-out form (and, as before, on sign-in, sign-up and forgot password). |

## Running it locally

`tools/mr-ez-dev-server.mjs` (open and `--trial`) mounts this same handler at
`/support`, against the real migration in PGlite. Point the site at it with
`PUBLIC_SUPPORT_URL=http://127.0.0.1:<port>/support`. No Turnstile secret is set
locally, so no call leaves the machine.

Cloudflare is not in front of a local server, so the stand-in's bridge
(`tools/stand-in/support.mjs`) sets `CF-Connecting-IP` itself from the connection's
address and drops any copy the client sent. For tests only, the bridge also honours an
`X-Standin-Source` header, to play a visitor on a different address. That override
lives in the stand-in and nowhere in this Worker.

Local helpers: `GET /__support/state` lists every stored request (including the
hash), `POST /__support/admin {email}` makes a local account an admin.

## Proof

- `tests/support-sql.test.ts`: the migration's rules in PGlite (anonymous callers
  refused, the order of the limits, refusals store nothing, a challenged request
  passes an open breaker, hashes are erased, signed-in and admin paths unchanged).
- `tests/support-worker.test.ts`: this handler end to end (no address refused,
  `X-Forwarded-For` ignored, Turnstile verified server-side with a stubbed Cloudflare,
  origin check, trap field, one sender cannot shut out another).
- `tests/browser/e01_trust_journey.py`: the form in a real browser, signed in and
  signed out, English and Russian, desktop and phone.
