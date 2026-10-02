/* Consent at sign-up (src/lib/legal/consent.ts, 2 October 2026): the
 * wording names what the law asks for on every build, the operator line
 * follows legalDetail (placeholders in the gated build, nothing unfinished
 * on the live site), withdrawal names only routes the build has, and the
 * stored record is recognised only for the current version.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/legal-consent.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CONSENT_SENTENCE,
  CONSENT_VERSION,
  PENDING_CONSENT_MAX_AGE_MS,
  consentPoints,
  consentRecord,
  hasCurrentConsent,
  hasCurrentParentConsent,
  parentConsentRecord,
  parentDeclaration,
  parsePendingConsent,
  type ConsentOptions,
} from '../src/lib/legal/consent.ts';
import { LEGAL, type LegalDetails } from '../src/lib/operator.ts';
import { interpolate } from '../src/lib/i18n/translate.ts';

const EMPTY: LegalDetails = { ...LEGAL, fullName: null, iin: null };
const FILLED: LegalDetails = { ...EMPTY, fullName: 'Sample Seller Name', iin: '000000000000' };

const OPEN: ConsentOptions = { drafts: false, paid: false, deletion: false, support: false, facts: EMPTY };
const GATED: ConsentOptions = { drafts: true, paid: true, deletion: true, support: true, facts: EMPTY };

/** Every sentence of the wording, as a student reads it in English. */
function text(options: ConsentOptions): string {
  return consentPoints(options)
    .flatMap((p) => [p.heading, ...p.lines.map((l) => interpolate(l.text, l.vars))])
    .join('\n');
}

test('the version is the one in the build plan', () => {
  assert.equal(CONSENT_VERSION, '2026-10-02');
  assert.match(readFileSync(new URL('../docs/legal/BUILD-PLAN-2026-10-02.md', import.meta.url), 'utf8'), /CONSENT_VERSION = '2026-10-02'/);
});

test('the wording covers every point Art. 8 p.4 asks for, on both builds', () => {
  for (const options of [OPEN, GATED]) {
    const all = text(options);
    const headings = consentPoints(options).map((p) => p.heading);
    assert.deepEqual(headings, [
      'Who processes your data',
      'What data',
      'Why',
      'Who else receives it, and where',
      'How long your consent lasts',
      'How to withdraw it',
    ]);
    for (const name of ['Supabase', 'OpenAI', 'Cloudflare', 'GitHub Pages']) assert.match(all, new RegExp(name), name);
    for (const country of ['European Union', 'United States', 'around the world']) assert.match(all, new RegExp(country), country);
    assert.match(all, /transferred outside Kazakhstan/);
    assert.match(all, /Nothing about you is made public/);
    assert.match(all, /until you withdraw it or delete your account/);
    assert.match(all, /date of birth/);
    assert.match(all, /parent or guardian/);
    assert.match(CONSENT_SENTENCE, /outside Kazakhstan/);
  }
});

test('payments and the payment company appear only where access is sold', () => {
  assert.doesNotMatch(text(OPEN), /payment/i);
  const gated = text(GATED);
  assert.match(gated, /The payment company handles payments \(Kazakhstan\)/);
  assert.match(gated, /receipt number/);
  assert.match(gated, /5 years/);
});

