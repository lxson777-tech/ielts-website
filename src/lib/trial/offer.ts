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

   PROPOSED, awaiting confirmation: WHICH lesson and WHICH test each section
   offers. The handoff says the final library ids need selecting and
   confirming. The Speaking test is listed but switched off until its
   session length and scope are decided. */

export type TrialSection = 'reading' | 'listening' | 'writing' | 'speaking';

export const TRIAL_SECTIONS: readonly TrialSection[] = ['reading', 'listening', 'writing', 'speaking'];

export const TRIAL_HOURS = 72;
export const TRIAL_TESTS_PER_SECTION = 1;
export const TRIAL_TUTOR_PER_SECTION = 5;
/** A reserved Mr EZ message nobody settled or released within this long
    belonged to a request that died, and stops counting. */
export const TRIAL_STALE_MINUTES = 5;

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

/** PROPOSED. Needs Alex's confirmation before the real offer is switched on. */
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
    /* Off until Alex decides the session's maximum length and whether the
       one Speaking test covers all three parts (handoff, decisions list). */
    testEnabled: false,
  },
};

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
