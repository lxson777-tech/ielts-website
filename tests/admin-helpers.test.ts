/* The admin panel's pure helpers (src/lib/admin.ts): how a student's profile
   is named, aged and labelled, what the search box matches, and the two
   helpers the list already relied on. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ageOf,
  fullName,
  hasProfile,
  isUnder18,
  lastSeen,
  longDate,
  matchesSearch,
  phoneLabel,
  sourceLabel,
  testLabel,
  type AdminUserRow,
} from '../src/lib/admin.ts';

/** A fixed "today": 24 September 2026, midday local time. */
const NOW = new Date(2026, 8, 24, 12, 0, 0);

function row(over: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    user_id: '11111111-1111-4111-8111-111111111111',
    email: 'student@example.com',
    provider: 'email',
    email_confirmed: true,
    is_admin: false,
    joined_at: '2026-09-01T10:00:00Z',
    last_sign_in_at: null,
    last_synced_at: null,
    last_active_day: null,
    active_days: 0,
    minutes_studied: 0,
    lessons_done: 0,
    tests_taken: 0,
    best_reading: null,
    best_listening: null,
    writing_count: 0,
    best_writing: null,
    speaking_count: 0,
    best_speaking: null,
    target_band: null,
    test_date: null,
    daily_minutes: null,
    plan_chosen: false,
    tutor_messages: 0,
    examiner_sessions: 0,
    recent: [],
    first_name: null,
    last_name: null,
    date_of_birth: null,
    phone: null,
    city: null,
    occupation: null,
    source: null,
    parent_name: null,
    parent_phone: null,
    parent_consent_at: null,
    profile_updated_at: null,
    ...over,
  };
}

const ADULT = row({
  email: 'dana.nurlan@example.com',
  first_name: 'Dana',
  last_name: 'Nurlanova',
  date_of_birth: '2001-03-15',
  phone: '+77771234567',
  city: 'Almaty',
  occupation: 'KazNU, second year',
  source: 'instagram',
  profile_updated_at: '2026-09-20T08:00:00Z',
});

const MINOR = row({
  email: 'arman@example.com',
  first_name: 'Arman',
  last_name: 'Seitkali',
  date_of_birth: '2011-05-12',
  phone: '+77015550011',
  city: 'Astana',
  occupation: 'School No. 12, grade 9',
  source: 'friend',
  parent_name: 'Gulnara Seitkali',
  parent_phone: '+77015550022',
  parent_consent_at: '2026-09-10T09:30:00Z',
  profile_updated_at: '2026-09-10T09:30:00Z',
});

const NO_PROFILE = row({ email: 'timur.k@example.com' });

test('fullName joins first and last, and is null without a name', () => {
  assert.equal(fullName(ADULT), 'Dana Nurlanova');
  assert.equal(fullName(NO_PROFILE), null);
  assert.equal(fullName(row({ first_name: '  Aigerim ', last_name: null })), 'Aigerim');
  assert.equal(fullName(row({ first_name: '', last_name: '  ' })), null);
});

test('hasProfile is true for a saved profile and false for none', () => {
  assert.equal(hasProfile(ADULT), true);
  assert.equal(hasProfile(MINOR), true);
  assert.equal(hasProfile(NO_PROFILE), false);
});

test('ageOf counts whole years on a fixed day, birthday or not yet', () => {
  assert.equal(ageOf(ADULT, NOW), 25);
  assert.equal(ageOf(MINOR, NOW), 15);
  // Birthday tomorrow: still 17. Birthday today: 18.
  assert.equal(ageOf(row({ date_of_birth: '2008-09-25' }), NOW), 17);
  assert.equal(ageOf(row({ date_of_birth: '2008-09-24' }), NOW), 18);
  assert.equal(ageOf(NO_PROFILE, NOW), null);
  assert.equal(ageOf(row({ date_of_birth: '2010-02-30' }), NOW), null);
});

test('isUnder18 follows the same age, and is false when the age is unknown', () => {
  assert.equal(isUnder18(MINOR, NOW), true);
  assert.equal(isUnder18(ADULT, NOW), false);
  assert.equal(isUnder18(row({ date_of_birth: '2008-09-25' }), NOW), true);
  assert.equal(isUnder18(row({ date_of_birth: '2008-09-24' }), NOW), false);
  assert.equal(isUnder18(NO_PROFILE, NOW), false);
});