test('who processes the data: placeholders in the gated build, nothing unfinished on the live site, the real details once filled in', () => {
  const who = (options: ConsentOptions) => {
    const line = consentPoints(options)[0]!.lines[0]!;
    return interpolate(line.text, line.vars);
  };
  assert.equal(who(OPEN), 'Your data is processed by the person who runs IELTS is EZ.');
  assert.doesNotMatch(who(OPEN), /\[/);
  assert.equal(who(GATED), 'Your data is processed by [full registered name] (IIN [IIN]), who runs IELTS is EZ.');
  assert.equal(who({ ...OPEN, facts: FILLED }), 'Your data is processed by Sample Seller Name (IIN 000000000000), who runs IELTS is EZ.');
  assert.equal(who({ ...OPEN, facts: { ...EMPTY, fullName: 'Sample Seller Name' } }), 'Your data is processed by Sample Seller Name, who runs IELTS is EZ.');
});

test('the real seller details are used unless a test passes its own', () => {
  const line = consentPoints({ drafts: false, paid: false, deletion: false, support: false }).find((p) => p.heading === 'Who processes your data')!.lines[0]!;
  if (!LEGAL.fullName) assert.equal(line.vars, undefined);
});

test('withdrawal names only the routes this build has', () => {
  const withdraw = (options: Partial<ConsentOptions>) =>
    consentPoints({ ...OPEN, ...options })
      .find((p) => p.heading === 'How to withdraw it')!
      .lines.map((l) => l.text)
      .join(' ');
  assert.match(withdraw({ deletion: true, support: true }), /Delete account[\s\S]*support form/);
  assert.doesNotMatch(withdraw({ deletion: true, support: false }), /support form/);
  assert.match(withdraw({ deletion: false, support: true }), /through the support form, to close your account/);
  const neither = withdraw({});
  assert.doesNotMatch(neither, /support form|Delete account/);
  assert.match(neither, /asking us to close your account/);
});

test('the parent declaration covers data processing, and purchases only where access is sold', () => {
  assert.match(parentDeclaration(false), /personal data being processed/);
  assert.doesNotMatch(parentDeclaration(false), /purchase/);
  assert.match(parentDeclaration(true), /any purchase of access/);
});

test('the stored record counts only for the current version with a real time', () => {
  const now = new Date('2026-10-02T09:00:00Z');
  assert.deepEqual(consentRecord(now), { consent_version: '2026-10-02', consent_at: '2026-10-02T09:00:00.000Z' });
  assert.equal(hasCurrentConsent(consentRecord(now)), true);
  assert.equal(hasCurrentConsent({ consent_version: '2026-01-01', consent_at: now.toISOString() }), false);
  assert.equal(hasCurrentConsent({ consent_version: CONSENT_VERSION }), false);
  assert.equal(hasCurrentConsent({ consent_version: CONSENT_VERSION, consent_at: 'yesterday' }), false);
  assert.equal(hasCurrentConsent(null), false);
  assert.equal(hasCurrentConsent({ full_name: 'From Google' }), false);
  assert.deepEqual(parentConsentRecord(now), { parent_consent_version: '2026-10-02', parent_consent_at: '2026-10-02T09:00:00.000Z' });
  assert.equal(hasCurrentParentConsent({ ...consentRecord(now), ...parentConsentRecord(now) }), true);
  assert.equal(hasCurrentParentConsent(consentRecord(now)), false, 'the student’s own consent is not the parent’s');
});

test('a tick kept across the Google redirect is accepted only when fresh, current and well formed', () => {
  const now = new Date('2026-10-02T09:00:00Z');
  const at = (ms: number) => JSON.stringify({ consent_version: CONSENT_VERSION, consent_at: new Date(now.getTime() - ms).toISOString() });
  assert.deepEqual(parsePendingConsent(at(5 * 60 * 1000), now), { consent_version: CONSENT_VERSION, consent_at: '2026-10-02T08:55:00.000Z' });
  assert.equal(parsePendingConsent(at(PENDING_CONSENT_MAX_AGE_MS + 1000), now), null, 'too old');
  assert.equal(parsePendingConsent(at(-10 * 60 * 1000), now), null, 'from the future');
  assert.equal(parsePendingConsent(JSON.stringify({ consent_version: 'old', consent_at: now.toISOString() }), now), null);
  assert.equal(parsePendingConsent('not json', now), null);
  assert.equal(parsePendingConsent(null, now), null);
  assert.equal(parsePendingConsent(JSON.stringify({ consent_version: CONSENT_VERSION, consent_at: 42 }), now), null);
});

test('the sign-up form requires the tick for both the form and Google, and stores it with the sign-up call', () => {
  const form = readFileSync(new URL('../src/components/auth/SignUpForm.tsx', import.meta.url), 'utf8');
  assert.match(form, /<ConsentCheck/);
  assert.match(form, /const \[consent, setConsent\] = useState\(false\);/, 'unticked by default');
  assert.match(form, /if \(!consent\) found\.consent/);
  assert.match(form, /signUpWithPassword\(.*consentRecord\(new Date\(\)\)/);
  assert.match(form, /if \(!consent\) \{[\s\S]*?return;[\s\S]*?rememberPendingConsent\(consentRecord\(new Date\(\)\)\);[\s\S]*?signInWithGoogle/);
  const session = readFileSync(new URL('../src/lib/auth/session.ts', import.meta.url), 'utf8');
  assert.match(session, /data: metadata/);
  const profile = readFileSync(new URL('../src/components/auth/ProfileForm.tsx', import.meta.url), 'utf8');
  assert.match(profile, /syncPendingConsent\(user\)/);
  assert.match(profile, /needsConsent && \(\s*<ConsentCheck/);
});
