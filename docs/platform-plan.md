# Platform plan: public website, paid workspace, reliable login

Status: proposal for Alex to decide on, written 14 September 2026. Nothing in it has been built yet.

How it was produced: four readers mapped the current code (login, site structure, features and costs, hosting limits), three researchers checked payments for a Kazakhstan business, reliable sign-in on a static site, and how paid IELTS platforms sell; three independent plans were drafted from different angles, scored by three judges, merged, then reviewed by three critics and revised. Numbers in KZT are suggestions to confirm, not decisions.

The eight decisions and ten tasks that only Alex can do are listed at the end.

## 1. Summary

1. This plan turns a free static site into a paid platform. It does the paperwork and the boring reliability work before the pretty selling work. Order: legal and merchant gates, then a real domain, then trustworthy login, then trustworthy subscription state, then real enforcement on the server, then the pages that sell.
2. Two things must be settled before any paywall code is written, because each one can invalidate the product. Where Kazakh students' personal data may legally live, and whether a Kazakh buyer must be given a fiscal receipt. Each is a gate with an owner and a date in phase A, not a risk note. The exam bank licence is settled: the publisher confirmed on 14 September 2026 that the permission covers paid access.
3. The local payment rail is the launch rail, not an afterthought. In Kazakhstan, Kaspi is how people pay for tutoring. Launching on international cards plus a manual transfer would sell one off access, not subscriptions, and the whole recurring revenue idea would never actually get tested.
4. Login does not feel unreliable because Supabase is broken. It feels unreliable because the account button and the course lock blank out on almost every click inside the site, and because progress sync can silently overwrite itself.
5. Three real data faults are fixed first. A failed cloud read is treated as "new student" and then overwrites the cloud, failed saves are dropped in silence, and signing out on a shared computer leaves the previous student's progress behind.
6. The website and the platform separate cleanly. Learn, Practice, Tests and AI Tutor point at short marketing pages that explain and sell. My workspace is where study happens. Every existing app address keeps working exactly where it is, so no bookmark, link or search result breaks.
7. Free stays generous but the line is one rule, stated identically everywhere. All 50 lessons free with no account. Six full exams free with no account. Any AI grading requires a signed in account, and a free account gets one graded essay and one graded speaking answer for life. The approximate band estimate stays free and anonymous, as it is today.
8. Every new account gets a seven day full trial with no card, except the live AI examiner, which is capped at one eight minute session for the whole trial because it costs real money per minute.
9. A locked feature never shows a blank wall. The student sees the real thing for a moment, then the lock, so they can see what they would be buying.
10. Enforcement lives in the Cloudflare Workers, never in the browser. The live examiner's duration cap moves from the browser to the server, and the site wide daily ceiling becomes a dollar figure Alex approves, not a session count.
11. Pricing: the three month plan is the default and the visually primary option, priced against the exam date. Suggested 4,900 KZT a month or 10,900 KZT for three months, with the local rail charging in tenge and Paddle carrying foreign cards in dollars.
12. The goal maths has been corrected. Net of fees and AI cost, 4,900 KZT is nearer 4,000 KZT, so 5,000,000 KZT a month needs roughly 1,200 to 1,300 concurrent subscribers, and IELTS study is a two to three month need, so that means winning 400 to 600 new payers every month forever. A second, higher tier using the centre's own IDP trained teachers reaches the same revenue at around 200 customers and is the more realistic route. Both tiers ship together.
13. Total build is roughly 52 to 60 builder days across eleven phases, plus paperwork that runs in parallel from day one.

## 2. Site architecture

### The split

Two zones, one navigation bar. **The website** explains and sells. **My workspace** is where study happens.

The navigation keeps its current shape and its five items. Four of them point at short marketing pages instead of dropping a stranger into the app. The workspace rail keeps carrying `/trainers`, so the trainers hub is never orphaned.

### Marketing pages to build

