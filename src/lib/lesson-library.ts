/* The lesson library's list: every lesson exactly once.
 *
 * Each paper's introduction ('reading-task1', 'writing', 'speaking',
 * 'listening', 'vocabulary') is both a LESSONS overview and a lesson placed
 * in the course. The library used to list it twice under the same React key,
 * and duplicate keys let React keep stale cards when the filter changed: the
 * Reading filter said "14 lessons shown" over 18 cards, four of them other
 * papers' overviews (platform audit 2026-09-23, Stage 1). Here the
 * introduction is one entry, marked `overview` and listed first as before,
 * and the count is the number of entries, so it always matches the cards.
 */
import { LESSONS, type Skill } from '../data/lessons';
import { buildCourse } from './course';

export interface LibraryEntry {
  /** progress.lessons key, unique across the list. */
  key: string;
  skill: Skill;
  title: string;
  /** Unprefixed path; callers apply withBase(). */
  href: string;
  /** True for a paper's introduction (a LESSONS overview page). */
  overview: boolean;
  /** Overview description, or the course lesson's real blurb ('' when none). */
  description: string;
  /** The course unit the lesson sits in, when it is placed in one. */
  moduleLabel: string | null;
  minutes?: number;
}

export function libraryEntries(): LibraryEntry[] {
  const overviews: LibraryEntry[] = LESSONS.map((lesson) => ({
    key: lesson.slug,
    skill: lesson.skill,
    title: lesson.title,
    href: `/lessons/${lesson.slug}`,
    overview: true,
    description: lesson.description,
    moduleLabel: null,
    minutes: lesson.minutes,
  }));
  const seen = new Set(overviews.map((entry) => entry.key));
  const lessons: LibraryEntry[] = [];
  for (const module of buildCourse()) {
    for (const lesson of module.lessons) {
      if (seen.has(lesson.key)) continue;
      seen.add(lesson.key);
      lessons.push({
        key: lesson.key,
        skill: lesson.skill,
        title: lesson.title,
        href: lesson.href,
        overview: false,
        description: lesson.blurb,
        moduleLabel: module.name,
        minutes: lesson.minutes,
      });
    }
  }
  return [...overviews, ...lessons];
}

/** The entries a skill filter and a search phrase leave visible. The count
    shown above the grid is this list's length. */
export function filterLibrary(
  entries: readonly LibraryEntry[],
  skill: Skill | 'all',
  query: string,
  describe: (entry: LibraryEntry) => string = (entry) => `${entry.title} ${entry.description}`,
): LibraryEntry[] {
  const needle = query.trim().toLowerCase();
  return entries.filter(
    (entry) => (skill === 'all' || entry.skill === skill) && (!needle || describe(entry).toLowerCase().includes(needle)),
  );
}
