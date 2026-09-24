/* The student profile's rules (src/lib/auth/profile.ts): what a form may
 * save, how old a student is, where "next" may send them, and what a Google
 * sign-in already tells us.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/profile.test.ts
 *
 * Pure: no browser, no network, no account. Every "now" is fixed, so the
 * under-18 boundary is tested on an exact day rather than on whatever today
 * happens to be. Every name and number below is SYNTHETIC. */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EMPTY_PROFILE_INPUT,
  ageOn,
  isMinor,
  isProfileComplete,
  normalisePhone,
  prefillFromUser,
  profileHref,
  safeNext,
  signInHref,
  signUpHref,
  toInput,
  validateProfile,
  type ProfileInput,
  type StudentProfile,
} from '../src/lib/auth/profile.ts';

/** A fixed "today": 15 June 2026, midday local time. */
const NOW = new Date(2026, 5, 15, 12, 0, 0);

const ADULT: ProfileInput = {
  ...EMPTY_PROFILE_INPUT,
  firstName: 'Synthetic',
  lastName: 'Student',
  dateOfBirth: '2000-03-04',
  phone: '+7 (701) 234-56-78',
  city: 'Almaty',
  occupation: 'University',
  source: 'friend',
};

function errorsOf(input: ProfileInput, now = NOW) {
  const result = validateProfile(input, now);
  return result.ok ? {} : result.errors;
}

/* ------------------------------------------------------------------ */
/* validateProfile                                                      */
/* ------------------------------------------------------------------ */

test('a complete adult profile passes and comes back normalised', () => {
  const result = validateProfile({ ...ADULT, firstName: '  Synthetic ', city: ' Almaty ' }, NOW);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.firstName, 'Synthetic');
  assert.equal(result.value.city, 'Almaty');
  assert.equal(result.value.phone, '+77012345678', 'the phone is reduced to a plus and digits');
  assert.equal(result.value.parentName, '', 'an adult carries no parent');
  assert.equal(result.value.parentConsent, false);
});

test('every empty required field is reported as required, once each', () => {
  const errors = errorsOf(EMPTY_PROFILE_INPUT);
  assert.deepEqual(errors, {
    firstName: 'required',
    lastName: 'required',
    city: 'required',
    occupation: 'required',
    dateOfBirth: 'required',
    phone: 'required',
    source: 'required',
  });
});

test('whitespace alone counts as empty', () => {
  assert.equal(errorsOf({ ...ADULT, lastName: '   ' }).lastName, 'required');
  assert.equal(errorsOf({ ...ADULT, phone: '   ' }).phone, 'required');
});

test('tooLong: each text field has its own limit', () => {
  assert.equal(errorsOf({ ...ADULT, firstName: 'a'.repeat(61) }).firstName, 'tooLong');
  assert.equal(errorsOf({ ...ADULT, firstName: 'a'.repeat(60) }).firstName, undefined);
  assert.equal(errorsOf({ ...ADULT, lastName: 'a'.repeat(61) }).lastName, 'tooLong');
  assert.equal(errorsOf({ ...ADULT, city: 'a'.repeat(81) }).city, 'tooLong');
  assert.equal(errorsOf({ ...ADULT, occupation: 'a'.repeat(121) }).occupation, 'tooLong');
  assert.equal(errorsOf({ ...ADULT, occupation: 'a'.repeat(120) }).occupation, undefined);
});

test('invalidDate: not a date, or a day that does not exist', () => {
  assert.equal(errorsOf({ ...ADULT, dateOfBirth: '04/03/2000' }).dateOfBirth, 'invalidDate');
  assert.equal(errorsOf({ ...ADULT, dateOfBirth: '2001-02-29' }).dateOfBirth, 'invalidDate');
  assert.equal(errorsOf({ ...ADULT, dateOfBirth: '2000-13-01' }).dateOfBirth, 'invalidDate');
  assert.equal(errorsOf({ ...ADULT, dateOfBirth: '2000-04-31' }).dateOfBirth, 'invalidDate');
});