| Route | Purpose | Main button |
|---|---|---|
| `/` (rewrite) | Convert a cold visitor in one scroll: what you get, the IDP trained teacher line, a price teaser, three FAQ items | "Take a free exam" |
| `/how-we-teach` | The method and the main trust page: structure first teaching, the four stages, the centre's name and Almaty address | "See the programme" |
| `/programme` | What the course covers, one block per section, two sample lessons that really open. Named `/programme`, not `/course`, so it cannot be confused with the actual course at `/start` | "Open a free lesson" |
| `/ai-feedback` | Essay and speaking grading, a real sample of graded output, one plain sentence on what the AI does and does not do. Named so it does not collide with `/trainers` | "Try AI feedback free" |
| `/exams` | The exam bank, band estimates, answer explanations, the six free ones marked | "Take a free exam" |
| `/ai-tutor` | The live voice examiner: what an up to 18 minute mock feels like, the three parts, the honest note on audio and privacy, paid only, with expected mobile data usage shown | "See plans" |
| `/pricing` | Free versus Pro versus Teacher tier, the exam fee anchor, what the trial includes, refund promise, payment logos with their real behaviour labelled, five billing questions | "Start the free trial" |
| `/faq` | Free versus paid, refunds, how AI grading compares with a real examiner, voice data, how to cancel, the price you keep | Link to pricing |
| `/contact` | Centre name, address, WhatsApp, Telegram, Instagram, support email, hours, founder video when recorded | "Message us on WhatsApp" |
| `/terms`, `/privacy`, `/refunds`, `/offer` | Required before taking money. The Kazakh public offer (публичная оферта) is a named fourth document, in Russian and Kazakh | none |

> **Builder notes.** New Astro pages under `src/pages/`. Nav targets change in `src/components/Nav.astro` only. The app keeps `/learn`, `/tests`, `/tests/<id>`, `/trainers/*`, `/start`, `/dashboard`, `/account` unchanged. Lesson and exam counts are read at build time from `src/data/lessons.ts` and `src/lib/course.ts`, never typed into a page, because the course comment already flags the count can move from 44 to 50. Every page must work at 380 pixels wide first.

### What a signed out visitor sees on the app routes

- `/learn` and every lesson: full content, free forever, no account.
- `/tests` hub: all 40 listed, three reading and three listening playable, the rest tagged "free trial".
- `/tests/<id>`: free ones play, paid ones show the first passage then the lock.
- `/trainers/*`: one full drill playable, then the lock.
- `/writing/checker`: writing is always open, but grading requires an account, so the grade button opens sign up rather than failing.
- `/speaking/examiner`: description and a real sample transcript, start button locked.
- `/start`: **today the whole course view is locked for signed out students**, because `CourseGate.tsx` renders a lock screen instead of the course and only the development bypass on line 39 makes it look open. If the first stage should be previewable, that is new work in phase 2: render stage one read only, then the lock. It must be checked with the bypass removed, because `npm run dev` never shows the real gate.
- `/dashboard` and `/account`: the real screens, driven by local progress, with a calm bar offering to save it to an account. Never a blank sign in wall.

### Free versus paid line

- **Free, no account**: all 50 lessons, all vocabulary quizzes, three reading and three listening full exams, and the approximate band estimate, which is computed on the device today and stays free.
- **Free account**: progress saved and synced, plus **one AI graded essay and one AI graded speaking answer for life**. Any AI grading at all requires an account.
- **Trial, seven days, no card**: everything Pro has, except the live examiner, which is one eight minute session for the whole trial.
- **Pro**: all 40 exams, AI grading up to a stated fair use cap, all four coached trainers, 60 live examiner minutes a month, full band analytics.
- **Teacher tier**: Pro plus two human marked essays and one human speaking review a month from the centre's IDP trained teachers.

## 3. Accounts and login

### Methods

Google sign in as the primary button, email and password as the fallback. Remove magic link.

### The flows

- **Sign up**: Google in one tap, or email, password, first name and exam date. The exam date drives the trial end and renewal emails.
- **Email confirmation, decided not implied**: today `signUpWithPassword` already returns `needsConfirmation` when Supabase withholds the session, and with confirmation on there is no session, therefore no user id, no trial row and no sync. We turn email confirmation **off** so sign up returns a live session, start the trial from the billing Worker on that first session, and require confirmation within 48 hours to keep AI grading.
- **Confirm**: a new `/auth/confirm` page names the address and offers resend with a 60 second cooldown. The email carries a six digit code as well as a link, verified through the `verifyOtp` path, so a student who opens the mail inside another app can finish on the device that started. This needs Resend in place first, because free tier Supabase projects on the built in mailer can no longer customise auth templates at all. The client is configured with PKCE and link detection, and the plan states plainly that a PKCE flow must finish in the browser that began it, which is exactly why the typed code exists.
- **Sign in**: password or Google, with human error text.
- **Stay signed in**: paint the signed in state immediately from what the browser already holds, then confirm quietly. A network failure never signs anyone out.
- **Sign out**: flush the pending save queue first. Only wipe `ielts.progress.v1` once the server confirms the write, and refuse to wipe if the pull that started the session failed. If anything is unsent, sign out but keep the local copy and say "we could not save your progress to your account, it is still on this device".
- **Cross device**: pull the cloud copy first, merge, then save back. Never the other way round.

