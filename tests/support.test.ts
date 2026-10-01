/* The support form's own rules (src/lib/support.ts) and the places a
 * student can reach it from (audit F04). The database side is
 * tests/support-sql.test.ts.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/support.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SUPPORT_LIMITS,
  parseFrom,
  parseReason,
  replyAddress,
  supportFailureFromCode,
  supportFailureFromMessage,
  supportHref,
  topicForReason,
  validateSupport,
  visitorSupportEnabled,
} from '../src/lib/support.ts';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('validateSupport: a topic and a real message are required; email only when signed out', () => {
  const good = { topic: 'problem' as const, message: 'The recording stopped halfway.', email: '' };
  assert.deepEqual(validateSupport(good, true), { ok: true });
  assert.deepEqual(validateSupport(good, false), { ok: false, errors: { email: 'required' } });
  assert.deepEqual(validateSupport({ ...good, email: 'visitor@example.test' }, false), { ok: true });
  assert.deepEqual(validateSupport({ ...good, email: 'nope' }, false), { ok: false, errors: { email: 'invalidEmail' } });
  assert.deepEqual(validateSupport({ ...good, topic: '' }, true), { ok: false, errors: { topic: 'required' } });
  assert.deepEqual(validateSupport({ ...good, message: '   ' }, true), { ok: false, errors: { message: 'required' } });
  assert.deepEqual(validateSupport({ ...good, message: 'too short' }, true), { ok: false, errors: { message: 'tooShort' } });
  assert.deepEqual(validateSupport({ ...good, message: 'x'.repeat(SUPPORT_LIMITS.messageMax + 1) }, true), {
    ok: false,
    errors: { message: 'tooLong' },
  });
  assert.deepEqual(validateSupport({ ...good, message: 'x'.repeat(SUPPORT_LIMITS.messageMax) }, true), { ok: true });
});

test('links carry a known reason and a safe, same-site page only', () => {
  assert.equal(supportHref(), '/support');
  assert.equal(supportHref('mr-ez', '/lessons/reading/paraphrase'), '/support?reason=mr-ez&from=%2Flessons%2Freading%2Fparaphrase');
  assert.equal(supportHref('grader', 'https://evil.example.test/'), '/support?reason=grader');
  assert.equal(parseFrom('//evil.example.test'), '');
  assert.equal(parseFrom('/x'.repeat(200)).length, SUPPORT_LIMITS.pageMax);
  assert.equal(parseReason('trial-ended'), 'trial-ended');
  assert.equal(parseReason('<script>'), null);
  assert.equal(topicForReason('mr-ez'), 'problem');
  assert.equal(topicForReason('plans'), 'account');
  assert.equal(topicForReason(null), null);
});

test('database refusals map to sentences the form can word', () => {
  assert.equal(supportFailureFromMessage('support-rate-limited'), 'rate-limited');
  assert.equal(supportFailureFromMessage('support-busy'), 'busy');
  assert.equal(supportFailureFromMessage('support-email-required'), 'email-required');
  assert.equal(supportFailureFromMessage('Failed to fetch'), 'network');
  assert.equal(replyAddress({ contact_email: null, account_email: 'a@example.test' }), 'a@example.test');
  assert.equal(replyAddress({ contact_email: 'v@example.test', account_email: null }), 'v@example.test');
});

test('R01: the support Worker’s refusals get their own sentences, and a signed-out form needs the Worker', () => {
  assert.equal(supportFailureFromCode('source-hour'), 'source-limited');
  assert.equal(supportFailureFromCode('source-day'), 'rate-limited');
  assert.equal(supportFailureFromCode('email-day'), 'rate-limited');
  assert.equal(supportFailureFromCode('busy'), 'busy');
  assert.notEqual(supportFailureFromCode('source-hour'), supportFailureFromCode('busy'), 'a sender’s own limit is never worded as everyone’s');
  assert.equal(supportFailureFromCode('challenge-required'), 'challenge-failed');
  assert.equal(supportFailureFromCode('challenge-failed'), 'challenge-failed');
  assert.equal(supportFailureFromCode('not-configured'), 'visitor-off');
  assert.equal(supportFailureFromCode('no-source'), 'visitor-off');
  assert.equal(supportFailureFromCode('unavailable'), 'network');
  assert.equal(supportFailureFromCode(''), 'network');
  // No PUBLIC_SUPPORT_URL in a test run: signed-out sending is off.
  assert.equal(visitorSupportEnabled(), false);
  const form = read('src/components/support/SupportForm.tsx');
  assert.match(form, /data-testid="support-visitor-off"/);
  for (const reason of ['source-limited', 'challenge-failed', 'visitor-off']) assert.match(form, new RegExp(`case '${reason}':`), reason);
  // The library has one signed-out route, and it is not the database.
  const lib = read('src/lib/support.ts');
  assert.equal([...lib.matchAll(/\.rpc\('support_request_create'/g)].length, 1);
  assert.doesNotMatch(lib, /support_request_visitor/);
});

test('a person is reachable from every place the audit named', () => {
  const footer = read('src/components/WorkspaceFooter.astro');
  for (const route of ['/help', '/support', '/privacy', '/terms']) assert.match(footer, new RegExp(`withBase\\('${route}`), `footer links ${route}`);
  assert.match(read('src/pages/help.astro'), /Talk to a person[\s\S]*\/support\?reason=help/);
  assert.match(read('src/components/tutor/MrEzPanel.tsx'), /<SupportLink reason="mr-ez"/);
  assert.match(read('src/components/WritingTester.tsx'), /<SupportLink reason="grader"/);
  assert.match(read('src/components/SpeakingTester.tsx'), /<SupportLink reason="grader"/);
  assert.match(read('src/components/trial/TrialBlock.tsx'), /<SupportLink reason=\{reason === 'paid-ended'/);
  assert.match(read('src/components/access/PaidLocked.tsx'), /<SupportLink reason="locked"/);
  assert.match(read('src/components/trial/TrialHome.tsx'), /ended && <SupportLink reason="trial-ended"/);
  assert.match(read('src/components/support/PurchaseTerms.tsx'), /<SupportLink reason="plans"/);
  assert.match(read('src/components/admin/AdminPanel.tsx'), /<SupportRequests \/>/);
});

test('sign-up and profile explain the details and link to /privacy, and every profile field stays required', () => {
  const signUp = read('src/components/auth/SignUpForm.tsx');
  assert.match(signUp, /withBase\('\/privacy'\)/);
  const profile = read('src/components/auth/ProfileForm.tsx');
  assert.match(profile, /withBase\('\/privacy#privacy-asked'\)/);
  assert.doesNotMatch(profile, /teaching centre can see|so the centre can reach/);
  // The required fields are decided by validateProfile; the form still sends
  // them all and still refuses to save without them.
  assert.match(profile, /validateProfile\(values, new Date\(\)\)/);
});
