/* The public offer, the privacy notice and the seller's details (Builder L,
 * 2 October 2026; docs/legal/BUILD-PLAN-2026-10-02.md).
 *
 *   - the refund rule's arithmetic, and the offer's worked example
 *     (day 6 of 30, 8 of 20 assessments: 7,794 of 12,990 KZT);
 *   - seller details only through legalDetail(): placeholders on the gated
 *     build, nothing on the open build until filled in, links only for real
 *     values;
 *   - the privacy notice's version is the consent version;
 *   - no page still says payments are not refunded;
 *   - no em or en dashes in the legal text.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/legal-pages.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { REFUND_COUNTED_ASSESSMENTS, refundDue, refundExample } from '../src/lib/legal/refund.ts';
import { CONSUMER_AUTHORITY, OFFER_VERSION, PRIVACY_VERSION, SELLER_FULL, SELLER_SHORT, formatVersion, sellerEmail, sellerRows } from '../src/lib/legal/offer.ts';
import { LEGAL, LEGAL_PLACEHOLDER, type LegalDetails } from '../src/lib/operator.ts';
import { AVAILABLE_PAID_PLANS } from '../src/lib/access/plans.ts';
import { PAID_ALLOWANCE } from '../src/lib/trial/status.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ── The refund rule ───────────────────────────────────────────────────── */

test('the refund rule counts essays, recorded Speaking and live interviews: 12 + 6 + 2', () => {
  assert.equal(REFUND_COUNTED_ASSESSMENTS, PAID_ALLOWANCE.writing + PAID_ALLOWANCE.speaking + PAID_ALLOWANCE.live);
  assert.equal(REFUND_COUNTED_ASSESSMENTS, 20, 'the plan names 20 included assessments: update the offer and this test together');
});

test('the worked example is the plan’s: 40% used, so 60% of 12,990 KZT = 7,794 KZT', () => {
  const plan = AVAILABLE_PAID_PLANS[0]!;
  assert.equal(plan.amount, 12990, 'the price changed: the example on the offer follows it, update this test');
  assert.equal(plan.days, 30);
  const ex = refundExample();
  assert.equal(ex.daysPercent, 20);
  assert.equal(ex.usedAssessmentsPercent, 40);
  assert.equal(ex.usedPercent, 40);
  assert.equal(ex.counted, 'assessments');
  assert.equal(ex.refundPercent, 60);
  assert.equal(ex.refund, 7794);
});

test('the used share is the larger of days started and assessments used, rounded down to whole tenge', () => {
  const base = { price: 12990, days: 30, included: 20 };
  // Days are the larger share: day 15 (50%), 2 assessments (10%).
  assert.deepEqual(refundDue({ ...base, daysStarted: 15, used: 2 }), { usedPercent: 50, counted: 'days', refund: 6495 });
  // Nothing used on day 0: the whole price.
  assert.equal(refundDue({ ...base, daysStarted: 0, used: 0 }).refund, 12990);
  // Day 1 already counts: 1/30 used, 12990 * 29/30 = 12557.
  assert.equal(refundDue({ ...base, daysStarted: 1, used: 0 }).refund, 12557);
  // Rounded down, never up: 12990 * 23/30 = 9959.
  assert.equal(refundDue({ ...base, daysStarted: 7, used: 0 }).refund, 9959);
  // After the 30 days, or with every assessment used, nothing is left.
  assert.equal(refundDue({ ...base, daysStarted: 30, used: 0 }).refund, 0);
  assert.equal(refundDue({ ...base, daysStarted: 45, used: 0 }).refund, 0);
  assert.equal(refundDue({ ...base, daysStarted: 2, used: 20 }).refund, 0);
  assert.equal(refundDue({ ...base, daysStarted: 2, used: 25 }).refund, 0);
  // Never negative, whatever is passed.
  assert.equal(refundDue({ ...base, daysStarted: -3, used: -1 }).refund, 12990);
});

/* ── Seller details ────────────────────────────────────────────────────── */

const FILLED: LegalDetails = {
  fullName: 'Sample Seller',
  iin: '000000000000',
  registration: 'Sample notice',
  registeredAddress: 'Sample address',
  actualAddress: null,
  phone: '+7 700 000 00 00',
  email: 'seller@example.test',
  hours: 'Sample hours',
};
const EMPTY: LegalDetails = Object.fromEntries(Object.keys(FILLED).map((k) => [k, null])) as unknown as LegalDetails;

test('seller rows: placeholders on the gated build, nothing on the open build, while nothing is filled in', () => {
  const drafts = sellerRows(SELLER_FULL, true, EMPTY);
  assert.equal(drafts.length, SELLER_FULL.length);
  for (const row of drafts) {
    assert.equal(row.draft, true);
    assert.equal(row.text, LEGAL_PLACEHOLDER[row.key]);
    assert.equal(row.href, null, 'a placeholder is never a link');
  }
  assert.deepEqual(sellerRows(SELLER_FULL, false, EMPTY), []);
  assert.equal(sellerEmail(false, EMPTY), null);
});

test('seller rows: real values as entered, email and phone as links, an empty optional detail left out', () => {
  const rows = sellerRows(SELLER_FULL, false, FILLED);
  assert.deepEqual(rows.map((r) => r.key), ['fullName', 'iin', 'registration', 'registeredAddress', 'phone', 'email', 'hours']);
  assert.ok(rows.every((r) => !r.draft));
  assert.equal(rows.find((r) => r.key === 'email')!.href, 'mailto:seller@example.test');
  assert.equal(rows.find((r) => r.key === 'phone')!.href, 'tel:+77000000000');
  assert.equal(rows.find((r) => r.key === 'iin')!.href, null);
  assert.deepEqual(sellerRows(SELLER_SHORT, false, FILLED).map((r) => r.key), ['fullName', 'iin', 'phone', 'email']);
});