> **Builder notes, the fixes in order.** 1) Add `transition:persist="account-menu-desktop"` and `transition:persist="account-menu-mobile"` to the two `<AccountMenu client:load />` tags in `src/components/Nav.astro` (lines 28 and 36, desktop and mobile, so they need distinct names), and `transition:persist` on the `<CourseGate />` tag in `src/pages/start.astro`. These are Astro template directives on the component tag, not edits inside the `.tsx` files. `PlatformRail.astro` contains no auth code and is not touched. Decide separately whether `AccountOverview` on `account.astro` needs it. 2) New `src/lib/auth/store.ts`: one shared signed in user that all islands read, replacing four independent listeners, and stop resolving the session twice in `session.ts`. 3) `sync.ts` `pull()` currently returns null for both "no row yet" and "the read failed". Tell them apart, and never push after a failed pull. 4) `push()` currently discards the upsert error entirely. Check it, retry with backoff, queue while offline, show a small "saving" and "saved" mark, and expose whether the queue is empty so sign out can wait on it. 5) Conditional sign out wipe, as above. 6) `progress.ts`: add a change notification so `AccountOverview.tsx` can drop its window focus workaround. 7) `CourseGate.tsx`: remove the `import.meta.env.DEV` bypass so the real lock is testable. 8) `getEnabledProviders()`: tell "Google is off" apart from "Supabase is unreachable". 9) Supabase dashboard: Site URL and exact redirect addresses for the new domain.

### Email and support

Supabase's own mailer sends about two messages an hour and only to team members. Set up **Resend** on the new domain before any real student signs up. This is a launch blocker.

Supabase's SMTP setting only ever sends authentication mail. It will never send a trial reminder or a receipt. Those need a scheduled job, specified in section 5.

Create one support address on the new domain, forwarded to Alex, and put it on every billing email, on the `/account` billing card, on the pricing page and in the FAQ, next to WhatsApp. State a reply time we can keep: one working day. Half a day, phase 1.

### Showing account and subscription state

The account menu shows first name, email and a badge reading "Trial, 5 days left", "Pro until 14 October" or "Free", plus links to My workspace, Billing and Sign out. `/account` gains a plan card: plan, the price that student actually pays, next charge or trial end, payment method, refund request link, download my data, manage and cancel. A failed payment shows a calm amber bar with one button.

## 4. Subscription and payments

### Rails, in order of importance

**Primary for Kazakh buyers: Halyk ePay or Kaspi Pay**, in tenge, at 2 to 2.8 per cent, with recurring card charges and, importantly, the ability to issue a Kazakh fiscal receipt. This is the launch rail. Merchant onboarding starts on day one because it takes weeks and needs a registered ИП or ТОО, a bank account and a published user agreement.

**Foreign cards: Paddle**, as merchant of record, roughly 5 per cent plus 0.50 USD. Kazakhstan sellers are accepted. Stripe is not open to us. Paddle vets sellers, so **Paddle account approval is an explicit gate on phase 3 starting**, applied for in week one with the registered entity, the live domain and the finished legal pages. If Paddle declines, the fallback named now is Halyk ePay alone for Kazakhstan and Lemon Squeezy investigated only if foreign volume justifies it.

**Launch fallback: a Kaspi Business invoice or QR only**, never a personal Kaspi number. Business revenue through a personal number is a tax exposure for Alex himself. The pricing page labels it honestly as "one off payment, renew manually", with an unlock promise of four hours between 09:00 and 22:00 Almaty time, and the manual path switches off by day 45.

