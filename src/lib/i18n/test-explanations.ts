/* Reading the "why this is the answer" notes in the student's language.
 *
 * The third piece of the same idea as the interface dictionary
 * (translate.ts) and the lesson bodies (lesson-body.ts), and it exists
 * for the same reason the lesson bodies do: there is far too much of this
 * text to ship to everybody.
 *
 * The numbers: 70 practice tests, forty questions each, carry about
 * 2,800 answer explanations, roughly 480,000 characters of English. Put
 * the Russian in the interface dictionary and every Russian student
 * downloads all of it on the home page. Bundle it into TestPlayer and
 * every student, English ones included, downloads it with the player. So:
 *
 *   - the English is where it always was, inside the test itself, and an
 *     English student downloads nothing extra and runs no extra code;
 *   - the Russian is one static file per test, published by
 *     src/pages/data/test-explanations/[locale]/[id].json.ts and written
 *     by hand into src/data/tests/ru/<id>.json;
 *   - it is fetched only when a Russian-locale student actually reaches a
 *     screen that shows explanations, which is the review screen after
 *     submitting. Opening a test, sitting it, and leaving costs nothing;
 *   - a missing file, a failed request or a missing question id all fall
 *     back to the English note in silence. There is no error state,
 *     because "the note is in English" is not an error, it is where the
 *     whole site was before this existed.
 *
 * The same mechanism serves the exercises on the lesson pages
 * (PracticeQuiz), whose sets have ids of their own: see practiceKey().
 *
 * Staleness on purpose
 * --------------------
 * Each Russian note is stored against a short hash of the English it was
 * translated from, so editing an English explanation makes every
 * translation of it visibly stale. That check runs in the tools and in
 * `npm test` (tools/explanations-ru-lib.mjs), never here: at runtime a
 * stale note is shown exactly like a fresh one. A slightly outdated
 * Russian note beats a perfectly current English one for a student who
 * cannot read the English, and the red test is what gets it fixed.
 */

import { useEffect, useMemo, useState, createContext, useContext } from 'react';
import { DEFAULT_LOCALE, type Locale } from './locale';
import { withBase } from '../url';

/** What a published file looks like once the shas are stripped off:
    entry key to Russian note. */
export interface PublishedExplanations {
  id: string;
  locale: string;
  entries: Record<string, string>;
}

/** Marks an entry as a whole question group's `explanationHtml` rather
    than one question's `explanation`. Must stay in step with
    GROUP_KEY_PREFIX in tools/explanations-ru-lib.mjs. */
export const GROUP_KEY_PREFIX = 'group:';

/** The key a group's shared note is stored under: the id of its first
    question, which is the only stable name a group has. */
export function groupKey(firstQuestionId: string): string {
  return `${GROUP_KEY_PREFIX}${firstQuestionId}`;
}

/** The key one question of a lesson-page exercise set is stored under.
    A practice question has no id, so its position is its name. Must stay
    in step with collectPracticeEntries() in
    tools/explanations-ru-lib.mjs. */
export function practiceKey(unitIndex: number, questionIndex: number): string {
  return `u${unitIndex}-q${questionIndex}`;
}

/** The id whose translations a player should load.
 *
 * The "retry the ones you got wrong" retake builds a throwaway test whose
 * id is the real one with "-retake" on the end (see buildRetakeTest in
 * TestPlayer.tsx). It holds the very same Question objects, so it wants
 * the very same notes. */
export function baseTestId(testId: string): string {
  return testId.replace(/-retake$/, '');
}

/** `<locale>/<id>` to the file being fetched, resolving to null for
    "there is no translation". The PROMISE is cached, not the result:
    several questions' panels appear in the same tick, and caching only
    the result made each of them start its own download. Kept for the
    tab's lifetime, so switching language back and forth, or coming back
    to a paper, costs nothing. */
const fetched = new Map<string, Promise<Record<string, string> | null>>();

function load(locale: Locale, id: string): Promise<Record<string, string> | null> {
  const key = `${locale}/${id}`;
  let pending = fetched.get(key);
  if (!pending) {
    pending = fetch(withBase(`/data/test-explanations/${locale}/${id}.json`), {
      headers: { Accept: 'application/json' },
    })
      .then((res) => (res.ok ? (res.json() as Promise<PublishedExplanations>) : null))
      .then((file) => (file && file.entries && typeof file.entries === 'object' ? file.entries : null))
      .catch(() => null);
    fetched.set(key, pending);
  }
  return pending;
}

/** Look one note up: the Russian if there is one, the English otherwise.
    Undefined in, undefined out, so a question with no note at all stays a
    question with no note. */
export type Explain = (key: string, english: string | undefined) => string | undefined;

/** What everything falls back to: the English, unchanged. Used on an
    English page, before a file arrives, and when there is no file. */
export const ENGLISH_ONLY: Explain = (_key, english) => english;

export function explainWith(entries: Record<string, string> | null): Explain {
  if (!entries) return ENGLISH_ONLY;
  return (key, english) => {
    const russian = entries[key];
    return russian !== undefined && russian !== '' ? russian : english;
  };
}

/**
 * The notes for one test or exercise set, in the current language.
 *
 * `enabled` is what keeps the promise this module makes: pass `false`
 * until the student is actually looking at explanations (after submit),
 * and nothing is requested. Flipping the language re-runs this in both
 * directions with no reload, because switching back to English simply
 * drops the table.
 */
export function useExplanations(id: string, locale: Locale, enabled: boolean): Explain {
  const [entries, setEntries] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!enabled || locale === DEFAULT_LOCALE) {
      setEntries(null);
      return;
    }
    let live = true;
    void load(locale, id).then((table) => {
      if (live) setEntries(table);
    });
    return () => {
      live = false;
    };
  }, [id, locale, enabled]);

  return useMemo(() => explainWith(entries), [entries]);
}

/** How the review panels deep inside TestPlayer reach the table without
    every component between them having to carry it. The default is
    English, so a panel rendered outside any provider still works. */
export const ExplanationsContext = createContext<Explain>(ENGLISH_ONLY);

/** One note, translated if we have it. */
export function useExplanation(key: string, english: string | undefined): string | undefined {
  return useContext(ExplanationsContext)(key, english);
}

/** Test seam: forget the cache so a fresh scenario starts clean. */
export function resetExplanationCache(): void {
  fetched.clear();
}
