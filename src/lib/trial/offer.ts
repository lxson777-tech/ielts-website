/* What the three-day trial includes, and which IELTS section a lesson or a
   test belongs to.

   SHARED: imported by the site and by the Workers (mr-ez, grade-essay,
   grade-speaking), so it reads no environment, touches no browser API and
   holds no interface wording. The interface's own sentences live in the
   components, where they can be translated.

   The numbers here are mirrored by supabase/migrations/2026-09-23-trial.sql,
   which is what actually enforces them. tests/trial-sql.test.ts fails if
   the two disagree, including the list of trial items seeded there.

   APPROVED by Alex (handoff of 23 September 2026): three days, account
   required, no card; one test per section for the whole trial, four in all;
   five successfully answered Mr EZ requests per section for the whole trial,
   twenty in all, no daily reset; failed requests do not count.

   CONFIRMED by Alex on 23 September 2026: the lesson and test each section
   offers (below), the rule for what uses a test (begun at Start, used when
   submitted or graded, a service failure uses nothing), and the Speaking
   test: Part 1 only, about five minutes. */

export type TrialSection = 'reading' | 'listening' | 'writing' | 'speaking';

export const TRIAL_SECTIONS: readonly TrialSection[] = ['reading', 'listening', 'writing', 'speaking'];

export const TRIAL_HOURS = 72;
export const TRIAL_TESTS_PER_SECTION = 1;
export const TRIAL_TUTOR_PER_SECTION = 5;
/** A reserved Mr EZ message nobody settled or released within this long
    belonged to a request that died, and stops counting. */
export const TRIAL_STALE_MINUTES = 5;

/** The Speaking test's live interview: Part 1 only (Alex's decision), cut
    off by the server after this many minutes, and at most this many
    interviews started under the one test (the first, and one retry after a
    dropped connection; a cost safeguard, adjustable). */
export const TRIAL_SPEAKING_MODE = 'part1' as const;
export const TRIAL_SPEAKING_MINUTES = 5;
export const TRIAL_SPEAKING_SESSIONS = 2;
/** A trial interview the examiner never began (the student's connection
    failed first), reported ended within this many seconds of opening, is
    given back (Alex, 23 September 2026). Short, so a quiet session cannot
    be used as free voice time. */
export const TRIAL_UNUSED_SESSION_SECONDS = 90;

/** Full-access prices as approved, for display only. Nothing here takes a
    payment: no provider or purchase terms have been approved. */
export const FULL_ACCESS_PRICES_KZT = { oneMonth: 10000, threeMonths: 25000 } as const;

export interface TrialSectionOffer {
  /** The one introductory lesson: its course progress key and its route. */
  lessonKey: string;
  lessonHref: string;
  /** The one test: its trial activity id (a practice paper id, or a named
      activity for the two papers graded by a Worker) and its route. */
  testId: string;
  testHref: string;
  /** False keeps the test listed but not startable. */
  testEnabled: boolean;
}

/** The trial's Writing material (Alex, 24 September 2026): the Writing
    Checker essay is one fixed Task 2 question, and the Task 2 lesson shows
    one Band 8 example. Two different questions, so no student reads a model
    answer to the question they are tested on. Both are opinion essays, the
    type the Task 2 lesson teaches first. */
export const TRIAL_WRITING = {
  essayPromptId: 'pte-wt-122-task2',
  examplePromptId: 'pte-wt-129-task2',
} as const;

/** Confirmed by Alex, 23 September 2026. */
export const TRIAL_OFFER: Record<TrialSection, TrialSectionOffer> = {
  reading: {
    lessonKey: 'reading-paraphrase',
    lessonHref: '/lessons/reading/paraphrase',
    testId: 'reading-full-001',
    testHref: '/tests/reading-full-001',
    testEnabled: true,
  },
  listening: {
    lessonKey: 'listening-part1',
    lessonHref: '/lessons/listening/part1',
    testId: 'listening-full-001',
    testHref: '/tests/listening-full-001',
    testEnabled: true,
  },
  writing: {
    lessonKey: 'writing-task2-method',
    lessonHref: '/lessons/writing/task2-method',
    testId: 'writing-checker',
    testHref: '/writing/checker',
    testEnabled: true,
  },
  speaking: {
    lessonKey: 'speaking-part1',
    lessonHref: '/lessons/speaking/part1',
    testId: 'speaking-test',
    testHref: '/speaking/examiner',
    /* A Part 1 live interview of about five minutes (Alex, 23 September). */
    testEnabled: true,
  },
};

/** How long each section's trial test takes, in minutes: the timed Reading
    and Listening papers (their own durations, checked against the learning
    index by tests/trial-summary.test.ts), the Writing Task 2 essay's
    suggested time, and the Speaking Part 1 interview. Used to say plainly
    that a timed test is a separate sitting from short daily practice. */
export const TRIAL_TEST_MINUTES: Record<TrialSection, number> = {
  reading: 60,
  listening: 40,
  writing: 40,
  speaking: 5,
};

/* ── What the trial includes, in words ────────────────────────────────────
   The ONE place the trial is described to a student (audit F03, 29 September
   2026). The trial page, Tests, Practice, Today and Help read these
   sentences, so no surface can promise more than the gate above opens.

   English source text, translated where it is shown (the Russian lives in
   src/lib/i18n/dict/ru/b-remediation.ts). `nt` below is a plain identity so
   this file stays free of the i18n runtime (the Workers import it too); the
   translation coverage test reads each nt call below, so every sentence here
   must have Russian. No placeholders: static pages swap these in whole.
   tests/trial-summary.test.ts fails if a number written in words here
   stops matching the constants above. */
const nt = (text: string): string => text;

export type TrialSummaryKey = 'course' | 'days' | 'lessons' | 'tests' | 'tutor';