Ask Kaspi specifically about instalments (рассрочка) for a digital service. If it is available, offer the three month and six month plans in instalments, because that is how Kazakhstanis buy anything above a few thousand tenge. If it is not, record that in the plan so the option is closed knowingly.

### Plan and price

The three month plan is the default and the visually primary option, framed around the exam date. **4,900 KZT a month, or 10,900 KZT for three months**, a gap of about 25 per cent so the longer plan is obviously the sensible buy. Teacher tier at 19,900 to 29,900 KZT a month.

Before the pricing page is written, confirm whether Paddle can present KZT at checkout for a Kazakhstan seller. If it can, price in KZT there. If it cannot, the headline for foreign buyers is USD with "about 4,900 tenge" underneath as an explicit approximation, and the page says the charge appears in dollars and the student's bank sets the rate. The page detects country and shows one price, not two. **Both figures live in one data file** that the pricing page, the FAQ and the billing emails all read, so they cannot drift.

Anchor the price on the exam fee, not on tutoring: the official IELTS test in Kazakhstan costs well over 100,000 KZT and a retake costs the same again. Check the current fee before publishing and cite it as "as of <month>".

Build a one page cost model before the price is fixed: expected gradings per student per month, expected live minutes, cost of each, payment fee, resulting margin. Set the fair use caps from that model.

### Checkout, refunds and receipts

The student presses Subscribe, signs in, and the billing Worker creates the checkout and returns a hosted payment page. Card details never touch our site.

**Refunds get a real mechanism, not a sentence.** A request path (a link in the receipt email and on the `/account` billing card that opens a prefilled email to support). A written three step procedure per rail for Alex: issue it, confirm the cancellation and refund webhooks arrive, confirm access dropped. Webhook handlers for refund and chargeback events that set status to refunded, clear access immediately and flag the account. For a Kaspi Business payment, a button on the admin screen that records the refund in `payments` and revokes access, because there is no webhook. The page wording matches the slowest rail: "refunds returned within 5 working days". One real refund is tested end to end in phase 7.

**Receipts** are part of phase 3 scope, not paperwork: emailed and shown on the billing card, issued through the local gateway's fiscalisation where the accountant confirms it is required.

### Making the money side correct

- Every webhook is recorded by the provider's event id, and a repeat delivery is ignored.
- Each event carries the provider's timestamp, and an older event never overwrites a newer state.
- If payment is verified but the database write fails, the event goes to a retry queue and alerts Alex after three failures.
- If the subscription check cannot reach Supabase, a billable feature refuses politely and raises an alert. Cosmetic checks fail open.
- All dates in UTC, with a small buffer on period end.
- Failed payment: past due, three day grace, amber banner and a retry email, then free. Progress is never deleted.
- Trial abuse: trial eligibility is tied to a verified phone number or Google sign in, not a bare email address, with a device signal as a secondary check.

## 5. Data

New tables in Supabase, all written only by a Worker holding the service key, all readable by a student for their own row only.

- `profiles`: user id, first name, language, exam date, `free_essay_used_at`, `free_speaking_used_at`. The lifetime free allowance lives here because `usage_counters` is keyed by day and cannot express "ever". Target band is **not** duplicated here, it is read from `user_state.study_plan`.
- `subscriptions`: user id, plan, status (trialing, active, past due, cancelled, expired, refunded), **amount, currency, price_id**, trial ends at, current period end, grace until, cancel at period end, provider, provider ids, last event at, the sent markers for each lifecycle email, updated at. The stored amount is the price that student keeps until they cancel, which makes an introductory price a promise we can honour and a receipt we can regenerate. The grandfathering rule goes in the FAQ.
- `payments`: user id, provider, provider payment id, amount, currency, status, paid at, method, refunded at. Every rail writes here, including manual ones.
- `webhook_events`: provider, event id (unique), received at, applied, raw payload.
- `usage_counters`: user id, day, essays graded, speaking graded. **Live minutes are not duplicated here**: the live examiner already reserves and counts in `live_examiner_sessions`, and two counters that can disagree is how an unpaid session slips through. The phase 6 digest reads that table.
- `user_state` keeps progress. No device id or updated at stamp is added, because the merge is union based and neither field would change a decision.

