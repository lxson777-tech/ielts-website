# Legal build plan (2 October 2026)

Alex approved the legal work after the research in
`docs/legal/KZ-WEBSITE-REQUIREMENTS-2026-10-02.md` and his decisions
(second brain: `Decisions/2026-10-02 IELTS refunds, Kazakh and data location
follow Kazakh law.md`): refund minus what was used; Kazakh for legal and
buying pages; a lawyer first on data location. Everything here is for the
PAID (gated) build unless it says otherwise; the live site keeps the paid
model off.

## Facts every builder uses (the contract)

**Seller details** come only from `src/lib/operator.ts` (`LEGAL`), filled by
Alex alone. Read them through `legalDetail(key)` / `sellerDetails()`. While a
value is null:
- in the gated build (local review, not live) a visible placeholder is shown,
  for example "[full registered name]", so Alex sees where it goes;
- in the open build (the live site) nothing is shown, exactly as before.
Never type a name, IIN, address, phone or email anywhere else.

**Refund rule** (draft for a lawyer to confirm; replaces "no refunds after
purchase", decided 29 September):
- A student may ask for a refund at any time during the 30 days.
- We refund the unused share of the price. The used share is the LARGER of:
  the days of access that have started, out of 30; and the AI assessments
  already used (essays, recorded Speaking, live interviews), out of the 20 the
  purchase includes (12 + 6 + 2).
- Refund = price x (1 - used share), rounded down to whole tenge.
- Example: day 6 of 30 (20%) and 8 of 20 assessments used (40%): 40% is
  used, so 60% of 12,990 KZT = 7,794 KZT is refunded.
- Access and the remaining allowances end when the refund is made.
- How to ask: the support form (reason `refund`) or the seller's email.
- The money goes back to the payment method used, within 10 working days of
  the request being accepted (bank processing time may add to this).
- After the 30 days have ended there is nothing left to refund.
- Complaints get a reasoned written answer within 10 calendar days.

**Retention** (proposed defaults, Alex to confirm; marked as such in
`docs/legal/BUILD-PLAN` only, the site states them plainly):
- Account data: kept while the account is open; deleted at once when the
  student deletes the account (built 2 October).
- Payment records: kept as anonymous sale records for 5 years (tax law),
  then deleted.
- Messages sent through the support form while signed out: 12 months, then
  deleted automatically.
- Consent record: kept with the account (deleted with it).
- AI providers: OpenAI's own retention of API data as its policy states
  (check the current OpenAI page before writing a number).

**Consent version**: `CONSENT_VERSION = '2026-10-02'` in
`src/lib/legal/consent.ts` (Builder C). The privacy notice shows the same
version and date.

**Third parties and countries** (for privacy and consent): Supabase (accounts
and data; EU or US region), OpenAI (AI feedback, Mr EZ, live examiner; US),
Cloudflare (the site's backend services and bot check; global), GitHub Pages
(the site's pages; US), and the payment company once chosen (Kazakhstan).

**Consumer protection authority**: the Committee for the Protection of
Consumer Rights (Ministry of Trade and Integration of the Republic of
Kazakhstan). Builders confirm the current official name and website before
linking it.

## Builders and file ownership

| Builder | Owns |
|---|---|
| **L** (legal text) | `src/components/support/TermsDocument.tsx` (becomes the public offer), `PurchaseTerms.tsx`, `src/pages/terms.astro`, `src/pages/privacy.astro`, `src/pages/help.astro`, `src/components/WorkspaceFooter.astro` (seller block), `src/marketing/sales-copy.ts` (refund and pricing lines only), `src/lib/access/plans.ts` (refund wording only), the refund and seller mentions in `src/components/access/*` (AccessParts, PurchaseReturn, Receipt, access-state) and `src/components/trial/TrialPlans.tsx`, Russian in `src/lib/i18n/dict/ru/l-legal.ts`, tests for these. |
| **C** (consent and rights) | `src/lib/legal/consent.ts` (new), `src/components/auth/SignUpForm.tsx` and the Google sign-in path, `src/components/auth/ProfileForm.tsx` (parent declaration), `src/components/AccountSettings.tsx` ("Download my data"), `src/lib/legal/export.ts` (new), `src/lib/support-rules.ts` (reasons `refund` and `ai-review`), AI labels and the "ask a person to review this result" link in `src/components/tutor/MrEzPanel.tsx`, `src/components/LiveExaminer.tsx`, `src/components/WritingTester.tsx`, `src/components/SpeakingTester.tsx`, visitor-message retention (`supabase/migrations/2026-10-02-support-retention.sql`, `workers/support/**`), Russian in `src/lib/i18n/dict/ru/c-consent.ts`, tests for these. |
| **K** (Kazakh, after L and C are merged) | a third locale `kk` for the legal and buying pages listed in the requirements report, with Russian as the fallback for everything not translated. |

Hot spots resolved at merge: `src/lib/i18n/dict/ru/index.ts`,
`tests/i18n.test.ts` BATCH_FILES.

## Rules for every builder

Local only (no push, deploy, real services, payments or paid AI); synthetic
`@example.test` accounts; never recursive deletes or mirror commands; never
touch `.git`; write only in your own worktree; never stop processes you did
not start (4441, 4442, 8841, 8842 are Alex's review servers); no em dashes
or en dashes; plain language for students; every new sentence gets its
Russian; commit early with clear messages.