test('inFuture, tooYoung and tooOld', () => {
  assert.equal(errorsOf({ ...ADULT, dateOfBirth: '2027-01-01' }).dateOfBirth, 'inFuture');
  // Four years old on NOW: below the five-year floor.
  assert.equal(errorsOf({ ...ADULT, dateOfBirth: '2022-01-01' }).dateOfBirth, 'tooYoung');
  assert.equal(errorsOf({ ...ADULT, dateOfBirth: '1900-06-01' }).dateOfBirth, 'tooOld');
});

test('invalidPhone: too few or too many digits, or letters', () => {
  assert.equal(errorsOf({ ...ADULT, phone: '12345' }).phone, 'invalidPhone');
  assert.equal(errorsOf({ ...ADULT, phone: '+1234567890123456' }).phone, 'invalidPhone');
  assert.equal(errorsOf({ ...ADULT, phone: 'call me' }).phone, 'invalidPhone');
  assert.equal(errorsOf({ ...ADULT, phone: '8 701 234 56 78' }).phone, undefined, 'a local number without a plus is fine');
});

test('invalidSource: only the four choices are accepted', () => {
  assert.equal(errorsOf({ ...ADULT, source: 'tiktok' as ProfileInput['source'] }).source, 'invalidSource');
  for (const source of ['friend', 'instagram', 'centre', 'other'] as const) {
    assert.equal(errorsOf({ ...ADULT, source }).source, undefined, source);
  }
});

test('under 18: a parent name, a parent phone and the agreement are all required', () => {
  const minor: ProfileInput = { ...ADULT, dateOfBirth: '2012-09-01' };
  assert.deepEqual(errorsOf(minor), {
    parentName: 'parentRequired',
    parentPhone: 'parentRequired',
    parentConsent: 'consentRequired',
  });
  const badPhone = errorsOf({ ...minor, parentName: 'Synthetic Parent', parentPhone: '123', parentConsent: true });
  assert.deepEqual(badPhone, { parentPhone: 'invalidPhone' });

  const ok = validateProfile(
    { ...minor, parentName: ' Synthetic Parent ', parentPhone: '+7 777 000 11 22', parentConsent: true },
    NOW,
  );
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.parentName, 'Synthetic Parent');
    assert.equal(ok.value.parentPhone, '+77770001122');
    assert.equal(ok.value.parentConsent, true);
  }
});

test('an adult is never asked for a parent, even with the parent fields filled', () => {
  const result = validateProfile({ ...ADULT, parentName: 'x', parentPhone: 'nonsense', parentConsent: false }, NOW);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.parentName, '', 'parent fields are dropped for an adult');
    assert.equal(result.value.parentPhone, '');
  }
});

test('the 18th birthday is the exact boundary', () => {
  // NOW is 15 June 2026. Born 15 June 2008: eighteen today, an adult.
  assert.equal(ageOn('2008-06-15', NOW), 18);
  assert.equal(isMinor('2008-06-15', NOW), false);
  assert.equal(validateProfile({ ...ADULT, dateOfBirth: '2008-06-15' }, NOW).ok, true);
  // Born 16 June 2008: eighteen tomorrow, still a minor today.
  assert.equal(ageOn('2008-06-16', NOW), 17);
  assert.equal(isMinor('2008-06-16', NOW), true);
  assert.equal(errorsOf({ ...ADULT, dateOfBirth: '2008-06-16' }).parentConsent, 'consentRequired');
});

/* ------------------------------------------------------------------ */
/* ageOn                                                                */
/* ------------------------------------------------------------------ */

test('ageOn returns null for anything that is not a real calendar day', () => {
  for (const bad of ['', 'yesterday', '2000-1-1', '2000-02-30', '2023-02-29', '2000-00-10', '2000-01-32']) {
    assert.equal(ageOn(bad, NOW), null, bad);
  }
});

test('ageOn: a leap-day birthday', () => {
  assert.equal(ageOn('2004-02-29', new Date(2026, 1, 28, 12)), 21, 'the day before 1 March in a common year');
  assert.equal(ageOn('2004-02-29', new Date(2026, 2, 1, 12)), 22, 'counted from 1 March in a common year');
  assert.equal(ageOn('2004-02-29', new Date(2028, 1, 29, 12)), 24, 'on the day itself in a leap year');
  assert.equal(ageOn('2004-02-29', new Date(2028, 1, 28, 12)), 23);
});