> **Builder notes.** Row level security on all of them, select own row only, no client writes, mirroring `live_examiner_sessions`. `live-examiner` already verifies the Supabase token, so the subscription check sits beside it. `grade-essay` and `grade-speaking` have **no identity check at all** today and must gain one. When adding it: also add `Authorization` to `Access-Control-Allow-Headers` in each Worker's preflight response, because sending a bearer token turns the call into a preflighted request and the browser blocks it silently otherwise, which reads as "AI grading is broken". Copy `live-examiner`'s `LOCAL_ORIGINS` pattern into both, so localhost origins are honoured only when the Worker itself is reached over localhost and a forged `Origin: http://localhost` cannot buy free grading. `WritingTester` and `SpeakingTester` must handle 401 and 402 with plain copy ("sign in to get your feedback", "your free grading is used up"), because the writing grader has no offline fallback and currently throws a raw configuration error. Verify with one real graded submission from the deployed staging site.

### The scheduled job

Nothing in the plan can decide who gets a trial reminder unless something runs on a clock. Add a **Cloudflare Cron Trigger on the billing Worker, hourly**. It reads `subscriptions`, finds trials ending in 48 hours, trials that ended in the last hour, and past due rows whose grace has expired, sends the matching email by calling Resend directly, and writes a sent marker so nobody is emailed twice. Two days. Emails: confirm, reset, welcome, day 5 trial nudge tied to the student's own results, trial ends in two days, trial ended, receipt, payment failed, cancellation, win back.

### Live examiner spend control

Move this into phase 2, where the Worker is already open. Enforce the duration cap **server side** by closing the session at the cap instead of trusting the browser. Record actual minutes. Convert the site wide daily cap from a session count into a **dollar figure Alex approves**, checked before minting a session, with alerts at 50 and 80 per cent rather than at the limit. Reserve a fixed share of daily capacity for paying subscribers so free and trial users cannot lock out payers, with different refusal messages for each. Trial accounts get one eight minute session in total, and the pricing page says so.

### Gemini quota

All grading runs on Gemini's free tier today and each graded piece makes three calls. That is roughly 500 gradings a day for the whole site, so about 17 heavy users can switch the paid feature off for everyone. Before the paid launch: move Gemini to a paid plan, reduce the median sampling from three to two (one for trial accounts), set the fair use cap at a number the quota sustains (10 a day, stated on the pricing page), and add a spend alert.

### Data export and deletion

Half a day in phase 2: a "download my data" button on `/account` that exports the student's own rows as a JSON file, plus a delete request to the support address and a written procedure covering which rows to remove, which accounting records must be kept, and why.

### Analytics

Named tool and named events, instrumented in phase 2 so the first month can be judged. Prefer a cookieless, EU or self hosted tool (Plausible or Cloudflare Web Analytics) to avoid both a consent banner and more data localisation exposure. Events: homepage view, pricing view, first lesson opened, first exam started, sign up started, sign up completed, trial started, paywall seen, checkout opened, subscription active. Write down a target rate for each. One line in the daily digest shows Alex the funnel without logging in anywhere.

## 6. Work breakdown

Days are working days for one Claude driven builder. Alex's paperwork runs in parallel from day one.