test('the real seller details stay with Alex: every surface reads them through sellerRows or legalDetail', () => {
  // Nothing filled in yet is the expected state; once Alex fills them in,
  // this still holds, because no surface types a value of its own.
  for (const rel of [
    'src/components/support/TermsDocument.tsx',
    'src/components/legal/SellerDetails.tsx',
    'src/components/access/Receipt.tsx',
    'src/components/WorkspaceFooter.astro',
    'src/pages/privacy.astro',
    'src/pages/help.astro',
  ]) {
    const source = read(rel);
    assert.match(source, /sellerRows|sellerEmail|SellerDetails/, `${rel} reads the seller through src/lib/legal/offer.ts`);
    assert.doesNotMatch(source, /\[full registered name\]|\[IIN\]|\[contact email\]/, `${rel} types a placeholder itself`);
    for (const value of Object.values(LEGAL)) {
      if (value) assert.ok(!source.includes(value), `${rel} hard-codes a seller detail`);
    }
  }
  // The open build's footer shows a detail only once it is filled in.
  assert.match(read('src/components/WorkspaceFooter.astro'), /sellerRows\(SELLER_SHORT, offer\)/);
});

/* ── Versions and the authority ────────────────────────────────────────── */

test('the privacy notice’s version is the consent version, spelled out on the page', () => {
  assert.match(PRIVACY_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(OFFER_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  const consent = path.join(ROOT, 'src/lib/legal/consent.ts');
  if (fs.existsSync(consent)) {
    const m = /CONSENT_VERSION\s*=\s*'([^']+)'/.exec(fs.readFileSync(consent, 'utf8'));
    assert.ok(m, 'src/lib/legal/consent.ts exports CONSENT_VERSION');
    assert.equal(m[1], PRIVACY_VERSION, 'the privacy notice and the consent must carry the same version');
  }
  assert.equal(formatVersion(PRIVACY_VERSION, 'en'), '2 October 2026');
  assert.match(read('src/pages/privacy.astro'), new RegExp(`Version of ${formatVersion(PRIVACY_VERSION, 'en')}, the same version as the consent`));
  assert.match(formatVersion(OFFER_VERSION, 'ru'), /октября 2026/);
});

test('the consumer protection authority links to its own gov.kz page', () => {
  assert.equal(CONSUMER_AUTHORITY.url, 'https://www.gov.kz/memleket/entities/mti-kzpp');
  assert.match(CONSUMER_AUTHORITY.name, /^Committee for the Protection of Consumer Rights of the Ministry of Trade and Integration/);
});

/* ── The offer ─────────────────────────────────────────────────────────── */

test('the offer names what the law asks for, and re-types no number', () => {
  const offer = read('src/components/support/TermsDocument.tsx');
  const body = offer.slice(offer.indexOf('function OfferDocument'), offer.indexOf('function OpenSiteTerms'));
  for (const id of ['terms-seller', 'terms-sold', 'terms-free', 'terms-made', 'terms-refund', 'terms-complaints', 'terms-ai', 'terms-age', 'terms-changes']) {
    assert.match(body, new RegExp(`id="${id}"`), `the offer has its ${id} section`);
  }
  assert.match(body, /CONSUMER_AUTHORITY\.url/);
  assert.match(body, /right to go to court/);
  assert.match(body, /\/support\?reason=refund/);
  assert.match(body, /\/support\?reason=ai-review/);
  assert.match(body, /refundExample\(\)/);
  assert.match(body, /under 18, a parent or guardian must agree to the purchase/);
  assert.match(body, /never raises the price of a purchase already made/);
  // The numbers come from the plan and the allowance, not from the text.
  assert.doesNotMatch(body, /12[ ,]?990|7[ ,]?794/, 'the offer types a price itself');
  assert.match(body, /PAID_ALLOWANCE\.writing/);
  // The open site keeps its own terms.
  assert.match(offer, /isTrialBuild\(\) \? <OfferDocument \/> : <OpenSiteTerms \/>/);
});

test('no page still says payments are not refunded', () => {
  for (const rel of [
    'src/components/support/TermsDocument.tsx',
    'src/components/support/PurchaseTerms.tsx',
    'src/pages/terms.astro',
    'src/pages/help.astro',
    'src/pages/privacy.astro',
    'src/components/trial/TrialPlans.tsx',
    'src/lib/access/plans.ts',
    'src/marketing/sales-copy.ts',
  ]) {
    const source = read(rel).replace(/replacing "no refunds after purchase"|"no refunds after\s+purchase"|"not refunded after\s+purchase"|"payments are not refunded after\s+purchase"/g, '');
    assert.doesNotMatch(source, /not refunded after purchase|no refunds? after purchase|деньги не возвращаются|без возврата денег/i, `${rel} still refuses refunds`);
  }
});

test('the legal text has no em or en dashes', () => {
  for (const rel of [
    'src/components/support/TermsDocument.tsx',
    'src/components/support/PurchaseTerms.tsx',
    'src/components/legal/SellerDetails.tsx',
    'src/lib/legal/refund.ts',
    'src/lib/legal/offer.ts',
    'src/pages/privacy.astro',
    'src/pages/terms.astro',
    'src/pages/help.astro',
    'src/components/WorkspaceFooter.astro',
    'src/lib/i18n/dict/ru/l-legal.ts',
    'src/marketing/sales-copy.ts',
  ]) {
    assert.doesNotMatch(read(rel), /[–—]/, `${rel} has an em or en dash`);
  }
});