test('normalisePhone keeps one leading plus and the digits', () => {
  assert.equal(normalisePhone(' +7 (701) 234-56-78 '), '+77012345678');
  assert.equal(normalisePhone('8 701 234 56 78'), '87012345678');
  assert.equal(normalisePhone('7+7'), '77', 'a plus in the middle is not a country code');
});

/* ------------------------------------------------------------------ */
/* isProfileComplete / toInput                                          */
/* ------------------------------------------------------------------ */

const SAVED: StudentProfile = {
  firstName: 'Synthetic',
  lastName: 'Student',
  dateOfBirth: '2012-09-01',
  phone: '+77012345678',
  city: 'Almaty',
  occupation: 'School',
  source: 'centre',
  parentName: 'Synthetic Parent',
  parentPhone: '+77770001122',
  parentConsentAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test('a saved minor with a parent and an agreement is complete; without the agreement it is not', () => {
  assert.equal(isProfileComplete(SAVED, NOW), true);
  assert.equal(isProfileComplete({ ...SAVED, parentConsentAt: null }, NOW), false);
  assert.equal(isProfileComplete(null, NOW), false);
  assert.equal(isProfileComplete(undefined, NOW), false);
  assert.equal(toInput(SAVED).parentConsent, true);
});

/* ------------------------------------------------------------------ */
/* safeNext and the three hrefs                                         */
/* ------------------------------------------------------------------ */

test('safeNext keeps a same-site path and refuses everything else', () => {
  assert.equal(safeNext('/tests/mock'), '/tests/mock');
  assert.equal(safeNext('/trainers/writing?task=t2-01'), '/trainers/writing?task=t2-01');
  for (const bad of [
    '',
    null,
    undefined,
    '//evil.example',
    'https://evil.example/',
    'http://evil.example',
    'evil.example',
    'javascript:alert(1)',
    '/\\evil.example',
    '/\t/evil.example',
    '/dashboard\r\nSet-Cookie: x',
  ]) {
    assert.equal(safeNext(bad), '/dashboard', String(bad));
  }
  assert.equal(safeNext('//evil.example', '/account'), '/account', 'the fallback is the one given');
});

test('profileHref, signInHref and signUpHref carry a safe, encoded next', () => {
  assert.equal(profileHref(), '/profile');
  assert.equal(profileHref('/tests/mock'), '/profile?next=%2Ftests%2Fmock');
  assert.equal(signInHref('/account'), '/sign-in?next=%2Faccount');
  assert.equal(signUpHref('//evil.example'), '/sign-up?next=%2Fdashboard', 'an unsafe next becomes the default');
});

/* ------------------------------------------------------------------ */
/* prefillFromUser                                                      */
/* ------------------------------------------------------------------ */

test('prefillFromUser splits a Google full name on the first space', () => {
  assert.deepEqual(prefillFromUser({ user_metadata: { full_name: 'Synthetic Van Student' } }), {
    firstName: 'Synthetic',
    lastName: 'Van Student',
  });
  assert.deepEqual(prefillFromUser({ user_metadata: { name: '  Synthetic  ' } }), { firstName: 'Synthetic', lastName: '' });
});

test('prefillFromUser prefers given and family names when Google sends them', () => {
  assert.deepEqual(
    prefillFromUser({ user_metadata: { full_name: 'Ignored Name', given_name: 'Synthetic', family_name: 'Student' } }),
    { firstName: 'Synthetic', lastName: 'Student' },
  );
});

test('prefillFromUser gives nothing for an email sign-up or no user at all', () => {
  assert.deepEqual(prefillFromUser({ user_metadata: {} }), {});
  assert.deepEqual(prefillFromUser(null), {});
  assert.deepEqual(prefillFromUser(undefined), {});
  assert.deepEqual(prefillFromUser({ user_metadata: { full_name: 42 } as unknown as Record<string, unknown> }), {});
});