- **Phase A, gates and paperwork, week one, no build days.** Register the ИП or ТОО. Apply to Paddle and to Halyk or Kaspi. The exam bank licence is closed: the publisher confirmed paid access on 14 September 2026. Brief the lawyer (four documents, Russian and Kazakh) and the accountant (fiscal receipts, foreign currency payouts from Paddle, contract registration). Ask Halyk and the .kz registrar in writing whether a .com domain is acceptable and what the hosting location rule means for a static site, because if .kz is required the hosting choice has to be revisited. **Run a paid pre-sale**: a one page offer to the centre's own students at a founding price, paid by Kaspi Business invoice, access granted by hand. If twenty people will not pay, the packaging is wrong and the build changes shape.
- **Phase 0.5, the domain, 3 days, treated as a release.** Decide apex or www up front and pick one canonical origin. Point the DNS, then **wait for GitHub Pages to issue the certificate and Enforce HTTPS to go green**, which commonly takes hours and can take a day. Only then edit allowlists, because they are all https strings. Add a `CNAME` file inside `public/` (anywhere else and the deploy action wipes it every build). Set `site` to the new domain and `base` to `/`. Strip `/ielts-website` from both redirect targets in `astro.config.mjs` and from `src/pages/tests/drills/[id].astro`. Update the sitemap line in `public/robots.txt`. Update `ALLOWED_ORIGINS` in all three `wrangler.jsonc` files and redeploy each Worker (three billable deploys, confirm with Alex). Have the billing Worker read one `SITE_BASE_URL` variable rather than a literal path. Update Supabase Site URL and the redirect allowlist. Keep the old github.io origin alongside the new one in every allowlist for two weeks. Re-verify sign in, a password reset and one AI grading call on the new domain. Publish plain first drafts of terms, privacy, refunds and the public offer, which the lawyer later replaces, because Paddle will not approve a seller without them reachable.
- **Phase 0, login reliability and staging, 6.5 days.** The nine fixes in section 3, plus half a day to stand up a staging target: a second Pages site from a `staging` branch, its origin added to all three Workers and the Supabase allowlist, plus Paddle sandbox for phase 3. Every later proof runs on staging first. Acceptance: sign in and out on a laptop and a phone, progress merges rather than overwrites, `/start` viewed signed out **in a production build with the DEV bypass removed**, and two tabs left idle past token expiry with neither signing out.
- **Phase 1, account flows, email and the scheduled job, 6.5 days.** Confirmation page with typed code, resend, human errors, plan badge, Resend on the new domain, the hourly cron job and all lifecycle emails sent for real, support address live.
- **Phase 2, subscription data and enforcement, 10 days.** Half a day first to correct `CLAUDE.md` (the live examiner is OpenAI by default, billed per minute, sign in required) and the `grade-essay` README (the stub fallback it promises no longer exists), before any Worker is touched. Then the live examiner prerequisites, which need Alex's approval because they are billable: run `supabase/schema.sql`, set `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, deploy, run one real paid session, confirm the caps fire. Only then the subscription gate. Then the five tables, the token and CORS work on both graders, 401 and 402 handling in the testers, server side duration cap and dollar ceiling, lifetime allowance columns, preview and lock components, the `/start` stage one preview, data export, and analytics instrumented.
- **Phase 3, payments, 10 days. Gated on Paddle approval and the merchant account.** Billing Worker, local rail checkout as primary, Paddle for foreign cards, webhooks with the idempotency and ordering rules, receipts, refund and chargeback handling per rail, thank you page, billing card, failed payment banner, Kaspi Business invoice flow and admin screen.
- **Phase 4, marketing site, 7 days.** The pages in section 2, navigation and footer, the sitemap `filter` in `astro.config.mjs` excluding `/styleguide`, `/reset-password`, the auth and billing pages and the individual `/tests/<id>` pages (thin and near duplicate, so only the hubs belong), plus the noindex tag on `/styleguide`, since a page that is both noindexed and listed is reported as an error. Update `PRODUCT.md` and `DESIGN.md`, which currently forbid implying paid plans exist. One hour for the sitemap, one day for documentation.
- **Phase 5, Russian first and Kazakh key pages, 6 days.** Russian is the primary buying language, written first. One day for `/ru/` path routing on the same domain (which adds no new origin and no new allowlist entry), the language switch and hreflang tags, five days for copy across marketing, pricing, FAQ, billing screens and ten emails. Legal documents are excluded from this budget: they come back translated from the lawyer. Kazakh versions of the home page, pricing page and public offer at launch, the rest following.
- **Phase 6, safety nets, 2 days.** Daily usage, spend and funnel digest by email, webhook failure alerts, subscription check failure alerts.
- **Phase 7, launch checks, 4 days.** Two device sign in, two tab session test, one real subscription bought, cancelled and refunded on each rail, one real paid live examiner session, and a **mobile acceptance pass on the platform, not just the sales pages**: one full reading test, one listening test with headphones, and one live examiner session completed on a mid range Android phone on mobile data, including recovering from an incoming call without losing the test or the daily allowance. Plus: study anonymously, sign up, sign out, sign back in, confirm nothing was lost. Copy proofread in English, Russian and Kazakh.
- **Phase 8, acquisition, runs from phase 4 onward.** Offer to the centre's current and past students first, they are the first hundred subscribers. Instagram and Telegram channels with Alex's own face, added alongside WhatsApp as contact channels. Three search phrases the free lessons should rank for. Partner language centres reselling the platform, which mirrors the kindergarten product strategy.