test('sourceLabel names every allowed source and keeps an unknown one as stored', () => {
  assert.equal(sourceLabel('friend'), 'Friend');
  assert.equal(sourceLabel('instagram'), 'Instagram');
  assert.equal(sourceLabel('centre'), 'The teaching centre');
  assert.equal(sourceLabel('other'), 'Other');
  assert.equal(sourceLabel('tiktok'), 'tiktok');
  assert.equal(sourceLabel(null), null);
  assert.equal(sourceLabel(''), null);
});

test('longDate writes a calendar day in full and never shifts a bare date', () => {
  assert.equal(longDate('2009-05-12'), '12 May 2009');
  assert.equal(longDate('2011-12-01'), '1 December 2011');
  assert.equal(longDate(null), null);
  assert.equal(longDate('not a date'), 'not a date');
  // A timestamp is shown as the local day it falls on.
  const local = new Date('2026-09-10T09:30:00Z');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  assert.equal(longDate('2026-09-10T09:30:00Z'), `${local.getDate()} ${months[local.getMonth()]} ${local.getFullYear()}`);
});

test('phoneLabel spaces a +7 number and leaves others as stored', () => {
  assert.equal(phoneLabel('+77771234567'), '+7 777 123 45 67');
  assert.equal(phoneLabel('+447700900123'), '+447700900123');
  assert.equal(phoneLabel(null), null);
});

test('matchesSearch finds a student by name, email, phone or city', () => {
  assert.equal(matchesSearch(ADULT, ''), true);
  assert.equal(matchesSearch(ADULT, 'dana nurl'), true);
  assert.equal(matchesSearch(ADULT, 'NURLANOVA'), true);
  assert.equal(matchesSearch(ADULT, 'dana.nurlan@'), true);
  assert.equal(matchesSearch(ADULT, 'almaty'), true);
  assert.equal(matchesSearch(ADULT, '777 123'), true);
  assert.equal(matchesSearch(ADULT, '+7 (777) 123-45'), true);
  assert.equal(matchesSearch(ADULT, 'astana'), false);
  assert.equal(matchesSearch(ADULT, '555'), false);
  // Occupation is not a search field.
  assert.equal(matchesSearch(ADULT, 'kaznu'), false);
  // A student with no profile is still found by email, and not by a number.
  assert.equal(matchesSearch(NO_PROFILE, 'timur'), true);
  assert.equal(matchesSearch(NO_PROFILE, '777'), false);
});

test('testLabel reads a practice test id and leaves unknown shapes alone', () => {
  assert.equal(testLabel('reading-full-001'), 'Reading test 1');
  assert.equal(testLabel('listening-full-012'), 'Listening test 12');
  assert.equal(testLabel('reading-full-003-drill-p2'), 'Reading test 3, passage 2 drill');
  assert.equal(testLabel('listening-full-002-drill-p4-retake'), 'Listening test 2, part 4 drill (retake)');
  assert.equal(testLabel('reading-full-001-retake'), 'Reading test 1 (retake)');
  assert.equal(testLabel('mock-exam-1'), 'mock-exam-1');
});

test('lastSeen picks the latest of sync, sign-in and study day', () => {
  assert.equal(lastSeen(NO_PROFILE), null);
  assert.equal(
    lastSeen(row({ last_synced_at: '2026-09-20T10:00:00Z', last_sign_in_at: '2026-09-22T10:00:00Z' })),
    '2026-09-22T10:00:00Z',
  );
  assert.equal(
    lastSeen(row({ last_synced_at: '2026-09-23T18:00:00Z', last_sign_in_at: '2026-09-22T10:00:00Z' })),
    '2026-09-23T18:00:00Z',
  );
  // A study day with nothing else is read at noon of that day.
  assert.equal(lastSeen(row({ last_active_day: '2026-09-21' })), '2026-09-21T12:00:00');
  assert.equal(
    lastSeen(row({ last_active_day: '2026-09-24', last_sign_in_at: '2026-09-20T10:00:00Z' })),
    '2026-09-24T12:00:00',
  );
});