export const TRIAL_SUMMARY: Record<TrialSummaryKey, string> = {
  course: nt('Academic IELTS: the lessons and tests follow the Academic papers.'),
  days: nt('Three days, with no payment card and nothing to cancel.'),
  lessons: nt('One selected lesson in each section: Reading, Listening, Writing and Speaking.'),
  tests: nt(
    'One test in each section: a full Reading test, a full Listening test, one Writing Task 2 essay, and a Speaking Part 1 interview of about five minutes.',
  ),
  tutor: nt('Five Mr EZ messages in each section, for the whole trial.'),
};

/** The order the summary is read in. */
export const TRIAL_SUMMARY_ORDER: readonly TrialSummaryKey[] = ['course', 'days', 'lessons', 'tests', 'tutor'];

/** One section's test as the trial includes it, for the Tests and Practice
    pages, with the rest of that section named as full access. */
export const TRIAL_SECTION_INCLUDES: Record<TrialSection, string> = {
  reading: nt('Your trial includes one full Reading test. The other Reading papers come with full access.'),
  listening: nt('Your trial includes one full Listening test. The other Listening papers come with full access.'),
  writing: nt(
    'Your trial includes one Writing Task 2 essay on a set question, with AI feedback. Task 1 and more questions come with full access.',
  ),
  speaking: nt(
    'Your trial includes a Speaking Part 1 interview of about five minutes. The full three-part interview comes with full access.',
  ),
};

/** What a locked page, button or row says before the click. */
export const TRIAL_FULL_ACCESS_LABEL = nt('Available with full access');

/** Every item the trial offers, in the `kind:id` form the database uses. */
export function trialOfferItems(): { itemId: string; section: TrialSection; kind: 'lesson' | 'test'; enabled: boolean }[] {
  return TRIAL_SECTIONS.flatMap((section) => {
    const offer = TRIAL_OFFER[section];
    return [
      { itemId: `lesson:${offer.lessonKey}`, section, kind: 'lesson' as const, enabled: true },
      { itemId: `test:${offer.testId}`, section, kind: 'test' as const, enabled: offer.testEnabled },
    ];
  });
}

/* ── Access mode ──────────────────────────────────────────────────────────
   'open' is today's free site and stays the default everywhere. 'trial'
   switches on every check below, on the site (PUBLIC_ACCESS_MODE) and on
   each Worker (ACCESS_MODE). Anything that is not exactly 'trial' is open,
   so a missing or mistyped setting can never lock the live site. */
export type AccessMode = 'open' | 'trial';

export function parseAccessMode(raw: unknown): AccessMode {
  return typeof raw === 'string' && raw.trim().toLowerCase() === 'trial' ? 'trial' : 'open';
}

/* ── Which section something belongs to ───────────────────────────────── */

export function isTrialSection(value: unknown): value is TrialSection {
  return typeof value === 'string' && (TRIAL_SECTIONS as readonly string[]).includes(value);
}

/** A course lesson key's section. Every key in the course is either a
    paper's overview (`reading-task1`, `listening`, `writing`, `speaking`)
    or `<paper>-<part>`, so the paper is the first word. Vocabulary lessons
    belong to no section and are not part of the trial. */
export function lessonSection(key: string): TrialSection | null {
  const first = key.split('-')[0];
  return isTrialSection(first) ? first : null;
}

/** A test or drill id's section: `reading-full-006`, its drills
    `reading-full-006-drill-p2`, and the two named trial activities. */
export function testSection(testId: string): TrialSection | null {
  if (testId === TRIAL_OFFER.writing.testId) return 'writing';
  if (testId === TRIAL_OFFER.speaking.testId) return 'speaking';
  const match = /^(reading|listening)-/.exec(testId);
  return match ? (match[1] as TrialSection) : null;
}

export function isTrialLesson(key: string): boolean {
  const section = lessonSection(key);
  return section !== null && TRIAL_OFFER[section].lessonKey === key;
}

/** The section whose trial test this is, or null when it is not one. A
    drill cut from the trial paper is a different activity, not the test. */
export function trialTestSection(testId: string): TrialSection | null {
  const section = testSection(testId);
  return section !== null && TRIAL_OFFER[section].testId === testId ? section : null;
}

/* ── The marketing questionnaire ──────────────────────────────────────────
   The public site asks four questions before sign-up (target band, the
   section to start with, what to focus on, minutes a day). A student who
   answered them arrives with those answers; they become a SUGGESTED starting
   point for the trial, never an assessed level. The same rule is enforced
   again by the database (trial_clean_questionnaire). */
export interface TrialQuestionnaire {
  band: '7' | '7.5' | '8';
  skill: TrialSection;
  focus: 'method' | 'confidence';
  time: '15' | '30' | '60';
}

export function cleanQuestionnaire(raw: unknown): TrialQuestionnaire | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const band = String(value.band ?? '');
  const skill = String(value.skill ?? '');
  const focus = String(value.focus ?? '');
  const time = String(value.time ?? '');
  if (!['7', '7.5', '8'].includes(band)) return null;
  if (!isTrialSection(skill)) return null;
  if (!['method', 'confidence'].includes(focus)) return null;
  if (!['15', '30', '60'].includes(time)) return null;
  return { band, skill, focus, time } as TrialQuestionnaire;
}

/** Reads the questionnaire from the query string the public site links
    with (`?journey=1&band=7&skill=writing&focus=method&time=30`). */
export function questionnaireFromSearch(search: string): TrialQuestionnaire | null {
  const params = new URLSearchParams(search);
  if (params.get('journey') !== '1') return null;
  return cleanQuestionnaire({
    band: params.get('band'),
    skill: params.get('skill'),
    focus: params.get('focus'),
    time: params.get('time'),
  });
}