**Total before launch: roughly 52 builder days, realistically 52 to 60 with review and rework, about eleven to thirteen weeks.** Phases 4 and 5 can run alongside 2 and 3 if Alex has the copy ready.

### Reaching existing free users

There is no email list, because all current progress lives in the browser with no address attached. So the 30 days of Pro is offered **in the product**: any device with existing progress and no account sees a one off bar offering it in exchange for creating an account, with the code applied at sign up. Start capturing emails now, before phase 2, with that same calm bar plus a "get notified" capture on the homepage, and honour the 30 days for every account created before launch day.

### Deliberately deferred

Per skill marketing pages, a testimonials page, a blog strategy, a score guarantee, annual plans, referral codes, a proper admin dashboard, moving off static hosting, and gating the lesson library or the free exams.

## 7. Risks and open questions

1. **A static site cannot truly hide content.** Lesson and exam text is present in the page even when locked, so **the exam gate is a convenience lock, not enforcement**. The paid argument therefore rests on AI grading and the live examiner, which are genuinely enforced in the Workers.
2. **The live examiner has never run end to end since it started charging by the minute.** Proving it is a phase 2 prerequisite, not a phase 7 check.
3. **Paddle may decline us.** An education platform from a new Kazakh ИП selling access to third party exam material is the profile that gets extra verification. The exam bank licence itself is confirmed; keep the publisher's written confirmation ready for Paddle's verification. The fallback is named in section 4.
4. **Kazakh personal data law.** Kazakh citizens' personal data may be required to sit in a database located in Kazakhstan. This is a gated written opinion in phase A covering the Supabase region, the consent wording at sign up, and whether registration with the authorised body is needed. We design for the likely answer now: email and first name only, no phone unless trial verification requires it, no address, voice recordings deleted after grading by default, and the Supabase region chosen deliberately.
5. **Fiscal receipts.** Paddle, as a foreign merchant of record, does not issue a Kazakh fiscal receipt. Halyk ePay and Kaspi Pay can. This alone is a reason to route Kazakh residents to the local rail.
6. **Foreign currency payouts.** Recurring Paddle wires into a Kazakh business account bring currency control paperwork and possible contract registration. Confirm with the bank before the first Paddle sale, not when the first wire lands.
7. **The trial has to feel like it ends.** Lessons and six exams stay free, so a student who was mostly reading loses little. During the trial the student accumulates graded work, band history and exam attempts, and at trial end those results stay visible while the paid features lock: "your last essay scored 6.5, you have 3 more exams to take, unlock to continue".
8. **Trust with no reviews yet.** Do not invent testimonials. The pre-sale in phase A is how the first real ones get earned.

### Decisions Alex must make

- [ ] Price and shape: 4,900 monthly, 10,900 for three months as the default, plus a Teacher tier at 19,900 to 29,900. Confirm or change.
- [ ] Whether the first 50 students get a founding price they keep for life.
- [ ] Keep the seven day no card trial with the live examiner capped at one session.
- [ ] Free line: all 50 lessons and six exams free, AI grading requires an account, one free essay and one free speaking answer for life, band estimate stays free and anonymous.
- [ ] Live examiner monthly dollar ceiling, and what students see when it is reached.
- [ ] Voice recordings kept or deleted after grading.
- [ ] Which local rail: Halyk ePay or Kaspi Pay.
- [ ] Approve the Worker deploys and the Gemini paid plan, which are real and billable.

### What Alex has to do himself

- [ ] Register the ИП or ТОО and open the business bank account.
- [ ] Keep the publisher's written confirmation of paid use on file, ready for Paddle's verification.
- [ ] Buy the domain the gateway will accept, after asking Halyk and the registrar.
- [ ] Apply to Paddle in week one, and to Halyk or Kaspi.
- [ ] Open Resend and verify the sending domain.
- [ ] Commission the four legal documents in Russian and Kazakh, and approve them.
- [ ] Brief the accountant on fiscal receipts and Paddle payouts.
- [ ] Supply the centre's name, address, phone, WhatsApp, Telegram, Instagram and hours, and the Kaspi Business details.
- [ ] Run the pre-sale to the centre's own students in week one.
- [ ] Run one real purchase, one real refund and one real paid voice session before launch.